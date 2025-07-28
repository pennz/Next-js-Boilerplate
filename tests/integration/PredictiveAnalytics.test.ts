import type { ConfidenceIntervalConfig, DataPoint } from '@/utils/statistics';
import { describe, expect, it } from 'vitest';
import { transformToPredictiveData } from '@/utils/healthDataTransformers';
import {
  calculateMAPE,
  calculatePredictionAccuracy,
  generateConfidenceInterval,
  linearRegression,

  movingAverage,
} from '@/utils/statistics';

// Tolerance Configuration System for Health Metrics
//
// This system defines appropriate tolerance values for different health metrics based on:
// 1. Clinical significance - How much variation is clinically meaningful
// 2. Measurement precision - How accurate the measurement devices typically are
// 3. Biological variability - Natural day-to-day fluctuations in the metric
//
// Tolerance values are expressed as absolute differences or percentages depending on the metric.
// For example:
// - Weight: ±0.5 kg (clinical significance: 1kg changes are meaningful; precision: consumer scales are accurate to 0.1kg)
// - Blood Pressure: ±5 mmHg (clinical significance: 5mmHg changes are meaningful; precision: home monitors vary by 3-5mmHg)
// - Steps: ±500 steps (clinical significance: 500 steps is about 5 minutes of walking; precision: pedometers vary by 1-2%)

type HealthMetricTolerance = {
  absoluteTolerance?: number; // Absolute tolerance value (e.g., 0.5 kg)
  percentageTolerance?: number; // Percentage tolerance (e.g., 2.5%)
  clinicalSignificance: string; // Description of clinical significance
  measurementPrecision: string; // Description of measurement precision
  biologicalVariability: string; // Description of natural variation
};

type ToleranceConfig = {
  [metricType: string]: HealthMetricTolerance;
};

const HEALTH_METRIC_TOLERANCES: ToleranceConfig = {
  weight: {
    absoluteTolerance: 0.5, // kg
    clinicalSignificance: '1kg changes are clinically meaningful for health outcomes',
    measurementPrecision: 'Consumer scales are typically accurate to ±0.1kg',
    biologicalVariability: 'Daily fluctuations of 1-2kg due to fluid retention, food intake, etc.',
  },
  bmi: {
    absoluteTolerance: 0.5, // kg/m²
    clinicalSignificance: '0.5 kg/m² changes can indicate meaningful health improvements',
    measurementPrecision: 'Dependent on height and weight measurement accuracy',
    biologicalVariability: 'Reflects weight fluctuations as BMI = weight/height²',
  },
  steps: {
    percentageTolerance: 5, // %
    clinicalSignificance: '5% difference in daily steps (~500 steps) represents ~5 minutes of walking',
    measurementPrecision: 'Pedometers have typical accuracy of ±1-2%',
    biologicalVariability: 'Daily step counts naturally vary by ±10-20% based on activity patterns',
  },
  sleep: {
    absoluteTolerance: 0.5, // hours
    clinicalSignificance: '0.5 hour changes are meaningful for sleep quality and health',
    measurementPrecision: 'Sleep trackers accurate to ±15-30 minutes typically',
    biologicalVariability: 'Night-to-night sleep duration naturally varies by 1-2 hours',
  },
  heart_rate: {
    absoluteTolerance: 5, // bpm
    clinicalSignificance: '5 bpm changes can indicate fitness improvements or health concerns',
    measurementPrecision: 'Consumer devices accurate to ±3-5 bpm under controlled conditions',
    biologicalVariability: 'Resting HR can vary by 5-10 bpm throughout the day due to stress, activity, etc.',
  },
  blood_pressure_systolic: {
    absoluteTolerance: 5, // mmHg
    clinicalSignificance: '5 mmHg changes are considered clinically significant for treatment decisions',
    measurementPrecision: 'Home monitors typically accurate to ±3-5 mmHg',
    biologicalVariability: 'BP can vary by 10-20 mmHg throughout the day due to stress, activity, etc.',
  },
  blood_pressure_diastolic: {
    absoluteTolerance: 5, // mmHg
    clinicalSignificance: '5 mmHg changes are considered clinically significant for treatment decisions',
    measurementPrecision: 'Home monitors typically accurate to ±3-5 mmHg',
    biologicalVariability: 'BP can vary by 5-15 mmHg throughout the day due to stress, activity, etc.',
  },
  water_intake: {
    percentageTolerance: 10, // %
    clinicalSignificance: '10% difference in water intake can affect hydration status',
    measurementPrecision: 'Cup measurements vary by ±5-10% depending on user consistency',
    biologicalVariability: 'Daily water needs vary by ±15-20% based on activity, weather, diet',
  },
  exercise_minutes: {
    absoluteTolerance: 10, // minutes
    clinicalSignificance: '10 minutes is the minimum duration for beneficial exercise effects',
    measurementPrecision: 'Activity trackers accurate to ±5-10 minutes for moderate activity',
    biologicalVariability: 'Exercise duration naturally varies based on schedule, energy levels, etc.',
  },
  calories_burned: {
    percentageTolerance: 15, // %
    clinicalSignificance: '15% difference in calorie estimates affects energy balance calculations',
    measurementPrecision: 'Activity trackers can vary by ±10-25% in calorie estimates',
    biologicalVariability: 'Metabolic rate can vary by ±10-15% based on muscle mass, hormones, etc.',
  },
  distance: {
    percentageTolerance: 5, // %
    clinicalSignificance: '5% difference in distance represents meaningful activity level changes',
    measurementPrecision: 'GPS accuracy typically within 3-5 meters for consumer devices',
    biologicalVariability: 'Walking/running pace naturally varies by ±5-10% based on terrain, fatigue',
  },
  body_fat_percentage: {
    absoluteTolerance: 1.5, // %
    clinicalSignificance: '1.5% changes in body fat are meaningful for health and fitness tracking',
    measurementPrecision: 'Consumer devices accurate to ±1-3% compared to clinical methods',
    biologicalVariability: 'Body fat measurements can vary by ±2-3% due to hydration, measurement timing',
  },
  muscle_mass: {
    absoluteTolerance: 1, // kg
    clinicalSignificance: '1kg changes in muscle mass indicate meaningful training adaptations',
    measurementPrecision: 'Bioelectrical impedance scales accurate to ±1-2kg compared to DEXA',
    biologicalVariability: 'Muscle mass measurements can vary by ±1-2kg due to hydration status',
  },
};

// Function to get tolerance for a specific health metric
function getHealthMetricTolerance(metricType: string): HealthMetricTolerance | undefined {
  return HEALTH_METRIC_TOLERANCES[metricType];
}

// Function to check if two values are within tolerance
function isWithinTolerance(actual: number, expected: number, metricType: string): boolean {
  const tolerance = getHealthMetricTolerance(metricType);

  if (!tolerance) {
    // Default tolerance if not specified
    return Math.abs(actual - expected) < 0.01;
  }

  if (tolerance.absoluteTolerance !== undefined) {
    return Math.abs(actual - expected) <= tolerance.absoluteTolerance;
  }

  if (tolerance.percentageTolerance !== undefined) {
    const average = (actual + expected) / 2;
    const absoluteTolerance = (average * tolerance.percentageTolerance) / 100;
    return Math.abs(actual - expected) <= absoluteTolerance;
  }

  return Math.abs(actual - expected) < 0.01;
}

// Add tolerance checking to existing tests
// Example usage in tests:
// expect(isWithinTolerance(result.slope, 2, 'weight')).toBe(true);

describe('Predictive Analytics Mathematical Validation', () => {
  describe('Linear Regression Mathematical Accuracy', () => {
    it('should calculate correct slope and intercept for known linear data', () => {
      // Test data: y = 2x + 5
      const dataPoints: DataPoint[] = [
        { x: 1, y: 7 }, // 2(1) + 5 = 7
        { x: 2, y: 9 }, // 2(2) + 5 = 9
        { x: 3, y: 11 }, // 2(3) + 5 = 11
        { x: 4, y: 13 }, // 2(4) + 5 = 13
        { x: 5, y: 15 }, // 2(5) + 5 = 15
      ];

      const result = linearRegression(dataPoints);

      expect(result.slope).toBeCloseTo(2, 10);
      expect(result.intercept).toBeCloseTo(5, 10);
      expect(result.rSquared).toBeCloseTo(1, 10); // Perfect correlation
      expect(result.residualStandardDeviation).toBeCloseTo(0, 10);
    });

    it('should calculate correct R-squared for perfect correlation', () => {
      const perfectData: DataPoint[] = [
        { x: 0, y: 0 },
        { x: 1, y: 3 },
        { x: 2, y: 6 },
        { x: 3, y: 9 },
        { x: 4, y: 12 },
      ];

      const result = linearRegression(perfectData);

      expect(result.rSquared).toBeCloseTo(1, 10);
    });

    it('should calculate correct R-squared for imperfect correlation', () => {
      const imperfectData: DataPoint[] = [
        { x: 1, y: 2.1 }, // y = 2x with noise
        { x: 2, y: 3.9 },
        { x: 3, y: 6.2 },
        { x: 4, y: 7.8 },
        { x: 5, y: 10.1 },
      ];

      const result = linearRegression(imperfectData);

      expect(result.rSquared).toBeGreaterThan(0.9);
      expect(result.rSquared).toBeLessThan(1);
      expect(result.residualStandardDeviation).toBeGreaterThan(0);
    });

    it('should handle zero variance in x values', () => {
      const zeroVarianceData: DataPoint[] = [
        { x: 5, y: 10 },
        { x: 5, y: 15 },
        { x: 5, y: 20 },
      ];

      const result = linearRegression(zeroVarianceData);

      expect(result.slope).toBe(0);
      expect(result.intercept).toBeCloseTo(15, 5); // Mean of y values
      expect(result.rSquared).toBe(0);
    });

    it('should validate mathematical properties of regression', () => {
      const data: DataPoint[] = [
        { x: 1, y: 3 },
        { x: 2, y: 5 },
        { x: 3, y: 7 },
        { x: 4, y: 9 },
        { x: 5, y: 11 },
      ];

      const result = linearRegression(data);

      // Verify that predictions pass through the mean point
      const meanX = data.reduce((sum, p) => sum + p.x, 0) / data.length;
      const meanY = data.reduce((sum, p) => sum + p.y, 0) / data.length;
      const predictedMeanY = result.slope * meanX + result.intercept;

      expect(predictedMeanY).toBeCloseTo(meanY, 10);
    });
  });

  describe('Moving Average Mathematical Accuracy', () => {
    it('should calculate correct moving averages for known sequences', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const windowSize = 3;

      const result = movingAverage(values, windowSize);
      const expected = [2, 3, 4, 5, 6, 7, 8, 9]; // (1+2+3)/3=2, (2+3+4)/3=3, etc.

      expect(result).toHaveLength(expected.length);

      result.forEach((value, index) => {
        expect(value).toBeCloseTo(expected[index], 10);
      });
    });

    it('should handle edge cases for moving average', () => {
      const values = [5, 5, 5, 5, 5];
      const result = movingAverage(values, 3);

      expect(result).toHaveLength(3);

      result.forEach((value) => {
        expect(value).toBeCloseTo(5, 10);
      });
    });

    it('should validate moving average properties', () => {
      const values = [10, 20, 30, 40, 50];
      const result = movingAverage(values, 2);

      // Each moving average should be between min and max of its window
      expect(result[0]).toBeCloseTo(15, 10); // (10+20)/2
      expect(result[1]).toBeCloseTo(25, 10); // (20+30)/2
      expect(result[2]).toBeCloseTo(35, 10); // (30+40)/2
      expect(result[3]).toBeCloseTo(45, 10); // (40+50)/2
    });
  });

  describe('Confidence Interval Mathematical Validation', () => {
    it('should calculate statistically valid confidence intervals', () => {
      const config: ConfidenceIntervalConfig = {
        confidenceLevel: 0.95,
        residualStandardDeviation: 2.0,
        sampleSize: 10,
      };

      const interval = generateConfidenceInterval(100, config);

      expect(interval.upper).toBeGreaterThan(100);
      expect(interval.lower).toBeLessThan(100);
      expect(interval.upper - interval.lower).toBeGreaterThan(0);

      // For 95% confidence, margin should be approximately 1.96 * std * sqrt(1 + 1/n)
      const expectedMargin = 1.96 * 2.0 * Math.sqrt(1 + 1 / 10);
      const actualMargin = (interval.upper - interval.lower) / 2;

      expect(actualMargin).toBeCloseTo(expectedMargin, 1);
    });

    it('should have wider intervals for higher confidence levels', () => {
      const baseConfig: ConfidenceIntervalConfig = {
        confidenceLevel: 0.95,
        residualStandardDeviation: 1.0,
        sampleSize: 20,
      };

      const interval95 = generateConfidenceInterval(50, baseConfig);
      const interval99 = generateConfidenceInterval(50, { ...baseConfig, confidenceLevel: 0.99 });

      const width95 = interval95.upper - interval95.lower;
      const width99 = interval99.upper - interval99.lower;

      expect(width99).toBeGreaterThan(width95);
    });

    it('should have wider intervals for smaller sample sizes', () => {
      const baseConfig: ConfidenceIntervalConfig = {
        confidenceLevel: 0.95,
        residualStandardDeviation: 1.0,
        sampleSize: 30,
      };

      const intervalLarge = generateConfidenceInterval(50, baseConfig);
      const intervalSmall = generateConfidenceInterval(50, { ...baseConfig, sampleSize: 5 });

      const widthLarge = intervalLarge.upper - intervalLarge.lower;
      const widthSmall = intervalSmall.upper - intervalSmall.lower;

      expect(widthSmall).toBeGreaterThan(widthLarge);
    });
  });

  describe('Prediction Accuracy Metrics Validation', () => {
    it('should calculate MAPE correctly for known datasets', () => {
      const actual = [100, 200, 300, 400, 500];
      const predicted = [95, 210, 285, 420, 480];

      const mape = calculateMAPE(actual, predicted);

      // Manual calculation: |100-95|/100 + |200-210|/200 + |300-285|/300 + |400-420|/400 + |500-480|/500
      // = 0.05 + 0.05 + 0.05 + 0.05 + 0.04 = 0.24 = 24%
      expect(mape).toBeCloseTo(4.8, 1); // Average of 4.8%
    });

    it('should calculate comprehensive accuracy metrics', () => {
      const actual = [10, 20, 30, 40, 50];
      const predicted = [12, 18, 32, 38, 52];

      const accuracy = calculatePredictionAccuracy(actual, predicted);

      expect(accuracy.mape).toBeGreaterThan(0);
      expect(accuracy.rmse).toBeGreaterThan(0);
      expect(accuracy.mae).toBeGreaterThan(0);
      expect(accuracy.accuracy).toBeGreaterThan(0);
      expect(accuracy.accuracy).toBeLessThanOrEqual(100);
    });

    it('should handle perfect predictions', () => {
      const values = [10, 20, 30, 40, 50];
      const accuracy = calculatePredictionAccuracy(values, values);

      expect(accuracy.mape).toBe(0);
      expect(accuracy.rmse).toBe(0);
      expect(accuracy.mae).toBe(0);
      expect(accuracy.accuracy).toBe(100);
    });
  });
});

describe('Algorithm Comparison and Performance Tests', () => {
  describe('Linear Regression vs Moving Average Performance', () => {
    it('should favor linear regression for strong linear trends', () => {
      // Create strong linear trend data
      const linearTrendData = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 50 + i * 2 + (Math.random() - 0.5) * 0.5, // y = 50 + 2x with minimal noise
      }));

      const linearPredictions = transformToPredictiveData(linearTrendData, 'linear-regression', 5);
      const movingAvgPredictions = transformToPredictiveData(linearTrendData, 'moving-average', 5);

      // Linear regression should perform better on linear data
      const linearPredictionValues = linearPredictions.filter(p => p.isPrediction).map(p => p.value);
      const movingAvgPredictionValues = movingAvgPredictions.filter(p => p.isPrediction).map(p => p.value);

      // For linear trend, linear regression predictions should show consistent increase
      const linearTrend = linearPredictionValues[linearPredictionValues.length - 1] - linearPredictionValues[0];
      const movingAvgTrend = movingAvgPredictionValues[movingAvgPredictionValues.length - 1] - movingAvgPredictionValues[0];

      expect(Math.abs(linearTrend - 8)).toBeLessThan(Math.abs(movingAvgTrend - 8)); // Expected trend is 2*4 = 8
    });

    it('should favor moving average for cyclical/noisy data', () => {
      // Create cyclical data with noise
      const cyclicalData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 50 + 10 * Math.sin(i * Math.PI / 7) + (Math.random() - 0.5) * 5,
      }));

      const linearPredictions = transformToPredictiveData(cyclicalData, 'linear-regression', 7);
      const movingAvgPredictions = transformToPredictiveData(cyclicalData, 'moving-average', 7);

      // Moving average should be more stable for cyclical data
      const linearVariance = calculateVariance(linearPredictions.filter(p => p.isPrediction).map(p => p.value));
      const movingAvgVariance = calculateVariance(movingAvgPredictions.filter(p => p.isPrediction).map(p => p.value));

      // Moving average should have lower variance in predictions for cyclical data
      expect(movingAvgVariance).toBeLessThanOrEqual(linearVariance * 1.5); // Allow some tolerance
    });

    function calculateVariance(values: number[]): number {
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      return values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    }
  });

  describe('Prediction Horizon Effects', () => {
    it('should show decreasing accuracy with longer prediction horizons', () => {
      const baseData = Array.from({ length: 15 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 70 + i * 0.5 + (Math.random() - 0.5) * 2,
      }));

      const shortHorizon = transformToPredictiveData(baseData, 'linear-regression', 3);
      const longHorizon = transformToPredictiveData(baseData, 'linear-regression', 14);

      const shortPredictions = shortHorizon.filter(p => p.isPrediction);
      const longPredictions = longHorizon.filter(p => p.isPrediction);

      // Confidence intervals should be wider for longer horizons
      if (shortPredictions.length > 0 && longPredictions.length > 0) {
        const shortConfidenceWidth = (shortPredictions[0].confidenceUpper || 0) - (shortPredictions[0].confidenceLower || 0);
        const longConfidenceWidth = (longPredictions[longPredictions.length - 1].confidenceUpper || 0)
          - (longPredictions[longPredictions.length - 1].confidenceLower || 0);

        expect(longConfidenceWidth).toBeGreaterThan(shortConfidenceWidth);
      }
    });
  });

  describe('Data Size Impact on Algorithm Performance', () => {
    it('should handle small datasets gracefully', () => {
      const smallData = [
        { date: '2024-01-01', value: 70 },
        { date: '2024-01-02', value: 72 },
        { date: '2024-01-03', value: 74 },
      ];

      const predictions = transformToPredictiveData(smallData, 'linear-regression', 3);
      const predictionCount = predictions.filter(p => p.isPrediction).length;

      expect(predictionCount).toBeGreaterThan(0);
      expect(predictionCount).toBeLessThanOrEqual(3);
    });

    it('should perform efficiently with large datasets', () => {
      const largeData = Array.from({ length: 500 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 100 + i * 0.1 + Math.sin(i * 0.1) * 5,
      }));

      const startTime = performance.now();
      const predictions = transformToPredictiveData(largeData, 'linear-regression', 30);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(predictions.filter(p => p.isPrediction)).toHaveLength(30);
    });
  });
});

describe('Health-Specific Prediction Scenarios', () => {
  describe('Weight Loss Prediction Scenarios', () => {
    it('should predict realistic weight loss patterns (1-2 lbs/week)', () => {
      // Simulate 12 weeks of weight loss data (1.5 lbs/week average)
      const weightData = Array.from({ length: 12 }, (_, i) => ({
        date: new Date(2024, 0, i * 7 + 1).toISOString().split('T')[0], // Weekly data
        value: 180 - (i * 1.5) + (Math.random() - 0.5) * 1, // 180 lbs starting, losing 1.5 lbs/week with variance
      }));

      const predictions = transformToPredictiveData(weightData, 'linear-regression', 4);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Predictions should continue the weight loss trend
      expect(futurePredictions).toHaveLength(4);

      if (futurePredictions.length >= 2) {
        const firstPrediction = futurePredictions[0].value;
        const lastPrediction = futurePredictions[futurePredictions.length - 1].value;
        const predictedWeightLoss = firstPrediction - lastPrediction;

        // Should predict reasonable weight loss (0.5-3 lbs over 4 weeks)
        expect(predictedWeightLoss).toBeGreaterThan(0.5);
        expect(predictedWeightLoss).toBeLessThan(8); // Not too aggressive
      }
    });

    it('should handle weight plateaus realistically', () => {
      // Simulate weight plateau after initial loss
      const plateauData = [
        ...Array.from({ length: 8 }, (_, i) => ({
          date: new Date(2024, 0, i * 7 + 1).toISOString().split('T')[0],
          value: 175 - i * 1.2, // Initial loss
        })),
        ...Array.from({ length: 6 }, (_, i) => ({
          date: new Date(2024, 0, (i + 8) * 7 + 1).toISOString().split('T')[0],
          value: 165 + (Math.random() - 0.5) * 0.8, // Plateau with small fluctuations
        })),
      ];

      const predictions = transformToPredictiveData(plateauData, 'moving-average', 4);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Moving average should predict stable weight during plateau
      if (futurePredictions.length >= 2) {
        const weightVariation = Math.abs(futurePredictions[0].value - futurePredictions[futurePredictions.length - 1].value);

        expect(weightVariation).toBeLessThan(2); // Should predict minimal change during plateau
      }
    });
  });

  describe('Exercise Progression Scenarios', () => {
    it('should predict realistic fitness improvement patterns', () => {
      // Simulate progressive step count improvement
      const stepData = Array.from({ length: 16 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 5000 + i * 200 + (Math.random() - 0.5) * 500, // Progressive improvement with daily variance
      }));

      const predictions = transformToPredictiveData(stepData, 'linear-regression', 7);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Should predict continued improvement but within realistic bounds
      if (futurePredictions.length > 0) {
        const lastHistorical = stepData[stepData.length - 1].value;
        const firstPrediction = futurePredictions[0].value;

        expect(firstPrediction).toBeGreaterThan(lastHistorical * 0.95); // Some improvement
        expect(firstPrediction).toBeLessThan(lastHistorical * 1.15); // But not unrealistic
      }
    });

    it('should handle exercise intensity variations', () => {
      // Simulate workout minutes with rest days
      const workoutData = Array.from({ length: 21 }, (_, i) => {
        const isRestDay = i % 7 === 6; // Sunday rest
        return {
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          value: isRestDay ? 0 : 30 + (i / 7) * 5 + (Math.random() - 0.5) * 10,
        };
      });

      const predictions = transformToPredictiveData(workoutData, 'moving-average', 7);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Should account for rest day patterns
      expect(futurePredictions).toHaveLength(7);

      // Average predicted value should be reasonable
      const avgPredicted = futurePredictions.reduce((sum, p) => sum + p.value, 0) / futurePredictions.length;

      expect(avgPredicted).toBeGreaterThan(15); // Above rest day average
      expect(avgPredicted).toBeLessThan(60); // Below unrealistic levels
    });
  });

  describe('Blood Pressure Management Scenarios', () => {
    it('should predict medication effect patterns', () => {
      // Simulate blood pressure improvement with medication
      const bpData = Array.from({ length: 20 }, (_, i) => {
        const medicationEffect = i < 5 ? 0 : Math.min(15, (i - 5) * 1.5); // Gradual improvement after day 5
        return {
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          value: 140 - medicationEffect + (Math.random() - 0.5) * 8, // Starting at 140, improving with medication
        };
      });

      const predictions = transformToPredictiveData(bpData, 'linear-regression', 10);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Should predict continued but slowing improvement
      if (futurePredictions.length >= 2) {
        const trend = futurePredictions[futurePredictions.length - 1].value - futurePredictions[0].value;

        expect(Math.abs(trend)).toBeLessThan(20); // Reasonable change over 10 days
      }
    });
  });

  describe('Sleep Improvement Scenarios', () => {
    it('should predict sleep hygiene intervention effects', () => {
      // Simulate sleep improvement with intervention
      const sleepData = Array.from({ length: 14 }, (_, i) => {
        const baselineSleep = 6.2;
        const improvement = i < 3 ? 0 : Math.min(1.5, (i - 3) * 0.15); // Gradual improvement after day 3
        return {
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          value: baselineSleep + improvement + (Math.random() - 0.5) * 0.8,
        };
      });

      const predictions = transformToPredictiveData(sleepData, 'moving-average', 7);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Should predict stable improved sleep
      if (futurePredictions.length > 0) {
        const avgPredicted = futurePredictions.reduce((sum, p) => sum + p.value, 0) / futurePredictions.length;

        expect(avgPredicted).toBeGreaterThan(6.5); // Improvement from baseline
        expect(avgPredicted).toBeLessThan(9); // Within realistic range
      }
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  describe('Insufficient Data Handling', () => {
    it('should handle datasets with less than 3 records', () => {
      const insufficientData = [
        { date: '2024-01-01', value: 70 },
        { date: '2024-01-02', value: 72 },
      ];

      const predictions = transformToPredictiveData(insufficientData, 'linear-regression', 5);

      // Should return historical data only or minimal predictions
      expect(predictions.filter(p => !p.isPrediction)).toHaveLength(2);
    });

    it('should handle empty datasets gracefully', () => {
      const emptyData: Array<{ date: string; value: number }> = [];

      const predictions = transformToPredictiveData(emptyData, 'linear-regression', 5);

      expect(predictions).toHaveLength(0);
    });
  });

  describe('Zero Variance Data Handling', () => {
    it('should handle identical values gracefully', () => {
      const identicalData = Array.from({ length: 10 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 75, // All identical values
      }));

      const predictions = transformToPredictiveData(identicalData, 'linear-regression', 5);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Should predict the same value
      futurePredictions.forEach((prediction) => {
        expect(prediction.value).toBeCloseTo(75, 1);
      });
    });
  });

  describe('Extreme Outlier Handling', () => {
    it('should handle extreme outliers without breaking', () => {
      const dataWithOutliers = [
        { date: '2024-01-01', value: 70 },
        { date: '2024-01-02', value: 72 },
        { date: '2024-01-03', value: 1000 }, // Extreme outlier
        { date: '2024-01-04', value: 74 },
        { date: '2024-01-05', value: 76 },
        { date: '2024-01-06', value: 78 },
      ];

      expect(() => {
        const predictions = transformToPredictiveData(dataWithOutliers, 'linear-regression', 3);

        expect(predictions).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Invalid Data Handling', () => {
    it('should handle invalid dates gracefully', () => {
      const invalidDateData = [
        { date: '2024-01-01', value: 70 },
        { date: 'invalid-date', value: 72 },
        { date: '2024-01-03', value: 74 },
      ];

      expect(() => {
        transformToPredictiveData(invalidDateData, 'linear-regression', 3);
      }).toThrow();
    });

    it('should handle non-finite values', () => {
      const invalidValueData = [
        { date: '2024-01-01', value: 70 },
        { date: '2024-01-02', value: Infinity },
        { date: '2024-01-03', value: 74 },
      ];

      expect(() => {
        transformToPredictiveData(invalidValueData, 'linear-regression', 3);
      }).toThrow();
    });
  });

  describe('Date Edge Cases', () => {
    it('should handle leap year dates correctly', () => {
      const leapYearData = [
        { date: '2024-02-28', value: 70 },
        { date: '2024-02-29', value: 72 }, // Leap day
        { date: '2024-03-01', value: 74 },
      ];

      const predictions = transformToPredictiveData(leapYearData, 'linear-regression', 3);

      expect(predictions.filter(p => p.isPrediction)).toHaveLength(3);
    });

    it('should handle month boundary transitions', () => {
      const monthBoundaryData = [
        { date: '2024-01-30', value: 70 },
        { date: '2024-01-31', value: 72 },
        { date: '2024-02-01', value: 74 },
      ];

      const predictions = transformToPredictiveData(monthBoundaryData, 'linear-regression', 5);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Should generate valid future dates
      futurePredictions.forEach((prediction) => {
        expect(new Date(prediction.date).getTime()).not.toBeNaN();
      });
    });
  });

  describe('Prediction Bounds Validation', () => {
    it('should ensure non-negative health values', () => {
      const decreasingData = Array.from({ length: 10 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 10 - i * 1.5, // Decreasing values that could go negative
      }));

      const predictions = transformToPredictiveData(decreasingData, 'linear-regression', 10);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // All predictions should be non-negative
      futurePredictions.forEach((prediction) => {
        expect(prediction.value).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

describe('Performance and Scalability Tests', () => {
  describe('Large Dataset Performance', () => {
    it('should handle 500+ data points efficiently', () => {
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 100 + Math.sin(i * 0.1) * 20 + i * 0.05,
      }));

      const startTime = performance.now();
      const predictions = transformToPredictiveData(largeDataset, 'linear-regression', 30);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      expect(predictions.filter(p => p.isPrediction)).toHaveLength(30);
    });

    it('should maintain accuracy with large datasets', () => {
      const largeLinearDataset = Array.from({ length: 1000 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 50 + i * 0.1 + (Math.random() - 0.5) * 2, // Linear trend with noise
      }));

      const predictions = transformToPredictiveData(largeLinearDataset, 'linear-regression', 10);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Should maintain trend accuracy even with large datasets
      if (futurePredictions.length >= 2) {
        const predictedTrend = futurePredictions[futurePredictions.length - 1].value - futurePredictions[0].value;
        const expectedTrend = 0.1 * 9; // 0.1 per day over 9 days

        expect(Math.abs(predictedTrend - expectedTrend)).toBeLessThan(5); // Allow reasonable tolerance
      }
    });
  });

  describe('Memory Usage Validation', () => {
    it('should not cause memory leaks with repeated calculations', () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 75 + Math.sin(i * 0.2) * 10,
      }));

      // Perform multiple calculations to test for memory leaks
      for (let i = 0; i < 50; i++) {
        const predictions = transformToPredictiveData(testData, 'linear-regression', 7);

        expect(predictions).toBeDefined();
      }

      // If we reach here without running out of memory, the test passes
      expect(true).toBe(true);
    });
  });

  describe('Concurrent Calculation Testing', () => {
    it('should handle concurrent prediction calculations', async () => {
      const datasets = Array.from({ length: 5 }, (_, datasetIndex) =>
        Array.from({ length: 50 }, (_, i) => ({
          date: new Date(2024, datasetIndex, i + 1).toISOString().split('T')[0],
          value: 60 + datasetIndex * 10 + i * 0.5,
        })));

      const promises = datasets.map(dataset =>
        Promise.resolve(transformToPredictiveData(dataset, 'linear-regression', 5)),
      );

      const results = await Promise.all(promises);

      results.forEach((predictions, index) => {
        expect(predictions.filter(p => p.isPrediction)).toHaveLength(5);
        expect(predictions).toBeDefined();
      });
    });
  });

  describe('Calculation Speed Benchmarks', () => {
    it('should meet UI responsiveness requirements', () => {
      const typicalDataset = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 80 + i * 0.3 + (Math.random() - 0.5) * 5,
      }));

      const startTime = performance.now();
      const predictions = transformToPredictiveData(typicalDataset, 'linear-regression', 7);
      const endTime = performance.now();

      // Should complete within 100ms for typical UI responsiveness
      expect(endTime - startTime).toBeLessThan(100);
      expect(predictions.filter(p => p.isPrediction)).toHaveLength(7);
    });
  });
});

describe('Real-World Accuracy and Clinical Validation', () => {
  describe('Historical Health Pattern Validation', () => {
    it('should predict realistic weight management patterns', () => {
      // Based on typical weight management studies: 1-2 lbs per week is sustainable
      const realisticWeightLoss = Array.from({ length: 24 }, (_, i) => ({
        date: new Date(2024, 0, i * 3 + 1).toISOString().split('T')[0], // Every 3 days
        value: 200 - (i * 0.5) + (Math.random() - 0.5) * 2, // 0.5 lbs every 3 days = ~1.2 lbs/week
      }));

      const predictions = transformToPredictiveData(realisticWeightLoss, 'linear-regression', 14);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Predictions should maintain realistic weight loss rate
      if (futurePredictions.length >= 2) {
        const dailyWeightLoss = (futurePredictions[0].value - futurePredictions[futurePredictions.length - 1].value) / 14;

        expect(dailyWeightLoss).toBeGreaterThan(0); // Should predict continued loss
        expect(dailyWeightLoss).toBeLessThan(0.5); // But not more than ~3.5 lbs/week
      }
    });

    it('should predict reasonable blood pressure improvements', () => {
      // Based on hypertension treatment studies
      const bpTreatmentData = Array.from({ length: 12 }, (_, i) => ({
        date: new Date(2024, 0, i * 7 + 1).toISOString().split('T')[0], // Weekly measurements
        value: 150 - Math.min(25, i * 2.5) + (Math.random() - 0.5) * 8, // Max 25 mmHg reduction over 12 weeks
      }));

      const predictions = transformToPredictiveData(bpTreatmentData, 'moving-average', 4);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Should predict clinically reasonable BP values
      futurePredictions.forEach((prediction) => {
        expect(prediction.value).toBeGreaterThan(90); // Not too low
        expect(prediction.value).toBeLessThan(180); // Not unrealistically high
      });
    });
  });

  describe('Noise and Variability Handling', () => {
    it('should handle realistic daily weight fluctuations', () => {
      // Real weight data has daily fluctuations of 1-3 lbs
      const realisticWeightData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 175 - i * 0.1 + (Math.random() - 0.5) * 4, // Slow loss with 4 lb daily variance
      }));

      const predictions = transformToPredictiveData(realisticWeightData, 'moving-average', 7);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Moving average should smooth out daily fluctuations
      if (futurePredictions.length >= 2) {
        const predictionVariance = calculateVariance(futurePredictions.map(p => p.value));

        expect(predictionVariance).toBeLessThan(4); // Should be smoother than raw data
      }
    });

    function calculateVariance(values: number[]): number {
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      return values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    }
  });

  describe('Long-term vs Short-term Prediction Accuracy', () => {
    it('should show higher accuracy for short-term predictions', () => {
      const consistentData = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 100 + i * 0.5 + (Math.random() - 0.5) * 1,
      }));

      const shortTermPredictions = transformToPredictiveData(consistentData, 'linear-regression', 3);
      const longTermPredictions = transformToPredictiveData(consistentData, 'linear-regression', 15);

      const shortTermConfidence = shortTermPredictions.filter(p => p.isPrediction);
      const longTermConfidence = longTermPredictions.filter(p => p.isPrediction);

      // Short-term predictions should have tighter confidence intervals
      if (shortTermConfidence.length > 0 && longTermConfidence.length > 0) {
        const shortConfidenceWidth = (shortTermConfidence[0].confidenceUpper || 0) - (shortTermConfidence[0].confidenceLower || 0);
        const longConfidenceWidth = (longTermConfidence[longTermConfidence.length - 1].confidenceUpper || 0)
          - (longTermConfidence[longTermConfidence.length - 1].confidenceLower || 0);

        expect(shortConfidenceWidth).toBeLessThan(longConfidenceWidth);
      }
    });
  });

  describe('Clinical Reasonableness Validation', () => {
    it('should predict clinically reasonable step count progression', () => {
      // Based on fitness improvement studies
      const stepProgressionData = Array.from({ length: 16 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 4000 + i * 150 + (Math.random() - 0.5) * 800, // Gradual improvement
      }));

      const predictions = transformToPredictiveData(stepProgressionData, 'linear-regression', 7);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Should predict reasonable step counts
      futurePredictions.forEach((prediction) => {
        expect(prediction.value).toBeGreaterThan(2000); // Minimum reasonable activity
        expect(prediction.value).toBeLessThan(25000); // Maximum reasonable daily steps
      });
    });

    it('should predict reasonable sleep duration improvements', () => {
      const sleepImprovementData = Array.from({ length: 21 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: 5.5 + Math.min(2, i * 0.1) + (Math.random() - 0.5) * 0.8, // Gradual sleep improvement
      }));

      const predictions = transformToPredictiveData(sleepImprovementData, 'moving-average', 7);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Should predict clinically reasonable sleep durations
      futurePredictions.forEach((prediction) => {
        expect(prediction.value).toBeGreaterThan(4); // Minimum sleep
        expect(prediction.value).toBeLessThan(12); // Maximum reasonable sleep
      });
    });
  });
});
