'use client';

import Link from 'next/link';

type PatternInsightCardProps = {
  pattern: any;
  onViewDetails: (pattern: any) => void;
  onTrack: (pattern: any) => Promise<void>;
};

const PatternInsightCard = ({
  pattern,
  onViewDetails,
  onTrack,
}: PatternInsightCardProps) => {
  const handleClick = async () => {
    await onTrack(pattern);
    onViewDetails(pattern);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{pattern.behaviorType}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          pattern.strength >= 80
            ? 'bg-green-100 text-green-800'
            : pattern.strength >= 60
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
        }`}
        >
          {pattern.strength}
          % strong
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Frequency</span>
          <span>
            {pattern.frequency}
            x/week
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Consistency</span>
          <span>
            {pattern.consistency}
            %
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Confidence</span>
          <span>
            {pattern.confidence}
            %
          </span>
        </div>
      </div>
      {pattern.topTrigger && (
        <div className="mt-2 text-xs text-gray-500">
          Top trigger:
          {' '}
          {pattern.topTrigger}
        </div>
      )}
    </div>
  );
};

type PatternsSectionProps = {
  patterns: any[];
  isAnalyzing: boolean;
  onPatternDetails: (pattern: any) => void;
  trackPatternInsightView: (pattern: any) => Promise<void>;
};

export const PatternsSection = ({
  patterns,
  isAnalyzing,
  onPatternDetails,
  trackPatternInsightView,
}: PatternsSectionProps) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Pattern Insights</h3>
        <Link
          href="/dashboard/analytics/patterns"
          className="text-purple-600 hover:text-purple-800 text-sm font-medium"
        >
          View All Patterns
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patterns.slice(0, 6).map(pattern => (
          <PatternInsightCard
            key={pattern.id}
            pattern={pattern}
            onViewDetails={onPatternDetails}
            onTrack={trackPatternInsightView}
          />
        ))}
        {patterns.length === 0 && !isAnalyzing && (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">No patterns detected yet. Keep tracking your behaviors!</p>
          </div>
        )}
        {isAnalyzing && (
          <div className="col-span-full text-center py-8">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
              <span className="text-gray-600">Analyzing patterns...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};