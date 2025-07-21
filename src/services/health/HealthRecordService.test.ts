import { and, desc, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/libs/DB';
import { healthRecordSchema } from '@/models/Schema';
import { HealthRecordService } from './HealthRecordService';

// Mock the database
vi.mock('@/libs/DB', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      healthRecordSchema: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      healthTypeSchema: {
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
  between: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockEq = vi.mocked(eq);
const mockAnd = vi.mocked(and);
const mockDesc = vi.mocked(desc);

describe('HealthRecordService', () => {
  const mockUserId = 'user_123';
  const mockHealthType = {
    id: 1,
    slug: 'weight',
    display_name: 'Weight',
    unit: 'kg',
    typical_range_low: 40,
    typical_range_high: 200,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockHealthRecord = {
    id: 1,
    user_id: mockUserId,
    type_id: 1,
    value: 70.5,
    unit: 'kg',
    recorded_at: new Date('2024-01-15T10:00:00Z'),
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createHealthRecord', () => {
    it('should create a new health record successfully', async () => {
      const newRecordData = {
        type_id: 1,
        value: 70.5,
        unit: 'kg',
        recorded_at: new Date('2024-01-15T10:00:00Z'),
      };

      // Mock health type validation
      mockDb.query.healthTypeSchema.findFirst.mockResolvedValue(mockHealthType);

      // Mock insert operation
      const mockInsertResult = { ...mockHealthRecord };
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockInsertResult]),
        }),
      });

      const result = await HealthRecordService.createHealthRecord(mockUserId, newRecordData);

      expect(result).toEqual(mockInsertResult);
      expect(mockDb.query.healthTypeSchema.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function),
      });
      expect(mockDb.insert).toHaveBeenCalledWith(healthRecordSchema);
    });

    it('should throw error when health type does not exist', async () => {
      const newRecordData = {
        type_id: 999,
        value: 70.5,
        unit: 'kg',
        recorded_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockDb.query.healthTypeSchema.findFirst.mockResolvedValue(null);

      await expect(
        HealthRecordService.createHealthRecord(mockUserId, newRecordData),
      ).rejects.toThrow('Health type not found');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw error when value is outside typical range', async () => {
      const newRecordData = {
        type_id: 1,
        value: 300, // Outside typical range
        unit: 'kg',
        recorded_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockDb.query.healthTypeSchema.findFirst.mockResolvedValue(mockHealthType);

      await expect(
        HealthRecordService.createHealthRecord(mockUserId, newRecordData),
      ).rejects.toThrow('Value outside typical range');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw error when recorded_at is in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const newRecordData = {
        type_id: 1,
        value: 70.5,
        unit: 'kg',
        recorded_at: futureDate,
      };

      mockDb.query.healthTypeSchema.findFirst.mockResolvedValue(mockHealthType);

      await expect(
        HealthRecordService.createHealthRecord(mockUserId, newRecordData),
      ).rejects.toThrow('Cannot record health data for future dates');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const newRecordData = {
        type_id: 1,
        value: 70.5,
        unit: 'kg',
        recorded_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockDb.query.healthTypeSchema.findFirst.mockResolvedValue(mockHealthType);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
      });

      await expect(
        HealthRecordService.createHealthRecord(mockUserId, newRecordData),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getHealthRecords', () => {
    it('should retrieve health records for a user', async () => {
      const mockRecords = [mockHealthRecord];

      mockDb.query.healthRecordSchema.findMany.mockResolvedValue(mockRecords);

      const result = await HealthRecordService.getHealthRecords(mockUserId);

      expect(result).toEqual(mockRecords);
      expect(mockDb.query.healthRecordSchema.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function),
        with: {
          healthType: true,
        },
      });
    });

    it('should filter records by type_id when provided', async () => {
      const mockRecords = [mockHealthRecord];
      const typeId = 1;

      mockDb.query.healthRecordSchema.findMany.mockResolvedValue(mockRecords);

      const result = await HealthRecordService.getHealthRecords(mockUserId, { type_id: typeId });

      expect(result).toEqual(mockRecords);
      expect(mockDb.query.healthRecordSchema.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function),
        with: {
          healthType: true,
        },
      });
    });

    it('should filter records by date range when provided', async () => {
      const mockRecords = [mockHealthRecord];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockDb.query.healthRecordSchema.findMany.mockResolvedValue(mockRecords);

      const result = await HealthRecordService.getHealthRecords(mockUserId, {
        start_date: startDate,
        end_date: endDate,
      });

      expect(result).toEqual(mockRecords);
      expect(mockDb.query.healthRecordSchema.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function),
        with: {
          healthType: true,
        },
      });
    });

    it('should apply pagination when limit and offset provided', async () => {
      const mockRecords = [mockHealthRecord];

      mockDb.query.healthRecordSchema.findMany.mockResolvedValue(mockRecords);

      const result = await HealthRecordService.getHealthRecords(mockUserId, {
        limit: 10,
        offset: 20,
      });

      expect(result).toEqual(mockRecords);
      expect(mockDb.query.healthRecordSchema.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function),
        limit: 10,
        offset: 20,
        with: {
          healthType: true,
        },
      });
    });

    it('should return empty array when no records found', async () => {
      mockDb.query.healthRecordSchema.findMany.mockResolvedValue([]);

      const result = await HealthRecordService.getHealthRecords(mockUserId);

      expect(result).toEqual([]);
    });

    it('should ensure user data isolation', async () => {
      const otherUserId = 'user_456';
      mockDb.query.healthRecordSchema.findMany.mockResolvedValue([]);

      await HealthRecordService.getHealthRecords(otherUserId);

      expect(mockDb.query.healthRecordSchema.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function),
        with: {
          healthType: true,
        },
      });
    });
  });

  describe('getHealthRecordById', () => {
    it('should retrieve a specific health record by id', async () => {
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);

      const result = await HealthRecordService.getHealthRecordById(mockUserId, 1);

      expect(result).toEqual(mockHealthRecord);
      expect(mockDb.query.healthRecordSchema.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function),
        with: {
          healthType: true,
        },
      });
    });

    it('should return null when record not found', async () => {
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(null);

      const result = await HealthRecordService.getHealthRecordById(mockUserId, 999);

      expect(result).toBeNull();
    });

    it('should ensure user can only access their own records', async () => {
      const otherUserId = 'user_456';
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(null);

      const result = await HealthRecordService.getHealthRecordById(otherUserId, 1);

      expect(result).toBeNull();
      expect(mockDb.query.healthRecordSchema.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function),
        with: {
          healthType: true,
        },
      });
    });
  });

  describe('updateHealthRecord', () => {
    it('should update an existing health record successfully', async () => {
      const updateData = {
        value: 72.0,
        unit: 'kg',
        recorded_at: new Date('2024-01-16T10:00:00Z'),
      };

      // Mock finding existing record
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);

      // Mock health type validation
      mockDb.query.healthTypeSchema.findFirst.mockResolvedValue(mockHealthType);

      // Mock update operation
      const updatedRecord = { ...mockHealthRecord, ...updateData };
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedRecord]),
          }),
        }),
      });

      const result = await HealthRecordService.updateHealthRecord(mockUserId, 1, updateData);

      expect(result).toEqual(updatedRecord);
      expect(mockDb.update).toHaveBeenCalledWith(healthRecordSchema);
    });

    it('should throw error when record not found', async () => {
      const updateData = { value: 72.0 };

      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(null);

      await expect(
        HealthRecordService.updateHealthRecord(mockUserId, 999, updateData),
      ).rejects.toThrow('Health record not found');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error when user tries to update another user\'s record', async () => {
      const updateData = { value: 72.0 };
      const otherUserRecord = { ...mockHealthRecord, user_id: 'user_456' };

      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(otherUserRecord);

      await expect(
        HealthRecordService.updateHealthRecord(mockUserId, 1, updateData),
      ).rejects.toThrow('Health record not found');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should validate updated value is within typical range', async () => {
      const updateData = { value: 300 }; // Outside typical range

      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);
      mockDb.query.healthTypeSchema.findFirst.mockResolvedValue(mockHealthType);

      await expect(
        HealthRecordService.updateHealthRecord(mockUserId, 1, updateData),
      ).rejects.toThrow('Value outside typical range');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should validate recorded_at is not in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const updateData = { recorded_at: futureDate };

      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);
      mockDb.query.healthTypeSchema.findFirst.mockResolvedValue(mockHealthType);

      await expect(
        HealthRecordService.updateHealthRecord(mockUserId, 1, updateData),
      ).rejects.toThrow('Cannot record health data for future dates');

      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteHealthRecord', () => {
    it('should delete a health record successfully', async () => {
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });

      const result = await HealthRecordService.deleteHealthRecord(mockUserId, 1);

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalledWith(healthRecordSchema);
    });

    it('should return false when record not found', async () => {
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(null);

      const result = await HealthRecordService.deleteHealthRecord(mockUserId, 999);

      expect(result).toBe(false);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('should ensure user can only delete their own records', async () => {
      const otherUserRecord = { ...mockHealthRecord, user_id: 'user_456' };
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(otherUserRecord);

      const result = await HealthRecordService.deleteHealthRecord(mockUserId, 1);

      expect(result).toBe(false);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('should handle database errors during deletion', async () => {
      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(
        HealthRecordService.deleteHealthRecord(mockUserId, 1),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getHealthRecordStats', () => {
    it('should calculate statistics for health records', async () => {
      const mockRecords = [
        { ...mockHealthRecord, value: 70.0 },
        { ...mockHealthRecord, id: 2, value: 72.0 },
        { ...mockHealthRecord, id: 3, value: 71.0 },
      ];

      mockDb.query.healthRecordSchema.findMany.mockResolvedValue(mockRecords);

      const result = await HealthRecordService.getHealthRecordStats(mockUserId, 1);

      expect(result).toEqual({
        count: 3,
        average: 71.0,
        min: 70.0,
        max: 72.0,
        latest: 71.0,
      });
    });

    it('should return null stats when no records found', async () => {
      mockDb.query.healthRecordSchema.findMany.mockResolvedValue([]);

      const result = await HealthRecordService.getHealthRecordStats(mockUserId, 1);

      expect(result).toEqual({
        count: 0,
        average: null,
        min: null,
        max: null,
        latest: null,
      });
    });

    it('should calculate stats for date range when provided', async () => {
      const mockRecords = [
        { ...mockHealthRecord, value: 70.0 },
        { ...mockHealthRecord, id: 2, value: 72.0 },
      ];

      mockDb.query.healthRecordSchema.findMany.mockResolvedValue(mockRecords);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await HealthRecordService.getHealthRecordStats(
        mockUserId,
        1,
        startDate,
        endDate,
      );

      expect(result).toEqual({
        count: 2,
        average: 71.0,
        min: 70.0,
        max: 72.0,
        latest: 72.0,
      });
    });
  });

  describe('getHealthRecordTrends', () => {
    it('should calculate trends for health records', async () => {
      const mockRecords = [
        { ...mockHealthRecord, value: 70.0, recorded_at: new Date('2024-01-01') },
        { ...mockHealthRecord, id: 2, value: 71.0, recorded_at: new Date('2024-01-02') },
        { ...mockHealthRecord, id: 3, value: 72.0, recorded_at: new Date('2024-01-03') },
      ];

      mockDb.query.healthRecordSchema.findMany.mockResolvedValue(mockRecords);

      const result = await HealthRecordService.getHealthRecordTrends(mockUserId, 1, 'daily');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: '2024-01-01',
        value: 70.0,
        count: 1,
      });
    });

    it('should aggregate by week when period is weekly', async () => {
      const mockRecords = [
        { ...mockHealthRecord, value: 70.0, recorded_at: new Date('2024-01-01') },
        { ...mockHealthRecord, id: 2, value: 71.0, recorded_at: new Date('2024-01-02') },
      ];

      mockDb.query.healthRecordSchema.findMany.mockResolvedValue(mockRecords);

      const result = await HealthRecordService.getHealthRecordTrends(mockUserId, 1, 'weekly');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: expect.any(String),
        value: 70.5, // Average of 70.0 and 71.0
        count: 2,
      });
    });

    it('should return empty array when no records found', async () => {
      mockDb.query.healthRecordSchema.findMany.mockResolvedValue([]);

      const result = await HealthRecordService.getHealthRecordTrends(mockUserId, 1, 'daily');

      expect(result).toEqual([]);
    });
  });

  describe('validateHealthValue', () => {
    it('should validate value is within typical range', () => {
      const isValid = HealthRecordService.validateHealthValue(70.5, mockHealthType);

      expect(isValid).toBe(true);
    });

    it('should reject value below typical range', () => {
      const isValid = HealthRecordService.validateHealthValue(30, mockHealthType);

      expect(isValid).toBe(false);
    });

    it('should reject value above typical range', () => {
      const isValid = HealthRecordService.validateHealthValue(250, mockHealthType);

      expect(isValid).toBe(false);
    });

    it('should accept value at range boundaries', () => {
      const isValidLow = HealthRecordService.validateHealthValue(40, mockHealthType);
      const isValidHigh = HealthRecordService.validateHealthValue(200, mockHealthType);

      expect(isValidLow).toBe(true);
      expect(isValidHigh).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent updates gracefully', async () => {
      const updateData = { value: 72.0 };

      mockDb.query.healthRecordSchema.findFirst.mockResolvedValue(mockHealthRecord);
      mockDb.query.healthTypeSchema.findFirst.mockResolvedValue(mockHealthType);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // No rows updated
          }),
        }),
      });

      await expect(
        HealthRecordService.updateHealthRecord(mockUserId, 1, updateData),
      ).rejects.toThrow('Failed to update health record');
    });

    it('should handle invalid user IDs', async () => {
      const invalidUserId = '';

      await expect(
        HealthRecordService.getHealthRecords(invalidUserId),
      ).rejects.toThrow('Invalid user ID');
    });

    it('should handle null/undefined values gracefully', async () => {
      const newRecordData = {
        type_id: 1,
        value: null as any,
        unit: 'kg',
        recorded_at: new Date(),
      };

      await expect(
        HealthRecordService.createHealthRecord(mockUserId, newRecordData),
      ).rejects.toThrow('Invalid health record data');
    });

    it('should handle database connection timeouts', async () => {
      mockDb.query.healthRecordSchema.findMany.mockRejectedValue(
        new Error('Connection timeout'),
      );

      await expect(
        HealthRecordService.getHealthRecords(mockUserId),
      ).rejects.toThrow('Connection timeout');
    });
  });
});
