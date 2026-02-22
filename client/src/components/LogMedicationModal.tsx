import { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './Modal';
import api from '../services/api';
import type { ApiError, Medication, MedicationLog } from '../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  log?: MedicationLog; // when provided: edit mode (pre-fill + PATCH)
}

function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function LogMedicationModal({ isOpen, onClose, onSuccess, log }: Props) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationId, setMedicationId] = useState('');
  const [taken, setTaken] = useState(true);
  const [takenAt, setTakenAt] = useState(() => toLocalDateTimeString(new Date()));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMeds, setLoadingMeds] = useState(false);

  // Fetch medication list when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoadingMeds(true);
    api
      .get<Medication[]>('/api/medications')
      .then((res) => {
        const active = res.data.filter((m) => m.isActive);
        setMedications(active);
        // In create mode, default to the first active medication
        if (!log && active.length > 0) {
          setMedicationId((prev) => prev || active[0]!.id);
        }
      })
      .finally(() => setLoadingMeds(false));
  }, [isOpen, log]);

  // Pre-fill form fields when opening
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (log) {
      setMedicationId(log.medicationId);
      setTaken(log.taken);
      setTakenAt(
        log.takenAt
          ? toLocalDateTimeString(new Date(log.takenAt))
          : toLocalDateTimeString(new Date()),
      );
      setNotes(log.notes ?? '');
    } else {
      setMedicationId('');
      setTaken(true);
      setTakenAt(toLocalDateTimeString(new Date()));
      setNotes('');
    }
  }, [isOpen, log]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const body = {
      medicationId,
      taken,
      takenAt: taken ? new Date(takenAt).toISOString() : undefined,
      notes: notes || undefined,
    };
    try {
      if (log) {
        await api.patch(`/api/medication-logs/${log.id}`, body);
      } else {
        await api.post('/api/medication-logs', body);
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

  const noMeds = !loadingMeds && medications.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={log ? 'Edit Medication Log' : 'Log Medication'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        )}

        {noMeds && (
          <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No active medications found. Add one in Settings first.
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Medication</label>
          {loadingMeds ? (
            <div className="h-9 animate-pulse rounded-md bg-gray-100" />
          ) : (
            <select
              value={medicationId}
              onChange={(e) => setMedicationId(e.target.value)}
              required
              disabled={noMeds}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50"
            >
              <option value="">Select a medication…</option>
              {medications.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.dosage ? ` (${m.dosage})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Did you take it?</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTaken(true)}
              className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                taken
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 text-gray-500 hover:border-teal-300'
              }`}
            >
              Yes — taken
            </button>
            <button
              type="button"
              onClick={() => setTaken(false)}
              className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                !taken
                  ? 'border-rose-400 bg-rose-50 text-rose-700'
                  : 'border-gray-200 text-gray-500 hover:border-rose-300'
              }`}
            >
              No — skipped
            </button>
          </div>
        </div>

        {taken && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Taken at</label>
            <input
              type="datetime-local"
              value={takenAt}
              max={toLocalDateTimeString(new Date())}
              onChange={(e) => setTakenAt(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        )}

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
            disabled={isSubmitting || !medicationId || noMeds}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
