import type { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { 
  behavioralEventSchema, 
  microBehaviorPatternSchema
} from '@/models/Schema';

const logger = {
  info: (message: string, data?: any) => {
    console.warn(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
};

const FrequencyQueryValidation = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  behaviorType: z.string().optional(),
  aggregation: z.enum(['daily', 'weekly']).default('daily'),
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
      aggregation: searchParams.get('aggregation') || 'daily',
    };

    const validation = FrequencyQueryValidation.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.format() },
        { status: 422 },
      );
    }

    const { timeRange, behaviorType, aggregation } = validation.data;

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

    // Build aggregation format
    let dateFormat: string;
    let groupByClause: string;

    if (aggregation === 'weekly') {
      dateFormat = 'YYYY-"W"WW';
      groupByClause = 'week';
    } else {
      dateFormat = 'YYYY-MM-DD';
      groupByClause = 'day';
    }

    // Get frequency data with consistency and strength calculations
    const frequencyData = await db
      .select({
        date: sql<string>`TO_CHAR(${behavioralEventSchema.createdAt}, ${dateFormat})`,
        frequency: sql<number>`COUNT(*)`,
      })
      .from(behavioralEventSchema)
      .where(
        and(
          eq(behavioralEventSchema.userId, user.id),
          gte(behavioralEventSchema.createdAt, startDate),
          lte(behavioralEventSchema.createdAt, endDate),
          behaviorType 
            ? sql`${behavioralEventSchema.context}->>'behaviorType' = ${behaviorType}`
            : sql`true`
        )
      )
      .groupBy(sql`TO_CHAR(${behavioralEventSchema.createdAt}, ${dateFormat})`)
      .orderBy(sql`TO_CHAR(${behavioralEventSchema.createdAt}, ${dateFormat})`);

    // Get pattern data for strength calculation
    const patterns = await db
      .select({
        behaviorType: microBehaviorPatternSchema.behaviorType,
        strength: microBehaviorPatternSchema.strength,
        consistency: microBehaviorPatternSchema.consistency,
        frequency: microBehaviorPatternSchema.frequency,
      })
      .from(microBehaviorPatternSchema)
      .where(
        and(
          eq(microBehaviorPatternSchema.userId, user.id),
          behaviorType 
            ? eq(microBehaviorPatternSchema.behaviorType, behaviorType)
            : sql`true`
        )
      );

    // Calculate moving averages for consistency and strength
    const enrichedData = frequencyData.map((dataPoint, index) => {
      // Calculate consistency score based on frequency variation
      const windowSize = Math.min(7, frequencyData.length);
      const startIndex = Math.max(0, index - Math.floor(windowSize / 2));
      const endIndex = Math.min(frequencyData.length, startIndex + windowSize);
      const window = frequencyData.slice(startIndex, endIndex);
      
      const frequencies = window.map(d => Number(d.frequency));
      const mean = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
      const variance = frequencies.reduce((sum, freq) => sum + Math.pow(freq - mean, 2), 0) / frequencies.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Convert to consistency score (lower std dev = higher consistency)
      const maxStdDev = Math.max(mean, 1);
      const consistency = Math.max(0, 100 - (standardDeviation / maxStdDev) * 100);

      // Calculate strength based on frequency relative to patterns
      const relevantPatterns = patterns.filter(p => 
        !behaviorType || p.behaviorType === behaviorType
      );
      
      const avgPatternStrength = relevantPatterns.length > 0
        ? relevantPatterns.reduce((sum, p) => sum + Number(p.strength), 0) / relevantPatterns.length
        : 50; // Default to 50 if no patterns

      const currentFrequency = Number(dataPoint.frequency);
      const expectedFrequency = relevantPatterns.length > 0
        ? relevantPatterns.reduce((sum, p) => sum + Number(p.frequency), 0) / relevantPatterns.length
        : 1;

      // Strength based on how close current frequency is to expected
      const frequencyRatio = expectedFrequency > 0 ? currentFrequency / expectedFrequency : 0;
      const strength = Math.min(100, Math.max(0, avgPatternStrength * frequencyRatio));

      return {
        date: dataPoint.date,
        frequency: currentFrequency,
        consistency: Math.round(consistency),
        strength: Math.round(strength),
      };
    });

    // Calculate overall statistics
    const totalFrequency = frequencyData.reduce((sum, d) => sum + Number(d.frequency), 0);
    const avgFrequency = frequencyData.length > 0 ? totalFrequency / frequencyData.length : 0;
    const avgConsistency = enrichedData.length > 0 
      ? enrichedData.reduce((sum, d) => sum + d.consistency, 0) / enrichedData.length 
      : 0;
    const avgStrength = enrichedData.length > 0 
      ? enrichedData.reduce((sum, d) => sum + d.strength, 0) / enrichedData.length 
      : 0;

    logger.info('Frequency analytics retrieved', {
      userId: user.id,
      timeRange,
      behaviorType,
      aggregation,
      dataPoints: enrichedData.length,
      totalFrequency,
      avgFrequency,
    });

    return NextResponse.json({
      success: true,
      data: enrichedData,
      meta: {
        timeRange,
        behaviorType,
        aggregation,
        totalDataPoints: enrichedData.length,
        totalFrequency,
        avgFrequency: Math.round(avgFrequency * 100) / 100,
        avgConsistency: Math.round(avgConsistency),
        avgStrength: Math.round(avgStrength),
        userId: user.id,
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Error retrieving frequency analytics', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};