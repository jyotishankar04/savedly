---
version: 1
slug: "app-marketing-page-tsx"
primary_target: "app/(marketing)/page.tsx"
related_targets: []
---

# Surface brief: marketing landing page

Scope: `app/(marketing)/page.tsx`, the public homepage. Mode: Persuade.
Audience: people who save a lot from the web and lose it; first-time visitors deciding whether to sign up (or join the waitlist in SHOWCASE_MODE).
Action: the `useAuthCta()` primary button. Secondary: GitHub star, /features.
Proof: the real app UI (screenshots with labelled demo data), live vault and graph demos, honest FAQ.
Constraints: follows the site light/dark toggle; brand blue is the only accent; keep every existing section's content (hero copy, features, contribute, FAQ, final CTA, footer); no invented customers, numbers, or testimonials; extension and mobile app are not shipped.

## Direction contract

THESIS: The product proves itself in a real app window the moment the page loads; copy is short and declarative. Refuses the category default of a gradient hero over abstract art with a 3x3 feature card grid.

OWN-WORLD: Xirp-style (user-pinned reference: xirp.spotify.com). Flat background, hairline rings, 20-24px rounded panels, Geist bold tight display, mono only for data (diagram node labels, window URL bars, key hints), headings carry their own weight with no eyebrows, product screenshots in window chrome, one fully blue CTA block. Neutrals plus brand blue only.

STORY: Visitor sees what it is (headline) and the actual app (framed screenshot with tabs; phone captures below sm), reads why it exists (manifesto: saving is easy, finding is the problem), watches one example save move through the real pipeline (Saved, Read, Understood, Filed, Findable), sees Ask and Search side by side, the library as a hand-laid graph, the vault and bring-your-own-key as a pair, the remaining features as a spec list, learns it is free and open source, gets honest answers, acts in the blue block, and ends on a rounded footer panel.

FIRST VIEWPORT: Left: two-line bold headline "Save anything. / Ask it anything." (~64-72px desktop), one-paragraph subline, primary CTA + GitHub star. Right: a small memory-type signal diagram (six mono-labelled nodes converging on "your library"). Below the fold line, a tab row (Home / Ask / Search / Memories) above a large framed app screenshot that starts in the first viewport.

FORM: Xirp-inspired, user-pinned as a reference (pinned direction beats the roll); seed key d6ccf4c6. On 2026-09-27 the user said not to follow the reference's exact structure, so sections vary in composition (pipeline strip, side-by-side pair, wide graph band, two-up, spec list) instead of repeating alternating rows. Coded UI fragments replace cropped screenshots below the hero (user request). The hero diagram hub reads "your library" (the app's own term: "146 saves in your library"). Signature interaction: tabbed product frame crossfading between real app screenshots. Motion: one-time rise-in on scroll, tab crossfade, animated signal lines; all off under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
