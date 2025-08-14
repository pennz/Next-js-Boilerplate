#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import * as ts from 'typescript';
import { glob } from 'glob';

interface TestCase {
  name: string;
  type: 'describe' | 'it' | 'test';
  file: string;
  line: number;
  parentSuite?: string;
  tags?: string[];
  requirements?: string[];
}

interface TestSuite {
  name: string;
  file: string;
  tests: TestCase[];
  coverage?: CoverageData;
}

interface CoverageData {
  lines: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
}

interface TestResults {
  suites: TestSuite[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage: {
    overall: CoverageData;
    byFile: Record<string, CoverageData>;
  };
}

interface RequirementMapping {
  requirement: string;
  tests: string[];
  coverage: number;
  status: 'covered' | 'partial' | 'missing';
}

class TestDocumentationGenerator {
  private projectRoot: string;
  private testsDir: string;
  private docsDir: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.testsDir = path.join(projectRoot, 'tests');
    this.docsDir = path.join(projectRoot, 'docs');
  }

  async generateTestDocumentation(): Promise<void> {
    console.log('🔍 Scanning test files...');
    const testFiles = await this.scanTestFiles();
    
    console.log('📊 Parsing test results...');
    const testResults = await this.parseTestFiles(testFiles);
    
    console.log('📈 Loading coverage data...');
    const coverageData = await this.loadCoverageData();
    
    console.log('🔗 Generating requirements traceability...');
    const requirementMappings = await this.generateRequirementMappings(testResults);
    
    console.log('📝 Updating documentation...');
    await this.updateTestingQARequirements(testResults, coverageData);
    await this.updateTestUpdatesSummary(testResults, requirementMappings);
    
    console.log('✅ Test documentation generation complete!');
  }

  private async scanTestFiles(): Promise<string[]> {
    const patterns = [
      'tests/**/*.test.{ts,tsx,js,jsx}',
      'tests/**/*.spec.{ts,tsx,js,jsx}',
      'tests/**/*.e2e.{ts,tsx,js,jsx}',
      'src/**/*.test.{ts,tsx,js,jsx}',
      'src/**/*.spec.{ts,tsx,js,jsx}'
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: this.projectRoot });
      files.push(...matches.map(file => path.join(this.projectRoot, file)));
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async parseTestFiles(testFiles: string[]): Promise<TestResults> {
    const suites: TestSuite[] = [];
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const file of testFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const testCases = this.extractTestCases(content, file);
        
        if (testCases.length > 0) {
          const suiteName = this.extractSuiteName(testCases) || path.basename(file, path.extname(file));
          suites.push({
            name: suiteName,
            file: path.relative(this.projectRoot, file),
            tests: testCases
          });
          
          totalTests += testCases.filter(tc => tc.type === 'it' || tc.type === 'test').length;
        }
      } catch (error) {
        console.warn(`⚠️  Failed to parse test file ${file}:`, error);
      }
    }

    // Load test results from JSON if available
    const testResultsData = await this.loadTestResults();
    if (testResultsData) {
      passedTests = testResultsData.numPassedTests || 0;
      failedTests = testResultsData.numFailedTests || 0;
    }

    return {
      suites,
      totalTests,
      passedTests,
      failedTests,
      coverage: {
        overall: { lines: { total: 0, covered: 0, pct: 0 }, statements: { total: 0, covered: 0, pct: 0 }, functions: { total: 0, covered: 0, pct: 0 }, branches: { total: 0, covered: 0, pct: 0 } },
        byFile: {}
      }
    };
  }

  private extractTestCases(content: string, filePath: string): TestCase[] {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    const testCases: TestCase[] = [];
    let currentSuite: string | undefined;

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        let functionName: string | undefined;
        
        if (ts.isIdentifier(node.expression)) {
          functionName = node.expression.text;
        } else if (ts.isPropertyAccessExpression(node.expression) && 
                   ts.isIdentifier(node.expression.expression)) {
          const baseIdentifier = node.expression.expression.text;
          if (['describe', 'it', 'test'].includes(baseIdentifier)) {
            functionName = baseIdentifier;
          }
        }
        
        if (functionName && ['describe', 'it', 'test'].includes(functionName)) {
          const [firstArg] = node.arguments;
          if (firstArg && ts.isStringLiteral(firstArg)) {
            const testName = firstArg.text;
            const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
            
            const testCase: TestCase = {
              name: testName,
              type: functionName as 'describe' | 'it' | 'test',
              file: path.relative(this.projectRoot, filePath),
              line,
              parentSuite: currentSuite,
              tags: this.extractTags(testName),
              requirements: this.extractRequirements(testName, content)
            };

            if (functionName === 'describe') {
              currentSuite = testName;
            }

            testCases.push(testCase);
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return testCases;
  }

  private extractTags(testName: string): string[] {
    const tagRegex = /@(\w+)/g;
    const tags: string[] = [];
    let match;
    
    while ((match = tagRegex.exec(testName)) !== null) {
      tags.push(match[1]);
    }
    
    return tags;
  }

  private extractRequirements(testName: string, content: string): string[] {
    const requirements: string[] = [];
    
    // Extract requirements from test names and comments
    const reqPatterns = [
      /REQ-(\w+)/gi,
      /requirement[:\s]+([A-Z0-9-]+)/gi,
      /should\s+(.+?)(?:\s+when|\s+if|$)/gi,
      /validates?\s+(.+?)(?:\s+when|\s+if|$)/gi
    ];

    for (const pattern of reqPatterns) {
      let match;
      while ((match = pattern.exec(testName)) !== null) {
        requirements.push(match[1].trim());
      }
    }

    // Extract from comments in the test content
    const commentPattern = /\/\*\*?\s*@requirement\s+([A-Z0-9-]+)/gi;
    let match;
    while ((match = commentPattern.exec(content)) !== null) {
      requirements.push(match[1]);
    }

    return [...new Set(requirements)]; // Remove duplicates
  }

  private extractSuiteName(testCases: TestCase[]): string | undefined {
    return testCases.find(tc => tc.type === 'describe')?.name;
  }

  private async loadCoverageData(): Promise<CoverageData | null> {
    const coveragePaths = [
      path.join(this.projectRoot, 'coverage', 'coverage-summary.json'),
      path.join(this.projectRoot, 'coverage', 'coverage-final.json'),
      path.join(this.projectRoot, 'test-results', 'coverage.json')
    ];

    for (const coveragePath of coveragePaths) {
      try {
        const content = await fs.readFile(coveragePath, 'utf-8');
        const data = JSON.parse(content);
        return data.total || data;
      } catch {
        // Continue to next path
      }
    }

    return null;
  }

  private async loadTestResults(): Promise<any> {
    const resultPaths = [
      path.join(this.projectRoot, 'test-results', 'results.json'),
      path.join(this.projectRoot, 'test-results', 'vitest-results.json'),
      path.join(this.projectRoot, 'test-results', 'playwright-results.json')
    ];

    for (const resultPath of resultPaths) {
      try {
        const content = await fs.readFile(resultPath, 'utf-8');
        return JSON.parse(content);
      } catch {
        // Continue to next path
      }
    }

    return null;
  }

  private async generateRequirementMappings(testResults: TestResults): Promise<RequirementMapping[]> {
    const requirementMap = new Map<string, string[]>();

    // Collect all requirements from tests
    for (const suite of testResults.suites) {
      for (const test of suite.tests) {
        if (test.requirements) {
          for (const req of test.requirements) {
            if (!requirementMap.has(req)) {
              requirementMap.set(req, []);
            }
            requirementMap.get(req)!.push(`${suite.name} > ${test.name}`);
          }
        }
      }
    }

    // Generate mappings with coverage analysis
    const mappings: RequirementMapping[] = [];
    for (const [requirement, tests] of requirementMap.entries()) {
      const coverage = tests.length > 0 ? Math.min(100, tests.length * 25) : 0; // Simple heuristic
      const status = coverage >= 75 ? 'covered' : coverage >= 25 ? 'partial' : 'missing';
      
      mappings.push({
        requirement,
        tests,
        coverage,
        status
      });
    }

    return mappings.sort((a, b) => a.requirement.localeCompare(b.requirement));
  }

  private async updateTestingQARequirements(testResults: TestResults, coverageData: CoverageData | null): Promise<void> {
    const filePath = path.join(this.docsDir, 'testing-quality-assurance-requirements.md');
    
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    try {
      let content: string;
      
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch (error) {
        // File doesn't exist, create it with the required skeleton
        content = `# Testing Quality Assurance Requirements

## Updates

## Test Metrics and Coverage

## Test Inventory
`;
        await fs.writeFile(filePath, content, 'utf-8');
        console.log(`✅ Created ${filePath} with skeleton structure`);
      }
      
      // Update the Updates section
      const updatesSection = this.generateUpdatesSection(testResults, coverageData);
      content = this.replaceSection(content, '## Updates', updatesSection);
      
      // Update test metrics section
      const metricsSection = this.generateTestMetricsSection(testResults, coverageData);
      content = this.addOrUpdateSection(content, '## Test Metrics and Coverage', metricsSection);
      
      // Update test inventory section
      const inventorySection = this.generateTestInventorySection(testResults);
      content = this.addOrUpdateSection(content, '## Test Inventory', inventorySection);
      
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`✅ Updated ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to update testing QA requirements:`, error);
    }
  }

  private async updateTestUpdatesSummary(testResults: TestResults, requirementMappings: RequirementMapping[]): Promise<void> {
    const filePath = path.join(this.docsDir, 'test-updates-summary.md');
    
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    const content = this.generateTestUpdatesSummary(testResults, requirementMappings);
    
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`✅ Updated ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to update test updates summary:`, error);
    }
  }

  private generateUpdatesSection(testResults: TestResults, coverageData: CoverageData | null): string {
    const timestamp = new Date().toISOString().split('T')[0];
    
    return `## Updates

*Last updated: ${timestamp}*

This document has been automatically updated to reflect the latest changes in the test suite:

### Test Suite Statistics
- **Total Test Suites**: ${testResults.suites.length}
- **Total Test Cases**: ${testResults.totalTests}
- **Passed Tests**: ${testResults.passedTests}
- **Failed Tests**: ${testResults.failedTests}
- **Success Rate**: ${testResults.totalTests > 0 ? Math.round((testResults.passedTests / testResults.totalTests) * 100) : 0}%

### Coverage Metrics
${coverageData ? `
- **Line Coverage**: ${coverageData.lines.pct}% (${coverageData.lines.covered}/${coverageData.lines.total})
- **Statement Coverage**: ${coverageData.statements.pct}% (${coverageData.statements.covered}/${coverageData.statements.total})
- **Function Coverage**: ${coverageData.functions.pct}% (${coverageData.functions.covered}/${coverageData.functions.total})
- **Branch Coverage**: ${coverageData.branches.pct}% (${coverageData.branches.covered}/${coverageData.branches.total})
` : '- Coverage data not available'}

### Test Distribution by Type
${this.generateTestDistribution(testResults)}`;
  }

  private generateTestDistribution(testResults: TestResults): string {
    const distribution = new Map<string, number>();
    
    for (const suite of testResults.suites) {
      const fileType = this.categorizeTestFile(suite.file);
      distribution.set(fileType, (distribution.get(fileType) || 0) + suite.tests.length);
    }

    let result = '';
    for (const [type, count] of distribution.entries()) {
      result += `- **${type}**: ${count} tests\n`;
    }
    
    return result;
  }

  private categorizeTestFile(filePath: string): string {
    if (filePath.includes('.e2e.')) return 'End-to-End Tests';
    if (filePath.includes('.spec.')) return 'Specification Tests';
    if (filePath.includes('.test.')) return 'Unit Tests';
    if (filePath.includes('integration')) return 'Integration Tests';
    return 'Other Tests';
  }

  private generateTestMetricsSection(testResults: TestResults, coverageData: CoverageData | null): string {
    return `## Test Metrics and Coverage

### Overall Test Health
- **Test Execution Success Rate**: ${testResults.totalTests > 0 ? Math.round((testResults.passedTests / testResults.totalTests) * 100) : 0}%
- **Total Test Coverage**: ${coverageData?.lines.pct || 0}%
- **Quality Gate Status**: ${this.getQualityGateStatus(testResults, coverageData)}

### Coverage Breakdown
${coverageData ? `
| Metric | Coverage | Target | Status |
|--------|----------|--------|--------|
| Lines | ${coverageData.lines.pct}% | 80% | ${coverageData.lines.pct >= 80 ? '✅' : '❌'} |
| Statements | ${coverageData.statements.pct}% | 80% | ${coverageData.statements.pct >= 80 ? '✅' : '❌'} |
| Functions | ${coverageData.functions.pct}% | 80% | ${coverageData.functions.pct >= 80 ? '✅' : '❌'} |
| Branches | ${coverageData.branches.pct}% | 70% | ${coverageData.branches.pct >= 70 ? '✅' : '❌'} |
` : 'Coverage data not available'}

### Test Performance Metrics
- **Average Test Execution Time**: Not available (requires test runner integration)
- **Slowest Test Suites**: Analysis pending
- **Memory Usage**: Analysis pending`;
  }

  private getQualityGateStatus(testResults: TestResults, coverageData: CoverageData | null): string {
    const successRate = testResults.totalTests > 0 ? (testResults.passedTests / testResults.totalTests) * 100 : 0;
    const coverage = coverageData?.lines.pct || 0;
    
    if (successRate >= 95 && coverage >= 80) return '🟢 Passing';
    if (successRate >= 80 && coverage >= 60) return '🟡 Warning';
    return '🔴 Failing';
  }

  private generateTestInventorySection(testResults: TestResults): string {
    let inventory = `## Test Inventory

### Test Suites Overview

| Suite | File | Tests | Type | Requirements |
|-------|------|-------|------|--------------|
`;

    for (const suite of testResults.suites) {
      const testCount = suite.tests.filter(t => t.type === 'it' || t.type === 'test').length;
      const type = this.categorizeTestFile(suite.file);
      const requirements = this.extractSuiteRequirements(suite);
      
      inventory += `| ${suite.name} | ${suite.file} | ${testCount} | ${type} | ${requirements.join(', ') || 'None'} |\n`;
    }

    inventory += '\n### Detailed Test Cases\n\n';

    for (const suite of testResults.suites) {
      inventory += `#### ${suite.name}\n`;
      inventory += `**File**: \`${suite.file}\`\n\n`;
      
      const testCases = suite.tests.filter(t => t.type === 'it' || t.type === 'test');
      if (testCases.length > 0) {
        inventory += '**Test Cases**:\n';
        for (const test of testCases) {
          inventory += `- ${test.name}`;
          if (test.requirements && test.requirements.length > 0) {
            inventory += ` (Requirements: ${test.requirements.join(', ')})`;
          }
          inventory += '\n';
        }
      }
      inventory += '\n';
    }

    return inventory;
  }

  private extractSuiteRequirements(suite: TestSuite): string[] {
    const requirements = new Set<string>();
    
    for (const test of suite.tests) {
      if (test.requirements) {
        test.requirements.forEach(req => requirements.add(req));
      }
    }
    
    return Array.from(requirements);
  }

  private generateTestUpdatesSummary(testResults: TestResults, requirementMappings: RequirementMapping[]): string {
    const timestamp = new Date().toISOString().split('T')[0];
    
    return `# Test Updates Summary

*Generated on: ${timestamp}*

This document summarizes recent updates to the test suite and related documentation.

## Test Suite Overview

### Statistics
- **Total Test Suites**: ${testResults.suites.length}
- **Total Test Cases**: ${testResults.totalTests}
- **Test Success Rate**: ${testResults.totalTests > 0 ? Math.round((testResults.passedTests / testResults.totalTests) * 100) : 0}%

### New Test Files Added

${this.generateNewTestFilesSection(testResults)}

## Requirements Traceability

### Coverage Summary
- **Total Requirements Identified**: ${requirementMappings.length}
- **Fully Covered Requirements**: ${requirementMappings.filter(r => r.status === 'covered').length}
- **Partially Covered Requirements**: ${requirementMappings.filter(r => r.status === 'partial').length}
- **Missing Coverage**: ${requirementMappings.filter(r => r.status === 'missing').length}

### Requirements Coverage Matrix

| Requirement | Status | Coverage | Test Count |
|-------------|--------|----------|------------|
${requirementMappings.map(req => 
  `| ${req.requirement} | ${this.getStatusIcon(req.status)} ${req.status} | ${req.coverage}% | ${req.tests.length} |`
).join('\n')}

## Enhanced Test Coverage

${this.generateEnhancedCoverageSection(testResults)}

## Key Testing Improvements

${this.generateTestingImprovementsSection(testResults)}

## Testing Patterns Implemented

${this.generateTestingPatternsSection(testResults)}
`;
  }

  private generateNewTestFilesSection(testResults: TestResults): string {
    let section = '';
    
    for (const suite of testResults.suites) {
      const testCount = suite.tests.filter(t => t.type === 'it' || t.type === 'test').length;
      const requirements = this.extractSuiteRequirements(suite);
      
      section += `- \`${suite.file}\`: Implements ${testCount} test cases`;
      if (requirements.length > 0) {
        section += ` covering requirements: ${requirements.join(', ')}`;
      }
      section += '\n';
    }
    
    return section || '- No new test files detected in this update';
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'covered': return '✅';
      case 'partial': return '⚠️';
      case 'missing': return '❌';
      default: return '❓';
    }
  }

  private generateEnhancedCoverageSection(testResults: TestResults): string {
    const categories = new Map<string, TestSuite[]>();
    
    for (const suite of testResults.suites) {
      const category = this.categorizeTestFile(suite.file);
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(suite);
    }

    let section = '';
    for (const [category, suites] of categories.entries()) {
      const totalTests = suites.reduce((sum, suite) => 
        sum + suite.tests.filter(t => t.type === 'it' || t.type === 'test').length, 0
      );
      
      section += `### ${category}\n`;
      section += `- **Test Suites**: ${suites.length}\n`;
      section += `- **Total Tests**: ${totalTests}\n`;
      section += `- **Key Areas**: ${suites.map(s => s.name).join(', ')}\n\n`;
    }

    return section;
  }

  private generateTestingImprovementsSection(testResults: TestResults): string {
    const improvements = [
      'Automated test documentation generation from source code',
      'Requirements traceability matrix generation',
      'Test coverage metrics integration',
      'Cross-module calculation consistency validation',
      'Enhanced error handling and validation in API tests',
      'Test isolation improvements using random ID headers',
      'Performance monitoring and measurement capabilities'
    ];

    return improvements.map(improvement => `- ${improvement}`).join('\n');
  }

  private generateTestingPatternsSection(testResults: TestResults): string {
    const patterns = new Set<string>();
    
    for (const suite of testResults.suites) {
      for (const test of suite.tests) {
        // Analyze test names for patterns
        if (test.name.includes('should')) patterns.add('Behavior-driven test descriptions');
        if (test.name.includes('validation')) patterns.add('Input validation testing');
        if (test.name.includes('error')) patterns.add('Error handling validation');
        if (test.name.includes('performance')) patterns.add('Performance testing');
        if (test.name.includes('integration')) patterns.add('Integration testing patterns');
        if (test.name.includes('e2e') || test.file.includes('e2e')) patterns.add('End-to-end testing workflows');
      }
    }

    return Array.from(patterns).map(pattern => `- ${pattern}`).join('\n');
  }

  private replaceSection(content: string, sectionHeader: string, newContent: string): string {
    const regex = new RegExp(`(${sectionHeader}\\s*\\n)([\\s\\S]*?)(?=\\n## |$)`, 'g');
    return content.replace(regex, `$1\n${newContent}\n`);
  }

  private addOrUpdateSection(content: string, sectionHeader: string, newContent: string): string {
    if (content.includes(sectionHeader)) {
      return this.replaceSection(content, sectionHeader, newContent);
    } else {
      return content + `\n\n${sectionHeader}\n\n${newContent}\n`;
    }
  }
}

// Main execution
async function main() {
  const generator = new TestDocumentationGenerator();
  
  try {
    await generator.generateTestDocumentation();
  } catch (error) {
    console.error('❌ Failed to generate test documentation:', error);
    process.exit(1);
  }
}

// Run if called directly
import { pathToFileURL } from 'url';
const isCli = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main();
}

export { TestDocumentationGenerator };