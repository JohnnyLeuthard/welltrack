import { useEffect, useRef, useState } from 'react';
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

  // Inline create-symptom state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSymptomName, setNewSymptomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const newSymptomInputRef = useRef<HTMLInputElement>(null);

  const noSymptoms = !loadingSymptoms && symptoms.length === 0;

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

  // Focus the new symptom input when the inline form appears
  useEffect(() => {
    if (showCreateForm) {
      newSymptomInputRef.current?.focus();
    }
  }, [showCreateForm]);

  // Pre-fill form fields when opening
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setShowCreateForm(false);
    setNewSymptomName('');
    setCreateError(null);
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

  async function handleCreateSymptom(e: React.FormEvent) {
    e.preventDefault();
    if (!newSymptomName.trim()) return;
    setCreateError(null);
    setIsCreating(true);
    try {
      const res = await api.post<Symptom>('/api/symptoms', { name: newSymptomName.trim() });
      const created = res.data;
      setSymptoms((prev) => [...prev, created]);
      setSymptomId(created.id);
      setShowCreateForm(false);
      setNewSymptomName('');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setCreateError((err.response?.data as ApiError)?.error ?? 'Failed to create symptom.');
      } else {
        setCreateError('Failed to create symptom.');
      }
    } finally {
      setIsCreating(false);
    }
  }

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
          <p role="alert" className="rounded-md bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        {noSymptoms && !showCreateForm && (
          <p className="rounded-md bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            No symptoms found. Use the &ldquo;+ New&rdquo; button below to add one.
          </p>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Symptom</label>
            {!log && !showCreateForm && (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
              >
                + New
              </button>
            )}
          </div>

          {showCreateForm ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  ref={newSymptomInputRef}
                  type="text"
                  value={newSymptomName}
                  onChange={(e) => setNewSymptomName(e.target.value)}
                  placeholder="Symptom name…"
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={(e) => void handleCreateSymptom(e as unknown as React.FormEvent)}
                  disabled={isCreating || !newSymptomName.trim()}
                  className="rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {isCreating ? '…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setNewSymptomName(''); setCreateError(null); }}
                  className="rounded-md border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
              {createError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{createError}</p>
              )}
            </div>
          ) : loadingSymptoms ? (
            <div className="h-9 animate-pulse rounded-md bg-gray-100 dark:bg-gray-700" />
          ) : (
            <select
              value={symptomId}
              onChange={(e) => setSymptomId(e.target.value)}
              required
              disabled={noSymptoms}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 dark:disabled:bg-gray-800"
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
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Severity:{' '}
            <span className="font-semibold text-teal-600 dark:text-teal-400">{severity}</span> / 10
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full accent-teal-500"
          />
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>1 – Mild</span>
            <span>10 – Severe</span>
          </div>
        </div>

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
            placeholder="Any additional details…"
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
            disabled={isSubmitting || !symptomId || showCreateForm}
            className="w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 sm:w-auto"
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
