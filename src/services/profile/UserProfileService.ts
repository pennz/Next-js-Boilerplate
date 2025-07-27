import type { UserConstraintInput, UserFitnessGoalInput, UserPreferenceInput, UserProfileInput, UserProfileUpdateInput } from '@/validations/UserProfileValidation';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { logger } from '@/libs/Logger';
import {
  userConstraintSchema,
  userFitnessGoalSchema,
  userPreferenceSchema,
  userProfileSchema,
} from '@/models/Schema';
import {

  UserConstraintValidation,

  UserFitnessGoalValidation,

  UserPreferenceValidation,

  UserProfileUpdateValidation,
  UserProfileValidation,
} from '@/validations/UserProfileValidation';

export class UserProfileService {
  /**
   * Create user profile with validation and defaults
   */
  static async createProfile(userId: string, profileData: UserProfileInput): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    // Validate profile data
    const validationResult = UserProfileValidation.safeParse(profileData);
    if (!validationResult.success) {
      logger.warn('Profile validation failed', {
        userId,
        errors: validationResult.error.issues,
      });
      throw new Error(`Validation failed: ${validationResult.error.issues[0]?.message}`);
    }

    const validatedProfile = validationResult.data;

    try {
      // Check if profile already exists
      const existingProfile = await db.query.userProfileSchema.findFirst({
        where: eq(userProfileSchema.userId, userId),
      });

      if (existingProfile) {
        throw new Error('User profile already exists');
      }

      // Calculate profile completeness
      const completeness = this.calculateProfileCompleteness(validatedProfile);

      // Prepare profile for insertion
      const profileToInsert = {
        userId,
        fitnessLevel: validatedProfile.fitnessLevel || 'beginner',
        experienceYears: validatedProfile.experienceYears || 0,
        timezone: validatedProfile.timezone || 'UTC',
        dateOfBirth: validatedProfile.dateOfBirth || null,
        height: validatedProfile.height || null,
        weight: validatedProfile.weight || null,
        activityLevel: validatedProfile.activityLevel || 'moderate',
        profileCompleteness: completeness,
      };

      // Insert profile
      const insertedProfile = await db
        .insert(userProfileSchema)
        .values(profileToInsert)
        .returning();

      logger.info('User profile created', {
        userId,
        profileId: insertedProfile[0]?.id,
        completeness,
      });

      return insertedProfile[0];
    } catch (error) {
      logger.error('Failed to create user profile', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update profile with partial data and validation
   */
  static async updateProfile(userId: string, updates: UserProfileUpdateInput): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    // Validate update data
    const validationResult = UserProfileUpdateValidation.safeParse(updates);
    if (!validationResult.success) {
      logger.warn('Profile update validation failed', {
        userId,
        errors: validationResult.error.issues,
      });
      throw new Error(`Validation failed: ${validationResult.error.issues[0]?.message}`);
    }

    const validatedUpdates = validationResult.data;

    try {
      // Check if profile exists
      const existingProfile = await db.query.userProfileSchema.findFirst({
        where: eq(userProfileSchema.userId, userId),
      });

      if (!existingProfile) {
        throw new Error('User profile not found');
      }

      // Calculate new completeness if relevant fields are updated
      let newCompleteness = existingProfile.profileCompleteness;
      if (this.hasCompletenessRelevantFields(validatedUpdates)) {
        const mergedProfile = { ...existingProfile, ...validatedUpdates };
        newCompleteness = this.calculateProfileCompleteness(mergedProfile);
      }

      // Prepare updates
      const updatesToApply = {
        ...validatedUpdates,
        profileCompleteness: newCompleteness,
      };

      // Update profile
      const updatedProfile = await db
        .update(userProfileSchema)
        .set(updatesToApply)
        .where(eq(userProfileSchema.userId, userId))
        .returning();

      logger.info('User profile updated', {
        userId,
        profileId: updatedProfile[0]?.id,
        updatedFields: Object.keys(validatedUpdates),
        newCompleteness,
      });

      return updatedProfile[0];
    } catch (error) {
      logger.error('Failed to update user profile', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retrieve complete user profile with related data
   */
  static async getProfile(userId: string, includeRelated: boolean = true): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      // Get base profile
      const profile = await db.query.userProfileSchema.findFirst({
        where: eq(userProfileSchema.userId, userId),
      });

      if (!profile) {
        return null;
      }

      let result: any = profile;

      if (includeRelated) {
        // Get related data
        const [fitnessGoals, preferences, constraints] = await Promise.all([
          this.getFitnessGoals(userId),
          this.getPreferences(userId),
          this.getActiveConstraints(userId),
        ]);

        result = {
          ...profile,
          fitnessGoals,
          preferences,
          constraints,
        };
      }

      logger.debug('User profile retrieved', {
        userId,
        profileId: profile.id,
        includeRelated,
      });

      return result;
    } catch (error) {
      logger.error('Failed to retrieve user profile', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Soft delete profile with data retention
   */
  static async deleteProfile(userId: string): Promise<boolean> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      // Check if profile exists
      const existingProfile = await db.query.userProfileSchema.findFirst({
        where: eq(userProfileSchema.userId, userId),
      });

      if (!existingProfile) {
        throw new Error('User profile not found');
      }

      // Soft delete by updating a flag or moving to archive table
      // For now, we'll actually delete but in production you might want to archive
      await db.transaction(async (tx) => {
        // Delete related data
        await tx.delete(userConstraintSchema).where(eq(userConstraintSchema.userId, userId));
        await tx.delete(userPreferenceSchema).where(eq(userPreferenceSchema.userId, userId));
        await tx.delete(userFitnessGoalSchema).where(eq(userFitnessGoalSchema.userId, userId));
        await tx.delete(userProfileSchema).where(eq(userProfileSchema.userId, userId));
      });

      logger.info('User profile deleted', {
        userId,
        profileId: existingProfile.id,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete user profile', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Add fitness goals with validation
   */
  static async createFitnessGoal(userId: string, goalData: UserFitnessGoalInput): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    // Validate goal data
    const validationResult = UserFitnessGoalValidation.safeParse(goalData);
    if (!validationResult.success) {
      logger.warn('Fitness goal validation failed', {
        userId,
        errors: validationResult.error.issues,
      });
      throw new Error(`Validation failed: ${validationResult.error.issues[0]?.message}`);
    }

    const validatedGoal = validationResult.data;

    try {
      // Check if user profile exists
      const profile = await db.query.userProfileSchema.findFirst({
        where: eq(userProfileSchema.userId, userId),
      });

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Prepare goal for insertion
      const goalToInsert = {
        userId,
        goalType: validatedGoal.goalType,
        targetValue: validatedGoal.targetValue || null,
        currentValue: validatedGoal.currentValue || null,
        unit: validatedGoal.unit || null,
        targetDate: validatedGoal.targetDate || null,
        priority: validatedGoal.priority || 1,
        status: validatedGoal.status || 'active',
        description: validatedGoal.description || null,
      };

      // Insert goal
      const insertedGoal = await db
        .insert(userFitnessGoalSchema)
        .values(goalToInsert)
        .returning();

      logger.info('Fitness goal created', {
        userId,
        goalId: insertedGoal[0]?.id,
        goalType: validatedGoal.goalType,
      });

      return insertedGoal[0];
    } catch (error) {
      logger.error('Failed to create fitness goal', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update existing goals
   */
  static async updateFitnessGoal(userId: string, goalId: number, updates: Partial<UserFitnessGoalInput>): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    if (!goalId || goalId <= 0) {
      throw new Error('Invalid goal ID');
    }

    try {
      // Check if goal exists and belongs to user
      const existingGoal = await db.query.userFitnessGoalSchema.findFirst({
        where: and(
          eq(userFitnessGoalSchema.id, goalId),
          eq(userFitnessGoalSchema.userId, userId),
        ),
      });

      if (!existingGoal) {
        throw new Error('Fitness goal not found');
      }

      // Update goal
      const updatedGoal = await db
        .update(userFitnessGoalSchema)
        .set(updates)
        .where(and(
          eq(userFitnessGoalSchema.id, goalId),
          eq(userFitnessGoalSchema.userId, userId),
        ))
        .returning();

      logger.info('Fitness goal updated', {
        userId,
        goalId,
        updatedFields: Object.keys(updates),
      });

      return updatedGoal[0];
    } catch (error) {
      logger.error('Failed to update fitness goal', {
        userId,
        goalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retrieve goals with filtering
   */
  static async getFitnessGoals(userId: string, filters?: { status?: string; goalType?: string }): Promise<any[]> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      // Build where conditions
      const whereConditions = [eq(userFitnessGoalSchema.userId, userId)];

      if (filters?.status) {
        whereConditions.push(eq(userFitnessGoalSchema.status, filters.status as any));
      }

      if (filters?.goalType) {
        whereConditions.push(eq(userFitnessGoalSchema.goalType, filters.goalType as any));
      }

      // Execute query
      const goals = await db
        .select()
        .from(userFitnessGoalSchema)
        .where(and(...whereConditions))
        .orderBy(desc(userFitnessGoalSchema.priority), desc(userFitnessGoalSchema.createdAt));

      logger.debug('Fitness goals retrieved', {
        userId,
        goalCount: goals.length,
        filters,
      });

      return goals;
    } catch (error) {
      logger.error('Failed to retrieve fitness goals', {
        userId,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Archive completed or abandoned goals
   */
  static async archiveGoal(userId: string, goalId: number): Promise<any> {
    return this.updateFitnessGoal(userId, goalId, { status: 'completed' });
  }

  /**
   * Update workout and app preferences
   */
  static async updatePreferences(userId: string, preferences: UserPreferenceInput): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    // Validate preferences
    const validationResult = UserPreferenceValidation.safeParse(preferences);
    if (!validationResult.success) {
      logger.warn('Preferences validation failed', {
        userId,
        errors: validationResult.error.issues,
      });
      throw new Error(`Validation failed: ${validationResult.error.issues[0]?.message}`);
    }

    const validatedPreferences = validationResult.data;

    try {
      // Check if preferences exist
      const existingPreferences = await db.query.userPreferenceSchema.findFirst({
        where: eq(userPreferenceSchema.userId, userId),
      });

      let result;

      if (existingPreferences) {
        // Update existing preferences
        result = await db
          .update(userPreferenceSchema)
          .set(validatedPreferences)
          .where(eq(userPreferenceSchema.userId, userId))
          .returning();
      } else {
        // Create new preferences
        result = await db
          .insert(userPreferenceSchema)
          .values({ userId, ...validatedPreferences })
          .returning();
      }

      logger.info('User preferences updated', {
        userId,
        preferencesId: result[0]?.id,
        isNew: !existingPreferences,
      });

      return result[0];
    } catch (error) {
      logger.error('Failed to update preferences', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retrieve user preferences
   */
  static async getPreferences(userId: string): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const preferences = await db.query.userPreferenceSchema.findFirst({
        where: eq(userPreferenceSchema.userId, userId),
      });

      logger.debug('User preferences retrieved', {
        userId,
        hasPreferences: !!preferences,
      });

      return preferences;
    } catch (error) {
      logger.error('Failed to retrieve preferences', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Reset to default preferences
   */
  static async resetPreferences(userId: string): Promise<any> {
    const defaultPreferences = {
      preferredWorkoutTypes: null,
      preferredEquipment: null,
      preferredTimeOfDay: null,
      preferredDaysOfWeek: null,
      sessionDurationMin: 30,
      sessionDurationMax: 60,
      workoutFrequencyPerWeek: 3,
      restDayPreference: null,
      intensityPreference: 'intermediate',
      musicPreference: true,
      reminderEnabled: true,
      autoProgressionEnabled: true,
    };

    return this.updatePreferences(userId, defaultPreferences);
  }

  /**
   * Add injury, schedule, or equipment constraints
   */
  static async addConstraint(userId: string, constraintData: UserConstraintInput): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    // Validate constraint data
    const validationResult = UserConstraintValidation.safeParse(constraintData);
    if (!validationResult.success) {
      logger.warn('Constraint validation failed', {
        userId,
        errors: validationResult.error.issues,
      });
      throw new Error(`Validation failed: ${validationResult.error.issues[0]?.message}`);
    }

    const validatedConstraint = validationResult.data;

    try {
      // Prepare constraint for insertion
      const constraintToInsert = {
        userId,
        constraintType: validatedConstraint.constraintType,
        severity: validatedConstraint.severity || 'medium',
        title: validatedConstraint.title,
        description: validatedConstraint.description || null,
        affectedBodyParts: validatedConstraint.affectedBodyParts || null,
        restrictedExercises: validatedConstraint.restrictedExercises || null,
        restrictedEquipment: validatedConstraint.restrictedEquipment || null,
        timeRestrictions: validatedConstraint.timeRestrictions || null,
        startDate: validatedConstraint.startDate || new Date(),
        endDate: validatedConstraint.endDate || null,
        isActive: validatedConstraint.isActive !== false,
        notes: validatedConstraint.notes || null,
      };

      // Insert constraint
      const insertedConstraint = await db
        .insert(userConstraintSchema)
        .values(constraintToInsert)
        .returning();

      logger.info('User constraint added', {
        userId,
        constraintId: insertedConstraint[0]?.id,
        constraintType: validatedConstraint.constraintType,
        severity: validatedConstraint.severity,
      });

      return insertedConstraint[0];
    } catch (error) {
      logger.error('Failed to add constraint', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update existing constraints
   */
  static async updateConstraint(userId: string, constraintId: number, updates: Partial<UserConstraintInput>): Promise<any> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    if (!constraintId || constraintId <= 0) {
      throw new Error('Invalid constraint ID');
    }

    try {
      // Check if constraint exists and belongs to user
      const existingConstraint = await db.query.userConstraintSchema.findFirst({
        where: and(
          eq(userConstraintSchema.id, constraintId),
          eq(userConstraintSchema.userId, userId),
        ),
      });

      if (!existingConstraint) {
        throw new Error('Constraint not found');
      }

      // Update constraint
      const updatedConstraint = await db
        .update(userConstraintSchema)
        .set(updates)
        .where(and(
          eq(userConstraintSchema.id, constraintId),
          eq(userConstraintSchema.userId, userId),
        ))
        .returning();

      logger.info('User constraint updated', {
        userId,
        constraintId,
        updatedFields: Object.keys(updates),
      });

      return updatedConstraint[0];
    } catch (error) {
      logger.error('Failed to update constraint', {
        userId,
        constraintId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Remove resolved constraints
   */
  static async removeConstraint(userId: string, constraintId: number): Promise<boolean> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    if (!constraintId || constraintId <= 0) {
      throw new Error('Invalid constraint ID');
    }

    try {
      // Check if constraint exists and belongs to user
      const existingConstraint = await db.query.userConstraintSchema.findFirst({
        where: and(
          eq(userConstraintSchema.id, constraintId),
          eq(userConstraintSchema.userId, userId),
        ),
      });

      if (!existingConstraint) {
        throw new Error('Constraint not found');
      }

      // Soft delete by setting isActive to false
      await db
        .update(userConstraintSchema)
        .set({ isActive: false })
        .where(and(
          eq(userConstraintSchema.id, constraintId),
          eq(userConstraintSchema.userId, userId),
        ));

      logger.info('User constraint removed', {
        userId,
        constraintId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to remove constraint', {
        userId,
        constraintId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get currently active constraints
   */
  static async getActiveConstraints(userId: string): Promise<any[]> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const constraints = await db
        .select()
        .from(userConstraintSchema)
        .where(and(
          eq(userConstraintSchema.userId, userId),
          eq(userConstraintSchema.isActive, true),
        ))
        .orderBy(desc(userConstraintSchema.severity), desc(userConstraintSchema.createdAt));

      logger.debug('Active constraints retrieved', {
        userId,
        constraintCount: constraints.length,
      });

      return constraints;
    } catch (error) {
      logger.error('Failed to retrieve active constraints', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Calculate profile completeness percentage
   */
  private static calculateProfileCompleteness(profile: any): number {
    const fields = [
      'fitnessLevel',
      'experienceYears',
      'timezone',
      'dateOfBirth',
      'height',
      'weight',
      'activityLevel',
    ];

    const completedFields = fields.filter((field) => {
      const value = profile[field];
      return value !== null && value !== undefined && value !== '';
    });

    return Math.round((completedFields.length / fields.length) * 100);
  }

  /**
   * Check if updates contain fields relevant to completeness calculation
   */
  private static hasCompletenessRelevantFields(updates: any): boolean {
    const relevantFields = [
      'fitnessLevel',
      'experienceYears',
      'timezone',
      'dateOfBirth',
      'height',
      'weight',
      'activityLevel',
    ];

    return relevantFields.some(field => updates.hasOwnProperty(field));
  }

  /**
   * Get profile statistics for a user
   */
  static async getProfileStats(userId: string): Promise<{
    profileCompleteness: number;
    activeGoalsCount: number;
    activeConstraintsCount: number;
    hasPreferences: boolean;
  }> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const [profile, activeGoals, activeConstraints, preferences] = await Promise.all([
        this.getProfile(userId, false),
        this.getFitnessGoals(userId, { status: 'active' }),
        this.getActiveConstraints(userId),
        this.getPreferences(userId),
      ]);

      return {
        profileCompleteness: profile?.profileCompleteness || 0,
        activeGoalsCount: activeGoals.length,
        activeConstraintsCount: activeConstraints.length,
        hasPreferences: !!preferences,
      };
    } catch (error) {
      logger.error('Failed to get profile statistics', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
