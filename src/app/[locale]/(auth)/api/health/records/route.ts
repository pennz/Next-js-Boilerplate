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

    const parse = HealthRecordQueryValidation.safeParse(queryData);
    if (!parse.success) {
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

    // Execute query
    const records = await db
      .select()
      .from(SchemaModule.healthRecordSchema)
      .where(and(...conditions))
      .orderBy(desc(SchemaModule.healthRecordSchema.recordedAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(SchemaModule.healthRecordSchema)
      .where(and(...conditions));

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
    logger.error('Error retrieving health records', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// POST - Create new health record
export const POST = async (request: NextRequest) => {
  console.log('🚀 === POST /api/health/records START ===');
  console.log('⏰ Timestamp:', new Date().toISOString());

  try {
    // Step 1: Check feature flag
    console.log('🚩 Step 1: Checking feature flag...');
    const featureCheck = checkHealthFeatureFlag();
    if (featureCheck) {
      console.log('❌ Feature flag check failed - health mgmt disabled');
      return featureCheck;
    }
    console.log('✅ Feature flag check passed');

    // Step 2: Check authentication
    console.log('🔐 Step 2: Checking authentication...');
    const userId = await getCurrentUserId();
    console.log('👤 User ID from Clerk:', userId);
    
    if (!userId) {
      console.log('❌ Authentication failed - no user ID');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }
    console.log('✅ Authentication successful');

    // Step 3: Apply rate limiting
    console.log('⚡ Step 3: Applying rate limiting...');
    const decision = await aj.protect(request, { userId, requested: 1 });
    if (decision.isDenied()) {
      console.log('❌ Rate limit exceeded');
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 },
      );
    }
    console.log('✅ Rate limiting passed');

    // Step 4: Parse request JSON
    console.log('📦 Step 4: Parsing request JSON...');
    let json;
    try {
      json = await request.json();
      console.log('📋 Raw request body:', JSON.stringify(json, null, 2));
      console.log('📊 Body type:', typeof json);
      console.log('📏 Body keys:', Object.keys(json || {}));
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      logger.error('JSON parsing error', { error: parseError, userId });
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 },
      );
    }
    console.log('✅ JSON parsing successful');

    // Step 5: Validate request data
    console.log('🔍 Step 5: Validating request data...');
    console.log('🧪 Attempting Zod validation with HealthRecordValidation schema...');
    
    const parse = HealthRecordValidation.safeParse(json);
    
    if (!parse.success) {
      console.error('❌ Validation failed:', parse.error);
      console.error('📋 Validation errors:', JSON.stringify(parse.error.errors, null, 2));
      logger.error('Validation error', { 
        error: parse.error, 
        requestData: json, 
        userId 
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }
    
    const { type_id, value, unit, recorded_at } = parse.data;
    console.log('✅ Validation successful');
    console.log('📊 Validated data:', {
      type_id,
      value,
      unit,
      recorded_at: recorded_at?.toISOString(),
    });

    // Step 6: Prepare database insertion
    console.log('🗄️ Step 6: Preparing database insertion...');
    
    // Let's check what we actually received and ensure proper mapping
    console.log('🔍 Validated data received:');
    console.log('   - type_id:', type_id, '(type:', typeof type_id, ')');
    console.log('   - value:', value, '(type:', typeof value, ')');
    console.log('   - unit:', unit, '(type:', typeof unit, ')');
    console.log('   - recorded_at:', recorded_at, '(type:', typeof recorded_at, ')');
    
    const insertData = {
      userId: userId,
      typeId: type_id,
      value: value.toString(),
      unit: unit,  // Unit is required by schema and validation
      recordedAt: recorded_at,
    };
    
    console.log('💾 Final data to insert:', JSON.stringify({
      userId: insertData.userId,
      typeId: insertData.typeId,
      value: insertData.value,
      unit: insertData.unit,
      recordedAt: insertData.recordedAt?.toISOString(),
    }, null, 2));

    // Step 7: Test database connection
    console.log('🔗 Step 7: Testing database connection...');
    try {
      await db.execute(sql`SELECT 1 as connection_test`);
      console.log('✅ Database connection confirmed');
    } catch (dbConnectionError) {
      console.error('❌ Database connection failed:', dbConnectionError);
      logger.error('Database connection error', { error: dbConnectionError, userId });
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 },
      );
    }

    // Step 8: Verify schema availability
    console.log('📋 Step 8: Verifying schema availability...');
    
    // Debug: Check what's available in the Schema module
    console.log('🔍 Available exports in Schema module:', Object.keys(SchemaModule));
    
    // Try to get healthRecordSchema from different possible names
    const healthRecordSchema = SchemaModule.healthRecordSchema || 
                              SchemaModule.healthRecords || 
                              SchemaModule.health_records ||
                              SchemaModule.HealthRecord ||
                              SchemaModule.HealthRecords;
    
    console.log('🗂️ healthRecordSchema found:', !!healthRecordSchema);
    console.log('🗂️ healthRecordSchema type:', typeof healthRecordSchema);
    
    if (healthRecordSchema) {
      console.log('🗂️ healthRecordSchema keys:', Object.keys(healthRecordSchema));
      
      // Try to inspect the columns of the table
      // Note: In Drizzle ORM, the schema structure is different
      // We'll check for the columns property in a safer way
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
        // In Drizzle ORM, we need to access the table name differently
        const tableName = healthRecordSchema?.[Symbol.toStringTag] || 
                         (healthRecordSchema?.[Symbol.toPrimitive] ? healthRecordSchema[Symbol.toPrimitive]('string') : undefined) ||
                         healthRecordSchema?.name || 
                         'unknown';
        console.log('🏷️ Schema table name:', tableName);
      } catch (nameError) {
        console.log('⚠️ Could not determine schema table name:', nameError.message);
      }
    }
    
    // Verify schema structure
    if (!healthRecordSchema) {
      console.error('❌ healthRecordSchema not found in any expected export names!');
      console.error('🔍 Available exports:', Object.keys(SchemaModule));
      console.error('🔍 Check your Schema.ts file and make sure the health record table is properly exported');
      return NextResponse.json(
        { error: 'Database schema not found' },
        { status: 500 }
      );
    }

    // Step 9: Execute database insertion
    console.log('💾 Step 9: Executing database insertion...');
    console.log('🎯 About to execute INSERT query with Drizzle...');
    
    const newRecord = await db
      .insert(healthRecordSchema)
      .values(insertData)
      .returning();

    console.log('✅ Database insertion successful!');
    console.log('📋 New record created:', JSON.stringify({
      ...newRecord[0],
      recordedAt: newRecord[0]?.recordedAt?.toISOString(),
    }, null, 2));

    logger.info('Health record created', {
      userId,
      recordId: newRecord[0]?.id,
      typeId: type_id,
      value,
      unit,
    });

    // Step 10: Track behavioral event
    console.log('📊 Step 10: Tracking behavioral event...');
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
      console.log('✅ Behavioral event tracked successfully');
    } catch (trackingError) {
      console.error('⚠️ Behavioral event tracking failed (non-critical):', trackingError);
    }

    console.log('🎉 Health record creation completed successfully');
    return NextResponse.json({
      record: newRecord[0],
      message: 'Health record created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('💥 === CRITICAL ERROR OCCURRED ===');
    console.error('🏷️ Error name:', error?.name);
    console.error('📝 Error message:', error?.message);
    console.error('📚 Error stack:', error?.stack);
    
    // Additional database-specific error info
    if (error?.code) {
      console.error('🔢 Database error code:', error.code);
    }
    if (error?.constraint) {
      console.error('⚠️ Constraint violation:', error.constraint);
    }
    if (error?.detail) {
      console.error('🔍 Error detail:', error.detail);
    }
    if (error?.position) {
      console.error('📍 Error position:', error.position);
    }
    if (error?.table) {
      console.error('🗂️ Error table:', error.table);
    }
    if (error?.column) {
      console.error('📋 Error column:', error.column);
    }

    // Check error type
    if (error?.message?.includes('relation') || error?.message?.includes('column')) {
      console.error('🗄️ This appears to be a database schema error');
    }
    if (error?.message?.includes('constraint')) {
      console.error('⚠️ This appears to be a constraint violation');
    }
    if (error?.message?.includes('syntax')) {
      console.error('📝 This appears to be a SQL syntax error');
    }

    console.error('=== END CRITICAL ERROR ===');

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
    console.log('🏁 === POST /api/health/records END ===\n');
  }
};

// PUT - Update existing health record
export const PUT = async (request: NextRequest) => {
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
    const parse = HealthRecordUpdateValidation.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const { id, type_id, value, unit, recorded_at } = parse.data;

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

    return NextResponse.json({
      record: updatedRecord[0],
      message: 'Health record updated successfully',
    });
  } catch (error) {
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

    if (existingRecord.length === 0) {
      return NextResponse.json(
        { error: 'Health record not found or access denied' },
        { status: 404 },
      );
    }

    // Soft delete by removing the record (hard delete for now, can be changed to soft delete later)
    await db
      .delete(SchemaModule.healthRecordSchema)
      .where(
        and(
          eq(SchemaModule.healthRecordSchema.id, id),
          eq(SchemaModule.healthRecordSchema.userId, userId),
        ),
      );

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

    return NextResponse.json({
      message: 'Health record deleted successfully',
    });
  } catch (error) {
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