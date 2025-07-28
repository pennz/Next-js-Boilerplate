import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = 'healthgoal.test@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

// Helper types
type HealthGoal = {
  id: number;
  typeId: number;
  targetValue: string;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
  currentValue: number;
  progressPercentage: number;
  daysRemaining: number;
  isOverdue: boolean;
  lastRecordedAt: string | null;
  healthType: {
    id: number;
    slug: string;
    displayName: string;
    unit: string;
  };
};

type HealthRecord = {
  id: number;
  typeId: number;
  value: string;
  recordedAt: string;
  unit: string;
};

// Helper functions
async function authenticateUser(request: APIRequestContext): Promise<string> {
  const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
    data: {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    },
  });

  expect(loginResponse.status()).toBe(200);

  const loginData = await loginResponse.json();
  return loginData.token;
}

async function createHealthRecord(
  request: APIRequestContext,
  token: string,
  typeId: number,
  value: number,
  recordedAt?: Date,
): Promise<HealthRecord> {
  const response = await request.post(`${BASE_URL}/api/health/records`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      type_id: typeId,
      value: value.toString(),
      recorded_at: recordedAt?.toISOString() || new Date().toISOString(),
    },
  });

  expect(response.status()).toBe(201);

  const data = await response.json();
  return data.record;
}

async function createHealthGoal(
  request: APIRequestContext,
  token: string,
  typeId: number,
  targetValue: number,
  targetDate: Date,
  status: 'active' | 'completed' | 'paused' = 'active',
): Promise<HealthGoal> {
  const response = await request.post(`${BASE_URL}/api/health/goals`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      type_id: typeId,
      target_value: targetValue,
      target_date: targetDate.toISOString(),
      status,
    },
  });

  expect(response.status()).toBe(201);

  const data = await response.json();
  return data.goal;
}

async function getHealthGoals(
  request: APIRequestContext,
  token: string,
  typeId?: number,
  status?: string,
): Promise<HealthGoal[]> {
  const params = new URLSearchParams();
  if (typeId) {
    params.append('type_id', typeId.toString());
  }
  if (status) {
    params.append('status', status);
  }

  const response = await request.get(`${BASE_URL}/api/health/goals?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);

  const data = await response.json();
  return data.goals;
}

async function updateHealthGoal(
  request: APIRequestContext,
  token: string,
  goalId: number,
  updates: Partial<{
    target_value: number;
    target_date: string;
    status: 'active' | 'completed' | 'paused';
  }>,
): Promise<HealthGoal> {
  const response = await request.patch(`${BASE_URL}/api/health/goals`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      id: goalId,
      ...updates,
    },
  });

  expect(response.status()).toBe(200);

  const data = await response.json();
  return data.goal;
}

async function deleteHealthGoal(
  request: APIRequestContext,
  token: string,
  goalId: number,
): Promise<void> {
  const response = await request.delete(`${BASE_URL}/api/health/goals?id=${goalId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);
}

function getFutureDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

function getPastDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function calculateExpectedProgress(currentValue: number, targetValue: number): number {
  if (targetValue <= 0) {
    return 0;
  }
  return Math.min((currentValue / targetValue) * 100, 100);
}

function calculateExpectedDaysRemaining(targetDate: Date): number {
  const today = new Date();
  return Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

test.describe('Health Goal Progress Integration Tests', () => {
  let authToken: string;

  test.beforeEach(async ({ request }) => {
    authToken = await authenticateUser(request);
  });

  test.describe('Goal Progress Calculation Tests', () => {
    test('should calculate progress percentage correctly for weight loss goal', async ({ request }) => {
      const typeId = 1; // Weight type
      const targetValue = 65; // Target: 65kg
      const targetDate = getFutureDate(90); // 3 months from now

      // Create goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate);

      // Add initial record (70kg)
      await createHealthRecord(request, authToken, typeId, 70, getPastDate(10));

      // Add progress record (67kg)
      await createHealthRecord(request, authToken, typeId, 67, getPastDate(5));

      // Add most recent record (67kg)
      await createHealthRecord(request, authToken, typeId, 67);

      // Fetch updated goal with progress
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.currentValue).toBe(67);

      const expectedProgress = calculateExpectedProgress(67, 65);

      expect(updatedGoal!.progressPercentage).toBeCloseTo(expectedProgress, 2);
      expect(updatedGoal!.progressPercentage).toBeGreaterThan(100); // Over-achievement
    });

    test('should clamp progress at 100% for over-achievement scenarios', async ({ request }) => {
      const typeId = 2; // Blood pressure type
      const targetValue = 120; // Target: 120 mmHg
      const targetDate = getFutureDate(60);

      // Create goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate);

      // Add record that exceeds target (110 mmHg - better than 120)
      await createHealthRecord(request, authToken, typeId, 110);

      // Fetch updated goal
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.currentValue).toBe(110);

      // Progress should be clamped at 100%
      const rawProgress = (110 / 120) * 100;

      expect(rawProgress).toBeGreaterThan(100);
      expect(updatedGoal!.progressPercentage).toBe(100);
    });

    test('should use most recent health record for current value', async ({ request }) => {
      const typeId = 3; // Steps type
      const targetValue = 10000;
      const targetDate = getFutureDate(30);

      // Create goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate);

      // Add older records
      await createHealthRecord(request, authToken, typeId, 5000, getPastDate(5));
      await createHealthRecord(request, authToken, typeId, 7000, getPastDate(3));
      await createHealthRecord(request, authToken, typeId, 8500, getPastDate(1));

      // Add most recent record
      await createHealthRecord(request, authToken, typeId, 9200);

      // Fetch updated goal
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.currentValue).toBe(9200); // Should be the most recent value

      const expectedProgress = calculateExpectedProgress(9200, 10000);

      expect(updatedGoal!.progressPercentage).toBeCloseTo(expectedProgress, 2);
    });
  });

  test.describe('Days Remaining Calculation Tests', () => {
    test('should calculate days remaining correctly for future dates', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const daysInFuture = 45;
      const targetDate = getFutureDate(daysInFuture);

      // Create goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate);

      // Fetch goal with calculated days remaining
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();

      const expectedDaysRemaining = calculateExpectedDaysRemaining(targetDate);

      expect(updatedGoal!.daysRemaining).toBeCloseTo(expectedDaysRemaining, 1);
      expect(updatedGoal!.isOverdue).toBe(false);
    });

    test('should mark goals as overdue for past dates', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const daysInPast = 10;
      const targetDate = getPastDate(daysInPast);

      // Create goal with past target date
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate);

      // Fetch goal
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.daysRemaining).toBeLessThan(0);
      expect(updatedGoal!.isOverdue).toBe(true);
    });

    test('should handle today as target date correctly', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      // Create goal for today
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, today);

      // Fetch goal
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.daysRemaining).toBeGreaterThanOrEqual(0);
      expect(updatedGoal!.daysRemaining).toBeLessThanOrEqual(1);
    });
  });

  test.describe('Goal Status Business Logic Tests', () => {
    test('should handle goal status transitions correctly', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const targetDate = getFutureDate(30);

      // Create active goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate, 'active');

      expect(goal.status).toBe('active');

      // Update to completed
      const completedGoal = await updateHealthGoal(request, authToken, goal.id, { status: 'completed' });

      expect(completedGoal.status).toBe('completed');

      // Update to paused
      const pausedGoal = await updateHealthGoal(request, authToken, goal.id, { status: 'paused' });

      expect(pausedGoal.status).toBe('paused');

      // Update back to active
      const reactivatedGoal = await updateHealthGoal(request, authToken, goal.id, { status: 'active' });

      expect(reactivatedGoal.status).toBe('active');
    });

    test('should prevent multiple active goals for same health type', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const targetDate = getFutureDate(30);

      // Create first active goal
      await createHealthGoal(request, authToken, typeId, targetValue, targetDate, 'active');

      // Try to create second active goal for same type
      const response = await request.post(`${BASE_URL}/api/health/goals`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          type_id: typeId,
          target_value: 65,
          target_date: getFutureDate(60).toISOString(),
          status: 'active',
        },
      });

      expect(response.status()).toBe(409); // Conflict

      const errorData = await response.json();

      expect(errorData.error).toContain('active goal already exists');
    });

    test('should allow marking goal as completed without reaching target', async ({ request }) => {
      const typeId = 1;
      const targetValue = 60; // Target: 60kg
      const targetDate = getFutureDate(30);

      // Create goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate);

      // Add record that doesn't reach target (65kg)
      await createHealthRecord(request, authToken, typeId, 65);

      // Mark goal as completed despite not reaching target
      const completedGoal = await updateHealthGoal(request, authToken, goal.id, { status: 'completed' });

      expect(completedGoal.status).toBe('completed');

      // Verify progress calculation still works
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal!.currentValue).toBe(65);
      expect(updatedGoal!.progressPercentage).toBeLessThan(100);
    });
  });

  test.describe('Goal-Record Integration Tests', () => {
    test('should properly match goals with records of same type', async ({ request }) => {
      const weightTypeId = 1;
      const stepsTypeId = 3;

      // Create goals for different types
      const weightGoal = await createHealthGoal(request, authToken, weightTypeId, 70, getFutureDate(30));
      const stepsGoal = await createHealthGoal(request, authToken, stepsTypeId, 10000, getFutureDate(30));

      // Add records for both types
      await createHealthRecord(request, authToken, weightTypeId, 75);
      await createHealthRecord(request, authToken, stepsTypeId, 8500);

      // Fetch goals and verify proper matching
      const goals = await getHealthGoals(request, authToken);

      const weightGoalUpdated = goals.find(g => g.typeId === weightTypeId);
      const stepsGoalUpdated = goals.find(g => g.typeId === stepsTypeId);

      expect(weightGoalUpdated!.currentValue).toBe(75);
      expect(stepsGoalUpdated!.currentValue).toBe(8500);

      // Verify they don't cross-contaminate
      expect(weightGoalUpdated!.currentValue).not.toBe(8500);
      expect(stepsGoalUpdated!.currentValue).not.toBe(75);
    });

    test('should handle goals without recent records', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const targetDate = getFutureDate(30);

      // Create goal without any records
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate);

      // Fetch goal
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.currentValue).toBe(0);
      expect(updatedGoal!.progressPercentage).toBe(0);
      expect(updatedGoal!.lastRecordedAt).toBeNull();
    });

    test('should populate lastRecordedAt field correctly', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const targetDate = getFutureDate(30);

      // Create goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate);

      // Add record
      const recordDate = new Date();
      await createHealthRecord(request, authToken, typeId, 72, recordDate);

      // Fetch goal
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.lastRecordedAt).not.toBeNull();

      const lastRecordedDate = new Date(updatedGoal!.lastRecordedAt!);

      expect(lastRecordedDate.getTime()).toBeCloseTo(recordDate.getTime(), -3); // Within 1 second
    });
  });

  test.describe('Goal Progress Edge Cases', () => {
    test('should handle zero target values safely', async ({ request }) => {
      const typeId = 1;
      const targetValue = 0; // Edge case: zero target

      // This should fail validation
      const response = await request.post(`${BASE_URL}/api/health/goals`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          type_id: typeId,
          target_value: targetValue,
          target_date: getFutureDate(30).toISOString(),
          status: 'active',
        },
      });

      expect(response.status()).toBe(422); // Validation error
    });

    test('should handle negative current values gracefully', async ({ request }) => {
      const typeId = 4; // BMI type (could theoretically be negative in edge cases)
      const targetValue = 25;
      const targetDate = getFutureDate(30);

      // Create goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate);

      // Add negative record (edge case)
      await createHealthRecord(request, authToken, typeId, -5);

      // Fetch goal
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.currentValue).toBe(-5);
      expect(updatedGoal!.progressPercentage).toBe(0); // Should be clamped to 0
    });

    test('should handle goals with target dates in the past', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const pastDate = getPastDate(30);

      // Try to create goal with past date (should fail validation)
      const response = await request.post(`${BASE_URL}/api/health/goals`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          type_id: typeId,
          target_value: targetValue,
          target_date: pastDate.toISOString(),
          status: 'active',
        },
      });

      expect(response.status()).toBe(422); // Validation error
    });
  });

  test.describe('Goal Filtering and Querying Tests', () => {
    test('should filter goals by type_id correctly', async ({ request }) => {
      const weightTypeId = 1;
      const stepsTypeId = 3;

      // Create goals for different types
      await createHealthGoal(request, authToken, weightTypeId, 70, getFutureDate(30));
      await createHealthGoal(request, authToken, stepsTypeId, 10000, getFutureDate(30));

      // Filter by weight type
      const weightGoals = await getHealthGoals(request, authToken, weightTypeId);

      expect(weightGoals).toHaveLength(1);
      expect(weightGoals[0].typeId).toBe(weightTypeId);

      // Filter by steps type
      const stepsGoals = await getHealthGoals(request, authToken, stepsTypeId);

      expect(stepsGoals).toHaveLength(1);
      expect(stepsGoals[0].typeId).toBe(stepsTypeId);
    });

    test('should filter goals by status correctly', async ({ request }) => {
      const typeId = 1;
      const targetDate = getFutureDate(30);

      // Create goals with different statuses
      const activeGoal = await createHealthGoal(request, authToken, typeId, 70, targetDate, 'active');
      const completedGoal = await createHealthGoal(request, authToken, typeId + 1, 120, targetDate, 'completed');
      const pausedGoal = await createHealthGoal(request, authToken, typeId + 2, 10000, targetDate, 'paused');

      // Filter by active status
      const activeGoals = await getHealthGoals(request, authToken, undefined, 'active');

      expect(activeGoals.some(g => g.id === activeGoal.id)).toBe(true);
      expect(activeGoals.every(g => g.status === 'active')).toBe(true);

      // Filter by completed status
      const completedGoals = await getHealthGoals(request, authToken, undefined, 'completed');

      expect(completedGoals.some(g => g.id === completedGoal.id)).toBe(true);
      expect(completedGoals.every(g => g.status === 'completed')).toBe(true);

      // Filter by paused status
      const pausedGoals = await getHealthGoals(request, authToken, undefined, 'paused');

      expect(pausedGoals.some(g => g.id === pausedGoal.id)).toBe(true);
      expect(pausedGoals.every(g => g.status === 'paused')).toBe(true);
    });

    test('should order goals by creation date (newest first)', async ({ request }) => {
      const typeId = 1;
      const targetDate = getFutureDate(30);

      // Create goals with slight delays to ensure different creation times
      const goal1 = await createHealthGoal(request, authToken, typeId, 70, targetDate);
      await new Promise(resolve => setTimeout(resolve, 100));

      const goal2 = await createHealthGoal(request, authToken, typeId + 1, 120, targetDate);
      await new Promise(resolve => setTimeout(resolve, 100));

      const goal3 = await createHealthGoal(request, authToken, typeId + 2, 10000, targetDate);

      // Fetch all goals
      const goals = await getHealthGoals(request, authToken);

      // Find our test goals in the results
      const testGoals = goals.filter(g =>
        g.id === goal1.id || g.id === goal2.id || g.id === goal3.id,
      );

      expect(testGoals).toHaveLength(3);

      // Verify ordering (newest first)
      const goal3Index = testGoals.findIndex(g => g.id === goal3.id);
      const goal2Index = testGoals.findIndex(g => g.id === goal2.id);
      const goal1Index = testGoals.findIndex(g => g.id === goal1.id);

      expect(goal3Index).toBeLessThan(goal2Index);
      expect(goal2Index).toBeLessThan(goal1Index);
    });
  });

  test.describe('Goal Update Business Logic Tests', () => {
    test('should update target value and recalculate progress', async ({ request }) => {
      const typeId = 1;
      const initialTarget = 70;
      const newTarget = 65;
      const targetDate = getFutureDate(30);

      // Create goal
      const goal = await createHealthGoal(request, authToken, typeId, initialTarget, targetDate);

      // Add record
      await createHealthRecord(request, authToken, typeId, 67);

      // Update target value
      await updateHealthGoal(request, authToken, goal.id, { target_value: newTarget });

      // Fetch updated goal
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(Number.parseFloat(updatedGoal!.targetValue)).toBe(newTarget);

      // Progress should be recalculated with new target
      const expectedProgress = calculateExpectedProgress(67, newTarget);

      expect(updatedGoal!.progressPercentage).toBeCloseTo(expectedProgress, 2);
    });

    test('should update target date and recalculate days remaining', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const initialDate = getFutureDate(30);
      const newDate = getFutureDate(60);

      // Create goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, initialDate);

      // Update target date
      await updateHealthGoal(request, authToken, goal.id, {
        target_date: newDate.toISOString(),
      });

      // Fetch updated goal
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();

      const expectedDaysRemaining = calculateExpectedDaysRemaining(newDate);

      expect(updatedGoal!.daysRemaining).toBeCloseTo(expectedDaysRemaining, 1);
    });

    test('should validate status updates according to business rules', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const targetDate = getFutureDate(30);

      // Create active goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate, 'active');

      // Valid status transitions should work
      await updateHealthGoal(request, authToken, goal.id, { status: 'completed' });
      await updateHealthGoal(request, authToken, goal.id, { status: 'paused' });
      await updateHealthGoal(request, authToken, goal.id, { status: 'active' });

      // Verify final status
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal!.status).toBe('active');
    });
  });

  test.describe('Goal Deletion and Soft Delete Tests', () => {
    test('should soft delete goals by setting status to paused', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const targetDate = getFutureDate(30);

      // Create goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate);

      // Delete goal
      await deleteHealthGoal(request, authToken, goal.id);

      // Verify goal is soft deleted (status = paused)
      const allGoals = await getHealthGoals(request, authToken);
      const deletedGoal = allGoals.find(g => g.id === goal.id);

      expect(deletedGoal).toBeDefined();
      expect(deletedGoal!.status).toBe('paused');
    });

    test('should exclude soft deleted goals from active goal lists', async ({ request }) => {
      const typeId = 1;
      const targetValue = 70;
      const targetDate = getFutureDate(30);

      // Create goal
      const goal = await createHealthGoal(request, authToken, typeId, targetValue, targetDate);

      // Verify it appears in active goals
      const activeGoalsBefore = await getHealthGoals(request, authToken, undefined, 'active');

      expect(activeGoalsBefore.some(g => g.id === goal.id)).toBe(true);

      // Delete goal
      await deleteHealthGoal(request, authToken, goal.id);

      // Verify it doesn't appear in active goals
      const activeGoalsAfter = await getHealthGoals(request, authToken, undefined, 'active');

      expect(activeGoalsAfter.some(g => g.id === goal.id)).toBe(false);

      // But it should appear in paused goals
      const pausedGoals = await getHealthGoals(request, authToken, undefined, 'paused');

      expect(pausedGoals.some(g => g.id === goal.id)).toBe(true);
    });
  });

  test.describe('Integration with Health Types Tests', () => {
    test('should validate reasonable target values per health type', async ({ request }) => {
      // Test weight type (type_id: 1) - reasonable range 30-300kg
      const validWeightResponse = await request.post(`${BASE_URL}/api/health/goals`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          type_id: 1,
          target_value: 70, // Valid weight
          target_date: getFutureDate(30).toISOString(),
          status: 'active',
        },
      });

      expect(validWeightResponse.status()).toBe(201);

      // Test invalid weight (too high)
      const invalidWeightResponse = await request.post(`${BASE_URL}/api/health/goals`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          type_id: 1,
          target_value: 500, // Invalid weight
          target_date: getFutureDate(30).toISOString(),
          status: 'active',
        },
      });

      expect(invalidWeightResponse.status()).toBe(422);
    });

    test('should handle different units and value ranges correctly', async ({ request }) => {
      // Test different health types with appropriate values
      const testCases = [
        { typeId: 1, value: 70, description: 'Weight in kg' },
        { typeId: 2, value: 120, description: 'Blood pressure in mmHg' },
        { typeId: 3, value: 10000, description: 'Steps count' },
        { typeId: 4, value: 22, description: 'BMI' },
      ];

      for (const testCase of testCases) {
        const goal = await createHealthGoal(
          request,
          authToken,
          testCase.typeId,
          testCase.value,
          getFutureDate(30),
        );

        expect(goal.typeId).toBe(testCase.typeId);
        expect(Number.parseFloat(goal.targetValue)).toBe(testCase.value);

        // Add a record and verify progress calculation works
        await createHealthRecord(request, authToken, testCase.typeId, testCase.value * 0.9);

        const goals = await getHealthGoals(request, authToken, testCase.typeId);
        const updatedGoal = goals.find(g => g.id === goal.id);

        expect(updatedGoal!.progressPercentage).toBeGreaterThan(0);
        expect(updatedGoal!.progressPercentage).toBeLessThan(100);
      }
    });
  });

  test.describe('Realistic Goal Scenarios', () => {
    test('should handle weight loss journey: 80kg → 70kg over 3 months', async ({ request }) => {
      const typeId = 1; // Weight
      const startWeight = 80;
      const targetWeight = 70;
      const targetDate = getFutureDate(90); // 3 months

      // Create weight loss goal
      const goal = await createHealthGoal(request, authToken, typeId, targetWeight, targetDate);

      // Simulate weight loss journey with weekly weigh-ins
      const weeklyProgress = [
        { week: 0, weight: 80 }, // Starting weight
        { week: 1, weight: 79.2 }, // Week 1: -0.8kg
        { week: 2, weight: 78.5 }, // Week 2: -0.7kg
        { week: 4, weight: 77.1 }, // Week 4: -1.4kg
        { week: 6, weight: 75.8 }, // Week 6: -1.3kg
        { week: 8, weight: 74.2 }, // Week 8: -1.6kg
        { week: 10, weight: 72.9 }, // Week 10: -1.3kg
        { week: 12, weight: 71.5 }, // Week 12: -1.4kg (current)
      ];

      // Add weight records
      for (const entry of weeklyProgress) {
        const recordDate = getPastDate((12 - entry.week) * 7); // Convert weeks to days ago
        await createHealthRecord(request, authToken, typeId, entry.weight, recordDate);
      }

      // Fetch updated goal
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.currentValue).toBe(71.5); // Most recent weight

      // Calculate expected progress: 71.5kg towards 70kg target
      const expectedProgress = calculateExpectedProgress(71.5, 70);

      expect(updatedGoal!.progressPercentage).toBeCloseTo(expectedProgress, 2);
      expect(updatedGoal!.progressPercentage).toBeGreaterThan(100); // Already exceeded target

      // Should still have time remaining
      expect(updatedGoal!.daysRemaining).toBeGreaterThan(0);
      expect(updatedGoal!.isOverdue).toBe(false);
    });

    test('should handle step count improvement: 5000 → 10000 steps daily', async ({ request }) => {
      const typeId = 3; // Steps
      const targetSteps = 10000;
      const targetDate = getFutureDate(60); // 2 months

      // Create step goal
      const goal = await createHealthGoal(request, authToken, typeId, targetSteps, targetDate);

      // Simulate gradual step increase over time
      const dailyProgress = [
        { day: 14, steps: 5200 }, // 2 weeks ago
        { day: 10, steps: 6100 }, // 10 days ago
        { day: 7, steps: 6800 }, // 1 week ago
        { day: 5, steps: 7200 }, // 5 days ago
        { day: 3, steps: 7900 }, // 3 days ago
        { day: 1, steps: 8400 }, // Yesterday
        { day: 0, steps: 8750 }, // Today
      ];

      // Add step records
      for (const entry of dailyProgress) {
        const recordDate = getPastDate(entry.day);
        await createHealthRecord(request, authToken, typeId, entry.steps, recordDate);
      }

      // Fetch updated goal
      const goals = await getHealthGoals(request, authToken, typeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.currentValue).toBe(8750); // Most recent step count

      const expectedProgress = calculateExpectedProgress(8750, 10000);

      expect(updatedGoal!.progressPercentage).toBeCloseTo(expectedProgress, 2);
      expect(updatedGoal!.progressPercentage).toBeGreaterThan(80); // Good progress
      expect(updatedGoal!.progressPercentage).toBeLessThan(100); // Not yet achieved
    });

    test('should handle blood pressure management: 140/90 → 120/80 mmHg', async ({ request }) => {
      const systolicTypeId = 2; // Systolic BP
      const targetSystolic = 120;
      const targetDate = getFutureDate(120); // 4 months

      // Create blood pressure goal (focusing on systolic)
      const goal = await createHealthGoal(request, authToken, systolicTypeId, targetSystolic, targetDate);

      // Simulate blood pressure improvement over time
      const bpProgress = [
        { week: 0, systolic: 142 }, // Starting high
        { week: 2, systolic: 138 }, // Week 2: improvement
        { week: 4, systolic: 135 }, // Week 4: continued improvement
        { week: 6, systolic: 132 }, // Week 6: getting closer
        { week: 8, systolic: 128 }, // Week 8: almost there
        { week: 10, systolic: 125 }, // Week 10: close to target
        { week: 12, systolic: 122 }, // Week 12: very close
        { week: 14, systolic: 119 }, // Week 14: achieved target!
      ];

      // Add BP records
      for (const entry of bpProgress) {
        const recordDate = getPastDate((14 - entry.week) * 7);
        await createHealthRecord(request, authToken, systolicTypeId, entry.systolic, recordDate);
      }

      // Fetch updated goal
      const goals = await getHealthGoals(request, authToken, systolicTypeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.currentValue).toBe(119); // Most recent BP

      const expectedProgress = calculateExpectedProgress(119, 120);

      expect(updatedGoal!.progressPercentage).toBeCloseTo(expectedProgress, 2);
      expect(updatedGoal!.progressPercentage).toBeGreaterThan(99); // Target achieved

      // Goal could be marked as completed
      const completedGoal = await updateHealthGoal(request, authToken, goal.id, { status: 'completed' });

      expect(completedGoal.status).toBe('completed');
    });

    test('should handle sleep quality improvement: 6 → 8 hours nightly', async ({ request }) => {
      const sleepTypeId = 5; // Assuming sleep hours type
      const targetSleep = 8;
      const targetDate = getFutureDate(45); // 6 weeks

      // Create sleep goal
      const goal = await createHealthGoal(request, authToken, sleepTypeId, targetSleep, targetDate);

      // Simulate sleep improvement over time
      const sleepProgress = [
        { day: 21, hours: 5.8 }, // 3 weeks ago: poor sleep
        { day: 18, hours: 6.2 }, // Slight improvement
        { day: 15, hours: 6.1 }, // Inconsistent
        { day: 12, hours: 6.7 }, // Getting better
        { day: 9, hours: 6.9 }, // Steady improvement
        { day: 6, hours: 7.2 }, // Good progress
        { day: 3, hours: 7.4 }, // Almost there
        { day: 0, hours: 7.6 }, // Current: close to target
      ];

      // Add sleep records
      for (const entry of sleepProgress) {
        const recordDate = getPastDate(entry.day);
        await createHealthRecord(request, authToken, sleepTypeId, entry.hours, recordDate);
      }

      // Fetch updated goal
      const goals = await getHealthGoals(request, authToken, sleepTypeId);
      const updatedGoal = goals.find(g => g.id === goal.id);

      expect(updatedGoal).toBeDefined();
      expect(updatedGoal!.currentValue).toBe(7.6); // Most recent sleep

      const expectedProgress = calculateExpectedProgress(7.6, 8);

      expect(updatedGoal!.progressPercentage).toBeCloseTo(expectedProgress, 2);
      expect(updatedGoal!.progressPercentage).toBeGreaterThan(90); // Very close to target
      expect(updatedGoal!.progressPercentage).toBeLessThan(100); // Not quite there yet

      // Still have time to reach the goal
      expect(updatedGoal!.daysRemaining).toBeGreaterThan(0);
      expect(updatedGoal!.isOverdue).toBe(false);
    });
  });
});
