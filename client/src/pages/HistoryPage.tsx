import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import type {
  Habit,
  HabitLog,
  Medication,
  MedicationLog,
  MoodLog,
  Symptom,
  SymptomLog,
} from '../types/api';
import LogSymptomModal from '../components/LogSymptomModal';
import LogMoodModal from '../components/LogMoodModal';
import LogMedicationModal from '../components/LogMedicationModal';
import LogHabitModal from '../components/LogHabitModal';

type LogType = 'symptom' | 'mood' | 'medication' | 'habit';

type HistoryEntry =
  | { id: string; type: 'symptom'; log: SymptomLog; dateKey: string; sortTime: string }
  | { id: string; type: 'mood'; log: MoodLog; dateKey: string; sortTime: string }
  | { id: string; type: 'medication'; log: MedicationLog; dateKey: string; sortTime: string }
  | { id: string; type: 'habit'; log: HabitLog; dateKey: string; sortTime: string };

type EditTarget =
  | { type: 'symptom'; log: SymptomLog }
  | { type: 'mood'; log: MoodLog }
  | { type: 'medication'; log: MedicationLog }
  | { type: 'habit'; log: HabitLog }
  | null;

const TYPE_FILTERS: { type: LogType; label: string }[] = [
  { type: 'symptom', label: 'Symptoms' },
  { type: 'mood', label: 'Mood' },
  { type: 'medication', label: 'Medications' },
  { type: 'habit', label: 'Habits' },
];

const TYPE_COLORS: Record<LogType, string> = {
  symptom: 'bg-rose-100 text-rose-700',
  mood: 'bg-amber-100 text-amber-700',
  medication: 'bg-violet-100 text-violet-700',
  habit: 'bg-teal-100 text-teal-700',
};

const TYPE_LABELS: Record<LogType, string> = {
  symptom: 'Symptom',
  mood: 'Mood',
  medication: 'Medication',
  habit: 'Habit',
};

function formatDayHeading(dateKey: string): string {
  // Parse as noon local time to avoid timezone-boundary date shifts
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function HistoryPage() {
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [activeTypes, setActiveTypes] = useState<Set<LogType>>(
    new Set(['symptom', 'mood', 'medication', 'habit']),
  );
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: LogType } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  useEffect(() => {
    setIsLoading(true);
    setFetchError(null);
    Promise.all([
      api.get<SymptomLog[]>('/api/symptom-logs'),
      api.get<MoodLog[]>('/api/mood-logs'),
      api.get<MedicationLog[]>('/api/medication-logs'),
      api.get<HabitLog[]>('/api/habit-logs'),
      api.get<Symptom[]>('/api/symptoms'),
      api.get<Medication[]>('/api/medications'),
      api.get<Habit[]>('/api/habits'),
    ])
      .then(([sym, mood, med, habit, syms, meds, habs]) => {
        setSymptomLogs(sym.data);
        setMoodLogs(mood.data);
        setMedicationLogs(med.data);
        setHabitLogs(habit.data);
        setSymptoms(syms.data);
        setMedications(meds.data);
        setHabits(habs.data);
        // Expand today and yesterday by default
        const today = new Date().toISOString().split('T')[0]!;
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]!;
        setExpandedDays(new Set([today, yesterday]));
      })
      .catch(() => setFetchError('Failed to load history. Please refresh to try again.'))
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  // Lookup maps for entity names
  const symptomMap = useMemo(() => new Map(symptoms.map((s) => [s.id, s])), [symptoms]);
  const medicationMap = useMemo(
    () => new Map(medications.map((m) => [m.id, m])),
    [medications],
  );
  const habitMap = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  // Flatten all log types into a single list
  const allEntries = useMemo<HistoryEntry[]>(
    () => [
      ...symptomLogs.map((log) => ({
        id: log.id,
        type: 'symptom' as const,
        log,
        dateKey: log.loggedAt.split('T')[0]!,
        sortTime: log.loggedAt,
      })),
      ...moodLogs.map((log) => ({
        id: log.id,
        type: 'mood' as const,
        log,
        dateKey: log.loggedAt.split('T')[0]!,
        sortTime: log.loggedAt,
      })),
      ...medicationLogs.map((log) => ({
        id: log.id,
        type: 'medication' as const,
        log,
        dateKey: log.createdAt.split('T')[0]!,
        sortTime: log.createdAt,
      })),
      ...habitLogs.map((log) => ({
        id: log.id,
        type: 'habit' as const,
        log,
        dateKey: log.loggedAt.split('T')[0]!,
        sortTime: log.loggedAt,
      })),
    ],
    [symptomLogs, moodLogs, medicationLogs, habitLogs],
  );

  // Apply type filter then group by date
  const groupedByDate = useMemo(() => {
    const filtered = allEntries.filter((e) => activeTypes.has(e.type));
    const map = new Map<string, HistoryEntry[]>();
    for (const entry of filtered) {
      const list = map.get(entry.dateKey) ?? [];
      list.push(entry);
      map.set(entry.dateKey, list);
    }
    // Sort entries within each day newest-first
    for (const entries of map.values()) {
      entries.sort((a, b) => b.sortTime.localeCompare(a.sortTime));
    }
    return map;
  }, [allEntries, activeTypes]);

  const sortedDates = useMemo(
    () => [...groupedByDate.keys()].sort().reverse(),
    [groupedByDate],
  );

  function toggleDay(dateKey: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  function toggleType(type: LogType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type) && next.size > 1) next.delete(type); // keep at least one
      else next.add(type);
      return next;
    });
  }

  async function handleDelete(type: LogType, id: string) {
    setDeleteError(null);
    const endpoints: Record<LogType, string> = {
      symptom: `/api/symptom-logs/${id}`,
      mood: `/api/mood-logs/${id}`,
      medication: `/api/medication-logs/${id}`,
      habit: `/api/habit-logs/${id}`,
    };
    try {
      await api.delete(endpoints[type]);
      setConfirmDelete(null);
      setRefreshKey((k) => k + 1);
    } catch {
      setDeleteError('Delete failed. Please try again.');
    }
  }

  function renderEntryDetail(entry: HistoryEntry): string {
    switch (entry.type) {
      case 'symptom': {
        const s = symptomMap.get(entry.log.symptomId);
        return `${s?.name ?? 'Unknown symptom'} — Severity ${entry.log.severity}/10`;
      }
      case 'mood': {
        const parts = [`Mood ${entry.log.moodScore}/5`];
        if (entry.log.energyLevel !== null) parts.push(`Energy ${entry.log.energyLevel}/5`);
        if (entry.log.stressLevel !== null) parts.push(`Stress ${entry.log.stressLevel}/5`);
        return parts.join(' · ');
      }
      case 'medication': {
        const m = medicationMap.get(entry.log.medicationId);
        const name = m
          ? `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`
          : 'Unknown medication';
        return `${name} — ${entry.log.taken ? 'Taken' : 'Skipped'}`;
      }
      case 'habit': {
        const h = habitMap.get(entry.log.habitId);
        let value = '';
        if (h?.trackingType === 'boolean') value = entry.log.valueBoolean ? 'Done' : 'Skipped';
        else if (h?.trackingType === 'numeric')
          value = `${entry.log.valueNumeric}${h.unit ? ` ${h.unit}` : ''}`;
        else if (h?.trackingType === 'duration') value = `${entry.log.valueDuration} min`;
        return `${h?.name ?? 'Unknown habit'} — ${value}`;
      }
    }
  }

  function getEntryTime(entry: HistoryEntry): string {
    if (entry.type === 'medication') {
      return entry.log.takenAt
        ? formatTime(entry.log.takenAt)
        : formatTime(entry.log.createdAt);
    }
    return formatTime(entry.log.loggedAt);
  }

  function openEditModal(entry: HistoryEntry) {
    if (entry.type === 'symptom') setEditTarget({ type: 'symptom', log: entry.log });
    else if (entry.type === 'mood') setEditTarget({ type: 'mood', log: entry.log });
    else if (entry.type === 'medication') setEditTarget({ type: 'medication', log: entry.log });
    else setEditTarget({ type: 'habit', log: entry.log });
  }

  function handleEditSuccess() {
    setEditTarget(null);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-gray-100">History</h1>

      {/* Type filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TYPE_FILTERS.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTypes.has(type)
                ? TYPE_COLORS[type]
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {deleteError && (
        <p role="alert" className="mb-4 rounded-md bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          {deleteError}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      ) : fetchError ? (
        <p className="text-sm text-rose-600">{fetchError}</p>
      ) : sortedDates.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No entries found. Start logging to see your history here.
        </p>
      ) : (
        <div className="space-y-3">
          {sortedDates.map((dateKey) => {
            const entries = groupedByDate.get(dateKey)!;
            const isExpanded = expandedDays.has(dateKey);

            return (
              <div key={dateKey} className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm">
                {/* Day header — click to collapse / expand */}
                <button
                  onClick={() => toggleDay(dateKey)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div>
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {formatDayHeading(dateKey)}
                    </span>
                    <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">
                      {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {/* Entry rows */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    {entries.map((entry) => {
                      const isConfirming =
                        confirmDelete?.id === entry.id && confirmDelete?.type === entry.type;

                      return (
                        <div
                          key={`${entry.type}-${entry.id}`}
                          className="flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 px-5 py-3 last:border-b-0"
                        >
                          {/* Type badge */}
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[entry.type]}`}
                          >
                            {TYPE_LABELS[entry.type]}
                          </span>

                          {/* Entry detail text */}
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                            {renderEntryDetail(entry)}
                          </span>

                          {/* Timestamp */}
                          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                            {getEntryTime(entry)}
                          </span>

                          {/* Inline delete confirmation or Edit/Delete buttons */}
                          {isConfirming ? (
                            <div className="flex shrink-0 items-center gap-2 text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Delete?</span>
                              <button
                                onClick={() => void handleDelete(entry.type, entry.id)}
                                className="font-medium text-rose-600 hover:text-rose-700"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex shrink-0 gap-3 text-xs">
                              <button
                                onClick={() => openEditModal(entry)}
                                className="font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmDelete({ id: entry.id, type: entry.type })
                                }
                                className="font-medium text-gray-400 hover:text-rose-500"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modals — opened when clicking Edit on a history entry */}
      <LogSymptomModal
        isOpen={editTarget?.type === 'symptom'}
        onClose={() => setEditTarget(null)}
        onSuccess={handleEditSuccess}
        log={editTarget?.type === 'symptom' ? editTarget.log : undefined}
      />
      <LogMoodModal
        isOpen={editTarget?.type === 'mood'}
        onClose={() => setEditTarget(null)}
        onSuccess={handleEditSuccess}
        log={editTarget?.type === 'mood' ? editTarget.log : undefined}
      />
      <LogMedicationModal
        isOpen={editTarget?.type === 'medication'}
        onClose={() => setEditTarget(null)}
        onSuccess={handleEditSuccess}
        log={editTarget?.type === 'medication' ? editTarget.log : undefined}
      />
      <LogHabitModal
        isOpen={editTarget?.type === 'habit'}
        onClose={() => setEditTarget(null)}
        onSuccess={handleEditSuccess}
        log={editTarget?.type === 'habit' ? editTarget.log : undefined}
      />
    </div>
  );
}
