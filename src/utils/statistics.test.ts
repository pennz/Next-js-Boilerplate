import type { ConfidenceIntervalConfig, DataPoint, LinearRegressionResult } from './statistics';
import { describe, expect, it } from 'vitest';
import {
  calculateCovariance,
  calculateMAPE,
  calculateMean,
  calculatePredictionAccuracy,
  calculateVariance,

  dateToNumeric,
  generateConfidenceInterval,
  generateFuturePredictions,
  linearRegression,

  movingAverage,
  numericToDate,
  transformHealthDataForRegression,
} from './statistics';

describe('Statistical Utility Functions', () => {
  describe('calculateMean', () => {
    it('should calculate the correct mean for positive numbers', () => {
      expect(calculateMean([1, 2, 3, 4, 5])).toBe(3);
      expect(calculateMean([10, 20, 30])).toBe(20);
    });

    it('should handle negative numbers', () => {
      expect(calculateMean([-1, -2, -3])).toBe(-2);
      expect(calculateMean([-5, 0, 5])).toBe(0);
    });

    it('should handle decimal numbers', () => {
      expect(calculateMean([1.5, 2.5, 3.5])).toBeCloseTo(2.5);
    });

    it('should return 0 for empty array', () => {
      expect(calculateMean([])).toBe(0);
    });

    it('should return the single value for array with one element', () => {
      expect(calculateMean([42])).toBe(42);
    });
  });

  describe('calculateVariance', () => {
    it('should calculate correct variance', () => {
      expect(calculateVariance([1, 2, 3, 4, 5])).toBeCloseTo(2);
      expect(calculateVariance([10, 10, 10])).toBe(0);
    });

    it('should use provided mean when given', () => {
      const values = [1, 2, 3, 4, 5];
      const mean = 3;

      expect(calculateVariance(values, mean)).toBeCloseTo(2);
    });

    it('should return 0 for empty array', () => {
      expect(calculateVariance([])).toBe(0);
    });

    it('should handle single value', () => {
      expect(calculateVariance([5])).toBe(0);
    });
  });

  describe('calculateCovariance', () => {
    it('should calculate correct covariance for positively correlated data', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [2, 4, 6, 8, 10];

      expect(calculateCovariance(xValues, yValues)).toBeCloseTo(4);
    });

    it('should calculate correct covariance for negatively correlated data', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [10, 8, 6, 4, 2];

      expect(calculateCovariance(xValues, yValues)).toBeCloseTo(-4);
    });

    it('should return 0 for uncorrelated data', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [1, 1, 1, 1, 1];

      expect(calculateCovariance(xValues, yValues)).toBe(0);
    });

    it('should return 0 for mismatched array lengths', () => {
      expect(calculateCovariance([1, 2], [1, 2, 3])).toBe(0);
    });

    it('should return 0 for empty arrays', () => {
      expect(calculateCovariance([], [])).toBe(0);
    });

    it('should use provided means when given', () => {
      const xValues = [1, 2, 3];
      const yValues = [2, 4, 6];
      const result = calculateCovariance(xValues, yValues, 2, 4);

      expect(result).toBeCloseTo(2);
    });
  });

  describe('linearRegression', () => {
    it('should calculate correct regression for perfect linear relationship', () => {
      const dataPoints: DataPoint[] = [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
        { x: 4, y: 8 },
      ];

      const result = linearRegression(dataPoints);

      expect(result.slope).toBeCloseTo(2);
      expect(result.intercept).toBeCloseTo(0);
      expect(result.rSquared).toBeCloseTo(1);
      expect(result.residualStandardDeviation).toBeCloseTo(0);
    });

    it('should calculate correct regression for real-world data', () => {
      const dataPoints: DataPoint[] = [
        { x: 1, y: 2.1 },
        { x: 2, y: 3.9 },
        { x: 3, y: 6.1 },
        { x: 4, y: 7.8 },
      ];

      const result = linearRegression(dataPoints);

      expect(result.slope).toBeCloseTo(1.94, 1);
      expect(result.intercept).toBeCloseTo(0.25, 1);
      expect(result.rSquared).toBeGreaterThan(0.9);
      expect(result.residualStandardDeviation).toBeGreaterThan(0);
    });

    it('should handle horizontal line (zero slope)', () => {
      const dataPoints: DataPoint[] = [
        { x: 1, y: 5 },
        { x: 2, y: 5 },
        { x: 3, y: 5 },
        { x: 4, y: 5 },
      ];

      const result = linearRegression(dataPoints);

      expect(result.slope).toBeCloseTo(0);
      expect(result.intercept).toBeCloseTo(5);
      expect(result.rSquared).toBeCloseTo(1);
      expect(result.residualStandardDeviation).toBeCloseTo(0);
    });

    it('should handle vertical line (identical x values)', () => {
      const dataPoints: DataPoint[] = [
        { x: 5, y: 1 },
        { x: 5, y: 2 },
        { x: 5, y: 3 },
        { x: 5, y: 4 },
      ];

      const result = linearRegression(dataPoints);

      expect(result.slope).toBe(0);
      expect(result.intercept).toBeCloseTo(2.5);
      expect(result.rSquared).toBe(0);
      expect(result.residualStandardDeviation).toBeGreaterThan(0);
    });

    it('should throw error for insufficient data points', () => {
      expect(() => linearRegression([])).toThrow('Linear regression requires at least 2 data points');
      expect(() => linearRegression([{ x: 1, y: 2 }])).toThrow('Linear regression requires at least 2 data points');
    });

    it('should handle negative values', () => {
      const dataPoints: DataPoint[] = [
        { x: -2, y: -4 },
        { x: -1, y: -2 },
        { x: 0, y: 0 },
        { x: 1, y: 2 },
      ];

      const result = linearRegression(dataPoints);

      expect(result.slope).toBeCloseTo(2);
      expect(result.intercept).toBeCloseTo(0);
    });

    it('should clamp r-squared between 0 and 1', () => {
      const dataPoints: DataPoint[] = [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ];

      const result = linearRegression(dataPoints);

      expect(result.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.rSquared).toBeLessThanOrEqual(1);
    });
  });

  describe('movingAverage', () => {
    it('should calculate correct moving average with window size 3', () => {
      const values = [1, 2, 3, 4, 5, 6];
      const result = movingAverage(values, 3);

      expect(result).toEqual([2, 3, 4, 5]);
    });

    it('should calculate correct moving average with window size 2', () => {
      const values = [10, 20, 30, 40];
      const result = movingAverage(values, 2);

      expect(result).toEqual([15, 25, 35]);
    });

    it('should handle window size equal to array length', () => {
      const values = [1, 2, 3, 4];
      const result = movingAverage(values, 4);

      expect(result).toEqual([2.5]);
    });

    it('should handle single value with window size 1', () => {
      const values = [42];
      const result = movingAverage(values, 1);

      expect(result).toEqual([42]);
    });

    it('should handle decimal values', () => {
      const values = [1.5, 2.5, 3.5, 4.5];
      const result = movingAverage(values, 2);

      expect(result).toEqual([2, 3, 4]);
    });

    it('should throw error for invalid window size', () => {
      expect(() => movingAverage([1, 2, 3], 0)).toThrow('Window size must be positive');
      expect(() => movingAverage([1, 2, 3], -1)).toThrow('Window size must be positive');
    });

    it('should throw error for window size larger than array', () => {
      expect(() => movingAverage([1, 2], 3)).toThrow('Window size cannot be larger than the number of values');
    });

    it('should handle empty array edge case', () => {
      expect(() => movingAverage([], 1)).toThrow('Window size cannot be larger than the number of values');
    });
  });

  describe('calculateMAPE', () => {
    it('should calculate correct MAPE for perfect predictions', () => {
      const actual = [10, 20, 30, 40];
      const predicted = [10, 20, 30, 40];

      expect(calculateMAPE(actual, predicted)).toBe(0);
    });

    it('should calculate correct MAPE for known values', () => {
      const actual = [100, 200, 300];
      const predicted = [110, 180, 320];
      // Expected MAPE: ((10/100 + 20/200 + 20/300) / 3) * 100 = 10%

      const result = calculateMAPE(actual, predicted);

      expect(result).toBeCloseTo(10, 1);
    });

    it('should handle mixed positive and negative actual values', () => {
      const actual = [10, -20, 30];
      const predicted = [11, -18, 33];

      const result = calculateMAPE(actual, predicted);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });

    it('should return Infinity when actual values contain zero', () => {
      const actual = [10, 0, 30];
      const predicted = [11, 5, 33];

      expect(calculateMAPE(actual, predicted)).toBe(Infinity);
    });

    it('should return 0 for empty arrays', () => {
      expect(calculateMAPE([], [])).toBe(0);
    });

    it('should throw error for mismatched array lengths', () => {
      expect(() => calculateMAPE([1, 2], [1, 2, 3])).toThrow('Actual and predicted values arrays must have the same length');
    });

    it('should handle large percentage errors', () => {
      const actual = [1, 1, 1];
      const predicted = [2, 3, 4];

      const result = calculateMAPE(actual, predicted);

      expect(result).toBe(200); // 200% average error
    });
  });

  describe('generateConfidenceInterval', () => {
    it('should generate correct confidence interval for 95% confidence', () => {
      const config: ConfidenceIntervalConfig = {
        confidenceLevel: 0.95,
        residualStandardDeviation: 2,
        sampleSize: 30,
      };

      const result = generateConfidenceInterval(10, config);

      expect(result.upper).toBeGreaterThan(10);
      expect(result.lower).toBeLessThan(10);
      expect(result.upper - result.lower).toBeGreaterThan(0);
    });

    it('should generate wider intervals for higher confidence levels', () => {
      const baseConfig: ConfidenceIntervalConfig = {
        confidenceLevel: 0.95,
        residualStandardDeviation: 1,
        sampleSize: 20,
      };

      const interval95 = generateConfidenceInterval(10, baseConfig);
      const interval99 = generateConfidenceInterval(10, { ...baseConfig, confidenceLevel: 0.99 });

      const width95 = interval95.upper - interval95.lower;
      const width99 = interval99.upper - interval99.lower;

      expect(width99).toBeGreaterThan(width95);
    });

    it('should generate wider intervals for smaller sample sizes', () => {
      const baseConfig: ConfidenceIntervalConfig = {
        confidenceLevel: 0.95,
        residualStandardDeviation: 1,
        sampleSize: 30,
      };

      const intervalLarge = generateConfidenceInterval(10, baseConfig);
      const intervalSmall = generateConfidenceInterval(10, { ...baseConfig, sampleSize: 5 });

      const widthLarge = intervalLarge.upper - intervalLarge.lower;
      const widthSmall = intervalSmall.upper - intervalSmall.lower;

      expect(widthSmall).toBeGreaterThan(widthLarge);
    });

    it('should generate wider intervals for higher residual standard deviation', () => {
      const baseConfig: ConfidenceIntervalConfig = {
        confidenceLevel: 0.95,
        residualStandardDeviation: 1,
        sampleSize: 20,
      };

      const intervalLowStd = generateConfidenceInterval(10, baseConfig);
      const intervalHighStd = generateConfidenceInterval(10, { ...baseConfig, residualStandardDeviation: 3 });

      const widthLowStd = intervalLowStd.upper - intervalLowStd.lower;
      const widthHighStd = intervalHighStd.upper - intervalHighStd.lower;

      expect(widthHighStd).toBeGreaterThan(widthLowStd);
    });

    it('should be symmetric around the predicted value', () => {
      const config: ConfidenceIntervalConfig = {
        confidenceLevel: 0.95,
        residualStandardDeviation: 1,
        sampleSize: 20,
      };

      const predictedValue = 15;
      const result = generateConfidenceInterval(predictedValue, config);

      const upperDistance = result.upper - predictedValue;
      const lowerDistance = predictedValue - result.lower;

      expect(upperDistance).toBeCloseTo(lowerDistance, 5);
    });
  });

  describe('dateToNumeric', () => {
    it('should convert valid date strings to numeric timestamps', () => {
      const dateString = '2023-01-01T00:00:00.000Z';
      const result = dateToNumeric(dateString);

      expect(typeof result).toBe('number');
      expect(result).toBe(new Date(dateString).getTime());
    });

    it('should handle different date formats', () => {
      const dates = [
        '2023-01-01',
        '2023-01-01T12:30:00Z',
        '2023-01-01T12:30:00.123Z',
        'January 1, 2023',
      ];

      dates.forEach((dateString) => {
        const result = dateToNumeric(dateString);

        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
      });
    });

    it('should throw error for invalid date strings', () => {
      expect(() => dateToNumeric('invalid-date')).toThrow('Invalid date string: invalid-date');
      expect(() => dateToNumeric('')).toThrow('Invalid date string: ');
      expect(() => dateToNumeric('not-a-date-at-all')).toThrow('Invalid date string: not-a-date-at-all');
    });

    it('should handle edge case dates', () => {
      expect(() => dateToNumeric('1970-01-01T00:00:00.000Z')).not.toThrow();
      expect(() => dateToNumeric('2099-12-31T23:59:59.999Z')).not.toThrow();
    });
  });

  describe('numericToDate', () => {
    it('should convert numeric timestamps to ISO date strings', () => {
      const timestamp = 1672531200000; // 2023-01-01T00:00:00.000Z
      const result = numericToDate(timestamp);

      expect(result).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should be inverse of dateToNumeric', () => {
      const originalDate = '2023-06-15T14:30:00.000Z';
      const numeric = dateToNumeric(originalDate);
      const backToDate = numericToDate(numeric);

      expect(backToDate).toBe(originalDate);
    });

    it('should handle zero timestamp', () => {
      const result = numericToDate(0);

      expect(result).toBe('1970-01-01T00:00:00.000Z');
    });

    it('should handle large timestamps', () => {
      const largeTimestamp = 4102444800000; // 2100-01-01T00:00:00.000Z
      const result = numericToDate(largeTimestamp);

      expect(result).toBe('2100-01-01T00:00:00.000Z');
    });
  });

  describe('transformHealthDataForRegression', () => {
    it('should transform health data to regression format', () => {
      const healthData = [
        { date: '2023-01-01', value: 70 },
        { date: '2023-01-02', value: 71 },
        { date: '2023-01-03', value: 69 },
      ];

      const result = transformHealthDataForRegression(healthData);

      expect(result).toHaveLength(3);

      result.forEach((point, index) => {
        expect(point).toHaveProperty('x');
        expect(point).toHaveProperty('y');
        expect(typeof point.x).toBe('number');
        expect(point.y).toBe(healthData[index].value);
      });
    });

    it('should handle empty array', () => {
      const result = transformHealthDataForRegression([]);

      expect(result).toEqual([]);
    });

    it('should maintain chronological order', () => {
      const healthData = [
        { date: '2023-01-01', value: 70 },
        { date: '2023-01-02', value: 71 },
        { date: '2023-01-03', value: 69 },
      ];

      const result = transformHealthDataForRegression(healthData);

      expect(result[0].x).toBeLessThan(result[1].x);
      expect(result[1].x).toBeLessThan(result[2].x);
    });

    it('should throw error for invalid dates in health data', () => {
      const healthData = [
        { date: 'invalid-date', value: 70 },
      ];

      expect(() => transformHealthDataForRegression(healthData)).toThrow();
    });
  });

  describe('generateFuturePredictions', () => {
    it('should generate correct number of future predictions', () => {
      const regressionResult: LinearRegressionResult = {
        slope: 0.1,
        intercept: 70,
        rSquared: 0.9,
        residualStandardDeviation: 1,
      };

      const lastDataPoint = { date: '2023-01-01', value: 70 };
      const futureDays = 5;

      const result = generateFuturePredictions(regressionResult, lastDataPoint, futureDays);

      expect(result).toHaveLength(futureDays);
    });

    it('should mark all predictions with isPrediction: true', () => {
      const regressionResult: LinearRegressionResult = {
        slope: 0.1,
        intercept: 70,
        rSquared: 0.9,
        residualStandardDeviation: 1,
      };

      const lastDataPoint = { date: '2023-01-01', value: 70 };

      const result = generateFuturePredictions(regressionResult, lastDataPoint, 3);

      result.forEach((prediction) => {
        expect(prediction.isPrediction).toBe(true);
      });
    });

    it('should generate sequential future dates', () => {
      const regressionResult: LinearRegressionResult = {
        slope: 0,
        intercept: 70,
        rSquared: 1,
        residualStandardDeviation: 0,
      };

      const lastDataPoint = { date: '2023-01-01T00:00:00.000Z', value: 70 };

      const result = generateFuturePredictions(regressionResult, lastDataPoint, 3);

      expect(result[0].date).toBe('2023-01-02T00:00:00.000Z');
      expect(result[1].date).toBe('2023-01-03T00:00:00.000Z');
      expect(result[2].date).toBe('2023-01-04T00:00:00.000Z');
    });

    it('should ensure non-negative predicted values', () => {
      const regressionResult: LinearRegressionResult = {
        slope: -10, // Steep negative slope
        intercept: 5,
        rSquared: 0.9,
        residualStandardDeviation: 1,
      };

      const lastDataPoint = { date: '2023-01-01', value: 10 };

      const result = generateFuturePredictions(regressionResult, lastDataPoint, 5);

      result.forEach((prediction) => {
        expect(prediction.value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle zero future days', () => {
      const regressionResult: LinearRegressionResult = {
        slope: 1,
        intercept: 0,
        rSquared: 1,
        residualStandardDeviation: 0,
      };

      const lastDataPoint = { date: '2023-01-01', value: 70 };

      const result = generateFuturePredictions(regressionResult, lastDataPoint, 0);

      expect(result).toHaveLength(0);
    });
  });

  describe('calculatePredictionAccuracy', () => {
    it('should calculate perfect accuracy for identical values', () => {
      const actual = [10, 20, 30, 40];
      const predicted = [10, 20, 30, 40];

      const result = calculatePredictionAccuracy(actual, predicted);

      expect(result.mape).toBe(0);
      expect(result.rmse).toBe(0);
      expect(result.mae).toBe(0);
      expect(result.accuracy).toBe(100);
    });

    it('should calculate reasonable accuracy metrics for realistic data', () => {
      const actual = [100, 200, 300, 400];
      const predicted = [105, 195, 310, 390];

      const result = calculatePredictionAccuracy(actual, predicted);

      expect(result.mape).toBeGreaterThan(0);
      expect(result.mape).toBeLessThan(10);
      expect(result.rmse).toBeGreaterThan(0);
      expect(result.mae).toBeGreaterThan(0);
      expect(result.accuracy).toBeGreaterThan(90);
      expect(result.accuracy).toBeLessThan(100);
    });

    it('should handle empty arrays', () => {
      const result = calculatePredictionAccuracy([], []);

      expect(result.mape).toBe(0);
      expect(result.rmse).toBe(0);
      expect(result.mae).toBe(0);
      expect(result.accuracy).toBe(100);
    });

    it('should throw error for mismatched array lengths', () => {
      expect(() => calculatePredictionAccuracy([1, 2], [1, 2, 3])).toThrow('Actual and predicted values arrays must have the same length');
    });

    it('should handle zero values in actual data gracefully', () => {
      const actual = [0, 10, 20];
      const predicted = [1, 11, 19];

      const result = calculatePredictionAccuracy(actual, predicted);

      expect(result.mape).toBe(0); // Should handle Infinity case
      expect(result.rmse).toBeGreaterThan(0);
      expect(result.mae).toBeGreaterThan(0);
      expect(result.accuracy).toBeGreaterThan(0);
    });

    it('should calculate RMSE correctly', () => {
      const actual = [10, 20, 30];
      const predicted = [12, 18, 32];
      // Expected RMSE: sqrt(((2^2 + 2^2 + 2^2) / 3)) = sqrt(4) = 2

      const result = calculatePredictionAccuracy(actual, predicted);

      expect(result.rmse).toBeCloseTo(2, 5);
    });

    it('should calculate MAE correctly', () => {
      const actual = [10, 20, 30];
      const predicted = [12, 18, 32];
      // Expected MAE: (2 + 2 + 2) / 3 = 2

      const result = calculatePredictionAccuracy(actual, predicted);

      expect(result.mae).toBeCloseTo(2, 5);
    });

    it('should ensure accuracy is between 0 and 100', () => {
      const actual = [1, 2, 3];
      const predicted = [100, 200, 300]; // Very poor predictions

      const result = calculatePredictionAccuracy(actual, predicted);

      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(100);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with realistic health data', () => {
      // Simulate weight loss data over time
      const healthData = [
        { date: '2023-01-01', value: 80 },
        { date: '2023-01-02', value: 79.8 },
        { date: '2023-01-03', value: 79.5 },
        { date: '2023-01-04', value: 79.3 },
        { date: '2023-01-05', value: 79.0 },
      ];

      // Transform data for regression
      const regressionData = transformHealthDataForRegression(healthData);

      expect(regressionData).toHaveLength(5);

      // Perform regression
      const regression = linearRegression(regressionData);

      expect(regression.slope).toBeLessThan(0); // Weight should be decreasing
      expect(regression.rSquared).toBeGreaterThan(0.8); // Good fit

      // Generate future predictions
      const predictions = generateFuturePredictions(
        regression,
        healthData[healthData.length - 1],
        3,
      );

      expect(predictions).toHaveLength(3);

      // Verify predictions continue the trend
      predictions.forEach((prediction) => {
        expect(prediction.value).toBeLessThan(80); // Should be less than starting weight
        expect(prediction.isPrediction).toBe(true);
      });
    });

    it('should handle moving average workflow', () => {
      const values = [70, 71, 69, 72, 68, 73, 67, 74];
      const windowSize = 3;

      const movingAvg = movingAverage(values, windowSize);

      expect(movingAvg).toHaveLength(values.length - windowSize + 1);

      // Verify each moving average is reasonable
      movingAvg.forEach((avg, index) => {
        const window = values.slice(index, index + windowSize);
        const expectedAvg = calculateMean(window);

        expect(avg).toBeCloseTo(expectedAvg);
      });
    });

    it('should handle confidence interval workflow', () => {
      const healthData = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 102 },
        { date: '2023-01-03', value: 98 },
        { date: '2023-01-04', value: 104 },
        { date: '2023-01-05', value: 96 },
      ];

      const regressionData = transformHealthDataForRegression(healthData);
      const regression = linearRegression(regressionData);

      const config: ConfidenceIntervalConfig = {
        confidenceLevel: 0.95,
        residualStandardDeviation: regression.residualStandardDeviation,
        sampleSize: healthData.length,
      };

      const predictions = generateFuturePredictions(regression, healthData[healthData.length - 1], 2);

      predictions.forEach((prediction) => {
        const interval = generateConfidenceInterval(prediction.value, config);

        expect(interval.upper).toBeGreaterThan(prediction.value);
        expect(interval.lower).toBeLessThan(prediction.value);
      });
    });
  });
});
