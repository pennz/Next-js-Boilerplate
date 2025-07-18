import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { useRouter } from 'next/navigation';
import { HealthRecordForm } from './HealthRecordForm';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock translations
const mockTranslations = {
  label_health_type: 'Health Type',
  label_value: 'Value',
  label_recorded_at: 'Date & Time',
  label_weight: 'Weight',
  label_blood_pressure: 'Blood Pressure',
  label_steps: 'Steps',
  label_heart_rate: 'Heart Rate',
  label_sleep_hours: 'Sleep Hours',
  label_water_intake: 'Water Intake',
  label_calories: 'Calories',
  label_exercise_minutes: 'Exercise Minutes',
  unit_weight: 'kg',
  unit_blood_pressure: 'mmHg',
  unit_steps: 'steps',
  unit_heart_rate: 'bpm',
  unit_sleep_hours: 'hours',
  unit_water_intake: 'ml',
  unit_calories: 'kcal',
  unit_exercise_minutes: 'minutes',
  button_save_record: 'Save Record',
  button_update_record: 'Update Record',
  success_record_saved: 'Health record saved successfully',
  success_record_updated: 'Health record updated successfully',
  error_invalid_value: 'Invalid value provided',
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

describe('HealthRecordForm', () => {
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders all form fields correctly', () => {
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/health type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/value/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date & time/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save record/i })).toBeInTheDocument();
    });

    it('renders health type options correctly', () => {
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const select = screen.getByLabelText(/health type/i);
      expect(select).toBeInTheDocument();
      
      // Check that all health type options are present
      expect(screen.getByRole('option', { name: /weight/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /blood pressure/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /steps/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /heart rate/i })).toBeInTheDocument();
    });

    it('displays correct unit based on selected health type', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      // Default should show kg for weight
      expect(screen.getByText('kg')).toBeInTheDocument();

      // Change to steps
      const select = screen.getByLabelText(/health type/i);
      await user.selectOptions(select, '3'); // steps option
      
      expect(screen.getByText('steps')).toBeInTheDocument();
      expect(screen.queryByText('kg')).not.toBeInTheDocument();
    });

    it('renders with initial data when provided', () => {
      const initialData = {
        type_id: 2,
        value: 120,
        unit: 'mmHg',
        recorded_at: '2024-01-15T10:30',
      };

      render(
        <TestWrapper>
          <HealthRecordForm initialData={initialData} />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('120')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-15T10:30')).toBeInTheDocument();
    });

    it('renders in edit mode with correct button text', () => {
      render(
        <TestWrapper>
          <HealthRecordForm mode="edit" recordId={1} />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /update record/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('updates value input when user types', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      await user.clear(valueInput);
      await user.type(valueInput, '75.5');

      expect(valueInput).toHaveValue(75.5);
    });

    it('updates date/time input when user changes it', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const dateInput = screen.getByLabelText(/date & time/i);
      await user.clear(dateInput);
      await user.type(dateInput, '2024-01-15T14:30');

      expect(dateInput).toHaveValue('2024-01-15T14:30');
    });

    it('changes health type and updates unit accordingly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const select = screen.getByLabelText(/health type/i);
      
      // Change to heart rate
      await user.selectOptions(select, '4');
      
      expect(screen.getByText('bpm')).toBeInTheDocument();
      expect(screen.queryByText('kg')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty value', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      const submitButton = screen.getByRole('button', { name: /save record/i });

      await user.clear(valueInput);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/value must be greater than 0/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for negative value', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      const submitButton = screen.getByRole('button', { name: /save record/i });

      await user.clear(valueInput);
      await user.type(valueInput, '-5');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/value must be greater than 0/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for future date', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const dateInput = screen.getByLabelText(/date & time/i);
      const submitButton = screen.getByRole('button', { name: /save record/i });

      // Set a future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateString = futureDate.toISOString().slice(0, 16);

      await user.clear(dateInput);
      await user.type(dateInput, futureDateString);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/date cannot be in the future/i)).toBeInTheDocument();
      });
    });

    it('does not show validation errors for valid input', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      await user.clear(valueInput);
      await user.type(valueInput, '70');

      expect(screen.queryByText(/value must be greater than 0/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with correct data in create mode', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = vi.fn();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: 'Success' }),
      });

      render(
        <TestWrapper>
          <HealthRecordForm onSuccess={mockOnSuccess} />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      const dateInput = screen.getByLabelText(/date & time/i);
      const submitButton = screen.getByRole('button', { name: /save record/i });

      await user.clear(valueInput);
      await user.type(valueInput, '75');
      await user.clear(dateInput);
      await user.type(dateInput, '2024-01-15T10:30');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/health/records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type_id: 1,
            value: 75,
            unit: 'kg',
            recorded_at: '2024-01-15T10:30',
          }),
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('submits form with correct data in edit mode', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = vi.fn();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: 'Updated' }),
      });

      render(
        <TestWrapper>
          <HealthRecordForm 
            mode="edit" 
            recordId={1} 
            onSuccess={mockOnSuccess}
            initialData={{ type_id: 1, value: 70, unit: 'kg', recorded_at: '2024-01-15T10:30' }}
          />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      const submitButton = screen.getByRole('button', { name: /update record/i });

      await user.clear(valueInput);
      await user.type(valueInput, '75');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/health/records/1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"value":75'),
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ id: 1 }),
        }), 100))
      );

      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      const submitButton = screen.getByRole('button', { name: /save record/i });

      await user.clear(valueInput);
      await user.type(valueInput, '75');
      await user.click(submitButton);

      expect(screen.getByText(/saving.../i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText(/saving.../i)).not.toBeInTheDocument();
      });
    });

    it('shows success message after successful submission', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      const submitButton = screen.getByRole('button', { name: /save record/i });

      await user.clear(valueInput);
      await user.type(valueInput, '75');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/health record saved successfully/i)).toBeInTheDocument();
      });
    });

    it('shows error message when submission fails', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Server error' }),
      });

      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      const submitButton = screen.getByRole('button', { name: /save record/i });

      await user.clear(valueInput);
      await user.type(valueInput, '75');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });

    it('resets form after successful create submission', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      const submitButton = screen.getByRole('button', { name: /save record/i });

      await user.clear(valueInput);
      await user.type(valueInput, '75');
      await user.click(submitButton);

      await waitFor(() => {
        expect(valueInput).toHaveValue(0);
      });
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      const submitButton = screen.getByRole('button', { name: /save record/i });

      await user.clear(valueInput);
      await user.type(valueInput, '75');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels associated with inputs', () => {
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const typeSelect = screen.getByLabelText(/health type/i);
      const valueInput = screen.getByLabelText(/value/i);
      const dateInput = screen.getByLabelText(/date & time/i);

      expect(typeSelect).toHaveAttribute('id', 'type_id');
      expect(valueInput).toHaveAttribute('id', 'value');
      expect(dateInput).toHaveAttribute('id', 'recorded_at');
    });

    it('has proper button roles and names', () => {
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /save record/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('shows validation errors with proper styling', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <HealthRecordForm />
        </TestWrapper>
      );

      const valueInput = screen.getByLabelText(/value/i);
      const submitButton = screen.getByRole('button', { name: /save record/i });

      await user.clear(valueInput);
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/value must be greater than 0/i);
        expect(errorMessage).toHaveClass('text-red-500');
      });
    });
  });
});