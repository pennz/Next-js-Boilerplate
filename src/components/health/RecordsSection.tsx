'use client';

import Link from 'next/link';
import type { HealthRecord } from './HealthOverviewContainer';

const RecentRecordItem = ({ record, onRecordView }: { 
  record: HealthRecord; 
  onRecordView: () => void;
}) => {
  const recordDate = new Date(record.recorded_at);
  const timeAgo = Math.floor((Date.now() - recordDate.getTime()) / (1000 * 60 * 60));

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors rounded px-2"
      onClick={onRecordView}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRecordView();
        }
      }}
    >
      <div>
        <p className="font-medium text-gray-900">{record.type}</p>
        <p className="text-sm text-gray-500">
          {timeAgo}
          h ago
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium text-gray-900">
          {record.value}
          {' '}
          {record.unit}
        </p>
      </div>
    </div>
  );
};

type RecordsSectionProps = {
  recentRecords: HealthRecord[];
  trackRecordView: (record: HealthRecord) => void;
};

export const RecordsSection = ({ recentRecords, trackRecordView }: RecordsSectionProps) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="health-overview-recent-records">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Records</h3>
        <Link
          href="/dashboard/health/records"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View All
        </Link>
      </div>
      <div className="space-y-1">
        {recentRecords.length > 0
          ? (
              recentRecords.map(record => (
                <RecentRecordItem
                  key={record.id}
                  record={record}
                  onRecordView={() => trackRecordView(record)}
                />
              ))
            )
          : (
              <p className="text-gray-500 text-center py-4">No recent records</p>
            )}
      </div>
    </div>
  );
};