import { render, screen, waitFor } from 'vitest-browser-react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthOverviewContainer } from './HealthOverviewContainer';
import type { UserResource, EmailAddressResource, VerificationResource } from '@clerk/types';

// Mock Clerk useUser
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
}));

// Mock behavior tracking hook
vi.mock('@/hooks/useBehaviorTracking', () => ({
  useBehaviorTracking: () => ({
    trackEvent: vi.fn(),
    isLoading: false,
    error: null,
    flushEvents: vi.fn(),
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock API response data
const mockApiResponses = {
  recentRecords: {
    records: [
      {
        id: 1,
        typeId: 1,
        value: 70,
        unit: 'kg',
        recordedAt: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T10:00:00Z',
        healthType: {
          id: 1,
          slug: 'weight',
          displayName: 'Weight',
          unit: 'kg',
        },
      },
      {
        id: 2,
        typeId: 2,
        value: 8000,
        unit: 'steps',
        recordedAt: '2024-01-02T10:00:00Z',
        createdAt: '2024-01-02T10:00:00Z',
        healthType: {
          id: 2,
          slug: 'steps',
          displayName: 'Steps',
          unit: 'steps',
        },
      },
    ],
  },
  activeGoals: {
    goals: [
      {
        id: 1,
        typeId: 1,
        targetValue: 65,
        targetDate: '2024-03-01',
        status: 'active',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        healthType: {
          id: 1,
          slug: 'weight',
          displayName: 'Weight',
          unit: 'kg',
        },
        currentValue: 70,
        progressPercentage: 0,
        daysRemaining: 60,
        isOverdue: false,
        lastRecordedAt: '2024-01-01T10:00:00Z',
      },
    ],
  },
  stats: {
    stats: {
      totalRecords: 2,
      activeGoals: 1,
      completedGoals: 0,
      weeklyProgress: 50,
      weeklyRecords: 5,
      previousWeekRecords: 3,
    },
  },
};

// Mock Clerk user object with all required properties
const mockUser: UserResource = {
  id: 'user1',
  externalId: 'ext_user1',
  primaryEmailAddressId: 'email1',
  primaryEmailAddress: {
    id: 'email1',
    emailAddress: 'test@example.com',
    verification: {
      status: 'verified',
      strategy: 'email_link',
      attempts: 0,
      expireAt: null,
      externalVerificationRedirectURL: null,
      error: null,
      nonce: null,
      reservedForSecondFactor: false,
      secondFactor: null,
    },
    linkedTo: [],
  },
  primaryPhoneNumberId: null,
  primaryPhoneNumber: null,
  imageUrl: 'https://example.com/avatar.jpg',
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
  username: 'testuser',
  publicMetadata: {},
  privateMetadata: {},
  unsafeMetadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignInAt: new Date(),
  hasImage: true,
  isSignedIn: true,
  isLoaded: true,
  emailAddresses: [{
    id: 'email1',
    emailAddress: 'test@example.com',
    verification: {
      status: 'verified',
      strategy: 'email_link',
      attempts: 0,
      expireAt: null,
      externalVerificationRedirectURL: null,
      error: null,
      nonce: null,
      reservedForSecondFactor: false,
      secondFactor: null,
    },
    linkedTo: [],
  }],
  phoneNumbers: [],
  organizationMemberships: [],
  passwordEnabled: true,
  twoFactorEnabled: false,
  totpEnabled: false,
  backupCodeEnabled: false,
  externalAccounts: [],
  samlAccounts: [],
  lastActiveAt: new Date(),
  createOrganizationEnabled: false,
  deleteSelfEnabled: false,
  createSessionEnabled: true,
};

describe('HealthOverviewContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  const setupSuccessfulFetch = () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/recent-records')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponses.recentRecords),
        });
      } else if (url.includes('/active-goals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponses.activeGoals),
        });
      } else if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponses.stats),
        });
      }
      return Promise.resolve({ ok: false });
    });
  };

  it('renders all main sections with mock data', async () => {
    const { useUser } = await import('@clerk/nextjs');
    vi.mocked(useUser).mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    });

    setupSuccessfulFetch();
    render(<HealthOverviewContainer />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('health-overview')).toBeInTheDocument();
    });

    expect(screen.getByTestId('health-overview-stats')).toBeInTheDocument();
    expect(screen.getByTestId('health-overview-recent-records')).toBeInTheDocument();
    expect(screen.getByTestId('health-overview-active-goals')).toBeInTheDocument();
    expect(screen.getByTestId('health-overview-quick-actions')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('Steps')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    const { useUser } = await import('@clerk/nextjs');
    vi.mocked(useUser).mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    });

    // Delay the fetch to show loading state
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<HealthOverviewContainer />);

    expect(screen.getByText(/Loading health data/i)).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    const { useUser } = await import('@clerk/nextjs');
    vi.mocked(useUser).mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    });

    mockFetch.mockRejectedValue(new Error('API Error'));
    render(<HealthOverviewContainer />);

    await waitFor(() => {
      expect(screen.getByText(/Error Loading Health Data/i)).toBeInTheDocument();
    });
  });

  it('returns null if user is not loaded', async () => {
    const { useUser } = await import('@clerk/nextjs');
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoaded: false,
    });

    render(<HealthOverviewContainer />);

    expect(screen.queryByTestId('health-overview')).not.toBeInTheDocument();
  });
});
