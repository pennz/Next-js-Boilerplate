import type { NextRequest } from 'next/server';
import arcjet, { tokenBucket } from '@arcjet/next';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
import { userConstraintSchema } from '@/models/Schema';
import { UserProfileService } from '@/services/profile/UserProfileService';

// Constraint validation schemas
const ConstraintTypeEnum = z.enum(['injury', 'schedule', 'equipment', 'location', 'medical']);
const SeverityEnum = z.enum(['low', 'medium', 'high']);
const ConstraintStatusEnum = z.enum(['active', 'resolved', 'temporary']);

const UserConstraintValidation = z.object({
  type: ConstraintTypeEnum,
  title: z.string().min(1).max(100, {
    message: 'Title must be between 1 and 100 characters',
  }),
  description: z.string().max(500, {
    message: 'Description cannot exceed 500 characters',
  }).optional(),
  severity: SeverityEnum,
  status: ConstraintStatusEnum.default('active'),
  affected_areas: z.array(z.string()).max(10, {
    message: 'Cannot specify more than 10 affected areas',
  }).optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  notes: z.string().max(1000, {
    message: 'Notes cannot exceed 1000 characters',
  }).optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return data.start_date <= data.end_date;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
}).refine((data) => {
  if (data.end_date) {
    const now = new Date();
    return data.end_date >= now || data.status === 'resolved';
  }
  return true;
}, {
  message: 'End date cannot be in the past unless constraint is resolved',
});

const UserConstraintUpdateValidation = UserConstraintValidation.partial().extend({
  id: z.coerce.number().int().positive({
    message: 'Constraint ID must be a positive integer',
  }),
});

const UserConstraintQueryValidation = z.object({
  type: ConstraintTypeEnum.optional(),
  severity: SeverityEnum.optional(),
  status: ConstraintStatusEnum.optional(),
  active_only: z.string().transform(val => val === 'true').optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sort_by: z.enum(['created_at', 'severity', 'start_date', 'end_date']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return data.start_date <= data.end_date;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
});

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
const checkUserProfileFeatureFlag = () => {
  if (!Env.ENABLE_USER_PROFILES) {
    return NextResponse.json(
      { error: 'User profile management feature is not enabled' },
      { status: 503 },
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

// GET - Retrieve user constraints with filtering
export const GET = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkUserProfileFeatureFlag();
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
      type: searchParams.get('type'),
      severity: searchParams.get('severity'),
      status: searchParams.get('status'),
      active_only: searchParams.get('active_only'),
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sort_by: searchParams.get('sort_by'),
      sort_order: searchParams.get('sort_order'),
    };

    const parse = UserConstraintQueryValidation.safeParse(queryData);
    if (!parse.success) {
      logger.warn('User constraint query validation failed', {
        userId,
        queryData,
        errors: parse.error.errors,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const validatedQuery = parse.data;

    // Build query conditions
    const conditions = [eq(userConstraintSchema.userId, userId)];

    if (validatedQuery.type) {
      conditions.push(eq(userConstraintSchema.type, validatedQuery.type));
    }

    if (validatedQuery.severity) {
      conditions.push(eq(userConstraintSchema.severity, validatedQuery.severity));
    }

    if (validatedQuery.status) {
      conditions.push(eq(userConstraintSchema.status, validatedQuery.status));
    }

    if (validatedQuery.active_only) {
      conditions.push(eq(userConstraintSchema.status, 'active'));
    }

    if (validatedQuery.start_date) {
      conditions.push(gte(userConstraintSchema.startDate, validatedQuery.start_date));
    }

    if (validatedQuery.end_date) {
      conditions.push(lte(userConstraintSchema.endDate, validatedQuery.end_date));
    }

    // Get constraints with pagination
    const constraints = await db
      .select()
      .from(userConstraintSchema)
      .where(and(...conditions))
      .orderBy(
        validatedQuery.sort_order === 'desc'
          ? desc(userConstraintSchema[validatedQuery.sort_by as keyof typeof userConstraintSchema])
          : userConstraintSchema[validatedQuery.sort_by as keyof typeof userConstraintSchema],
      )
      .limit(validatedQuery.limit)
      .offset(validatedQuery.offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userConstraintSchema)
      .where(and(...conditions));

    logger.info('User constraints retrieved', {
      userId,
      count: constraints.length,
      filters: validatedQuery,
    });

    return NextResponse.json({
      constraints,
      pagination: {
        total: totalCount[0]?.count || 0,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: (totalCount[0]?.count || 0) > validatedQuery.offset + validatedQuery.limit,
      },
    });
  } catch (error) {
    logger.error('Error retrieving user constraints', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// POST - Add new constraint
export const POST = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkUserProfileFeatureFlag();
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

    // Validate constraint data
    const parse = UserConstraintValidation.safeParse(json);
    if (!parse.success) {
      logger.warn('User constraint validation failed', {
        userId,
        constraintData: json,
        errors: parse.error.errors,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const constraintData = parse.data;

    // Check for constraint conflicts and overlaps
    const existingConstraints = await db
      .select()
      .from(userConstraintSchema)
      .where(
        and(
          eq(userConstraintSchema.userId, userId),
          eq(userConstraintSchema.type, constraintData.type),
          eq(userConstraintSchema.status, 'active'),
        ),
      );

    // Check for overlapping constraints of the same type
    if (existingConstraints.length > 0 && constraintData.type === 'injury') {
      const hasOverlap = existingConstraints.some((existing) => {
        if (!existing.affectedAreas || !constraintData.affected_areas) {
          return false;
        }
        const existingAreas = existing.affectedAreas as string[];
        return constraintData.affected_areas.some(area => existingAreas.includes(area));
      });

      if (hasOverlap) {
        logger.warn('Constraint conflict detected', {
          userId,
          constraintType: constraintData.type,
          affectedAreas: constraintData.affected_areas,
        });
        return NextResponse.json(
          { error: 'Constraint conflicts with existing active constraint in the same area' },
          { status: 409 },
        );
      }
    }

    // Create constraint using service
    const createdConstraint = await UserProfileService.addConstraint(userId, constraintData);

    logger.info('User constraint created', {
      userId,
      constraintId: createdConstraint.id,
      type: constraintData.type,
      severity: constraintData.severity,
    });

    return NextResponse.json({
      constraint: createdConstraint,
      message: 'Constraint created successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating user constraint', { error, userId });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Validation failed')) {
        return NextResponse.json(
          { error: error.message },
          { status: 422 },
        );
      }

      if (error.message.includes('Constraint conflict')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 },
        );
      }

      if (error.message.includes('Invalid user ID')) {
        return NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// PUT - Update existing constraint
export const PUT = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkUserProfileFeatureFlag();
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

    // Validate constraint update data
    const parse = UserConstraintUpdateValidation.safeParse(json);
    if (!parse.success) {
      logger.warn('User constraint update validation failed', {
        userId,
        updateData: json,
        errors: parse.error.errors,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const { id, ...updateData } = parse.data;

    // Check if constraint exists and belongs to user
    const existingConstraint = await db
      .select()
      .from(userConstraintSchema)
      .where(
        and(
          eq(userConstraintSchema.id, id),
          eq(userConstraintSchema.userId, userId),
        ),
      );

    if (existingConstraint.length === 0) {
      return NextResponse.json(
        { error: 'Constraint not found or access denied' },
        { status: 404 },
      );
    }

    // Update constraint using service
    const updatedConstraint = await UserProfileService.updateConstraint(userId, id, updateData);

    logger.info('User constraint updated', {
      userId,
      constraintId: id,
      updates: Object.keys(updateData),
    });

    return NextResponse.json({
      constraint: updatedConstraint,
      message: 'Constraint updated successfully',
    });
  } catch (error) {
    logger.error('Error updating user constraint', { error, userId });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Validation failed')) {
        return NextResponse.json(
          { error: error.message },
          { status: 422 },
        );
      }

      if (error.message.includes('Constraint not found')) {
        return NextResponse.json(
          { error: 'Constraint not found' },
          { status: 404 },
        );
      }

      if (error.message.includes('Invalid user ID')) {
        return NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// DELETE - Remove resolved constraint (soft delete)
export const DELETE = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkUserProfileFeatureFlag();
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
    const constraintId = searchParams.get('id');

    if (!constraintId) {
      return NextResponse.json(
        { error: 'Constraint ID is required' },
        { status: 400 },
      );
    }

    const id = Number.parseInt(constraintId, 10);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'Invalid constraint ID' },
        { status: 400 },
      );
    }

    // Check if constraint exists and belongs to user
    const existingConstraint = await db
      .select()
      .from(userConstraintSchema)
      .where(
        and(
          eq(userConstraintSchema.id, id),
          eq(userConstraintSchema.userId, userId),
        ),
      );

    if (existingConstraint.length === 0) {
      return NextResponse.json(
        { error: 'Constraint not found or access denied' },
        { status: 404 },
      );
    }

    // Soft delete constraint by marking as resolved
    const resolvedConstraint = await UserProfileService.removeConstraint(userId, id);

    logger.info('User constraint removed', {
      userId,
      constraintId: id,
      type: existingConstraint[0].type,
    });

    return NextResponse.json({
      constraint: resolvedConstraint,
      message: 'Constraint removed successfully',
    });
  } catch (error) {
    logger.error('Error removing user constraint', { error, userId });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Constraint not found')) {
        return NextResponse.json(
          { error: 'Constraint not found' },
          { status: 404 },
        );
      }

      if (error.message.includes('Invalid user ID')) {
        return NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// Export types for TypeScript
export type UserConstraintInput = z.infer<typeof UserConstraintValidation>;
export type UserConstraintUpdateInput = z.infer<typeof UserConstraintUpdateValidation>;
export type UserConstraintQueryInput = z.infer<typeof UserConstraintQueryValidation>;
export type ConstraintType = z.infer<typeof ConstraintTypeEnum>;
export type SeverityLevel = z.infer<typeof SeverityEnum>;
export type ConstraintStatus = z.infer<typeof ConstraintStatusEnum>;
