import { currentUser } from '@clerk/nextjs/server';
import { parseExpression } from 'cron-parser';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import z from 'zod';
import { db } from '@/libs/DB';
import { logger } from '@/libs/Logger';
import { healthReminderSchema } from '@/models/Schema';
import {
  HealthReminderQueryValidation,
  HealthReminderUpdateValidation,
  HealthReminderValidation,
} from '@/validations/HealthReminderValidation';

export const GET = async (request: Request) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParse = HealthReminderQueryValidation.safeParse({
      active: searchParams.get('active'),
      type_id: searchParams.get('type_id'),
    });

    if (!queryParse.success) {
      return NextResponse.json(z.treeifyError(queryParse.error), { status: 422 });
    }

    const conditions = [eq(healthReminderSchema.userId, user.id)];

    if (queryParse.data.active !== undefined) {
      conditions.push(eq(healthReminderSchema.active, queryParse.data.active));
    }

    if (queryParse.data.type_id) {
      conditions.push(eq(healthReminderSchema.typeId, queryParse.data.type_id));
    }

    const reminders = await db
      .select()
      .from(healthReminderSchema)
      .where(and(...conditions))
      .orderBy(healthReminderSchema.createdAt);

    logger.info(`Retrieved ${reminders.length} health reminders for user ${user.id}`);

    return NextResponse.json({ reminders });
  } catch (error) {
    logger.error('Error retrieving health reminder:', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

export const POST = async (request: Request) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const parse = HealthReminderValidation.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    // Calculate next execution time from cron expression
    let nextRunAt: Date | null = null;
    try {
      const interval = parseExpression(parse.data.cron_expr);
      nextRunAt = interval.next().toDate();
    } catch (cronError) {
      logger.error('Invalid cron expression:', { cronError });
      return NextResponse.json(
        { error: 'Invalid cron expression format' },
        { status: 422 },
      );
    }

    const reminder = await db
      .insert(healthReminderSchema)
      .values({
        userId: user.id,
        typeId: parse.data.type_id,
        cronExpr: parse.data.cron_expr,
        message: parse.data.message,
        active: parse.data.active,
        nextRunAt,
      })
      .returning();

    logger.info(`Created health reminder ${reminder[0]?.id} for user ${user.id}`);

    return NextResponse.json({ reminder: reminder[0] }, { status: 201 });
  } catch (error) {
    logger.error('Error creating health reminder:', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

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
        { error: 'Reminder ID is required' },
        { status: 400 },
      );
    }

    const parse = HealthReminderUpdateValidation.safeParse(updateData);

    if (!parse.success) {
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    // Calculate new next execution time if cron expression is being updated
    let nextRunAt: Date | null = null;
    if (parse.data.cron_expr) {
      try {
        const interval = parseExpression(parse.data.cron_expr);
        nextRunAt = interval.next().toDate();
      } catch (cronError) {
        logger.error('Invalid cron expression:', { cronError });
        return NextResponse.json(
          { error: 'Invalid cron expression format' },
          { status: 422 },
        );
      }
    }

    const updateValues = {
      ...parse.data,
      ...(nextRunAt && { nextRunAt }),
    };

    const reminder = await db
      .update(healthReminderSchema)
      .set(updateValues)
      .where(
        and(
          eq(healthReminderSchema.id, id),
          eq(healthReminderSchema.userId, user.id),
        ),
      )
      .returning();

    if (!reminder[0]) {
      return NextResponse.json(
        { error: 'Reminder not found or access denied' },
        { status: 404 },
      );
    }

    logger.info(`Updated health reminder ${id} for user ${user.id}`);

    return NextResponse.json({ reminder: reminder[0] });
  } catch (error) {
    logger.error('Error updating health reminder:', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

export const DELETE = async (request: Request) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Reminder ID is required' },
        { status: 400 },
      );
    }

    // Soft delete by setting active to false instead of hard delete
    const reminder = await db
      .update(healthReminderSchema)
      .set({ active: false })
      .where(
        and(
          eq(healthReminderSchema.id, Number(id)),
          eq(healthReminderSchema.userId, user.id),
        ),
      )
      .returning();

    if (!reminder[0]) {
      return NextResponse.json(
        { error: 'Reminder not found or access denied' },
        { status: 404 },
      );
    }

    logger.info(`Deactivated health reminder ${id} for user ${user.id}`);

    return NextResponse.json({
      message: 'Reminder deactivated successfully',
      reminder: reminder[0],
    });
  } catch (error) {
    logger.error('Error deactivating health reminder:', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};
