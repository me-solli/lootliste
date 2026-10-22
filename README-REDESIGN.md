# D2R Lootliste — Reforged

This revision is based on the original `lootliste-main` repository and keeps its static HTML/JavaScript architecture, existing pages, image library, and Railway API contract wherever practical. The goal is a coherent visual refresh and safer maintenance without forcing a framework migration.

## What changed

- Added a shared design system in `assets/css/lootliste-redesign.css` for consistent surfaces, typography, buttons, item cards, filters, forms, tables, focus states, responsive layout, and reduced-motion preferences.
- Added `assets/js/lootliste-enhancements.js` for consistent secondary-page navigation and small progressive enhancements. Page-specific logic remains in place.
- Applied the shared layer to all existing HTML pages, including guides, account pages, feedback, archive, and admin tools.
- Updated the main page metadata for theme color and search description.
- Removed the hard-coded public admin token flow. Admin account and feedback endpoints, plus the ladder migration endpoint, now require an authenticated admin session cookie. The admin UI sends session credentials instead of an exposed token.
- Limited JSON request bodies to 2 MB.
- Corrected the repository-root `start` script so it starts `backend/server.js` if the hosting platform is configured at the repository root.
- Updated the legacy admin-user page to call the protected `/admin/accounts` endpoint rather than a nonexistent `/accounts` endpoint.

## Local preview

The frontend is static. For example, from the repository root:

```sh
python -m http.server 8080
```

Open `http://localhost:8080`. Pages that use the API will still point to the configured Railway URL unless you edit their API base constants for local development.

## Backend

The backend is in `backend/` and uses Node.js, Express, bcrypt, JSON files, and a persistent data directory. The production code expects its persistent volume at `/data` (Railway Volume). Do not run a local test against production data or change the production service before reviewing the deployment settings.

If Railway is configured with the repository root as its service root, the root `start` script now launches `backend/server.js`. If Railway is configured with `backend/` as the service root, its existing `npm start` script continues to work.

## Important deployment/security notes

1. The old token `lootliste-admin-2025` was hard-coded into public client code and was not a secret. It has been removed from both frontend and backend checks. Admin-only endpoints now depend on the existing HttpOnly session cookie and the account username configured by `ADMIN_USERNAME` in `backend/server.js`.
2. Before deploying, verify that the intended admin account is registered and can log in. Test the admin page's Items, Users, and Feedback tabs with a real admin session.
3. Consider rotating any credentials that were ever embedded in public repository files. This change cannot revoke secrets that were exposed in older Git history or previous deployments.
4. The original archive contains empty JSON arrays under `backend/data/`; production data is expected on Railway's `/data` volume and is not included in this repository ZIP. No live data was read or modified.
5. Review privacy/legal pages before relaunch, particularly if analytics, image uploads, cookies, or account workflows have changed since they were written.

## Verification performed

- Parsed all 25 HTML pages with Python's HTML parser.
- Verified all injected stylesheet and script paths exist.
- Ran Node syntax checks for the backend and shared enhancement script, and ES-module syntax checks for the existing browser modules.
- Searched the source tree to confirm the hard-coded admin token is no longer present.

A live integration test against Railway was intentionally not performed. The ZIP was not deployed and no production data was changed.
