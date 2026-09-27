---
name: SaveForLatter
description: A personal memory for the internet, shown working inside a real app window.
colors:
  primary: "oklch(0.4878 0.2432 264.4045)"
  primary-dark: "oklch(0.6187 0.2067 259.2316)"
  brand-blue-fixed: "#1447E6"
  on-primary: "oklch(0.9851 0 0)"
  cta-ink: "#0B1B4D"
  background: "oklch(1.0000 0 0)"
  background-dark: "oklch(0.1957 0 0)"
  card-dark: "oklch(0.2393 0 0)"
  foreground: "oklch(0.1448 0 0)"
  foreground-dark: "oklch(0.9851 0 0)"
  muted-foreground: "oklch(0.5555 0 0)"
  muted-foreground-dark: "oklch(83.881% 0.00307 264.752)"
  muted: "oklch(0.9702 0 0)"
  muted-dark: "oklch(0.2752 0.0034 228.9166)"
  border: "oklch(0.9219 0 0)"
  border-dark: "oklch(0.2393 0 0)"
  destructive: "oklch(0.5830 0.2387 28.4765)"
  destructive-dark: "oklch(0.7022 0.1892 22.2279)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, sans-serif, system-ui"
    fontSize: "4.5rem"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, ui-sans-serif, sans-serif, system-ui"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  statement:
    fontFamily: "Geist, ui-sans-serif, sans-serif, system-ui"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, ui-sans-serif, sans-serif, system-ui"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  body-lead:
    fontFamily: "Geist, ui-sans-serif, sans-serif, system-ui"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Geist, ui-sans-serif, sans-serif, system-ui"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  button:
    fontFamily: "Geist, ui-sans-serif, sans-serif, system-ui"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1
  label:
    fontFamily: "Geist, ui-sans-serif, sans-serif, system-ui"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "12.8px"
  md: "14.8px"
  lg: "16.8px"
  xl: "20.8px"
  2xl: "22.8px"
  3xl: "24px"
  surface: "28px"
  block: "32px"
  full: "9999px"
spacing:
  unit: "4px"
  gutter: "20px"
  gutter-sm: "24px"
  panel: "20px"
  panel-sm: "32px"
  head-to-content: "48px"
  section: "64px"
  section-md: "96px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "color-mix(in oklab, oklch(0.4878 0.2432 264.4045) 90%, transparent)"
  button-inverse:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "40px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "40px"
  button-on-blue:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.cta-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  cta-block:
    backgroundColor: "{colors.brand-blue-fixed}"
    textColor: "#FFFFFF"
    rounded: "{rounded.block}"
    padding: "96px 64px"
  panel:
    backgroundColor: "color-mix(in oklab, oklch(0.1448 0 0) 3.5%, transparent)"
    rounded: "{rounded.3xl}"
    padding: "{spacing.panel-sm}"
  inner-card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  chip-muted:
    backgroundColor: "color-mix(in oklab, oklch(0.1448 0 0) 6%, transparent)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  chip-primary:
    backgroundColor: "color-mix(in oklab, oklch(0.4878 0.2432 264.4045) 10%, transparent)"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  input-search:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "0 14px"
    height: "44px"
  tab-segment-selected:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "32px"
---

# Design System: SaveForLatter

## Overview

**Creative North Star: "The Working Window"**

SaveForLatter's marketing surface doesn't describe the product. It shows the product running. The first viewport already holds a real app window, and the sections below it use small coded pieces of the real screens (an Ask answer with its sources, a search result with its match badges, a vault that really locks when you switch tabs, a hand-laid library graph). The page is flat and quiet. It's built from a white or near-black background, hairline rings, large soft-cornered panels and one blue. Headlines are Geist set tight and heavy, and they carry the hierarchy without eyebrows or kickers. Copy is short and declarative, and every claim has something next to it you can look at.

The density is low, and the pacing is editorial. Each section is one idea: a heading-and-lede pair on a two-column split, then one demo on one tinted panel. Sections change their composition as the page goes: a pipeline strip, a side-by-side pair, a wide graph band, a two-up, a spec list. They don't repeat alternating rows or fall back to a card grid. Blue is rationed. It marks the primary action, the "your library" hub, selected states, meaning-links in the graph, and one fully blue closing block.

The page follows the site's light/dark toggle, and every token has a dark counterpart. The logged-in app (`app/(platfrom)/...`) uses the same tokens from `app/globals.css`. The composition rules below were built and verified on the marketing surface only. Treat them as this world's rules and don't assume the app already follows them.

**Key Characteristics:**
- The real product in window chrome, never abstract hero art.
- Neutrals plus one brand blue, and no second accent.
- Geist semibold display with negative tracking. Mono only for data.
- One elevation step per surface: a tinted panel with flat cards inside it.
- Edges are drawn with translucent foreground rings, not border tokens.
- Motion plays once on reveal, uses a single expo-out ease, and turns off under reduced motion.

## Colors

A neutral grey scale with a single saturated blue. The palette is chosen to disappear behind the product screenshots.

### Primary
- **Memory Blue** (`primary`, ≈ #1447E6 in light): the only accent. It's used on the primary CTA pill, the "your library" hub, collection hubs in the library graph, selected chips and filter states, the pipeline's final "Findable" step, the travelling signal dashes, the "related by meaning" dashed links, and instruction hints under a panel title. At 10% it tints selected rows and meaning badges. At 15% it marks highlighted search terms.
- **Memory Blue, Night** (`primary-dark`, ≈ #2B7FFF): the dark theme's `--primary`. It's brighter so the accent still reads on near-black, and it replaces Memory Blue on every token-driven blue element in dark mode.
- **Fixed Brand Blue** (`brand-blue-fixed`): the closing CTA block's ground in **both** themes. It's hardcoded rather than taken from `--primary` because white body text on the dark theme's brighter blue only reaches about 3.6:1.
- **Deep Ink** (`cta-ink`): the label color of the white button that sits on the blue block.

### Neutral
- **Paper** (`background`, white) / **Night Paper** (`background-dark`, ≈ #151515): the page ground and the fill of every inner card.
- **Ink** (`foreground`, ≈ #0A0A0A) / **Night Ink** (`foreground-dark`, ≈ #FAFAFA): headings, body emphasis, and the inverse GitHub pill. Almost every surface and edge on the landing is a **percentage of Ink** (see Named Rules).
- **Graphite** (`muted-foreground`, ≈ #737373) / **Night Graphite** (`muted-foreground-dark`, ≈ #C9CACC): ledes, descriptions, captions, and the quiet aside inside a manifesto sentence.
- **Mist** (`muted`, ≈ #F5F5F5) / **Night Mist** (`muted-dark`): hover fill for navigation items.
- **Hairline** (`border`, ≈ #E5E5E5) / **Night Hairline** (`border-dark`, ≈ #1F1F1F): the shadcn border token. In dark mode it has the **same value as `--card`**, so a `border-border` edge on a card vanishes. That's why the landing draws its edges with foreground rings instead.
- **Card, Night** (`card-dark`, ≈ #1F1F1F): the browser-frame body in dark mode. In light mode `--card` is white.

### Semantic
- **Alarm** (`destructive` / `destructive-dark`): appears on the landing only as the vault's "Locked" badge, at 10% fill with full-strength text.

### Named Rules
**The One Blue Rule.** Brand blue is the only chromatic color on the page. A second hue appears only when a third party's brand demands it (the Buy Me a Coffee yellow, which lives on /contribute and not on the homepage). It is never used for decoration.

**The Ink-Percentage Rule.** Surfaces and edges are Ink at a fixed opacity, not new grey tokens: 3.5% for panel fills, 5% for tab tracks and URL bars, 6% for muted chips and inline code, 8% for panel rings and inner dividers, 10% for card rings and list hairlines, 12% for input rings, 15% for outline buttons, diagram node rings and neutral graph lines. These percentages flip correctly between themes because Ink flips.

**The Fixed Blue Block Rule.** The closing CTA uses Fixed Brand Blue in both themes, with white text and a white button. Nothing else on the page is a solid blue field bigger than a pill.

## Typography

**Display Font:** Geist (with ui-sans-serif, sans-serif, system-ui)
**Body Font:** Geist
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace)

**Character:** A single grotesque does all the work. Hierarchy comes from size and negative tracking, not from a second family or a color change. Mono appears only where the content is literally data.

### Hierarchy
- **Display** (600, 2.75rem → 3.75rem at sm → 4.5rem at lg, line-height 1.02, -0.035em): the hero headline. The closing CTA headline uses the same tracking at 2.25rem → 3rem → 4rem with line-height 1.04.
- **Headline** (600, 1.875rem → 3rem at sm, line-height 1.05, -0.03em): section h2s, balanced across lines. Quieter h2s (FAQ, "And the rest of it.") stop at 2.25rem with line-height 1.08.
- **Statement** (600, 1.5rem → 1.75rem, line-height 1.3, -0.02em): manifesto paragraphs. The aside inside a sentence drops to Graphite instead of changing weight.
- **Title** (600, 1.25rem, -0.02em): demo panel titles. Contribute and donate block titles use 1.5rem at the same tracking.
- **Body lead** (400, 1.125rem, line-height 1.625, Graphite): the paragraph under a headline, capped at about 28rem (`max-w-md`/`max-w-lg`).
- **Body** (400, 15–16px, line-height 1.625): spec-list definitions, FAQ answers (max 42rem), footer links.
- **Label** (500, 13–15px): buttons (15px), tabs (13px), nav items (14px), small UI text inside fragments (11–13.5px).
- **Data** (mono, 11–12px): diagram node labels, the browser URL bar, a pasted link, inline code, fork-step numbers.

### Named Rules
**The Tight Display Rule.** Anything set at 1.25rem or larger is weight 600 with negative tracking: -0.035em for display, -0.03em for headlines, -0.02em for titles and statements. Body text keeps normal tracking.

**The Mono-Is-Data Rule.** Monospace appears only on strings a machine would print: URLs, paths, node labels, code tokens, step numbers. It is never used for headings, eyebrows or decoration.

**The No-Eyebrow Rule.** Headings carry their own weight. No kicker or uppercase label goes above a heading. A blue instruction line ("Hover a save or a collection…") may sit below a panel title when it tells the visitor how to use a live demo.

## Layout

- **Container:** every section centers content at `max-w-6xl` (72rem) with a 20px side gutter that grows to 24px at `sm`. The manifesto narrows to 42rem so it reads like prose.
- **Section rhythm:** every section after the hero uses 64px vertical padding, rising to 96px at `md` (the shared `SECTION` constant). The manifesto is the one deliberate exception (80px → 128px) because it is an argument that needs air. The hero sits under the fixed navbar with 128px → 160px top padding.
- **Section head:** a two-column split at `lg`, with the headline on the left and the lede bottom-aligned and pushed to the right edge. Content starts 48px below it (64px for the pipeline).
- **Compositions vary by section:** a two-column hero (1.2fr / 0.8fr, headline and signal diagram) over a full-width tabbed app window; a five-column pipeline strip on a drawn track; a two-up of demo panels; one wide graph panel; a two-up pair; a 0.8fr / 1.2fr heading plus spec list; a 0.9fr / 1.1fr contribute split; a 0.8fr / 1.2fr FAQ.
- **Gaps:** 16px between sibling panels, 40–64px between the halves of a split.
- **Responsive:** everything stacks to one column below `lg`. Below `sm`, the desktop app screenshots swap for 390px phone captures, the library graph turns into an indented tree (one collection at a time), and the hero signal diagram is hidden below `lg`. The pipeline goes from five columns at `md` to a vertical list with inline step markers.

## Elevation & Depth

The system is flat and uses tonal layering. Depth comes from one tinted panel step (Ink at 3.5% with an 8% ring) and from translucent rings, not from shadows. Inner cards sit flat on their panel, and the page never stacks a card on a card on a card. The shadow tokens in `globals.css` (`--shadow-sm` … `--shadow-xl`) have spreads larger than their blur, so they come out almost invisible. They're effectively a no-op, and the ring is the real edge.

### Shadow Vocabulary
- **Hub glow** (`box-shadow: 0 8px 24px -8px var(--primary)`): used only on the "your library" hub in the hero diagram, the single blue-lit point everything converges on.
- **Scrolled nav** (`box-shadow: 0 8px 32px rgba(0,0,0,0.04)`, `0.24` in dark): used only once the floating navbar pill has scrolled off the top.

### Named Rules
**The One-Step Rule.** A surface gets exactly one elevation step. Panels are tinted and ringed, and anything inside a panel is flat: a background fill plus a 10% ring, no shadow. If a demo needs to feel lifted, put it on a panel. Don't add a shadow to the card.

**The Ring-Not-Border Rule.** Edges are `ring-1` in Ink at 8–15%, never the `border` token, because in dark mode `--border` equals `--card` and the edge disappears. Hairline dividers inside lists and cards are borders in Ink at 8–10% for the same reason.

## Shapes

Soft, large, consistent corners, with radius growing with the size of the surface. The base `--radius` is 1.05rem and the scale derives from it.

- **Pills** (full): every button, tab, chip, badge, the theme toggle and the floating navbar.
- **Blocks** (32px): the closing CTA block and the footer panel, the two surfaces that bookend content.
- **Panels** (24px): tinted demo panels and the contribute block.
- **Cards and windows** (22.8px): the browser frame, fragment shells, pipeline stage cards.
- **Rows and inputs** (20.8px): list rows inside fragments, the search field, provider rows.
- **Thumbnails and tags** (14.8px / 16.8px): link-preview thumbnails, diagram node labels, graph hubs.
- **Large app surfaces** (28px, `rounded-surface`): defined in the shared tokens for genuinely large app surfaces. The landing doesn't use it.

The scale is monotonic on purpose. `--radius-2xl` is pinned at +6px so 40–56px icon tiles never clamp into circles.

## Components

### Buttons
Pill-shaped, confident, and quiet apart from one blue.
- **Shape:** fully rounded (9999px).
- **Primary:** Memory Blue fill, near-white label, 44px tall, 24px side padding, 15px medium, with a trailing arrow that nudges 2px right on hover. Hover drops the fill to 90%. Press scales to 0.97. Focus shows a 2px blue ring at 50% with a 2px offset in the page color. The navbar's compact version is 36px tall.
- **Inverse:** an Ink fill with a Paper label (GitHub), 40px (36px in the footer). Hover drops opacity to 90%.
- **Outline:** transparent with a 15% Ink ring and an Ink label, 40px (36px in the footer). Hover fills 5% Ink.
- **Text link:** a 44px medium-weight label that underlines on hover ("See what it does").
- **On blue:** inside the CTA block, a white 48px pill with a Deep Ink label that lifts 1px on hover. The secondary option is a transparent pill with a 45% white ring that fills 10% white on hover.

### Chips
- **Style:** fully rounded, 11–12px medium. Muted chips are Ink at 6% with Ink at 75–80% text. Primary chips are blue at 10% with blue text.
- **State:** a selected filter chip adds a 25% blue ring. Unselected filter chips are Graphite with a 10% Ink ring. Match badges ("Keyword", "Meaning") pair a 12px icon with the label.

### Cards / Containers
- **Panel:** 24px corners, Ink at 3.5% fill, 8% Ink ring, 20px padding rising to 32px at `sm` (40px for the graph band). A panel holds a title, one line of description, and a demo centered below.
- **Inner card / shell:** 22.8px corners, page-color fill, 10% Ink ring, no shadow. List rows inside it use 20.8px corners with an 8% ring.
- **Browser frame:** a 22.8px card on the card color with a 10% ring and a 40px chrome bar: three 10px dots at 15% Ink, a centered URL pill at 5% Ink in 11px mono, and an 8% hairline under it.
- **Spec list:** a definition list between 10% Ink top and bottom rules with 10% dividers. Each row is a 14rem medium term beside a Graphite definition. Used where a card grid would be the default.

### Inputs / Fields
- **Style:** 44px tall, 20.8px corners, a 12% Ink ring, a 16px Graphite search icon, 14px text, and a 1px blue caret that pulses (static under reduced motion).
- **PIN entry:** the vault reuses the shared `InputOTP` component (four slots).

### Navigation
- **Style:** a fixed, centered 56px pill (`max-w-6xl`) floating 16px from the top. It's transparent at rest and turns into a page-color pill with a faint border, backdrop blur and the scrolled-nav shadow once scrolled.
- **Items:** 36px pill links, 14px medium Graphite, which turn Ink over a Mist fill on hover. Dropdowns hold rows with a 44px blue-tint icon tile that fills solid blue on hover.
- **Segmented control:** the hero's screen tabs and the footer theme switch share one pattern: a track that's fully rounded with Ink at 5–6% and 4px padding, and a selected segment in the page color with a 10% Ink ring. The auto-advancing hero tab draws a 1px blue progress line under its label.

### Signature: Signal Diagram and Library Graph
Hand-placed graphs, not simulated layouts. **Hubs** are solid blue tags (16.8px corners, 12–13px medium). **Items** are Ink dots with a page-color halo beside a label on a page-color tag with a 10% ring. Neutral links are Ink at 15–20%. **Meaning links** are dashed blue. In the hero, blue dashes travel along each line toward the hub. In the library graph, hovering or focusing a node dims everything it isn't connected to (to 30–35%) and turns its links blue. On phones the graph turns into an indented tree.

### Signature: Tabbed Product Frame
The browser frame holds four real app screenshots (light and dark pairs, with phone captures below `sm`) that crossfade over 500ms (opacity plus a 2px blur). The tabs advance on their own every 6.5s until the visitor picks one. They pause while hovered and never auto-advance under reduced motion.

### Signature: Closing Blue Block
A 32px-cornered Fixed Brand Blue field with 96px × 64px padding at `lg`. It holds a display-size white headline (up to 4rem, -0.035em), an 85%-white lede, the white and ghost pill pair, and a row of check-marked facts. It reveals once with a clip-path inset that opens to full size.

### Motion
One ease everywhere (`cubic-bezier(0.16, 1, 0.3, 1)`). Reveals play once on scroll: a rise of 18–28px with a fade over 0.7–1.1s, staggered 0.12–0.16s between siblings. Manifesto paragraphs brighten from 18% opacity as they reach the middle of the screen. Every animation is set to zero duration or `none` under `prefers-reduced-motion`, and content is never left hidden.

## Do's and Don'ts

### Do:
- **Do** show the product: a real screenshot in the browser frame, or a coded fragment of a real screen with the demo library's fictional content.
- **Do** keep one elevation step: a tinted panel (Ink 3.5%, 8% ring, 24px corners) with flat inner cards (page fill, 10% ring, 22.8px corners).
- **Do** draw edges with Ink rings at 8–15%, so they survive dark mode where `--border` equals `--card`.
- **Do** set headings in Geist 600 with negative tracking (-0.035em display, -0.03em headline, -0.02em title).
- **Do** keep every section on the shared rhythm (64px → 96px vertical, `max-w-6xl`, 20px → 24px gutter).
- **Do** change the composition from one section to the next (strip, pair, band, spec list) instead of repeating one layout.
- **Do** use Hugeicons (`@hugeicons/react`) as the only icon set, at stroke 2 for UI (1.5 by default in the hero CTA).
- **Do** give every theme-dependent raster a light and a dark version, and switch them with the theme.
- **Do** turn every animation off under reduced motion without hiding content.

### Don't:
- **Don't** add a second accent color. Blue is the only chromatic token.
- **Don't** put a shadow on a card that sits inside a panel, or nest a card inside a card inside a panel.
- **Don't** use `border-border` for card or panel edges on this surface. It disappears in dark mode.
- **Don't** set headings in mono, or use mono for anything that isn't data.
- **Don't** put an eyebrow, kicker or uppercase label above a heading.
- **Don't** use a gradient hero over abstract art or a 3×3 feature-card grid. The build replaced both with the product window and a spec list.
- **Don't** make a second solid blue block. The closing CTA is the only one, and it stays Fixed Brand Blue in both themes.
- **Don't** invent customers, numbers, ratings or testimonials to fill a proof slot. Use facts that are true, such as the check-marked reassurances in the CTA block.
