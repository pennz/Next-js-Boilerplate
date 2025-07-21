'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

// Types for health reminder data
type HealthType = {
  id: number;
  slug: string;
  display_name: string;
  unit: string;
};

type HealthReminder = {
  id: number;
  user_id: string;
  type_id: number;
  cron_expr: string;
  message: string;
  active: boolean;
  next_run_at: string;
  created_at: string;
  updated_at: string;
  health_type?: HealthType;
};

type ReminderListProps = {
  reminders: HealthReminder[];
  onToggleActive: (id: number, active: boolean) => Promise<void>;
  onEdit: (reminder: HealthReminder) => void;
  onDelete: (id: number) => Promise<void>;
  loading?: boolean;
};

type DeleteConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reminderMessage: string;
};

// Helper function to convert cron expression to human-readable format
const cronToHumanReadable = (cronExpr: string): string => {
  // Basic cron parsing for common patterns
  const parts = cronExpr.split(' ');
  if (parts.length !== 5) {
    return cronExpr;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Daily at specific time
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    if (minute === '0' && hour !== '*') {
      return `Daily at ${hour}:00`;
    }
    if (minute !== '*' && hour !== '*') {
      return `Daily at ${hour}:${minute.padStart(2, '0')}`;
    }
  }

  // Weekly patterns
  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[Number.parseInt(dayOfWeek)] || `Day ${dayOfWeek}`;
    if (minute === '0' && hour !== '*') {
      return `Weekly on ${dayName} at ${hour}:00`;
    }
    if (minute !== '*' && hour !== '*') {
      return `Weekly on ${dayName} at ${hour}:${minute.padStart(2, '0')}`;
    }
  }

  // Monthly patterns
  if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
    if (minute === '0' && hour !== '*') {
      return `Monthly on day ${dayOfMonth} at ${hour}:00`;
    }
    if (minute !== '*' && hour !== '*') {
      return `Monthly on day ${dayOfMonth} at ${hour}:${minute.padStart(2, '0')}`;
    }
  }

  return cronExpr; // Fallback to raw cron expression
};

// Helper function to format next run time
const formatNextRun = (nextRunAt: string): string => {
  const nextRun = new Date(nextRunAt);
  const now = new Date();
  const diffMs = nextRun.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'Overdue';
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }

  if (diffHours > 0) {
    return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return `In ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  reminderMessage,
}) => {
  const t = useTranslations('HealthManagement');

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('delete_reminder_title')}
        </h3>
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            {t('delete_reminder_message')}
          </p>
          <div className="bg-gray-100 p-3 rounded border">
            <p className="text-sm font-medium text-gray-800">
              "
              {reminderMessage}
              "
            </p>
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
          >
            {t('button_cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
          >
            {t('button_delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Toggle Switch Component
type ToggleSwitchProps = {
  isOn: boolean;
  onToggle: (isOn: boolean) => void;
  disabled?: boolean;
  label?: string;
};

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ isOn, onToggle, disabled = false, label }) => {
  return (
    <div className="flex items-center">
      {label && <span className="mr-2 text-sm text-gray-700">{label}</span>}
      <button
        onClick={() => !disabled && onToggle(!isOn)}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOn ? 'bg-blue-600' : 'bg-gray-300'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${isOn ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
};

// Main ReminderList Component
export const ReminderList: React.FC<ReminderListProps> = ({
  reminders,
  onToggleActive,
  onEdit,
  onDelete,
  loading = false,
}) => {
  const t = useTranslations('HealthManagement');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    reminder: HealthReminder | null;
  }>({ isOpen: false, reminder: null });
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);

  const handleToggleActive = async (reminder: HealthReminder) => {
    setToggleLoading(reminder.id);
    try {
      await onToggleActive(reminder.id, !reminder.active);
    } finally {
      setToggleLoading(null);
    }
  };

  const handleDeleteClick = (reminder: HealthReminder) => {
    setDeleteModal({ isOpen: true, reminder });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.reminder) {
      await onDelete(deleteModal.reminder.id);
      setDeleteModal({ isOpen: false, reminder: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, reminder: null });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array.from({ length: 3 })].map((_, index) => (
          <div key={index} className="bg-white rounded-lg border p-4 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-6xl mb-4">⏰</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('no_reminders_title')}
        </h3>
        <p className="text-gray-600">
          {t('no_reminders_message')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {reminders.map(reminder => (
          <div
            key={reminder.id}
            className={`
              bg-white rounded-lg border p-4 transition-all
              ${reminder.active ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}
            `}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-medium text-gray-900">
                    {reminder.health_type?.display_name || `Type ${reminder.type_id}`}
                  </h3>
                  <span
                    className={`
                      px-2 py-1 text-xs rounded-full
                      ${reminder.active
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-600'
          }
                    `}
                  >
                    {reminder.active ? t('status_active') : t('status_inactive')}
                  </span>
                </div>

                <p className="text-gray-700 mb-2">
                  "
                  {reminder.message}
                  "
                </p>

                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center space-x-4">
                    <span>
                      <strong>
                        {t('label_frequency')}
                        :
                      </strong>
                      {' '}
                      {cronToHumanReadable(reminder.cron_expr)}
                    </span>
                  </div>

                  {reminder.active && (
                    <div className="flex items-center space-x-4">
                      <span>
                        <strong>
                          {t('label_next_run')}
                          :
                        </strong>
                        {' '}
                        {formatNextRun(reminder.next_run_at)}
                      </span>
                      <span className="text-xs text-gray-500">
                        (
                        {new Date(reminder.next_run_at).toLocaleString()}
                        )
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 ml-4">
                <ToggleSwitch
                  isOn={reminder.active}
                  onToggle={() => handleToggleActive(reminder)}
                  disabled={toggleLoading === reminder.id}
                  label={t('label_active')}
                />

                <button
                  onClick={() => onEdit(reminder)}
                  className="px-3 py-1 text-sm text-blue-600 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                >
                  {t('button_edit')}
                </button>

                <button
                  onClick={() => handleDeleteClick(reminder)}
                  className="px-3 py-1 text-sm text-red-600 bg-red-100 rounded hover:bg-red-200 transition-colors"
                >
                  {t('button_delete')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        reminderMessage={deleteModal.reminder?.message || ''}
      />
    </>
  );
};
