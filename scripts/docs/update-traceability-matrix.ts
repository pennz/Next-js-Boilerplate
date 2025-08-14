#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface RequirementItem {
  id: string;
  description: string;
  type: 'business' | 'functional' | 'non-functional';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'implemented' | 'partial' | 'missing' | 'obsolete';
  implementationFiles: string[];
  testFiles: string[];
  apiEndpoints: string[];
  uiComponents: string[];
  lastUpdated: string;
  manualAnnotations?: string;
}

interface TraceabilityMatrix {
  part: number;
  title: string;
  requirements: RequirementItem[];
  metadata: {
    lastGenerated: string;
    totalRequirements: number;
    implementedCount: number;
    partialCount: number;
    missingCount: number;
    coveragePercentage: number;
  };
}

interface ImplementationReference {
  file: string;
  type: 'component' | 'api' | 'service' | 'test' | 'schema';
  requirements: string[];
  lastModified: Date;
}

interface OrphanedItem {
  type: 'requirement' | 'implementation';
  id: string;
  description: string;
  file?: string;
  reason: string;
}

class TraceabilityMatrixUpdater {
  private readonly docsPath: string;
  private readonly srcPath: string;
  private readonly testsPath: string;
  private readonly apiPath: string;
  private readonly componentsPath: string;
  
  private matrices: Map<number, TraceabilityMatrix> = new Map();
  private implementations: Map<string, ImplementationReference> = new Map();
  private orphanedItems: OrphanedItem[] = [];

  constructor(projectRoot: string = process.cwd()) {
    this.docsPath = path.join(projectRoot, 'docs');
    this.srcPath = path.join(projectRoot, 'src');
    this.testsPath = path.join(projectRoot, 'tests');
    this.apiPath = path.join(projectRoot, 'src/app/api');
    this.componentsPath = path.join(projectRoot, 'src/components');
  }

  /**
   * Main execution method to update all traceability matrices
   */
  async updateTraceabilityMatrices(): Promise<void> {
    console.log('🔄 Starting traceability matrix update...');
    
    try {
      // Step 1: Parse existing traceability matrix files
      await this.parseExistingMatrices();
      
      // Step 2: Scan codebase for implementations
      await this.scanCodebaseImplementations();
      
      // Step 3: Cross-reference requirements with implementations
      await this.crossReferenceRequirements();
      
      // Step 4: Identify orphaned items
      await this.identifyOrphanedItems();
      
      // Step 5: Update status and generate new matrices
      await this.updateMatrixStatus();
      
      // Step 6: Generate updated matrix files
      await this.generateUpdatedMatrices();
      
      // Step 7: Generate coverage analysis report
      await this.generateCoverageAnalysis();
      
      console.log('✅ Traceability matrix update completed successfully!');
      
    } catch (error) {
      console.error('❌ Error updating traceability matrices:', error);
      throw error;
    }
  }

  /**
   * Parse existing traceability matrix files
   */
  private async parseExistingMatrices(): Promise<void> {
    console.log('📖 Parsing existing traceability matrix files...');
    
    const matrixFiles = await glob('requirements-traceability-matrix-part*.md', {
      cwd: this.docsPath,
      absolute: true
    });

    for (const filePath of matrixFiles) {
      const partNumber = this.extractPartNumber(filePath);
      if (partNumber) {
        const matrix = await this.parseMatrixFile(filePath, partNumber);
        this.matrices.set(partNumber, matrix);
        console.log(`  ✓ Parsed Part ${partNumber}: ${matrix.requirements.length} requirements`);
      }
    }
  }

  /**
   * Extract part number from matrix file path
   */
  private extractPartNumber(filePath: string): number | null {
    const match = filePath.match(/part(\d+)\.md$/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Parse individual matrix file and extract requirements
   */
  private async parseMatrixFile(filePath: string, partNumber: number): Promise<TraceabilityMatrix> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const requirements: RequirementItem[] = [];
    
    // Extract title from the first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : `Part ${partNumber}`;

    // Parse requirements from tables and text
    const requirementMatches = this.extractRequirementsFromContent(content);
    
    for (const match of requirementMatches) {
      const requirement: RequirementItem = {
        id: match.id,
        description: match.description,
        type: this.determineRequirementType(match.id, match.description),
        priority: this.determinePriority(match.description),
        status: 'missing', // Will be updated during cross-reference
        implementationFiles: [],
        testFiles: [],
        apiEndpoints: [],
        uiComponents: [],
        lastUpdated: new Date().toISOString(),
        manualAnnotations: match.annotations
      };
      
      requirements.push(requirement);
    }

    return {
      part: partNumber,
      title,
      requirements,
      metadata: {
        lastGenerated: new Date().toISOString(),
        totalRequirements: requirements.length,
        implementedCount: 0,
        partialCount: 0,
        missingCount: requirements.length,
        coveragePercentage: 0
      }
    };
  }

  /**
   * Extract requirements from markdown content using regex patterns
   */
  private extractRequirementsFromContent(content: string): Array<{
    id: string;
    description: string;
    annotations?: string;
  }> {
    const requirements: Array<{ id: string; description: string; annotations?: string }> = [];
    
    // Pattern 1: Table rows with requirement IDs
    const tableRowPattern = /\|\s*([A-Z]{2,3}-[A-Z]{2,3}-\d{3})\s*\|\s*([^|]+)\s*\|/g;
    let match;
    
    while ((match = tableRowPattern.exec(content)) !== null) {
      const id = match[1].trim();
      const description = match[2].trim();
      
      if (id && description && !requirements.find(r => r.id === id)) {
        requirements.push({ id, description });
      }
    }

    // Pattern 2: Functional requirement definitions
    const frPattern = /\*\*(FR-[A-Z]{2,3}-\d{3}):\s*([^*]+)\*\*/g;
    while ((match = frPattern.exec(content)) !== null) {
      const id = match[1].trim();
      const description = match[2].trim();
      
      if (!requirements.find(r => r.id === id)) {
        requirements.push({ id, description });
      }
    }

    // Pattern 3: Business requirement definitions
    const brPattern = /\*\*(BR-\d{3}):\s*([^*]+)\*\*/g;
    while ((match = brPattern.exec(content)) !== null) {
      const id = match[1].trim();
      const description = match[2].trim();
      
      if (!requirements.find(r => r.id === id)) {
        requirements.push({ id, description });
      }
    }

    // Pattern 4: Non-functional requirement definitions
    const nfrPattern = /\*\*(NFR-[A-Z]-\d{3}):\s*([^*]+)\*\*/g;
    while ((match = nfrPattern.exec(content)) !== null) {
      const id = match[1].trim();
      const description = match[2].trim();
      
      if (!requirements.find(r => r.id === id)) {
        requirements.push({ id, description });
      }
    }

    return requirements;
  }

  /**
   * Determine requirement type based on ID pattern
   */
  private determineRequirementType(id: string, description: string): 'business' | 'functional' | 'non-functional' {
    if (id.startsWith('BR-')) return 'business';
    if (id.startsWith('NFR-')) return 'non-functional';
    if (id.startsWith('FR-')) return 'functional';
    
    // Fallback based on description keywords
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('business') || lowerDesc.includes('user')) return 'business';
    if (lowerDesc.includes('performance') || lowerDesc.includes('security') || lowerDesc.includes('accessibility')) return 'non-functional';
    
    return 'functional';
  }

  /**
   * Determine priority based on description keywords
   */
  private determinePriority(description: string): 'critical' | 'high' | 'medium' | 'low' {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('critical') || lowerDesc.includes('security') || lowerDesc.includes('authentication')) {
      return 'critical';
    }
    if (lowerDesc.includes('high') || lowerDesc.includes('core') || lowerDesc.includes('essential')) {
      return 'high';
    }
    if (lowerDesc.includes('low') || lowerDesc.includes('nice to have') || lowerDesc.includes('optional')) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Scan codebase for implementation files and extract requirement references
   */
  private async scanCodebaseImplementations(): Promise<void> {
    console.log('🔍 Scanning codebase for implementations...');
    
    // Scan different types of implementation files
    await this.scanComponents();
    await this.scanApiEndpoints();
    await this.scanServices();
    await this.scanTestFiles();
    await this.scanDatabaseSchemas();
    
    console.log(`  ✓ Found ${this.implementations.size} implementation files`);
  }

  /**
   * Scan React components for requirement references
   */
  private async scanComponents(): Promise<void> {
    const componentFiles = await glob('**/*.{tsx,jsx}', {
      cwd: this.componentsPath,
      absolute: true,
      ignore: ['**/*.test.*', '**/*.spec.*']
    });

    for (const filePath of componentFiles) {
      const requirements = await this.extractRequirementsFromFile(filePath);
      if (requirements.length > 0) {
        const relativePath = path.relative(process.cwd(), filePath);
        this.implementations.set(relativePath, {
          file: relativePath,
          type: 'component',
          requirements,
          lastModified: fs.statSync(filePath).mtime
        });
      }
    }
  }

  /**
   * Scan API endpoints for requirement references
   */
  private async scanApiEndpoints(): Promise<void> {
    const apiFiles = await glob('**/route.{ts,js}', {
      cwd: this.apiPath,
      absolute: true
    });

    for (const filePath of apiFiles) {
      const requirements = await this.extractRequirementsFromFile(filePath);
      if (requirements.length > 0) {
        const relativePath = path.relative(process.cwd(), filePath);
        this.implementations.set(relativePath, {
          file: relativePath,
          type: 'api',
          requirements,
          lastModified: fs.statSync(filePath).mtime
        });
      }
    }
  }

  /**
   * Scan service files for requirement references
   */
  private async scanServices(): Promise<void> {
    const serviceFiles = await glob('**/services/**/*.{ts,js}', {
      cwd: this.srcPath,
      absolute: true,
      ignore: ['**/*.test.*', '**/*.spec.*']
    });

    for (const filePath of serviceFiles) {
      const requirements = await this.extractRequirementsFromFile(filePath);
      if (requirements.length > 0) {
        const relativePath = path.relative(process.cwd(), filePath);
        this.implementations.set(relativePath, {
          file: relativePath,
          type: 'service',
          requirements,
          lastModified: fs.statSync(filePath).mtime
        });
      }
    }
  }

  /**
   * Scan test files for requirement coverage
   */
  private async scanTestFiles(): Promise<void> {
    const testFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', {
      cwd: this.testsPath,
      absolute: true
    });

    // Also scan test files in src directory
    const srcTestFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', {
      cwd: this.srcPath,
      absolute: true
    });

    const allTestFiles = [...testFiles, ...srcTestFiles];

    for (const filePath of allTestFiles) {
      const requirements = await this.extractRequirementsFromFile(filePath);
      if (requirements.length > 0) {
        const relativePath = path.relative(process.cwd(), filePath);
        this.implementations.set(relativePath, {
          file: relativePath,
          type: 'test',
          requirements,
          lastModified: fs.statSync(filePath).mtime
        });
      }
    }
  }

  /**
   * Scan database schema files for requirement references
   */
  private async scanDatabaseSchemas(): Promise<void> {
    const schemaFiles = await glob('**/models/**/*.{ts,js}', {
      cwd: this.srcPath,
      absolute: true
    });

    for (const filePath of schemaFiles) {
      const requirements = await this.extractRequirementsFromFile(filePath);
      if (requirements.length > 0) {
        const relativePath = path.relative(process.cwd(), filePath);
        this.implementations.set(relativePath, {
          file: relativePath,
          type: 'schema',
          requirements,
          lastModified: fs.statSync(filePath).mtime
        });
      }
    }
  }

  /**
   * Extract requirement references from a file
   */
  private async extractRequirementsFromFile(filePath: string): Promise<string[]> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const requirements: string[] = [];
      
      // Pattern 1: Comments with requirement IDs
      const commentPattern = /\/\/.*?([A-Z]{2,3}-[A-Z]{2,3}-\d{3}|BR-\d{3}|NFR-[A-Z]-\d{3})/g;
      let match;
      
      while ((match = commentPattern.exec(content)) !== null) {
        const reqId = match[1];
        if (!requirements.includes(reqId)) {
          requirements.push(reqId);
        }
      }

      // Pattern 2: JSDoc comments with requirement references
      const jsdocPattern = /@requirement\s+([A-Z]{2,3}-[A-Z]{2,3}-\d{3}|BR-\d{3}|NFR-[A-Z]-\d{3})/g;
      while ((match = jsdocPattern.exec(content)) !== null) {
        const reqId = match[1];
        if (!requirements.includes(reqId)) {
          requirements.push(reqId);
        }
      }

      // Pattern 3: Test descriptions with requirement IDs
      const testPattern = /(?:describe|test|it)\s*\(\s*['"`].*?([A-Z]{2,3}-[A-Z]{2,3}-\d{3}|BR-\d{3}|NFR-[A-Z]-\d{3})/g;
      while ((match = testPattern.exec(content)) !== null) {
        const reqId = match[1];
        if (!requirements.includes(reqId)) {
          requirements.push(reqId);
        }
      }

      // Pattern 4: API endpoint paths that might correspond to requirements
      if (filePath.includes('/api/')) {
        const apiPath = this.extractApiPath(filePath);
        if (apiPath) {
          // Map API paths to potential requirements based on naming conventions
          const mappedReqs = this.mapApiPathToRequirements(apiPath);
          requirements.push(...mappedReqs.filter(req => !requirements.includes(req)));
        }
      }

      return requirements;
      
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Extract API path from file path
   */
  private extractApiPath(filePath: string): string | null {
    const apiMatch = filePath.match(/\/api\/(.+)\/route\.[jt]s$/);
    return apiMatch ? `/api/${apiMatch[1]}` : null;
  }

  /**
   * Map API paths to potential requirements based on naming conventions
   */
  private mapApiPathToRequirements(apiPath: string): string[] {
    const requirements: string[] = [];
    
    // Health-related APIs
    if (apiPath.includes('/health')) {
      if (apiPath.includes('/records')) requirements.push('FR-HLT-001', 'FR-HLT-004');
      if (apiPath.includes('/goals')) requirements.push('FR-HLT-010', 'FR-HLT-011');
      if (apiPath.includes('/reminders')) requirements.push('FR-HLT-014', 'FR-HLT-015');
      if (apiPath.includes('/analytics')) requirements.push('FR-HLT-006', 'FR-HLT-008');
    }
    
    // Exercise-related APIs
    if (apiPath.includes('/exercise')) {
      if (apiPath.includes('/library')) requirements.push('FR-EXE-001', 'FR-EXE-003');
      if (apiPath.includes('/plans')) requirements.push('FR-EXE-005', 'FR-EXE-007');
      if (apiPath.includes('/sessions')) requirements.push('FR-EXE-009', 'FR-EXE-010');
    }
    
    // Authentication APIs
    if (apiPath.includes('/auth')) {
      requirements.push('FR-AUT-001', 'FR-AUT-003');
    }
    
    return requirements;
  }

  /**
   * Cross-reference requirements with implementations
   */
  private async crossReferenceRequirements(): Promise<void> {
    console.log('🔗 Cross-referencing requirements with implementations...');
    
    for (const [partNumber, matrix] of this.matrices) {
      for (const requirement of matrix.requirements) {
        // Find implementations that reference this requirement
        for (const [filePath, impl] of this.implementations) {
          if (impl.requirements.includes(requirement.id)) {
            switch (impl.type) {
              case 'component':
                requirement.uiComponents.push(filePath);
                break;
              case 'api':
                requirement.apiEndpoints.push(filePath);
                break;
              case 'service':
                requirement.implementationFiles.push(filePath);
                break;
              case 'test':
                requirement.testFiles.push(filePath);
                break;
              case 'schema':
                requirement.implementationFiles.push(filePath);
                break;
            }
          }
        }
        
        // Update requirement status based on implementations found
        requirement.status = this.determineRequirementStatus(requirement);
        requirement.lastUpdated = new Date().toISOString();
      }
    }
  }

  /**
   * Determine requirement status based on implementation coverage
   */
  private determineRequirementStatus(requirement: RequirementItem): 'implemented' | 'partial' | 'missing' | 'obsolete' {
    const hasImplementation = requirement.implementationFiles.length > 0 || 
                             requirement.apiEndpoints.length > 0 || 
                             requirement.uiComponents.length > 0;
    const hasTests = requirement.testFiles.length > 0;
    
    if (hasImplementation && hasTests) {
      return 'implemented';
    } else if (hasImplementation || hasTests) {
      return 'partial';
    } else {
      return 'missing';
    }
  }

  /**
   * Identify orphaned requirements and implementations
   */
  private async identifyOrphanedItems(): Promise<void> {
    console.log('🔍 Identifying orphaned items...');
    
    // Find requirements without implementations
    for (const [partNumber, matrix] of this.matrices) {
      for (const requirement of matrix.requirements) {
        if (requirement.status === 'missing') {
          this.orphanedItems.push({
            type: 'requirement',
            id: requirement.id,
            description: requirement.description,
            reason: 'No implementation found in codebase'
          });
        }
      }
    }
    
    // Find implementations without requirement references
    const allRequirementIds = new Set<string>();
    for (const matrix of this.matrices.values()) {
      for (const req of matrix.requirements) {
        allRequirementIds.add(req.id);
      }
    }
    
    for (const [filePath, impl] of this.implementations) {
      const orphanedReqs = impl.requirements.filter(reqId => !allRequirementIds.has(reqId));
      if (orphanedReqs.length > 0) {
        this.orphanedItems.push({
          type: 'implementation',
          id: filePath,
          description: `Implementation references unknown requirements: ${orphanedReqs.join(', ')}`,
          file: filePath,
          reason: 'References non-existent requirements'
        });
      }
    }
    
    console.log(`  ✓ Found ${this.orphanedItems.length} orphaned items`);
  }

  /**
   * Update matrix metadata and statistics
   */
  private async updateMatrixStatus(): Promise<void> {
    console.log('📊 Updating matrix status and statistics...');
    
    for (const [partNumber, matrix] of this.matrices) {
      const implemented = matrix.requirements.filter(r => r.status === 'implemented').length;
      const partial = matrix.requirements.filter(r => r.status === 'partial').length;
      const missing = matrix.requirements.filter(r => r.status === 'missing').length;
      const total = matrix.requirements.length;
      
      matrix.metadata = {
        lastGenerated: new Date().toISOString(),
        totalRequirements: total,
        implementedCount: implemented,
        partialCount: partial,
        missingCount: missing,
        coveragePercentage: total > 0 ? Math.round(((implemented + partial * 0.5) / total) * 100) : 0
      };
      
      console.log(`  ✓ Part ${partNumber}: ${matrix.metadata.coveragePercentage}% coverage (${implemented}/${total} implemented)`);
    }
  }

  /**
   * Generate updated matrix files
   */
  private async generateUpdatedMatrices(): Promise<void> {
    console.log('📝 Generating updated matrix files...');
    
    for (const [partNumber, matrix] of this.matrices) {
      const outputPath = path.join(this.docsPath, `requirements-traceability-matrix-part${partNumber}.md`);
      const content = await this.generateMatrixContent(matrix);
      
      // Preserve manual annotations by merging with existing content
      const mergedContent = await this.mergeWithExistingContent(outputPath, content);
      
      fs.writeFileSync(outputPath, mergedContent, 'utf-8');
      console.log(`  ✓ Updated Part ${partNumber}: ${outputPath}`);
    }
  }

  /**
   * Generate matrix content in markdown format
   */
  private async generateMatrixContent(matrix: TraceabilityMatrix): Promise<string> {
    const statusEmoji = {
      implemented: '✅',
      partial: '⚠️',
      missing: '❌',
      obsolete: '🗑️'
    };
    
    let content = `# ${matrix.title}\n\n`;
    
    // Add metadata section
    content += `## Matrix Metadata\n\n`;
    content += `- **Last Generated:** ${matrix.metadata.lastGenerated}\n`;
    content += `- **Total Requirements:** ${matrix.metadata.totalRequirements}\n`;
    content += `- **Implementation Coverage:** ${matrix.metadata.coveragePercentage}%\n`;
    content += `- **Status Distribution:**\n`;
    content += `  - ✅ Implemented: ${matrix.metadata.implementedCount}\n`;
    content += `  - ⚠️ Partial: ${matrix.metadata.partialCount}\n`;
    content += `  - ❌ Missing: ${matrix.metadata.missingCount}\n\n`;
    
    // Add requirements table
    content += `## Requirements Implementation Status\n\n`;
    content += `| Requirement ID | Description | Status | Implementation Files | Test Files | API Endpoints | UI Components |\n`;
    content += `|----------------|-------------|--------|---------------------|------------|---------------|---------------|\n`;
    
    for (const req of matrix.requirements) {
      const status = `${statusEmoji[req.status]} ${req.status}`;
      const implFiles = req.implementationFiles.length > 0 ? req.implementationFiles.join('<br>') : '-';
      const testFiles = req.testFiles.length > 0 ? req.testFiles.join('<br>') : '-';
      const apiEndpoints = req.apiEndpoints.length > 0 ? req.apiEndpoints.join('<br>') : '-';
      const uiComponents = req.uiComponents.length > 0 ? req.uiComponents.join('<br>') : '-';
      
      content += `| ${req.id} | ${req.description} | ${status} | ${implFiles} | ${testFiles} | ${apiEndpoints} | ${uiComponents} |\n`;
    }
    
    content += `\n`;
    
    // Add detailed implementation mapping
    content += `## Detailed Implementation Mapping\n\n`;
    
    for (const req of matrix.requirements) {
      if (req.status !== 'missing') {
        content += `### ${req.id}: ${req.description}\n\n`;
        content += `**Status:** ${statusEmoji[req.status]} ${req.status}\n`;
        content += `**Priority:** ${req.priority}\n`;
        content += `**Last Updated:** ${req.lastUpdated}\n\n`;
        
        if (req.implementationFiles.length > 0) {
          content += `**Implementation Files:**\n`;
          for (const file of req.implementationFiles) {
            content += `- \`${file}\`\n`;
          }
          content += `\n`;
        }
        
        if (req.testFiles.length > 0) {
          content += `**Test Coverage:**\n`;
          for (const file of req.testFiles) {
            content += `- \`${file}\`\n`;
          }
          content += `\n`;
        }
        
        if (req.apiEndpoints.length > 0) {
          content += `**API Endpoints:**\n`;
          for (const endpoint of req.apiEndpoints) {
            content += `- \`${endpoint}\`\n`;
          }
          content += `\n`;
        }
        
        if (req.uiComponents.length > 0) {
          content += `**UI Components:**\n`;
          for (const component of req.uiComponents) {
            content += `- \`${component}\`\n`;
          }
          content += `\n`;
        }
        
        if (req.manualAnnotations) {
          content += `**Manual Annotations:**\n${req.manualAnnotations}\n\n`;
        }
        
        content += `---\n\n`;
      }
    }
    
    return content;
  }

  /**
   * Merge generated content with existing manual annotations
   */
  private async mergeWithExistingContent(filePath: string, newContent: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      return newContent;
    }
    
    const existingContent = fs.readFileSync(filePath, 'utf-8');
    
    // Extract manual annotations from existing content
    const manualSections = this.extractManualSections(existingContent);
    
    // Merge manual sections back into new content
    let mergedContent = newContent;
    
    for (const [sectionId, sectionContent] of manualSections) {
      // Find the appropriate place to insert manual content
      const insertionPoint = mergedContent.indexOf(`### ${sectionId}:`);
      if (insertionPoint !== -1) {
        const endOfSection = mergedContent.indexOf('---', insertionPoint);
        if (endOfSection !== -1) {
          const beforeSection = mergedContent.substring(0, endOfSection);
          const afterSection = mergedContent.substring(endOfSection);
          mergedContent = beforeSection + sectionContent + '\n\n' + afterSection;
        }
      }
    }
    
    return mergedContent;
  }

  /**
   * Extract manual sections from existing content
   */
  private extractManualSections(content: string): Map<string, string> {
    const sections = new Map<string, string>();
    
    // Look for manual annotation sections
    const manualSectionPattern = /### ([A-Z]{2,3}-[A-Z]{2,3}-\d{3}|BR-\d{3}|NFR-[A-Z]-\d{3}):[^#]*?\*\*Manual Annotations:\*\*\n(.*?)(?=\n---|\n###|\n##|$)/gs;
    let match;
    
    while ((match = manualSectionPattern.exec(content)) !== null) {
      const reqId = match[1];
      const annotations = match[2].trim();
      if (annotations) {
        sections.set(reqId, `**Manual Annotations:**\n${annotations}`);
      }
    }
    
    return sections;
  }

  /**
   * Generate coverage analysis report
   */
  private async generateCoverageAnalysis(): Promise<void> {
    console.log('📈 Generating coverage analysis report...');
    
    const reportPath = path.join(this.docsPath, 'traceability-coverage-analysis.md');
    let report = `# Requirements Traceability Coverage Analysis\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    // Overall statistics
    let totalReqs = 0;
    let totalImplemented = 0;
    let totalPartial = 0;
    let totalMissing = 0;
    
    for (const matrix of this.matrices.values()) {
      totalReqs += matrix.metadata.totalRequirements;
      totalImplemented += matrix.metadata.implementedCount;
      totalPartial += matrix.metadata.partialCount;
      totalMissing += matrix.metadata.missingCount;
    }
    
    const overallCoverage = totalReqs > 0 ? Math.round(((totalImplemented + totalPartial * 0.5) / totalReqs) * 100) : 0;
    
    report += `## Overall Coverage Summary\n\n`;
    report += `- **Total Requirements:** ${totalReqs}\n`;
    report += `- **Overall Coverage:** ${overallCoverage}%\n`;
    report += `- **Fully Implemented:** ${totalImplemented} (${Math.round((totalImplemented / totalReqs) * 100)}%)\n`;
    report += `- **Partially Implemented:** ${totalPartial} (${Math.round((totalPartial / totalReqs) * 100)}%)\n`;
    report += `- **Missing Implementation:** ${totalMissing} (${Math.round((totalMissing / totalReqs) * 100)}%)\n\n`;
    
    // Coverage by matrix part
    report += `## Coverage by Matrix Part\n\n`;
    report += `| Part | Title | Requirements | Coverage | Implemented | Partial | Missing |\n`;
    report += `|------|-------|--------------|----------|-------------|---------|----------|\n`;
    
    for (const [partNumber, matrix] of this.matrices) {
      report += `| ${partNumber} | ${matrix.title} | ${matrix.metadata.totalRequirements} | ${matrix.metadata.coveragePercentage}% | ${matrix.metadata.implementedCount} | ${matrix.metadata.partialCount} | ${matrix.metadata.missingCount} |\n`;
    }
    
    report += `\n`;
    
    // Orphaned items
    if (this.orphanedItems.length > 0) {
      report += `## Orphaned Items\n\n`;
      
      const orphanedReqs = this.orphanedItems.filter(item => item.type === 'requirement');
      const orphanedImpls = this.orphanedItems.filter(item => item.type === 'implementation');
      
      if (orphanedReqs.length > 0) {
        report += `### Requirements Without Implementation\n\n`;
        for (const item of orphanedReqs) {
          report += `- **${item.id}:** ${item.description}\n`;
        }
        report += `\n`;
      }
      
      if (orphanedImpls.length > 0) {
        report += `### Implementations Without Requirements\n\n`;
        for (const item of orphanedImpls) {
          report += `- **${item.id}:** ${item.description}\n`;
        }
        report += `\n`;
      }
    }
    
    // Implementation distribution
    report += `## Implementation Distribution\n\n`;
    const implStats = this.calculateImplementationStats();
    
    report += `### By File Type\n\n`;
    report += `| Type | Count | Requirements Covered |\n`;
    report += `|------|-------|---------------------|\n`;
    
    for (const [type, stats] of implStats.byType) {
      report += `| ${type} | ${stats.fileCount} | ${stats.requirementCount} |\n`;
    }
    
    report += `\n`;
    
    // Recommendations
    report += `## Recommendations\n\n`;
    
    if (totalMissing > 0) {
      report += `### High Priority Actions\n\n`;
      report += `1. **Implement Missing Requirements:** ${totalMissing} requirements have no implementation\n`;
      
      // Find critical missing requirements
      const criticalMissing = [];
      for (const matrix of this.matrices.values()) {
        for (const req of matrix.requirements) {
          if (req.status === 'missing' && req.priority === 'critical') {
            criticalMissing.push(req);
          }
        }
      }
      
      if (criticalMissing.length > 0) {
        report += `2. **Critical Missing Requirements:**\n`;
        for (const req of criticalMissing) {
          report += `   - ${req.id}: ${req.description}\n`;
        }
      }
      
      report += `\n`;
    }
    
    if (totalPartial > 0) {
      report += `### Medium Priority Actions\n\n`;
      report += `1. **Complete Partial Implementations:** ${totalPartial} requirements are partially implemented\n`;
      report += `2. **Add Missing Test Coverage:** Ensure all implementations have corresponding tests\n\n`;
    }
    
    if (this.orphanedItems.length > 0) {
      report += `### Maintenance Actions\n\n`;
      report += `1. **Clean Up Orphaned Items:** ${this.orphanedItems.length} orphaned items need attention\n`;
      report += `2. **Update Requirement References:** Ensure all implementation files reference correct requirements\n\n`;
    }
    
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`  ✓ Coverage analysis saved to: ${reportPath}`);
  }

  /**
   * Calculate implementation statistics
   */
  private calculateImplementationStats(): {
    byType: Map<string, { fileCount: number; requirementCount: number }>;
  } {
    const byType = new Map<string, { fileCount: number; requirementCount: number }>();
    
    for (const impl of this.implementations.values()) {
      const current = byType.get(impl.type) || { fileCount: 0, requirementCount: 0 };
      current.fileCount++;
      current.requirementCount += impl.requirements.length;
      byType.set(impl.type, current);
    }
    
    return { byType };
  }

  /**
   * Generate summary report for console output
   */
  private generateSummaryReport(): void {
    console.log('\n📊 Traceability Matrix Update Summary:');
    console.log('=====================================');
    
    let totalReqs = 0;
    let totalCoverage = 0;
    
    for (const [partNumber, matrix] of this.matrices) {
      totalReqs += matrix.metadata.totalRequirements;
      totalCoverage += matrix.metadata.coveragePercentage * matrix.metadata.totalRequirements;
      
      console.log(`Part ${partNumber}: ${matrix.metadata.coveragePercentage}% coverage (${matrix.metadata.implementedCount}/${matrix.metadata.totalRequirements} implemented)`);
    }
    
    const overallCoverage = totalReqs > 0 ? Math.round(totalCoverage / totalReqs) : 0;
    
    console.log(`\nOverall Coverage: ${overallCoverage}% (${totalReqs} total requirements)`);
    console.log(`Implementation Files: ${this.implementations.size}`);
    console.log(`Orphaned Items: ${this.orphanedItems.length}`);
    
    if (this.orphanedItems.length > 0) {
      console.log('\n⚠️  Attention Required:');
      const orphanedReqs = this.orphanedItems.filter(item => item.type === 'requirement').length;
      const orphanedImpls = this.orphanedItems.filter(item => item.type === 'implementation').length;
      
      if (orphanedReqs > 0) {
        console.log(`   - ${orphanedReqs} requirements without implementation`);
      }
      if (orphanedImpls > 0) {
        console.log(`   - ${orphanedImpls} implementations without requirement references`);
      }
    }
    
    console.log('\n✅ Update completed successfully!');
  }
}

// CLI execution
async function main(): Promise<void> {
  const updater = new TraceabilityMatrixUpdater();
  
  try {
    await updater.updateTraceabilityMatrices();
    updater.generateSummaryReport();
  } catch (error) {
    console.error('❌ Failed to update traceability matrices:', error);
    process.exit(1);
  }
}

// Export for use as module
export { TraceabilityMatrixUpdater };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}