import { and, desc, eq, gte, lte, asc, sql, count, avg, sum } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { 
  microBehaviorPatternSchema, 
  contextPatternSchema,
  behavioralEventSchema,
  userProfileSchema
} from '@/models/Schema';
import { logger } from '@/libs/Logger';

// Types for micro-behavior data structures
export interface MicroBehaviorData {
  behaviorType: string;
  frequency: number;
  frequencyPeriod: 'day' | 'week' | 'month';
  triggers?: Record<string, any>;
  outcomes?: Record<string, any>;
  context?: Record<string, any>;
}

export interface ContextData {
  contextType: 'environmental' | 'temporal' | 'social' | 'emotional';
  contextName: string;
  contextData: Record<string, any>;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  location?: string;
  weather?: string;
  mood?: string;
  energyLevel?: number;
  stressLevel?: number;
  socialContext?: string;
}

export interface PatternFilters {
  behaviorType?: string;
  patternName?: string;
  isActive?: boolean;
  minStrength?: number;
  minConfidence?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'strength' | 'confidence' | 'frequency' | 'lastObserved' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ContextFilters {
  contextType?: string;
  contextName?: string;
  timeOfDay?: string;
  dayOfWeek?: string;
  isActive?: boolean;
  minPredictivePower?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'predictivePower' | 'frequency' | 'lastObserved' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface BehaviorInsight {
  type: 'pattern' | 'correlation' | 'anomaly' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  recommendations?: string[];
  data?: Record<string, any>;
}

export class MicroBehaviorService {
  /**
   * Analyze user behavior for patterns and trends
   */
  static async detectPatterns(userId: string, timeframe?: { startDate: Date; endDate: Date }): Promise<any[]> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const whereConditions = [eq(behavioralEventSchema.userId, userId)];

      if (timeframe?.startDate) {
        whereConditions.push(gte(behavioralEventSchema.createdAt, timeframe.startDate));
      }

      if (timeframe?.endDate) {
        whereConditions.push(lte(behavioralEventSchema.createdAt, timeframe.endDate));
      }

      // Get behavioral events for pattern analysis
      const events = await db
        .select({
          eventName: behavioralEventSchema.eventName,
          entityType: behavioralEventSchema.entityType,
          context: behavioralEventSchema.context,
          createdAt: behavioralEventSchema.createdAt,
        })
        .from(behavioralEventSchema)
        .where(and(...whereConditions))
        .orderBy(desc(behavioralEventSchema.createdAt));

      // Analyze patterns using statistical methods
      const patterns = this.analyzeEventPatterns(events);

      // Store detected patterns
      const detectedPatterns = [];
      for (const pattern of patterns) {
        if (pattern.confidence >= 70) { // Only store high-confidence patterns
          const storedPattern = await this.createPattern(userId, {
            patternName: pattern.name,
            behaviorType: pattern.type,
            frequency: pattern.frequency,
            frequencyPeriod: pattern.period,
            triggers: pattern.triggers,
            outcomes: pattern.outcomes,
            context: pattern.context,
          });
          detectedPatterns.push(storedPattern);
        }
      }

      logger.info('Patterns detected and analyzed', { 
        userId, 
        totalEvents: events.length,
        patternsDetected: patterns.length,
        patternsStored: detectedPatterns.length,
        timeframe
      });

      return detectedPatterns;
    } catch (error) {
      logger.error('Failed to detect patterns', { 
        userId, 
        timeframe,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create new behavior pattern record
   */
  static async createPattern(userId: string, patternData: MicroBehaviorData): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    if (!patternData.behaviorType || !patternData.frequency) {
      throw new Error('Behavior type and frequency are required');
    }

    try {
      // Calculate pattern strength and confidence
      const strength = this.calculatePatternStrength(patternData);
      const confidence = this.calculatePatternConfidence(patternData);

      const patternToInsert = {
        userId,
        patternName: `${patternData.behaviorType}_pattern_${Date.now()}`,
        behaviorType: patternData.behaviorType,
        frequency: patternData.frequency,
        frequencyPeriod: patternData.frequencyPeriod,
        consistency: 0, // Will be updated as more data is collected
        strength,
        triggers: patternData.triggers ? JSON.stringify(patternData.triggers) : null,
        outcomes: patternData.outcomes ? JSON.stringify(patternData.outcomes) : null,
        context: patternData.context ? JSON.stringify(patternData.context) : null,
        correlations: null, // Will be calculated later
        confidence,
        sampleSize: 1,
        firstObserved: new Date(),
        lastObserved: new Date(),
        isActive: true,
      };

      const [insertedPattern] = await db
        .insert(microBehaviorPatternSchema)
        .values(patternToInsert)
        .returning();

      logger.info('Micro-behavior pattern created', { 
        userId, 
        patternId: insertedPattern.id,
        behaviorType: patternData.behaviorType,
        strength,
        confidence
      });

      return insertedPattern;
    } catch (error) {
      logger.error('Failed to create pattern', { 
        userId, 
        patternData,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update existing pattern
   */
  static async updatePattern(userId: string, patternId: number, updates: Partial<MicroBehaviorData>): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    if (!patternId || patternId <= 0) {
      throw new Error('Invalid pattern ID');
    }

    try {
      // Verify pattern ownership
      const existingPattern = await db.query.microBehaviorPatternSchema.findFirst({
        where: and(
          eq(microBehaviorPatternSchema.id, patternId),
          eq(microBehaviorPatternSchema.userId, userId)
        ),
      });

      if (!existingPattern) {
        throw new Error('Pattern not found or access denied');
      }

      // Prepare updates
      const updateData: any = {
        lastObserved: new Date(),
        sampleSize: existingPattern.sampleSize + 1,
      };

      if (updates.frequency !== undefined) {
        updateData.frequency = updates.frequency;
      }

      if (updates.triggers !== undefined) {
        updateData.triggers = JSON.stringify(updates.triggers);
      }

      if (updates.outcomes !== undefined) {
        updateData.outcomes = JSON.stringify(updates.outcomes);
      }

      if (updates.context !== undefined) {
        updateData.context = JSON.stringify(updates.context);
      }

      // Recalculate strength and confidence
      if (updates.frequency !== undefined) {
        updateData.strength = this.calculatePatternStrength({ ...existingPattern, ...updates });
        updateData.confidence = this.calculatePatternConfidence({ ...existingPattern, ...updates });
      }

      const [updatedPattern] = await db
        .update(microBehaviorPatternSchema)
        .set(updateData)
        .where(eq(microBehaviorPatternSchema.id, patternId))
        .returning();

      logger.info('Micro-behavior pattern updated', { 
        userId, 
        patternId,
        updates: Object.keys(updates)
      });

      return updatedPattern;
    } catch (error) {
      logger.error('Failed to update pattern', { 
        userId, 
        patternId,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Retrieve patterns with filtering and pagination
   */
  static async getPatterns(userId: string, filters?: PatternFilters): Promise<any[]> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const whereConditions = [eq(microBehaviorPatternSchema.userId, userId)];

      if (filters?.behaviorType) {
        whereConditions.push(eq(microBehaviorPatternSchema.behaviorType, filters.behaviorType));
      }

      if (filters?.patternName) {
        whereConditions.push(eq(microBehaviorPatternSchema.patternName, filters.patternName));
      }

      if (filters?.isActive !== undefined) {
        whereConditions.push(eq(microBehaviorPatternSchema.isActive, filters.isActive));
      }

      if (filters?.minStrength !== undefined) {
        whereConditions.push(gte(microBehaviorPatternSchema.strength, filters.minStrength));
      }

      if (filters?.minConfidence !== undefined) {
        whereConditions.push(gte(microBehaviorPatternSchema.confidence, filters.minConfidence));
      }

      if (filters?.startDate) {
        whereConditions.push(gte(microBehaviorPatternSchema.firstObserved, filters.startDate));
      }

      if (filters?.endDate) {
        whereConditions.push(lte(microBehaviorPatternSchema.lastObserved, filters.endDate));
      }

      // Build order by
      const sortBy = filters?.sortBy || 'lastObserved';
      const sortOrder = filters?.sortOrder || 'desc';
      const orderBy = sortOrder === 'asc' 
        ? asc(microBehaviorPatternSchema[sortBy])
        : desc(microBehaviorPatternSchema[sortBy]);

      const patterns = await db
        .select()
        .from(microBehaviorPatternSchema)
        .where(and(...whereConditions))
        .orderBy(orderBy)
        .limit(filters?.limit || 100)
        .offset(filters?.offset || 0);

      logger.debug('Micro-behavior patterns retrieved', { 
        userId, 
        patternCount: patterns.length,
        filters
      });

      return patterns;
    } catch (error) {
      logger.error('Failed to retrieve patterns', { 
        userId, 
        filters,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Analyze environmental and situational context
   */
  static async analyzeContext(userId: string, contextData: ContextData): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    if (!contextData.contextType || !contextData.contextName) {
      throw new Error('Context type and name are required');
    }

    try {
      // Check if similar context pattern exists
      const existingPattern = await db.query.contextPatternSchema.findFirst({
        where: and(
          eq(contextPatternSchema.userId, userId),
          eq(contextPatternSchema.contextType, contextData.contextType),
          eq(contextPatternSchema.contextName, contextData.contextName)
        ),
      });

      if (existingPattern) {
        // Update existing pattern
        const [updatedPattern] = await db
          .update(contextPatternSchema)
          .set({
            frequency: existingPattern.frequency + 1,
            lastObserved: new Date(),
            contextData: JSON.stringify(contextData.contextData),
          })
          .where(eq(contextPatternSchema.id, existingPattern.id))
          .returning();

        return updatedPattern;
      } else {
        // Create new context pattern
        return await this.createContextPattern(userId, contextData);
      }
    } catch (error) {
      logger.error('Failed to analyze context', { 
        userId, 
        contextData,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create context pattern record
   */
  static async createContextPattern(userId: string, contextData: ContextData): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const contextToInsert = {
        userId,
        contextType: contextData.contextType,
        contextName: contextData.contextName,
        contextData: JSON.stringify(contextData.contextData),
        frequency: 1,
        timeOfDay: contextData.timeOfDay || null,
        dayOfWeek: contextData.dayOfWeek || null,
        location: contextData.location || null,
        weather: contextData.weather || null,
        mood: contextData.mood || null,
        energyLevel: contextData.energyLevel || null,
        stressLevel: contextData.stressLevel || null,
        socialContext: contextData.socialContext || null,
        behaviorCorrelations: null, // Will be calculated later
        outcomeImpact: null, // Will be calculated later
        predictivePower: 0, // Will be calculated as data accumulates
        firstObserved: new Date(),
        lastObserved: new Date(),
        isActive: true,
      };

      const [insertedPattern] = await db
        .insert(contextPatternSchema)
        .values(contextToInsert)
        .returning();

      logger.info('Context pattern created', { 
        userId, 
        contextId: insertedPattern.id,
        contextType: contextData.contextType,
        contextName: contextData.contextName
      });

      return insertedPattern;
    } catch (error) {
      logger.error('Failed to create context pattern', { 
        userId, 
        contextData,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Retrieve context patterns
   */
  static async getContextPatterns(userId: string, filters?: ContextFilters): Promise<any[]> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const whereConditions = [eq(contextPatternSchema.userId, userId)];

      if (filters?.contextType) {
        whereConditions.push(eq(contextPatternSchema.contextType, filters.contextType));
      }

      if (filters?.contextName) {
        whereConditions.push(eq(contextPatternSchema.contextName, filters.contextName));
      }

      if (filters?.timeOfDay) {
        whereConditions.push(eq(contextPatternSchema.timeOfDay, filters.timeOfDay));
      }

      if (filters?.dayOfWeek) {
        whereConditions.push(eq(contextPatternSchema.dayOfWeek, filters.dayOfWeek));
      }

      if (filters?.isActive !== undefined) {
        whereConditions.push(eq(contextPatternSchema.isActive, filters.isActive));
      }

      if (filters?.minPredictivePower !== undefined) {
        whereConditions.push(gte(contextPatternSchema.predictivePower, filters.minPredictivePower));
      }

      if (filters?.startDate) {
        whereConditions.push(gte(contextPatternSchema.firstObserved, filters.startDate));
      }

      if (filters?.endDate) {
        whereConditions.push(lte(contextPatternSchema.lastObserved, filters.endDate));
      }

      const sortBy = filters?.sortBy || 'lastObserved';
      const sortOrder = filters?.sortOrder || 'desc';
      const orderBy = sortOrder === 'asc' 
        ? asc(contextPatternSchema[sortBy])
        : desc(contextPatternSchema[sortBy]);

      const patterns = await db
        .select()
        .from(contextPatternSchema)
        .where(and(...whereConditions))
        .orderBy(orderBy)
        .limit(filters?.limit || 100)
        .offset(filters?.offset || 0);

      logger.debug('Context patterns retrieved', { 
        userId, 
        patternCount: patterns.length,
        filters
      });

      return patterns;
    } catch (error) {
      logger.error('Failed to retrieve context patterns', { 
        userId, 
        filters,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find correlations between context and behavior
   */
  static async correlateContextBehavior(userId: string, timeframe?: { startDate: Date; endDate: Date }): Promise<any[]> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      // Get behavior patterns and context patterns for correlation analysis
      const behaviorPatterns = await this.getPatterns(userId, {
        isActive: true,
        startDate: timeframe?.startDate,
        endDate: timeframe?.endDate,
      });

      const contextPatterns = await this.getContextPatterns(userId, {
        isActive: true,
        startDate: timeframe?.startDate,
        endDate: timeframe?.endDate,
      });

      // Calculate correlations using statistical methods
      const correlations = this.calculateCorrelations(behaviorPatterns, contextPatterns);

      // Update patterns with correlation data
      for (const correlation of correlations) {
        if (correlation.strength >= 0.5) { // Only store significant correlations
          await this.updatePatternCorrelations(correlation);
        }
      }

      logger.info('Context-behavior correlations calculated', { 
        userId, 
        behaviorPatterns: behaviorPatterns.length,
        contextPatterns: contextPatterns.length,
        correlations: correlations.length,
        timeframe
      });

      return correlations;
    } catch (error) {
      logger.error('Failed to correlate context and behavior', { 
        userId, 
        timeframe,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Record micro-behaviors and habits
   */
  static async trackMicroBehavior(userId: string, behaviorData: MicroBehaviorData): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      // Check if pattern exists for this behavior type
      const existingPattern = await db.query.microBehaviorPatternSchema.findFirst({
        where: and(
          eq(microBehaviorPatternSchema.userId, userId),
          eq(microBehaviorPatternSchema.behaviorType, behaviorData.behaviorType),
          eq(microBehaviorPatternSchema.isActive, true)
        ),
      });

      if (existingPattern) {
        // Update existing pattern
        return await this.updatePattern(userId, existingPattern.id, behaviorData);
      } else {
        // Create new pattern
        return await this.createPattern(userId, behaviorData);
      }
    } catch (error) {
      logger.error('Failed to track micro-behavior', { 
        userId, 
        behaviorData,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Analyze behavior frequency
   */
  static async analyzeBehaviorFrequency(
    userId: string, 
    behaviorType: string, 
    timeframe?: { startDate: Date; endDate: Date }
  ): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    if (!behaviorType) {
      throw new Error('Behavior type is required');
    }

    try {
      const whereConditions = [
        eq(microBehaviorPatternSchema.userId, userId),
        eq(microBehaviorPatternSchema.behaviorType, behaviorType),
        eq(microBehaviorPatternSchema.isActive, true)
      ];

      if (timeframe?.startDate) {
        whereConditions.push(gte(microBehaviorPatternSchema.firstObserved, timeframe.startDate));
      }

      if (timeframe?.endDate) {
        whereConditions.push(lte(microBehaviorPatternSchema.lastObserved, timeframe.endDate));
      }

      const patterns = await db
        .select()
        .from(microBehaviorPatternSchema)
        .where(and(...whereConditions));

      // Calculate frequency statistics
      const frequencyAnalysis = this.calculateFrequencyStats(patterns, timeframe);

      logger.info('Behavior frequency analyzed', { 
        userId, 
        behaviorType,
        patternCount: patterns.length,
        timeframe
      });

      return frequencyAnalysis;
    } catch (error) {
      logger.error('Failed to analyze behavior frequency', { 
        userId, 
        behaviorType,
        timeframe,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Identify behavior triggers and conditions
   */
  static async identifyTriggers(userId: string, behaviorType: string): Promise<any[]> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    if (!behaviorType) {
      throw new Error('Behavior type is required');
    }

    try {
      const patterns = await db
        .select()
        .from(microBehaviorPatternSchema)
        .where(and(
          eq(microBehaviorPatternSchema.userId, userId),
          eq(microBehaviorPatternSchema.behaviorType, behaviorType),
          eq(microBehaviorPatternSchema.isActive, true)
        ));

      // Analyze triggers from pattern data
      const triggers = this.analyzeTriggers(patterns);

      logger.info('Behavior triggers identified', { 
        userId, 
        behaviorType,
        patternCount: patterns.length,
        triggerCount: triggers.length
      });

      return triggers;
    } catch (error) {
      logger.error('Failed to identify triggers', { 
        userId, 
        behaviorType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Measure behavior outcomes and success
   */
  static async measureOutcomes(
    userId: string, 
    behaviorType: string, 
    timeframe?: { startDate: Date; endDate: Date }
  ): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    if (!behaviorType) {
      throw new Error('Behavior type is required');
    }

    try {
      const whereConditions = [
        eq(microBehaviorPatternSchema.userId, userId),
        eq(microBehaviorPatternSchema.behaviorType, behaviorType),
        eq(microBehaviorPatternSchema.isActive, true)
      ];

      if (timeframe?.startDate) {
        whereConditions.push(gte(microBehaviorPatternSchema.firstObserved, timeframe.startDate));
      }

      if (timeframe?.endDate) {
        whereConditions.push(lte(microBehaviorPatternSchema.lastObserved, timeframe.endDate));
      }

      const patterns = await db
        .select()
        .from(microBehaviorPatternSchema)
        .where(and(...whereConditions));

      // Analyze outcomes from pattern data
      const outcomes = this.analyzeOutcomes(patterns, timeframe);

      logger.info('Behavior outcomes measured', { 
        userId, 
        behaviorType,
        patternCount: patterns.length,
        timeframe
      });

      return outcomes;
    } catch (error) {
      logger.error('Failed to measure outcomes', { 
        userId, 
        behaviorType,
        timeframe,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Enrich behavioral events with micro-behavior data
   */
  static async enrichBehaviorEvents(userId: string, events: any[]): Promise<any[]> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    if (!events || !Array.isArray(events)) {
      throw new Error('Events array is required');
    }

    try {
      // Get user's micro-behavior patterns
      const patterns = await this.getPatterns(userId, { isActive: true });
      const contextPatterns = await this.getContextPatterns(userId, { isActive: true });

      // Enrich each event with relevant pattern data
      const enrichedEvents = events.map(event => {
        const relevantPatterns = patterns.filter(pattern => 
          this.isPatternRelevantToEvent(pattern, event)
        );

        const relevantContext = contextPatterns.filter(context => 
          this.isContextRelevantToEvent(context, event)
        );

        return {
          ...event,
          microBehaviorData: {
            patterns: relevantPatterns,
            context: relevantContext,
            enrichmentTimestamp: new Date(),
          },
        };
      });

      logger.debug('Behavioral events enriched', { 
        userId, 
        eventCount: events.length,
        patternCount: patterns.length,
        contextPatternCount: contextPatterns.length
      });

      return enrichedEvents;
    } catch (error) {
      logger.error('Failed to enrich behavior events', { 
        userId, 
        eventCount: events.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate behavioral insights and recommendations
   */
  static async generateInsights(userId: string, timeframe?: { startDate: Date; endDate: Date }): Promise<BehaviorInsight[]> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const insights: BehaviorInsight[] = [];

      // Get patterns and correlations
      const patterns = await this.getPatterns(userId, {
        isActive: true,
        startDate: timeframe?.startDate,
        endDate: timeframe?.endDate,
      });

      const correlations = await this.correlateContextBehavior(userId, timeframe);

      // Generate pattern-based insights
      for (const pattern of patterns) {
        if (pattern.strength >= 70 && pattern.confidence >= 80) {
          insights.push({
            type: 'pattern',
            title: `Strong ${pattern.behaviorType} Pattern Detected`,
            description: `You have a consistent ${pattern.behaviorType} pattern with ${pattern.strength}% strength`,
            confidence: pattern.confidence,
            actionable: true,
            recommendations: this.generatePatternRecommendations(pattern),
            data: { patternId: pattern.id, behaviorType: pattern.behaviorType },
          });
        }
      }

      // Generate correlation-based insights
      for (const correlation of correlations) {
        if (correlation.strength >= 0.7) {
          insights.push({
            type: 'correlation',
            title: `Context-Behavior Correlation Found`,
            description: `Strong correlation between ${correlation.contextType} and ${correlation.behaviorType}`,
            confidence: correlation.strength * 100,
            actionable: true,
            recommendations: this.generateCorrelationRecommendations(correlation),
            data: correlation,
          });
        }
      }

      // Detect anomalies
      const anomalies = this.detectAnomalies(patterns);
      for (const anomaly of anomalies) {
        insights.push({
          type: 'anomaly',
          title: 'Unusual Behavior Pattern',
          description: anomaly.description,
          confidence: anomaly.confidence,
          actionable: true,
          recommendations: anomaly.recommendations,
          data: anomaly.data,
        });
      }

      logger.info('Behavioral insights generated', { 
        userId, 
        insightCount: insights.length,
        patternCount: patterns.length,
        correlationCount: correlations.length,
        timeframe
      });

      return insights;
    } catch (error) {
      logger.error('Failed to generate insights', { 
        userId, 
        timeframe,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Export pattern data for analysis
   */
  static async exportPatternData(userId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const patterns = await this.getPatterns(userId, { isActive: true });
      const contextPatterns = await this.getContextPatterns(userId, { isActive: true });

      const exportData = {
        userId,
        exportTimestamp: new Date(),
        patterns,
        contextPatterns,
        summary: {
          totalPatterns: patterns.length,
          totalContextPatterns: contextPatterns.length,
          averageStrength: patterns.reduce((sum, p) => sum + (p.strength || 0), 0) / patterns.length,
          averageConfidence: patterns.reduce((sum, p) => sum + (p.confidence || 0), 0) / patterns.length,
        },
      };

      let exportString: string;
      if (format === 'csv') {
        exportString = this.convertToCSV(exportData);
      } else {
        exportString = JSON.stringify(exportData, null, 2);
      }

      logger.info('Pattern data exported', { 
        userId, 
        format,
        patternCount: patterns.length,
        contextPatternCount: contextPatterns.length
      });

      return exportString;
    } catch (error) {
      logger.error('Failed to export pattern data', { 
        userId, 
        format,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Private helper methods

  private static analyzeEventPatterns(events: any[]): any[] {
    // Implement statistical pattern analysis
    const patterns = [];
    const eventGroups = this.groupEventsByType(events);

    for (const [eventType, eventList] of Object.entries(eventGroups)) {
      const pattern = this.calculateEventPattern(eventType, eventList as any[]);
      if (pattern.confidence >= 50) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private static groupEventsByType(events: any[]): Record<string, any[]> {
    return events.reduce((groups, event) => {
      const key = event.eventName;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private static calculateEventPattern(eventType: string, events: any[]): any {
    // Calculate frequency, timing patterns, and confidence
    const frequency = events.length;
    const timeSpan = this.calculateTimeSpan(events);
    const consistency = this.calculateConsistency(events);
    const confidence = Math.min(95, (frequency * consistency) / 10);

    return {
      name: `${eventType}_pattern`,
      type: eventType,
      frequency,
      period: 'week',
      consistency,
      confidence,
      triggers: this.extractTriggers(events),
      outcomes: this.extractOutcomes(events),
      context: this.extractContext(events),
    };
  }

  private static calculateTimeSpan(events: any[]): number {
    if (events.length < 2) return 0;
    const dates = events.map(e => new Date(e.createdAt)).sort();
    return dates[dates.length - 1].getTime() - dates[0].getTime();
  }

  private static calculateConsistency(events: any[]): number {
    // Calculate temporal consistency of events
    if (events.length < 2) return 0;
    
    const intervals = [];
    const sortedEvents = events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    for (let i = 1; i < sortedEvents.length; i++) {
      const interval = new Date(sortedEvents[i].createdAt).getTime() - new Date(sortedEvents[i-1].createdAt).getTime();
      intervals.push(interval);
    }
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    const consistencyScore = Math.max(0, 100 - (standardDeviation / avgInterval) * 100);
    return Math.min(100, consistencyScore);
  }

  private static extractTriggers(events: any[]): Record<string, any> {
    // Extract common triggers from event context
    const triggers: Record<string, any> = {};
    
    events.forEach(event => {
      if (event.context) {
        const context = typeof event.context === 'string' ? JSON.parse(event.context) : event.context;
        
        // Extract environmental triggers
        if (context.environment) {
          Object.keys(context.environment).forEach(key => {
            if (!triggers.environmental) triggers.environmental = {};
            triggers.environmental[key] = context.environment[key];
          });
        }
        
        // Extract UI triggers
        if (context.ui) {
          Object.keys(context.ui).forEach(key => {
            if (!triggers.ui) triggers.ui = {};
            triggers.ui[key] = context.ui[key];
          });
        }
      }
    });
    
    return triggers;
  }

  private static extractOutcomes(events: any[]): Record<string, any> {
    // Extract outcomes based on subsequent events
    return {
      frequency: events.length,
      timespan: this.calculateTimeSpan(events),
      success_rate: this.calculateSuccessRate(events),
    };
  }

  private static extractContext(events: any[]): Record<string, any> {
    // Extract common contextual information
    const contexts = events.map(e => e.context).filter(Boolean);
    return {
      sample_size: events.length,
      context_availability: contexts.length / events.length,
      common_patterns: this.findCommonContextPatterns(contexts),
    };
  }

  private static calculateSuccessRate(events: any[]): number {
    // Define success based on completion events
    const completionEvents = events.filter(e => 
      e.eventName.includes('completed') || 
      e.eventName.includes('achieved') || 
      e.eventName.includes('finished')
    );
    return events.length > 0 ? (completionEvents.length / events.length) * 100 : 0;
  }

  private static findCommonContextPatterns(contexts: any[]): Record<string, any> {
    // Find patterns in context data
    const patterns: Record<string, any> = {};
    
    contexts.forEach(context => {
      if (typeof context === 'string') {
        try {
          context = JSON.parse(context);
        } catch {
          return;
        }
      }
      
      // Analyze context structure
      Object.keys(context).forEach(key => {
        if (!patterns[key]) patterns[key] = {};
        if (context[key] && typeof context[key] === 'object') {
          Object.keys(context[key]).forEach(subKey => {
            if (!patterns[key][subKey]) patterns[key][subKey] = 0;
            patterns[key][subKey]++;
          });
        }
      });
    });
    
    return patterns;
  }

  private static calculatePatternStrength(patternData: any): number {
    // Calculate pattern strength based on frequency and consistency
    const baseStrength = Math.min(100, patternData.frequency * 10);
    const consistencyBonus = (patternData.consistency || 50) * 0.3;
    return Math.min(100, baseStrength + consistencyBonus);
  }

  private static calculatePatternConfidence(patternData: any): number {
    // Calculate confidence based on sample size and consistency
    const sampleSizeScore = Math.min(50, (patternData.sampleSize || 1) * 5);
    const consistencyScore = (patternData.consistency || 50) * 0.5;
    return Math.min(100, sampleSizeScore + consistencyScore);
  }

  private static calculateCorrelations(behaviorPatterns: any[], contextPatterns: any[]): any[] {
    const correlations = [];
    
    for (const behavior of behaviorPatterns) {
      for (const context of contextPatterns) {
        const correlation = this.calculateCorrelationStrength(behavior, context);
        if (correlation.strength >= 0.3) {
          correlations.push({
            behaviorPatternId: behavior.id,
            contextPatternId: context.id,
            behaviorType: behavior.behaviorType,
            contextType: context.contextType,
            strength: correlation.strength,
            significance: correlation.significance,
          });
        }
      }
    }
    
    return correlations;
  }

  private static calculateCorrelationStrength(behavior: any, context: any): any {
    // Simple correlation calculation based on temporal overlap
    const behaviorStart = new Date(behavior.firstObserved);
    const behaviorEnd = new Date(behavior.lastObserved);
    const contextStart = new Date(context.firstObserved);
    const contextEnd = new Date(context.lastObserved);
    
    // Calculate temporal overlap
    const overlapStart = new Date(Math.max(behaviorStart.getTime(), contextStart.getTime()));
    const overlapEnd = new Date(Math.min(behaviorEnd.getTime(), contextEnd.getTime()));
    const overlap = Math.max(0, overlapEnd.getTime() - overlapStart.getTime());
    
    const behaviorDuration = behaviorEnd.getTime() - behaviorStart.getTime();
    const contextDuration = contextEnd.getTime() - contextStart.getTime();
    const avgDuration = (behaviorDuration + contextDuration) / 2;
    
    const strength = avgDuration > 0 ? overlap / avgDuration : 0;
    const significance = Math.min(behavior.confidence, context.predictivePower || 50) / 100;
    
    return { strength, significance };
  }

  private static async updatePatternCorrelations(correlation: any): Promise<void> {
    // Update behavior pattern with correlation data
    const existingPattern = await db.query.microBehaviorPatternSchema.findFirst({
      where: eq(microBehaviorPatternSchema.id, correlation.behaviorPatternId),
    });
    
    if (existingPattern) {
      const correlations = existingPattern.correlations 
        ? JSON.parse(existingPattern.correlations as string) 
        : [];
      
      correlations.push({
        contextPatternId: correlation.contextPatternId,
        strength: correlation.strength,
        type: correlation.contextType,
      });
      
      await db
        .update(microBehaviorPatternSchema)
        .set({ correlations: JSON.stringify(correlations) })
        .where(eq(microBehaviorPatternSchema.id, correlation.behaviorPatternId));
    }
  }

  private static calculateFrequencyStats(patterns: any[], timeframe?: any): any {
    if (patterns.length === 0) {
      return {
        totalOccurrences: 0,
        averageFrequency: 0,
        frequencyTrend: 'stable',
        consistency: 0,
      };
    }
    
    const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
    const averageFrequency = totalFrequency / patterns.length;
    const consistency = patterns.reduce((sum, p) => sum + (p.consistency || 0), 0) / patterns.length;
    
    // Calculate trend (simplified)
    const recentPatterns = patterns.filter(p => {
      const lastObserved = new Date(p.lastObserved);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return lastObserved >= thirtyDaysAgo;
    });
    
    const recentFrequency = recentPatterns.length > 0 
      ? recentPatterns.reduce((sum, p) => sum + p.frequency, 0) / recentPatterns.length
      : 0;
    
    let trend = 'stable';
    if (recentFrequency > averageFrequency * 1.1) trend = 'increasing';
    else if (recentFrequency < averageFrequency * 0.9) trend = 'decreasing';
    
    return {
      totalOccurrences: totalFrequency,
      averageFrequency,
      frequencyTrend: trend,
      consistency,
      patternCount: patterns.length,
      recentPatternCount: recentPatterns.length,
    };
  }

  private static analyzeTriggers(patterns: any[]): any[] {
    const triggers = [];
    
    for (const pattern of patterns) {
      if (pattern.triggers) {
        const triggerData = typeof pattern.triggers === 'string' 
          ? JSON.parse(pattern.triggers) 
          : pattern.triggers;
        
        Object.keys(triggerData).forEach(triggerType => {
          triggers.push({
            patternId: pattern.id,
            behaviorType: pattern.behaviorType,
            triggerType,
            triggerData: triggerData[triggerType],
            strength: pattern.strength,
            confidence: pattern.confidence,
          });
        });
      }
    }
    
    return triggers;
  }

  private static analyzeOutcomes(patterns: any[], timeframe?: any): any {
    const outcomes = {
      totalPatterns: patterns.length,
      averageStrength: 0,
      averageConfidence: 0,
      successfulPatterns: 0,
      improvingPatterns: 0,
      decliningPatterns: 0,
    };
    
    if (patterns.length === 0) return outcomes;
    
    outcomes.averageStrength = patterns.reduce((sum, p) => sum + (p.strength || 0), 0) / patterns.length;
    outcomes.averageConfidence = patterns.reduce((sum, p) => sum + (p.confidence || 0), 0) / patterns.length;
    outcomes.successfulPatterns = patterns.filter(p => (p.strength || 0) >= 70).length;
    
    // Analyze trends (simplified)
    patterns.forEach(pattern => {
      const recentActivity = new Date(pattern.lastObserved).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (recentActivity && (pattern.strength || 0) >= 70) {
        outcomes.improvingPatterns++;
      } else if (!recentActivity || (pattern.strength || 0) < 50) {
        outcomes.decliningPatterns++;
      }
    });
    
    return outcomes;
  }

  private static isPatternRelevantToEvent(pattern: any, event: any): boolean {
    // Check if pattern is relevant to the event
    return pattern.behaviorType === event.eventName || 
           event.eventName.includes(pattern.behaviorType) ||
           pattern.behaviorType.includes(event.eventName);
  }

  private static isContextRelevantToEvent(context: any, event: any): boolean {
    // Check if context is relevant to the event
    if (!event.context) return false;
    
    const eventContext = typeof event.context === 'string' 
      ? JSON.parse(event.context) 
      : event.context;
    
    // Check for temporal relevance
    const eventTime = new Date(event.createdAt);
    const eventHour = eventTime.getHours();
    
    if (context.timeOfDay) {
      const timeRanges = {
        morning: [6, 12],
        afternoon: [12, 18],
        evening: [18, 22],
        night: [22, 6],
      };
      
      const range = timeRanges[context.timeOfDay as keyof typeof timeRanges];
      if (range && (eventHour < range[0] || eventHour >= range[1])) {
        return false;
      }
    }
    
    return true;
  }

  private static generatePatternRecommendations(pattern: any): string[] {
    const recommendations = [];
    
    if (pattern.strength >= 80) {
      recommendations.push(`Maintain your consistent ${pattern.behaviorType} pattern`);
    } else if (pattern.strength >= 60) {
      recommendations.push(`Work on strengthening your ${pattern.behaviorType} pattern`);
    } else {
      recommendations.push(`Focus on building consistency in your ${pattern.behaviorType} behavior`);
    }
    
    if (pattern.triggers) {
      recommendations.push('Leverage your identified triggers to maintain this pattern');
    }
    
    return recommendations;
  }

  private static generateCorrelationRecommendations(correlation: any): string[] {
    return [
      `Use ${correlation.contextType} context to enhance ${correlation.behaviorType} behavior`,
      'Monitor this correlation to optimize your behavior patterns',
      'Consider environmental factors when planning activities',
    ];
  }

  private static detectAnomalies(patterns: any[]): any[] {
    const anomalies = [];
    
    for (const pattern of patterns) {
      // Detect sudden drops in pattern strength
      if ((pattern.strength || 0) < 30 && (pattern.confidence || 0) > 70) {
        anomalies.push({
          type: 'strength_drop',
          description: `Significant drop in ${pattern.behaviorType} pattern strength`,
          confidence: 85,
          recommendations: [
            'Review recent changes in routine or environment',
            'Consider factors that might be disrupting this pattern',
          ],
          data: { patternId: pattern.id, behaviorType: pattern.behaviorType },
        });
      }
      
      // Detect inconsistent patterns
      if ((pattern.consistency || 0) < 40 && pattern.frequency > 10) {
        anomalies.push({
          type: 'inconsistency',
          description: `High frequency but low consistency in ${pattern.behaviorType}`,
          confidence: 75,
          recommendations: [
            'Work on establishing a more regular schedule',
            'Identify and minimize disruptive factors',
          ],
          data: { patternId: pattern.id, behaviorType: pattern.behaviorType },
        });
      }
    }
    
    return anomalies;
  }

  private static convertToCSV(data: any): string {
    // Simple CSV conversion for pattern data
    const headers = ['Pattern ID', 'Behavior Type', 'Frequency', 'Strength', 'Confidence', 'Created At'];
    const rows = [headers.join(',')];
    
    data.patterns.forEach((pattern: any) => {
      const row = [
        pattern.id,
        pattern.behaviorType,
        pattern.frequency,
        pattern.strength || 0,
        pattern.confidence || 0,
        pattern.createdAt,
      ];
      rows.push(row.join(','));
    });
    
    return rows.join('\n');
  }
}