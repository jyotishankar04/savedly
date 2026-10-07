# Changelog

Notable changes to Savedly. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). There are no tagged releases yet; the first will be `v0.1.0`.

## Unreleased

### Added
- Installable web app (PWA) with a share target, so links, text, photos and PDFs can be shared to Savedly from a phone.
- "What's new" popup, managed from the admin area.
- Pinecone as a vector store, alongside pgvector.
- Redis caching for read requests.
- Local sign-in with email and password, for development and self-hosted installs without OAuth.
- Planned-integration cards on the Integrations page.

### Changed
- The product is now named **Savedly**, at savedly.app. It was SaveForLatter before, and Memora before that. Session cookies were renamed, so everyone is signed out once.
- Mobile layout: scrolling, the menu, safe areas and the bottom navigation.

### Removed
- Outlook calendar sync. Google Calendar is the only calendar provider.
- The unused Expo mobile app (`mobile/`).
- Voice notes from the website: recording and transcription are not built yet.
