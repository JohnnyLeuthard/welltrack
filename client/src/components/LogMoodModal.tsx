import { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './Modal';
import api from '../services/api';
import type { ApiError, MoodLog } from '../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  log?: MoodLog; // when provided: edit mode (pre-fill + PATCH)
}

function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const MOOD_LABELS = ['', 'Very low', 'Low', 'Okay', 'Good', 'Great'];

function ScoreSelector({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
              value === n
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-teal-300 hover:text-teal-600'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {value !== null && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{MOOD_LABELS[value]}</p>
      )}
    </div>
  );
}

export default function LogMoodModal({ isOpen, onClose, onSuccess, log }: Props) {
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState(() => toLocalDateTimeString(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill form fields when opening
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (log) {
      setMoodScore(log.moodScore);
      setEnergyLevel(log.energyLevel);
      setStressLevel(log.stressLevel);
      setNotes(log.notes ?? '');
      setLoggedAt(toLocalDateTimeString(new Date(log.loggedAt)));
    } else {
      setMoodScore(null);
      setEnergyLevel(null);
      setStressLevel(null);
      setNotes('');
      setLoggedAt(toLocalDateTimeString(new Date()));
    }
  }, [isOpen, log]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (moodScore === null) return;
    setIsSubmitting(true);
    setError(null);
    const body = {
      moodScore,
      energyLevel: energyLevel ?? undefined,
      stressLevel: stressLevel ?? undefined,
      notes: notes || undefined,
      loggedAt: new Date(loggedAt).toISOString(),
    };
    try {
      if (log) {
        await api.patch(`/api/mood-logs/${log.id}`, body);
      } else {
        await api.post('/api/mood-logs', body);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={log ? 'Edit Mood Log' : 'Log Mood'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-md bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <ScoreSelector value={moodScore} onChange={setMoodScore} label="Mood *" />
        <ScoreSelector
          value={energyLevel}
          onChange={setEnergyLevel}
          label="Energy (optional)"
        />
        <ScoreSelector
          value={stressLevel}
          onChange={setStressLevel}
          label="Stress (optional)"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date &amp; time</label>
          <input
            type="datetime-local"
            value={loggedAt}
            max={toLocalDateTimeString(new Date())}
            onChange={(e) => setLoggedAt(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="How are you feeling?"
            className="w-full resize-none rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || moodScore === null}
            className="w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 sm:w-auto"
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
