#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { glob } from 'glob';

interface ComponentInfo {
  name: string;
  filePath: string;
  props: PropInfo[];
  dependencies: string[];
  stories: StoryInfo[];
  tests: TestInfo[];
  isServerComponent: boolean;
  isClientComponent: boolean;
  description?: string;
  category?: string;
}

interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

interface StoryInfo {
  name: string;
  filePath: string;
  args: Record<string, any>;
  description?: string;
}

interface TestInfo {
  filePath: string;
  testCases: string[];
  behaviors: string[];
}

class ComponentDocumentationGenerator {
  private componentsDir: string;
  private docsDir: string;
  private program: ts.Program;
  private typeChecker: ts.TypeChecker;

  constructor(componentsDir: string, docsDir: string) {
    this.componentsDir = componentsDir;
    this.docsDir = docsDir;
    
    // Create TypeScript program for type checking
    const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
    const configFile = ts.readConfigFile(configPath!, ts.sys.readFile);
    const compilerOptions = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      './'
    );

    // Add React types to compiler options
    compilerOptions.options.jsx = ts.JsxEmit.ReactJSX;
    compilerOptions.options.types = ['react'];

    this.program = ts.createProgram(compilerOptions.fileNames, compilerOptions.options);
    this.typeChecker = this.program.getTypeChecker();
  }

  async generateDocumentation(): Promise<void> {
    console.log('🔍 Scanning components directory...');
    const components = await this.scanComponents();
    
    console.log(`📊 Found ${components.length} components`);
    
    console.log('📝 Generating component inventory...');
    await this.generateComponentInventory(components);
    
    console.log('📋 Generating behavior requirements...');
    await this.generateBehaviorRequirements(components);
    
    console.log('✅ Component documentation generation complete!');
  }

  private async scanComponents(): Promise<ComponentInfo[]> {
    const componentFiles = await glob('**/*.{tsx,ts}', {
      cwd: this.componentsDir,
      ignore: ['**/*.test.{tsx,ts}', '**/*.spec.{tsx,ts}', '**/*.stories.{tsx,ts}']
    });

    const components: ComponentInfo[] = [];

    for (const file of componentFiles) {
      const filePath = path.join(this.componentsDir, file);
      const componentInfo = await this.analyzeComponent(filePath);
      if (componentInfo) {
        components.push(componentInfo);
      }
    }

    return components;
  }

  private async analyzeComponent(filePath: string): Promise<ComponentInfo | null> {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) return null;

    const content = fs.readFileSync(filePath, 'utf-8');
    const componentName = this.extractComponentName(sourceFile);
    
    if (!componentName) return null;

    const props = this.extractProps(sourceFile, componentName);
    const dependencies = this.extractDependencies(sourceFile);
    const stories = await this.findStories(componentName);
    const tests = await this.findTests(componentName);
    const { isServerComponent, isClientComponent } = this.analyzeComponentType(content);
    const description = this.extractDescription(sourceFile, componentName);
    const category = this.categorizeComponent(filePath, componentName);

    return {
      name: componentName,
      filePath,
      props,
      dependencies,
      stories,
      tests,
      isServerComponent,
      isClientComponent,
      description,
      category
    };
  }

  private extractComponentName(sourceFile: ts.SourceFile): string | null {
    let componentName: string | null = null;

    console.log(`Analyzing file: ${sourceFile.fileName}`);

    const visit = (node: ts.Node) => {
      // Look for function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        console.log(`Found function declaration: ${name}`);
        if (this.isReactComponent(node)) {
          console.log(`Identified as React component: ${name}`);
          componentName = name;
          return;
        }
      }

      // Look for variable declarations with arrow functions
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name) && decl.initializer) {
            if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
              const name = decl.name.text;
              console.log(`Found arrow function or function expression: ${name}`);
              if (this.isReactComponent(decl.initializer)) {
                console.log(`Identified as React component: ${name}`);
                componentName = name;
              }
            }
          }
        });
      }

      // Look for variable declarations (for components defined as variables)
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        console.log(`Found variable declaration: ${name}`);
        if (this.isReactComponent(node)) {
          console.log(`Identified as React component: ${name}`);
          componentName = name;
        }
      }

      // Look for exported const declarations (named exports)
      if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
        // This might be a default export
        const name = node.expression?.text || '';
        console.log(`Found export assignment: ${name}`);
        if (name && name[0] === name[0]?.toUpperCase()) {
          console.log(`Identified as component (default export): ${name}`);
          componentName = name;
        }
      }

      // Look for export declarations with named exports
      if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(element => {
          const name = element.name?.text || '';
          console.log(`Found named export: ${name}`);
          // Check if this is a component (starts with uppercase letter)
          if (name && name[0] === name[0]?.toUpperCase()) {
            console.log(`Identified as component (named export): ${name}`);
            componentName = name;
          }
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    console.log(`Component name extracted: ${componentName}`);
    return componentName;
  }

  private isReactComponent(node: ts.Node): boolean {
    // Refined heuristic-based approach to detect React components
    try {
      // Check if the function body contains JSX syntax
      const nodeText = node.getFullText();
      
      // More specific heuristic for React components:
      // 1. Contains JSX syntax with common React component patterns
      // 2. Function/variable name starts with uppercase letter (React component convention)
      const hasJSX = /<[a-zA-Z]/.test(nodeText) || /<\w+/.test(nodeText);
      
      // Check if the name starts with uppercase letter (React component convention)
      let isComponentName = false;
      if (ts.isFunctionDeclaration(node) && node.name) {
        isComponentName = node.name?.text?.[0] === node.name?.text?.[0]?.toUpperCase();
      } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        isComponentName = node.name?.text?.[0] === node.name?.text?.[0]?.toUpperCase();
      }
      
      // Additional check: if it has JSX and is a component name, it's very likely a React component
      // Or if it's a component name and contains React-specific patterns
      const hasReactPatterns = /React\.|use[A-Z]\w*\s*\(/.test(nodeText) || /className=|children/.test(nodeText);
      
      // Debug output
      console.log(`Checking if node is React component. Has JSX: ${hasJSX}, Is Component Name: ${isComponentName}, Has React Patterns: ${hasReactPatterns}`);
      
      // Consider it a React component if:
      // 1. It has JSX and follows component naming convention, OR
      // 2. It follows component naming convention and has React patterns
      return (hasJSX && isComponentName) || (isComponentName && hasReactPatterns);
    } catch (error) {
      console.log(`Error checking if node is React component: ${error}`);
      return false;
    }
  }

  private extractProps(sourceFile: ts.SourceFile, componentName: string): PropInfo[] {
    const props: PropInfo[] = [];
    
    const visit = (node: ts.Node) => {
      // Look for interface declarations ending with Props
      if (ts.isInterfaceDeclaration(node)) {
        const interfaceName = node.name?.text || '';
        if (interfaceName.endsWith('Props') && 
            (interfaceName === `${componentName}Props` || 
             interfaceName.toLowerCase().includes(componentName.toLowerCase()))) {
          
          node.members.forEach(member => {
            if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
              const propName = member.name?.text || '';
              const isRequired = !member.questionToken;
              const type = member.type ? this.typeChecker.typeToString(
                this.typeChecker.getTypeAtLocation(member.type)
              ) : 'unknown';
              
              const description = this.extractJSDocComment(member);
              
              props.push({
                name: propName,
                type,
                required: isRequired,
                description
              });
            }
          });
        }
      }

      // Look for type aliases
      if (ts.isTypeAliasDeclaration(node)) {
        const typeName = node.name?.text || '';
        if (typeName.endsWith('Props') && 
            (typeName === `${componentName}Props` || 
             typeName.toLowerCase().includes(componentName.toLowerCase()))) {
          
          if (ts.isTypeLiteralNode(node.type)) {
            node.type.members.forEach(member => {
              if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
                const propName = member.name?.text || '';
                const isRequired = !member.questionToken;
                const type = member.type ? this.typeChecker.typeToString(
                  this.typeChecker.getTypeAtLocation(member.type)
                ) : 'unknown';
                
                const description = this.extractJSDocComment(member);
                
                props.push({
                  name: propName,
                  type,
                  required: isRequired,
                  description
                });
              }
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return props;
  }

  private extractDependencies(sourceFile: ts.SourceFile): string[] {
    const dependencies: string[] = [];
    
    sourceFile.statements.forEach(statement => {
      if (ts.isImportDeclaration(statement)) {
        const moduleSpecifier = statement.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier?.text || '';
          
          // Extract local component dependencies
          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            dependencies.push(importPath);
          }
          
          // Extract external library dependencies
          if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            dependencies.push(importPath);
          }
        }
      }
    });

    return dependencies;
  }

  private async findStories(componentName: string): Promise<StoryInfo[]> {
    const storyFiles = await glob(`**/*${componentName}*.stories.{tsx,ts}`, {
      cwd: '.',
      ignore: ['node_modules/**']
    });

    const stories: StoryInfo[] = [];

    for (const storyFile of storyFiles) {
      const storyInfo = await this.analyzeStoryFile(storyFile, componentName);
      stories.push(...storyInfo);
    }

    return stories;
  }

  private async analyzeStoryFile(filePath: string, componentName: string): Promise<StoryInfo[]> {
    const stories: StoryInfo[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const visit = (node: ts.Node) => {
        // Look for exported story declarations
        if (ts.isVariableStatement(node) && 
            node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
          
          node.declarationList.declarations.forEach(decl => {
            if (ts.isIdentifier(decl.name) && decl.initializer) {
              const storyName = decl.name?.text || '';
              const args = this.extractStoryArgs(content); // Pass the content instead of decl.initializer
              const description = this.extractJSDocComment(node);
              
              stories.push({
                name: storyName,
                filePath,
                args,
                description
              });
            }
          });
        }

        if (node) {
          ts.forEachChild(node, visit);
        }
      };

      visit(sourceFile);
    } catch (error) {
      console.warn(`Failed to analyze story file ${filePath}:`, error);
    }

    return stories;
  }

  private extractStoryArgs(storyFileContent: string): Record<string, any> {
    try {
      const sourceFile = ts.createSourceFile(
        'story.tsx',
        storyFileContent,
        ts.ScriptTarget.Latest,
        true
      );

      const args: Record<string, any> = {};

      // Enhanced value extraction function
      const extractValue = (initializer: ts.Expression): any => {
        if (ts.isStringLiteral(initializer)) {
          return initializer.text;
        } else if (ts.isNumericLiteral(initializer)) {
          return Number(initializer.text);
        } else if (initializer.kind === ts.SyntaxKind.TrueKeyword) {
          return true;
        } else if (initializer.kind === ts.SyntaxKind.FalseKeyword) {
          return false;
        } else if (initializer.kind === ts.SyntaxKind.NullKeyword) {
          return null;
        } else if (initializer.kind === ts.SyntaxKind.UndefinedKeyword) {
          return undefined;
        } else if (ts.isArrayLiteralExpression(initializer)) {
          // Handle arrays including mixed types and undefined values
          return initializer.elements.map(element => {
            if (ts.isStringLiteral(element)) {
              return element.text;
            } else if (ts.isNumericLiteral(element)) {
              return Number(element.text);
            } else if (element.kind === ts.SyntaxKind.TrueKeyword) {
              return true;
            } else if (element.kind === ts.SyntaxKind.FalseKeyword) {
              return false;
            } else if (element.kind === ts.SyntaxKind.NullKeyword) {
              return null;
            } else if (element.kind === ts.SyntaxKind.UndefinedKeyword) {
              return undefined;
            } else if (ts.isObjectLiteralExpression(element)) {
              return extractValue(element);
            } else if (ts.isArrayLiteralExpression(element)) {
              return extractValue(element);
            }
            return extractValue(element);
          });
        } else if (ts.isObjectLiteralExpression(initializer)) {
          // Handle nested objects with computed property names
          const nestedObj: Record<string, any> = {};
          initializer.properties.forEach(innerProp => {
            let innerKey: string;
            
            if (ts.isPropertyAssignment(innerProp)) {
              if (ts.isIdentifier(innerProp.name)) {
                innerKey = innerProp.name.text;
              } else if (ts.isStringLiteral(innerProp.name)) {
                innerKey = innerProp.name.text;
              } else if (ts.isComputedPropertyName(innerProp.name)) {
                // Handle computed property names
                const computedValue = extractValue(innerProp.name.expression);
                innerKey = String(computedValue);
              } else {
                return; // Skip unsupported property name types
              }
              
              nestedObj[innerKey] = extractValue(innerProp.initializer);
            } else if (ts.isShorthandPropertyAssignment(innerProp)) {
              // Handle shorthand properties like { prop }
              if (ts.isIdentifier(innerProp.name)) {
                innerKey = innerProp.name.text;
                nestedObj[innerKey] = innerKey; // Shorthand refers to variable with same name
              }
            } else if (ts.isSpreadAssignment(innerProp)) {
              // Handle spread operator like { ...otherProps }
              const spreadValue = extractValue(innerProp.expression);
              if (typeof spreadValue === 'object' && spreadValue !== null) {
                Object.assign(nestedObj, spreadValue);
              }
            }
          });
          return nestedObj;
        } else if (ts.isIdentifier(initializer)) {
          // Handle identifiers (variables)
          return initializer.text;
        } else if (ts.isPropertyAccessExpression(initializer)) {
          // Handle property access expressions (e.g., SomeEnum.Value)
          return `${initializer.expression.getText()}.${initializer.name.text}`;
        } else if (ts.isElementAccessExpression(initializer)) {
          // Handle element access expressions (e.g., array[0], obj['key'])
          const object = extractValue(initializer.expression);
          const index = extractValue(initializer.argumentExpression);
          return `${object}[${index}]`;
        } else if (ts.isCallExpression(initializer)) {
          // Handle function calls - return a representation
          const args = initializer.arguments.map(arg => extractValue(arg)).join(', ');
          return `${initializer.expression.getText()}(${args})`;
        }
        return undefined;
      };

      const visit = (node: ts.Node) => {
        // Handle Template.bind({}) patterns
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.name) &&
          node.expression.name.text === 'bind' &&
          node.arguments.length > 0 &&
          ts.isObjectLiteralExpression(node.arguments[0])
        ) {
          const objLiteral = node.arguments[0] as ts.ObjectLiteralExpression;
          objLiteral.properties.forEach(prop => {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
              const key = prop.name.text;
              const value = extractValue(prop.initializer);
              if (value !== undefined) {
                args[key] = value;
              }
            }
          });
        }

        // Handle direct story object exports
        if (
          ts.isVariableStatement(node) &&
          node.declarationList.declarations.length > 0
        ) {
          const declaration = node.declarationList.declarations[0];
          if (
            declaration &&
            ts.isIdentifier(declaration.name) &&
            declaration.initializer &&
            ts.isObjectLiteralExpression(declaration.initializer)
          ) {
            const storyName = declaration.name.text;
            const objLiteral = declaration.initializer;
            const storyArgs: Record<string, any> = {};
            
            objLiteral.properties.forEach(prop => {
              if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                const key = prop.name.text;
                const value = extractValue(prop.initializer);
                if (value !== undefined) {
                  storyArgs[key] = value;
                }
              }
            });
            
            if (Object.keys(storyArgs).length > 0) {
              args[storyName] = storyArgs;
            }
          }
        }

        // Handle default export story objects
        if (
          ts.isExportAssignment(node) &&
          node.expression &&
          ts.isObjectLiteralExpression(node.expression)
        ) {
          const objLiteral = node.expression;
          objLiteral.properties.forEach(prop => {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
              const key = prop.name.text;
              const value = extractValue(prop.initializer);
              if (value !== undefined) {
                args[key] = value;
              }
            }
          });
        }

        // Handle JSX props in story definitions
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const jsxElement = ts.isJsxElement(node) ? node.openingElement : node;
          jsxElement.attributes.properties.forEach(attr => {
            if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name)) {
              const key = attr.name.text;
              if (attr.initializer) {
                if (ts.isStringLiteral(attr.initializer)) {
                  args[key] = attr.initializer.text;
                } else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                  const value = extractValue(attr.initializer.expression);
                  if (value !== undefined) {
                    args[key] = value;
                  }
                }
              } else {
                // Boolean prop without value
                args[key] = true;
              }
            }
          });
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
      return args;
    } catch (error) {
      console.warn('Warning: Could not parse story args:', error);
      return {};
    }
  }

  private async findTests(componentName: string): Promise<TestInfo[]> {
    const testFiles = await glob(`**/*${componentName}*.{test,spec}.{tsx,ts}`, {
      cwd: '.',
      ignore: ['node_modules/**']
    });

    const tests: TestInfo[] = [];

    for (const testFile of testFiles) {
      const testInfo = await this.analyzeTestFile(testFile);
      if (testInfo) {
        tests.push(testInfo);
      }
    }

    return tests;
  }

  private async analyzeTestFile(filePath: string): Promise<TestInfo | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const testCases = this.extractTestCases(content);
      const behaviors = this.extractBehaviors(content);

      return {
        filePath,
        testCases,
        behaviors
      };
    } catch (error) {
      console.warn(`Failed to analyze test file ${filePath}:`, error);
      return null;
    }
  }

  private extractTestCases(content: string): string[] {
    const testCases: string[] = [];
    
    // Extract test descriptions using regex
    const testRegex = /(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = testRegex.exec(content)) !== null) {
      if (match && match[1]) {
        testCases.push(match[1]);
      }
    }

    return testCases;
  }

  private extractBehaviors(content: string): string[] {
    const behaviors: string[] = [];
    
    // Extract describe blocks and test expectations
    const describeRegex = /describe\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const expectRegex = /expect\([^)]+\)\.([a-zA-Z]+)/g;
    
    let match;
    
    while ((match = describeRegex.exec(content)) !== null) {
      behaviors.push(`Test suite: ${match[1]}`);
    }
    
    while ((match = expectRegex.exec(content)) !== null) {
      behaviors.push(`Expects: ${match[1]}`);
    }

    return behaviors;
  }

  private analyzeComponentType(content: string): { isServerComponent: boolean; isClientComponent: boolean } {
    const isClientComponent = content.includes("'use client'") || content.includes('"use client"');
    const isServerComponent = !isClientComponent && (
      content.includes('async function') ||
      content.includes('await ') ||
      content.includes('currentUser') ||
      content.includes('getTranslations')
    );

    return { isServerComponent, isClientComponent };
  }

  private extractDescription(sourceFile: ts.SourceFile, componentName: string): string | undefined {
    // Look for JSDoc comments on the component
    const visit = (node: ts.Node) => {
      if ((ts.isFunctionDeclaration(node) && node.name?.text === componentName) ||
          (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name?.text === componentName)) {
        return this.extractJSDocComment(node);
      }
      
      let result: string | undefined;
      ts.forEachChild(node, child => {
        const childResult = visit(child);
        if (childResult) result = childResult;
      });
      return result;
    };

    return visit(sourceFile);
  }

  private extractJSDocComment(node: ts.Node): string | undefined {
    const sourceFile = node.getSourceFile();
    const fullText = sourceFile.getFullText();
    const commentRanges = ts.getLeadingCommentRanges(fullText, node.getFullStart());
    
    if (commentRanges) {
      for (const range of commentRanges) {
        const comment = fullText.substring(range.pos, range.end);
        if (comment.startsWith('/**')) {
          // Extract JSDoc content
          return comment
            .replace(/\/\*\*|\*\//g, '')
            .replace(/^\s*\*/gm, '')
            .trim();
        }
      }
    }
    
    return undefined;
  }

  private categorizeComponent(filePath: string, componentName: string): string {
    const pathParts = filePath.split(path.sep);
    
    if (pathParts.includes('health')) return 'Health Management';
    if (pathParts.includes('exercise')) return 'Exercise Management';
    if (pathParts.includes('ui')) return 'UI Components';
    if (pathParts.includes('forms')) return 'Form Components';
    if (pathParts.includes('layout')) return 'Layout Components';
    if (pathParts.includes('templates')) return 'Template Components';
    
    // Categorize by component name patterns
    if (componentName.includes('Form')) return 'Form Components';
    if (componentName.includes('Chart') || componentName.includes('Graph')) return 'Data Visualization';
    if (componentName.includes('Modal') || componentName.includes('Dialog')) return 'Modal Components';
    if (componentName.includes('Button') || componentName.includes('Input')) return 'UI Components';
    if (componentName.includes('Layout') || componentName.includes('Template')) return 'Layout Components';
    
    return 'Core Components';
  }

  private async generateComponentInventory(components: ComponentInfo[]): Promise<void> {
    const inventoryPath = path.join(this.docsDir, 'ui-component-inventory.md');
    
    let content = `# UI Component Inventory

## Overview

This document provides a comprehensive catalog of all React components in the Next.js health management application. The components are classified by type, functionality, and usage patterns to help developers understand the architecture and reusability patterns.

*Last updated: ${new Date().toISOString()}*
*Generated automatically from source code analysis*

## Component Classification

`;

    // Group components by category
    const componentsByCategory = components.reduce((acc, component) => {
      const category = component.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(component);
      return acc;
    }, {} as Record<string, ComponentInfo[]>);

    // Generate category sections
    for (const [category, categoryComponents] of Object.entries(componentsByCategory)) {
      content += `### ${category}\n\n`;
      
      // Separate server and client components
      const serverComponents = categoryComponents.filter(c => c.isServerComponent);
      const clientComponents = categoryComponents.filter(c => c.isClientComponent);
      const otherComponents = categoryComponents.filter(c => !c.isServerComponent && !c.isClientComponent);

      if (serverComponents.length > 0) {
        content += `#### Server Components\nComponents that render on the server and handle data fetching:\n\n`;
        serverComponents.forEach(component => {
          content += `- **${component.name}** - ${component.description || 'Component description not available'}\n`;
        });
        content += '\n';
      }

      if (clientComponents.length > 0) {
        content += `#### Client Components\nInteractive components marked with \`'use client'\`:\n\n`;
        clientComponents.forEach(component => {
          content += `- **${component.name}** - ${component.description || 'Interactive component'}\n`;
        });
        content += '\n';
      }

      if (otherComponents.length > 0) {
        otherComponents.forEach(component => {
          content += `- **${component.name}** - ${component.description || 'Component description not available'}\n`;
        });
        content += '\n';
      }
    }

    // Generate detailed component sections
    content += `## Detailed Component Analysis\n\n`;

    for (const component of components) {
      content += `### ${component.name}${component.isServerComponent ? ' (Server Component)' : component.isClientComponent ? ' (Client Component)' : ''}\n\n`;
      
      content += `**File**: \`${component.filePath}\`\n\n`;
      
      if (component.description) {
        content += `**Purpose**: ${component.description}\n\n`;
      }

      // Props interface
      if (component.props.length > 0) {
        content += `**Props Interface**:\n\`\`\`typescript\n`;
        content += `type ${component.name}Props = {\n`;
        component.props.forEach(prop => {
          const optional = prop.required ? '' : '?';
          const description = prop.description ? ` // ${prop.description}` : '';
          content += `  ${prop.name}${optional}: ${prop.type};${description}\n`;
        });
        content += `};\n\`\`\`\n\n`;
      } else {
        content += `**Props Interface**: None (no props or props not detected)\n\n`;
      }

      // Dependencies
      if (component.dependencies.length > 0) {
        content += `**Dependencies**:\n`;
        component.dependencies.forEach(dep => {
          content += `- ${dep}\n`;
        });
        content += '\n';
      }

      // Stories
      if (component.stories.length > 0) {
        content += `**Storybook Stories**:\n`;
        component.stories.forEach(story => {
          content += `- **${story.name}** (${story.filePath})\n`;
          if (story.description) {
            content += `  - ${story.description}\n`;
          }
        });
        content += '\n';
      }

      // Test coverage
      if (component.tests.length > 0) {
        content += `**Test Coverage**:\n`;
        component.tests.forEach(test => {
          content += `- Test file: \`${test.filePath}\`\n`;
          content += `- Test cases: ${test.testCases.length}\n`;
        });
        content += '\n';
      }

      content += '---\n\n';
    }

    // Generate summary statistics
    content += `## Component Statistics\n\n`;
    content += `- **Total Components**: ${components.length}\n`;
    content += `- **Server Components**: ${components.filter(c => c.isServerComponent).length}\n`;
    content += `- **Client Components**: ${components.filter(c => c.isClientComponent).length}\n`;
    content += `- **Components with Props**: ${components.filter(c => c.props.length > 0).length}\n`;
    content += `- **Components with Stories**: ${components.filter(c => c.stories.length > 0).length}\n`;
    content += `- **Components with Tests**: ${components.filter(c => c.tests.length > 0).length}\n\n`;

    // Generate props analysis
    content += `## Props Analysis\n\n`;
    const allProps = components.flatMap(c => c.props);
    const propTypes = [...new Set(allProps.map(p => p.type))].sort();
    
    content += `### Common Prop Types\n`;
    propTypes.forEach(type => {
      const count = allProps.filter(p => p.type === type).length;
      content += `- \`${type}\`: ${count} occurrences\n`;
    });
    content += '\n';

    // Generate dependency analysis
    content += `## Dependency Analysis\n\n`;
    const allDependencies = components.flatMap(c => c.dependencies);
    const externalDeps = allDependencies.filter(dep => !dep.startsWith('.'));
    const internalDeps = allDependencies.filter(dep => dep.startsWith('.'));
    
    content += `### External Dependencies\n`;
    const uniqueExternalDeps = [...new Set(externalDeps)].sort();
    uniqueExternalDeps.forEach(dep => {
      const count = externalDeps.filter(d => d === dep).length;
      content += `- \`${dep}\`: used by ${count} components\n`;
    });
    content += '\n';

    content += `### Internal Dependencies\n`;
    const uniqueInternalDeps = [...new Set(internalDeps)].sort();
    uniqueInternalDeps.forEach(dep => {
      const count = internalDeps.filter(d => d === dep).length;
      content += `- \`${dep}\`: used by ${count} components\n`;
    });
    content += '\n';

    await fs.promises.writeFile(inventoryPath, content, 'utf-8');
    console.log(`✅ Generated component inventory: ${inventoryPath}`);
  }

  private async generateBehaviorRequirements(components: ComponentInfo[]): Promise<void> {
    const behaviorPath = path.join(this.docsDir, 'component-behavior-requirements.md');
    
    let content = `# Component Behavior Requirements

This document extracts comprehensive component behavior requirements from unit tests, Storybook stories, and TypeScript interfaces, providing detailed specifications for component implementation, validation, and integration patterns.

*Last updated: ${new Date().toISOString()}*
*Generated automatically from source code analysis*

`;

    let sectionNumber = 1;

    for (const component of components) {
      if (component.tests.length === 0 && component.stories.length === 0) {
        continue; // Skip components without tests or stories
      }

      content += `## ${sectionNumber}. ${component.name} Component Requirements\n\n`;

      // Generate requirements from props
      if (component.props.length > 0) {
        content += `### ${sectionNumber}.1 Props Requirements\n\n`;
        
        component.props.forEach((prop, index) => {
          content += `#### ${prop.name} Prop\n`;
          content += `- **Type**: \`${prop.type}\`\n`;
          content += `- **Required**: ${prop.required ? 'Yes' : 'No'}\n`;
          if (prop.description) {
            content += `- **Description**: ${prop.description}\n`;
          }
          if (prop.defaultValue) {
            content += `- **Default Value**: \`${prop.defaultValue}\`\n`;
          }
          content += '\n';
        });
      }

      // Generate requirements from stories
      if (component.stories.length > 0) {
        content += `### ${sectionNumber}.2 Usage Requirements (from Storybook)\n\n`;
        
        component.stories.forEach((story, index) => {
          content += `#### ${story.name} Story\n`;
          content += `- **File**: \`${story.filePath}\`\n`;
          if (story.description) {
            content += `- **Description**: ${story.description}\n`;
          }
          if (Object.keys(story.args).length > 0) {
            content += `- **Example Props**: \`${JSON.stringify(story.args, null, 2)}\`\n`;
          }
          content += '\n';
        });
      }

      // Generate requirements from tests
      if (component.tests.length > 0) {
        content += `### ${sectionNumber}.3 Behavioral Requirements (from Tests)\n\n`;
        
        component.tests.forEach((test, index) => {
          content += `#### Test Suite: ${path.basename(test.filePath)}\n\n`;
          
          if (test.testCases.length > 0) {
            content += `**Test Cases**:\n`;
            test.testCases.forEach(testCase => {
              content += `- ${testCase}\n`;
            });
            content += '\n';
          }

          if (test.behaviors.length > 0) {
            content += `**Expected Behaviors**:\n`;
            test.behaviors.forEach(behavior => {
              content += `- ${behavior}\n`;
            });
            content += '\n';
          }
        });
      }

      // Component type specific requirements
      if (component.isServerComponent) {
        content += `### ${sectionNumber}.4 Server Component Requirements\n\n`;
        content += `- Must render on the server\n`;
        content += `- Can perform async data fetching\n`;
        content += `- Cannot use client-side hooks or event handlers\n`;
        content += `- Must handle authentication and authorization server-side\n\n`;
      }

      if (component.isClientComponent) {
        content += `### ${sectionNumber}.4 Client Component Requirements\n\n`;
        content += `- Must include \`'use client'\` directive\n`;
        content += `- Can use React hooks and event handlers\n`;
        content += `- Must handle client-side state management\n`;
        content += `- Should implement proper error boundaries\n\n`;
      }

      // Accessibility requirements
      content += `### ${sectionNumber}.5 Accessibility Requirements\n\n`;
      content += `- Must be keyboard navigable\n`;
      content += `- Must provide appropriate ARIA labels and roles\n`;
      content += `- Must support screen readers\n`;
      content += `- Must meet WCAG 2.1 AA standards\n\n`;

      // Performance requirements
      content += `### ${sectionNumber}.6 Performance Requirements\n\n`;
      content += `- Must minimize re-renders\n`;
      content += `- Should implement proper memoization where appropriate\n`;
      content += `- Must handle loading and error states gracefully\n`;
      content += `- Should support lazy loading if applicable\n\n`;

      content += '---\n\n';
      sectionNumber++;
    }

    // Generate implementation guidelines
    content += `## Implementation Guidelines\n\n`;
    content += `### Component Development Standards\n`;
    content += `1. **Type Safety**: All components must be fully typed with TypeScript\n`;
    content += `2. **Error Boundaries**: Components should implement appropriate error boundaries\n`;
    content += `3. **Performance**: Components must meet performance requirements\n`;
    content += `4. **Accessibility**: All accessibility requirements must be met\n`;
    content += `5. **Testing**: Comprehensive test coverage is required\n`;
    content += `6. **Documentation**: Components must be properly documented\n\n`;

    content += `### Quality Assurance\n`;
    content += `1. **Code Review**: All component changes must undergo code review\n`;
    content += `2. **Testing**: All tests must pass before deployment\n`;
    content += `3. **Accessibility Audit**: Regular accessibility audits must be conducted\n`;
    content += `4. **Performance Monitoring**: Component performance must be monitored\n`;
    content += `5. **User Testing**: Components should undergo user testing when appropriate\n\n`;

    content += `This document serves as the definitive specification for component behavior requirements, extracted from comprehensive analysis of tests, stories, and TypeScript interfaces.\n`;

    await fs.promises.writeFile(behaviorPath, content, 'utf-8');
    console.log(`✅ Generated behavior requirements: ${behaviorPath}`);
  }
}

// Main execution
async function main() {
  const componentsDir = path.resolve('./src/components');
  const docsDir = path.resolve('./docs');

  // Ensure directories exist
  if (!fs.existsSync(componentsDir)) {
    console.error(`❌ Components directory not found: ${componentsDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(docsDir)) {
    console.log(`📁 Creating docs directory: ${docsDir}`);
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const generator = new ComponentDocumentationGenerator(componentsDir, docsDir);
  
  try {
    await generator.generateDocumentation();
  } catch (error) {
    console.error('❌ Error generating component documentation:', error);
    process.exit(1);
  }
}

// Run the script
import { pathToFileURL } from 'url';
const isCli = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main().catch(console.error);
}

export { ComponentDocumentationGenerator };