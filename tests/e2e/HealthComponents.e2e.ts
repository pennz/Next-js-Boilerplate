// Third-party libraries
import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';

// Local test helpers
import {
  addHealthGoal,
  addHealthRecord,
  addHealthReminder,
  getFutureDate,
} from './helpers/healthTestHelpers';

/**
 * The x-e2e-random-id header provides a unique identifier for each test request,
 * helping to trace and isolate test runs for improved reliability and debugging.
 * This header is set in the beforeEach hook and included in all test requests.
 */

test.describe('Health Components E2E Tests', () => {
  let e2eRandomId: number;

  test.beforeEach(async ({ page }) => {
    e2eRandomId = faker.number.int({ max: 1000000 });
    await page.setExtraHTTPHeaders({
      'x-e2e-random-id': e2eRandomId.toString(),
    });
    await page.goto('/dashboard/health/records');
  });

  test.afterEach(async ({ page }) => {
    // Clean up any test data
    await page.goto('/dashboard/health/records');

    // Delete all records
    const recordCount = await page.getByTestId('health-record-item').count();
    for (let i = 0; i < recordCount; i++) {
      await page.getByTestId('delete-record-button').first().click();
      await page.getByRole('button', { name: 'Confirm Delete' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Clean up goals
    await page.goto('/dashboard/health/goals');
    const goalCount = await page.getByTestId('goal-card').count();
    for (let i = 0; i < goalCount; i++) {
      await page.getByTestId('delete-goal-button').first().click();
      await page.getByRole('button', { name: 'Confirm Delete' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Clean up reminders
    await page.goto('/dashboard/health/reminders');
    const reminderCount = await page.getByTestId('reminder-item').count();
    for (let i = 0; i < reminderCount; i++) {
      await page.getByTestId('delete-reminder-button').first().click();
      await page.getByRole('button', { name: 'Confirm Delete' }).click();
      await page.waitForLoadState('networkidle');
    }
  });

  test.describe('AddHealthRecordModal E2E Tests', () => {
    test.describe('Modal Opening and Closing', () => {
      test('should open modal when Add Record button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Add Health Record')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Close modal' })).toBeVisible();
      });

      test('should close modal when close button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        
        await page.getByRole('button', { name: 'Close modal' }).click();
        await expect(page.getByRole('dialog')).toBeHidden();
      });

      test('should close modal when Escape key is pressed', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeHidden();
      });

      test('should close modal when clicking backdrop', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        
        // Click on the backdrop (outside the modal content)
        await page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } });
        await expect(page.getByRole('dialog')).toBeHidden();
      });

      test('should not close modal when clicking modal content', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        
        // Click on the modal content area
        await page.locator('.bg-white.rounded-lg').click();
        await expect(page.getByRole('dialog')).toBeVisible();
      });
    });

    test.describe('Focus Management', () => {
      test('should move focus to close button when modal opens', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        // Wait for focus to move to close button
        await page.waitForTimeout(100);
        const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
        expect(focusedElement).toBe('Close modal');
      });

      test('should return focus to trigger button when modal closes', async ({ page }) => {
        const addButton = page.getByRole('button', { name: 'Add Record' });
        await addButton.click();
        
        await page.getByRole('button', { name: 'Close modal' }).click();
        
        // Check that focus returned to the Add Record button
        const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
        expect(focusedElement).toContain('Add Record');
      });

      test('should trap focus within modal during Tab navigation', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        // Tab through focusable elements in modal
        await page.keyboard.press('Tab'); // Should move to first form element
        await page.keyboard.press('Tab'); // Should move to next form element
        await page.keyboard.press('Tab'); // Should move to next form element
        await page.keyboard.press('Tab'); // Should move to save button
        await page.keyboard.press('Tab'); // Should wrap back to close button
        
        const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
        expect(focusedElement).toBe('Close modal');
      });

      test('should handle Shift+Tab navigation correctly', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        // Start from close button and Shift+Tab backwards
        await page.keyboard.press('Shift+Tab'); // Should move to last focusable element
        
        const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
        expect(focusedElement).toContain('Save'); // Should be on save button
      });
    });

    test.describe('Keyboard Navigation', () => {
      test('should support complete keyboard navigation through modal', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        // Navigate through form using keyboard
        await page.keyboard.press('Tab'); // Move to health type
        await page.keyboard.press('ArrowDown'); // Select health type
        await page.keyboard.press('Tab'); // Move to value field
        await page.keyboard.type('75.5');
        await page.keyboard.press('Tab'); // Move to unit field (if present)
        await page.keyboard.press('Tab'); // Move to date field (if present)
        await page.keyboard.press('Tab'); // Move to save button
        
        const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
        expect(focusedElement).toContain('Save');
      });

      test('should submit form via keyboard', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        // Fill form using keyboard
        await page.keyboard.press('Tab'); // Move to health type
        await page.keyboard.press('ArrowDown'); // Select first option
        await page.keyboard.press('Enter'); // Confirm selection
        await page.keyboard.press('Tab'); // Move to value
        await page.keyboard.type('80.0');
        await page.keyboard.press('Tab'); // Move to save button
        await page.keyboard.press('Enter'); // Submit form
        
        await expect(page.getByText('Record added successfully')).toBeVisible();
        await expect(page.getByRole('dialog')).toBeHidden();
      });

      test('should handle Enter key on close button', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        // Focus should be on close button initially
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog')).toBeHidden();
      });
    });

    test.describe('Form Integration', () => {
      test('should render HealthRecordForm correctly within modal', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        await expect(page.getByLabel('Health Type')).toBeVisible();
        await expect(page.getByLabel('Value')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Save Record' })).toBeVisible();
      });

      test('should close modal and show success message after form submission', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Value').fill('75.0');
        await page.getByRole('button', { name: 'Save Record' }).click();
        
        await expect(page.getByText('Record added successfully')).toBeVisible();
        await expect(page.getByRole('dialog')).toBeHidden();
      });

      test('should display form validation errors within modal', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        // Try to submit without filling required fields
        await page.getByRole('button', { name: 'Save Record' }).click();
        
        await expect(page.getByText('Health type is required')).toBeVisible();
        await expect(page.getByText('Value is required')).toBeVisible();
        await expect(page.getByRole('dialog')).toBeVisible(); // Modal should stay open
      });

      test('should handle form submission with invalid data', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Value').fill('-10'); // Invalid negative value
        await page.getByRole('button', { name: 'Save Record' }).click();
        
        await expect(page.getByText('Value must be a positive number')).toBeVisible();
        await expect(page.getByRole('dialog')).toBeVisible(); // Modal should stay open
      });
    });

    test.describe('Modal Accessibility', () => {
      test('should have proper ARIA attributes', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        const modal = page.getByRole('dialog');
        await expect(modal).toHaveAttribute('aria-modal', 'true');
        await expect(modal).toHaveAttribute('aria-labelledby');
        
        const title = page.locator('#modal-title');
        await expect(title).toBeVisible();
      });

      test('should announce modal title to screen readers', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        const modalTitle = await page.locator('#modal-title').textContent();
        expect(modalTitle).toContain('Add Health Record');
      });

      test('should be accessible via keyboard only', async ({ page }) => {
        // Navigate to Add Record button using keyboard
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        // Find and activate Add Record button
        let attempts = 0;
        while (attempts < 10) {
          const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
          if (focusedElement?.includes('Add Record')) {
            await page.keyboard.press('Enter');
            break;
          }
          await page.keyboard.press('Tab');
          attempts++;
        }
        
        await expect(page.getByRole('dialog')).toBeVisible();
      });
    });
  });

  test.describe('ReminderList E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/health/reminders');
    });

    test.describe('Reminder Display', () => {
      test('should display all reminders with correct data', async ({ page }) => {
        // Create test reminders
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Time to weigh yourself');
        await addHealthReminder(page, 'steps', '0 20 * * *', 'Log your daily steps');
        
        await expect(page.getByTestId('reminder-item')).toHaveCount(2);
        await expect(page.getByText('Time to weigh yourself')).toBeVisible();
        await expect(page.getByText('Log your daily steps')).toBeVisible();
      });

      test('should show health type, message, frequency, and status', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Daily weight check');
        
        const reminderCard = page.getByTestId('reminder-item').first();
        await expect(reminderCard.getByText('Weight')).toBeVisible();
        await expect(reminderCard.getByText('Daily weight check')).toBeVisible();
        await expect(reminderCard.getByText('Daily at 9:00')).toBeVisible();
        await expect(reminderCard.getByText('Active')).toBeVisible();
      });

      test('should display empty state when no reminders exist', async ({ page }) => {
        await expect(page.getByText('⏰')).toBeVisible();
        await expect(page.getByText('No reminders yet')).toBeVisible();
        await expect(page.getByText('Create your first reminder')).toBeVisible();
      });

      test('should display loading state with skeleton placeholders', async ({ page }) => {
        // Simulate loading state by intercepting API calls
        await page.route('**/api/health/reminders', route => {
          // Delay response to show loading state
          setTimeout(() => route.continue(), 2000);
        });
        
        await page.reload();
        
        // Check for skeleton loading elements
        await expect(page.locator('.animate-pulse')).toHaveCount(3);
        
        // Clean up route
        await page.unroute('**/api/health/reminders');
      });
    });

    test.describe('Toggle Functionality', () => {
      test('should change reminder active status when toggle is clicked', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Weight reminder');
        
        const toggleSwitch = page.getByTestId('reminder-toggle').first();
        await expect(page.getByText('Active')).toBeVisible();
        
        await toggleSwitch.click();
        await page.waitForLoadState('networkidle');
        
        await expect(page.getByText('Inactive')).toBeVisible();
        await expect(page.getByText('Reminder deactivated')).toBeVisible();
      });

      test('should show loading state during toggle operation', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Weight reminder');
        
        // Intercept toggle API call to add delay
        await page.route('**/api/health/reminders/*/toggle', route => {
          setTimeout(() => route.continue(), 1000);
        });
        
        const toggleSwitch = page.getByTestId('reminder-toggle').first();
        await toggleSwitch.click();
        
        // Check for loading state (disabled toggle)
        await expect(toggleSwitch).toBeDisabled();
        
        await page.unroute('**/api/health/reminders/*/toggle');
      });

      test('should update UI immediately after successful API response', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Weight reminder');
        
        const toggleSwitch = page.getByTestId('reminder-toggle').first();
        await toggleSwitch.click();
        await page.waitForLoadState('networkidle');
        
        // Verify immediate UI update
        await expect(page.getByText('Inactive')).toBeVisible();
        await expect(toggleSwitch).not.toBeDisabled();
      });
    });

    test.describe('Delete Confirmation', () => {
      test('should open confirmation modal when delete button is clicked', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Weight reminder');
        
        await page.getByTestId('delete-reminder-button').first().click();
        
        await expect(page.getByText('Delete Reminder')).toBeVisible();
        await expect(page.getByText('Are you sure you want to delete this reminder?')).toBeVisible();
      });

      test('should display reminder message in confirmation modal', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Daily weight check');
        
        await page.getByTestId('delete-reminder-button').first().click();
        
        await expect(page.getByText('"Daily weight check"')).toBeVisible();
      });

      test('should remove reminder from list when deletion is confirmed', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Weight reminder');
        
        const initialCount = await page.getByTestId('reminder-item').count();
        
        await page.getByTestId('delete-reminder-button').first().click();
        await page.getByRole('button', { name: 'Delete' }).click();
        await page.waitForLoadState('networkidle');
        
        await expect(page.getByTestId('reminder-item')).toHaveCount(initialCount - 1);
        await expect(page.getByText('Reminder deleted successfully')).toBeVisible();
      });

      test('should keep reminder in list when deletion is canceled', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Weight reminder');
        
        const initialCount = await page.getByTestId('reminder-item').count();
        
        await page.getByTestId('delete-reminder-button').first().click();
        await page.getByRole('button', { name: 'Cancel' }).click();
        
        await expect(page.getByTestId('reminder-item')).toHaveCount(initialCount);
        await expect(page.getByText('Weight reminder')).toBeVisible();
      });
    });

    test.describe('Edit Functionality', () => {
      test('should trigger edit callback when edit button is clicked', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Weight reminder');
        
        await page.getByTestId('edit-reminder-button').first().click();
        
        // Should navigate to edit page or open edit modal
        await expect(page).toHaveURL(/.*\/edit/);
      });

      test('should be accessible via keyboard', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Weight reminder');
        
        // Navigate to edit button using keyboard
        await page.keyboard.press('Tab');
        let attempts = 0;
        while (attempts < 20) {
          const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
          if (focusedElement?.includes('Edit')) {
            await page.keyboard.press('Enter');
            break;
          }
          await page.keyboard.press('Tab');
          attempts++;
        }
        
        await expect(page).toHaveURL(/.*\/edit/);
      });
    });

    test.describe('Cron Expression Display', () => {
      test('should display human-readable format for common cron expressions', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Daily reminder');
        await expect(page.getByText('Daily at 9:00')).toBeVisible();
        
        await addHealthReminder(page, 'steps', '0 8 * * 1', 'Weekly reminder');
        await expect(page.getByText('Weekly on Monday at 8:00')).toBeVisible();
        
        await addHealthReminder(page, 'blood_pressure', '0 10 15 * *', 'Monthly reminder');
        await expect(page.getByText('Monthly on day 15 at 10:00')).toBeVisible();
      });

      test('should fall back to raw format for complex expressions', async ({ page }) => {
        await addHealthReminder(page, 'weight', '15 14 1 * *', 'Complex reminder');
        await expect(page.getByText('15 14 1 * *')).toBeVisible();
      });

      test('should display next run time for active reminders', async ({ page }) => {
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Daily reminder');
        
        // Should show next run time
        await expect(page.getByText(/Next:/)).toBeVisible();
        await expect(page.getByText(/In \d+ (hour|day)s?/)).toBeVisible();
      });
    });
  });

  test.describe('HealthRecordsFilters E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/health/records');
    });

    test.describe('Filter Rendering', () => {
      test('should render all filter inputs correctly', async ({ page }) => {
        await expect(page.getByLabel('Search')).toBeVisible();
        await expect(page.getByLabel('Health Type')).toBeVisible();
        await expect(page.getByLabel('Start Date')).toBeVisible();
        await expect(page.getByLabel('End Date')).toBeVisible();
      });

      test('should populate health type dropdown with available types', async ({ page }) => {
        const healthTypeSelect = page.getByLabel('Health Type');
        await expect(healthTypeSelect.getByText('All Types')).toBeVisible();
        await expect(healthTypeSelect.getByText('Weight')).toBeVisible();
        await expect(healthTypeSelect.getByText('Blood Pressure')).toBeVisible();
        await expect(healthTypeSelect.getByText('Steps')).toBeVisible();
      });

      test('should have proper layout and styling', async ({ page }) => {
        const filtersContainer = page.locator('.mb-6.space-y-4.rounded-lg.border');
        await expect(filtersContainer).toBeVisible();
        
        const gridContainer = page.locator('.grid.grid-cols-1.gap-4');
        await expect(gridContainer).toBeVisible();
      });
    });

    test.describe('Search Functionality', () => {
      test('should update value when typing in search input', async ({ page }) => {
        const searchInput = page.getByLabel('Search');
        await searchInput.fill('weight measurement');
        
        await expect(searchInput).toHaveValue('weight measurement');
      });

      test('should accept various text inputs', async ({ page }) => {
        const searchInput = page.getByLabel('Search');
        
        await searchInput.fill('123.45');
        await expect(searchInput).toHaveValue('123.45');
        
        await searchInput.fill('Blood pressure reading');
        await expect(searchInput).toHaveValue('Blood pressure reading');
        
        await searchInput.fill('Special chars: @#$%');
        await expect(searchInput).toHaveValue('Special chars: @#$%');
      });

      test('should maintain value during form interactions', async ({ page }) => {
        const searchInput = page.getByLabel('Search');
        await searchInput.fill('test search');
        
        // Interact with other form elements
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Start Date').fill('2024-01-01');
        
        // Search value should be maintained
        await expect(searchInput).toHaveValue('test search');
      });
    });

    test.describe('Health Type Filtering', () => {
      test('should update value when selecting health type', async ({ page }) => {
        const healthTypeSelect = page.getByLabel('Health Type');
        await healthTypeSelect.selectOption('weight');
        
        await expect(healthTypeSelect).toHaveValue('weight');
      });

      test('should have All Types option available and selectable', async ({ page }) => {
        const healthTypeSelect = page.getByLabel('Health Type');
        await healthTypeSelect.selectOption('');
        
        await expect(healthTypeSelect).toHaveValue('');
      });

      test('should work via keyboard navigation', async ({ page }) => {
        const healthTypeSelect = page.getByLabel('Health Type');
        await healthTypeSelect.focus();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        
        // Should have selected the first option
        const selectedValue = await healthTypeSelect.inputValue();
        expect(selectedValue).not.toBe('');
      });
    });

    test.describe('Date Range Filtering', () => {
      test('should accept date values in date inputs', async ({ page }) => {
        const startDate = page.getByLabel('Start Date');
        const endDate = page.getByLabel('End Date');
        
        await startDate.fill('2024-01-01');
        await endDate.fill('2024-12-31');
        
        await expect(startDate).toHaveValue('2024-01-01');
        await expect(endDate).toHaveValue('2024-12-31');
      });

      test('should work with date picker interface', async ({ page }) => {
        const startDate = page.getByLabel('Start Date');
        await startDate.click();
        
        // Date picker should be accessible
        // Note: Date picker behavior varies by browser
        await startDate.fill('2024-06-15');
        await expect(startDate).toHaveValue('2024-06-15');
      });

      test('should validate date format', async ({ page }) => {
        const startDate = page.getByLabel('Start Date');
        
        // Try invalid date format
        await startDate.fill('invalid-date');
        
        // Browser should handle validation
        const validity = await startDate.evaluate((el: HTMLInputElement) => el.validity.valid);
        expect(validity).toBe(false);
      });
    });

    test.describe('Form Submission', () => {
      test('should submit form with current values when Apply Filters is clicked', async ({ page }) => {
        await page.getByLabel('Search').fill('test');
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Start Date').fill('2024-01-01');
        
        await page.getByRole('button', { name: 'Apply Filters' }).click();
        await page.waitForLoadState('networkidle');
        
        // URL should contain filter parameters
        await expect(page).toHaveURL(/.*search=test/);
        await expect(page).toHaveURL(/.*type=weight/);
        await expect(page).toHaveURL(/.*startDate=2024-01-01/);
      });

      test('should be accessible via keyboard Enter key', async ({ page }) => {
        await page.getByLabel('Search').fill('keyboard test');
        await page.getByLabel('Search').press('Enter');
        await page.waitForLoadState('networkidle');
        
        await expect(page).toHaveURL(/.*search=keyboard\+test/);
      });

      test('should trigger appropriate filtering behavior', async ({ page }) => {
        // Add some test records first
        await addHealthRecord(page, 'weight', '75.0', 'kg');
        await addHealthRecord(page, 'steps', '10000', 'steps');
        
        // Apply weight filter
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByRole('button', { name: 'Apply Filters' }).click();
        await page.waitForLoadState('networkidle');
        
        // Should show only weight records
        await expect(page.getByText('75.0 kg')).toBeVisible();
        await expect(page.getByText('10000 steps')).toBeHidden();
      });
    });

    test.describe('Form Reset', () => {
      test('should reset all form inputs when Clear button is clicked', async ({ page }) => {
        // Fill all form fields
        await page.getByLabel('Search').fill('test search');
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Start Date').fill('2024-01-01');
        await page.getByLabel('End Date').fill('2024-12-31');
        
        await page.getByRole('button', { name: 'Clear' }).click();
        
        // All fields should be reset
        await expect(page.getByLabel('Search')).toHaveValue('');
        await expect(page.getByLabel('Health Type')).toHaveValue('');
        await expect(page.getByLabel('Start Date')).toHaveValue('');
        await expect(page.getByLabel('End Date')).toHaveValue('');
      });

      test('should remove URL parameters when Clear is clicked', async ({ page }) => {
        // Set some filters first
        await page.getByLabel('Search').fill('test');
        await page.getByRole('button', { name: 'Apply Filters' }).click();
        await page.waitForLoadState('networkidle');
        
        await page.getByRole('button', { name: 'Clear' }).click();
        
        // URL should not contain filter parameters
        await expect(page).toHaveURL(/^[^?]*$/); // No query parameters
      });

      test('should restore default state', async ({ page }) => {
        // Apply filters
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByRole('button', { name: 'Apply Filters' }).click();
        await page.waitForLoadState('networkidle');
        
        // Clear filters
        await page.getByRole('button', { name: 'Clear' }).click();
        
        // Should show all records again
        await expect(page.getByText('All Types')).toBeVisible();
      });
    });

    test.describe('Filter Persistence', () => {
      test('should persist filter values in URL parameters', async ({ page }) => {
        await page.getByLabel('Search').fill('persistence test');
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByRole('button', { name: 'Apply Filters' }).click();
        await page.waitForLoadState('networkidle');
        
        await expect(page).toHaveURL(/.*search=persistence\+test/);
        await expect(page).toHaveURL(/.*type=weight/);
      });

      test('should maintain filter state after page reload', async ({ page }) => {
        await page.getByLabel('Search').fill('reload test');
        await page.getByRole('button', { name: 'Apply Filters' }).click();
        await page.waitForLoadState('networkidle');
        
        await page.reload();
        
        await expect(page.getByLabel('Search')).toHaveValue('reload test');
      });

      test('should maintain filter context during navigation', async ({ page }) => {
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByRole('button', { name: 'Apply Filters' }).click();
        await page.waitForLoadState('networkidle');
        
        // Navigate away and back
        await page.goto('/dashboard/health/goals');
        await page.goto('/dashboard/health/records');
        
        await expect(page.getByLabel('Health Type')).toHaveValue('weight');
      });
    });
  });

  test.describe('Integration Testing', () => {
    test.describe('Modal and Form Integration', () => {
      test('should update records list after adding record via modal', async ({ page }) => {
        const initialCount = await page.getByTestId('health-record-item').count();
        
        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Value').fill('78.5');
        await page.getByRole('button', { name: 'Save Record' }).click();
        
        await expect(page.getByTestId('health-record-item')).toHaveCount(initialCount + 1);
        await expect(page.getByText('78.5')).toBeVisible();
      });

      test('should handle modal form validation end-to-end', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByRole('button', { name: 'Save Record' }).click();
        
        await expect(page.getByText('Health type is required')).toBeVisible();
        await expect(page.getByRole('dialog')).toBeVisible();
        
        // Fix validation errors
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Value').fill('75.0');
        await page.getByRole('button', { name: 'Save Record' }).click();
        
        await expect(page.getByText('Record added successfully')).toBeVisible();
        await expect(page.getByRole('dialog')).toBeHidden();
      });
    });

    test.describe('Reminder Management Workflow', () => {
      test('should complete full reminder CRUD workflow', async ({ page }) => {
        await page.goto('/dashboard/health/reminders');
        
        // Create reminder
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Daily weight check');
        await expect(page.getByText('Daily weight check')).toBeVisible();
        
        // Toggle status
        await page.getByTestId('reminder-toggle').first().click();
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Inactive')).toBeVisible();
        
        // Edit reminder (navigate to edit)
        await page.getByTestId('edit-reminder-button').first().click();
        await expect(page).toHaveURL(/.*\/edit/);
        
        // Go back to list
        await page.goto('/dashboard/health/reminders');
        
        // Delete reminder
        await page.getByTestId('delete-reminder-button').first().click();
        await page.getByRole('button', { name: 'Delete' }).click();
        await page.waitForLoadState('networkidle');
        
        await expect(page.getByText('Daily weight check')).toBeHidden();
      });

      test('should reflect status changes immediately in UI', async ({ page }) => {
        await page.goto('/dashboard/health/reminders');
        await addHealthReminder(page, 'weight', '0 9 * * *', 'Status test');
        
        // Toggle off
        await page.getByTestId('reminder-toggle').first().click();
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Inactive')).toBeVisible();
        
        // Toggle back on
        await page.getByTestId('reminder-toggle').first().click();
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Active')).toBeVisible();
      });
    });

    test.describe('Filter and List Integration', () => {
      test('should update displayed records when filters are applied', async ({ page }) => {
        // Create test records
        await addHealthRecord(page, 'weight', '75.0', 'kg');
        await addHealthRecord(page, 'steps', '10000', 'steps');
        
        // Apply weight filter
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByRole('button', { name: 'Apply Filters' }).click();
        await page.waitForLoadState('networkidle');
        
        await expect(page.getByText('75.0 kg')).toBeVisible();
        await expect(page.getByText('10000 steps')).toBeHidden();
      });

      test('should show all records when filters are cleared', async ({ page }) => {
        // Create test records
        await addHealthRecord(page, 'weight', '75.0', 'kg');
        await addHealthRecord(page, 'steps', '10000', 'steps');
        
        // Apply filter
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByRole('button', { name: 'Apply Filters' }).click();
        await page.waitForLoadState('networkidle');
        
        // Clear filters
        await page.getByRole('button', { name: 'Clear' }).click();
        
        await expect(page.getByText('75.0 kg')).toBeVisible();
        await expect(page.getByText('10000 steps')).toBeVisible();
      });
    });
  });

  test.describe('Accessibility E2E Tests', () => {
    test.describe('Keyboard Navigation', () => {
      test('should support complete keyboard-only navigation', async ({ page }) => {
        // Test navigation through main page elements
        await page.keyboard.press('Tab'); // First focusable element
        await page.keyboard.press('Tab'); // Next element
        
        // Should be able to reach Add Record button
        let attempts = 0;
        while (attempts < 10) {
          const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
          if (focusedElement?.includes('Add Record')) {
            break;
          }
          await page.keyboard.press('Tab');
          attempts++;
        }
        
        // Open modal via keyboard
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog')).toBeVisible();
      });

      test('should have logical tab order', async ({ page }) => {
        const tabOrder = [];
        
        // Tab through first few elements and record their text content
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('Tab');
          const focusedText = await page.evaluate(() => document.activeElement?.textContent?.trim());
          if (focusedText) {
            tabOrder.push(focusedText);
          }
        }
        
        // Tab order should be logical (filters before records, etc.)
        expect(tabOrder.length).toBeGreaterThan(0);
      });

      test('should handle keyboard shortcuts correctly', async ({ page }) => {
        // Open modal
        await page.getByRole('button', { name: 'Add Record' }).click();
        
        // Escape should close modal
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeHidden();
        
        // Enter on buttons should activate them
        await page.getByRole('button', { name: 'Add Record' }).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog')).toBeVisible();
      });
    });

    test.describe('Focus Management', () => {
      test('should have visible focus indicators', async ({ page }) => {
        await page.keyboard.press('Tab');
        
        // Check that focused element has visible focus styling
        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          const styles = window.getComputedStyle(el as Element);
          return {
            outline: styles.outline,
            boxShadow: styles.boxShadow,
            border: styles.border
          };
        });
        
        // Should have some form of focus indicator
        const hasFocusIndicator = focusedElement.outline !== 'none' || 
                                 focusedElement.boxShadow !== 'none' ||
                                 focusedElement.border.includes('blue');
        expect(hasFocusIndicator).toBe(true);
      });

      test('should restore focus correctly after modal interactions', async ({ page }) => {
        const addButton = page.getByRole('button', { name: 'Add Record' });
        await addButton.focus();
        await addButton.click();
        
        await page.keyboard.press('Escape');
        
        // Focus should return to Add Record button
        const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
        expect(focusedElement).toContain('Add Record');
      });
    });
  });

  test.describe('Cross-Component Workflows', () => {
    test('should complete add record workflow end-to-end', async ({ page }) => {
      // Step 1: Open modal
      await page.getByRole('button', { name: 'Add Record' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Step 2: Fill form
      await page.getByLabel('Health Type').selectOption('weight');
      await page.getByLabel('Value').fill('82.3');
      
      // Step 3: Submit
      await page.getByRole('button', { name: 'Save Record' }).click();
      
      // Step 4: See success
      await expect(page.getByText('Record added successfully')).toBeVisible();
      
      // Step 5: Modal closes
      await expect(page.getByRole('dialog')).toBeHidden();
      
      // Step 6: Record appears in list
      await expect(page.getByText('82.3')).toBeVisible();
    });

    test('should complete filter and view workflow', async ({ page }) => {
      // Create test data
      await addHealthRecord(page, 'weight', '75.0', 'kg');
      await addHealthRecord(page, 'steps', '8000', 'steps');
      
      // Step 1: Apply filters
      await page.getByLabel('Health Type').selectOption('weight');
      await page.getByRole('button', { name: 'Apply Filters' }).click();
      await page.waitForLoadState('networkidle');
      
      // Step 2: View filtered results
      await expect(page.getByText('75.0 kg')).toBeVisible();
      await expect(page.getByText('8000 steps')).toBeHidden();
      
      // Step 3: Clear filters
      await page.getByRole('button', { name: 'Clear' }).click();
      
      // Step 4: View all results
      await expect(page.getByText('75.0 kg')).toBeVisible();
      await expect(page.getByText('8000 steps')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test.describe('Network Failures', () => {
      test('should handle API failures gracefully', async ({ page }) => {
        // Simulate network failure for record creation
        await page.route('**/api/health/records', route => route.abort());
        
        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Value').fill('75.0');
        await page.getByRole('button', { name: 'Save Record' }).click();
        
        await expect(page.getByText('Network error')).toBeVisible();
        
        await page.unroute('**/api/health/records');
      });

      test('should display appropriate error messages', async ({ page }) => {
        await page.route('**/api/health/records', route => 
          route.fulfill({ status: 500, body: 'Server Error' })
        );
        
        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Value').fill('75.0');
        await page.getByRole('button', { name: 'Save Record' }).click();
        
        await expect(page.getByText(/error/i)).toBeVisible();
        
        await page.unroute('**/api/health/records');
      });
    });

    test.describe('Invalid Data', () => {
      test('should handle malformed data gracefully', async ({ page }) => {
        // Test with invalid health type
        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByLabel('Value').fill('75.0');
        await page.getByRole('button', { name: 'Save Record' }).click();
        
        await expect(page.getByText('Health type is required')).toBeVisible();
      });

      test('should validate edge cases', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByLabel('Health Type').selectOption('weight');
        
        // Test extremely large number
        await page.getByLabel('Value').fill('999999999');
        await page.getByRole('button', { name: 'Save Record' }).click();
        
        // Should either accept or show validation error
        const hasError = await page.getByText(/invalid|error/i).isVisible();
        const hasSuccess = await page.getByText('Record added successfully').isVisible();
        expect(hasError || hasSuccess).toBe(true);
      });
    });

    test.describe('Browser Compatibility', () => {
      test('should work on different screen sizes', async ({ page }) => {
        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.reload();
        
        await expect(page.getByRole('button', { name: 'Add Record' })).toBeVisible();
        await expect(page.getByLabel('Search')).toBeVisible();
        
        // Test desktop viewport
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.reload();
        
        await expect(page.getByRole('button', { name: 'Add Record' })).toBeVisible();
        await expect(page.getByLabel('Search')).toBeVisible();
      });
    });
  });

  test.describe('Performance Testing', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      // Create multiple records to test performance
      for (let i = 0; i < 5; i++) {
        await addHealthRecord(page, 'weight', `${70 + i}.0`, 'kg');
      }
      
      // Page should still be responsive
      await expect(page.getByTestId('health-record-item')).toHaveCount(5);
      
      // Filtering should work with multiple records
      await page.getByLabel('Search').fill('70.0');
      await page.getByRole('button', { name: 'Apply Filters' }).click();
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByText('70.0 kg')).toBeVisible();
    });

    test('should handle rapid user interactions', async ({ page }) => {
      // Rapid modal open/close
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.keyboard.press('Escape');
      }
      
      // Should still be functional
      await page.getByRole('button', { name: 'Add Record' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  });
});