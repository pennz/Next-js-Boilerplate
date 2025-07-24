import { and, desc, eq, gte, lte, asc } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { 
  behavioralEventSchema, 
  healthRecordSchema, 
  trainingSessionSchema, 
  exerciseLogSchema, 
  healthGoalSchema 
} from '@/models/Schema';
import { 
  BehaviorEventValidation, 
  BehaviorEventBulkValidation, 
  BehaviorEventQueryValidation,
  type BehaviorEventInput,
  type BehaviorEventQueryInput,
  type ContextData,
  type EntityType
} from '@/validations/BehaviorEventValidation';
import { logger } from '@/libs/Logger';

export class BehaviorEventService {
  /**
   * Bulk insert behavioral events with validation and referential integrity checks
   */
  static async createEvents(userId: string, events: BehaviorEventInput[]): Promise<any[]> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      throw new Error('Events array is required and cannot be empty');
    }

    // Validate bulk events
    const validationResult = BehaviorEventBulkValidation.safeParse({ events });
    if (!validationResult.success) {
      logger.warn('Bulk event validation failed', { 
        userId, 
        errors: validationResult.error.issues,
        eventCount: events.length 
      });
      throw new Error(`Validation failed: ${validationResult.error.issues[0]?.message}`);
    }

    const validatedEvents = validationResult.data.events;

    try {
      // Validate entity references for all events
      for (const event of validatedEvents) {
        if (event.entityId) {
          const isValid = await this.validateEntityReference(event.entityType, event.entityId);
          if (!isValid) {
            throw new Error(`Invalid entity reference: ${event.entityType} with ID ${event.entityId}`);
          }
        }
      }

      // Prepare events for insertion
      const eventsToInsert = validatedEvents.map(event => ({
        userId,
        eventName: event.eventName,
        entityType: event.entityType,
        entityId: event.entityId || null,
        context: event.context ? JSON.stringify(event.context) : null,
        sessionId: event.sessionId || null,
      }));

      // Bulk insert events
      const insertedEvents = await db
        .insert(behavioralEventSchema)
        .values(eventsToInsert)
        .returning();

      logger.info('Bulk behavioral events created', { 
        userId, 
        eventCount: insertedEvents.length,
        eventNames: validatedEvents.map(e => e.eventName)
      });

      return insertedEvents;
    } catch (error) {
      logger.error('Failed to create behavioral events', { 
        userId, 
        eventCount: events.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Helper for single event tracking
   */
  static async trackEvent(
    userId: string,
    eventName: string,
    entityType: EntityType,
    entityId?: number,
    context?: ContextData,
    sessionId?: string
  ): Promise<any> {
    const event: BehaviorEventInput = {
      eventName,
      entityType,
      entityId,
      context,
      sessionId,
    };

    const events = await this.createEvents(userId, [event]);
    return events[0];
  }

  /**
   * Query events with pagination and filtering
   */
  static async getEvents(userId: string, filters?: BehaviorEventQueryInput): Promise<any[]> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    // Validate query parameters
    const validationResult = BehaviorEventQueryValidation.safeParse(filters || {});
    if (!validationResult.success) {
      throw new Error(`Query validation failed: ${validationResult.error.issues[0]?.message}`);
    }

    const validatedFilters = validationResult.data;

    try {
      // Build where conditions
      const whereConditions = [eq(behavioralEventSchema.userId, userId)];

      if (validatedFilters.eventName) {
        whereConditions.push(eq(behavioralEventSchema.eventName, validatedFilters.eventName));
      }

      if (validatedFilters.entityType) {
        whereConditions.push(eq(behavioralEventSchema.entityType, validatedFilters.entityType));
      }

      if (validatedFilters.entityId) {
        whereConditions.push(eq(behavioralEventSchema.entityId, validatedFilters.entityId));
      }

      if (validatedFilters.sessionId) {
        whereConditions.push(eq(behavioralEventSchema.sessionId, validatedFilters.sessionId));
      }

      if (validatedFilters.startDate) {
        whereConditions.push(gte(behavioralEventSchema.createdAt, validatedFilters.startDate));
      }

      if (validatedFilters.endDate) {
        whereConditions.push(lte(behavioralEventSchema.createdAt, validatedFilters.endDate));
      }

      // Build order by
      const orderBy = validatedFilters.sortOrder === 'asc' 
        ? asc(behavioralEventSchema[validatedFilters.sortBy])
        : desc(behavioralEventSchema[validatedFilters.sortBy]);

      // Execute query
      const events = await db
        .select()
        .from(behavioralEventSchema)
        .where(and(...whereConditions))
        .orderBy(orderBy)
        .limit(validatedFilters.limit)
        .offset(validatedFilters.offset);

      logger.debug('Behavioral events retrieved', { 
        userId, 
        eventCount: events.length,
        filters: validatedFilters
      });

      return events;
    } catch (error) {
      logger.error('Failed to retrieve behavioral events', { 
        userId, 
        filters: validatedFilters,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Ensure referenced entities exist
   */
  static async validateEntityReference(entityType: EntityType, entityId: number): Promise<boolean> {
    if (!entityId || entityId <= 0) {
      return false;
    }

    try {
      let entity = null;

      switch (entityType) {
        case 'health_record':
          entity = await db.query.healthRecordSchema.findFirst({
            where: eq(healthRecordSchema.id, entityId),
          });
          break;

        case 'training_session':
          entity = await db.query.trainingSessionSchema.findFirst({
            where: eq(trainingSessionSchema.id, entityId),
          });
          break;

        case 'exercise_log':
          entity = await db.query.exerciseLogSchema.findFirst({
            where: eq(exerciseLogSchema.id, entityId),
          });
          break;

        case 'health_goal':
          entity = await db.query.healthGoalSchema.findFirst({
            where: eq(healthGoalSchema.id, entityId),
          });
          break;

        case 'ui_interaction':
          // UI interactions don't require entity validation
          return true;

        default:
          logger.warn('Unknown entity type for validation', { entityType, entityId });
          return false;
      }

      const isValid = entity !== null;
      
      if (!isValid) {
        logger.warn('Entity reference validation failed', { entityType, entityId });
      }

      return isValid;
    } catch (error) {
      logger.error('Error validating entity reference', { 
        entityType, 
        entityId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Add server-side context data
   */
  static enrichContext(context?: ContextData, serverData?: Record<string, any>): ContextData {
    const enrichedContext: ContextData = {
      ...context,
      environment: {
        ...context?.environment,
        timestamp: new Date(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...serverData?.environment,
      },
      custom: {
        ...context?.custom,
        serverTimestamp: new Date().toISOString(),
        ...serverData?.custom,
      },
    };

    // Add performance data if available
    if (serverData?.performance) {
      enrichedContext.performance = {
        ...context?.performance,
        ...serverData.performance,
      };
    }

    return enrichedContext;
  }

  /**
   * Get event statistics for a user
   */
  static async getEventStats(
    userId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<{
    totalEvents: number;
    uniqueEventNames: number;
    eventsByType: Record<string, number>;
    eventsByEntity: Record<string, number>;
  }> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const whereConditions = [eq(behavioralEventSchema.userId, userId)];

      if (startDate) {
        whereConditions.push(gte(behavioralEventSchema.createdAt, startDate));
      }

      if (endDate) {
        whereConditions.push(lte(behavioralEventSchema.createdAt, endDate));
      }

      const events = await db
        .select({
          eventName: behavioralEventSchema.eventName,
          entityType: behavioralEventSchema.entityType,
        })
        .from(behavioralEventSchema)
        .where(and(...whereConditions));

      const totalEvents = events.length;
      const uniqueEventNames = new Set(events.map(e => e.eventName)).size;
      
      const eventsByType = events.reduce((acc, event) => {
        acc[event.eventName] = (acc[event.eventName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const eventsByEntity = events.reduce((acc, event) => {
        acc[event.entityType] = (acc[event.entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalEvents,
        uniqueEventNames,
        eventsByType,
        eventsByEntity,
      };
    } catch (error) {
      logger.error('Failed to get event statistics', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Delete old events for data retention
   */
  static async deleteOldEvents(olderThanDays: number = 365): Promise<number> {
    if (olderThanDays <= 0) {
      throw new Error('Days must be a positive number');
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await db
        .delete(behavioralEventSchema)
        .where(lte(behavioralEventSchema.createdAt, cutoffDate));

      const deletedCount = result.rowCount || 0;

      logger.info('Old behavioral events deleted', { 
        deletedCount,
        cutoffDate: cutoffDate.toISOString(),
        olderThanDays
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to delete old events', { 
        olderThanDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}