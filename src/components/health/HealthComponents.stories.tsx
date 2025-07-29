import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { AddHealthRecordModal } from './AddHealthRecordModal';
import { ReminderList } from './ReminderList';
import { HealthRecordsFilters } from './HealthRecordsFilters';

// Mock data generators
const generateHealthTypes = (count = 5) => [
  { id: 1, slug: 'weight', display_name: 'Weight', unit: 'kg' },
  { id: 2, slug: 'blood_pressure_systolic', display_name: 'Blood Pressure (Systolic)', unit: 'mmHg' },
  { id: 3, slug: 'blood_pressure_diastolic', display_name: 'Blood Pressure (Diastolic)', unit: 'mmHg' },
  { id: 4, slug: 'heart_rate', display_name: 'Heart Rate', unit: 'bpm' },
  { id: 5, slug: 'steps', display_name: 'Steps', unit: 'steps' },
  { id: 6, slug: 'sleep_hours', display_name: 'Sleep Hours', unit: 'hours' },
  { id: 7, slug: 'water_intake', display_name: 'Water Intake', unit: 'ml' },
  { id: 8, slug: 'calories', display_name: 'Calories', unit: 'kcal' },
  { id: 9, slug: 'exercise_minutes', display_name: 'Exercise Minutes', unit: 'minutes' },
  { id: 10, slug: 'blood_sugar', display_name: 'Blood Sugar', unit: 'mg/dL' },
  { id: 11, slug: 'temperature', display_name: 'Temperature', unit: '°F' },
  { id: 12, slug: 'oxygen_saturation', display_name: 'Oxygen Saturation', unit: '%' },
].slice(0, count);

const generateLongHealthTypes = () => [
  { id: 1, slug: 'very_long_health_type_name', display_name: 'Very Long Health Type Name That Might Cause Layout Issues', unit: 'units' },
  { id: 2, slug: 'another_extremely_long_name', display_name: 'Another Extremely Long Health Type Name for Testing Purposes', unit: 'measurements' },
  { id: 3, slug: 'short', display_name: 'Short', unit: 'x' },
];

const generateReminders = (count = 3) => {
  const healthTypes = generateHealthTypes();
  const cronExpressions = [
    '0 9 * * *',     // Daily at 9:00
    '30 14 * * *',   // Daily at 14:30
    '0 8 * * 1',     // Weekly on Monday at 8:00
    '0 10 15 * *',   // Monthly on day 15 at 10:00
    '0 6 * * 1,3,5', // Monday, Wednesday, Friday at 6:00
    '*/30 * * * *',  // Every 30 minutes
  ];

  const messages = [
    'Take your morning medication',
    'Check your blood pressure',
    'Record your weight',
    'Drink a glass of water',
    'Take a 10-minute walk',
    'Measure your blood sugar level',
    'Do your breathing exercises',
    'Take your vitamins',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    user_id: 'user-123',
    type_id: healthTypes[i % healthTypes.length].id,
    cron_expr: cronExpressions[i % cronExpressions.length],
    message: messages[i % messages.length],
    active: i % 2 === 0, // Alternate between active and inactive
    next_run_at: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString(),
    health_type: healthTypes[i % healthTypes.length],
  }));
};

const generateLongMessageReminders = () => [
  {
    id: 1,
    user_id: 'user-123',
    type_id: 1,
    cron_expr: '0 9 * * *',
    message: 'This is a very long reminder message that might cause layout issues and should be tested to ensure proper text wrapping and display in the reminder card component. It contains multiple sentences and should demonstrate how the component handles extensive text content.',
    active: true,
    next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    health_type: { id: 1, slug: 'weight', display_name: 'Weight', unit: 'kg' },
  },
];

const generateSearchParams = (type = 'empty') => {
  switch (type) {
    case 'populated':
      return {
        search: 'blood pressure',
        type: '2',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
    case 'search-only':
      return { search: 'weight measurement' };
    case 'date-range-only':
      return { startDate: '2024-01-01', endDate: '2024-06-30' };
    case 'type-only':
      return { type: '1' };
    default:
      return {};
  }
};

// Mock translation function
const mockTranslations = {
  'HealthManagement': {
    add_health_record_title: 'Add Health Record',
    no_reminders_title: 'No Reminders Set',
    no_reminders_message: 'You haven\'t created any health reminders yet.',
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
  },
};

// Mock useTranslations hook
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    return mockTranslations[namespace as keyof typeof mockTranslations]?.[key as keyof typeof mockTranslations[typeof namespace]] || key;
  },
}));

// AddHealthRecordModal Stories
const modalMeta: Meta<typeof AddHealthRecordModal> = {
  title: 'Health/AddHealthRecordModal',
  component: AddHealthRecordModal,
  parameters: {
    docs: {
      description: {
        component: 'Modal component for adding health records with comprehensive form integration, focus management, and accessibility features.',
      },
    },
  },
  args: {
    isOpen: true,
    onClose: action('modal-close'),
    onSuccess: action('modal-success'),
  },
  argTypes: {
    isOpen: {
      control: { type: 'boolean' },
      description: 'Controls modal visibility',
    },
    onClose: {
      action: 'modal-close',
      description: 'Callback when modal is closed',
    },
    onSuccess: {
      action: 'modal-success',
      description: 'Callback when form submission is successful',
    },
  },
  tags: ['autodocs'],
};

export const DefaultModal: StoryObj<typeof AddHealthRecordModal> = {
  args: {
    isOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default modal in open state with HealthRecordForm integration.',
      },
    },
  },
};

export const ClosedModal: StoryObj<typeof AddHealthRecordModal> = {
  args: {
    isOpen: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal in closed state (not visible) for testing state changes.',
      },
    },
  },
};

export const ModalAccessibilityDemo: StoryObj<typeof AddHealthRecordModal> = {
  args: {
    isOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal optimized for accessibility testing with enhanced focus management and ARIA attributes.',
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'focus-order-semantics', enabled: true },
          { id: 'keyboard-navigation', enabled: true },
        ],
      },
    },
  },
};

export const ModalResponsive: StoryObj<typeof AddHealthRecordModal> = {
  args: {
    isOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal demonstrating responsive behavior at different viewport sizes.',
      },
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1200px', height: '800px' } },
      },
    },
  },
};

// ReminderList Stories
const reminderListMeta: Meta<typeof ReminderList> = {
  title: 'Health/ReminderList',
  component: ReminderList,
  parameters: {
    docs: {
      description: {
        component: 'Component for displaying and managing health reminders with toggle functionality, delete confirmation, and loading states.',
      },
    },
  },
  args: {
    reminders: generateReminders(3),
    onToggleActive: action('reminder-toggle'),
    onEdit: action('reminder-edit'),
    onDelete: action('reminder-delete'),
    loading: false,
  },
  argTypes: {
    reminders: {
      control: { type: 'object' },
      description: 'Array of health reminder objects',
    },
    onToggleActive: {
      action: 'reminder-toggle',
      description: 'Callback when reminder active status is toggled',
    },
    onEdit: {
      action: 'reminder-edit',
      description: 'Callback when reminder edit is triggered',
    },
    onDelete: {
      action: 'reminder-delete',
      description: 'Callback when reminder deletion is confirmed',
    },
    loading: {
      control: { type: 'boolean' },
      description: 'Loading state for the reminder list',
    },
  },
  tags: ['autodocs'],
};

export const DefaultReminderList: StoryObj<typeof ReminderList> = {
  args: {
    reminders: generateReminders(3),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default reminder list with multiple reminders showing various states (active/inactive).',
      },
    },
  },
};

export const EmptyReminderList: StoryObj<typeof ReminderList> = {
  args: {
    reminders: [],
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty reminder list showing the empty state with clock emoji and message.',
      },
    },
  },
};

export const LoadingReminderList: StoryObj<typeof ReminderList> = {
  args: {
    reminders: [],
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Reminder list in loading state with skeleton placeholders.',
      },
    },
  },
};

export const SingleReminder: StoryObj<typeof ReminderList> = {
  args: {
    reminders: generateReminders(1),
  },
  parameters: {
    docs: {
      description: {
        story: 'Reminder list with single reminder for minimal data testing.',
      },
    },
  },
};

export const ManyReminders: StoryObj<typeof ReminderList> = {
  args: {
    reminders: generateReminders(12),
  },
  parameters: {
    docs: {
      description: {
        story: 'Reminder list with many reminders for stress testing and scrolling behavior.',
      },
    },
  },
};

export const MixedStatusReminders: StoryObj<typeof ReminderList> = {
  args: {
    reminders: generateReminders(6),
  },
  parameters: {
    docs: {
      description: {
        story: 'Reminder list with combination of active and inactive reminders.',
      },
    },
  },
};

export const LongMessages: StoryObj<typeof ReminderList> = {
  args: {
    reminders: generateLongMessageReminders(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Reminder list with very long message text to test text wrapping and layout.',
      },
    },
  },
};

export const VariousCronExpressions: StoryObj<typeof ReminderList> = {
  args: {
    reminders: generateReminders(6),
  },
  parameters: {
    docs: {
      description: {
        story: 'Reminder list showcasing different cron expression formats and their human-readable conversions.',
      },
    },
  },
};

// HealthRecordsFilters Stories
const filtersMeta: Meta<typeof HealthRecordsFilters> = {
  title: 'Health/HealthRecordsFilters',
  component: HealthRecordsFilters,
  parameters: {
    docs: {
      description: {
        component: 'Filter component for health records with search, health type selection, date range, and form controls.',
      },
    },
  },
  args: {
    healthTypes: generateHealthTypes(),
    searchParams: generateSearchParams('empty'),
  },
  argTypes: {
    healthTypes: {
      control: { type: 'object' },
      description: 'Array of available health types for filtering',
    },
    searchParams: {
      control: { type: 'object' },
      description: 'Current search parameters and filter values',
    },
  },
  tags: ['autodocs'],
};

export const DefaultFilters: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: generateHealthTypes(),
    searchParams: generateSearchParams('empty'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default filter form with no values selected (empty state).',
      },
    },
  },
};

export const PopulatedFilters: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: generateHealthTypes(),
    searchParams: generateSearchParams('populated'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter form with all fields filled with sample data.',
      },
    },
  },
};

export const SearchOnly: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: generateHealthTypes(),
    searchParams: generateSearchParams('search-only'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter form with only search field populated.',
      },
    },
  },
};

export const DateRangeOnly: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: generateHealthTypes(),
    searchParams: generateSearchParams('date-range-only'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter form with only date range fields populated.',
      },
    },
  },
};

export const HealthTypeOnly: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: generateHealthTypes(),
    searchParams: generateSearchParams('type-only'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter form with only health type selected.',
      },
    },
  },
};

export const ManyHealthTypes: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: generateHealthTypes(12),
    searchParams: generateSearchParams('empty'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter form with extensive health type options.',
      },
    },
  },
};

export const LongHealthTypeNames: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: generateLongHealthTypes(),
    searchParams: generateSearchParams('empty'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter form with very long health type display names to test layout.',
      },
    },
  },
};

export const ResponsiveFilters: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: generateHealthTypes(),
    searchParams: generateSearchParams('populated'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter form demonstrating responsive grid layout at different screen sizes.',
      },
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1200px', height: '800px' } },
      },
    },
  },
};

// Interactive Feature Stories
export const ModalInteractions: StoryObj<typeof AddHealthRecordModal> = {
  args: {
    isOpen: true,
    onClose: action('modal-close'),
    onSuccess: action('modal-success'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal with all interactions enabled for testing open/close behavior and form submission.',
      },
    },
  },
};

export const ReminderInteractions: StoryObj<typeof ReminderList> = {
  args: {
    reminders: generateReminders(3),
    onToggleActive: action('reminder-toggle'),
    onEdit: action('reminder-edit'),
    onDelete: action('reminder-delete'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Reminder list with all interactions enabled (toggle, edit, delete) for comprehensive testing.',
      },
    },
  },
};

export const FilterInteractions: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: generateHealthTypes(),
    searchParams: generateSearchParams('empty'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter form with submission and reset functionality for testing form interactions.',
      },
    },
  },
};

// Accessibility Stories
export const HighContrastModal: StoryObj<typeof AddHealthRecordModal> = {
  args: {
    isOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal with high contrast theme for accessibility testing.',
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#000000' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
};

export const KeyboardOnlyReminders: StoryObj<typeof ReminderList> = {
  args: {
    reminders: generateReminders(3),
  },
  parameters: {
    docs: {
      description: {
        story: 'Reminder list optimized for keyboard-only interaction testing.',
      },
    },
  },
};

export const ScreenReaderOptimizedFilters: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: generateHealthTypes(),
    searchParams: generateSearchParams('populated'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter form with enhanced ARIA labels and descriptions for screen reader testing.',
      },
    },
  },
};

// State Variation Stories
export const SuccessStates: StoryObj<typeof AddHealthRecordModal> = {
  args: {
    isOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Components showing successful operation states.',
      },
    },
  },
};

export const LoadingStates: StoryObj<typeof ReminderList> = {
  args: {
    reminders: [],
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Components in various loading states with skeleton placeholders.',
      },
    },
  },
};

// Data Variation Stories
export const MinimalData: StoryObj<typeof ReminderList> = {
  args: {
    reminders: [
      {
        id: 1,
        user_id: 'user-123',
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: 'Simple reminder',
        active: true,
        next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Reminder list with minimal required data (no health_type object).',
      },
    },
  },
};

export const RichData: StoryObj<typeof ReminderList> = {
  args: {
    reminders: generateReminders(3),
  },
  parameters: {
    docs: {
      description: {
        story: 'Reminder list with comprehensive data including all optional fields.',
      },
    },
  },
};

export const EdgeCaseData: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: [
      { id: 1, slug: 'special-chars', display_name: 'Type with Special Chars: @#$%^&*()', unit: '!@#' },
      { id: 2, slug: 'unicode', display_name: 'Unicode Type: 测试 🏥 💊', unit: '°C' },
    ],
    searchParams: { search: 'Special characters: @#$%^&*()' },
  },
  parameters: {
    docs: {
      description: {
        story: 'Components with edge case data including special characters and unicode.',
      },
    },
  },
};

// Responsive Design Stories
export const MobileLayout: StoryObj<typeof HealthRecordsFilters> = {
  args: {
    healthTypes: generateHealthTypes(),
    searchParams: generateSearchParams('populated'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter form optimized for mobile viewport (375px).',
      },
    },
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const TabletLayout: StoryObj<typeof AddHealthRecordModal> = {
  args: {
    isOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal component on tablet viewport (768px).',
      },
    },
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const DesktopLayout: StoryObj<typeof ReminderList> = {
  args: {
    reminders: generateReminders(5),
  },
  parameters: {
    docs: {
      description: {
        story: 'Reminder list on desktop viewport (1200px).',
      },
    },
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

// Integration Stories
export const CompleteWorkflow = {
  render: () => (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">Complete Health Management Workflow</h2>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">1. Filter Health Records</h3>
        <HealthRecordsFilters
          healthTypes={generateHealthTypes()}
          searchParams={generateSearchParams('populated')}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">2. Manage Reminders</h3>
        <ReminderList
          reminders={generateReminders(3)}
          onToggleActive={action('reminder-toggle')}
          onEdit={action('reminder-edit')}
          onDelete={action('reminder-delete')}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">3. Add New Record</h3>
        <AddHealthRecordModal
          isOpen={true}
          onClose={action('modal-close')}
          onSuccess={action('modal-success')}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete user workflow showing all health components working together.',
      },
    },
  },
};

// Export all meta configurations
export default modalMeta;

// Additional exports for other components
export const ReminderListStories = reminderListMeta;
export const FiltersStories = filtersMeta;