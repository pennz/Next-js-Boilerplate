'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
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

// Mock health types data (in real implementation, this would come from API)
const HEALTH_TYPES = [
  { id: 1, slug: 'weight', display_name: 'Weight', unit: 'kg' },
  { id: 2, slug: 'blood_pressure', display_name: 'Blood Pressure', unit: 'mmHg' },
  { id: 3, slug: 'steps', display_name: 'Steps', unit: 'steps' },
  { id: 4, slug: 'heart_rate', display_name: 'Heart Rate', unit: 'bpm' },
  { id: 5, slug: 'sleep_hours', display_name: 'Sleep Hours', unit: 'hours' },
  { id: 6, slug: 'water_intake', display_name: 'Water Intake', unit: 'ml' },
  { id: 7, slug: 'calories', display_name: 'Calories', unit: 'kcal' },
  { id: 8, slug: 'exercise_minutes', display_name: 'Exercise Minutes', unit: 'minutes' },
];

interface HealthRecordFormProps {
  initialData?: Partial<HealthRecordFormData>;
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
  recordId?: number;
}

export const HealthRecordForm = ({ 
  initialData, 
  onSuccess, 
  mode = 'create',
  recordId 
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
      type_id: initialData?.type_id || 1,
      value: initialData?.value || 0,
      unit: initialData?.unit || HEALTH_TYPES[0].unit,
      recorded_at: initialData?.recorded_at || getCurrentDateTime(),
    },
  });

  const selectedTypeId = form.watch('type_id');
  const selectedType = HEALTH_TYPES.find(type => type.id === Number(selectedTypeId));

  // Update unit when health type changes
  const handleTypeChange = (typeId: number) => {
    const type = HEALTH_TYPES.find(t => t.id === typeId);
    if (type) {
      form.setValue('unit', type.unit);
    }
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const url = mode === 'edit' && recordId 
        ? `/api/health/records/${recordId}` 
        : '/api/health/records';
      
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save health record');
      }

      const successMessage = mode === 'edit' 
        ? t('success_record_updated')
        : t('success_record_saved');
      
      setSubmitSuccess(successMessage);
      
      if (mode === 'create') {
        form.reset({
          type_id: data.type_id,
          value: 0,
          unit: data.unit,
          recorded_at: getCurrentDateTime(),
        });
      }

      if (onSuccess) {
        onSuccess();
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
              onChange: (e) => handleTypeChange(Number(e.target.value))
            })}
          >
            {HEALTH_TYPES.map((type) => (
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
          disabled={isSubmitting}
        >
          {isSubmitting 
            ? (mode === 'edit' ? 'Updating...' : 'Saving...') 
            : (mode === 'edit' ? t('button_update_record') : t('button_save_record'))
          }
        </button>
      </div>
    </form>
  );
};