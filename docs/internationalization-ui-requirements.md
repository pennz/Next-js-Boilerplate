# Internationalization UI Requirements

## Overview

This document provides comprehensive guidance for implementing internationalization (i18n) across all UI components in the Next.js health management application. The application uses `next-intl` for internationalization with support for English (en) and French (fr) locales.

## 1. Translation Key Mapping

### 1.1 Health Management Translation Keys

The health management system contains the most extensive set of translation keys, organized under the `HealthManagement` namespace:

#### Core Health Metrics
```json
{
  "label_weight": "Weight / Poids",
  "label_blood_pressure": "Blood Pressure / Tension Artérielle", 
  "label_steps": "Steps / Pas",
  "label_heart_rate": "Heart Rate / Fréquence Cardiaque",
  "label_sleep_hours": "Sleep Hours / Heures de Sommeil",
  "label_water_intake": "Water Intake / Consommation d'Eau",
  "label_calories": "Calories / Calories",
  "label_exercise_minutes": "Exercise Minutes / Minutes d'Exercice"
}
```

#### Form Field Labels
```json
{
  "label_value": "Value / Valeur",
  "label_unit": "Unit / Unité", 
  "label_recorded_at": "Recorded At / Enregistré le",
  "label_target_value": "Target Value / Valeur Cible",
  "label_target_date": "Target Date / Date Cible",
  "label_health_type": "Health Type / Type de Santé"
}
```

#### Action Buttons
```json
{
  "button_add_record": "Add Record / Ajouter un Dossier",
  "button_save_record": "Save Record / Enregistrer le Dossier",
  "button_update_record": "Update Record / Mettre à Jour le Dossier",
  "button_delete_record": "Delete Record / Supprimer le Dossier",
  "button_view_analytics": "View Analytics / Voir les Analyses",
  "button_export_data": "Export Data / Exporter les Données"
}
```

#### Validation Error Messages
```json
{
  "error_invalid_value": "Please enter a valid value / Veuillez entrer une valeur valide",
  "error_future_date_required": "Target date must be in the future / La date cible doit être dans le futur",
  "error_required_field": "This field is required / Ce champ est requis",
  "error_date_in_future": "Date cannot be in the future / La date ne peut pas être dans le futur",
  "error_value_too_low": "Value is below normal range / La valeur est en dessous de la plage normale",
  "error_value_too_high": "Value is above normal range / La valeur est au-dessus de la plage normale"
}
```

#### Success Notifications
```json
{
  "success_record_saved": "Health record saved successfully / Dossier de santé enregistré avec succès",
  "success_record_updated": "Health record updated successfully / Dossier de santé mis à jour avec succès",
  "success_goal_saved": "Health goal saved successfully / Objectif de santé enregistré avec succès"
}
```

### 1.2 Exercise Management Translation Keys

Limited but essential keys for exercise tracking:
```json
{
  "ExerciseManagement": {
    "meta_title": "Exercise & Training / Exercice et Entraînement",
    "meta_description": "Track your workouts, training plans, and fitness progress",
    "page_title_dashboard": "Exercise & Training / Exercice et Entraînement",
    "dashboard_subtitle": "Manage your workouts and training plans"
  }
}
```

### 1.3 Navigation and Layout Translation Keys

#### Root Layout Navigation
```json
{
  "RootLayout": {
    "home_link": "Home / Accueil",
    "about_link": "About / A propos", 
    "counter_link": "Counter / Compteur",
    "portfolio_link": "Portfolio / Portfolio",
    "sign_in_link": "Sign in / Se connecter",
    "sign_up_link": "Sign up / S'inscrire"
  }
}
```

#### Dashboard Navigation
```json
{
  "DashboardLayout": {
    "dashboard_link": "Dashboard / Tableau de bord",
    "user_profile_link": "Manage your account / Gérer votre compte",
    "health_overview_link": "Health Overview / Aperçu de la Santé",
    "health_records_link": "Health Records / Dossiers de Santé",
    "health_analytics_link": "Health Analytics / Analyses de Santé",
    "health_goals_link": "Health Goals / Objectifs de Santé",
    "health_reminders_link": "Health Reminders / Rappels de Santé",
    "exercise_overview_link": "Exercise & Training / Exercice et Entraînement",
    "sign_out": "Sign out / Se déconnecter"
  }
}
```

### 1.4 Counter Form Translation Keys

Example of form-specific translations:
```json
{
  "CounterForm": {
    "presentation": "The counter is stored in the database and incremented by the value you provide.",
    "label_increment": "Increment by / Incrémenter de",
    "button_increment": "Increment / Incrémenter", 
    "error_increment_range": "Value must be between 1 and 3 / La valeur doit être entre 1 et 3"
  }
}
```

## 2. Component Internationalization Patterns

### 2.1 Client Component Pattern (useTranslations)

```typescript
'use client';

import { useTranslations } from 'next-intl';

export const HealthRecordForm = () => {
  const t = useTranslations('HealthManagement');
  
  return (
    <form>
      <label>{t('label_health_type')}</label>
      <select>
        <option value="weight">{t('label_weight')}</option>
        <option value="blood_pressure">{t('label_blood_pressure')}</option>
      </select>
      
      <label>{t('label_value')}</label>
      <input type="number" placeholder={t('label_value')} />
      
      <button type="submit">{t('button_save_record')}</button>
    </form>
  );
};
```

### 2.2 Server Component Pattern (getTranslations)

```typescript
import { getTranslations } from 'next-intl/server';

export default async function HealthOverview() {
  const t = await getTranslations('HealthManagement');
  
  return (
    <div>
      <h1>{t('page_title_overview')}</h1>
      <p>{t('meta_description')}</p>
      
      <section>
        <h2>{t('overview_recent_records')}</h2>
        {/* Health records content */}
      </section>
      
      <section>
        <h2>{t('overview_active_goals')}</h2>
        {/* Goals content */}
      </section>
    </div>
  );
}
```

### 2.3 Translation Namespace Organization

**Recommended namespace structure:**
- `RootLayout` - Global navigation and layout elements
- `BaseTemplate` - Base template and footer content
- `Dashboard` - Dashboard-specific content
- `DashboardLayout` - Dashboard navigation and layout
- `HealthManagement` - All health-related functionality
- `ExerciseManagement` - Exercise and training features
- `CounterForm` - Counter example functionality
- `About`, `Portfolio`, `SignIn`, `SignUp` - Page-specific content

### 2.4 Dynamic Translation with Parameters

```typescript
// Translation with parameters
const t = useTranslations('HealthManagement');

// Usage examples:
t('goal_progress', { current: 75, target: 100, unit: 'kg' });
// Output: "Progress: 75/100 kg"

t('goal_days_remaining', { days: 5 });
// Output: "5 days remaining"

t('reminder_time_to_log', { type: t('label_weight') });
// Output: "Time to log your Weight"
```

## 3. Form Internationalization Requirements

### 3.1 Field Labels and Placeholders

All form fields must have localized labels and placeholders:

```typescript
<label htmlFor="healthType">{t('label_health_type')}</label>
<select id="healthType" name="healthType">
  <option value="">{t('select_health_type')}</option>
  <option value="weight">{t('label_weight')}</option>
  <option value="blood_pressure">{t('label_blood_pressure')}</option>
</select>

<label htmlFor="value">{t('label_value')}</label>
<input 
  id="value"
  type="number" 
  placeholder={t('label_value')}
  aria-label={t('label_value')}
/>
```

### 3.2 Validation Error Messages

Form validation must display localized error messages:

```typescript
// Zod validation schema with i18n
const healthRecordSchema = z.object({
  value: z.number({
    required_error: t('error_required_field'),
    invalid_type_error: t('error_invalid_value')
  }).positive(t('error_value_too_low')),
  
  recordedAt: z.date({
    required_error: t('error_required_field'),
    invalid_type_error: t('error_invalid_date')
  }).refine(date => date <= new Date(), {
    message: t('error_date_in_future')
  })
});
```

### 3.3 Success/Failure Notifications

```typescript
// Success notification
toast.success(t('success_record_saved'));

// Error notification  
toast.error(t('error_invalid_value'));

// Loading state
{isLoading && <span>{t('loading_records')}</span>}
```

### 3.4 Help Text and Instructions

```typescript
<div className="form-help">
  <p>{t('form_help_health_record')}</p>
  <small>{t('form_note_date_format')}</small>
</div>
```

## 4. Date and Number Localization

### 4.1 Date Format Requirements

```typescript
// Date formatting based on locale
const formatDate = (date: Date, locale: string) => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  }).format(date);
};

// Usage in components
const locale = useLocale();
const formattedDate = formatDate(new Date(), locale);
```

### 4.2 Number Formatting for Health Metrics

```typescript
// Number formatting with locale-specific decimal separators
const formatHealthValue = (value: number, locale: string) => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(value);
};

// Weight: 75.5 kg (en) vs 75,5 kg (fr)
```

### 4.3 Unit Localization

```json
{
  "unit_kg": "kg",
  "unit_lbs": "lbs", 
  "unit_mmhg": "mmHg",
  "unit_steps": "steps / pas",
  "unit_bpm": "bpm",
  "unit_hours": "hours / heures",
  "unit_ml": "ml",
  "unit_oz": "oz",
  "unit_kcal": "kcal",
  "unit_minutes": "minutes"
}
```

### 4.4 Time Zone Handling

```typescript
// Time zone aware date handling
const formatDateTime = (date: Date, locale: string, timeZone: string) => {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone
  }).format(date);
};
```

## 5. Navigation and Routing i18n

### 5.1 Locale-based Routing Patterns

The application uses `[locale]` dynamic routing:

```
/en/dashboard/health/records
/fr/dashboard/health/records
```

### 5.2 Language Switcher Component

```typescript
'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { usePathname } from '@/libs/I18nNavigation';
import { routing } from '@/libs/I18nRouting';

export const LocaleSwitcher = () => {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    router.push(`/${event.target.value}${pathname}`);
    router.refresh();
  };

  return (
    <select
      defaultValue={locale}
      onChange={handleChange}
      className="border border-gray-300 font-medium focus:outline-hidden focus-visible:ring-3"
      aria-label="lang-switcher"
    >
      {routing.locales.map(elt => (
        <option key={elt} value={elt}>
          {elt.toUpperCase()}
        </option>
      ))}
    </select>
  );
};
```

### 5.3 URL Structure for Different Locales

```
English: /en/dashboard/health/analytics/weight
French:  /fr/dashboard/health/analytics/weight
```

### 5.4 Metadata Localization for SEO

```typescript
// Page metadata with i18n
export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: 'HealthManagement' });
  
  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      languages: {
        'en': '/en/dashboard/health',
        'fr': '/fr/dashboard/health'
      }
    }
  };
}
```

## 6. Content Localization Patterns

### 6.1 Health Type Names and Descriptions

```typescript
// Dynamic health type localization
const getHealthTypeLabel = (type: string, t: any) => {
  const labelKey = `label_${type}`;
  return t(labelKey);
};

// Usage
const healthTypes = ['weight', 'blood_pressure', 'steps'];
const localizedTypes = healthTypes.map(type => ({
  value: type,
  label: getHealthTypeLabel(type, t)
}));
```

### 6.2 Chart Labels and Legends

```typescript
// Chart component with i18n
const HealthChart = ({ data, type }) => {
  const t = useTranslations('HealthManagement');
  
  const chartConfig = {
    title: t(`chart_${type}_trend`),
    xAxis: {
      label: t('label_date')
    },
    yAxis: {
      label: `${t(`label_${type}`)} (${t(`unit_${getUnit(type)}`)})` 
    }
  };
  
  return <Chart config={chartConfig} data={data} />;
};
```

### 6.3 Status Messages and Notifications

```typescript
// Status-based translations
const getStatusLabel = (status: string, t: any) => {
  return t(`status_${status}`); // status_active, status_completed, etc.
};

// Goal progress messages
const getGoalProgressMessage = (goal: Goal, t: any) => {
  if (goal.isCompleted) {
    return t('goal_completed_on', { date: formatDate(goal.completedAt) });
  }
  
  if (goal.isOverdue) {
    return t('goal_overdue_by', { days: goal.overdueDays });
  }
  
  return t('goal_days_remaining', { days: goal.daysRemaining });
};
```

### 6.4 Empty States and Help Text

```typescript
// Empty state messages
const EmptyState = ({ type }) => {
  const t = useTranslations('HealthManagement');
  
  const messages = {
    records: t('records_empty_state'),
    goals: t('goals_empty_state'), 
    reminders: t('reminders_empty_state'),
    analytics: t('analytics_empty_state')
  };
  
  return (
    <div className="empty-state">
      <p>{messages[type]}</p>
    </div>
  );
};
```

## 7. RTL Support Requirements

### 7.1 CSS Considerations

```css
/* RTL-aware styling */
.health-form {
  direction: ltr; /* Force LTR for health data forms */
}

.navigation {
  direction: inherit; /* Follow document direction */
}

/* Logical properties for RTL support */
.card {
  margin-inline-start: 1rem;
  margin-inline-end: 1rem;
  padding-inline: 1rem;
}
```

### 7.2 Component Layout Adjustments

```typescript
// RTL-aware component structure
const HealthCard = ({ data }) => {
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he'; // Future RTL locales
  
  return (
    <div className={`health-card ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="card-content">
        {/* Content automatically flows based on direction */}
      </div>
    </div>
  );
};
```

## 8. Missing Translation Handling

### 8.1 Fallback Patterns

```typescript
// Translation with fallback
const getTranslationWithFallback = (key: string, namespace: string, fallback: string) => {
  try {
    const t = useTranslations(namespace);
    return t(key);
  } catch (error) {
    console.warn(`Missing translation: ${namespace}.${key}`);
    return fallback;
  }
};
```

### 8.2 Missing Translation Detection

The application includes a `missing_translations.json` file that tracks untranslated keys:

```json
{
  "HealthManagement": {
    "page_description_analytics": "View detailed analytics for {type}",
    "stat_current": "Current",
    "stat_average": "Average", 
    "stat_minimum": "Minimum",
    "stat_maximum": "Maximum",
    "goal_progress_title": "Goal Progress",
    "chart_title_trend": "{type} Trend",
    "insights_title": "Insights"
  }
}
```

### 8.3 Development Mode Translation Warnings

```typescript
// Development helper for missing translations
if (process.env.NODE_ENV === 'development') {
  const originalT = useTranslations;
  
  const wrappedT = (namespace: string) => {
    const t = originalT(namespace);
    
    return (key: string, values?: any) => {
      try {
        return t(key, values);
      } catch (error) {
        console.warn(`Missing translation: ${namespace}.${key}`);
        return `[MISSING: ${namespace}.${key}]`;
      }
    };
  };
}
```

## 9. Translation Workflow Requirements

### 9.1 Translation File Structure

```
src/
├── locales/
│   ├── en.json          # English translations
│   ├── fr.json          # French translations
│   └── missing_translations.json  # Tracking missing keys
```

### 9.2 Translation Key Naming Conventions

- **Namespace**: Component or feature name (e.g., `HealthManagement`)
- **Category prefixes**: 
  - `label_` for form labels
  - `button_` for button text
  - `error_` for error messages
  - `success_` for success messages
  - `page_title_` for page titles
  - `meta_` for metadata
  - `chart_` for chart-related text
  - `status_` for status indicators

### 9.3 Translation Validation

```typescript
// Script to validate translation completeness
const validateTranslations = () => {
  const enKeys = extractKeys(enTranslations);
  const frKeys = extractKeys(frTranslations);
  
  const missingInFr = enKeys.filter(key => !frKeys.includes(key));
  const missingInEn = frKeys.filter(key => !enKeys.includes(key));
  
  if (missingInFr.length > 0) {
    console.warn('Missing French translations:', missingInFr);
  }
  
  if (missingInEn.length > 0) {
    console.warn('Missing English translations:', missingInEn);
  }
};
```

### 9.4 Translation Update Workflow

1. **Add new translation keys** to `en.json` first
2. **Update component** to use the new keys
3. **Add corresponding French translations** to `fr.json`
4. **Update `missing_translations.json`** if keys are temporarily missing
5. **Run translation validation** before deployment
6. **Test both locales** in development and staging

### 9.5 Dynamic Content Translation

```typescript
// For user-generated content that needs translation
const translateUserContent = async (content: string, targetLocale: string) => {
  // Integration with translation service
  // This would be used for user-generated health notes, goals, etc.
  return await translationService.translate(content, targetLocale);
};
```

## 10. Performance Considerations

### 10.1 Translation Bundle Optimization

```typescript
// Lazy load translations for specific features
const loadHealthTranslations = async (locale: string) => {
  const translations = await import(`../locales/${locale}/health.json`);
  return translations.default;
};
```

### 10.2 Translation Caching

```typescript
// Cache translations in memory for better performance
const translationCache = new Map();

const getCachedTranslations = (locale: string, namespace: string) => {
  const cacheKey = `${locale}-${namespace}`;
  
  if (!translationCache.has(cacheKey)) {
    const translations = loadTranslations(locale, namespace);
    translationCache.set(cacheKey, translations);
  }
  
  return translationCache.get(cacheKey);
};
```

## 11. Testing i18n Implementation

### 11.1 Translation Key Testing

```typescript
// Test that all required translation keys exist
describe('Health Management Translations', () => {
  test('should have all required English translations', () => {
    const requiredKeys = [
      'label_weight',
      'label_blood_pressure', 
      'button_save_record',
      'error_required_field'
    ];
    
    requiredKeys.forEach(key => {
      expect(enTranslations.HealthManagement[key]).toBeDefined();
    });
  });
  
  test('should have matching French translations', () => {
    const enKeys = Object.keys(enTranslations.HealthManagement);
    const frKeys = Object.keys(frTranslations.HealthManagement);
    
    expect(frKeys).toEqual(expect.arrayContaining(enKeys));
  });
});
```

### 11.2 Component i18n Testing

```typescript
// Test component rendering with different locales
describe('HealthRecordForm i18n', () => {
  test('should render in English', () => {
    render(
      <NextIntlClientProvider locale="en" messages={enTranslations}>
        <HealthRecordForm />
      </NextIntlClientProvider>
    );
    
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('Save Record')).toBeInTheDocument();
  });
  
  test('should render in French', () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frTranslations}>
        <HealthRecordForm />
      </NextIntlClientProvider>
    );
    
    expect(screen.getByText('Poids')).toBeInTheDocument();
    expect(screen.getByText('Enregistrer le Dossier')).toBeInTheDocument();
  });
});
```

This comprehensive internationalization requirements document provides complete guidance for implementing and maintaining i18n across all UI components in the health management application.