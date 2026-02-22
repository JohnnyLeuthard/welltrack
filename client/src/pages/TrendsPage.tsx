import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../services/api';
import type { ActivityPoint, Symptom, TrendPoint } from '../types/api';

type Days = 7 | 30 | 60 | 90 | 120 | 365;

const DAY_OPTIONS: Days[] = [7, 30, 60, 90, 120, 365];

// Metrics that use a 1–5 scale; all others (symptom UUIDs) use 1–10
const FIXED_METRIC_IDS = new Set(['mood', 'energy', 'stress']);

function metricDomain(id: string): [number, number] {
  return FIXED_METRIC_IDS.has(id) ? [1, 5] : [1, 10];
}

// Mood chart line colours
const MOOD_LINES = [
  { key: 'mood', label: 'Mood', color: '#f59e0b' },
  { key: 'energy', label: 'Energy', color: '#14b8a6' },
  { key: 'stress', label: 'Stress', color: '#f43f5e' },
] as const;

// Symptom line palette (cycles if more than 6 selected)
const SYMPTOM_COLORS = [
  '#8b5cf6',
  '#0ea5e9',
  '#f97316',
  '#10b981',
  '#ec4899',
  '#6366f1',
];

// Heatmap: 0 = no entries, 1 = low, 2 = medium, 3 = high
function activityLevel(count: number): 0 | 1 | 2 | 3 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  return 3;
}

const HEAT_COLORS: Record<0 | 1 | 2 | 3, string> = {
  0: 'bg-gray-100 dark:bg-gray-700',
  1: 'bg-teal-200 dark:bg-teal-800',
  2: 'bg-teal-400 dark:bg-teal-600',
  3: 'bg-teal-600 dark:bg-teal-400',
};

function formatAxisDate(date: string, days: Days): string {
  const d = new Date(date + 'T12:00:00');
  if (days === 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
  }
  if (days === 365) {
    return d.toLocaleDateString('en-US', { month: 'short' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTooltipDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Merge multiple TrendPoint arrays by date into a single array of objects
function mergeByDate(
  datasets: { key: string; points: TrendPoint[] }[],
): Record<string, number | string>[] {
  const dateMap = new Map<string, Record<string, number | string>>();
  for (const { key, points } of datasets) {
    for (const pt of points) {
      const row = dateMap.get(pt.date) ?? { date: pt.date };
      row[key] = Math.round(pt.avg * 10) / 10;
      dateMap.set(pt.date, row);
    }
  }
  return [...dateMap.values()].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
}

// Build the full date range as day strings for the heatmap grid
function buildDateRange(days: Days): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().split('T')[0]!);
  }
  return result;
}

export default function TrendsPage() {
  const [days, setDays] = useState<Days>(30);

  // Symptoms for selector
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<Set<string>>(new Set());

  // Trend data
  const [moodTrends, setMoodTrends] = useState<Record<string, TrendPoint[]>>({});
  const [symptomTrends, setSymptomTrends] = useState<Record<string, TrendPoint[]>>({});
  const [activity, setActivity] = useState<ActivityPoint[]>([]);

  // Correlation chart state
  const [corrMetricA, setCorrMetricA] = useState('mood');
  const [corrMetricB, setCorrMetricB] = useState('energy');
  const [corrTrends, setCorrTrends] = useState<Record<string, TrendPoint[]>>({});
  const [corrLoading, setCorrLoading] = useState(false);

  // Loading / error state
  const [symptomsLoading, setSymptomsLoading] = useState(true);
  const [moodLoading, setMoodLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [symptomTrendLoading, setSymptomTrendLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Load symptoms once
  useEffect(() => {
    setSymptomsLoading(true);
    api
      .get<Symptom[]>('/api/symptoms')
      .then((r) => setSymptoms(r.data))
      .catch(() => setFetchError('Failed to load symptoms.'))
      .finally(() => setSymptomsLoading(false));
  }, []);

  // Load mood + activity trends whenever days changes
  useEffect(() => {
    setMoodLoading(true);
    setActivityLoading(true);
    setFetchError(null);

    Promise.all([
      api.get<TrendPoint[]>(`/api/insights/trends?type=mood&days=${days}`),
      api.get<TrendPoint[]>(`/api/insights/trends?type=energy&days=${days}`),
      api.get<TrendPoint[]>(`/api/insights/trends?type=stress&days=${days}`),
    ])
      .then(([mood, energy, stress]) => {
        setMoodTrends({
          mood: mood.data,
          energy: energy.data,
          stress: stress.data,
        });
      })
      .catch(() => setFetchError('Failed to load mood trends.'))
      .finally(() => setMoodLoading(false));

    api
      .get<ActivityPoint[]>(`/api/insights/activity?days=${days}`)
      .then((r) => setActivity(r.data))
      .catch(() => setFetchError('Failed to load activity data.'))
      .finally(() => setActivityLoading(false));
  }, [days]);

  // Load symptom trend data for selected symptoms whenever selection or days changes
  useEffect(() => {
    if (selectedSymptomIds.size === 0) return;
    setSymptomTrendLoading(true);
    Promise.all(
      [...selectedSymptomIds].map((id) =>
        api
          .get<TrendPoint[]>(`/api/insights/trends?type=${id}&days=${days}`)
          .then((r) => ({ id, data: r.data })),
      ),
    )
      .then((results) => {
        const map: Record<string, TrendPoint[]> = {};
        for (const { id, data } of results) {
          map[id] = data;
        }
        setSymptomTrends(map);
      })
      .catch(() => setFetchError('Failed to load symptom trends.'))
      .finally(() => setSymptomTrendLoading(false));
  }, [selectedSymptomIds, days]);

  // Load correlation trend data whenever selections or days change
  useEffect(() => {
    setCorrLoading(true);
    setCorrTrends({});
    Promise.all([
      api.get<TrendPoint[]>(`/api/insights/trends?type=${corrMetricA}&days=${days}`),
      api.get<TrendPoint[]>(`/api/insights/trends?type=${corrMetricB}&days=${days}`),
    ])
      .then(([a, b]) => {
        setCorrTrends({ [corrMetricA]: a.data, [corrMetricB]: b.data });
      })
      .catch(() => setFetchError('Failed to load correlation data.'))
      .finally(() => setCorrLoading(false));
  }, [corrMetricA, corrMetricB, days]);

  function toggleSymptom(id: string) {
    setSelectedSymptomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Derived: merged mood chart data
  const moodChartData = useMemo(
    () =>
      mergeByDate(
        MOOD_LINES.map((l) => ({ key: l.key, points: moodTrends[l.key] ?? [] })),
      ),
    [moodTrends],
  );

  // Derived: merged symptom chart data
  const symptomChartData = useMemo(() => {
    const datasets = [...selectedSymptomIds].map((id) => ({
      key: id,
      points: symptomTrends[id] ?? [],
    }));
    return mergeByDate(datasets);
  }, [selectedSymptomIds, symptomTrends]);

  // Derived: merged correlation chart data
  const corrChartData = useMemo(
    () =>
      mergeByDate([
        { key: corrMetricA, points: corrTrends[corrMetricA] ?? [] },
        { key: corrMetricB, points: corrTrends[corrMetricB] ?? [] },
      ]),
    [corrMetricA, corrMetricB, corrTrends],
  );

  // Helper: human-readable metric label
  function getMetricLabel(id: string): string {
    const fixed: Record<string, string> = { mood: 'Mood', energy: 'Energy', stress: 'Stress' };
    return fixed[id] ?? symptoms.find((s) => s.id === id)?.name ?? id;
  }

  // Derived: activity lookup by date
  const activityByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const pt of activity) {
      map.set(pt.date, pt.count);
    }
    return map;
  }, [activity]);

  const dateRange = useMemo(() => buildDateRange(days), [days]);

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Trends</h1>

        {/* Date range selector */}
        <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {fetchError && (
        <p role="alert" className="rounded-md bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          {fetchError}
        </p>
      )}

      {/* ── Mood / Energy / Stress chart ── */}
      <section className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-700 dark:text-gray-200">Mood, Energy & Stress</h2>
        {moodLoading ? (
          <div className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
        ) : moodChartData.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No mood data logged in this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={moodChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => formatAxisDate(v, days)}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={24}
              />
              <Tooltip
                labelFormatter={(v) => formatTooltipDate(String(v))}
                contentStyle={{ borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#f3f4f6', fontSize: 12 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              {MOOD_LINES.map((l) => (
                <Line
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  name={l.label}
                  stroke={l.color}
                  strokeWidth={2}
                  dot={days === 7}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Symptom severity chart ── */}
      <section className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-700 dark:text-gray-200">Symptom Severity</h2>

        {/* Symptom selector */}
        {symptomsLoading ? (
          <div className="mb-4 flex gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-7 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-gray-700" />
            ))}
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap gap-2">
            {symptoms.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSymptom(s.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedSymptomIds.has(s.id)
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {selectedSymptomIds.size === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Select one or more symptoms above to chart their severity over time.
          </p>
        ) : symptomTrendLoading ? (
          <div className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
        ) : symptomChartData.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No data logged for the selected symptoms in this period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={symptomChartData}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => formatAxisDate(v, days)}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[1, 10]}
                ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={24}
              />
              <Tooltip
                labelFormatter={(v) => formatTooltipDate(String(v))}
                contentStyle={{ borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#f3f4f6', fontSize: 12 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              {[...selectedSymptomIds].map((id, i) => {
                const name = symptoms.find((s) => s.id === id)?.name ?? id;
                return (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={name}
                    stroke={SYMPTOM_COLORS[i % SYMPTOM_COLORS.length]}
                    strokeWidth={2}
                    dot={days === 7}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Correlation chart ── */}
      <section className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-gray-700 dark:text-gray-200">
          Correlation
        </h2>
        <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
          Compare any two metrics on the same chart to spot patterns.
        </p>

        {/* Metric selectors */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Metric A</label>
            <select
              value={corrMetricA}
              onChange={(e) => setCorrMetricA(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <optgroup label="Mood & Wellbeing">
                <option value="mood">Mood</option>
                <option value="energy">Energy</option>
                <option value="stress">Stress</option>
              </optgroup>
              {symptoms.length > 0 && (
                <optgroup label="Symptoms">
                  {symptoms.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <span className="text-sm text-gray-400 dark:text-gray-500">vs</span>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Metric B</label>
            <select
              value={corrMetricB}
              onChange={(e) => setCorrMetricB(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <optgroup label="Mood & Wellbeing">
                <option value="mood">Mood</option>
                <option value="energy">Energy</option>
                <option value="stress">Stress</option>
              </optgroup>
              {symptoms.length > 0 && (
                <optgroup label="Symptoms">
                  {symptoms.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {corrLoading ? (
          <div className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
        ) : corrChartData.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No data logged for the selected metrics in this period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={corrChartData} margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => formatAxisDate(v, days)}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                domain={metricDomain(corrMetricA)}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={24}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={metricDomain(corrMetricB)}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={24}
              />
              <Tooltip
                labelFormatter={(v) => formatTooltipDate(String(v))}
                contentStyle={{ borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#f3f4f6', fontSize: 12 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey={corrMetricA}
                name={getMetricLabel(corrMetricA)}
                stroke="#14b8a6"
                strokeWidth={2}
                dot={days === 7}
                activeDot={{ r: 4 }}
                connectNulls
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={corrMetricB}
                name={getMetricLabel(corrMetricB)}
                stroke="#f59e0b"
                strokeWidth={2}
                dot={days === 7}
                activeDot={{ r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Activity calendar heatmap ── */}
      <section className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-gray-700 dark:text-gray-200">Logging Activity</h2>
        <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
          Total entries logged per day across all categories
        </p>

        {activityLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
        ) : (
          <>
            {/* Heatmap grid — one square per day */}
            <div
              className="flex flex-wrap gap-1"
              role="grid"
              aria-label="Activity heatmap"
            >
              {dateRange.map((date) => {
                const count = activityByDate.get(date) ?? 0;
                const level = activityLevel(count);
                return (
                  <div
                    key={date}
                    role="gridcell"
                    title={`${formatTooltipDate(date)}: ${count} ${count === 1 ? 'entry' : 'entries'}`}
                    className={`h-5 w-5 rounded-sm ${HEAT_COLORS[level]} cursor-default transition-opacity hover:opacity-80`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span>Less</span>
              {([0, 1, 2, 3] as const).map((l) => (
                <div key={l} className={`h-4 w-4 rounded-sm ${HEAT_COLORS[l]}`} />
              ))}
              <span>More</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
