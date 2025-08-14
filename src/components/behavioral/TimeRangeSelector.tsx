'use client';

type TimeRange = '7d' | '30d' | '90d' | '1y';

type TimeRangeSelectorProps = {
  selectedTimeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
};

export const TimeRangeSelector = ({
  selectedTimeRange,
  onTimeRangeChange,
}: TimeRangeSelectorProps) => {
  return (
    <div className="flex gap-2">
      {(['7d', '30d', '90d', '1y'] as const).map(range => (
        <button
          key={range}
          type="button"
          onClick={() => onTimeRangeChange(range)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            selectedTimeRange === range
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );
};