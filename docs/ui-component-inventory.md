# UI Component Inventory

## Overview

This document provides a comprehensive catalog of all React components in the Next.js health management application. The components are classified by type, functionality, and usage patterns to help developers understand the architecture and reusability patterns.

## Component Classification

### Server Components
Components that render on the server and handle data fetching:

- **HealthOverview** - Dashboard overview with health statistics
- **ExerciseOverview** - Exercise tracking dashboard
- **CurrentCount** - Server-side counter display
- **Hello** - User greeting with authentication

### Client Components
Interactive components marked with `'use client'`:

- **HealthRecordForm** - Health data entry form
- **HealthChart** - Interactive data visualization
- **GoalCard** - Health goal management widget
- **ReminderList** - Health reminder management
- **CounterForm** - Interactive counter form
- **LocaleSwitcher** - Language selection dropdown

### Layout Components
Structural components for page layout:

- **BaseTemplate** - Foundation layout with header/footer

## Health Management Components

### HealthOverview (Server Component)

**File**: `src/components/health/HealthOverview.tsx`

**Purpose**: Dashboard overview displaying health statistics, recent records, active goals, and quick actions.

**Props Interface**: None (server component with internal data fetching)

**Data Dependencies**:
- Clerk authentication (`currentUser`)
- Database queries for health records, goals, and statistics
- Translation keys from `HealthManagement` namespace

**Key Features**:
- Real-time health statistics (total records, active goals, weekly progress)
- Recent health records display with time-based formatting
- Active goal progress visualization
- Quick action buttons for common tasks
- Mini chart placeholders for health trends
- Responsive grid layout (1-4 columns based on screen size)

**State Management**: Server-side data fetching with async/await patterns

**Styling Patterns**:
- Tailwind CSS utility classes
- Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Card-based layout with shadows and borders
- Color-coded progress indicators

**Accessibility Features**:
- Semantic HTML structure
- `data-testid` attributes for testing
- Proper heading hierarchy (h2, h3)
- Link navigation with hover states

### HealthRecordForm (Client Component)

**File**: `src/components/health/HealthRecordForm.tsx`

**Purpose**: Form for creating and editing health records with validation.

**Props Interface**:
```typescript
type HealthRecordFormProps = {
  initialData?: Partial<HealthRecordFormData>;
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
  recordId?: number;
};
```

**State Management**:
- React Hook Form with Zod validation
- Local state for submission status (`isSubmitting`, `submitError`, `submitSuccess`)
- Dynamic unit updates based on health type selection

**Validation Patterns**:
- Zod schema validation with custom refinements
- Real-time field validation
- Future date prevention
- Positive value enforcement
- Unit-specific validation

**Form Fields**:
- Health type selection (dropdown)
- Value input (number with step 0.1)
- Unit display (auto-updated based on type)
- Date/time picker (datetime-local)

**API Integration**:
- POST `/api/health/records` for creation
- PUT `/api/health/records/{id}` for updates
- Error handling with user feedback
- Router refresh after successful submission

**Accessibility Features**:
- Proper label associations (`htmlFor` attributes)
- ARIA-compliant form structure
- Focus management with ring indicators
- Error message styling with red color coding

### HealthChart (Client Component)

**File**: `src/components/health/HealthChart.tsx`

**Purpose**: Interactive data visualization using Recharts library.

**Props Interface**:
```typescript
export type HealthChartProps = {
  data: HealthDataPoint[];
  chartType?: 'line' | 'bar' | 'area';
  title?: string;
  height?: number;
  width?: string;
  color?: string;
  secondaryColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showBrush?: boolean;
  enableZoom?: boolean;
  goalValue?: number;
  loading?: boolean;
  error?: string;
  className?: string;
  dataKey?: string;
  xAxisKey?: string;
  unit?: string;
  formatTooltip?: (value: number, name: string) => [string, string];
  formatXAxis?: (value: string) => string;
  formatYAxis?: (value: number) => string;
};
```

**Chart Types Supported**:
- Line charts with smooth curves
- Bar charts with rounded corners
- Area charts with gradient fills

**State Management**:
- Loading states with spinner component
- Error states with error display
- Empty states with placeholder message

**Interactive Features**:
- Hover tooltips with formatted data
- Goal reference lines
- Brush component for data range selection
- Responsive container sizing

**Accessibility Features**:
- Screen reader compatible chart descriptions
- Keyboard navigation support
- High contrast color schemes
- Alternative text for chart elements

### GoalCard (Client Component)

**File**: `src/components/health/GoalCard.tsx`

**Purpose**: Individual health goal display and management widget.

**Props Interface**:
```typescript
type GoalCardProps = {
  goal: HealthGoal;
  onEdit?: (goal: HealthGoal) => void;
  onDelete?: (goalId: number) => Promise<void>;
  onStatusChange?: (goalId: number, status: HealthGoal['status']) => void;
  className?: string;
};
```

**State Management**:
- Local deletion loading state
- Progress calculation based on current vs target values
- Status badge color management

**Interactive Features**:
- Progress bar with color coding (red/yellow/blue/green)
- Status change buttons (pause/resume/complete)
- Edit and delete actions with confirmation
- Deadline tracking with overdue warnings

**Visual Indicators**:
- Status badges with color coding
- Progress bars with percentage display
- Achievement badges for completed goals
- Time-based deadline warnings

### ReminderList (Client Component)

**File**: `src/components/health/ReminderList.tsx`

**Purpose**: Health reminder management with cron scheduling.

**Props Interface**:
```typescript
type ReminderListProps = {
  reminders: HealthReminder[];
  onToggleActive: (id: number, active: boolean) => Promise<void>;
  onEdit: (reminder: HealthReminder) => void;
  onDelete: (id: number) => Promise<void>;
  loading?: boolean;
};
```

**Key Features**:
- Cron expression to human-readable conversion
- Toggle switches for active/inactive states
- Delete confirmation modal
- Next run time calculation and display

**State Management**:
- Modal state for delete confirmation
- Toggle loading states
- Loading skeleton for initial load

**Accessibility Features**:
- Toggle switches with proper ARIA labels
- Modal with focus management
- Keyboard navigation support

## Exercise Management Components

### ExerciseOverview (Server Component)

**File**: `src/components/exercise/ExerciseOverview.tsx`

**Purpose**: Exercise and training dashboard overview.

**Data Dependencies**:
- Exercise logs from database
- Training plans and sessions
- User authentication via Clerk

**Key Features**:
- Recent workout display
- Active training plan cards
- Exercise statistics (workouts, plans, sessions)
- Quick action buttons for exercise management
- Progress chart placeholders

**Layout Pattern**: Similar to HealthOverview with responsive grid layout

## Core UI Components

### CounterForm (Client Component)

**File**: `src/components/CounterForm.tsx`

**Purpose**: Simple counter increment form demonstrating basic form patterns.

**Props Interface**: None

**Validation**: Zod schema with range validation (1-3)

**State Management**: React Hook Form with form reset after submission

**API Integration**: PUT `/api/counter` with JSON payload

### CurrentCount (Server Component)

**File**: `src/components/CurrentCount.tsx`

**Purpose**: Server-side counter display with database integration.

**Data Fetching**: Direct database query with Drizzle ORM

**Testing Support**: E2E testing with `x-e2e-random-id` header

### LocaleSwitcher (Client Component)

**File**: `src/components/LocaleSwitcher.tsx`

**Purpose**: Language selection dropdown for internationalization.

**State Management**: Next.js router navigation with locale switching

**Accessibility**: ARIA label for screen readers

**Integration**: next-intl routing system

### Hello (Server Component)

**File**: `src/components/Hello.tsx`

**Purpose**: User greeting with authentication integration.

**Dependencies**: 
- Clerk authentication
- next-intl translations
- Sponsors component (referenced but not found)

### BaseTemplate (Server Component)

**File**: `src/templates/BaseTemplate.tsx`

**Purpose**: Foundation layout component with header, navigation, and footer.

**Props Interface**:
```typescript
type BaseTemplateProps = {
  leftNav: React.ReactNode;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
};
```

**Layout Structure**:
- Header with app name and description
- Dual navigation (left and right)
- Main content area
- Footer with copyright and attribution

## Component Props Analysis

### Required vs Optional Props

**Always Required**:
- `data` prop in HealthChart
- `goal` prop in GoalCard
- `reminders` prop in ReminderList

**Optional with Defaults**:
- `chartType: 'line'` in HealthChart
- `mode: 'create'` in HealthRecordForm
- `height: 300` in HealthChart
- `loading: false` in most components

**Callback Props** (Optional):
- `onSuccess`, `onEdit`, `onDelete` functions
- Event handlers for user interactions

### Prop Validation Patterns

**Zod Validation**:
- Form components use Zod schemas
- Runtime validation with error messages
- Type inference for TypeScript

**TypeScript Interfaces**:
- Strict typing for all component props
- Union types for status and mode values
- Generic types for flexible data structures

## State Management Patterns

### Local State Patterns

**Form State**:
- React Hook Form for complex forms
- Controlled components with validation
- Error and success message management

**UI State**:
- Loading states with boolean flags
- Modal visibility with local state
- Toggle states for interactive elements

**Async State**:
- Loading, error, and success states
- Promise-based state updates
- Optimistic UI updates

### Server State

**Data Fetching**:
- Server components with async/await
- Database queries with Drizzle ORM
- Authentication checks with Clerk

**Caching**:
- Next.js automatic caching for server components
- Router refresh for data invalidation

## Data Fetching Patterns

### Server Component Patterns

**Direct Database Access**:
```typescript
const result = await db.query.schema.findMany({
  where: eq(schema.userId, userId),
});
```

**Authentication Integration**:
```typescript
const user = await currentUser();
if (!user) return null;
```

**Translation Loading**:
```typescript
const t = await getTranslations('Namespace');
```

### Client Component Patterns

**API Calls**:
```typescript
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

**Error Handling**:
```typescript
try {
  // API call
} catch (error) {
  setError(error.message);
}
```

## Styling Patterns

### Tailwind CSS Usage

**Responsive Design**:
- Mobile-first approach with `md:` and `lg:` prefixes
- Grid layouts: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Flexible spacing with responsive padding/margins

**Component Styling**:
- Card components: `bg-white rounded-lg border border-gray-200 p-4 shadow-sm`
- Buttons: `bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded`
- Form inputs: `border border-gray-200 rounded-sm px-3 py-2 focus:ring-3 focus:ring-blue-300/50`

**Color Schemes**:
- Primary: Blue variants (`blue-500`, `blue-600`, `blue-700`)
- Success: Green variants (`green-500`, `green-100`)
- Error: Red variants (`red-500`, `red-100`)
- Warning: Yellow variants (`yellow-500`, `yellow-100`)

**State-Based Styling**:
- Hover states with `hover:` prefix
- Focus states with `focus:` prefix
- Disabled states with `disabled:` prefix

### Responsive Patterns

**Grid Layouts**:
- 1 column on mobile
- 2-3 columns on tablet
- 4 columns on desktop

**Typography**:
- Responsive text sizes: `text-sm md:text-base lg:text-lg`
- Responsive headings: `text-xl md:text-2xl lg:text-3xl`

## Accessibility Features

### ARIA Support

**Labels and Descriptions**:
- `aria-label` for interactive elements
- `htmlFor` associations in forms
- `role` attributes for custom components

**Live Regions**:
- Error messages with appropriate ARIA live regions
- Status updates for screen readers

### Keyboard Navigation

**Focus Management**:
- Visible focus indicators with ring utilities
- Logical tab order
- Skip links where appropriate

**Interactive Elements**:
- Button roles for clickable elements
- Form field associations
- Modal focus trapping

### Screen Reader Support

**Semantic HTML**:
- Proper heading hierarchy (h1, h2, h3)
- List structures for navigation
- Form fieldsets and legends

**Alternative Text**:
- Descriptive text for charts and graphs
- Icon alternatives with text labels

## Testing Patterns

### Component Testing

**Test Structure**:
- Vitest and React Testing Library
- Mock external dependencies (Clerk, next-intl, fetch)
- Comprehensive test coverage for user interactions

**Test Categories**:
- Rendering tests
- User interaction tests
- Form validation tests
- API integration tests
- Accessibility tests

**Mock Patterns**:
```typescript
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
```

### Storybook Integration

**Story Structure**:
- Default stories for basic usage
- Variation stories for different states
- Interactive stories for testing controls

**Documentation**:
- Component descriptions
- Props documentation
- Usage examples

## Performance Considerations

### Server Components

**Benefits**:
- Reduced client bundle size
- Server-side data fetching
- SEO-friendly rendering

**Optimization**:
- Database query optimization
- Caching strategies
- Minimal client-side JavaScript

### Client Components

**Optimization**:
- Lazy loading for heavy components
- Memoization for expensive calculations
- Debounced user inputs

**Bundle Splitting**:
- Dynamic imports for large dependencies
- Code splitting at route level

## Reusability Patterns

### Composition Patterns

**Layout Composition**:
- BaseTemplate accepts navigation slots
- Flexible content areas

**Form Composition**:
- Reusable validation schemas
- Common form field patterns

### Prop Patterns

**Render Props**:
- Flexible content rendering
- Custom formatting functions

**Compound Components**:
- Related components working together
- Shared state and context

## Integration Patterns

### Authentication

**Clerk Integration**:
- Server component user checks
- Client component authentication state
- Protected route patterns

### Internationalization

**next-intl Integration**:
- Server component translations
- Client component translations
- Locale-based routing

### Database

**Drizzle ORM**:
- Type-safe database queries
- Schema-based validation
- Migration support

## Component Dependencies

### External Libraries

**Core Dependencies**:
- React Hook Form + Zod (forms)
- Recharts (data visualization)
- Clerk (authentication)
- next-intl (internationalization)

**UI Dependencies**:
- Tailwind CSS (styling)
- Headless UI (accessible components)

### Internal Dependencies

**Shared Utilities**:
- Validation schemas
- Database models
- Configuration files

**Component Relationships**:
- Layout components wrap content components
- Form components use validation utilities
- Chart components consume data from server components

This comprehensive inventory provides developers with a complete understanding of the component architecture, enabling efficient development, maintenance, and extension of the health management application.