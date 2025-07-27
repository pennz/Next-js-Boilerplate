'use client';

import type { BehaviorEventInput, ContextData, EntityType } from '@/validations/BehaviorEventValidation';
import { useUser } from '@clerk/nextjs';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Env } from '@/libs/Env';

// Types for the hook
type TrackEventParams = {
  eventName: string;
  entityType: EntityType;
  entityId?: number;
  context?: ContextData;
};

type BehaviorTrackingState = {
  isLoading: boolean;
  error: string | null;
};

type UseBehaviorTrackingReturn = {
  trackEvent: (params: TrackEventParams) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  flushEvents: () => Promise<void>;
};

// Internal event structure for batching
type QueuedEvent = {
  timestamp: number;
  retryCount: number;
} & BehaviorEventInput;

// Session ID generation
const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `session_${timestamp}_${randomPart}`;
};

// Device info collection
const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    deviceType: window.innerWidth < 768
      ? 'mobile' as const
      : window.innerWidth < 1024 ? 'tablet' as const : 'desktop' as const,
    browser: navigator.userAgent.includes('Chrome')
      ? 'Chrome'
      : navigator.userAgent.includes('Firefox')
        ? 'Firefox'
        : navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown',
    os: navigator.platform.includes('Win')
      ? 'Windows'
      : navigator.platform.includes('Mac')
        ? 'macOS'
        : navigator.platform.includes('Linux') ? 'Linux' : 'Unknown',
  };
};

// Environment info collection
const getEnvironmentInfo = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return {
    timestamp: new Date(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
    referrer: document.referrer || undefined,
    networkType: (navigator as any).connection?.effectiveType || 'unknown' as const,
  };
};

export const useBehaviorTracking = (): UseBehaviorTrackingReturn => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const posthog = usePostHog();

  // State management
  const [state, setState] = useState<BehaviorTrackingState>({
    isLoading: false,
    error: null,
  });

  // Event queue for batching
  const eventQueue = useRef<QueuedEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());
  const isFlushingRef = useRef<boolean>(false);

  // Configuration from environment
  const bufferSize = Env.NEXT_PUBLIC_BEHAVIOR_EVENT_BUFFER_SIZE;
  const flushInterval = Env.NEXT_PUBLIC_BEHAVIOR_EVENT_FLUSH_INTERVAL;

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Flush events to server API
  const flushEventsToServer = useCallback(async (events: QueuedEvent[]): Promise<void> => {
    if (!isUserLoaded || !user || events.length === 0) {
      return;
    }

    try {
      const response = await fetch('/api/behavior/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: events.map(({ timestamp, retryCount, ...event }) => event),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      // Re-queue events with retry logic for failed requests
      const retriableEvents = events
        .filter(event => event.retryCount < 3)
        .map(event => ({ ...event, retryCount: event.retryCount + 1 }));

      if (retriableEvents.length > 0) {
        eventQueue.current.unshift(...retriableEvents);
      }

      throw error;
    }
  }, [isUserLoaded, user]);

  // Flush events function
  const flushEvents = useCallback(async (): Promise<void> => {
    if (isFlushingRef.current || eventQueue.current.length === 0) {
      return;
    }

    isFlushingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const eventsToFlush = [...eventQueue.current];
      eventQueue.current = [];

      // Clear any pending flush timeout
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }

      await flushEventsToServer(eventsToFlush);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to flush events';
      setState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
      isFlushingRef.current = false;
    }
  }, [flushEventsToServer]);

  // Schedule automatic flush
  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }

    flushTimeoutRef.current = setTimeout(() => {
      flushEvents().catch(() => {
        // Error handling is done in flushEvents
      });
    }, flushInterval);
  }, [flushEvents, flushInterval]);

  // Track event function
  const trackEvent = useCallback(async (params: TrackEventParams): Promise<void> => {
    const { eventName, entityType, entityId, context } = params;

    // Early return if user is not loaded or behavior tracking is disabled
    if (!isUserLoaded) {
      return;
    }

    try {
      // Enrich context with device and environment info
      const enrichedContext: ContextData = {
        ...context,
        device: context?.device || getDeviceInfo(),
        environment: context?.environment || getEnvironmentInfo(),
        performance: context?.performance || {
          loadTime: performance.now(),
        },
      };

      const behaviorEvent: QueuedEvent = {
        eventName,
        entityType,
        entityId,
        context: enrichedContext,
        sessionId: sessionIdRef.current,
        timestamp: Date.now(),
        retryCount: 0,
      };

      // Send to PostHog immediately for client-side analytics
      if (posthog) {
        try {
          posthog.capture(eventName, {
            entityType,
            entityId,
            sessionId: sessionIdRef.current,
            ...enrichedContext,
            // Add PostHog-specific properties
            $set: {
              last_behavior_event: eventName,
              last_entity_type: entityType,
            },
          });
        } catch (posthogError) {
          // Don't fail the entire tracking if PostHog fails
          console.warn('PostHog tracking failed:', posthogError);
        }
      }

      // Add to queue for server-side tracking (only if user is authenticated)
      if (user) {
        eventQueue.current.push(behaviorEvent);

        // Flush immediately if buffer is full
        if (eventQueue.current.length >= bufferSize) {
          await flushEvents();
        } else {
          // Schedule flush if not already scheduled
          scheduleFlush();
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to track event';
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [
    isUserLoaded,
    user,
    posthog,
    bufferSize,
    flushEvents,
    scheduleFlush,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }

      // Attempt to flush remaining events on unmount
      if (eventQueue.current.length > 0) {
        flushEvents().catch(() => {
          // Ignore errors on unmount
        });
      }
    };
  }, [flushEvents]);

  // Flush events when user changes or component unmounts
  useEffect(() => {
    if (isUserLoaded && eventQueue.current.length > 0) {
      flushEvents().catch(() => {
        // Error handling is done in flushEvents
      });
    }
  }, [isUserLoaded, user?.id, flushEvents]);

  // Handle page visibility change to flush events when page becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && eventQueue.current.length > 0) {
        // Use sendBeacon for reliable delivery when page is being unloaded
        if (navigator.sendBeacon && user) {
          try {
            const eventsToSend = [...eventQueue.current];
            eventQueue.current = [];

            navigator.sendBeacon(
              '/api/behavior/events',
              JSON.stringify({
                events: eventsToSend.map(({ timestamp, retryCount, ...event }) => event),
              }),
            );
          } catch (error) {
            // Restore events to queue if sendBeacon fails
            eventQueue.current.unshift(...eventQueue.current);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  return {
    trackEvent,
    isLoading: state.isLoading,
    error: state.error,
    flushEvents,
  };
};

// Export types for external use
export type { TrackEventParams, UseBehaviorTrackingReturn };
