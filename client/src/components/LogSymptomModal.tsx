import { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './Modal';
import api from '../services/api';
import type { ApiError, Symptom, SymptomLog } from '../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  log?: SymptomLog; // when provided: edit mode (pre-fill + PATCH)
}

function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function LogSymptomModal({ isOpen, onClose, onSuccess, log }: Props) {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [symptomId, setSymptomId] = useState('');
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState(() => toLocalDateTimeString(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSymptoms, setLoadingSymptoms] = useState(false);

  // Fetch symptom list when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoadingSymptoms(true);
    api
      .get<Symptom[]>('/api/symptoms')
      .then((res) => {
        setSymptoms(res.data);
        // In create mode, default to the first symptom if nothing selected
        if (!log && res.data.length > 0) {
          setSymptomId((prev) => prev || res.data[0]!.id);
        }
      })
      .finally(() => setLoadingSymptoms(false));
  }, [isOpen, log]);

  // Pre-fill form fields when opening
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (log) {
      setSymptomId(log.symptomId);
      setSeverity(log.severity);
      setNotes(log.notes ?? '');
      setLoggedAt(toLocalDateTimeString(new Date(log.loggedAt)));
    } else {
      setSymptomId('');
      setSeverity(5);
      setNotes('');
      setLoggedAt(toLocalDateTimeString(new Date()));
    }
  }, [isOpen, log]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const body = {
      symptomId,
      severity,
      notes: notes || undefined,
      loggedAt: new Date(loggedAt).toISOString(),
    };
    try {
      if (log) {
        await api.patch(`/api/symptom-logs/${log.id}`, body);
      } else {
        await api.post('/api/symptom-logs', body);
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
    <Modal isOpen={isOpen} onClose={onClose} title={log ? 'Edit Symptom Log' : 'Log Symptom'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Symptom</label>
          {loadingSymptoms ? (
            <div className="h-9 animate-pulse rounded-md bg-gray-100" />
          ) : (
            <select
              value={symptomId}
              onChange={(e) => setSymptomId(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Select a symptom…</option>
              {symptoms.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Severity:{' '}
            <span className="font-semibold text-teal-600">{severity}</span> / 10
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full accent-teal-500"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1 – Mild</span>
            <span>10 – Severe</span>
          </div>
        </div>

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
            placeholder="Any additional details…"
            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !symptomId}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
