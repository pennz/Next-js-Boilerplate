import type { NextRequest } from 'next/server';
import arcjet, { tokenBucket } from '@arcjet/next';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
import { behavioralEventSchema } from '@/models/Schema';
import { BehaviorEventService } from '@/services/behavior/BehaviorEventService';
import {
  BehaviorEventBulkValidation,
  BehaviorEventQueryValidation,
  BehaviorEventValidation,
} from '@/validations/BehaviorEventValidation';

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
const checkBehaviorTrackingFeatureFlag = () => {
  if (!Env.ENABLE_BEHAVIOR_TRACKING) {
    return NextResponse.json(
      { error: 'Behavioral tracking feature is not enabled' },
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

// GET - Retrieve user's behavioral events with filtering and pagination
export const GET = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkBehaviorTrackingFeatureFlag();
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
      eventName: searchParams.get('eventName'),
      entityType: searchParams.get('entityType'),
      entityId: searchParams.get('entityId'),
      sessionId: searchParams.get('sessionId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    };

    const parse = BehaviorEventQueryValidation.safeParse(queryData);
    if (!parse.success) {
      logger.warn('Behavioral event query validation failed', {
        userId,
        queryData,
        errors: parse.error.errors,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const validatedQuery = parse.data;

    // Retrieve events using service
    const events = await BehaviorEventService.getEvents(userId, validatedQuery);

    // Build query conditions for total count
    const conditions = [eq(behavioralEventSchema.userId, userId)];

    if (validatedQuery.eventName) {
      conditions.push(eq(behavioralEventSchema.eventName, validatedQuery.eventName));
    }

    if (validatedQuery.entityType) {
      conditions.push(eq(behavioralEventSchema.entityType, validatedQuery.entityType));
    }

    if (validatedQuery.entityId) {
      conditions.push(eq(behavioralEventSchema.entityId, validatedQuery.entityId));
    }

    if (validatedQuery.sessionId) {
      conditions.push(eq(behavioralEventSchema.sessionId, validatedQuery.sessionId));
    }

    if (validatedQuery.startDate) {
      conditions.push(gte(behavioralEventSchema.createdAt, validatedQuery.startDate));
    }

    if (validatedQuery.endDate) {
      conditions.push(lte(behavioralEventSchema.createdAt, validatedQuery.endDate));
    }

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(behavioralEventSchema)
      .where(and(...conditions));

    logger.info('Behavioral events retrieved', {
      userId,
      count: events.length,
      filters: validatedQuery,
    });

    return NextResponse.json({
      events,
      pagination: {
        total: totalCount[0]?.count || 0,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: (totalCount[0]?.count || 0) > validatedQuery.offset + validatedQuery.limit,
      },
    });
  } catch (error) {
    logger.error('Error retrieving behavioral events', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// POST - Accept bulk behavioral events
export const POST = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkBehaviorTrackingFeatureFlag();
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

    // Handle both single event and bulk events
    let eventsData;
    if (Array.isArray(json)) {
      eventsData = { events: json };
    } else if (json.events && Array.isArray(json.events)) {
      eventsData = json;
    } else {
      // Single event - wrap in array
      eventsData = { events: [json] };
    }

    // Validate events
    const parse = BehaviorEventBulkValidation.safeParse(eventsData);
    if (!parse.success) {
      logger.warn('Behavioral event validation failed', {
        userId,
        eventsCount: eventsData.events?.length || 0,
        errors: parse.error.errors,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const { events } = parse.data;

    // Enrich context with server-side data
    const enrichedEvents = events.map(event => ({
      ...event,
      context: BehaviorEventService.enrichContext(event.context, {
        environment: {
          serverTimestamp: new Date().toISOString(),
          userAgent: request.headers.get('user-agent') || undefined,
        },
        custom: {
          requestId: crypto.randomUUID(),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
        },
      }),
    }));

    // Create events using service
    const createdEvents = await BehaviorEventService.createEvents(userId, enrichedEvents);

    logger.info('Behavioral events created', {
      userId,
      eventCount: createdEvents.length,
      eventNames: events.map(e => e.eventName),
      sessionIds: [...new Set(events.map(e => e.sessionId).filter(Boolean))],
    });

    return NextResponse.json({
      events: createdEvents,
      message: `${createdEvents.length} behavioral event(s) created successfully`,
      count: createdEvents.length,
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating behavioral events', { error, userId });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Validation failed')) {
        return NextResponse.json(
          { error: error.message },
          { status: 422 },
        );
      }
      
      if (error.message.includes('Invalid entity reference')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 },
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

// DELETE - Delete behavioral events (for data management)
export const DELETE = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkBehaviorTrackingFeatureFlag();
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
    const eventId = searchParams.get('id');
    const sessionId = searchParams.get('sessionId');
    const olderThanDays = searchParams.get('olderThanDays');

    if (eventId) {
      // Delete specific event
      const id = Number.parseInt(eventId, 10);
      if (isNaN(id) || id <= 0) {
        return NextResponse.json(
          { error: 'Invalid event ID' },
          { status: 400 },
        );
      }

      // Check if event exists and belongs to user
      const existingEvent = await db
        .select()
        .from(behavioralEventSchema)
        .where(
          and(
            eq(behavioralEventSchema.id, id),
            eq(behavioralEventSchema.userId, userId),
          ),
        );

      if (existingEvent.length === 0) {
        return NextResponse.json(
          { error: 'Behavioral event not found or access denied' },
          { status: 404 },
        );
      }

      // Delete the event
      await db
        .delete(behavioralEventSchema)
        .where(
          and(
            eq(behavioralEventSchema.id, id),
            eq(behavioralEventSchema.userId, userId),
          ),
        );

      logger.info('Behavioral event deleted', {
        userId,
        eventId: id,
      });

      return NextResponse.json({
        message: 'Behavioral event deleted successfully',
      });
    } else if (sessionId) {
      // Delete all events for a session
      const deletedEvents = await db
        .delete(behavioralEventSchema)
        .where(
          and(
            eq(behavioralEventSchema.sessionId, sessionId),
            eq(behavioralEventSchema.userId, userId),
          ),
        );

      logger.info('Behavioral events deleted by session', {
        userId,
        sessionId,
        deletedCount: deletedEvents.rowCount || 0,
      });

      return NextResponse.json({
        message: `Behavioral events for session deleted successfully`,
        deletedCount: deletedEvents.rowCount || 0,
      });
    } else if (olderThanDays) {
      // Delete old events for data retention
      const days = Number.parseInt(olderThanDays, 10);
      if (isNaN(days) || days <= 0) {
        return NextResponse.json(
          { error: 'Invalid olderThanDays parameter' },
          { status: 400 },
        );
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const deletedEvents = await db
        .delete(behavioralEventSchema)
        .where(
          and(
            eq(behavioralEventSchema.userId, userId),
            lte(behavioralEventSchema.createdAt, cutoffDate),
          ),
        );

      logger.info('Old behavioral events deleted', {
        userId,
        olderThanDays: days,
        deletedCount: deletedEvents.rowCount || 0,
        cutoffDate: cutoffDate.toISOString(),
      });

      return NextResponse.json({
        message: `Old behavioral events deleted successfully`,
        deletedCount: deletedEvents.rowCount || 0,
        cutoffDate: cutoffDate.toISOString(),
      });
    } else {
      return NextResponse.json(
        { error: 'Either id, sessionId, or olderThanDays parameter is required' },
        { status: 400 },
      );
    }
  } catch (error) {
    logger.error('Error deleting behavioral events', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};