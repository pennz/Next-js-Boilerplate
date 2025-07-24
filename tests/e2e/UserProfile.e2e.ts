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

test.describe('User Profile Management', () => {
  let e2eRandomId: number;

  test.beforeEach(async ({ page }) => {
    e2eRandomId = faker.number.int({ max: 1000000 });
    await page.setExtraHTTPHeaders({
      'x-e2e-random-id': e2eRandomId.toString(),
    });

    // Enable user profile features for tests
    await page.addInitScript(() => {
      window.localStorage.setItem('ENABLE_USER_PROFILES', 'true');
      window.localStorage.setItem('ENABLE_MICRO_BEHAVIOR_TRACKING', 'true');
    });

    // Mock PostHog to capture events
    await page.addInitScript(() => {
      window.posthog = {
        capture: (eventName, properties) => {
          window.capturedEvents = window.capturedEvents || [];
          window.capturedEvents.push({ eventName, properties });
        },
        identify: () => {},
        reset: () => {},
      };
    });

    await page.goto('/dashboard/profile');
  });

  test.afterEach(async ({ page }) => {
    // Clean up test profile data
    await page.goto('/dashboard/profile/settings');

    // Reset profile if exists
    const resetButton = page.getByTestId('reset-profile-button');
    if (await resetButton.count() > 0) {
      await resetButton.click();
      await page.getByRole('button', { name: 'Confirm Reset' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Clean up constraints
    const constraintCount = await page.getByTestId('constraint-item').count();
    for (let i = 0; i < constraintCount; i++) {
      await page.getByTestId('remove-constraint-button').first().click();
      await page.getByRole('button', { name: 'Confirm Remove' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Clean up fitness goals
    const goalCount = await page.getByTestId('fitness-goal-item').count();
    for (let i = 0; i < goalCount; i++) {
      await page.getByTestId('archive-goal-button').first().click();
      await page.getByRole('button', { name: 'Confirm Archive' }).click();
      await page.waitForLoadState('networkidle');
    }
  });

  test.describe('Profile Creation and Onboarding', () => {
    test('should guide new user through profile creation flow', async ({ page }) => {
      // Navigate to profile creation for new user
      await page.goto('/dashboard/profile/setup');
      await page.waitForLoadState('networkidle');

      // Step 1: Basic Information
      await page.getByLabel('First Name').fill(faker.person.firstName());
      await page.getByLabel('Last Name').fill(faker.person.lastName());
      await page.getByLabel('Date of Birth').fill('1990-01-01');
      await page.getByLabel('Height').fill('175');
      await page.getByLabel('Weight').fill('70');
      await page.getByRole('button', { name: 'Next' }).click();

      // Step 2: Fitness Level and Experience
      await page.getByLabel('Fitness Level').selectOption('intermediate');
      await page.getByLabel('Exercise Experience').selectOption('2-5 years');
      await page.getByTestId('activity-level-moderate').click();
      await page.getByRole('button', { name: 'Next' }).click();

      // Step 3: Goals and Preferences
      await page.getByTestId('goal-weight-loss').click();
      await page.getByTestId('goal-muscle-gain').click();
      await page.getByLabel('Target Weight').fill('65');
      await page.getByLabel('Target Date').fill(getFutureDate(6));
      await page.getByRole('button', { name: 'Next' }).click();

      // Step 4: Workout Preferences
      await page.getByTestId('workout-type-strength').click();
      await page.getByTestId('workout-type-cardio').click();
      await page.getByTestId('preferred-time-morning').click();
      await page.getByLabel('Session Duration').selectOption('45');
      await page.getByRole('button', { name: 'Complete Setup' }).click();

      await page.waitForLoadState('networkidle');

      // Verify profile was created successfully
      await expect(page.getByText('Profile setup complete!')).toBeVisible();
      await expect(page.getByTestId('profile-completion-badge')).toContainText('100%');

      // Verify tracking events
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const setupCompleteEvent = capturedEvents.find(event => 
        event.eventName === 'profile_setup_completed'
      );
      expect(setupCompleteEvent).toBeTruthy();
      expect(setupCompleteEvent.properties).toMatchObject({
        completionPercentage: 100,
        stepsCompleted: 4,
        hasGoals: true,
        hasPreferences: true,
      });
    });

    test('should allow partial profile creation and resume later', async ({ page }) => {
      await page.goto('/dashboard/profile/setup');
      await page.waitForLoadState('networkidle');

      // Fill only basic information
      await page.getByLabel('First Name').fill(faker.person.firstName());
      await page.getByLabel('Last Name').fill(faker.person.lastName());
      await page.getByLabel('Date of Birth').fill('1990-01-01');
      await page.getByRole('button', { name: 'Save and Continue Later' }).click();

      await page.waitForLoadState('networkidle');

      // Verify partial profile saved
      await expect(page.getByText('Profile saved')).toBeVisible();
      await expect(page.getByTestId('profile-completion-badge')).toContainText('25%');

      // Navigate away and return
      await page.goto('/dashboard/health');
      await page.goto('/dashboard/profile');

      // Should show resume setup option
      await expect(page.getByTestId('resume-setup-button')).toBeVisible();
      await page.getByTestId('resume-setup-button').click();

      // Should continue from where left off
      await expect(page.getByLabel('Fitness Level')).toBeVisible();
      await expect(page.getByText('Step 2 of 4')).toBeVisible();
    });

    test('should validate required fields during profile creation', async ({ page }) => {
      await page.goto('/dashboard/profile/setup');
      await page.waitForLoadState('networkidle');

      // Try to proceed without filling required fields
      await page.getByRole('button', { name: 'Next' }).click();

      // Should show validation errors
      await expect(page.getByText('First name is required')).toBeVisible();
      await expect(page.getByText('Last name is required')).toBeVisible();
      await expect(page.getByText('Date of birth is required')).toBeVisible();

      // Fill invalid data
      await page.getByLabel('Height').fill('-10');
      await page.getByLabel('Weight').fill('0');
      await page.getByRole('button', { name: 'Next' }).click();

      // Should show validation errors for invalid values
      await expect(page.getByText('Height must be positive')).toBeVisible();
      await expect(page.getByText('Weight must be greater than 0')).toBeVisible();

      // Verify error tracking
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const validationEvent = capturedEvents.find(event => 
        event.eventName === 'profile_validation_error'
      );
      expect(validationEvent).toBeTruthy();
    });

    test('should show profile completion progress throughout setup', async ({ page }) => {
      await page.goto('/dashboard/profile/setup');
      await page.waitForLoadState('networkidle');

      // Initial state
      await expect(page.getByTestId('progress-indicator')).toContainText('0%');
      await expect(page.getByText('Step 1 of 4')).toBeVisible();

      // Complete step 1
      await page.getByLabel('First Name').fill(faker.person.firstName());
      await page.getByLabel('Last Name').fill(faker.person.lastName());
      await page.getByLabel('Date of Birth').fill('1990-01-01');
      await page.getByLabel('Height').fill('175');
      await page.getByLabel('Weight').fill('70');
      await page.getByRole('button', { name: 'Next' }).click();

      // Progress should update
      await expect(page.getByTestId('progress-indicator')).toContainText('25%');
      await expect(page.getByText('Step 2 of 4')).toBeVisible();

      // Complete step 2
      await page.getByLabel('Fitness Level').selectOption('intermediate');
      await page.getByLabel('Exercise Experience').selectOption('2-5 years');
      await page.getByTestId('activity-level-moderate').click();
      await page.getByRole('button', { name: 'Next' }).click();

      // Progress should update
      await expect(page.getByTestId('progress-indicator')).toContainText('50%');
      await expect(page.getByText('Step 3 of 4')).toBeVisible();
    });
  });

  test.describe('Profile Editing and Updates', () => {
    test('should allow editing basic profile information', async ({ page }) => {
      // First create a basic profile
      await createBasicProfile(page);

      // Navigate to edit profile
      await page.getByTestId('edit-profile-button').click();
      await page.waitForLoadState('networkidle');

      // Update information
      const newFirstName = faker.person.firstName();
      const newWeight = '72';

      await page.getByLabel('First Name').fill(newFirstName);
      await page.getByLabel('Weight').fill(newWeight);
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await page.waitForLoadState('networkidle');

      // Verify changes were saved
      await expect(page.getByText('Profile updated successfully')).toBeVisible();
      await expect(page.getByTestId('profile-first-name')).toContainText(newFirstName);
      await expect(page.getByTestId('profile-weight')).toContainText(newWeight);

      // Verify tracking
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const updateEvent = capturedEvents.find(event => 
        event.eventName === 'profile_updated'
      );
      expect(updateEvent).toBeTruthy();
      expect(updateEvent.properties.fieldsUpdated).toContain('firstName');
      expect(updateEvent.properties.fieldsUpdated).toContain('weight');
    });

    test('should handle concurrent profile updates gracefully', async ({ page, context }) => {
      await createBasicProfile(page);

      // Open second tab to simulate concurrent editing
      const secondPage = await context.newPage();
      await secondPage.goto('/dashboard/profile');
      await secondPage.waitForLoadState('networkidle');

      // Edit in first tab
      await page.getByTestId('edit-profile-button').click();
      await page.getByLabel('First Name').fill('UpdatedName1');

      // Edit in second tab
      await secondPage.getByTestId('edit-profile-button').click();
      await secondPage.getByLabel('First Name').fill('UpdatedName2');

      // Save in first tab
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await page.waitForLoadState('networkidle');

      // Try to save in second tab (should detect conflict)
      await secondPage.getByRole('button', { name: 'Save Changes' }).click();
      
      // Should show conflict resolution dialog
      await expect(secondPage.getByText('Profile was updated by another session')).toBeVisible();
      await expect(secondPage.getByRole('button', { name: 'Reload and Retry' })).toBeVisible();

      await secondPage.close();
    });

    test('should auto-save profile changes with debouncing', async ({ page }) => {
      await createBasicProfile(page);

      // Enable auto-save in settings
      await page.goto('/dashboard/profile/settings');
      await page.getByTestId('enable-auto-save').check();
      await page.getByRole('button', { name: 'Save Settings' }).click();

      await page.goto('/dashboard/profile');
      await page.getByTestId('edit-profile-button').click();

      // Make rapid changes
      await page.getByLabel('Weight').fill('71');
      await page.waitForTimeout(500);
      await page.getByLabel('Weight').fill('72');
      await page.waitForTimeout(500);
      await page.getByLabel('Weight').fill('73');

      // Wait for auto-save (should be debounced)
      await page.waitForTimeout(3000);

      // Verify auto-save occurred
      await expect(page.getByText('Auto-saved')).toBeVisible();

      // Navigate away and back to verify persistence
      await page.goto('/dashboard/health');
      await page.goto('/dashboard/profile');

      await expect(page.getByTestId('profile-weight')).toContainText('73');
    });

    test('should track profile completion percentage updates', async ({ page }) => {
      await createBasicProfile(page); // 25% completion

      // Add fitness goals
      await page.getByTestId('add-fitness-goal-button').click();
      await page.getByTestId('goal-weight-loss').click();
      await page.getByLabel('Target Weight').fill('65');
      await page.getByLabel('Target Date').fill(getFutureDate(3));
      await page.getByRole('button', { name: 'Add Goal' }).click();

      // Completion should increase
      await expect(page.getByTestId('profile-completion-badge')).toContainText('50%');

      // Add workout preferences
      await page.getByTestId('edit-preferences-button').click();
      await page.getByTestId('workout-type-strength').click();
      await page.getByTestId('preferred-time-morning').click();
      await page.getByRole('button', { name: 'Save Preferences' }).click();

      // Completion should increase further
      await expect(page.getByTestId('profile-completion-badge')).toContainText('75%');

      // Add constraints
      await page.getByTestId('add-constraint-button').click();
      await page.getByLabel('Constraint Type').selectOption('schedule');
      await page.getByLabel('Description').fill('Available only evenings');
      await page.getByRole('button', { name: 'Add Constraint' }).click();

      // Should reach 100% completion
      await expect(page.getByTestId('profile-completion-badge')).toContainText('100%');
    });
  });

  test.describe('Preference Management', () => {
    test('should allow setting and updating workout preferences', async ({ page }) => {
      await createBasicProfile(page);

      // Navigate to preferences
      await page.getByTestId('edit-preferences-button').click();
      await page.waitForLoadState('networkidle');

      // Set workout type preferences
      await page.getByTestId('workout-type-strength').click();
      await page.getByTestId('workout-type-cardio').click();
      await page.getByTestId('workout-type-yoga').click();

      // Set timing preferences
      await page.getByTestId('preferred-time-morning').click();
      await page.getByTestId('preferred-time-evening').click();

      // Set duration preference
      await page.getByLabel('Preferred Duration').selectOption('45');

      // Set intensity preference
      await page.getByTestId('intensity-moderate').click();

      await page.getByRole('button', { name: 'Save Preferences' }).click();
      await page.waitForLoadState('networkidle');

      // Verify preferences saved
      await expect(page.getByText('Preferences updated successfully')).toBeVisible();
      
      // Verify preferences display
      await expect(page.getByTestId('preferred-workouts')).toContainText('Strength');
      await expect(page.getByTestId('preferred-workouts')).toContainText('Cardio');
      await expect(page.getByTestId('preferred-workouts')).toContainText('Yoga');
      await expect(page.getByTestId('preferred-times')).toContainText('Morning');
      await expect(page.getByTestId('preferred-times')).toContainText('Evening');

      // Verify tracking
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const preferencesEvent = capturedEvents.find(event => 
        event.eventName === 'workout_preferences_updated'
      );
      expect(preferencesEvent).toBeTruthy();
      expect(preferencesEvent.properties.workoutTypes).toContain('strength');
      expect(preferencesEvent.properties.workoutTypes).toContain('cardio');
      expect(preferencesEvent.properties.workoutTypes).toContain('yoga');
    });

    test('should set equipment preferences and availability', async ({ page }) => {
      await createBasicProfile(page);

      await page.getByTestId('edit-preferences-button').click();
      await page.getByTestId('equipment-tab').click();

      // Set available equipment
      await page.getByTestId('equipment-dumbbells').click();
      await page.getByTestId('equipment-resistance-bands').click();
      await page.getByTestId('equipment-yoga-mat').click();

      // Set equipment constraints
      await page.getByLabel('Home Gym Available').check();
      await page.getByLabel('Gym Membership').check();

      // Set location preferences
      await page.getByTestId('location-home').click();
      await page.getByTestId('location-gym').click();

      await page.getByRole('button', { name: 'Save Equipment Preferences' }).click();
      await page.waitForLoadState('networkidle');

      // Verify equipment preferences
      await expect(page.getByTestId('available-equipment')).toContainText('Dumbbells');
      await expect(page.getByTestId('available-equipment')).toContainText('Resistance Bands');
      await expect(page.getByTestId('available-equipment')).toContainText('Yoga Mat');
      await expect(page.getByTestId('workout-locations')).toContainText('Home');
      await expect(page.getByTestId('workout-locations')).toContainText('Gym');
    });

    test('should impact workout recommendations based on preferences', async ({ page }) => {
      await createBasicProfile(page);

      // Set specific preferences
      await page.getByTestId('edit-preferences-button').click();
      await page.getByTestId('workout-type-yoga').click();
      await page.getByTestId('preferred-time-morning').click();
      await page.getByLabel('Preferred Duration').selectOption('30');
      await page.getByRole('button', { name: 'Save Preferences' }).click();

      // Navigate to workout recommendations
      await page.goto('/dashboard/exercise/recommendations');
      await page.waitForLoadState('networkidle');

      // Verify recommendations match preferences
      const recommendations = page.getByTestId('workout-recommendation');
      await expect(recommendations.first()).toContainText('Yoga');
      await expect(recommendations.first()).toContainText('30 min');
      await expect(recommendations.first()).toContainText('Morning');

      // Verify preference-based filtering
      await expect(page.getByTestId('filtered-by-preferences')).toBeVisible();
      await expect(page.getByText('Showing workouts matching your preferences')).toBeVisible();

      // Track recommendation view
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const recommendationEvent = capturedEvents.find(event => 
        event.eventName === 'workout_recommendations_viewed'
      );
      expect(recommendationEvent).toBeTruthy();
      expect(recommendationEvent.properties.filteredByPreferences).toBe(true);
    });

    test('should allow resetting preferences to defaults', async ({ page }) => {
      await createBasicProfile(page);

      // Set custom preferences
      await page.getByTestId('edit-preferences-button').click();
      await page.getByTestId('workout-type-strength').click();
      await page.getByTestId('workout-type-cardio').click();
      await page.getByTestId('preferred-time-evening').click();
      await page.getByRole('button', { name: 'Save Preferences' }).click();

      // Reset to defaults
      await page.getByTestId('reset-preferences-button').click();
      await page.getByRole('button', { name: 'Confirm Reset' }).click();
      await page.waitForLoadState('networkidle');

      // Verify reset
      await expect(page.getByText('Preferences reset to defaults')).toBeVisible();
      
      // Check that custom preferences are cleared
      await page.getByTestId('edit-preferences-button').click();
      await expect(page.getByTestId('workout-type-strength')).not.toBeChecked();
      await expect(page.getByTestId('workout-type-cardio')).not.toBeChecked();
      await expect(page.getByTestId('preferred-time-evening')).not.toBeChecked();

      // Verify tracking
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const resetEvent = capturedEvents.find(event => 
        event.eventName === 'preferences_reset'
      );
      expect(resetEvent).toBeTruthy();
    });

    test('should validate preference combinations and constraints', async ({ page }) => {
      await createBasicProfile(page);

      await page.getByTestId('edit-preferences-button').click();

      // Try to set conflicting preferences
      await page.getByTestId('workout-type-high-intensity').click();
      await page.getByTestId('intensity-low').click(); // Conflicting intensity
      await page.getByRole('button', { name: 'Save Preferences' }).click();

      // Should show validation warning
      await expect(page.getByText('High-intensity workouts with low intensity preference may conflict')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save Anyway' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Review Preferences' })).toBeVisible();

      // Choose to review and fix
      await page.getByRole('button', { name: 'Review Preferences' }).click();
      await page.getByTestId('intensity-moderate').click();
      await page.getByRole('button', { name: 'Save Preferences' }).click();

      // Should save successfully
      await expect(page.getByText('Preferences updated successfully')).toBeVisible();
    });
  });

  test.describe('Constraint Management', () => {
    test('should add and manage injury constraints', async ({ page }) => {
      await createBasicProfile(page);

      // Add injury constraint
      await page.getByTestId('add-constraint-button').click();
      await page.getByLabel('Constraint Type').selectOption('injury');
      await page.getByLabel('Affected Area').selectOption('knee');
      await page.getByLabel('Severity').selectOption('medium');
      await page.getByLabel('Description').fill('Previous ACL injury, avoid high-impact exercises');
      await page.getByLabel('Restrictions').fill('No running, jumping, or deep squats');
      await page.getByRole('button', { name: 'Add Constraint' }).click();

      await page.waitForLoadState('networkidle');

      // Verify constraint added
      await expect(page.getByText('Constraint added successfully')).toBeVisible();
      await expect(page.getByTestId('constraint-item')).toContainText('Knee Injury');
      await expect(page.getByTestId('constraint-item')).toContainText('Medium Severity');
      await expect(page.getByTestId('constraint-item')).toContainText('ACL injury');

      // Verify impact on recommendations
      await page.goto('/dashboard/exercise/recommendations');
      await page.waitForLoadState('networkidle');

      // Should show constraint-aware recommendations
      await expect(page.getByTestId('constraint-notice')).toContainText('Recommendations adjusted for knee injury');
      
      // Should not show high-impact exercises
      const recommendations = page.getByTestId('workout-recommendation');
      const count = await recommendations.count();
      for (let i = 0; i < count; i++) {
        const recommendation = recommendations.nth(i);
        await expect(recommendation).not.toContainText('Running');
        await expect(recommendation).not.toContainText('Jumping');
      }

      // Track constraint impact
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const constraintEvent = capturedEvents.find(event => 
        event.eventName === 'constraint_added'
      );
      expect(constraintEvent).toBeTruthy();
      expect(constraintEvent.properties.constraintType).toBe('injury');
      expect(constraintEvent.properties.severity).toBe('medium');
    });

    test('should configure schedule constraints', async ({ page }) => {
      await createBasicProfile(page);

      // Add schedule constraint
      await page.getByTestId('add-constraint-button').click();
      await page.getByLabel('Constraint Type').selectOption('schedule');
      await page.getByLabel('Description').fill('Available only weekday evenings');

      // Set specific time availability
      await page.getByTestId('monday-evening').check();
      await page.getByTestId('tuesday-evening').check();
      await page.getByTestId('wednesday-evening').check();
      await page.getByTestId('thursday-evening').check();
      await page.getByTestId('friday-evening').check();

      // Set time range
      await page.getByLabel('Available From').fill('18:00');
      await page.getByLabel('Available Until').fill('21:00');

      await page.getByRole('button', { name: 'Add Constraint' }).click();
      await page.waitForLoadState('networkidle');

      // Verify schedule constraint
      await expect(page.getByTestId('constraint-item')).toContainText('Schedule Constraint');
      await expect(page.getByTestId('constraint-item')).toContainText('Weekday evenings');
      await expect(page.getByTestId('constraint-item')).toContainText('18:00 - 21:00');

      // Verify impact on workout scheduling
      await page.goto('/dashboard/exercise/schedule');
      await page.waitForLoadState('networkidle');

      // Should only show available time slots
      await expect(page.getByTestId('available-slots')).toContainText('Monday 6:00 PM');
      await expect(page.getByTestId('available-slots')).toContainText('Tuesday 6:00 PM');
      await expect(page.getByTestId('available-slots')).not.toContainText('Saturday');
      await expect(page.getByTestId('available-slots')).not.toContainText('Sunday');
    });

    test('should handle equipment availability constraints', async ({ page }) => {
      await createBasicProfile(page);

      // Add equipment constraint
      await page.getByTestId('add-constraint-button').click();
      await page.getByLabel('Constraint Type').selectOption('equipment');
      await page.getByLabel('Description').fill('Limited home equipment only');

      // Select available equipment
      await page.getByTestId('available-dumbbells').check();
      await page.getByTestId('available-resistance-bands').check();
      await page.getByTestId('available-yoga-mat').check();

      // Specify unavailable equipment
      await page.getByTestId('unavailable-barbell').check();
      await page.getByTestId('unavailable-treadmill').check();
      await page.getByTestId('unavailable-cable-machine').check();

      await page.getByRole('button', { name: 'Add Constraint' }).click();
      await page.waitForLoadState('networkidle');

      // Verify equipment constraint
      await expect(page.getByTestId('constraint-item')).toContainText('Equipment Constraint');
      await expect(page.getByTestId('available-equipment-list')).toContainText('Dumbbells');
      await expect(page.getByTestId('available-equipment-list')).toContainText('Resistance Bands');

      // Verify impact on workout recommendations
      await page.goto('/dashboard/exercise/recommendations');
      await page.waitForLoadState('networkidle');

      // Should filter by available equipment
      const recommendations = page.getByTestId('workout-recommendation');
      const count = await recommendations.count();
      for (let i = 0; i < count; i++) {
        const recommendation = recommendations.nth(i);
        const equipmentText = await recommendation.getByTestId('required-equipment').textContent();
        expect(equipmentText).not.toContain('Barbell');
        expect(equipmentText).not.toContain('Treadmill');
      }
    });

    test('should allow updating and resolving constraints', async ({ page }) => {
      await createBasicProfile(page);

      // Add a constraint
      await addInjuryConstraint(page, 'shoulder', 'low', 'Minor strain');

      // Update constraint severity
      await page.getByTestId('edit-constraint-button').first().click();
      await page.getByLabel('Severity').selectOption('high');
      await page.getByLabel('Description').fill('Worsened shoulder strain, needs rest');
      await page.getByRole('button', { name: 'Update Constraint' }).click();

      await page.waitForLoadState('networkidle');

      // Verify update
      await expect(page.getByTestId('constraint-item')).toContainText('High Severity');
      await expect(page.getByTestId('constraint-item')).toContainText('Worsened shoulder strain');

      // Resolve constraint
      await page.getByTestId('resolve-constraint-button').first().click();
      await page.getByLabel('Resolution Notes').fill('Fully healed after physical therapy');
      await page.getByRole('button', { name: 'Mark as Resolved' }).click();

      await page.waitForLoadState('networkidle');

      // Verify resolution
      await expect(page.getByText('Constraint resolved successfully')).toBeVisible();
      await expect(page.getByTestId('constraint-item')).toContainText('Resolved');
      await expect(page.getByTestId('constraint-item')).toContainText('Fully healed');

      // Verify tracking
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const resolvedEvent = capturedEvents.find(event => 
        event.eventName === 'constraint_resolved'
      );
      expect(resolvedEvent).toBeTruthy();
      expect(resolvedEvent.properties.constraintType).toBe('injury');
      expect(resolvedEvent.properties.resolutionMethod).toBe('manual');
    });

    test('should show constraint impact warnings', async ({ page }) => {
      await createBasicProfile(page);

      // Add multiple conflicting constraints
      await addInjuryConstraint(page, 'knee', 'high', 'Severe knee injury');
      await addInjuryConstraint(page, 'shoulder', 'medium', 'Shoulder impingement');

      // Navigate to workout planning
      await page.goto('/dashboard/exercise/plan');
      await page.waitForLoadState('networkidle');

      // Should show constraint warnings
      await expect(page.getByTestId('constraint-warning')).toBeVisible();
      await expect(page.getByTestId('constraint-warning')).toContainText('Multiple active constraints may significantly limit workout options');

      // Should show specific impact
      await expect(page.getByTestId('constraint-impact')).toContainText('Upper body exercises limited due to shoulder injury');
      await expect(page.getByTestId('constraint-impact')).toContainText('Lower body exercises limited due to knee injury');

      // Should suggest alternatives
      await expect(page.getByTestId('constraint-alternatives')).toContainText('Consider core-focused or seated exercises');
    });
  });

  test.describe('Micro-Behavior Tracking', () => {
    test('should detect and track micro-behavior patterns', async ({ page }) => {
      await createBasicProfile(page);

      // Simulate workout session with micro-behaviors
      await page.goto('/dashboard/exercise/workout');
      await page.getByTestId('start-workout-button').click();

      // Track various micro-behaviors during workout
      await page.getByTestId('exercise-rest-timer').click(); // Rest behavior
      await page.waitForTimeout(2000);
      
      await page.getByTestId('increase-weight-button').click(); // Weight adjustment
      await page.getByTestId('decrease-reps-button').click(); // Rep adjustment
      
      await page.getByTestId('skip-exercise-button').click(); // Exercise skipping
      await page.getByLabel('Skip Reason').selectOption('too-difficult');
      await page.getByRole('button', { name: 'Confirm Skip' }).click();

      await page.getByTestId('end-workout-button').click();
      await page.getByRole('button', { name: 'Complete Workout' }).click();

      await page.waitForLoadState('networkidle');

      // Navigate to behavior analysis
      await page.goto('/dashboard/profile/behavior-analysis');
      await page.waitForLoadState('networkidle');

      // Should show detected patterns
      await expect(page.getByTestId('behavior-pattern')).toContainText('Frequent weight adjustments');
      await expect(page.getByTestId('behavior-pattern')).toContainText('Exercise skipping when difficulty is high');
      await expect(page.getByTestId('behavior-pattern')).toContainText('Extended rest periods');

      // Should show pattern insights
      await expect(page.getByTestId('pattern-insight')).toContainText('Consider starting with lower weights');
      await expect(page.getByTestId('pattern-insight')).toContainText('May benefit from progressive difficulty');

      // Verify tracking
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const patternEvent = capturedEvents.find(event => 
        event.eventName === 'micro_behavior_pattern_detected'
      );
      expect(patternEvent).toBeTruthy();
      expect(patternEvent.properties.patternType).toBe('workout_adjustment');
    });

    test('should track context during workout sessions', async ({ page }) => {
      await createBasicProfile(page);

      // Start workout with context tracking
      await page.goto('/dashboard/exercise/workout');
      
      // Set workout context
      await page.getByTestId('workout-location').selectOption('home');
      await page.getByTestId('energy-level').selectOption('medium');
      await page.getByTestId('mood').selectOption('motivated');
      await page.getByTestId('time-available').fill('45');

      await page.getByTestId('start-workout-button').click();

      // Perform workout with context changes
      await page.getByTestId('update-energy-level').selectOption('low'); // Energy drops
      await page.getByTestId('update-mood').selectOption('frustrated'); // Mood changes

      await page.getByTestId('end-workout-button').click();
      await page.getByRole('button', { name: 'Complete Workout' }).click();

      // Navigate to context analysis
      await page.goto('/dashboard/profile/context-analysis');
      await page.waitForLoadState('networkidle');

      // Should show context patterns
      await expect(page.getByTestId('context-pattern')).toContainText('Energy typically decreases during home workouts');
      await expect(page.getByTestId('context-pattern')).toContainText('Mood changes correlate with workout difficulty');

      // Should show context-based recommendations
      await expect(page.getByTestId('context-recommendation')).toContainText('Consider shorter workouts when energy is medium');
      await expect(page.getByTestId('context-recommendation')).toContainText('Plan easier exercises for home sessions');
    });

    test('should generate behavioral insights and recommendations', async ({ page }) => {
      await createBasicProfile(page);

      // Simulate multiple workout sessions with patterns
      for (let i = 0; i < 5; i++) {
        await simulateWorkoutSession(page, {
          location: 'home',
          energyLevel: 'medium',
          completionRate: 0.8,
          adjustments: ['weight-decrease', 'rest-increase'],
        });
      }

      // Navigate to insights
      await page.goto('/dashboard/profile/insights');
      await page.waitForLoadState('networkidle');

      // Should show behavioral insights
      await expect(page.getByTestId('insight-card')).toContainText('Consistent home workout pattern');
      await expect(page.getByTestId('insight-card')).toContainText('Tendency to reduce intensity mid-workout');
      await expect(page.getByTestId('insight-card')).toContainText('80% average completion rate');

      // Should show actionable recommendations
      await expect(page.getByTestId('recommendation-card')).toContainText('Start with 10% lower weights for home workouts');
      await expect(page.getByTestId('recommendation-card')).toContainText('Consider 5-minute warm-up to improve energy');
      await expect(page.getByTestId('recommendation-card')).toContainText('Plan 20% buffer time for rest periods');

      // Should allow applying recommendations
      await page.getByTestId('apply-recommendation-button').first().click();
      await page.getByRole('button', { name: 'Apply to Profile' }).click();

      // Verify recommendation applied
      await expect(page.getByText('Recommendation applied to your profile')).toBeVisible();
      
      // Check that preferences were updated
      await page.goto('/dashboard/profile');
      await expect(page.getByTestId('auto-adjustments')).toContainText('Home workout weight reduction: 10%');
    });

    test('should correlate behavior with profile data', async ({ page }) => {
      await createBasicProfile(page);

      // Add specific profile data
      await page.getByTestId('edit-profile-button').click();
      await page.getByLabel('Sleep Quality').selectOption('poor');
      await page.getByLabel('Stress Level').selectOption('high');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Simulate workouts with poor performance
      for (let i = 0; i < 3; i++) {
        await simulateWorkoutSession(page, {
          completionRate: 0.5,
          energyLevel: 'low',
          mood: 'unmotivated',
        });
      }

      // Navigate to correlation analysis
      await page.goto('/dashboard/profile/correlations');
      await page.waitForLoadState('networkidle');

      // Should show correlations
      await expect(page.getByTestId('correlation-insight')).toContainText('Poor sleep quality correlates with low workout completion');
      await expect(page.getByTestId('correlation-insight')).toContainText('High stress levels associated with decreased motivation');

      // Should show correlation strength
      await expect(page.getByTestId('correlation-strength')).toContainText('Strong correlation (r = 0.85)');

      // Should suggest profile-based interventions
      await expect(page.getByTestId('intervention-suggestion')).toContainText('Focus on sleep improvement for better workout performance');
      await expect(page.getByTestId('intervention-suggestion')).toContainText('Consider stress management techniques');
    });

    test('should track long-term behavior trends', async ({ page }) => {
      await createBasicProfile(page);

      // Simulate behavior over time (mock historical data)
      await page.addInitScript(() => {
        window.mockHistoricalData = {
          workoutFrequency: [2, 3, 4, 4, 5], // Increasing trend
          completionRates: [0.6, 0.7, 0.75, 0.8, 0.85], // Improving trend
          energyLevels: [2, 2, 3, 3, 4], // Improving trend
        };
      });

      await page.goto('/dashboard/profile/trends');
      await page.waitForLoadState('networkidle');

      // Should show trend analysis
      await expect(page.getByTestId('trend-chart')).toBeVisible();
      await expect(page.getByTestId('trend-summary')).toContainText('Workout frequency increasing');
      await expect(page.getByTestId('trend-summary')).toContainText('Completion rate improving');
      await expect(page.getByTestId('trend-summary')).toContainText('Energy levels trending upward');

      // Should show trend predictions
      await expect(page.getByTestId('trend-prediction')).toContainText('Projected to reach 6 workouts/week');
      await expect(page.getByTestId('trend-prediction')).toContainText('90% completion rate achievable');

      // Should suggest trend-based goals
      await expect(page.getByTestId('trend-goal')).toContainText('Maintain current improvement trajectory');
      await expect(page.getByTestId('trend-goal')).toContainText('Consider increasing workout intensity');
    });
  });

  test.describe('Integration Scenarios', () => {
    test('should integrate profile with health tracking features', async ({ page }) => {
      await createBasicProfile(page);

      // Add health data
      await addHealthRecord(page, 'weight', '70', 'kg');
      await addHealthRecord(page, 'body_fat', '15', '%');
      await addHealthGoal(page, 'weight', '65', getFutureDate(3));

      // Navigate to integrated dashboard
      await page.goto('/dashboard/overview');
      await page.waitForLoadState('networkidle');

      // Should show integrated view
      await expect(page.getByTestId('profile-health-integration')).toBeVisible();
      await expect(page.getByTestId('profile-health-integration')).toContainText('Current: 70 kg');
      await expect(page.getByTestId('profile-health-integration')).toContainText('Goal: 65 kg');
      await expect(page.getByTestId('profile-health-integration')).toContainText('Body Fat: 15%');

      // Should show profile-informed recommendations
      await expect(page.getByTestId('health-recommendation')).toContainText('Based on your weight loss goal');
      await expect(page.getByTestId('health-recommendation')).toContainText('Cardio workouts recommended');

      // Profile changes should update health recommendations
      await page.goto('/dashboard/profile');
      await page.getByTestId('edit-preferences-button').click();
      await page.getByTestId('workout-type-strength').click();
      await page.getByRole('button', { name: 'Save Preferences' }).click();

      await page.goto('/dashboard/overview');
      await page.waitForLoadState('networkidle');

      // Recommendations should update
      await expect(page.getByTestId('health-recommendation')).toContainText('Strength training for body composition');
    });

    test('should maintain data consistency across components', async ({ page }) => {
      await createBasicProfile(page);

      // Update profile in one component
      await page.getByTestId('edit-profile-button').click();
      await page.getByLabel('Weight').fill('72');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Check consistency in health component
      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId('current-weight')).toContainText('72 kg');

      // Check consistency in exercise component
      await page.goto('/dashboard/exercise');
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId('user-weight')).toContainText('72 kg');

      // Update preferences and check consistency
      await page.goto('/dashboard/profile');
      await page.getByTestId('edit-preferences-button').click();
      await page.getByTestId('workout-type-yoga').click();
      await page.getByRole('button', { name: 'Save Preferences' }).click();

      // Check in recommendations
      await page.goto('/dashboard/exercise/recommendations');
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId('workout-recommendation').first()).toContainText('Yoga');
    });

    test('should handle offline/online synchronization', async ({ page, context }) => {
      await createBasicProfile(page);

      // Go offline
      await context.setOffline(true);

      // Make profile changes offline
      await page.getByTestId('edit-profile-button').click();
      await page.getByLabel('Weight').fill('73');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should show offline indicator
      await expect(page.getByTestId('offline-indicator')).toBeVisible();
      await expect(page.getByText('Changes saved locally')).toBeVisible();

      // Add more changes
      await page.getByTestId('edit-preferences-button').click();
      await page.getByTestId('workout-type-cardio').click();
      await page.getByRole('button', { name: 'Save Preferences' }).click();

      // Should queue changes
      await expect(page.getByTestId('pending-changes')).toContainText('2 changes pending sync');

      // Go back online
      await context.setOffline(false);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should sync changes
      await expect(page.getByText('Profile synchronized')).toBeVisible();
      await expect(page.getByTestId('profile-weight')).toContainText('73');
      
      // Verify preferences synced
      await page.getByTestId('edit-preferences-button').click();
      await expect(page.getByTestId('workout-type-cardio')).toBeChecked();
    });

    test('should handle performance with large datasets', async ({ page }) => {
      await createBasicProfile(page);

      // Simulate large dataset
      await page.addInitScript(() => {
        window.mockLargeDataset = {
          workoutHistory: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            type: ['strength', 'cardio', 'yoga'][i % 3],
            duration: 30 + (i % 60),
            completed: Math.random() > 0.2,
          })),
          behaviorEvents: Array.from({ length: 5000 }, (_, i) => ({
            id: i,
            timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
            type: 'micro_behavior',
            data: { action: 'weight_adjustment', value: Math.random() },
          })),
        };
      });

      // Navigate to analytics with large dataset
      const startTime = Date.now();
      await page.goto('/dashboard/profile/analytics');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load in reasonable time (less than 5 seconds)
      expect(loadTime).toBeLessThan(5000);

      // Should show data with pagination/virtualization
      await expect(page.getByTestId('workout-history-table')).toBeVisible();
      await expect(page.getByTestId('pagination-controls')).toBeVisible();
      await expect(page.getByText('Showing 1-50 of 1000')).toBeVisible();

      // Should handle scrolling/pagination smoothly
      await page.getByTestId('next-page-button').click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Showing 51-100 of 1000')).toBeVisible();

      // Behavior analysis should handle large dataset
      await page.getByTestId('behavior-analysis-tab').click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId('behavior-chart')).toBeVisible();
      await expect(page.getByText('Analyzing 5000 behavior events')).toBeVisible();
    });

    test('should not impact user experience during profile operations', async ({ page }) => {
      await createBasicProfile(page);

      // Measure performance of profile operations
      const operations = [
        () => page.getByTestId('edit-profile-button').click(),
        () => page.getByLabel('Weight').fill('74'),
        () => page.getByRole('button', { name: 'Save Changes' }).click(),
        () => page.getByTestId('edit-preferences-button').click(),
        () => page.getByTestId('workout-type-strength').click(),
        () => page.getByRole('button', { name: 'Save Preferences' }).click(),
      ];

      for (const operation of operations) {
        const startTime = Date.now();
        await operation();
        await page.waitForLoadState('networkidle');
        const operationTime = Date.now() - startTime;

        // Each operation should complete quickly (less than 2 seconds)
        expect(operationTime).toBeLessThan(2000);
      }

      // UI should remain responsive
      await expect(page.getByTestId('profile-overview')).toBeVisible();
      await expect(page.getByText('Profile updated successfully')).toBeVisible();

      // Navigation should work smoothly
      await page.goto('/dashboard/health');
      await page.goto('/dashboard/exercise');
      await page.goto('/dashboard/profile');

      // All transitions should be smooth without blocking
      await expect(page.getByTestId('profile-overview')).toBeVisible();
    });
  });

  // Helper functions
  async function createBasicProfile(page) {
    await page.goto('/dashboard/profile/setup');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('First Name').fill(faker.person.firstName());
    await page.getByLabel('Last Name').fill(faker.person.lastName());
    await page.getByLabel('Date of Birth').fill('1990-01-01');
    await page.getByLabel('Height').fill('175');
    await page.getByLabel('Weight').fill('70');
    await page.getByRole('button', { name: 'Save Basic Profile' }).click();
    await page.waitForLoadState('networkidle');
  }

  async function addInjuryConstraint(page, area, severity, description) {
    await page.getByTestId('add-constraint-button').click();
    await page.getByLabel('Constraint Type').selectOption('injury');
    await page.getByLabel('Affected Area').selectOption(area);
    await page.getByLabel('Severity').selectOption(severity);
    await page.getByLabel('Description').fill(description);
    await page.getByRole('button', { name: 'Add Constraint' }).click();
    await page.waitForLoadState('networkidle');
  }

  async function simulateWorkoutSession(page, options = {}) {
    await page.goto('/dashboard/exercise/workout');
    
    if (options.location) {
      await page.getByTestId('workout-location').selectOption(options.location);
    }
    if (options.energyLevel) {
      await page.getByTestId('energy-level').selectOption(options.energyLevel);
    }

    await page.getByTestId('start-workout-button').click();

    // Simulate workout behaviors based on options
    if (options.adjustments?.includes('weight-decrease')) {
      await page.getByTestId('decrease-weight-button').click();
    }
    if (options.adjustments?.includes('rest-increase')) {
      await page.getByTestId('extend-rest-button').click();
    }

    // Complete or partially complete workout
    if (options.completionRate < 1) {
      await page.getByTestId('end-workout-early-button').click();
      await page.getByLabel('Reason').selectOption('fatigue');
    } else {
      await page.getByTestId('complete-all-exercises-button').click();
    }

    await page.getByTestId('end-workout-button').click();
    await page.getByRole('button', { name: 'Complete Workout' }).click();
    await page.waitForLoadState('networkidle');
  }
});