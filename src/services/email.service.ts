/**
 * Email service stub.
 * Replace the console.log calls here with a real Nodemailer transport
 * (or a transactional email provider SDK like Resend / SendGrid) when
 * you're ready to send real emails.
 */

export function sendPasswordResetEmail(to: string, resetUrl: string): void {
  console.log(`[EMAIL STUB] To: ${to}`);
  console.log(`[EMAIL STUB] Subject: Reset your WellTrack password`);
  console.log(`[EMAIL STUB] Body: Click the link to reset your password: ${resetUrl}`);
  console.log(`[EMAIL STUB] (Link expires in 1 hour)`);
}

export interface DigestEmailData {
  weekStart: string;
  weekEnd: string;
  daysLogged: number;
  totalEntries: number;
  symptomLogs: number;
  moodLogs: number;
  medicationLogs: number;
  habitLogs: number;
  avgMood: number | null;
  avgEnergy: number | null;
  avgStress: number | null;
  currentStreak: number;
}

export function sendWeeklyDigestEmail(
  to: string,
  data: DigestEmailData,
  unsubscribeUrl: string,
): void {
  const fmt = (n: number | null) => (n !== null ? n.toFixed(1) : '—');

  console.log(`[EMAIL STUB] To: ${to}`);
  console.log(`[EMAIL STUB] Subject: Your WellTrack weekly wellness summary`);
  console.log(`[EMAIL STUB] Week: ${data.weekStart} → ${data.weekEnd}`);
  console.log(`[EMAIL STUB] Days logged: ${data.daysLogged} | Total entries: ${data.totalEntries}`);
  console.log(
    `[EMAIL STUB] Breakdown — Symptoms: ${data.symptomLogs}, Mood: ${data.moodLogs}, ` +
    `Medications: ${data.medicationLogs}, Habits: ${data.habitLogs}`,
  );
  console.log(
    `[EMAIL STUB] Averages — Mood: ${fmt(data.avgMood)}, Energy: ${fmt(data.avgEnergy)}, ` +
    `Stress: ${fmt(data.avgStress)}`,
  );
  console.log(`[EMAIL STUB] Current streak: ${data.currentStreak} day(s)`);
  console.log(`[EMAIL STUB] Unsubscribe: ${unsubscribeUrl}`);
}
