// Types matching those in HealthOverview
import type { HealthGoal, HealthRecord } from './HealthOverview';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { db } from '@/libs/DB';
import { healthGoalSchema, healthRecordSchema, healthTypeSchema } from '@/models/Schema';
import { transformToSummaryMetrics } from '@/utils/healthDataTransformers';

import { HealthSummaryCards } from './HealthSummaryCards';

export const HealthSummaryCardsWrapper = async ({ className = '' }: { className?: string }) => {
  const user = await currentUser();
  const t = await getTranslations('HealthManagement');

  if (!user) {
    return null;
  }

  try {
    // Fetch recent records (last 30 records to have enough data for trends)
    const recentRecordsRaw = await db
      .select({
        id: healthRecordSchema.id,
        value: healthRecordSchema.value,
        unit: healthRecordSchema.unit,
        recorded_at: healthRecordSchema.recordedAt,
        type: healthTypeSchema.displayName,
        type_id: healthRecordSchema.typeId,
      })
      .from(healthRecordSchema)
      .leftJoin(healthTypeSchema, eq(healthRecordSchema.typeId, healthTypeSchema.id))
      .where(eq(healthRecordSchema.userId, user.id))
      .orderBy(desc(healthRecordSchema.recordedAt))
      .limit(30);

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
      .orderBy(desc(healthGoalSchema.createdAt));

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

    // Transform data to summary metrics format
    const summaryMetrics = transformToSummaryMetrics(recentRecords, activeGoals);

    return <HealthSummaryCards metrics={summaryMetrics} className={className} />;
  } catch (error) {
    console.error('Error fetching health summary data:', error);
    return <HealthSummaryCards metrics={[]} className={className} />;
  }
};
