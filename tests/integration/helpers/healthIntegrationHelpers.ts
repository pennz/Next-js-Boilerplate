import { faker } from '@faker-js/faker';
import { expect, type APIRequestContext } from '@playwright/test';
import { parseExpression } from 'cron-parser';

// Types for health data structures
interface HealthRecord {
  id?: number;
  type_id: number;
  value: number;
  unit: string;
  recorded_at: string;
  user_id?: number;
}

interface HealthGoal {
  id?: number;
  type_id: number;
  target_value: number;
  target_date: string;
  status: 'active' | 'completed' | 'paused';
  user_id?: number;
  progress_percentage?: number;
  days_remaining?: number;
  current_value?: number;
}

interface HealthReminder {
  id?: number;
  type_id: number;
  cron_expr: string;
  message: string;
  active: boolean;
  user_id?: number;
  next_run_at?: string;
}

interface AnalyticsData {
  date: string;
  value: number;
  count: number;
  avgValue: number;
  minValue: number;
  maxValue: number;
}

interface AnalyticsResponse {
  data: AnalyticsData[];
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    percentage: number;
    slope: number;
  };
  currentValue: number;
  totalRecords: number;
  typicalRange: { min: number; max: number };
  start_date: string;
  end_date: string;
}

interface TestUser {
  id: string;
  email: string;
  name: string;
}

// Health type configurations for realistic data generation
const HEALTH_TYPE_CONFIGS = {
  1: { name: 'weight', unit: 'kg', min: 40, max: 200, ideal: { min: 60, max: 80 } },
  2: { name: 'blood_pressure_systolic', unit: 'mmHg', min: 90, max: 180, ideal: { min: 110, max: 130 } },
  3: { name: 'blood_pressure_diastolic', unit: 'mmHg', min: 60, max: 110, ideal: { min: 70, max: 85 } },
  4: { name: 'heart_rate', unit: 'bpm', min: 50, max: 120, ideal: { min: 60, max: 100 } },
  5: { name: 'steps', unit: 'steps', min: 1000, max: 30000, ideal: { min: 8000, max: 12000 } },
  6: { name: 'sleep_hours', unit: 'hours', min: 4, max: 12, ideal: { min: 7, max: 9 } },
  7: { name: 'water_intake', unit: 'ml', min: 500, max: 4000, ideal: { min: 2000, max: 3000 } },
  8: { name: 'calories', unit: 'kcal', min: 1200, max: 4000, ideal: { min: 1800, max: 2500 } },
  9: { name: 'exercise_minutes', unit: 'minutes', min: 0, max: 180, ideal: { min: 30, max: 60 } },
  10: { name: 'blood_sugar', unit: 'mg/dL', min: 70, max: 200, ideal: { min: 80, max: 120 } },
};

// Valid cron expressions for testing
const VALID_CRON_EXPRESSIONS = [
  '0 9 * * *',      // Daily at 9 AM
  '0 12 * * 1',     // Weekly on Monday at noon
  '0 8,20 * * *',   // Twice daily at 8 AM and 8 PM
  '*/15 * * * *',   // Every 15 minutes
  '0 10 1 * *',     // Monthly on 1st at 10 AM
  '0 18 * * 1-5',   // Weekdays at 6 PM
];

// ============================================================================
// API REQUEST HELPERS
// ============================================================================

export async function createHealthRecord(
  request: APIRequestContext,
  data: Partial<HealthRecord> = {},
  e2eRandomId?: string
): Promise<{ response: any; data: HealthRecord }> {
  const recordData = {
    type_id: data.type_id || 1,
    value: data.value || faker.number.float({ min: 50, max: 100, fractionDigits: 1 }),
    unit: data.unit || 'kg',
    recorded_at: data.recorded_at || new Date().toISOString(),
    ...data,
  };

  const headers: Record<string, string> = {};
  if (e2eRandomId) {
    headers['x-e2e-random-id'] = e2eRandomId;
  }

  const response = await request.post('/api/health/records', {
    data: recordData,
    headers,
  });

  const responseData = await response.json();
  return { response, data: responseData };
}

export async function createHealthGoal(
  request: APIRequestContext,
  data: Partial<HealthGoal> = {},
  e2eRandomId?: string
): Promise<{ response: any; data: HealthGoal }> {
  const futureDate = createFutureDate(3); // 3 months from now
  const goalData = {
    type_id: data.type_id || 1,
    target_value: data.target_value || faker.number.float({ min: 60, max: 80, fractionDigits: 1 }),
    target_date: data.target_date || futureDate,
    status: data.status || 'active' as const,
    ...data,
  };

  const headers: Record<string, string> = {};
  if (e2eRandomId) {
    headers['x-e2e-random-id'] = e2eRandomId;
  }

  const response = await request.post('/api/health/goals', {
    data: goalData,
    headers,
  });

  const responseData = await response.json();
  return { response, data: responseData };
}

export async function createHealthReminder(
  request: APIRequestContext,
  data: Partial<HealthReminder> = {},
  e2eRandomId?: string
): Promise<{ response: any; data: HealthReminder }> {
  const reminderData = {
    type_id: data.type_id || 1,
    cron_expr: data.cron_expr || faker.helpers.arrayElement(VALID_CRON_EXPRESSIONS),
    message: data.message || faker.lorem.sentence(),
    active: data.active !== undefined ? data.active : true,
    ...data,
  };

  const headers: Record<string, string> = {};
  if (e2eRandomId) {
    headers['x-e2e-random-id'] = e2eRandomId;
  }

  const response = await request.post('/api/health/reminders', {
    data: reminderData,
    headers,
  });

  const responseData = await response.json();
  return { response, data: responseData };
}

export async function fetchHealthAnalytics(
  request: APIRequestContext,
  typeId: number,
  options: {
    startDate?: string;
    endDate?: string;
    aggregation?: 'daily' | 'weekly' | 'monthly';
    e2eRandomId?: string;
  } = {}
): Promise<{ response: any; data: AnalyticsResponse }> {
  const params = new URLSearchParams();
  if (options.startDate) params.append('start_date', options.startDate);
  if (options.endDate) params.append('end_date', options.endDate);
  if (options.aggregation) params.append('aggregation', options.aggregation);

  const url = `/api/health/analytics/${typeId}${params.toString() ? `?${params.toString()}` : ''}`;

  const headers: Record<string, string> = {};
  if (options.e2eRandomId) {
    headers['x-e2e-random-id'] = options.e2eRandomId;
  }

  const response = await request.get(url, { headers });
  const responseData = await response.json();
  return { response, data: responseData };
}

export async function triggerReminders(
  request: APIRequestContext,
  cronSecret: string = 'test-cron-secret'
): Promise<{ response: any; data: { triggered_count: number } }> {
  const response = await request.post('/api/health/reminders/trigger', {
    headers: {
      'Authorization': `Bearer ${cronSecret}`,
    },
  });

  const responseData = await response.json();
  return { response, data: responseData };
}

// ============================================================================
// TEST DATA BUILDERS
// ============================================================================

export function buildHealthRecordData(
  typeId: number = 1,
  overrides: Partial<HealthRecord> = {}
): HealthRecord {
  const config = HEALTH_TYPE_CONFIGS[typeId as keyof typeof HEALTH_TYPE_CONFIGS] || HEALTH_TYPE_CONFIGS[1];
  
  return {
    type_id: typeId,
    value: faker.number.float({ min: config.min, max: config.max, fractionDigits: 1 }),
    unit: config.unit,
    recorded_at: faker.date.recent({ days: 30 }).toISOString(),
    ...overrides,
  };
}

export function buildHealthGoalData(
  typeId: number = 1,
  overrides: Partial<HealthGoal> = {}
): HealthGoal {
  const config = HEALTH_TYPE_CONFIGS[typeId as keyof typeof HEALTH_TYPE_CONFIGS] || HEALTH_TYPE_CONFIGS[1];
  
  return {
    type_id: typeId,
    target_value: faker.number.float({ 
      min: config.ideal.min, 
      max: config.ideal.max, 
      fractionDigits: 1 
    }),
    target_date: createFutureDate(faker.number.int({ min: 1, max: 6 })),
    status: faker.helpers.arrayElement(['active', 'completed', 'paused'] as const),
    ...overrides,
  };
}

export function buildReminderData(
  typeId: number = 1,
  overrides: Partial<HealthReminder> = {}
): HealthReminder {
  return {
    type_id: typeId,
    cron_expr: faker.helpers.arrayElement(VALID_CRON_EXPRESSIONS),
    message: `Remember to track your ${HEALTH_TYPE_CONFIGS[typeId as keyof typeof HEALTH_TYPE_CONFIGS]?.name || 'health metric'}!`,
    active: faker.datatype.boolean(),
    ...overrides,
  };
}

export function buildAnalyticsDataset(
  typeId: number,
  days: number = 30,
  trendType: 'increasing' | 'decreasing' | 'stable' | 'random' = 'random'
): AnalyticsData[] {
  const config = HEALTH_TYPE_CONFIGS[typeId as keyof typeof HEALTH_TYPE_CONFIGS] || HEALTH_TYPE_CONFIGS[1];
  const data: AnalyticsData[] = [];
  
  let baseValue = faker.number.float({ min: config.min, max: config.max });
  const trendFactor = trendType === 'increasing' ? 0.1 : trendType === 'decreasing' ? -0.1 : 0;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    
    if (trendType === 'random') {
      baseValue = faker.number.float({ min: config.min, max: config.max });
    } else if (trendType !== 'stable') {
      baseValue += (baseValue * trendFactor * faker.number.float({ min: 0.5, max: 1.5 }));
      baseValue = Math.max(config.min, Math.min(config.max, baseValue));
    }
    
    const variance = baseValue * 0.05; // 5% variance
    const value = faker.number.float({ 
      min: baseValue - variance, 
      max: baseValue + variance,
      fractionDigits: 1 
    });
    
    data.push({
      date: formatDateForAPI(date),
      value,
      count: faker.number.int({ min: 1, max: 3 }),
      avgValue: value,
      minValue: value - variance,
      maxValue: value + variance,
    });
  }
  
  return data;
}

export function buildUserProfile(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    ...overrides,
  };
}

// ============================================================================
// DATA VALIDATION HELPERS
// ============================================================================

export function validateHealthRecord(record: any): void {
  expect(record).toHaveProperty('id');
  expect(record).toHaveProperty('type_id');
  expect(record).toHaveProperty('value');
  expect(record).toHaveProperty('unit');
  expect(record).toHaveProperty('recorded_at');
  expect(typeof record.id).toBe('number');
  expect(typeof record.type_id).toBe('number');
  expect(typeof record.value).toBe('number');
  expect(typeof record.unit).toBe('string');
  expect(typeof record.recorded_at).toBe('string');
  expect(record.value).toBeGreaterThan(0);
}

export function validateGoalProgress(goal: any, expectedProgress?: number): void {
  expect(goal).toHaveProperty('id');
  expect(goal).toHaveProperty('type_id');
  expect(goal).toHaveProperty('target_value');
  expect(goal).toHaveProperty('target_date');
  expect(goal).toHaveProperty('status');
  
  if (goal.progress_percentage !== undefined) {
    expect(typeof goal.progress_percentage).toBe('number');
    expect(goal.progress_percentage).toBeGreaterThanOrEqual(0);
    expect(goal.progress_percentage).toBeLessThanOrEqual(100);
    
    if (expectedProgress !== undefined) {
      expect(goal.progress_percentage).toBeCloseTo(expectedProgress, 1);
    }
  }
  
  if (goal.days_remaining !== undefined) {
    expect(typeof goal.days_remaining).toBe('number');
  }
}

export function validateAnalyticsTrend(analytics: AnalyticsResponse, expectedDirection?: string): void {
  expect(analytics).toHaveProperty('data');
  expect(analytics).toHaveProperty('trend');
  expect(analytics.trend).toHaveProperty('direction');
  expect(analytics.trend).toHaveProperty('percentage');
  expect(analytics.trend).toHaveProperty('slope');
  
  expect(['increasing', 'decreasing', 'stable']).toContain(analytics.trend.direction);
  expect(typeof analytics.trend.percentage).toBe('number');
  expect(typeof analytics.trend.slope).toBe('number');
  
  if (expectedDirection) {
    expect(analytics.trend.direction).toBe(expectedDirection);
  }
}

export function validateTransformedData(data: any, expectedStructure: Record<string, string>): void {
  Object.entries(expectedStructure).forEach(([key, type]) => {
    expect(data).toHaveProperty(key);
    expect(typeof data[key]).toBe(type);
  });
}

export function validateScoreCalculation(score: number, expectedRange: { min: number; max: number }): void {
  expect(typeof score).toBe('number');
  expect(score).toBeGreaterThanOrEqual(expectedRange.min);
  expect(score).toBeLessThanOrEqual(expectedRange.max);
  expect(Number.isFinite(score)).toBe(true);
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

export async function cleanHealthData(request: APIRequestContext, e2eRandomId: string): Promise<void> {
  // Delete all test data for the specific e2e session
  const headers = { 'x-e2e-random-id': e2eRandomId };
  
  // Clean up in reverse dependency order
  await request.delete('/api/health/reminders/cleanup', { headers });
  await request.delete('/api/health/goals/cleanup', { headers });
  await request.delete('/api/health/records/cleanup', { headers });
}

export async function seedHealthTypes(request: APIRequestContext): Promise<void> {
  // Ensure health types are available (this would typically be handled by migrations)
  // For testing purposes, we assume health types 1-10 exist
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return buildUserProfile(overrides);
}

export async function setupHealthDataScenario(
  request: APIRequestContext,
  scenario: 'weight_loss' | 'fitness_improvement' | 'health_monitoring',
  e2eRandomId: string
): Promise<{
  records: HealthRecord[];
  goals: HealthGoal[];
  reminders: HealthReminder[];
}> {
  const records: HealthRecord[] = [];
  const goals: HealthGoal[] = [];
  const reminders: HealthReminder[] = [];
  
  switch (scenario) {
    case 'weight_loss':
      // Create weight loss journey: 80kg -> 70kg over 3 months
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const value = 80 - (i * 0.33); // Gradual weight loss
        
        const { data } = await createHealthRecord(request, {
          type_id: 1,
          value: Math.round(value * 10) / 10,
          unit: 'kg',
          recorded_at: date.toISOString(),
        }, e2eRandomId);
        records.push(data);
      }
      
      const { data: weightGoal } = await createHealthGoal(request, {
        type_id: 1,
        target_value: 70,
        target_date: createFutureDate(2),
        status: 'active',
      }, e2eRandomId);
      goals.push(weightGoal);
      
      const { data: weightReminder } = await createHealthReminder(request, {
        type_id: 1,
        cron_expr: '0 8 * * *',
        message: 'Time to weigh yourself!',
        active: true,
      }, e2eRandomId);
      reminders.push(weightReminder);
      break;
      
    case 'fitness_improvement':
      // Create fitness improvement: steps and exercise
      for (let i = 0; i < 14; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (13 - i));
        
        // Steps increasing from 5000 to 10000
        const steps = 5000 + (i * 357);
        const { data: stepRecord } = await createHealthRecord(request, {
          type_id: 5,
          value: steps,
          unit: 'steps',
          recorded_at: date.toISOString(),
        }, e2eRandomId);
        records.push(stepRecord);
        
        // Exercise minutes increasing
        const exercise = 15 + (i * 3);
        const { data: exerciseRecord } = await createHealthRecord(request, {
          type_id: 9,
          value: exercise,
          unit: 'minutes',
          recorded_at: date.toISOString(),
        }, e2eRandomId);
        records.push(exerciseRecord);
      }
      
      const { data: stepsGoal } = await createHealthGoal(request, {
        type_id: 5,
        target_value: 10000,
        target_date: createFutureDate(1),
        status: 'active',
      }, e2eRandomId);
      goals.push(stepsGoal);
      break;
      
    case 'health_monitoring':
      // Create comprehensive health monitoring
      const healthTypes = [1, 2, 4, 6]; // weight, blood pressure, heart rate, sleep
      
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        
        for (const typeId of healthTypes) {
          const config = HEALTH_TYPE_CONFIGS[typeId as keyof typeof HEALTH_TYPE_CONFIGS];
          const { data } = await createHealthRecord(request, {
            type_id: typeId,
            value: faker.number.float({ min: config.min, max: config.max, fractionDigits: 1 }),
            unit: config.unit,
            recorded_at: date.toISOString(),
          }, e2eRandomId);
          records.push(data);
        }
      }
      break;
  }
  
  return { records, goals, reminders };
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

export function getAuthHeaders(e2eRandomId?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (e2eRandomId) {
    headers['x-e2e-random-id'] = e2eRandomId;
  }
  return headers;
}

export function getCronSecret(): string {
  return process.env.CRON_SECRET || 'test-cron-secret';
}

export function switchTestUser(newUserId: string): string {
  return newUserId;
}

export async function validateUserIsolation(
  request: APIRequestContext,
  user1Id: string,
  user2Id: string
): Promise<void> {
  // Create data for user 1
  await createHealthRecord(request, { value: 70 }, user1Id);
  
  // Create data for user 2
  await createHealthRecord(request, { value: 80 }, user2Id);
  
  // Verify user 1 can't see user 2's data
  const user1Records = await request.get('/api/health/records', {
    headers: getAuthHeaders(user1Id),
  });
  const user1Data = await user1Records.json();
  
  const user2Records = await request.get('/api/health/records', {
    headers: getAuthHeaders(user2Id),
  });
  const user2Data = await user2Records.json();
  
  // Verify isolation
  expect(user1Data.data.some((record: any) => record.value === 80)).toBe(false);
  expect(user2Data.data.some((record: any) => record.value === 70)).toBe(false);
}

// ============================================================================
// CALCULATION VERIFICATION HELPERS
// ============================================================================

export function calculateExpectedTrend(values: number[]): {
  direction: 'increasing' | 'decreasing' | 'stable';
  percentage: number;
  slope: number;
} {
  if (values.length < 2) {
    return { direction: 'stable', percentage: 0, slope: 0 };
  }
  
  // Simple linear regression
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const percentage = ((lastValue - firstValue) / firstValue) * 100;
  
  let direction: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(slope) < 0.01) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }
  
  return { direction, percentage, slope };
}

export function calculateExpectedProgress(
  currentValue: number,
  targetValue: number,
  startValue?: number
): number {
  if (startValue) {
    const totalProgress = Math.abs(targetValue - startValue);
    const currentProgress = Math.abs(currentValue - startValue);
    return Math.min(100, (currentProgress / totalProgress) * 100);
  }
  
  // Simple percentage of target achieved
  return Math.min(100, (currentValue / targetValue) * 100);
}

export function calculateExpectedScore(
  value: number,
  idealRange: { min: number; max: number },
  totalRange: { min: number; max: number }
): number {
  // Normalize to 0-100 scale
  if (value >= idealRange.min && value <= idealRange.max) {
    return 100; // Perfect score in ideal range
  }
  
  // Calculate distance from ideal range
  let distance: number;
  if (value < idealRange.min) {
    distance = idealRange.min - value;
  } else {
    distance = value - idealRange.max;
  }
  
  const maxDistance = Math.max(
    idealRange.min - totalRange.min,
    totalRange.max - idealRange.max
  );
  
  const score = Math.max(0, 100 - (distance / maxDistance) * 100);
  return Math.round(score);
}

export function generatePredictedValues(
  historicalValues: number[],
  daysToPredict: number = 7,
  algorithm: 'linear-regression' | 'moving-average' = 'linear-regression'
): number[] {
  if (historicalValues.length === 0) return [];
  
  if (algorithm === 'moving-average') {
    const windowSize = Math.min(7, historicalValues.length);
    const recentValues = historicalValues.slice(-windowSize);
    const average = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    return Array(daysToPredict).fill(average);
  }
  
  // Linear regression
  const trend = calculateExpectedTrend(historicalValues);
  const lastValue = historicalValues[historicalValues.length - 1];
  const predictions: number[] = [];
  
  for (let i = 1; i <= daysToPredict; i++) {
    const predictedValue = lastValue + (trend.slope * i);
    predictions.push(Math.round(predictedValue * 10) / 10);
  }
  
  return predictions;
}

// ============================================================================
// DATE AND TIME HELPERS
// ============================================================================

export function generateDateRange(startDate: Date, days: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
}

export function getNextCronExecution(cronExpression: string, fromDate?: Date): Date {
  try {
    const interval = parseExpression(cronExpression, {
      currentDate: fromDate || new Date(),
    });
    return interval.next().toDate();
  } catch (error) {
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }
}

export function createFutureDate(monthsToAdd: number): string {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + monthsToAdd);
  return futureDate.toISOString();
}

export function createPastDate(daysToSubtract: number): string {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - daysToSubtract);
  return pastDate.toISOString();
}

export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// ERROR TESTING HELPERS
// ============================================================================

export async function expectValidationError(
  response: any,
  expectedStatus: number = 422,
  expectedMessage?: string
): Promise<void> {
  expect(response.status()).toBe(expectedStatus);
  
  if (expectedMessage) {
    const errorData = await response.json();
    expect(errorData.message || errorData.error).toContain(expectedMessage);
  }
}

export async function expectAuthenticationError(response: any): Promise<void> {
  expect(response.status()).toBe(401);
}

export async function expectBusinessLogicError(
  response: any,
  expectedMessage?: string
): Promise<void> {
  expect([400, 409, 422]).toContain(response.status());
  
  if (expectedMessage) {
    const errorData = await response.json();
    expect(errorData.message || errorData.error).toContain(expectedMessage);
  }
}

export async function expectRateLimitError(response: any): Promise<void> {
  expect(response.status()).toBe(429);
}

// ============================================================================
// PERFORMANCE TESTING HELPERS
// ============================================================================

export async function generateLargeDataset(
  request: APIRequestContext,
  recordCount: number,
  e2eRandomId: string
): Promise<HealthRecord[]> {
  const records: HealthRecord[] = [];
  const batchSize = 10;
  
  for (let i = 0; i < recordCount; i += batchSize) {
    const batch = Math.min(batchSize, recordCount - i);
    const promises: Promise<any>[] = [];
    
    for (let j = 0; j < batch; j++) {
      const recordData = buildHealthRecordData(
        faker.number.int({ min: 1, max: 10 }),
        {
          recorded_at: faker.date.recent({ days: 365 }).toISOString(),
        }
      );
      
      promises.push(createHealthRecord(request, recordData, e2eRandomId));
    }
    
    const results = await Promise.all(promises);
    records.push(...results.map(r => r.data));
  }
  
  return records;
}

export async function measureResponseTime(
  requestFunction: () => Promise<any>
): Promise<{ response: any; duration: number }> {
  const startTime = Date.now();
  const response = await requestFunction();
  const duration = Date.now() - startTime;
  
  return { response, duration };
}

export async function testConcurrentRequests(
  requestFunctions: (() => Promise<any>)[],
  maxConcurrency: number = 5
): Promise<any[]> {
  const results: any[] = [];
  
  for (let i = 0; i < requestFunctions.length; i += maxConcurrency) {
    const batch = requestFunctions.slice(i, i + maxConcurrency);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
  }
  
  return results;
}

export async function validateCachePerformance(
  request: APIRequestContext,
  endpoint: string,
  e2eRandomId: string,
  expectedCacheTTL: number = 300000 // 5 minutes
): Promise<void> {
  const headers = getAuthHeaders(e2eRandomId);
  
  // First request
  const { duration: firstDuration } = await measureResponseTime(() =>
    request.get(endpoint, { headers })
  );
  
  // Second request (should be cached)
  const { duration: secondDuration } = await measureResponseTime(() =>
    request.get(endpoint, { headers })
  );
  
  // Cache should make second request faster
  expect(secondDuration).toBeLessThan(firstDuration);
}

// ============================================================================
// INTEGRATION TESTING HELPERS
// ============================================================================

export async function testAPIToUIDataFlow(
  request: APIRequestContext,
  e2eRandomId: string
): Promise<{
  rawData: any;
  transformedData: any;
  validationResults: boolean[];
}> {
  // Create test data
  const { data: record } = await createHealthRecord(request, {}, e2eRandomId);
  const { data: goal } = await createHealthGoal(request, {}, e2eRandomId);
  
  // Fetch analytics
  const { data: analytics } = await fetchHealthAnalytics(request, 1, { e2eRandomId });
  
  // This would typically involve calling transformation functions
  // For now, we'll simulate the validation
  const validationResults = [
    record.id !== undefined,
    goal.id !== undefined,
    analytics.data !== undefined,
  ];
  
  return {
    rawData: { record, goal, analytics },
    transformedData: { /* transformed data would go here */ },
    validationResults,
  };
}

export async function validateCrossModuleConsistency(
  request: APIRequestContext,
  e2eRandomId: string
): Promise<void> {
  // Create test data and verify consistency between modules
  const { data: record } = await createHealthRecord(request, {
    type_id: 1,
    value: 75,
    unit: 'kg',
  }, e2eRandomId);
  
  // Verify the record was created correctly
  validateHealthRecord(record);
  
  // Additional cross-module validation would go here
}

export async function testCompleteHealthScenario(
  request: APIRequestContext,
  e2eRandomId: string
): Promise<void> {
  // Set up complete health scenario
  const scenario = await setupHealthDataScenario(request, 'weight_loss', e2eRandomId);
  
  // Verify all components work together
  expect(scenario.records.length).toBeGreaterThan(0);
  expect(scenario.goals.length).toBeGreaterThan(0);
  expect(scenario.reminders.length).toBeGreaterThan(0);
  
  // Test analytics with the created data
  const { data: analytics } = await fetchHealthAnalytics(request, 1, { e2eRandomId });
  validateAnalyticsTrend(analytics, 'decreasing'); // Weight loss should show decreasing trend
}

export async function validateBusinessLogicIntegration(
  request: APIRequestContext,
  e2eRandomId: string
): Promise<void> {
  // Test complex business logic scenarios
  
  // 1. Goal progress calculation
  const { data: goal } = await createHealthGoal(request, {
    type_id: 1,
    target_value: 70,
    status: 'active',
  }, e2eRandomId);
  
  const { data: record } = await createHealthRecord(request, {
    type_id: 1,
    value: 75,
    unit: 'kg',
  }, e2eRandomId);
  
  // Verify goal progress is calculated correctly
  // This would typically involve fetching updated goal data
  
  // 2. Reminder scheduling
  const { data: reminder } = await createHealthReminder(request, {
    type_id: 1,
    cron_expr: '0 9 * * *',
    active: true,
  }, e2eRandomId);
  
  // Verify next run time is calculated correctly
  expect(reminder.next_run_at).toBeDefined();
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

export function assertTrendDirection(
  actualTrend: { direction: string; percentage: number },
  expectedDirection: 'increasing' | 'decreasing' | 'stable',
  tolerance: number = 5
): void {
  expect(actualTrend.direction).toBe(expectedDirection);
  
  if (expectedDirection !== 'stable') {
    expect(Math.abs(actualTrend.percentage)).toBeGreaterThan(tolerance);
  }
}

export function assertScoreRange(
  score: number,
  expectedMin: number,
  expectedMax: number
): void {
  expect(score).toBeGreaterThanOrEqual(expectedMin);
  expect(score).toBeLessThanOrEqual(expectedMax);
  expect(Number.isInteger(score)).toBe(true);
}

export function assertProgressAccuracy(
  actualProgress: number,
  expectedProgress: number,
  tolerance: number = 2
): void {
  expect(actualProgress).toBeCloseTo(expectedProgress, tolerance);
  expect(actualProgress).toBeGreaterThanOrEqual(0);
  expect(actualProgress).toBeLessThanOrEqual(100);
}

export function assertDataTransformation(
  originalData: any,
  transformedData: any,
  requiredFields: string[]
): void {
  requiredFields.forEach(field => {
    expect(transformedData).toHaveProperty(field);
  });
  
  // Verify data integrity
  if (originalData.id && transformedData.id) {
    expect(transformedData.id).toBe(originalData.id);
  }
}

// ============================================================================
// MOCK AND FIXTURE HELPERS
// ============================================================================

export function mockAnalyticsResponse(
  typeId: number,
  dataPoints: number = 30,
  trendType: 'increasing' | 'decreasing' | 'stable' = 'stable'
): AnalyticsResponse {
  const data = buildAnalyticsDataset(typeId, dataPoints, trendType);
  const values = data.map(d => d.value);
  const trend = calculateExpectedTrend(values);
  const config = HEALTH_TYPE_CONFIGS[typeId as keyof typeof HEALTH_TYPE_CONFIGS] || HEALTH_TYPE_CONFIGS[1];
  
  return {
    data,
    trend,
    currentValue: values[values.length - 1],
    totalRecords: dataPoints,
    typicalRange: { min: config.min, max: config.max },
    start_date: formatDateForAPI(new Date(Date.now() - dataPoints * 24 * 60 * 60 * 1000)),
    end_date: formatDateForAPI(new Date()),
  };
}

export function createHealthDataFixtures(): {
  records: HealthRecord[];
  goals: HealthGoal[];
  reminders: HealthReminder[];
} {
  const records = Array.from({ length: 10 }, (_, i) => 
    buildHealthRecordData(faker.number.int({ min: 1, max: 5 }))
  );
  
  const goals = Array.from({ length: 3 }, (_, i) => 
    buildHealthGoalData(i + 1)
  );
  
  const reminders = Array.from({ length: 2 }, (_, i) => 
    buildReminderData(i + 1)
  );
  
  return { records, goals, reminders };
}

export function mockCronTrigger(
  remindersToTrigger: number = 3
): { triggered_count: number; processed_reminders: any[] } {
  const processedReminders = Array.from({ length: remindersToTrigger }, (_, i) => ({
    id: i + 1,
    type_id: faker.number.int({ min: 1, max: 10 }),
    message: faker.lorem.sentence(),
    triggered_at: new Date().toISOString(),
  }));
  
  return {
    triggered_count: remindersToTrigger,
    processed_reminders: processedReminders,
  };
}

export async function createRealisticHealthJourney(
  request: APIRequestContext,
  journeyType: 'weight_loss' | 'fitness_improvement' | 'health_maintenance',
  durationDays: number,
  e2eRandomId: string
): Promise<{
  records: HealthRecord[];
  goals: HealthGoal[];
  reminders: HealthReminder[];
  analytics: AnalyticsResponse;
}> {
  const scenario = await setupHealthDataScenario(request, journeyType, e2eRandomId);
  
  // Add additional realistic data based on journey type
  const additionalRecords: HealthRecord[] = [];
  
  if (journeyType === 'fitness_improvement') {
    // Add heart rate and sleep data
    for (let i = 0; i < durationDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (durationDays - 1 - i));
      
      // Improving heart rate (decreasing resting HR)
      const heartRate = 80 - (i * 0.5);
      const { data: hrRecord } = await createHealthRecord(request, {
        type_id: 4,
        value: Math.max(60, heartRate),
        unit: 'bpm',
        recorded_at: date.toISOString(),
      }, e2eRandomId);
      additionalRecords.push(hrRecord);
      
      // Improving sleep
      const sleepHours = 6 + (i * 0.1);
      const { data: sleepRecord } = await createHealthRecord(request, {
        type_id: 6,
        value: Math.min(9, sleepHours),
        unit: 'hours',
        recorded_at: date.toISOString(),
      }, e2eRandomId);
      additionalRecords.push(sleepRecord);
    }
  }
  
  // Fetch analytics for the primary metric
  const primaryTypeId = journeyType === 'weight_loss' ? 1 : 5;
  const { data: analytics } = await fetchHealthAnalytics(request, primaryTypeId, { e2eRandomId });
  
  return {
    records: [...scenario.records, ...additionalRecords],
    goals: scenario.goals,
    reminders: scenario.reminders,
    analytics,
  };
}