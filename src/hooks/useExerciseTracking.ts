'use client';

import { useCallback } from 'react';
import { useBehaviorTracking } from './useBehaviorTracking';
import type { ExerciseEventType, ExerciseContextData } from './useBehaviorTracking';

export const useExerciseTracking = () => {
  const { trackEvent } = useBehaviorTracking();

  const trackExerciseEvent = useCallback(
    async (
      eventName: ExerciseEventType,
      entityType: 'exercise_log' | 'exercise_plan' | 'exercise_goal' | 'training_session',
      entityId: number,
      exerciseData: ExerciseContextData,
      additionalContext?: any
    ) => {
      const context = {
        ...additionalContext,
        exerciseData,
        ui: {
          ...additionalContext?.ui,
          route: window.location.pathname,
        },
        environment: {
          ...additionalContext?.environment,
          timestamp: new Date(),
        },
      };

      await trackEvent({
        eventName,
        entityType,
        entityId,
        context
      });
    },
    [trackEvent]
  );

  /**
   * Track workout completion
   */
  const trackWorkoutCompleted = useCallback(
    async (
      sessionId: number,
      duration: number,
      exercises: Array<{
        exerciseId: number;
        sets: number;
        reps: number;
        weight: number;
        volume: number;
      }>,
      intensity: 'low' | 'moderate' | 'high' = 'moderate'
    ) => {
      const totalVolume = exercises.reduce((sum, ex) => sum + ex.volume, 0);
      const avgWeight = exercises.reduce((sum, ex) => sum + ex.weight, 0) / exercises.length;
      
      await trackExerciseEvent(
        'exercise_workout_completed',
        'training_session',
        sessionId,
        {
          duration,
          intensity,
          sessionId,
          volume: totalVolume,
          weight: avgWeight,
          sets: exercises.reduce((sum, ex) => sum + ex.sets, 0),
          reps: exercises.reduce((sum, ex) => sum + ex.reps, 0),
        }
      );
    },
    [trackExerciseEvent]
  );

  /**
   * Track exercise habit
   */
  const trackExerciseHabit = useCallback(
    async (
      goalId: number,
      completed: boolean,
      consistency: number,
      pattern: string,
      exerciseType: string
    ) => {
      await trackExerciseEvent(
        'exercise_habit_tracked',
        'exercise_goal',
        goalId,
        {
          goalId,
          consistency,
          pattern,
          exerciseType,
          completionRate: completed ? 1 : 0,
        }
      );
    },
    [trackExerciseEvent]
  );

  /**
   * Track exercise consistency measurement
   */
  const trackExerciseConsistency = useCallback(
    async (
      planId: number,
      frequency: number,
      completionRate: number,
      difficulty: 'beginner' | 'intermediate' | 'advanced'
    ) => {
      await trackExerciseEvent(
        'exercise_consistency_measured',
        'exercise_plan',
        planId,
        {
          planId,
          frequency,
          completionRate,
          difficulty,
        }
      );
    },
    [trackExerciseEvent]
  );

  /**
   * Track exercise goal creation
   */
  const trackExerciseGoalCreated = useCallback(
    async (
      goalId: number,
      exerciseType: string,
      targetValue: number,
      unit: string
    ) => {
      await trackExerciseEvent(
        'exercise_goal_created',
        'exercise_goal',
        goalId,
        {
          goalId,
          exerciseType,
        },
        {
          custom: {
            targetValue,
            unit,
          },
        }
      );
    },
    [trackExerciseEvent]
  );

  /**
   * Track exercise goal achievement
   */
  const trackExerciseGoalAchieved = useCallback(
    async (
      goalId: number,
      exerciseType: string,
      actualValue: number,
      targetValue: number
    ) => {
      await trackExerciseEvent(
        'exercise_goal_achieved',
        'exercise_goal',
        goalId,
        {
          goalId,
          exerciseType,
          completionRate: 1,
        },
        {
          custom: {
            actualValue,
            targetValue,
            achievementRate: actualValue / targetValue,
          },
        }
      );
    },
    [trackExerciseEvent]
  );

  /**
   * Track exercise stats viewing
   */
  const trackExerciseStatsViewed = useCallback(
    async (
      statsType: 'workout_frequency' | 'strength_progress' | 'volume_trends' | 'consistency',
      timeRange: 'week' | 'month' | 'quarter' | 'year'
    ) => {
      await trackEvent({
        eventName: 'exercise_stats_viewed',
        entityType: 'ui_interaction',
        entityId: undefined,
        context: {
          ui: {
            componentName: 'ExerciseAnalytics',
            action: 'view_stats',
          },
          exerciseData: {
            pattern: statsType,
          },
          custom: {
            statsType,
            timeRange,
          },
        }
      });
    },
    [trackEvent]
  );

  /**
   * Track exercise progress viewing
   */
  const trackExerciseProgressViewed = useCallback(
    async (
      exerciseId: number,
      progressType: 'strength' | 'volume' | 'frequency' | 'consistency'
    ) => {
      await trackEvent({
        eventName: 'exercise_progress_viewed',
        entityType: 'exercise_log',
        entityId: exerciseId,
        context: {
          ui: {
            componentName: 'ExerciseAnalytics',
            action: 'view_progress',
          },
          exerciseData: {
            exerciseId,
          },
          custom: {
            progressType,
          },
        }
      });
    },
    [trackEvent]
  );

  // Export all exercise-specific tracking functions
  return {
    trackExerciseEvent,
    trackWorkoutCompleted,
    trackExerciseHabit,
    trackExerciseConsistency,
    trackExerciseGoalCreated,
    trackExerciseGoalAchieved,
    trackExerciseStatsViewed,
    trackExerciseProgressViewed,
  };
};