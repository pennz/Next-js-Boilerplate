#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { Project, SyntaxKind, VariableDeclaration, CallExpression } from 'ts-morph';

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
  enums: string[];
  constraints: ConstraintInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  primaryKey: boolean;
  unique: boolean;
  length?: number;
  precision?: number;
  scale?: number;
}

interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
}

interface ForeignKeyInfo {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: string;
  onUpdate?: string;
}

interface ConstraintInfo {
  name: string;
  type: 'check' | 'unique' | 'not_null' | 'default';
  definition: string;
}

interface EnumInfo {
  name: string;
  values: string[];
  usage: string[];
}

interface MigrationInfo {
  filename: string;
  timestamp: string;
  description: string;
  operations: string[];
  size: number;
  createdAt: Date;
}

class DatabaseDocumentationGenerator {
  private project: Project;
  private schemaPath: string;
  private migrationsPath: string;
  private docsPath: string;
  private tables: Map<string, TableInfo> = new Map();
  private enums: Map<string, EnumInfo> = new Map();
  private migrations: MigrationInfo[] = [];

  constructor() {
    this.project = new Project({
      tsConfigFilePath: join(process.cwd(), 'tsconfig.json'),
    });
    this.schemaPath = join(process.cwd(), 'src/models/Schema.ts');
    this.migrationsPath = join(process.cwd(), 'migrations');
    this.docsPath = join(process.cwd(), 'docs');
  }

  async generate(): Promise<void> {
    console.log('🔍 Analyzing Drizzle schema...');
    await this.parseSchema();
    
    console.log('📁 Analyzing migrations...');
    await this.parseMigrations();
    
    console.log('📊 Generating entity relationship diagram...');
    await this.generateERD();
    
    console.log('📋 Generating schema analysis...');
    await this.generateSchemaAnalysis();
    
    console.log('✅ Database documentation generated successfully!');
  }

  private async parseSchema(): Promise<void> {
    const sourceFile = this.project.addSourceFileAtPath(this.schemaPath);
    
    // Parse enums first
    this.parseEnums(sourceFile);
    
    // Parse table schemas
    const variableDeclarations = sourceFile.getVariableDeclarations();
    
    for (const declaration of variableDeclarations) {
      const name = declaration.getName();
      if (name.endsWith('Schema')) {
        const tableName = name.replace('Schema', '');
        const tableInfo = this.parseTableDeclaration(declaration, tableName);
        if (tableInfo) {
          this.tables.set(tableName, tableInfo);
        }
      }
    }
  }

  private parseEnums(sourceFile: any): void {
    const variableDeclarations = sourceFile.getVariableDeclarations();
    
    for (const declaration of variableDeclarations) {
      const name = declaration.getName();
      if (name.endsWith('Enum')) {
        const enumInfo = this.parseEnumDeclaration(declaration, name);
        if (enumInfo) {
          this.enums.set(name, enumInfo);
        }
      }
    }
  }

  private parseEnumDeclaration(declaration: VariableDeclaration, name: string): EnumInfo | null {
    try {
      const initializer = declaration.getInitializer();
      if (!initializer) return null;

      const callExpression = initializer.asKind(SyntaxKind.CallExpression);
      if (!callExpression) return null;

      const args = callExpression.getArguments();
      if (args.length < 2) return null;

      const enumName = args[0].getText().replace(/['"]/g, '');
      const valuesArg = args[1];
      
      let values: string[] = [];
      if (valuesArg.getKind() === SyntaxKind.ArrayLiteralExpression) {
        const arrayLiteral = valuesArg.asKind(SyntaxKind.ArrayLiteralExpression);
        values = arrayLiteral?.getElements().map(el => el.getText().replace(/['"]/g, '')) || [];
      }

      return {
        name: enumName,
        values,
        usage: this.findEnumUsage(name)
      };
    } catch (error) {
      console.warn(`Failed to parse enum ${name}:`, error);
      return null;
    }
  }

  private findEnumUsage(enumName: string): string[] {
    const usage: string[] = [];
    for (const [tableName, tableInfo] of this.tables) {
      for (const column of tableInfo.columns) {
        if (column.type.includes(enumName.replace('Enum', ''))) {
          usage.push(`${tableName}.${column.name}`);
        }
      }
    }
    return usage;
  }

  private parseTableDeclaration(declaration: VariableDeclaration, tableName: string): TableInfo | null {
    try {
      const initializer = declaration.getInitializer();
      if (!initializer) return null;

      const callExpression = initializer.asKind(SyntaxKind.CallExpression);
      if (!callExpression) return null;

      const args = callExpression.getArguments();
      if (args.length < 2) return null;

      const tableNameArg = args[0].getText().replace(/['"]/g, '');
      const columnsArg = args[1];
      const indexesArg = args[2];

      const columns = this.parseColumns(columnsArg);
      const { indexes, foreignKeys } = this.parseIndexesAndConstraints(indexesArg, tableName);

      return {
        name: tableNameArg,
        columns,
        indexes,
        foreignKeys,
        enums: this.getTableEnums(columns),
        constraints: this.getTableConstraints(columns)
      };
    } catch (error) {
      console.warn(`Failed to parse table ${tableName}:`, error);
      return null;
    }
  }

  private parseColumns(columnsArg: any): ColumnInfo[] {
    const columns: ColumnInfo[] = [];
    
    if (columnsArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
      const objectLiteral = columnsArg.asKind(SyntaxKind.ObjectLiteralExpression);
      const properties = objectLiteral?.getProperties() || [];

      for (const property of properties) {
        if (property.getKind() === SyntaxKind.PropertyAssignment) {
          const propAssignment = property.asKind(SyntaxKind.PropertyAssignment);
          const columnName = propAssignment?.getName();
          const columnDef = propAssignment?.getInitializer();

          if (columnName && columnDef) {
            const columnInfo = this.parseColumnDefinition(columnName, columnDef);
            if (columnInfo) {
              columns.push(columnInfo);
            }
          }
        }
      }
    }

    return columns;
  }

  private parseColumnDefinition(name: string, definition: any): ColumnInfo | null {
    try {
      const columnInfo: ColumnInfo = {
        name,
        type: 'unknown',
        nullable: true,
        primaryKey: false,
        unique: false
      };

      // Parse the column definition chain
      let current = definition;
      while (current) {
        if (current.getKind() === SyntaxKind.CallExpression) {
          const callExpr = current.asKind(SyntaxKind.CallExpression);
          const expression = callExpr?.getExpression();
          
          if (expression) {
            const methodName = this.getMethodName(expression);
            const args = callExpr?.getArguments() || [];

            switch (methodName) {
              case 'serial':
                columnInfo.type = 'serial';
                columnInfo.nullable = false;
                break;
              case 'integer':
                columnInfo.type = 'integer';
                break;
              case 'varchar':
                columnInfo.type = 'varchar';
                if (args.length > 1) {
                  const lengthArg = args[1];
                  if (lengthArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
                    const lengthProp = this.getObjectProperty(lengthArg, 'length');
                    if (lengthProp) {
                      columnInfo.length = parseInt(lengthProp);
                    }
                  }
                }
                break;
              case 'numeric':
                columnInfo.type = 'numeric';
                if (args.length > 1) {
                  const precisionArg = args[1];
                  if (precisionArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
                    const precision = this.getObjectProperty(precisionArg, 'precision');
                    const scale = this.getObjectProperty(precisionArg, 'scale');
                    if (precision) columnInfo.precision = parseInt(precision);
                    if (scale) columnInfo.scale = parseInt(scale);
                  }
                }
                break;
              case 'boolean':
                columnInfo.type = 'boolean';
                break;
              case 'timestamp':
                columnInfo.type = 'timestamp';
                break;
              case 'jsonb':
                columnInfo.type = 'jsonb';
                break;
              case 'primaryKey':
                columnInfo.primaryKey = true;
                columnInfo.nullable = false;
                break;
              case 'notNull':
                columnInfo.nullable = false;
                break;
              case 'unique':
                columnInfo.unique = true;
                break;
              case 'default':
                if (args.length > 0) {
                  columnInfo.defaultValue = args[0].getText();
                }
                break;
              case 'defaultNow':
                columnInfo.defaultValue = 'now()';
                break;
              case 'references':
                // Handle foreign key references
                break;
            }

            // Check for enum types
            if (methodName && this.enums.has(methodName)) {
              columnInfo.type = methodName;
            }
          }

          // Move to the next call in the chain
          current = expression;
        } else {
          break;
        }
      }

      return columnInfo;
    } catch (error) {
      console.warn(`Failed to parse column ${name}:`, error);
      return null;
    }
  }

  private getMethodName(expression: any): string {
    if (expression.getKind() === SyntaxKind.PropertyAccessExpression) {
      const propAccess = expression.asKind(SyntaxKind.PropertyAccessExpression);
      return propAccess?.getName() || '';
    } else if (expression.getKind() === SyntaxKind.Identifier) {
      const identifier = expression.asKind(SyntaxKind.Identifier);
      return identifier?.getText() || '';
    }
    return '';
  }

  private getObjectProperty(objectLiteral: any, propertyName: string): string | null {
    const properties = objectLiteral.getProperties();
    for (const prop of properties) {
      if (prop.getKind() === SyntaxKind.PropertyAssignment) {
        const propAssignment = prop.asKind(SyntaxKind.PropertyAssignment);
        if (propAssignment?.getName() === propertyName) {
          return propAssignment.getInitializer()?.getText() || null;
        }
      }
    }
    return null;
  }

  private parseIndexesAndConstraints(indexesArg: any, tableName: string): { indexes: IndexInfo[], foreignKeys: ForeignKeyInfo[] } {
    const indexes: IndexInfo[] = [];
    const foreignKeys: ForeignKeyInfo[] = [];

    if (!indexesArg || indexesArg.getKind() !== SyntaxKind.ArrowFunction) {
      return { indexes, foreignKeys };
    }

    // Parse index definitions from the table callback
    // This is a simplified parser - in practice, you'd need more sophisticated AST traversal
    const functionBody = indexesArg.getBody();
    if (functionBody) {
      const text = functionBody.getText();
      
      // Extract index definitions using regex (simplified approach)
      const indexMatches = text.match(/(\w+):\s*index\([^)]+\)\.on\([^)]+\)/g);
      if (indexMatches) {
        for (const match of indexMatches) {
          const indexName = match.split(':')[0].trim();
          indexes.push({
            name: `${tableName}_${indexName}`,
            columns: [], // Would need more sophisticated parsing
            unique: false,
            type: 'btree'
          });
        }
      }
    }

    return { indexes, foreignKeys };
  }

  private getTableEnums(columns: ColumnInfo[]): string[] {
    const enums: string[] = [];
    for (const column of columns) {
      if (this.enums.has(column.type)) {
        enums.push(column.type);
      }
    }
    return [...new Set(enums)];
  }

  private getTableConstraints(columns: ColumnInfo[]): ConstraintInfo[] {
    const constraints: ConstraintInfo[] = [];
    
    for (const column of columns) {
      if (column.primaryKey) {
        constraints.push({
          name: `${column.name}_pkey`,
          type: 'not_null',
          definition: `PRIMARY KEY (${column.name})`
        });
      }
      
      if (column.unique) {
        constraints.push({
          name: `${column.name}_unique`,
          type: 'unique',
          definition: `UNIQUE (${column.name})`
        });
      }
      
      if (!column.nullable) {
        constraints.push({
          name: `${column.name}_not_null`,
          type: 'not_null',
          definition: `${column.name} NOT NULL`
        });
      }
      
      if (column.defaultValue) {
        constraints.push({
          name: `${column.name}_default`,
          type: 'default',
          definition: `${column.name} DEFAULT ${column.defaultValue}`
        });
      }
    }
    
    return constraints;
  }

  private async parseMigrations(): Promise<void> {
    try {
      if (!statSync(this.migrationsPath).isDirectory()) {
        console.warn('Migrations directory not found');
        return;
      }

      const files = readdirSync(this.migrationsPath);
      const migrationFiles = files.filter(file => 
        extname(file) === '.sql' || extname(file) === '.ts' || extname(file) === '.js'
      );

      for (const file of migrationFiles) {
        const filePath = join(this.migrationsPath, file);
        const stats = statSync(filePath);
        const content = readFileSync(filePath, 'utf-8');

        const migration: MigrationInfo = {
          filename: file,
          timestamp: this.extractTimestamp(file),
          description: this.extractDescription(file, content),
          operations: this.extractOperations(content),
          size: stats.size,
          createdAt: stats.birthtime
        };

        this.migrations.push(migration);
      }

      // Sort migrations by timestamp
      this.migrations.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    } catch (error) {
      console.warn('Failed to parse migrations:', error);
    }
  }

  private extractTimestamp(filename: string): string {
    const match = filename.match(/(\d{4}_\d{2}_\d{2}_\d{6})/);
    return match ? match[1] : '';
  }

  private extractDescription(filename: string, content: string): string {
    // Try to extract description from filename
    const parts = filename.split('_');
    if (parts.length > 4) {
      return parts.slice(4).join('_').replace(/\.(sql|ts|js)$/, '');
    }

    // Try to extract from content comments
    const commentMatch = content.match(/--\s*(.+)/);
    if (commentMatch) {
      return commentMatch[1].trim();
    }

    return 'Migration';
  }

  private extractOperations(content: string): string[] {
    const operations: string[] = [];
    
    // SQL operations
    const sqlOperations = [
      'CREATE TABLE',
      'ALTER TABLE',
      'DROP TABLE',
      'CREATE INDEX',
      'DROP INDEX',
      'CREATE TYPE',
      'DROP TYPE'
    ];

    for (const operation of sqlOperations) {
      const regex = new RegExp(`${operation}\\s+[^;]+;`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        operations.push(...matches.map(match => match.trim()));
      }
    }

    return operations;
  }

  private async generateERD(): Promise<void> {
    const erdContent = this.buildERDContent();
    const erdPath = join(this.docsPath, 'entity-relationship-diagram.md');
    
    writeFileSync(erdPath, erdContent, 'utf-8');
  }

  private buildERDContent(): string {
    const timestamp = new Date().toISOString();
    
    let content = `# Entity Relationship Diagram

*Generated on ${timestamp} from \`src/models/Schema.ts\`*

This document provides a detailed visual representation of the database schema relationships, showing how all entities connect and interact within the health and exercise management system.

## ERD Visualization

\`\`\`mermaid
erDiagram
`;

    // Generate entity definitions
    for (const [tableName, tableInfo] of this.tables) {
      content += `    ${tableInfo.name} {\n`;
      
      for (const column of tableInfo.columns) {
        const constraints = [];
        if (column.primaryKey) constraints.push('PK');
        if (column.unique) constraints.push('UK');
        if (!column.nullable) constraints.push('NOT NULL');
        
        let typeInfo = column.type;
        if (column.length) typeInfo += `(${column.length})`;
        if (column.precision && column.scale) typeInfo += `(${column.precision},${column.scale})`;
        
        const constraintStr = constraints.length > 0 ? ` ${constraints.join(' ')}` : '';
        const defaultStr = column.defaultValue ? ` "default ${column.defaultValue}"` : '';
        
        content += `        ${typeInfo} ${column.name}${constraintStr}${defaultStr}\n`;
      }
      
      content += `    }\n\n`;
    }

    // Generate relationships
    content += this.generateRelationships();

    content += `\`\`\`

## Relationship Cardinalities

`;

    content += this.generateRelationshipDocumentation();
    content += this.generateEnumDocumentation();
    content += this.generateIndexDocumentation();
    content += this.generateConstraintDocumentation();

    return content;
  }

  private generateRelationships(): string {
    let relationships = '';
    
    // Analyze foreign key relationships from schema
    for (const [tableName, tableInfo] of this.tables) {
      for (const column of tableInfo.columns) {
        if (column.name.endsWith('_id') || column.name.endsWith('Id')) {
          const referencedTable = this.inferReferencedTable(column.name);
          if (referencedTable && this.tables.has(referencedTable)) {
            const cardinality = column.nullable ? '||--o{' : '||--||';
            const description = this.generateRelationshipDescription(tableName, referencedTable, column.name);
            relationships += `    ${referencedTable} ${cardinality} ${tableName} : "${description}"\n`;
          }
        }
      }
    }

    return relationships;
  }

  private inferReferencedTable(columnName: string): string {
    // Remove _id or Id suffix and convert to table name
    let tableName = columnName.replace(/_id$|Id$/, '');
    
    // Handle special cases
    const specialCases: { [key: string]: string } = {
      'type': 'health_type',
      'trainingPlan': 'training_plan',
      'trainingSession': 'training_session',
      'primaryMuscleGroup': 'muscle_group'
    };

    if (specialCases[tableName]) {
      return specialCases[tableName];
    }

    // Convert camelCase to snake_case
    tableName = tableName.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (tableName.startsWith('_')) {
      tableName = tableName.substring(1);
    }

    return tableName;
  }

  private generateRelationshipDescription(fromTable: string, toTable: string, columnName: string): string {
    const descriptions: { [key: string]: string } = {
      'health_type_health_record': 'defines metric type',
      'health_type_health_goal': 'sets target for',
      'health_type_health_reminder': 'reminds about',
      'muscle_group_exercise': 'primary muscle target',
      'training_plan_training_session': 'contains sessions',
      'training_session_workout_exercise': 'includes exercises',
      'training_session_exercise_log': 'logs performance',
      'exercise_workout_exercise': 'prescribed in workout',
      'exercise_exercise_log': 'logged as performance'
    };

    const key = `${toTable}_${fromTable}`;
    return descriptions[key] || `references ${toTable}`;
  }

  private generateRelationshipDocumentation(): string {
    let content = `### One-to-Many Relationships

`;

    let relationshipCount = 1;
    for (const [tableName, tableInfo] of this.tables) {
      for (const column of tableInfo.columns) {
        if (column.name.endsWith('_id') || column.name.endsWith('Id')) {
          const referencedTable = this.inferReferencedTable(column.name);
          if (referencedTable && this.tables.has(referencedTable)) {
            content += `${relationshipCount}. **${referencedTable} → ${tableName}** (1:N)
   - **Cardinality**: One ${referencedTable.replace(/_/g, ' ')} can have many ${tableName.replace(/_/g, ' ')} records
   - **Foreign Key**: \`${tableName}.${column.name}\` → \`${referencedTable}.id\`
   - **Nullable**: ${column.nullable ? 'Yes (optional relationship)' : 'No (required relationship)'}

`;
            relationshipCount++;
          }
        }
      }
    }

    return content;
  }

  private generateEnumDocumentation(): string {
    let content = `## Enum Definitions

`;

    for (const [enumName, enumInfo] of this.enums) {
      content += `### ${enumName}
- **Values**: ${enumInfo.values.map(v => `\`${v}\``).join(', ')}
- **Used in**: ${enumInfo.usage.join(', ') || 'Not currently used'}

`;
    }

    return content;
  }

  private generateIndexDocumentation(): string {
    let content = `## Index Strategy

### Performance Indexes
`;

    for (const [tableName, tableInfo] of this.tables) {
      if (tableInfo.indexes.length > 0) {
        content += `- **${tableName}**: `;
        content += tableInfo.indexes.map(idx => `(${idx.columns.join(', ')})`).join(', ');
        content += '\n';
      }
    }

    content += `
### Index Rationale
- **User-based filtering**: Most common query pattern
- **Temporal queries**: Date-based filtering for analytics
- **Lookup optimization**: Foreign key relationships
- **Ordering**: Maintaining sequence and sort operations

`;

    return content;
  }

  private generateConstraintDocumentation(): string {
    let content = `## Data Integrity Rules

### Constraints by Table
`;

    for (const [tableName, tableInfo] of this.tables) {
      if (tableInfo.constraints.length > 0) {
        content += `#### ${tableName}
`;
        for (const constraint of tableInfo.constraints) {
          content += `- **${constraint.type.toUpperCase()}**: ${constraint.definition}\n`;
        }
        content += '\n';
      }
    }

    return content;
  }

  private async generateSchemaAnalysis(): Promise<void> {
    const analysisContent = this.buildSchemaAnalysisContent();
    const analysisPath = join(this.docsPath, 'database-schema-analysis.md');
    
    writeFileSync(analysisPath, analysisContent, 'utf-8');
  }

  private buildSchemaAnalysisContent(): string {
    const timestamp = new Date().toISOString();
    
    let content = `# Database Schema Analysis

*Generated on ${timestamp} from \`src/models/Schema.ts\`*

This document provides a comprehensive analysis of the database schema, including all entities, relationships, constraints, and business rules that form the foundation of this health and exercise management platform.

## Executive Summary

The system implements a comprehensive health and exercise management platform using PostgreSQL with Drizzle ORM. The schema supports multiple domains:

`;

    content += this.generateDomainSummary();
    content += this.generateTableInventory();
    content += this.generateBusinessRules();
    content += this.generateValidationRules();
    content += this.generateMigrationHistory();
    content += this.generatePerformanceAnalysis();

    return content;
  }

  private generateDomainSummary(): string {
    const domains = this.categorizeTables();
    
    let content = '';
    for (const [domain, tables] of domains) {
      content += `- **${domain}**: ${tables.length} tables (${tables.join(', ')})\n`;
    }
    
    content += `\n## Database Entities Overview

Total Tables: ${this.tables.size}
Total Enums: ${this.enums.size}
Total Migrations: ${this.migrations.length}

`;

    return content;
  }

  private categorizeTables(): Map<string, string[]> {
    const domains = new Map<string, string[]>();
    
    for (const [tableName] of this.tables) {
      let domain = 'General';
      
      if (tableName.startsWith('health_')) {
        domain = 'Health Management';
      } else if (tableName.includes('exercise') || tableName.includes('training') || tableName.includes('workout') || tableName.includes('muscle')) {
        domain = 'Exercise Management';
      } else if (tableName.startsWith('user_')) {
        domain = 'User Profile';
      } else if (tableName.includes('behavior') || tableName.includes('context') || tableName.includes('micro')) {
        domain = 'Behavioral Analytics';
      }
      
      if (!domains.has(domain)) {
        domains.set(domain, []);
      }
      domains.get(domain)!.push(tableName);
    }
    
    return domains;
  }

  private generateTableInventory(): string {
    let content = `### Table Inventory

`;

    const domains = this.categorizeTables();
    
    for (const [domain, tables] of domains) {
      content += `#### ${domain} Domain

`;
      
      for (const tableName of tables) {
        const tableInfo = this.tables.get(tableName);
        if (tableInfo) {
          content += `##### ${tableInfo.name}
- **Purpose**: ${this.getTablePurpose(tableName)}
- **Columns**: ${tableInfo.columns.length}
- **Indexes**: ${tableInfo.indexes.length}
- **Foreign Keys**: ${tableInfo.foreignKeys.length}
- **Key Fields**: ${this.getKeyFields(tableInfo)}

`;
        }
      }
    }

    return content;
  }

  private getTablePurpose(tableName: string): string {
    const purposes: { [key: string]: string } = {
      'health_type': 'Defines types of health metrics that can be tracked',
      'health_record': 'Stores individual health metric measurements',
      'health_goal': 'Defines user health targets and tracks progress',
      'health_reminder': 'Automated reminders for health metric tracking',
      'muscle_group': 'Defines muscle groups for exercise categorization',
      'exercise': 'Exercise library with detailed exercise information',
      'training_plan': 'User training programs with scheduling',
      'training_session': 'Individual workout sessions within training plans',
      'workout_exercise': 'Exercise prescriptions within training sessions',
      'exercise_log': 'Actual performance logging for exercises',
      'user_profile': 'Core user profile and fitness information',
      'user_fitness_goal': 'User-specific fitness goals and targets',
      'user_preference': 'User workout and system preferences',
      'user_constraint': 'User limitations and restrictions',
      'micro_behavior_pattern': 'Behavioral pattern analysis and tracking',
      'context_pattern': 'Environmental and situational context tracking',
      'behavioral_event': 'User interaction and behavior event logging',
      'counter': 'General-purpose application counters'
    };

    return purposes[tableName] || 'Application data storage';
  }

  private getKeyFields(tableInfo: TableInfo): string {
    const keyFields = tableInfo.columns
      .filter(col => col.primaryKey || col.unique || col.name.includes('id') || col.name.includes('name'))
      .slice(0, 3)
      .map(col => `\`${col.name}\``)
      .join(', ');
    
    return keyFields || 'Standard fields';
  }

  private generateBusinessRules(): string {
    let content = `## Business Rules and Constraints

### Schema-Level Constraints
`;

    const constraints = this.extractBusinessRules();
    
    for (const [category, rules] of constraints) {
      content += `#### ${category}
`;
      for (const rule of rules) {
        content += `- ${rule}\n`;
      }
      content += '\n';
    }

    return content;
  }

  private extractBusinessRules(): Map<string, string[]> {
    const rules = new Map<string, string[]>();
    
    // Analyze constraints across all tables
    for (const [tableName, tableInfo] of this.tables) {
      for (const column of tableInfo.columns) {
        // Primary key rules
        if (column.primaryKey) {
          this.addRule(rules, 'Primary Keys', `${tableName}.${column.name} serves as unique identifier`);
        }
        
        // Nullable rules
        if (!column.nullable) {
          this.addRule(rules, 'Required Fields', `${tableName}.${column.name} is mandatory`);
        }
        
        // Default value rules
        if (column.defaultValue) {
          this.addRule(rules, 'Default Values', `${tableName}.${column.name} defaults to ${column.defaultValue}`);
        }
        
        // Type-specific rules
        if (column.type === 'timestamp' && column.name.includes('created_at')) {
          this.addRule(rules, 'Audit Trail', `${tableName} tracks creation timestamp`);
        }
        
        if (column.type === 'timestamp' && column.name.includes('updated_at')) {
          this.addRule(rules, 'Audit Trail', `${tableName} tracks modification timestamp`);
        }
      }
    }

    return rules;
  }

  private addRule(rules: Map<string, string[]>, category: string, rule: string): void {
    if (!rules.has(category)) {
      rules.set(category, []);
    }
    rules.get(category)!.push(rule);
  }

  private generateValidationRules(): string {
    let content = `## Data Validation Rules

### Field-Level Validation
`;

    for (const [tableName, tableInfo] of this.tables) {
      const validationRules = this.extractValidationRules(tableInfo);
      if (validationRules.length > 0) {
        content += `#### ${tableName}
`;
        for (const rule of validationRules) {
          content += `- ${rule}\n`;
        }
        content += '\n';
      }
    }

    return content;
  }

  private extractValidationRules(tableInfo: TableInfo): string[] {
    const rules: string[] = [];
    
    for (const column of tableInfo.columns) {
      if (column.length) {
        rules.push(`${column.name}: Maximum length ${column.length} characters`);
      }
      
      if (column.precision && column.scale) {
        rules.push(`${column.name}: Precision ${column.precision}, Scale ${column.scale}`);
      }
      
      if (column.type.includes('Enum')) {
        const enumInfo = this.enums.get(column.type);
        if (enumInfo) {
          rules.push(`${column.name}: Must be one of [${enumInfo.values.join(', ')}]`);
        }
      }
      
      if (column.name.includes('email')) {
        rules.push(`${column.name}: Must be valid email format`);
      }
      
      if (column.name.includes('url')) {
        rules.push(`${column.name}: Must be valid URL format`);
      }
    }
    
    return rules;
  }

  private generateMigrationHistory(): string {
    let content = `## Migration History

Total Migrations: ${this.migrations.length}

`;

    if (this.migrations.length > 0) {
      content += `### Migration Timeline

| Timestamp | File | Description | Operations | Size |
|-----------|------|-------------|------------|------|
`;

      for (const migration of this.migrations) {
        content += `| ${migration.timestamp} | \`${migration.filename}\` | ${migration.description} | ${migration.operations.length} | ${this.formatBytes(migration.size)} |\n`;
      }

      content += `
### Recent Migration Operations

`;

      const recentMigrations = this.migrations.slice(-3);
      for (const migration of recentMigrations) {
        content += `#### ${migration.filename}
`;
        if (migration.operations.length > 0) {
          for (const operation of migration.operations.slice(0, 5)) {
            content += `- \`${operation.substring(0, 100)}${operation.length > 100 ? '...' : ''}\`\n`;
          }
        } else {
          content += '- No operations detected\n';
        }
        content += '\n';
      }
    } else {
      content += 'No migrations found in the migrations directory.\n\n';
    }

    return content;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private generatePerformanceAnalysis(): string {
    let content = `## Performance Analysis

### Index Coverage
`;

    let totalTables = this.tables.size;
    let indexedTables = 0;
    let totalIndexes = 0;

    for (const [tableName, tableInfo] of this.tables) {
      if (tableInfo.indexes.length > 0) {
        indexedTables++;
      }
      totalIndexes += tableInfo.indexes.length;
    }

    content += `- **Tables with indexes**: ${indexedTables}/${totalTables} (${Math.round(indexedTables/totalTables*100)}%)
- **Total indexes**: ${totalIndexes}
- **Average indexes per table**: ${(totalIndexes/totalTables).toFixed(1)}

### Query Optimization Recommendations
`;

    // Analyze potential performance issues
    const recommendations = this.generatePerformanceRecommendations();
    for (const recommendation of recommendations) {
      content += `- ${recommendation}\n`;
    }

    content += `
### Schema Complexity Metrics
- **Total columns**: ${Array.from(this.tables.values()).reduce((sum, table) => sum + table.columns.length, 0)}
- **Foreign key relationships**: ${Array.from(this.tables.values()).reduce((sum, table) => sum + table.foreignKeys.length, 0)}
- **Enum types**: ${this.enums.size}
- **Tables with user_id**: ${Array.from(this.tables.values()).filter(table => table.columns.some(col => col.name === 'user_id')).length}

`;

    return content;
  }

  private generatePerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Check for tables without indexes
    for (const [tableName, tableInfo] of this.tables) {
      if (tableInfo.indexes.length === 0 && tableInfo.columns.length > 3) {
        recommendations.push(`Consider adding indexes to ${tableName} for better query performance`);
      }
      
      // Check for user_id columns without indexes
      const hasUserId = tableInfo.columns.some(col => col.name === 'user_id');
      const hasUserIdIndex = tableInfo.indexes.some(idx => idx.columns.includes('user_id'));
      if (hasUserId && !hasUserIdIndex) {
        recommendations.push(`Add index on user_id for ${tableName} to optimize user-specific queries`);
      }
      
      // Check for timestamp columns without indexes
      const timestampColumns = tableInfo.columns.filter(col => col.type === 'timestamp' && !col.name.includes('created_at') && !col.name.includes('updated_at'));
      for (const col of timestampColumns) {
        const hasTimestampIndex = tableInfo.indexes.some(idx => idx.columns.includes(col.name));
        if (!hasTimestampIndex) {
          recommendations.push(`Consider indexing ${tableName}.${col.name} for temporal queries`);
        }
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Schema appears well-optimized with appropriate indexing strategy');
    }
    
    return recommendations;
  }
}

// Main execution
async function main() {
  try {
    const generator = new DatabaseDocumentationGenerator();
    await generator.generate();
  } catch (error) {
    console.error('❌ Failed to generate database documentation:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DatabaseDocumentationGenerator };