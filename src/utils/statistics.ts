/**
 * Statistical utility functions for predictive analytics in health management.
 * Provides linear regression, moving averages, accuracy metrics, and confidence intervals.
 */

/**
 * Represents a data point for regression analysis
 */
export type DataPoint = {
  x: number;
  y: number;
};

/**
 * Result of linear regression analysis
 */
export type LinearRegressionResult = {
  slope: number;
  intercept: number;
  rSquared: number;
  residualStandardDeviation: number;
};

/**
 * Configuration for confidence interval calculation
 */
export type ConfidenceIntervalConfig = {
  confidenceLevel: number; // e.g., 0.95 for 95% confidence
  residualStandardDeviation: number;
  sampleSize: number;
};

/**
 * Result of confidence interval calculation
 */
export type ConfidenceInterval = {
  upper: number;
  lower: number;
};

/**
 * Calculates the mean (average) of an array of numbers
 * @param values - Array of numeric values
 * @returns The arithmetic mean
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Calculates the variance of an array of numbers
 * @param values - Array of numeric values
 * @param mean - Pre-calculated mean (optional, will calculate if not provided)
 * @returns The variance
 */
export function calculateVariance(values: number[], mean?: number): number {
  if (values.length === 0) {
    return 0;
  }
  const meanValue = mean ?? calculateMean(values);
  return values.reduce((sum, value) => sum + (value - meanValue) ** 2, 0) / values.length;
}

/**
 * Calculates the covariance between two arrays of numbers
 * @param xValues - Array of x values
 * @param yValues - Array of y values
 * @param xMean - Pre-calculated mean of x values (optional)
 * @param yMean - Pre-calculated mean of y values (optional)
 * @returns The covariance
 */
export function calculateCovariance(
  xValues: number[],
  yValues: number[],
  xMean?: number,
  yMean?: number,
): number {
  if (xValues.length !== yValues.length || xValues.length === 0) {
    return 0;
  }

  const meanX = xMean ?? calculateMean(xValues);
  const meanY = yMean ?? calculateMean(yValues);

  return xValues.reduce((sum, x, index) => {
    return sum + (x - meanX) * (yValues[index] - meanY);
  }, 0) / xValues.length;
}

/**
 * Performs linear regression analysis on a dataset
 * @param dataPoints - Array of {x, y} coordinate pairs
 * @returns Linear regression results including slope, intercept, r-squared, and residual standard deviation
 * @throws Error if insufficient data points provided
 */
export function linearRegression(dataPoints: DataPoint[]): LinearRegressionResult {
  if (dataPoints.length < 2) {
    throw new Error('Linear regression requires at least 2 data points');
  }

  const xValues = dataPoints.map(point => point.x);
  const yValues = dataPoints.map(point => point.y);

  const xMean = calculateMean(xValues);
  const yMean = calculateMean(yValues);

  const xVariance = calculateVariance(xValues, xMean);
  const covariance = calculateCovariance(xValues, yValues, xMean, yMean);

  // Handle case where all x values are the same
  if (xVariance === 0) {
    return {
      slope: 0,
      intercept: yMean,
      rSquared: 0,
      residualStandardDeviation: Math.sqrt(calculateVariance(yValues, yMean)),
    };
  }

  const slope = covariance / xVariance;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared and residual standard deviation
  const predictions = xValues.map(x => slope * x + intercept);
  const totalSumSquares = yValues.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
  const residualSumSquares = yValues.reduce((sum, y, index) => {
    return sum + (y - predictions[index]) ** 2;
  }, 0);

  const rSquared = totalSumSquares === 0 ? 1 : 1 - (residualSumSquares / totalSumSquares);
  const residualStandardDeviation = Math.sqrt(residualSumSquares / (dataPoints.length - 2));

  return {
    slope,
    intercept,
    rSquared: Math.max(0, Math.min(1, rSquared)), // Clamp between 0 and 1
    residualStandardDeviation,
  };
}

/**
 * Calculates simple moving average for a dataset
 * @param values - Array of numeric values
 * @param windowSize - Size of the moving window (must be positive and <= values.length)
 * @returns Array of moving averages (length will be values.length - windowSize + 1)
 * @throws Error if invalid window size provided
 */
export function movingAverage(values: number[], windowSize: number): number[] {
  if (windowSize <= 0) {
    throw new Error('Window size must be positive');
  }

  if (windowSize > values.length) {
    throw new Error('Window size cannot be larger than the number of values');
  }

  const result: number[] = [];

  for (let i = 0; i <= values.length - windowSize; i++) {
    const window = values.slice(i, i + windowSize);
    result.push(calculateMean(window));
  }

  return result;
}

/**
 * Calculates Mean Absolute Percentage Error (MAPE) between actual and predicted values
 * @param actualValues - Array of actual values
 * @param predictedValues - Array of predicted values
 * @returns MAPE as a percentage (0-100), or Infinity if any actual value is zero
 * @throws Error if arrays have different lengths
 */
export function calculateMAPE(actualValues: number[], predictedValues: number[]): number {
  if (actualValues.length !== predictedValues.length) {
    throw new Error('Actual and predicted values arrays must have the same length');
  }

  if (actualValues.length === 0) {
    return 0;
  }

  // Check for zero values in actual data
  if (actualValues.includes(0)) {
    return Infinity;
  }

  const absolutePercentageErrors = actualValues.map((actual, index) => {
    return Math.abs((actual - predictedValues[index]) / actual);
  });

  return calculateMean(absolutePercentageErrors) * 100;
}

/**
 * Generates confidence interval bounds for a predicted value
 * @param predictedValue - The predicted value
 * @param config - Configuration including confidence level, residual standard deviation, and sample size
 * @returns Upper and lower confidence bounds
 */
export function generateConfidenceInterval(
  predictedValue: number,
  config: ConfidenceIntervalConfig,
): ConfidenceInterval {
  const { confidenceLevel, residualStandardDeviation, sampleSize } = config;

  // Use t-distribution critical value approximation for small samples
  // For larger samples (n > 30), this approximates the normal distribution
  const alpha = 1 - confidenceLevel;
  const tCritical = getTCriticalValue(alpha / 2, sampleSize - 2);

  const marginOfError = tCritical * residualStandardDeviation * Math.sqrt(1 + 1 / sampleSize);

  return {
    upper: predictedValue + marginOfError,
    lower: predictedValue - marginOfError,
  };
}

/**
 * Approximates the t-distribution critical value for confidence intervals
 * @param alpha - Alpha level (e.g., 0.025 for 95% confidence)
 * @param degreesOfFreedom - Degrees of freedom
 * @returns Approximate t-critical value
 */
function getTCriticalValue(alpha: number, degreesOfFreedom: number): number {
  // Simplified approximation for common confidence levels
  // For production use, consider using a proper statistical library
  if (degreesOfFreedom >= 30) {
    // Use normal distribution approximation for large samples
    if (alpha <= 0.005) {
      return 2.576;
    } // 99% confidence
    if (alpha <= 0.01) {
      return 2.326;
    } // 98% confidence
    if (alpha <= 0.025) {
      return 1.96;
    } // 95% confidence
    if (alpha <= 0.05) {
      return 1.645;
    } // 90% confidence
    return 1.282; // 80% confidence
  }

  // Simplified t-distribution values for small samples
  const tTable: { [key: number]: number } = {
    1: 12.706,
    2: 4.303,
    3: 3.182,
    4: 2.776,
    5: 2.571,
    6: 2.447,
    7: 2.365,
    8: 2.306,
    9: 2.262,
    10: 2.228,
    15: 2.131,
    20: 2.086,
    25: 2.060,
    30: 2.042,
  };

  // Find closest degrees of freedom in table
  const availableDf = Object.keys(tTable).map(Number).sort((a, b) => a - b);
  const closestDf = availableDf.reduce((prev, curr) =>
    Math.abs(curr - degreesOfFreedom) < Math.abs(prev - degreesOfFreedom) ? curr : prev,
  );

  return tTable[closestDf] || 2.0; // Default fallback
}

/**
 * Converts a date string to a numeric value for regression analysis
 * @param dateString - Date string in ISO format or parseable format
 * @returns Numeric timestamp representation
 */
export function dateToNumeric(dateString: string): number {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new TypeError(`Invalid date string: ${dateString}`);
  }
  return date.getTime();
}

/**
 * Converts a numeric timestamp back to a date string
 * @param numericValue - Numeric timestamp
 * @returns ISO date string
 */
export function numericToDate(numericValue: number): string {
  return new Date(numericValue).toISOString();
}

/**
 * Transforms health data points to regression-compatible format
 * @param healthData - Array of health data with date strings and values
 * @returns Array of {x, y} points suitable for regression analysis
 */
export function transformHealthDataForRegression(
  healthData: Array<{ date: string; value: number }>,
): DataPoint[] {
  return healthData.map(point => ({
    x: dateToNumeric(point.date),
    y: point.value,
  }));
}

/**
 * Generates future date predictions based on regression results
 * @param regressionResult - Results from linear regression
 * @param lastDataPoint - The last known data point
 * @param futureDays - Number of days to predict into the future
 * @returns Array of predicted data points with dates and values
 */
export function generateFuturePredictions(
  regressionResult: LinearRegressionResult,
  lastDataPoint: { date: string; value: number },
  futureDays: number,
): Array<{ date: string; value: number; isPrediction: boolean }> {
  const { slope, intercept } = regressionResult;
  const lastTimestamp = dateToNumeric(lastDataPoint.date);
  const oneDayMs = 24 * 60 * 60 * 1000; // milliseconds in a day

  const predictions: Array<{ date: string; value: number; isPrediction: boolean }> = [];

  for (let i = 1; i <= futureDays; i++) {
    const futureTimestamp = lastTimestamp + (i * oneDayMs);
    const predictedValue = slope * futureTimestamp + intercept;

    predictions.push({
      date: numericToDate(futureTimestamp),
      value: Math.max(0, predictedValue), // Ensure non-negative values for health metrics
      isPrediction: true,
    });
  }

  return predictions;
}

/**
 * Calculates prediction accuracy using multiple metrics
 * @param actualValues - Array of actual values
 * @param predictedValues - Array of predicted values
 * @returns Object containing various accuracy metrics
 */
export function calculatePredictionAccuracy(
  actualValues: number[],
  predictedValues: number[],
): {
  mape: number;
  rmse: number;
  mae: number;
  accuracy: number; // 1 - normalized RMSE, as percentage
} {
  if (actualValues.length !== predictedValues.length) {
    throw new Error('Actual and predicted values arrays must have the same length');
  }

  if (actualValues.length === 0) {
    return { mape: 0, rmse: 0, mae: 0, accuracy: 100 };
  }

  const mape = calculateMAPE(actualValues, predictedValues);

  // Root Mean Square Error
  const squaredErrors = actualValues.map((actual, index) =>
    (actual - predictedValues[index]) ** 2,
  );
  const rmse = Math.sqrt(calculateMean(squaredErrors));

  // Mean Absolute Error
  const absoluteErrors = actualValues.map((actual, index) =>
    Math.abs(actual - predictedValues[index]),
  );
  const mae = calculateMean(absoluteErrors);

  // Accuracy as percentage (1 - normalized RMSE)
  const actualRange = Math.max(...actualValues) - Math.min(...actualValues);
  const normalizedRmse = actualRange > 0 ? rmse / actualRange : 0;
  const accuracy = Math.max(0, Math.min(100, (1 - normalizedRmse) * 100));

  return {
    mape: isFinite(mape) ? mape : 0,
    rmse,
    mae,
    accuracy,
  };
}
