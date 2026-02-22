import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { HabitLog, MedicationLog, MoodLog, SymptomLog } from '../types/api';

interface TodayCounts {
  symptoms: number;
  moods: number;
  medications: number;
  habits: number;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]!;
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

const summaryCards = [
  { key: 'symptoms' as const, label: 'Symptoms', color: 'bg-rose-50 text-rose-700' },
  { key: 'moods' as const, label: 'Mood entries', color: 'bg-amber-50 text-amber-700' },
  { key: 'medications' as const, label: 'Medications', color: 'bg-violet-50 text-violet-700' },
  { key: 'habits' as const, label: 'Habits', color: 'bg-teal-50 text-teal-700' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<TodayCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const today = getToday();
    const params = { startDate: today, endDate: today };

    Promise.all([
      api.get<SymptomLog[]>('/api/symptom-logs', { params }),
      api.get<MoodLog[]>('/api/mood-logs', { params }),
      api.get<MedicationLog[]>('/api/medication-logs', { params }),
      api.get<HabitLog[]>('/api/habit-logs', { params }),
    ])
      .then(([sym, mood, med, habit]) => {
        setCounts({
          symptoms: sym.data.length,
          moods: mood.data.length,
          medications: med.data.length,
          habits: habit.data.length,
        });
      })
      .catch(() => {
        setCounts({ symptoms: 0, moods: 0, medications: 0, habits: 0 });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const name = user?.displayName ?? null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-gray-400">{formatDate(new Date())}</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-800">
          {getGreeting()}{name ? `, ${name}` : ''}
        </h1>
      </div>

      {/* Today's summary */}
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
          Today's summary
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summaryCards.map(({ key }) => (
              <div key={key} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summaryCards.map(({ key, label, color }) => {
              const count = counts?.[key] ?? 0;
              return (
                <div key={key} className="rounded-xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-800">{count}</p>
                  {count === 0 ? (
                    <p className="mt-1 text-xs text-gray-400">None logged yet</p>
                  ) : (
                    <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
                      {count === 1 ? '1 entry' : `${count} entries`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
