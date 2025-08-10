import { render, screen } from 'vitest-browser-react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthRecordsFilters } from './HealthRecordsFilters';

// Mock window.location
const mockLocation = {
  pathname: '/health/records',
  href: 'http://localhost:3000/health/records',
  search: '',
  hash: '',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock document.querySelector
const mockQuerySelector = vi.fn();
Object.defineProperty(document, 'querySelector', {
  value: mockQuerySelector,
  writable: true,
});

// Mock form element
const mockFormReset = vi.fn();
const mockForm = {
  reset: mockFormReset,
};

describe('HealthRecordsFilters', () => {
  const mockHealthTypes = [
    { id: 1, slug: 'weight', display_name: 'Weight', unit: 'kg' },
    { id: 2, slug: 'blood-pressure', display_name: 'Blood Pressure', unit: 'mmHg' },
    { id: 3, slug: 'steps', display_name: 'Steps', unit: 'steps' },
    { id: 4, slug: 'heart-rate', display_name: 'Heart Rate', unit: 'bpm' },
    { id: 5, slug: 'sleep-hours', display_name: 'Sleep Hours', unit: 'hours' },
  ];

  const defaultSearchParams = {};

  beforeEach(() => {
    mockQuerySelector.mockReturnValue(mockForm);
    mockFormReset.mockClear();
    mockLocation.href = 'http://localhost:3000/health/records';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering Tests', () => {
    it('renders with filters title and proper container styling', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
      
      const container = screen.getByText('Filters').closest('div');
      expect(container).toHaveClass('mb-6', 'space-y-4', 'rounded-lg', 'border', 'bg-card', 'p-4');
    });

    it('renders all four filter inputs', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/health type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });

    it('renders Apply Filters and Clear buttons with correct styling', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      const clearButton = screen.getByRole('button', { name: /clear/i });

      expect(applyButton).toBeInTheDocument();
      expect(clearButton).toBeInTheDocument();

      expect(applyButton).toHaveClass(
        'rounded-md',
        'bg-blue-600',
        'px-4',
        'py-2',
        'text-sm',
        'font-medium',
        'text-white',
        'hover:bg-blue-700'
      );

      expect(clearButton).toHaveClass(
        'rounded-md',
        'border',
        'border-gray-300',
        'bg-white',
        'px-4',
        'py-2',
        'text-sm',
        'font-medium',
        'text-gray-700',
        'hover:bg-gray-50'
      );
    });

    it('displays health type options in dropdown correctly', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const select = screen.getByLabelText(/health type/i);
      
      expect(screen.getByRole('option', { name: /all types/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /weight/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /blood pressure/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /steps/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /heart rate/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /sleep hours/i })).toBeInTheDocument();
    });

    it('uses default values from searchParams prop', () => {
      const searchParams = {
        search: 'test search',
        type: '2',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={searchParams}
        />
      );

      expect(screen.getByDisplayValue('test search')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
    });

    it('has proper responsive grid layout classes', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const gridContainer = screen.getByText('Search').closest('div')?.parentElement;
      expect(gridContainer).toHaveClass(
        'grid',
        'grid-cols-1',
        'gap-4',
        'md:grid-cols-2',
        'lg:grid-cols-4'
      );
    });
  });

  describe('Form Input Tests', () => {
    it('renders search input with correct label, placeholder, and default value', () => {
      const searchParams = { search: 'existing search' };

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={searchParams}
        />
      );

      const searchInput = screen.getByLabelText(/search/i);
      
      expect(searchInput).toHaveAttribute('type', 'text');
      expect(searchInput).toHaveAttribute('placeholder', 'Search records...');
      expect(searchInput).toHaveValue('existing search');
    });

    it('has proper ID, name, and accessibility attributes for search input', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const searchInput = screen.getByLabelText(/search/i);
      const searchLabel = screen.getByText('Search');

      expect(searchInput).toHaveAttribute('id', 'search');
      expect(searchInput).toHaveAttribute('name', 'search');
      expect(searchLabel).toHaveAttribute('for', 'search');
    });

    it('accepts user input and updates value', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const searchInput = screen.getByLabelText(/search/i);
      
      await user.clear(searchInput);
      await user.type(searchInput, 'new search term');

      expect(searchInput).toHaveValue('new search term');
    });

    it('has proper focus styles and keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const searchInput = screen.getByLabelText(/search/i);

      expect(searchInput).toHaveClass(
        'focus:border-blue-500',
        'focus:outline-none',
        'focus:ring-1',
        'focus:ring-blue-500'
      );

      await user.click(searchInput);
      expect(searchInput).toHaveFocus();
    });

    it('supports various text input scenarios', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const searchInput = screen.getByLabelText(/search/i);

      // Test special characters
      await user.clear(searchInput);
      await user.type(searchInput, 'test@#$%^&*()');
      expect(searchInput).toHaveValue('test@#$%^&*()');

      // Test numbers
      await user.clear(searchInput);
      await user.type(searchInput, '12345');
      expect(searchInput).toHaveValue('12345');

      // Test spaces
      await user.clear(searchInput);
      await user.type(searchInput, 'multiple word search');
      expect(searchInput).toHaveValue('multiple word search');
    });
  });

  describe('Health Type Dropdown Tests', () => {
    it('renders with "All Types" default option', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const allTypesOption = screen.getByRole('option', { name: /all types/i });
      expect(allTypesOption).toBeInTheDocument();
      expect(allTypesOption).toHaveValue('');
    });

    it('displays all provided health types as options', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      mockHealthTypes.forEach(type => {
        const option = screen.getByRole('option', { name: type.display_name });
        expect(option).toBeInTheDocument();
      });
    });

    it('uses health type ID as option value', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      mockHealthTypes.forEach(type => {
        const option = screen.getByRole('option', { name: type.display_name });
        expect(option).toHaveValue(type.id.toString());
      });
    });

    it('displays health type display_name as option text', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      mockHealthTypes.forEach(type => {
        expect(screen.getByText(type.display_name)).toBeInTheDocument();
      });
    });

    it('respects default value from searchParams', () => {
      const searchParams = { type: '3' };

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={searchParams}
        />
      );

      const select = screen.getByLabelText(/health type/i);
      expect(select).toHaveValue('3');
    });

    it('is accessible via keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const select = screen.getByLabelText(/health type/i);
      
      await user.click(select);
      expect(select).toHaveFocus();

      await user.selectOptions(select, '2');
      expect(select).toHaveValue('2');
    });
  });

  describe('Date Input Tests', () => {
    it('renders start date input with correct label and type', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      const startDateLabel = screen.getByText('Start Date');

      expect(startDateInput).toHaveAttribute('type', 'date');
      expect(startDateInput).toHaveAttribute('id', 'startDate');
      expect(startDateInput).toHaveAttribute('name', 'startDate');
      expect(startDateLabel).toHaveAttribute('for', 'startDate');
    });

    it('renders end date input with correct label and type', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const endDateInput = screen.getByLabelText(/end date/i);
      const endDateLabel = screen.getByText('End Date');

      expect(endDateInput).toHaveAttribute('type', 'date');
      expect(endDateInput).toHaveAttribute('id', 'endDate');
      expect(endDateInput).toHaveAttribute('name', 'endDate');
      expect(endDateLabel).toHaveAttribute('for', 'endDate');
    });

    it('accepts valid date formats (YYYY-MM-DD)', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await user.type(startDateInput, '2024-01-15');
      await user.type(endDateInput, '2024-01-31');

      expect(startDateInput).toHaveValue('2024-01-15');
      expect(endDateInput).toHaveValue('2024-01-31');
    });

    it('respects default values from searchParams', () => {
      const searchParams = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={searchParams}
        />
      );

      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument();
    });

    it('has proper accessibility attributes and labels', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      expect(startDateInput).toHaveClass(
        'focus:border-blue-500',
        'focus:outline-none',
        'focus:ring-1',
        'focus:ring-blue-500'
      );

      expect(endDateInput).toHaveClass(
        'focus:border-blue-500',
        'focus:outline-none',
        'focus:ring-1',
        'focus:ring-blue-500'
      );
    });

    it('supports keyboard navigation and date picker interaction', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      
      await user.click(startDateInput);
      expect(startDateInput).toHaveFocus();
    });
  });

  describe('Form Submission Tests', () => {
    it('has Apply Filters button with correct type and styling', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const applyButton = screen.getByRole('button', { name: /apply filters/i });

      expect(applyButton).toHaveAttribute('type', 'submit');
      expect(applyButton).toHaveClass(
        'rounded-md',
        'bg-blue-600',
        'px-4',
        'py-2',
        'text-sm',
        'font-medium',
        'text-white',
        'hover:bg-blue-700',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:ring-offset-2'
      );
    });

    it('is accessible via keyboard (Enter key)', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      
      await user.click(applyButton);
      expect(applyButton).toHaveFocus();
    });

    it('has proper focus styles and hover effects', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const applyButton = screen.getByRole('button', { name: /apply filters/i });

      expect(applyButton).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:ring-offset-2',
        'hover:bg-blue-700'
      );
    });
  });

  describe('Clear Functionality Tests', () => {
    it('has Clear button with correct type and styling', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });

      expect(clearButton).toHaveAttribute('type', 'button');
      expect(clearButton).toHaveClass(
        'rounded-md',
        'border',
        'border-gray-300',
        'bg-white',
        'px-4',
        'py-2',
        'text-sm',
        'font-medium',
        'text-gray-700',
        'hover:bg-gray-50',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:ring-offset-2'
      );
    });

    it('calls form.reset() when clicked', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });
      
      await user.click(clearButton);

      expect(mockQuerySelector).toHaveBeenCalledWith('form');
      expect(mockFormReset).toHaveBeenCalled();
    });

    it('navigates to window.location.pathname (removes query params)', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });
      
      await user.click(clearButton);

      expect(mockLocation.href).toBe('/health/records');
    });

    it('is accessible via keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });
      
      await user.click(clearButton);
      expect(clearButton).toHaveFocus();
    });

    it('handles cases where form is not found gracefully', async () => {
      const user = userEvent.setup();
      mockQuerySelector.mockReturnValue(null);

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });
      
      // Should not throw an error
      await user.click(clearButton);

      expect(mockQuerySelector).toHaveBeenCalledWith('form');
      expect(mockFormReset).not.toHaveBeenCalled();
    });
  });

  describe('Default Values Tests', () => {
    it('displays searchParams.search value when provided', () => {
      const searchParams = { search: 'test search value' };

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={searchParams}
        />
      );

      expect(screen.getByDisplayValue('test search value')).toBeInTheDocument();
    });

    it('shows searchParams.type value when provided', () => {
      const searchParams = { type: '4' };

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={searchParams}
        />
      );

      const select = screen.getByLabelText(/health type/i);
      expect(select).toHaveValue('4');
    });

    it('displays searchParams.startDate value when provided', () => {
      const searchParams = { startDate: '2024-06-01' };

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={searchParams}
        />
      );

      expect(screen.getByDisplayValue('2024-06-01')).toBeInTheDocument();
    });

    it('displays searchParams.endDate value when provided', () => {
      const searchParams = { endDate: '2024-06-30' };

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={searchParams}
        />
      );

      expect(screen.getByDisplayValue('2024-06-30')).toBeInTheDocument();
    });

    it('handles undefined or empty searchParams gracefully', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={undefined as any}
        />
      );

      const searchInput = screen.getByLabelText(/search/i);
      const typeSelect = screen.getByLabelText(/health type/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      expect(searchInput).toHaveValue('');
      expect(typeSelect).toHaveValue('');
      expect(startDateInput).toHaveValue('');
      expect(endDateInput).toHaveValue('');
    });

    it('handles partial searchParams (some fields missing)', () => {
      const searchParams = { search: 'partial search', type: '2' };

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={searchParams}
        />
      );

      expect(screen.getByDisplayValue('partial search')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);
      expect(startDateInput).toHaveValue('');
      expect(endDateInput).toHaveValue('');
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper labels associated with htmlFor/id', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const searchLabel = screen.getByText('Search');
      const typeLabel = screen.getByText('Health Type');
      const startDateLabel = screen.getByText('Start Date');
      const endDateLabel = screen.getByText('End Date');

      expect(searchLabel).toHaveAttribute('for', 'search');
      expect(typeLabel).toHaveAttribute('for', 'type');
      expect(startDateLabel).toHaveAttribute('for', 'startDate');
      expect(endDateLabel).toHaveAttribute('for', 'endDate');

      const searchInput = screen.getByLabelText(/search/i);
      const typeSelect = screen.getByLabelText(/health type/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      expect(searchInput).toHaveAttribute('id', 'search');
      expect(typeSelect).toHaveAttribute('id', 'type');
      expect(startDateInput).toHaveAttribute('id', 'startDate');
      expect(endDateInput).toHaveAttribute('id', 'endDate');
    });

    it('has descriptive labels and proper semantic structure', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      expect(screen.getByText('Search')).toHaveClass('block', 'text-sm', 'font-medium', 'text-gray-700', 'mb-1');
      expect(screen.getByText('Health Type')).toHaveClass('block', 'text-sm', 'font-medium', 'text-gray-700', 'mb-1');
      expect(screen.getByText('Start Date')).toHaveClass('block', 'text-sm', 'font-medium', 'text-gray-700', 'mb-1');
      expect(screen.getByText('End Date')).toHaveClass('block', 'text-sm', 'font-medium', 'text-gray-700', 'mb-1');
    });

    it('has proper focus indicators and styling', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const inputs = [
        screen.getByLabelText(/search/i),
        screen.getByLabelText(/health type/i),
        screen.getByLabelText(/start date/i),
        screen.getByLabelText(/end date/i),
      ];

      inputs.forEach(input => {
        expect(input).toHaveClass(
          'focus:border-blue-500',
          'focus:outline-none',
          'focus:ring-1',
          'focus:ring-blue-500'
        );
      });
    });

    it('has buttons with proper roles and keyboard accessibility', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      const clearButton = screen.getByRole('button', { name: /clear/i });

      expect(applyButton).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:ring-offset-2'
      );

      expect(clearButton).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:ring-offset-2'
      );
    });
  });

  describe('User Interaction Tests', () => {
    it('allows user to type in search input and value updates correctly', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const searchInput = screen.getByLabelText(/search/i);
      
      await user.clear(searchInput);
      await user.type(searchInput, 'user typed search');

      expect(searchInput).toHaveValue('user typed search');
    });

    it('allows user to select different health types from dropdown', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const typeSelect = screen.getByLabelText(/health type/i);
      
      await user.selectOptions(typeSelect, '3');
      expect(typeSelect).toHaveValue('3');

      await user.selectOptions(typeSelect, '1');
      expect(typeSelect).toHaveValue('1');
    });

    it('allows user to select dates using date inputs', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await user.type(startDateInput, '2024-03-01');
      await user.type(endDateInput, '2024-03-31');

      expect(startDateInput).toHaveValue('2024-03-01');
      expect(endDateInput).toHaveValue('2024-03-31');
    });

    it('allows user to clear form using Clear button', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });
      
      await user.click(clearButton);

      expect(mockFormReset).toHaveBeenCalled();
      expect(mockLocation.href).toBe('/health/records');
    });

    it('can navigate through form using keyboard only', async () => {
      const user = userEvent.setup();

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const searchInput = screen.getByLabelText(/search/i);
      const typeSelect = screen.getByLabelText(/health type/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);
      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      const clearButton = screen.getByRole('button', { name: /clear/i });

      // Tab through all elements
      await user.tab();
      expect(searchInput).toHaveFocus();

      await user.tab();
      expect(typeSelect).toHaveFocus();

      await user.tab();
      expect(startDateInput).toHaveFocus();

      await user.tab();
      expect(endDateInput).toHaveFocus();

      await user.tab();
      expect(applyButton).toHaveFocus();

      await user.tab();
      expect(clearButton).toHaveFocus();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles empty healthTypes array gracefully', () => {
      render(
        <HealthRecordsFilters
          healthTypes={[]}
          searchParams={defaultSearchParams}
        />
      );

      const typeSelect = screen.getByLabelText(/health type/i);
      
      expect(screen.getByRole('option', { name: /all types/i })).toBeInTheDocument();
      expect(typeSelect.children).toHaveLength(1); // Only "All Types" option
    });

    it('handles malformed searchParams data', () => {
      const malformedSearchParams = {
        search: null,
        type: undefined,
        startDate: 123,
        endDate: {},
      };

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={malformedSearchParams as any}
        />
      );

      // Should render without crashing and use empty defaults
      const searchInput = screen.getByLabelText(/search/i);
      const typeSelect = screen.getByLabelText(/health type/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      expect(searchInput).toHaveValue('');
      expect(typeSelect).toHaveValue('');
      expect(startDateInput).toHaveValue('');
      expect(endDateInput).toHaveValue('');
    });

    it('handles very long search terms', async () => {
      const user = userEvent.setup();
      const longSearchTerm = 'a'.repeat(1000);

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const searchInput = screen.getByLabelText(/search/i);
      
      await user.clear(searchInput);
      await user.type(searchInput, longSearchTerm);

      expect(searchInput).toHaveValue(longSearchTerm);
    });

    it('handles invalid date formats in searchParams', () => {
      const searchParams = {
        startDate: 'invalid-date',
        endDate: '2024/01/31', // Wrong format
      };

      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={searchParams}
        />
      );

      // Should render the invalid values as provided
      expect(screen.getByDisplayValue('invalid-date')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024/01/31')).toBeInTheDocument();
    });

    it('handles missing or undefined props', () => {
      render(
        <HealthRecordsFilters
          healthTypes={undefined as any}
          searchParams={undefined as any}
        />
      );

      // Should render without crashing
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Layout Tests', () => {
    it('uses proper grid classes for responsive layout', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const gridContainer = screen.getByText('Search').closest('div')?.parentElement;
      
      expect(gridContainer).toHaveClass(
        'grid',
        'grid-cols-1',
        'gap-4',
        'md:grid-cols-2',
        'lg:grid-cols-4'
      );
    });

    it('maintains proper spacing and alignment for buttons', () => {
      render(
        <HealthRecordsFilters
          healthTypes={mockHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const buttonContainer = screen.getByRole('button', { name: /apply filters/i }).parentElement;
      
      expect(buttonContainer).toHaveClass('flex', 'gap-2');
    });
  });

  describe('Health Type Data Tests', () => {
    it('handles healthTypes with missing display_name', () => {
      const healthTypesWithMissingName = [
        { id: 1, slug: 'weight', display_name: '', unit: 'kg' },
        { id: 2, slug: 'steps', display_name: undefined as any, unit: 'steps' },
      ];

      render(
        <HealthRecordsFilters
          healthTypes={healthTypesWithMissingName}
          searchParams={defaultSearchParams}
        />
      );

      // Should still render options, even with empty/missing display_name
      const typeSelect = screen.getByLabelText(/health type/i);
      expect(typeSelect.children).toHaveLength(3); // "All Types" + 2 health types
    });

    it('handles healthTypes with duplicate IDs', () => {
      const healthTypesWithDuplicates = [
        { id: 1, slug: 'weight', display_name: 'Weight', unit: 'kg' },
        { id: 1, slug: 'weight-duplicate', display_name: 'Weight Duplicate', unit: 'kg' },
        { id: 2, slug: 'steps', display_name: 'Steps', unit: 'steps' },
      ];

      render(
        <HealthRecordsFilters
          healthTypes={healthTypesWithDuplicates}
          searchParams={defaultSearchParams}
        />
      );

      // Should render all options despite duplicate IDs
      const typeSelect = screen.getByLabelText(/health type/i);
      expect(typeSelect.children).toHaveLength(4); // "All Types" + 3 health types
    });

    it('handles very long health type names', () => {
      const healthTypesWithLongNames = [
        { 
          id: 1, 
          slug: 'very-long-name', 
          display_name: 'This is a very long health type name that might cause layout issues', 
          unit: 'units' 
        },
      ];

      render(
        <HealthRecordsFilters
          healthTypes={healthTypesWithLongNames}
          searchParams={defaultSearchParams}
        />
      );

      expect(screen.getByText('This is a very long health type name that might cause layout issues')).toBeInTheDocument();
    });

    it('displays health types in provided order', () => {
      const orderedHealthTypes = [
        { id: 3, slug: 'steps', display_name: 'Steps', unit: 'steps' },
        { id: 1, slug: 'weight', display_name: 'Weight', unit: 'kg' },
        { id: 2, slug: 'blood-pressure', display_name: 'Blood Pressure', unit: 'mmHg' },
      ];

      render(
        <HealthRecordsFilters
          healthTypes={orderedHealthTypes}
          searchParams={defaultSearchParams}
        />
      );

      const typeSelect = screen.getByLabelText(/health type/i);
      const options = Array.from(typeSelect.children) as HTMLOptionElement[];
      
      // Skip first option (All Types)
      expect(options[1]).toHaveTextContent('Steps');
      expect(options[2]).toHaveTextContent('Weight');
      expect(options[3]).toHaveTextContent('Blood Pressure');
    });
  });
});