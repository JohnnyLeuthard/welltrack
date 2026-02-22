import { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './Modal';
import api from '../services/api';
import type { ApiError, Habit, HabitLog } from '../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  log?: HabitLog; // when provided: edit mode (pre-fill + PATCH)
}

function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function LogHabitModal({ isOpen, onClose, onSuccess, log }: Props) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitId, setHabitId] = useState('');
  const [valueBoolean, setValueBoolean] = useState(true);
  const [valueNumeric, setValueNumeric] = useState<number | ''>('');
  const [valueDuration, setValueDuration] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState(() => toLocalDateTimeString(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingHabits, setLoadingHabits] = useState(false);

  const selectedHabit = habits.find((h) => h.id === habitId);

  // Fetch habit list when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoadingHabits(true);
    api
      .get<Habit[]>('/api/habits')
      .then((res) => {
        const active = res.data.filter((h) => h.isActive);
        setHabits(active);
        // In create mode, default to the first active habit
        if (!log && active.length > 0) {
          setHabitId((prev) => prev || active[0]!.id);
        }
      })
      .finally(() => setLoadingHabits(false));
  }, [isOpen, log]);

  // Pre-fill form fields when opening
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (log) {
      setHabitId(log.habitId);
      setValueBoolean(log.valueBoolean ?? true);
      setValueNumeric(log.valueNumeric ?? '');
      setValueDuration(log.valueDuration ?? '');
      setNotes(log.notes ?? '');
      setLoggedAt(toLocalDateTimeString(new Date(log.loggedAt)));
    } else {
      setHabitId('');
      setValueBoolean(true);
      setValueNumeric('');
      setValueDuration('');
      setNotes('');
      setLoggedAt(toLocalDateTimeString(new Date()));
    }
  }, [isOpen, log]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const body: Record<string, unknown> = {
      habitId,
      notes: notes || undefined,
      loggedAt: new Date(loggedAt).toISOString(),
    };
    if (selectedHabit?.trackingType === 'boolean') {
      body.valueBoolean = valueBoolean;
    } else if (selectedHabit?.trackingType === 'numeric') {
      body.valueNumeric = Number(valueNumeric);
    } else if (selectedHabit?.trackingType === 'duration') {
      body.valueDuration = Number(valueDuration);
    }
    try {
      if (log) {
        await api.patch(`/api/habit-logs/${log.id}`, body);
      } else {
        await api.post('/api/habit-logs', body);
      }
      onSuccess();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as ApiError)?.error ?? 'Failed to save. Please try again.');
      } else {
        setError('Failed to save. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const noHabits = !loadingHabits && habits.length === 0;
  const valueIsReady =
    !habitId ||
    selectedHabit?.trackingType === 'boolean' ||
    (selectedHabit?.trackingType === 'numeric' && valueNumeric !== '') ||
    (selectedHabit?.trackingType === 'duration' && valueDuration !== '');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={log ? 'Edit Habit Log' : 'Log Habit'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        )}

        {noHabits && (
          <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No active habits found. Add one in Settings first.
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Habit</label>
          {loadingHabits ? (
            <div className="h-9 animate-pulse rounded-md bg-gray-100" />
          ) : (
            <select
              value={habitId}
              onChange={(e) => {
                setHabitId(e.target.value);
                // Reset value fields when the user changes the habit selection
                setValueBoolean(true);
                setValueNumeric('');
                setValueDuration('');
              }}
              required
              disabled={noHabits}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50"
            >
              <option value="">Select a habit…</option>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Adaptive value input based on tracking_type */}
        {selectedHabit?.trackingType === 'boolean' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Did you do it?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setValueBoolean(true)}
                className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                  valueBoolean
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 text-gray-500 hover:border-teal-300'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setValueBoolean(false)}
                className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                  !valueBoolean
                    ? 'border-rose-400 bg-rose-50 text-rose-700'
                    : 'border-gray-200 text-gray-500 hover:border-rose-300'
                }`}
              >
                No
              </button>
            </div>
          </div>
        )}

        {selectedHabit?.trackingType === 'numeric' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Amount{selectedHabit.unit ? ` (${selectedHabit.unit})` : ''}
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={valueNumeric}
              onChange={(e) =>
                setValueNumeric(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="Enter amount…"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        )}

        {selectedHabit?.trackingType === 'duration' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={valueDuration}
              onChange={(e) =>
                setValueDuration(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="Enter minutes…"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date &amp; time</label>
          <input
            type="datetime-local"
            value={loggedAt}
            max={toLocalDateTimeString(new Date())}
            onChange={(e) => setLoggedAt(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional notes…"
            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md px-4 py-2 text-sm text-gray-600 hover:text-gray-800 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !habitId || noHabits || !valueIsReady}
            className="w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 sm:w-auto"
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
