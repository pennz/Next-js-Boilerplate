#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { glob } from 'glob';
import { Project, SyntaxKind, VariableDeclaration, CallExpression } from 'ts-morph';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    responses?: Record<string, any>;
  };
  tags?: Array<{
    name: string;
    description: string;
  }>;
  security?: Array<Record<string, any>>;
}

interface ZodSchema {
  filePath: string;
  content: string;
  schemas: Array<{
    name: string;
    definition: string;
    validationRules: string[];
  }>;
}

interface GenerationMetadata {
  generatedAt: string;
  sourceFiles: string[];
  version: string;
  lastModified: Record<string, string>;
}

class APIDocumentationGenerator {
  private readonly projectRoot: string;
  private readonly openApiDir: string;
  private readonly validationsDir: string;
  private readonly docsFile: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.openApiDir = path.join(this.projectRoot, 'openapi');
    this.validationsDir = path.join(this.projectRoot, 'src', 'validations');
    this.docsFile = path.join(this.projectRoot, 'docs', 'api-endpoints-documentation.md');
  }

  async generate(): Promise<void> {
    console.log('🚀 Starting API documentation generation...');

    try {
      // Read OpenAPI specifications
      const openApiSpecs = await this.loadOpenAPISpecs();
      console.log(`📋 Loaded ${openApiSpecs.length} OpenAPI specifications`);

      // Parse Zod validation schemas
      const zodSchemas = await this.parseZodSchemas();
      console.log(`🔍 Parsed ${zodSchemas.length} Zod validation files`);

      // Generate documentation
      const documentation = await this.generateDocumentation(openApiSpecs, zodSchemas);

      // Update existing documentation with incremental approach
      await this.updateDocumentation(documentation);

      console.log('✅ API documentation generated successfully!');
    } catch (error) {
      console.error('❌ Error generating API documentation:', error);
      process.exit(1);
    }
  }

  private async loadOpenAPISpecs(): Promise<OpenAPISpec[]> {
    const specs: OpenAPISpec[] = [];
    const specFiles = await glob('*.{yml,yaml}', { cwd: this.openApiDir });

    for (const file of specFiles) {
      const filePath = path.join(this.openApiDir, file);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const spec = yaml.parse(content) as OpenAPISpec;
        specs.push(spec);
        console.log(`  ✓ Loaded ${file}`);
      } catch (error) {
        console.warn(`  ⚠️  Could not load ${file}:`, error instanceof Error ? error.message : error);
      }
    }

    return specs;
  }

  private async parseZodSchemas(): Promise<ZodSchema[]> {
    const schemas: ZodSchema[] = [];

    try {
      // Check if validations directory exists
      await fs.access(this.validationsDir);
      
      // Find all TypeScript files in validations directory
      const validationFiles = await glob('**/*.ts', {
        cwd: this.validationsDir,
        absolute: true,
      });

      for (const filePath of validationFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const parsedSchemas = this.extractZodSchemas(content, filePath);
          
          if (parsedSchemas.schemas.length > 0) {
            schemas.push(parsedSchemas);
            console.log(`  ✓ Parsed ${path.relative(this.projectRoot, filePath)} (${parsedSchemas.schemas.length} schemas)`);
          }
        } catch (error) {
          console.warn(`  ⚠️  Could not parse ${filePath}:`, error instanceof Error ? error.message : error);
        }
      }
    } catch (error) {
      console.warn('⚠️  Validations directory not found, skipping Zod schema parsing');
    }

    return schemas;
  }

  private extractZodSchemas(content: string, filePath: string): ZodSchema {
    const schemas: Array<{
      name: string;
      definition: string;
      validationRules: string[];
    }> = [];

    // Use TS AST parsing instead of regex
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('temp.ts', content);

    // Find exported const declarations that reference Zod
    const exportedVariables = sourceFile.getVariableDeclarations().filter(decl => {
      const exportSymbol = decl.getSymbolOrThrow();
      const parent = decl.getParentOrThrow();
      return parent.getParentOrThrow().getKind() === SyntaxKind.VariableStatement &&
             parent.getParentOrThrow().hasModifier(SyntaxKind.ExportKeyword);
    });

    for (const variable of exportedVariables) {
      const name = variable.getName();
      
      // Check if the variable name suggests it's a Zod schema
      if (name.includes('Schema') || name.includes('Validation')) {
        const initializer = variable.getInitializer();
        if (initializer) {
          const definition = initializer.getText();
          
          // Check if it references Zod (starts with 'z.')
          if (definition.includes('z.')) {
            const validationRules = this.extractValidationRulesFromAST(initializer);
            
            schemas.push({
              name,
              definition: definition.trim(),
              validationRules,
            });
          }
        }
      }
    }

    return {
      filePath,
      content,
      schemas,
    };
  }

  private extractValidationRules(definition: string): string[] {
    const rules: string[] = [];
    
    // Common Zod validation patterns
    const patterns = [
      { pattern: /\.min\((\d+)\)/, rule: (match: RegExpMatchArray) => `Minimum length: ${match[1]}` },
      { pattern: /\.max\((\d+)\)/, rule: (match: RegExpMatchArray) => `Maximum length: ${match[1]}` },
      { pattern: /\.email\(\)/, rule: () => 'Must be a valid email address' },
      { pattern: /\.url\(\)/, rule: () => 'Must be a valid URL' },
      { pattern: /\.uuid\(\)/, rule: () => 'Must be a valid UUID' },
      { pattern: /\.positive\(\)/, rule: () => 'Must be a positive number' },
      { pattern: /\.negative\(\)/, rule: () => 'Must be a negative number' },
      { pattern: /\.int\(\)/, rule: () => 'Must be an integer' },
      { pattern: /\.optional\(\)/, rule: () => 'Optional field' },
      { pattern: /\.nullable\(\)/, rule: () => 'Can be null' },
      { pattern: /\.regex\(([^)]+)\)/, rule: (match: RegExpMatchArray) => `Must match pattern: ${match[1]}` },
      { pattern: /\.refine\(/, rule: () => 'Has custom validation' },
    ];

    for (const { pattern, rule } of patterns) {
      let match;
      while ((match = pattern.exec(definition)) !== null) {
        rules.push(rule(match));
      }
    }

    return rules;
  }

  private extractValidationRulesFromAST(node: any): string[] {
    const rules: string[] = [];
    
    // Traverse the AST to find method calls on Zod objects
    const visitNode = (astNode: any) => {
      if (astNode && typeof astNode === 'object') {
        // Check if this is a call expression
        if (astNode.kind === SyntaxKind.CallExpression) {
          const expression = astNode.expression;
          
          // Check if it's a property access (e.g., z.string().min(5))
          if (expression && expression.kind === SyntaxKind.PropertyAccessExpression) {
            const propertyName = expression.name?.escapedText || expression.name?.text;
            
            // Extract validation rules based on method name
            switch (propertyName) {
              case 'min':
                const minArg = astNode.arguments?.[0];
                if (minArg && minArg.text) {
                  rules.push(`Minimum length: ${minArg.text}`);
                }
                break;
              case 'max':
                const maxArg = astNode.arguments?.[0];
                if (maxArg && maxArg.text) {
                  rules.push(`Maximum length: ${maxArg.text}`);
                }
                break;
              case 'email':
                rules.push('Must be a valid email address');
                break;
              case 'url':
                rules.push('Must be a valid URL');
                break;
              case 'uuid':
                rules.push('Must be a valid UUID');
                break;
              case 'positive':
                rules.push('Must be a positive number');
                break;
              case 'negative':
                rules.push('Must be a negative number');
                break;
              case 'int':
                rules.push('Must be an integer');
                break;
              case 'optional':
                rules.push('Optional field');
                break;
              case 'nullable':
                rules.push('Can be null');
                break;
              case 'regex':
                const regexArg = astNode.arguments?.[0];
                if (regexArg) {
                  rules.push(`Must match pattern: ${regexArg.text || regexArg.getText()}`);
                }
                break;
              case 'refine':
                rules.push('Has custom validation');
                break;
            }
          }
        }
        
        // Recursively visit child nodes
        for (const key in astNode) {
          if (astNode[key] && typeof astNode[key] === 'object') {
            visitNode(astNode[key]);
          }
        }
      }
    };
    
    // Fall back to regex-based extraction if AST parsing fails
    try {
      visitNode(node.compilerNode || node);
      if (rules.length === 0) {
        return this.extractValidationRules(node.getText());
      }
    } catch (error) {
      console.warn('AST parsing failed, falling back to regex:', error);
      return this.extractValidationRules(node.getText());
    }
    
    return rules;
  }

  private async generateDocumentation(openApiSpecs: OpenAPISpec[], zodSchemas: ZodSchema[]): Promise<string> {
    const metadata = await this.generateMetadata(openApiSpecs, zodSchemas);
    
    let documentation = this.generateHeader(metadata);
    
    // Generate documentation for each OpenAPI spec
    for (const spec of openApiSpecs) {
      documentation += this.generateSpecDocumentation(spec, zodSchemas);
    }

    // Generate Zod validation documentation
    documentation += this.generateZodValidationDocumentation(zodSchemas);

    return documentation;
  }

  private async generateMetadata(openApiSpecs: OpenAPISpec[], zodSchemas: ZodSchema[]): Promise<GenerationMetadata> {
    const sourceFiles = [
      ...openApiSpecs.map(() => 'openapi/*.yaml'),
      ...zodSchemas.map(schema => path.relative(this.projectRoot, schema.filePath)),
    ];

    // Calculate lastModified timestamps for source files
    const lastModified: Record<string, string> = {};
    
    // Get actual OpenAPI spec files
    const specFiles = await glob('openapi/*.yaml', { cwd: this.projectRoot });
    for (const file of specFiles) {
      try {
        const filePath = path.join(this.projectRoot, file);
        const stats = await fs.stat(filePath);
        lastModified[file] = stats.mtime.toISOString();
      } catch (error) {
        console.warn(`Could not get stats for ${file}:`, error instanceof Error ? error.message : error);
      }
    }
    
    // Get Zod schema files
    for (const schema of zodSchemas) {
      try {
        const relativePath = path.relative(this.projectRoot, schema.filePath);
        const stats = await fs.stat(schema.filePath);
        lastModified[relativePath] = stats.mtime.toISOString();
      } catch (error) {
        console.warn(`Could not get stats for ${schema.filePath}:`, error instanceof Error ? error.message : error);
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      sourceFiles,
      version: '1.0.0',
      lastModified,
    };
  }

  private generateHeader(metadata: GenerationMetadata): string {
    return `# API Endpoints Documentation

<!-- AUTO-GENERATED SECTION START -->
<!-- Generated at: ${metadata.generatedAt} -->
<!-- Source files: ${metadata.sourceFiles.join(', ')} -->
<!-- Generator version: ${metadata.version} -->

> **⚠️ Auto-Generated Content**: This section is automatically generated from OpenAPI specifications and Zod validation schemas. Manual edits will be overwritten.

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Specifications](#api-specifications)
4. [Validation Rules](#validation-rules)
5. [Error Handling](#error-handling)

## Overview

This documentation is automatically generated from:
- OpenAPI specifications in \`/openapi/\` directory
- Zod validation schemas in \`/src/validations/\` directory

Last updated: ${new Date(metadata.generatedAt).toLocaleString()}

`;
  }

  private generateSpecDocumentation(spec: OpenAPISpec, zodSchemas: ZodSchema[]): string {
    let doc = `## ${spec.info.title}

**Version**: ${spec.info.version}  
**Description**: ${spec.info.description}

`;

    // Generate tags documentation
    if (spec.tags) {
      doc += '### API Categories\n\n';
      for (const tag of spec.tags) {
        doc += `- **${tag.name}**: ${tag.description}\n`;
      }
      doc += '\n';
    }

    // Generate endpoints documentation
    doc += '### Endpoints\n\n';
    
    for (const [pathPattern, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (typeof operation === 'object' && operation.summary) {
          doc += this.generateEndpointDocumentation(method.toUpperCase(), pathPattern, operation, spec, zodSchemas);
        }
      }
    }

    return doc;
  }

  private generateEndpointDocumentation(
    method: string,
    path: string,
    operation: any,
    spec: OpenAPISpec,
    zodSchemas: ZodSchema[]
  ): string {
    let doc = `#### \`${method} ${path}\`\n\n`;
    
    if (operation.summary) {
      doc += `**Summary**: ${operation.summary}\n\n`;
    }
    
    if (operation.description) {
      doc += `**Description**: ${operation.description}\n\n`;
    }

    // Tags
    if (operation.tags) {
      doc += `**Tags**: ${operation.tags.join(', ')}\n\n`;
    }

    // Security
    if (operation.security || spec.security) {
      doc += '**Authentication**: Required\n\n';
    }

    // Parameters
    if (operation.parameters) {
      doc += '**Parameters**:\n\n';
      for (const param of operation.parameters) {
        doc += `- \`${param.name}\` (${param.in})`;
        if (param.required) doc += ' **required**';
        if (param.description) doc += `: ${param.description}`;
        if (param.schema) {
          doc += `\n  - Type: \`${param.schema.type || 'object'}\``;
          if (param.schema.enum) {
            doc += `\n  - Values: ${param.schema.enum.map((v: any) => `\`${v}\``).join(', ')}`;
          }
          if (param.schema.minimum !== undefined) {
            doc += `\n  - Minimum: ${param.schema.minimum}`;
          }
          if (param.schema.maximum !== undefined) {
            doc += `\n  - Maximum: ${param.schema.maximum}`;
          }
        }
        doc += '\n';
      }
      doc += '\n';
    }

    // Request Body
    if (operation.requestBody) {
      doc += '**Request Body**:\n\n';
      const content = operation.requestBody.content;
      if (content && content['application/json']) {
        const schema = content['application/json'].schema;
        doc += this.generateSchemaDocumentation(schema, spec);
      }
      doc += '\n';
    }

    // Responses
    if (operation.responses) {
      doc += '**Responses**:\n\n';
      for (const [statusCode, response] of Object.entries(operation.responses)) {
        doc += `- **${statusCode}**: ${(response as any).description}\n`;
        if ((response as any).content && (response as any).content['application/json']) {
          const schema = (response as any).content['application/json'].schema;
          doc += this.generateSchemaDocumentation(schema, spec, '  ');
        }
      }
      doc += '\n';
    }

    // Related Zod validations
    const relatedValidations = this.findRelatedZodValidations(path, method, zodSchemas);
    if (relatedValidations.length > 0) {
      doc += '**Validation Rules**:\n\n';
      for (const validation of relatedValidations) {
        doc += `- **${validation.name}**:\n`;
        for (const rule of validation.validationRules) {
          doc += `  - ${rule}\n`;
        }
      }
      doc += '\n';
    }

    doc += '---\n\n';
    return doc;
  }

  private generateSchemaDocumentation(schema: any, spec: OpenAPISpec, indent: string = ''): string {
    if (!schema) return '';

    let doc = '';

    // Handle $ref
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      doc += `${indent}- Schema: \`${refName}\`\n`;
      
      // Try to resolve the reference
      if (spec.components?.schemas?.[refName]) {
        return this.generateSchemaDocumentation(spec.components.schemas[refName], spec, indent);
      }
      return doc;
    }

    // Handle object properties
    if (schema.type === 'object' && schema.properties) {
      doc += `${indent}Properties:\n`;
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const prop = propSchema as any;
        doc += `${indent}- \`${propName}\``;
        if (prop.type) doc += ` (${prop.type})`;
        if (schema.required?.includes(propName)) doc += ' **required**';
        if (prop.description) doc += `: ${prop.description}`;
        doc += '\n';
        
        if (prop.enum) {
          doc += `${indent}  - Values: ${prop.enum.map((v: any) => `\`${v}\``).join(', ')}\n`;
        }
        if (prop.minimum !== undefined) {
          doc += `${indent}  - Minimum: ${prop.minimum}\n`;
        }
        if (prop.maximum !== undefined) {
          doc += `${indent}  - Maximum: ${prop.maximum}\n`;
        }
        if (prop.pattern) {
          doc += `${indent}  - Pattern: \`${prop.pattern}\`\n`;
        }
      }
    }

    // Handle arrays
    if (schema.type === 'array' && schema.items) {
      doc += `${indent}Array of:\n`;
      doc += this.generateSchemaDocumentation(schema.items, spec, indent + '  ');
    }

    return doc;
  }

  private findRelatedZodValidations(path: string, method: string, zodSchemas: ZodSchema[]): Array<{
    name: string;
    validationRules: string[];
  }> {
    const related: Array<{ name: string; validationRules: string[] }> = [];
    
    // Simple heuristic to match Zod schemas to endpoints
    const pathSegments = path.split('/').filter(Boolean);
    const resourceName = pathSegments[pathSegments.length - 1] || pathSegments[pathSegments.length - 2];
    
    for (const zodFile of zodSchemas) {
      for (const schema of zodFile.schemas) {
        // Match by naming convention
        if (schema.name.toLowerCase().includes(resourceName?.toLowerCase() || '') ||
            schema.name.toLowerCase().includes(method.toLowerCase())) {
          related.push({
            name: schema.name,
            validationRules: schema.validationRules,
          });
        }
      }
    }

    return related;
  }

  private generateZodValidationDocumentation(zodSchemas: ZodSchema[]): string {
    if (zodSchemas.length === 0) return '';

    let doc = `## Validation Schemas

The following validation schemas are defined using Zod:

`;

    for (const zodFile of zodSchemas) {
      const relativePath = path.relative(this.projectRoot, zodFile.filePath);
      doc += `### ${relativePath}\n\n`;
      
      for (const schema of zodFile.schemas) {
        doc += `#### ${schema.name}\n\n`;
        
        if (schema.validationRules.length > 0) {
          doc += '**Validation Rules**:\n';
          for (const rule of schema.validationRules) {
            doc += `- ${rule}\n`;
          }
          doc += '\n';
        }

        doc += '**Schema Definition**:\n```typescript\n';
        doc += `export const ${schema.name} = ${schema.definition.substring(0, 200)}`;
        if (schema.definition.length > 200) doc += '...';
        doc += '\n```\n\n';
      }
    }

    return doc;
  }

  private async updateDocumentation(newContent: string): Promise<void> {
    let existingContent = '';
    
    try {
      existingContent = await fs.readFile(this.docsFile, 'utf-8');
    } catch (error) {
      console.log('📝 Creating new documentation file');
    }

    // Find auto-generated section markers
    const startMarker = '<!-- AUTO-GENERATED SECTION START -->';
    const endMarker = '<!-- AUTO-GENERATED SECTION END -->';
    
    const startIndex = existingContent.indexOf(startMarker);
    const endIndex = existingContent.indexOf(endMarker);

    let updatedContent: string;

    if (startIndex !== -1 && endIndex !== -1) {
      // Replace auto-generated section
      const beforeSection = existingContent.substring(0, startIndex);
      const afterSection = existingContent.substring(endIndex + endMarker.length);
      updatedContent = beforeSection + newContent + endMarker + '\n\n' + afterSection;
      console.log('🔄 Updated auto-generated section in existing documentation');
    } else if (startIndex !== -1) {
      // Start marker found but no end marker - append end marker
      const beforeSection = existingContent.substring(0, startIndex);
      updatedContent = beforeSection + newContent + endMarker + '\n';
      console.log('🔄 Added missing end marker and updated documentation');
    } else {
      // No auto-generated section found - prepend to existing content
      updatedContent = newContent + endMarker + '\n\n' + existingContent;
      console.log('📝 Prepended auto-generated section to existing documentation');
    }

    // Ensure docs directory exists
    await fs.mkdir(path.dirname(this.docsFile), { recursive: true });
    
    // Write updated documentation
    await fs.writeFile(this.docsFile, updatedContent, 'utf-8');
    console.log(`📄 Documentation written to ${path.relative(this.projectRoot, this.docsFile)}`);
  }
}

// CLI execution
import { pathToFileURL } from 'url';
const isCli = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const generator = new APIDocumentationGenerator();
  generator.generate().catch((error) => {
    console.error('Failed to generate API documentation:', error);
    process.exit(1);
  });
}

export default APIDocumentationGenerator;