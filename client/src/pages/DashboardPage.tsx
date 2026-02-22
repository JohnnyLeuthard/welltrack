import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { HabitLog, MedicationLog, MoodLog, SymptomLog } from '../types/api';

type QuickAddType = 'symptom' | 'mood' | 'medication' | 'habit';

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
  const [isLoading, setIsLoading] = useState(true);
  const [quickAdd, setQuickAdd] = useState<QuickAddType | null>(null);

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
              <div key={key} className="h-28 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summaryCards.map(({ key, label, color, quickAdd: type, quickAddLabel }) => {
              const count = counts?.[key] ?? 0;
              return (
                <div key={key} className="flex flex-col rounded-xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-800">{count}</p>
                  {count === 0 ? (
                    <p className="mt-1 text-xs text-gray-400">None logged yet</p>
                  ) : (
                    <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
                      {count === 1 ? '1 entry' : `${count} entries`}
                    </p>
                  )}
                  <button
                    onClick={() => setQuickAdd(type)}
                    className="mt-3 self-start text-xs font-medium text-teal-600 hover:text-teal-700"
                  >
                    {quickAddLabel}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick-add modal */}
      {quickAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setQuickAdd(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-semibold text-gray-800 capitalize">
              Log {quickAdd}
            </h2>
            <p className="mb-6 text-sm text-gray-500">
              Full logging form coming soon. Build it in the Logging Forms section.
            </p>
            <button
              onClick={() => setQuickAdd(null)}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
