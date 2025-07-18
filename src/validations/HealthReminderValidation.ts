import { z } from 'zod';

// Cron expression regex pattern that supports:
// - Standard 5-field cron expressions (minute hour day month dayofweek)
// - Special characters: * / , - ? L #
// - Named schedules: @yearly, @annually, @monthly, @weekly, @daily, @hourly
// - @every syntax with time units
const cronRegex = /^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5})|(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)$/;

export const HealthReminderValidation = z.object({
  type_id: z.coerce.number().int().positive({
    message: 'Health type ID must be a positive integer',
  }),
  cron_expr: z.string().min(1, {
    message: 'Cron expression is required',
  }).refine((value) => cronRegex.test(value), {
    message: 'Invalid cron expression format. Use standard cron syntax (e.g., "0 9 * * *") or named schedules (e.g., "@daily")',
  }),
  message: z.string().min(1, {
    message: 'Reminder message is required',
  }).max(500, {
    message: 'Reminder message must be 500 characters or less',
  }).trim(),
  active: z.boolean({
    required_error: 'Active status is required',
    invalid_type_error: 'Active status must be a boolean',
  }),
});

export const HealthReminderUpdateValidation = HealthReminderValidation.partial();

export const HealthReminderQueryValidation = z.object({
  active: z.coerce.boolean().optional(),
  type_id: z.coerce.number().int().positive().optional(),
});