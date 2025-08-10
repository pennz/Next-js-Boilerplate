'use client';

import Link from 'next/link';
import type { HealthGoal } from './HealthOverviewContainer';

const GoalProgressCard = ({ goal, onGoalProgressView }: { 
  goal: HealthGoal; 
  onGoalProgressView: () => void;
}) => {
  const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
  const isCompleted = goal.status === 'completed';

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={onGoalProgressView}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onGoalProgressView();
        }
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">
          {goal.type}
          {' '}
          Goal
        </h4>
        {isCompleted && <span className="text-green-500 text-sm">✓ Completed</span>}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>
            {Math.round(progress)}
            %
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            Current:
            {goal.current_value}
          </span>
          <span>
            Target:
            {goal.target_value}
          </span>
        </div>
      </div>
    </div>
  );
};

type GoalsSectionProps = {
  activeGoals: HealthGoal[];
  trackGoalProgressView: (goal: HealthGoal) => void;
};

export const GoalsSection = ({ activeGoals, trackGoalProgressView }: GoalsSectionProps) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="health-overview-active-goals">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Goal Progress</h3>
        <Link
          href="/dashboard/health/goals"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Manage
        </Link>
      </div>
      <div className="space-y-4">
        {activeGoals.length > 0
          ? (
              activeGoals.map(goal => (
                <GoalProgressCard
                  key={goal.id}
                  goal={goal}
                  onGoalProgressView={() => trackGoalProgressView(goal)}
                />
              ))
            )
          : (
              <p className="text-gray-500 text-center py-4">No active goals</p>
            )}
      </div>
    </div>
  );
};