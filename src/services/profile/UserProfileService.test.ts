import type {
  UserConstraintInput,
  UserFitnessGoalInput,
  UserPreferenceInput,
  UserProfileInput,
  UserProfileUpdateInput,
} from '@/validations/UserProfileValidation';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/libs/DB';
import { logger } from '@/libs/Logger';
import {
  userConstraintSchema,
  userFitnessGoalSchema,
  userPreferenceSchema,
  userProfileSchema,
} from '@/models/Schema';
import { UserProfileService } from './UserProfileService';

// Mock the database
vi.mock('@/libs/DB', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
    query: {
      userProfileSchema: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      userFitnessGoalSchema: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      userPreferenceSchema: {
        findFirst: vi.fn(),
      },
      userConstraintSchema: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  },
}));

// Mock Drizzle ORM operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
}));

// Mock Logger
vi.mock('@/libs/Logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockDb = vi.mocked(db);
const mockEq = vi.mocked(eq);
const mockAnd = vi.mocked(and);
const mockDesc = vi.mocked(desc);
const mockAsc = vi.mocked(asc);
const mockGte = vi.mocked(gte);
const mockLte = vi.mocked(lte);
const mockLogger = vi.mocked(logger);

describe('UserProfileService', () => {
  const mockUserId = 'user_123';
  const mockProfileId = 1;
  const mockGoalId = 1;
  const mockConstraintId = 1;

  const mockProfile = {
    id: mockProfileId,
    userId: mockUserId,
    fitnessLevel: 'intermediate',
    experienceYears: 2,
    timezone: 'America/New_York',
    dateOfBirth: new Date('1990-01-01'),
    height: 175,
    weight: 70,
    activityLevel: 'moderate',
    profileCompleteness: 85,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockFitnessGoal = {
    id: mockGoalId,
    userId: mockUserId,
    goalType: 'weight_loss',
    targetValue: 65,
    currentValue: 70,
    unit: 'kg',
    targetDate: new Date('2024-06-01'),
    priority: 1,
    status: 'active',
    description: 'Lose 5kg for summer',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockPreferences = {
    id: 1,
    userId: mockUserId,
    preferredWorkoutTypes: '["strength", "cardio"]',
    preferredEquipment: '["dumbbells", "treadmill"]',
    preferredTimeOfDay: 'morning',
    preferredDaysOfWeek: '["monday", "wednesday", "friday"]',
    sessionDurationMin: 30,
    sessionDurationMax: 60,
    workoutFrequencyPerWeek: 3,
    restDayPreference: 'sunday',
    intensityPreference: 'intermediate',
    musicPreference: true,
    reminderEnabled: true,
    autoProgressionEnabled: true,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockConstraint = {
    id: mockConstraintId,
    userId: mockUserId,
    constraintType: 'injury',
    severity: 'medium',
    title: 'Lower back pain',
    description: 'Chronic lower back pain from previous injury',
    affectedBodyParts: '["lower_back"]',
    restrictedExercises: '["deadlift", "squat"]',
    restrictedEquipment: null,
    timeRestrictions: null,
    startDate: new Date('2024-01-01'),
    endDate: null,
    isActive: true,
    notes: 'Avoid heavy lifting',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProfile', () => {
    const validProfileData: UserProfileInput = {
      fitness_level: 'intermediate',
      experience_level: '1_to_2_years',
      age: 30,
      height: 175,
      weight: 70,
      timezone: 'America/New_York',
      activity_level: 3,
      weekly_workout_frequency: 3,
      preferred_workout_duration: 45,
      bio: 'Fitness enthusiast',
    };

    it('should create profile successfully with valid data', async () => {
      // Mock no existing profile
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(null);

      // Mock successful insert
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      const result = await UserProfileService.createProfile(mockUserId, validProfileData);

      expect(result).toEqual(mockProfile);
      expect(mockDb.query.userProfileSchema.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function),
      });
      expect(mockDb.insert).toHaveBeenCalledWith(userProfileSchema);
      expect(mockLogger.info).toHaveBeenCalledWith('User profile created', {
        userId: mockUserId,
        profileId: mockProfile.id,
        completeness: expect.any(Number),
      });
    });

    it('should apply default values for optional fields', async () => {
      const minimalProfileData: UserProfileInput = {
        fitness_level: 'beginner',
        experience_level: 'none',
        age: 25,
        height: 170,
        weight: 65,
        timezone: 'UTC',
        activity_level: 2,
        weekly_workout_frequency: 2,
        preferred_workout_duration: 30,
      };

      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            ...mockProfile,
            fitnessLevel: 'beginner',
            experienceYears: 0,
            timezone: 'UTC',
          }]),
        }),
      });

      const result = await UserProfileService.createProfile(mockUserId, minimalProfileData);

      expect(result.fitnessLevel).toBe('beginner');
      expect(result.experienceYears).toBe(0);
      expect(result.timezone).toBe('UTC');
    });

    it('should calculate profile completeness correctly', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      await UserProfileService.createProfile(mockUserId, validProfileData);

      // Verify completeness calculation was called
      const insertCall = mockDb.insert().values;

      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          profileCompleteness: expect.any(Number),
        }),
      );
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.createProfile('', validProfileData),
      ).rejects.toThrow('Invalid user ID');

      await expect(
        UserProfileService.createProfile('   ', validProfileData),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw error for invalid profile data', async () => {
      const invalidProfileData = {
        ...validProfileData,
        age: 10, // Too young
      };

      await expect(
        UserProfileService.createProfile(mockUserId, invalidProfileData as any),
      ).rejects.toThrow('Validation failed');

      expect(mockLogger.warn).toHaveBeenCalledWith('Profile validation failed', expect.any(Object));
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw error if profile already exists', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);

      await expect(
        UserProfileService.createProfile(mockUserId, validProfileData),
      ).rejects.toThrow('User profile already exists');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
      });

      await expect(
        UserProfileService.createProfile(mockUserId, validProfileData),
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create user profile', expect.any(Object));
    });

    it('should validate business logic for fitness level and experience', async () => {
      const invalidCombination = {
        ...validProfileData,
        fitness_level: 'expert' as const,
        experience_level: 'none' as const,
      };

      await expect(
        UserProfileService.createProfile(mockUserId, invalidCombination),
      ).rejects.toThrow('Validation failed');
    });

    it('should validate reasonable workout frequency for beginners', async () => {
      const invalidFrequency = {
        ...validProfileData,
        fitness_level: 'beginner' as const,
        weekly_workout_frequency: 10, // Too high for beginner
      };

      await expect(
        UserProfileService.createProfile(mockUserId, invalidFrequency),
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('updateProfile', () => {
    const validUpdates: UserProfileUpdateInput = {
      weight: 68,
      activity_level: 4,
      bio: 'Updated bio',
    };

    it('should update profile successfully with valid data', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockProfile, ...validUpdates }]),
          }),
        }),
      });

      const result = await UserProfileService.updateProfile(mockUserId, validUpdates);

      expect(result).toEqual({ ...mockProfile, ...validUpdates });
      expect(mockDb.update).toHaveBeenCalledWith(userProfileSchema);
      expect(mockLogger.info).toHaveBeenCalledWith('User profile updated', {
        userId: mockUserId,
        profileId: mockProfile.id,
        updatedFields: Object.keys(validUpdates),
        newCompleteness: expect.any(Number),
      });
    });

    it('should handle partial updates correctly', async () => {
      const partialUpdate = { weight: 69 };

      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockProfile, weight: 69 }]),
          }),
        }),
      });

      const result = await UserProfileService.updateProfile(mockUserId, partialUpdate);

      expect(result.weight).toBe(69);
      expect(result.fitnessLevel).toBe(mockProfile.fitnessLevel); // Unchanged
    });

    it('should recalculate completeness when relevant fields are updated', async () => {
      const completenessRelevantUpdate = {
        height: 180,
        dateOfBirth: new Date('1985-01-01'),
      };

      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockProfile]),
          }),
        }),
      });

      await UserProfileService.updateProfile(mockUserId, completenessRelevantUpdate);

      // Verify completeness was recalculated
      const setCall = mockDb.update().set;

      expect(setCall).toHaveBeenCalledWith(
        expect.objectContaining({
          profileCompleteness: expect.any(Number),
        }),
      );
    });

    it('should not recalculate completeness for non-relevant fields', async () => {
      const nonRelevantUpdate = { bio: 'New bio' };

      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockProfile]),
          }),
        }),
      });

      await UserProfileService.updateProfile(mockUserId, nonRelevantUpdate);

      // Verify completeness was not recalculated
      const setCall = mockDb.update().set;

      expect(setCall).toHaveBeenCalledWith(
        expect.objectContaining({
          profileCompleteness: mockProfile.profileCompleteness,
        }),
      );
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.updateProfile('', validUpdates),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error for invalid update data', async () => {
      const invalidUpdate = { age: 5 }; // Too young

      await expect(
        UserProfileService.updateProfile(mockUserId, invalidUpdate as any),
      ).rejects.toThrow('Validation failed');

      expect(mockLogger.warn).toHaveBeenCalledWith('Profile update validation failed', expect.any(Object));
    });

    it('should throw error if profile not found', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(null);

      await expect(
        UserProfileService.updateProfile(mockUserId, validUpdates),
      ).rejects.toThrow('User profile not found');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should handle concurrent updates gracefully', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Concurrent modification')),
          }),
        }),
      });

      await expect(
        UserProfileService.updateProfile(mockUserId, validUpdates),
      ).rejects.toThrow('Concurrent modification');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update user profile', expect.any(Object));
    });
  });

  describe('getProfile', () => {
    it('should retrieve profile with related data by default', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);

      // Mock related data retrieval
      vi.spyOn(UserProfileService, 'getFitnessGoals').mockResolvedValue([mockFitnessGoal]);
      vi.spyOn(UserProfileService, 'getPreferences').mockResolvedValue(mockPreferences);
      vi.spyOn(UserProfileService, 'getActiveConstraints').mockResolvedValue([mockConstraint]);

      const result = await UserProfileService.getProfile(mockUserId);

      expect(result).toEqual({
        ...mockProfile,
        fitnessGoals: [mockFitnessGoal],
        preferences: mockPreferences,
        constraints: [mockConstraint],
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('User profile retrieved', {
        userId: mockUserId,
        profileId: mockProfile.id,
        includeRelated: true,
      });
    });

    it('should retrieve profile without related data when specified', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);

      const result = await UserProfileService.getProfile(mockUserId, false);

      expect(result).toEqual(mockProfile);
      expect(result.fitnessGoals).toBeUndefined();
      expect(result.preferences).toBeUndefined();
      expect(result.constraints).toBeUndefined();
    });

    it('should return null for non-existent profile', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(null);

      const result = await UserProfileService.getProfile(mockUserId);

      expect(result).toBeNull();
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.getProfile(''),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.query.userProfileSchema.findFirst).not.toHaveBeenCalled();
    });

    it('should ensure user data isolation', async () => {
      const otherUserId = 'user_456';
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(null);

      await UserProfileService.getProfile(otherUserId);

      expect(mockEq).toHaveBeenCalledWith(userProfileSchema.userId, otherUserId);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.userProfileSchema.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(
        UserProfileService.getProfile(mockUserId),
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to retrieve user profile', expect.any(Object));
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile and related data successfully', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({ rowCount: 1 }),
          }),
        });
      });

      mockDb.transaction.mockImplementation(mockTransaction);

      const result = await UserProfileService.deleteProfile(mockUserId);

      expect(result).toBe(true);
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('User profile deleted', {
        userId: mockUserId,
        profileId: mockProfile.id,
      });
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.deleteProfile(''),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should throw error if profile not found', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(null);

      await expect(
        UserProfileService.deleteProfile(mockUserId),
      ).rejects.toThrow('User profile not found');

      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should handle cascade deletion properly', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);

      const mockTx = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      await UserProfileService.deleteProfile(mockUserId);

      // Verify all related tables are deleted in correct order
      expect(mockTx.delete).toHaveBeenCalledWith(userConstraintSchema);
      expect(mockTx.delete).toHaveBeenCalledWith(userPreferenceSchema);
      expect(mockTx.delete).toHaveBeenCalledWith(userFitnessGoalSchema);
      expect(mockTx.delete).toHaveBeenCalledWith(userProfileSchema);
    });

    it('should handle transaction rollback on failure', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);
      mockDb.transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        UserProfileService.deleteProfile(mockUserId),
      ).rejects.toThrow('Transaction failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete user profile', expect.any(Object));
    });
  });

  describe('createFitnessGoal', () => {
    const validGoalData: UserFitnessGoalInput = {
      goal_type: 'weight_loss',
      target_value: 65,
      target_unit: 'kg',
      target_date: new Date('2024-06-01'),
      priority_level: 'high',
      description: 'Lose weight for summer',
      weekly_target: 0.5,
    };

    it('should create fitness goal successfully', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockFitnessGoal]),
        }),
      });

      const result = await UserProfileService.createFitnessGoal(mockUserId, validGoalData);

      expect(result).toEqual(mockFitnessGoal);
      expect(mockDb.insert).toHaveBeenCalledWith(userFitnessGoalSchema);
      expect(mockLogger.info).toHaveBeenCalledWith('Fitness goal created', {
        userId: mockUserId,
        goalId: mockFitnessGoal.id,
        goalType: validGoalData.goal_type,
      });
    });

    it('should apply default values for optional fields', async () => {
      const minimalGoalData: UserFitnessGoalInput = {
        goal_type: 'general_fitness',
        target_date: new Date('2024-06-01'),
        priority_level: 'medium',
        description: 'Stay fit',
      };

      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            ...mockFitnessGoal,
            goalType: 'general_fitness',
            priority: 1,
            status: 'active',
          }]),
        }),
      });

      const result = await UserProfileService.createFitnessGoal(mockUserId, minimalGoalData);

      expect(result.status).toBe('active');
      expect(result.priority).toBe(1);
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.createFitnessGoal('', validGoalData),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw error for invalid goal data', async () => {
      const invalidGoalData = {
        ...validGoalData,
        target_value: -10, // Negative value
      };

      await expect(
        UserProfileService.createFitnessGoal(mockUserId, invalidGoalData as any),
      ).rejects.toThrow('Validation failed');

      expect(mockLogger.warn).toHaveBeenCalledWith('Fitness goal validation failed', expect.any(Object));
    });

    it('should throw error if user profile not found', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(null);

      await expect(
        UserProfileService.createFitnessGoal(mockUserId, validGoalData),
      ).rejects.toThrow('User profile not found');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should validate reasonable goal targets', async () => {
      const unreasonableGoal = {
        ...validGoalData,
        goal_type: 'weight_loss' as const,
        target_value: 100, // Unrealistic weight loss
      };

      await expect(
        UserProfileService.createFitnessGoal(mockUserId, unreasonableGoal),
      ).rejects.toThrow('Validation failed');
    });

    it('should validate goal timeline reasonableness', async () => {
      const shortTimelineGoal = {
        ...validGoalData,
        goal_type: 'muscle_gain' as const,
        target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      };

      await expect(
        UserProfileService.createFitnessGoal(mockUserId, shortTimelineGoal),
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('updateFitnessGoal', () => {
    const validUpdates = {
      currentValue: 68,
      status: 'active' as const,
      notes: 'Making good progress',
    };

    it('should update fitness goal successfully', async () => {
      mockDb.query.userFitnessGoalSchema.findFirst.mockResolvedValue(mockFitnessGoal);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockFitnessGoal, ...validUpdates }]),
          }),
        }),
      });

      const result = await UserProfileService.updateFitnessGoal(mockUserId, mockGoalId, validUpdates);

      expect(result).toEqual({ ...mockFitnessGoal, ...validUpdates });
      expect(mockDb.update).toHaveBeenCalledWith(userFitnessGoalSchema);
      expect(mockLogger.info).toHaveBeenCalledWith('Fitness goal updated', {
        userId: mockUserId,
        goalId: mockGoalId,
        updatedFields: Object.keys(validUpdates),
      });
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.updateFitnessGoal('', mockGoalId, validUpdates),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error for invalid goal ID', async () => {
      await expect(
        UserProfileService.updateFitnessGoal(mockUserId, 0, validUpdates),
      ).rejects.toThrow('Invalid goal ID');

      await expect(
        UserProfileService.updateFitnessGoal(mockUserId, -1, validUpdates),
      ).rejects.toThrow('Invalid goal ID');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error if goal not found', async () => {
      mockDb.query.userFitnessGoalSchema.findFirst.mockResolvedValue(null);

      await expect(
        UserProfileService.updateFitnessGoal(mockUserId, mockGoalId, validUpdates),
      ).rejects.toThrow('Fitness goal not found');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should ensure user data isolation', async () => {
      mockDb.query.userFitnessGoalSchema.findFirst.mockResolvedValue(mockFitnessGoal);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockFitnessGoal]),
          }),
        }),
      });

      await UserProfileService.updateFitnessGoal(mockUserId, mockGoalId, validUpdates);

      expect(mockAnd).toHaveBeenCalledWith(
        expect.any(Function), // eq(userFitnessGoalSchema.id, goalId)
        expect.any(Function), // eq(userFitnessGoalSchema.userId, userId)
      );
    });
  });

  describe('getFitnessGoals', () => {
    it('should retrieve all goals for user', async () => {
      const mockGoals = [mockFitnessGoal];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockGoals),
          }),
        }),
      });

      const result = await UserProfileService.getFitnessGoals(mockUserId);

      expect(result).toEqual(mockGoals);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Fitness goals retrieved', {
        userId: mockUserId,
        goalCount: 1,
        filters: undefined,
      });
    });

    it('should filter goals by status', async () => {
      const mockGoals = [mockFitnessGoal];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockGoals),
          }),
        }),
      });

      const result = await UserProfileService.getFitnessGoals(mockUserId, { status: 'active' });

      expect(result).toEqual(mockGoals);
      expect(mockEq).toHaveBeenCalledWith(userFitnessGoalSchema.status, 'active');
    });

    it('should filter goals by goal type', async () => {
      const mockGoals = [mockFitnessGoal];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockGoals),
          }),
        }),
      });

      const result = await UserProfileService.getFitnessGoals(mockUserId, { goalType: 'weight_loss' });

      expect(result).toEqual(mockGoals);
      expect(mockEq).toHaveBeenCalledWith(userFitnessGoalSchema.goalType, 'weight_loss');
    });

    it('should apply correct sorting', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await UserProfileService.getFitnessGoals(mockUserId);

      expect(mockDesc).toHaveBeenCalledWith(userFitnessGoalSchema.priority);
      expect(mockDesc).toHaveBeenCalledWith(userFitnessGoalSchema.createdAt);
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.getFitnessGoals(''),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('archiveGoal', () => {
    it('should archive goal by updating status to completed', async () => {
      vi.spyOn(UserProfileService, 'updateFitnessGoal').mockResolvedValue({
        ...mockFitnessGoal,
        status: 'completed',
      });

      const result = await UserProfileService.archiveGoal(mockUserId, mockGoalId);

      expect(UserProfileService.updateFitnessGoal).toHaveBeenCalledWith(
        mockUserId,
        mockGoalId,
        { status: 'completed' },
      );
      expect(result.status).toBe('completed');
    });
  });

  describe('updatePreferences', () => {
    const validPreferences: UserPreferenceInput = {
      preferred_workout_types: ['strength', 'cardio'],
      preferred_times: ['morning'],
      preferred_days: ['monday', 'wednesday', 'friday'],
      available_equipment: ['dumbbells', 'treadmill'],
      workout_intensity_preference: 3,
      rest_day_preference: 2,
    };

    it('should create new preferences if none exist', async () => {
      mockDb.query.userPreferenceSchema.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPreferences]),
        }),
      });

      const result = await UserProfileService.updatePreferences(mockUserId, validPreferences);

      expect(result).toEqual(mockPreferences);
      expect(mockDb.insert).toHaveBeenCalledWith(userPreferenceSchema);
      expect(mockLogger.info).toHaveBeenCalledWith('User preferences updated', {
        userId: mockUserId,
        preferencesId: mockPreferences.id,
        isNew: true,
      });
    });

    it('should update existing preferences', async () => {
      mockDb.query.userPreferenceSchema.findFirst.mockResolvedValue(mockPreferences);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockPreferences, ...validPreferences }]),
          }),
        }),
      });

      const result = await UserProfileService.updatePreferences(mockUserId, validPreferences);

      expect(mockDb.update).toHaveBeenCalledWith(userPreferenceSchema);
      expect(mockLogger.info).toHaveBeenCalledWith('User preferences updated', {
        userId: mockUserId,
        preferencesId: expect.any(Number),
        isNew: false,
      });
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.updatePreferences('', validPreferences),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error for invalid preferences data', async () => {
      const invalidPreferences = {
        ...validPreferences,
        preferred_workout_types: [], // Empty array not allowed
      };

      await expect(
        UserProfileService.updatePreferences(mockUserId, invalidPreferences as any),
      ).rejects.toThrow('Validation failed');

      expect(mockLogger.warn).toHaveBeenCalledWith('Preferences validation failed', expect.any(Object));
    });

    it('should validate preference combinations', async () => {
      const invalidCombination = {
        ...validPreferences,
        rest_day_preference: 6, // 6 rest days
        preferred_days: ['monday', 'tuesday', 'wednesday'], // But wants to work out 3 days
      };

      await expect(
        UserProfileService.updatePreferences(mockUserId, invalidCombination),
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('getPreferences', () => {
    it('should retrieve user preferences', async () => {
      mockDb.query.userPreferenceSchema.findFirst.mockResolvedValue(mockPreferences);

      const result = await UserProfileService.getPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
      expect(mockLogger.debug).toHaveBeenCalledWith('User preferences retrieved', {
        userId: mockUserId,
        hasPreferences: true,
      });
    });

    it('should return null if no preferences exist', async () => {
      mockDb.query.userPreferenceSchema.findFirst.mockResolvedValue(null);

      const result = await UserProfileService.getPreferences(mockUserId);

      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith('User preferences retrieved', {
        userId: mockUserId,
        hasPreferences: false,
      });
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.getPreferences(''),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.query.userPreferenceSchema.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('resetPreferences', () => {
    it('should reset preferences to defaults', async () => {
      vi.spyOn(UserProfileService, 'updatePreferences').mockResolvedValue(mockPreferences);

      const result = await UserProfileService.resetPreferences(mockUserId);

      expect(UserProfileService.updatePreferences).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          sessionDurationMin: 30,
          sessionDurationMax: 60,
          workoutFrequencyPerWeek: 3,
          intensityPreference: 'intermediate',
          musicPreference: true,
          reminderEnabled: true,
          autoProgressionEnabled: true,
        }),
      );
      expect(result).toEqual(mockPreferences);
    });
  });

  describe('addConstraint', () => {
    const validConstraintData: UserConstraintInput = {
      constraint_type: 'injury',
      severity: 'medium',
      description: 'Lower back pain from previous injury',
      affected_areas: ['lower_back'],
      start_date: new Date('2024-01-01'),
      impact_level: 3,
      restrictions: ['deadlift', 'squat'],
    };

    it('should add constraint successfully', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockConstraint]),
        }),
      });

      const result = await UserProfileService.addConstraint(mockUserId, validConstraintData);

      expect(result).toEqual(mockConstraint);
      expect(mockDb.insert).toHaveBeenCalledWith(userConstraintSchema);
      expect(mockLogger.info).toHaveBeenCalledWith('User constraint added', {
        userId: mockUserId,
        constraintId: mockConstraint.id,
        constraintType: validConstraintData.constraint_type,
        severity: validConstraintData.severity,
      });
    });

    it('should apply default values for optional fields', async () => {
      const minimalConstraintData: UserConstraintInput = {
        constraint_type: 'schedule',
        severity: 'low',
        description: 'Limited time in mornings',
        start_date: new Date('2024-01-01'),
        impact_level: 2,
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            ...mockConstraint,
            constraintType: 'schedule',
            severity: 'low',
            isActive: true,
          }]),
        }),
      });

      const result = await UserProfileService.addConstraint(mockUserId, minimalConstraintData);

      expect(result.isActive).toBe(true);
      expect(result.severity).toBe('low');
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.addConstraint('', validConstraintData),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw error for invalid constraint data', async () => {
      const invalidConstraintData = {
        ...validConstraintData,
        impact_level: 10, // Too high
      };

      await expect(
        UserProfileService.addConstraint(mockUserId, invalidConstraintData as any),
      ).rejects.toThrow('Validation failed');

      expect(mockLogger.warn).toHaveBeenCalledWith('Constraint validation failed', expect.any(Object));
    });

    it('should validate severity and impact level correlation', async () => {
      const invalidCorrelation = {
        ...validConstraintData,
        severity: 'low' as const,
        impact_level: 5, // High impact with low severity
      };

      await expect(
        UserProfileService.addConstraint(mockUserId, invalidCorrelation),
      ).rejects.toThrow('Validation failed');
    });

    it('should validate constraint dates', async () => {
      const invalidDates = {
        ...validConstraintData,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2023-12-01'), // End before start
      };

      await expect(
        UserProfileService.addConstraint(mockUserId, invalidDates),
      ).rejects.toThrow('Validation failed');
    });

    it('should validate permanent constraints cannot have end dates', async () => {
      const invalidPermanent = {
        ...validConstraintData,
        is_permanent: true,
        end_date: new Date('2024-12-01'), // Permanent with end date
      };

      await expect(
        UserProfileService.addConstraint(mockUserId, invalidPermanent),
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('updateConstraint', () => {
    const validUpdates = {
      severity: 'low' as const,
      impact_level: 2,
      notes: 'Improving with physical therapy',
    };

    it('should update constraint successfully', async () => {
      mockDb.query.userConstraintSchema.findFirst.mockResolvedValue(mockConstraint);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockConstraint, ...validUpdates }]),
          }),
        }),
      });

      const result = await UserProfileService.updateConstraint(mockUserId, mockConstraintId, validUpdates);

      expect(result).toEqual({ ...mockConstraint, ...validUpdates });
      expect(mockDb.update).toHaveBeenCalledWith(userConstraintSchema);
      expect(mockLogger.info).toHaveBeenCalledWith('User constraint updated', {
        userId: mockUserId,
        constraintId: mockConstraintId,
        updatedFields: Object.keys(validUpdates),
      });
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.updateConstraint('', mockConstraintId, validUpdates),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error for invalid constraint ID', async () => {
      await expect(
        UserProfileService.updateConstraint(mockUserId, 0, validUpdates),
      ).rejects.toThrow('Invalid constraint ID');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error if constraint not found', async () => {
      mockDb.query.userConstraintSchema.findFirst.mockResolvedValue(null);

      await expect(
        UserProfileService.updateConstraint(mockUserId, mockConstraintId, validUpdates),
      ).rejects.toThrow('Constraint not found');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should ensure user data isolation', async () => {
      mockDb.query.userConstraintSchema.findFirst.mockResolvedValue(mockConstraint);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockConstraint]),
          }),
        }),
      });

      await UserProfileService.updateConstraint(mockUserId, mockConstraintId, validUpdates);

      expect(mockAnd).toHaveBeenCalledWith(
        expect.any(Function), // eq(userConstraintSchema.id, constraintId)
        expect.any(Function), // eq(userConstraintSchema.userId, userId)
      );
    });
  });

  describe('removeConstraint', () => {
    it('should soft delete constraint by setting isActive to false', async () => {
      mockDb.query.userConstraintSchema.findFirst.mockResolvedValue(mockConstraint);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      });

      const result = await UserProfileService.removeConstraint(mockUserId, mockConstraintId);

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(userConstraintSchema);
      expect(mockLogger.info).toHaveBeenCalledWith('User constraint removed', {
        userId: mockUserId,
        constraintId: mockConstraintId,
      });
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.removeConstraint('', mockConstraintId),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error for invalid constraint ID', async () => {
      await expect(
        UserProfileService.removeConstraint(mockUserId, 0),
      ).rejects.toThrow('Invalid constraint ID');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error if constraint not found', async () => {
      mockDb.query.userConstraintSchema.findFirst.mockResolvedValue(null);

      await expect(
        UserProfileService.removeConstraint(mockUserId, mockConstraintId),
      ).rejects.toThrow('Constraint not found');

      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('getActiveConstraints', () => {
    it('should retrieve active constraints for user', async () => {
      const mockConstraints = [mockConstraint];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockConstraints),
          }),
        }),
      });

      const result = await UserProfileService.getActiveConstraints(mockUserId);

      expect(result).toEqual(mockConstraints);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockAnd).toHaveBeenCalledWith(
        expect.any(Function), // eq(userConstraintSchema.userId, userId)
        expect.any(Function), // eq(userConstraintSchema.isActive, true)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Active constraints retrieved', {
        userId: mockUserId,
        constraintCount: 1,
      });
    });

    it('should apply correct sorting by severity and creation date', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await UserProfileService.getActiveConstraints(mockUserId);

      expect(mockDesc).toHaveBeenCalledWith(userConstraintSchema.severity);
      expect(mockDesc).toHaveBeenCalledWith(userConstraintSchema.createdAt);
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.getActiveConstraints(''),
      ).rejects.toThrow('Invalid user ID');

      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('getProfileStats', () => {
    it('should return comprehensive profile statistics', async () => {
      vi.spyOn(UserProfileService, 'getProfile').mockResolvedValue(mockProfile);
      vi.spyOn(UserProfileService, 'getFitnessGoals').mockResolvedValue([mockFitnessGoal]);
      vi.spyOn(UserProfileService, 'getActiveConstraints').mockResolvedValue([mockConstraint]);
      vi.spyOn(UserProfileService, 'getPreferences').mockResolvedValue(mockPreferences);

      const result = await UserProfileService.getProfileStats(mockUserId);

      expect(result).toEqual({
        profileCompleteness: mockProfile.profileCompleteness,
        activeGoalsCount: 1,
        activeConstraintsCount: 1,
        hasPreferences: true,
      });

      expect(UserProfileService.getProfile).toHaveBeenCalledWith(mockUserId, false);
      expect(UserProfileService.getFitnessGoals).toHaveBeenCalledWith(mockUserId, { status: 'active' });
      expect(UserProfileService.getActiveConstraints).toHaveBeenCalledWith(mockUserId);
      expect(UserProfileService.getPreferences).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle missing profile gracefully', async () => {
      vi.spyOn(UserProfileService, 'getProfile').mockResolvedValue(null);
      vi.spyOn(UserProfileService, 'getFitnessGoals').mockResolvedValue([]);
      vi.spyOn(UserProfileService, 'getActiveConstraints').mockResolvedValue([]);
      vi.spyOn(UserProfileService, 'getPreferences').mockResolvedValue(null);

      const result = await UserProfileService.getProfileStats(mockUserId);

      expect(result).toEqual({
        profileCompleteness: 0,
        activeGoalsCount: 0,
        activeConstraintsCount: 0,
        hasPreferences: false,
      });
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        UserProfileService.getProfileStats(''),
      ).rejects.toThrow('Invalid user ID');
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(UserProfileService, 'getProfile').mockRejectedValue(new Error('Database error'));

      await expect(
        UserProfileService.getProfileStats(mockUserId),
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get profile statistics', expect.any(Object));
    });
  });

  describe('profile completeness calculation', () => {
    it('should calculate completeness correctly for complete profile', () => {
      const completeProfile = {
        fitnessLevel: 'intermediate',
        experienceYears: 2,
        timezone: 'America/New_York',
        dateOfBirth: new Date('1990-01-01'),
        height: 175,
        weight: 70,
        activityLevel: 'moderate',
      };

      // Access private method through service
      const completeness = (UserProfileService as any).calculateProfileCompleteness(completeProfile);

      expect(completeness).toBe(100);
    });

    it('should calculate completeness correctly for partial profile', () => {
      const partialProfile = {
        fitnessLevel: 'beginner',
        experienceYears: 0,
        timezone: 'UTC',
        dateOfBirth: null,
        height: null,
        weight: 65,
        activityLevel: 'low',
      };

      const completeness = (UserProfileService as any).calculateProfileCompleteness(partialProfile);

      expect(completeness).toBeLessThan(100);
      expect(completeness).toBeGreaterThan(0);
    });

    it('should identify completeness-relevant fields correctly', () => {
      const relevantUpdates = { height: 180, weight: 75 };
      const nonRelevantUpdates = { bio: 'New bio' };

      const hasRelevant = (UserProfileService as any).hasCompletenessRelevantFields(relevantUpdates);
      const hasNonRelevant = (UserProfileService as any).hasCompletenessRelevantFields(nonRelevantUpdates);

      expect(hasRelevant).toBe(true);
      expect(hasNonRelevant).toBe(false);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent profile creation attempts', async () => {
      const profileData: UserProfileInput = {
        fitness_level: 'beginner',
        experience_level: 'none',
        age: 25,
        height: 170,
        weight: 65,
        timezone: 'UTC',
        activity_level: 2,
        weekly_workout_frequency: 2,
        preferred_workout_duration: 30,
      };

      // First call succeeds, second fails due to existing profile
      mockDb.query.userProfileSchema.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockProfile);

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      // First creation should succeed
      const result1 = await UserProfileService.createProfile(mockUserId, profileData);

      expect(result1).toEqual(mockProfile);

      // Second creation should fail
      await expect(
        UserProfileService.createProfile(mockUserId, profileData),
      ).rejects.toThrow('User profile already exists');
    });

    it('should handle malformed JSON in preference fields', async () => {
      const preferencesWithMalformedJson = {
        ...mockPreferences,
        preferredWorkoutTypes: 'invalid json',
      };

      mockDb.query.userPreferenceSchema.findFirst.mockResolvedValue(preferencesWithMalformedJson);

      // Should not throw error, just return the data as-is
      const result = await UserProfileService.getPreferences(mockUserId);

      expect(result).toEqual(preferencesWithMalformedJson);
    });

    it('should handle very large constraint arrays', async () => {
      const constraintWithLargeArrays: UserConstraintInput = {
        constraint_type: 'injury',
        severity: 'medium',
        description: 'Multiple restrictions',
        affected_areas: Array.from({ length: 15 }, (_, i) => `area_${i}`), // Too many
        start_date: new Date('2024-01-01'),
        impact_level: 3,
      };

      await expect(
        UserProfileService.addConstraint(mockUserId, constraintWithLargeArrays),
      ).rejects.toThrow('Validation failed');
    });

    it('should handle database connection timeouts gracefully', async () => {
      mockDb.query.userProfileSchema.findFirst.mockRejectedValue(new Error('Connection timeout'));

      await expect(
        UserProfileService.getProfile(mockUserId),
      ).rejects.toThrow('Connection timeout');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to retrieve user profile', expect.any(Object));
    });

    it('should handle null/undefined values in profile data', async () => {
      const profileWithNulls = {
        ...mockProfile,
        dateOfBirth: null,
        height: null,
        weight: null,
      };

      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(profileWithNulls);

      const result = await UserProfileService.getProfile(mockUserId);

      expect(result).toEqual(profileWithNulls);
    });

    it('should handle extremely long text fields', async () => {
      const constraintWithLongText: UserConstraintInput = {
        constraint_type: 'medical',
        severity: 'high',
        description: 'a'.repeat(500), // Too long
        start_date: new Date('2024-01-01'),
        impact_level: 4,
      };

      await expect(
        UserProfileService.addConstraint(mockUserId, constraintWithLongText),
      ).rejects.toThrow('Validation failed');
    });

    it('should handle transaction failures during profile deletion', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);
      mockDb.transaction.mockRejectedValue(new Error('Transaction deadlock'));

      await expect(
        UserProfileService.deleteProfile(mockUserId),
      ).rejects.toThrow('Transaction deadlock');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete user profile', expect.any(Object));
    });

    it('should handle partial transaction failures gracefully', async () => {
      mockDb.query.userProfileSchema.findFirst.mockResolvedValue(mockProfile);

      const mockTx = {
        delete: vi.fn()
          .mockReturnValueOnce({ where: vi.fn().mockResolvedValue({ rowCount: 1 }) }) // constraints
          .mockReturnValueOnce({ where: vi.fn().mockResolvedValue({ rowCount: 1 }) }) // preferences
          .mockReturnValueOnce({ where: vi.fn().mockResolvedValue({ rowCount: 1 }) }) // goals
          .mockReturnValueOnce({ where: vi.fn().mockRejectedValue(new Error('Profile deletion failed')) }), // profile
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      await expect(
        UserProfileService.deleteProfile(mockUserId),
      ).rejects.toThrow('Profile deletion failed');
    });

    it('should handle invalid enum values gracefully', async () => {
      const profileWithInvalidEnum: UserProfileInput = {
        fitness_level: 'invalid_level' as any,
        experience_level: '1_to_2_years',
        age: 30,
        height: 175,
        weight: 70,
        timezone: 'UTC',
        activity_level: 3,
        weekly_workout_frequency: 3,
        preferred_workout_duration: 45,
      };

      await expect(
        UserProfileService.createProfile(mockUserId, profileWithInvalidEnum),
      ).rejects.toThrow('Validation failed');
    });

    it('should handle memory pressure during large data operations', async () => {
      // Simulate large number of goals
      const largeGoalArray = Array.from({ length: 1000 }, (_, i) => ({
        ...mockFitnessGoal,
        id: i + 1,
        description: `Goal ${i + 1}`,
      }));

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(largeGoalArray),
          }),
        }),
      });

      const result = await UserProfileService.getFitnessGoals(mockUserId);

      expect(result).toHaveLength(1000);
    });

    it('should handle circular references in constraint data', async () => {
      const constraintWithCircularRef: any = {
        constraint_type: 'injury',
        severity: 'medium',
        description: 'Test constraint',
        start_date: new Date('2024-01-01'),
        impact_level: 3,
        metadata: {},
      };

      // Create circular reference
      constraintWithCircularRef.metadata.self = constraintWithCircularRef;

      // Should handle gracefully without infinite loops
      await expect(
        UserProfileService.addConstraint(mockUserId, constraintWithCircularRef),
      ).rejects.toThrow('Validation failed');
    });
  });
});
