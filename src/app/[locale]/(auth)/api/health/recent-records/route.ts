import type { NextRequest } from 'next/server';
import arcjet, { tokenBucket } from '@arcjet/next';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
import { healthRecordSchema, healthTypeSchema } from '@/models/Schema';

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

// GET - Get recent health records for dashboard
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

    // Get the 5 most recent health records
    const records = await db
      .select({
        id: healthRecordSchema.id,
        typeId: healthRecordSchema.typeId,
        value: healthRecordSchema.value,
        unit: healthRecordSchema.unit,
        recordedAt: healthRecordSchema.recordedAt,
        createdAt: healthRecordSchema.createdAt,
        healthType: {
          id: healthTypeSchema.id,
          slug: healthTypeSchema.slug,
          displayName: healthTypeSchema.displayName,
          unit: healthTypeSchema.unit,
        },
      })
      .from(healthRecordSchema)
      .leftJoin(healthTypeSchema, eq(healthRecordSchema.typeId, healthTypeSchema.id))
      .where(eq(healthRecordSchema.userId, user.id))
      .orderBy(desc(healthRecordSchema.recordedAt))
      .limit(5);

    logger.info(`Retrieved ${records.length} recent health records for user ${user.id}`);

    return NextResponse.json({
      records,
      total: records.length,
    });
  } catch (error) {
    logger.error('Error retrieving recent health records', { error, userId: user?.id });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};