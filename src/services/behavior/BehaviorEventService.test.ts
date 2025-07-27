import type { BehaviorEventInput, ContextData, EntityType } from '@/validations/BehaviorEventValidation';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/libs/DB';
import { logger } from '@/libs/Logger';
import {
  behavioralEventSchema,
} from '@/models/Schema';
import { BehaviorEventService } from './BehaviorEventService';

// Mock the database
vi.mock('@/libs/DB', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    query: {
      behavioralEventSchema: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      healthRecordSchema: {
        findFirst: vi.fn(),
      },
      trainingSessionSchema: {
        findFirst: vi.fn(),
      },
      exerciseLogSchema: {
        findFirst: vi.fn(),
      },
      healthGoalSchema: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// Mock Drizzle ORM operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
}));

// Mock Logger
vi.mock('@/libs/Logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockDb = vi.mocked(db);
const mockEq = vi.mocked(eq);
const mockAnd = vi.mocked(and);
const mockDesc = vi.mocked(desc);
const mockAsc = vi.mocked(asc);
const mockGte = vi.mocked(gte);
const mockLte = vi.mocked(lte);
const mockLogger = vi.mocked(logger);

describe('BehaviorEventService', () => {
  const mockUserId = 'user_123';
  const mockSessionId = 'session_456';

  const mockBehaviorEvent = {
    id: 1,
    userId: mockUserId,
    eventName: 'health_record_added',
    entityType: 'health_record' as EntityType,
    entityId: 1,
    context: { custom: { test: 'data' } },
    sessionId: mockSessionId,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockHealthRecord = {
    id: 1,
    user_id: mockUserId,
    type_id: 1,
    value: 70.5,
    unit: 'kg',
    recorded_at: new Date('2024-01-15T10:00:00Z'),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockTrainingSession = {
    id: 1,
    user_id: mockUserId,
    training_plan_id: 1,
    scheduled_date: new Date('2024-01-15'),
    status: 'completed' as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createEvents', () => {
    it('should create behavioral events successfully', async () => {
      const events: BehaviorEventInput[] = [
        {
          eventName: 'health_record_added',
          entityType: 'health_record',
          entityId: 1,
          context: { custom: { test: 'data' } },
          sessionId: mockSessionId,
        },
        {
          eventName: 'ui_click',
          entityType: 'ui_interaction',
          context: { ui: { componentName: 'QuickActionButton' } },
          sessionId: mockSessionId,
        },
      ];

      // Mock entity validation
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);

      // Mock insert operation
      const mockInsertResult = [
        { ...mockBehaviorEvent, id: 1 },
        { ...mockBehaviorEvent, id: 2, eventName: 'ui_click', entityType: 'ui_interaction', entityId: null },
      ];

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockInsertResult),
        }),
      });

      const result = await BehaviorEventService.createEvents(mockUserId, events);

      expect(result).toEqual(mockInsertResult);
      expect(mockDb.insert).toHaveBeenCalledWith(behavioralEventSchema);
      expect(mockLogger.info).toHaveBeenCalledWith('Bulk behavioral events created', {
        userId: mockUserId,
        eventCount: 2,
        eventNames: ['health_record_added', 'ui_click'],
      });
    });

    it('should throw error for invalid user ID', async () => {
      const events: BehaviorEventInput[] = [{
        eventName: 'test_event',
        entityType: 'ui_interaction',
      }];

      await expect(
        BehaviorEventService.createEvents('', events),
      ).rejects.toThrow('Invalid user ID');

      await expect(
        BehaviorEventService.createEvents('   ', events),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw error for empty events array', async () => {
      await expect(
        BehaviorEventService.createEvents(mockUserId, []),
      ).rejects.toThrow('Events array is required and cannot be empty');

      await expect(
        BehaviorEventService.createEvents(mockUserId, null as any),
      ).rejects.toThrow('Events array is required and cannot be empty');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw error for invalid event data', async () => {
      const invalidEvents = [
        {
          eventName: '', // Invalid empty event name
          entityType: 'health_record' as EntityType,
        },
      ];

      await expect(
        BehaviorEventService.createEvents(mockUserId, invalidEvents),
      ).rejects.toThrow('Validation failed');

      expect(mockLogger.warn).toHaveBeenCalledWith('Bulk event validation failed', expect.any(Object));
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw error for invalid entity reference', async () => {
      const events: BehaviorEventInput[] = [{
        eventName: 'health_record_added',
        entityType: 'health_record',
        entityId: 999, // Non-existent entity
        sessionId: mockSessionId,
      }];

      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(null);

      await expect(
        BehaviorEventService.createEvents(mockUserId, events),
      ).rejects.toThrow('Invalid entity reference: health_record with ID 999');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const events: BehaviorEventInput[] = [{
        eventName: 'ui_click',
        entityType: 'ui_interaction',
        sessionId: mockSessionId,
      }];

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
      });

      await expect(
        BehaviorEventService.createEvents(mockUserId, events),
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create behavioral events', expect.any(Object));
    });

    it('should handle bulk events with mixed entity types', async () => {
      const events: BehaviorEventInput[] = [
        {
          eventName: 'health_record_added',
          entityType: 'health_record',
          entityId: 1,
        },
        {
          eventName: 'training_session_started',
          entityType: 'training_session',
          entityId: 1,
        },
        {
          eventName: 'ui_click',
          entityType: 'ui_interaction',
        },
      ];

      // Mock entity validations
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);
      mockDb.query.trainingSessionSchema.findFirst.mockResolvedValue(mockTrainingSession);

      const mockInsertResult = events.map((event, index) => ({
        ...mockBehaviorEvent,
        id: index + 1,
        eventName: event.eventName,
        entityType: event.entityType,
        entityId: event.entityId || null,
      }));

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockInsertResult),
        }),
      });

      const result = await BehaviorEventService.createEvents(mockUserId, events);

      expect(result).toEqual(mockInsertResult);
      expect(mockDb.query.healthRecordSchema.findFirst).toHaveBeenCalledTimes(1);
      expect(mockDb.query.trainingSessionSchema.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should handle events with complex context data', async () => {
      const complexContext: ContextData = {
        device: {
          userAgent: 'Mozilla/5.0...',
          platform: 'desktop',
          screenWidth: 1920,
          screenHeight: 1080,
        },
        ui: {
          componentName: 'HealthOverview',
          route: '/health',
          action: 'view_stats',
        },
        environment: {
          timestamp: new Date(),
          timezone: 'America/New_York',
          locale: 'en-US',
        },
        custom: {
          feature_flag: 'health_v2',
          experiment_id: 'exp_123',
        },
      };

      const events: BehaviorEventInput[] = [{
        eventName: 'health_overview_viewed',
        entityType: 'ui_interaction',
        context: complexContext,
        sessionId: mockSessionId,
      }];

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBehaviorEvent]),
        }),
      });

      const result = await BehaviorEventService.createEvents(mockUserId, events);

      expect(result).toHaveLength(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    it('should track a single event successfully', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBehaviorEvent]),
        }),
      });

      const result = await BehaviorEventService.trackEvent(
        mockUserId,
        'ui_click',
        'ui_interaction',
        undefined,
        { ui: { componentName: 'QuickActionButton' } },
        mockSessionId,
      );

      expect(result).toEqual(mockBehaviorEvent);
      expect(mockDb.insert).toHaveBeenCalledWith(behavioralEventSchema);
    });

    it('should track event with entity reference', async () => {
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBehaviorEvent]),
        }),
      });

      const result = await BehaviorEventService.trackEvent(
        mockUserId,
        'health_record_viewed',
        'health_record',
        1,
        { healthData: { recordType: 'weight', value: 70.5 } },
      );

      expect(result).toEqual(mockBehaviorEvent);
      expect(mockDb.query.healthRecordSchema.findFirst).toHaveBeenCalled();
    });

    it('should handle tracking errors gracefully', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(
        BehaviorEventService.trackEvent(mockUserId, 'test_event', 'ui_interaction'),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getEvents', () => {
    it('should retrieve events for a user', async () => {
      const mockEvents = [mockBehaviorEvent];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockEvents),
              }),
            }),
          }),
        }),
      });

      const result = await BehaviorEventService.getEvents(mockUserId);

      expect(result).toEqual(mockEvents);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Behavioral events retrieved', {
        userId: mockUserId,
        eventCount: 1,
        filters: expect.any(Object),
      });
    });

    it('should filter events by event name', async () => {
      const mockEvents = [mockBehaviorEvent];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockEvents),
              }),
            }),
          }),
        }),
      });

      const result = await BehaviorEventService.getEvents(mockUserId, {
        eventName: 'health_record_added',
      });

      expect(result).toEqual(mockEvents);
      expect(mockEq).toHaveBeenCalledWith(behavioralEventSchema.eventName, 'health_record_added');
    });

    it('should filter events by entity type and ID', async () => {
      const mockEvents = [mockBehaviorEvent];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockEvents),
              }),
            }),
          }),
        }),
      });

      const result = await BehaviorEventService.getEvents(mockUserId, {
        entityType: 'health_record',
        entityId: 1,
      });

      expect(result).toEqual(mockEvents);
      expect(mockEq).toHaveBeenCalledWith(behavioralEventSchema.entityType, 'health_record');
      expect(mockEq).toHaveBeenCalledWith(behavioralEventSchema.entityId, 1);
    });

    it('should filter events by date range', async () => {
      const mockEvents = [mockBehaviorEvent];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockEvents),
              }),
            }),
          }),
        }),
      });

      const result = await BehaviorEventService.getEvents(mockUserId, {
        startDate,
        endDate,
      });

      expect(result).toEqual(mockEvents);
      expect(mockGte).toHaveBeenCalledWith(behavioralEventSchema.createdAt, startDate);
      expect(mockLte).toHaveBeenCalledWith(behavioralEventSchema.createdAt, endDate);
    });

    it('should apply pagination', async () => {
      const mockEvents = [mockBehaviorEvent];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockEvents),
              }),
            }),
          }),
        }),
      });

      const result = await BehaviorEventService.getEvents(mockUserId, {
        limit: 50,
        offset: 100,
      });

      expect(result).toEqual(mockEvents);
    });

    it('should apply custom sorting', async () => {
      const mockEvents = [mockBehaviorEvent];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockEvents),
              }),
            }),
          }),
        }),
      });

      const result = await BehaviorEventService.getEvents(mockUserId, {
        sortBy: 'eventName',
        sortOrder: 'asc',
      });

      expect(result).toEqual(mockEvents);
      expect(mockAsc).toHaveBeenCalled();
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        BehaviorEventService.getEvents(''),
      ).rejects.toThrow('Invalid user ID');

      await expect(
        BehaviorEventService.getEvents('   '),
      ).rejects.toThrow('Invalid user ID');
    });

    it('should throw error for invalid query parameters', async () => {
      await expect(
        BehaviorEventService.getEvents(mockUserId, {
          startDate: new Date('2024-01-31'),
          endDate: new Date('2024-01-01'), // End date before start date
        }),
      ).rejects.toThrow('Query validation failed');
    });

    it('should ensure user data isolation', async () => {
      const otherUserId = 'user_456';
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      await BehaviorEventService.getEvents(otherUserId);

      expect(mockEq).toHaveBeenCalledWith(behavioralEventSchema.userId, otherUserId);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockRejectedValue(new Error('Database connection failed')),
              }),
            }),
          }),
        }),
      });

      await expect(
        BehaviorEventService.getEvents(mockUserId),
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to retrieve behavioral events', expect.any(Object));
    });
  });

  describe('validateEntityReference', () => {
    it('should validate health record reference', async () => {
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);

      const result = await BehaviorEventService.validateEntityReference('health_record', 1);

      expect(result).toBe(true);
      expect(mockDb.query.healthRecordSchema.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function),
      });
    });

    it('should validate training session reference', async () => {
      mockDb.query.trainingSessionSchema.findFirst.mockResolvedValue(mockTrainingSession);

      const result = await BehaviorEventService.validateEntityReference('training_session', 1);

      expect(result).toBe(true);
      expect(mockDb.query.trainingSessionSchema.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function),
      });
    });

    it('should validate exercise log reference', async () => {
      const mockExerciseLog = { id: 1, user_id: mockUserId };
      mockDb.query.exerciseLogSchema.findFirst.mockResolvedValue(mockExerciseLog);

      const result = await BehaviorEventService.validateEntityReference('exercise_log', 1);

      expect(result).toBe(true);
      expect(mockDb.query.exerciseLogSchema.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function),
      });
    });

    it('should validate health goal reference', async () => {
      const mockHealthGoal = { id: 1, user_id: mockUserId };
      mockDb.query.healthGoalSchema.findFirst.mockResolvedValue(mockHealthGoal);

      const result = await BehaviorEventService.validateEntityReference('health_goal', 1);

      expect(result).toBe(true);
      expect(mockDb.query.healthGoalSchema.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function),
      });
    });

    it('should return true for UI interaction entities', async () => {
      const result = await BehaviorEventService.validateEntityReference('ui_interaction', 1);

      expect(result).toBe(true);
      // Should not query any database tables for UI interactions
      expect(mockDb.query.healthRecordSchema.findFirst).not.toHaveBeenCalled();
    });

    it('should return false for non-existent entities', async () => {
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(null);

      const result = await BehaviorEventService.validateEntityReference('health_record', 999);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Entity reference validation failed', {
        entityType: 'health_record',
        entityId: 999,
      });
    });

    it('should return false for invalid entity IDs', async () => {
      const result1 = await BehaviorEventService.validateEntityReference('health_record', 0);
      const result2 = await BehaviorEventService.validateEntityReference('health_record', -1);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('should return false for unknown entity types', async () => {
      const result = await BehaviorEventService.validateEntityReference('unknown_type' as EntityType, 1);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Unknown entity type for validation', {
        entityType: 'unknown_type',
        entityId: 1,
      });
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.healthRecordSchema.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await BehaviorEventService.validateEntityReference('health_record', 1);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Error validating entity reference', expect.any(Object));
    });
  });

  describe('enrichContext', () => {
    it('should enrich context with server data', () => {
      const originalContext: ContextData = {
        ui: { componentName: 'TestComponent' },
        custom: { userAction: 'click' },
      };

      const serverData = {
        environment: { serverRegion: 'us-east-1' },
        custom: { requestId: 'req_123' },
      };

      const result = BehaviorEventService.enrichContext(originalContext, serverData);

      expect(result).toEqual({
        ui: { componentName: 'TestComponent' },
        custom: {
          userAction: 'click',
          requestId: 'req_123',
          serverTimestamp: expect.any(String),
        },
        environment: {
          serverRegion: 'us-east-1',
          timestamp: expect.any(Date),
          timezone: expect.any(String),
        },
      });
    });

    it('should handle empty context', () => {
      const result = BehaviorEventService.enrichContext();

      expect(result).toEqual({
        environment: {
          timestamp: expect.any(Date),
          timezone: expect.any(String),
        },
        custom: {
          serverTimestamp: expect.any(String),
        },
      });
    });

    it('should add performance data when provided', () => {
      const originalContext: ContextData = {
        ui: { componentName: 'TestComponent' },
      };

      const serverData = {
        performance: {
          dbQueryTime: 50,
          processingTime: 100,
        },
      };

      const result = BehaviorEventService.enrichContext(originalContext, serverData);

      expect(result.performance).toEqual({
        dbQueryTime: 50,
        processingTime: 100,
      });
    });

    it('should merge performance data with existing performance context', () => {
      const originalContext: ContextData = {
        performance: {
          loadTime: 200,
        },
      };

      const serverData = {
        performance: {
          dbQueryTime: 50,
        },
      };

      const result = BehaviorEventService.enrichContext(originalContext, serverData);

      expect(result.performance).toEqual({
        loadTime: 200,
        dbQueryTime: 50,
      });
    });
  });

  describe('getEventStats', () => {
    it('should calculate event statistics', async () => {
      const mockEvents = [
        { eventName: 'health_record_added', entityType: 'health_record' },
        { eventName: 'health_record_added', entityType: 'health_record' },
        { eventName: 'ui_click', entityType: 'ui_interaction' },
        { eventName: 'workout_started', entityType: 'training_session' },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockEvents),
        }),
      });

      const result = await BehaviorEventService.getEventStats(mockUserId);

      expect(result).toEqual({
        totalEvents: 4,
        uniqueEventNames: 3,
        eventsByType: {
          health_record_added: 2,
          ui_click: 1,
          workout_started: 1,
        },
        eventsByEntity: {
          health_record: 2,
          ui_interaction: 1,
          training_session: 1,
        },
      });
    });

    it('should filter stats by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await BehaviorEventService.getEventStats(mockUserId, startDate, endDate);

      expect(mockGte).toHaveBeenCalledWith(behavioralEventSchema.createdAt, startDate);
      expect(mockLte).toHaveBeenCalledWith(behavioralEventSchema.createdAt, endDate);
    });

    it('should handle empty results', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await BehaviorEventService.getEventStats(mockUserId);

      expect(result).toEqual({
        totalEvents: 0,
        uniqueEventNames: 0,
        eventsByType: {},
        eventsByEntity: {},
      });
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        BehaviorEventService.getEventStats(''),
      ).rejects.toThrow('Invalid user ID');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(
        BehaviorEventService.getEventStats(mockUserId),
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get event statistics', expect.any(Object));
    });
  });

  describe('deleteOldEvents', () => {
    it('should delete old events successfully', async () => {
      const mockResult = { rowCount: 150 };
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(mockResult),
      });

      const result = await BehaviorEventService.deleteOldEvents(365);

      expect(result).toBe(150);
      expect(mockDb.delete).toHaveBeenCalledWith(behavioralEventSchema);
      expect(mockLogger.info).toHaveBeenCalledWith('Old behavioral events deleted', {
        deletedCount: 150,
        cutoffDate: expect.any(String),
        olderThanDays: 365,
      });
    });

    it('should handle zero deleted events', async () => {
      const mockResult = { rowCount: 0 };
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(mockResult),
      });

      const result = await BehaviorEventService.deleteOldEvents(30);

      expect(result).toBe(0);
    });

    it('should handle null rowCount', async () => {
      const mockResult = { rowCount: null };
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(mockResult),
      });

      const result = await BehaviorEventService.deleteOldEvents(30);

      expect(result).toBe(0);
    });

    it('should throw error for invalid days parameter', async () => {
      await expect(
        BehaviorEventService.deleteOldEvents(0),
      ).rejects.toThrow('Days must be a positive number');

      await expect(
        BehaviorEventService.deleteOldEvents(-1),
      ).rejects.toThrow('Days must be a positive number');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(
        BehaviorEventService.deleteOldEvents(30),
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete old events', expect.any(Object));
    });

    it('should calculate correct cutoff date', async () => {
      const mockResult = { rowCount: 10 };
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(mockResult),
      });

      const daysBefore = 90;
      await BehaviorEventService.deleteOldEvents(daysBefore);

      expect(mockLte).toHaveBeenCalledWith(
        behavioralEventSchema.createdAt,
        expect.any(Date),
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent event creation', async () => {
      const events: BehaviorEventInput[] = [{
        eventName: 'concurrent_test',
        entityType: 'ui_interaction',
      }];

      // Simulate concurrent modification
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]), // No events returned
        }),
      });

      const result = await BehaviorEventService.createEvents(mockUserId, events);

      expect(result).toEqual([]);
    });

    it('should handle malformed context data', async () => {
      const events: BehaviorEventInput[] = [{
        eventName: 'test_event',
        entityType: 'ui_interaction',
        context: {
          custom: {
            circularRef: {} as any,
          },
        },
      }];

      // Create circular reference
      events[0].context!.custom!.circularRef = events[0].context!.custom;

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBehaviorEvent]),
        }),
      });

      // Should handle circular references in JSON.stringify
      const result = await BehaviorEventService.createEvents(mockUserId, events);

      expect(result).toHaveLength(1);
    });

    it('should handle very large event batches', async () => {
      const largeEventBatch = Array.from({ length: 51 }, (_, i) => ({
        eventName: `event_${i}`,
        entityType: 'ui_interaction' as EntityType,
      }));

      await expect(
        BehaviorEventService.createEvents(mockUserId, largeEventBatch),
      ).rejects.toThrow('Validation failed');
    });

    it('should handle database connection timeouts', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockRejectedValue(new Error('Connection timeout')),
              }),
            }),
          }),
        }),
      });

      await expect(
        BehaviorEventService.getEvents(mockUserId),
      ).rejects.toThrow('Connection timeout');
    });

    it('should handle null/undefined entity IDs gracefully', async () => {
      const result1 = await BehaviorEventService.validateEntityReference('health_record', null as any);
      const result2 = await BehaviorEventService.validateEntityReference('health_record', undefined as any);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('should handle invalid JSON in context during retrieval', async () => {
      const mockEventsWithInvalidJson = [{
        ...mockBehaviorEvent,
        context: 'invalid json string',
      }];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockEventsWithInvalidJson),
              }),
            }),
          }),
        }),
      });

      // Should not throw error, just return the events as-is
      const result = await BehaviorEventService.getEvents(mockUserId);

      expect(result).toEqual(mockEventsWithInvalidJson);
    });

    it('should handle extremely long event names', async () => {
      const longEventName = 'a'.repeat(200); // Exceeds 100 char limit
      const events: BehaviorEventInput[] = [{
        eventName: longEventName,
        entityType: 'ui_interaction',
      }];

      await expect(
        BehaviorEventService.createEvents(mockUserId, events),
      ).rejects.toThrow('Validation failed');
    });

    it('should handle special characters in event names', async () => {
      const events: BehaviorEventInput[] = [{
        eventName: 'event@#$%',
        entityType: 'ui_interaction',
      }];

      await expect(
        BehaviorEventService.createEvents(mockUserId, events),
      ).rejects.toThrow('Validation failed');
    });

    it('should handle memory pressure during large context enrichment', () => {
      const largeContext: ContextData = {
        custom: {
          largeData: Array.from({ length: 10000 }, (_, i) => `data_${i}`),
        },
      };

      const result = BehaviorEventService.enrichContext(largeContext);

      expect(result.custom?.largeData).toBeDefined();
      expect(result.environment?.timestamp).toBeDefined();
    });

    it('should handle network failures gracefully when PostHog is unavailable', async () => {
      const events: BehaviorEventInput[] = [{
        eventName: 'test_event',
        entityType: 'ui_interaction',
        sessionId: mockSessionId,
      }];

      // Mock successful database insert
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBehaviorEvent]),
        }),
      });

      // Mock PostHog network failure
      const originalProcessEnv = process.env;
      process.env = {
        ...originalProcessEnv,
        POSTHOG_API_KEY: 'test-key',
        POSTHOG_HOST: 'http://unavailable-host.test',
      };

      // Mock fetch to simulate network failure
      const mockFetch = vi.spyOn(global, 'fetch');
      mockFetch.mockRejectedValue(new Error('Network error: PostHog unreachable'));

      const result = await BehaviorEventService.createEvents(mockUserId, events);

      // Should still succeed despite PostHog failure
      expect(result).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to send events to PostHog', expect.any(Object));

      // Restore environment
      process.env = originalProcessEnv;
      mockFetch.mockRestore();
    });

    it('should handle database transaction rollbacks gracefully', async () => {
      const events: BehaviorEventInput[] = [
        {
          eventName: 'health_record_added',
          entityType: 'health_record',
          entityId: 1,
        },
        {
          eventName: 'training_session_started',
          entityType: 'training_session',
          entityId: 1,
        },
      ];

      // Mock entity validations
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);
      mockDb.query.trainingSessionSchema.findFirst.mockResolvedValue(mockTrainingSession);

      // Mock database transaction failure
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Transaction rolled back')),
        }),
      });

      await expect(
        BehaviorEventService.createEvents(mockUserId, events),
      ).rejects.toThrow('Transaction rolled back');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create behavioral events', expect.any(Object));
    });

    it('should handle data corruption scenarios with malformed existing data', async () => {
      const events: BehaviorEventInput[] = [{
        eventName: 'test_event',
        entityType: 'ui_interaction',
        context: {
          custom: {
            validData: 'test',
          },
        },
      }];

      // Mock database with malformed data response
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            ...mockBehaviorEvent,
            context: '{ invalid json }', // Malformed JSON
          }]),
        }),
      });

      const result = await BehaviorEventService.createEvents(mockUserId, events);

      // Should handle malformed data gracefully
      expect(result).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to parse event context', expect.any(Object));
    });

    it('should ensure graceful degradation when external services are unavailable', async () => {
      const events: BehaviorEventInput[] = [{
        eventName: 'ui_click',
        entityType: 'ui_interaction',
        sessionId: mockSessionId,
      }];

      // Mock successful database insert
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBehaviorEvent]),
        }),
      });

      // Mock multiple external service failures
      const originalProcessEnv = process.env;
      process.env = {
        ...originalProcessEnv,
        POSTHOG_API_KEY: 'test-key',
        POSTHOG_HOST: 'http://unavailable-host.test',
        ANALYTICS_SERVICE_URL: 'http://unavailable-analytics.test',
      };

      // Mock fetch to simulate multiple service failures
      const mockFetch = vi.spyOn(global, 'fetch');
      mockFetch.mockRejectedValue(new Error('All external services unreachable'));

      const result = await BehaviorEventService.createEvents(mockUserId, events);

      // Should still succeed despite all external service failures
      expect(result).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to send events to external services', expect.any(Object));

      // Restore environment
      process.env = originalProcessEnv;
      mockFetch.mockRestore();
    });
  });
});
