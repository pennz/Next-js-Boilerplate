import type { GoalStatusType } from '@/validations/HealthGoalValidation';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import z from 'zod';
import { db } from '@/libs/DB';
import { logger } from '@/libs/Logger';
import { healthGoalSchema, healthRecordSchema, healthTypeSchema } from '@/models/Schema';
import {

  HealthGoalUpdateValidation,
  HealthGoalValidation,
} from '@/validations/HealthGoalValidation';

// GET - List user's health goals
export const GET = async (request: Request) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const typeId = url.searchParams.get('type_id');
    const status = url.searchParams.get('status') as GoalStatusType | null;

    const whereConditions = [eq(healthGoalSchema.userId, user.id)];

    if (typeId) {
      whereConditions.push(eq(healthGoalSchema.typeId, Number.parseInt(typeId)));
    }

    if (status) {
      whereConditions.push(eq(healthGoalSchema.status, status));
    }

    const goals = await db
      .select({
        id: healthGoalSchema.id,
        typeId: healthGoalSchema.typeId,
        targetValue: healthGoalSchema.targetValue,
        targetDate: healthGoalSchema.targetDate,
        status: healthGoalSchema.status,
        createdAt: healthGoalSchema.createdAt,
        updatedAt: healthGoalSchema.updatedAt,
        healthType: {
          id: healthTypeSchema.id,
          slug: healthTypeSchema.slug,
          displayName: healthTypeSchema.displayName,
          unit: healthTypeSchema.unit,
        },
      })
      .from(healthGoalSchema)
      .leftJoin(healthTypeSchema, eq(healthGoalSchema.typeId, healthTypeSchema.id))
      .where(and(...whereConditions))
      .orderBy(desc(healthGoalSchema.createdAt));

    // Calculate progress for each goal
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        // Get the latest health record for this type to calculate progress
        const latestRecord = await db
          .select({
            value: healthRecordSchema.value,
            recordedAt: healthRecordSchema.recordedAt,
          })
          .from(healthRecordSchema)
          .where(
            and(
              eq(healthRecordSchema.userId, user.id),
              eq(healthRecordSchema.typeId, goal.typeId),
            ),
          )
          .orderBy(desc(healthRecordSchema.recordedAt))
          .limit(1);

        const currentValue = latestRecord[0]?.value ? Number.parseFloat(latestRecord[0].value) : 0;
        const targetValue = Number.parseFloat(goal.targetValue);
        const progressPercentage = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;

        // Calculate days remaining
        const today = new Date();
        const targetDate = new Date(goal.targetDate);
        const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...goal,
          currentValue,
          progressPercentage: Math.round(progressPercentage * 100) / 100,
          daysRemaining,
          isOverdue: daysRemaining < 0,
          lastRecordedAt: latestRecord[0]?.recordedAt || null,
        };
      }),
    );

    logger.info(`Retrieved ${goals.length} health goals for user ${user.id}`);

    return NextResponse.json({
      goals: goalsWithProgress,
      total: goals.length,
    });
  } catch (error) {
    logger.error('Error retrieving health goals:', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// POST - Create new health goal
export const POST = async (request: Request) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const parse = HealthGoalValidation.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    // Check if health type exists
    const healthType = await db
      .select()
      .from(healthTypeSchema)
      .where(eq(healthTypeSchema.id, parse.data.type_id))
      .limit(1);

    if (healthType.length === 0) {
      return NextResponse.json(
        { error: 'Invalid health type ID' },
        { status: 400 },
      );
    }

    // Check if user already has an active goal for this health type
    const existingGoal = await db
      .select()
      .from(healthGoalSchema)
      .where(
        and(
          eq(healthGoalSchema.userId, user.id),
          eq(healthGoalSchema.typeId, parse.data.type_id),
          eq(healthGoalSchema.status, 'active'),
        ),
      )
      .limit(1);

    if (existingGoal.length > 0) {
      return NextResponse.json(
        { error: 'An active goal already exists for this health type' },
        { status: 409 },
      );
    }

    const newGoal = await db
      .insert(healthGoalSchema)
      .values({
        userId: user.id,
        typeId: parse.data.type_id,
        targetValue: parse.data.target_value.toString(),
        targetDate: parse.data.target_date,
        status: parse.data.status,
      })
      .returning();

    logger.info(`Created new health goal for user ${user.id}, type ${parse.data.type_id}`);

    return NextResponse.json({
      goal: newGoal[0],
      message: 'Health goal created successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating health goal:', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// PATCH - Update existing health goal
export const PATCH = async (request: Request) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const { id, ...updateData } = json;

    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 },
      );
    }

    const parse = HealthGoalUpdateValidation.safeParse(updateData);

    if (!parse.success) {
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    // Check if goal exists and belongs to user
    const existingGoal = await db
      .select()
      .from(healthGoalSchema)
      .where(
        and(
          eq(healthGoalSchema.id, id),
          eq(healthGoalSchema.userId, user.id),
        ),
      )
      .limit(1);

    if (existingGoal.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found or access denied' },
        { status: 404 },
      );
    }

    // Prepare update data
    const updateValues: any = {};
    if (parse.data.target_value !== undefined) {
      updateValues.targetValue = parse.data.target_value.toString();
    }
    if (parse.data.target_date !== undefined) {
      updateValues.targetDate = parse.data.target_date;
    }
    if (parse.data.status !== undefined) {
      updateValues.status = parse.data.status;
    }

    // Business logic for status transitions
    if (parse.data.status === 'completed') {
      // Auto-complete goal if target is reached
      const latestRecord = await db
        .select({ value: healthRecordSchema.value })
        .from(healthRecordSchema)
        .where(
          and(
            eq(healthRecordSchema.userId, user.id),
            eq(healthRecordSchema.typeId, existingGoal[0]?.typeId || 0),
          ),
        )
        .orderBy(desc(healthRecordSchema.recordedAt))
        .limit(1);

      const currentValue = latestRecord[0]?.value ? Number.parseFloat(latestRecord[0].value) : 0;
      const targetValue = Number.parseFloat(updateValues.targetValue || existingGoal[0]?.targetValue || '0');

      if (currentValue < targetValue) {
        logger.warn(`Goal ${id} marked as completed but target not reached. Current: ${currentValue}, Target: ${targetValue}`);
      }
    }

    const updatedGoal = await db
      .update(healthGoalSchema)
      .set(updateValues)
      .where(eq(healthGoalSchema.id, id))
      .returning();

    logger.info(`Updated health goal ${id} for user ${user.id}`);

    return NextResponse.json({
      goal: updatedGoal[0],
      message: 'Health goal updated successfully',
    });
  } catch (error) {
    logger.error('Error updating health goal:', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// DELETE - Remove health goal
export const DELETE = async (request: Request) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 },
      );
    }

    // Check if goal exists and belongs to user
    const existingGoal = await db
      .select()
      .from(healthGoalSchema)
      .where(
        and(
          eq(healthGoalSchema.id, Number.parseInt(id)),
          eq(healthGoalSchema.userId, user.id),
        ),
      )
      .limit(1);

    if (existingGoal.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found or access denied' },
        { status: 404 },
      );
    }

    // Soft delete by setting status to paused instead of hard delete
    // This preserves historical data for analytics
    await db
      .update(healthGoalSchema)
      .set({ status: 'paused' })
      .where(eq(healthGoalSchema.id, Number.parseInt(id)));

    logger.info(`Soft deleted health goal ${id} for user ${user.id}`);

    return NextResponse.json({
      message: 'Health goal removed successfully',
    });
  } catch (error) {
    logger.error('Error deleting health goal:', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};
