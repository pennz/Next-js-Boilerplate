# Form Handling Patterns Analysis

This document provides a comprehensive analysis of form handling patterns used throughout the Next.js health management application, focusing on React Hook Form + Zod resolver architecture and implementation patterns.

## 1. Form Architecture Pattern

### Core Technology Stack
The application consistently uses a modern form handling architecture built on:

- **React Hook Form** - For form state management and user interactions
- **Zod** - For schema validation and type safety
- **@hookform/resolvers/zod** - For seamless integration between React Hook Form and Zod
- **next-intl** - For internationalization of form labels and messages

### Standard Form Setup Pattern
```typescript
// Standard form initialization pattern used across all forms
const form = useForm<FormDataType>({
  resolver: zodResolver(ValidationSchema),
  defaultValues: {
    // Initial values with proper typing
  },
});

const handleSubmit = form.handleSubmit(async (data) => {
  // Submission logic with error handling
});
```

### Component Structure Pattern
All forms follow a consistent structure:
1. **Imports** - React Hook Form, Zod resolver, translations, router
2. **Validation Schema** - Inline or imported Zod schema
3. **Type Definitions** - TypeScript types inferred from Zod schema
4. **Component Props Interface** - Standardized props for reusability
5. **Form Hook Initialization** - useForm with resolver and defaults
6. **State Management** - Loading, error, and success states
7. **Submit Handler** - Async function with API integration
8. **JSX Structure** - Semantic form markup with accessibility

## 2. Health Record Form Patterns

### Field Types and Implementation

#### Select Field Pattern (Health Type Selection)
```typescript
// Dynamic select with onChange handler for dependent field updates
<select
  id="type_id"
  className="ml-2 w-full appearance-none rounded-sm border border-gray-200 px-3 py-2 text-sm leading-tight text-gray-700 focus:outline-hidden focus:ring-3 focus:ring-blue-300/50"
  {...form.register('type_id', {
    onChange: e => handleTypeChange(Number(e.target.value)),
  })}
>
  {HEALTH_TYPES.map(type => (
    <option key={type.id} value={type.id}>
      {t(`label_${type.slug}` as any) || type.display_name}
    </option>
  ))}
</select>
```

#### Number Input Pattern (Value Entry)
```typescript
// Number input with step, min attributes and unit display
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
```

#### DateTime Input Pattern (Timestamp Recording)
```typescript
// DateTime-local input with current time default
<input
  id="recorded_at"
  type="datetime-local"
  className="ml-2 w-full appearance-none rounded-sm border border-gray-200 px-3 py-2 text-sm leading-tight text-gray-700 focus:outline-hidden focus:ring-3 focus:ring-blue-300/50"
  {...form.register('recorded_at')}
/>
```

### Dynamic Field Dependencies
The HealthRecordForm implements a sophisticated field dependency pattern:

```typescript
// Watch for health type changes
const selectedTypeId = form.watch('type_id');
const selectedType = HEALTH_TYPES.find(type => type.id === Number(selectedTypeId));

// Update dependent field when health type changes
const handleTypeChange = (typeId: number) => {
  const type = HEALTH_TYPES.find(t => t.id === typeId);
  if (type) {
    form.setValue('unit', type.unit);
  }
};
```

### Form Mode Handling
The form supports both create and edit modes with conditional behavior:

```typescript
type HealthRecordFormProps = {
  initialData?: Partial<HealthRecordFormData>;
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
  recordId?: number;
};

// Conditional API endpoint and method
const url = mode === 'edit' && recordId
  ? `/api/health/records/${recordId}`
  : '/api/health/records';

const method = mode === 'edit' ? 'PUT' : 'POST';
```

## 3. Validation Rule Patterns

### Field-Level Validation Rules

#### Basic Data Type Validation
```typescript
// Zod schema with coercion and basic validation
const HealthRecordValidation = z.object({
  type_id: z.coerce.number().min(1, 'Health type is required'),
  value: z.coerce.number().min(0.1, 'Value must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
});
```

#### Date Validation with Business Rules
```typescript
// Complex date validation with future date prevention
recorded_at: z.string().min(1, 'Date and time is required').refine((date) => {
  const recordedDate = new Date(date);
  const now = new Date();
  return recordedDate <= now;
}, 'Date cannot be in the future'),
```

### Advanced Validation Patterns

#### Range Validation with Health Metrics
```typescript
// Comprehensive health metric validation from HealthRecordValidation.ts
const ranges: Record<string, { min: number; max: number }> = {
  weight: { min: 20, max: 500 }, // kg or lbs
  blood_pressure_systolic: { min: 70, max: 250 }, // mmHg
  blood_pressure_diastolic: { min: 40, max: 150 }, // mmHg
  heart_rate: { min: 30, max: 220 }, // bpm
  steps: { min: 0, max: 100000 }, // steps per day
  sleep_hours: { min: 0, max: 24 }, // hours
  water_intake: { min: 0, max: 10000 }, // ml or oz
  calories: { min: 0, max: 10000 }, // kcal
  exercise_minutes: { min: 0, max: 1440 }, // minutes per day
};
```

#### Unit-Based Validation
```typescript
// Custom validation based on unit type
.refine((data) => {
  if (data.unit === '%' && data.value > 100) {
    return false;
  }
  if (data.unit === 'hours' && data.value > 24) {
    return false;
  }
  if (data.unit === 'minutes' && data.value > 1440) {
    return false;
  }
  return true;
}, {
  message: 'Value is not reasonable for the specified unit',
});
```

#### Cross-Field Validation
```typescript
// Date range validation ensuring logical relationships
.refine((data) => {
  if (data.start_date && data.end_date) {
    return data.start_date <= data.end_date;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
});
```

### Validation Error Display Pattern
```typescript
// Consistent error display across all forms
{form.formState.errors.fieldName && (
  <div className="my-2 text-xs italic text-red-500">
    {form.formState.errors.fieldName.message}
  </div>
)}
```

## 4. Form State Management

### Loading State Pattern
```typescript
// Loading state management during form submission
const [isSubmitting, setIsSubmitting] = useState(false);

// In submit handler
setIsSubmitting(true);
try {
  // API call
} finally {
  setIsSubmitting(false);
}

// UI reflection
<button
  type="submit"
  disabled={isSubmitting}
>
  {isSubmitting
    ? (mode === 'edit' ? 'Updating...' : 'Saving...')
    : (mode === 'edit' ? t('button_update_record') : t('button_save_record'))}
</button>
```

### Error State Management
```typescript
// Comprehensive error handling with user feedback
const [submitError, setSubmitError] = useState<string | null>(null);

// Error handling in submission
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to save health record');
  }
} catch (error) {
  setSubmitError(error instanceof Error ? error.message : t('error_invalid_value'));
}

// Error display
{submitError && (
  <div className="my-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
    {submitError}
  </div>
)}
```

### Success State Management
```typescript
// Success feedback with conditional messaging
const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

const successMessage = mode === 'edit'
  ? t('success_record_updated')
  : t('success_record_saved');

setSubmitSuccess(successMessage);

// Success display
{submitSuccess && (
  <div className="my-2 text-sm text-green-500 bg-green-50 border border-green-200 rounded-sm px-3 py-2">
    {submitSuccess}
  </div>
)}
```

### Form Reset Patterns
```typescript
// Conditional form reset based on mode
if (mode === 'create') {
  form.reset({
    type_id: data.type_id,
    value: 0,
    unit: data.unit,
    recorded_at: getCurrentDateTime(),
  });
}

// Simple reset for counter form
form.reset();
```

## 5. User Interaction Patterns

### Real-time Validation Feedback
- **Immediate validation** - Errors display as soon as field validation fails
- **Field-level feedback** - Each field shows its own validation state
- **Visual indicators** - Red text and borders for errors, green for success

### Field Dependency Updates
```typescript
// Real-time unit updates based on health type selection
const selectedTypeId = form.watch('type_id');
const selectedType = HEALTH_TYPES.find(type => type.id === Number(selectedTypeId));

// Automatic unit display update
<span className="ml-2 text-sm text-gray-600">
  {selectedType ? t(`unit_${selectedType.slug}` as any) || selectedType.unit : ''}
</span>
```

### Accessibility Features

#### Semantic Labels and IDs
```typescript
// Proper label association with form controls
<label className="text-sm font-bold text-gray-700" htmlFor="type_id">
  {t('label_health_type')}
  <select id="type_id" {...form.register('type_id')}>
    {/* options */}
  </select>
</label>
```

#### Focus Management
```typescript
// Focus ring styling for keyboard navigation
className = 'focus:outline-hidden focus:ring-3 focus:ring-blue-300/50';
```

#### ARIA Attributes
- Form fields have proper `id` attributes
- Labels are associated with controls via `htmlFor`
- Error messages are semantically linked to fields

### Mobile-Responsive Patterns
- **Flexible layouts** - Forms adapt to different screen sizes
- **Touch-friendly inputs** - Adequate spacing and sizing for mobile interaction
- **Responsive typography** - Text scales appropriately across devices

## 6. API Integration Patterns

### REST API Integration
```typescript
// Standardized fetch pattern with proper headers
const response = await fetch(url, {
  method,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

### Request/Response Handling
```typescript
// Comprehensive response handling
if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.message || 'Failed to save health record');
}

const result = await response.json();
```

### Error Handling Patterns
```typescript
// Multi-level error handling
try {
  // API call
} catch (error) {
  setSubmitError(error instanceof Error ? error.message : t('error_invalid_value'));
} finally {
  setIsSubmitting(false);
}
```

### Router Refresh Pattern
```typescript
// Automatic data refresh after successful operations
const router = useRouter();

// After successful submission
router.refresh();
```

## 7. Internationalization in Forms

### Translation Key Patterns
```typescript
// Consistent translation key naming
const t = useTranslations('HealthManagement');

// Field labels
{ t('label_health_type'); }
{ t('label_value'); }
{ t('label_recorded_at'); }

// Button text
{ t('button_save_record'); }
{ t('button_update_record'); }

// Error messages
{ t('error_invalid_value'); }

// Success messages
{ t('success_record_saved'); }
```

### Dynamic Translation with Parameters
```typescript
// Conditional translation based on form mode
const successMessage = mode === 'edit'
  ? t('success_record_updated')
  : t('success_record_saved');
```

### Fallback Patterns
```typescript
// Graceful fallback for missing translations
{ t(`label_${type.slug}` as any) || type.display_name; }
{ t(`unit_${selectedType.slug}` as any) || selectedType.unit; }
```

## 8. Form Testing Patterns

### Component Rendering Tests
```typescript
// Comprehensive form rendering verification
it('renders all form fields correctly', () => {
  render(<TestWrapper><HealthRecordForm /></TestWrapper>);

  expect(screen.getByLabelText(/health type/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/value/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/date & time/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /save record/i })).toBeInTheDocument();
});
```

### User Interaction Testing
```typescript
// Simulated user interactions
it('updates value input when user types', async () => {
  const user = userEvent.setup();
  render(<TestWrapper><HealthRecordForm /></TestWrapper>);

  const valueInput = screen.getByLabelText(/value/i);
  await user.clear(valueInput);
  await user.type(valueInput, '75.5');

  expect(valueInput).toHaveValue(75.5);
});
```

### Validation Testing
```typescript
// Comprehensive validation rule testing
it('shows validation error for negative value', async () => {
  const user = userEvent.setup();
  render(<TestWrapper><HealthRecordForm /></TestWrapper>);

  const valueInput = screen.getByLabelText(/value/i);
  const submitButton = screen.getByRole('button', { name: /save record/i });

  await user.clear(valueInput);
  await user.type(valueInput, '-5');
  await user.click(submitButton);

  await waitFor(() => {
    expect(screen.getByText(/value must be greater than 0/i)).toBeInTheDocument();
  });
});
```

### API Integration Testing
```typescript
// Mock API responses and test submission flows
it('submits form with correct data in create mode', async () => {
  const user = userEvent.setup();
  const mockOnSuccess = vi.fn();

  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ id: 1, message: 'Success' }),
  });

  render(<TestWrapper><HealthRecordForm onSuccess={mockOnSuccess} /></TestWrapper>);

  // User interactions...

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith('/api/health/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expectedData),
    });
  });

  expect(mockOnSuccess).toHaveBeenCalled();
});
```

### Accessibility Testing
```typescript
// Accessibility compliance verification
it('has proper form labels associated with inputs', () => {
  render(<TestWrapper><HealthRecordForm /></TestWrapper>);

  const typeSelect = screen.getByLabelText(/health type/i);
  const valueInput = screen.getByLabelText(/value/i);
  const dateInput = screen.getByLabelText(/date & time/i);

  expect(typeSelect).toHaveAttribute('id', 'type_id');
  expect(valueInput).toHaveAttribute('id', 'value');
  expect(dateInput).toHaveAttribute('id', 'recorded_at');
});
```

## Implementation Guidelines

### Form Development Checklist
1. **Schema Definition** - Create comprehensive Zod validation schema
2. **Type Safety** - Use `z.infer` for TypeScript type generation
3. **Default Values** - Provide sensible defaults for all fields
4. **Error Handling** - Implement loading, error, and success states
5. **Accessibility** - Ensure proper labels, IDs, and focus management
6. **Internationalization** - Use translation keys for all user-facing text
7. **Testing** - Write comprehensive tests for rendering, interaction, and validation
8. **API Integration** - Handle all response scenarios (success, error, network failure)
9. **User Feedback** - Provide clear feedback for all user actions
10. **Mobile Optimization** - Ensure forms work well on all device sizes

### Performance Considerations
- Use `form.watch()` sparingly to avoid unnecessary re-renders
- Implement debouncing for real-time validation when needed
- Consider lazy loading for large option lists
- Optimize bundle size by importing only needed validation functions

### Security Patterns
- Always validate on both client and server
- Sanitize user input before API submission
- Use HTTPS for all form submissions
- Implement proper CSRF protection
- Validate file uploads thoroughly

This comprehensive form handling pattern analysis provides the foundation for consistent, accessible, and maintainable form implementation throughout the health management application.
