// Export the main ExerciseOverview component
export { ExerciseOverview } from './ExerciseOverview';

// Export TypeScript interfaces and types for external use
export type {
  ExerciseLog,
  TrainingPlan,
  Stats,
  ExerciseOverviewProps,
} from './ExerciseOverview';

// Export test fixtures for use in other test files
export {
  mockExerciseLogs,
  emptyExerciseLogs,
  singleExerciseLog,
  richExerciseLogs,
  recentExerciseLogs,
  oldExerciseLogs,
  mockTrainingPlans,
  emptyTrainingPlans,
  activeTrainingPlans,
  inactiveTrainingPlans,
  beginnerPlans,
  intermediateAdvancedPlans,
  mockStats,
  emptyStats,
  highStats,
  trendingUpStats,
  trendingDownStats,
  neutralTrendStats,
  defaultExerciseOverviewData,
  emptyExerciseOverviewData,
  richExerciseOverviewData,
  minimalExerciseOverviewData,
  mockTrackingEvents,
  mockTrackingContext,
  mockDeviceInfo,
  mockEnvironmentInfo,
  mockTimestamps,
  recentTimestamps,
  futureTimestamps,
  pastTimestamps,
  invalidExerciseData,
  partialExerciseData,
  corruptedStats,
} from './ExerciseOverview.fixtures';

// Export utility functions for creating test data
export {
  generateExerciseLog,
  generateTrainingPlan,
  generateStats,
  createTimeAgoTimestamp,
  randomizeExerciseData,
  createExerciseOverviewProps,
  createMockBehaviorTracking,
  createTestScenario,
} from './ExerciseOverview.fixtures';

/**
 * Exercise component types and utilities
 * 
 * This module provides a comprehensive set of components, types, and utilities
 * for exercise and training plan management within the application.
 * 
 * @example
 * ```tsx
 * import { ExerciseOverview, type ExerciseOverviewProps } from '@/components/exercise';
 * 
 * const MyComponent = () => {
 *   const props: ExerciseOverviewProps = {
 *     recentLogs: [],
 *     activeTrainingPlans: [],
 *     stats: { totalExerciseLogs: 0, activePlans: 0, completedSessions: 0, weeklyProgress: 0 }
 *   };
 *   
 *   return <ExerciseOverview {...props} />;
 * };
 * ```
 */

/**
 * Main exercise overview component that displays workout statistics,
 * recent exercise logs, active training plans, and quick actions.
 * 
 * Features:
 * - Comprehensive exercise statistics display
 * - Recent workout logs with time calculations
 * - Active training plan management
 * - Quick action buttons for common tasks
 * - Progress chart placeholders
 * - Behavioral tracking integration
 * - Full keyboard accessibility support
 */

/**
 * Core data types for exercise tracking
 * 
 * @interface ExerciseLog - Represents a single exercise log entry
 * @interface TrainingPlan - Represents a training plan with difficulty and schedule
 * @interface Stats - Aggregated statistics for exercise overview
 * @interface ExerciseOverviewProps - Props for the main overview component
 */

/**
 * Test fixtures and mock data
 * 
 * Provides comprehensive mock data sets for testing exercise components:
 * - Exercise logs with various timestamps and data
 * - Training plans with different difficulties and states
 * - Statistics with various trends and values
 * - Behavioral tracking mock data
 * - Factory functions for generating custom test data
 */

/**
 * Utility functions for exercise data management
 * 
 * - Data generation functions for testing
 * - Time calculation utilities
 * - Mock data creation helpers
 * - Test scenario builders
 */