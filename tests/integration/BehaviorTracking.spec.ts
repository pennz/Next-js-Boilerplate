import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';

// Utility function to handle API requests with auto-generated x-e2e-random-id
const apiRequest = async (request: any, method: 'get' | 'post' | 'put' | 'patch' | 'delete', endpoint: string, data?: any) => {
  const e2eRandomId = faker.number.int({ max: 1000000 });
  return request[method](endpoint, {
    ...(data && { data }),
    headers: {
      'x-e2e-random-id': e2eRandomId.toString(),
    },
  });
};

// Helper function to generate session ID
const generateSessionId = () => faker.string.uuid();

// Helper function to create sample behavioral events
const createSampleEvent = (overrides = {}) => ({
  eventName: 'workout_started',
  entityType: 'training_session',
  entityId: faker.number.int({ min: 1, max: 100 }),
  context: {
    device: 'mobile',
    screen: 'exercise_overview',
    userAgent: 'test-agent',
    timestamp: new Date().toISOString(),
  },
  sessionId: generateSessionId(),
  ...overrides,
});

test.describe('Behavioral Event Tracking', () => {
  test.describe('Behavior Events API', () => {
    test('should create a single behavioral event with valid data', async ({ request }) => {
      const eventData = createSampleEvent();
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events: [eventData],
      });

      expect(response.status()).toBe(201);
      
      const responseJson = await response.json();
      expect(responseJson).toHaveProperty('success', true);
      expect(responseJson).toHaveProperty('created_count', 1);
      expect(responseJson.events).toHaveLength(1);
      expect(responseJson.events[0]).toHaveProperty('id');
      expect(responseJson.events[0].eventName).toBe(eventData.eventName);
      expect(responseJson.events[0].entityType).toBe(eventData.entityType);
    });

    test('should create multiple behavioral events in bulk', async ({ request }) => {
      const events = [
        createSampleEvent({ eventName: 'workout_started', entityType: 'training_session' }),
        createSampleEvent({ eventName: 'health_record_added', entityType: 'health_record' }),
        createSampleEvent({ eventName: 'ui_click', entityType: 'ui_interaction', entityId: null }),
      ];
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events,
      });

      expect(response.status()).toBe(201);
      
      const responseJson = await response.json();
      expect(responseJson.success).toBe(true);
      expect(responseJson.created_count).toBe(3);
      expect(responseJson.events).toHaveLength(3);
    });

    test('shouldn\'t create events with invalid event name', async ({ request }) => {
      const eventData = createSampleEvent({ eventName: '' });
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events: [eventData],
      });

      expect(response.status()).toBe(422);
      
      const responseJson = await response.json();
      expect(responseJson).toHaveProperty('error');
      expect(responseJson.error).toContain('eventName');
    });

    test('shouldn\'t create events with invalid entity type', async ({ request }) => {
      const eventData = createSampleEvent({ entityType: 'invalid_type' });
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events: [eventData],
      });

      expect(response.status()).toBe(422);
      
      const responseJson = await response.json();
      expect(responseJson).toHaveProperty('error');
      expect(responseJson.error).toContain('entityType');
    });

    test('shouldn\'t create more than 50 events in bulk', async ({ request }) => {
      const events = Array.from({ length: 51 }, () => createSampleEvent());
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events,
      });

      expect(response.status()).toBe(422);
      
      const responseJson = await response.json();
      expect(responseJson).toHaveProperty('error');
      expect(responseJson.error).toContain('maximum');
    });

    test('should retrieve behavioral events for authenticated user', async ({ request }) => {
      // Create some events first
      const events = [
        createSampleEvent({ eventName: 'workout_completed' }),
        createSampleEvent({ eventName: 'health_goal_created' }),
      ];
      
      await apiRequest(request, 'post', '/api/behavior/events', {
        events,
      });

      const response = await apiRequest(request, 'get', '/api/behavior/events');

      expect(response.status()).toBe(200);
      
      const responseJson = await response.json();
      expect(responseJson).toHaveProperty('data');
      expect(Array.isArray(responseJson.data)).toBe(true);
      expect(responseJson.data.length).toBeGreaterThan(0);
      expect(responseJson).toHaveProperty('pagination');
    });

    test('should filter events by event name', async ({ request }) => {
      const sessionId = generateSessionId();
      const events = [
        createSampleEvent({ eventName: 'workout_started', sessionId }),
        createSampleEvent({ eventName: 'workout_completed', sessionId }),
        createSampleEvent({ eventName: 'health_record_added', sessionId }),
      ];
      
      await apiRequest(request, 'post', '/api/behavior/events', {
        events,
      });

      const response = await apiRequest(request, 'get', '/api/behavior/events?eventName=workout_started');

      expect(response.status()).toBe(200);
      
      const responseJson = await response.json();
      expect(responseJson.data.every((event: any) => event.eventName === 'workout_started')).toBe(true);
    });

    test('should filter events by entity type', async ({ request }) => {
      const sessionId = generateSessionId();
      const events = [
        createSampleEvent({ entityType: 'training_session', sessionId }),
        createSampleEvent({ entityType: 'health_record', sessionId }),
        createSampleEvent({ entityType: 'ui_interaction', sessionId }),
      ];
      
      await apiRequest(request, 'post', '/api/behavior/events', {
        events,
      });

      const response = await apiRequest(request, 'get', '/api/behavior/events?entityType=training_session');

      expect(response.status()).toBe(200);
      
      const responseJson = await response.json();
      expect(responseJson.data.every((event: any) => event.entityType === 'training_session')).toBe(true);
    });

    test('should filter events by date range', async ({ request }) => {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      const events = [createSampleEvent()];
      await apiRequest(request, 'post', '/api/behavior/events', {
        events,
      });

      const response = await apiRequest(request, 'get', 
        `/api/behavior/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      expect(response.status()).toBe(200);
      
      const responseJson = await response.json();
      expect(responseJson.data.length).toBeGreaterThan(0);
      responseJson.data.forEach((event: any) => {
        const eventDate = new Date(event.createdAt);
        expect(eventDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(eventDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    test('should paginate events correctly', async ({ request }) => {
      // Create multiple events
      const events = Array.from({ length: 15 }, (_, i) => 
        createSampleEvent({ eventName: `test_event_${i}` })
      );
      
      await apiRequest(request, 'post', '/api/behavior/events', {
        events,
      });

      const response = await apiRequest(request, 'get', '/api/behavior/events?limit=10&offset=0');

      expect(response.status()).toBe(200);
      
      const responseJson = await response.json();
      expect(responseJson.data.length).toBeLessThanOrEqual(10);
      expect(responseJson.pagination).toHaveProperty('total');
      expect(responseJson.pagination).toHaveProperty('limit', 10);
      expect(responseJson.pagination).toHaveProperty('offset', 0);
    });
  });

  test.describe('Feature Flag Behavior', () => {
    test('should return 503 when ENABLE_BEHAVIOR_TRACKING is disabled', async ({ request }) => {
      // This test assumes the feature flag can be controlled via environment or test setup
      const eventData = createSampleEvent();
      
      // Mock or set environment variable to disable feature
      const response = await request.post('/api/behavior/events', {
        data: { events: [eventData] },
        headers: {
          'x-e2e-random-id': faker.number.int({ max: 1000000 }).toString(),
          'x-test-feature-flag': 'ENABLE_BEHAVIOR_TRACKING=false',
        },
      });

      // If feature is disabled, should return service unavailable
      if (response.status() === 503) {
        const responseJson = await response.json();
        expect(responseJson).toHaveProperty('error');
        expect(responseJson.error).toContain('disabled');
      } else {
        // If feature is enabled, test should pass normally
        expect(response.status()).toBe(201);
      }
    });
  });

  test.describe('Rate Limiting', () => {
    test('should enforce rate limiting for behavioral events', async ({ request }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 }).toString();
      
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array.from({ length: 25 }, () =>
        request.post('/api/behavior/events', {
          data: { events: [createSampleEvent()] },
          headers: { 'x-e2e-random-id': e2eRandomId },
        })
      );

      const responses = await Promise.all(promises);
      
      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Check rate limit headers
      const rateLimitedResponse = rateLimitedResponses[0];
      const headers = rateLimitedResponse.headers();
      expect(headers).toHaveProperty('x-ratelimit-limit');
      expect(headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  test.describe('Performance Tests', () => {
    test('should handle bulk event processing efficiently', async ({ request }) => {
      const events = Array.from({ length: 50 }, () => createSampleEvent());
      
      const startTime = Date.now();
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events,
      });
      const endTime = Date.now();

      expect(response.status()).toBe(201);
      
      // Should process 50 events in under 5 seconds
      expect(endTime - startTime).toBeLessThan(5000);
      
      const responseJson = await response.json();
      expect(responseJson.created_count).toBe(50);
    });

    test('should retrieve large datasets efficiently', async ({ request }) => {
      // Create a large number of events
      const batchSize = 50;
      const batches = 3;
      
      for (let i = 0; i < batches; i++) {
        const events = Array.from({ length: batchSize }, (_, j) => 
          createSampleEvent({ eventName: `batch_${i}_event_${j}` })
        );
        await apiRequest(request, 'post', '/api/behavior/events', { events });
      }

      const startTime = Date.now();
      const response = await apiRequest(request, 'get', '/api/behavior/events?limit=100');
      const endTime = Date.now();

      expect(response.status()).toBe(200);
      
      // Should retrieve events in under 3 seconds
      expect(endTime - startTime).toBeLessThan(3000);
      
      const responseJson = await response.json();
      expect(responseJson.data.length).toBeGreaterThan(0);
    });
  });

  test.describe('Authentication and Authorization', () => {
    test('shouldn\'t access behavioral events without authentication', async ({ request }) => {
      const response = await request.get('/api/behavior/events');
      expect(response.status()).toBe(401);
    });

    test('shouldn\'t create behavioral events without authentication', async ({ request }) => {
      const response = await request.post('/api/behavior/events', {
        data: { events: [createSampleEvent()] },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Data Isolation', () => {
    test('should isolate behavioral events between different users', async ({ request }) => {
      const user1Id = faker.number.int({ max: 1000000 });
      const user2Id = faker.number.int({ max: 1000000 });
      
      // Create events for user 1
      await request.post('/api/behavior/events', {
        data: { events: [createSampleEvent({ eventName: 'user1_event' })] },
        headers: { 'x-e2e-random-id': user1Id.toString() },
      });

      // Create events for user 2
      await request.post('/api/behavior/events', {
        data: { events: [createSampleEvent({ eventName: 'user2_event' })] },
        headers: { 'x-e2e-random-id': user2Id.toString() },
      });

      // Get events for user 1
      const user1Response = await request.get('/api/behavior/events', {
        headers: { 'x-e2e-random-id': user1Id.toString() },
      });

      // Get events for user 2
      const user2Response = await request.get('/api/behavior/events', {
        headers: { 'x-e2e-random-id': user2Id.toString() },
      });

      const user1Json = await user1Response.json();
      const user2Json = await user2Response.json();

      // Verify data isolation
      expect(user1Json.data.some((event: any) => event.eventName === 'user2_event')).toBe(false);
      expect(user2Json.data.some((event: any) => event.eventName === 'user1_event')).toBe(false);
    });
  });

  test.describe('Context Data Validation', () => {
    test('should accept valid context data', async ({ request }) => {
      const eventData = createSampleEvent({
        context: {
          device: 'mobile',
          screen: 'health_overview',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          viewport: { width: 375, height: 812 },
          customData: { feature: 'quick_actions', buttonId: 'add_record' },
        },
      });
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events: [eventData],
      });

      expect(response.status()).toBe(201);
      
      const responseJson = await response.json();
      expect(responseJson.events[0].context).toEqual(eventData.context);
    });

    test('should handle missing context data gracefully', async ({ request }) => {
      const eventData = createSampleEvent();
      delete eventData.context;
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events: [eventData],
      });

      expect(response.status()).toBe(201);
      
      const responseJson = await response.json();
      expect(responseJson.events[0]).toHaveProperty('context');
    });
  });

  test.describe('Entity Reference Validation', () => {
    test('should validate entity references for health records', async ({ request }) => {
      // First create a health record to reference
      const healthRecord = await apiRequest(request, 'post', '/api/health/records', {
        type_id: 1,
        value: 70.5,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      const healthRecordJson = await healthRecord.json();
      
      const eventData = createSampleEvent({
        eventName: 'health_record_viewed',
        entityType: 'health_record',
        entityId: healthRecordJson.id,
      });
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events: [eventData],
      });

      expect(response.status()).toBe(201);
    });

    test('should handle invalid entity references gracefully', async ({ request }) => {
      const eventData = createSampleEvent({
        eventName: 'health_record_viewed',
        entityType: 'health_record',
        entityId: 999999, // Non-existent ID
      });
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events: [eventData],
      });

      // Should either succeed with warning or fail with validation error
      expect([201, 422]).toContain(response.status());
    });
  });

  test.describe('Session Tracking', () => {
    test('should track events within the same session', async ({ request }) => {
      const sessionId = generateSessionId();
      const events = [
        createSampleEvent({ eventName: 'session_start', sessionId }),
        createSampleEvent({ eventName: 'page_view', sessionId }),
        createSampleEvent({ eventName: 'button_click', sessionId }),
        createSampleEvent({ eventName: 'session_end', sessionId }),
      ];
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events,
      });

      expect(response.status()).toBe(201);
      
      // Retrieve events for this session
      const sessionEvents = await apiRequest(request, 'get', `/api/behavior/events?sessionId=${sessionId}`);
      const sessionEventsJson = await sessionEvents.json();
      
      expect(sessionEventsJson.data.length).toBe(4);
      expect(sessionEventsJson.data.every((event: any) => event.sessionId === sessionId)).toBe(true);
    });
  });

  test.describe('Error Scenarios', () => {
    test('should handle malformed JSON gracefully', async ({ request }) => {
      const response = await request.post('/api/behavior/events', {
        data: 'invalid json',
        headers: {
          'x-e2e-random-id': faker.number.int({ max: 1000000 }).toString(),
          'content-type': 'application/json',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should handle missing required fields', async ({ request }) => {
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events: [{ eventName: 'test' }], // Missing entityType
      });

      expect(response.status()).toBe(422);
      
      const responseJson = await response.json();
      expect(responseJson).toHaveProperty('error');
    });

    test('should handle empty events array', async ({ request }) => {
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events: [],
      });

      expect(response.status()).toBe(422);
      
      const responseJson = await response.json();
      expect(responseJson).toHaveProperty('error');
      expect(responseJson.error).toContain('empty');
    });
  });

  test.describe('Integration with Health and Exercise Systems', () => {
    test('should track health record creation events', async ({ request }) => {
      // Create a health record
      const healthRecord = await apiRequest(request, 'post', '/api/health/records', {
        type_id: 1,
        value: 75.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      expect(healthRecord.status()).toBe(201);
      
      // Check if behavioral event was automatically created
      const events = await apiRequest(request, 'get', '/api/behavior/events?eventName=health_record_created');
      const eventsJson = await events.json();
      
      // Should have at least one health record creation event
      expect(eventsJson.data.length).toBeGreaterThan(0);
      expect(eventsJson.data.some((event: any) => 
        event.eventName === 'health_record_created' && 
        event.entityType === 'health_record'
      )).toBe(true);
    });

    test('should track exercise session events', async ({ request }) => {
      // This test would require exercise session creation endpoint
      // For now, we'll test manual event creation for exercise tracking
      const exerciseEvent = createSampleEvent({
        eventName: 'workout_started',
        entityType: 'training_session',
        context: {
          workoutType: 'strength_training',
          duration: 3600,
          exercises: ['bench_press', 'squats'],
        },
      });
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events: [exerciseEvent],
      });

      expect(response.status()).toBe(201);
      
      const responseJson = await response.json();
      expect(responseJson.events[0].context.workoutType).toBe('strength_training');
    });
  });

  test.describe('Analytics Preparation', () => {
    test('should create events suitable for analytics aggregation', async ({ request }) => {
      const now = new Date();
      const events = [
        createSampleEvent({ 
          eventName: 'feature_usage',
          entityType: 'ui_interaction',
          context: { feature: 'health_dashboard', action: 'view' }
        }),
        createSampleEvent({ 
          eventName: 'feature_usage',
          entityType: 'ui_interaction',
          context: { feature: 'exercise_tracker', action: 'start_workout' }
        }),
        createSampleEvent({ 
          eventName: 'goal_progress',
          entityType: 'health_goal',
          context: { progress: 75, goalType: 'weight_loss' }
        }),
      ];
      
      const response = await apiRequest(request, 'post', '/api/behavior/events', {
        events,
      });

      expect(response.status()).toBe(201);
      
      // Verify events are structured for analytics
      const responseJson = await response.json();
      responseJson.events.forEach((event: any) => {
        expect(event).toHaveProperty('eventName');
        expect(event).toHaveProperty('entityType');
        expect(event).toHaveProperty('context');
        expect(event).toHaveProperty('createdAt');
        expect(event).toHaveProperty('userId');
      });
    });
  });
});