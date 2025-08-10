import type {
  HealthGoal,
  HealthRecord,
} from '@/components/health/HealthOverviewContainer';
import type {
  HealthRadarMetric,
  HealthSummaryMetric,
  PredictedDataPoint,
  PredictionAlgorithm,
  RadarChartData,
  ScoringSystem,
  TrendDirection,
} from '@/components/health/types';

// Health type configuration for icons, colors, and scoring
const HEALTH_TYPE_CONFIG = {
  weight: {
    icon: '⚖️',
    color: '#8884d8',
    unit: 'kg',
    idealRange: { min: 18.5, max: 24.9 }, // BMI range for scoring
    scoringMultiplier: 1,
  },
  blood_pressure: {
    icon: '🩺',
    color: '#82ca9d',
    unit: 'mmHg',
    idealRange: { min: 90, max: 120 }, // Systolic BP
    scoringMultiplier: 1,
  },
  steps: {
    icon: '👟',
    color: '#ffc658',
    unit: 'steps',
    idealRange: { min: 8000, max: 15000 },
    scoringMultiplier: 0.01, // Scale down for scoring
  },
  heart_rate: {
    icon: '❤️',
    color: '#ff7300',
    unit: 'bpm',
    idealRange: { min: 60, max: 100 },
    scoringMultiplier: 1,
  },
  sleep: {
    icon: '😴',
    color: '#8dd1e1',
    unit: 'hours',
    idealRange: { min: 7, max: 9 },
    scoringMultiplier: 10, // Scale up for scoring
  },
  calories: {
    icon: '🔥',
    color: '#d084d0',
    unit: 'kcal',
    idealRange: { min: 1800, max: 2500 },
    scoringMultiplier: 0.05, // Scale down for scoring
  },
  water_intake: {
    icon: '💧',
    color: '#87d068',
    unit: 'liters',
    idealRange: { min: 2, max: 4 },
    scoringMultiplier: 25, // Scale up for scoring
  },
  glucose: {
    icon: '🩸',
    color: '#ffb347',
    unit: 'mg/dL',
    idealRange: { min: 70, max: 100 },
    scoringMultiplier: 1,
  },
} as const;

type HealthType = keyof typeof HEALTH_TYPE_CONFIG;

/**
 * Calculates the trend direction and percentage change between current and previous values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Trend direction and percentage change
 */
export function calculateTrend(current: number, previous: number): {
  direction: TrendDirection;
  percentage: number;
} {
  // Input validation
  if (current === null || current === undefined || typeof current !== 'number' || !isFinite(current)) {
    throw new Error('Invalid current value: must be a finite number');
  }

  if (previous === null || previous === undefined || typeof previous !== 'number' || !isFinite(previous)) {
    throw new Error('Invalid previous value: must be a finite number');
  }

  if (previous === 0) {
    return { direction: 'neutral', percentage: 0 };
  }

  const change = ((current - previous) / previous) * 100;
  const percentage = Math.abs(Math.round(change * 100) / 100);

  if (Math.abs(change) < 1) {
    return { direction: 'neutral', percentage };
  }

  return {
    direction: change > 0 ? 'up' : 'down',
    percentage,
  };
}

/**
 * Gets the previous value for a health record type from an array of records
 * @param records - Array of health records
 * @param type - Health record type
 * @param currentRecordId - ID of the current record to exclude
 * @returns Previous value or undefined if not found
 */
export function getPreviousValue(
  records: HealthRecord[],
  type: string,
  currentRecordId?: number,
): number | undefined {
  // Input validation
  if (!Array.isArray(records)) {
    throw new TypeError('Invalid records: must be an array');
  }

  if (!type || typeof type !== 'string') {
    throw new Error('Invalid type: must be a non-empty string');
  }

  // Validate each record in the array
  for (const record of records) {
    if (!record || typeof record !== 'object') {
      throw new Error('Invalid record: each record must be an object');
    }

    if (record.type === undefined || record.recorded_at === undefined) {
      throw new Error('Invalid record: missing required properties (type, recorded_at)');
    }

    // Validate date
    const date = new Date(record.recorded_at);
    if (isNaN(date.getTime())) {
      throw new TypeError(`Invalid record date: ${record.recorded_at}`);
    }
  }

  const typeRecords = records
    .filter(record => record.type === type && record.id !== currentRecordId)
    .sort((a, b) => {
      // Validate dates before sorting
      const dateA = new Date(a.recorded_at);
      const dateB = new Date(b.recorded_at);

      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        throw new TypeError('Invalid date in records');
      }

      return dateB.getTime() - dateA.getTime();
    });

  return typeRecords[0]?.value;
}

/**
 * Maps health type to appropriate icon and color
 * @param type - Health record type
 * @returns Icon and color for the health type
 */
export function getHealthTypeConfig(type: string): {
  icon: string;
  color: string;
  unit: string;
  idealRange?: { min: number; max: number };
  scoringMultiplier?: number;
} {
  // Input validation
  if (!type || typeof type !== 'string') {
    return {
      icon: '📊',
      color: '#6b7280',
      unit: '',
    };
  }

  const normalizedType = type.toLowerCase().replace(/\s+/g, '_') as HealthType;
  const config = HEALTH_TYPE_CONFIG[normalizedType];

  if (!config) {
    return {
      icon: '📊',
      color: '#6b7280',
      unit: '',
    };
  }

  return {
    icon: config.icon,
    color: config.color,
    unit: config.unit,
    idealRange: config.idealRange,
    scoringMultiplier: config.scoringMultiplier,
  };
}

/**
 * Normalizes a health value to a 0-100 score for radar chart display
 * @param value - The health value to normalize
 * @param type - Health record type
 * @param scoringSystem - Scoring system to use
 * @returns Normalized score (0-100)
 */
export function normalizeHealthValue(
  value: number,
  type: string,
  scoringSystem: ScoringSystem = 'percentage',
): number {
  // Input validation
  if (value === null || value === undefined || typeof value !== 'number' || !isFinite(value)) {
    return 50; // Default neutral score for invalid values
  }

  if (!type || typeof type !== 'string') {
    return 50; // Default neutral score for invalid types
  }

  if (!scoringSystem || (scoringSystem !== 'percentage' && scoringSystem !== 'z-score' && scoringSystem !== 'custom')) {
    scoringSystem = 'percentage'; // Default to percentage scoring
  }

  const normalizedType = type.toLowerCase().replace(/\s+/g, '_') as HealthType;
  const config = HEALTH_TYPE_CONFIG[normalizedType];

  if (!config) {
    return 50; // Default neutral score
  }

  // Validate config values
  if (!config.idealRange || typeof config.idealRange.min !== 'number' || typeof config.idealRange.max !== 'number') {
    return 50; // Default neutral score for invalid config
  }

  const { min, max } = config.idealRange;

  // Check for valid range
  if (min >= max) {
    return 50; // Default neutral score for invalid range
  }

  switch (scoringSystem) {
    case 'percentage': {
      // Simple percentage based on ideal range
      const range = max - min;
      if (range === 0) {
        return 50; // Default neutral score for zero range
      }
      const normalizedValue = Math.max(0, Math.min(100, ((value - min) / range) * 100));
      return Math.round(normalizedValue);
    }

    case 'z-score': {
      // Z-score based normalization (assuming normal distribution)
      const mean = (min + max) / 2;
      const stdDev = (max - min) / 4; // Approximate standard deviation

      // Check for zero standard deviation
      if (stdDev === 0) {
        return 50; // Default neutral score for zero standard deviation
      }

      const zScore = (value - mean) / stdDev;
      // Convert z-score to 0-100 scale (clamped)
      const score = Math.max(0, Math.min(100, 50 + (zScore * 15)));
      return Math.round(score);
    }

    case 'custom': {
      // Custom scoring based on health type specific logic
      if (typeof config.scoringMultiplier !== 'number' || !isFinite(config.scoringMultiplier)) {
        return 50; // Default neutral score for invalid multiplier
      }

      const scaledValue = value * config.scoringMultiplier;
      const score = Math.max(0, Math.min(100, scaledValue));
      return Math.round(score);
    }

    default:
      return 50;
  }
}

/**
 * Transforms health records and goals into summary metrics format for HealthSummaryCards
 * @param records - Array of health records
 * @param goals - Array of health goals
 * @returns Array of health summary metrics
 */
export function transformToSummaryMetrics(
  records: HealthRecord[],
  goals: HealthGoal[],
): HealthSummaryMetric[] {
  // Input validation
  if (!Array.isArray(records)) {
    throw new TypeError('Invalid records: must be an array');
  }

  if (!Array.isArray(goals)) {
    throw new TypeError('Invalid goals: must be an array');
  }

  // Validate records
  for (const record of records) {
    if (!record || typeof record !== 'object') {
      throw new Error('Invalid record: each record must be an object');
    }

    if (record.type === undefined || record.value === undefined || record.recorded_at === undefined) {
      throw new Error('Invalid record: missing required properties (type, value, recorded_at)');
    }

    // Validate value
    if (typeof record.value !== 'number' || !isFinite(record.value)) {
      throw new TypeError(`Invalid record value: ${record.value} must be a finite number`);
    }

    // Validate date
    const date = new Date(record.recorded_at);
    if (isNaN(date.getTime())) {
      throw new TypeError(`Invalid record date: ${record.recorded_at}`);
    }
  }

  // Validate goals
  for (const goal of goals) {
    if (!goal || typeof goal !== 'object') {
      throw new Error('Invalid goal: each goal must be an object');
    }

    if (goal.type === undefined || goal.current_value === undefined || goal.target_value === undefined || goal.status === undefined) {
      throw new Error('Invalid goal: missing required properties (type, current_value, target_value, status)');
    }

    // Validate values
    if (typeof goal.current_value !== 'number' || !isFinite(goal.current_value)) {
      throw new TypeError(`Invalid goal current_value: ${goal.current_value} must be a finite number`);
    }

    if (typeof goal.target_value !== 'number' || !isFinite(goal.target_value)) {
      throw new TypeError(`Invalid goal target_value: ${goal.target_value} must be a finite number`);
    }

    // Validate status
    if (goal.status !== 'active' && goal.status !== 'completed' && goal.status !== 'paused') {
      throw new Error(`Invalid goal status: ${goal.status}`);
    }
  }

  // Group records by type and get the most recent for each type
  const recordsByType = records.reduce((acc, record) => {
    // Validate date before comparison
    const recordDate = new Date(record.recorded_at);
    if (isNaN(recordDate.getTime())) {
      return acc; // Skip invalid dates
    }

    if (!acc[record.type]) {
      acc[record.type] = record;
    } else {
      const existingDate = new Date(acc[record.type].recorded_at);
      if (isNaN(existingDate.getTime()) || recordDate > existingDate) {
        acc[record.type] = record;
      }
    }
    return acc;
  }, {} as Record<string, HealthRecord>);

  // Create metrics from records
  const metrics: HealthSummaryMetric[] = Object.values(recordsByType).map((record) => {
    const config = getHealthTypeConfig(record.type);
    const previousValue = getPreviousValue(records, record.type, record.id);
    const goal = goals.find(g => g.type === record.type && g.status === 'active');

    return {
      id: `metric-${record.type}-${record.id}`,
      label: record.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: record.value,
      unit: record.unit || (config.unit || ''),
      previousValue,
      goalTarget: goal?.target_value,
      goalCurrent: goal?.current_value,
      icon: config.icon || 'Activity',
    };
  });

  // Add metrics for goals without recent records
  const recordTypes = new Set(Object.keys(recordsByType));
  const goalOnlyMetrics = goals
    .filter(goal => goal.status === 'active' && !recordTypes.has(goal.type))
    .map((goal) => {
      const config = getHealthTypeConfig(goal.type);

      return {
        id: `metric-goal-${goal.type}-${goal.id}`,
        label: goal.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: goal.current_value,
        unit: config.unit || '',
        goalTarget: goal.target_value,
        goalCurrent: goal.current_value,
        icon: config.icon,
      };
    });

  return [...metrics, ...goalOnlyMetrics];
}

/**
 * Transforms analytics data into predictive data format for HealthPredictiveChart
 * @param trendData - Array of health data points with date and value
 * @param algorithm - Prediction algorithm to use
 * @param predictionHorizon - Number of future points to predict
 * @returns Array of predicted data points
 */
export function transformToPredictiveData(
  trendData: Array<{ date: string; value: number; unit?: string }>,
  algorithm: PredictionAlgorithm = 'linear-regression',
  predictionHorizon: number = 7,
): PredictedDataPoint[] {
  // Input validation
  if (!Array.isArray(trendData)) {
    throw new TypeError('Invalid trendData: must be an array');
  }

  if (trendData.length === 0) {
    return [];
  }

  // Validate trendData points
  for (let i = 0; i < trendData.length; i++) {
    const point = trendData[i];

    if (!point || typeof point !== 'object') {
      throw new Error(`Invalid trendData point at index ${i}: must be an object`);
    }

    if (point.date === undefined || point.value === undefined) {
      throw new Error(`Invalid trendData point at index ${i}: missing required properties (date, value)`);
    }

    // Validate value
    if (typeof point.value !== 'number' || !isFinite(point.value)) {
      throw new TypeError(`Invalid trendData value at index ${i}: ${point.value} must be a finite number`);
    }

    // Validate date
    const date = new Date(point.date);
    if (isNaN(date.getTime())) {
      throw new TypeError(`Invalid trendData date at index ${i}: ${point.date}`);
    }
  }

  // Validate algorithm
  if (algorithm !== 'linear-regression' && algorithm !== 'moving-average') {
    algorithm = 'linear-regression'; // Default to linear regression
  }

  // Validate predictionHorizon
  if (typeof predictionHorizon !== 'number' || !isFinite(predictionHorizon) || predictionHorizon <= 0) {
    predictionHorizon = 7; // Default to 7
  }
  predictionHorizon = Math.floor(predictionHorizon); // Ensure integer

  // Convert historical data to PredictedDataPoint format
  const historicalData: PredictedDataPoint[] = trendData.map(point => ({
    date: point.date,
    value: point.value,
    unit: point.unit,
    isPrediction: false,
  }));

  // Generate predictions based on algorithm
  const predictions: PredictedDataPoint[] = [];
  const lastDate = new Date(trendData[trendData.length - 1].date);

  // Validate lastDate
  if (isNaN(lastDate.getTime())) {
    throw new TypeError('Invalid last date in trendData');
  }

  const unit = trendData[0]?.unit || '';

  if (algorithm === 'linear-regression') {
    // Simple linear regression
    const n = trendData.length;

    // Check for sufficient data
    if (n < 2) {
      // Not enough data for linear regression, return historical data only
      return historicalData;
    }

    const sumX = trendData.reduce((sum, _, index) => sum + index, 0);
    const sumY = trendData.reduce((sum, point) => sum + point.value, 0);
    const sumXY = trendData.reduce((sum, point, index) => sum + (index * point.value), 0);
    const sumXX = trendData.reduce((sum, _, index) => sum + (index * index), 0);

    // Check for division by zero
    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) {
      // Cannot perform linear regression, return historical data only
      return historicalData;
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    for (let i = 1; i <= predictionHorizon; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i);

      // Check if futureDate is valid
      if (isNaN(futureDate.getTime())) {
        continue; // Skip invalid dates
      }

      const predictedValue = slope * (n + i - 1) + intercept;

      // Check for valid predicted value
      if (!isFinite(predictedValue)) {
        continue; // Skip invalid predictions
      }

      const confidence = Math.max(0.1, 1 - (i * 0.1)); // Decreasing confidence
      const confidenceRange = Math.abs(predictedValue) * 0.1 * i; // Increasing uncertainty

      // Check for valid confidence range
      if (!isFinite(confidenceRange)) {
        continue; // Skip invalid confidence ranges
      }

      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        value: Math.round(predictedValue * 100) / 100,
        unit,
        isPrediction: true,
        algorithm,
        confidenceUpper: Math.round((predictedValue + confidenceRange) * 100) / 100,
        confidenceLower: Math.round((predictedValue - confidenceRange) * 100) / 100,
      });
    }
  } else if (algorithm === 'moving-average') {
    // Moving average prediction
    const windowSize = Math.min(5, trendData.length);

    // Check for sufficient data
    if (windowSize < 1) {
      // Not enough data for moving average, return historical data only
      return historicalData;
    }

    const recentValues = trendData.slice(-windowSize).map(point => point.value);

    // Validate recent values
    if (recentValues.some(value => !isFinite(value))) {
      // Invalid values in recent data, return historical data only
      return historicalData;
    }

    const average = recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length;

    // Check for valid average
    if (!isFinite(average)) {
      // Cannot calculate average, return historical data only
      return historicalData;
    }

    // Calculate trend from recent values
    const trend = recentValues.length > 1
      ? (recentValues[recentValues.length - 1] - recentValues[0]) / (recentValues.length - 1)
      : 0;

    // Check for valid trend
    if (!isFinite(trend)) {
      // Cannot calculate trend, use zero trend
    }

    for (let i = 1; i <= predictionHorizon; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i);

      // Check if futureDate is valid
      if (isNaN(futureDate.getTime())) {
        continue; // Skip invalid dates
      }

      const predictedValue = average + (trend * i);

      // Check for valid predicted value
      if (!isFinite(predictedValue)) {
        continue; // Skip invalid predictions
      }

      const confidenceRange = Math.abs(predictedValue) * 0.05 * i; // Increasing uncertainty

      // Check for valid confidence range
      if (!isFinite(confidenceRange)) {
        continue; // Skip invalid confidence ranges
      }

      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        value: Math.round(predictedValue * 100) / 100,
        unit,
        isPrediction: true,
        algorithm,
        confidenceUpper: Math.round((predictedValue + confidenceRange) * 100) / 100,
        confidenceLower: Math.round((predictedValue - confidenceRange) * 100) / 100,
      });
    }
  }

  return [...historicalData, ...predictions];
}

/**
 * Transforms multiple health metrics into radar chart data format
 * @param records - Array of health records
 * @param goals - Array of health goals
 * @param scoringSystem - Scoring system to use for normalization
 * @param timestamp - Optional timestamp for the data snapshot
 * @returns Array of radar chart data
 */
export function transformToRadarData(
  records: HealthRecord[],
  goals: HealthGoal[],
  scoringSystem: ScoringSystem = 'percentage',
  timestamp?: string,
): RadarChartData[] {
  // Input validation
  if (!Array.isArray(records)) {
    throw new TypeError('Invalid records: must be an array');
  }

  if (!Array.isArray(goals)) {
    throw new TypeError('Invalid goals: must be an array');
  }

  // Validate records
  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    if (!record || typeof record !== 'object') {
      throw new Error(`Invalid record at index ${i}: must be an object`);
    }

    if (record.type === undefined || record.value === undefined || record.recorded_at === undefined) {
      throw new Error(`Invalid record at index ${i}: missing required properties (type, value, recorded_at)`);
    }

    // Validate value
    if (typeof record.value !== 'number' || !isFinite(record.value)) {
      throw new TypeError(`Invalid record value at index ${i}: ${record.value} must be a finite number`);
    }

    // Validate date
    const date = new Date(record.recorded_at);
    if (isNaN(date.getTime())) {
      throw new TypeError(`Invalid record date at index ${i}: ${record.recorded_at}`);
    }
  }

  // Validate goals
  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i];

    if (!goal || typeof goal !== 'object') {
      throw new Error(`Invalid goal at index ${i}: must be an object`);
    }

    if (goal.type === undefined || goal.current_value === undefined || goal.target_value === undefined) {
      throw new Error(`Invalid goal at index ${i}: missing required properties (type, current_value, target_value)`);
    }

    // Validate current_value
    if (typeof goal.current_value !== 'number' || !isFinite(goal.current_value)) {
      throw new TypeError(`Invalid goal current_value at index ${i}: ${goal.current_value} must be a finite number`);
    }

    // Validate target_value
    if (typeof goal.target_value !== 'number' || !isFinite(goal.target_value)) {
      throw new TypeError(`Invalid goal target_value at index ${i}: ${goal.target_value} must be a finite number`);
    }
  }

  // Group records by type and get the most recent for each type
  const recordsByType = records.reduce((acc, record) => {
    // Validate record type and date
    if (typeof record.type !== 'string') {
      return acc; // Skip invalid records
    }

    const recordDate = new Date(record.recorded_at);
    if (isNaN(recordDate.getTime())) {
      return acc; // Skip invalid records
    }

    if (!acc[record.type]) {
      acc[record.type] = record;
    } else {
      const existingDate = new Date(acc[record.type].recorded_at);
      if (isNaN(existingDate.getTime())) {
        acc[record.type] = record; // Replace invalid dates
      } else if (recordDate > existingDate) {
        acc[record.type] = record;
      }
    }
    return acc;
  }, {} as Record<string, HealthRecord>);

  // Create radar metrics
  const metrics: HealthRadarMetric[] = Object.values(recordsByType).map((record) => {
    const config = getHealthTypeConfig(record.type);
    const goal = goals.find(g => g.type === record.type && g.status === 'active');
    const maxValue = (goal?.target_value !== undefined) ? goal.target_value : (config.idealRange?.max || 100);
    const score = normalizeHealthValue(record.value, record.type, scoringSystem);

    return {
      category: record.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: record.value,
      maxValue,
      unit: record.unit || (config.unit || ''),
      score,
      color: config.color || '#6B7280',
      icon: config.icon || 'Activity',
    };
  });

  // Add metrics for goals without recent records
  const recordTypes = new Set(Object.keys(recordsByType));
  const goalOnlyMetrics = goals
    .filter(goal => goal.status === 'active' && !recordTypes.has(goal.type))
    .map((goal) => {
      const config = getHealthTypeConfig(goal.type);
      const score = normalizeHealthValue(goal.current_value, goal.type, scoringSystem);

      return {
        category: goal.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: goal.current_value,
        maxValue: goal.target_value,
        unit: config.unit || '',
        score,
        color: config.color || '#6B7280',
        icon: config.icon || 'Activity',
      };
    });

  const allMetrics = [...metrics, ...goalOnlyMetrics];

  // Ensure we have at least 3 metrics for a meaningful radar chart
  if (allMetrics.length < 3) {
    // Add placeholder metrics if needed
    const placeholderTypes = ['weight', 'steps', 'sleep', 'heart_rate', 'water_intake'];
    const existingTypes = new Set(allMetrics.map(m => m.category.toLowerCase().replace(/\s+/g, '_')));

    for (const type of placeholderTypes) {
      if (allMetrics.length >= 5) {
        break;
      } // Limit to 5 metrics max
      if (!existingTypes.has(type)) {
        const config = getHealthTypeConfig(type);
        allMetrics.push({
          category: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: 0,
          maxValue: config.idealRange?.max || 100,
          unit: config.unit || '',
          score: 0,
          color: config.color || '#6B7280',
          icon: config.icon || 'Activity',
        });
      }
    }
  }

  return [{
    metrics: allMetrics,
    timestamp: timestamp || new Date().toISOString(),
    label: 'Current Health Status',
  }];
}

/**
 * Calculates the overall health score from radar metrics
 * @param metrics - Array of health radar metrics
 * @returns Overall health score (0-100)
 */
export function calculateOverallHealthScore(metrics: HealthRadarMetric[]): number {
  // Input validation
  if (!Array.isArray(metrics) || metrics.length === 0) {
    return 50; // Neutral score for no metrics
  }

  // Filter metrics with valid scores
  const validScores = metrics
    .filter(metric => typeof metric.score === 'number' && isFinite(metric.score))
    .map(metric => metric.score);

  if (validScores.length === 0) {
    return 50; // Neutral score for no valid scores
  }

  // Calculate average score
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  const average = sum / validScores.length;

  // Return rounded score between 0-100
  return Math.max(0, Math.min(100, Math.round(average)));
}

/**
 * Determines color based on health score
 * @param score - Health score (0-100)
 * @returns Color hex code
 */
export function getScoreColor(score: number): string {
  // Input validation
  if (typeof score !== 'number' || !isFinite(score)) {
    return '#6b7280'; // Gray for invalid scores
  }

  // Clamp score between 0-100
  const clampedScore = Math.max(0, Math.min(100, score));

  // Determine color based on score ranges
  if (clampedScore < 40) {
    return '#ef4444';
  } // Red (poor)
  if (clampedScore < 60) {
    return '#f59e0b';
  } // Amber (fair)
  if (clampedScore < 80) {
    return '#3b82f6';
  } // Blue (good)
  return '#10b981'; // Green (excellent)
}

/**
 * Formats health value based on unit
 * @param value - Health value to format
 * @param unit - Unit of measurement
 * @returns Formatted value string
 */
export function formatHealthValue(value: number, unit: string): string {
  // Input validation
  if (typeof value !== 'number' || !isFinite(value)) {
    return '0'; // Default to 0 for invalid values
  }

  // Format based on unit type
  switch (unit.toLowerCase()) {
    case 'steps':
    case 'bpm':
    case 'min':
    case 'mmHg':
      return value.toLocaleString();
    case 'kg':
    case 'hours':
    case 'liters':
    case 'mg/dL':
      return value % 1 === 0 ? value.toString() : value.toFixed(1);
    default:
      return value.toString();
  }
}
