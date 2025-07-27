import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { ExerciseOverview } from '@/components/exercise/ExerciseOverview';
import { db } from '@/libs/DB';
import { exerciseLogSchema, exerciseSchema, trainingPlanSchema, trainingSessionSchema } from '@/models/Schema';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'ExerciseManagement',
  });

  return {
    title: t('page_title_dashboard'),
  };
}

async function getExerciseOverviewData(userId: string) {
  // Fetch recent exercise logs (last 5)
  const recentLogsRaw = await db
    .select({
      id: exerciseLogSchema.id,
      reps: exerciseLogSchema.reps,
      weight: exerciseLogSchema.weight,
      setNumber: exerciseLogSchema.setNumber,
      logged_at: exerciseLogSchema.loggedAt,
      exercise: exerciseSchema.name,
    })
    .from(exerciseLogSchema)
    .leftJoin(exerciseSchema, eq(exerciseLogSchema.exerciseId, exerciseSchema.id))
    .where(eq(exerciseLogSchema.userId, userId))
    .orderBy(desc(exerciseLogSchema.loggedAt))
    .limit(5);

  // Group by exercise and latest session
  const exerciseGroups = new Map();
  recentLogsRaw.forEach((log) => {
    const key = `${log.exercise}-${log.logged_at instanceof Date ? log.logged_at.toDateString() : log.logged_at}`;
    if (!exerciseGroups.has(key)) {
      exerciseGroups.set(key, {
        id: log.id,
        exercise: log.exercise ?? 'Unknown Exercise',
        sets: 1,
        reps: log.reps,
        weight: log.weight ? Number(log.weight) : null,
        logged_at: log.logged_at instanceof Date ? log.logged_at.toISOString() : log.logged_at,
      });
    } else {
      exerciseGroups.get(key).sets += 1;
    }
  });

  const recentLogs = Array.from(exerciseGroups.values()).slice(0, 3);

  // Fetch active training plans
  const activeTrainingPlansRaw = await db
    .select({
      id: trainingPlanSchema.id,
      name: trainingPlanSchema.name,
      difficulty: trainingPlanSchema.difficulty,
      sessions_per_week: trainingPlanSchema.sessionsPerWeek,
      is_active: trainingPlanSchema.isActive,
      start_date: trainingPlanSchema.startDate,
    })
    .from(trainingPlanSchema)
    .where(and(eq(trainingPlanSchema.userId, userId), eq(trainingPlanSchema.isActive, true)))
    .orderBy(desc(trainingPlanSchema.createdAt))
    .limit(3);

  const activeTrainingPlans = activeTrainingPlansRaw.map(plan => ({
    id: plan.id,
    name: plan.name,
    difficulty: plan.difficulty,
    sessions_per_week: plan.sessions_per_week,
    is_active: plan.is_active,
    start_date: plan.start_date instanceof Date ? plan.start_date.toISOString().slice(0, 10) : plan.start_date,
  }));

  // Stats
  const totalExerciseLogs = await db
    .select({ count: sql`COUNT(*)` })
    .from(exerciseLogSchema)
    .where(eq(exerciseLogSchema.userId, userId));

  const activePlansCount = activeTrainingPlans.length;

  const completedSessions = await db
    .select({ count: sql`COUNT(*)` })
    .from(trainingSessionSchema)
    .where(and(eq(trainingSessionSchema.userId, userId), eq(trainingSessionSchema.status, 'completed')));

  // Weekly progress: count of exercise logs in the last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyLogs = await db
    .select({ count: sql`COUNT(*)` })
    .from(exerciseLogSchema)
    .where(and(
      eq(exerciseLogSchema.userId, userId),
      sql`${exerciseLogSchema.loggedAt} >= ${weekAgo.toISOString()}`,
    ));

  const stats = {
    totalExerciseLogs: Number(totalExerciseLogs[0]?.count || 0),
    activePlans: activePlansCount,
    completedSessions: Number(completedSessions[0]?.count || 0),
    weeklyProgress: Number(weeklyLogs[0]?.count || 0),
  };

  return { recentLogs, activeTrainingPlans, stats };
}

export default async function ExerciseDashboard() {
  const t = await getTranslations('ExerciseManagement');
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const { recentLogs, activeTrainingPlans, stats } = await getExerciseOverviewData(user.id);

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
      <ExerciseOverview 
        recentLogs={recentLogs}
        activeTrainingPlans={activeTrainingPlans}
        stats={stats}
      />
    </div>
  );
}
