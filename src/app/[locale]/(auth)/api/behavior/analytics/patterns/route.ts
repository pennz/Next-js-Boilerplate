import type { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Env } from '@/libs/Env';
import { HabitStrengthAnalyticsService } from '@/services/analytics/HabitStrengthAnalyticsService';

const logger = {
  info: (message: string, data?: any) => {
    console.warn(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
};

const PatternRecognitionQueryValidation = z.object({
  behaviorType: z.string().optional(),
  minConfidence: z.number().min(0).max(100).default(70),
  limit: z.number().min(1).max(50).default(10),
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
      behaviorType: searchParams.get('behaviorType'),
      minConfidence: searchParams.get('minConfidence')
        ? Number.parseInt(searchParams.get('minConfidence')!)
        : 70,
      limit: searchParams.get('limit')
        ? Number.parseInt(searchParams.get('limit')!)
        : 10,
    };

    const validation = PatternRecognitionQueryValidation.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.format() },
        { status: 422 },
      );
    }

    const { behaviorType, minConfidence, limit } = validation.data;

    const patterns = await HabitStrengthAnalyticsService.recognizePatterns(
      user.id,
      behaviorType,
      minConfidence,
    );

    // Limit results
    const limitedPatterns = patterns.slice(0, limit);

    logger.info('Pattern recognition analytics retrieved', {
      userId: user.id,
      behaviorType,
      minConfidence,
      totalPatterns: patterns.length,
      returnedPatterns: limitedPatterns.length,
    });

    return NextResponse.json({
      success: true,
      data: limitedPatterns,
      meta: {
        behaviorType,
        minConfidence,
        limit,
        totalPatterns: patterns.length,
        returnedPatterns: limitedPatterns.length,
        userId: user.id,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error recognizing patterns', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};
