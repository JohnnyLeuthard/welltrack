// Auth
export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// User
export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  timezone: string;
  createdAt: string;
  lastLoginAt: string | null;
}

// Symptoms
export interface Symptom {
  id: string;
  name: string;
  category: string | null;
  userId: string | null;
  isActive: boolean;
}

export interface SymptomLog {
  id: string;
  userId: string;
  symptomId: string;
  severity: number;
  notes: string | null;
  loggedAt: string;
  createdAt: string;
}

// Mood
export interface MoodLog {
  id: string;
  userId: string;
  moodScore: number;
  energyLevel: number | null;
  stressLevel: number | null;
  notes: string | null;
  loggedAt: string;
  createdAt: string;
}

// Medications
export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  userId: string;
  medicationId: string;
  taken: boolean;
  takenAt: string | null;
  notes: string | null;
  createdAt: string;
}

// Habits
export type TrackingType = 'boolean' | 'numeric' | 'duration';

export interface Habit {
  id: string;
  userId: string | null;
  name: string;
  trackingType: TrackingType;
  unit: string | null;
  isActive: boolean;
}

export interface HabitLog {
  id: string;
  userId: string;
  habitId: string;
  valueBoolean: boolean | null;
  valueNumeric: number | null;
  valueDuration: number | null;
  notes: string | null;
  loggedAt: string;
  createdAt: string;
}

// Error
export interface ApiError {
  error: string;
}

// Insights
export interface TrendPoint {
  date: string;
  avg: number;
}

export interface ActivityPoint {
  date: string;
  count: number;
}

// Import
export interface ImportResult {
  imported: {
    symptomLogs: number;
    moodLogs: number;
    medicationLogs: number;
    habitLogs: number;
  };
  skipped: {
    symptomLogs: number;
    moodLogs: number;
    medicationLogs: number;
    habitLogs: number;
  };
  errors: string[];
}

// Audit log
export type AuditAction = 'login' | 'password_change' | 'email_change';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
