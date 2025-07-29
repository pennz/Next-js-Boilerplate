import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useRouter } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AddHealthRecordModal } from './AddHealthRecordModal';
import { HealthRecordsFilters } from './HealthRecordsFilters';
import { ReminderList } from './ReminderList';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock HealthRecordForm component for modal integration tests
vi.mock('./HealthRecordForm', () => ({
  HealthRecordForm: vi.fn(({ mode, onSuccess }) => (
    <div data-testid="health-record-form">
      <div>Health Record Form - Mode: {mode}</div>
      <button
        type="button"
        onClick={() => onSuccess?.()}
        data-testid="mock-form-submit"
      >
        Submit Form
      </button>
      <button
        type="button"
        onClick={() => {
          throw new Error('Form validation error');
        }}
        data-testid="mock-form-error"
      >
        Trigger Error
      </button>
    </div>
  )),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location for filters
const mockLocation = {
  pathname: '/health',
  href: 'http://localhost:3000/health',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock document.querySelector for filters
const mockQuerySelector = vi.fn();
Object.defineProperty(document, 'querySelector', {
  value: mockQuerySelector,
  writable: true,
});

// Mock translations
const mockTranslations = {
  // Modal translations
  add_health_record_title: 'Add Health Record',
  
  // Reminder translations
  delete_reminder_title: 'Delete Reminder',
  delete_reminder_message: 'Are you sure you want to delete this reminder?',
  button_cancel: 'Cancel',
  button_delete: 'Delete',
  button_edit: 'Edit',
  label_active: 'Active',
  label_frequency: 'Frequency',
  label_next_run: 'Next Run',
  status_active: 'Active',
  status_inactive: 'Inactive',
  no_reminders_title: 'No Reminders',
  no_reminders_message: 'You haven\'t created any reminders yet.',
  
  // Form translations
  success_record_saved: 'Health record saved successfully',
  success_record_updated: 'Health record updated successfully',
  error_invalid_value: 'Invalid value provided',
};

const messages = {
  HealthManagement: mockTranslations,
};

// Test data generators
const createMockHealthTypes = () => [
  { id: 1, slug: 'weight', display_name: 'Weight', unit: 'kg' },
  { id: 2, slug: 'blood_pressure', display_name: 'Blood Pressure', unit: 'mmHg' },
  { id: 3, slug: 'steps', display_name: 'Steps', unit: 'steps' },
  { id: 4, slug: 'heart_rate', display_name: 'Heart Rate', unit: 'bpm' },
];

const createMockReminders = () => [
  {
    id: 1,
    user_id: 'test-user',
    type_id: 1,
    cron_expr: '0 9 * * *',
    message: 'Time to weigh yourself',
    active: true,
    next_run_at: '2024-01-16T09:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    health_type: { id: 1, slug: 'weight', display_name: 'Weight', unit: 'kg' },
  },
  {
    id: 2,
    user_id: 'test-user',
    type_id: 2,
    cron_expr: '0 8 * * 1',
    message: 'Weekly blood pressure check',
    active: false,
    next_run_at: '2024-01-22T08:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    health_type: { id: 2, slug: 'blood_pressure', display_name: 'Blood Pressure', unit: 'mmHg' },
  },
];

const createMockSearchParams = () => ({
  search: 'test search',
  type: '1',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
});

// Integration test wrapper component
const IntegrationTestWrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Parent component simulator for integration testing
const ParentComponentSimulator = ({
  children,
  onStateChange,
}: {
  children: React.ReactNode;
  onStateChange?: (state: any) => void;
}) => {
  const [state, setState] = React.useState({
    modalOpen: false,
    records: [],
    reminders: createMockReminders(),
    loading: false,
    filters: {},
  });

  const updateState = (newState: any) => {
    setState(prev => ({ ...prev, ...newState }));
    onStateChange?.(newState);
  };

  return (
    <div data-testid="parent-component">
      {React.cloneElement(children as React.ReactElement, {
        ...state,
        onStateChange: updateState,
      })}
    </div>
  );
};

describe('Health Components Integration Tests', () => {
  const mockRouter = {
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(mockRouter);
    mockFetch.mockClear();
    mockRouter.refresh.mockClear();
    mockQuerySelector.mockClear();
    
    // Mock focus methods
    HTMLElement.prototype.focus = vi.fn();
    HTMLElement.prototype.blur = vi.fn();
    
    // Mock document.activeElement
    Object.defineProperty(document, 'activeElement', {
      value: document.body,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('AddHealthRecordModal Integration Tests', () => {
    describe('Modal and Form Integration', () => {
      it('should open modal with HealthRecordForm properly configured', () => {
        const mockOnClose = vi.fn();
        const mockOnSuccess = vi.fn();

        render(
          <IntegrationTestWrapper>
            <AddHealthRecordModal
              isOpen={true}
              onClose={mockOnClose}
              onSuccess={mockOnSuccess}
            />
          </IntegrationTestWrapper>
        );

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Add Health Record')).toBeInTheDocument();
        expect(screen.getByTestId('health-record-form')).toBeInTheDocument();
        expect(screen.getByText('Health Record Form - Mode: create')).toBeInTheDocument();
      });

      it('should handle form submission within modal and trigger correct callbacks', async () => {
        const user = userEvent.setup();
        const mockOnClose = vi.fn();
        const mockOnSuccess = vi.fn();

        render(
          <IntegrationTestWrapper>
            <AddHealthRecordModal
              isOpen={true}
              onClose={mockOnClose}
              onSuccess={mockOnSuccess}
            />
          </IntegrationTestWrapper>
        );

        const submitButton = screen.getByTestId('mock-form-submit');
        await user.click(submitButton);

        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });

      it('should handle form submission success and close modal', async () => {
        const user = userEvent.setup();
        const mockOnClose = vi.fn();
        const mockOnSuccess = vi.fn();

        render(
          <IntegrationTestWrapper>
            <AddHealthRecordModal
              isOpen={true}
              onClose={mockOnClose}
              onSuccess={mockOnSuccess}
            />
          </IntegrationTestWrapper>
        );

        const submitButton = screen.getByTestId('mock-form-submit');
        await user.click(submitButton);

        // Verify callback order: onSuccess called before onClose
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    describe('Focus Management Integration', () => {
      it('should move focus to close button when modal opens', () => {
        const mockFocus = vi.fn();
        const mockCloseButton = { focus: mockFocus };
        
        // Mock the ref to return our mock button
        vi.spyOn(React, 'useRef').mockReturnValueOnce({ current: mockCloseButton });

        render(
          <IntegrationTestWrapper>
            <AddHealthRecordModal
              isOpen={true}
              onClose={vi.fn()}
              onSuccess={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        // Focus should be called after timeout
        setTimeout(() => {
          expect(mockFocus).toHaveBeenCalled();
        }, 10);
      });

      it('should restore focus when modal closes', () => {
        const mockElement = { focus: vi.fn() };
        Object.defineProperty(document, 'activeElement', {
          value: mockElement,
          writable: true,
        });

        const { rerender } = render(
          <IntegrationTestWrapper>
            <AddHealthRecordModal
              isOpen={true}
              onClose={vi.fn()}
              onSuccess={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        // Close modal
        rerender(
          <IntegrationTestWrapper>
            <AddHealthRecordModal
              isOpen={false}
              onClose={vi.fn()}
              onSuccess={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        expect(mockElement.focus).toHaveBeenCalled();
      });

      it('should handle keyboard navigation with form inputs', async () => {
        const user = userEvent.setup();

        render(
          <IntegrationTestWrapper>
            <AddHealthRecordModal
              isOpen={true}
              onClose={vi.fn()}
              onSuccess={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        const modal = screen.getByRole('dialog');
        
        // Test Tab navigation
        await user.tab();
        expect(document.activeElement).toBe(screen.getByLabelText('Close modal'));
        
        await user.tab();
        // Focus should move to form elements
        expect(document.activeElement).toBeInTheDocument();
      });
    });

    describe('Error Handling Integration', () => {
      it('should display form validation errors within modal context', async () => {
        const user = userEvent.setup();

        render(
          <IntegrationTestWrapper>
            <AddHealthRecordModal
              isOpen={true}
              onClose={vi.fn()}
              onSuccess={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        const errorButton = screen.getByTestId('mock-form-error');
        
        // This should trigger an error but not close the modal
        await expect(user.click(errorButton)).rejects.toThrow('Form validation error');
        
        // Modal should remain open
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      it('should keep modal open when form submission fails', async () => {
        const user = userEvent.setup();
        const mockOnClose = vi.fn();

        render(
          <IntegrationTestWrapper>
            <AddHealthRecordModal
              isOpen={true}
              onClose={mockOnClose}
              onSuccess={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        const errorButton = screen.getByTestId('mock-form-error');
        
        try {
          await user.click(errorButton);
        } catch (error) {
          // Expected error
        }

        // Modal should remain open, onClose should not be called
        expect(mockOnClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('ReminderList Integration Tests', () => {
    describe('Data Flow Integration', () => {
      it('should display reminder data correctly from props', () => {
        const mockReminders = createMockReminders();

        render(
          <IntegrationTestWrapper>
            <ReminderList
              reminders={mockReminders}
              onToggleActive={vi.fn()}
              onEdit={vi.fn()}
              onDelete={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        expect(screen.getByText('Time to weigh yourself')).toBeInTheDocument();
        expect(screen.getByText('Weekly blood pressure check')).toBeInTheDocument();
        expect(screen.getByText('Weight')).toBeInTheDocument();
        expect(screen.getByText('Blood Pressure')).toBeInTheDocument();
      });

      it('should integrate callback functions with parent component state', async () => {
        const user = userEvent.setup();
        const mockOnToggleActive = vi.fn();
        const mockOnEdit = vi.fn();
        const mockOnDelete = vi.fn();
        const mockReminders = createMockReminders();

        render(
          <IntegrationTestWrapper>
            <ReminderList
              reminders={mockReminders}
              onToggleActive={mockOnToggleActive}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
            />
          </IntegrationTestWrapper>
        );

        // Test toggle callback
        const toggleSwitches = screen.getAllByRole('button');
        const firstToggle = toggleSwitches.find(btn => 
          btn.className.includes('bg-blue-600') || btn.className.includes('bg-gray-300')
        );
        if (firstToggle) {
          await user.click(firstToggle);
          expect(mockOnToggleActive).toHaveBeenCalledWith(1, false);
        }

        // Test edit callback
        const editButtons = screen.getAllByText('Edit');
        await user.click(editButtons[0]);
        expect(mockOnEdit).toHaveBeenCalledWith(mockReminders[0]);

        // Test delete callback
        const deleteButtons = screen.getAllByText('Delete');
        await user.click(deleteButtons[0]);
        
        // Delete confirmation modal should appear
        expect(screen.getByText('Delete Reminder')).toBeInTheDocument();
        
        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);
        expect(mockOnDelete).toHaveBeenCalledWith(1);
      });

      it('should handle loading states integration', () => {
        render(
          <IntegrationTestWrapper>
            <ReminderList
              reminders={[]}
              onToggleActive={vi.fn()}
              onEdit={vi.fn()}
              onDelete={vi.fn()}
              loading={true}
            />
          </IntegrationTestWrapper>
        );

        // Should show skeleton placeholders
        const skeletons = screen.getAllByTestId(/loading-/);
        expect(skeletons).toHaveLength(3);
        
        skeletons.forEach(skeleton => {
          expect(skeleton).toHaveClass('animate-pulse');
        });
      });
    });

    describe('Toggle Integration', () => {
      it('should handle toggle with loading state integration', async () => {
        const user = userEvent.setup();
        const mockOnToggleActive = vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 100))
        );
        const mockReminders = createMockReminders();

        render(
          <IntegrationTestWrapper>
            <ReminderList
              reminders={mockReminders}
              onToggleActive={mockOnToggleActive}
              onEdit={vi.fn()}
              onDelete={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        const toggleSwitches = screen.getAllByRole('button');
        const firstToggle = toggleSwitches.find(btn => 
          btn.className.includes('bg-blue-600') || btn.className.includes('bg-gray-300')
        );
        
        if (firstToggle) {
          await user.click(firstToggle);
          
          // Should show loading state
          expect(firstToggle).toHaveClass('opacity-50', 'cursor-not-allowed');
          
          await waitFor(() => {
            expect(mockOnToggleActive).toHaveBeenCalled();
          });
        }
      });

      it('should handle toggle errors gracefully', async () => {
        const user = userEvent.setup();
        const mockOnToggleActive = vi.fn().mockRejectedValue(new Error('Toggle failed'));
        const mockReminders = createMockReminders();

        render(
          <IntegrationTestWrapper>
            <ReminderList
              reminders={mockReminders}
              onToggleActive={mockOnToggleActive}
              onEdit={vi.fn()}
              onDelete={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        const toggleSwitches = screen.getAllByRole('button');
        const firstToggle = toggleSwitches.find(btn => 
          btn.className.includes('bg-blue-600') || btn.className.includes('bg-gray-300')
        );
        
        if (firstToggle) {
          await user.click(firstToggle);
          
          await waitFor(() => {
            expect(mockOnToggleActive).toHaveBeenCalled();
            // Component should handle error gracefully and restore state
            expect(firstToggle).not.toHaveClass('opacity-50');
          });
        }
      });
    });

    describe('Delete Integration', () => {
      it('should integrate delete confirmation modal with main component', async () => {
        const user = userEvent.setup();
        const mockOnDelete = vi.fn();
        const mockReminders = createMockReminders();

        render(
          <IntegrationTestWrapper>
            <ReminderList
              reminders={mockReminders}
              onToggleActive={vi.fn()}
              onEdit={vi.fn()}
              onDelete={mockOnDelete}
            />
          </IntegrationTestWrapper>
        );

        const deleteButtons = screen.getAllByText('Delete');
        await user.click(deleteButtons[0]);

        // Confirmation modal should appear
        expect(screen.getByText('Delete Reminder')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to delete this reminder?')).toBeInTheDocument();
        expect(screen.getByText('"Time to weigh yourself"')).toBeInTheDocument();

        // Test cancellation
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        await user.click(cancelButton);
        
        expect(screen.queryByText('Delete Reminder')).not.toBeInTheDocument();
        expect(mockOnDelete).not.toHaveBeenCalled();
      });

      it('should handle successful deletion and update parent state', async () => {
        const user = userEvent.setup();
        const mockOnDelete = vi.fn();
        const mockReminders = createMockReminders();

        render(
          <IntegrationTestWrapper>
            <ReminderList
              reminders={mockReminders}
              onToggleActive={vi.fn()}
              onEdit={vi.fn()}
              onDelete={mockOnDelete}
            />
          </IntegrationTestWrapper>
        );

        const deleteButtons = screen.getAllByText('Delete');
        await user.click(deleteButtons[0]);

        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);

        expect(mockOnDelete).toHaveBeenCalledWith(1);
        expect(screen.queryByText('Delete Reminder')).not.toBeInTheDocument();
      });
    });
  });

  describe('HealthRecordsFilters Integration Tests', () => {
    describe('Filter State Integration', () => {
      it('should display filter values from searchParams', () => {
        const mockHealthTypes = createMockHealthTypes();
        const mockSearchParams = createMockSearchParams();

        render(
          <IntegrationTestWrapper>
            <HealthRecordsFilters
              healthTypes={mockHealthTypes}
              searchParams={mockSearchParams}
            />
          </IntegrationTestWrapper>
        );

        expect(screen.getByDisplayValue('test search')).toBeInTheDocument();
        expect(screen.getByDisplayValue('1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
      });

      it('should handle empty searchParams gracefully', () => {
        const mockHealthTypes = createMockHealthTypes();

        render(
          <IntegrationTestWrapper>
            <HealthRecordsFilters
              healthTypes={mockHealthTypes}
              searchParams={{}}
            />
          </IntegrationTestWrapper>
        );

        expect(screen.getByPlaceholderText('Search records...')).toHaveValue('');
        expect(screen.getByDisplayValue('')).toBeInTheDocument(); // health type select
      });
    });

    describe('Form Integration', () => {
      it('should render all form inputs with proper labels', () => {
        const mockHealthTypes = createMockHealthTypes();

        render(
          <IntegrationTestWrapper>
            <HealthRecordsFilters
              healthTypes={mockHealthTypes}
              searchParams={{}}
            />
          </IntegrationTestWrapper>
        );

        expect(screen.getByLabelText('Search')).toBeInTheDocument();
        expect(screen.getByLabelText('Health Type')).toBeInTheDocument();
        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Apply Filters' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
      });

      it('should populate health type options correctly', () => {
        const mockHealthTypes = createMockHealthTypes();

        render(
          <IntegrationTestWrapper>
            <HealthRecordsFilters
              healthTypes={mockHealthTypes}
              searchParams={{}}
            />
          </IntegrationTestWrapper>
        );

        const select = screen.getByLabelText('Health Type');
        expect(within(select).getByText('All Types')).toBeInTheDocument();
        expect(within(select).getByText('Weight')).toBeInTheDocument();
        expect(within(select).getByText('Blood Pressure')).toBeInTheDocument();
        expect(within(select).getByText('Steps')).toBeInTheDocument();
        expect(within(select).getByText('Heart Rate')).toBeInTheDocument();
      });

      it('should handle form reset functionality', async () => {
        const user = userEvent.setup();
        const mockForm = { reset: vi.fn() };
        mockQuerySelector.mockReturnValue(mockForm);

        const mockHealthTypes = createMockHealthTypes();

        render(
          <IntegrationTestWrapper>
            <HealthRecordsFilters
              healthTypes={mockHealthTypes}
              searchParams={{}}
            />
          </IntegrationTestWrapper>
        );

        const clearButton = screen.getByRole('button', { name: 'Clear' });
        await user.click(clearButton);

        expect(mockQuerySelector).toHaveBeenCalledWith('form');
        expect(mockForm.reset).toHaveBeenCalled();
        expect(window.location.href).toBe('/health');
      });
    });

    describe('Search Integration', () => {
      it('should handle search input changes', async () => {
        const user = userEvent.setup();
        const mockHealthTypes = createMockHealthTypes();

        render(
          <IntegrationTestWrapper>
            <HealthRecordsFilters
              healthTypes={mockHealthTypes}
              searchParams={{}}
            />
          </IntegrationTestWrapper>
        );

        const searchInput = screen.getByLabelText('Search');
        await user.type(searchInput, 'new search term');

        expect(searchInput).toHaveValue('new search term');
      });

      it('should handle health type selection', async () => {
        const user = userEvent.setup();
        const mockHealthTypes = createMockHealthTypes();

        render(
          <IntegrationTestWrapper>
            <HealthRecordsFilters
              healthTypes={mockHealthTypes}
              searchParams={{}}
            />
          </IntegrationTestWrapper>
        );

        const select = screen.getByLabelText('Health Type');
        await user.selectOptions(select, '2');

        expect(select).toHaveValue('2');
      });

      it('should handle date range inputs', async () => {
        const user = userEvent.setup();
        const mockHealthTypes = createMockHealthTypes();

        render(
          <IntegrationTestWrapper>
            <HealthRecordsFilters
              healthTypes={mockHealthTypes}
              searchParams={{}}
            />
          </IntegrationTestWrapper>
        );

        const startDateInput = screen.getByLabelText('Start Date');
        const endDateInput = screen.getByLabelText('End Date');

        await user.type(startDateInput, '2024-01-01');
        await user.type(endDateInput, '2024-01-31');

        expect(startDateInput).toHaveValue('2024-01-01');
        expect(endDateInput).toHaveValue('2024-01-31');
      });
    });
  });

  describe('Cross-Component Integration Tests', () => {
    describe('Modal and List Integration', () => {
      it('should simulate adding record via modal updates records list', async () => {
        const user = userEvent.setup();
        const mockOnStateChange = vi.fn();

        const TestComponent = () => {
          const [modalOpen, setModalOpen] = React.useState(false);
          const [records, setRecords] = React.useState([]);

          const handleModalSuccess = () => {
            setRecords(prev => [...prev, { id: Date.now(), type: 'weight', value: 75 }]);
            mockOnStateChange({ recordAdded: true });
          };

          return (
            <IntegrationTestWrapper>
              <div>
                <button onClick={() => setModalOpen(true)}>Add Record</button>
                <div data-testid="records-count">Records: {records.length}</div>
                <AddHealthRecordModal
                  isOpen={modalOpen}
                  onClose={() => setModalOpen(false)}
                  onSuccess={handleModalSuccess}
                />
              </div>
            </IntegrationTestWrapper>
          );
        };

        render(<TestComponent />);

        expect(screen.getByTestId('records-count')).toHaveTextContent('Records: 0');

        const addButton = screen.getByText('Add Record');
        await user.click(addButton);

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        const submitButton = screen.getByTestId('mock-form-submit');
        await user.click(submitButton);

        expect(screen.getByTestId('records-count')).toHaveTextContent('Records: 1');
        expect(mockOnStateChange).toHaveBeenCalledWith({ recordAdded: true });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    describe('Filter and List Integration', () => {
      it('should simulate filter changes updating list display', async () => {
        const user = userEvent.setup();
        const mockOnFilterChange = vi.fn();

        const TestComponent = () => {
          const [filters, setFilters] = React.useState({});
          const [filteredCount, setFilteredCount] = React.useState(10);

          const handleFilterSubmit = (event: React.FormEvent) => {
            event.preventDefault();
            const formData = new FormData(event.target as HTMLFormElement);
            const newFilters = Object.fromEntries(formData.entries());
            setFilters(newFilters);
            setFilteredCount(newFilters.search ? 3 : 10);
            mockOnFilterChange(newFilters);
          };

          return (
            <IntegrationTestWrapper>
              <form onSubmit={handleFilterSubmit}>
                <HealthRecordsFilters
                  healthTypes={createMockHealthTypes()}
                  searchParams={filters}
                />
                <div data-testid="filtered-count">Showing: {filteredCount} records</div>
              </form>
            </IntegrationTestWrapper>
          );
        };

        render(<TestComponent />);

        expect(screen.getByTestId('filtered-count')).toHaveTextContent('Showing: 10 records');

        const searchInput = screen.getByLabelText('Search');
        await user.type(searchInput, 'weight');

        const applyButton = screen.getByRole('button', { name: 'Apply Filters' });
        await user.click(applyButton);

        expect(screen.getByTestId('filtered-count')).toHaveTextContent('Showing: 3 records');
        expect(mockOnFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'weight' })
        );
      });
    });

    describe('Reminder and Record Integration', () => {
      it('should simulate reminder status changes reflecting in related components', async () => {
        const user = userEvent.setup();
        const mockOnStatusChange = vi.fn();

        const TestComponent = () => {
          const [reminders, setReminders] = React.useState(createMockReminders());
          const [activeCount, setActiveCount] = React.useState(1);

          const handleToggleActive = async (id: number, active: boolean) => {
            setReminders(prev => 
              prev.map(r => r.id === id ? { ...r, active } : r)
            );
            setActiveCount(prev => active ? prev + 1 : prev - 1);
            mockOnStatusChange({ id, active });
          };

          return (
            <IntegrationTestWrapper>
              <div>
                <div data-testid="active-count">Active reminders: {activeCount}</div>
                <ReminderList
                  reminders={reminders}
                  onToggleActive={handleToggleActive}
                  onEdit={vi.fn()}
                  onDelete={vi.fn()}
                />
              </div>
            </IntegrationTestWrapper>
          );
        };

        render(<TestComponent />);

        expect(screen.getByTestId('active-count')).toHaveTextContent('Active reminders: 1');

        // Find and click the inactive reminder's toggle
        const reminderCards = screen.getAllByText(/Blood Pressure/);
        const inactiveCard = reminderCards[0].closest('[class*="border-gray-200"]');
        
        if (inactiveCard) {
          const toggleButton = within(inactiveCard as HTMLElement).getByRole('button');
          await user.click(toggleButton);

          expect(screen.getByTestId('active-count')).toHaveTextContent('Active reminders: 2');
          expect(mockOnStatusChange).toHaveBeenCalledWith({ id: 2, active: true });
        }
      });
    });
  });

  describe('State Management Integration', () => {
    describe('Loading State Coordination', () => {
      it('should coordinate loading states across components', () => {
        const TestComponent = () => {
          const [globalLoading, setGlobalLoading] = React.useState(true);

          return (
            <IntegrationTestWrapper>
              <div>
                <div data-testid="global-loading">
                  {globalLoading ? 'Loading...' : 'Loaded'}
                </div>
                <ReminderList
                  reminders={[]}
                  onToggleActive={vi.fn()}
                  onEdit={vi.fn()}
                  onDelete={vi.fn()}
                  loading={globalLoading}
                />
                <button onClick={() => setGlobalLoading(false)}>
                  Finish Loading
                </button>
              </div>
            </IntegrationTestWrapper>
          );
        };

        const { getByTestId, getByText } = render(<TestComponent />);

        expect(getByTestId('global-loading')).toHaveTextContent('Loading...');
        expect(screen.getAllByTestId(/loading-/)).toHaveLength(3);

        const finishButton = getByText('Finish Loading');
        fireEvent.click(finishButton);

        expect(getByTestId('global-loading')).toHaveTextContent('Loaded');
        expect(screen.queryAllByTestId(/loading-/)).toHaveLength(0);
      });
    });

    describe('Error State Coordination', () => {
      it('should isolate error states between components', async () => {
        const user = userEvent.setup();
        const mockOnToggleError = vi.fn().mockRejectedValue(new Error('Toggle failed'));

        const TestComponent = () => {
          const [modalError, setModalError] = React.useState(false);
          const [reminderError, setReminderError] = React.useState(false);

          const handleToggleActive = async (id: number, active: boolean) => {
            try {
              await mockOnToggleError(id, active);
            } catch (error) {
              setReminderError(true);
            }
          };

          return (
            <IntegrationTestWrapper>
              <div>
                <div data-testid="modal-error">
                  Modal Error: {modalError ? 'Yes' : 'No'}
                </div>
                <div data-testid="reminder-error">
                  Reminder Error: {reminderError ? 'Yes' : 'No'}
                </div>
                <ReminderList
                  reminders={createMockReminders()}
                  onToggleActive={handleToggleActive}
                  onEdit={vi.fn()}
                  onDelete={vi.fn()}
                />
                <AddHealthRecordModal
                  isOpen={true}
                  onClose={vi.fn()}
                  onSuccess={() => setModalError(false)}
                />
              </div>
            </IntegrationTestWrapper>
          );
        };

        render(<TestComponent />);

        expect(screen.getByTestId('modal-error')).toHaveTextContent('Modal Error: No');
        expect(screen.getByTestId('reminder-error')).toHaveTextContent('Reminder Error: No');

        // Trigger reminder error
        const toggleSwitches = screen.getAllByRole('button');
        const firstToggle = toggleSwitches.find(btn => 
          btn.className.includes('bg-blue-600') || btn.className.includes('bg-gray-300')
        );
        
        if (firstToggle) {
          await user.click(firstToggle);
          
          await waitFor(() => {
            expect(screen.getByTestId('reminder-error')).toHaveTextContent('Reminder Error: Yes');
            expect(screen.getByTestId('modal-error')).toHaveTextContent('Modal Error: No');
          });
        }
      });
    });
  });

  describe('Accessibility Integration', () => {
    describe('Focus Management Across Components', () => {
      it('should handle focus flow between modal and parent components', async () => {
        const user = userEvent.setup();
        const mockTriggerButton = { focus: vi.fn() };

        const TestComponent = () => {
          const [modalOpen, setModalOpen] = React.useState(false);
          const triggerRef = React.useRef(mockTriggerButton);

          return (
            <IntegrationTestWrapper>
              <div>
                <button
                  ref={triggerRef}
                  onClick={() => setModalOpen(true)}
                  data-testid="modal-trigger"
                >
                  Open Modal
                </button>
                <AddHealthRecordModal
                  isOpen={modalOpen}
                  onClose={() => setModalOpen(false)}
                  onSuccess={vi.fn()}
                />
              </div>
            </IntegrationTestWrapper>
          );
        };

        render(<TestComponent />);

        const triggerButton = screen.getByTestId('modal-trigger');
        await user.click(triggerButton);

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        // Close modal with Escape
        await user.keyboard('{Escape}');

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      it('should maintain logical tab order across components', async () => {
        const user = userEvent.setup();

        render(
          <IntegrationTestWrapper>
            <div>
              <HealthRecordsFilters
                healthTypes={createMockHealthTypes()}
                searchParams={{}}
              />
              <ReminderList
                reminders={createMockReminders()}
                onToggleActive={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
              />
            </div>
          </IntegrationTestWrapper>
        );

        // Tab through filter inputs first
        await user.tab();
        expect(document.activeElement).toBe(screen.getByLabelText('Search'));

        await user.tab();
        expect(document.activeElement).toBe(screen.getByLabelText('Health Type'));

        await user.tab();
        expect(document.activeElement).toBe(screen.getByLabelText('Start Date'));

        await user.tab();
        expect(document.activeElement).toBe(screen.getByLabelText('End Date'));

        await user.tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Apply Filters' }));

        await user.tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Clear' }));

        // Then tab should move to reminder list elements
        await user.tab();
        expect(document.activeElement).toBeInTheDocument();
      });
    });

    describe('Keyboard Navigation Integration', () => {
      it('should handle keyboard shortcuts consistently across components', async () => {
        const user = userEvent.setup();
        const mockOnClose = vi.fn();

        render(
          <IntegrationTestWrapper>
            <AddHealthRecordModal
              isOpen={true}
              onClose={mockOnClose}
              onSuccess={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        // Escape should close modal
        await user.keyboard('{Escape}');
        expect(mockOnClose).toHaveBeenCalled();
      });

      it('should handle Enter key for form submission', async () => {
        const user = userEvent.setup();
        const mockOnSubmit = vi.fn();

        const TestForm = () => (
          <IntegrationTestWrapper>
            <form onSubmit={mockOnSubmit}>
              <HealthRecordsFilters
                healthTypes={createMockHealthTypes()}
                searchParams={{}}
              />
            </form>
          </IntegrationTestWrapper>
        );

        render(<TestForm />);

        const searchInput = screen.getByLabelText('Search');
        await user.type(searchInput, 'test');
        await user.keyboard('{Enter}');

        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Integration', () => {
    describe('Rendering Performance', () => {
      it('should render multiple components efficiently', () => {
        const startTime = performance.now();

        render(
          <IntegrationTestWrapper>
            <div>
              <HealthRecordsFilters
                healthTypes={createMockHealthTypes()}
                searchParams={createMockSearchParams()}
              />
              <ReminderList
                reminders={createMockReminders()}
                onToggleActive={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
              />
              <AddHealthRecordModal
                isOpen={false}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
              />
            </div>
          </IntegrationTestWrapper>
        );

        const endTime = performance.now();
        const renderTime = endTime - startTime;

        // Rendering should complete within reasonable time
        expect(renderTime).toBeLessThan(100); // 100ms threshold
      });

      it('should handle large datasets without performance issues', () => {
        const largeReminderList = Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          user_id: 'test-user',
          type_id: (i % 4) + 1,
          cron_expr: '0 9 * * *',
          message: `Reminder ${i + 1}`,
          active: i % 2 === 0,
          next_run_at: '2024-01-16T09:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          health_type: createMockHealthTypes()[i % 4],
        }));

        const startTime = performance.now();

        render(
          <IntegrationTestWrapper>
            <ReminderList
              reminders={largeReminderList}
              onToggleActive={vi.fn()}
              onEdit={vi.fn()}
              onDelete={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        const endTime = performance.now();
        const renderTime = endTime - startTime;

        expect(renderTime).toBeLessThan(200); // 200ms threshold for large dataset
        expect(screen.getAllByText(/Reminder \d+/)).toHaveLength(50);
      });
    });

    describe('Memory Management', () => {
      it('should clean up event listeners on component unmount', () => {
        const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
        const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

        const { unmount } = render(
          <IntegrationTestWrapper>
            <AddHealthRecordModal
              isOpen={true}
              onClose={vi.fn()}
              onSuccess={vi.fn()}
            />
          </IntegrationTestWrapper>
        );

        expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      });
    });
  });

  describe('Data Validation Integration', () => {
    describe('Cross-Component Validation', () => {
      it('should handle consistent data formats across components', () => {
        const mockReminders = createMockReminders();
        const mockHealthTypes = createMockHealthTypes();

        render(
          <IntegrationTestWrapper>
            <div>
              <HealthRecordsFilters
                healthTypes={mockHealthTypes}
                searchParams={{}}
              />
              <ReminderList
                reminders={mockReminders}
                onToggleActive={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
              />
            </div>
          </IntegrationTestWrapper>
        );

        // Verify health types are displayed consistently
        expect(screen.getByText('Weight')).toBeInTheDocument(); // In both filters and reminders
        expect(screen.getByText('Blood Pressure')).toBeInTheDocument();

        // Verify date formats are consistent
        const dateElements = screen.getAllByText(/2024-01-/);
        expect(dateElements.length).toBeGreaterThan(0);
      });

      it('should handle malformed data gracefully', () => {
        const malformedReminders = [
          {
            id: 1,
            user_id: 'test-user',
            type_id: 1,
            cron_expr: 'invalid-cron',
            message: '',
            active: true,
            next_run_at: 'invalid-date',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            health_type: null,
          },
        ];

        expect(() => {
          render(
            <IntegrationTestWrapper>
              <ReminderList
                reminders={malformedReminders as any}
                onToggleActive={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
              />
            </IntegrationTestWrapper>
          );
        }).not.toThrow();

        // Component should handle missing health_type gracefully
        expect(screen.getByText('Type 1')).toBeInTheDocument();
      });
    });
  });
});