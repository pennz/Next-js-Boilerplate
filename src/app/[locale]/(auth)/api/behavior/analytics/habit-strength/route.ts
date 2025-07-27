import type { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Env } from '@/libs/Env';
import { HabitStrengthAnalyticsService } from '@/services/analytics/HabitStrengthAnalyticsService';

const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
};

const AnalyticsQueryValidation = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  behaviorType: z.string().optional(),
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
      behaviorType: searchParams.get('behaviorType'),
    };

    const validation = AnalyticsQueryValidation.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.format() },
        { status: 422 },
      );
    }

    const { timeRange, behaviorType } = validation.data;

    const habitStrengthData = await HabitStrengthAnalyticsService.calculateHabitStrength(
      user.id,
      behaviorType,
      timeRange
    );

    logger.info('Habit strength analytics retrieved', {
      userId: user.id,
      timeRange,
      behaviorType,
      habitStrength: habitStrengthData.habitStrength,
    });

    return NextResponse.json({
      success: true,
      data: habitStrengthData,
      meta: {
        timeRange,
        behaviorType,
        userId: user.id,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error calculating habit strength', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};