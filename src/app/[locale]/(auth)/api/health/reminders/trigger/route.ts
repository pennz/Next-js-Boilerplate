import { and, eq, lte } from 'drizzle-orm';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { healthReminderSchema, healthTypeSchema } from '@/models/Schema';

export const POST = async () => {
  try {
    // Check if health management is enabled
    if (!Env.ENABLE_HEALTH_MGMT) {
      return NextResponse.json(
        { error: 'Health management feature is not enabled' },
        { status: 404 },
      );
    }

    // Authenticate cron service using secret header
    const authHeader = (await headers()).get('authorization');
    const expectedAuth = `Bearer ${Env.HEALTH_REMINDER_CRON_SECRET}`;

    if (!Env.HEALTH_REMINDER_CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const now = new Date();

    // Query active reminders that are due for execution
    const dueReminders = await db
      .select({
        id: healthReminderSchema.id,
        userId: healthReminderSchema.userId,
        typeId: healthReminderSchema.typeId,
        cronExpr: healthReminderSchema.cronExpr,
        message: healthReminderSchema.message,
        nextRunAt: healthReminderSchema.nextRunAt,
        typeName: healthTypeSchema.displayName,
        typeSlug: healthTypeSchema.slug,
      })
      .from(healthReminderSchema)
      .leftJoin(healthTypeSchema, eq(healthReminderSchema.typeId, healthTypeSchema.id))
      .where(
        and(
          eq(healthReminderSchema.active, true),
          lte(healthReminderSchema.nextRunAt, now),
        ),
      );

    if (dueReminders.length === 0) {
      console.log('No reminders due for execution');
      return NextResponse.json({
        message: 'No reminders due',
        processed: 0,
        timestamp: now.toISOString(),
      });
    }

    const processedReminders = [];
    const failedReminders = [];

    // Process each due reminder
    for (const reminder of dueReminders) {
      try {
        // Calculate next run time (simplified - add 1 hour for now)
        // In a real implementation, this would parse the cron expression
        const nextRunAt = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour

        // Update the reminder's next run time
        await db
          .update(healthReminderSchema)
          .set({
            nextRunAt,
            updatedAt: now,
          })
          .where(eq(healthReminderSchema.id, reminder.id));

        // Send notification (log for now, can be extended to email/SMS)
        const notificationMessage = `Health Reminder: ${reminder.message} (${reminder.typeName})`;
        console.log(`Sending reminder to user ${reminder.userId}: ${notificationMessage}`);

        // Log the reminder notification
        console.log(JSON.stringify({
          type: 'health_reminder_sent',
          userId: reminder.userId,
          reminderId: reminder.id,
          healthType: reminder.typeSlug,
          message: reminder.message,
          sentAt: now.toISOString(),
          nextRunAt: nextRunAt.toISOString(),
        }));

        processedReminders.push({
          id: reminder.id,
          userId: reminder.userId,
          healthType: reminder.typeSlug,
          nextRunAt: nextRunAt.toISOString(),
        });
      } catch (error) {
        console.error(`Failed to process reminder ${reminder.id}:`, error);
        failedReminders.push({
          id: reminder.id,
          userId: reminder.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log summary
    console.log(`Health reminders processed: ${processedReminders.length} successful, ${failedReminders.length} failed`);

    return NextResponse.json({
      message: 'Reminders processed',
      processed: processedReminders.length,
      failed: failedReminders.length,
      timestamp: now.toISOString(),
      details: {
        successful: processedReminders,
        failed: failedReminders,
      },
    });
  } catch (error) {
    console.error('Error processing health reminders:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
};
