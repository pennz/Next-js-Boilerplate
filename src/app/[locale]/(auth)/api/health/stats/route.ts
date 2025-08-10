import type { NextRequest } from 'next/server';
import arcjet, { tokenBucket } from '@arcjet/next';
import { currentUser } from '@clerk/nextjs/server';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
import { healthGoalSchema, healthRecordSchema } from '@/models/Schema';

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

// GET - Get health statistics for dashboard
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

    // Get total records count
    const totalRecordsResult = await db
      .select({ count: count() })
      .from(healthRecordSchema)
      .where(eq(healthRecordSchema.userId, user.id));

    const totalRecords = totalRecordsResult[0]?.count || 0;

    // Get completed goals count
    const completedGoalsResult = await db
      .select({ count: count() })
      .from(healthGoalSchema)
      .where(
        and(
          eq(healthGoalSchema.userId, user.id),
          eq(healthGoalSchema.status, 'completed')
        )
      );

    const completedGoals = completedGoalsResult[0]?.count || 0;

    // Get active goals count
    const activeGoalsResult = await db
      .select({ count: count() })
      .from(healthGoalSchema)
      .where(
        and(
          eq(healthGoalSchema.userId, user.id),
          eq(healthGoalSchema.status, 'active')
        )
      );

    const activeGoals = activeGoalsResult[0]?.count || 0;

    // Get weekly progress (records from last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyRecordsResult = await db
      .select({ count: count() })
      .from(healthRecordSchema)
      .where(
        and(
          eq(healthRecordSchema.userId, user.id),
          gte(healthRecordSchema.recordedAt, oneWeekAgo)
        )
      );

    const weeklyRecords = weeklyRecordsResult[0]?.count || 0;

    // Calculate weekly progress percentage (compared to previous week)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const previousWeekRecordsResult = await db
      .select({ count: count() })
      .from(healthRecordSchema)
      .where(
        and(
          eq(healthRecordSchema.userId, user.id),
          gte(healthRecordSchema.recordedAt, twoWeeksAgo),
          sql`${healthRecordSchema.recordedAt} < ${oneWeekAgo}`
        )
      );

    const previousWeekRecords = previousWeekRecordsResult[0]?.count || 0;
    
    let weeklyProgress = 0;
    if (previousWeekRecords > 0) {
      weeklyProgress = Math.round(
        ((weeklyRecords - previousWeekRecords) / previousWeekRecords) * 100
      );
    } else if (weeklyRecords > 0) {
      weeklyProgress = 100; // First week with records
    }

    const stats = {
      totalRecords,
      activeGoals,
      completedGoals,
      weeklyProgress,
      weeklyRecords,
      previousWeekRecords,
    };

    logger.info(`Retrieved health statistics for user ${user.id}`, stats);

    return NextResponse.json({
      stats,
    });
  } catch (error) {
    logger.error('Error retrieving health statistics', { error, userId: user?.id });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};