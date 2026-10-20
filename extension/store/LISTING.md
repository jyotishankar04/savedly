# Chrome Web Store listing

Everything to paste into the Chrome Web Store developer dashboard
(https://chrome.google.com/webstore/devconsole). The package to upload is made
with `pnpm package` in `extension/`, which writes `savedly-extension-<version>.zip`.
(It builds into `extension/dist`, so a local build loaded from there becomes the
production one; run `pnpm build:local` again afterwards to go back.)

The extension is published (version 1.0.1). Version 1.2.0 is an update: upload
the new package under Package, then replace the description and screenshots
below. Its permission warnings are the same as 1.0.1's ("Read and change all
your data on all websites", "Display notifications"), checked with
`chrome.management.getPermissionWarningsByManifest`, so the update installs for
existing users without asking them to approve anything.

## Before you submit

1. Deploy the website and server first: the extension's new features call
   server routes that 1.0.1 didn't use (highlights, suggestions, recent
   collections, reminders), and run the database migrations. The privacy
   policy's "The browser extension" section must be live, because the listing
   links to it.
2. Load the production build once and try it against the real service:
   `pnpm build`, then chrome://extensions → Developer mode → Load unpacked →
   `extension/dist`. Sign in at savedly.app, save a page, highlight some text,
   open the side panel (Ctrl+Shift+E), take a screenshot.
3. Raise `version` in `public/manifest.json` and `package.json` for every
   later upload. The store rejects a version it has already seen.

## Store listing

**Name:** Savedly

**Summary** (132 characters at most):

> Save and highlight pages, links, text and screenshots in Savedly, and find them again by describing what you remember.

**Category:** Productivity → Tools (or "Workflow & Planning")

**Language:** English

**Description:**

```
Savedly is a place to keep what you find on the web, and to find it again later by describing what you remember.

This extension is the quick way in. It needs a Savedly account (free), and uses the sign-in you already have at savedly.app.

WHAT IT DOES

• Save the page you're on in one click, with an optional note. Savedly suggests a collection and tags, keeps your recent collections one tap away, and lets you pick the cover picture.
• Highlight text on any page in five colours, with notes. Your highlights come back when you return to the page, and you can search them.
• Keep Savedly open in Chrome's side panel (Ctrl+Shift+E): the page you're on, your Inbox, search, recent saves and collections.
• Right-click to save a link, an image, or the text you've selected, or send the page straight to one of your recent collections.
• Take a screenshot of an area, or of the visible page, and save it.
• Search your library from the address bar: type sv, a space, and what you remember.
• A ✓ on the Savedly icon shows the page you're on is already saved.
• Read it later: links you save wait in your Inbox, and Remind me brings one back with a notification.
• Press Ctrl+Shift+S (Cmd+Shift+S on Mac) to save the current page at once. An optional button on the page gives quick actions; you can drag it anywhere or turn it off.

WHAT HAPPENS AFTER YOU SAVE

Savedly reads what you saved, writes a short summary, and suggests tags. Later you can search in your own words, or ask a question and get an answer that shows which of your saved items it came from.

PRIVACY

Nothing about a page is sent until you save it, highlight on it, or open Savedly on it. The extension does not collect your browsing history: to show the ✓ on pages you've saved, it compares short fingerprints of addresses on your own computer. Savedly is open source, so you can read exactly what it does: https://github.com/jyotishankar04/savedly

Privacy policy: https://savedly.app/privacy
```

**Images** (in this folder; the screenshots are frames of the real extension from the clips on savedly.app/chrome-extension, with a caption above):

| Field | File | Size |
| --- | --- | --- |
| Store icon | `../public/icon-128.png` | 128×128 |
| Screenshot 1 | `screenshot-1-save-a-page.png` | 1280×800 |
| Screenshot 2 | `screenshot-2-highlight.png` | 1280×800 |
| Screenshot 3 | `screenshot-3-side-panel.png` | 1280×800 |
| Screenshot 4 | `screenshot-4-search.png` | 1280×800 |
| Screenshot 5 | `screenshot-5-read-later.png` | 1280×800 |
| Small promo tile | `promo-small-440x280.png` | 440×280 |

**Links:** website `https://savedly.app`, support `https://savedly.app/contact`.

## Privacy tab

**Single purpose:**

> Save web pages, links, selected text, images and screenshots to the user's Savedly account.

**Permission justifications:**

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | To read the address and title of the tab the user is saving, and to capture it when they ask for a screenshot. |
| `storage` | To remember, on the device, whether the user is signed in and whether they turned the on-page button off. |
| `contextMenus` | To add "Save to Savedly" to the right-click menu for pages, links, images and selected text. |
| `notifications` | To tell the user that a save worked or failed when it was started from the right-click menu, the keyboard shortcut or the on-page button, where there is no popup to show it. |
| `alarms` | To check for due reminders and show them as notifications, and to refresh the list of saved pages (kept as short hashes on the device) every few minutes. |
| `sidePanel` | To show Savedly in Chrome's side panel: the current page, the user's Inbox, search, recent saves and collections. |
| `scripting` | To load the extension's own content script (the file already in the package) into tabs that were open before the extension was installed or updated, so the on-page button, highlights and the side panel work there without the user reloading each tab. |
| Host permission (all sites) | The user can save from any site. The content script shows the on-page save button, draws the screenshot selection, shows and saves highlights, and reads the page's description; capturing a screenshot started from that button needs access to the page being captured. The side panel shows the page in the current tab, which needs its address; it isn't sent anywhere unless the user saves or highlights it. The extension also sends saves to the Savedly server. |

**Remote code:** No. All code is in the package.

**Data usage.** Tick these, and nothing else:

- **Website content**: the text, address and images of pages the user chooses to save.
- **Web history**: only the address and title of pages the user chooses to save. It is not a record of browsing, but ticking it is the cautious reading of Google's definition.

Then certify all three statements: data is not sold, is not used for purposes
unrelated to the single purpose, and is not used for creditworthiness or lending.

**Privacy policy URL:** `https://savedly.app/privacy#browser-extension`

## Test instructions for the reviewer

Review needs an account. Create a test account on savedly.app and give its
sign-in details in the "Test instructions" box:

> 1. Sign in at https://savedly.app with the account above.
> 2. Open any web page and click the Savedly icon: the page's title appears. Click "Save to Savedly".
> 3. Select some text on a page: a small toolbar appears. Pick a colour to highlight it.
> 4. Press Ctrl+Shift+E (or right-click → Save to Savedly → Open Savedly side panel) to open the side panel.
> 5. Right-click a link, image or selected text → "Save to Savedly".
> 6. Saved items appear at https://savedly.app/app/memories.

## After it is approved

- Publish the website's /chrome-extension page with (or after) the update: it describes 1.2.
- A self-hosted install can't use the store build, which talks to savedly.app.
  It builds its own copy: `SAVEDLY_API_ORIGIN=https://api.example.com SAVEDLY_WEB_URL=https://example.com pnpm build`.
