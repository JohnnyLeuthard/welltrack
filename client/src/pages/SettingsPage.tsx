import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { ApiError, AuditLogEntry, Habit, ImportResult, Medication, Symptom, UserProfile } from '../types/api';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

type Section = 'profile' | 'symptoms' | 'habits' | 'medications' | 'export' | 'notifications' | 'appearance' | 'audit-log' | 'account';

const NAV: { key: Section; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'symptoms', label: 'Symptoms' },
  { key: 'habits', label: 'Habits' },
  { key: 'medications', label: 'Medications' },
  { key: 'export', label: 'Export' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'audit-log', label: 'Activity Log' },
  { key: 'account', label: 'Account' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function apiError(err: unknown): string {
  return (err as { response?: { data?: ApiError } }).response?.data?.error ?? 'Something went wrong';
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-gray-100">{children}</h2>;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

// Build timezone list and guarantee "UTC" is always present at the top.
// Intl.supportedValuesOf may omit the plain "UTC" identifier on some Chrome builds.
const TIMEZONES: string[] = (() => {
  const tzs = Intl.supportedValuesOf('timeZone');
  return tzs.includes('UTC') ? tzs : ['UTC', ...tzs];
})();

function ProfileSection() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [timezone, setTimezone] = useState('');
  const [email, setEmail] = useState('');
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
        setPronouns(r.data.pronouns ?? '');
        setPhoneNumber(r.data.phoneNumber ?? '');
        setTimezone(r.data.timezone);
        setEmail(r.data.email);
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
      const body: Record<string, unknown> = { displayName: displayName || null, pronouns: pronouns || null, phoneNumber: phoneNumber || null, timezone };
      if (email && profile && email !== profile.email) body.email = email;
      const res = await api.patch<UserProfile>('/api/users/me', body);
      setProfile(res.data);
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
      {profile?.lastLoginAt && (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Last login:{' '}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {new Date(profile.lastLoginAt).toLocaleString()}
          </span>
        </p>
      )}
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="pronouns">
            Pronouns
          </label>
          <input
            id="pronouns"
            type="text"
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            placeholder="e.g. she/her, they/them"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="phoneNumber">
            Phone number
          </label>
          <input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 555 000 0000"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="timezone">
            Timezone
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
          {[1, 2, 3].map((n) => <div key={n} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />)}
        </div>
      ) : (
        <ul className="mb-6 divide-y divide-gray-100 dark:divide-gray-700">
          {symptoms.map((s) => {
            const isSystem = s.userId === null;
            return (
              <li key={s.id} className="flex items-center gap-4 py-2.5">
                {isSystem ? (
                  <span
                    title="System default"
                    className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${s.isActive ? 'bg-teal-400' : 'bg-gray-300 dark:bg-gray-500'}`}
                  />
                ) : (
                  <button
                    role="switch"
                    aria-checked={s.isActive}
                    onClick={() => void handleToggle(s)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                      s.isActive ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        s.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{s.name}</span>
                {s.category && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-300">
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

      <form onSubmit={(e) => void handleAdd(e)} className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Add custom symptom
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Symptom name"
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category (optional)"
            className="w-40 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
          {[1, 2, 3].map((n) => <div key={n} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />)}
        </div>
      ) : (
        <ul className="mb-6 divide-y divide-gray-100 dark:divide-gray-700">
          {habits.map((h) => {
            const isSystem = h.userId === null;
            return (
              <li key={h.id} className="flex items-center gap-4 py-2.5">
                {isSystem ? (
                  <span
                    title="System default"
                    className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${h.isActive ? 'bg-teal-400' : 'bg-gray-300 dark:bg-gray-500'}`}
                  />
                ) : (
                  <button
                    role="switch"
                    aria-checked={h.isActive}
                    onClick={() => void handleToggle(h)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                      h.isActive ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        h.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{h.name}</span>
                <span className="rounded-full bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 text-xs text-teal-700 dark:text-teal-400">
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

      <form onSubmit={(e) => void handleAdd(e)} className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Add custom habit
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Habit name"
            className="min-w-32 flex-1 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as typeof newType)}
            className="rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
              className="w-32 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
            <div key={n} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      ) : medications.length === 0 ? (
        <p className="mb-4 text-sm text-gray-400">No medications added yet.</p>
      ) : (
        <ul className="mb-6 divide-y divide-gray-100 dark:divide-gray-700">
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
                      className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    <input
                      type="text"
                      value={editDosage}
                      onChange={(e) => setEditDosage(e.target.value)}
                      placeholder="Dosage"
                      className="w-28 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    <input
                      type="text"
                      value={editFrequency}
                      onChange={(e) => setEditFrequency(e.target.value)}
                      placeholder="Frequency"
                      className="w-28 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
                      className="rounded-lg border border-gray-200 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <button
                    role="switch"
                    aria-checked={m.isActive}
                    onClick={() => void handleToggle(m)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                      m.isActive ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        m.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div className="flex-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{m.name}</span>
                    {(m.dosage || m.frequency) && (
                      <span className="ml-2 text-xs text-gray-400">
                        {[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                  {!m.isActive && (
                    <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                      inactive
                    </span>
                  )}
                  {confirmDeleteId === m.id ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Delete?</span>
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

      <form onSubmit={(e) => void handleAdd(e)} className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Add medication
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Medication name"
            className="min-w-32 flex-1 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <input
            type="text"
            value={newDosage}
            onChange={(e) => setNewDosage(e.target.value)}
            placeholder="Dosage (optional)"
            className="w-36 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <input
            type="text"
            value={newFrequency}
            onChange={(e) => setNewFrequency(e.target.value)}
            placeholder="Frequency (optional)"
            className="w-36 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildQuery() {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return params.toString() ? `?${params.toString()}` : '';
  }

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsDownloading(true);
    try {
      const response = await api.get(`/api/export/csv${buildQuery()}`, { responseType: 'blob' });
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

  async function handleDownloadPdf() {
    setError(null);
    setIsDownloadingPdf(true);
    try {
      const response = await api.get(`/api/export/pdf${buildQuery()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0]!;
      link.setAttribute('download', `welltrack-export-${today}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('PDF export failed. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  return (
    <SectionCard>
      <SectionTitle>Export Data</SectionTitle>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Download all your logs as CSV or PDF. Leave the date fields blank to export everything.
      </p>
      <form onSubmit={(e) => void handleDownload(e)} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="exportStart">
              From
            </label>
            <input
              id="exportStart"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="exportEnd">
              To
            </label>
            <input
              id="exportEnd"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isDownloading || isDownloadingPdf}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isDownloading ? 'Preparing…' : 'Download CSV'}
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={isDownloading || isDownloadingPdf}
            className="rounded-lg border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 disabled:opacity-50"
          >
            {isDownloadingPdf ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ─── Import ───────────────────────────────────────────────────────────────────

function ImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSkipped =
    (result?.skipped.symptomLogs ?? 0) +
    (result?.skipped.moodLogs ?? 0) +
    (result?.skipped.medicationLogs ?? 0) +
    (result?.skipped.habitLogs ?? 0);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setResult(null);
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<ImportResult>('/api/import/csv', formData);
      setResult(response.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(apiError(err));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <SectionCard>
      <SectionTitle>Import Data</SectionTitle>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Upload a CSV file previously exported from WellTrack to backfill historical log data.
        Symptoms, habits, and medications referenced in the file must already exist in your account.
      </p>
      <form onSubmit={(e) => void handleImport(e)} className="space-y-4">
        <div>
          <label
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="importFile"
          >
            CSV file
          </label>
          <input
            id="importFile"
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 dark:file:bg-teal-900/30 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-teal-700 dark:file:text-teal-400 hover:file:bg-teal-100 dark:hover:file:bg-teal-900/50"
          />
        </div>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        {result && (
          <div className="rounded-lg border border-teal-100 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/20 p-4 text-sm space-y-1">
            <p className="font-medium text-teal-800 dark:text-teal-300">Import complete</p>
            <p className="text-teal-700 dark:text-teal-400">
              Imported: {result.imported.symptomLogs} symptom,{' '}
              {result.imported.moodLogs} mood,{' '}
              {result.imported.medicationLogs} medication,{' '}
              {result.imported.habitLogs} habit log(s)
            </p>
            {totalSkipped > 0 && (
              <p className="text-amber-700 dark:text-amber-400">
                Skipped: {totalSkipped} row(s)
              </p>
            )}
            {result.errors.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-amber-700 dark:text-amber-400">
                  {result.errors.length} row error(s) — click to expand
                </summary>
                <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                  {result.errors.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={!file || isImporting}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isImporting ? 'Importing…' : 'Import CSV'}
        </button>
      </form>
    </SectionCard>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsSection() {
  const [optIn, setOptIn] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<UserProfile>('/api/users/me')
      .then((r) => setOptIn(r.data.weeklyDigestOptIn))
      .catch(() => setError('Failed to load notification preferences.'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleToggle() {
    if (optIn === null) return;
    const next = !optIn;
    setIsSaving(true);
    setError('');
    setSuccess(false);
    try {
      const r = await api.patch<UserProfile>('/api/users/me', { weeklyDigestOptIn: next });
      setOptIn(r.data.weeklyDigestOptIn);
      setSuccess(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SectionCard>
      <SectionTitle>Notifications</SectionTitle>
      {isLoading ? (
        <div className="h-10 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-100">Weekly wellness digest</p>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Receive a weekly email every Monday summarising your logged activity, averages, and
                current streak. Includes a one-click unsubscribe link.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={optIn ?? false}
              onClick={handleToggle}
              disabled={isSaving}
              className={`relative mt-0.5 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
                optIn ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  optIn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {success && (
            <p className="text-sm text-teal-600 dark:text-teal-400">
              {optIn ? 'Weekly digest enabled.' : 'Weekly digest disabled.'}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Appearance ───────────────────────────────────────────────────────────────

function AppearanceSection() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <SectionCard>
      <SectionTitle>Appearance</SectionTitle>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark mode</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Switch between light and dark themes. Your preference is saved automatically.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={isDark}
          onClick={toggleTheme}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
            isDark ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              isDark ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

const AUDIT_ACTION_LABELS: Record<string, string> = {
  login: 'Signed in',
  password_change: 'Password changed',
  email_change: 'Email changed',
};

function AuditLogSection() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AuditLogEntry[]>('/api/users/me/audit-log')
      .then((r) => setEntries(r.data))
      .catch(() => setError('Failed to load activity log.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />;

  return (
    <SectionCard>
      <SectionTitle>Activity Log</SectionTitle>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {entries.length === 0 && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No activity recorded yet.</p>
      )}
      {entries.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
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
      <div className="rounded-lg border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-5">
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
              className="w-full rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
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
      <h1 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-gray-100">Settings</h1>

      {/* Tab nav */}
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
        {NAV.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              active === key
                ? 'border-b-2 border-teal-600 text-teal-700 dark:text-teal-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
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
      {active === 'export' && (
        <div className="space-y-6">
          <ExportSection />
          <ImportSection />
        </div>
      )}
      {active === 'notifications' && <NotificationsSection />}
      {active === 'appearance' && <AppearanceSection />}
      {active === 'audit-log' && <AuditLogSection />}
      {active === 'account' && <AccountSection />}
    </div>
  );
}
