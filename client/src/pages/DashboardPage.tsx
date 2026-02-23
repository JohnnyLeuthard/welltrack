import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { HabitLog, MedicationLog, MoodLog, StreakInfo, SymptomLog } from '../types/api';
import LogSymptomModal from '../components/LogSymptomModal';
import LogMoodModal from '../components/LogMoodModal';
import LogMedicationModal from '../components/LogMedicationModal';
import LogHabitModal from '../components/LogHabitModal';

type QuickAddType = 'symptom' | 'mood' | 'medication' | 'habit';

interface TodayCounts {
  symptoms: number;
  moods: number;
  medications: number;
  habits: number;
}

/** Returns { weekStart: 'YYYY-MM-DD', today: 'YYYY-MM-DD', daysFromMonday: 0-6 } */
function getWeekRange(): { weekStart: string; today: string; daysFromMonday: number } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
  const daysFromMonday = (dayOfWeek + 6) % 7; // Mon=0, Tue=1, … Sun=6
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  return {
    weekStart: weekStart.toISOString().split('T')[0]!,
    today: now.toISOString().split('T')[0]!,
    daysFromMonday,
  };
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const STREAK_MILESTONES = [7, 30] as const;

function getMilestoneStorageKey(userId: string, milestone: number): string {
  return `welltrack_milestone_${userId}_${milestone}`;
}

function isMilestoneNew(userId: string, milestone: number): boolean {
  return localStorage.getItem(getMilestoneStorageKey(userId, milestone)) === null;
}

function dismissMilestone(userId: string, milestone: number): void {
  localStorage.setItem(getMilestoneStorageKey(userId, milestone), 'seen');
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const summaryCards: {
  key: keyof TodayCounts;
  label: string;
  color: string;
  quickAdd: QuickAddType;
  quickAddLabel: string;
}[] = [
  { key: 'symptoms', label: 'Symptoms', color: 'bg-rose-50 text-rose-700', quickAdd: 'symptom', quickAddLabel: '+ Log symptom' },
  { key: 'moods', label: 'Mood entries', color: 'bg-amber-50 text-amber-700', quickAdd: 'mood', quickAddLabel: '+ Log mood' },
  { key: 'medications', label: 'Medications', color: 'bg-violet-50 text-violet-700', quickAdd: 'medication', quickAddLabel: '+ Log medication' },
  { key: 'habits', label: 'Habits', color: 'bg-teal-50 text-teal-700', quickAdd: 'habit', quickAddLabel: '+ Log habit' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<TodayCounts | null>(null);
  const [loggedDatesThisWeek, setLoggedDatesThisWeek] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [quickAdd, setQuickAdd] = useState<QuickAddType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);

  function refreshCounts() {
    setRefreshKey((k) => k + 1);
  }

  function handleDismissMilestone() {
    if (activeMilestone !== null && user?.id) {
      dismissMilestone(user.id, activeMilestone);
    }
    setActiveMilestone(null);
  }

  useEffect(() => {
    const { weekStart, today } = getWeekRange();
    const params = { startDate: weekStart, endDate: `${today}T23:59:59.999Z` };

    setIsLoading(true);
    // Fetch the full week so we can derive both today's counts and the streak
    Promise.all([
      api.get<SymptomLog[]>('/api/symptom-logs', { params }),
      api.get<MoodLog[]>('/api/mood-logs', { params }),
      api.get<MedicationLog[]>('/api/medication-logs', { params }),
      api.get<HabitLog[]>('/api/habit-logs', { params }),
      api.get<StreakInfo>('/api/insights/streak'),
    ])
      .then(([sym, mood, med, habit, streakRes]) => {
        setCounts({
          symptoms: sym.data.filter((l) => l.loggedAt.startsWith(today)).length,
          moods: mood.data.filter((l) => l.loggedAt.startsWith(today)).length,
          medications: med.data.filter((l) => l.createdAt.startsWith(today)).length,
          habits: habit.data.filter((l) => l.loggedAt.startsWith(today)).length,
        });
        setLoggedDatesThisWeek(
          new Set([
            ...sym.data.map((l) => l.loggedAt.split('T')[0]!),
            ...mood.data.map((l) => l.loggedAt.split('T')[0]!),
            ...med.data.map((l) => l.createdAt.split('T')[0]!),
            ...habit.data.map((l) => l.loggedAt.split('T')[0]!),
          ]),
        );
        // Check for a milestone to surface
        if (user?.id) {
          const streak = streakRes.data.currentStreak;
          const hit = STREAK_MILESTONES.find(
            (m) => streak >= m && isMilestoneNew(user.id, m),
          );
          if (hit !== undefined) setActiveMilestone(hit);
        }
      })
      .catch(() => {
        setCounts({ symptoms: 0, moods: 0, medications: 0, habits: 0 });
      })
      .finally(() => setIsLoading(false));
  }, [refreshKey, user?.id]);

  const name = user?.displayName ?? null;
  const { weekStart, today, daysFromMonday } = getWeekRange();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-gray-400">{formatDate(new Date())}</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-gray-100">
          {getGreeting()}{name ? `, ${name}` : ''}
        </h1>
      </div>

      {/* Milestone banner */}
      {activeMilestone !== null && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex items-start gap-3 rounded-xl bg-teal-50 dark:bg-teal-900/30 px-5 py-4 shadow-sm"
        >
          <span className="mt-0.5 text-2xl" aria-hidden="true">
            {activeMilestone >= 30 ? '🏅' : '🎉'}
          </span>
          <div className="flex-1">
            <p className="font-semibold text-teal-800 dark:text-teal-200">
              {activeMilestone}-day streak!
            </p>
            <p className="mt-0.5 text-sm text-teal-700 dark:text-teal-300">
              You've logged your health for {activeMilestone} days in a row. Keep it up!
            </p>
          </div>
          <button
            onClick={handleDismissMilestone}
            aria-label="Dismiss milestone notification"
            className="mt-0.5 text-teal-500 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Streak */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          This week
        </h2>
        <div className="inline-flex items-end gap-3 rounded-xl bg-white dark:bg-gray-800 px-5 py-4 shadow-sm">
          <div className="flex gap-2">
            {WEEK_DAYS.map((day, i) => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + i);
              const dateStr = d.toISOString().split('T')[0]!;
              const isFuture = dateStr > today;
              const isLogged = loggedDatesThisWeek.has(dateStr);
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`h-3 w-3 rounded-full transition-colors ${
                      isFuture
                        ? 'bg-gray-100 dark:bg-gray-700'
                        : isLogged
                          ? 'bg-teal-500'
                          : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{day}</span>
                </div>
              );
            })}
          </div>
          <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-200">{loggedDatesThisWeek.size}</span>
            {' '}of {daysFromMonday + 1} days logged
          </p>
        </div>
      </section>

      {/* Today's summary */}
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Today's summary
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summaryCards.map(({ key }) => (
              <div key={key} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summaryCards.map(({ key, label, color, quickAdd: type, quickAddLabel }) => {
              const count = counts?.[key] ?? 0;
              return (
                <div key={key} className="flex flex-col rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-800 dark:text-gray-100">{count}</p>
                  {count === 0 ? (
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">None logged yet</p>
                  ) : (
                    <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
                      {count === 1 ? '1 entry' : `${count} entries`}
                    </p>
                  )}
                  <button
                    onClick={() => setQuickAdd(type)}
                    className="mt-3 self-start text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
                  >
                    {quickAddLabel}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick-add modals */}
      <LogSymptomModal
        isOpen={quickAdd === 'symptom'}
        onClose={() => setQuickAdd(null)}
        onSuccess={refreshCounts}
      />
      <LogMoodModal
        isOpen={quickAdd === 'mood'}
        onClose={() => setQuickAdd(null)}
        onSuccess={refreshCounts}
      />
      <LogMedicationModal
        isOpen={quickAdd === 'medication'}
        onClose={() => setQuickAdd(null)}
        onSuccess={refreshCounts}
      />
      <LogHabitModal
        isOpen={quickAdd === 'habit'}
        onClose={() => setQuickAdd(null)}
        onSuccess={refreshCounts}
      />
    </div>
  );
}
