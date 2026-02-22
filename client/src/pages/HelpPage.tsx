import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: { section: string; items: FaqItem[] }[] = [
  {
    section: 'Logging',
    items: [
      {
        question: 'How do I log a symptom?',
        answer:
          'From the Dashboard, click "+ Log symptom" to open the log form. Select a symptom from the dropdown, set a severity from 1 (mild) to 10 (severe), optionally add notes, and pick a date and time. Click Save to record it.',
      },
      {
        question: 'Can I log entries for past dates?',
        answer:
          'Yes. Every logging form has a date and time picker that defaults to right now. Tap or click the date/time field to choose any past date.',
      },
      {
        question: 'How do I edit or delete a log entry?',
        answer:
          'Go to the History page, find the entry you want to change, and click Edit to open the pre-filled form or Delete to remove it (you will be asked to confirm).',
      },
      {
        question: 'What is the difference between a symptom and a habit?',
        answer:
          'Symptoms track things that happen to you (e.g., headache severity). Habits track things you do intentionally (e.g., hours of sleep, glasses of water). Both support optional notes and backfilling.',
      },
    ],
  },
  {
    section: 'Trends & Charts',
    items: [
      {
        question: 'How do I view my trends?',
        answer:
          'Click Trends in the sidebar (or bottom navigation on mobile). You can select a date range of 7, 30, 60, 90, 120, or 365 days. Charts update automatically when you change the range.',
      },
      {
        question: 'What does the Correlation chart do?',
        answer:
          'The Correlation chart lets you plot any two metrics on the same chart — for example, Mood vs a specific symptom — to spot patterns over time. Use the two dropdowns to choose your metrics.',
      },
      {
        question: 'What does the Activity heatmap show?',
        answer:
          'The heatmap shows a square for every day in the selected range. Darker squares mean more log entries were recorded that day. Hover or tap a square to see the exact count.',
      },
    ],
  },
  {
    section: 'Exporting Data',
    items: [
      {
        question: 'How do I export my data?',
        answer:
          'Go to Settings → Export. Optionally set a start and end date, then click Download CSV. The file will include all your logs grouped by type.',
      },
      {
        question: 'What format is the export?',
        answer:
          'Data is exported as a single CSV file with separate sections for Symptom Logs, Mood Logs, Medication Logs, and Habit Logs.',
      },
    ],
  },
  {
    section: 'Account & Settings',
    items: [
      {
        question: 'How do I add a custom symptom or habit?',
        answer:
          'Go to Settings → Symptoms (or Habits). Scroll to the "Add custom" form at the bottom, fill in the name and optional details, then click Add.',
      },
      {
        question: 'How do I hide a symptom or habit I do not use?',
        answer:
          'In Settings → Symptoms or Habits, toggle the switch next to any item to deactivate it. It will no longer appear in the log form until you reactivate it.',
      },
      {
        question: 'How do I delete my account?',
        answer:
          'Go to Settings → Account. Enter your email address to confirm, then click "Delete my account". This permanently removes your account and all data and cannot be undone.',
      },
    ],
  },
];

function FaqAccordion({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {item.question}
        </span>
        <span className="mt-0.5 shrink-0 text-xs text-gray-400 dark:text-gray-500">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          {item.answer}
        </p>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-gray-100">Help</h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        Frequently asked questions about using WellTrack.
      </p>

      <div className="space-y-6">
        {FAQS.map(({ section, items }) => (
          <div key={section} className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-700 dark:text-gray-200">
              {section}
            </h2>
            <div>
              {items.map((item) => (
                <FaqAccordion key={item.question} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
