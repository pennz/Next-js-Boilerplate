'use client';

import Link from 'next/link';

type BehaviorAnalyticsHeaderProps = {
  showRealTimeUpdates: boolean;
  loading: boolean;
  lastUpdate: Date | null;
};

const RealtimeIndicator = ({
  isActive,
  lastUpdate,
}: {
  isActive: boolean;
  lastUpdate: Date | null;
}) => (
  <div className="flex items-center gap-2 text-sm text-gray-600">
    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
    <span>
      {isActive ? 'Live' : 'Offline'}
      {lastUpdate && ` • Updated ${lastUpdate.toLocaleTimeString()}`}
    </span>
  </div>
);

export const BehaviorAnalyticsHeader = ({
  showRealTimeUpdates,
  loading,
  lastUpdate,
}: BehaviorAnalyticsHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Behavior Analytics</h2>
        <p className="text-gray-600">Real-time insights into your habits and patterns</p>
      </div>
      <div className="flex items-center gap-4">
        {showRealTimeUpdates && (
          <RealtimeIndicator isActive={!loading} lastUpdate={lastUpdate} />
        )}
        <Link
          href="/dashboard/analytics/behavior"
          className="text-purple-700 hover:border-b-2 hover:border-purple-700 font-medium"
        >
          View Full Analytics →
        </Link>
      </div>
    </div>
  );
};