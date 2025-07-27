'use server';

// Types matching those in HealthOverview
import type { HealthGoal, HealthRecord, HealthStats } from './HealthOverview';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { db } from '@/libs/DB';
import { healthGoalSchema, healthRecordSchema, healthTypeSchema } from '@/models/Schema';

import { HealthOverview } from './HealthOverview';

export const HealthOverviewWrapper = async () => {
  const user = await currentUser();
  const t = await getTranslations('HealthManagement');

  if (!user) {
    return null;
  }

  // Fetch recent records (last 3)
  const recentRecordsRaw = await db
    .select({
      id: healthRecordSchema.id,
      value: healthRecordSchema.value,
      unit: healthRecordSchema.unit,
      recorded_at: healthRecordSchema.recordedAt,
      type: healthTypeSchema.displayName,
    })
    .from(healthRecordSchema)
    .leftJoin(healthTypeSchema, eq(healthRecordSchema.typeId, healthTypeSchema.id))
    .where(eq(healthRecordSchema.userId, user.id))
    .orderBy(desc(healthRecordSchema.recordedAt))
    .limit(3);

  const recentRecords: HealthRecord[] = recentRecordsRaw.map(r => ({
    id: r.id,
    type: r.type ?? '',
    value: Number(r.value),
    unit: r.unit,
    recorded_at: r.recorded_at instanceof Date ? r.recorded_at.toISOString() : r.recorded_at,
  }));

  // Fetch active goals
  const activeGoalsRaw = await db
    .select({
      id: healthGoalSchema.id,
      type: healthTypeSchema.displayName,
      target_value: healthGoalSchema.targetValue,
      target_date: healthGoalSchema.targetDate,
      status: healthGoalSchema.status,
      type_id: healthGoalSchema.typeId,
      unit: healthTypeSchema.unit,
    })
    .from(healthGoalSchema)
    .leftJoin(healthTypeSchema, eq(healthGoalSchema.typeId, healthTypeSchema.id))
    .where(and(eq(healthGoalSchema.userId, user.id), eq(healthGoalSchema.status, 'active')))
    .orderBy(desc(healthGoalSchema.createdAt))
    .limit(3);

  // For each goal, get the latest record for progress
  const activeGoals: HealthGoal[] = await Promise.all(activeGoalsRaw.map(async (goal) => {
    const latestRecord = await db
      .select({ value: healthRecordSchema.value })
      .from(healthRecordSchema)
      .where(and(eq(healthRecordSchema.userId, user.id), eq(healthRecordSchema.typeId, goal.type_id)))
      .orderBy(desc(healthRecordSchema.recordedAt))
      .limit(1);
    const current_value = latestRecord[0]?.value ? Number(latestRecord[0].value) : 0;
    return {
      id: goal.id,
      type: goal.type ?? '',
      target_value: Number(goal.target_value),
      current_value,
      target_date: goal.target_date instanceof Date ? goal.target_date.toISOString().slice(0, 10) : goal.target_date,
      status: goal.status,
    };
  }));

  // Stats
  const totalRecords = await db
    .select({ count: sql`COUNT(*)` })
    .from(healthRecordSchema)
    .where(eq(healthRecordSchema.userId, user.id));
  const activeGoalsCount = activeGoals.length;
  const completedGoals = await db
    .select({ count: sql`COUNT(*)` })
    .from(healthGoalSchema)
    .where(and(eq(healthGoalSchema.userId, user.id), eq(healthGoalSchema.status, 'completed')));

  // Weekly progress: count of records in the last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyRecords = await db
    .select({ count: sql`COUNT(*)` })
    .from(healthRecordSchema)
    .where(and(
      eq(healthRecordSchema.userId, user.id),
      sql`${healthRecordSchema.recordedAt} >= ${weekAgo.toISOString()}`,
    ));

  const stats: HealthStats = {
    totalRecords: Number(totalRecords[0]?.count || 0),
    activeGoals: activeGoalsCount,
    completedGoals: Number(completedGoals[0]?.count || 0),
    weeklyProgress: Number(weeklyRecords[0]?.count || 0),
  };

  return <HealthOverview recentRecords={recentRecords} activeGoals={activeGoals} stats={stats} />;
};
