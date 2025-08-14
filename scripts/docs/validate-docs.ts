#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { marked } from 'marked';
import chalk from 'chalk';

interface ValidationIssue {
  file: string;
  line?: number;
  column?: number;
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  suggestion?: string;
}

interface ValidationReport {
  summary: {
    totalFiles: number;
    filesWithIssues: number;
    totalIssues: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  issues: ValidationIssue[];
  timestamp: string;
}

interface StyleGuideRule {
  name: string;
  pattern: RegExp;
  message: string;
  type: 'error' | 'warning';
}

interface RequiredSection {
  name: string;
  pattern: RegExp;
  required: boolean;
}

class DocumentationValidator {
  private docsPath: string;
  private issues: ValidationIssue[] = [];
  private processedFiles = new Set<string>();
  
  // Style guide rules
  private styleRules: StyleGuideRule[] = [
    {
      name: 'heading-capitalization',
      pattern: /^#+\s+[a-z]/m,
      message: 'Headings should start with a capital letter',
      type: 'warning'
    },
    {
      name: 'trailing-whitespace',
      pattern: /\s+$/m,
      message: 'Lines should not have trailing whitespace',
      type: 'warning'
    },
    {
      name: 'multiple-blank-lines',
      pattern: /\n\n\n+/,
      message: 'Avoid multiple consecutive blank lines',
      type: 'warning'
    },
    {
      name: 'missing-final-newline',
      pattern: /[^\n]$/,
      message: 'Files should end with a newline',
      type: 'warning'
    },
    {
      name: 'inconsistent-list-markers',
      pattern: /^(\s*)-.*\n\s*\*|^(\s*)\*.*\n\s*-/m,
      message: 'Use consistent list markers (either - or * throughout)',
      type: 'warning'
    }
  ];

  // Required sections for different document types
  private requiredSections: Record<string, RequiredSection[]> = {
    'api': [
      { name: 'Description', pattern: /^#+\s*(Description|Overview)/mi, required: true },
      { name: 'Parameters', pattern: /^#+\s*Parameters/mi, required: true },
      { name: 'Response', pattern: /^#+\s*(Response|Returns)/mi, required: true },
      { name: 'Examples', pattern: /^#+\s*Examples?/mi, required: true }
    ],
    'component': [
      { name: 'Overview', pattern: /^#+\s*(Overview|Description)/mi, required: true },
      { name: 'Props', pattern: /^#+\s*(Props|Properties|Interface)/mi, required: true },
      { name: 'Usage', pattern: /^#+\s*(Usage|Examples?)/mi, required: true }
    ],
    'requirements': [
      { name: 'Purpose', pattern: /^#+\s*(Purpose|Objective|Goal)/mi, required: true },
      { name: 'Requirements', pattern: /^#+\s*Requirements?/mi, required: true },
      { name: 'Acceptance Criteria', pattern: /^#+\s*(Acceptance Criteria|Success Criteria)/mi, required: true }
    ]
  };

  constructor(docsPath: string = './docs') {
    this.docsPath = path.resolve(docsPath);
  }

  async validate(): Promise<ValidationReport> {
    console.log(chalk.blue('🔍 Starting documentation validation...'));
    
    this.issues = [];
    this.processedFiles.clear();

    try {
      // Get all markdown files
      const markdownFiles = await this.getMarkdownFiles();
      
      console.log(chalk.gray(`Found ${markdownFiles.length} markdown files`));

      // Validate each file
      for (const file of markdownFiles) {
        await this.validateFile(file);
      }

      // Generate report
      const report = this.generateReport(markdownFiles.length);
      
      // Print summary
      this.printSummary(report);
      
      return report;
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error);
      throw error;
    }
  }

  private async getMarkdownFiles(): Promise<string[]> {
    const pattern = path.join(this.docsPath, '**/*.md');
    const files = await glob(pattern, { 
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'] 
    });
    return files.map(file => path.resolve(file));
  }

  private async validateFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(this.docsPath, filePath);
      
      console.log(chalk.gray(`Validating: ${relativePath}`));

      // Basic file validation
      await this.validateFileExists(filePath);
      
      // Markdown syntax validation
      await this.validateMarkdownSyntax(filePath, content);
      
      // Link validation
      await this.validateLinks(filePath, content);
      
      // Code block validation
      await this.validateCodeBlocks(filePath, content);
      
      // Style guide validation
      await this.validateStyleGuide(filePath, content);
      
      // Template compliance validation
      await this.validateTemplateCompliance(filePath, content);
      
      // Timestamp and freshness validation
      await this.validateFreshness(filePath, content);

      this.processedFiles.add(filePath);
    } catch (error) {
      this.addIssue(filePath, 0, 0, 'error', 'file-access', 
        `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async validateFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      this.addIssue(filePath, 0, 0, 'error', 'file-access', 'File does not exist or is not accessible');
    }
  }

  private async validateMarkdownSyntax(filePath: string, content: string): Promise<void> {
    try {
      // Use marked to parse and validate markdown syntax
      const tokens = marked.lexer(content);
      
      // Check for common markdown issues
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Check for malformed headers
        if (line.match(/^#+[^\s]/)) {
          this.addIssue(filePath, lineNum, 0, 'error', 'markdown-syntax', 
            'Headers must have a space after the # symbols');
        }
        
        // Check for malformed links
        if (line.match(/\[.*\]\([^)]*\s[^)]*\)/)) {
          this.addIssue(filePath, lineNum, 0, 'error', 'markdown-syntax', 
            'Links cannot contain spaces in URLs (use %20 for spaces)');
        }
        
        // Check for unmatched brackets
        const openBrackets = (line.match(/\[/g) || []).length;
        const closeBrackets = (line.match(/\]/g) || []).length;
        if (openBrackets !== closeBrackets) {
          this.addIssue(filePath, lineNum, 0, 'warning', 'markdown-syntax', 
            'Unmatched square brackets detected');
        }
      });
      
    } catch (error) {
      this.addIssue(filePath, 0, 0, 'error', 'markdown-syntax', 
        `Markdown parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async validateLinks(filePath: string, content: string): Promise<void> {
    // Extract all markdown links
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    const lines = content.split('\n');
    
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const [fullMatch, linkText, linkUrl] = match;
      const lineNum = this.getLineNumber(content, match.index);
      
      await this.validateLink(filePath, linkUrl, lineNum, linkText);
    }

    // Extract reference-style links
    const refLinkRegex = /\[([^\]]*)\]\[([^\]]*)\]/g;
    const refDefRegex = /^\[([^\]]+)\]:\s*(.+)$/gm;
    
    // Collect reference definitions
    const refDefs = new Map<string, string>();
    let refMatch;
    while ((refMatch = refDefRegex.exec(content)) !== null) {
      refDefs.set(refMatch[1].toLowerCase(), refMatch[2]);
    }
    
    // Validate reference links
    while ((match = refLinkRegex.exec(content)) !== null) {
      const [fullMatch, linkText, refId] = match;
      const lineNum = this.getLineNumber(content, match.index);
      const refKey = (refId || linkText).toLowerCase();
      
      if (!refDefs.has(refKey)) {
        this.addIssue(filePath, lineNum, 0, 'error', 'broken-link', 
          `Reference link "${refKey}" is not defined`);
      } else {
        const refUrl = refDefs.get(refKey)!;
        await this.validateLink(filePath, refUrl, lineNum, linkText);
      }
    }
  }

  private async validateLink(filePath: string, linkUrl: string, lineNum: number, linkText: string): Promise<void> {
    // Skip external links (we'll only validate internal links)
    if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://') || linkUrl.startsWith('mailto:')) {
      return;
    }
    
    // Handle anchor links
    const [urlPath, anchor] = linkUrl.split('#');
    
    if (!urlPath) {
      // Internal anchor link - validate anchor exists in current file
      if (anchor) {
        const currentContent = await fs.readFile(filePath, 'utf-8');
        if (!this.hasAnchor(currentContent, anchor)) {
          this.addIssue(filePath, lineNum, 0, 'error', 'broken-link', 
            `Anchor "#${anchor}" not found in current document`);
        }
      }
      return;
    }
    
    // Resolve relative path
    const basePath = path.dirname(filePath);
    const resolvedPath = path.resolve(basePath, urlPath);
    
    try {
      await fs.access(resolvedPath);
      
      // If there's an anchor, validate it exists in the target file
      if (anchor && resolvedPath.endsWith('.md')) {
        const targetContent = await fs.readFile(resolvedPath, 'utf-8');
        if (!this.hasAnchor(targetContent, anchor)) {
          this.addIssue(filePath, lineNum, 0, 'error', 'broken-link', 
            `Anchor "#${anchor}" not found in ${path.relative(this.docsPath, resolvedPath)}`);
        }
      }
    } catch {
      this.addIssue(filePath, lineNum, 0, 'error', 'broken-link', 
        `File not found: ${path.relative(this.docsPath, resolvedPath)}`,
        `Check if the file exists or update the link path`);
    }
  }

  private hasAnchor(content: string, anchor: string): boolean {
    // Check for heading anchors
    const headingRegex = /^#+\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const headingText = match[1];
      const headingAnchor = this.generateAnchor(headingText);
      if (headingAnchor === anchor) {
        return true;
      }
    }
    
    // Check for explicit anchor tags
    const anchorRegex = new RegExp(`<a[^>]*(?:name|id)=["']${anchor}["'][^>]*>`, 'i');
    return anchorRegex.test(content);
  }

  private generateAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async validateCodeBlocks(filePath: string, content: string): Promise<void> {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const [fullMatch, language, code] = match;
      const lineNum = this.getLineNumber(content, match.index);
      
      if (!language) {
        this.addIssue(filePath, lineNum, 0, 'warning', 'code-block', 
          'Code block should specify a language for syntax highlighting');
        continue;
      }
      
      // Basic syntax validation for common languages
      await this.validateCodeSyntax(filePath, language, code, lineNum);
    }
  }

  private async validateCodeSyntax(filePath: string, language: string, code: string, lineNum: number): Promise<void> {
    const trimmedCode = code.trim();
    
    if (!trimmedCode) {
      this.addIssue(filePath, lineNum, 0, 'warning', 'code-block', 
        'Empty code block detected');
      return;
    }
    
    switch (language.toLowerCase()) {
      case 'typescript':
      case 'ts':
        this.validateTypeScriptSyntax(filePath, trimmedCode, lineNum);
        break;
      case 'javascript':
      case 'js':
        this.validateJavaScriptSyntax(filePath, trimmedCode, lineNum);
        break;
      case 'json':
        this.validateJsonSyntax(filePath, trimmedCode, lineNum);
        break;
      case 'yaml':
      case 'yml':
        this.validateYamlSyntax(filePath, trimmedCode, lineNum);
        break;
    }
  }

  private validateTypeScriptSyntax(filePath: string, code: string, lineNum: number): void {
    // Basic TypeScript syntax checks
    const issues = [
      { pattern: /\bfunction\s+\w+\([^)]*\)\s*{[^}]*}(?!\s*[;}])/g, message: 'Function may be missing return type annotation' },
      { pattern: /\blet\s+\w+(?!\s*[:=])/g, message: 'Variable declaration may be missing type annotation' },
      { pattern: /\bconst\s+\w+(?!\s*[:=])/g, message: 'Constant declaration may be missing type annotation' }
    ];
    
    issues.forEach(({ pattern, message }) => {
      if (pattern.test(code)) {
        this.addIssue(filePath, lineNum, 0, 'info', 'code-quality', message);
      }
    });
  }

  private validateJavaScriptSyntax(filePath: string, code: string, lineNum: number): void {
    // Basic JavaScript syntax validation
    try {
      // Simple check for balanced braces and parentheses
      const braces = (code.match(/[{}]/g) || []).reduce((count, char) => 
        char === '{' ? count + 1 : count - 1, 0);
      const parens = (code.match(/[()]/g) || []).reduce((count, char) => 
        char === '(' ? count + 1 : count - 1, 0);
      
      if (braces !== 0) {
        this.addIssue(filePath, lineNum, 0, 'error', 'code-syntax', 'Unmatched braces in JavaScript code');
      }
      if (parens !== 0) {
        this.addIssue(filePath, lineNum, 0, 'error', 'code-syntax', 'Unmatched parentheses in JavaScript code');
      }
    } catch (error) {
      this.addIssue(filePath, lineNum, 0, 'error', 'code-syntax', 
        `JavaScript syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateJsonSyntax(filePath: string, code: string, lineNum: number): void {
    try {
      JSON.parse(code);
    } catch (error) {
      this.addIssue(filePath, lineNum, 0, 'error', 'code-syntax', 
        `Invalid JSON syntax: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateYamlSyntax(filePath: string, code: string, lineNum: number): void {
    // Basic YAML validation (checking indentation and structure)
    const lines = code.split('\n');
    let prevIndent = 0;
    
    lines.forEach((line, index) => {
      if (line.trim() === '') return;
      
      const indent = line.length - line.trimStart().length;
      const trimmed = line.trim();
      
      // Check for tabs (YAML should use spaces)
      if (line.includes('\t')) {
        this.addIssue(filePath, lineNum + index, 0, 'error', 'code-syntax', 
          'YAML should use spaces, not tabs for indentation');
      }
      
      // Check for proper key-value format
      if (trimmed.includes(':') && !trimmed.match(/^[^:]+:\s*(.+)?$/)) {
        this.addIssue(filePath, lineNum + index, 0, 'warning', 'code-syntax', 
          'YAML key-value pairs should have space after colon');
      }
    });
  }

  private async validateStyleGuide(filePath: string, content: string): Promise<void> {
    this.styleRules.forEach(rule => {
      if (rule.pattern.test(content)) {
        const match = content.match(rule.pattern);
        const lineNum = match ? this.getLineNumber(content, content.indexOf(match[0])) : 0;
        
        this.addIssue(filePath, lineNum, 0, rule.type, 'style-guide', rule.message);
      }
    });
  }

  private async validateTemplateCompliance(filePath: string, content: string): Promise<void> {
    const fileName = path.basename(filePath, '.md').toLowerCase();
    
    // Determine document type based on filename or content
    let docType: string | null = null;
    
    if (fileName.includes('api') || content.includes('## Parameters') || content.includes('## Response')) {
      docType = 'api';
    } else if (fileName.includes('component') || content.includes('## Props') || content.includes('## Interface')) {
      docType = 'component';
    } else if (fileName.includes('requirement') || content.includes('## Acceptance Criteria')) {
      docType = 'requirements';
    }
    
    if (docType && this.requiredSections[docType]) {
      this.requiredSections[docType].forEach(section => {
        if (section.required && !section.pattern.test(content)) {
          this.addIssue(filePath, 0, 0, 'warning', 'template-compliance', 
            `Missing required section: ${section.name}`,
            `Add a "${section.name}" section to comply with documentation template`);
        }
      });
    }
  }

  private async validateFreshness(filePath: string, content: string): Promise<void> {
    // Check for timestamp patterns
    const timestampPatterns = [
      /Last updated?:?\s*(\d{4}-\d{2}-\d{2})/i,
      /Updated:?\s*(\d{4}-\d{2}-\d{2})/i,
      /Date:?\s*(\d{4}-\d{2}-\d{2})/i
    ];
    
    let foundTimestamp = false;
    
    timestampPatterns.forEach(pattern => {
      const match = content.match(pattern);
      if (match) {
        foundTimestamp = true;
        const dateStr = match[1];
        const docDate = new Date(dateStr);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 90) {
          this.addIssue(filePath, 0, 0, 'warning', 'freshness', 
            `Document timestamp is ${daysDiff} days old`,
            'Consider reviewing and updating the document content');
        }
      }
    });
    
    // Check for stale content markers
    const staleMarkers = [
      /TODO/gi,
      /FIXME/gi,
      /XXX/gi,
      /\[TBD\]/gi,
      /\[TODO\]/gi,
      /coming soon/gi,
      /under construction/gi
    ];
    
    staleMarkers.forEach(marker => {
      const matches = content.matchAll(marker);
      for (const match of matches) {
        const lineNum = this.getLineNumber(content, match.index!);
        this.addIssue(filePath, lineNum, 0, 'info', 'freshness', 
          `Stale content marker found: ${match[0]}`,
          'Review and update or remove placeholder content');
      }
    });
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private addIssue(
    file: string, 
    line: number, 
    column: number, 
    type: 'error' | 'warning' | 'info', 
    category: string, 
    message: string,
    suggestion?: string
  ): void {
    this.issues.push({
      file: path.relative(this.docsPath, file),
      line,
      column,
      type,
      category,
      message,
      suggestion
    });
  }

  private generateReport(totalFiles: number): ValidationReport {
    const errors = this.issues.filter(issue => issue.type === 'error').length;
    const warnings = this.issues.filter(issue => issue.type === 'warning').length;
    const infos = this.issues.filter(issue => issue.type === 'info').length;
    const filesWithIssues = new Set(this.issues.map(issue => issue.file)).size;

    return {
      summary: {
        totalFiles,
        filesWithIssues,
        totalIssues: this.issues.length,
        errors,
        warnings,
        infos
      },
      issues: this.issues,
      timestamp: new Date().toISOString()
    };
  }

  private printSummary(report: ValidationReport): void {
    console.log('\n' + chalk.bold('📊 Validation Summary'));
    console.log('─'.repeat(50));
    
    console.log(`Files processed: ${chalk.blue(report.summary.totalFiles)}`);
    console.log(`Files with issues: ${chalk.yellow(report.summary.filesWithIssues)}`);
    console.log(`Total issues: ${chalk.cyan(report.summary.totalIssues)}`);
    
    if (report.summary.errors > 0) {
      console.log(`Errors: ${chalk.red(report.summary.errors)}`);
    }
    if (report.summary.warnings > 0) {
      console.log(`Warnings: ${chalk.yellow(report.summary.warnings)}`);
    }
    if (report.summary.infos > 0) {
      console.log(`Info: ${chalk.blue(report.summary.infos)}`);
    }
    
    if (report.issues.length > 0) {
      console.log('\n' + chalk.bold('🔍 Issues Found:'));
      console.log('─'.repeat(50));
      
      // Group issues by file
      const issuesByFile = new Map<string, ValidationIssue[]>();
      report.issues.forEach(issue => {
        if (!issuesByFile.has(issue.file)) {
          issuesByFile.set(issue.file, []);
        }
        issuesByFile.get(issue.file)!.push(issue);
      });
      
      issuesByFile.forEach((issues, file) => {
        console.log(`\n${chalk.bold(file)}:`);
        issues.forEach(issue => {
          const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
          const color = issue.type === 'error' ? chalk.red : issue.type === 'warning' ? chalk.yellow : chalk.blue;
          const location = issue.line > 0 ? `:${issue.line}` : '';
          
          console.log(`  ${icon} ${color(`[${issue.category}]`)} ${issue.message}${location}`);
          if (issue.suggestion) {
            console.log(`     💡 ${chalk.gray(issue.suggestion)}`);
          }
        });
      });
    } else {
      console.log(chalk.green('\n✅ No issues found! Documentation looks great.'));
    }
    
    console.log(`\n${chalk.gray('Validation completed at:')} ${report.timestamp}`);
  }

  async saveReport(report: ValidationReport, outputPath?: string): Promise<void> {
    const reportPath = outputPath || path.join(this.docsPath, 'validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.green(`📄 Report saved to: ${reportPath}`));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const docsPath = args[0] || './docs';
  const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  const saveReport = args.includes('--save-report');
  const exitOnError = args.includes('--exit-on-error');
  
  try {
    const validator = new DocumentationValidator(docsPath);
    const report = await validator.validate();
    
    if (saveReport || outputPath) {
      await validator.saveReport(report, outputPath);
    }
    
    // Exit with error code if there are errors and --exit-on-error is specified
    if (exitOnError && report.summary.errors > 0) {
      console.log(chalk.red('\n❌ Validation failed with errors. Exiting with code 1.'));
      process.exit(1);
    }
    
    // Exit with warning code if there are warnings (for CI/CD flexibility)
    if (report.summary.warnings > 0) {
      process.exit(2);
    }
    
    console.log(chalk.green('\n✅ Documentation validation completed successfully.'));
    process.exit(0);
    
  } catch (error) {
    console.error(chalk.red('❌ Validation failed:'), error);
    process.exit(1);
  }
}

// Export for programmatic use
export { DocumentationValidator, ValidationReport, ValidationIssue };

// Run if called directly
import { pathToFileURL } from 'url';
const isCli = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main();
}