import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';

// Utility function to handle API requests with auto-generated x-e2e-random-id
const apiRequest = async (request: any, method: 'get' | 'post' | 'put' | 'patch' | 'delete', endpoint: string, data?: any) => {
  const e2eRandomId = faker.number.int({ max: 1000000 });
  return request[method](endpoint, {
    ...(data && { data }),
    headers: {
      'x-e2e-random-id': e2eRandomId.toString(),
    },
  });
};

// Helper function to create sample user profile data
const createSampleProfile = (overrides = {}) => ({
  fitnessLevel: 'intermediate',
  experienceLevel: 'beginner',
  primaryGoals: ['weight_loss', 'muscle_gain'],
  timezone: 'America/New_York',
  dateOfBirth: '1990-01-01',
  height: 175,
  weight: 70,
  activityLevel: 'moderate',
  ...overrides,
});

// Helper function to create sample fitness goals
const createSampleFitnessGoal = (overrides = {}) => ({
  goalType: 'weight_loss',
  targetValue: 65,
  currentValue: 70,
  unit: 'kg',
  targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
  priority: 'high',
  description: 'Lose weight for better health',
  ...overrides,
});

// Helper function to create sample preferences
const createSamplePreferences = (overrides = {}) => ({
  workoutTypes: ['strength', 'cardio'],
  preferredTimes: ['morning', 'evening'],
  sessionDuration: 60,
  equipment: ['dumbbells', 'resistance_bands'],
  workoutFrequency: 4,
  restDayPreference: ['sunday'],
  ...overrides,
});

// Helper function to create sample constraints
const createSampleConstraint = (overrides = {}) => ({
  constraintType: 'injury',
  description: 'Lower back pain',
  severity: 'medium',
  affectedAreas: ['lower_back'],
  startDate: new Date().toISOString(),
  expectedEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  restrictions: ['no_deadlifts', 'no_heavy_squats'],
  ...overrides,
});

// Helper function to create micro-behavior pattern data
const createSampleMicroBehavior = (overrides = {}) => ({
  behaviorType: 'workout_preparation',
  frequency: 'daily',
  triggers: ['morning_alarm', 'coffee_finished'],
  context: {
    timeOfDay: 'morning',
    dayOfWeek: 'weekday',
    location: 'home',
    mood: 'motivated',
  },
  outcomes: {
    workoutCompleted: true,
    duration: 45,
    intensity: 'high',
  },
  ...overrides,
});

test.describe('User Profile Management', () => {
  test.describe('Profile API Endpoints', () => {
    test('should create a new user profile with valid data', async ({ request }) => {
      const profileData = createSampleProfile();

      const response = await apiRequest(request, 'post', '/api/profile', profileData);

      expect(response.status()).toBe(201);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('success', true);
      expect(responseJson).toHaveProperty('profile');
      expect(responseJson.profile).toHaveProperty('id');
      expect(responseJson.profile.fitnessLevel).toBe(profileData.fitnessLevel);
      expect(responseJson.profile.experienceLevel).toBe(profileData.experienceLevel);
      expect(responseJson.profile.primaryGoals).toEqual(profileData.primaryGoals);
    });

    test('should retrieve user profile with complete data', async ({ request }) => {
      // Create profile first
      const profileData = createSampleProfile();
      await apiRequest(request, 'post', '/api/profile', profileData);

      const response = await apiRequest(request, 'get', '/api/profile');

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('profile');
      expect(responseJson.profile).toHaveProperty('id');
      expect(responseJson.profile).toHaveProperty('fitnessGoals');
      expect(responseJson.profile).toHaveProperty('preferences');
      expect(responseJson.profile).toHaveProperty('constraints');
      expect(responseJson.profile).toHaveProperty('completionScore');
    });

    test('should update user profile with partial data', async ({ request }) => {
      // Create profile first
      const profileData = createSampleProfile();
      await apiRequest(request, 'post', '/api/profile', profileData);

      const updateData = {
        fitnessLevel: 'advanced',
        weight: 68,
        primaryGoals: ['strength', 'endurance'],
      };

      const response = await apiRequest(request, 'put', '/api/profile', updateData);

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson.profile.fitnessLevel).toBe(updateData.fitnessLevel);
      expect(responseJson.profile.weight).toBe(updateData.weight);
      expect(responseJson.profile.primaryGoals).toEqual(updateData.primaryGoals);
    });

    test('should soft delete user profile', async ({ request }) => {
      // Create profile first
      const profileData = createSampleProfile();
      await apiRequest(request, 'post', '/api/profile', profileData);

      const response = await apiRequest(request, 'delete', '/api/profile');

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('success', true);
      expect(responseJson).toHaveProperty('message');

      // Verify profile is no longer accessible
      const getResponse = await apiRequest(request, 'get', '/api/profile');

      expect(getResponse.status()).toBe(404);
    });

    test('shouldn\'t create profile with invalid fitness level', async ({ request }) => {
      const profileData = createSampleProfile({ fitnessLevel: 'invalid_level' });

      const response = await apiRequest(request, 'post', '/api/profile', profileData);

      expect(response.status()).toBe(422);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('error');
      expect(responseJson.error).toContain('fitnessLevel');
    });

    test('shouldn\'t create profile with invalid primary goals', async ({ request }) => {
      const profileData = createSampleProfile({ primaryGoals: ['invalid_goal'] });

      const response = await apiRequest(request, 'post', '/api/profile', profileData);

      expect(response.status()).toBe(422);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('error');
      expect(responseJson.error).toContain('primaryGoals');
    });

    test('shouldn\'t create profile with unrealistic measurements', async ({ request }) => {
      const profileData = createSampleProfile({
        height: 300, // Unrealistic height
        weight: 500, // Unrealistic weight
      });

      const response = await apiRequest(request, 'post', '/api/profile', profileData);

      expect(response.status()).toBe(422);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('error');
    });
  });

  test.describe('Fitness Goals Management', () => {
    test('should create fitness goals for user profile', async ({ request }) => {
      // Create profile first
      const profileData = createSampleProfile();
      await apiRequest(request, 'post', '/api/profile', profileData);

      const goalData = createSampleFitnessGoal();

      const response = await apiRequest(request, 'post', '/api/profile/goals', goalData);

      expect(response.status()).toBe(201);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('goal');
      expect(responseJson.goal.goalType).toBe(goalData.goalType);
      expect(responseJson.goal.targetValue).toBe(goalData.targetValue);
      expect(responseJson.goal.priority).toBe(goalData.priority);
    });

    test('should retrieve user fitness goals with filtering', async ({ request }) => {
      // Create profile and goals
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      await apiRequest(request, 'post', '/api/profile/goals', createSampleFitnessGoal({ goalType: 'weight_loss' }));
      await apiRequest(request, 'post', '/api/profile/goals', createSampleFitnessGoal({ goalType: 'muscle_gain' }));

      const response = await apiRequest(request, 'get', '/api/profile/goals?goalType=weight_loss');

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson.goals.every((goal: any) => goal.goalType === 'weight_loss')).toBe(true);
    });

    test('should update fitness goal progress', async ({ request }) => {
      // Create profile and goal
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      const goalResponse = await apiRequest(request, 'post', '/api/profile/goals', createSampleFitnessGoal());
      const goalJson = await goalResponse.json();

      const updateData = {
        currentValue: 68,
        progress: 40,
      };

      const response = await apiRequest(request, 'put', `/api/profile/goals/${goalJson.goal.id}`, updateData);

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson.goal.currentValue).toBe(updateData.currentValue);
      expect(responseJson.goal.progress).toBe(updateData.progress);
    });

    test('should archive completed fitness goal', async ({ request }) => {
      // Create profile and goal
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      const goalResponse = await apiRequest(request, 'post', '/api/profile/goals', createSampleFitnessGoal());
      const goalJson = await goalResponse.json();

      const response = await apiRequest(request, 'patch', `/api/profile/goals/${goalJson.goal.id}/archive`);

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson.goal.status).toBe('archived');
    });

    test('shouldn\'t create goal with invalid target date', async ({ request }) => {
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      const goalData = createSampleFitnessGoal({
        targetDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Past date
      });

      const response = await apiRequest(request, 'post', '/api/profile/goals', goalData);

      expect(response.status()).toBe(422);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('error');
      expect(responseJson.error).toContain('targetDate');
    });
  });

  test.describe('Preferences Management API', () => {
    test('should update user workout preferences', async ({ request }) => {
      // Create profile first
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      const preferencesData = createSamplePreferences();

      const response = await apiRequest(request, 'put', '/api/profile/preferences', preferencesData);

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson.preferences.workoutTypes).toEqual(preferencesData.workoutTypes);
      expect(responseJson.preferences.preferredTimes).toEqual(preferencesData.preferredTimes);
      expect(responseJson.preferences.sessionDuration).toBe(preferencesData.sessionDuration);
    });

    test('should retrieve user preferences with defaults', async ({ request }) => {
      // Create profile without preferences
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      const response = await apiRequest(request, 'get', '/api/profile/preferences');

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('preferences');
      expect(responseJson.preferences).toHaveProperty('workoutTypes');
      expect(responseJson.preferences).toHaveProperty('preferredTimes');
      expect(responseJson.preferences).toHaveProperty('sessionDuration');
    });

    test('should reset preferences to defaults', async ({ request }) => {
      // Create profile and set custom preferences
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      await apiRequest(request, 'put', '/api/profile/preferences', createSamplePreferences());

      const response = await apiRequest(request, 'post', '/api/profile/preferences/reset');

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('success', true);
      expect(responseJson.preferences).toHaveProperty('workoutTypes');
    });

    test('shouldn\'t set invalid workout types in preferences', async ({ request }) => {
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      const preferencesData = createSamplePreferences({
        workoutTypes: ['invalid_type', 'another_invalid'],
      });

      const response = await apiRequest(request, 'put', '/api/profile/preferences', preferencesData);

      expect(response.status()).toBe(422);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('error');
      expect(responseJson.error).toContain('workoutTypes');
    });

    test('shouldn\'t set invalid session duration', async ({ request }) => {
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      const preferencesData = createSamplePreferences({
        sessionDuration: 300, // 5 hours - unrealistic
      });

      const response = await apiRequest(request, 'put', '/api/profile/preferences', preferencesData);

      expect(response.status()).toBe(422);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('error');
      expect(responseJson.error).toContain('sessionDuration');
    });
  });

  test.describe('Constraints Management API', () => {
    test('should add user constraint', async ({ request }) => {
      // Create profile first
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      const constraintData = createSampleConstraint();

      const response = await apiRequest(request, 'post', '/api/profile/constraints', constraintData);

      expect(response.status()).toBe(201);

      const responseJson = await response.json();

      expect(responseJson.constraint.constraintType).toBe(constraintData.constraintType);
      expect(responseJson.constraint.severity).toBe(constraintData.severity);
      expect(responseJson.constraint.description).toBe(constraintData.description);
    });

    test('should retrieve active constraints with filtering', async ({ request }) => {
      // Create profile and constraints
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      await apiRequest(request, 'post', '/api/profile/constraints', createSampleConstraint({ constraintType: 'injury' }));
      await apiRequest(request, 'post', '/api/profile/constraints', createSampleConstraint({ constraintType: 'schedule' }));

      const response = await apiRequest(request, 'get', '/api/profile/constraints?constraintType=injury');

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson.constraints.every((constraint: any) => constraint.constraintType === 'injury')).toBe(true);
    });

    test('should update constraint severity and status', async ({ request }) => {
      // Create profile and constraint
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      const constraintResponse = await apiRequest(request, 'post', '/api/profile/constraints', createSampleConstraint());
      const constraintJson = await constraintResponse.json();

      const updateData = {
        severity: 'low',
        status: 'improving',
      };

      const response = await apiRequest(request, 'put', `/api/profile/constraints/${constraintJson.constraint.id}`, updateData);

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson.constraint.severity).toBe(updateData.severity);
      expect(responseJson.constraint.status).toBe(updateData.status);
    });

    test('should remove resolved constraint', async ({ request }) => {
      // Create profile and constraint
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      const constraintResponse = await apiRequest(request, 'post', '/api/profile/constraints', createSampleConstraint());
      const constraintJson = await constraintResponse.json();

      const response = await apiRequest(request, 'delete', `/api/profile/constraints/${constraintJson.constraint.id}`);

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('success', true);
    });

    test('shouldn\'t create constraint with invalid severity', async ({ request }) => {
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      const constraintData = createSampleConstraint({ severity: 'invalid_severity' });

      const response = await apiRequest(request, 'post', '/api/profile/constraints', constraintData);

      expect(response.status()).toBe(422);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('error');
      expect(responseJson.error).toContain('severity');
    });

    test('shouldn\'t create constraint with past end date', async ({ request }) => {
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      const constraintData = createSampleConstraint({
        expectedEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Past date
      });

      const response = await apiRequest(request, 'post', '/api/profile/constraints', constraintData);

      expect(response.status()).toBe(422);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('error');
      expect(responseJson.error).toContain('expectedEndDate');
    });
  });

  test.describe('Micro-Behavior Pattern Integration', () => {
    test('should create micro-behavior patterns linked to profile', async ({ request }) => {
      // Create profile first
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      const microBehaviorData = createSampleMicroBehavior();

      const response = await apiRequest(request, 'post', '/api/behavior/micro-patterns', microBehaviorData);

      expect(response.status()).toBe(201);

      const responseJson = await response.json();

      expect(responseJson.pattern.behaviorType).toBe(microBehaviorData.behaviorType);
      expect(responseJson.pattern.frequency).toBe(microBehaviorData.frequency);
      expect(responseJson.pattern.triggers).toEqual(microBehaviorData.triggers);
    });

    test('should retrieve micro-behavior patterns with analysis', async ({ request }) => {
      // Create profile and patterns
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      await apiRequest(request, 'post', '/api/behavior/micro-patterns', createSampleMicroBehavior());

      const response = await apiRequest(request, 'get', '/api/behavior/micro-patterns?includeAnalysis=true');

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('patterns');
      expect(responseJson).toHaveProperty('analysis');
      expect(responseJson.analysis).toHaveProperty('insights');
      expect(responseJson.analysis).toHaveProperty('correlations');
    });

    test('should correlate micro-behaviors with profile preferences', async ({ request }) => {
      // Create profile with preferences
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      await apiRequest(request, 'put', '/api/profile/preferences', createSamplePreferences());
      await apiRequest(request, 'post', '/api/behavior/micro-patterns', createSampleMicroBehavior());

      const response = await apiRequest(request, 'get', '/api/behavior/micro-patterns/correlations');

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('correlations');
      expect(responseJson.correlations).toHaveProperty('preferenceAlignment');
      expect(responseJson.correlations).toHaveProperty('behaviorConsistency');
    });

    test('should update micro-behavior patterns based on profile changes', async ({ request }) => {
      // Create profile and pattern
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      const patternResponse = await apiRequest(request, 'post', '/api/behavior/micro-patterns', createSampleMicroBehavior());
      const patternJson = await patternResponse.json();

      // Update profile preferences
      await apiRequest(request, 'put', '/api/profile/preferences', createSamplePreferences({
        preferredTimes: ['afternoon'],
      }));

      const updateData = {
        context: {
          timeOfDay: 'afternoon',
          adaptedToPreferences: true,
        },
      };

      const response = await apiRequest(request, 'put', `/api/behavior/micro-patterns/${patternJson.pattern.id}`, updateData);

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson.pattern.context.timeOfDay).toBe('afternoon');
      expect(responseJson.pattern.context.adaptedToPreferences).toBe(true);
    });
  });

  test.describe('Profile Completion and Scoring', () => {
    test('should calculate profile completion score', async ({ request }) => {
      // Create minimal profile
      const profileData = createSampleProfile();
      await apiRequest(request, 'post', '/api/profile', profileData);

      const response = await apiRequest(request, 'get', '/api/profile/completion');

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('completionScore');
      expect(responseJson).toHaveProperty('missingFields');
      expect(responseJson).toHaveProperty('recommendations');
      expect(responseJson.completionScore).toBeGreaterThan(0);
      expect(responseJson.completionScore).toBeLessThanOrEqual(100);
    });

    test('should improve completion score with additional data', async ({ request }) => {
      // Create basic profile
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      const initialResponse = await apiRequest(request, 'get', '/api/profile/completion');
      const initialJson = await initialResponse.json();
      const initialScore = initialJson.completionScore;

      // Add preferences and goals
      await apiRequest(request, 'put', '/api/profile/preferences', createSamplePreferences());
      await apiRequest(request, 'post', '/api/profile/goals', createSampleFitnessGoal());

      const updatedResponse = await apiRequest(request, 'get', '/api/profile/completion');
      const updatedJson = await updatedResponse.json();

      expect(updatedJson.completionScore).toBeGreaterThan(initialScore);
    });

    test('should provide completion recommendations', async ({ request }) => {
      // Create minimal profile
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      const response = await apiRequest(request, 'get', '/api/profile/completion');

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson.recommendations).toBeInstanceOf(Array);
      expect(responseJson.recommendations.length).toBeGreaterThan(0);
      expect(responseJson.recommendations[0]).toHaveProperty('field');
      expect(responseJson.recommendations[0]).toHaveProperty('importance');
      expect(responseJson.recommendations[0]).toHaveProperty('description');
    });
  });

  test.describe('Integration with Health and Exercise Systems', () => {
    test('should integrate profile data with health record creation', async ({ request }) => {
      // Create profile with health goals
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      await apiRequest(request, 'post', '/api/profile/goals', createSampleFitnessGoal({ goalType: 'weight_loss' }));

      // Create health record
      const healthRecord = await apiRequest(request, 'post', '/api/health/records', {
        type_id: 1,
        value: 68,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      expect(healthRecord.status()).toBe(201);

      // Check if profile goal progress was updated
      const goalsResponse = await apiRequest(request, 'get', '/api/profile/goals');
      const goalsJson = await goalsResponse.json();

      const weightLossGoal = goalsJson.goals.find((goal: any) => goal.goalType === 'weight_loss');

      expect(weightLossGoal).toBeDefined();
      expect(weightLossGoal.currentValue).toBe(68);
    });

    test('should adapt workout recommendations based on constraints', async ({ request }) => {
      // Create profile with injury constraint
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      await apiRequest(request, 'post', '/api/profile/constraints', createSampleConstraint({
        constraintType: 'injury',
        affectedAreas: ['lower_back'],
        restrictions: ['no_deadlifts', 'no_heavy_squats'],
      }));

      // Get workout recommendations
      const response = await apiRequest(request, 'get', '/api/workouts/recommendations');

      expect(response.status()).toBe(200);

      const responseJson = await response.json();

      expect(responseJson.recommendations).toBeInstanceOf(Array);

      // Verify recommendations exclude restricted exercises
      const hasRestrictedExercises = responseJson.recommendations.some((workout: any) =>
        workout.exercises?.some((exercise: any) =>
          exercise.name?.toLowerCase().includes('deadlift')
          || exercise.name?.toLowerCase().includes('squat'),
        ),
      );

      expect(hasRestrictedExercises).toBe(false);
    });

    test('should track exercise completion against profile goals', async ({ request }) => {
      // Create profile with fitness goal
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      await apiRequest(request, 'post', '/api/profile/goals', createSampleFitnessGoal({
        goalType: 'endurance',
        targetValue: 30,
        unit: 'minutes',
      }));

      // Complete a workout
      const workoutData = {
        type: 'cardio',
        duration: 45,
        intensity: 'moderate',
        exercises: ['running', 'cycling'],
        completedAt: new Date().toISOString(),
      };

      const workoutResponse = await apiRequest(request, 'post', '/api/workouts/sessions', workoutData);

      expect(workoutResponse.status()).toBe(201);

      // Check if goal progress was updated
      const goalsResponse = await apiRequest(request, 'get', '/api/profile/goals');
      const goalsJson = await goalsResponse.json();

      const enduranceGoal = goalsJson.goals.find((goal: any) => goal.goalType === 'endurance');

      expect(enduranceGoal.progress).toBeGreaterThan(0);
    });
  });

  test.describe('Feature Flag Behavior', () => {
    test('should return 503 when ENABLE_USER_PROFILES is disabled', async ({ request }) => {
      const profileData = createSampleProfile();

      const response = await request.post('/api/profile', {
        data: profileData,
        headers: {
          'x-e2e-random-id': faker.number.int({ max: 1000000 }).toString(),
          'x-test-feature-flag': 'ENABLE_USER_PROFILES=false',
        },
      });

      if (response.status() === 503) {
        const responseJson = await response.json();

        expect(responseJson).toHaveProperty('error');
        expect(responseJson.error).toContain('disabled');
      } else {
        expect(response.status()).toBe(201);
      }
    });

    test('should return 503 when ENABLE_MICRO_BEHAVIOR_TRACKING is disabled', async ({ request }) => {
      const microBehaviorData = createSampleMicroBehavior();

      const response = await request.post('/api/behavior/micro-patterns', {
        data: microBehaviorData,
        headers: {
          'x-e2e-random-id': faker.number.int({ max: 1000000 }).toString(),
          'x-test-feature-flag': 'ENABLE_MICRO_BEHAVIOR_TRACKING=false',
        },
      });

      if (response.status() === 503) {
        const responseJson = await response.json();

        expect(responseJson).toHaveProperty('error');
        expect(responseJson.error).toContain('disabled');
      } else {
        expect(response.status()).toBe(201);
      }
    });
  });

  test.describe('Rate Limiting', () => {
    test('should enforce rate limiting for profile endpoints', async ({ request }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 }).toString();

      // Make multiple rapid requests to trigger rate limiting
      const promises = Array.from({ length: 15 }, () =>
        request.post('/api/profile', {
          data: createSampleProfile(),
          headers: { 'x-e2e-random-id': e2eRandomId },
        }));

      const responses = await Promise.all(promises);

      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status() === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Check rate limit headers
      const rateLimitedResponse = rateLimitedResponses[0];
      const headers = rateLimitedResponse.headers();

      expect(headers).toHaveProperty('x-ratelimit-limit');
      expect(headers).toHaveProperty('x-ratelimit-remaining');
    });

    test('should enforce rate limiting for preferences updates', async ({ request }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 }).toString();

      // Create profile first
      await request.post('/api/profile', {
        data: createSampleProfile(),
        headers: { 'x-e2e-random-id': e2eRandomId },
      });

      // Make multiple rapid preference updates
      const promises = Array.from({ length: 20 }, () =>
        request.put('/api/profile/preferences', {
          data: createSamplePreferences(),
          headers: { 'x-e2e-random-id': e2eRandomId },
        }));

      const responses = await Promise.all(promises);

      const rateLimitedResponses = responses.filter(r => r.status() === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  test.describe('Authentication and Authorization', () => {
    test('shouldn\'t access profile without authentication', async ({ request }) => {
      const response = await request.get('/api/profile');

      expect(response.status()).toBe(401);
    });

    test('shouldn\'t create profile without authentication', async ({ request }) => {
      const response = await request.post('/api/profile', {
        data: createSampleProfile(),
      });

      expect(response.status()).toBe(401);
    });

    test('shouldn\'t access preferences without authentication', async ({ request }) => {
      const response = await request.get('/api/profile/preferences');

      expect(response.status()).toBe(401);
    });

    test('shouldn\'t access constraints without authentication', async ({ request }) => {
      const response = await request.get('/api/profile/constraints');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Data Isolation and Security', () => {
    test('should isolate profile data between different users', async ({ request }) => {
      const user1Id = faker.number.int({ max: 1000000 });
      const user2Id = faker.number.int({ max: 1000000 });

      // Create profiles for both users
      await request.post('/api/profile', {
        data: createSampleProfile({ primaryGoals: ['user1_goal'] }),
        headers: { 'x-e2e-random-id': user1Id.toString() },
      });

      await request.post('/api/profile', {
        data: createSampleProfile({ primaryGoals: ['user2_goal'] }),
        headers: { 'x-e2e-random-id': user2Id.toString() },
      });

      // Get profiles for each user
      const user1Response = await request.get('/api/profile', {
        headers: { 'x-e2e-random-id': user1Id.toString() },
      });

      const user2Response = await request.get('/api/profile', {
        headers: { 'x-e2e-random-id': user2Id.toString() },
      });

      const user1Json = await user1Response.json();
      const user2Json = await user2Response.json();

      // Verify data isolation
      expect(user1Json.profile.primaryGoals).toContain('user1_goal');
      expect(user1Json.profile.primaryGoals).not.toContain('user2_goal');
      expect(user2Json.profile.primaryGoals).toContain('user2_goal');
      expect(user2Json.profile.primaryGoals).not.toContain('user1_goal');
    });

    test('should isolate fitness goals between users', async ({ request }) => {
      const user1Id = faker.number.int({ max: 1000000 });
      const user2Id = faker.number.int({ max: 1000000 });

      // Create profiles and goals for both users
      await request.post('/api/profile', {
        data: createSampleProfile(),
        headers: { 'x-e2e-random-id': user1Id.toString() },
      });

      await request.post('/api/profile', {
        data: createSampleProfile(),
        headers: { 'x-e2e-random-id': user2Id.toString() },
      });

      await request.post('/api/profile/goals', {
        data: createSampleFitnessGoal({ description: 'User 1 goal' }),
        headers: { 'x-e2e-random-id': user1Id.toString() },
      });

      await request.post('/api/profile/goals', {
        data: createSampleFitnessGoal({ description: 'User 2 goal' }),
        headers: { 'x-e2e-random-id': user2Id.toString() },
      });

      // Get goals for each user
      const user1Goals = await request.get('/api/profile/goals', {
        headers: { 'x-e2e-random-id': user1Id.toString() },
      });

      const user2Goals = await request.get('/api/profile/goals', {
        headers: { 'x-e2e-random-id': user2Id.toString() },
      });

      const user1Json = await user1Goals.json();
      const user2Json = await user2Goals.json();

      // Verify goal isolation
      expect(user1Json.goals.some((goal: any) => goal.description === 'User 2 goal')).toBe(false);
      expect(user2Json.goals.some((goal: any) => goal.description === 'User 1 goal')).toBe(false);
    });

    test('should isolate constraints between users', async ({ request }) => {
      const user1Id = faker.number.int({ max: 1000000 });
      const user2Id = faker.number.int({ max: 1000000 });

      // Create profiles and constraints for both users
      await request.post('/api/profile', {
        data: createSampleProfile(),
        headers: { 'x-e2e-random-id': user1Id.toString() },
      });

      await request.post('/api/profile', {
        data: createSampleProfile(),
        headers: { 'x-e2e-random-id': user2Id.toString() },
      });

      await request.post('/api/profile/constraints', {
        data: createSampleConstraint({ description: 'User 1 injury' }),
        headers: { 'x-e2e-random-id': user1Id.toString() },
      });

      await request.post('/api/profile/constraints', {
        data: createSampleConstraint({ description: 'User 2 injury' }),
        headers: { 'x-e2e-random-id': user2Id.toString() },
      });

      // Get constraints for each user
      const user1Constraints = await request.get('/api/profile/constraints', {
        headers: { 'x-e2e-random-id': user1Id.toString() },
      });

      const user2Constraints = await request.get('/api/profile/constraints', {
        headers: { 'x-e2e-random-id': user2Id.toString() },
      });

      const user1Json = await user1Constraints.json();
      const user2Json = await user2Constraints.json();

      // Verify constraint isolation
      expect(user1Json.constraints.some((constraint: any) => constraint.description === 'User 2 injury')).toBe(false);
      expect(user2Json.constraints.some((constraint: any) => constraint.description === 'User 1 injury')).toBe(false);
    });
  });

  test.describe('Data Consistency and Integrity', () => {
    test('should maintain consistency across profile-related tables', async ({ request }) => {
      // Create complete profile with all related data
      const profileResponse = await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      const profileJson = await profileResponse.json();

      await apiRequest(request, 'post', '/api/profile/goals', createSampleFitnessGoal());
      await apiRequest(request, 'put', '/api/profile/preferences', createSamplePreferences());
      await apiRequest(request, 'post', '/api/profile/constraints', createSampleConstraint());

      // Get complete profile
      const completeProfile = await apiRequest(request, 'get', '/api/profile');
      const completeJson = await completeProfile.json();

      // Verify all related data is consistent
      expect(completeJson.profile.id).toBe(profileJson.profile.id);
      expect(completeJson.profile.fitnessGoals).toBeInstanceOf(Array);
      expect(completeJson.profile.preferences).toBeInstanceOf(Object);
      expect(completeJson.profile.constraints).toBeInstanceOf(Array);
    });

    test('should handle cascade operations correctly', async ({ request }) => {
      // Create profile with related data
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());
      await apiRequest(request, 'post', '/api/profile/goals', createSampleFitnessGoal());
      await apiRequest(request, 'post', '/api/profile/constraints', createSampleConstraint());

      // Delete profile
      const deleteResponse = await apiRequest(request, 'delete', '/api/profile');

      expect(deleteResponse.status()).toBe(200);

      // Verify related data is handled correctly
      const goalsResponse = await apiRequest(request, 'get', '/api/profile/goals');

      expect(goalsResponse.status()).toBe(404);

      const constraintsResponse = await apiRequest(request, 'get', '/api/profile/constraints');

      expect(constraintsResponse.status()).toBe(404);
    });

    test('should maintain data integrity during concurrent updates', async ({ request }) => {
      // Create profile
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      // Perform concurrent updates
      const promises = [
        apiRequest(request, 'put', '/api/profile', { weight: 69 }),
        apiRequest(request, 'put', '/api/profile/preferences', createSamplePreferences()),
        apiRequest(request, 'post', '/api/profile/goals', createSampleFitnessGoal()),
        apiRequest(request, 'post', '/api/profile/constraints', createSampleConstraint()),
      ];

      const responses = await Promise.all(promises);

      // All operations should succeed or fail gracefully
      for (const response of responses) {
        expect([200, 201, 409]).toContain(response.status());
      }

      // Verify final state is consistent
      const finalProfile = await apiRequest(request, 'get', '/api/profile');
      const finalJson = await finalProfile.json();

      expect(finalJson.profile).toHaveProperty('id');
      expect(finalJson.profile).toHaveProperty('completionScore');
    });
  });

  test.describe('Error Scenarios and Recovery', () => {
    test('should handle malformed profile data gracefully', async ({ request }) => {
      const response = await request.post('/api/profile', {
        data: 'invalid json',
        headers: {
          'x-e2e-random-id': faker.number.int({ max: 1000000 }).toString(),
          'content-type': 'application/json',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should handle missing required profile fields', async ({ request }) => {
      const response = await apiRequest(request, 'post', '/api/profile', {
        // Missing required fields
        timezone: 'America/New_York',
      });

      expect(response.status()).toBe(422);

      const responseJson = await response.json();

      expect(responseJson).toHaveProperty('error');
    });

    test('should handle database failures gracefully', async ({ request }) => {
      // This test simulates database issues
      const profileData = createSampleProfile();

      // Add header to simulate database failure
      const response = await request.post('/api/profile', {
        data: profileData,
        headers: {
          'x-e2e-random-id': faker.number.int({ max: 1000000 }).toString(),
          'x-test-simulate-db-failure': 'true',
        },
      });

      // Should handle database errors gracefully
      expect([500, 503]).toContain(response.status());
    });

    test('should recover from temporary failures', async ({ request }) => {
      const profileData = createSampleProfile();

      // First request might fail
      const firstResponse = await apiRequest(request, 'post', '/api/profile', profileData);

      // Second request should succeed
      const secondResponse = await apiRequest(request, 'post', '/api/profile', profileData);

      // At least one should succeed
      expect([firstResponse.status(), secondResponse.status()]).toContain(201);
    });

    test('should handle constraint conflicts gracefully', async ({ request }) => {
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      // Add conflicting constraints
      await apiRequest(request, 'post', '/api/profile/constraints', createSampleConstraint({
        constraintType: 'injury',
        affectedAreas: ['lower_back'],
      }));

      const conflictingConstraint = createSampleConstraint({
        constraintType: 'injury',
        affectedAreas: ['lower_back'], // Same area
        severity: 'high',
      });

      const response = await apiRequest(request, 'post', '/api/profile/constraints', conflictingConstraint);

      // Should either succeed with warning or handle conflict
      expect([201, 409]).toContain(response.status());
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle large profile datasets efficiently', async ({ request }) => {
      // Create profile with extensive data
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      // Add multiple goals, preferences, and constraints
      const promises = [
        ...Array.from({ length: 10 }, () =>
          apiRequest(request, 'post', '/api/profile/goals', createSampleFitnessGoal())),
        ...Array.from({ length: 5 }, () =>
          apiRequest(request, 'post', '/api/profile/constraints', createSampleConstraint())),
      ];

      await Promise.all(promises);

      const startTime = Date.now();
      const response = await apiRequest(request, 'get', '/api/profile');
      const endTime = Date.now();

      expect(response.status()).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000); // Should load in under 3 seconds
    });

    test('should handle concurrent profile operations efficiently', async ({ request }) => {
      await apiRequest(request, 'post', '/api/profile', createSampleProfile());

      // Perform multiple concurrent operations
      const promises = Array.from({ length: 20 }, (_, i) => {
        if (i % 4 === 0) {
          return apiRequest(request, 'get', '/api/profile');
        }
        if (i % 4 === 1) {
          return apiRequest(request, 'put', '/api/profile', { weight: 70 + i });
        }
        if (i % 4 === 2) {
          return apiRequest(request, 'get', '/api/profile/goals');
        }
        return apiRequest(request, 'get', '/api/profile/preferences');
      });

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Most operations should succeed
      const successfulResponses = responses.filter(r => [200, 201].includes(r.status()));

      expect(successfulResponses.length).toBeGreaterThan(responses.length * 0.8);

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });
});
