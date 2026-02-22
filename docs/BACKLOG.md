# BACKLOG.md — Future Feature Ideas

This file is a parking lot for features and improvements that aren't yet scheduled. Items here are **not committed work** — they're ideas worth revisiting.

## How to promote an idea to implementation

1. If the idea changes product scope, update `Requirements.md`
2. Add concrete checkboxes to `tasks.md` under the appropriate phase
3. **Delete the item from this file** (git history and the PR record serve as the audit trail)

---

## User Profile & Account

- [ ] Add pronouns field to profile
- [ ] Add phone number field to profile
- [ ] Profile picture upload (avatar)
- [ ] Allow user to change their email address
- [ ] Email verification — send a confirmation link; show a green verified badge on the profile once confirmed
- [ ] Show last login date/time on the profile page
- [ ] Two-factor authentication (TOTP / authenticator app)
- [ ] Account deletion with full data erasure (GDPR right-to-erasure)

## Trends & Analytics

- [ ] Add 60-day, 120-day, and 365-day options to the date range selector (currently 7/30/90)
- [ ] Correlation view — overlay two metrics (e.g., mood vs. energy) on the same chart
- [ ] Printable / shareable summary report for sharing with a healthcare provider
- [ ] Customizable dashboard — let users pin/unpin widgets and reorder cards

## Notifications & Reminders

- [ ] Daily logging reminder (email or push notification)
- [ ] Medication reminder alerts
- [ ] Streak milestone celebrations / badges (e.g., 7-day, 30-day streak)
- [ ] Weekly wellness summary email digest

## Data & Integrations

- [ ] PDF export of logs and trend charts
- [ ] Bulk CSV import of historical data
- [ ] Apple Health / Google Fit integration (read activity and sleep data)
- [ ] Wearable device sync (Fitbit, Garmin)

## App Experience & Support

- [ ] Help page — FAQs and how-to guides
- [ ] Contact us page — support form or mailto link
- [ ] In-app link to API documentation (e.g., Swagger/OpenAPI viewer)
- [ ] Dark mode / light-dark theme toggle
- [ ] Progressive Web App (PWA) — installable on mobile home screen, basic offline caching
- [ ] Multi-language / i18n support

## Platform & Infrastructure

- [ ] Admin dashboard — aggregate usage stats (no PII) for monitoring platform health
- [ ] Per-user rate limiting hardening (beyond global express-rate-limit)
- [ ] Audit log — record sensitive account events (password change, email change, new-device login)

## Documentation

- [ ] Rename API-related docs to follow the `<name>-API.md` convention (e.g., `authentication-API.md`, `symptoms-API.md`) so API reference files are immediately distinguishable from guides and overviews
