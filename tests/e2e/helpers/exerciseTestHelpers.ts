import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

// Error handling configuration
const DEFAULT_TIMEOUT = 10000;
const RETRY_COUNT = 3;
const WAIT_DELAY = 1000;

// Custom error types
class ExerciseTestError extends Error {
  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = 'ExerciseTestError';
  }
}

class ElementNotFoundError extends ExerciseTestError {
  constructor(selector: string, context?: Record<string, any>) {
    super(`Element not found: ${selector}`, { selector, ...context });
    this.name = 'ElementNotFoundError';
  }
}

class ValidationError extends ExerciseTestError {
  constructor(message: string, context?: Record<string, any>) {
    super(`Validation failed: ${message}`, context);
    this.name = 'ValidationError';
  }
}

// Utility functions for error handling
async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number; visible?: boolean } = {}
): Promise<Locator> {
  const { timeout = DEFAULT_TIMEOUT, visible = true } = options;
  
  try {
    const element = page.locator(selector);
    if (visible) {
      await element.waitFor({ state: 'visible', timeout });
    } else {
      await element.waitFor({ state: 'attached', timeout });
    }
    return element;
  } catch (error) {
    throw new ElementNotFoundError(selector, { timeout, visible, originalError: error });
  }
}

async function waitForElementByRole(
  page: Page,
  role: string,
  options: { name?: string | RegExp; timeout?: number } = {}
): Promise<Locator> {
  const { name, timeout = DEFAULT_TIMEOUT } = options;
  
  try {
    const element = name 
      ? page.getByRole(role as any, { name })
      : page.getByRole(role as any);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  } catch (error) {
    throw new ElementNotFoundError(`${role}${name ? ` with name "${name}"` : ''}`, { 
      role, 
      name, 
      timeout, 
      originalError: error 
    });
  }
}

async function validateInput(paramName: string, value: any, validators: Array<(val: any) => boolean | string>) {
  for (const validator of validators) {
    const result = validator(value);
    if (result !== true) {
      const message = typeof result === 'string' ? result : `Invalid ${paramName}: ${value}`;
      throw new ValidationError(message, { paramName, value });
    }
  }
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries: number = RETRY_COUNT
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw new ExerciseTestError(
          `Failed after ${maxRetries} attempts: ${context}`,
          { attempts: maxRetries, lastError: lastError.message }
        );
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, WAIT_DELAY * attempt));
    }
  }
  
  throw lastError!;
}

// Types for exercise data
export type ExerciseLogData = {
  exercise: string;
  sets: number;
  reps: number | null;
  weight: number | null;
};

export type TrainingPlanData = {
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sessions_per_week: number;
  is_active?: boolean;
  start_date?: string;
};

export type ExerciseStats = {
  totalExerciseLogs: number;
  activePlans: number;
  completedSessions: number;
  weeklyProgress: number;
};

export type ProgressChartType = 'strength_progress' | 'workout_frequency' | 'volume_trends';

// Exercise Data Creation Helpers
export async function addExerciseLog(
  page: Page,
  exercise: string,
  sets: number,
  reps: number | null,
  weight: number | null,
) {
  // Input validation
  await validateInput('exercise', exercise, [
    (val) => typeof val === 'string' || 'Exercise must be a string',
    (val) => val.trim().length > 0 || 'Exercise name cannot be empty',
    (val) => val.length <= 100 || 'Exercise name too long (max 100 characters)'
  ]);
  
  await validateInput('sets', sets, [
    (val) => typeof val === 'number' || 'Sets must be a number',
    (val) => val > 0 || 'Sets must be greater than 0',
    (val) => val <= 50 || 'Sets must be reasonable (max 50)',
    (val) => Number.isInteger(val) || 'Sets must be a whole number'
  ]);
  
  if (reps !== null) {
    await validateInput('reps', reps, [
      (val) => typeof val === 'number' || 'Reps must be a number',
      (val) => val > 0 || 'Reps must be greater than 0',
      (val) => val <= 1000 || 'Reps must be reasonable (max 1000)',
      (val) => Number.isInteger(val) || 'Reps must be a whole number'
    ]);
  }
  
  if (weight !== null) {
    await validateInput('weight', weight, [
      (val) => typeof val === 'number' || 'Weight must be a number',
      (val) => val > 0 || 'Weight must be greater than 0',
      (val) => val <= 1000 || 'Weight must be reasonable (max 1000kg)'
    ]);
  }

  await retryOperation(async () => {
    try {
      // Wait for and click the Add Exercise Log button
      const addButton = await waitForElementByRole(page, 'button', { name: 'Add Exercise Log' });
      await addButton.click();
      
      // Wait for form to appear and fill exercise name
      const exerciseInput = await waitForElement(page, 'input[name="exercise"], [aria-label="Exercise"]');
      await exerciseInput.fill(exercise);
      
      // Fill sets
      const setsInput = await waitForElement(page, 'input[name="sets"], [aria-label="Sets"]');
      await setsInput.fill(sets.toString());
      
      // Fill reps if provided
      if (reps !== null) {
        const repsInput = await waitForElement(page, 'input[name="reps"], [aria-label="Reps"]');
        await repsInput.fill(reps.toString());
      }
      
      // Fill weight if provided
      if (weight !== null) {
        const weightInput = await waitForElement(page, 'input[name="weight"], [aria-label="Weight"]');
        await weightInput.fill(weight.toString());
      }

      // Save the log
      const saveButton = await waitForElementByRole(page, 'button', { name: 'Save Log' });
      await saveButton.click();
      
      // Wait for save to complete
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
      // Verify the log was created by checking for success feedback or updated list
      try {
        await page.waitForSelector(
          '[data-testid="exercise-log-success"], [data-testid="exercise-logs-list"]',
          { timeout: 5000 }
        );
      } catch {
        // If no specific success indicator, just continue
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to add exercise log', {
        exercise,
        sets,
        reps,
        weight,
        originalError: error
      });
    }
  }, `adding exercise log for ${exercise}`);
}

export async function createTrainingPlan(
  page: Page,
  name: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  sessionsPerWeek: number,
) {
  // Input validation
  await validateInput('name', name, [
    (val) => typeof val === 'string' || 'Plan name must be a string',
    (val) => val.trim().length > 0 || 'Plan name cannot be empty',
    (val) => val.length <= 100 || 'Plan name too long (max 100 characters)'
  ]);
  
  await validateInput('difficulty', difficulty, [
    (val) => ['beginner', 'intermediate', 'advanced'].includes(val) || 'Invalid difficulty level'
  ]);
  
  await validateInput('sessionsPerWeek', sessionsPerWeek, [
    (val) => typeof val === 'number' || 'Sessions per week must be a number',
    (val) => val > 0 || 'Sessions per week must be greater than 0',
    (val) => val <= 14 || 'Sessions per week must be reasonable (max 14)',
    (val) => Number.isInteger(val) || 'Sessions per week must be a whole number'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for and click the Create Training Plan button
      const createButton = await waitForElementByRole(page, 'button', { name: 'Create Training Plan' });
      await createButton.click();
      
      // Wait for form to appear and fill plan name
      const nameInput = await waitForElement(page, 'input[name="name"], [aria-label="Plan Name"]');
      await nameInput.fill(name);
      
      // Select difficulty
      const difficultySelect = await waitForElement(page, 'select[name="difficulty"], [aria-label="Difficulty"]');
      await difficultySelect.selectOption(difficulty);
      
      // Fill sessions per week
      const sessionsInput = await waitForElement(page, 'input[name="sessionsPerWeek"], [aria-label="Sessions per Week"]');
      await sessionsInput.fill(sessionsPerWeek.toString());
      
      // Create the plan
      const submitButton = await waitForElementByRole(page, 'button', { name: 'Create Plan' });
      await submitButton.click();
      
      // Wait for creation to complete
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
      // Verify the plan was created
      try {
        await page.waitForSelector(
          '[data-testid="training-plan-success"], [data-testid="training-plans-list"]',
          { timeout: 5000 }
        );
      } catch {
        // If no specific success indicator, just continue
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to create training plan', {
        name,
        difficulty,
        sessionsPerWeek,
        originalError: error
      });
    }
  }, `creating training plan "${name}"`);
}

export async function activateTrainingPlan(page: Page, planId: string) {
  // Input validation
  await validateInput('planId', planId, [
    (val) => typeof val === 'string' || 'Plan ID must be a string',
    (val) => val.trim().length > 0 || 'Plan ID cannot be empty'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for the training plan container
      const planContainer = await waitForElement(page, `[data-testid="training-plan-${planId}"]`);
      
      // Find and click the activate button within the plan container
      const activateButton = await waitForElementByRole(planContainer, 'button', { name: 'Activate' });
      await activateButton.click();
      
      // Wait for activation to complete
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
      // Verify the plan is now active
      await page.waitForSelector(
        `[data-testid="training-plan-${planId}"] [data-status="active"], [data-testid="training-plan-${planId}"] .active-indicator`,
        { timeout: 5000 }
      );
      
    } catch (error) {
      throw new ExerciseTestError('Failed to activate training plan', {
        planId,
        originalError: error
      });
    }
  }, `activating training plan ${planId}`);
}

export async function completeWorkoutSession(
  page: Page,
  planId: string,
  exercises: ExerciseLogData[],
) {
  // Input validation
  await validateInput('planId', planId, [
    (val) => typeof val === 'string' || 'Plan ID must be a string',
    (val) => val.trim().length > 0 || 'Plan ID cannot be empty'
  ]);
  
  await validateInput('exercises', exercises, [
    (val) => Array.isArray(val) || 'Exercises must be an array',
    (val) => val.length > 0 || 'At least one exercise is required for a workout session'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for the training plan container
      const planContainer = await waitForElement(page, `[data-testid="training-plan-${planId}"]`);
      
      // Find and click the start workout button
      const startButton = await waitForElementByRole(planContainer, 'button', { name: 'Start Workout' });
      await startButton.click();
      
      // Wait for workout session to start
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
      // Add each exercise log
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];
        try {
          await addExerciseLog(page, exercise.exercise, exercise.sets, exercise.reps, exercise.weight);
        } catch (error) {
          throw new ExerciseTestError(`Failed to add exercise ${i + 1} of ${exercises.length}`, {
            exerciseIndex: i,
            exercise,
            originalError: error
          });
        }
      }
      
      // Complete the session
      const completeButton = await waitForElementByRole(page, 'button', { name: 'Complete Session' });
      await completeButton.click();
      
      // Wait for completion
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
      // Verify session completion
      try {
        await page.waitForSelector(
          '[data-testid="workout-complete"], [data-testid="session-complete"]',
          { timeout: 5000 }
        );
      } catch {
        // If no specific completion indicator, just continue
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to complete workout session', {
        planId,
        exerciseCount: exercises.length,
        originalError: error
      });
    }
  }, `completing workout session for plan ${planId}`);
}

// Exercise Data Verification Helpers
export async function verifyExerciseStats(page: Page, expectedStats: ExerciseStats) {
  // Input validation
  await validateInput('expectedStats', expectedStats, [
    (val) => typeof val === 'object' && val !== null || 'Expected stats must be an object',
    (val) => 'totalExerciseLogs' in val || 'Expected stats must include totalExerciseLogs',
    (val) => 'activePlans' in val || 'Expected stats must include activePlans',
    (val) => 'completedSessions' in val || 'Expected stats must include completedSessions',
    (val) => 'weeklyProgress' in val || 'Expected stats must include weeklyProgress'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for stats container to be available
      const statsContainer = await waitForElement(page, '[data-testid="exercise-overview-stats"]');
      
      // Verify each stat with better error messages
      const stats = [
        { key: 'totalExerciseLogs', value: expectedStats.totalExerciseLogs, label: 'Total Exercise Logs' },
        { key: 'activePlans', value: expectedStats.activePlans, label: 'Active Plans' },
        { key: 'completedSessions', value: expectedStats.completedSessions, label: 'Completed Sessions' },
        { key: 'weeklyProgress', value: expectedStats.weeklyProgress, label: 'Weekly Progress' }
      ];
      
      for (const stat of stats) {
        try {
          const statElement = statsContainer.getByText(stat.value.toString());
          await expect(statElement).toBeVisible({ timeout: 5000 });
        } catch (error) {
          throw new ExerciseTestError(`Failed to verify ${stat.label}`, {
            expectedValue: stat.value,
            statKey: stat.key,
            originalError: error
          });
        }
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to verify exercise stats', {
        expectedStats,
        originalError: error
      });
    }
  }, 'verifying exercise stats');
}

export async function verifyRecentLogs(page: Page, expectedLogs: ExerciseLogData[]) {
  // Input validation
  await validateInput('expectedLogs', expectedLogs, [
    (val) => Array.isArray(val) || 'Expected logs must be an array'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for recent logs container
      const recentLogsContainer = await waitForElement(page, '[data-testid="exercise-overview-recent-logs"]');
      
      if (expectedLogs.length === 0) {
        // Verify empty state
        const emptyMessage = recentLogsContainer.getByText('No recent workouts');
        await expect(emptyMessage).toBeVisible({ timeout: 5000 });
        return;
      }
      
      // Verify each expected log
      for (let i = 0; i < expectedLogs.length; i++) {
        const log = expectedLogs[i];
        
        try {
          // Verify exercise name
          const exerciseElement = recentLogsContainer.getByText(log.exercise);
          await expect(exerciseElement).toBeVisible({ timeout: 5000 });
          
          // Verify sets
          const setsElement = recentLogsContainer.getByText(`${log.sets} sets`);
          await expect(setsElement).toBeVisible({ timeout: 5000 });
          
          // Verify reps if provided
          if (log.reps !== null) {
            const repsElement = recentLogsContainer.getByText(`× ${log.reps} reps`);
            await expect(repsElement).toBeVisible({ timeout: 5000 });
          }
          
          // Verify weight if provided
          if (log.weight !== null) {
            const weightElement = recentLogsContainer.getByText(`${log.weight}kg`);
            await expect(weightElement).toBeVisible({ timeout: 5000 });
          }
          
        } catch (error) {
          throw new ExerciseTestError(`Failed to verify recent log ${i + 1}`, {
            logIndex: i,
            expectedLog: log,
            originalError: error
          });
        }
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to verify recent logs', {
        expectedLogsCount: expectedLogs.length,
        originalError: error
      });
    }
  }, 'verifying recent logs');
}

export async function verifyTrainingPlans(page: Page, expectedPlans: TrainingPlanData[]) {
  // Input validation
  await validateInput('expectedPlans', expectedPlans, [
    (val) => Array.isArray(val) || 'Expected plans must be an array'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for training plans container
      const trainingPlansContainer = await waitForElement(page, '[data-testid="exercise-overview-active-plans"]');
      
      if (expectedPlans.length === 0) {
        // Verify empty state
        const emptyMessage = trainingPlansContainer.getByText('No active training plans');
        await expect(emptyMessage).toBeVisible({ timeout: 5000 });
        return;
      }
      
      // Verify each expected plan
      for (let i = 0; i < expectedPlans.length; i++) {
        const plan = expectedPlans[i];
        
        try {
          // Verify plan name
          const nameElement = trainingPlansContainer.getByText(plan.name);
          await expect(nameElement).toBeVisible({ timeout: 5000 });
          
          // Verify difficulty
          const difficultyElement = trainingPlansContainer.getByText(plan.difficulty);
          await expect(difficultyElement).toBeVisible({ timeout: 5000 });
          
          // Verify sessions per week
          const sessionsElement = trainingPlansContainer.getByText(`${plan.sessions_per_week} sessions/week`);
          await expect(sessionsElement).toBeVisible({ timeout: 5000 });
          
          // Verify active status if specified
          if (plan.is_active) {
            const activeElement = trainingPlansContainer.getByText('🟢 Active');
            await expect(activeElement).toBeVisible({ timeout: 5000 });
          }
          
        } catch (error) {
          throw new ExerciseTestError(`Failed to verify training plan ${i + 1}`, {
            planIndex: i,
            expectedPlan: plan,
            originalError: error
          });
        }
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to verify training plans', {
        expectedPlansCount: expectedPlans.length,
        originalError: error
      });
    }
  }, 'verifying training plans');
}

export async function verifyProgressCharts(page: Page, chartTypes: ProgressChartType[]) {
  // Input validation
  await validateInput('chartTypes', chartTypes, [
    (val) => Array.isArray(val) || 'Chart types must be an array',
    (val) => val.every(type => ['strength_progress', 'workout_frequency', 'volume_trends'].includes(type)) || 'Invalid chart type provided'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for progress charts container
      const progressChartsContainer = await waitForElement(page, '[data-testid="exercise-overview-progress-charts"]');
      
      // Verify each expected chart type
      for (let i = 0; i < chartTypes.length; i++) {
        const chartType = chartTypes[i];
        const chartTitle = chartType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        try {
          const chartElement = progressChartsContainer.getByText(chartTitle);
          await expect(chartElement).toBeVisible({ timeout: 5000 });
        } catch (error) {
          throw new ExerciseTestError(`Failed to verify progress chart ${i + 1}`, {
            chartIndex: i,
            chartType,
            chartTitle,
            originalError: error
          });
        }
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to verify progress charts', {
        expectedChartTypes: chartTypes,
        originalError: error
      });
    }
  }, 'verifying progress charts');
}

// Exercise Navigation Helpers
export async function navigateToExerciseOverview(page: Page) {
  await retryOperation(async () => {
    try {
      await page.goto('/dashboard/exercise', { timeout: DEFAULT_TIMEOUT });
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
      // Verify we're on the right page
      const overviewElement = await waitForElement(page, '[data-testid="exercise-overview"]');
      await expect(overviewElement).toBeVisible({ timeout: 5000 });
      
    } catch (error) {
      throw new ExerciseTestError('Failed to navigate to exercise overview', {
        targetUrl: '/dashboard/exercise',
        originalError: error
      });
    }
  }, 'navigating to exercise overview');
}

export async function navigateToWorkoutPage(page: Page) {
  await retryOperation(async () => {
    try {
      await page.goto('/dashboard/exercise/workout', { timeout: DEFAULT_TIMEOUT });
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
      // Verify we're on the workout page
      try {
        await page.waitForSelector('[data-testid="workout-page"], h1:has-text("Workout")', { timeout: 5000 });
      } catch {
        // If no specific workout page indicator, check URL
        expect(page.url()).toContain('/workout');
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to navigate to workout page', {
        targetUrl: '/dashboard/exercise/workout',
        originalError: error
      });
    }
  }, 'navigating to workout page');
}

export async function navigateToExerciseAnalytics(page: Page) {
  await retryOperation(async () => {
    try {
      await page.goto('/dashboard/exercise/analytics', { timeout: DEFAULT_TIMEOUT });
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
      // Verify we're on the analytics page
      try {
        await page.waitForSelector('[data-testid="analytics-page"], h1:has-text("Analytics")', { timeout: 5000 });
      } catch {
        // If no specific analytics page indicator, check URL
        expect(page.url()).toContain('/analytics');
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to navigate to exercise analytics', {
        targetUrl: '/dashboard/exercise/analytics',
        originalError: error
      });
    }
  }, 'navigating to exercise analytics');
}

export async function navigateToTrainingPlans(page: Page) {
  await retryOperation(async () => {
    try {
      await page.goto('/dashboard/exercise/plans', { timeout: DEFAULT_TIMEOUT });
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
      // Verify we're on the training plans page
      try {
        await page.waitForSelector('[data-testid="training-plans-page"], h1:has-text("Training Plans")', { timeout: 5000 });
      } catch {
        // If no specific plans page indicator, check URL
        expect(page.url()).toContain('/plans');
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to navigate to training plans', {
        targetUrl: '/dashboard/exercise/plans',
        originalError: error
      });
    }
  }, 'navigating to training plans');
}

// Exercise Interaction Helpers
export async function clickStatCard(page: Page, statType: string) {
  // Input validation
  await validateInput('statType', statType, [
    (val) => typeof val === 'string' || 'Stat type must be a string',
    (val) => val.trim().length > 0 || 'Stat type cannot be empty'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for stats container
      const statsContainer = await waitForElement(page, '[data-testid="exercise-overview-stats"]');
      
      // Find the stat card by text content
      const statCard = statsContainer.getByRole('button').filter({ hasText: statType });
      
      // Verify the stat card exists and is visible
      await expect(statCard).toBeVisible({ timeout: 5000 });
      
      // Click the stat card
      await statCard.click();
      
      // Wait for any navigation or state changes
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
    } catch (error) {
      throw new ExerciseTestError('Failed to click stat card', {
        statType,
        originalError: error
      });
    }
  }, `clicking stat card for ${statType}`);
}

export async function clickTrainingPlanCard(page: Page, planName: string) {
  // Input validation
  await validateInput('planName', planName, [
    (val) => typeof val === 'string' || 'Plan name must be a string',
    (val) => val.trim().length > 0 || 'Plan name cannot be empty'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for training plans container
      const trainingPlansContainer = await waitForElement(page, '[data-testid="exercise-overview-active-plans"]');
      
      // Find the plan card by text content
      const planCard = trainingPlansContainer.getByRole('button').filter({ hasText: planName });
      
      // Verify the plan card exists and is visible
      await expect(planCard).toBeVisible({ timeout: 5000 });
      
      // Click the plan card
      await planCard.click();
      
      // Wait for any navigation or state changes
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
    } catch (error) {
      throw new ExerciseTestError('Failed to click training plan card', {
        planName,
        originalError: error
      });
    }
  }, `clicking training plan card for ${planName}`);
}

export async function clickQuickAction(page: Page, actionType: string) {
  // Input validation
  await validateInput('actionType', actionType, [
    (val) => typeof val === 'string' || 'Action type must be a string',
    (val) => val.trim().length > 0 || 'Action type cannot be empty'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for quick actions container
      const quickActionsContainer = await waitForElement(page, '[data-testid="exercise-overview-quick-actions"]');
      
      // Find the action button by text content (case insensitive)
      const actionButton = quickActionsContainer.getByRole('link', { name: new RegExp(actionType, 'i') });
      
      // Verify the action button exists and is visible
      await expect(actionButton).toBeVisible({ timeout: 5000 });
      
      // Click the action button
      await actionButton.click();
      
      // Wait for navigation
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
    } catch (error) {
      throw new ExerciseTestError('Failed to click quick action', {
        actionType,
        originalError: error
      });
    }
  }, `clicking quick action ${actionType}`);
}

export async function clickProgressChart(page: Page, chartType: ProgressChartType) {
  // Input validation
  await validateInput('chartType', chartType, [
    (val) => ['strength_progress', 'workout_frequency', 'volume_trends'].includes(val) || 'Invalid chart type'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for progress charts container
      const progressChartsContainer = await waitForElement(page, '[data-testid="exercise-overview-progress-charts"]');
      
      // Convert chart type to display title
      const chartTitle = chartType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Find the chart element by text content
      const chartElement = progressChartsContainer.getByRole('button').filter({ hasText: chartTitle });
      
      // Verify the chart element exists and is visible
      await expect(chartElement).toBeVisible({ timeout: 5000 });
      
      // Click the chart element
      await chartElement.click();
      
      // Wait for any navigation or state changes
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
    } catch (error) {
      throw new ExerciseTestError('Failed to click progress chart', {
        chartType,
        chartTitle: chartType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        originalError: error
      });
    }
  }, `clicking progress chart ${chartType}`);
}

// Exercise Data Cleanup Helpers
export async function cleanupExerciseLogs(page: Page) {
  await retryOperation(async () => {
    try {
      await page.goto('/dashboard/exercise/logs', { timeout: DEFAULT_TIMEOUT });
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
      // Check if there are any delete buttons
      const deleteButtons = page.getByRole('button', { name: 'Delete' });
      const count = await deleteButtons.count();
      
      if (count === 0) {
        // No logs to cleanup
        return;
      }
      
      // Delete all logs
      for (let i = 0; i < count; i++) {
        try {
          // Always click the first delete button since the list updates after each deletion
          const firstDeleteButton = deleteButtons.first();
          await expect(firstDeleteButton).toBeVisible({ timeout: 5000 });
          await firstDeleteButton.click();
          
          // Wait for and click confirmation button
          const confirmButton = await waitForElementByRole(page, 'button', { name: 'Confirm Delete' });
          await confirmButton.click();
          
          // Wait for deletion to complete
          await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
          
        } catch (error) {
          throw new ExerciseTestError(`Failed to delete exercise log ${i + 1}`, {
            logIndex: i,
            totalCount: count,
            originalError: error
          });
        }
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to cleanup exercise logs', {
        originalError: error
      });
    }
  }, 'cleaning up exercise logs');
}

export async function cleanupTrainingPlans(page: Page) {
  await retryOperation(async () => {
    try {
      await page.goto('/dashboard/exercise/plans', { timeout: DEFAULT_TIMEOUT });
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      
      // Check if there are any delete buttons
      const deleteButtons = page.getByRole('button', { name: 'Delete Plan' });
      const count = await deleteButtons.count();
      
      if (count === 0) {
        // No plans to cleanup
        return;
      }
      
      // Delete all plans
      for (let i = 0; i < count; i++) {
        try {
          // Always click the first delete button since the list updates after each deletion
          const firstDeleteButton = deleteButtons.first();
          await expect(firstDeleteButton).toBeVisible({ timeout: 5000 });
          await firstDeleteButton.click();
          
          // Wait for and click confirmation button
          const confirmButton = await waitForElementByRole(page, 'button', { name: 'Confirm Delete' });
          await confirmButton.click();
          
          // Wait for deletion to complete
          await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
          
        } catch (error) {
          throw new ExerciseTestError(`Failed to delete training plan ${i + 1}`, {
            planIndex: i,
            totalCount: count,
            originalError: error
          });
        }
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to cleanup training plans', {
        originalError: error
      });
    }
  }, 'cleaning up training plans');
}

export async function cleanupExerciseData(page: Page) {
  try {
    await cleanupExerciseLogs(page);
    await cleanupTrainingPlans(page);
  } catch (error) {
    throw new ExerciseTestError('Failed to cleanup exercise data', {
      originalError: error
    });
  }
}

// Exercise Validation Helpers
export async function validateExerciseLogData(page: Page, logData: ExerciseLogData) {
  // Input validation
  await validateInput('logData', logData, [
    (val) => typeof val === 'object' && val !== null || 'Log data must be an object',
    (val) => 'exercise' in val || 'Log data must include exercise name',
    (val) => 'sets' in val || 'Log data must include sets',
    (val) => 'reps' in val || 'Log data must include reps (can be null)',
    (val) => 'weight' in val || 'Log data must include weight (can be null)'
  ]);

  await retryOperation(async () => {
    try {
      // Verify exercise name
      const exerciseElement = page.getByText(logData.exercise);
      await expect(exerciseElement).toBeVisible({ timeout: 5000 });
      
      // Verify sets
      const setsElement = page.getByText(`${logData.sets} sets`);
      await expect(setsElement).toBeVisible({ timeout: 5000 });
      
      // Verify reps if not null
      if (logData.reps !== null) {
        const repsElement = page.getByText(`${logData.reps} reps`);
        await expect(repsElement).toBeVisible({ timeout: 5000 });
      }
      
      // Verify weight if not null
      if (logData.weight !== null) {
        const weightElement = page.getByText(`${logData.weight}kg`);
        await expect(weightElement).toBeVisible({ timeout: 5000 });
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to validate exercise log data', {
        logData,
        originalError: error
      });
    }
  }, `validating exercise log data for ${logData.exercise}`);
}

export async function validateTrainingPlanData(page: Page, planData: TrainingPlanData) {
  // Input validation
  await validateInput('planData', planData, [
    (val) => typeof val === 'object' && val !== null || 'Plan data must be an object',
    (val) => 'name' in val || 'Plan data must include name',
    (val) => 'difficulty' in val || 'Plan data must include difficulty',
    (val) => 'sessions_per_week' in val || 'Plan data must include sessions_per_week'
  ]);

  await retryOperation(async () => {
    try {
      // Verify plan name
      const nameElement = page.getByText(planData.name);
      await expect(nameElement).toBeVisible({ timeout: 5000 });
      
      // Verify difficulty
      const difficultyElement = page.getByText(planData.difficulty);
      await expect(difficultyElement).toBeVisible({ timeout: 5000 });
      
      // Verify sessions per week
      const sessionsElement = page.getByText(`${planData.sessions_per_week} sessions/week`);
      await expect(sessionsElement).toBeVisible({ timeout: 5000 });
      
      // Verify active status if specified
      if (planData.is_active) {
        const activeElement = page.getByText('Active');
        await expect(activeElement).toBeVisible({ timeout: 5000 });
      }
      
      // Verify start date if provided
      if (planData.start_date) {
        const formattedDate = new Date(planData.start_date).toLocaleDateString();
        const dateElement = page.getByText(formattedDate);
        await expect(dateElement).toBeVisible({ timeout: 5000 });
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to validate training plan data', {
        planData,
        originalError: error
      });
    }
  }, `validating training plan data for ${planData.name}`);
}

export async function validateStatsCalculations(
  page: Page,
  rawData: { logs: ExerciseLogData[]; plans: TrainingPlanData[] },
  displayedStats: ExerciseStats,
) {
  // Input validation
  await validateInput('rawData', rawData, [
    (val) => typeof val === 'object' && val !== null || 'Raw data must be an object',
    (val) => 'logs' in val && Array.isArray(val.logs) || 'Raw data must include logs array',
    (val) => 'plans' in val && Array.isArray(val.plans) || 'Raw data must include plans array'
  ]);

  await retryOperation(async () => {
    try {
      // Calculate expected values
      const expectedTotalLogs = rawData.logs.length;
      const expectedActivePlans = rawData.plans.filter(plan => plan.is_active).length;
      
      // Validate calculations
      if (displayedStats.totalExerciseLogs !== expectedTotalLogs) {
        throw new ValidationError(
          `Total exercise logs mismatch: expected ${expectedTotalLogs}, got ${displayedStats.totalExerciseLogs}`
        );
      }
      
      if (displayedStats.activePlans !== expectedActivePlans) {
        throw new ValidationError(
          `Active plans mismatch: expected ${expectedActivePlans}, got ${displayedStats.activePlans}`
        );
      }
      
      // Verify the stats are displayed correctly on the page
      await verifyExerciseStats(page, displayedStats);
      
    } catch (error) {
      throw new ExerciseTestError('Failed to validate stats calculations', {
        rawData: {
          logsCount: rawData.logs.length,
          plansCount: rawData.plans.length,
          activePlansCount: rawData.plans.filter(p => p.is_active).length
        },
        displayedStats,
        originalError: error
      });
    }
  }, 'validating stats calculations');
}

// Date and Time Helpers
export function getFutureDate(months: number): string {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + months);
  return futureDate.toISOString().split('T')[0];
}

export function getFormattedDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function calculateTimeAgo(timestamp: string): number {
  const logDate = new Date(timestamp);
  return Math.floor((Date.now() - logDate.getTime()) / (1000 * 60 * 60));
}

// Behavioral Tracking Helpers
export async function verifyExerciseTrackingEvent(
  page: Page,
  eventName: string,
  expectedContext: Record<string, any>,
) {
  // Input validation
  await validateInput('eventName', eventName, [
    (val) => typeof val === 'string' || 'Event name must be a string',
    (val) => val.trim().length > 0 || 'Event name cannot be empty'
  ]);
  
  await validateInput('expectedContext', expectedContext, [
    (val) => typeof val === 'object' && val !== null || 'Expected context must be an object'
  ]);

  await retryOperation(async () => {
    try {
      // Wait for tracking request with timeout
      const trackingRequest = await page.waitForRequest(
        request => {
          return request.url().includes('/api/tracking') && request.method() === 'POST';
        },
        { timeout: DEFAULT_TIMEOUT }
      );
      
      if (!trackingRequest) {
        throw new ExerciseTestError('No tracking request found', {
          eventName,
          expectedContext
        });
      }
      
      // Get and validate request body
      const requestBody = await trackingRequest.postDataJSON();
      
      if (!requestBody) {
        throw new ExerciseTestError('Tracking request has no body', {
          eventName,
          requestUrl: trackingRequest.url()
        });
      }
      
      // Verify event name
      if (requestBody.eventName !== eventName) {
        throw new ValidationError(
          `Event name mismatch: expected "${eventName}", got "${requestBody.eventName}"`
        );
      }
      
      // Verify context
      for (const [key, value] of Object.entries(expectedContext)) {
        if (!requestBody.context || typeof requestBody.context !== 'object') {
          throw new ValidationError('Request body missing context object');
        }
        
        expect(requestBody.context).toMatchObject({ [key]: value });
      }
      
    } catch (error) {
      throw new ExerciseTestError('Failed to verify exercise tracking event', {
        eventName,
        expectedContext,
        originalError: error
      });
    }
  }, `verifying tracking event ${eventName}`);
}

export async function waitForTrackingEvent(page: Page, eventName: string) {
  // Input validation
  await validateInput('eventName', eventName, [
    (val) => typeof val === 'string' || 'Event name must be a string',
    (val) => val.trim().length > 0 || 'Event name cannot be empty'
  ]);

  await retryOperation(async () => {
    try {
      await page.waitForRequest(
        request => {
          if (!request.url().includes('/api/tracking') || request.method() !== 'POST') {
            return false;
          }
          
          try {
            const body = request.postDataJSON();
            return body?.eventName === eventName;
          } catch {
            return false;
          }
        },
        { timeout: DEFAULT_TIMEOUT }
      );
      
    } catch (error) {
      throw new ExerciseTestError('Failed to wait for tracking event', {
        eventName,
        originalError: error
      });
    }
  }, `waiting for tracking event ${eventName}`);
}

export async function mockExerciseTrackingFailure(page: Page) {
  await retryOperation(async () => {
    try {
      await page.route('**/api/tracking', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Tracking service unavailable' }),
        });
      });
      
    } catch (error) {
      throw new ExerciseTestError('Failed to mock tracking failure', {
        originalError: error
      });
    }
  }, 'mocking exercise tracking failure');
}

// Additional helper functions for common test scenarios
export async function createCompleteExerciseScenario(page: Page) {
  await retryOperation(async () => {
    try {
      // Create a training plan
      await createTrainingPlan(page, 'Test Strength Plan', 'intermediate', 3);
      
      // Add some exercise logs
      const exercises = [
        { exercise: 'Bench Press', sets: 3, reps: 10, weight: 80 },
        { exercise: 'Squats', sets: 4, reps: 8, weight: 100 },
        { exercise: 'Deadlifts', sets: 3, reps: 5, weight: 120 }
      ];
      
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        try {
          await addExerciseLog(page, ex.exercise, ex.sets, ex.reps, ex.weight);
        } catch (error) {
          throw new ExerciseTestError(`Failed to add exercise ${i + 1} in complete scenario`, {
            exerciseIndex: i,
            exercise: ex,
            originalError: error
          });
        }
      }
      
      // Navigate back to overview
      await navigateToExerciseOverview(page);
      
    } catch (error) {
      throw new ExerciseTestError('Failed to create complete exercise scenario', {
        originalError: error
      });
    }
  }, 'creating complete exercise scenario');
}

export async function verifyEmptyExerciseState(page: Page) {
  await retryOperation(async () => {
    try {
      const emptyStats = {
        totalExerciseLogs: 0,
        activePlans: 0,
        completedSessions: 0,
        weeklyProgress: 0,
      };
      
      await verifyExerciseStats(page, emptyStats);
      await verifyRecentLogs(page, []);
      await verifyTrainingPlans(page, []);
      
    } catch (error) {
      throw new ExerciseTestError('Failed to verify empty exercise state', {
        originalError: error
      });
    }
  }, 'verifying empty exercise state');
}

export async function generateTestExerciseLog(overrides: Partial<ExerciseLogData> = {}): Promise<ExerciseLogData> {
  try {
    // Input validation for overrides
    if (overrides.exercise !== undefined) {
      await validateInput('overrides.exercise', overrides.exercise, [
        (val) => typeof val === 'string' || 'Exercise override must be a string',
        (val) => val.trim().length > 0 || 'Exercise override cannot be empty'
      ]);
    }
    
    if (overrides.sets !== undefined) {
      await validateInput('overrides.sets', overrides.sets, [
        (val) => typeof val === 'number' || 'Sets override must be a number',
        (val) => val > 0 || 'Sets override must be greater than 0',
        (val) => Number.isInteger(val) || 'Sets override must be a whole number'
      ]);
    }
    
    const exercises = ['Bench Press', 'Squats', 'Deadlifts', 'Pull-ups', 'Push-ups'];
    const randomExercise = exercises[Math.floor(Math.random() * exercises.length)];
    
    const baseLog: ExerciseLogData = {
      exercise: randomExercise,
      sets: Math.floor(Math.random() * 5) + 1,
      reps: Math.floor(Math.random() * 15) + 5,
      weight: Math.floor(Math.random() * 100) + 20,
    };
    
    return { ...baseLog, ...overrides };
    
  } catch (error) {
    throw new ExerciseTestError('Failed to generate test exercise log', {
      overrides,
      originalError: error
    });
  }
}

export async function generateTestTrainingPlan(overrides: Partial<TrainingPlanData> = {}): Promise<TrainingPlanData> {
  try {
    // Input validation for overrides
    if (overrides.name !== undefined) {
      await validateInput('overrides.name', overrides.name, [
        (val) => typeof val === 'string' || 'Name override must be a string',
        (val) => val.trim().length > 0 || 'Name override cannot be empty'
      ]);
    }
    
    if (overrides.difficulty !== undefined) {
      await validateInput('overrides.difficulty', overrides.difficulty, [
        (val) => ['beginner', 'intermediate', 'advanced'].includes(val) || 'Invalid difficulty override'
      ]);
    }
    
    if (overrides.sessions_per_week !== undefined) {
      await validateInput('overrides.sessions_per_week', overrides.sessions_per_week, [
        (val) => typeof val === 'number' || 'Sessions per week override must be a number',
        (val) => val > 0 || 'Sessions per week override must be greater than 0',
        (val) => Number.isInteger(val) || 'Sessions per week override must be a whole number'
      ]);
    }
    
    const difficulties: Array<'beginner' | 'intermediate' | 'advanced'> = ['beginner', 'intermediate', 'advanced'];
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    
    const basePlan: TrainingPlanData = {
      name: `Test Plan ${Date.now()}`,
      difficulty: randomDifficulty,
      sessions_per_week: Math.floor(Math.random() * 6) + 1,
      is_active: Math.random() > 0.5,
      start_date: getFutureDate(-1),
    };
    
    return { ...basePlan, ...overrides };
    
  } catch (error) {
    throw new ExerciseTestError('Failed to generate test training plan', {
      overrides,
      originalError: error
    });
  }
}

// Export custom error classes for external use
export { 
  ExerciseTestError, 
  ElementNotFoundError, 
  ValidationError,
  DEFAULT_TIMEOUT,
  RETRY_COUNT,
  waitForElement,
  waitForElementByRole,
  validateInput,
  retryOperation
};