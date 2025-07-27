// Health Summary Metric Types
export type TrendDirection = 'up' | 'down' | 'neutral';

export type HealthSummaryMetric = {
  id: string;
  label: string;
  value: number;
  unit: string;
  previousValue?: number;
  goalTarget?: number;
  goalCurrent?: number;
  icon?: string;
};

export type HealthSummaryCardsProps = {
  metrics: HealthSummaryMetric[];
  className?: string;
};

// Helper types for trend calculations
export type TrendData = {
  direction: TrendDirection;
  percentage: number;
  isImprovement: boolean;
};

export type GoalProgress = {
  percentage: number;
  isCompleted: boolean;
  remaining: number;
};

// Prediction-related types
export type PredictionAlgorithm = 'linear-regression' | 'moving-average';

export type PredictedDataPoint = {
  date: string;
  value: number;
  unit?: string;
  label?: string;
  isPrediction: boolean;
  confidenceUpper?: number;
  confidenceLower?: number;
  algorithm?: PredictionAlgorithm;
};

export type PredictionResult = {
  predictions: PredictedDataPoint[];
  accuracy: number;
  algorithm: PredictionAlgorithm;
  confidenceLevel: number;
};

export type HealthPredictiveChartProps = {
  data: PredictedDataPoint[];
  algorithm?: PredictionAlgorithm;
  predictionHorizon?: number;
  showConfidenceInterval?: boolean;
  title?: string;
  height?: number;
  width?: string;
  color?: string;
  predictionColor?: string;
  confidenceColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  goalValue?: number;
  loading?: boolean;
  error?: string;
  className?: string;
  unit?: string;
  onAlgorithmChange?: (algorithm: PredictionAlgorithm) => void;
  onPredictionHorizonChange?: (horizon: number) => void;
  onConfidenceToggle?: (show: boolean) => void;
  formatTooltip?: (value: number, name: string) => [string, string];
  formatXAxis?: (value: string) => string;
  formatYAxis?: (value: number) => string;
};

// Radar Chart Types
export type ScoringSystem = 'percentage' | 'z-score' | 'custom';

export type HealthRadarMetric = {
  category: string;
  value: number;
  maxValue: number;
  unit: string;
  score: number; // normalized 0-100
  color?: string;
  icon?: string;
};

export type RadarChartData = {
  metrics: HealthRadarMetric[];
  timestamp?: string;
  label?: string;
};

export type RadarChartConfig = {
  gridLevels?: number;
  angleAxisConfig?: {
    tick?: boolean;
    tickLine?: boolean;
    axisLine?: boolean;
    fontSize?: number;
  };
  radiusAxisConfig?: {
    tick?: boolean;
    tickLine?: boolean;
    axisLine?: boolean;
    domain?: [number, number];
  };
  colorScheme?: {
    excellent?: string; // 80-100
    good?: string; // 60-79
    fair?: string; // 40-59
    poor?: string; // 0-39
  };
  size?: 'small' | 'medium' | 'large';
};

export type HealthRadarChartProps = {
  data: RadarChartData[];
  scoringSystem?: ScoringSystem;
  config?: RadarChartConfig;
  title?: string;
  subtitle?: string;
  height?: number;
  width?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  showScoreLegend?: boolean;
  loading?: boolean;
  error?: string;
  className?: string;
  // Accessibility options
  ariaLabel?: string;
  ariaDescription?: string;
  // Event handlers
  onMetricHover?: (metric: HealthRadarMetric | null) => void;
  onScoringSystemChange?: (system: ScoringSystem) => void;
  onConfigChange?: (config: RadarChartConfig) => void;
  // Custom formatting
  formatTooltip?: (metric: HealthRadarMetric) => string;
  formatScore?: (score: number) => string;
};
