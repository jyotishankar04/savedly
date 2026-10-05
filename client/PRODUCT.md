# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who save a lot from the web and can't find it again: articles, videos, screenshots, PDFs, voice notes, notes. They want to drop things in without organizing them, and later search or ask for them in plain words.

## Product Purpose

SaveForLatter is a personal memory for the internet. Everything saved is read (transcribed, OCR'd, or extracted), summarized, tagged, filed into a collection, and embedded, so it can be found again by meaning or keyword, or asked about in plain English with answers that cite the saved item.

## Positioning

Free and open source, with no paid tier behind it. Every answer from "Ask" links back to the memory it came from. Users bring their own AI key (OpenAI, Anthropic, Groq, Google, OpenRouter, or any OpenAI-compatible endpoint).

## Operating Context

- Web dashboard (Next.js) is the only shipped client; it is responsive and used on phones.
- Capture: Quick Capture (link, note, file), bulk import of a browser bookmarks HTML file or a URL list.
- Chrome extension is built but **not yet published**. There is **no mobile app**. Landing copy must say so, never imply otherwise.

## Capabilities and Constraints

- Six memory types: web, video, note, image, document, voice.
- Hybrid search (keyword + meaning, ranked together); Ask with cited sources and help-center answers; memory graph; collections and tags (AI-created when related ones don't exist); insights; calendar event detection with Google Calendar / Outlook sync; sharing with public, request, password, and invite-only links; export as JSON or Open Knowledge Format.
- Vault is **PIN-protected, not encrypted**. Never call it encrypted.
- `SHOWCASE_MODE` deployments show a waitlist instead of sign-up (`lib/showcase.ts`); the primary CTA comes from `useAuthCta()`.

## Brand Commitments

- Name is **SaveForLatter**. Wordmark "save·for·latter" with a de-emphasized "for".
- Logo mark: tilted blue note with a smiling face and curled corner (`components/logo.tsx`, `public/logo.svg`).
- Brand color is blue: `#1447E6` light / `#2B7FFF` dark (`--primary` in `app/globals.css`).
- Marketing pages follow the site's light/dark theme toggle (user decision, 2026-09-27).

## Evidence on Hand

- The real app UI, which can be shown with demo data.
- No customers, testimonials, usage numbers, press, or ratings exist. Never invent them.
- Real links: GitHub via `lib/open-source.ts` (when configured), booking link `lib/booking.ts`, support@saveforlatter.com.

## Product Principles

1. Honest over impressive: say what ships today and label what doesn't.
2. Show the product working instead of describing it.
3. Free means free: no upgrade prompts, no invented tiers.
4. Answers are checkable: every AI claim links back to its source.
