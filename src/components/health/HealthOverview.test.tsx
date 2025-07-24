import * as Clerk from '@clerk/nextjs/server';
// NOTE: If you see a type error for @testing-library/react, ensure you have @types/testing-library__react installed.
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthOverview } from './HealthOverview';

// Mock getTranslations
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

// Mock Clerk currentUser
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

// Mock DB and data fetching
vi.mock('@/libs/DB', () => ({
  db: {},
}));

// Patch the data fetching helper in HealthOverview
const mockData = {
  recentRecords: [
    { id: 1, type: 'Weight', value: 70, unit: 'kg', recorded_at: '2024-01-01T10:00:00Z' },
    { id: 2, type: 'Steps', value: 8000, unit: 'steps', recorded_at: '2024-01-02T10:00:00Z' },
  ],
  activeGoals: [
    { id: 1, type: 'Weight', target_value: 65, current_value: 70, target_date: '2024-03-01', status: 'active' },
  ],
  stats: { totalRecords: 2, activeGoals: 1, completedGoals: 0, weeklyProgress: 50 },
};

// Helper to patch the data fetching in HealthOverview
function mockHealthOverviewData(data: any) {
  // @ts-expect-error: Patch getHealthOverviewData for async server component test
  HealthOverview.__Rewire__('getHealthOverviewData', async () => data);
}

// Minimal mock Clerk user object with required fields
const mockClerkUser = {
  id: 'user1',
  passwordEnabled: false,
  totpEnabled: false,
  backupCodeEnabled: false,
  twoFactorEnabled: false,
  emailAddresses: [],
  phoneNumbers: [],
  web3Wallets: [],
  externalAccounts: [],
  hasImage: false,
  imageUrl: '',
  primaryEmailAddressId: null,
  primaryPhoneNumberId: null,
  primaryWeb3WalletId: null,
  username: null,
  firstName: null,
  lastName: null,
  publicMetadata: {},
  privateMetadata: {},
  unsafeMetadata: {},
  createdAt: 0,
  updatedAt: 0,
  lastSignInAt: 0,
  banned: false,
  locked: false,
  verificationStatus: 'unverified',
  lastActiveAt: 0,
  // Add missing required Clerk User fields
  externalId: null,
  samlAccounts: [],
  createOrganizationEnabled: false,
  createOrganizationsLimit: 0,
  organizationMemberships: [],
  lastActiveOrganizationId: null,
  lastActiveOrganization: null,
  lastActiveOrganizationRole: null,
  lastActiveOrganizationMembershipId: null,
  lastActiveOrganizationInvitationId: null,
  lastActiveOrganizationInvitation: null,
  lastActiveOrganizationRoleId: null,
  // Final required fields
  deleteSelfEnabled: false,
  legalAcceptedAt: null,
  raw: {},
  primaryOrganizationId: null,
  primaryOrganizationMembershipId: null,
  primaryOrganizationRoleId: null,
  // Final Clerk User fields for type compatibility
  primaryEmailAddress: null,
  primaryPhoneNumber: null,
  primaryWeb3Wallet: null,
  fullName: '',
};

describe('HealthOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all main sections with mock data', async () => {
    vi.spyOn(Clerk, 'currentUser').mockResolvedValue(mockClerkUser as any);
    mockHealthOverviewData(mockData);
    render(<HealthOverview />);

    expect(await screen.findByTestId('health-overview')).toBeInTheDocument();
    expect(screen.getByTestId('health-overview-stats')).toBeInTheDocument();
    expect(screen.getByTestId('health-overview-recent-records')).toBeInTheDocument();
    expect(screen.getByTestId('health-overview-active-goals')).toBeInTheDocument();
    expect(screen.getByTestId('health-overview-quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('health-overview-mini-charts')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('Steps')).toBeInTheDocument();
    expect(screen.getByText('Goal Progress')).toBeInTheDocument();
  });

  it('shows empty state for no records or goals', async () => {
    vi.spyOn(Clerk, 'currentUser').mockResolvedValue(mockClerkUser as any);
    mockHealthOverviewData({ recentRecords: [], activeGoals: [], stats: { totalRecords: 0, activeGoals: 0, completedGoals: 0, weeklyProgress: 0 } });
    render(<HealthOverview />);

    expect(await screen.findByText('No recent records')).toBeInTheDocument();
    expect(screen.getByText('No active goals')).toBeInTheDocument();
  });

  it('displays correct stats', async () => {
    vi.spyOn(Clerk, 'currentUser').mockResolvedValue(mockClerkUser as any);
    mockHealthOverviewData(mockData);
    render(<HealthOverview />);

    expect(await screen.findByText('2')).toBeInTheDocument(); // totalRecords
    expect(screen.getByText('1')).toBeInTheDocument(); // activeGoals
    expect(screen.getByText('0')).toBeInTheDocument(); // completedGoals
    expect(screen.getByText('50%')).toBeInTheDocument(); // weeklyProgress
  });

  it('returns null if not authenticated', async () => {
    vi.spyOn(Clerk, 'currentUser').mockResolvedValue(null);
    render(<HealthOverview />);

    // Should not render anything
    expect(screen.queryByTestId('health-overview')).not.toBeInTheDocument();
  });
});
