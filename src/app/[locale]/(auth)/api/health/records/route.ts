import type { NextRequest } from 'next/server';
import arcjet, { tokenBucket } from '@arcjet/next';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
// Debug: Let's import the entire schema module to see what's available
import * as SchemaModule from '@/models/Schema';
import { BehaviorEventService } from '@/services/behavior/BehaviorEventService';
import {
  HealthRecordQueryValidation,
  HealthRecordUpdateValidation,
  HealthRecordValidation,
} from '@/validations/HealthRecordValidation';

// Debug helper functions
const isDebugEnabled = () => process.env.DEBUG_DRIZZLE === 'on';

const debugLog = (...args: any[]) => {
  if (isDebugEnabled()) {
    console.log('🔍 [DRIZZLE DEBUG]', ...args);
  }
};

const criticalLog = (...args: any[]) => {
  console.error('💥 [DRIZZLE CRITICAL]', ...args);
};

// Arcjet rate limiting configuration
const aj = arcjet({
  key: Env.ARCJET_KEY!,
  rules: [
    tokenBucket({
      mode: 'LIVE',
      characteristics: ['userId'],
      refillRate: 10,
      interval: 60,
      capacity: 20,
    }),
  ],
});

// Feature flag check
const checkHealthFeatureFlag = () => {
  if (!Env.ENABLE_HEALTH_MGMT) {
    return NextResponse.json(
      { error: 'Health management feature is not enabled' },
      { status: 503 },
    );
  }
  return null;
};

// Helper function to track behavioral events safely
const trackBehaviorEvent = async (
  userId: string,
  eventName: string,
  entityType: 'health_record' | 'ui_interaction',
  entityId?: number,
  context?: any,
) => {
  if (!Env.ENABLE_BEHAVIOR_TRACKING) {
    return;
  }

  try {
    await BehaviorEventService.trackEvent(
      userId,
      eventName,
      entityType,
      entityId,
      context,
    );
  } catch (error) {
    // Log the error but don't let tracking failures affect the main operation
    logger.warn('Failed to track behavioral event', {
      userId,
      eventName,
      entityType,
      entityId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Authentication helper
const getCurrentUserId = async () => {
  const user = await currentUser();
  if (!user) {
    return null;
  }
  return user.id;
};

// GET - List user's health records with filtering
export const GET = async (request: NextRequest) => {
  debugLog('🔍 GET /api/health/records started');
  
  // Check feature flag
  const featureCheck = checkHealthFeatureFlag();
  if (featureCheck) {
    return featureCheck;
  }

  // Check authentication
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Apply rate limiting
  const decision = await aj.protect(request, { userId, requested: 1 });
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 },
    );
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      type_id: searchParams.get('type_id'),
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    debugLog('Query parameters:', queryData);

    const parse = HealthRecordQueryValidation.safeParse(queryData);
    if (!parse.success) {
      debugLog('Validation failed:', parse.error);
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const { type_id, start_date, end_date, limit, offset } = parse.data;

    // Build query conditions
    const conditions = [eq(SchemaModule.healthRecordSchema.userId, userId)];

    if (type_id) {
      conditions.push(eq(SchemaModule.healthRecordSchema.typeId, type_id));
    }

    if (start_date) {
      conditions.push(gte(SchemaModule.healthRecordSchema.recordedAt, start_date));
    }

    if (end_date) {
      conditions.push(lte(SchemaModule.healthRecordSchema.recordedAt, end_date));
    }

    debugLog('Query conditions built:', conditions.length, 'conditions');
    debugLog('About to execute SELECT query...');

    // Execute query
    const records = await db
      .select()
      .from(SchemaModule.healthRecordSchema)
      .where(and(...conditions))
      .orderBy(desc(SchemaModule.healthRecordSchema.recordedAt))
      .limit(limit)
      .offset(offset);

    debugLog('SELECT query executed successfully, records found:', records.length);

    // Get total count for pagination
    debugLog('About to execute COUNT query...');
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(SchemaModule.healthRecordSchema)
      .where(and(...conditions));

    debugLog('COUNT query executed successfully, total:', totalCount[0]?.count);

    logger.info('Health records retrieved', {
      userId,
      count: records.length,
      filters: { type_id, start_date, end_date },
    });

    // Track behavioral event for health records query
    await trackBehaviorEvent(
      userId,
      'health_records_queried',
      'ui_interaction',
      undefined,
      {
        custom: {
          filters: { type_id, start_date, end_date },
          resultCount: records.length,
          totalCount: totalCount[0]?.count || 0,
          pagination: { limit, offset },
        },
        environment: {
          endpoint: '/api/health/records',
          method: 'GET',
        },
      },
    );

    debugLog('GET /api/health/records completed successfully');

    return NextResponse.json({
      records,
      pagination: {
        total: totalCount[0]?.count || 0,
        limit,
        offset,
        hasMore: (totalCount[0]?.count || 0) > offset + limit,
      },
    });
  } catch (error) {
    criticalLog('Error in GET /api/health/records:');
    criticalLog('Error name:', error?.name);
    criticalLog('Error message:', error?.message);
    criticalLog('Error stack:', error?.stack);
    
    if (error?.code) criticalLog('Database error code:', error.code);
    if (error?.constraint) criticalLog('Constraint violation:', error.constraint);
    if (error?.detail) criticalLog('Error detail:', error.detail);

    logger.error('Error retrieving health records', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// POST - Create new health record
export const POST = async (request: NextRequest) => {
  const debugEnabled = isDebugEnabled();
  
  if (debugEnabled) {
    console.log('🚀 === POST /api/health/records START ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🔧 DEBUG_DRIZZLE is enabled - full logging active');
  }

  try {
    // Step 1: Check feature flag
    if (debugEnabled) {
      console.log('🚩 Step 1: Checking feature flag...');
    }
    const featureCheck = checkHealthFeatureFlag();
    if (featureCheck) {
      if (debugEnabled) {
        console.log('❌ Feature flag check failed - health mgmt disabled');
      }
      return featureCheck;
    }
    if (debugEnabled) {
      console.log('✅ Feature flag check passed');
    }

    // Step 2: Check authentication
    if (debugEnabled) {
      console.log('🔐 Step 2: Checking authentication...');
    }
    const userId = await getCurrentUserId();
    if (debugEnabled) {
      console.log('👤 User ID from Clerk:', userId);
    }
    
    if (!userId) {
      if (debugEnabled) {
        console.log('❌ Authentication failed - no user ID');
      }
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }
    if (debugEnabled) {
      console.log('✅ Authentication successful');
    }

    // Step 3: Apply rate limiting
    if (debugEnabled) {
      console.log('⚡ Step 3: Applying rate limiting...');
    }
    const decision = await aj.protect(request, { userId, requested: 1 });
    if (decision.isDenied()) {
      if (debugEnabled) {
        console.log('❌ Rate limit exceeded');
      }
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 },
      );
    }
    if (debugEnabled) {
      console.log('✅ Rate limiting passed');
    }

    // Step 4: Parse request JSON
    if (debugEnabled) {
      console.log('📦 Step 4: Parsing request JSON...');
    }
    let json;
    try {
      json = await request.json();
      if (debugEnabled) {
        console.log('📋 Raw request body:', JSON.stringify(json, null, 2));
        console.log('📊 Body type:', typeof json);
        console.log('📏 Body keys:', Object.keys(json || {}));
      }
    } catch (parseError) {
      criticalLog('JSON parsing failed:', parseError);
      logger.error('JSON parsing error', { error: parseError, userId });
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 },
      );
    }
    if (debugEnabled) {
      console.log('✅ JSON parsing successful');
    }

    // Step 5: Validate request data
    if (debugEnabled) {
      console.log('🔍 Step 5: Validating request data...');
      console.log('🧪 Attempting Zod validation with HealthRecordValidation schema...');
    }
    
    const parse = HealthRecordValidation.safeParse(json);
    
    if (!parse.success) {
      criticalLog('Validation failed:', parse.error);
      if (debugEnabled) {
        console.error('📋 Validation errors:', JSON.stringify(parse.error.errors, null, 2));
      }
      logger.error('Validation error', { 
        error: parse.error, 
        requestData: json, 
        userId 
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }
    
    const { type_id, value, unit, recorded_at } = parse.data;
    if (debugEnabled) {
      console.log('✅ Validation successful');
      console.log('📊 Validated data:', {
        type_id,
        value,
        unit,
        recorded_at: recorded_at?.toISOString(),
      });
    }

    // Step 6: Prepare database insertion
    if (debugEnabled) {
      console.log('🗄️ Step 6: Preparing database insertion...');
      console.log('🔍 Validated data received:');
      console.log('   - type_id:', type_id, '(type:', typeof type_id, ')');
      console.log('   - value:', value, '(type:', typeof value, ')');
      console.log('   - unit:', unit, '(type:', typeof unit, ')');
      console.log('   - recorded_at:', recorded_at, '(type:', typeof recorded_at, ')');
    }
    
    const insertData = {
      userId: userId,
      typeId: type_id,
      value: value.toString(),
      unit: unit,  // Unit is required by schema and validation
      recordedAt: recorded_at,
    };
    
    if (debugEnabled) {
      console.log('💾 Final data to insert:', JSON.stringify({
        userId: insertData.userId,
        typeId: insertData.typeId,
        value: insertData.value,
        unit: insertData.unit,
        recordedAt: insertData.recordedAt?.toISOString(),
      }, null, 2));
    }

    // Step 7: Test database connection
    if (debugEnabled) {
      console.log('🔗 Step 7: Testing database connection...');
    }
    try {
      await db.execute(sql`SELECT 1 as connection_test`);
      if (debugEnabled) {
        console.log('✅ Database connection confirmed');
      }
    } catch (dbConnectionError) {
      criticalLog('Database connection failed:', dbConnectionError);
      logger.error('Database connection error', { error: dbConnectionError, userId });
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 },
      );
    }

    // Step 8: Verify schema availability
    if (debugEnabled) {
      console.log('📋 Step 8: Verifying schema availability...');
      console.log('🔍 Available exports in Schema module:', Object.keys(SchemaModule));
    }
    
    // Try to get healthRecordSchema from different possible names
    const healthRecordSchema = SchemaModule.healthRecordSchema || 
                              SchemaModule.healthRecords || 
                              SchemaModule.health_records ||
                              SchemaModule.HealthRecord ||
                              SchemaModule.HealthRecords;
    
    if (debugEnabled) {
      console.log('🗂️ healthRecordSchema found:', !!healthRecordSchema);
      console.log('🗂️ healthRecordSchema type:', typeof healthRecordSchema);
      
      if (healthRecordSchema) {
        console.log('🗂️ healthRecordSchema keys:', Object.keys(healthRecordSchema));
        
        // Try to inspect the columns of the table
        if (healthRecordSchema && typeof healthRecordSchema === 'object') {
          console.log('📋 Table columns:', Object.keys(healthRecordSchema));
          
          // Log available schema properties (excluding functions)
          Object.entries(healthRecordSchema).forEach(([key, value]) => {
            if (typeof value !== 'function') {
              console.log(`   - ${key}:`, typeof value);
            }
          });
        }
        
        // Safe check for schema table name
        try {
          const tableName = healthRecordSchema?.[Symbol.toStringTag] || 
                           (healthRecordSchema?.[Symbol.toPrimitive] ? healthRecordSchema[Symbol.toPrimitive]('string') : undefined) ||
                           healthRecordSchema?.name || 
                           'unknown';
          console.log('🏷️ Schema table name:', tableName);
        } catch (nameError) {
          console.log('⚠️ Could not determine schema table name:', nameError.message);
        }
      }
    }
    
    // Verify schema structure
    if (!healthRecordSchema) {
      criticalLog('healthRecordSchema not found in any expected export names!');
      criticalLog('Available exports:', Object.keys(SchemaModule));
      criticalLog('Check your Schema.ts file and make sure the health record table is properly exported');
      return NextResponse.json(
        { error: 'Database schema not found' },
        { status: 500 }
      );
    }

    // Step 9: Execute database insertion
    if (debugEnabled) {
      console.log('💾 Step 9: Executing database insertion...');
      console.log('🎯 About to execute INSERT query with Drizzle...');
    }
    
    debugLog('Executing INSERT with data:', insertData);
    
    const newRecord = await db
      .insert(healthRecordSchema)
      .values(insertData)
      .returning();

    if (debugEnabled) {
      console.log('✅ Database insertion successful!');
      console.log('📋 New record created:', JSON.stringify({
        ...newRecord[0],
        recordedAt: newRecord[0]?.recordedAt?.toISOString(),
      }, null, 2));
    }

    logger.info('Health record created', {
      userId,
      recordId: newRecord[0]?.id,
      typeId: type_id,
      value,
      unit,
    });

    // Step 10: Track behavioral event
    if (debugEnabled) {
      console.log('📊 Step 10: Tracking behavioral event...');
    }
    try {
      await trackBehaviorEvent(
        userId,
        'health_record_created',
        'health_record',
        newRecord[0]?.id,
        {
          custom: {
            typeId: type_id,
            value,
            unit,
            recordedAt: recorded_at,
            operationSuccess: true,
          },
          environment: {
            endpoint: '/api/health/records',
            method: 'POST',
          },
        },
      );
      if (debugEnabled) {
        console.log('✅ Behavioral event tracked successfully');
      }
    } catch (trackingError) {
      if (debugEnabled) {
        console.error('⚠️ Behavioral event tracking failed (non-critical):', trackingError);
      }
    }

    if (debugEnabled) {
      console.log('🎉 Health record creation completed successfully');
    }
    
    return NextResponse.json({
      record: newRecord[0],
      message: 'Health record created successfully',
    }, { status: 201 });

  } catch (error) {
    criticalLog('=== CRITICAL ERROR OCCURRED ===');
    criticalLog('Error name:', error?.name);
    criticalLog('Error message:', error?.message);
    criticalLog('Error stack:', error?.stack);
    
    // Additional database-specific error info
    if (error?.code) {
      criticalLog('Database error code:', error.code);
    }
    if (error?.constraint) {
      criticalLog('Constraint violation:', error.constraint);
    }
    if (error?.detail) {
      criticalLog('Error detail:', error.detail);
    }
    if (error?.position) {
      criticalLog('Error position:', error.position);
    }
    if (error?.table) {
      criticalLog('Error table:', error.table);
    }
    if (error?.column) {
      criticalLog('Error column:', error.column);
    }

    // Check error type
    if (error?.message?.includes('relation') || error?.message?.includes('column')) {
      criticalLog('This appears to be a database schema error');
    }
    if (error?.message?.includes('constraint')) {
      criticalLog('This appears to be a constraint violation');
    }
    if (error?.message?.includes('syntax')) {
      criticalLog('This appears to be a SQL syntax error');
    }

    criticalLog('=== END CRITICAL ERROR ===');

    logger.error('Error creating health record', { error, userId: await getCurrentUserId() });

    // Track behavioral event for failed health record creation
    const currentUserId = await getCurrentUserId();
    if (currentUserId) {
      await trackBehaviorEvent(
        currentUserId,
        'health_record_created',
        'ui_interaction',
        undefined,
        {
          custom: {
            operationSuccess: false,
            errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
          environment: {
            endpoint: '/api/health/records',
            method: 'POST',
          },
        },
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { 
          debug: {
            message: error?.message,
            name: error?.name,
            code: error?.code,
            constraint: error?.constraint,
          }
        })
      },
      { status: 500 },
    );
  } finally {
    if (isDebugEnabled()) {
      console.log('🏁 === POST /api/health/records END ===\n');
    }
  }
};

// PUT - Update existing health record
export const PUT = async (request: NextRequest) => {
  debugLog('PUT /api/health/records started');
  
  // Check feature flag
  const featureCheck = checkHealthFeatureFlag();
  if (featureCheck) {
    return featureCheck;
  }

  // Check authentication
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Apply rate limiting
  const decision = await aj.protect(request, { userId, requested: 1 });
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 },
    );
  }

  try {
    const json = await request.json();
    debugLog('PUT request data:', json);
    
    const parse = HealthRecordUpdateValidation.safeParse(json);

    if (!parse.success) {
      debugLog('PUT validation failed:', parse.error);
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const { id, type_id, value, unit, recorded_at } = parse.data;

    debugLog('About to check existing record with ID:', id);

    // Check if record exists and belongs to user
    const existingRecord = await db
      .select()
      .from(SchemaModule.healthRecordSchema)
      .where(
        and(
          eq(SchemaModule.healthRecordSchema.id, id),
          eq(SchemaModule.healthRecordSchema.userId, userId),
        ),
      );

    debugLog('Existing record query completed, found:', existingRecord.length, 'records');

    if (existingRecord.length === 0) {
      return NextResponse.json(
        { error: 'Health record not found or access denied' },
        { status: 404 },
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (type_id !== undefined) {
      updateData.typeId = type_id;
    }
    if (value !== undefined) {
      updateData.value = value.toString();
    }
    if (unit !== undefined) {
      updateData.unit = unit;
    }
    if (recorded_at !== undefined) {
      updateData.recordedAt = recorded_at;
    }

    debugLog('About to execute UPDATE with data:', updateData);

    // Update health record
    const updatedRecord = await db
      .update(SchemaModule.healthRecordSchema)
      .set(updateData)
      .where(
        and(
          eq(SchemaModule.healthRecordSchema.id, id),
          eq(SchemaModule.healthRecordSchema.userId, userId),
        ),
      )
      .returning();

    debugLog('UPDATE query executed successfully');

    logger.info('Health record updated', {
      userId,
      recordId: id,
      updatedFields: Object.keys(updateData),
    });

    // Track behavioral event for health record update
    await trackBehaviorEvent(
      userId,
      'health_record_updated',
      'health_record',
      id,
      {
        custom: {
          updatedFields: Object.keys(updateData),
          changeContext: {
            before: {
              typeId: existingRecord[0]?.typeId,
              value: existingRecord[0]?.value,
              unit: existingRecord[0]?.unit,
              recordedAt: existingRecord[0]?.recordedAt,
            },
            after: updateData,
          },
          operationSuccess: true,
        },
        environment: {
          endpoint: '/api/health/records',
          method: 'PUT',
        },
      },
    );

    debugLog('PUT /api/health/records completed successfully');

    return NextResponse.json({
      record: updatedRecord[0],
      message: 'Health record updated successfully',
    });
  } catch (error) {
    criticalLog('Error in PUT /api/health/records:');
    criticalLog('Error name:', error?.name);
    criticalLog('Error message:', error?.message);
    criticalLog('Error stack:', error?.stack);
    
    if (error?.code) criticalLog('Database error code:', error.code);
    if (error?.constraint) criticalLog('Constraint violation:', error.constraint);
    if (error?.detail) criticalLog('Error detail:', error.detail);

    logger.error('Error updating health record', { error, userId });

    // Track behavioral event for failed health record update
    await trackBehaviorEvent(
      userId,
      'health_record_updated',
      'ui_interaction',
      undefined,
      {
        custom: {
          operationSuccess: false,
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        environment: {
          endpoint: '/api/health/records',
          method: 'PUT',
        },
      },
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// DELETE - Soft delete health record
export const DELETE = async (request: NextRequest) => {
  debugLog('DELETE /api/health/records started');
  
  // Check feature flag
  const featureCheck = checkHealthFeatureFlag();
  if (featureCheck) {
    return featureCheck;
  }

  // Check authentication
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Apply rate limiting
  const decision = await aj.protect(request, { userId, requested: 1 });
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');

    debugLog('DELETE request for record ID:', recordId);

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 },
      );
    }

    const id = Number.parseInt(recordId, 10);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'Invalid record ID' },
        { status: 400 },
      );
    }

    debugLog('About to check existing record for deletion with ID:', id);

    // Check if record exists and belongs to user
    const existingRecord = await db
      .select()
      .from(SchemaModule.healthRecordSchema)
      .where(
        and(
          eq(SchemaModule.healthRecordSchema.id, id),
          eq(SchemaModule.healthRecordSchema.userId, userId),
        ),
      );

    debugLog('Existing record query for deletion completed, found:', existingRecord.length, 'records');

    if (existingRecord.length === 0) {
      return NextResponse.json(
        { error: 'Health record not found or access denied' },
        { status: 404 },
      );
    }

    debugLog('About to execute DELETE query');

    // Soft delete by removing the record (hard delete for now, can be changed to soft delete later)
    await db
      .delete(SchemaModule.healthRecordSchema)
      .where(
        and(
          eq(SchemaModule.healthRecordSchema.id, id),
          eq(SchemaModule.healthRecordSchema.userId, userId),
        ),
      );

    debugLog('DELETE query executed successfully');

    logger.info('Health record deleted', {
      userId,
      recordId: id,
    });

    // Track behavioral event for health record deletion
    await trackBehaviorEvent(
      userId,
      'health_record_deleted',
      'health_record',
      id,
      {
        custom: {
          deletedRecord: {
            typeId: existingRecord[0]?.typeId,
            value: existingRecord[0]?.value,
            unit: existingRecord[0]?.unit,
            recordedAt: existingRecord[0]?.recordedAt,
          },
          operationSuccess: true,
        },
        environment: {
          endpoint: '/api/health/records',
          method: 'DELETE',
        },
      },
    );

    debugLog('DELETE /api/health/records completed successfully');

    return NextResponse.json({
      message: 'Health record deleted successfully',
    });
  } catch (error) {
    criticalLog('Error in DELETE /api/health/records:');
    criticalLog('Error name:', error?.name);
    criticalLog('Error message:', error?.message);
    criticalLog('Error stack:', error?.stack);
    
    if (error?.code) criticalLog('Database error code:', error.code);
    if (error?.constraint) criticalLog('Constraint violation:', error.constraint);
    if (error?.detail) criticalLog('Error detail:', error.detail);

    logger.error('Error deleting health record', { error, userId });

    // Track behavioral event for failed health record deletion
    await trackBehaviorEvent(
      userId,
      'health_record_deleted',
      'ui_interaction',
      undefined,
      {
        custom: {
          operationSuccess: false,
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        environment: {
          endpoint: '/api/health/records',
          method: 'DELETE',
        },
      },
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};
