# Changelog

Notable changes to Savedly. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). There are no tagged releases yet; the first will be `v0.1.0`.

## Unreleased

### Added
- Duplicate detection: saving a link or note that is already in your library asks first (skip, or add anyway). Saves made outside the app are flagged by a new pipeline step, with a notification to skip the new copy or keep both.
- GitHub stars: connect a GitHub account and the public repositories you star are added to your library, checked twice a day.
- Installable web app (PWA) with a share target, so links, text, photos and PDFs can be shared to Savedly from a phone.
- "What's new" popup, managed from the admin area.
- Pinecone as a vector store, alongside pgvector.
- Redis caching for read requests.
- Local sign-in with email and password, for development and self-hosted installs without OAuth.
- Planned-integration cards on the Integrations page.

### Changed
- Saved items are processed four at a time instead of one (`INGESTION_CONCURRENCY`), and a single save goes ahead of a large import.
- The product is now named **Savedly**, at savedly.app. It was SaveForLatter before, and Memora before that. Session cookies were renamed, so everyone is signed out once.
- Mobile layout: scrolling, the menu, safe areas and the bottom navigation.

### Removed
- Outlook calendar sync. Google Calendar is the only calendar provider.
- The unused Expo mobile app (`mobile/`).
- Voice notes from the website: recording and transcription are not built yet.
