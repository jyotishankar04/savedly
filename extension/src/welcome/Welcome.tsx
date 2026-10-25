import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, MoreVertical, Pin, Puzzle, RotateCw, Search } from "lucide-react";
import { WEB_APP_URL } from "../lib/config";
import saveShot from "./shots/save.webp";
import suggestShot from "./shots/suggest.webp";
import highlightShot from "./shots/highlight.webp";
import sidepanelShot from "./shots/sidepanel.webp";
import regionShot from "./shots/region.webp";
import searchShot from "./shots/search.webp";
import savedShot from "./shots/saved.webp";
import floatingShot from "./shots/floating.webp";
import { PANEL_NAME } from "../lib/side-panel";

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);
const ICON = chrome.runtime.getURL("icon-48.png");

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  extra?: React.ReactNode;
  visual: React.ReactNode;
}

/** A shortcut as keys: "Ctrl+Shift+S" or, on a Mac, "⇧⌘S". */
function Keys({ shortcut }: { shortcut: string }) {
  const keys = shortcut.includes("+") ? shortcut.split("+") : Array.from(shortcut);
  return (
    <span className="keys">
      {keys.map((k, i) => (
        <kbd key={i}>{k}</kbd>
      ))}
    </span>
  );
}

// Firefox won't open its own about: pages from an extension, but has a call for this one.
const openShortcuts = () =>
  void (__FIREFOX__
    ? (globalThis as { browser?: { commands?: { openShortcutSettings?(): Promise<void> } } }).browser?.commands?.openShortcutSettings?.()
    : chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));

/** A command's shortcut as Chrome has it (people can change them, and Chrome leaves one unset when it's taken). */
function CommandKeys({ shortcut }: { shortcut: string | undefined }) {
  if (shortcut === undefined) return null;
  if (!shortcut) {
    return (
      <span className="unset">
        No shortcut set. <button onClick={openShortcuts}>Choose one</button>
      </span>
    );
  }
  return <Keys shortcut={shortcut} />;
}

function Try({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="try-row">
      <span className="try-label">{label}</span>
      {children}
    </div>
  );
}

function Browser({ url, src, alt }: { url: string; src: string; alt: string }) {
  return (
    <div className="browser">
      <div className="browser-bar">
        <div className="browser-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="browser-url">{url}</div>
      </div>
      <img src={src} alt={alt} />
    </div>
  );
}

/**
 * The tour of what the extension does, one feature per slide, with real
 * screenshots. Opens once when the extension is installed; it can be opened
 * again from the Savedly icon's right-click menu.
 */
export default function Welcome() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({});

  const checkSignIn = useCallback(() => {
    chrome.runtime.sendMessage({ action: "SYNC_AUTH" }, (response?: { signedIn?: boolean }) => {
      void chrome.runtime.lastError;
      setSignedIn(!!response?.signedIn);
    });
  }, []);

  useEffect(() => {
    checkSignIn();
    chrome.commands.getAll((commands) => setShortcuts(Object.fromEntries(commands.map((c) => [c.name ?? "", c.shortcut ?? ""]))));
    // Back from signing in, or from changing a shortcut.
    const onFocus = () => {
      checkSignIn();
      chrome.commands.getAll((commands) => setShortcuts(Object.fromEntries(commands.map((c) => [c.name ?? "", c.shortcut ?? ""]))));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkSignIn]);

  const quickSave = shortcuts["quick-save-page"];
  // Firefox names the sidebar's shortcut itself.
  const sidePanel = shortcuts[__FIREFOX__ ? "_execute_sidebar_action" : "open-side-panel"];
  const altH = IS_MAC ? "⌥+H" : "Alt+H";
  const openApp = (path: string) => void chrome.tabs.create({ url: `${WEB_APP_URL}${path}` });

  const signInStatus =
    signedIn === null ? null : signedIn ? (
      <div className="status">
        <span className="dot" /> You're signed in to Savedly
      </div>
    ) : (
      <div className="status out">
        <span className="dot" /> Not signed in yet. You'll need to sign in to save.
      </div>
    );

  const slides: Slide[] = [
    {
      id: "welcome",
      eyebrow: "Welcome",
      title: "Save anything. Find it by what you remember.",
      body: (
        <>
          <p>Here's what the Savedly extension can do. It takes about a minute: use the arrow keys or the buttons below.</p>
          <p>
            First, <strong>pin Savedly</strong> so it's always one click away: click the puzzle piece in the toolbar, then {__FIREFOX__ ? <>the gear next to Savedly and <strong>Pin to Toolbar</strong></> : "the pin next to Savedly"}. Its icon stays in the toolbar from then on.
          </p>
        </>
      ),
      extra: signInStatus,
      visual: (
        <>
          <div className="chrome-toolbar">
            <div className="chrome-icon">
              <RotateCw size={16} />
            </div>
            <div className="chrome-omni">savedly.app</div>
            <div className="chrome-icon ring">
              <Puzzle size={17} />
              <span className="step-num">1</span>
            </div>
            <div className="chrome-icon">
              <MoreVertical size={17} />
            </div>
          </div>
          <div className="ext-menu">
            <h4>Extensions</h4>
            <div className="ext-row">
              <img src={ICON} alt="" />
              <span className="name">Savedly</span>
              <div className="chrome-icon ring" style={{ width: 30, height: 30 }}>
                <Pin size={15} />
                <span className="step-num">2</span>
              </div>
            </div>
            <div className="ext-row dim">
              <span className="ph" />
              <span className="name" style={{ fontWeight: 500 }}>Your other extensions</span>
              <Pin size={15} />
            </div>
          </div>
          <div className="chrome-toolbar bottom-bar">
            <div className="chrome-icon">
              <RotateCw size={16} />
            </div>
            <div className="chrome-omni">Any page you want to keep</div>
            <div className="chrome-icon ring">
              <img src={ICON} alt="" width={22} height={22} />
              <span className="step-num">3</span>
            </div>
            <div className="chrome-icon">
              <Puzzle size={17} />
            </div>
          </div>
        </>
      ),
    },
    {
      id: "save",
      eyebrow: "Save",
      title: "Save any page in one click",
      body: (
        <p>
          Click the Savedly icon on any page. Add a note or tags if you like, or just save: Savedly reads the page and writes a short summary for you.
        </p>
      ),
      extra: (
        <div className="try">
          <Try label="Save without opening anything">
            <CommandKeys shortcut={quickSave} />
          </Try>
        </div>
      ),
      visual: <img className="shot popup" src={saveShot} alt="The Savedly popup ready to save a page, with a cover picture, suggestions and a note field" />,
    },
    {
      id: "suggest",
      eyebrow: "Organize",
      title: "It suggests where things go",
      body: (
        <p>
          Savedly suggests a collection and tags for the page, keeps the collections you use most one tap away, and lets you pick which picture shows on the card. Nothing is applied until you tap it.
        </p>
      ),
      visual: <img className="shot popup" src={suggestShot} alt="Cover choices, a suggested collection and tags, and recent collections in the popup" />,
    },
    {
      id: "highlight",
      eyebrow: "Highlight",
      title: "Highlight what matters",
      body: (
        <p>
          Select text on any page and pick a colour, or add a note. Your highlights are there again when you come back to the page, and you can search them in Savedly.
        </p>
      ),
      extra: (
        <div className="try">
          <Try label="Highlight the selection">
            <Keys shortcut={altH} />
          </Try>
        </div>
      ),
      visual: <Browser url="savedly.app/blog/building-savedly-second-brain" src={highlightShot} alt="A page with a passage highlighted in yellow and the Savedly highlight toolbar above a selection" />,
    },
    {
      id: "sidepanel",
      eyebrow: __FIREFOX__ ? "Sidebar" : "Side panel",
      title: "Savedly beside the page",
      body: (
        <p>
          The {PANEL_NAME} shows what Savedly knows about the page you're on, its highlights, your Inbox, search, recent saves and collections. It follows you from tab to tab.
        </p>
      ),
      extra: (
        <div className="try">
          <Try label="Open it">
            <CommandKeys shortcut={sidePanel} />
          </Try>
        </div>
      ),
      visual: <img className="shot panel" src={sidepanelShot} alt="The Savedly side panel showing the current page, its summary, highlights and the Inbox" />,
    },
    {
      id: "rightclick",
      eyebrow: "Right-click",
      title: "Right-click to save",
      body: (
        <p>
          Save the page, a link, an image or the text you selected from the right-click menu, or send the page straight to one of your recent collections.
        </p>
      ),
      visual: (
        <div className="pair" aria-label="Chrome's right-click menu with Save to Savedly open and its Save to collection list" role="img">
          <div className="ctx" style={{ left: "2%", top: "12%", width: 210 }}>
            <div className="ctx-item dim">Back</div>
            <div className="ctx-item dim">Reload</div>
            <div className="ctx-sep" />
            <div className="ctx-item on">
              <img src={ICON} alt="" />
              <span className="grow">Save to Savedly</span>
              <ChevronRight size={14} />
            </div>
            <div className="ctx-sep" />
            <div className="ctx-item dim">Inspect</div>
          </div>
          <div className="ctx" style={{ left: "31%", top: "calc(12% + 72px)", width: 210 }}>
            <div className="ctx-item">Open Savedly {PANEL_NAME}</div>
            <div className="ctx-item">Save this page</div>
            <div className="ctx-item">
              <span className="grow">Capture screenshot</span>
              <ChevronRight size={14} />
            </div>
            <div className="ctx-item on">
              <span className="grow">Save to collection</span>
              <ChevronRight size={14} />
            </div>
          </div>
          <div className="ctx" style={{ left: "60%", top: "calc(12% + 177px)", width: 170 }}>
            <div className="ctx-item">📖 Reading</div>
            <div className="ctx-item">💡 Product ideas</div>
            <div className="ctx-item">✈️ Travel</div>
          </div>
        </div>
      ),
    },
    {
      id: "screenshot",
      eyebrow: "Screenshots",
      title: "Capture part of a page",
      body: (
        <p>
          Drag over the part you want, or capture everything you can see. Savedly keeps the text in that area too, so screenshots turn up when you search.
        </p>
      ),
      extra: (
        <div className="try">
          <Try label="In the popup">
            <span className="keys">
              <kbd>Region</kbd>
              <kbd>Visible</kbd>
            </span>
          </Try>
        </div>
      ),
      visual: <Browser url="savedly.app/blog/find-it-by-what-you-remember" src={regionShot} alt="Dragging a box over part of a page to screenshot it" />,
    },
    {
      id: "find",
      eyebrow: "Find",
      title: "Find it by what you remember",
      body: (
        <>
          <p>Search your library from the popup or the side panel, or right from the address bar: type sv, a space, then what you remember.</p>
          <p>
            A <strong>✓ on the Savedly icon</strong> means you've already saved the page you're on.
          </p>
        </>
      ),
      extra: (
        <div className="try">
          <Try label="In the address bar">
            <span className="keys">
              <kbd>sv</kbd>
              <kbd>Space</kbd>
            </span>
          </Try>
        </div>
      ),
      visual: (
        <>
          <div className="chrome-toolbar">
            <div className="chrome-omni">
              <Search size={15} />
              <span style={{ fontWeight: 700, color: "var(--text)" }}>Savedly</span>
              <span style={{ color: "var(--faint)" }}>|</span>
              <span style={{ color: "var(--text)" }}>second brain</span>
            </div>
            <div className="chrome-icon" title="The Savedly icon">
              <img src={ICON} alt="" width={22} height={22} />
              <span className="badge">✓</span>
            </div>
          </div>
          <div className="suggest-list" role="img" aria-label="Address bar suggestions from your Savedly library">
            <div className="suggest-row on">
              <Search size={15} />
              <span>
                Search your Savedly library for <mark>second brain</mark>
              </span>
            </div>
            <div className="suggest-row">
              <img src={ICON} alt="" width={16} height={16} />
              <span>
                Building Savedly: a second brain <span className="dim">savedly.app</span>
              </span>
            </div>
            <div className="suggest-row">
              <img src={ICON} alt="" width={16} height={16} />
              <span>
                Pricing | Savedly <span className="dim">savedly.app</span>
              </span>
            </div>
          </div>
          <img className="shot popup hide-narrow" src={searchShot} alt="Searching from the Savedly popup" style={{ position: "absolute", right: 40, bottom: -40, maxWidth: 280, maxHeight: "none" }} />
        </>
      ),
    },
    {
      id: "later",
      eyebrow: "Read later",
      title: "Read it later, or be reminded",
      body: (
        <p>
          Links, videos and documents you save wait in your Inbox until you've read them. Pick a time with Remind me and Savedly brings it back with a notification.
        </p>
      ),
      visual: <img className="shot popup" src={savedShot} alt="A saved page in the popup: what Savedly understood, In your Inbox, Remind me and highlights" />,
    },
    {
      id: "button",
      eyebrow: "On every page",
      title: "A button on every page",
      body: (
        <p>
          The Savedly button sits at the edge of the page for quick saves{__FIREFOX__ ? " and screenshots" : ", screenshots and the side panel"}. Drag it wherever suits you, or hide it from the popup.
        </p>
      ),
      visual: <img className="shot" src={floatingShot} alt="The floating Savedly button with its menu open" style={{ maxWidth: "min(340px, 100%)" }} />,
    },
    {
      id: "done",
      eyebrow: "All set",
      title: "You're ready to save",
      body: signedIn ? (
        <p>Start with the page you want to keep. Everything you save is waiting for you in Savedly.</p>
      ) : (
        <p>Sign in to Savedly to start saving. The extension uses the same sign-in as the website, so there's nothing else to set up.</p>
      ),
      extra: (
        <>
          <div className="actions">
            {signedIn ? (
              <button className="btn btn-primary" onClick={() => openApp("/app")}>
                Open Savedly <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => openApp("/auth/login")}>
                  Sign in <ArrowRight size={16} />
                </button>
                <button className="btn btn-secondary" onClick={() => openApp("/auth/signup")}>
                  Create an account
                </button>
              </>
            )}
          </div>
          <p style={{ fontSize: 14, marginTop: 22 }}>See this tour again any time: right-click the Savedly icon and choose “Take the tour”.</p>
        </>
      ),
      visual: (
        <div className="shortcut-card">
          <div className="shortcut-row">
            Save the page
            <CommandKeys shortcut={quickSave} />
          </div>
          <div className="shortcut-row">
            Open the {PANEL_NAME}
            <CommandKeys shortcut={sidePanel} />
          </div>
          <div className="shortcut-row">
            Highlight the selection
            <Keys shortcut={altH} />
          </div>
          <div className="shortcut-row">
            Search from the address bar
            <span className="keys">
              <kbd>sv</kbd>
              <kbd>Space</kbd>
            </span>
          </div>
          <div className="shortcut-row" style={{ justifyContent: "flex-end" }}>
            <button className="link-button" onClick={openShortcuts} style={{ color: "var(--accent)" }}>
              Change shortcuts
            </button>
          </div>
        </div>
      ),
    },
  ];

  const last = slides.length - 1;
  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(last, to));
      if (next === index) return;
      setDir(next > index ? "next" : "prev");
      setIndex(next);
    },
    [index, last]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(index + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(index - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(last);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, last]);

  const slide = slides[index];

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <img src={ICON} alt="" />
          <span>
            saved<span className="ly">ly</span>
          </span>
        </div>
        {index < last && (
          <button className="link-button" onClick={() => go(last)}>
            Skip the tour
          </button>
        )}
      </header>

      <main className="slide" key={slide.id} data-dir={dir} aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}>
        <div className="copy">
          <div className="eyebrow">
            {slide.eyebrow}
            <span className="count">
              {index + 1} / {slides.length}
            </span>
          </div>
          <h1>{slide.title}</h1>
          {slide.body}
          {slide.extra}
        </div>
        <div className="stage">{slide.visual}</div>
      </main>

      <footer className="bottom">
        <nav className="progress" aria-label="Tour slides">
          {slides.map((s, i) => (
            <button key={s.id} aria-label={`${i + 1}: ${s.title}`} aria-current={i === index ? "step" : undefined} className={i < index ? "done" : undefined} onClick={() => go(i)}>
              <span />
            </button>
          ))}
        </nav>
        <div className="nav-buttons">
          <button className="btn btn-secondary" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous">
            <ArrowLeft size={16} /> Back
          </button>
          {index < last && (
            <button className="btn btn-primary" onClick={() => go(index + 1)}>
              {index === 0 ? "Show me" : "Next"} <ArrowRight size={16} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
