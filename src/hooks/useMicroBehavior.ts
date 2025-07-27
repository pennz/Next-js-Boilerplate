'use client';

import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Env } from '@/libs/Env';
import { useBehaviorTracking } from './useBehaviorTracking';

// Types for micro-behavior tracking
type MicroBehaviorData = {
  behaviorType: string;
  intensity: 'low' | 'medium' | 'high';
  duration?: number;
  frequency?: number;
  triggers?: string[];
  outcomes?: string[];
  metadata?: Record<string, any>;
};

type ContextData = {
  environmental?: {
    location?: string;
    weather?: string;
    noise_level?: 'quiet' | 'moderate' | 'loud';
    lighting?: 'dim' | 'normal' | 'bright';
    temperature?: number;
  };
  situational?: {
    time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
    day_of_week?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    social_context?: 'alone' | 'with_others' | 'group';
    activity_before?: string;
    mood?: 'positive' | 'neutral' | 'negative';
    energy_level?: 'low' | 'medium' | 'high';
  };
  technical?: {
    device_type?: 'mobile' | 'tablet' | 'desktop';
    app_state?: string;
    session_duration?: number;
    interaction_count?: number;
  };
};

type BehaviorPattern = {
  id: string;
  behaviorType: string;
  frequency: number;
  consistency: number;
  strength: 'weak' | 'moderate' | 'strong';
  triggers: string[];
  outcomes: string[];
  context: ContextData;
  timeframe: {
    start: Date;
    end: Date;
  };
  confidence: number;
};

type ContextPattern = {
  id: string;
  contextType: string;
  frequency: number;
  correlation: number;
  associatedBehaviors: string[];
  timeframe: {
    start: Date;
    end: Date;
  };
};

type PatternFilters = {
  behaviorType?: string;
  strength?: 'weak' | 'moderate' | 'strong';
  timeframe?: {
    start: Date;
    end: Date;
  };
  minConfidence?: number;
};

type RealtimeInsight = {
  type: 'pattern' | 'anomaly' | 'prediction' | 'recommendation';
  message: string;
  confidence: number;
  actionable: boolean;
  data?: Record<string, any>;
};

type Anomaly = {
  id: string;
  behaviorType: string;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
};

type BehaviorPrediction = {
  behaviorType: string;
  probability: number;
  timeframe: string;
  confidence: number;
  factors: string[];
};

type MicroBehaviorState = {
  isLoading: boolean;
  error: string | null;
  isAnalyzing: boolean;
  lastAnalysis: Date | null;
};

type UseMicroBehaviorReturn = {
  // Pattern Detection
  trackMicroBehavior: (behavior: MicroBehaviorData) => Promise<void>;
  getPatterns: (filters?: PatternFilters) => Promise<BehaviorPattern[]>;
  analyzePatterns: (timeframe?: { start: Date; end: Date }) => Promise<RealtimeInsight[]>;

  // Context Tracking
  trackContext: (contextData: ContextData) => Promise<void>;
  getContextPatterns: () => Promise<ContextPattern[]>;
  correlateContextBehavior: () => Promise<{ context: string; behavior: string; correlation: number }[]>;

  // Real-time Analysis
  getRealtimeInsights: () => Promise<RealtimeInsight[]>;
  detectAnomalies: () => Promise<Anomaly[]>;
  getPredictions: () => Promise<BehaviorPrediction[]>;

  // State
  isLoading: boolean;
  error: string | null;
  isAnalyzing: boolean;
  lastAnalysis: Date | null;

  // Utility
  flushMicroBehaviors: () => Promise<void>;
};

// Internal queued micro-behavior structure
type QueuedMicroBehavior = {
  timestamp: number;
  sessionId: string;
  context: ContextData;
  retryCount: number;
} & MicroBehaviorData;

type QueuedContext = {
  timestamp: number;
  sessionId: string;
  retryCount: number;
} & ContextData;

// Session ID generation
const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `micro_session_${timestamp}_${randomPart}`;
};

// Auto-detect context from environment
const detectEnvironmentalContext = (): ContextData['environmental'] => {
  if (typeof window === 'undefined') {
    return {};
  }

  const now = new Date();
  const hour = now.getHours();

  return {
    lighting: hour >= 6 && hour <= 18 ? 'normal' : 'dim',
    // Note: Real implementations would use device sensors or user input
  };
};

const detectSituationalContext = (): ContextData['situational'] => {
  if (typeof window === 'undefined') {
    return {};
  }

  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.toLocaleLowerCase().substring(0, 3) as any;

  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
  } else if (hour >= 17 && hour < 22) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }

  return {
    time_of_day: timeOfDay,
    day_of_week: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()] as any,
  };
};

const detectTechnicalContext = (): ContextData['technical'] => {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    device_type: window.innerWidth < 768
      ? 'mobile'
      : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    session_duration: performance.now(),
  };
};

export const useMicroBehavior = (): UseMicroBehaviorReturn => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { trackEvent } = useBehaviorTracking();

  // State management
  const [state, setState] = useState<MicroBehaviorState>({
    isLoading: false,
    error: null,
    isAnalyzing: false,
    lastAnalysis: null,
  });

  // Queues for batching
  const microBehaviorQueue = useRef<QueuedMicroBehavior[]>([]);
  const contextQueue = useRef<QueuedContext[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());
  const isFlushingRef = useRef<boolean>(false);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Configuration from environment
  const bufferSize = Env.NEXT_PUBLIC_MICRO_BEHAVIOR_BUFFER_SIZE || 20;
  const autoSaveInterval = Env.NEXT_PUBLIC_PROFILE_AUTO_SAVE_INTERVAL || 60000;

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Flush micro-behaviors to server
  const flushMicroBehaviorsToServer = useCallback(async (
    behaviors: QueuedMicroBehavior[],
    contexts: QueuedContext[],
  ): Promise<void> => {
    if (!isUserLoaded || !user || (behaviors.length === 0 && contexts.length === 0)) {
      return;
    }

    try {
      const response = await fetch('/api/behavior/micro-patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          microBehaviors: behaviors.map(({ timestamp, retryCount, ...behavior }) => behavior),
          contexts: contexts.map(({ timestamp, retryCount, ...context }) => context),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      // Re-queue with retry logic
      const retriableBehaviors = behaviors
        .filter(behavior => behavior.retryCount < 3)
        .map(behavior => ({ ...behavior, retryCount: behavior.retryCount + 1 }));

      const retriableContexts = contexts
        .filter(context => context.retryCount < 3)
        .map(context => ({ ...context, retryCount: context.retryCount + 1 }));

      if (retriableBehaviors.length > 0) {
        microBehaviorQueue.current.unshift(...retriableBehaviors);
      }
      if (retriableContexts.length > 0) {
        contextQueue.current.unshift(...retriableContexts);
      }

      throw error;
    }
  }, [isUserLoaded, user]);

  // Flush micro-behaviors function
  const flushMicroBehaviors = useCallback(async (): Promise<void> => {
    if (isFlushingRef.current || (microBehaviorQueue.current.length === 0 && contextQueue.current.length === 0)) {
      return;
    }

    isFlushingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const behaviorsToFlush = [...microBehaviorQueue.current];
      const contextsToFlush = [...contextQueue.current];
      microBehaviorQueue.current = [];
      contextQueue.current = [];

      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }

      await flushMicroBehaviorsToServer(behaviorsToFlush, contextsToFlush);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to flush micro-behaviors';
      setState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
      isFlushingRef.current = false;
    }
  }, [flushMicroBehaviorsToServer]);

  // Schedule automatic flush
  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }

    flushTimeoutRef.current = setTimeout(() => {
      flushMicroBehaviors().catch(() => {
        // Error handling is done in flushMicroBehaviors
      });
    }, autoSaveInterval);
  }, [flushMicroBehaviors, autoSaveInterval]);

  // Track micro-behavior
  const trackMicroBehavior = useCallback(async (behavior: MicroBehaviorData): Promise<void> => {
    if (!isUserLoaded) {
      return;
    }

    try {
      // Auto-detect context if not provided
      const autoContext: ContextData = {
        environmental: detectEnvironmentalContext(),
        situational: detectSituationalContext(),
        technical: detectTechnicalContext(),
      };

      const queuedBehavior: QueuedMicroBehavior = {
        ...behavior,
        timestamp: Date.now(),
        sessionId: sessionIdRef.current,
        context: autoContext,
        retryCount: 0,
      };

      // Track as regular behavior event for integration
      await trackEvent({
        eventName: `micro_behavior_${behavior.behaviorType}`,
        entityType: 'user',
        context: {
          microBehavior: behavior,
          autoDetectedContext: autoContext,
        },
      });

      // Add to micro-behavior queue
      if (user) {
        microBehaviorQueue.current.push(queuedBehavior);

        if (microBehaviorQueue.current.length >= bufferSize) {
          await flushMicroBehaviors();
        } else {
          scheduleFlush();
        }
      }

      // Trigger automatic pattern analysis if enough data
      if (microBehaviorQueue.current.length % 10 === 0) {
        schedulePatternAnalysis();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to track micro-behavior';
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [isUserLoaded, user, trackEvent, bufferSize, flushMicroBehaviors, scheduleFlush]);

  // Track context
  const trackContext = useCallback(async (contextData: ContextData): Promise<void> => {
    if (!isUserLoaded || !user) {
      return;
    }

    try {
      const queuedContext: QueuedContext = {
        ...contextData,
        timestamp: Date.now(),
        sessionId: sessionIdRef.current,
        retryCount: 0,
      };

      contextQueue.current.push(queuedContext);

      if (contextQueue.current.length >= bufferSize) {
        await flushMicroBehaviors();
      } else {
        scheduleFlush();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to track context';
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [isUserLoaded, user, bufferSize, flushMicroBehaviors, scheduleFlush]);

  // Get patterns
  const getPatterns = useCallback(async (filters?: PatternFilters): Promise<BehaviorPattern[]> => {
    if (!isUserLoaded || !user) {
      return [];
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const queryParams = new URLSearchParams();
      if (filters?.behaviorType) {
        queryParams.append('behaviorType', filters.behaviorType);
      }
      if (filters?.strength) {
        queryParams.append('strength', filters.strength);
      }
      if (filters?.minConfidence) {
        queryParams.append('minConfidence', filters.minConfidence.toString());
      }
      if (filters?.timeframe) {
        queryParams.append('startDate', filters.timeframe.start.toISOString());
        queryParams.append('endDate', filters.timeframe.end.toISOString());
      }

      const response = await fetch(`/api/behavior/micro-patterns?${queryParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch patterns: ${response.status}`);
      }

      const data = await response.json();
      return data.patterns || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get patterns';
      setState(prev => ({ ...prev, error: errorMessage }));
      return [];
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isUserLoaded, user]);

  // Schedule pattern analysis
  const schedulePatternAnalysis = useCallback(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    analysisTimeoutRef.current = setTimeout(() => {
      analyzePatterns().catch(() => {
        // Error handling is done in analyzePatterns
      });
    }, 5000); // Analyze patterns 5 seconds after new data
  }, []);

  // Analyze patterns
  const analyzePatterns = useCallback(async (timeframe?: { start: Date; end: Date }): Promise<RealtimeInsight[]> => {
    if (!isUserLoaded || !user) {
      return [];
    }

    try {
      setState(prev => ({ ...prev, isAnalyzing: true }));

      const body: any = {};
      if (timeframe) {
        body.timeframe = timeframe;
      }

      const response = await fetch('/api/behavior/micro-patterns/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze patterns: ${response.status}`);
      }

      const data = await response.json();
      setState(prev => ({ ...prev, lastAnalysis: new Date() }));
      return data.insights || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze patterns';
      setState(prev => ({ ...prev, error: errorMessage }));
      return [];
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [isUserLoaded, user]);

  // Get context patterns
  const getContextPatterns = useCallback(async (): Promise<ContextPattern[]> => {
    if (!isUserLoaded || !user) {
      return [];
    }

    try {
      const response = await fetch('/api/behavior/micro-patterns/context');
      if (!response.ok) {
        throw new Error(`Failed to fetch context patterns: ${response.status}`);
      }

      const data = await response.json();
      return data.contextPatterns || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get context patterns';
      setState(prev => ({ ...prev, error: errorMessage }));
      return [];
    }
  }, [isUserLoaded, user]);

  // Correlate context and behavior
  const correlateContextBehavior = useCallback(async (): Promise<{ context: string; behavior: string; correlation: number }[]> => {
    if (!isUserLoaded || !user) {
      return [];
    }

    try {
      const response = await fetch('/api/behavior/micro-patterns/correlations');
      if (!response.ok) {
        throw new Error(`Failed to fetch correlations: ${response.status}`);
      }

      const data = await response.json();
      return data.correlations || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to correlate context and behavior';
      setState(prev => ({ ...prev, error: errorMessage }));
      return [];
    }
  }, [isUserLoaded, user]);

  // Get real-time insights
  const getRealtimeInsights = useCallback(async (): Promise<RealtimeInsight[]> => {
    if (!isUserLoaded || !user) {
      return [];
    }

    try {
      const response = await fetch('/api/behavior/micro-patterns/insights');
      if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.status}`);
      }

      const data = await response.json();
      return data.insights || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get real-time insights';
      setState(prev => ({ ...prev, error: errorMessage }));
      return [];
    }
  }, [isUserLoaded, user]);

  // Detect anomalies
  const detectAnomalies = useCallback(async (): Promise<Anomaly[]> => {
    if (!isUserLoaded || !user) {
      return [];
    }

    try {
      const response = await fetch('/api/behavior/micro-patterns/anomalies');
      if (!response.ok) {
        throw new Error(`Failed to detect anomalies: ${response.status}`);
      }

      const data = await response.json();
      return data.anomalies || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to detect anomalies';
      setState(prev => ({ ...prev, error: errorMessage }));
      return [];
    }
  }, [isUserLoaded, user]);

  // Get predictions
  const getPredictions = useCallback(async (): Promise<BehaviorPrediction[]> => {
    if (!isUserLoaded || !user) {
      return [];
    }

    try {
      const response = await fetch('/api/behavior/micro-patterns/predictions');
      if (!response.ok) {
        throw new Error(`Failed to get predictions: ${response.status}`);
      }

      const data = await response.json();
      return data.predictions || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get predictions';
      setState(prev => ({ ...prev, error: errorMessage }));
      return [];
    }
  }, [isUserLoaded, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }

      // Attempt to flush remaining data on unmount
      if (microBehaviorQueue.current.length > 0 || contextQueue.current.length > 0) {
        flushMicroBehaviors().catch(() => {
          // Ignore errors on unmount
        });
      }
    };
  }, [flushMicroBehaviors]);

  // Flush when user changes
  useEffect(() => {
    if (isUserLoaded && (microBehaviorQueue.current.length > 0 || contextQueue.current.length > 0)) {
      flushMicroBehaviors().catch(() => {
        // Error handling is done in flushMicroBehaviors
      });
    }
  }, [isUserLoaded, user?.id, flushMicroBehaviors]);

  // Handle page visibility change for reliable data delivery
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden'
        && (microBehaviorQueue.current.length > 0 || contextQueue.current.length > 0)
        && user) {
        if (navigator.sendBeacon) {
          try {
            const behaviorsToSend = [...microBehaviorQueue.current];
            const contextsToSend = [...contextQueue.current];
            microBehaviorQueue.current = [];
            contextQueue.current = [];

            navigator.sendBeacon(
              '/api/behavior/micro-patterns',
              JSON.stringify({
                microBehaviors: behaviorsToSend.map(({ timestamp, retryCount, ...behavior }) => behavior),
                contexts: contextsToSend.map(({ timestamp, retryCount, ...context }) => context),
              }),
            );
          } catch (error) {
            // Restore queues if sendBeacon fails
            microBehaviorQueue.current.unshift(...microBehaviorQueue.current);
            contextQueue.current.unshift(...contextQueue.current);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  return {
    // Pattern Detection
    trackMicroBehavior,
    getPatterns,
    analyzePatterns,

    // Context Tracking
    trackContext,
    getContextPatterns,
    correlateContextBehavior,

    // Real-time Analysis
    getRealtimeInsights,
    detectAnomalies,
    getPredictions,

    // State
    isLoading: state.isLoading,
    error: state.error,
    isAnalyzing: state.isAnalyzing,
    lastAnalysis: state.lastAnalysis,

    // Utility
    flushMicroBehaviors,
  };
};

// Export types for external use
export type {
  Anomaly,
  BehaviorPattern,
  BehaviorPrediction,
  ContextData,
  ContextPattern,
  MicroBehaviorData,
  PatternFilters,
  RealtimeInsight,
  UseMicroBehaviorReturn,
};
