'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export interface HealthGoal {
  id: number;
  type_id: number;
  type_name: string;
  type_unit: string;
  target_value: number;
  current_value?: number;
  target_date: string;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

interface GoalCardProps {
  goal: HealthGoal;
  onEdit?: (goal: HealthGoal) => void;
  onDelete?: (goalId: number) => void;
  onStatusChange?: (goalId: number, status: HealthGoal['status']) => void;
  className?: string;
}

export const GoalCard = ({
  goal,
  onEdit,
  onDelete,
  onStatusChange,
  className = '',
}: GoalCardProps) => {
  const t = useTranslations('HealthManagement');
  const [isDeleting, setIsDeleting] = useState(false);

  const calculateProgress = (): number => {
    if (!goal.current_value || goal.target_value === 0) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const calculateDaysRemaining = (): number => {
    const targetDate = new Date(goal.target_date);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadgeClass = (status: HealthGoal['status']): string => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressBarColor = (progress: number): string => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(goal.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const progress = calculateProgress();
  const daysRemaining = calculateDaysRemaining();
  const isOverdue = daysRemaining < 0;
  const isCompleted = goal.status === 'completed';

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {goal.type_name} {t('goal')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('target')}: {goal.target_value} {goal.type_unit}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(
            goal.status
          )}`}
        >
          {t(`status_${goal.status}`)}
        </span>
      </div>

      {/* Progress Section */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {t('progress')}
          </span>
          <span className="text-sm text-gray-600">
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(
              progress
            )}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        {goal.current_value && (
          <p className="mt-1 text-xs text-gray-500">
            {t('current')}: {goal.current_value} {goal.type_unit}
          </p>
        )}
      </div>

      {/* Deadline Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {t('deadline')}
          </span>
          <span
            className={`text-sm ${
              isOverdue
                ? 'text-red-600 font-medium'
                : daysRemaining <= 7
                ? 'text-yellow-600 font-medium'
                : 'text-gray-600'
            }`}
          >
            {isOverdue
              ? t('overdue_by_days', { days: Math.abs(daysRemaining) })
              : daysRemaining === 0
              ? t('due_today')
              : daysRemaining === 1
              ? t('due_tomorrow')
              : t('days_remaining', { days: daysRemaining })}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {new Date(goal.target_date).toLocaleDateString()}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <div className="flex space-x-2">
          {goal.status === 'active' && (
            <button
              onClick={() => onStatusChange?.(goal.id, 'paused')}
              className="rounded bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 hover:bg-yellow-200 transition-colors"
            >
              {t('button_pause')}
            </button>
          )}
          {goal.status === 'paused' && (
            <button
              onClick={() => onStatusChange?.(goal.id, 'active')}
              className="rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200 transition-colors"
            >
              {t('button_resume')}
            </button>
          )}
          {!isCompleted && progress >= 100 && (
            <button
              onClick={() => onStatusChange?.(goal.id, 'completed')}
              className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-200 transition-colors"
            >
              {t('button_complete')}
            </button>
          )}
        </div>

        <div className="flex space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(goal)}
              className="text-blue-700 hover:text-blue-900 transition-colors"
              title={t('button_edit')}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-700 hover:text-red-900 disabled:opacity-50 transition-colors"
              title={t('button_delete')}
            >
              {isDeleting ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Achievement Badge for Completed Goals */}
      {isCompleted && (
        <div className="mt-4 flex items-center justify-center rounded-lg bg-green-50 p-3">
          <svg
            className="mr-2 h-5 w-5 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium text-green-800">
            {t('goal_achieved')}
          </span>
        </div>
      )}
    </div>
  );
};