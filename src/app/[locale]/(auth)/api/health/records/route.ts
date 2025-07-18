import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import arcjet, { tokenBucket } from '@arcjet/next';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
import { healthRecordSchema } from '@/models/Schema';
import { 
  HealthRecordValidation, 
  HealthRecordUpdateValidation, 
  HealthRecordQueryValidation 
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
      { status: 503 }
    );
  }
  return null;
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
  if (featureCheck) return featureCheck;

  // Check authentication
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Apply rate limiting
  const decision = await aj.protect(request, { userId });
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
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
    const conditions = [eq(healthRecordSchema.userId, userId)];
    
    if (type_id) {
      conditions.push(eq(healthRecordSchema.typeId, type_id));
    }
    
    if (start_date) {
      conditions.push(gte(healthRecordSchema.recordedAt, start_date));
    }
    
    if (end_date) {
      conditions.push(lte(healthRecordSchema.recordedAt, end_date));
    }

    // Execute query
    const records = await db
      .select()
      .from(healthRecordSchema)
      .where(and(...conditions))
      .orderBy(desc(healthRecordSchema.recordedAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(healthRecordSchema)
      .where(and(...conditions));

    logger.info('Health records retrieved', { 
      userId, 
      count: records.length,
      filters: { type_id, start_date, end_date }
    });

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
      { status: 500 }
    );
  }
};

// POST - Create new health record
export const POST = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkHealthFeatureFlag();
  if (featureCheck) return featureCheck;

  // Check authentication
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Apply rate limiting
  const decision = await aj.protect(request, { userId });
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    const json = await request.json();
    const parse = HealthRecordValidation.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const { type_id, value, unit, recorded_at } = parse.data;

    // Create health record
    const newRecord = await db
      .insert(healthRecordSchema)
      .values({
        userId,
        typeId: type_id,
        value: value.toString(),
        unit,
        recordedAt: recorded_at,
      })
      .returning();

    logger.info('Health record created', { 
      userId, 
      recordId: newRecord[0]?.id,
      typeId: type_id,
      value,
      unit
    });

    return NextResponse.json({
      record: newRecord[0],
      message: 'Health record created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Error creating health record', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

// PUT - Update existing health record
export const PUT = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkHealthFeatureFlag();
  if (featureCheck) return featureCheck;

  // Check authentication
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Apply rate limiting
  const decision = await aj.protect(request, { userId });
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
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
      .from(healthRecordSchema)
      .where(
        and(
          eq(healthRecordSchema.id, id),
          eq(healthRecordSchema.userId, userId)
        )
      );

    if (existingRecord.length === 0) {
      return NextResponse.json(
        { error: 'Health record not found or access denied' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (type_id !== undefined) updateData.typeId = type_id;
    if (value !== undefined) updateData.value = value.toString();
    if (unit !== undefined) updateData.unit = unit;
    if (recorded_at !== undefined) updateData.recordedAt = recorded_at;

    // Update health record
    const updatedRecord = await db
      .update(healthRecordSchema)
      .set(updateData)
      .where(
        and(
          eq(healthRecordSchema.id, id),
          eq(healthRecordSchema.userId, userId)
        )
      )
      .returning();

    logger.info('Health record updated', { 
      userId, 
      recordId: id,
      updatedFields: Object.keys(updateData)
    });

    return NextResponse.json({
      record: updatedRecord[0],
      message: 'Health record updated successfully',
    });

  } catch (error) {
    logger.error('Error updating health record', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

// DELETE - Soft delete health record
export const DELETE = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkHealthFeatureFlag();
  if (featureCheck) return featureCheck;

  // Check authentication
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Apply rate limiting
  const decision = await aj.protect(request, { userId });
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    const id = parseInt(recordId, 10);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'Invalid record ID' },
        { status: 400 }
      );
    }

    // Check if record exists and belongs to user
    const existingRecord = await db
      .select()
      .from(healthRecordSchema)
      .where(
        and(
          eq(healthRecordSchema.id, id),
          eq(healthRecordSchema.userId, userId)
        )
      );

    if (existingRecord.length === 0) {
      return NextResponse.json(
        { error: 'Health record not found or access denied' },
        { status: 404 }
      );
    }

    // Soft delete by removing the record (hard delete for now, can be changed to soft delete later)
    await db
      .delete(healthRecordSchema)
      .where(
        and(
          eq(healthRecordSchema.id, id),
          eq(healthRecordSchema.userId, userId)
        )
      );

    logger.info('Health record deleted', { 
      userId, 
      recordId: id
    });

    return NextResponse.json({
      message: 'Health record deleted successfully',
    });

  } catch (error) {
    logger.error('Error deleting health record', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};