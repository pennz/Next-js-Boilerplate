import type { Page } from '@playwright/test';

export async function addHealthRecord(
  page: Page,
  type: string,
  value: string,
  unit?: string,
) {
  await page.getByRole('button', { name: 'Add Record' }).click();
  await page.getByLabel('Health Type').selectOption(type);
  await page.getByLabel('Value').fill(value);

  if (unit) {
    await page.getByLabel('Unit').fill(unit);
  }

  await page.getByRole('button', { name: 'Save Record' }).click();
  await page.waitForLoadState('networkidle');
}

export async function addHealthGoal(
  page: Page,
  type: string,
  targetValue: string,
  targetDate: string,
) {
  await page.getByRole('button', { name: 'Add Goal' }).click();
  await page.getByLabel('Health Type').selectOption(type);
  await page.getByLabel('Target Value').fill(targetValue);
  await page.getByLabel('Target Date').fill(targetDate);
  await page.getByRole('button', { name: 'Save Goal' }).click();
  await page.waitForLoadState('networkidle');
}

export async function addHealthReminder(
  page: Page,
  type: string,
  schedule: string,
  message: string,
) {
  await page.getByRole('button', { name: 'Add Reminder' }).click();
  await page.getByLabel('Health Type').selectOption(type);
  await page.getByLabel('Schedule').fill(schedule);
  await page.getByLabel('Message').fill(message);
  await page.getByRole('button', { name: 'Save Reminder' }).click();
  await page.waitForLoadState('networkidle');
}

export function getFutureDate(monthsToAdd: number): string {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + monthsToAdd);
  return futureDate.toISOString().split('T')[0];
}
