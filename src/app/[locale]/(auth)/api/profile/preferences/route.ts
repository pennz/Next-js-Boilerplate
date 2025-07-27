import type { NextRequest } from 'next/server';
import type { UserPreferenceInput } from '@/validations/UserProfileValidation';
import arcjet, { tokenBucket } from '@arcjet/next';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { z } from 'zod';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
import { UserProfileService } from '@/services/profile/UserProfileService';
import {
  UserPreferenceUpdateValidation,

} from '@/validations/UserProfileValidation';

// Arcjet rate limiting configuration
const aj = arcjet({
  key: Env.ARCJET_KEY!,
  rules: [
    tokenBucket({
      mode: 'LIVE',
      characteristics: ['userId'],
      refillRate: 10,
      interval: 60,
      capacity: 20,
    }),
  ],
});

// Feature flag check
const checkUserProfileFeatureFlag = () => {
  if (!Env.ENABLE_USER_PROFILES) {
    return NextResponse.json(
      { error: 'User profile management feature is not enabled' },
      { status: 503 },
    );
  }
  return null;
};

// Authentication helper
const getCurrentUserId = async () => {
  const user = await currentUser();
  if (!user) {
    return null;
  }
  return user.id;
};

// Default preferences
const getDefaultPreferences = (): UserPreferenceInput => ({
  preferred_workout_types: ['strength', 'cardio'],
  preferred_times: ['morning'],
  preferred_days: ['monday', 'wednesday', 'friday'],
  available_equipment: ['none'],
  workout_intensity_preference: 3,
  rest_day_preference: 2,
  notification_preferences: {
    workout_reminders: true,
    goal_progress: true,
    weekly_summary: true,
    achievement_alerts: true,
  },
  privacy_settings: {
    profile_visibility: 'private',
    share_workout_data: false,
    share_progress: false,
  },
});

// GET - Retrieve user workout and app preferences
export const GET = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkUserProfileFeatureFlag();
  if (featureCheck) {
    return featureCheck;
  }

  // Check authentication
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Apply rate limiting
  const decision = await aj.protect(request, { userId, requested: 1 });
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 },
    );
  }

  try {
    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeDefaults = searchParams.get('includeDefaults') === 'true';

    // Retrieve user preferences
    const preferences = await UserProfileService.getPreferences(userId);

    // If no preferences found and includeDefaults is true, return defaults
    if (!preferences && includeDefaults) {
      const defaultPreferences = getDefaultPreferences();

      logger.info('Default preferences returned', {
        userId,
        hasCustomPreferences: false,
      });

      return NextResponse.json({
        preferences: defaultPreferences,
        isDefault: true,
        message: 'Default preferences returned - no custom preferences set',
      });
    }

    // If no preferences found and includeDefaults is false
    if (!preferences) {
      return NextResponse.json(
        { error: 'No preferences found for user' },
        { status: 404 },
      );
    }

    // Filter by category if specified
    let filteredPreferences = preferences;
    if (category) {
      switch (category.toLowerCase()) {
        case 'workout':
          filteredPreferences = {
            preferred_workout_types: preferences.preferred_workout_types,
            preferred_times: preferences.preferred_times,
            preferred_days: preferences.preferred_days,
            available_equipment: preferences.available_equipment,
            workout_intensity_preference: preferences.workout_intensity_preference,
            rest_day_preference: preferences.rest_day_preference,
          };
          break;
        case 'notifications':
          filteredPreferences = {
            notification_preferences: preferences.notification_preferences,
          };
          break;
        case 'privacy':
          filteredPreferences = {
            privacy_settings: preferences.privacy_settings,
          };
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid category. Valid categories: workout, notifications, privacy' },
            { status: 400 },
          );
      }
    }

    logger.info('User preferences retrieved', {
      userId,
      hasCustomPreferences: true,
      category: category || 'all',
    });

    return NextResponse.json({
      preferences: filteredPreferences,
      isDefault: false,
      lastUpdated: preferences.updated_at || preferences.created_at,
    });
  } catch (error) {
    logger.error('Error retrieving user preferences', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// PUT - Update user preferences
export const PUT = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkUserProfileFeatureFlag();
  if (featureCheck) {
    return featureCheck;
  }

  // Check authentication
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Apply rate limiting
  const decision = await aj.protect(request, { userId, requested: 1 });
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 },
    );
  }

  try {
    const json = await request.json();

    // Parse query parameters for partial updates
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const merge = searchParams.get('merge') !== 'false'; // Default to true

    let preferencesToUpdate = json;

    // If category is specified, validate that only relevant fields are being updated
    if (category) {
      const validCategories = ['workout', 'notifications', 'privacy'];
      if (!validCategories.includes(category.toLowerCase())) {
        return NextResponse.json(
          { error: 'Invalid category. Valid categories: workout, notifications, privacy' },
          { status: 400 },
        );
      }

      // Validate category-specific fields
      const categoryFields = {
        workout: [
          'preferred_workout_types',
          'preferred_times',
          'preferred_days',
          'available_equipment',
          'workout_intensity_preference',
          'rest_day_preference',
        ],
        notifications: ['notification_preferences'],
        privacy: ['privacy_settings'],
      };

      const allowedFields = categoryFields[category.toLowerCase() as keyof typeof categoryFields];
      const providedFields = Object.keys(json);
      const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

      if (invalidFields.length > 0) {
        return NextResponse.json(
          {
            error: `Invalid fields for category '${category}': ${invalidFields.join(', ')}`,
            allowedFields,
          },
          { status: 400 },
        );
      }
    }

    // If merge is true and we have existing preferences, merge with current preferences
    if (merge) {
      const existingPreferences = await UserProfileService.getPreferences(userId);
      if (existingPreferences) {
        // Deep merge preferences, especially for nested objects
        preferencesToUpdate = {
          ...existingPreferences,
          ...json,
          notification_preferences: {
            ...existingPreferences.notification_preferences,
            ...json.notification_preferences,
          },
          privacy_settings: {
            ...existingPreferences.privacy_settings,
            ...json.privacy_settings,
          },
        };
      }
    }

    // Validate preferences using partial validation for updates
    const parse = UserPreferenceUpdateValidation.safeParse(preferencesToUpdate);
    if (!parse.success) {
      logger.warn('User preferences validation failed', {
        userId,
        errors: parse.error.errors,
        category,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const validatedPreferences = parse.data;

    // Update preferences using service
    const updatedPreferences = await UserProfileService.updatePreferences(
      userId,
      validatedPreferences,
    );

    logger.info('User preferences updated', {
      userId,
      category: category || 'all',
      updatedFields: Object.keys(json),
      merge,
    });

    return NextResponse.json({
      preferences: updatedPreferences,
      message: 'Preferences updated successfully',
      updatedFields: Object.keys(json),
      category: category || 'all',
    });
  } catch (error) {
    logger.error('Error updating user preferences', { error, userId });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Validation failed')) {
        return NextResponse.json(
          { error: error.message },
          { status: 422 },
        );
      }

      if (error.message.includes('User profile not found')) {
        return NextResponse.json(
          { error: 'User profile not found. Please create a profile first.' },
          { status: 404 },
        );
      }

      if (error.message.includes('Invalid user ID')) {
        return NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// POST - Reset preferences to defaults
export const POST = async (request: NextRequest) => {
  // Check feature flag
  const featureCheck = checkUserProfileFeatureFlag();
  if (featureCheck) {
    return featureCheck;
  }

  // Check authentication
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Apply rate limiting
  const decision = await aj.protect(request, { userId, requested: 1 });
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 },
    );
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const createBackup = searchParams.get('createBackup') !== 'false'; // Default to true

    // Create backup of current preferences if requested
    let backupPreferences = null;
    if (createBackup) {
      try {
        backupPreferences = await UserProfileService.getPreferences(userId);
      } catch (error) {
        // If getting current preferences fails, continue with reset
        logger.warn('Could not create backup of current preferences', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Get default preferences
    const defaultPreferences = getDefaultPreferences();

    let preferencesToSet = defaultPreferences;

    // If category is specified, only reset that category
    if (category) {
      const validCategories = ['workout', 'notifications', 'privacy'];
      if (!validCategories.includes(category.toLowerCase())) {
        return NextResponse.json(
          { error: 'Invalid category. Valid categories: workout, notifications, privacy' },
          { status: 400 },
        );
      }

      // Get current preferences to merge with defaults for specific category
      const currentPreferences = await UserProfileService.getPreferences(userId);
      if (currentPreferences) {
        preferencesToSet = { ...currentPreferences };

        // Reset only the specified category
        switch (category.toLowerCase()) {
          case 'workout':
            preferencesToSet.preferred_workout_types = defaultPreferences.preferred_workout_types;
            preferencesToSet.preferred_times = defaultPreferences.preferred_times;
            preferencesToSet.preferred_days = defaultPreferences.preferred_days;
            preferencesToSet.available_equipment = defaultPreferences.available_equipment;
            preferencesToSet.workout_intensity_preference = defaultPreferences.workout_intensity_preference;
            preferencesToSet.rest_day_preference = defaultPreferences.rest_day_preference;
            break;
          case 'notifications':
            preferencesToSet.notification_preferences = defaultPreferences.notification_preferences;
            break;
          case 'privacy':
            preferencesToSet.privacy_settings = defaultPreferences.privacy_settings;
            break;
        }
      }
    }

    // Reset preferences using service
    const resetPreferences = await UserProfileService.updatePreferences(
      userId,
      preferencesToSet,
    );

    logger.info('User preferences reset to defaults', {
      userId,
      category: category || 'all',
      hadBackup: !!backupPreferences,
    });

    return NextResponse.json({
      preferences: resetPreferences,
      message: `Preferences ${category ? `for category '${category}'` : ''} reset to defaults successfully`,
      category: category || 'all',
      backup: createBackup ? backupPreferences : null,
      resetAt: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    logger.error('Error resetting user preferences', { error, userId });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('User profile not found')) {
        return NextResponse.json(
          { error: 'User profile not found. Please create a profile first.' },
          { status: 404 },
        );
      }

      if (error.message.includes('Invalid user ID')) {
        return NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};
