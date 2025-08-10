import type { NextRequest } from 'next/server';
import arcjet, { tokenBucket } from '@arcjet/next';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
import { healthGoalSchema, healthRecordSchema, healthTypeSchema } from '@/models/Schema';

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

// GET - Get active health goals for dashboard
export const GET = async (request: NextRequest) => {
  try {
    // Check feature flag
    const featureCheck = checkHealthFeatureFlag();
    if (featureCheck) {
      return featureCheck;
    }

    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const decision = await aj.protect(request, { userId: user.id });
    if (decision.isDenied()) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Get active goals with progress calculation
    const goals = await db
      .select({
        id: healthGoalSchema.id,
        typeId: healthGoalSchema.typeId,
        targetValue: healthGoalSchema.targetValue,
        targetDate: healthGoalSchema.targetDate,
        status: healthGoalSchema.status,
        createdAt: healthGoalSchema.createdAt,
        updatedAt: healthGoalSchema.updatedAt,
        healthType: {
          id: healthTypeSchema.id,
          slug: healthTypeSchema.slug,
          displayName: healthTypeSchema.displayName,
          unit: healthTypeSchema.unit,
        },
      })
      .from(healthGoalSchema)
      .leftJoin(healthTypeSchema, eq(healthGoalSchema.typeId, healthTypeSchema.id))
      .where(
        and(
          eq(healthGoalSchema.userId, user.id),
          eq(healthGoalSchema.status, 'active')
        )
      )
      .orderBy(desc(healthGoalSchema.createdAt));

    // Calculate progress for each goal
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        // Get the latest record for this goal type
        const latestRecord = await db
          .select({
            value: healthRecordSchema.value,
            recordedAt: healthRecordSchema.recordedAt,
          })
          .from(healthRecordSchema)
          .where(
            and(
              eq(healthRecordSchema.userId, user.id),
              eq(healthRecordSchema.typeId, goal.typeId)
            )
          )
          .orderBy(desc(healthRecordSchema.recordedAt))
          .limit(1);

        const currentValue = latestRecord[0]?.value || 0;
        const progressPercentage = Math.min(
          Math.round((currentValue / goal.targetValue) * 100),
          100
        );
        
        // Calculate days remaining
        const targetDate = new Date(goal.targetDate);
        const today = new Date();
        const daysRemaining = Math.ceil(
          (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const isOverdue = daysRemaining < 0;

        return {
          ...goal,
          currentValue,
          progressPercentage,
          daysRemaining,
          isOverdue,
          lastRecordedAt: latestRecord[0]?.recordedAt || null,
        };
      })
    );

    logger.info(`Retrieved ${goalsWithProgress.length} active health goals for user ${user.id}`);

    return NextResponse.json({
      goals: goalsWithProgress,
      total: goalsWithProgress.length,
    });
  } catch (error) {
    logger.error('Error retrieving active health goals', { error, userId: user?.id });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};