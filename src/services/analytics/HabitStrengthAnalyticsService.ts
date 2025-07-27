import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/libs/DB';
import {
  behavioralEventSchema,
  exerciseLogSchema,
  microBehaviorPatternSchema,
} from '@/models/Schema';

export type HabitStrengthCalculation = {
  habitStrength: number;
  consistencyScore: number;
  frequencyScore: number;
  contextScore: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  sampleSize: number;
  predictiveFactors: string[];
};

export type PatternRecognitionResult = {
  patternId: string;
  behaviorType: string;
  strength: number;
  frequency: number;
  consistency: number;
  triggers: string[];
  outcomes: string[];
  confidence: number;
  recommendation: string;
};

export type ContextAnalysisResult = {
  context: string;
  successRate: number;
  frequency: number;
  predictivePower: number;
  conditions: Record<string, any>;
  optimization: string;
};

export class HabitStrengthAnalyticsService {
  /**
   * Calculate comprehensive habit strength metrics for a user
   */
  static async calculateHabitStrength(
    userId: string,
    behaviorType?: string,
    timeRange: '7d' | '30d' | '90d' | '1y' = '30d',
  ): Promise<HabitStrengthCalculation> {
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

    // Get behavioral events for the period
    const behaviorEvents = await db
      .select()
      .from(behavioralEventSchema)
      .where(
        and(
          eq(behavioralEventSchema.userId, userId),
          gte(behavioralEventSchema.createdAt, startDate),
          lte(behavioralEventSchema.createdAt, endDate),
          behaviorType ? sql`${behavioralEventSchema.context}->>'behaviorType' = ${behaviorType}` : sql`true`,
        ),
      )
      .orderBy(desc(behavioralEventSchema.createdAt));

    // Get existing micro-behavior patterns
    const patterns = await db
      .select()
      .from(microBehaviorPatternSchema)
      .where(
        and(
          eq(microBehaviorPatternSchema.userId, userId),
          behaviorType ? eq(microBehaviorPatternSchema.behaviorType, behaviorType) : sql`true`,
        ),
      );

    // Calculate frequency score (0-100)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const eventDays = new Set(
      behaviorEvents.map(event =>
        new Date(event.createdAt).toDateString(),
      ),
    ).size;
    const frequencyScore = Math.min(100, (eventDays / totalDays) * 100);

    // Calculate consistency score using standard deviation of daily frequencies
    const dailyFrequencies = this.calculateDailyFrequencies(behaviorEvents, startDate, endDate);
    const consistencyScore = this.calculateConsistencyScore(dailyFrequencies);

    // Calculate context score based on successful patterns
    const contextScore = this.calculateContextScore(patterns);

    // Calculate overall habit strength (weighted average)
    const habitStrength = Math.round(
      (frequencyScore * 0.4)
      + (consistencyScore * 0.4)
      + (contextScore * 0.2),
    );

    // Calculate trend
    const trend = this.calculateTrend(behaviorEvents, timeRange);

    // Calculate confidence based on sample size and pattern consistency
    const confidence = this.calculateConfidence(behaviorEvents.length, consistencyScore);

    // Identify predictive factors
    const predictiveFactors = this.identifyPredictiveFactors(patterns);

    return {
      habitStrength,
      consistencyScore: Math.round(consistencyScore),
      frequencyScore: Math.round(frequencyScore),
      contextScore: Math.round(contextScore),
      trend,
      confidence: Math.round(confidence),
      sampleSize: behaviorEvents.length,
      predictiveFactors,
    };
  }

  /**
   * Advanced pattern recognition using statistical analysis
   */
  static async recognizePatterns(
    userId: string,
    behaviorType?: string,
    minConfidence = 70,
  ): Promise<PatternRecognitionResult[]> {
    // Get recent behavioral events with context
    const events = await db
      .select()
      .from(behavioralEventSchema)
      .where(
        and(
          eq(behavioralEventSchema.userId, userId),
          gte(behavioralEventSchema.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
          behaviorType ? sql`${behavioralEventSchema.context}->>'behaviorType' = ${behaviorType}` : sql`true`,
        ),
      )
      .orderBy(desc(behavioralEventSchema.createdAt));

    if (events.length < 5) {
      return []; // Need minimum data for pattern recognition
    }

    // Group events by behavior type
    const behaviorGroups = this.groupEventsByBehavior(events);
    const results: PatternRecognitionResult[] = [];

    for (const [behavior, behaviorEvents] of behaviorGroups) {
      // Analyze frequency patterns
      const frequencyAnalysis = this.analyzeFrequencyPatterns(behaviorEvents);

      // Analyze temporal patterns
      const temporalPatterns = this.analyzeTemporalPatterns(behaviorEvents);

      // Analyze context patterns
      const contextAnalysis = this.analyzeContextPatterns(behaviorEvents);

      // Calculate pattern strength
      const strength = this.calculatePatternStrength(
        frequencyAnalysis,
        temporalPatterns,
        contextAnalysis,
      );

      // Calculate confidence
      const confidence = this.calculatePatternConfidence(behaviorEvents, strength);

      if (confidence >= minConfidence) {
        results.push({
          patternId: `pattern_${behavior}_${Date.now()}`,
          behaviorType: behavior,
          strength: Math.round(strength),
          frequency: frequencyAnalysis.avgFrequency,
          consistency: temporalPatterns.consistency,
          triggers: contextAnalysis.triggers,
          outcomes: contextAnalysis.outcomes,
          confidence: Math.round(confidence),
          recommendation: this.generateRecommendation(behavior, strength, contextAnalysis),
        });
      }
    }

    return results;
  }

  /**
   * Analyze context patterns for workout success conditions
   */
  static async analyzeWorkoutContexts(
    userId: string,
    timeRange: '30d' | '90d' | '1y' = '90d',
  ): Promise<ContextAnalysisResult[]> {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
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

    // Get workout-related behavioral events
    const workoutEvents = await db
      .select()
      .from(behavioralEventSchema)
      .where(
        and(
          eq(behavioralEventSchema.userId, userId),
          gte(behavioralEventSchema.createdAt, startDate),
          lte(behavioralEventSchema.createdAt, endDate),
          sql`${behavioralEventSchema.context}->>'entityType' IN ('training_session', 'exercise_log', 'workout_completed')`,
        ),
      );

    // Get corresponding exercise logs for success metrics
    const exerciseLogs = await db
      .select()
      .from(exerciseLogSchema)
      .where(
        and(
          eq(exerciseLogSchema.userId, userId),
          gte(exerciseLogSchema.createdAt, startDate),
          lte(exerciseLogSchema.createdAt, endDate),
        ),
      );

    // Analyze context patterns
    const contextGroups = this.groupEventsByContext(workoutEvents);
    const results: ContextAnalysisResult[] = [];

    for (const [context, events] of contextGroups) {
      const successRate = this.calculateWorkoutSuccessRate(events, exerciseLogs);
      const frequency = events.length;
      const predictivePower = this.calculatePredictivePower(events, exerciseLogs);
      const conditions = this.extractContextConditions(events);
      const optimization = this.generateContextOptimization(context, successRate, conditions);

      results.push({
        context,
        successRate: Math.round(successRate),
        frequency,
        predictivePower: Math.round(predictivePower),
        conditions,
        optimization,
      });
    }

    // Sort by predictive power
    return results.sort((a, b) => b.predictivePower - a.predictivePower);
  }

  // Helper methods for calculations

  private static calculateDailyFrequencies(
    events: any[],
    startDate: Date,
    endDate: Date,
  ): number[] {
    const dailyMap = new Map<string, number>();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Initialize all days with 0
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dailyMap.set(date.toDateString(), 0);
    }

    // Count events per day
    events.forEach((event) => {
      const eventDate = new Date(event.createdAt).toDateString();
      dailyMap.set(eventDate, (dailyMap.get(eventDate) || 0) + 1);
    });

    return Array.from(dailyMap.values());
  }

  private static calculateConsistencyScore(dailyFrequencies: number[]): number {
    if (dailyFrequencies.length === 0) {
      return 0;
    }

    const mean = dailyFrequencies.reduce((sum, freq) => sum + freq, 0) / dailyFrequencies.length;
    const variance = dailyFrequencies.reduce((sum, freq) => sum + (freq - mean) ** 2, 0) / dailyFrequencies.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert to consistency score (lower std dev = higher consistency)
    const maxStdDev = Math.max(mean, 1); // Prevent division by zero
    return Math.max(0, 100 - (standardDeviation / maxStdDev) * 100);
  }

  private static calculateContextScore(patterns: any[]): number {
    if (patterns.length === 0) {
      return 0;
    }

    const avgStrength = patterns.reduce((sum, pattern) => sum + (pattern.strength || 0), 0) / patterns.length;
    const avgConfidence = patterns.reduce((sum, pattern) => sum + (pattern.confidence || 0), 0) / patterns.length;

    return (avgStrength + avgConfidence) / 2;
  }

  private static calculateTrend(
    events: any[],
    timeRange: string,
  ): 'increasing' | 'decreasing' | 'stable' {
    if (events.length < 4) {
      return 'stable';
    }

    const periods = timeRange === '7d' ? 2 : timeRange === '30d' ? 4 : 8;
    const periodLength = events.length / periods;

    let increasingPeriods = 0;
    let decreasingPeriods = 0;

    for (let i = 0; i < periods - 1; i++) {
      const currentPeriodCount = Math.floor(periodLength);
      const nextPeriodCount = Math.floor(periodLength);

      if (nextPeriodCount > currentPeriodCount) {
        increasingPeriods++;
      } else if (nextPeriodCount < currentPeriodCount) {
        decreasingPeriods++;
      }
    }

    if (increasingPeriods > decreasingPeriods) {
      return 'increasing';
    }
    if (decreasingPeriods > increasingPeriods) {
      return 'decreasing';
    }
    return 'stable';
  }

  private static calculateConfidence(sampleSize: number, consistency: number): number {
    // Confidence based on sample size and consistency
    const sampleConfidence = Math.min(100, (sampleSize / 30) * 100); // 30 events = 100% sample confidence
    const consistencyWeight = consistency / 100;

    return sampleConfidence * 0.7 + consistency * 0.3;
  }

  private static identifyPredictiveFactors(patterns: any[]): string[] {
    const factors: string[] = [];

    patterns.forEach((pattern) => {
      if (pattern.triggers && Array.isArray(pattern.triggers)) {
        factors.push(...pattern.triggers);
      }
      if (pattern.context && typeof pattern.context === 'object') {
        Object.keys(pattern.context).forEach((key) => {
          if (pattern.context[key] && typeof pattern.context[key] === 'string') {
            factors.push(pattern.context[key]);
          }
        });
      }
    });

    // Return unique factors, sorted by frequency
    const factorCounts = factors.reduce((acc, factor) => {
      acc[factor] = (acc[factor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(factorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([factor]) => factor);
  }

  private static groupEventsByBehavior(events: any[]): Map<string, any[]> {
    return events.reduce((groups, event) => {
      const behaviorType = event.context?.behaviorType || event.entityType || 'unknown';
      if (!groups.has(behaviorType)) {
        groups.set(behaviorType, []);
      }
      groups.get(behaviorType)!.push(event);
      return groups;
    }, new Map<string, any[]>());
  }

  private static analyzeFrequencyPatterns(events: any[]): { avgFrequency: number; pattern: string } {
    const dailyEvents = this.calculateDailyFrequencies(
      events,
      new Date(events[events.length - 1].createdAt),
      new Date(events[0].createdAt),
    );

    const avgFrequency = dailyEvents.reduce((sum, freq) => sum + freq, 0) / dailyEvents.length;

    // Simple pattern detection
    let pattern = 'irregular';
    if (avgFrequency >= 0.8) {
      pattern = 'daily';
    } else if (avgFrequency >= 0.4) {
      pattern = 'frequent';
    } else if (avgFrequency >= 0.1) {
      pattern = 'weekly';
    }

    return { avgFrequency, pattern };
  }

  private static analyzeTemporalPatterns(events: any[]): { consistency: number; peakTimes: string[] } {
    const hourCounts = Array.from({ length: 24 }).fill(0);
    const dayOfWeekCounts = Array.from({ length: 7 }).fill(0);

    events.forEach((event) => {
      const date = new Date(event.createdAt);
      hourCounts[date.getHours()]++;
      dayOfWeekCounts[date.getDay()]++;
    });

    // Calculate consistency based on temporal distribution
    const hourVariance = this.calculateVariance(hourCounts);
    const dayVariance = this.calculateVariance(dayOfWeekCounts);
    const consistency = Math.max(0, 100 - (hourVariance + dayVariance) / 2);

    // Identify peak times
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const peakTimes = [
      `${peakHour}:00`,
      dayNames[peakDay],
    ];

    return { consistency, peakTimes };
  }

  private static analyzeContextPatterns(events: any[]): { triggers: string[]; outcomes: string[] } {
    const triggers: string[] = [];
    const outcomes: string[] = [];

    events.forEach((event) => {
      const context = event.context || {};

      // Extract potential triggers
      if (context.mood) {
        triggers.push(`mood:${context.mood}`);
      }
      if (context.energyLevel) {
        triggers.push(`energy:${context.energyLevel}`);
      }
      if (context.location) {
        triggers.push(`location:${context.location}`);
      }
      if (context.timeOfDay) {
        triggers.push(`time:${context.timeOfDay}`);
      }

      // Extract outcomes
      if (context.outcome) {
        outcomes.push(context.outcome);
      }
      if (context.success !== undefined) {
        outcomes.push(`success:${context.success}`);
      }
    });

    return {
      triggers: [...new Set(triggers)].slice(0, 5),
      outcomes: [...new Set(outcomes)].slice(0, 3),
    };
  }

  private static calculatePatternStrength(
    frequency: any,
    temporal: any,
    context: any,
  ): number {
    const frequencyScore = Math.min(100, frequency.avgFrequency * 100);
    const temporalScore = temporal.consistency;
    const contextScore = Math.min(100, (context.triggers.length + context.outcomes.length) * 20);

    return (frequencyScore * 0.5) + (temporalScore * 0.3) + (contextScore * 0.2);
  }

  private static calculatePatternConfidence(events: any[], strength: number): number {
    const sampleSize = events.length;
    const timeSpan = new Date(events[0].createdAt).getTime() - new Date(events[events.length - 1].createdAt).getTime();
    const days = Math.ceil(timeSpan / (1000 * 60 * 60 * 24));

    const sampleConfidence = Math.min(100, (sampleSize / Math.max(days, 1)) * 100);
    const strengthConfidence = strength;

    return (sampleConfidence * 0.6) + (strengthConfidence * 0.4);
  }

  private static generateRecommendation(
    behaviorType: string,
    strength: number,
    contextAnalysis: any,
  ): string {
    if (strength >= 80) {
      return `Excellent ${behaviorType} habit! Focus on maintaining consistency.`;
    } else if (strength >= 60) {
      return `Good ${behaviorType} pattern. Try optimizing for ${contextAnalysis.triggers[0] || 'better timing'}.`;
    } else if (strength >= 40) {
      return `Developing ${behaviorType} habit. Increase frequency and consistency.`;
    } else {
      return `Focus on establishing a regular ${behaviorType} routine. Start small and be consistent.`;
    }
  }

  private static groupEventsByContext(events: any[]): Map<string, any[]> {
    return events.reduce((groups, event) => {
      const context = this.extractPrimaryContext(event);
      if (!groups.has(context)) {
        groups.set(context, []);
      }
      groups.get(context)!.push(event);
      return groups;
    }, new Map<string, any[]>());
  }

  private static extractPrimaryContext(event: any): string {
    const context = event.context || {};

    // Priority order for context extraction
    if (context.timeOfDay) {
      return `time:${context.timeOfDay}`;
    }
    if (context.location) {
      return `location:${context.location}`;
    }
    if (context.mood) {
      return `mood:${context.mood}`;
    }
    if (context.energyLevel) {
      return `energy:${context.energyLevel}`;
    }

    return 'general';
  }

  private static calculateWorkoutSuccessRate(workoutEvents: any[], exerciseLogs: any[]): number {
    // Define success criteria (completed workouts, achieved targets, etc.)
    let successfulWorkouts = 0;
    const totalWorkouts = workoutEvents.length;

    workoutEvents.forEach((event) => {
      const relatedLogs = exerciseLogs.filter(log =>
        Math.abs(new Date(log.createdAt).getTime() - new Date(event.createdAt).getTime()) < 2 * 60 * 60 * 1000, // Within 2 hours
      );

      // Consider workout successful if:
      // 1. Has related exercise logs
      // 2. RPE indicates satisfactory effort (>= 6)
      // 3. Completed planned exercises
      const hasLogs = relatedLogs.length > 0;
      const goodEffort = relatedLogs.some(log => log.rpe >= 6);
      const completed = event.context?.completed || event.context?.success;

      if ((hasLogs && goodEffort) || completed) {
        successfulWorkouts++;
      }
    });

    return totalWorkouts > 0 ? (successfulWorkouts / totalWorkouts) * 100 : 0;
  }

  private static calculatePredictivePower(events: any[], exerciseLogs: any[]): number {
    // Calculate how well this context predicts workout success
    const contextSuccessRate = this.calculateWorkoutSuccessRate(events, exerciseLogs);
    const overallSuccessRate = this.calculateWorkoutSuccessRate(
      events, // This would ideally be all workout events, simplified for this example
      exerciseLogs,
    );

    // Predictive power is how much better this context performs vs average
    const improvement = contextSuccessRate - overallSuccessRate;
    return Math.max(0, Math.min(100, 50 + improvement)); // Normalized to 0-100
  }

  private static extractContextConditions(events: any[]): Record<string, any> {
    const conditions: Record<string, any> = {};

    events.forEach((event) => {
      const context = event.context || {};
      Object.keys(context).forEach((key) => {
        if (!conditions[key]) {
          conditions[key] = [];
        }
        conditions[key].push(context[key]);
      });
    });

    // Get most common values for each condition
    Object.keys(conditions).forEach((key) => {
      const values = conditions[key];
      const counts = values.reduce((acc: Record<string, number>, val: any) => {
        const strVal = String(val);
        acc[strVal] = (acc[strVal] || 0) + 1;
        return acc;
      }, {});

      const mostCommon = Object.entries(counts)
        .sort(([, a], [, b]) => (b as number) - (a as number))[0];

      conditions[key] = mostCommon ? mostCommon[0] : null;
    });

    return conditions;
  }

  private static generateContextOptimization(
    context: string,
    successRate: number,
    conditions: Record<string, any>,
  ): string {
    if (successRate >= 80) {
      return `Excellent context! Maintain these conditions: ${Object.entries(conditions)
        .slice(0, 3)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')}`;
    } else if (successRate >= 60) {
      return `Good context. Try optimizing ${Object.keys(conditions)[0] || 'timing'} for better results.`;
    } else {
      return `Consider changing context conditions or avoiding ${context} for workouts.`;
    }
  }

  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    return variance;
  }
}
