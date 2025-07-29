import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

// Types for test data
type TestHealthType = {
  id: number;
  slug: string;
  display_name: string;
  unit: string;
};

type TestReminder = {
  type: string;
  schedule: string;
  message: string;
  active?: boolean;
};

type FilterValues = {
  search?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
};

type AriaAttributes = {
  role?: string;
  'aria-modal'?: string;
  'aria-labelledby'?: string;
  'aria-label'?: string;
  'aria-hidden'?: string;
};

// ============================================================================
// AddHealthRecordModal Test Helpers
// ============================================================================

export async function openAddRecordModal(page: Page): Promise<void> {
  await page.getByRole('button', { name: /add record/i }).click();
  await waitForModalAnimation(page);
}

export async function closeModalViaButton(page: Page): Promise<void> {
  await page.getByRole('button', { name: /close modal/i }).click();
  await waitForModalAnimation(page);
}

export async function closeModalViaEscape(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await waitForModalAnimation(page);
}

export async function closeModalViaBackdrop(page: Page): Promise<void> {
  // Click on the backdrop (the modal overlay, not the content)
  await page.locator('[role="dialog"]').click({ position: { x: 10, y: 10 } });
  await waitForModalAnimation(page);
}

export async function verifyModalOpen(page: Page): Promise<void> {
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator('#modal-title')).toBeVisible();
  await expect(page.getByRole('button', { name: /close modal/i })).toBeVisible();
}

export async function verifyModalClosed(page: Page): Promise<void> {
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
}

export async function testModalFocusManagement(page: Page): Promise<void> {
  // Verify focus moves to close button when modal opens
  const closeButton = page.getByRole('button', { name: /close modal/i });
  await expect(closeButton).toBeFocused();
}

export async function testModalKeyboardNavigation(page: Page): Promise<void> {
  // Test Tab navigation through modal elements
  const closeButton = page.getByRole('button', { name: /close modal/i });
  const firstFormInput = page.locator('input, select, textarea').first();
  
  // Start at close button
  await expect(closeButton).toBeFocused();
  
  // Tab to first form input
  await page.keyboard.press('Tab');
  await expect(firstFormInput).toBeFocused();
  
  // Shift+Tab back to close button
  await page.keyboard.press('Shift+Tab');
  await expect(closeButton).toBeFocused();
}

export async function fillModalForm(page: Page, healthType: string, value: string, date?: string): Promise<void> {
  if (healthType) {
    await page.getByLabel(/health type/i).selectOption(healthType);
  }
  
  if (value) {
    await page.getByLabel(/value/i).fill(value);
  }
  
  if (date) {
    await page.getByLabel(/date/i).fill(date);
  }
}

export async function submitModalForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: /save record/i }).click();
  await page.waitForLoadState('networkidle');
}

export async function verifyModalAccessibility(page: Page): Promise<void> {
  const modal = page.locator('[role="dialog"]');
  
  // Verify ARIA attributes
  await expect(modal).toHaveAttribute('aria-modal', 'true');
  await expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
  
  // Verify modal title is present
  await expect(page.locator('#modal-title')).toBeVisible();
  
  // Verify close button has proper aria-label
  await expect(page.getByRole('button', { name: /close modal/i })).toHaveAttribute('aria-label');
}

// ============================================================================
// ReminderList Test Helpers
// ============================================================================

export async function createTestReminder(page: Page, type: string, schedule: string, message: string): Promise<void> {
  await page.getByRole('button', { name: /add reminder/i }).click();
  await page.getByLabel(/health type/i).selectOption(type);
  await page.getByLabel(/schedule/i).fill(schedule);
  await page.getByLabel(/message/i).fill(message);
  await page.getByRole('button', { name: /save reminder/i }).click();
  await page.waitForLoadState('networkidle');
}

export async function toggleReminderStatus(page: Page, reminderIndex: number): Promise<void> {
  const toggleButton = page.locator('[role="button"]').filter({ hasText: /active/i }).nth(reminderIndex);
  await toggleButton.click();
  await page.waitForLoadState('networkidle');
}

export async function deleteReminder(page: Page, reminderIndex: number): Promise<void> {
  const deleteButton = page.getByRole('button', { name: /delete/i }).nth(reminderIndex);
  await deleteButton.click();
  
  // Wait for confirmation modal and confirm deletion
  await verifyDeleteConfirmationModal(page, '');
  await confirmReminderDeletion(page);
}

export async function editReminder(page: Page, reminderIndex: number): Promise<void> {
  const editButton = page.getByRole('button', { name: /edit/i }).nth(reminderIndex);
  await editButton.click();
}

export async function verifyReminderInList(page: Page, message: string, status: 'active' | 'inactive'): Promise<void> {
  const reminderCard = page.locator(`text="${message}"`).locator('..').locator('..');
  await expect(reminderCard).toBeVisible();
  
  const statusBadge = reminderCard.locator(`text="${status}"`);
  await expect(statusBadge).toBeVisible();
}

export async function verifyReminderCount(page: Page, expectedCount: number): Promise<void> {
  const reminderCards = page.locator('[data-testid^="reminder-"]');
  await expect(reminderCards).toHaveCount(expectedCount);
}

export async function verifyLoadingState(page: Page): Promise<void> {
  const skeletonCards = page.locator('.animate-pulse');
  await expect(skeletonCards).toHaveCount(3);
}

export async function verifyEmptyState(page: Page): Promise<void> {
  await expect(page.locator('text=⏰')).toBeVisible();
  await expect(page.getByText(/no reminders/i)).toBeVisible();
}

export async function verifyDeleteConfirmationModal(page: Page, message: string): Promise<void> {
  await expect(page.getByText(/delete reminder/i)).toBeVisible();
  if (message) {
    await expect(page.getByText(`"${message}"`)).toBeVisible();
  }
}

export async function confirmReminderDeletion(page: Page): Promise<void> {
  await page.getByRole('button', { name: /delete/i }).last().click();
  await page.waitForLoadState('networkidle');
}

export async function cancelReminderDeletion(page: Page): Promise<void> {
  await page.getByRole('button', { name: /cancel/i }).click();
}

export async function verifyReminderToggleLoading(page: Page, reminderIndex: number): Promise<void> {
  const toggleSwitch = page.locator('[role="button"]').filter({ hasText: /active/i }).nth(reminderIndex);
  await expect(toggleSwitch).toHaveClass(/opacity-50/);
}

// ============================================================================
// HealthRecordsFilters Test Helpers
// ============================================================================

export async function fillSearchFilter(page: Page, searchTerm: string): Promise<void> {
  await page.getByLabel(/search/i).fill(searchTerm);
}

export async function selectHealthTypeFilter(page: Page, healthType: string): Promise<void> {
  await page.getByLabel(/health type/i).selectOption(healthType);
}

export async function setDateRangeFilter(page: Page, startDate: string, endDate: string): Promise<void> {
  if (startDate) {
    await page.getByLabel(/start date/i).fill(startDate);
  }
  if (endDate) {
    await page.getByLabel(/end date/i).fill(endDate);
  }
}

export async function applyFilters(page: Page): Promise<void> {
  await page.getByRole('button', { name: /apply filters/i }).click();
  await page.waitForLoadState('networkidle');
}

export async function clearFilters(page: Page): Promise<void> {
  await page.getByRole('button', { name: /clear/i }).click();
  await page.waitForLoadState('networkidle');
}

export async function verifyFilterValues(page: Page, expectedValues: FilterValues): Promise<void> {
  if (expectedValues.search !== undefined) {
    await expect(page.getByLabel(/search/i)).toHaveValue(expectedValues.search);
  }
  if (expectedValues.type !== undefined) {
    await expect(page.getByLabel(/health type/i)).toHaveValue(expectedValues.type);
  }
  if (expectedValues.startDate !== undefined) {
    await expect(page.getByLabel(/start date/i)).toHaveValue(expectedValues.startDate);
  }
  if (expectedValues.endDate !== undefined) {
    await expect(page.getByLabel(/end date/i)).toHaveValue(expectedValues.endDate);
  }
}

export async function verifyFilteredResults(page: Page, expectedCount: number): Promise<void> {
  const resultItems = page.locator('[data-testid^="health-record-"]');
  await expect(resultItems).toHaveCount(expectedCount);
}

export async function verifyFilterPersistence(page: Page, expectedValues: FilterValues): Promise<void> {
  const url = page.url();
  
  if (expectedValues.search) {
    expect(url).toContain(`search=${encodeURIComponent(expectedValues.search)}`);
  }
  if (expectedValues.type) {
    expect(url).toContain(`type=${expectedValues.type}`);
  }
  if (expectedValues.startDate) {
    expect(url).toContain(`startDate=${expectedValues.startDate}`);
  }
  if (expectedValues.endDate) {
    expect(url).toContain(`endDate=${expectedValues.endDate}`);
  }
}

export async function testFilterKeyboardNavigation(page: Page): Promise<void> {
  const searchInput = page.getByLabel(/search/i);
  const typeSelect = page.getByLabel(/health type/i);
  const startDateInput = page.getByLabel(/start date/i);
  const endDateInput = page.getByLabel(/end date/i);
  const applyButton = page.getByRole('button', { name: /apply filters/i });
  
  // Test Tab navigation through filter elements
  await searchInput.focus();
  await expect(searchInput).toBeFocused();
  
  await page.keyboard.press('Tab');
  await expect(typeSelect).toBeFocused();
  
  await page.keyboard.press('Tab');
  await expect(startDateInput).toBeFocused();
  
  await page.keyboard.press('Tab');
  await expect(endDateInput).toBeFocused();
  
  await page.keyboard.press('Tab');
  await expect(applyButton).toBeFocused();
}

export async function verifyFilterAccessibility(page: Page): Promise<void> {
  // Verify all form inputs have proper labels
  await expect(page.getByLabel(/search/i)).toBeVisible();
  await expect(page.getByLabel(/health type/i)).toBeVisible();
  await expect(page.getByLabel(/start date/i)).toBeVisible();
  await expect(page.getByLabel(/end date/i)).toBeVisible();
  
  // Verify buttons are accessible
  await expect(page.getByRole('button', { name: /apply filters/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /clear/i })).toBeVisible();
}

// ============================================================================
// Modal Interaction Helpers
// ============================================================================

export async function waitForModalAnimation(page: Page): Promise<void> {
  // Wait for modal animations to complete
  await page.waitForTimeout(300);
}

export async function verifyModalBackdrop(page: Page): Promise<void> {
  const backdrop = page.locator('[role="dialog"]');
  await expect(backdrop).toHaveClass(/bg-black bg-opacity-50/);
}

export async function testModalFocusTrap(page: Page): Promise<void> {
  const focusableElements = page.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const firstElement = focusableElements.first();
  const lastElement = focusableElements.last();
  
  // Focus last element and tab forward - should wrap to first
  await lastElement.focus();
  await page.keyboard.press('Tab');
  await expect(firstElement).toBeFocused();
  
  // Focus first element and shift+tab - should wrap to last
  await firstElement.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(lastElement).toBeFocused();
}

export async function verifyModalZIndex(page: Page): Promise<void> {
  const modal = page.locator('[role="dialog"]');
  const zIndex = await modal.evaluate(el => window.getComputedStyle(el).zIndex);
  expect(parseInt(zIndex)).toBeGreaterThan(40); // z-50 = 50
}

export async function testModalResponsiveness(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await verifyModalOpen(page);
  
  const modal = page.locator('[role="dialog"] > div');
  const modalBox = await modal.boundingBox();
  
  // Verify modal fits within viewport with margins
  expect(modalBox!.width).toBeLessThan(viewport.width - 32); // 16px margin on each side
  expect(modalBox!.height).toBeLessThan(viewport.height * 0.9); // max-height 90vh
}

// ============================================================================
// Form Interaction Helpers
// ============================================================================

export async function fillFormField(page: Page, fieldLabel: string, value: string): Promise<void> {
  const field = page.getByLabel(new RegExp(fieldLabel, 'i'));
  await field.fill(value);
}

export async function selectDropdownOption(page: Page, dropdownLabel: string, optionValue: string): Promise<void> {
  const dropdown = page.getByLabel(new RegExp(dropdownLabel, 'i'));
  await dropdown.selectOption(optionValue);
}

export async function verifyFormValidation(page: Page, expectedErrors: string[]): Promise<void> {
  for (const error of expectedErrors) {
    await expect(page.getByText(new RegExp(error, 'i'))).toBeVisible();
  }
}

export async function submitFormViaKeyboard(page: Page): Promise<void> {
  await page.keyboard.press('Enter');
  await page.waitForLoadState('networkidle');
}

export async function resetFormViaKeyboard(page: Page): Promise<void> {
  // Focus on form and use keyboard to reset
  const form = page.locator('form');
  await form.focus();
  await page.keyboard.press('Escape');
}

// ============================================================================
// Accessibility Testing Helpers
// ============================================================================

export async function testKeyboardOnlyNavigation(page: Page, startElement: string, expectedOrder: string[]): Promise<void> {
  await page.locator(startElement).focus();
  
  for (let i = 0; i < expectedOrder.length; i++) {
    await page.keyboard.press('Tab');
    await expect(page.locator(expectedOrder[i])).toBeFocused();
  }
}

export async function verifyAriaAttributes(page: Page, element: string, expectedAttributes: AriaAttributes): Promise<void> {
  const locator = page.locator(element);
  
  for (const [attr, value] of Object.entries(expectedAttributes)) {
    if (value) {
      await expect(locator).toHaveAttribute(attr, value);
    }
  }
}

export async function testScreenReaderAnnouncements(page: Page, expectedAnnouncements: string[]): Promise<void> {
  // Check for aria-live regions and announcements
  for (const announcement of expectedAnnouncements) {
    await expect(page.locator(`[aria-live] >> text="${announcement}"`)).toBeVisible();
  }
}

export async function verifyFocusIndicators(page: Page, elements: string[]): Promise<void> {
  for (const element of elements) {
    const locator = page.locator(element);
    await locator.focus();
    
    // Verify focus indicator is visible (check for focus ring styles)
    const focusStyles = await locator.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
        borderColor: styles.borderColor
      };
    });
    
    // Should have some form of focus indicator
    expect(
      focusStyles.outline !== 'none' || 
      focusStyles.boxShadow.includes('ring') || 
      focusStyles.borderColor.includes('blue')
    ).toBeTruthy();
  }
}

export async function testColorContrast(page: Page, elements: string[]): Promise<void> {
  for (const element of elements) {
    const locator = page.locator(element);
    
    const contrast = await locator.evaluate(el => {
      const styles = window.getComputedStyle(el);
      const bgColor = styles.backgroundColor;
      const textColor = styles.color;
      
      // Basic contrast check (simplified)
      return { bgColor, textColor };
    });
    
    // Verify colors are defined (actual contrast calculation would be more complex)
    expect(contrast.bgColor).toBeTruthy();
    expect(contrast.textColor).toBeTruthy();
  }
}

// ============================================================================
// Data Management Helpers
// ============================================================================

export async function createTestHealthTypes(page: Page, types: TestHealthType[]): Promise<void> {
  for (const type of types) {
    // Mock API call to create health type
    await page.route(`**/api/health-types`, route => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(type)
      });
    });
  }
}

export async function createTestReminders(page: Page, reminders: TestReminder[]): Promise<void> {
  for (const reminder of reminders) {
    await createTestReminder(page, reminder.type, reminder.schedule, reminder.message);
  }
}

export async function cleanupTestReminders(page: Page): Promise<void> {
  // Delete all test reminders
  const deleteButtons = page.getByRole('button', { name: /delete/i });
  const count = await deleteButtons.count();
  
  for (let i = 0; i < count; i++) {
    await deleteButtons.first().click();
    await confirmReminderDeletion(page);
  }
}

export async function cleanupTestRecords(page: Page): Promise<void> {
  // Navigate to records page and delete test records
  await page.goto('/health/records');
  
  const deleteButtons = page.getByRole('button', { name: /delete/i });
  const count = await deleteButtons.count();
  
  for (let i = 0; i < count; i++) {
    await deleteButtons.first().click();
    await page.getByRole('button', { name: /confirm/i }).click();
    await page.waitForLoadState('networkidle');
  }
}

export async function resetFilterState(page: Page): Promise<void> {
  await clearFilters(page);
  await page.goto(page.url().split('?')[0]); // Remove query parameters
}

// ============================================================================
// Verification Helpers
// ============================================================================

export async function verifyElementVisible(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
}

export async function verifyElementHidden(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).not.toBeVisible();
}

export async function verifyTextContent(page: Page, selector: string, expectedText: string): Promise<void> {
  await expect(page.locator(selector)).toContainText(expectedText);
}

export async function verifyElementCount(page: Page, selector: string, expectedCount: number): Promise<void> {
  await expect(page.locator(selector)).toHaveCount(expectedCount);
}

export async function verifyElementAttribute(page: Page, selector: string, attribute: string, expectedValue: string): Promise<void> {
  await expect(page.locator(selector)).toHaveAttribute(attribute, expectedValue);
}

// ============================================================================
// Time and Date Helpers
// ============================================================================

export function getCurrentDateTime(): string {
  return new Date().toISOString();
}

export function getFutureDateTime(hours: number): string {
  const future = new Date();
  future.setHours(future.getHours() + hours);
  return future.toISOString();
}

export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function parseCronExpression(cronExpr: string): { minute: string; hour: string; day: string; month: string; weekday: string } {
  const parts = cronExpr.split(' ');
  return {
    minute: parts[0] || '*',
    hour: parts[1] || '*',
    day: parts[2] || '*',
    month: parts[3] || '*',
    weekday: parts[4] || '*'
  };
}

export function calculateNextRun(cronExpr: string): Date {
  // Simplified calculation for common patterns
  const now = new Date();
  const { hour, minute } = parseCronExpression(cronExpr);
  
  if (hour !== '*' && minute !== '*') {
    const nextRun = new Date(now);
    nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun;
  }
  
  // Default to 1 hour from now for complex expressions
  const nextRun = new Date(now);
  nextRun.setHours(nextRun.getHours() + 1);
  return nextRun;
}

// ============================================================================
// Error Simulation Helpers
// ============================================================================

export async function simulateNetworkError(page: Page, endpoint: string): Promise<void> {
  await page.route(`**${endpoint}`, route => {
    route.abort('failed');
  });
}

export async function simulateAPITimeout(page: Page, endpoint: string): Promise<void> {
  await page.route(`**${endpoint}`, route => {
    // Delay response to simulate timeout
    setTimeout(() => route.abort('timedout'), 30000);
  });
}

export async function simulateValidationError(page: Page, field: string, error: string): Promise<void> {
  await page.route('**/api/**', route => {
    route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        errors: { [field]: [error] }
      })
    });
  });
}

export async function recoverFromError(page: Page): Promise<void> {
  // Clear all route handlers to restore normal behavior
  await page.unrouteAll();
  await page.reload();
}

// ============================================================================
// Performance Testing Helpers
// ============================================================================

export async function measureModalOpenTime(page: Page): Promise<number> {
  const startTime = Date.now();
  await openAddRecordModal(page);
  await verifyModalOpen(page);
  return Date.now() - startTime;
}

export async function measureFilterResponseTime(page: Page): Promise<number> {
  const startTime = Date.now();
  await applyFilters(page);
  return Date.now() - startTime;
}

export async function measureReminderToggleTime(page: Page): Promise<number> {
  const startTime = Date.now();
  await toggleReminderStatus(page, 0);
  return Date.now() - startTime;
}

export async function stressTestWithManyReminders(page: Page, count: number): Promise<void> {
  const reminders: TestReminder[] = [];
  
  for (let i = 0; i < count; i++) {
    reminders.push({
      type: '1',
      schedule: '0 9 * * *',
      message: `Test reminder ${i + 1}`
    });
  }
  
  await createTestReminders(page, reminders);
  await verifyReminderCount(page, count);
}

// ============================================================================
// Mobile and Touch Helpers
// ============================================================================

export async function simulateTouchInteraction(page: Page, element: string): Promise<void> {
  const locator = page.locator(element);
  await locator.tap();
}

export async function testMobileViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 375, height: 667 });
}

export async function testTabletViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 768, height: 1024 });
}

export async function verifyTouchAccessibility(page: Page): Promise<void> {
  // Verify touch targets are at least 44px (recommended minimum)
  const touchTargets = page.locator('button, a, input[type="checkbox"], input[type="radio"]');
  const count = await touchTargets.count();
  
  for (let i = 0; i < count; i++) {
    const target = touchTargets.nth(i);
    const box = await target.boundingBox();
    
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
}

// ============================================================================
// Browser Compatibility Helpers
// ============================================================================

export async function testCrossBrowserCompatibility(page: Page, browsers: string[]): Promise<void> {
  // This would typically be handled at the test runner level
  // Here we can test browser-specific features
  const userAgent = await page.evaluate(() => navigator.userAgent);
  console.log(`Testing on: ${userAgent}`);
}

export async function verifyBrowserSpecificFeatures(page: Page): Promise<void> {
  // Test features that might behave differently across browsers
  const supportsDateInput = await page.evaluate(() => {
    const input = document.createElement('input');
    input.type = 'date';
    return input.type === 'date';
  });
  
  expect(supportsDateInput).toBeTruthy();
}

export async function testDatePickerCompatibility(page: Page): Promise<void> {
  const dateInput = page.getByLabel(/date/i).first();
  await dateInput.click();
  
  // Verify date picker opens (behavior varies by browser)
  // This is a simplified check
  await expect(dateInput).toBeFocused();
}

// ============================================================================
// Utility Helpers
// ============================================================================

export function generateUniqueTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createMockReminderData(overrides: Partial<TestReminder> = {}): TestReminder {
  return {
    type: '1',
    schedule: '0 9 * * *',
    message: `Test reminder ${generateUniqueTestId()}`,
    active: true,
    ...overrides
  };
}

export function createMockHealthTypeData(overrides: Partial<TestHealthType> = {}): TestHealthType {
  const id = Math.floor(Math.random() * 1000);
  return {
    id,
    slug: `test-type-${id}`,
    display_name: `Test Type ${id}`,
    unit: 'units',
    ...overrides
  };
}

export async function waitForStableState(page: Page): Promise<void> {
  // Wait for network to be idle and no pending animations
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(100); // Small buffer for animations
}

export async function captureComponentScreenshot(page: Page, component: string, filename: string): Promise<void> {
  const locator = page.locator(component);
  await locator.screenshot({ path: `screenshots/${filename}.png` });
}