import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

// Types for test data
type HealthType = {
  id: number;
  slug: string;
  display_name: string;
  unit: string;
};

type HealthReminder = {
  id: number;
  user_id: string;
  type_id: number;
  cron_expr: string;
  message: string;
  active: boolean;
  next_run_at: string;
  created_at: string;
  updated_at: string;
  health_type?: HealthType;
};

type SearchParams = {
  search?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
};

// Test data generators
const generateHealthTypes = (count: number = 5): HealthType[] => {
  const types = [
    { id: 1, slug: 'weight', display_name: 'Weight', unit: 'kg' },
    { id: 2, slug: 'blood-pressure', display_name: 'Blood Pressure', unit: 'mmHg' },
    { id: 3, slug: 'steps', display_name: 'Steps', unit: 'steps' },
    { id: 4, slug: 'heart-rate', display_name: 'Heart Rate', unit: 'bpm' },
    { id: 5, slug: 'sleep', display_name: 'Sleep Hours', unit: 'hours' },
    { id: 6, slug: 'water', display_name: 'Water Intake', unit: 'ml' },
    { id: 7, slug: 'exercise', display_name: 'Exercise Minutes', unit: 'minutes' },
  ];
  return types.slice(0, count);
};

const generateReminders = (count: number = 3): HealthReminder[] => {
  const baseDate = new Date('2024-01-15T10:00:00Z');
  const healthTypes = generateHealthTypes();
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    user_id: 'test-user',
    type_id: (i % healthTypes.length) + 1,
    cron_expr: ['0 9 * * *', '30 14 * * *', '0 8 * * 1', '0 10 15 * *'][i % 4],
    message: [
      'Remember to weigh yourself',
      'Time for your daily walk',
      'Don\'t forget to log your sleep hours',
      'Check your blood pressure today'
    ][i % 4],
    active: i % 2 === 0,
    next_run_at: new Date(baseDate.getTime() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
    created_at: baseDate.toISOString(),
    updated_at: baseDate.toISOString(),
    health_type: healthTypes[i % healthTypes.length],
  }));
};

const generateLongTextReminders = (): HealthReminder[] => {
  return [
    {
      id: 1,
      user_id: 'test-user',
      type_id: 1,
      cron_expr: '0 9 * * *',
      message: 'This is a very long reminder message that should test text wrapping and layout behavior when the content exceeds the normal container width and needs to be displayed properly without breaking the design',
      active: true,
      next_run_at: '2024-01-16T09:00:00Z',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      health_type: { id: 1, slug: 'weight', display_name: 'Weight', unit: 'kg' },
    },
  ];
};

// Helper functions for component setup
const setupAddHealthRecordModal = async (page: Page, isOpen: boolean = true, formState: 'empty' | 'filled' | 'error' = 'empty') => {
  await page.goto('/test-components/add-health-record-modal');
  
  const modalProps = {
    isOpen,
    formState,
  };
  
  await page.evaluate((props) => {
    window.testModalProps = props;
  }, modalProps);
  
  if (isOpen) {
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  }
};

const setupReminderList = async (page: Page, state: 'loading' | 'empty' | 'populated' | 'long-text' = 'populated') => {
  await page.goto('/test-components/reminder-list');
  
  let reminders: HealthReminder[] = [];
  let loading = false;
  
  switch (state) {
    case 'loading':
      loading = true;
      break;
    case 'empty':
      reminders = [];
      break;
    case 'populated':
      reminders = generateReminders(4);
      break;
    case 'long-text':
      reminders = generateLongTextReminders();
      break;
  }
  
  const listProps = {
    reminders,
    loading,
  };
  
  await page.evaluate((props) => {
    window.testReminderListProps = props;
  }, listProps);
  
  await page.waitForSelector('[data-testid="reminder-list"]', { timeout: 5000 });
};

const setupHealthRecordsFilters = async (page: Page, dataState: 'empty' | 'partial' | 'filled' = 'empty') => {
  await page.goto('/test-components/health-records-filters');
  
  const healthTypes = generateHealthTypes();
  let searchParams: SearchParams = {};
  
  switch (dataState) {
    case 'partial':
      searchParams = { search: 'weight' };
      break;
    case 'filled':
      searchParams = {
        search: 'blood pressure',
        type: '2',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };
      break;
  }
  
  const filterProps = {
    healthTypes,
    searchParams,
  };
  
  await page.evaluate((props) => {
    window.testFilterProps = props;
  }, filterProps);
  
  await page.waitForSelector('[data-testid="health-records-filters"]', { timeout: 5000 });
};

const setupDeleteConfirmationModal = async (page: Page, isOpen: boolean = true) => {
  await setupReminderList(page, 'populated');
  
  if (isOpen) {
    await page.evaluate(() => {
      window.testDeleteModalProps = {
        isOpen: true,
        reminderMessage: 'Remember to weigh yourself',
      };
    });
    await page.waitForSelector('[data-testid="delete-confirmation-modal"]', { timeout: 5000 });
  }
};

// Configure test settings
test.describe('Health Components Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport and disable animations for stable screenshots
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  });

  test.describe('AddHealthRecordModal Visual Tests', () => {
    test('modal in open state with empty form', async ({ page }) => {
      await setupAddHealthRecordModal(page, true, 'empty');
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-open-empty-form.png');
    });

    test('modal in open state with filled form', async ({ page }) => {
      await setupAddHealthRecordModal(page, true, 'filled');
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-open-filled-form.png');
    });

    test('modal in open state with form validation errors', async ({ page }) => {
      await setupAddHealthRecordModal(page, true, 'error');
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-open-form-errors.png');
    });

    test('modal backdrop and overlay styling', async ({ page }) => {
      await setupAddHealthRecordModal(page, true);
      await expect(page.locator('body')).toHaveScreenshot('modal-backdrop-overlay.png');
    });

    test('modal close button and header styling', async ({ page }) => {
      await setupAddHealthRecordModal(page, true);
      await expect(page.locator('[role="dialog"] .modal-header')).toHaveScreenshot('modal-header-close-button.png');
    });

    test('modal with focus on close button', async ({ page }) => {
      await setupAddHealthRecordModal(page, true);
      await page.focus('[aria-label="Close modal"]');
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-focus-close-button.png');
    });

    test('modal with focus on form elements', async ({ page }) => {
      await setupAddHealthRecordModal(page, true);
      await page.focus('#type_id');
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-focus-form-element.png');
    });

    test('modal responsive - mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupAddHealthRecordModal(page, true);
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-mobile-viewport.png');
    });

    test('modal responsive - tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setupAddHealthRecordModal(page, true);
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-tablet-viewport.png');
    });

    test('modal responsive - desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await setupAddHealthRecordModal(page, true);
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-desktop-viewport.png');
    });

    test('modal with high contrast settings', async ({ page }) => {
      await page.addStyleTag({
        content: `
          * {
            filter: contrast(150%) !important;
          }
        `,
      });
      await setupAddHealthRecordModal(page, true);
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-high-contrast.png');
    });

    test('modal with large text settings', async ({ page }) => {
      await page.addStyleTag({
        content: `
          * {
            font-size: 1.25em !important;
          }
        `,
      });
      await setupAddHealthRecordModal(page, true);
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-large-text.png');
    });

    test('modal keyboard navigation indicators', async ({ page }) => {
      await setupAddHealthRecordModal(page, true);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-keyboard-navigation.png');
    });
  });

  test.describe('ReminderList Visual Tests', () => {
    test('reminder list with multiple reminders', async ({ page }) => {
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-populated.png');
    });

    test('reminder list empty state', async ({ page }) => {
      await setupReminderList(page, 'empty');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-empty-state.png');
    });

    test('reminder list loading state with skeleton placeholders', async ({ page }) => {
      await setupReminderList(page, 'loading');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-loading-state.png');
    });

    test('active vs inactive reminder cards', async ({ page }) => {
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-card"]:first-child')).toHaveScreenshot('reminder-card-active.png');
      await expect(page.locator('[data-testid="reminder-card"]:nth-child(2)')).toHaveScreenshot('reminder-card-inactive.png');
    });

    test('reminder cards with different health types', async ({ page }) => {
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-cards"]')).toHaveScreenshot('reminder-cards-different-types.png');
    });

    test('reminder cards with long message text', async ({ page }) => {
      await setupReminderList(page, 'long-text');
      await expect(page.locator('[data-testid="reminder-card"]')).toHaveScreenshot('reminder-card-long-text.png');
    });

    test('toggle switches in on state', async ({ page }) => {
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="toggle-switch"]:first-child')).toHaveScreenshot('toggle-switch-on.png');
    });

    test('toggle switches in off state', async ({ page }) => {
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="toggle-switch"]:nth-child(2)')).toHaveScreenshot('toggle-switch-off.png');
    });

    test('toggle switches with focus indicators', async ({ page }) => {
      await setupReminderList(page, 'populated');
      await page.focus('[data-testid="toggle-switch"]:first-child button');
      await expect(page.locator('[data-testid="toggle-switch"]:first-child')).toHaveScreenshot('toggle-switch-focus.png');
    });

    test('delete confirmation modal overlay', async ({ page }) => {
      await setupDeleteConfirmationModal(page, true);
      await expect(page.locator('body')).toHaveScreenshot('delete-modal-overlay.png');
    });

    test('delete confirmation modal with reminder message', async ({ page }) => {
      await setupDeleteConfirmationModal(page, true);
      await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toHaveScreenshot('delete-modal-content.png');
    });

    test('delete confirmation modal button states', async ({ page }) => {
      await setupDeleteConfirmationModal(page, true);
      await expect(page.locator('[data-testid="delete-modal-buttons"]')).toHaveScreenshot('delete-modal-buttons.png');
    });

    test('reminder list responsive - mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-mobile.png');
    });

    test('reminder list responsive - tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-tablet.png');
    });

    test('reminder list responsive - desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-desktop.png');
    });
  });

  test.describe('HealthRecordsFilters Visual Tests', () => {
    test('empty filter form', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-empty-form.png');
    });

    test('populated filter form with all fields filled', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'filled');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-populated-form.png');
    });

    test('filter form with partial data', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'partial');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-partial-data.png');
    });

    test('search input with placeholder state', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await expect(page.locator('#search')).toHaveScreenshot('search-input-placeholder.png');
    });

    test('search input with filled state', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'partial');
      await expect(page.locator('#search')).toHaveScreenshot('search-input-filled.png');
    });

    test('health type dropdown in closed state', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await expect(page.locator('#type')).toHaveScreenshot('dropdown-closed-state.png');
    });

    test('health type dropdown in open state', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await page.click('#type');
      await expect(page.locator('#type')).toHaveScreenshot('dropdown-open-state.png');
    });

    test('date inputs without values', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await expect(page.locator('[data-testid="date-inputs"]')).toHaveScreenshot('date-inputs-empty.png');
    });

    test('date inputs with values', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'filled');
      await expect(page.locator('[data-testid="date-inputs"]')).toHaveScreenshot('date-inputs-filled.png');
    });

    test('apply filters button normal state', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await expect(page.locator('[type="submit"]')).toHaveScreenshot('apply-button-normal.png');
    });

    test('apply filters button hover state', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await page.hover('[type="submit"]');
      await expect(page.locator('[type="submit"]')).toHaveScreenshot('apply-button-hover.png');
    });

    test('apply filters button focus state', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await page.focus('[type="submit"]');
      await expect(page.locator('[type="submit"]')).toHaveScreenshot('apply-button-focus.png');
    });

    test('clear button normal state', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await expect(page.locator('[type="button"]')).toHaveScreenshot('clear-button-normal.png');
    });

    test('clear button hover state', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await page.hover('[type="button"]');
      await expect(page.locator('[type="button"]')).toHaveScreenshot('clear-button-hover.png');
    });

    test('clear button focus state', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await page.focus('[type="button"]');
      await expect(page.locator('[type="button"]')).toHaveScreenshot('clear-button-focus.png');
    });

    test('filter form responsive grid - mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupHealthRecordsFilters(page, 'filled');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-mobile-grid.png');
    });

    test('filter form responsive grid - tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setupHealthRecordsFilters(page, 'filled');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-tablet-grid.png');
    });

    test('filter form responsive grid - desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await setupHealthRecordsFilters(page, 'filled');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-desktop-grid.png');
    });

    test('form with focus indicators', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-focus-indicators.png');
    });

    test('form with high contrast styling', async ({ page }) => {
      await page.addStyleTag({
        content: `
          * {
            filter: contrast(150%) !important;
          }
        `,
      });
      await setupHealthRecordsFilters(page, 'filled');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-high-contrast.png');
    });
  });

  test.describe('Interactive State Visual Tests', () => {
    test('modal form hover effects on buttons', async ({ page }) => {
      await setupAddHealthRecordModal(page, true);
      await page.hover('[type="submit"]');
      await expect(page.locator('[role="dialog"] form')).toHaveScreenshot('modal-form-button-hover.png');
    });

    test('reminder toggle switch hover effects', async ({ page }) => {
      await setupReminderList(page, 'populated');
      await page.hover('[data-testid="toggle-switch"]:first-child button');
      await expect(page.locator('[data-testid="toggle-switch"]:first-child')).toHaveScreenshot('toggle-switch-hover.png');
    });

    test('reminder action buttons hover effects', async ({ page }) => {
      await setupReminderList(page, 'populated');
      await page.hover('[data-testid="edit-button"]:first-child');
      await expect(page.locator('[data-testid="reminder-actions"]:first-child')).toHaveScreenshot('reminder-actions-hover.png');
    });

    test('filter form input focus states', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      await page.focus('#search');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-input-focus.png');
    });

    test('loading spinner in reminder toggle', async ({ page }) => {
      await setupReminderList(page, 'populated');
      await page.evaluate(() => {
        window.testToggleLoadingState = { reminderId: 1, loading: true };
      });
      await expect(page.locator('[data-testid="toggle-switch"]:first-child')).toHaveScreenshot('toggle-loading-spinner.png');
    });

    test('skeleton placeholders animation frame', async ({ page }) => {
      await setupReminderList(page, 'loading');
      await expect(page.locator('[data-testid="skeleton-placeholder"]')).toHaveScreenshot('skeleton-animation-frame.png');
    });
  });

  test.describe('Cross-Component Visual Tests', () => {
    test('modal with form integration - complete view', async ({ page }) => {
      await setupAddHealthRecordModal(page, true, 'filled');
      await expect(page.locator('body')).toHaveScreenshot('modal-form-integration-complete.png');
    });

    test('reminder list with delete modal integration', async ({ page }) => {
      await setupDeleteConfirmationModal(page, true);
      await expect(page.locator('body')).toHaveScreenshot('reminder-list-delete-modal-integration.png');
    });

    test('filter form as part of larger page layout', async ({ page }) => {
      await page.goto('/test-components/health-page-layout');
      await page.waitForSelector('[data-testid="health-page"]');
      await expect(page.locator('[data-testid="health-page"]')).toHaveScreenshot('filters-in-page-layout.png');
    });

    test('multiple components used together', async ({ page }) => {
      await page.goto('/test-components/health-dashboard');
      await page.waitForSelector('[data-testid="health-dashboard"]');
      await expect(page.locator('[data-testid="health-dashboard"]')).toHaveScreenshot('components-combined-layout.png');
    });
  });

  test.describe('Responsive Design Visual Tests', () => {
    test('all components on large screen (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/test-components/health-dashboard');
      await page.waitForSelector('[data-testid="health-dashboard"]');
      await expect(page.locator('[data-testid="health-dashboard"]')).toHaveScreenshot('components-large-screen.png');
    });

    test('components in landscape orientation', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      await setupAddHealthRecordModal(page, true);
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-landscape-orientation.png');
    });

    test('components in portrait orientation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-portrait-orientation.png');
    });
  });

  test.describe('Theme and Styling Visual Tests', () => {
    test('components in light theme', async ({ page }) => {
      await page.addStyleTag({
        content: `
          :root {
            --background: white;
            --foreground: black;
            --primary: #3b82f6;
          }
        `,
      });
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-light-theme.png');
    });

    test('components with custom color variations', async ({ page }) => {
      await page.addStyleTag({
        content: `
          :root {
            --primary: #10b981;
            --secondary: #f59e0b;
            --accent: #ef4444;
          }
        `,
      });
      await setupHealthRecordsFilters(page, 'filled');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-custom-colors.png');
    });
  });

  test.describe('Data Variation Visual Tests', () => {
    test('components with minimal required data', async ({ page }) => {
      await page.evaluate(() => {
        window.testMinimalData = {
          reminders: [
            {
              id: 1,
              user_id: 'test',
              type_id: 1,
              cron_expr: '0 9 * * *',
              message: 'Test',
              active: true,
              next_run_at: '2024-01-16T09:00:00Z',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-15T10:00:00Z',
            },
          ],
        };
      });
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-minimal-data.png');
    });

    test('components with edge case data - special characters', async ({ page }) => {
      await page.evaluate(() => {
        window.testEdgeCaseData = {
          reminders: [
            {
              id: 1,
              user_id: 'test',
              type_id: 1,
              cron_expr: '0 9 * * *',
              message: 'Test with special chars: @#$%^&*()_+{}|:"<>?[]\\;\',./',
              active: true,
              next_run_at: '2024-01-16T09:00:00Z',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-15T10:00:00Z',
              health_type: { id: 1, slug: 'test', display_name: 'Test & Special <chars>', unit: 'kg' },
            },
          ],
        };
      });
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-special-characters.png');
    });

    test('components with large datasets - many reminders', async ({ page }) => {
      const manyReminders = generateReminders(15);
      await page.evaluate((reminders) => {
        window.testReminderListProps = { reminders, loading: false };
      }, manyReminders);
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-large-dataset.png');
    });
  });

  test.describe('Accessibility Visual Tests', () => {
    test('focus indicators on all interactive elements', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'filled');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-focus-indicators-all.png');
    });

    test('keyboard navigation sequence', async ({ page }) => {
      await setupAddHealthRecordModal(page, true);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-keyboard-navigation-sequence.png');
    });

    test('color blind friendly palettes', async ({ page }) => {
      await page.addStyleTag({
        content: `
          * {
            filter: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><defs><filter id='deuteranopia'><feColorMatrix type='matrix' values='0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0'/></filter></defs></svg>#deuteranopia") !important;
          }
        `,
      });
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('reminder-list-color-blind-friendly.png');
    });

    test('large text mode accessibility', async ({ page }) => {
      await page.addStyleTag({
        content: `
          * {
            font-size: 1.5em !important;
            line-height: 1.6 !important;
          }
        `,
      });
      await setupHealthRecordsFilters(page, 'filled');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('filters-large-text-mode.png');
    });
  });

  test.describe('Animation and Transition Visual Tests', () => {
    test('modal open transition key frame', async ({ page }) => {
      // Re-enable animations for this test
      await page.addStyleTag({
        content: `
          .modal-backdrop {
            transition: opacity 0.3s ease !important;
          }
          .modal-content {
            transition: transform 0.3s ease !important;
          }
        `,
      });
      await setupAddHealthRecordModal(page, true);
      await page.waitForTimeout(150); // Capture mid-transition
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('modal-open-transition.png');
    });

    test('toggle switch transition effects', async ({ page }) => {
      await page.addStyleTag({
        content: `
          .toggle-switch {
            transition: all 0.2s ease !important;
          }
        `,
      });
      await setupReminderList(page, 'populated');
      await page.click('[data-testid="toggle-switch"]:first-child button');
      await page.waitForTimeout(100);
      await expect(page.locator('[data-testid="toggle-switch"]:first-child')).toHaveScreenshot('toggle-switch-transition.png');
    });

    test('button hover transition effects', async ({ page }) => {
      await page.addStyleTag({
        content: `
          button {
            transition: all 0.2s ease !important;
          }
        `,
      });
      await setupHealthRecordsFilters(page, 'empty');
      await page.hover('[type="submit"]');
      await page.waitForTimeout(100);
      await expect(page.locator('[type="submit"]')).toHaveScreenshot('button-hover-transition.png');
    });

    test('focus indicator transition effects', async ({ page }) => {
      await page.addStyleTag({
        content: `
          *:focus {
            transition: box-shadow 0.2s ease !important;
          }
        `,
      });
      await setupAddHealthRecordModal(page, true);
      await page.focus('#type_id');
      await page.waitForTimeout(100);
      await expect(page.locator('#type_id')).toHaveScreenshot('focus-indicator-transition.png');
    });
  });

  test.describe('Error and Edge Case Visuals', () => {
    test('form validation error styling', async ({ page }) => {
      await setupAddHealthRecordModal(page, true, 'error');
      await expect(page.locator('[role="dialog"] form')).toHaveScreenshot('form-validation-errors.png');
    });

    test('network error state display', async ({ page }) => {
      await page.evaluate(() => {
        window.testErrorState = {
          error: 'Failed to load reminders. Please try again.',
          type: 'network',
        };
      });
      await setupReminderList(page, 'empty');
      await expect(page.locator('[data-testid="error-state"]')).toHaveScreenshot('network-error-state.png');
    });

    test('malformed data handling', async ({ page }) => {
      await page.evaluate(() => {
        window.testMalformedData = {
          reminders: [
            {
              id: null,
              message: undefined,
              active: 'invalid',
              health_type: null,
            },
          ],
        };
      });
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('malformed-data-handling.png');
    });

    test('extreme values - very large numbers', async ({ page }) => {
      await page.evaluate(() => {
        window.testExtremeValues = {
          searchParams: {
            search: 'A'.repeat(100),
            type: '999999999',
          },
        };
      });
      await setupHealthRecordsFilters(page, 'filled');
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('extreme-values-large.png');
    });

    test('long text content wrapping and truncation', async ({ page }) => {
      await setupReminderList(page, 'long-text');
      await expect(page.locator('[data-testid="reminder-card"]')).toHaveScreenshot('long-text-wrapping.png');
    });
  });

  test.describe('Cross-Browser Visual Consistency', () => {
    ['chromium', 'firefox', 'webkit'].forEach((browserName) => {
      test(`modal consistency in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
        
        await setupAddHealthRecordModal(page, true);
        await expect(page.locator('[role="dialog"]')).toHaveScreenshot(`modal-${browserName}.png`);
      });

      test(`reminder list consistency in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
        
        await setupReminderList(page, 'populated');
        await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot(`reminder-list-${browserName}.png`);
      });

      test(`filters consistency in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
        
        await setupHealthRecordsFilters(page, 'filled');
        await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot(`filters-${browserName}.png`);
      });
    });
  });

  test.describe('Performance Visual Tests', () => {
    test('large component lists rendering', async ({ page }) => {
      const largeReminderList = generateReminders(50);
      await page.evaluate((reminders) => {
        window.testReminderListProps = { reminders, loading: false };
      }, largeReminderList);
      await setupReminderList(page, 'populated');
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('large-component-list.png');
    });

    test('concurrent component rendering', async ({ page }) => {
      await page.goto('/test-components/concurrent-health-components');
      await page.waitForSelector('[data-testid="concurrent-components"]');
      await expect(page.locator('[data-testid="concurrent-components"]')).toHaveScreenshot('concurrent-rendering.png');
    });

    test('rapid state changes visual stability', async ({ page }) => {
      await setupReminderList(page, 'populated');
      
      // Simulate rapid state changes
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="toggle-switch"]:first-child button');
        await page.waitForTimeout(50);
      }
      
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('rapid-state-changes.png');
    });
  });

  test.describe('Visual Regression Configuration Tests', () => {
    test('baseline image consistency check', async ({ page }) => {
      await setupAddHealthRecordModal(page, true);
      
      // Take multiple screenshots to ensure consistency
      const screenshot1 = await page.locator('[role="dialog"]').screenshot();
      await page.waitForTimeout(100);
      const screenshot2 = await page.locator('[role="dialog"]').screenshot();
      
      // Screenshots should be identical for deterministic rendering
      expect(screenshot1).toEqual(screenshot2);
    });

    test('threshold tolerance verification', async ({ page }) => {
      await setupReminderList(page, 'populated');
      
      // Test with slight variations that should be within threshold
      await expect(page.locator('[data-testid="reminder-list"]')).toHaveScreenshot('threshold-test-base.png', {
        threshold: 0.2,
      });
    });

    test('screenshot naming convention verification', async ({ page }) => {
      await setupHealthRecordsFilters(page, 'empty');
      
      // Verify consistent naming pattern
      await expect(page.locator('[data-testid="health-records-filters"]')).toHaveScreenshot('naming-convention-test.png');
    });
  });
});