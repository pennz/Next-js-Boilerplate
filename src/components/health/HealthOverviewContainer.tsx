'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { HealthOverviewLayout } from './HealthOverviewLayout';
// Type definitions for health data
export type HealthRecord = {
  id: number;
  typeId: number;
  type: string;
  value: number;
  unit: string;
  recorded_at: string;
  createdAt: string;
  healthType?: {
    id: number;
    slug: string;
    displayName: string;
    unit: string;
  };
};

export type HealthGoal = {
  id: number;
  typeId: number;
  type: string;
  target_value: number;
  current_value: number;
  target_date: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
  healthType?: {
    id: number;
    slug: string;
    displayName: string;
    unit: string;
  };
  progressPercentage?: number;
  daysRemaining?: number;
  isOverdue?: boolean;
  lastRecordedAt?: string | null;
};

export type HealthStats = {
  totalRecords: number;
  activeGoals: number;
  completedGoals: number;
  weeklyProgress: number;
};

// API response types matching the server component structure
type RecentRecordRaw = {
  id: number;
  typeId: number;
  value: number;
  unit: string;
  recordedAt: string;
  createdAt: string;
  healthType: {
    id: number;
    slug: string;
    displayName: string;
    unit: string;
  };
};

type ActiveGoalRaw = {
  id: number;
  typeId: number;
  targetValue: number;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
  healthType: {
    id: number;
    slug: string;
    displayName: string;
    unit: string;
  };
  currentValue: number;
  progressPercentage: number;
  daysRemaining: number;
  isOverdue: boolean;
  lastRecordedAt: string | null;
};

type StatsResponse = {
  stats: {
    totalRecords: number;
    activeGoals: number;
    completedGoals: number;
    weeklyProgress: number;
    weeklyRecords: number;
    previousWeekRecords: number;
  };
};

export const HealthOverviewContainer = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [recentRecords, setRecentRecords] = useState<HealthRecord[]>([]);
  const [activeGoals, setActiveGoals] = useState<HealthGoal[]>([]);
  const [stats, setStats] = useState<HealthStats>({
    totalRecords: 0,
    activeGoals: 0,
    completedGoals: 0,
    weeklyProgress: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealthData = async () => {
      if (!isUserLoaded || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch recent records
        const recentRecordsResponse = await fetch('/api/health/recent-records');
        if (!recentRecordsResponse.ok) {
          throw new Error('Failed to fetch recent records');
        }
        const recentRecordsData = await recentRecordsResponse.json();
        
        const transformedRecentRecords: HealthRecord[] = recentRecordsData.records.map(r => ({
          id: r.id,
 typeId: r.typeId,
          type: r.healthType?.slug || 'unknown',
          value: Number(r.value),
          unit: r.unit,
          recorded_at: r.recordedAt,
          createdAt: r.createdAt,
          healthType: r.healthType,
        }));
        setRecentRecords(transformedRecentRecords);

        // Fetch active goals
        const activeGoalsResponse = await fetch('/api/health/active-goals');
        if (!activeGoalsResponse.ok) {
          throw new Error('Failed to fetch active goals');
        }
        const activeGoalsData = await activeGoalsResponse.json();
        
        const transformedActiveGoals: HealthGoal[] = activeGoalsData.goals.map(goal => ({
          id: goal.id,
          typeId: goal.typeId,
          type: goal.healthType?.slug || 'unknown',
          target_value: Number(goal.targetValue),
          current_value: Number(goal.currentValue),
          target_date: goal.targetDate,
          status: goal.status,
          createdAt: goal.createdAt,
          updatedAt: goal.updatedAt,
          healthType: goal.healthType,
          progressPercentage: goal.progressPercentage,
          daysRemaining: goal.daysRemaining,
          isOverdue: goal.isOverdue,
          lastRecordedAt: goal.lastRecordedAt,
        }));
        setActiveGoals(transformedActiveGoals);

        // Fetch stats
        const statsResponse = await fetch('/api/health/stats');
        if (!statsResponse.ok) {
          throw new Error('Failed to fetch health stats');
        }
        const statsData = await statsResponse.json();
        setStats(statsData.stats);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching health data';
        setError(errorMessage);
        console.error('Health data fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealthData();
  }, [isUserLoaded, user]);

  if (!isUserLoaded || !user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="health-overview-loading">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading health data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Health Data</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <HealthOverviewLayout
      recentRecords={recentRecords}
      activeGoals={activeGoals}
      stats={stats}
    />
  );
};