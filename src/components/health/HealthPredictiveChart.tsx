'use client';

import type {
  HealthPredictiveChartProps,
  PredictedDataPoint,
  PredictionAlgorithm,
  PredictionResult,
} from './types';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import {
  dateToNumeric,
  generateConfidenceInterval,
  generateFuturePredictions,
  linearRegression,
  movingAverage,
  transformHealthDataForRegression,
} from '@/utils/statistics';

const LoadingSpinner = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-center">
      <div className="mb-2 text-4xl text-gray-400">📊</div>
      <p className="text-gray-500">{message}</p>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-center">
      <div className="mb-2 text-4xl text-red-400">⚠️</div>
      <p className="text-red-500">{message}</p>
    </div>
  </div>
);

const AlgorithmToggle = ({
  algorithm,
  onAlgorithmChange,
  disabled = false,
}: {
  algorithm: PredictionAlgorithm;
  onAlgorithmChange: (algorithm: PredictionAlgorithm) => void;
  disabled?: boolean;
}) => {
  const t = useTranslations('HealthManagement');

  return (
    <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
      <button
        type="button"
        onClick={() => onAlgorithmChange('linear-regression')}
        disabled={disabled}
        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          algorithm === 'linear-regression'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        aria-pressed={algorithm === 'linear-regression'}
      >
        {t('algorithm_linear_regression')}
      </button>
      <button
        type="button"
        onClick={() => onAlgorithmChange('moving-average')}
        disabled={disabled}
        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          algorithm === 'moving-average'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        aria-pressed={algorithm === 'moving-average'}
      >
        {t('algorithm_moving_average')}
      </button>
    </div>
  );
};

const AccuracyBadge = ({ accuracy }: { accuracy: number }) => {
  const getAccuracyColor = (acc: number) => {
    if (acc >= 80) {
      return 'bg-green-100 text-green-800';
    }
    if (acc >= 60) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getAccuracyColor(accuracy)}`}>
      <span className="mr-1">📈</span>
      {accuracy.toFixed(1)}
      % accurate
    </div>
  );
};

export const HealthPredictiveChart = ({
  data = [],
  algorithm: initialAlgorithm = 'linear-regression',
  predictionHorizon = 7,
  showConfidenceInterval = true,
  title,
  height = 400,
  width = '100%',
  color = '#3b82f6',
  predictionColor = '#f59e0b',
  confidenceColor = '#f59e0b',
  showGrid = true,
  showLegend = true,
  goalValue,
  loading = false,
  error,
  className = '',
  unit = '',
  onAlgorithmChange,
  onPredictionHorizonChange,
  onConfidenceToggle,
  formatTooltip,
  formatXAxis,
  formatYAxis,
}: HealthPredictiveChartProps) => {
  const t = useTranslations('HealthManagement');
  const { trackEvent } = useBehaviorTracking();

  // Internal state
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<PredictionAlgorithm>(initialAlgorithm);
  const [showConfidence, setShowConfidence] = useState(showConfidenceInterval);

  // Filter historical data (non-prediction points)
  const historicalData = useMemo(() => {
    return data.filter(point => !point.isPrediction);
  }, [data]);

  // Compute predictions using the selected algorithm
  const predictionResult = useMemo((): PredictionResult | null => {
    if (historicalData.length < 3) {
      return null;
    }

    try {
      const predictions: PredictedDataPoint[] = [];
      let accuracy = 0;

      if (selectedAlgorithm === 'linear-regression') {
        // Transform data for regression
        const regressionData = transformHealthDataForRegression(historicalData);
        const regressionResult = linearRegression(regressionData);

        // Generate future predictions
        const lastPoint = historicalData[historicalData.length - 1];
        const futurePredictions = generateFuturePredictions(
          regressionResult,
          lastPoint,
          predictionHorizon,
        );

        // Add confidence intervals
        futurePredictions.forEach((pred) => {
          const confidenceInterval = generateConfidenceInterval(pred.value, {
            confidenceLevel: 0.95,
            residualStandardDeviation: regressionResult.residualStandardDeviation,
            sampleSize: historicalData.length,
          });

          predictions.push({
            ...pred,
            algorithm: 'linear-regression',
            confidenceUpper: confidenceInterval.upper,
            confidenceLower: Math.max(0, confidenceInterval.lower), // Ensure non-negative
            unit,
          });
        });

        // Calculate accuracy based on R-squared
        accuracy = regressionResult.rSquared * 100;
      } else if (selectedAlgorithm === 'moving-average') {
        // Use moving average for predictions
        const values = historicalData.map(point => point.value);
        const windowSize = Math.min(5, Math.floor(historicalData.length / 2));
        const movingAverages = movingAverage(values, windowSize);
        const lastAverage = movingAverages[movingAverages.length - 1];

        // Generate predictions based on last moving average
        const lastPoint = historicalData[historicalData.length - 1];
        const lastTimestamp = dateToNumeric(lastPoint.date);
        const oneDayMs = 24 * 60 * 60 * 1000;

        for (let i = 1; i <= predictionHorizon; i++) {
          const futureTimestamp = lastTimestamp + (i * oneDayMs);
          const futureDate = new Date(futureTimestamp).toISOString();

          // Simple confidence interval based on historical variance
          const variance = values.reduce((sum, val) => sum + (val - lastAverage) ** 2, 0) / values.length;
          const stdDev = Math.sqrt(variance);
          const marginOfError = 1.96 * stdDev; // 95% confidence

          predictions.push({
            date: futureDate,
            value: Math.max(0, lastAverage),
            isPrediction: true,
            algorithm: 'moving-average',
            confidenceUpper: lastAverage + marginOfError,
            confidenceLower: Math.max(0, lastAverage - marginOfError),
            unit,
          });
        }

        // Calculate accuracy based on how well moving average fits recent data
        const recentValues = values.slice(-windowSize);
        const recentAverage = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
        const avgError = recentValues.reduce((sum, val) => sum + Math.abs(val - recentAverage), 0) / recentValues.length;
        const avgValue = recentAverage;
        accuracy = Math.max(0, (1 - avgError / avgValue) * 100);
      }

      return {
        predictions,
        accuracy,
        algorithm: selectedAlgorithm,
        confidenceLevel: 95,
      };
    } catch (err) {
      console.error('Error computing predictions:', err);
      return null;
    }
  }, [historicalData, selectedAlgorithm, predictionHorizon, unit]);

  // Combine historical and prediction data for chart
  const chartData = useMemo(() => {
    const combined = [...historicalData];

    if (predictionResult) {
      combined.push(...predictionResult.predictions);
    }

    return combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [historicalData, predictionResult]);

  // Handle algorithm change
  const handleAlgorithmChange = (newAlgorithm: PredictionAlgorithm) => {
    setSelectedAlgorithm(newAlgorithm);
    onAlgorithmChange?.(newAlgorithm);

    trackEvent({
      eventName: 'prediction_algorithm_changed',
      entityType: 'health_chart',
      context: {
        algorithm: newAlgorithm,
        dataPoints: historicalData.length,
      },
    });
  };

  // Handle confidence interval toggle
  const handleConfidenceToggle = () => {
    const newShowConfidence = !showConfidence;
    setShowConfidence(newShowConfidence);
    onConfidenceToggle?.(newShowConfidence);

    trackEvent({
      eventName: 'confidence_interval_toggled',
      entityType: 'health_chart',
      context: {
        show: newShowConfidence,
        algorithm: selectedAlgorithm,
      },
    });
  };

  // Handle loading state
  if (loading) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        {title && (
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <LoadingSpinner />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        {title && (
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <ErrorState message={error} />
      </div>
    );
  }

  // Handle empty data state
  if (!historicalData || historicalData.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        {title && (
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <EmptyState message={t('analytics_empty_state')} />
      </div>
    );
  }

  // Handle insufficient data for predictions
  if (historicalData.length < 3) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        {title && (
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <EmptyState message={t('insufficient_data_prediction')} />
      </div>
    );
  }

  // Default formatters
  const defaultTooltipFormatter = (value: number, name: string) => {
    const formattedValue = unit ? `${value.toFixed(1)} ${unit}` : value.toFixed(1);
    return [formattedValue, name];
  };

  const defaultXAxisFormatter = (value: string) => {
    try {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return value;
    }
  };

  const defaultYAxisFormatter = (value: number) => {
    return unit ? `${value.toFixed(0)} ${unit}` : value.toFixed(0);
  };

  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHistorical = !data.isPrediction;

      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-gray-900">
            {defaultXAxisFormatter(label)}
          </p>
          <div className="mt-1 space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center text-sm">
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">
                  {entry.name}
                  :
                </span>
                <span className="ml-1 font-medium">
                  {formatTooltip ? formatTooltip(entry.value, entry.name)[0] : defaultTooltipFormatter(entry.value, entry.name)[0]}
                </span>
              </div>
            ))}
            {!isHistorical && (
              <p className="mt-1 text-xs text-gray-500">
                Predicted (
                {selectedAlgorithm}
                )
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {predictionResult && (
            <AccuracyBadge accuracy={predictionResult.accuracy} />
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Confidence interval toggle */}
          <button
            type="button"
            onClick={handleConfidenceToggle}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-pressed={showConfidence}
          >
            <span className={`h-2 w-2 rounded-full ${showConfidence ? 'bg-blue-500' : 'bg-gray-300'}`} />
            {t('chart_confidence_interval')}
          </button>

          {/* Algorithm toggle */}
          <AlgorithmToggle
            algorithm={selectedAlgorithm}
            onAlgorithmChange={handleAlgorithmChange}
          />
        </div>
      </div>

      {/* Chart */}
      <div style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}

            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis || defaultXAxisFormatter}
              stroke="#6b7280"
              fontSize={12}
            />

            <YAxis
              tickFormatter={formatYAxis || defaultYAxisFormatter}
              stroke="#6b7280"
              fontSize={12}
            />

            <Tooltip content={<CustomTooltip />} />

            {showLegend && <Legend />}

            {/* Goal reference line */}
            {goalValue && (
              <ReferenceLine
                y={goalValue}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: `Goal: ${goalValue} ${unit}`, position: 'topRight' }}
              />
            )}

            {/* Confidence interval area */}
            {showConfidence && predictionResult && (
              <Area
                type="monotone"
                dataKey="confidenceUpper"
                stroke="none"
                fill={confidenceColor}
                fillOpacity={0.1}
                connectNulls={false}
              />
            )}

            {/* Historical data line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={(props: any) => {
                const { payload } = props;
                if (payload.isPrediction) {
                  return null;
                }
                return <circle {...props} fill={color} strokeWidth={2} r={4} />;
              }}
              connectNulls={false}
              name={t('historical_data')}
            />

            {/* Prediction line */}
            <Line
              type="monotone"
              dataKey={(entry: any) => entry.isPrediction ? entry.value : null}
              stroke={predictionColor}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={(props: any) => {
                const { payload } = props;
                if (!payload.isPrediction) {
                  return null;
                }
                return <circle {...props} fill={predictionColor} strokeWidth={2} r={4} />;
              }}
              connectNulls={true}
              name={t('prediction_data')}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer info */}
      <div className="mt-3 flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {historicalData.length}
          {' '}
          historical data points •
          {predictionResult?.predictions.length || 0}
          {' '}
          predictions
        </div>
        <div>
          {t('prediction_disclaimer')}
        </div>
      </div>
    </div>
  );
};
