import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Env } from '@/libs/Env';
import { healthTypeSchema } from '@/models/Schema';

const db = drizzle({
  connection: {
    connectionString: Env.DATABASE_URL,
    ssl: !Env.DATABASE_URL.includes('localhost') && !Env.DATABASE_URL.includes('127.0.0.1'),
  },
});

// Health types relevant for behavior change tracking
const healthTypes = [
  // Physiological Metrics - Core health indicators
  {
    slug: 'weight',
    displayName: 'Weight',
    unit: 'kg',
    typicalRangeLow: 40.0,
    typicalRangeHigh: 150.0,
  },
  {
    slug: 'body_fat_percentage',
    displayName: 'Body Fat Percentage',
    unit: '%',
    typicalRangeLow: 10.0,
    typicalRangeHigh: 35.0,
  },
  {
    slug: 'muscle_mass',
    displayName: 'Muscle Mass',
    unit: 'kg',
    typicalRangeLow: 20.0,
    typicalRangeHigh: 80.0,
  },
  {
    slug: 'resting_heart_rate',
    displayName: 'Resting Heart Rate',
    unit: 'bpm',
    typicalRangeLow: 50.0,
    typicalRangeHigh: 100.0,
  },
  {
    slug: 'blood_pressure_systolic',
    displayName: 'Blood Pressure (Systolic)',
    unit: 'mmHg',
    typicalRangeLow: 90.0,
    typicalRangeHigh: 140.0,
  },
  {
    slug: 'blood_pressure_diastolic',
    displayName: 'Blood Pressure (Diastolic)',
    unit: 'mmHg',
    typicalRangeLow: 60.0,
    typicalRangeHigh: 90.0,
  },
  {
    slug: 'vo2_max',
    displayName: 'VO2 Max',
    unit: 'ml/kg/min',
    typicalRangeLow: 20.0,
    typicalRangeHigh: 80.0,
  },

  // Performance Metrics - Fitness and exercise tracking
  {
    slug: 'strength_benchmark_squat',
    displayName: 'Squat 1RM',
    unit: 'kg',
    typicalRangeLow: 30.0,
    typicalRangeHigh: 250.0,
  },
  {
    slug: 'strength_benchmark_deadlift',
    displayName: 'Deadlift 1RM',
    unit: 'kg',
    typicalRangeLow: 40.0,
    typicalRangeHigh: 300.0,
  },
  {
    slug: 'strength_benchmark_bench_press',
    displayName: 'Bench Press 1RM',
    unit: 'kg',
    typicalRangeLow: 20.0,
    typicalRangeHigh: 200.0,
  },
  {
    slug: 'cardio_endurance_5k_time',
    displayName: '5K Run Time',
    unit: 'minutes',
    typicalRangeLow: 15.0,
    typicalRangeHigh: 40.0,
  },
  {
    slug: 'flexibility_sit_reach',
    displayName: 'Sit-and-Reach Test',
    unit: 'cm',
    typicalRangeLow: -10.0,
    typicalRangeHigh: 40.0,
  },

  // Behavioral Metrics - For habit tracking and behavior change
  {
    slug: 'workout_frequency_weekly',
    displayName: 'Weekly Workout Frequency',
    unit: 'sessions',
    typicalRangeLow: 0.0,
    typicalRangeHigh: 7.0,
  },
  {
    slug: 'workout_duration_average',
    displayName: 'Average Workout Duration',
    unit: 'minutes',
    typicalRangeLow: 15.0,
    typicalRangeHigh: 120.0,
  },
  {
    slug: 'habit_consistency_score',
    displayName: 'Habit Consistency Score',
    unit: '%',
    typicalRangeLow: 0.0,
    typicalRangeHigh: 100.0,
  },
  {
    slug: 'goal_completion_rate',
    displayName: 'Goal Completion Rate',
    unit: '%',
    typicalRangeLow: 0.0,
    typicalRangeHigh: 100.0,
  },
  {
    slug: 'motivation_level',
    displayName: 'Motivation Level',
    unit: 'scale 1-10',
    typicalRangeLow: 1.0,
    typicalRangeHigh: 10.0,
  },

  // Wellness Metrics - For holistic behavior tracking
  {
    slug: 'sleep_duration',
    displayName: 'Sleep Duration',
    unit: 'hours',
    typicalRangeLow: 4.0,
    typicalRangeHigh: 12.0,
  },
  {
    slug: 'sleep_quality_score',
    displayName: 'Sleep Quality Score',
    unit: 'scale 1-10',
    typicalRangeLow: 1.0,
    typicalRangeHigh: 10.0,
  },
  {
    slug: 'stress_level',
    displayName: 'Stress Level',
    unit: 'scale 1-10',
    typicalRangeLow: 1.0,
    typicalRangeHigh: 10.0,
  },
  {
    slug: 'energy_level',
    displayName: 'Energy Level',
    unit: 'scale 1-10',
    typicalRangeLow: 1.0,
    typicalRangeHigh: 10.0,
  },
  {
    slug: 'mood_score',
    displayName: 'Mood Score',
    unit: 'scale 1-10',
    typicalRangeLow: 1.0,
    typicalRangeHigh: 10.0,
  },
  {
    slug: 'hydration_intake',
    displayName: 'Daily Water Intake',
    unit: 'liters',
    typicalRangeLow: 1.0,
    typicalRangeHigh: 4.0,
  },

  // Recovery Metrics - For training optimization
  {
    slug: 'recovery_score',
    displayName: 'Recovery Score',
    unit: '%',
    typicalRangeLow: 0.0,
    typicalRangeHigh: 100.0,
  },
  {
    slug: 'muscle_soreness_level',
    displayName: 'Muscle Soreness Level',
    unit: 'scale 1-10',
    typicalRangeLow: 1.0,
    typicalRangeHigh: 10.0,
  },
  {
    slug: 'perceived_exertion_rpe',
    displayName: 'Rate of Perceived Exertion',
    unit: 'RPE 1-10',
    typicalRangeLow: 1.0,
    typicalRangeHigh: 10.0,
  },

  // Nutrition Metrics - For comprehensive lifestyle tracking
  {
    slug: 'calorie_intake',
    displayName: 'Daily Calorie Intake',
    unit: 'kcal',
    typicalRangeLow: 1200.0,
    typicalRangeHigh: 4000.0,
  },
  {
    slug: 'protein_intake',
    displayName: 'Daily Protein Intake',
    unit: 'grams',
    typicalRangeLow: 30.0,
    typicalRangeHigh: 200.0,
  },
  {
    slug: 'carb_intake',
    displayName: 'Daily Carbohydrate Intake',
    unit: 'grams',
    typicalRangeLow: 50.0,
    typicalRangeHigh: 500.0,
  },
  {
    slug: 'fat_intake',
    displayName: 'Daily Fat Intake',
    unit: 'grams',
    typicalRangeLow: 20.0,
    typicalRangeHigh: 150.0,
  },
];

async function seedHealthTypes() {
  console.log('🌱 Seeding health types for behavior change tracking...');

  try {
    console.log('Inserting health types...');
    for (const healthType of healthTypes) {
      const existing = await db
        .select()
        .from(healthTypeSchema)
        .where(eq(healthTypeSchema.slug, healthType.slug))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(healthTypeSchema).values(healthType);
        console.log(`✅ Added health type: ${healthType.displayName}`);
      } else {
        console.log(`⏭️  Health type already exists: ${healthType.displayName}`);
      }
    }

    console.log('🎉 Health types seeded successfully!');
    console.log(`📊 Total health types: ${healthTypes.length}`);
    console.log('📋 Categories included:');
    console.log('   - Physiological Metrics (7 types)');
    console.log('   - Performance Metrics (5 types)');
    console.log('   - Behavioral Metrics (5 types)');
    console.log('   - Wellness Metrics (6 types)');
    console.log('   - Recovery Metrics (3 types)');
    console.log('   - Nutrition Metrics (4 types)');
  } catch (error) {
    console.error('❌ Error seeding health types:', error);
    process.exit(1);
  }
}

seedHealthTypes();
