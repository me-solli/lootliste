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
