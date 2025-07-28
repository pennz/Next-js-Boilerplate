'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Health record validation schema (following the pattern from CounterValidation)
const HealthRecordValidation = z.object({
  type_id: z.coerce.number().min(1, 'Health type is required'),
  value: z.coerce.number().min(0.1, 'Value must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  recorded_at: z.string().min(1, 'Date and time is required').refine((date) => {
    const recordedDate = new Date(date);
    const now = new Date();
    return recordedDate <= now;
  }, 'Date cannot be in the future'),
});

type HealthRecordFormData = z.infer<typeof HealthRecordValidation>;

// Default health types data (can be overridden via props)
const DEFAULT_HEALTH_TYPES = [
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
];

type HealthType = {
  id: number;
  slug: string;
  display_name: string;
  unit: string;
};

type HealthRecordFormProps = {
  initialData?: Partial<HealthRecordFormData>;
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
  recordId?: number;
  healthTypes?: HealthType[];
};

export const HealthRecordForm = ({
  initialData,
  onSuccess,
  mode = 'create',
  recordId,
  healthTypes = DEFAULT_HEALTH_TYPES,
}: HealthRecordFormProps) => {
  const t = useTranslations('HealthManagement');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const router = useRouter();

  // Get current date/time in the format required for datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const form = useForm<HealthRecordFormData>({
    resolver: zodResolver(HealthRecordValidation),
    defaultValues: {
      type_id: initialData?.type_id || healthTypes[0]?.id || 1,
      value: initialData?.value || 0,
      unit: initialData?.unit || healthTypes[0]?.unit || 'kg',
      recorded_at: initialData?.recorded_at || getCurrentDateTime(),
    },
  });

  const selectedTypeId = form.watch('type_id');
  const selectedType = healthTypes.find(type => type.id === Number(selectedTypeId));

  // Update unit when health type changes
  const handleTypeChange = (typeId: number) => {
    const type = healthTypes.find(t => t.id === typeId);
    if (type) {
      form.setValue('unit', type.unit);
    }
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const url = '/api/health/records';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      // For PUT requests, include the ID in the request body as expected by the API
      const requestBody = mode === 'edit' && recordId
        ? { ...data, id: recordId }
        : data;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle zod validation errors that come in tree format
        if (response.status === 422 && errorData) {
          // Extract validation errors from zod tree format
          const extractErrors = (obj: any, path = ''): string[] => {
            const errors: string[] = [];

            if (typeof obj === 'string') {
              errors.push(obj);
            } else if (Array.isArray(obj)) {
              obj.forEach(item => errors.push(...extractErrors(item, path)));
            } else if (obj && typeof obj === 'object') {
              if (obj._errors && Array.isArray(obj._errors)) {
                errors.push(...obj._errors);
              }
              Object.keys(obj).forEach((key) => {
                if (key !== '_errors') {
                  const newPath = path ? `${path}.${key}` : key;
                  errors.push(...extractErrors(obj[key], newPath));
                }
              });
            }

            return errors;
          };

          const validationErrors = extractErrors(errorData);
          throw new Error(validationErrors.length > 0 ? validationErrors.join(', ') : 'Validation failed');
        }

        throw new Error(errorData.message || errorData.error || 'Failed to save health record');
      }

      const successMessage = mode === 'edit'
        ? t('success_record_updated')
        : t('success_record_saved');

      setSubmitSuccess(successMessage);

      // Call success callback before router refresh to allow modal to handle success state
      if (onSuccess) {
        onSuccess();
      }

      if (mode === 'create') {
        form.reset({
          type_id: data.type_id,
          value: 0,
          unit: data.unit,
          recorded_at: getCurrentDateTime(),
        });
      }

      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('error_invalid_value'));
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Health Type Selection */}
      <div>
        <label className="text-sm font-bold text-gray-700" htmlFor="type_id">
          {t('label_health_type')}
          <select
            id="type_id"
            className="ml-2 w-full appearance-none rounded-sm border border-gray-200 px-3 py-2 text-sm leading-tight text-gray-700 focus:outline-hidden focus:ring-3 focus:ring-blue-300/50"
            {...form.register('type_id', {
              onChange: e => handleTypeChange(Number(e.target.value)),
            })}
          >
            {healthTypes.map(type => (
              <option key={type.id} value={type.id}>
                {t(`label_${type.slug}` as any) || type.display_name}
              </option>
            ))}
          </select>
        </label>

        {form.formState.errors.type_id && (
          <div className="my-2 text-xs italic text-red-500">
            {form.formState.errors.type_id.message}
          </div>
        )}
      </div>

      {/* Value Input */}
      <div>
        <label className="text-sm font-bold text-gray-700" htmlFor="value">
          {t('label_value')}
          <div className="flex items-center">
            <input
              id="value"
              type="number"
              step="0.1"
              min="0"
              className="ml-2 flex-1 appearance-none rounded-sm border border-gray-200 px-3 py-2 text-sm leading-tight text-gray-700 focus:outline-hidden focus:ring-3 focus:ring-blue-300/50"
              {...form.register('value')}
            />
            <span className="ml-2 text-sm text-gray-600">
              {selectedType ? t(`unit_${selectedType.slug}` as any) || selectedType.unit : ''}
            </span>
          </div>
        </label>

        {form.formState.errors.value && (
          <div className="my-2 text-xs italic text-red-500">
            {form.formState.errors.value.message}
          </div>
        )}
      </div>

      {/* Hidden Unit Field */}
      <input type="hidden" {...form.register('unit')} />

      {/* Date/Time Input */}
      <div>
        <label className="text-sm font-bold text-gray-700" htmlFor="recorded_at">
          {t('label_recorded_at')}
          <input
            id="recorded_at"
            type="datetime-local"
            className="ml-2 w-full appearance-none rounded-sm border border-gray-200 px-3 py-2 text-sm leading-tight text-gray-700 focus:outline-hidden focus:ring-3 focus:ring-blue-300/50"
            {...form.register('recorded_at')}
          />
        </label>

        {form.formState.errors.recorded_at && (
          <div className="my-2 text-xs italic text-red-500">
            {form.formState.errors.recorded_at.message}
          </div>
        )}
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="my-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
          {submitError}
        </div>
      )}

      {/* Success Message */}
      {submitSuccess && (
        <div className="my-2 text-sm text-green-500 bg-green-50 border border-green-200 rounded-sm px-3 py-2">
          {submitSuccess}
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-4">
        <button
          className="rounded-sm bg-blue-500 px-5 py-2 font-bold text-white hover:bg-blue-600 focus:outline-hidden focus:ring-3 focus:ring-blue-300/50 disabled:pointer-events-none disabled:opacity-50"
          type="submit"
          disabled={isSubmitting || form.formState.isSubmitting}
        >
          {isSubmitting || form.formState.isSubmitting
            ? (mode === 'edit' ? t('button_updating') || 'Updating...' : t('button_saving') || 'Saving...')
            : (mode === 'edit' ? t('button_update_record') : t('button_save_record'))}
        </button>
      </div>
    </form>
  );
};
