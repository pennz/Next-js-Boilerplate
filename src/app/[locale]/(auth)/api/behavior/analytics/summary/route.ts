import type { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { 
  behavioralEventSchema, 
  microBehaviorPatternSchema,
  healthRecordSchema,
  exerciseLogSchema
} from '@/models/Schema';
import { HabitStrengthAnalyticsService } from '@/services/analytics/HabitStrengthAnalyticsService';

const logger = {
  info: (message: string, data?: any) => {
    console.warn(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
};

const SummaryQueryValidation = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
});

export const GET = async (request: NextRequest) => {
  try {
    if (!Env.ENABLE_BEHAVIOR_TRACKING) {
      return NextResponse.json(
        { error: 'Behavior tracking feature is not enabled' },
        { status: 404 },
      );
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      timeRange: searchParams.get('timeRange') || '30d',
    };

    const validation = SummaryQueryValidation.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.format() },
        { status: 422 },
      );
    }

    const { timeRange } = validation.data;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Get total behavioral events
    const totalEventsResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(behavioralEventSchema)
      .where(
        and(
          eq(behavioralEventSchema.userId, user.id),
          gte(behavioralEventSchema.createdAt, startDate),
          lte(behavioralEventSchema.createdAt, endDate)
        )
      );

    const totalEvents = Number(totalEventsResult[0]?.count || 0);

    // Get active patterns count
    const activePatternsResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(microBehaviorPatternSchema)
      .where(
        and(
          eq(microBehaviorPatternSchema.userId, user.id),
          gte(microBehaviorPatternSchema.strength, 50) // Consider patterns with strength >= 50% as active
        )
      );

    const activePatterns = Number(activePatternsResult[0]?.count || 0);

    // Calculate habit strength average using the service
    const habitStrengthData = await HabitStrengthAnalyticsService.calculateHabitStrength(
      user.id,
      undefined,
      timeRange
    );

    // Calculate consistency score (average of all active patterns)
    const patternsForConsistency = await db
      .select({
        consistency: microBehaviorPatternSchema.consistency,
        strength: microBehaviorPatternSchema.strength,
      })
      .from(microBehaviorPatternSchema)
      .where(
        and(
          eq(microBehaviorPatternSchema.userId, user.id),
          gte(microBehaviorPatternSchema.strength, 30) // Include patterns with strength >= 30%
        )
      );

    const consistencyScore = patternsForConsistency.length > 0
      ? patternsForConsistency.reduce((sum, pattern) => 
          sum + (Number(pattern.consistency) * Number(pattern.strength) / 100), 0
        ) / patternsForConsistency.length
      : 0;

    // Find top context (most frequent successful context)
    const contextEvents = await db
      .select({
        context: behavioralEventSchema.context,
      })
      .from(behavioralEventSchema)
      .where(
        and(
          eq(behavioralEventSchema.userId, user.id),
          gte(behavioralEventSchema.createdAt, startDate),
          lte(behavioralEventSchema.createdAt, endDate),
          sql`${behavioralEventSchema.context}->>'success' = 'true'`
        )
      );

    // Analyze contexts to find the most common
    const contextCounts: Record<string, number> = {};
    contextEvents.forEach(event => {
      const context = event.context as any;
      if (context?.timeOfDay) {
        const key = `time:${context.timeOfDay}`;
        contextCounts[key] = (contextCounts[key] || 0) + 1;
      }
      if (context?.location) {
        const key = `location:${context.location}`;
        contextCounts[key] = (contextCounts[key] || 0) + 1;
      }
      if (context?.mood) {
        const key = `mood:${context.mood}`;
        contextCounts[key] = (contextCounts[key] || 0) + 1;
      }
    });

    const topContext = Object.entries(contextCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'No dominant context';

    // Calculate weekly trend
    const weeklyTrend = habitStrengthData.trend;

    // Calculate prediction accuracy (simplified - based on pattern confidence)
    const predictionAccuracy = patternsForConsistency.length > 0
      ? patternsForConsistency.reduce((sum, pattern) => 
          sum + Number(pattern.strength), 0
        ) / patternsForConsistency.length
      : 0;

    const summary = {
      totalEvents,
      activePatterns,
      habitStrengthAvg: habitStrengthData.habitStrength,
      consistencyScore: Math.round(consistencyScore),
      topContext,
      weeklyTrend,
      predictionAccuracy: Math.round(predictionAccuracy),
    };

    logger.info('Behavior analytics summary retrieved', {
      userId: user.id,
      timeRange,
      summary,
    });

    return NextResponse.json({
      success: true,
      data: summary,
      meta: {
        timeRange,
        userId: user.id,
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Error generating behavior analytics summary', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};