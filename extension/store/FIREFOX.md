# Firefox Add-ons listing

Everything to paste into addons.mozilla.org (AMO) when submitting Savedly for
Firefox (https://addons.mozilla.org/developers/addon/submit/distribution).
It is the same extension as the Chrome one, built for Firefox from the same
code: `pnpm package:firefox` in `extension/` writes two files:

- `savedly-firefox-<version>.zip`: the add-on to upload.
- `savedly-firefox-source-<version>.zip`: its source code. AMO asks for it
  because the add-on's code is bundled and minified. A build from it gives the
  same files byte for byte (checked for 1.2.0).

What differs from Chrome (all in `toFirefox` in `vite.config.ts` and the
`__FIREFOX__` checks in `src/`):

- Savedly opens in Firefox's **sidebar** instead of Chrome's side panel: from
  the popup's panel button, the right-click menu, the shortcut
  (Ctrl+Shift+E), or View → Sidebar. The on-page button's menu has no
  sidebar item, because Firefox only opens the sidebar from a click in the
  browser itself, not from the page.
- Reminder notifications have no "Open" button (Firefox notifications can't
  have buttons); clicking the notification opens the memory.
- The add-on id is `savedly@savedly.app` (`savedly-local@savedly.app` for a
  local build). Never change it: Firefox uses it to tell updates apart from
  a new add-on.
- It needs Firefox 140 or later, the first version that shows the data
  collection statement below when the add-on is installed.

## Before you submit

1. Deploy the website and server first, as for Chrome (`LISTING.md`).
2. Try the production build in Firefox: `pnpm build:firefox`, then
   about:debugging → This Firefox → Load Temporary Add-on → pick
   `extension/dist-firefox/manifest.json`. Sign in at savedly.app, save a
   page, highlight some text, open the sidebar, take a screenshot.
3. Check both shortcuts. Ctrl+Shift+S is also Firefox's own "Take
   Screenshot", and Ctrl+Shift+E opens the Network panel in Firefox's
   developer tools. If Firefox keeps one for itself, people can set their own
   in about:addons → the gear menu → Manage Extension Shortcuts. The tour's
   "Change shortcuts" button opens that page.
4. Raise `version` in `public/manifest.json` and `package.json` for every
   later upload; AMO rejects a version it has already seen.

## Submission

AMO's validator passes it with 0 errors. Two warnings remain, "Unsafe
assignment to innerHTML" in `assets/search-*.js`: both are inside React
(react-dom), not Savedly's code, and don't block review.

**Distribution:** On this site (listed on addons.mozilla.org).

**Upload:** `savedly-firefox-<version>.zip`. Platforms: Firefox (desktop).

**Source code:** Yes, upload `savedly-firefox-source-<version>.zip`, and
paste this into the reviewer notes:

```
Build instructions

Requirements: Node.js 18 or later and pnpm 9 or later (built with Node 26.7.0 and pnpm 12.6.0), on Linux or macOS.

1. Unzip the source and open a terminal in that folder.
2. pnpm install --frozen-lockfile
3. pnpm build:firefox

The add-on is written to dist-firefox/. It is built with Vite (vite.config.ts); the Firefox manifest is generated from public/manifest.json by toFirefox() in that file. No code is downloaded or evaluated at run time.
```

## Listing

**Name:** Savedly

**URL slug:** savedly (then the listing is addons.mozilla.org/firefox/addon/savedly)

**Summary** (250 characters at most):

> Save and highlight pages, links, text and screenshots in Savedly, and find them again by describing what you remember.

**Description:**

```
Savedly is a place to keep what you find on the web, and to find it again later by describing what you remember.

This add-on is the quick way in. It needs a Savedly account (free), and uses the sign-in you already have at savedly.app.

WHAT IT DOES

• Save the page you're on in one click, with an optional note. Savedly suggests a collection and tags, keeps your recent collections one tap away, and lets you pick the cover picture.
• Highlight text on any page in five colours, with notes. Your highlights come back when you return to the page, and you can search them.
• Keep Savedly open in Firefox's sidebar (Ctrl+Shift+E): the page you're on, your Inbox, search, recent saves and collections.
• Right-click to save a link, an image, or the text you've selected, or send the page straight to one of your recent collections.
• Take a screenshot of an area, or of the visible page, and save it.
• Search your library from the address bar: type sv, a space, and what you remember.
• A ✓ on the Savedly icon shows the page you're on is already saved.
• Read it later: links you save wait in your Inbox, and Remind me brings one back with a notification.
• Press Ctrl+Shift+S (Cmd+Shift+S on Mac) to save the current page at once. An optional button on the page gives quick actions; you can drag it anywhere or turn it off.

WHAT HAPPENS AFTER YOU SAVE

Savedly reads what you saved, writes a short summary, and suggests tags. Later you can search in your own words, or ask a question and get an answer that shows which of your saved items it came from.

PRIVACY

Nothing about a page is sent until you save it, highlight on it, or open Savedly on it. The add-on does not collect your browsing history: to show the ✓ on pages you've saved, it compares short fingerprints of addresses on your own computer.

Privacy policy: https://savedly.app/privacy
```

**Categories:** Bookmarks, and Search Tools.

**Support:** website `https://savedly.app/contact`.

**Homepage:** `https://savedly.app`

**License:** GNU Affero General Public License v3.0 (the repository's
`LICENSE`). If AMO's list doesn't offer it, pick "Custom" and paste that file.

**Privacy policy:** paste the "The browser extension" section of
https://savedly.app/privacy, or link `https://savedly.app/privacy#browser-extension`.

**Images:** the icon is `../public/icon-128.png`. The screenshots in this
folder (`screenshot-*.png`) show the Chrome popup and side panel. They are
close enough to upload, but replace them with Firefox ones when there's time.

## Data collection

The manifest declares this, and Firefox shows it when someone installs the
add-on, so the listing must say the same:

- **Website content** (required): the text, address, images and screenshots
  of pages the person chooses to save or highlight.
- **Browsing activity** (required): the address of the page the person is
  on, sent only while they have Savedly's popup or sidebar open on it, to show
  whether it's saved. It is not a record of browsing.

## Notes for the reviewer

Review needs an account. Create a test account on savedly.app and put its
sign-in details in the reviewer notes, with:

> 1. Sign in at https://savedly.app with the account above.
> 2. Open any web page and click the Savedly icon: the page's title appears. Click "Save to Savedly".
> 3. Select some text on a page: a small toolbar appears. Pick a colour to highlight it.
> 4. Right-click the page → Save to Savedly → "Open Savedly sidebar" (or press Ctrl+Shift+E) to open the sidebar.
> 5. Right-click a link, image or selected text → "Save to Savedly".
> 6. Saved items appear at https://savedly.app/app/memories.

## After it is approved

- Add the listing's address to `client/lib/extension.ts` beside
  `CHROME_WEB_STORE_URL`, and offer it to Firefox visitors wherever the site
  says "Add to Chrome".
- A self-hosted install builds its own copy, as for Chrome:
  `SAVEDLY_API_ORIGIN=https://api.example.com SAVEDLY_WEB_URL=https://example.com pnpm build:firefox`,
  then loads `dist-firefox`. Firefox only keeps an unsigned add-on installed
  in Developer Edition, Nightly or ESR; ordinary Firefox loads it until it
  restarts (about:debugging).
