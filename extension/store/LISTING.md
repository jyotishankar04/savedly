# Chrome Web Store listing

Everything to paste into the Chrome Web Store developer dashboard
(https://chrome.google.com/webstore/devconsole). The package to upload is made
with `pnpm package` in `extension/`, which writes `savedly-extension-<version>.zip`.

## Before you submit

1. The website must be deployed with the privacy policy's "The browser
   extension" section live, because the listing links to it.
2. Load the production build once and try it against the real service:
   `pnpm build`, then chrome://extensions → Developer mode → Load unpacked →
   `extension/dist`. Sign in at savedly.app, save a page, take a screenshot.
3. Raise `version` in `public/manifest.json` and `package.json` for every
   later upload. The store rejects a version it has already seen.

## Store listing

**Name:** Savedly

**Summary** (132 characters at most):

> Save pages, links, text, images and screenshots to Savedly, and find them again by describing what you remember.

**Category:** Productivity → Tools (or "Workflow & Planning")

**Language:** English

**Description:**

```
Savedly is a place to keep what you find on the web, and to find it again later by describing what you remember.

This extension is the quick way in. It needs a Savedly account (free), and uses the sign-in you already have at savedly.app.

WHAT IT DOES

• Save the page you're on, with an optional note, tags and collection.
• Right-click to save a link, an image, or the text you've selected.
• Take a screenshot of an area, or of the visible page, and save it.
• Press Ctrl+Shift+S (Cmd+Shift+S on Mac) to save the current page at once.
• An optional button on the page gives the same actions. You can turn it off from the extension.

WHAT HAPPENS AFTER YOU SAVE

Savedly reads what you saved, writes a short summary, and suggests tags. Later you can search in your own words, or ask a question and get an answer that shows which of your saved items it came from.

PRIVACY

Nothing about a page is sent until you choose to save it. The extension does not collect your browsing history. Savedly is open source, so you can read exactly what it does: https://github.com/jyotishankar04/savedly

Privacy policy: https://savedly.app/privacy
```

**Images** (in this folder):

| Field | File | Size |
| --- | --- | --- |
| Store icon | `../public/icon-128.png` | 128×128 |
| Screenshot 1 | `screenshot-1-save-a-page.png` | 1280×800 |
| Screenshot 2 | `screenshot-2-on-page-button.png` | 1280×800 |
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
| Host permission (all sites) | The user can save from any site. The content script shows the on-page save button, draws the screenshot selection and reads the page's description; capturing a screenshot started from that button needs access to the page being captured. The extension also sends the save to the Savedly server. |

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
> 3. Right-click a link, image or selected text → "Save to Savedly".
> 4. Saved items appear at https://savedly.app/app/memories.

## After it is approved

- Put the store link on the website, which says "Coming soon" for the extension today.
- A self-hosted install can't use the store build, which talks to savedly.app.
  It builds its own copy: `SAVEDLY_API_ORIGIN=https://api.example.com SAVEDLY_WEB_URL=https://example.com pnpm build`.
