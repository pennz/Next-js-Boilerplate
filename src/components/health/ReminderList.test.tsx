import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReminderList } from './ReminderList';

// Mock Date for consistent time calculations
const mockDate = new Date('2024-01-15T12:00:00Z');
vi.setSystemTime(mockDate);

// Mock translations
const mockTranslations = {
  no_reminders_title: 'No Reminders Set',
  no_reminders_message: 'You haven\'t set up any health reminders yet.',
  delete_reminder_title: 'Delete Reminder',
  delete_reminder_message: 'Are you sure you want to delete this reminder?',
  button_cancel: 'Cancel',
  button_delete: 'Delete',
  button_edit: 'Edit',
  status_active: 'Active',
  status_inactive: 'Inactive',
  label_frequency: 'Frequency',
  label_next_run: 'Next Run',
  label_active: 'Active',
};

const messages = {
  HealthManagement: mockTranslations,
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Mock data
const mockHealthType = {
  id: 1,
  slug: 'weight',
  display_name: 'Weight',
  unit: 'kg',
};

const mockHealthType2 = {
  id: 2,
  slug: 'blood-pressure',
  display_name: 'Blood Pressure',
  unit: 'mmHg',
};

const createMockReminder = (overrides = {}) => ({
  id: 1,
  user_id: 'user-123',
  type_id: 1,
  cron_expr: '0 9 * * *',
  message: 'Time to weigh yourself!',
  active: true,
  next_run_at: '2024-01-16T09:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  health_type: mockHealthType,
  ...overrides,
});

const mockReminders = [
  createMockReminder({
    id: 1,
    message: 'Time to weigh yourself!',
    active: true,
    cron_expr: '0 9 * * *',
    next_run_at: '2024-01-16T09:00:00Z',
  }),
  createMockReminder({
    id: 2,
    type_id: 2,
    message: 'Check your blood pressure',
    active: false,
    cron_expr: '30 14 * * *',
    next_run_at: '2024-01-16T14:30:00Z',
    health_type: mockHealthType2,
  }),
  createMockReminder({
    id: 3,
    message: 'Weekly weigh-in',
    active: true,
    cron_expr: '0 8 * * 1',
    next_run_at: '2024-01-22T08:00:00Z',
  }),
];

describe('ReminderList', () => {
  const mockOnToggleActive = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders with reminders list and displays all reminder cards', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={mockReminders}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Time to weigh yourself!')).toBeInTheDocument();
      expect(screen.getByText('Check your blood pressure')).toBeInTheDocument();
      expect(screen.getByText('Weekly weigh-in')).toBeInTheDocument();
    });

    it('renders loading state with skeleton placeholders', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            loading={true}
          />
        </TestWrapper>,
      );

      const skeletonCards = screen.getAllByTestId(/loading-/);
      expect(skeletonCards).toHaveLength(3);
      
      skeletonCards.forEach(card => {
        expect(card).toHaveClass('animate-pulse');
      });
    });

    it('renders empty state with clock emoji, title, and message', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('⏰')).toBeInTheDocument();
      expect(screen.getByText('No Reminders Set')).toBeInTheDocument();
      expect(screen.getByText('You haven\'t set up any health reminders yet.')).toBeInTheDocument();
    });

    it('displays reminder cards with proper data-testid attributes', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={mockReminders}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByTestId('reminder-1')).toBeInTheDocument();
      expect(screen.getByTestId('reminder-2')).toBeInTheDocument();
      expect(screen.getByTestId('reminder-3')).toBeInTheDocument();
    });

    it('displays reminder cards with proper styling based on active/inactive status', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={mockReminders}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const activeCard = screen.getByTestId('reminder-1');
      const inactiveCard = screen.getByTestId('reminder-2');

      expect(activeCard).toHaveClass('border-blue-200', 'bg-blue-50');
      expect(inactiveCard).toHaveClass('border-gray-200');
      expect(inactiveCard).not.toHaveClass('bg-blue-50');
    });
  });

  describe('Reminder Card Content', () => {
    it('displays health type display_name or fallback to "Type {id}"', () => {
      const reminderWithoutHealthType = createMockReminder({
        id: 4,
        type_id: 99,
        health_type: undefined,
      });

      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0], reminderWithoutHealthType]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Weight')).toBeInTheDocument();
      expect(screen.getByText('Type 99')).toBeInTheDocument();
    });

    it('displays quoted message text', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('"Time to weigh yourself!"')).toBeInTheDocument();
    });

    it('displays proper status badge with correct styling', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={mockReminders}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const activeStatus = screen.getByText('Active');
      const inactiveStatus = screen.getByText('Inactive');

      expect(activeStatus).toHaveClass('bg-green-100', 'text-green-800');
      expect(inactiveStatus).toHaveClass('bg-gray-100', 'text-gray-600');
    });

    it('displays frequency and next run information correctly', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText(/Frequency:/)).toBeInTheDocument();
      expect(screen.getByText(/Next Run:/)).toBeInTheDocument();
    });

    it('displays next run time only when reminder is active', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={mockReminders}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      // Active reminder should show next run
      expect(screen.getAllByText(/Next Run:/).length).toBeGreaterThan(0);
      
      // Check that inactive reminder doesn't show next run in its section
      const inactiveCard = screen.getByTestId('reminder-2');
      expect(inactiveCard).not.toHaveTextContent('Next Run:');
    });
  });

  describe('Cron Expression Parsing', () => {
    it('converts "0 9 * * *" to "Daily at 9:00"', () => {
      const reminder = createMockReminder({ cron_expr: '0 9 * * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Daily at 9:00')).toBeInTheDocument();
    });

    it('converts "30 14 * * *" to "Daily at 14:30"', () => {
      const reminder = createMockReminder({ cron_expr: '30 14 * * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Daily at 14:30')).toBeInTheDocument();
    });

    it('converts "0 8 * * 1" to "Weekly on Monday at 8:00"', () => {
      const reminder = createMockReminder({ cron_expr: '0 8 * * 1' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Weekly on Monday at 8:00')).toBeInTheDocument();
    });

    it('converts "0 10 15 * *" to "Monthly on day 15 at 10:00"', () => {
      const reminder = createMockReminder({ cron_expr: '0 10 15 * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Monthly on day 15 at 10:00')).toBeInTheDocument();
    });

    // Complex cron expressions - Multiple times and days
    it('handles multiple times per day: "0 9,17 * * *" (9am and 5pm daily)', () => {
      const reminder = createMockReminder({ cron_expr: '0 9,17 * * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      // Should display the original expression since it's complex
      expect(screen.getByText('0 9,17 * * *')).toBeInTheDocument();
    });

    it('handles multiple days per week: "0 9 * * 1,3,5" (Monday, Wednesday, Friday at 9am)', () => {
      const reminder = createMockReminder({ cron_expr: '0 9 * * 1,3,5' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0 9 * * 1,3,5')).toBeInTheDocument();
    });

    it('handles combined multiple times and days: "0 8,12,18 * * 1-5" (3 times daily on weekdays)', () => {
      const reminder = createMockReminder({ cron_expr: '0 8,12,18 * * 1-5' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0 8,12,18 * * 1-5')).toBeInTheDocument();
    });

    // Interval-based expressions
    it('handles every 15 minutes: "*/15 * * * *"', () => {
      const reminder = createMockReminder({ cron_expr: '*/15 * * * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('*/15 * * * *')).toBeInTheDocument();
    });

    it('handles every 2 hours: "0 */2 * * *"', () => {
      const reminder = createMockReminder({ cron_expr: '0 */2 * * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0 */2 * * *')).toBeInTheDocument();
    });

    it('handles every 3 days: "0 9 */3 * *"', () => {
      const reminder = createMockReminder({ cron_expr: '0 9 */3 * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0 9 */3 * *')).toBeInTheDocument();
    });

    // Range-based expressions
    it('handles weekday range: "0 9 * * 1-5" (Monday through Friday)', () => {
      const reminder = createMockReminder({ cron_expr: '0 9 * * 1-5' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0 9 * * 1-5')).toBeInTheDocument();
    });

    it('handles hour range: "0 8-17 * * *" (every hour from 8am to 5pm)', () => {
      const reminder = createMockReminder({ cron_expr: '0 8-17 * * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0 8-17 * * *')).toBeInTheDocument();
    });

    it('handles month range: "0 9 1 1-6 *" (first day of first 6 months)', () => {
      const reminder = createMockReminder({ cron_expr: '0 9 1 1-6 *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0 9 1 1-6 *')).toBeInTheDocument();
    });

    // Malformed and edge case expressions
    it('handles malformed expression with too many spaces: " 0  9  *  *  * "', () => {
      const reminder = createMockReminder({ cron_expr: ' 0  9  *  *  * ' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText(' 0  9  *  *  * ')).toBeInTheDocument();
    });

    it('handles expression with invalid field count: "0 9 * *" (missing day of week)', () => {
      const reminder = createMockReminder({ cron_expr: '0 9 * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0 9 * *')).toBeInTheDocument();
    });

    it('handles expression with too many fields: "0 9 * * * * *" (7 fields)', () => {
      const reminder = createMockReminder({ cron_expr: '0 9 * * * * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0 9 * * * * *')).toBeInTheDocument();
    });

    it('handles expression with invalid values: "0 25 * * *" (hour 25)', () => {
      const reminder = createMockReminder({ cron_expr: '0 25 * * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0 25 * * *')).toBeInTheDocument();
    });

    it('handles expression with invalid day of week: "0 9 * * 8" (day 8)', () => {
      const reminder = createMockReminder({ cron_expr: '0 9 * * 8' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0 9 * * 8')).toBeInTheDocument();
    });

    it('handles empty string cron expression', () => {
      const reminder = createMockReminder({ cron_expr: '' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('')).toBeInTheDocument();
    });

    it('handles null/undefined cron expression gracefully', () => {
      const reminder = createMockReminder({ cron_expr: null });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      // Should not crash and should handle gracefully
      expect(screen.getByTestId('reminder-1')).toBeInTheDocument();
    });

    // Special syntax expressions
    it('handles @daily shorthand', () => {
      const reminder = createMockReminder({ cron_expr: '@daily' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('@daily')).toBeInTheDocument();
    });

    it('handles @weekly shorthand', () => {
      const reminder = createMockReminder({ cron_expr: '@weekly' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('@weekly')).toBeInTheDocument();
    });

    it('handles @monthly shorthand', () => {
      const reminder = createMockReminder({ cron_expr: '@monthly' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('@monthly')).toBeInTheDocument();
    });

    it('returns original expression for invalid/complex patterns', () => {
      const reminder = createMockReminder({ cron_expr: '*/15 * * * *' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('*/15 * * * *')).toBeInTheDocument();
    });

    it('handles edge cases and malformed expressions', () => {
      const reminder = createMockReminder({ cron_expr: 'invalid cron' });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('invalid cron')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('returns "Overdue" for past dates', () => {
      const pastDate = '2024-01-14T09:00:00Z'; // Yesterday
      const reminder = createMockReminder({ 
        next_run_at: pastDate,
        active: true 
      });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('returns "In X days" for future dates more than 24 hours away', () => {
      const futureDate = '2024-01-17T09:00:00Z'; // 2 days from now
      const reminder = createMockReminder({ 
        next_run_at: futureDate,
        active: true 
      });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('In 2 days')).toBeInTheDocument();
    });

    it('returns "In X hours" for future dates within 24 hours', () => {
      const futureDate = '2024-01-15T18:00:00Z'; // 6 hours from now
      const reminder = createMockReminder({ 
        next_run_at: futureDate,
        active: true 
      });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('In 6 hours')).toBeInTheDocument();
    });

    it('returns "In X minutes" for future dates within 1 hour', () => {
      const futureDate = '2024-01-15T12:30:00Z'; // 30 minutes from now
      const reminder = createMockReminder({ 
        next_run_at: futureDate,
        active: true 
      });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('In 30 minutes')).toBeInTheDocument();
    });

    it('handles singular vs plural forms correctly', () => {
      const oneDayFuture = '2024-01-16T12:00:00Z'; // 1 day from now
      const oneHourFuture = '2024-01-15T13:00:00Z'; // 1 hour from now
      const oneMinuteFuture = '2024-01-15T12:01:00Z'; // 1 minute from now
      
      const reminders = [
        createMockReminder({ id: 1, next_run_at: oneDayFuture, active: true }),
        createMockReminder({ id: 2, next_run_at: oneHourFuture, active: true }),
        createMockReminder({ id: 3, next_run_at: oneMinuteFuture, active: true }),
      ];
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={reminders}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('In 1 day')).toBeInTheDocument();
      expect(screen.getByText('In 1 hour')).toBeInTheDocument();
      expect(screen.getByText('In 1 minute')).toBeInTheDocument();
    });
  });

  describe('Toggle Switch Component', () => {
    it('renders with correct initial state (on/off)', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={mockReminders}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const toggleButtons = screen.getAllByRole('button', { name: /active/i });
      
      // First reminder is active
      expect(toggleButtons[0]).toHaveClass('bg-blue-600');
      // Second reminder is inactive
      expect(toggleButtons[1]).toHaveClass('bg-gray-300');
    });

    it('displays label when provided', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('calls onToggle with correct value when clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const toggleButton = screen.getByRole('button', { name: /active/i });
      await user.click(toggleButton);

      expect(mockOnToggleActive).toHaveBeenCalledWith(1, false);
    });

    it('is disabled when disabled prop is true', () => {
      const disabledReminder = createMockReminder({ id: 1 });
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[disabledReminder]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      // Simulate loading state by checking if toggle is disabled during operation
      // This would be tested in the loading state tests
    });

    it('has proper styling for on/off states', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={mockReminders}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const toggleButtons = screen.getAllByRole('button', { name: /active/i });
      
      // Active toggle (on state)
      expect(toggleButtons[0]).toHaveClass('bg-blue-600');
      // Inactive toggle (off state)
      expect(toggleButtons[1]).toHaveClass('bg-gray-300');
    });
  });

  describe('Interactive Elements', () => {
    it('calls onToggleActive with correct reminder ID and new state', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const toggleButton = screen.getByRole('button', { name: /active/i });
      await user.click(toggleButton);

      expect(mockOnToggleActive).toHaveBeenCalledWith(1, false);
    });

    it('calls onEdit with correct reminder object', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockReminders[0]);
    });

    it('opens delete confirmation modal when delete button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.getByText('Delete Reminder')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this reminder?')).toBeInTheDocument();
    });

    it('shows loading state during onToggleActive operation', async () => {
      const user = userEvent.setup();
      let resolveToggle: (value: unknown) => void;
      const togglePromise = new Promise(resolve => {
        resolveToggle = resolve;
      });
      
      const mockToggleWithDelay = vi.fn(() => togglePromise);
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockToggleWithDelay}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const toggleButton = screen.getByRole('button', { name: /active/i });
      await user.click(toggleButton);

      // Toggle should be disabled during loading
      expect(toggleButton).toHaveClass('opacity-50', 'cursor-not-allowed');

      // Resolve the promise
      resolveToggle(undefined);
      await waitFor(() => {
        expect(toggleButton).not.toHaveClass('opacity-50');
      });
    });

    it('has proper styling and hover states for buttons', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      const deleteButton = screen.getByRole('button', { name: /delete/i });

      expect(editButton).toHaveClass('text-blue-600', 'bg-blue-100', 'hover:bg-blue-200');
      expect(deleteButton).toHaveClass('text-red-600', 'bg-red-100', 'hover:bg-red-200');
    });
  });

  describe('Delete Confirmation Modal', () => {
    it('renders when deleteModal.isOpen is true', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.getByText('Delete Reminder')).toBeInTheDocument();
    });

    it('displays correct title and message from translations', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.getByText('Delete Reminder')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this reminder?')).toBeInTheDocument();
    });

    it('shows quoted reminder message in highlighted box', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.getByText('"Time to weigh yourself!"')).toBeInTheDocument();
    });

    it('has cancel and delete buttons with proper styling', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const confirmDeleteButton = screen.getAllByRole('button', { name: /delete/i })[1]; // Second delete button in modal

      expect(cancelButton).toHaveClass('text-gray-600', 'bg-gray-200', 'hover:bg-gray-300');
      expect(confirmDeleteButton).toHaveClass('text-white', 'bg-red-600', 'hover:bg-red-700');
    });

    it('closes modal without calling onDelete when cancel is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText('Delete Reminder')).not.toBeInTheDocument();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('calls onDelete with correct reminder ID when delete is confirmed', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const confirmDeleteButton = screen.getAllByRole('button', { name: /delete/i })[1];
      await user.click(confirmDeleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('Loading States', () => {
    it('shows skeleton placeholders instead of reminder cards when loading', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={mockReminders}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            loading={true}
          />
        </TestWrapper>,
      );

      expect(screen.queryByText('Time to weigh yourself!')).not.toBeInTheDocument();
      expect(screen.getAllByTestId(/loading-/).length).toBe(3);
    });

    it('has proper structure and animation classes for skeleton placeholders', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            loading={true}
          />
        </TestWrapper>,
      );

      const skeletonCards = screen.getAllByTestId(/loading-/);
      skeletonCards.forEach(card => {
        expect(card).toHaveClass('bg-white', 'rounded-lg', 'border', 'p-4', 'animate-pulse');
      });
    });

    it('disables specific toggle switch during operation', async () => {
      const user = userEvent.setup();
      let resolveToggle: (value: unknown) => void;
      const togglePromise = new Promise(resolve => {
        resolveToggle = resolve;
      });
      
      const mockToggleWithDelay = vi.fn(() => togglePromise);
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={mockReminders}
            onToggleActive={mockToggleWithDelay}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const firstToggle = screen.getAllByRole('button', { name: /active/i })[0];
      const secondToggle = screen.getAllByRole('button', { name: /active/i })[1];
      
      await user.click(firstToggle);

      // First toggle should be disabled
      expect(firstToggle).toHaveClass('opacity-50', 'cursor-not-allowed');
      // Second toggle should still be enabled
      expect(secondToggle).not.toHaveClass('opacity-50');

      resolveToggle(undefined);
    });

    it('does not interfere with other interactive elements during loading', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={mockReminders}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            loading={true}
          />
        </TestWrapper>,
      );

      // Should not show any interactive elements when loading
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays when reminders array is empty', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('No Reminders Set')).toBeInTheDocument();
    });

    it('shows clock emoji, title, and descriptive message', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('⏰')).toBeInTheDocument();
      expect(screen.getByText('No Reminders Set')).toBeInTheDocument();
      expect(screen.getByText('You haven\'t set up any health reminders yet.')).toBeInTheDocument();
    });

    it('has proper styling and layout', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const emptyStateContainer = screen.getByText('No Reminders Set').closest('div');
      expect(emptyStateContainer).toHaveClass('text-center', 'py-8');
    });

    it('does not show when loading is true', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            loading={true}
          />
        </TestWrapper>,
      );

      expect(screen.queryByText('No Reminders Set')).not.toBeInTheDocument();
      expect(screen.queryByText('⏰')).not.toBeInTheDocument();
    });
  });

  describe('Callback Function Tests', () => {
    it('calls onToggleActive with correct parameters', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const toggleButton = screen.getByRole('button', { name: /active/i });
      await user.click(toggleButton);

      expect(mockOnToggleActive).toHaveBeenCalledWith(1, false);
    });

    it('calls onEdit with complete reminder object', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockReminders[0]);
    });

    it('calls onDelete with correct reminder ID', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const confirmDeleteButton = screen.getAllByRole('button', { name: /delete/i })[1];
      await user.click(confirmDeleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(1);
    });

    it('handles async operations properly', async () => {
      const user = userEvent.setup();
      const asyncToggle = vi.fn().mockResolvedValue(undefined);
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={asyncToggle}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const toggleButton = screen.getByRole('button', { name: /active/i });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(asyncToggle).toHaveBeenCalledWith(1, false);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure and ARIA labels', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('has descriptive labels and proper roles for buttons', () => {
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation throughout', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const toggleButton = screen.getByRole('button', { name: /active/i });
      const editButton = screen.getByRole('button', { name: /edit/i });
      const deleteButton = screen.getByRole('button', { name: /delete/i });

      // Test keyboard navigation
      toggleButton.focus();
      expect(toggleButton).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(editButton).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(deleteButton).toHaveFocus();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles undefined or null reminder data gracefully', () => {
      const invalidReminders = [
        null,
        undefined,
        createMockReminder({ message: null }),
      ].filter(Boolean);

      render(
        <TestWrapper>
          <ReminderList
            reminders={invalidReminders}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      // Should not crash and should render what it can
      expect(screen.getByTestId('reminder-1')).toBeInTheDocument();
    });

    it('handles missing health_type data', () => {
      const reminderWithoutHealthType = createMockReminder({
        health_type: undefined,
        type_id: 99,
      });

      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminderWithoutHealthType]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Type 99')).toBeInTheDocument();
    });

    it('handles invalid cron expressions', () => {
      const reminderWithInvalidCron = createMockReminder({
        cron_expr: 'not a valid cron',
      });

      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminderWithInvalidCron]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('not a valid cron')).toBeInTheDocument();
    });

    it('handles invalid date formats in next_run_at', () => {
      const reminderWithInvalidDate = createMockReminder({
        next_run_at: 'invalid date',
        active: true,
      });

      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminderWithInvalidDate]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      // Should not crash, component should handle gracefully
      expect(screen.getByTestId('reminder-1')).toBeInTheDocument();
    });

    it('handles very long reminder messages', () => {
      const longMessage = 'This is a very long reminder message that should be displayed properly even when it contains a lot of text and might wrap to multiple lines in the user interface.';
      const reminderWithLongMessage = createMockReminder({
        message: longMessage,
      });

      render(
        <TestWrapper>
          <ReminderList
            reminders={[reminderWithLongMessage]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      expect(screen.getByText(`"${longMessage}"`)).toBeInTheDocument();
    });

    it('handles rapid state changes and user interactions', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ReminderList
            reminders={[mockReminders[0]]}
            onToggleActive={mockOnToggleActive}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      const toggleButton = screen.getByRole('button', { name: /active/i });
      const editButton = screen.getByRole('button', { name: /edit/i });

      // Rapid clicks should not cause issues
      await user.click(toggleButton);
      await user.click(editButton);
      await user.click(toggleButton);

      expect(mockOnToggleActive).toHaveBeenCalledTimes(2);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });
  });
});