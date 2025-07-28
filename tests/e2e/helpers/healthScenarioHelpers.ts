import type { Page } from '@playwright/test';
import type { PredictionAlgorithm, TrendDirection } from '../../../src/components/health/types';
import type { HealthType } from '../../../src/validations/HealthRecordValidation';
import { expect } from '@playwright/test';

// Types for scenario data
export type HealthRecord = {
  type: HealthType;
  value: number;
  unit: string;
  recorded_at: Date;
};

export type HealthGoal = {
  type: HealthType;
  targetValue: number;
  targetDate: Date;
  unit: string;
};

export type UserProfile = {
  type: 'athlete' | 'sedentary' | 'elderly' | 'chronic_condition';
  baselineMetrics: Record<HealthType, { value: number; unit: string }>;
  goals: HealthGoal[];
  preferences: Record<string, any>;
};

export type DataPattern = 'linear' | 'exponential' | 'cyclical' | 'random_walk' | 'plateau';

export type CorrelationConfig = {
  targetMetric: HealthType;
  correlationStrength: number; // -1 to 1
  delay: number; // days
};

export type TreatmentEffect = {
  startDay: number;
  effectStrength: number; // percentage change
  duration: number; // days
};

/**
 * Generates realistic health data with anomalies based on behavioral research.
 * References:
 * - Prochaska, J. O., & DiClemente, C. C. (1983). Stages and processes of self-change of smoking: Toward an integrative model of change. Journal of consulting and clinical psychology, 51(3), 390.
 * - Tudor-Locke, C., & Bassett Jr, D. R. (2004). How many steps/day are enough? Preliminary pedometer indices for public health. Sports medicine, 34(1), 1-8.
 * - Shiffman, S., Stone, A. A., & Hufford, M. R. (2008). Ecological momentary assessment. Annu. Rev. Clin. Psychol., 4, 1-32.
 */
export function generateRealisticHealthData(
  metric: HealthType,
  durationDays: number,
  baselineValue: number,
  goalValue: number,
  pattern: DataPattern = 'linear',
): HealthRecord[] {
  const records: HealthRecord[] = [];
  const unit = getDefaultUnit(metric);

  for (let day = 0; day < durationDays; day++) {
    // Simulate weekly cycle of motivation (higher on Monday)
    const dayOfWeek = new Date(Date.now() - (durationDays - day) * 24 * 60 * 60 * 1000).getDay();
    const motivationFactor = (dayOfWeek === 1) ? 1.1 : (dayOfWeek === 0 || dayOfWeek === 6) ? 0.9 : 1.0;

    let value: number;
    const progress = day / durationDays;

    switch (pattern) {
      case 'linear':
        value = baselineValue + (goalValue - baselineValue) * progress * motivationFactor;
        break;
      case 'plateau': {
        const plateauStart = 0.4;
        const plateauEnd = 0.6;
        if (progress > plateauStart && progress < plateauEnd) {
          value = baselineValue + (goalValue - baselineValue) * plateauStart;
        } else {
          value = baselineValue + (goalValue - baselineValue) * progress;
        }
        break;
      }
      // Other patterns can be implemented here
      default:
        value = baselineValue + (goalValue - baselineValue) * progress;
    }

    // Add random noise
    value *= (1 + (Math.random() - 0.5) * 0.05); // 5% random noise

    records.push({
      type: metric,
      value: Math.max(0, value),
      unit,
      recorded_at: new Date(Date.now() - (durationDays - day) * 24 * 60 * 60 * 1000),
    });
  }

  let processedRecords = introduceMeasurementGaps(records, 0.1); // 10% chance of gap
  processedRecords = introduceDataEntryErrors(processedRecords, 0.05); // 5% chance of error

  return processedRecords;
}

/**
 * Introduces data entry errors into a dataset to simulate real-world inaccuracies.
 * Common errors include typos (e.g., 150 -> 15) or order of magnitude errors (e.g., 70 -> 700).
 * Reference: West, R. (2017). The psychology of addiction. In The Wiley Handbook of Addiction (pp. 3-14).
 */
export function introduceDataEntryErrors(records: HealthRecord[], errorRate: number): HealthRecord[] {
  return records.map((record) => {
    if (Math.random() < errorRate) {
      const errorType = Math.random();
      if (errorType < 0.5) {
        // Typo error (e.g., remove a digit)
        record.value = Number.parseFloat(record.value.toString().slice(0, -1)) || record.value / 10;
      } else {
        // Order of magnitude error
        record.value *= (Math.random() < 0.5 ? 10 : 0.1);
      }
    }
    return record;
  });
}

/**
 * Introduces gaps in the data to simulate periods where the user did not record their health metrics.
 * This is common during vacations, illness, or periods of low motivation.
 * Reference: Eysenbach, G. (2005). The law of attrition. Journal of medical Internet research, 7(1), e11.
 */
export function introduceMeasurementGaps(records: HealthRecord[], gapRate: number): HealthRecord[] {
  // Simulate a long gap (e.g., vacation)
  if (Math.random() < 0.1) { // 10% chance of a long gap
    const gapStart = Math.floor(Math.random() * records.length * 0.8);
    const gapEnd = gapStart + 7 + Math.floor(Math.random() * 7); // 1-2 week gap
    records.splice(gapStart, gapEnd - gapStart);
  }

  // Simulate random single-day gaps
  return records.filter(() => Math.random() > gapRate);
}

// Scenario Data Builders
export function createWeightLossJourney(
  startWeight: number,
  targetWeight: number,
  durationWeeks: number,
): HealthRecord[] {
  return generateRealisticHealthData('weight', durationWeeks * 7, startWeight, targetWeight, 'plateau');
}

export function createFitnessProgression(
  baselineMetrics: Record<string, { value: number; unit: string }>,
  improvementRate: number,
  durationWeeks: number,
): HealthRecord[] {
  const records: HealthRecord[] = [];
  const fitnessMetrics: HealthType[] = ['steps', 'exercise_minutes', 'heart_rate'];

  fitnessMetrics.forEach((metric) => {
    if (!baselineMetrics[metric]) {
      return;
    }

    const baseline = baselineMetrics[metric];
    const isInverseMetric = metric === 'heart_rate';
    const goalValue = isInverseMetric ? baseline.value * (1 - improvementRate) : baseline.value * (1 + improvementRate);

    const metricRecords = generateRealisticHealthData(metric, durationWeeks * 7, baseline.value, goalValue);
    records.push(...metricRecords);
  });

  return records;
}

export function createChronicConditionData(
  condition: 'hypertension' | 'diabetes' | 'heart_condition',
  baselineValues: Record<HealthType, number>,
  treatmentEffects: TreatmentEffect[],
): HealthRecord[] {
  const records: HealthRecord[] = [];
  const totalDays = 90; // 3 months of monitoring

  const conditionMetrics: Record<string, HealthType[]> = {
    hypertension: ['blood_pressure_systolic', 'blood_pressure_diastolic'],
    diabetes: ['blood_sugar'],
    heart_condition: ['heart_rate', 'oxygen_saturation'],
  };

  const metrics = conditionMetrics[condition] || [];
  const units: Record<HealthType, string> = {
    blood_pressure_systolic: 'mmHg',
    blood_pressure_diastolic: 'mmHg',
    blood_sugar: 'mg/dL',
    heart_rate: 'bpm',
    oxygen_saturation: '%',
    steps: 'steps',
    weight: 'kg',
    calories: 'kcal',
    water_intake: 'ml',
    exercise_minutes: 'minutes',
    temperature: '°C',
    sleep_hours: 'hours',
  };

  metrics.forEach((metric) => {
    const baseline = baselineValues[metric];
    if (!baseline) {
      return;
    }

    for (let day = 0; day <= totalDays; day++) {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - (totalDays - day));

      let value = baseline;

      // Apply treatment effects
      treatmentEffects.forEach((effect) => {
        if (day >= effect.startDay && day < effect.startDay + effect.duration) {
          const effectProgress = (day - effect.startDay) / effect.duration;
          const currentEffect = effect.effectStrength * Math.min(effectProgress, 1);
          value *= (1 + currentEffect / 100);
        }
      });

      // Add daily variations
      value += value * 0.05 * (Math.random() - 0.5);

      records.push({
        type: metric,
        value: Math.max(value, 0),
        unit: units[metric],
        recorded_at: baseDate,
      });
    }
  });

  return records;
}

export function createSeasonalHealthPattern(
  metric: HealthType,
  baselineValue: number,
  seasonalVariation: number,
): HealthRecord[] {
  const records: HealthRecord[] = [];
  const totalDays = 365; // Full year

  const units: Record<HealthType, string> = {
    steps: 'steps',
    exercise_minutes: 'minutes',
    weight: 'kg',
    sleep_hours: 'hours',
    blood_pressure_systolic: 'mmHg',
    blood_pressure_diastolic: 'mmHg',
    blood_sugar: 'mg/dL',
    heart_rate: 'bpm',
    oxygen_saturation: '%',
    calories: 'kcal',
    water_intake: 'ml',
    temperature: '°C',
  };

  for (let day = 0; day <= totalDays; day += 7) { // Weekly records
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - (totalDays - day));

    // Calculate seasonal effect (sine wave with peak in summer)
    const dayOfYear = (day % 365) / 365;
    const seasonalEffect = Math.sin(2 * Math.PI * (dayOfYear - 0.25)) * seasonalVariation;

    const value = baselineValue * (1 + seasonalEffect);

    records.push({
      type: metric,
      value: Math.max(value, 0),
      unit: units[metric] || 'unit',
      recorded_at: baseDate,
    });
  }

  return records;
}

// Multi-Metric Scenario Builders
export function createComprehensiveHealthProfile(
  userType: UserProfile['type'],
  duration: number,
): { records: HealthRecord[]; goals: HealthGoal[] } {
  const profiles: Record<UserProfile['type'], any> = {
    athlete: {
      baseline: {
        weight: { value: 70, unit: 'kg' },
        steps: { value: 15000, unit: 'steps' },
        exercise_minutes: { value: 90, unit: 'minutes' },
        heart_rate: { value: 50, unit: 'bpm' },
        sleep_hours: { value: 8, unit: 'hours' },
      },
      improvementRate: 0.1,
    },
    sedentary: {
      baseline: {
        weight: { value: 85, unit: 'kg' },
        steps: { value: 3000, unit: 'steps' },
        exercise_minutes: { value: 10, unit: 'minutes' },
        heart_rate: { value: 80, unit: 'bpm' },
        sleep_hours: { value: 6, unit: 'hours' },
      },
      improvementRate: 0.3,
    },
    elderly: {
      baseline: {
        weight: { value: 75, unit: 'kg' },
        steps: { value: 5000, unit: 'steps' },
        exercise_minutes: { value: 30, unit: 'minutes' },
        heart_rate: { value: 70, unit: 'bpm' },
        blood_pressure_systolic: { value: 140, unit: 'mmHg' },
      },
      improvementRate: 0.15,
    },
    chronic_condition: {
      baseline: {
        weight: { value: 90, unit: 'kg' },
        blood_sugar: { value: 150, unit: 'mg/dL' },
        blood_pressure_systolic: { value: 150, unit: 'mmHg' },
        blood_pressure_diastolic: { value: 95, unit: 'mmHg' },
      },
      improvementRate: 0.2,
    },
  };

  const profile = profiles[userType];
  const records = createFitnessProgression(profile.baseline, profile.improvementRate, duration);

  // Create realistic goals
  const goals: HealthGoal[] = Object.entries(profile.baseline).map(([type, baseline]: [string, { value: number; unit: string }]) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + duration * 7);

    const isInverseMetric = ['weight', 'heart_rate', 'blood_sugar', 'blood_pressure_systolic'].includes(type);
    const targetValue = isInverseMetric
      ? baseline.value * 0.9
      : baseline.value * 1.2;

    return {
      type: type as HealthType,
      targetValue,
      targetDate,
      unit: baseline.unit,
    };
  });

  return { records, goals };
}

export function createCorrelatedMetrics(
  primaryMetric: HealthType,
  correlations: CorrelationConfig[],
): HealthRecord[] {
  const records: HealthRecord[] = [];
  const totalDays = 60;

  // Generate primary metric data
  const primaryRecords = generateDailyRecords(
    new Date(Date.now() - totalDays * 24 * 60 * 60 * 1000),
    new Date(),
    primaryMetric,
    'linear',
  );

  records.push(...primaryRecords);

  // Generate correlated metrics
  correlations.forEach((correlation) => {
    const correlatedRecords = primaryRecords.map((record) => {
      const delayedDate = new Date(record.recorded_at);
      delayedDate.setDate(delayedDate.getDate() + correlation.delay);

      // Calculate correlated value
      const primaryValue = record.value;
      const correlatedValue = primaryValue * (1 + correlation.correlationStrength * 0.1);

      return {
        type: correlation.targetMetric,
        value: Math.max(correlatedValue, 0),
        unit: getDefaultUnit(correlation.targetMetric),
        recorded_at: delayedDate,
      };
    });

    records.push(...correlatedRecords);
  });

  return records;
}

export function createGoalAchievementScenario(
  goals: HealthGoal[],
  achievementRate: number,
): HealthRecord[] {
  const records: HealthRecord[] = [];

  goals.forEach((goal) => {
    const totalDays = Math.floor((goal.targetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - totalDays);

    // Calculate starting value (assume 50% away from goal)
    const startValue = goal.targetValue * 0.5;
    const totalProgress = goal.targetValue - startValue;

    for (let day = 0; day <= totalDays; day += 3) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);

      // Progress with setbacks and breakthroughs
      let progressFactor = (day / totalDays) * achievementRate;

      // Add setbacks (weeks 2-3 and 6-7)
      if ((day >= 14 && day <= 21) || (day >= 42 && day <= 49)) {
        progressFactor *= 0.8; // 20% setback
      }

      // Add breakthroughs (weeks 4 and 8)
      if ((day >= 28 && day <= 35) || (day >= 56 && day <= 63)) {
        progressFactor *= 1.3; // 30% breakthrough
      }

      const currentValue = startValue + (totalProgress * progressFactor);

      records.push({
        type: goal.type,
        value: Math.max(currentValue, 0),
        unit: goal.unit,
        recorded_at: currentDate,
      });
    }
  });

  return records;
}

// Time-Series Data Helpers
export function generateDailyRecords(
  startDate: Date,
  endDate: Date,
  metric: HealthType,
  pattern: DataPattern,
): HealthRecord[] {
  const records: HealthRecord[] = [];
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const baseValue = getBaselineValue(metric);
  const unit = getDefaultUnit(metric);

  for (let day = 0; day <= totalDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);

    let value: number;

    switch (pattern) {
      case 'linear':
        value = baseValue + (day / totalDays) * baseValue * 0.2;
        break;
      case 'exponential':
        value = baseValue * Math.exp(day / totalDays * 0.5);
        break;
      case 'cyclical':
        value = baseValue + Math.sin(2 * Math.PI * day / 30) * baseValue * 0.1;
        break;
      case 'random_walk':
        value = day === 0 ? baseValue : records[day - 1].value + (Math.random() - 0.5) * baseValue * 0.05;
        break;
      case 'plateau':
        value = day < totalDays / 2 ? baseValue + (day / (totalDays / 2)) * baseValue * 0.2 : baseValue * 1.2;
        break;
      default:
        value = baseValue;
    }

    records.push({
      type: metric,
      value: Math.max(value, 0),
      unit,
      recorded_at: currentDate,
    });
  }

  return records;
}

export function addRealisticNoise(data: HealthRecord[], noiseLevel: number): HealthRecord[] {
  return data.map(record => ({
    ...record,
    value: record.value + (Math.random() - 0.5) * record.value * noiseLevel,
  }));
}

export function createDataGaps(data: HealthRecord[], gapPattern: 'weekends' | 'vacation' | 'illness'): HealthRecord[] {
  return data.filter((record) => {
    const dayOfWeek = record.recorded_at.getDay();
    const dayOfMonth = record.recorded_at.getDate();

    switch (gapPattern) {
      case 'weekends':
        return dayOfWeek !== 0 && dayOfWeek !== 6; // Remove weekends
      case 'vacation':
        return !(dayOfMonth >= 15 && dayOfMonth <= 22); // Remove mid-month week
      case 'illness':
        return !(dayOfMonth >= 5 && dayOfMonth <= 9); // Remove early month period
      default:
        return true;
    }
  });
}

export function generateReminderSchedule(
  frequency: 'daily' | 'weekly' | 'monthly',
): string {
  const schedules = {
    daily: '0 9 * * *', // 9 AM daily
    weekly: '0 9 * * 1', // 9 AM every Monday
    monthly: '0 9 1 * *', // 9 AM first day of month
  };

  return schedules[frequency];
}

// API Interaction Helpers
export async function bulkCreateHealthRecords(page: Page, records: HealthRecord[]): Promise<void> {
  // Navigate to health records page
  await page.goto('/health/records');

  for (const record of records) {
    await page.getByRole('button', { name: 'Add Record' }).click();
    await page.getByLabel('Health Type').selectOption(record.type);
    await page.getByLabel('Value').fill(record.value.toString());
    await page.getByLabel('Unit').fill(record.unit);

    // Set date
    const dateString = record.recorded_at.toISOString().split('T')[0];
    await page.getByLabel('Date').fill(dateString);

    await page.getByRole('button', { name: 'Save Record' }).click();
    await page.waitForLoadState('networkidle');
  }
}

export async function setupUserHealthProfile(page: Page, profileData: UserProfile): Promise<void> {
  // Create baseline records
  const records: HealthRecord[] = Object.entries(profileData.baselineMetrics).map(([type, data]) => ({
    type: type as HealthType,
    value: data.value,
    unit: data.unit,
    recorded_at: new Date(),
  }));

  await bulkCreateHealthRecords(page, records);

  // Create goals
  for (const goal of profileData.goals) {
    await page.getByRole('button', { name: 'Add Goal' }).click();
    await page.getByLabel('Health Type').selectOption(goal.type);
    await page.getByLabel('Target Value').fill(goal.targetValue.toString());
    await page.getByLabel('Target Date').fill(goal.targetDate.toISOString().split('T')[0]);
    await page.getByRole('button', { name: 'Save Goal' }).click();
    await page.waitForLoadState('networkidle');
  }
}

export async function waitForAnalyticsUpdate(page: Page, expectedDataPoints: number): Promise<void> {
  await page.waitForFunction(
    (expectedCount) => {
      const chartElements = document.querySelectorAll('[data-testid="chart-data-point"]');
      return chartElements.length >= expectedCount;
    },
    expectedDataPoints,
    { timeout: 10000 },
  );
}

export async function verifyDataPersistence(page: Page, expectedData: HealthRecord[]): Promise<void> {
  await page.reload();
  await page.waitForLoadState('networkidle');

  for (const record of expectedData) {
    await expect(page.getByText(`${record.value} ${record.unit}`)).toBeVisible();
  }
}

// Validation and Assertion Helpers
export async function validateHealthOverviewStats(
  page: Page,
  expectedStats: Record<string, { value: number; trend: TrendDirection }>,
): Promise<void> {
  for (const [metric, stats] of Object.entries(expectedStats)) {
    const statCard = page.getByTestId(`stat-card-${metric}`);

    await expect(statCard.getByText(stats.value.toString())).toBeVisible();
    await expect(statCard.getByTestId(`trend-${stats.trend}`)).toBeVisible();
  }
}

export async function validateRadarChartScores(
  page: Page,
  expectedScores: Record<string, number>,
  tolerance: number = 5,
): Promise<void> {
  for (const [metric, expectedScore] of Object.entries(expectedScores)) {
    const scoreElement = page.getByTestId(`radar-score-${metric}`);
    const actualScore = await scoreElement.textContent();
    const actualValue = Number.parseFloat(actualScore || '0');

    expect(Math.abs(actualValue - expectedScore)).toBeLessThanOrEqual(tolerance);
  }
}

export async function validatePredictiveAccuracy(
  page: Page,
  tolerance: number = 10,
): Promise<void> {
  const accuracyElement = page.getByTestId('prediction-accuracy');
  const accuracyText = await accuracyElement.textContent();
  const accuracy = Number.parseFloat(accuracyText?.replace('%', '') || '0');

  expect(accuracy).toBeGreaterThan(100 - tolerance);
}

export async function validateGoalProgress(
  page: Page,
  goalId: string,
  expectedProgress: number,
): Promise<void> {
  const progressElement = page.getByTestId(`goal-progress-${goalId}`);
  const progressText = await progressElement.textContent();
  const actualProgress = Number.parseFloat(progressText?.replace('%', '') || '0');

  expect(Math.abs(actualProgress - expectedProgress)).toBeLessThanOrEqual(2);
}

export async function validateTrendDirection(
  page: Page,
  metric: string,
  expectedDirection: TrendDirection,
): Promise<void> {
  const trendElement = page.getByTestId(`trend-${metric}`);

  await expect(trendElement).toHaveAttribute('data-direction', expectedDirection);
}

// Navigation and UI Interaction Helpers
export async function navigateToHealthAnalytics(
  page: Page,
  healthType: HealthType,
  dateRange: { start: Date; end: Date },
): Promise<void> {
  await page.goto('/health/analytics');
  await page.getByLabel('Health Type').selectOption({ label: healthType });
  await page.getByLabel('Start Date').fill(dateRange.start.toISOString().split('T')[0]);
  await page.getByLabel('End Date').fill(dateRange.end.toISOString().split('T')[0]);
  await page.getByRole('button', { name: 'Apply Filters' }).click();
  await page.waitForLoadState('networkidle');
}

export async function switchPredictionAlgorithm(page: Page, algorithm: PredictionAlgorithm): Promise<void> {
  await page.getByTestId('algorithm-selector').selectOption(algorithm);
  await page.waitForLoadState('networkidle');
  await waitForAnalyticsUpdate(page, 1);
}

export async function adjustDateRange(page: Page, startDate: Date, endDate: Date): Promise<void> {
  await page.getByLabel('Start Date').fill(startDate.toISOString().split('T')[0]);
  await page.getByLabel('End Date').fill(endDate.toISOString().split('T')[0]);
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.waitForLoadState('networkidle');
}

export async function exportHealthData(page: Page, format: 'csv' | 'json' | 'pdf'): Promise<void> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('menuitem', { name: format.toUpperCase() }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain(format);
}

export async function toggleChartFeatures(
  page: Page,
  features: { confidenceInterval?: boolean; legend?: boolean; tooltip?: boolean },
): Promise<void> {
  if (features.confidenceInterval !== undefined) {
    const toggle = page.getByTestId('confidence-interval-toggle');
    if (features.confidenceInterval) {
      await toggle.check();
    } else {
      await toggle.uncheck();
    }
  }

  if (features.legend !== undefined) {
    const toggle = page.getByTestId('legend-toggle');
    if (features.legend) {
      await toggle.check();
    } else {
      await toggle.uncheck();
    }
  }

  await page.waitForLoadState('networkidle');
}

// Performance and Load Testing Helpers
export function createLargeDataset(recordCount: number, metrics: HealthType[]): HealthRecord[] {
  const records: HealthRecord[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - recordCount);

  for (let i = 0; i < recordCount; i++) {
    const metric = metrics[i % metrics.length] as HealthType;
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    records.push({
      type: metric,
      value: getBaselineValue(metric) * (1 + Math.random() * 0.2),
      unit: getDefaultUnit(metric),
      recorded_at: date,
    });
  }

  return records;
}

export async function measurePageLoadTime(page: Page, expectedThreshold: number): Promise<number> {
  const startTime = Date.now();
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(expectedThreshold);

  return loadTime;
}

export async function testConcurrentUsers(userCount: number, scenario: () => Promise<void>): Promise<void> {
  const promises = Array.from({ length: userCount }, () => scenario());
  await Promise.all(promises);
}

export async function validateMemoryUsage(page: Page, expectedLimits: { heap: number; dom: number }): Promise<void> {
  const metrics = await page.evaluate(() => {
    return {
      heap: (performance as any).memory?.usedJSHeapSize || 0,
      dom: document.querySelectorAll('*').length,
    };
  });

  expect(metrics.heap).toBeLessThan(expectedLimits.heap);
  expect(metrics.dom).toBeLessThan(expectedLimits.dom);
}

// Error Simulation Helpers
export async function simulateNetworkFailure(page: Page, duration: number): Promise<void> {
  await page.context().setOffline(true);
  await page.waitForTimeout(duration);
  await page.context().setOffline(false);
}

export async function injectInvalidData(
  page: Page,
  dataType: 'value' | 'date' | 'unit',
  invalidValues: string[],
): Promise<void> {
  await page.getByRole('button', { name: 'Add Record' }).click();

  for (const invalidValue of invalidValues) {
    switch (dataType) {
      case 'value':
        await page.getByLabel('Value').fill(invalidValue);
        break;
      case 'date':
        await page.getByLabel('Date').fill(invalidValue);
        break;
      case 'unit':
        await page.getByLabel('Unit').fill(invalidValue);
        break;
    }

    await page.getByRole('button', { name: 'Save Record' }).click();

    await expect(page.getByText(/error|invalid/i)).toBeVisible();
  }
}

export async function simulateServerError(
  page: Page,
  errorType: 'timeout' | '500' | '404',
  endpoints: string[],
): Promise<void> {
  for (const endpoint of endpoints) {
    await page.route(endpoint, (route) => {
      switch (errorType) {
        case 'timeout':
          return new Promise(() => {}); // Never resolve
        case '500':
          route.fulfill({ status: 500, body: 'Internal Server Error' });
          break;
        case '404':
          route.fulfill({ status: 404, body: 'Not Found' });
          break;
      }
    });
  }
}

export async function simulateDatabaseFailure(
  page: Page,
  mode: 'offline' | 'corrupt',
  endpoints: string[],
): Promise<void> {
  for (const endpoint of endpoints) {
    await page.route(endpoint, (route) => {
      if (mode === 'offline') {
        route.abort('internetdisconnected');
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{"data": "corrupted data", "records": [?]}',
        });
      }
    });
  }
}

export async function simulateAuthenticationError(
  page: Page,
  errorType: 'expired_token' | 'invalid_credentials',
  endpoints: string[],
): Promise<void> {
  for (const endpoint of endpoints) {
    await page.route(endpoint, (route) => {
      if (errorType === 'expired_token') {
        route.fulfill({ status: 401, body: 'Token expired' });
      } else {
        route.fulfill({ status: 403, body: 'Invalid credentials' });
      }
    });
  }
}

export async function simulateRateLimiting(page: Page, endpoints: string[]): Promise<void> {
  for (const endpoint of endpoints) {
    await page.route(endpoint, (route) => {
      route.fulfill({
        status: 429,
        body: 'Too Many Requests',
        headers: { 'Retry-After': '10' },
      });
    });
  }
}

export async function simulateMemoryExhaustion(page: Page): Promise<void> {
  await page.evaluate(() => {
    const largeArray = Array.from({ length: 10e6 }).fill('some data');
    (window as any).leakedData = largeArray;
  });
}

export async function simulateDataCorruption(page: Page, endpoints: string[]): Promise<void> {
  for (const endpoint of endpoints) {
    await page.route(endpoint, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"records": [{"type": "weight", "value": "invalid", "unit": "kg"}]}',
      });
    });
  }
}

export async function createDataConflicts(_page: Page, _conflictType: 'concurrent_edit' | 'stale_data'): Promise<void> {
  // Implementation would depend on specific conflict scenarios
  // This is a placeholder for conflict simulation logic
}

// Cleanup and Isolation Helpers
export async function cleanupUserHealthData(page: Page): Promise<void> {
  await page.goto('/health/settings');
  await page.getByRole('button', { name: 'Delete All Data' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.waitForLoadState('networkidle');
}

export async function resetHealthAnalytics(page: Page): Promise<void> {
  await page.goto('/health/analytics');
  await page.getByRole('button', { name: 'Reset Cache' }).click();
  await page.waitForLoadState('networkidle');
}

export async function isolateTestData(_page: Page, testId: string): Promise<void> {
  await _page.addInitScript((id) => {
    (window as any).testId = id;
  }, testId);
}

export async function archiveTestResults(page: Page, _scenarioName: string): Promise<void> {
  const screenshot = await page.screenshot({ fullPage: true });
  // Save screenshot and test results
}

// Helper utility functions
function getBaselineValue(metric: HealthType): number {
  const baselines: Record<HealthType, number> = {
    weight: 70,
    blood_pressure_systolic: 120,
    blood_pressure_diastolic: 80,
    heart_rate: 70,
    steps: 8000,
    sleep_hours: 7,
    water_intake: 2000,
    calories: 2000,
    exercise_minutes: 30,
    blood_sugar: 100,
    temperature: 98.6,
    oxygen_saturation: 98,
  };

  return baselines[metric] || 100;
}

function getDefaultUnit(metric: HealthType): string {
  const units: Record<HealthType, string> = {
    weight: 'kg',
    blood_pressure_systolic: 'mmHg',
    blood_pressure_diastolic: 'mmHg',
    heart_rate: 'bpm',
    steps: 'steps',
    sleep_hours: 'hours',
    water_intake: 'ml',
    calories: 'kcal',
    exercise_minutes: 'minutes',
    blood_sugar: 'mg/dL',
    temperature: '°F',
    oxygen_saturation: '%',
  };

  return units[metric] || 'unit';
}
