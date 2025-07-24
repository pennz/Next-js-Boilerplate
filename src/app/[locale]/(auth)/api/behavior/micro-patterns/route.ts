import type { NextRequest } from 'next/server';
import arcjet, { tokenBucket } from '@arcjet/next';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
import { microBehaviorPatternSchema, contextPatternSchema } from '@/models/Schema';
// import { MicroBehaviorService } from '@/services/behavior/MicroBehaviorService';
// import {
//   MicroBehaviorPatternValidation,
//   ContextPatternValidation,
//   BehaviorTriggerValidation,
//   BehaviorOutcomeValidation,
//   PatternAnalysisValidation,
// } from '@/validations/MicroBehaviorValidation';

// Temporary validation schemas until MicroBehaviorValidation is implemented
const PatternTypeEnum = z.enum(['habit', 'trigger', 'outcome', 'context', 'correlation']);

const MicroBehaviorPatternValidation = z.object({
  patternType: PatternTypeEnum,
  behaviorName: z.string().min(1).max(100),
  frequency: z.number().min(0).max(1),
  strength: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  context: z.record(z.string(), z.any()).optional(),
  triggers: z.array(z.string()).optional(),
  outcomes: z.array(z.string()).optional(),
  correlations: z.array(z.object({
    behaviorName: z.string(),
    correlation: z.number().min(-1).max(1),
  })).optional(),
  timeframe: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const PatternAnalysisValidation = z.object({
  patternType: PatternTypeEnum.optional(),
  behaviorName: z.string().max(100).optional(),
  minFrequency: z.number().min(0).max(1).optional(),
  minStrength: z.number().min(0).max(1).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'frequency', 'strength', 'confidence']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeCorrelations: z.boolean().default(false),
  includeInsights: z.boolean().default(false),
});

const MicroBehaviorPatternBulkValidation = z.object({
  patterns: z.array(MicroBehaviorPatternValidation).min(1).max(20),
});

const MicroBehaviorPatternUpdateValidation = MicroBehaviorPatternValidation.partial().extend({
  id: z.number().int().positive(),
  status: z.enum(['active', 'archived', 'deprecated']).optional(),
});

// Temporary service class until MicroBehaviorService is implemented
class TempMicroBehaviorService {
  static async getPatterns(userId: string, filters: any): Promise<any[]> {
    // Placeholder implementation
    logger.info('Getting micro-behavior patterns', { userId, filters });
    
    // Build query conditions
    const conditions = [eq(microBehaviorPatternSchema.userId, userId)];
    
    if (filters.patternType) {
      conditions.push(eq(microBehaviorPatternSchema.patternType, filters.patternType));
    }
    
    if (filters.behaviorName) {
      conditions.push(eq(microBehaviorPatternSchema.behaviorName, filters.behaviorName));
    }
    
    if (filters.minFrequency !== undefined) {
      conditions.push(gte(microBehaviorPatternSchema.frequency, filters.minFrequency));
    }
    
    if (filters.minStrength !== undefined) {
      conditions.push(gte(microBehaviorPatternSchema.strength, filters.minStrength));
    }
    
    if (filters.minConfidence !== undefined) {
      conditions.push(gte(microBehaviorPatternSchema.confidence, filters.minConfidence));
    }
    
    if (filters.startDate) {
      conditions.push(gte(microBehaviorPatternSchema.createdAt, filters.startDate));
    }
    
    if (filters.endDate) {
      conditions.push(lte(microBehaviorPatternSchema.createdAt, filters.endDate));
    }
    
    // Build order by
    const orderBy = filters.sortOrder === 'asc' 
      ? sql`${microBehaviorPatternSchema[filters.sortBy]} ASC`
      : sql`${microBehaviorPatternSchema[filters.sortBy]} DESC`;
    
    const patterns = await db
      .select()
      .from(microBehaviorPatternSchema)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(filters.limit)
      .offset(filters.offset);
    
    return patterns;
  }
  
  static async createPattern(userId: string, patternData: any): Promise<any> {
    logger.info('Creating micro-behavior pattern', { userId, patternData });
    
    const patternToInsert = {
      userId,
      patternType: patternData.patternType,
      behaviorName: patternData.behaviorName,
      frequency: patternData.frequency,
      strength: patternData.strength,
      confidence: patternData.confidence,
      context: patternData.context ? JSON.stringify(patternData.context) : null,
      triggers: patternData.triggers ? JSON.stringify(patternData.triggers) : null,
      outcomes: patternData.outcomes ? JSON.stringify(patternData.outcomes) : null,
      correlations: patternData.correlations ? JSON.stringify(patternData.correlations) : null,
      timeframe: patternData.timeframe ? JSON.stringify(patternData.timeframe) : null,
      metadata: patternData.metadata ? JSON.stringify(patternData.metadata) : null,
    };
    
    const [insertedPattern] = await db
      .insert(microBehaviorPatternSchema)
      .values(patternToInsert)
      .returning();
    
    return insertedPattern;
  }
  
  static async createPatterns(userId: string, patterns: any[]): Promise<any[]> {
    logger.info('Creating bulk micro-behavior patterns', { userId, count: patterns.length });
    
    const patternsToInsert = patterns.map(pattern => ({
      userId,
      patternType: pattern.patternType,
      behaviorName: pattern.behaviorName,
      frequency: pattern.frequency,
      strength: pattern.strength,
      confidence: pattern.confidence,
      context: pattern.context ? JSON.stringify(pattern.context) : null,
      triggers: pattern.triggers ? JSON.stringify(pattern.triggers) : null,
      outcomes: pattern.outcomes ? JSON.stringify(pattern.outcomes) : null,
      correlations: pattern.correlations ? JSON.stringify(pattern.correlations) : null,
      timeframe: pattern.timeframe ? JSON.stringify(pattern.timeframe) : null,
      metadata: pattern.metadata ? JSON.stringify(pattern.metadata) : null,
    }));
    
    const insertedPatterns = await db
      .insert(microBehaviorPatternSchema)
      .values(patternsToInsert)
      .returning();
    
    return insertedPatterns;
  }
  
  static async updatePattern(userId: string, patternId: number, updates: any): Promise<any> {
    logger.info('Updating micro-behavior pattern', { userId, patternId, updates });
    
    const updateData: any = {};
    
    if (updates.patternType !== undefined) updateData.patternType = updates.patternType;
    if (updates.behaviorName !== undefined) updateData.behaviorName = updates.behaviorName;
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
    if (updates.strength !== undefined) updateData.strength = updates.strength;
    if (updates.confidence !== undefined) updateData.confidence = updates.confidence;
    if (updates.context !== undefined) updateData.context = JSON.stringify(updates.context);
    if (updates.triggers !== undefined) updateData.triggers = JSON.stringify(updates.triggers);
    if (updates.outcomes !== undefined) updateData.outcomes = JSON.stringify(updates.outcomes);
    if (updates.correlations !== undefined) updateData.correlations = JSON.stringify(updates.correlations);
    if (updates.timeframe !== undefined) updateData.timeframe = JSON.stringify(updates.timeframe);
    if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
    if (updates.status !== undefined) updateData.status = updates.status;
    
    updateData.updatedAt = new Date();
    
    const [updatedPattern] = await db
      .update(microBehaviorPatternSchema)
      .set(updateData)
      .where(
        and(
          eq(microBehaviorPatternSchema.id, patternId),
          eq(microBehaviorPatternSchema.userId, userId),
        ),
      )
      .returning();
    
    if (!updatedPattern) {
      throw new Error('Pattern not found or access denied');
    }
    
    return updatedPattern;
  }
  
  static async generateInsights(userId: string, patterns: any[]): Promise<any> {
    logger.info('Generating pattern insights', { userId, patternCount: patterns.length });
    
    // Placeholder insight generation
    const insights = {
      totalPatterns: patterns.length,
      strongPatterns: patterns.filter(p => p.strength > 0.7).length,
      frequentPatterns: patterns.filter(p => p.frequency > 0.5).length,
      highConfidencePatterns: patterns.filter(p => p.confidence > 0.8).length,
      patternsByType: patterns.reduce((acc, pattern) => {
        acc[pattern.patternType] = (acc[pattern.patternType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recommendations: [
        'Focus on strengthening high-frequency patterns',
        'Investigate low-confidence patterns for data quality',
        'Consider correlations between strong patterns',
      ],
    };
    
    return insights;
  }
}

// Arcjet rate limiting configuration
const aj = arcjet({
  key: Env.ARCJET_KEY!,
  rules: [
    tokenBucket({
      mode: 'LIVE',
      characteristics: ['userId'],
      refillRate: 5,
      interval: 60,
      capacity: 10,
    }),
  ],
});

// Feature flag check
const checkMicroBehaviorFeatureFlag = () => {
  if (!Env.ENABLE_MICRO_BEHAVIOR_TRACKING) {
    return NextResponse.json(
      { error: 'Micro-behavior tracking feature is not enabled' },
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

// GET - Retrieve micro-behavior patterns and analysis
export const GET = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkMicroBehaviorFeatureFlag();
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
      patternType: searchParams.get('patternType'),
      behaviorName: searchParams.get('behaviorName'),
      minFrequency: searchParams.get('minFrequency'),
      minStrength: searchParams.get('minStrength'),
      minConfidence: searchParams.get('minConfidence'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      includeCorrelations: searchParams.get('includeCorrelations'),
      includeInsights: searchParams.get('includeInsights'),
    };

    const parse = PatternAnalysisValidation.safeParse(queryData);
    if (!parse.success) {
      logger.warn('Micro-behavior pattern query validation failed', {
        userId,
        queryData,
        errors: parse.error.errors,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const validatedQuery = parse.data;

    // Retrieve patterns using service
    const patterns = await TempMicroBehaviorService.getPatterns(userId, validatedQuery);

    // Get total count for pagination
    const conditions = [eq(microBehaviorPatternSchema.userId, userId)];
    
    if (validatedQuery.patternType) {
      conditions.push(eq(microBehaviorPatternSchema.patternType, validatedQuery.patternType));
    }
    
    if (validatedQuery.behaviorName) {
      conditions.push(eq(microBehaviorPatternSchema.behaviorName, validatedQuery.behaviorName));
    }
    
    if (validatedQuery.minFrequency !== undefined) {
      conditions.push(gte(microBehaviorPatternSchema.frequency, validatedQuery.minFrequency));
    }
    
    if (validatedQuery.minStrength !== undefined) {
      conditions.push(gte(microBehaviorPatternSchema.strength, validatedQuery.minStrength));
    }
    
    if (validatedQuery.minConfidence !== undefined) {
      conditions.push(gte(microBehaviorPatternSchema.confidence, validatedQuery.minConfidence));
    }
    
    if (validatedQuery.startDate) {
      conditions.push(gte(microBehaviorPatternSchema.createdAt, validatedQuery.startDate));
    }
    
    if (validatedQuery.endDate) {
      conditions.push(lte(microBehaviorPatternSchema.createdAt, validatedQuery.endDate));
    }

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(microBehaviorPatternSchema)
      .where(and(...conditions));

    // Generate insights if requested
    let insights = null;
    if (validatedQuery.includeInsights && patterns.length > 0) {
      insights = await TempMicroBehaviorService.generateInsights(userId, patterns);
    }

    logger.info('Micro-behavior patterns retrieved', {
      userId,
      count: patterns.length,
      filters: validatedQuery,
      includeInsights: validatedQuery.includeInsights,
    });

    return NextResponse.json({
      patterns,
      insights,
      pagination: {
        total: totalCount[0]?.count || 0,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: (totalCount[0]?.count || 0) > validatedQuery.offset + validatedQuery.limit,
      },
    });
  } catch (error) {
    logger.error('Error retrieving micro-behavior patterns', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// POST - Create or update micro-behavior patterns
export const POST = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkMicroBehaviorFeatureFlag();
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

    // Handle both single pattern and bulk patterns
    let patternsData;
    if (Array.isArray(json)) {
      patternsData = { patterns: json };
    } else if (json.patterns && Array.isArray(json.patterns)) {
      patternsData = json;
    } else {
      // Single pattern - wrap in array
      patternsData = { patterns: [json] };
    }

    // Validate patterns
    const parse = MicroBehaviorPatternBulkValidation.safeParse(patternsData);
    if (!parse.success) {
      logger.warn('Micro-behavior pattern validation failed', {
        userId,
        patternsCount: patternsData.patterns?.length || 0,
        errors: parse.error.errors,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const { patterns } = parse.data;

    // Validate statistical significance
    for (const pattern of patterns) {
      if (pattern.confidence < 0.5) {
        logger.warn('Pattern with low confidence detected', {
          userId,
          behaviorName: pattern.behaviorName,
          confidence: pattern.confidence,
        });
      }
      
      if (pattern.strength > 0.8 && pattern.frequency < 0.3) {
        logger.warn('Potentially inconsistent pattern detected', {
          userId,
          behaviorName: pattern.behaviorName,
          strength: pattern.strength,
          frequency: pattern.frequency,
        });
      }
    }

    // Create patterns using service
    const createdPatterns = await TempMicroBehaviorService.createPatterns(userId, patterns);

    logger.info('Micro-behavior patterns created', {
      userId,
      patternCount: createdPatterns.length,
      behaviorNames: patterns.map(p => p.behaviorName),
      patternTypes: [...new Set(patterns.map(p => p.patternType))],
    });

    return NextResponse.json({
      patterns: createdPatterns,
      message: `${createdPatterns.length} micro-behavior pattern(s) created successfully`,
      count: createdPatterns.length,
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating micro-behavior patterns', { error, userId });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Validation failed')) {
        return NextResponse.json(
          { error: error.message },
          { status: 422 },
        );
      }
      
      if (error.message.includes('Statistical significance')) {
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

// PUT - Update existing patterns
export const PUT = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkMicroBehaviorFeatureFlag();
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

    // Validate update data
    const parse = MicroBehaviorPatternUpdateValidation.safeParse(json);
    if (!parse.success) {
      logger.warn('Micro-behavior pattern update validation failed', {
        userId,
        updateData: json,
        errors: parse.error.errors,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const { id, ...updates } = parse.data;

    // Check if pattern exists and belongs to user
    const existingPattern = await db
      .select()
      .from(microBehaviorPatternSchema)
      .where(
        and(
          eq(microBehaviorPatternSchema.id, id),
          eq(microBehaviorPatternSchema.userId, userId),
        ),
      );

    if (existingPattern.length === 0) {
      return NextResponse.json(
        { error: 'Micro-behavior pattern not found or access denied' },
        { status: 404 },
      );
    }

    // Validate statistical significance for updates
    if (updates.confidence !== undefined && updates.confidence < 0.5) {
      logger.warn('Pattern update with low confidence', {
        userId,
        patternId: id,
        confidence: updates.confidence,
      });
    }

    // Update pattern using service
    const updatedPattern = await TempMicroBehaviorService.updatePattern(userId, id, updates);

    logger.info('Micro-behavior pattern updated', {
      userId,
      patternId: id,
      updates: Object.keys(updates),
    });

    return NextResponse.json({
      pattern: updatedPattern,
      message: 'Micro-behavior pattern updated successfully',
    });
  } catch (error) {
    logger.error('Error updating micro-behavior pattern', { error, userId });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Pattern not found')) {
        return NextResponse.json(
          { error: 'Pattern not found or access denied' },
          { status: 404 },
        );
      }
      
      if (error.message.includes('Validation failed')) {
        return NextResponse.json(
          { error: error.message },
          { status: 422 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// DELETE - Archive or delete patterns
export const DELETE = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkMicroBehaviorFeatureFlag();
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
    const patternId = searchParams.get('id');
    const archive = searchParams.get('archive') === 'true';

    if (!patternId) {
      return NextResponse.json(
        { error: 'Pattern ID is required' },
        { status: 400 },
      );
    }

    const id = Number.parseInt(patternId, 10);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'Invalid pattern ID' },
        { status: 400 },
      );
    }

    // Check if pattern exists and belongs to user
    const existingPattern = await db
      .select()
      .from(microBehaviorPatternSchema)
      .where(
        and(
          eq(microBehaviorPatternSchema.id, id),
          eq(microBehaviorPatternSchema.userId, userId),
        ),
      );

    if (existingPattern.length === 0) {
      return NextResponse.json(
        { error: 'Micro-behavior pattern not found or access denied' },
        { status: 404 },
      );
    }

    if (archive) {
      // Archive the pattern (soft delete)
      const [archivedPattern] = await db
        .update(microBehaviorPatternSchema)
        .set({ 
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(microBehaviorPatternSchema.id, id),
            eq(microBehaviorPatternSchema.userId, userId),
          ),
        )
        .returning();

      logger.info('Micro-behavior pattern archived', {
        userId,
        patternId: id,
      });

      return NextResponse.json({
        pattern: archivedPattern,
        message: 'Micro-behavior pattern archived successfully',
      });
    } else {
      // Hard delete the pattern
      await db
        .delete(microBehaviorPatternSchema)
        .where(
          and(
            eq(microBehaviorPatternSchema.id, id),
            eq(microBehaviorPatternSchema.userId, userId),
          ),
        );

      logger.info('Micro-behavior pattern deleted', {
        userId,
        patternId: id,
      });

      return NextResponse.json({
        message: 'Micro-behavior pattern deleted successfully',
      });
    }
  } catch (error) {
    logger.error('Error deleting/archiving micro-behavior pattern', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};