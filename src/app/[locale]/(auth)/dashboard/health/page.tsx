import { currentUser } from '@clerk/nextjs/server';
import { getTranslations } from 'next-intl/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { healthGoalSchema, healthRecordSchema, healthTypeSchema } from '@/models/Schema';
import { HealthOverviewWrapper } from '@/components/health/HealthOverviewWrapper';
import { HealthSummaryCards } from '@/components/health/HealthSummaryCards';
import { transformToSummaryMetrics } from '@/utils/healthDataTransformers';
import type { HealthRecord, HealthGoal, HealthSummaryMetric } from '@/components/health/HealthOverview';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'HealthManagement',
  });

  return {
    title: t('page_title_dashboard'),
  };
}

export default async function HealthDashboard() {
  const t = await getTranslations('HealthManagement');
  const user = await currentUser();

  if (!user) {
    return null;
  }

  let summaryMetrics: HealthSummaryMetric[] = [];
  
  try {
    // Fetch recent records (last 10 for better trend analysis)
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
      .limit(10);

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

    summaryMetrics = transformToSummaryMetrics(recentRecords, activeGoals);
  } catch (error) {
    console.error('Error fetching health summary data:', error);
    // Error handled by returning empty metrics array
  }

  return (
    <div className="py-5 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('page_title_dashboard')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('dashboard_subtitle')}
          </p>
        </div>
      </div>
      
      {/* Health Overview Section */}
      <HealthOverviewWrapper />
      
      {/* Health Summary Cards Section */}
      <div className="space-y-4">
        <div className="border-t border-gray-200 pt-6">
          <HealthSummaryCards 
            metrics={summaryMetrics}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
