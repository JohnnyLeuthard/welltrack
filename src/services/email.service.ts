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
