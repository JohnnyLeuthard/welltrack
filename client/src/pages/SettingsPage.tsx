import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { ApiError, Habit, Medication, Symptom, UserProfile } from '../types/api';
import { useAuth } from '../hooks/useAuth';

type Section = 'profile' | 'symptoms' | 'habits' | 'medications' | 'export' | 'account';

const NAV: { key: Section; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'symptoms', label: 'Symptoms' },
  { key: 'habits', label: 'Habits' },
  { key: 'medications', label: 'Medications' },
  { key: 'export', label: 'Export' },
  { key: 'account', label: 'Account' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function apiError(err: unknown): string {
  return (err as { response?: { data?: ApiError } }).response?.data?.error ?? 'Something went wrong';
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-white p-6 shadow-sm">{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 text-base font-semibold text-gray-800">{children}</h2>;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

const TIMEZONES: string[] = Intl.supportedValuesOf('timeZone');

function ProfileSection() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api
      .get<UserProfile>('/api/users/me')
      .then((r) => {
        setProfile(r.data);
        setDisplayName(r.data.displayName ?? '');
        setTimezone(r.data.timezone);
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);
    try {
      await api.patch('/api/users/me', { displayName: displayName || null, timezone });
      setSuccess(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg bg-gray-100" />;

  return (
    <SectionCard>
      <SectionTitle>Profile</SectionTitle>
      {profile && (
        <p className="mb-4 text-sm text-gray-500">
          Account email: <span className="font-medium text-gray-700">{profile.email}</span>
        </p>
      )}
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="timezone">
            Timezone
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        )}
        {success && <p className="text-sm text-teal-600">Profile saved.</p>}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isSaving ? '…' : 'Save changes'}
        </button>
      </form>
    </SectionCard>
  );
}

// ─── Symptoms ─────────────────────────────────────────────────────────────────

function SymptomsSection() {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Symptom[]>('/api/symptoms')
      .then((r) => setSymptoms(r.data))
      .catch(() => setError('Failed to load symptoms.'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleToggle(s: Symptom) {
    setSymptoms((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      await api.patch(`/api/symptoms/${s.id}`, { isActive: !s.isActive });
    } catch {
      setSymptoms((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: s.isActive } : x)));
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/symptoms/${id}`);
      setSymptoms((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddError(null);
    setIsAdding(true);
    try {
      const r = await api.post<Symptom>('/api/symptoms', {
        name: newName.trim(),
        category: newCategory.trim() || undefined,
      });
      setSymptoms((prev) => [...prev, r.data]);
      setNewName('');
      setNewCategory('');
    } catch (err) {
      setAddError(apiError(err));
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <SectionCard>
      <SectionTitle>Symptoms</SectionTitle>
      {error && <p role="alert" className="mb-3 text-sm text-rose-600">{error}</p>}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => <div key={n} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      ) : (
        <ul className="mb-6 divide-y divide-gray-100">
          {symptoms.map((s) => {
            const isSystem = s.userId === null;
            return (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => !isSystem && void handleToggle(s)}
                  disabled={isSystem}
                  title={isSystem ? 'System default — cannot be toggled' : undefined}
                  className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                    s.isActive ? 'bg-teal-500' : 'bg-gray-200'
                  } ${isSystem ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      s.isActive ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="flex-1 text-sm text-gray-700">{s.name}</span>
                {s.category && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {s.category}
                  </span>
                )}
                {isSystem ? (
                  <span className="text-xs text-gray-400">system</span>
                ) : (
                  <button
                    onClick={() => void handleDelete(s.id)}
                    className="text-xs text-gray-400 hover:text-rose-500"
                  >
                    Delete
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={(e) => void handleAdd(e)} className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Add custom symptom
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Symptom name"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category (optional)"
            className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={isAdding || !newName.trim()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isAdding ? '…' : 'Add'}
          </button>
        </div>
        {addError && <p role="alert" className="mt-2 text-sm text-rose-600">{addError}</p>}
      </form>
    </SectionCard>
  );
}

// ─── Habits ───────────────────────────────────────────────────────────────────

function HabitsSection() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'boolean' | 'numeric' | 'duration'>('boolean');
  const [newUnit, setNewUnit] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Habit[]>('/api/habits')
      .then((r) => setHabits(r.data))
      .catch(() => setError('Failed to load habits.'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleToggle(h: Habit) {
    setHabits((prev) => prev.map((x) => (x.id === h.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      await api.patch(`/api/habits/${h.id}`, { isActive: !h.isActive });
    } catch {
      setHabits((prev) => prev.map((x) => (x.id === h.id ? { ...x, isActive: h.isActive } : x)));
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/habits/${id}`);
      setHabits((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddError(null);
    setIsAdding(true);
    try {
      const r = await api.post<Habit>('/api/habits', {
        name: newName.trim(),
        trackingType: newType,
        unit: newUnit.trim() || undefined,
      });
      setHabits((prev) => [...prev, r.data]);
      setNewName('');
      setNewUnit('');
      setNewType('boolean');
    } catch (err) {
      setAddError(apiError(err));
    } finally {
      setIsAdding(false);
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    boolean: 'Yes/No',
    numeric: 'Number',
    duration: 'Duration',
  };

  return (
    <SectionCard>
      <SectionTitle>Habits</SectionTitle>
      {error && <p role="alert" className="mb-3 text-sm text-rose-600">{error}</p>}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => <div key={n} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      ) : (
        <ul className="mb-6 divide-y divide-gray-100">
          {habits.map((h) => {
            const isSystem = h.userId === null;
            return (
              <li key={h.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => !isSystem && void handleToggle(h)}
                  disabled={isSystem}
                  title={isSystem ? 'System default — cannot be toggled' : undefined}
                  className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                    h.isActive ? 'bg-teal-500' : 'bg-gray-200'
                  } ${isSystem ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      h.isActive ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="flex-1 text-sm text-gray-700">{h.name}</span>
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                  {TYPE_LABELS[h.trackingType]}
                </span>
                {h.unit && <span className="text-xs text-gray-400">{h.unit}</span>}
                {isSystem ? (
                  <span className="text-xs text-gray-400">system</span>
                ) : (
                  <button
                    onClick={() => void handleDelete(h.id)}
                    className="text-xs text-gray-400 hover:text-rose-500"
                  >
                    Delete
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={(e) => void handleAdd(e)} className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Add custom habit
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Habit name"
            className="min-w-32 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as typeof newType)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          >
            <option value="boolean">Yes/No</option>
            <option value="numeric">Number</option>
            <option value="duration">Duration (min)</option>
          </select>
          {newType !== 'boolean' && (
            <input
              type="text"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="Unit (optional)"
              className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          )}
          <button
            type="submit"
            disabled={isAdding || !newName.trim()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isAdding ? '…' : 'Add'}
          </button>
        </div>
        {addError && <p role="alert" className="mt-2 text-sm text-rose-600">{addError}</p>}
      </form>
    </SectionCard>
  );
}

// ─── Medications ──────────────────────────────────────────────────────────────

function MedicationsSection() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDosage, setEditDosage] = useState('');
  const [editFrequency, setEditFrequency] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newFrequency, setNewFrequency] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Medication[]>('/api/medications?all=true')
      .then((r) => setMedications(r.data))
      .catch(() => setError('Failed to load medications.'))
      .finally(() => setIsLoading(false));
  }, []);

  function openEdit(m: Medication) {
    setEditId(m.id);
    setEditName(m.name);
    setEditDosage(m.dosage ?? '');
    setEditFrequency(m.frequency ?? '');
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    setEditError(null);
    setIsSavingEdit(true);
    try {
      const r = await api.patch<Medication>(`/api/medications/${id}`, {
        name: editName.trim(),
        dosage: editDosage.trim() || null,
        frequency: editFrequency.trim() || null,
      });
      setMedications((prev) => prev.map((m) => (m.id === id ? r.data : m)));
      setEditId(null);
    } catch (err) {
      setEditError(apiError(err));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleToggle(m: Medication) {
    setMedications((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, isActive: !x.isActive } : x)),
    );
    try {
      await api.patch(`/api/medications/${m.id}`, { isActive: !m.isActive });
    } catch {
      setMedications((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, isActive: m.isActive } : x)),
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/medications/${id}`);
      setMedications((prev) => prev.filter((m) => m.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddError(null);
    setIsAdding(true);
    try {
      const r = await api.post<Medication>('/api/medications', {
        name: newName.trim(),
        dosage: newDosage.trim() || undefined,
        frequency: newFrequency.trim() || undefined,
      });
      setMedications((prev) => [...prev, r.data]);
      setNewName('');
      setNewDosage('');
      setNewFrequency('');
    } catch (err) {
      setAddError(apiError(err));
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <SectionCard>
      <SectionTitle>Medications</SectionTitle>
      {error && <p role="alert" className="mb-3 text-sm text-rose-600">{error}</p>}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-12 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : medications.length === 0 ? (
        <p className="mb-4 text-sm text-gray-400">No medications added yet.</p>
      ) : (
        <ul className="mb-6 divide-y divide-gray-100">
          {medications.map((m) => (
            <li key={m.id} className="py-3">
              {editId === m.id ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    <input
                      type="text"
                      value={editDosage}
                      onChange={(e) => setEditDosage(e.target.value)}
                      placeholder="Dosage"
                      className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    <input
                      type="text"
                      value={editFrequency}
                      onChange={(e) => setEditFrequency(e.target.value)}
                      placeholder="Frequency"
                      className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  {editError && <p className="text-xs text-rose-600">{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleSaveEdit(m.id)}
                      disabled={isSavingEdit || !editName.trim()}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {isSavingEdit ? '…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => void handleToggle(m)}
                    className={`relative h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
                      m.isActive ? 'bg-teal-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        m.isActive ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">{m.name}</span>
                    {(m.dosage || m.frequency) && (
                      <span className="ml-2 text-xs text-gray-400">
                        {[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                  {!m.isActive && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                      inactive
                    </span>
                  )}
                  {confirmDeleteId === m.id ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">Delete?</span>
                      <button
                        onClick={() => void handleDelete(m.id)}
                        className="font-medium text-rose-600 hover:text-rose-700"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3 text-xs">
                      <button
                        onClick={() => openEdit(m)}
                        className="font-medium text-teal-600 hover:text-teal-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(m.id)}
                        className="text-gray-400 hover:text-rose-500"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void handleAdd(e)} className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Add medication
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Medication name"
            className="min-w-32 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <input
            type="text"
            value={newDosage}
            onChange={(e) => setNewDosage(e.target.value)}
            placeholder="Dosage (optional)"
            className="w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <input
            type="text"
            value={newFrequency}
            onChange={(e) => setNewFrequency(e.target.value)}
            placeholder="Frequency (optional)"
            className="w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={isAdding || !newName.trim()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isAdding ? '…' : 'Add'}
          </button>
        </div>
        {addError && <p role="alert" className="mt-2 text-sm text-rose-600">{addError}</p>}
      </form>
    </SectionCard>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

function ExportSection() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsDownloading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const query = params.toString() ? `?${params.toString()}` : '';

      const response = await api.get(`/api/export/csv${query}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0]!;
      link.setAttribute('download', `welltrack-export-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <SectionCard>
      <SectionTitle>Export Data</SectionTitle>
      <p className="mb-5 text-sm text-gray-500">
        Download all your logs as a CSV file. Leave the date fields blank to export everything.
      </p>
      <form onSubmit={(e) => void handleDownload(e)} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="exportStart">
              From
            </label>
            <input
              id="exportStart"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="exportEnd">
              To
            </label>
            <input
              id="exportEnd"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={isDownloading}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isDownloading ? 'Preparing…' : 'Download CSV'}
        </button>
      </form>
    </SectionCard>
  );
}

// ─── Account ──────────────────────────────────────────────────────────────────

function AccountSection() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const emailMatches = confirmEmail === user?.email;

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!emailMatches) return;
    setError(null);
    setIsDeleting(true);
    try {
      await api.delete('/api/users/me');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(apiError(err));
      setIsDeleting(false);
    }
  }

  return (
    <SectionCard>
      <SectionTitle>Account</SectionTitle>
      <div className="rounded-lg border border-rose-100 bg-rose-50 p-5">
        <h3 className="mb-2 text-sm font-semibold text-rose-700">Delete Account</h3>
        <p className="mb-4 text-sm text-rose-600">
          This permanently deletes your account and all your data. This cannot be undone.
        </p>
        <form onSubmit={(e) => void handleDelete(e)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-rose-700" htmlFor="confirmEmail">
              Type your email to confirm:{' '}
              <span className="font-semibold">{user?.email}</span>
            </label>
            <input
              id="confirmEmail"
              ref={inputRef}
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={user?.email ?? 'your@email.com'}
              className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
            />
          </div>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={!emailMatches || isDeleting}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDeleting ? 'Deleting…' : 'Delete my account'}
          </button>
        </form>
      </div>
    </SectionCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<Section>('profile');

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-800">Settings</h1>

      {/* Tab nav */}
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
        {NAV.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              active === key
                ? 'border-b-2 border-teal-600 text-teal-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {active === 'profile' && <ProfileSection />}
      {active === 'symptoms' && <SymptomsSection />}
      {active === 'habits' && <HabitsSection />}
      {active === 'medications' && <MedicationsSection />}
      {active === 'export' && <ExportSection />}
      {active === 'account' && <AccountSection />}
    </div>
  );
}
