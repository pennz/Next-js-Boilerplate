'use client';

import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Env } from '@/libs/Env';

// Types for user profile data structures
export type UserProfile = {
  id?: number;
  userId: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  height?: number;
  heightUnit?: 'cm' | 'ft_in';
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  experienceYears?: number;
  timezone?: string;
  profilePicture?: string;
  bio?: string;
  isPublic?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserFitnessGoal = {
  id?: number;
  userId: string;
  goalType: 'weight_loss' | 'muscle_gain' | 'endurance' | 'strength' | 'flexibility' | 'general_fitness';
  targetValue?: number;
  targetUnit?: string;
  currentValue?: number;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserPreference = {
  id?: number;
  userId: string;
  category: 'workout' | 'nutrition' | 'notification' | 'privacy' | 'general';
  key: string;
  value: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserConstraint = {
  id?: number;
  userId: string;
  constraintType: 'injury' | 'schedule' | 'equipment' | 'location' | 'medical';
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high';
  affectedBodyParts?: string[];
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

// Preference categories for organization
export type PreferenceCategory = 'workout' | 'nutrition' | 'notification' | 'privacy' | 'general';

// Input types for updates
export type UserProfileUpdate = Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;
export type UserPreferenceUpdate = Partial<Omit<UserPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;
export type UserConstraintInput = Omit<UserConstraint, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UserConstraintUpdate = Partial<Omit<UserConstraint, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

// State management types
type UserProfileState = {
  profile: UserProfile | null;
  fitnessGoals: UserFitnessGoal[];
  preferences: UserPreference[];
  constraints: UserConstraint[];
  isLoading: boolean;
  error: string | null;
  lastSaved: Date | null;
  isDirty: boolean;
};

type UseUserProfileReturn = {
  // Profile data
  profile: UserProfile | null;
  fitnessGoals: UserFitnessGoal[];
  preferences: UserPreference[];
  constraints: UserConstraint[];

  // State indicators
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  lastSaved: Date | null;

  // Core functionality
  updateProfile: (updates: UserProfileUpdate) => Promise<void>;
  refreshProfile: () => Promise<void>;
  getProfileCompletion: () => number;

  // Preference management
  updatePreferences: (preferences: UserPreferenceUpdate[]) => Promise<void>;
  resetPreferences: () => Promise<void>;
  getPreferencesByCategory: (category: PreferenceCategory) => UserPreference[];

  // Constraint management
  addConstraint: (constraint: UserConstraintInput) => Promise<void>;
  updateConstraint: (id: number, updates: UserConstraintUpdate) => Promise<void>;
  removeConstraint: (id: number) => Promise<void>;
  getActiveConstraints: () => UserConstraint[];
};

// Local storage keys
const STORAGE_KEYS = {
  PROFILE: 'userProfile',
  FITNESS_GOALS: 'userFitnessGoals',
  PREFERENCES: 'userPreferences',
  CONSTRAINTS: 'userConstraints',
} as const;

// Default preferences
const DEFAULT_PREFERENCES: UserPreference[] = [
  { category: 'workout', key: 'preferred_time', value: 'morning', userId: '' },
  { category: 'workout', key: 'session_duration', value: '60', userId: '' },
  { category: 'workout', key: 'rest_days_per_week', value: '2', userId: '' },
  { category: 'notification', key: 'workout_reminders', value: 'true', userId: '' },
  { category: 'notification', key: 'progress_updates', value: 'true', userId: '' },
  { category: 'privacy', key: 'profile_visibility', value: 'private', userId: '' },
];

// Profile completion calculation weights
const COMPLETION_WEIGHTS = {
  firstName: 10,
  lastName: 10,
  dateOfBirth: 10,
  gender: 5,
  height: 10,
  fitnessLevel: 15,
  experienceYears: 10,
  timezone: 5,
  bio: 10,
  fitnessGoals: 15,
  preferences: 10,
} as const;

export const useUserProfile = (): UseUserProfileReturn => {
  const { user, isLoaded: isUserLoaded } = useUser();

  // State management
  const [state, setState] = useState<UserProfileState>({
    profile: null,
    fitnessGoals: [],
    preferences: [],
    constraints: [],
    isLoading: false,
    error: null,
    lastSaved: null,
    isDirty: false,
  });

  // Auto-save functionality
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<UserProfileUpdate | null>(null);
  const isOnlineRef = useRef<boolean>(true);

  // Configuration from environment
  const autoSaveInterval = Env.NEXT_PUBLIC_PROFILE_AUTO_SAVE_INTERVAL;

  // Local storage helpers
  const saveToLocalStorage = useCallback((key: string, data: any) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
    }
  }, []);

  const loadFromLocalStorage = useCallback((key: string) => {
    if (typeof window !== 'undefined') {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.warn('Failed to load from localStorage:', error);
        return null;
      }
    }
    return null;
  }, []);

  // API call helpers
  const makeApiCall = useCallback(async (
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> => {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    return response;
  }, []);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      // Sync pending changes when coming back online
      if (pendingUpdatesRef.current && user) {
        updateProfile(pendingUpdatesRef.current);
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Load profile data from server
  const loadProfileData = useCallback(async (): Promise<void> => {
    if (!isUserLoaded || !user) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await makeApiCall('/api/profile');
      const data = await response.json();

      setState(prev => ({
        ...prev,
        profile: data.profile || null,
        fitnessGoals: data.fitnessGoals || [],
        preferences: data.preferences || DEFAULT_PREFERENCES.map(p => ({ ...p, userId: user.id })),
        constraints: data.constraints || [],
        isLoading: false,
        lastSaved: new Date(),
        isDirty: false,
      }));

      // Save to local storage for offline access
      if (data.profile) {
        saveToLocalStorage(STORAGE_KEYS.PROFILE, data.profile);
      }
      if (data.fitnessGoals) {
        saveToLocalStorage(STORAGE_KEYS.FITNESS_GOALS, data.fitnessGoals);
      }
      if (data.preferences) {
        saveToLocalStorage(STORAGE_KEYS.PREFERENCES, data.preferences);
      }
      if (data.constraints) {
        saveToLocalStorage(STORAGE_KEYS.CONSTRAINTS, data.constraints);
      }
    } catch (error) {
      // Load from local storage if API fails
      const localProfile = loadFromLocalStorage(STORAGE_KEYS.PROFILE);
      const localGoals = loadFromLocalStorage(STORAGE_KEYS.FITNESS_GOALS);
      const localPreferences = loadFromLocalStorage(STORAGE_KEYS.PREFERENCES);
      const localConstraints = loadFromLocalStorage(STORAGE_KEYS.CONSTRAINTS);

      setState(prev => ({
        ...prev,
        profile: localProfile,
        fitnessGoals: localGoals || [],
        preferences: localPreferences || DEFAULT_PREFERENCES.map(p => ({ ...p, userId: user.id })),
        constraints: localConstraints || [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load profile',
      }));
    }
  }, [isUserLoaded, user, makeApiCall, saveToLocalStorage, loadFromLocalStorage]);

  // Auto-save functionality
  const scheduleAutoSave = useCallback((updates: UserProfileUpdate) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (pendingUpdatesRef.current && isOnlineRef.current && user) {
        try {
          await makeApiCall('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(pendingUpdatesRef.current),
          });

          setState(prev => ({
            ...prev,
            lastSaved: new Date(),
            isDirty: false,
          }));

          pendingUpdatesRef.current = null;
        } catch (error) {
          // Keep updates pending for retry
          setState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Auto-save failed',
          }));
        }
      }
    }, autoSaveInterval);
  }, [autoSaveInterval, makeApiCall, user]);

  // Update profile with optimistic updates
  const updateProfile = useCallback(async (updates: UserProfileUpdate): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Optimistic update
    setState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, ...updates } : { userId: user.id, ...updates },
      isDirty: true,
    }));

    // Save to local storage immediately
    const updatedProfile = state.profile ? { ...state.profile, ...updates } : { userId: user.id, ...updates };
    saveToLocalStorage(STORAGE_KEYS.PROFILE, updatedProfile);

    if (isOnlineRef.current) {
      try {
        await makeApiCall('/api/profile', {
          method: state.profile ? 'PUT' : 'POST',
          body: JSON.stringify(updates),
        });

        setState(prev => ({
          ...prev,
          lastSaved: new Date(),
          isDirty: false,
          error: null,
        }));
      } catch (error) {
        // Schedule auto-save for retry
        scheduleAutoSave(updates);
        throw error;
      }
    } else {
      // Schedule auto-save for when online
      scheduleAutoSave(updates);
    }
  }, [user, state.profile, makeApiCall, saveToLocalStorage, scheduleAutoSave]);

  // Refresh profile data
  const refreshProfile = useCallback(async (): Promise<void> => {
    await loadProfileData();
  }, [loadProfileData]);

  // Calculate profile completion percentage
  const getProfileCompletion = useCallback((): number => {
    if (!state.profile) {
      return 0;
    }

    let totalWeight = 0;
    let completedWeight = 0;

    // Check profile fields
    Object.entries(COMPLETION_WEIGHTS).forEach(([field, weight]) => {
      if (field === 'fitnessGoals') {
        totalWeight += weight;
        if (state.fitnessGoals.length > 0) {
          completedWeight += weight;
        }
      } else if (field === 'preferences') {
        totalWeight += weight;
        if (state.preferences.length > 0) {
          completedWeight += weight;
        }
      } else {
        totalWeight += weight;
        const value = state.profile[field as keyof UserProfile];
        if (value !== null && value !== undefined && value !== '') {
          completedWeight += weight;
        }
      }
    });

    return Math.round((completedWeight / totalWeight) * 100);
  }, [state.profile, state.fitnessGoals, state.preferences]);

  // Update preferences
  const updatePreferences = useCallback(async (preferences: UserPreferenceUpdate[]): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Optimistic update
    setState(prev => ({
      ...prev,
      preferences: preferences.map(pref => ({ ...pref, userId: user.id } as UserPreference)),
      isDirty: true,
    }));

    // Save to local storage
    saveToLocalStorage(STORAGE_KEYS.PREFERENCES, preferences);

    if (isOnlineRef.current) {
      try {
        await makeApiCall('/api/profile/preferences', {
          method: 'PUT',
          body: JSON.stringify({ preferences }),
        });

        setState(prev => ({
          ...prev,
          lastSaved: new Date(),
          isDirty: false,
          error: null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to update preferences',
        }));
        throw error;
      }
    }
  }, [user, makeApiCall, saveToLocalStorage]);

  // Reset preferences to defaults
  const resetPreferences = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const defaultPrefs = DEFAULT_PREFERENCES.map(p => ({ ...p, userId: user.id }));

    setState(prev => ({
      ...prev,
      preferences: defaultPrefs,
      isDirty: true,
    }));

    saveToLocalStorage(STORAGE_KEYS.PREFERENCES, defaultPrefs);

    if (isOnlineRef.current) {
      try {
        await makeApiCall('/api/profile/preferences', {
          method: 'POST',
        });

        setState(prev => ({
          ...prev,
          lastSaved: new Date(),
          isDirty: false,
          error: null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to reset preferences',
        }));
        throw error;
      }
    }
  }, [user, makeApiCall, saveToLocalStorage]);

  // Get preferences by category
  const getPreferencesByCategory = useCallback((category: PreferenceCategory): UserPreference[] => {
    return state.preferences.filter(pref => pref.category === category);
  }, [state.preferences]);

  // Add constraint
  const addConstraint = useCallback(async (constraint: UserConstraintInput): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const newConstraint: UserConstraint = {
      ...constraint,
      userId: user.id,
      id: Date.now(), // Temporary ID for optimistic update
    };

    // Optimistic update
    setState(prev => ({
      ...prev,
      constraints: [...prev.constraints, newConstraint],
      isDirty: true,
    }));

    // Save to local storage
    const updatedConstraints = [...state.constraints, newConstraint];
    saveToLocalStorage(STORAGE_KEYS.CONSTRAINTS, updatedConstraints);

    if (isOnlineRef.current) {
      try {
        const response = await makeApiCall('/api/profile/constraints', {
          method: 'POST',
          body: JSON.stringify(constraint),
        });

        const savedConstraint = await response.json();

        setState(prev => ({
          ...prev,
          constraints: prev.constraints.map(c =>
            c.id === newConstraint.id ? savedConstraint : c,
          ),
          lastSaved: new Date(),
          isDirty: false,
          error: null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to add constraint',
        }));
        throw error;
      }
    }
  }, [user, state.constraints, makeApiCall, saveToLocalStorage]);

  // Update constraint
  const updateConstraint = useCallback(async (id: number, updates: UserConstraintUpdate): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Optimistic update
    setState(prev => ({
      ...prev,
      constraints: prev.constraints.map(c =>
        c.id === id ? { ...c, ...updates } : c,
      ),
      isDirty: true,
    }));

    // Save to local storage
    const updatedConstraints = state.constraints.map(c =>
      c.id === id ? { ...c, ...updates } : c,
    );
    saveToLocalStorage(STORAGE_KEYS.CONSTRAINTS, updatedConstraints);

    if (isOnlineRef.current) {
      try {
        await makeApiCall(`/api/profile/constraints/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });

        setState(prev => ({
          ...prev,
          lastSaved: new Date(),
          isDirty: false,
          error: null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to update constraint',
        }));
        throw error;
      }
    }
  }, [user, state.constraints, makeApiCall, saveToLocalStorage]);

  // Remove constraint
  const removeConstraint = useCallback(async (id: number): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Optimistic update
    setState(prev => ({
      ...prev,
      constraints: prev.constraints.filter(c => c.id !== id),
      isDirty: true,
    }));

    // Save to local storage
    const updatedConstraints = state.constraints.filter(c => c.id !== id);
    saveToLocalStorage(STORAGE_KEYS.CONSTRAINTS, updatedConstraints);

    if (isOnlineRef.current) {
      try {
        await makeApiCall(`/api/profile/constraints/${id}`, {
          method: 'DELETE',
        });

        setState(prev => ({
          ...prev,
          lastSaved: new Date(),
          isDirty: false,
          error: null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to remove constraint',
        }));
        throw error;
      }
    }
  }, [user, state.constraints, makeApiCall, saveToLocalStorage]);

  // Get active constraints
  const getActiveConstraints = useCallback((): UserConstraint[] => {
    return state.constraints.filter(constraint => constraint.isActive);
  }, [state.constraints]);

  // Load profile data when user is loaded
  useEffect(() => {
    if (isUserLoaded && user) {
      loadProfileData();
    }
  }, [isUserLoaded, user, loadProfileData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Profile data
    profile: state.profile,
    fitnessGoals: state.fitnessGoals,
    preferences: state.preferences,
    constraints: state.constraints,

    // State indicators
    isLoading: state.isLoading,
    error: state.error,
    isDirty: state.isDirty,
    lastSaved: state.lastSaved,

    // Core functionality
    updateProfile,
    refreshProfile,
    getProfileCompletion,

    // Preference management
    updatePreferences,
    resetPreferences,
    getPreferencesByCategory,

    // Constraint management
    addConstraint,
    updateConstraint,
    removeConstraint,
    getActiveConstraints,
  };
};

// Export types for external use
export type { PreferenceCategory, UseUserProfileReturn };
