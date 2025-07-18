import { currentUser } from '@clerk/nextjs/server';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'HealthManagement',
  });

  return {
    title: t('page_title_goals'),
  };
}

// Mock health types for now - will be replaced with actual API call
const HEALTH_TYPES = [
  { id: 1, slug: 'weight', display_name: 'Weight', unit: 'kg' },
  { id: 2, slug: 'blood_pressure', display_name: 'Blood Pressure', unit: 'mmHg' },
  { id: 3, slug: 'steps', display_name: 'Daily Steps', unit: 'steps' },
  { id: 4, slug: 'sleep', display_name: 'Sleep Duration', unit: 'hours' },
  { id: 5, slug: 'water', display_name: 'Water Intake', unit: 'liters' },
];

// Mock goals data - will be replaced with actual API call
const MOCK_GOALS = [
  {
    id: 1,
    type_id: 1,
    target_value: 70,
    target_date: '2024-06-01',
    status: 'active',
    current_value: 72,
    created_at: '2024-01-01',
  },
  {
    id: 2,
    type_id: 3,
    target_value: 10000,
    target_date: '2024-12-31',
    status: 'active',
    current_value: 8500,
    created_at: '2024-01-15',
  },
  {
    id: 3,
    type_id: 4,
    target_value: 8,
    target_date: '2024-03-31',
    status: 'completed',
    current_value: 8,
    created_at: '2024-01-01',
  },
];

// Goal templates for common health objectives
const GOAL_TEMPLATES = [
  { type_id: 1, name: 'Lose 5kg', target_value: -5, duration_days: 90 },
  { type_id: 1, name: 'Maintain weight', target_value: 0, duration_days: 365 },
  { type_id: 3, name: '10,000 steps daily', target_value: 10000, duration_days: 30 },
  { type_id: 4, name: '8 hours sleep', target_value: 8, duration_days: 30 },
  { type_id: 5, name: '2L water daily', target_value: 2, duration_days: 30 },
];

function GoalCard({ goal, healthType, t }: { 
  goal: any; 
  healthType: any; 
  t: any;
}) {
  const progress = goal.current_value && goal.target_value 
    ? Math.min(100, Math.abs((goal.current_value / goal.target_value) * 100))
    : 0;
  
  const isOverdue = new Date(goal.target_date) < new Date() && goal.status === 'active';
  const daysLeft = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {healthType?.display_name} Goal
          </h3>
          <p className="text-sm text-gray-600">
            Target: {goal.target_value} {healthType?.unit}
          </p>
        </div>
        <div className="flex space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            goal.status === 'active' ? 'bg-green-100 text-green-800' :
            goal.status === 'completed' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {t(`status_${goal.status}`)}
          </span>
          {isOverdue && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
              Overdue
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              goal.status === 'completed' ? 'bg-green-500' :
              progress >= 80 ? 'bg-blue-500' :
              progress >= 50 ? 'bg-yellow-500' : 'bg-gray-400'
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Current vs Target */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Current</p>
          <p className="text-lg font-semibold">
            {goal.current_value || 0} {healthType?.unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Target Date</p>
          <p className="text-sm font-medium">
            {new Date(goal.target_date).toLocaleDateString()}
          </p>
          {daysLeft > 0 && goal.status === 'active' && (
            <p className="text-xs text-gray-500">{daysLeft} days left</p>
          )}
        </div>
      </div>

      {/* Achievement Celebration */}
      {goal.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🎉</span>
            <div>
              <p className="text-sm font-medium text-green-800">Goal Achieved!</p>
              <p className="text-xs text-green-600">Congratulations on reaching your target!</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
          Edit Goal
        </button>
        <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

function GoalTemplates({ templates, healthTypes, t }: {
  templates: any[];
  healthTypes: any[];
  t: any;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Goal Templates</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((template, index) => {
          const healthType = healthTypes.find(ht => ht.id === template.type_id);
          return (
            <button
              key={index}
              className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-gray-900">{template.name}</p>
              <p className="text-sm text-gray-600">
                {template.target_value} {healthType?.unit} in {template.duration_days} days
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreateGoalForm({ healthTypes, t }: {
  healthTypes: any[];
  t: any;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Goal</h3>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Health Metric
          </label>
          <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select a health metric</option>
            {healthTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.display_name} ({type.unit})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Value
          </label>
          <input
            type="number"
            step="0.1"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter target value"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Date
          </label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            {t('button_save_goal')}
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function GoalsStats({ goals, t }: { goals: any[]; t: any }) {
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const overdueGoals = goals.filter(g => 
    g.status === 'active' && new Date(g.target_date) < new Date()
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-full">
            <span className="text-2xl">🎯</span>
          </div>
          <div className="ml-4">
            <p className="text-2xl font-bold text-gray-900">{activeGoals}</p>
            <p className="text-sm text-gray-600">Active Goals</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-full">
            <span className="text-2xl">✅</span>
          </div>
          <div className="ml-4">
            <p className="text-2xl font-bold text-gray-900">{completedGoals}</p>
            <p className="text-sm text-gray-600">Completed Goals</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="p-3 bg-red-100 rounded-full">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="ml-4">
            <p className="text-2xl font-bold text-gray-900">{overdueGoals}</p>
            <p className="text-sm text-gray-600">Overdue Goals</p>
          </div>
        </div>
      </div>
    </div>
  );
}

async function GoalsContent() {
  const user = await currentUser();
  const t = await getTranslations('HealthManagement');

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please sign in to view your health goals.</p>
      </div>
    );
  }

  // In a real implementation, these would be API calls
  const goals = MOCK_GOALS;
  const healthTypes = HEALTH_TYPES;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('page_title_goals')}</h1>
          <p className="text-gray-600 mt-2">
            Track your health goals and monitor your progress over time.
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors">
          {t('button_add_goal')}
        </button>
      </div>

      {/* Goals Statistics */}
      <GoalsStats goals={goals} t={t} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Goals List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Your Goals</h2>
            <div className="flex space-x-2">
              <select className="border border-gray-300 rounded-md px-3 py-1 text-sm">
                <option value="all">All Goals</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          {goals.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200">
              <span className="text-6xl mb-4 block">🎯</span>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
              <p className="text-gray-600 mb-4">
                Start by creating your first health goal to track your progress.
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors">
                Create Your First Goal
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map(goal => {
                const healthType = healthTypes.find(ht => ht.id === goal.type_id);
                return (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    healthType={healthType} 
                    t={t}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Create Goal Form */}
          <CreateGoalForm healthTypes={healthTypes} t={t} />
          
          {/* Goal Templates */}
          <GoalTemplates 
            templates={GOAL_TEMPLATES} 
            healthTypes={healthTypes} 
            t={t} 
          />
        </div>
      </div>
    </div>
  );
}

export default function HealthGoalsPage() {
  return (
    <div className="py-5">
      <Suspense fallback={
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <GoalsContent />
      </Suspense>
    </div>
  );
}