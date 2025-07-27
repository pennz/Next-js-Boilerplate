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

const ContextAnalyticsQueryValidation = z.object({
  timeRange: z.enum(['30d', '90d', '1y']).default('90d'),
  minPredictivePower: z.number().min(0).max(100).default(50),
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
      timeRange: searchParams.get('timeRange') || '90d',
      minPredictivePower: searchParams.get('minPredictivePower') 
        ? parseInt(searchParams.get('minPredictivePower')!) 
        : 50,
    };

    const validation = ContextAnalyticsQueryValidation.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.format() },
        { status: 422 },
      );
    }

    const { timeRange, minPredictivePower } = validation.data;

    const contextPatterns = await HabitStrengthAnalyticsService.analyzeWorkoutContexts(
      user.id,
      timeRange
    );

    // Filter by minimum predictive power
    const filteredPatterns = contextPatterns.filter(
      pattern => pattern.predictivePower >= minPredictivePower
    );

    logger.info('Context patterns analytics retrieved', {
      userId: user.id,
      timeRange,
      totalPatterns: contextPatterns.length,
      filteredPatterns: filteredPatterns.length,
      minPredictivePower,
    });

    return NextResponse.json({
      success: true,
      data: filteredPatterns,
      meta: {
        timeRange,
        minPredictivePower,
        totalPatterns: contextPatterns.length,
        filteredPatterns: filteredPatterns.length,
        userId: user.id,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error analyzing context patterns', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};