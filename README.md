# D2R Lootliste — Cleaned

This repository snapshot focuses on the core Diablo II: Resurrected loot-list experience.

## Kept

- Main loot list, season/mode switching, item categories and filters
- Item submission and authentication
- Player profile, own items, claims and public profile
- Archive, feedback, admin page and legal pages
- Existing Express backend and its API/data contract

## Removed

- Visuals/artwork gallery and guide pages, including the Horadric Cube visual page
- Guide-only Sorceress, cow level, rune upgrade and terror-zone artwork
- Legacy developer/about/procedure pages, unused mock data, timeline art and test screenshot

## Asset optimization

Retained artwork under `img/` was converted to WebP and oversized item category icons / character portraits were resized for web use. Root favicons remain in their original formats.

## Local preview

For a static frontend preview, run `python -m http.server 8080` from the repository root and open `http://localhost:8080`. API-backed flows will still use their configured API URL; do not use production credentials or data for local testing.

## Backend

The backend lives in `backend/`. Use the existing hosting configuration and persistent volume settings. JSON files committed under `backend/data/` are placeholders; production data on Railway's persistent volume is not included in this archive.

## Before deployment

This ZIP is not deployed. Test login/logout, item submission, item listing/filtering, reservation/claim actions, profile changes, uploads, feedback and all admin actions in a staging environment. Review environment variables and rotate any credentials that were previously exposed in public Git history.

## Reforged UI update (2026-10)

The homepage now uses a more consistent Diablo-inspired visual system while retaining the existing static HTML architecture, current API endpoints, item rendering, filters, season switching, claim actions, account pages, and backend. The original dark charcoal/gold identity and item-quality colors remain intentional parts of the design.

### UI changes
- Improved hero hierarchy, spacing, contrast, status panels, category controls, season selector, and trade filters.
- Added a results heading and live result-count pill above the item grid.
- Reworked responsive item-card grid behavior for wide desktop, tablet, and mobile widths.
- Refined expanded item details, image treatment, focus states, reduced-motion behavior, and loading skeletons.

### Verification notes
- Local HTML references and CSS asset references were checked.
- Inline JavaScript, `render.cards.js` (ES module), `assets/js/lootliste-enhancements.js`, and `backend/server.js` passed syntax checks.
- Live Railway integration was not tested as part of this UI pass. Test authentication, item listing, item submission, reservations/claims, and admin actions in a staging copy before deploying.
