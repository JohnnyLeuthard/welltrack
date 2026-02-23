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
- [ ] Email verification — send a confirmation link; show a green verified badge on the profile once confirmed
- [ ] Two-factor authentication (TOTP / authenticator app)
- [ ] Account deletion with full data erasure (GDPR right-to-erasure)

## Trends & Analytics

- [ ] Printable / shareable summary report for sharing with a healthcare provider
- [ ] Customizable dashboard — let users pin/unpin widgets and reorder cards

## App Experience & Support

- [ ] In-app link to API documentation (e.g., Swagger/OpenAPI viewer)
- [ ] Progressive Web App (PWA) — installable on mobile home screen, basic offline caching
- [ ] Multi-language / i18n support

## Platform & Infrastructure

- [ ] Admin dashboard — aggregate usage stats (no PII) for monitoring platform health

## Documentation

- [ ] Rename API-related docs to follow the `<name>-API.md` convention (e.g., `authentication-API.md`, `symptoms-API.md`) so API reference files are immediately distinguishable from guides and overviews
- [ ] Cleanup the fac t there are tow document folders docs and documentation. Add something to name to indicate why or merge them. Move files arounbd as needed
