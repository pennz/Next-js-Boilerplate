import { drizzle } from 'drizzle-orm/node-postgres';
import { Env } from '@/libs/Env';
import {
  behavioralEventSchema,
  contextPatternSchema,
  exerciseLogSchema,
  exerciseSchema,
  healthRecordSchema,
  healthTypeSchema,
  microBehaviorPatternSchema,
  userConstraintSchema,
  userFitnessGoalSchema,
  userPreferenceSchema,
  userProfileSchema,
} from '@/models/Schema';

const db = drizzle({
  connection: {
    connectionString: Env.DATABASE_URL,
    ssl: !Env.DATABASE_URL.includes('localhost') && !Env.DATABASE_URL.includes('127.0.0.1'),
  },
});

// Sample user IDs for testing (in production, these would be real Clerk user IDs)
const SAMPLE_USER_IDS = [
  'user_test_behavior_001',
  'user_test_behavior_002',
  'user_test_behavior_003',
];

async function seedSampleBehavioralData() {
  console.log('🌱 Seeding sample behavioral data for pattern recognition testing...');

  try {
    // Get exercise and health type IDs for references
    const exercises = await db.select().from(exerciseSchema);
    const healthTypes = await db.select().from(healthTypeSchema);

    const exerciseMap = new Map(exercises.map(e => [e.name, e.id]));
    const healthTypeMap = new Map(healthTypes.map(ht => [ht.slug, ht.id]));

    for (const userId of SAMPLE_USER_IDS) {
      console.log(`🧪 Creating test data for user: ${userId}`);

      // 1. Create User Profile
      await createUserProfile(userId);

      // 2. Create User Preferences
      await createUserPreferences(userId);

      // 3. Create User Constraints
      await createUserConstraints(userId);

      // 4. Create Fitness Goals
      await createFitnessGoals(userId);

      // 5. Create Sample Health Records
      await createHealthRecords(userId, healthTypeMap);

      // 6. Create Sample Exercise Logs
      await createExerciseLogs(userId, exerciseMap);

      // 7. Create Behavioral Events
      await createBehavioralEvents(userId, exerciseMap, healthTypeMap);

      // 8. Create Micro-Behavior Patterns
      await createMicroBehaviorPatterns(userId);

      // 9. Create Context Patterns
      await createContextPatterns(userId);

      console.log(`✅ Completed behavioral data for user: ${userId}`);
    }

    console.log('🎉 Sample behavioral data seeded successfully!');
    console.log('📊 Data created for pattern recognition testing:');
    console.log('   - User profiles with varying fitness levels');
    console.log('   - Diverse behavioral event patterns');
    console.log('   - Context-dependent workout success patterns');
    console.log('   - Habit strength variation over time');
    console.log('   - Multiple user types for comparison analysis');
  } catch (error) {
    console.error('❌ Error seeding behavioral data:', error);
    process.exit(1);
  }
}

async function createUserProfile(userId: string) {
  const profileData = {
    userId,
    fitnessLevel: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)] as any,
    experienceYears: Math.floor(Math.random() * 10),
    timezone: 'UTC',
    dateOfBirth: new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), 1),
    height: 160 + Math.random() * 40, // 160-200cm
    weight: 60 + Math.random() * 40, // 60-100kg
    activityLevel: ['sedentary', 'light', 'moderate', 'active', 'very_active'][Math.floor(Math.random() * 5)],
    profileCompleteness: 80 + Math.floor(Math.random() * 20),
  };

  await db.insert(userProfileSchema).values(profileData).onConflictDoNothing();
}

async function createUserPreferences(userId: string) {
  const preferenceData = {
    userId,
    preferredWorkoutTypes: JSON.stringify(['strength', 'cardio']),
    preferredEquipment: JSON.stringify(['none', 'dumbbells']),
    preferredTimeOfDay: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)] as any,
    preferredDaysOfWeek: JSON.stringify(['monday', 'wednesday', 'friday']),
    sessionDurationMin: 30,
    sessionDurationMax: 60,
    workoutFrequencyPerWeek: 3 + Math.floor(Math.random() * 4),
    intensityPreference: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)] as any,
    reminderEnabled: Math.random() > 0.3,
    autoProgressionEnabled: Math.random() > 0.5,
  };

  await db.insert(userPreferenceSchema).values(preferenceData).onConflictDoNothing();
}

async function createUserConstraints(userId: string) {
  const constraints = [
    {
      userId,
      constraintType: 'schedule' as any,
      severity: 'medium' as any,
      title: 'Work Schedule Conflict',
      description: 'Busy schedule from 9 AM to 6 PM on weekdays',
      timeRestrictions: { weekdays: { start: '09:00', end: '18:00' } },
      isActive: true,
    },
    {
      userId,
      constraintType: 'equipment' as any,
      severity: 'low' as any,
      title: 'Limited Equipment',
      description: 'Home gym with basic equipment only',
      restrictedEquipment: JSON.stringify(['barbell', 'squat_rack']),
      isActive: Math.random() > 0.5,
    },
  ];

  for (const constraint of constraints) {
    await db.insert(userConstraintSchema).values(constraint);
  }
}

async function createFitnessGoals(userId: string) {
  const goals = [
    {
      userId,
      goalType: 'weight_loss' as any,
      targetValue: 75.0,
      currentValue: 80.0,
      unit: 'kg',
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      priority: 1,
      status: 'active' as any,
      description: 'Lose 5kg in 3 months through consistent exercise',
    },
    {
      userId,
      goalType: 'strength' as any,
      targetValue: 100.0,
      currentValue: 80.0,
      unit: 'kg',
      targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
      priority: 2,
      status: 'active' as any,
      description: 'Increase deadlift to 100kg',
    },
  ];

  for (const goal of goals) {
    await db.insert(userFitnessGoalSchema).values(goal);
  }
}

async function createHealthRecords(userId: string, healthTypeMap: Map<string, number>) {
  const weightTypeId = healthTypeMap.get('weight');
  const motivationTypeId = healthTypeMap.get('motivation_level');
  const energyTypeId = healthTypeMap.get('energy_level');
  const stressTypeId = healthTypeMap.get('stress_level');

  if (!weightTypeId || !motivationTypeId || !energyTypeId || !stressTypeId) {
    console.log('⚠️  Some health types not found, skipping health records');
    return;
  }

  const healthRecords = [];
  const now = new Date();

  // Create 30 days of sample data with patterns
  for (let i = 0; i < 30; i++) {
    const recordDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

    // Weight - slight downward trend with noise
    healthRecords.push({
      userId,
      typeId: weightTypeId,
      value: 80 - (i * 0.1) + (Math.random() - 0.5) * 2,
      unit: 'kg',
      recordedAt: recordDate,
    });

    // Motivation - higher on workout days, varies with stress
    const isWorkoutDay = i % 3 === 0; // Every third day
    healthRecords.push({
      userId,
      typeId: motivationTypeId,
      value: (isWorkoutDay ? 7 : 5) + Math.random() * 3,
      unit: 'scale 1-10',
      recordedAt: recordDate,
    });

    // Energy - correlates with motivation but delayed
    healthRecords.push({
      userId,
      typeId: energyTypeId,
      value: 6 + Math.random() * 3 + (isWorkoutDay ? 1 : -0.5),
      unit: 'scale 1-10',
      recordedAt: recordDate,
    });

    // Stress - inversely correlates with exercise
    healthRecords.push({
      userId,
      typeId: stressTypeId,
      value: 5 + Math.random() * 3 - (isWorkoutDay ? 1.5 : 0),
      unit: 'scale 1-10',
      recordedAt: recordDate,
    });
  }

  for (const record of healthRecords) {
    await db.insert(healthRecordSchema).values(record);
  }
}

async function createExerciseLogs(userId: string, exerciseMap: Map<string, number>) {
  const pushupId = exerciseMap.get('Push-ups');
  const squatId = exerciseMap.get('Bodyweight Squats');
  const walkingId = exerciseMap.get('Walking');

  if (!pushupId || !squatId || !walkingId) {
    console.log('⚠️  Some exercises not found, skipping exercise logs');
    return;
  }

  const now = new Date();
  const exerciseLogs = [];

  // Create workout sessions over past 30 days
  for (let i = 0; i < 10; i++) {
    const workoutDate = new Date(now.getTime() - i * 3 * 24 * 60 * 60 * 1000);

    // Progressive improvement in push-ups
    exerciseLogs.push({
      userId,
      exerciseId: pushupId,
      setNumber: 1,
      reps: 10 + i, // Gradual improvement
      loggedAt: workoutDate,
      rpe: 6 + Math.floor(Math.random() * 3),
      notes: i < 3 ? 'Feeling strong!' : 'Building consistency',
    });

    // Consistent squats
    exerciseLogs.push({
      userId,
      exerciseId: squatId,
      setNumber: 1,
      reps: 15 + Math.floor(Math.random() * 5),
      loggedAt: workoutDate,
      rpe: 5 + Math.floor(Math.random() * 3),
    });

    // Walking sessions - duration varies
    exerciseLogs.push({
      userId,
      exerciseId: walkingId,
      setNumber: 1,
      duration: 1800 + Math.floor(Math.random() * 1200), // 30-50 minutes
      distance: 2.5 + Math.random() * 2, // 2.5-4.5 km
      loggedAt: workoutDate,
      rpe: 4 + Math.floor(Math.random() * 2),
    });
  }

  for (const log of exerciseLogs) {
    await db.insert(exerciseLogSchema).values(log);
  }
}

async function createBehavioralEvents(userId: string, _exerciseMap: Map<string, number>, _healthTypeMap: Map<string, number>) {
  const events = [];
  const now = new Date();

  // Create diverse behavioral events over past 30 days
  for (let i = 0; i < 50; i++) {
    const eventDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);

    const eventTypes = [
      {
        eventName: 'workout_completed',
        entityType: 'exercise_log' as any,
        context: {
          duration: 30 + Math.random() * 60,
          timeOfDay: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)],
          location: ['home', 'gym'][Math.floor(Math.random() * 2)],
          mood: 6 + Math.random() * 4,
          energyBefore: 5 + Math.random() * 3,
          energyAfter: 7 + Math.random() * 3,
        },
      },
      {
        eventName: 'workout_skipped',
        entityType: 'training_session' as any,
        context: {
          reason: ['tired', 'busy', 'unmotivated', 'sick'][Math.floor(Math.random() * 4)],
          timeOfDay: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)],
          stressLevel: 6 + Math.random() * 4,
        },
      },
      {
        eventName: 'health_data_logged',
        entityType: 'health_record' as any,
        context: {
          dataType: ['weight', 'mood', 'energy', 'sleep'][Math.floor(Math.random() * 4)],
          consistency: Math.random() > 0.3,
        },
      },
      {
        eventName: 'goal_progress_checked',
        entityType: 'health_goal' as any,
        context: {
          progressPercentage: 20 + Math.random() * 60,
          motivationChange: Math.random() > 0.6 ? 1 : -0.5,
        },
      },
    ];

    const selectedEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    events.push({
      userId,
      eventName: selectedEvent.eventName,
      entityType: selectedEvent.entityType,
      entityId: Math.floor(Math.random() * 100) + 1,
      context: selectedEvent.context,
      sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: eventDate,
    });
  }

  for (const event of events) {
    await db.insert(behavioralEventSchema).values(event);
  }
}

async function createMicroBehaviorPatterns(userId: string) {
  const patterns = [
    {
      userId,
      patternName: 'Morning Workout Consistency',
      behaviorType: 'habit',
      frequency: 4,
      frequencyPeriod: 'week',
      consistency: 75.5,
      strength: 82.3,
      triggers: {
        temporal: ['06:00-08:00'],
        environmental: ['bedroom', 'living_room'],
        emotional: ['energized', 'motivated'],
      },
      outcomes: {
        positive: ['improved_mood', 'higher_energy'],
        negative: [],
      },
      context: {
        success_factors: ['good_sleep', 'prepared_clothes', 'clear_schedule'],
        failure_factors: ['late_night', 'stressful_day_ahead'],
      },
      correlations: {
        sleep_quality: 0.72,
        stress_level: -0.45,
        energy_level: 0.68,
      },
      confidence: 85.2,
      sampleSize: 28,
      firstObserved: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      lastObserved: new Date(),
      isActive: true,
    },
    {
      userId,
      patternName: 'Post-Work Exercise Avoidance',
      behaviorType: 'barrier',
      frequency: 3,
      frequencyPeriod: 'week',
      consistency: 65.8,
      strength: 70.1,
      triggers: {
        temporal: ['17:00-19:00'],
        emotional: ['tired', 'stressed', 'overwhelmed'],
        environmental: ['work_office', 'commute'],
      },
      outcomes: {
        positive: [],
        negative: ['guilt', 'lower_motivation', 'disrupted_routine'],
      },
      context: {
        success_factors: ['short_workday', 'positive_meeting', 'energy_snack'],
        failure_factors: ['long_meetings', 'deadline_pressure', 'traffic'],
      },
      correlations: {
        work_stress: 0.78,
        commute_time: 0.55,
        energy_level: -0.62,
      },
      confidence: 78.9,
      sampleSize: 22,
      firstObserved: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      lastObserved: new Date(),
      isActive: true,
    },
    {
      userId,
      patternName: 'Weekend Activity Boost',
      behaviorType: 'opportunity',
      frequency: 2,
      frequencyPeriod: 'week',
      consistency: 88.3,
      strength: 91.7,
      triggers: {
        temporal: ['saturday', 'sunday'],
        environmental: ['outdoor', 'park', 'home'],
        social: ['family', 'friends', 'alone'],
      },
      outcomes: {
        positive: ['enjoyment', 'social_connection', 'stress_relief'],
        negative: [],
      },
      context: {
        success_factors: ['good_weather', 'social_plans', 'free_schedule'],
        failure_factors: ['bad_weather', 'family_obligations', 'fatigue'],
      },
      correlations: {
        weather_quality: 0.65,
        social_engagement: 0.58,
        weekly_stress: -0.43,
      },
      confidence: 92.1,
      sampleSize: 16,
      firstObserved: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastObserved: new Date(),
      isActive: true,
    },
  ];

  for (const pattern of patterns) {
    await db.insert(microBehaviorPatternSchema).values(pattern);
  }
}

async function createContextPatterns(userId: string) {
  const patterns = [
    {
      userId,
      contextType: 'temporal',
      contextName: 'Early Morning Success Context',
      contextData: {
        timeRange: '06:00-08:00',
        dayTypes: ['weekday'],
        seasonality: 'consistent',
      },
      frequency: 25,
      timeOfDay: 'morning' as any,
      location: 'home',
      energyLevel: 8,
      stressLevel: 3,
      socialContext: 'alone',
      behaviorCorrelations: {
        workout_completion: 0.85,
        mood_improvement: 0.72,
        day_productivity: 0.68,
      },
      outcomeImpact: {
        immediate: ['energy_boost', 'sense_of_accomplishment'],
        delayed: ['better_mood_all_day', 'improved_sleep'],
      },
      predictivePower: 85.3,
      firstObserved: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      lastObserved: new Date(),
      isActive: true,
    },
    {
      userId,
      contextType: 'environmental',
      contextName: 'Home Workout Optimal Environment',
      contextData: {
        location: 'home',
        space: 'living_room',
        equipment: ['yoga_mat', 'dumbbells'],
        privacy: 'high',
      },
      frequency: 18,
      location: 'home',
      energyLevel: 7,
      stressLevel: 4,
      socialContext: 'alone',
      behaviorCorrelations: {
        exercise_consistency: 0.78,
        session_completion: 0.82,
        enjoyment_rating: 0.71,
      },
      outcomeImpact: {
        immediate: ['convenience', 'comfort', 'no_commute'],
        delayed: ['habit_reinforcement', 'cost_savings'],
      },
      predictivePower: 78.9,
      firstObserved: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      lastObserved: new Date(),
      isActive: true,
    },
    {
      userId,
      contextType: 'social',
      contextName: 'Solo Exercise Preference',
      contextData: {
        social_setting: 'alone',
        motivation_source: 'internal',
        distraction_level: 'low',
      },
      frequency: 22,
      socialContext: 'alone',
      energyLevel: 7,
      stressLevel: 3,
      behaviorCorrelations: {
        focus_quality: 0.79,
        self_motivation: 0.73,
        session_length: 0.65,
      },
      outcomeImpact: {
        immediate: ['mental_clarity', 'personal_time'],
        delayed: ['self_reliance', 'intrinsic_motivation'],
      },
      predictivePower: 76.4,
      firstObserved: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      lastObserved: new Date(),
      isActive: true,
    },
  ];

  for (const pattern of patterns) {
    await db.insert(contextPatternSchema).values(pattern);
  }
}

seedSampleBehavioralData();
