#!/usr/bin/env node

/**
 * OpenAPI Mock Server for Health Management APIs
 * 
 * This script starts a Prism mock server that serves realistic health data
 * based on the OpenAPI specification. It's designed to run on a different
 * port from the main application to support frontend development.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const MOCK_SERVER_PORT = 4010;
const OPENAPI_SPEC_PATH = resolve(__dirname, '../../openapi/health.yaml');
const FALLBACK_SPEC_PATH = resolve(__dirname, './health-spec-fallback.yaml');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Log messages with colors
 */
function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create a fallback OpenAPI specification if the main one doesn't exist
 */
function createFallbackSpec(): string {
  const fallbackSpec = `openapi: 3.0.0
info:
  title: Health Management API (Mock)
  version: 1.0.0
  description: Mock API for health management features during development
servers:
  - url: http://localhost:${MOCK_SERVER_PORT}
    description: Mock server
paths:
  /api/health/records:
    get:
      summary: Get health records
      parameters:
        - name: type_id
          in: query
          schema:
            type: integer
        - name: start_date
          in: query
          schema:
            type: string
            format: date
        - name: end_date
          in: query
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Health records retrieved successfully
          content:
            application/json:
              example:
                data:
                  - id: 1
                    user_id: "user_123"
                    type_id: 1
                    value: 70.5
                    unit: "kg"
                    recorded_at: "2024-01-15T10:30:00Z"
                    created_at: "2024-01-15T10:30:00Z"
                    updated_at: "2024-01-15T10:30:00Z"
                  - id: 2
                    user_id: "user_123"
                    type_id: 2
                    value: 120
                    unit: "mmHg"
                    recorded_at: "2024-01-15T09:00:00Z"
                    created_at: "2024-01-15T09:00:00Z"
                    updated_at: "2024-01-15T09:00:00Z"
                pagination:
                  page: 1
                  limit: 20
                  total: 2
    post:
      summary: Create health record
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                type_id:
                  type: integer
                value:
                  type: number
                unit:
                  type: string
                recorded_at:
                  type: string
                  format: date-time
      responses:
        '201':
          description: Health record created successfully
          content:
            application/json:
              example:
                data:
                  id: 3
                  user_id: "user_123"
                  type_id: 1
                  value: 71.2
                  unit: "kg"
                  recorded_at: "2024-01-16T08:00:00Z"
                  created_at: "2024-01-16T08:00:00Z"
                  updated_at: "2024-01-16T08:00:00Z"
  /api/health/analytics/{type}:
    get:
      summary: Get health analytics
      parameters:
        - name: type
          in: path
          required: true
          schema:
            type: string
        - name: start_date
          in: query
          schema:
            type: string
            format: date
        - name: end_date
          in: query
          schema:
            type: string
            format: date
        - name: aggregation
          in: query
          schema:
            type: string
            enum: [daily, weekly, monthly]
      responses:
        '200':
          description: Analytics data retrieved successfully
          content:
            application/json:
              example:
                data:
                  - date: "2024-01-15"
                    value: 70.5
                    count: 1
                  - date: "2024-01-16"
                    value: 71.2
                    count: 1
                stats:
                  average: 70.85
                  min: 70.5
                  max: 71.2
                  trend: "increasing"
  /api/health/goals:
    get:
      summary: Get health goals
      responses:
        '200':
          description: Health goals retrieved successfully
          content:
            application/json:
              example:
                data:
                  - id: 1
                    user_id: "user_123"
                    type_id: 1
                    target_value: 68
                    target_date: "2024-06-01"
                    status: "active"
                    progress: 65.2
                    created_at: "2024-01-01T00:00:00Z"
                    updated_at: "2024-01-15T10:30:00Z"
                  - id: 2
                    user_id: "user_123"
                    type_id: 3
                    target_value: 10000
                    target_date: "2024-12-31"
                    status: "active"
                    progress: 78.5
                    created_at: "2024-01-01T00:00:00Z"
                    updated_at: "2024-01-15T10:30:00Z"
    post:
      summary: Create health goal
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                type_id:
                  type: integer
                target_value:
                  type: number
                target_date:
                  type: string
                  format: date
      responses:
        '201':
          description: Health goal created successfully
          content:
            application/json:
              example:
                data:
                  id: 3
                  user_id: "user_123"
                  type_id: 2
                  target_value: 110
                  target_date: "2024-08-01"
                  status: "active"
                  progress: 0
                  created_at: "2024-01-16T08:00:00Z"
                  updated_at: "2024-01-16T08:00:00Z"
  /api/health/reminders:
    get:
      summary: Get health reminders
      responses:
        '200':
          description: Health reminders retrieved successfully
          content:
            application/json:
              example:
                data:
                  - id: 1
                    user_id: "user_123"
                    type_id: 1
                    cron_expr: "0 8 * * *"
                    message: "Time to log your weight!"
                    active: true
                    next_run_at: "2024-01-17T08:00:00Z"
                    created_at: "2024-01-01T00:00:00Z"
                    updated_at: "2024-01-15T10:30:00Z"
                  - id: 2
                    user_id: "user_123"
                    type_id: 2
                    cron_expr: "0 9,21 * * *"
                    message: "Don't forget to check your blood pressure"
                    active: true
                    next_run_at: "2024-01-16T21:00:00Z"
                    created_at: "2024-01-01T00:00:00Z"
                    updated_at: "2024-01-15T10:30:00Z"
    post:
      summary: Create health reminder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                type_id:
                  type: integer
                cron_expr:
                  type: string
                message:
                  type: string
                active:
                  type: boolean
      responses:
        '201':
          description: Health reminder created successfully
          content:
            application/json:
              example:
                data:
                  id: 3
                  user_id: "user_123"
                  type_id: 3
                  cron_expr: "0 20 * * *"
                  message: "Time to log your daily steps!"
                  active: true
                  next_run_at: "2024-01-16T20:00:00Z"
                  created_at: "2024-01-16T08:00:00Z"
                  updated_at: "2024-01-16T08:00:00Z"
  /api/health/types:
    get:
      summary: Get health types
      responses:
        '200':
          description: Health types retrieved successfully
          content:
            application/json:
              example:
                data:
                  - id: 1
                    slug: "weight"
                    display_name: "Weight"
                    unit: "kg"
                    typical_range_low: 40
                    typical_range_high: 150
                    created_at: "2024-01-01T00:00:00Z"
                    updated_at: "2024-01-01T00:00:00Z"
                  - id: 2
                    slug: "blood_pressure_systolic"
                    display_name: "Blood Pressure (Systolic)"
                    unit: "mmHg"
                    typical_range_low: 90
                    typical_range_high: 140
                    created_at: "2024-01-01T00:00:00Z"
                    updated_at: "2024-01-01T00:00:00Z"
                  - id: 3
                    slug: "steps"
                    display_name: "Daily Steps"
                    unit: "steps"
                    typical_range_low: 1000
                    typical_range_high: 20000
                    created_at: "2024-01-01T00:00:00Z"
                    updated_at: "2024-01-01T00:00:00Z"
components:
  schemas:
    Error:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
        details:
          type: object
  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "VALIDATION_ERROR"
            message: "Invalid request data"
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "UNAUTHORIZED"
            message: "Authentication required"
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "NOT_FOUND"
            message: "Resource not found"
`;

  return fallbackSpec;
}

/**
 * Write fallback specification to file
 */
function writeFallbackSpec(): void {
  const fs = require('fs');
  const path = require('path');
  
  const fallbackDir = path.dirname(FALLBACK_SPEC_PATH);
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
  
  fs.writeFileSync(FALLBACK_SPEC_PATH, createFallbackSpec());
  log(`Created fallback OpenAPI spec at: ${FALLBACK_SPEC_PATH}`, 'yellow');
}

/**
 * Start the Prism mock server
 */
function startMockServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Determine which spec file to use
    let specPath = OPENAPI_SPEC_PATH;
    
    if (!existsSync(OPENAPI_SPEC_PATH)) {
      log(`OpenAPI spec not found at: ${OPENAPI_SPEC_PATH}`, 'yellow');
      log('Creating fallback specification...', 'yellow');
      writeFallbackSpec();
      specPath = FALLBACK_SPEC_PATH;
    }

    log(`Starting Prism mock server...`, 'cyan');
    log(`OpenAPI Spec: ${specPath}`, 'blue');
    log(`Port: ${MOCK_SERVER_PORT}`, 'blue');

    // Prism CLI arguments
    const prismArgs = [
      'mock',
      specPath,
      '--port', MOCK_SERVER_PORT.toString(),
      '--dynamic', // Enable dynamic mock data generation
      '--cors', // Enable CORS for frontend development
      '--verbose', // Verbose logging
    ];

    // Start Prism process
    const prismProcess = spawn('npx', ['@stoplight/prism-cli', ...prismArgs], {
      stdio: 'inherit',
      shell: true,
    });

    // Handle process events
    prismProcess.on('spawn', () => {
      log(`✅ Mock server started successfully!`, 'green');
      log(`🌐 Server URL: http://localhost:${MOCK_SERVER_PORT}`, 'bright');
      log(`📚 Available endpoints:`, 'bright');
      log(`   GET  /api/health/records`, 'cyan');
      log(`   POST /api/health/records`, 'cyan');
      log(`   GET  /api/health/analytics/{type}`, 'cyan');
      log(`   GET  /api/health/goals`, 'cyan');
      log(`   POST /api/health/goals`, 'cyan');
      log(`   GET  /api/health/reminders`, 'cyan');
      log(`   POST /api/health/reminders`, 'cyan');
      log(`   GET  /api/health/types`, 'cyan');
      log(``, 'reset');
      log(`💡 Tip: Use dynamic=true for randomized data based on schema`, 'yellow');
      log(`🛑 Press Ctrl+C to stop the server`, 'yellow');
      resolve();
    });

    prismProcess.on('error', (error) => {
      log(`❌ Failed to start mock server: ${error.message}`, 'red');
      reject(error);
    });

    prismProcess.on('exit', (code) => {
      if (code !== 0) {
        log(`❌ Mock server exited with code ${code}`, 'red');
        reject(new Error(`Process exited with code ${code}`));
      } else {
        log(`👋 Mock server stopped`, 'yellow');
        resolve();
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log(`\n🛑 Shutting down mock server...`, 'yellow');
      prismProcess.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      log(`\n🛑 Shutting down mock server...`, 'yellow');
      prismProcess.kill('SIGTERM');
    });
  });
}

/**
 * Check if Prism CLI is available
 */
function checkPrismAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    const checkProcess = spawn('npx', ['@stoplight/prism-cli', '--version'], {
      stdio: 'pipe',
      shell: true,
    });

    checkProcess.on('close', (code) => {
      resolve(code === 0);
    });

    checkProcess.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    log(`🚀 Health Management API Mock Server`, 'bright');
    log(`=====================================`, 'bright');

    // Check if Prism CLI is available
    const prismAvailable = await checkPrismAvailability();
    if (!prismAvailable) {
      log(`❌ Prism CLI not found. Installing...`, 'red');
      log(`💡 Run: npm install --save-dev @stoplight/prism-cli`, 'yellow');
      process.exit(1);
    }

    // Start the mock server
    await startMockServer();
  } catch (error) {
    log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { startMockServer, MOCK_SERVER_PORT, OPENAPI_SPEC_PATH };