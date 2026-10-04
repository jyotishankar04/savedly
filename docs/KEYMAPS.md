# Keymaps

Keyboard shortcuts implemented in the web client (`client/`). Everything here
is `Ctrl`-based; on macOS the equivalent `Cmd` key works identically for every
global shortcut, since each listener checks `e.ctrlKey || e.metaKey`.

There is no keymaps implementation in `extension/` or `mobile/` — these are web client (`client/`) only.

## Global (anywhere under `/app`)

Implemented in `client/app/(platfrom)/app/layout.tsx`'s top-level `keydown`
listener, so these work regardless of which page is open or what's focused.

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + K` | Open the search command palette |
| `Ctrl/Cmd + Q` | Open Quick Capture |
| `Ctrl/Cmd + Enter` | Submit the Quick Capture form (only while the modal is open) |
| `Ctrl/Cmd + B` | Collapse / expand the sidebar |
| `Ctrl/Cmd + N` | Go to Notifications |
| `Ctrl/Cmd + P` | Go to Profile (Settings) |

> **Browser-reserved keys:** `Ctrl/Cmd + N` (new window) and `Ctrl/Cmd + P`
> (print) are intercepted by Chrome and Firefox before JavaScript ever sees
> them — `preventDefault()` cannot stop this. Both bindings are wired
> correctly and fire in any environment that doesn't reserve them; in a
> normal browser tab, expect the browser's own new-window/print action
> instead.

## Collapsed-sidebar quick-nav menu

Only active when the sidebar is fully collapsed (`sidebarPhase === "collapsed"`)
— inert whenever the full sidebar is open, since the floating menu button
doesn't exist in that state. Same file as above.

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + M` | Open / close the floating quick-nav menu |
| `Tab` | Move focus to the next menu item (wraps around) |
| `Shift + Tab` | Move focus to the previous menu item (wraps around) |
| `Enter` | Navigate to the focused item (native link behavior, not a custom handler) |
| `Escape` | Close the menu and return focus to the menu button |

## Contextual shortcuts

Scoped to a single input or page — not global.

| Shortcut | Where | Action |
| --- | --- | --- |
| `Enter` | Home page (`/app`) search input | Run the search |
| `Enter` | Onboarding (`/onboard`), step 1 name field | Continue to step 2 (only if the name field isn't empty) |

## Unbound actions

- The Quick Capture modal (`saveModalOpen` in `layout.tsx`) is a hand-rolled
  overlay, not the shared `Dialog`/`CommandDialog` primitive — `Escape` does
  **not** close it today; only the visible `X` button does. The search
  palette (`CommandDialog`, built on `@base-ui/react/dialog`) does close on
  `Escape`, since that's the primitive's default behavior.
- `components/ui/sidebar.tsx` (an unused shadcn scaffold component, not
  wired into the app) ships its own `Ctrl/Cmd + B` listener. It's dead code —
  not part of any rendered page — so it's excluded from the table above and
  doesn't conflict with the real sidebar's own `Ctrl/Cmd + B` binding.
