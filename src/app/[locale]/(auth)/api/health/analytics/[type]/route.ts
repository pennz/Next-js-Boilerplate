import type { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { healthRecordSchema, healthTypeSchema } from '@/models/Schema';

// Simple logger implementation following the pattern
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
};

// Validation schema for query parameters
const AnalyticsQueryValidation = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  aggregation: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
});

// Cache for analytics data (simple in-memory cache)
const analyticsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const GET = async (
  request: NextRequest,
  { params }: { params: { type: string } },
) => {
  try {
    // Check if health management is enabled
    if (!Env.ENABLE_HEALTH_MGMT) {
      return NextResponse.json(
        { error: 'Health management feature is not enabled' },
        { status: 404 },
      );
    }

    // Authenticate user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      aggregation: searchParams.get('aggregation') || 'daily',
    };

    const validation = AnalyticsQueryValidation.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: z.treeifyError(validation.error) },
        { status: 422 },
      );
    }

    const { type } = params;
    const { start_date, end_date, aggregation } = validation.data;

    // Generate cache key
    const cacheKey = `${user.id}-${type}-${start_date}-${end_date}-${aggregation}`;

    // Check cache
    const cached = analyticsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info('Returning cached analytics data', { userId: user.id, type });
      return NextResponse.json(cached.data);
    }

    // Verify health type exists
    const healthType = await db
      .select()
      .from(healthTypeSchema)
      .where(eq(healthTypeSchema.slug, type))
      .limit(1);

    if (healthType.length === 0) {
      return NextResponse.json(
        { error: 'Invalid health type' },
        { status: 404 },
      );
    }

    // Set default date range if not provided (last 30 days)
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date
      ? new Date(start_date)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Build aggregation query based on aggregation level
    let dateFormat: string;
    let groupByFormat: string;

    switch (aggregation) {
      case 'weekly':
        dateFormat = 'YYYY-"W"WW';
        groupByFormat = 'week';
        break;
      case 'monthly':
        dateFormat = 'YYYY-MM';
        groupByFormat = 'month';
        break;
      default: // daily
        dateFormat = 'YYYY-MM-DD';
        groupByFormat = 'day';
    }

    // Query aggregated health data
    const analyticsData = await db
      .select({
        date: sql<string>`TO_CHAR(${healthRecordSchema.recordedAt}, ${dateFormat})`,
        avgValue: sql<number>`AVG(${healthRecordSchema.value})`,
        minValue: sql<number>`MIN(${healthRecordSchema.value})`,
        maxValue: sql<number>`MAX(${healthRecordSchema.value})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(healthRecordSchema)
      .where(
        and(
          eq(healthRecordSchema.userId, user.id),
          eq(healthRecordSchema.typeId, healthType[0]?.id || 0),
          gte(healthRecordSchema.recordedAt, startDate),
          lte(healthRecordSchema.recordedAt, endDate),
        ),
      )
      .groupBy(sql`TO_CHAR(${healthRecordSchema.recordedAt}, ${groupByFormat})`)
      .orderBy(sql`TO_CHAR(${healthRecordSchema.recordedAt}, ${dateFormat})`);

    // Get latest record for current value
    const latestRecord = await db
      .select()
      .from(healthRecordSchema)
      .where(
        and(
          eq(healthRecordSchema.userId, user.id),
          eq(healthRecordSchema.typeId, healthType[0]?.id || 0),
        ),
      )
      .orderBy(sql`${healthRecordSchema.recordedAt} DESC`)
      .limit(1);

    // Calculate trend (simple linear regression slope)
    let trend = 0;
    if (analyticsData.length > 1) {
      const n = analyticsData.length;
      const sumX = analyticsData.reduce((sum, _, index) => sum + index, 0);
      const sumY = analyticsData.reduce((sum, item) => sum + Number(item.avgValue), 0);
      const sumXY = analyticsData.reduce((sum, item, index) => sum + index * Number(item.avgValue), 0);
      const sumXX = analyticsData.reduce((sum, _, index) => sum + index * index, 0);

      trend = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    // Format response for Recharts consumption
    const response = {
      type: healthType[0]?.slug || '',
      displayName: healthType[0]?.displayName || '',
      unit: healthType[0]?.unit || '',
      aggregation,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        currentValue: latestRecord[0]?.value || null,
        trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        trendValue: Math.abs(trend),
        totalRecords: analyticsData.reduce((sum, item) => sum + Number(item.count), 0),
      },
      data: analyticsData.map(item => ({
        date: item.date,
        value: Number(item.avgValue),
        min: Number(item.minValue),
        max: Number(item.maxValue),
        count: Number(item.count),
      })),
      typicalRange: {
        low: healthType[0]?.typicalRangeLow ? Number(healthType[0].typicalRangeLow) : null,
        high: healthType[0]?.typicalRangeHigh ? Number(healthType[0].typicalRangeHigh) : null,
      },
    };

    // Cache the response
    analyticsCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    logger.info('Health analytics data retrieved', {
      userId: user.id,
      type,
      recordCount: response.summary.totalRecords,
      aggregation,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error retrieving health analytics', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};
