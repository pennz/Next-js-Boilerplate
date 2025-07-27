import type { NextRequest } from 'next/server';
import arcjet, { tokenBucket } from '@arcjet/next';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
import { UserProfileService } from '@/services/profile/UserProfileService';
import {
  UserProfileQueryValidation,
  UserProfileUpdateValidation,
  UserProfileValidation,
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
      { error: 'User profile feature is not enabled' },
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

// GET - Retrieve user profile with related data
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
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      include_goals: searchParams.get('include_goals'),
      include_preferences: searchParams.get('include_preferences'),
      include_constraints: searchParams.get('include_constraints'),
      fitness_level: searchParams.get('fitness_level'),
      experience_level: searchParams.get('experience_level'),
      age_min: searchParams.get('age_min'),
      age_max: searchParams.get('age_max'),
      activity_level_min: searchParams.get('activity_level_min'),
      activity_level_max: searchParams.get('activity_level_max'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sort_by: searchParams.get('sort_by'),
      sort_order: searchParams.get('sort_order'),
    };

    const parse = UserProfileQueryValidation.safeParse(queryData);
    if (!parse.success) {
      logger.warn('User profile query validation failed', {
        userId,
        queryData,
        errors: parse.error.errors,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const validatedQuery = parse.data;

    // Determine if we should include related data
    const includeRelated = validatedQuery.include_goals
      || validatedQuery.include_preferences
      || validatedQuery.include_constraints;

    // Retrieve profile using service
    const profile = await UserProfileService.getProfile(userId, includeRelated);

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    // Get profile statistics
    const stats = await UserProfileService.getProfileStats(userId);

    logger.info('User profile retrieved', {
      userId,
      profileId: profile.id,
      includeRelated,
      completeness: stats.profileCompleteness,
    });

    return NextResponse.json({
      profile,
      stats,
      meta: {
        completeness: stats.profileCompleteness,
        completion_threshold: Env.PROFILE_COMPLETION_THRESHOLD,
        is_complete: stats.profileCompleteness >= Env.PROFILE_COMPLETION_THRESHOLD,
      },
    });
  } catch (error) {
    logger.error('Error retrieving user profile', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// POST - Create new user profile with comprehensive validation
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
    const json = await request.json();

    // Validate profile data
    const parse = UserProfileValidation.safeParse(json);
    if (!parse.success) {
      logger.warn('User profile validation failed', {
        userId,
        errors: parse.error.errors,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const validatedProfile = parse.data;

    // Create profile using service
    const createdProfile = await UserProfileService.createProfile(userId, validatedProfile);

    // Get initial profile statistics
    const stats = await UserProfileService.getProfileStats(userId);

    logger.info('User profile created', {
      userId,
      profileId: createdProfile.id,
      completeness: stats.profileCompleteness,
      fitness_level: validatedProfile.fitness_level,
      experience_level: validatedProfile.experience_level,
    });

    return NextResponse.json({
      profile: createdProfile,
      stats,
      message: 'User profile created successfully',
      meta: {
        completeness: stats.profileCompleteness,
        completion_threshold: Env.PROFILE_COMPLETION_THRESHOLD,
        is_complete: stats.profileCompleteness >= Env.PROFILE_COMPLETION_THRESHOLD,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating user profile', { error, userId });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Validation failed')) {
        return NextResponse.json(
          { error: error.message },
          { status: 422 },
        );
      }

      if (error.message.includes('User profile already exists')) {
        return NextResponse.json(
          { error: 'User profile already exists' },
          { status: 409 },
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

// PUT - Update existing user profile
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

    // Validate update data
    const parse = UserProfileUpdateValidation.safeParse(json);
    if (!parse.success) {
      logger.warn('User profile update validation failed', {
        userId,
        errors: parse.error.errors,
      });
      return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
    }

    const validatedUpdates = parse.data;

    // Handle optimistic concurrency control
    const { updated_at, ...updates } = validatedUpdates;
    if (updated_at) {
      // Check if the profile has been modified since the client last fetched it
      const currentProfile = await UserProfileService.getProfile(userId, false);
      if (currentProfile && currentProfile.updated_at > updated_at) {
        return NextResponse.json(
          {
            error: 'Profile has been modified by another request. Please refresh and try again.',
            current_updated_at: currentProfile.updated_at,
          },
          { status: 409 },
        );
      }
    }

    // Update profile using service
    const updatedProfile = await UserProfileService.updateProfile(userId, updates);

    // Get updated profile statistics
    const stats = await UserProfileService.getProfileStats(userId);

    logger.info('User profile updated', {
      userId,
      profileId: updatedProfile.id,
      updatedFields: Object.keys(updates),
      newCompleteness: stats.profileCompleteness,
    });

    return NextResponse.json({
      profile: updatedProfile,
      stats,
      message: 'User profile updated successfully',
      meta: {
        completeness: stats.profileCompleteness,
        completion_threshold: Env.PROFILE_COMPLETION_THRESHOLD,
        is_complete: stats.profileCompleteness >= Env.PROFILE_COMPLETION_THRESHOLD,
        updated_fields: Object.keys(updates),
      },
    });
  } catch (error) {
    logger.error('Error updating user profile', { error, userId });

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
          { error: 'User profile not found' },
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

// DELETE - Soft delete user profile
export const DELETE = async (request: NextRequest) => {
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
    const { searchParams } = new URL(request.url);
    const confirmDelete = searchParams.get('confirm');

    // Require explicit confirmation for profile deletion
    if (confirmDelete !== 'true') {
      return NextResponse.json(
        {
          error: 'Profile deletion requires explicit confirmation',
          message: 'Add ?confirm=true to the request URL to confirm deletion',
        },
        { status: 400 },
      );
    }

    // Get profile info before deletion for logging
    const existingProfile = await UserProfileService.getProfile(userId, false);
    if (!existingProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    // Delete profile using service (soft delete with data retention)
    const deleted = await UserProfileService.deleteProfile(userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete user profile' },
        { status: 500 },
      );
    }

    logger.info('User profile deleted', {
      userId,
      profileId: existingProfile.id,
      deletedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      message: 'User profile deleted successfully',
      deleted_at: new Date().toISOString(),
      meta: {
        data_retention: 'Profile data has been archived for compliance purposes',
        recovery_period: '30 days',
      },
    });
  } catch (error) {
    logger.error('Error deleting user profile', { error, userId });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('User profile not found')) {
        return NextResponse.json(
          { error: 'User profile not found' },
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
