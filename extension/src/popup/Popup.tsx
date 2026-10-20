import React, { useEffect, useRef, useState } from "react";
import {
  Check, AlertCircle, RefreshCw, Settings, ExternalLink, X, Camera, FileText, ChevronDown, Maximize, Eye, EyeOff, Search, PanelRight, Sparkles
} from "lucide-react";
import { SavedPanel } from "./SavedPanel";
import { SearchPanel } from "./SearchPanel";
import { timeAgo } from "../lib/remind";
import { apiFetch, ApiError } from "../lib/api";
import { API_BASE, SHOW_FLOATING_ICON_STORAGE_KEY, SIGNED_IN_STORAGE_KEY, WEB_APP_URL } from "../lib/config";

type ExtensionState = "checking" | "unauthorized" | "unreachable" | "notWebPage" | "ready" | "saving" | "saved" | "error";

interface PageInfo {
  url: string;
  title: string;
  favIconUrl?: string;
  description?: string;
  previewImage?: string;
  keywords?: string;
  /** Pictures on the page that could be the cover, best first. */
  images?: string[];
}

/** POST /memories/suggest: where this page could go, before it's saved. */
interface Suggestion {
  collection: { id: string | null; name: string; isNew: boolean } | null;
  tags: string[];
}

interface CreatedMemory {
  id: string;
  title: string;
  duplicateOf: { id: string; title: string } | null;
}

/** GET /memories/lookup: this page, when it's already in the library. */
interface SavedPage {
  id: string;
  title: string;
  createdAt: string;
  collections: { id: string; name: string }[];
}

interface Collection {
  id: string;
  name: string;
  icon: string;
}

export default function Popup() {
  const [state, setState] = useState<ExtensionState>("checking");
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedMemory, setSavedMemory] = useState<CreatedMemory | null>(null);
  const [note, setNote] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [captureMode, setCaptureMode] = useState<"page" | "screenshot" | "fullscreenshot">("page");
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const collectionsRef = useRef<HTMLDivElement>(null);
  // The tab loadPageInfo already resolved via chrome.tabs.query — captured
  // here so the screenshot triggers below can hand it straight to the
  // background worker instead of it re-querying "the active tab" itself
  // after the popup has already closed, which is a real race (the
  // background's query can land on the wrong window, e.g. if a DevTools
  // window is focused at that exact moment) that this sidesteps entirely.
  const activeTabIdRef = useRef<number | null>(null);
  const [showFloatingIcon, setShowFloatingIcon] = useState(true);
  // Search instead of saving, from the header's search button.
  const [searching, setSearching] = useState(false);
  // This page is already saved: show it, unless they choose to save it again.
  const [existing, setExisting] = useState<SavedPage | null>(null);
  const [saveAgain, setSaveAgain] = useState(false);
  // The smarter save form: one-tap recent collections, AI suggestions, a cover picture.
  const [recentCollections, setRecentCollections] = useState<Collection[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  // Pictures that failed to load (blocked, gone, not an image): never offered, never saved as the cover.
  const [brokenImages, setBrokenImages] = useState<string[]>([]);
  const coverChoices = (pageInfo?.images ?? []).filter((src) => !brokenImages.includes(src)).slice(0, 4);
  const chosenCover = cover && coverChoices.includes(cover) ? cover : (coverChoices[0] ?? null);
  const coverUrl = chosenCover ?? (pageInfo?.previewImage && !brokenImages.includes(pageInfo.previewImage) ? pageInfo.previewImage : undefined);

  // The floating on-page button defaults to shown, so it only needs
  // reading here (not writing) unless the user actually toggles it —
  // content-script.ts applies the same default independently.
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage) return;
    chrome.storage.local.get([SHOW_FLOATING_ICON_STORAGE_KEY], (result) => {
      setShowFloatingIcon(result[SHOW_FLOATING_ICON_STORAGE_KEY] ?? true);
    });
  }, []);

  const toggleFloatingIcon = () => {
    const next = !showFloatingIcon;
    setShowFloatingIcon(next);
    chrome.storage.local.set({ [SHOW_FLOATING_ICON_STORAGE_KEY]: next });
  };

  // Closes the collections dropdown on an outside click.
  useEffect(() => {
    if (!collectionsOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (collectionsRef.current && !collectionsRef.current.contains(e.target as Node)) {
        setCollectionsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [collectionsOpen]);

  // Real collections, fetched as soon as the page is loaded and ready to
  // save — the picker used to list 3 hardcoded names; this is the user's
  // actual collection set, same GET /collections the dashboard uses.
  useEffect(() => {
    if (state !== "ready") return;
    apiFetch<Collection[]>("/collections")
      .then(setCollections)
      .catch(() => {
        // Non-fatal — the picker just stays empty.
      });
  }, [state]);

  const toggleCollection = (id: string) => {
    setSelectedCollectionIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const addTagFromDraft = () => {
    const value = tagDraft.trim();
    if (value && !tags.includes(value)) {
      setTags((prev) => [...prev, value]);
    }
    setTagDraft("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage) {
      // Not actually running inside a Chrome extension host (e.g. loaded as
      // a plain web page during development) — nothing real to check.
      setState("unauthorized");
      return;
    }

    // Ask the background worker whether this browser is signed in to
    // Savedly (it checks with the server, renewing the sign-in if it has
    // run out; see lib/api.ts).
    let settled = false;
    const proceed = (signedIn: boolean, problem: string | null = null) => {
      if (settled) return;
      settled = true;
      if (signedIn) loadPageInfo();
      // Not a sign-in question at all: the server couldn't be asked. Say so, instead of asking them to sign in again.
      else if (problem) {
        setErrorMessage(problem);
        setState("unreachable");
      } else setState("unauthorized");
    };

    // If the background worker is slow to answer (waking up, a slow server,
    // a screenshot upload in flight) and the last answer was "signed in", go
    // with that rather than keep the spinner up. A last answer of "no" waits
    // for the real one: guessing "signed out" sent people to sign in again
    // when the real trouble was reaching the server.
    const quick = setTimeout(() => {
      chrome.storage.local.get([SIGNED_IN_STORAGE_KEY], (result) => {
        if (result[SIGNED_IN_STORAGE_KEY]) proceed(true);
      });
    }, 2500);
    const giveUp = setTimeout(() => proceed(false, "Savedly didn't answer in time. Check that the server is running, then try again."), 15000);
    chrome.runtime.sendMessage({ action: "SYNC_AUTH" }, (response?: { signedIn?: boolean; problem?: string | null }) => {
      clearTimeout(quick);
      clearTimeout(giveUp);
      if (chrome.runtime.lastError || !response) {
        proceed(false, `The extension's background didn't answer (${chrome.runtime.lastError?.message ?? "no response"}). Try reloading the extension.`);
        return;
      }
      proceed(!!response.signedIn, response.problem ?? null);
    });
  }, []);

  // Only for a page about to be saved: recent collections and what the AI suggests (no chips if either fails).
  useEffect(() => {
    if (state !== "ready" || !pageInfo || (existing && !saveAgain)) return;
    apiFetch<Collection[]>("/collections/recent").then(setRecentCollections).catch(() => undefined);
    apiFetch<Suggestion>("/memories/suggest", {
      method: "POST",
      body: JSON.stringify({ url: pageInfo.url, title: pageInfo.title.slice(0, 500), description: pageInfo.description?.slice(0, 2000) }),
    })
      .then(setSuggestion)
      .catch(() => undefined);
  }, [state, pageInfo, existing, saveAgain]);

  // A suggested collection that doesn't exist yet is made when it's tapped.
  const applySuggestedCollection = async () => {
    const pick = suggestion?.collection;
    if (!pick) return;
    if (pick.id) {
      if (!selectedCollectionIds.includes(pick.id)) setSelectedCollectionIds((ids) => [...ids, pick.id!]);
      return;
    }
    try {
      const created = await apiFetch<Collection>("/collections", { method: "POST", body: JSON.stringify({ name: pick.name }) });
      setCollections((list) => [...list, created]);
      setSelectedCollectionIds((ids) => [...ids, created.id]);
      setSuggestion((current) => (current ? { ...current, collection: { id: created.id, name: created.name, isNew: false } } : current));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't create that collection.");
    }
  };

  const getPageMetadata = (tabId: number): Promise<{ description?: string; previewImage?: string; keywords?: string; images?: string[] }> => {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: "GET_METADATA" }, (response) => {
        // Content script may not be injected on this page (e.g. chrome:// URLs).
        if (chrome.runtime.lastError || !response) {
          resolve({});
        } else {
          resolve(response);
        }
      });
    });
  };

  // Just reads the tab — no network write. Opening the popup used to
  // auto-save the page immediately, with no way to know whether that's
  // actually what the user wanted; now it only loads a preview, and
  // nothing is saved until "Save to Savedly" is clicked below.
  const loadPageInfo = async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.url || !activeTab.id) {
      setState("error");
      setErrorMessage("Couldn't read the current tab.");
      return;
    }

    activeTabIdRef.current = activeTab.id;
    // Chrome's own pages, other extensions' pages, files: nothing Savedly could open again or read.
    if (!/^https?:\/\//.test(activeTab.url)) {
      setState("notWebPage");
      return;
    }
    // Opening the popup is asking about this page, so this one address goes to Savedly (browsing elsewhere never does).
    const lookup = apiFetch<SavedPage | null>(`/memories/lookup?url=${encodeURIComponent(activeTab.url)}`).catch(() => null);
    const metadata = await getPageMetadata(activeTab.id);
    setExisting(await lookup);
    setPageInfo({
      url: activeTab.url,
      title: activeTab.title || "Untitled Webpage",
      favIconUrl: activeTab.favIconUrl,
      description: metadata.description,
      previewImage: metadata.previewImage,
      keywords: metadata.keywords,
      images: metadata.images,
    });
    setState("ready");
  };

  const handleSave = async () => {
    if (!pageInfo) return;
    setState("saving");
    setErrorMessage(null);

    try {
      const isValidUrl = (value?: string) => {
        if (!value) return false;
        try {
          const parsed = new URL(value);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      };

      const keywords = (pageInfo.keywords ?? "")
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .slice(0, 20)
        .map((keyword) => keyword.slice(0, 50));

      const memory = await apiFetch<CreatedMemory>("/memories", {
        method: "POST",
        body: JSON.stringify({
          type: "web",
          url: pageInfo.url,
          title: pageInfo.title.slice(0, 500),
          description: pageInfo.description || undefined,
          faviconUrl: isValidUrl(pageInfo.favIconUrl) ? pageInfo.favIconUrl : undefined,
          previewImageUrl: isValidUrl(coverUrl) ? coverUrl : undefined,
          keywords: keywords.length > 0 ? keywords : undefined,
          content: note.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          collectionIds: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
          captureMethod: "extension",
        }),
      });

      setSavedMemory(memory);
      setState("saved");
      // The toolbar icon shows the check mark straight away.
      chrome.runtime.sendMessage({ action: "PAGE_SAVED", url: pageInfo.url, tabId: activeTabIdRef.current ?? undefined }, () => void chrome.runtime.lastError);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState("unauthorized");
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "Couldn't save this page.");
      setState("error");
    }
  };

  // Whatever the user already filled in here travels with a screenshot too
  // — the background worker attaches it to the memory it creates once the
  // capture (region or full viewport) actually happens. tabId/tabUrl are
  // the ones loadPageInfo already resolved, so the background worker
  // doesn't have to re-derive "the active tab" itself after the popup's
  // already closed.
  const buildCaptureContext = () => ({
    tabId: activeTabIdRef.current ?? undefined,
    tabUrl: pageInfo?.url,
    note: note.trim() || undefined,
    tags: tags.length > 0 ? tags : undefined,
    collectionIds: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
  });

  const handleTakeScreenshot = () => {
    if (typeof chrome === "undefined" || !chrome.runtime) return;
    chrome.runtime.sendMessage({ action: "START_SCREENSHOT_SELECTION", ...buildCaptureContext() });
    // The selection overlay lives on the page itself, so the popup just
    // gets out of the way — the background worker handles capture/upload/
    // save and reports back via a desktop notification. Nothing else was
    // saved by opening the popup, so there's nothing to undo here.
    window.close();
  };

  const handleFullPageScreenshot = () => {
    if (typeof chrome === "undefined" || !chrome.runtime) return;
    // "Full page" means the visible viewport, not the whole scrollable
    // page (see content-script.ts's captureFullViewport) — one
    // captureVisibleTab call, same as Region mode.
    chrome.runtime.sendMessage({ action: "CAPTURE_FULL_PAGE_SCREENSHOT", ...buildCaptureContext() });
    window.close();
  };

  const handleSignIn = () => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url: `${WEB_APP_URL}/auth/login` });
    } else {
      alert(`Opening ${WEB_APP_URL}/auth/login`);
    }
  };

  const handleOpenSavedly = (path = "/app") => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url: `${WEB_APP_URL}${path}` });
    } else {
      alert(`Redirecting to ${WEB_APP_URL}${path}`);
    }
  };

  return (
    <div style={styles.container}>
      
      {/* Extension Header */}
      <div style={styles.header}>
        <div style={styles.logoRow}>
          <img src={chrome.runtime.getURL("icon-48.png")} alt="" width={22} height={22} />
          <span style={styles.logoText}>
            saved<span style={{ fontWeight: 500, color: "#1447E6" }}>ly</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            style={styles.iconButton}
            title="Open Savedly in the side panel"
            aria-label="Open Savedly in the side panel"
            onClick={() => {
              // Straight from the click: the side panel opens only in direct answer to one.
              chrome.windows.getCurrent((win) => {
                if (win.id != null) void chrome.sidePanel.open({ windowId: win.id }).then(() => window.close());
              });
            }}
          >
            <PanelRight size={14} color="#8e8e93" />
          </button>
          {state !== "checking" && state !== "unauthorized" && (
            <button
              style={{ ...styles.iconButton, ...(searching ? { color: "#1447E6" } : {}) }}
              onClick={() => setSearching((on) => !on)}
              title={searching ? "Back to saving this page" : "Search your library"}
              aria-label={searching ? "Back to saving this page" : "Search your library"}
              aria-pressed={searching}
            >
              {searching ? <X size={14} color="#1447E6" /> : <Search size={14} color="#8e8e93" />}
            </button>
          )}
          {state !== "checking" && state !== "unauthorized" && (
            <button
              style={styles.iconButton}
              onClick={toggleFloatingIcon}
              title={showFloatingIcon ? "Hide the floating quick-actions button on pages" : "Show the floating quick-actions button on pages"}
            >
              {showFloatingIcon ? <Eye size={14} color="#8e8e93" /> : <EyeOff size={14} color="#8e8e93" />}
            </button>
          )}
          <button style={styles.iconButton} onClick={() => handleOpenSavedly()}>
            <Settings size={14} color="#8e8e93" />
          </button>
        </div>
      </div>

      {/* State Renderers */}

      {searching && state !== "checking" && state !== "unauthorized" && <SearchPanel />}

      {/* Already saved: what Savedly made of it, the Inbox, Remind me. */}
      {!searching && state === "ready" && existing && !saveAgain && (
        <div style={styles.savedForm}>
          <div style={styles.statusHeader}>
            <Check size={16} color="#1447E6" />
            <span style={styles.statusText}>Saved {timeAgo(existing.createdAt)}</span>
          </div>
          <SavedPanel memoryId={existing.id} />
          <button style={styles.primaryButton} onClick={() => handleOpenSavedly(`/app/memories/${existing.id}`)}>
            Open in Savedly
          </button>
          <button style={styles.linkButton} onClick={() => setSaveAgain(true)}>
            Save it again anyway
          </button>
        </div>
      )}

      {!searching && state === "checking" && (
        <div style={styles.centerContainer}>
          <RefreshCw size={24} color="#1447E6" className="animate-spin" />
          <p style={styles.statusLabel}>Connecting to Savedly...</p>
        </div>
      )}

      {!searching && state === "unreachable" && (
        <div style={styles.centerContainer}>
          <AlertCircle size={28} color="#ff3b30" />
          <p style={styles.errorLabel}>Can't reach Savedly</p>
          <p style={styles.errorSub}>{errorMessage}</p>
          <p style={{ ...styles.errorSub, fontFamily: "monospace", fontSize: "10px" }}>{API_BASE}</p>
          {/^https?:\/\/(localhost|127\.0\.0\.1)/.test(API_BASE) && (
            <p style={styles.errorSub}>
              This build uses a server on this computer. Make sure it's running, and if Chrome asked whether Savedly may access devices on your local
              network, allow it.
            </p>
          )}
          <button style={styles.secondaryButton} onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      )}

      {state === "unauthorized" && (
        <div style={styles.centerContainer}>
          <img src={chrome.runtime.getURL("icon-128.png")} alt="" width={56} height={56} />
          <p style={styles.unauthLabel}>Sign in to start saving</p>
          <p style={styles.unauthSub}>
            Sign in to Savedly on the website, then come back here. The extension uses that same sign-in, so there is nothing else to set up.
          </p>
          <button style={styles.primaryButton} onClick={handleSignIn}>
            Sign in to Savedly
          </button>
        </div>
      )}

      {!searching && state === "saving" && (
        <div style={styles.centerContainer}>
          <p style={styles.savingLabel}>Saving to Savedly...</p>
          <div style={styles.progressTrack}>
            <div style={styles.progressBar} />
          </div>
        </div>
      )}

      {!searching && state === "notWebPage" && (
        <div style={styles.centerContainer}>
          <FileText size={28} color="#8e8e93" />
          <p style={{ ...styles.errorLabel, color: "#1c1c1e" }}>This page can't be saved</p>
          <p style={styles.errorSub}>Savedly saves web pages. Open one and click the Savedly icon there, or search what you've saved.</p>
          <button style={styles.secondaryButton} onClick={() => setSearching(true)}>
            Search your library
          </button>
        </div>
      )}

      {!searching && state === "error" && (
        <div style={styles.centerContainer}>
          <AlertCircle size={28} color="#ff3b30" />
          <p style={styles.errorLabel}>Couldn't save page</p>
          <p style={styles.errorSub}>{errorMessage || "Make sure you are on a valid webpage context."}</p>
          <button style={styles.secondaryButton} onClick={loadPageInfo}>
            Try again
          </button>
        </div>
      )}

      {/* Nothing is saved yet here — opening the popup used to auto-save
          the page immediately, which meant it always happened whether or
          not that's what the user actually wanted (e.g. reaching for
          "Take Screenshot" instead). Now this is just a preview; "Save to
          Savedly" below is the only thing that writes anything. */}
      {!searching && state === "ready" && (!existing || saveAgain) && (
        <div style={styles.form}>
          {/* Page saves the tab as a link; Region hands off to the drag-select
              overlay on the page; Visible screenshots the current viewport.
              Note, tags and collections apply to all three. */}
          <div style={styles.segmented} role="tablist" aria-label="What to save">
            {(
              [
                ["page", "Page", FileText, "Save this page as a link"],
                ["screenshot", "Region", Camera, "Drag to screenshot part of the page"],
                ["fullscreenshot", "Visible", Maximize, "Screenshot what you can see"],
              ] as const
            ).map(([mode, label, Icon, title]) => (
              <button key={mode} type="button" role="tab" aria-selected={captureMode === mode} title={title} style={captureMode === mode ? styles.segmentActive : styles.segment} onClick={() => setCaptureMode(mode)}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* The page, with the picture its card will show. */}
          <div style={styles.pageCard}>
            <div style={styles.pageThumb}>
              {captureMode === "page" && chosenCover ? (
                <img src={chosenCover} alt="" referrerPolicy="no-referrer" onError={() => setBrokenImages((list) => (list.includes(chosenCover) ? list : [...list, chosenCover]))} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : captureMode !== "page" ? (
                captureMode === "screenshot" ? <Camera size={18} color="#1447E6" /> : <Maximize size={18} color="#1447E6" />
              ) : pageInfo?.favIconUrl ? (
                <img src={pageInfo.favIconUrl} alt="" width={20} height={20} />
              ) : (
                <FileText size={18} color="#1447E6" />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              <TextTruncate text={pageInfo?.title || "Untitled"} lines={2} style={styles.pageTitle} />
              <div style={styles.pageMeta}>
                {pageInfo?.favIconUrl && <img src={pageInfo.favIconUrl} alt="" width={12} height={12} style={{ borderRadius: 2, flexShrink: 0 }} />}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {captureMode === "page" ? getDomain(pageInfo?.url) : captureMode === "screenshot" ? "Drag over the part you want" : "What you can see on the page"}
                </span>
                {captureMode === "page" && coverChoices.length > 1 && (
                  <button type="button" style={styles.textLink} aria-expanded={coverOpen} onClick={() => setCoverOpen((open) => !open)}>
                    {coverOpen ? "Done" : "Change cover"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* The cover choices, the page's own picture first; one that fails to load drops out. */}
          {captureMode === "page" && coverOpen && coverChoices.length > 1 && (
            <div style={styles.coverGrid}>
              {coverChoices.map((src) => {
                const chosen = chosenCover === src;
                return (
                  <button key={src} type="button" title={src === pageInfo?.previewImage ? "The page's own picture" : "Use this picture"} aria-label={chosen ? "Cover picture (chosen)" : "Use this picture as the cover"} aria-pressed={chosen} style={{ ...styles.coverThumb, ...(chosen ? styles.coverThumbChosen : {}) }} onClick={() => setCover(src)}>
                    <img
                      src={src}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenImages((list) => (list.includes(src) ? list : [...list, src]))}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </button>
                );
              })}
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label} htmlFor="savedly-note">
              Note
            </label>
            <textarea id="savedly-note" style={styles.noteInput} rows={2} placeholder="Why are you saving this? It helps you find it later." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {/* Collections: the AI's suggestion first (never applied by itself), then the ones used most recently, then everything else under More. */}
          <div style={{ ...styles.field, position: "relative" }} ref={collectionsRef}>
            <span style={styles.label}>Collection</span>
            <div style={styles.chipRow}>
              {suggestion?.collection && (() => {
                const pick = suggestion.collection;
                const active = !!pick.id && selectedCollectionIds.includes(pick.id);
                return (
                  <button type="button" style={active ? styles.chipActive : styles.chipSuggested} onClick={() => (active ? toggleCollection(pick.id!) : void applySuggestedCollection())} title={pick.isNew ? "Suggested. Creates this collection" : "Suggested for this page"}>
                    <Sparkles size={11} />
                    {pick.name}
                    {pick.isNew && <span style={{ opacity: 0.7, fontWeight: 600 }}>new</span>}
                  </button>
                );
              })()}
              {recentCollections
                .filter((c) => c.id !== suggestion?.collection?.id)
                .map((c) => (
                  <button key={c.id} type="button" style={selectedCollectionIds.includes(c.id) ? styles.chipActive : styles.chip} onClick={() => toggleCollection(c.id)}>
                    <span>{/^\p{Extended_Pictographic}/u.test(c.icon) ? c.icon : "📁"}</span>
                    {c.name}
                  </button>
                ))}
              {/* Picked from More but not shown above. */}
              {collections
                .filter((c) => selectedCollectionIds.includes(c.id) && c.id !== suggestion?.collection?.id && !recentCollections.some((r) => r.id === c.id))
                .map((c) => (
                  <button key={c.id} type="button" style={styles.chipActive} onClick={() => toggleCollection(c.id)}>
                    <span>{/^\p{Extended_Pictographic}/u.test(c.icon) ? c.icon : "📁"}</span>
                    {c.name}
                  </button>
                ))}
              <button type="button" style={styles.chipGhost} aria-expanded={collectionsOpen} onClick={() => setCollectionsOpen((open) => !open)}>
                All collections
                <ChevronDown size={11} />
              </button>
            </div>
                {collectionsOpen && (
                  <div style={styles.dropdownMenu}>
                    {collections.length === 0 ? (
                      <div style={styles.dropdownEmpty}>No collections yet</div>
                    ) : (
                      [...collections]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((collection) => {
                          const isActive = selectedCollectionIds.includes(collection.id);
                          return (
                            <button type="button" key={collection.id} style={styles.dropdownItem} onClick={() => toggleCollection(collection.id)}>
                              <Check size={12} color="#1447E6" style={{ visibility: isActive ? "visible" : "hidden", flexShrink: 0 }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {/^\p{Extended_Pictographic}/u.test(collection.icon) ? collection.icon : "📁"} {collection.name}
                              </span>
                            </button>
                          );
                        })
                    )}
                  </div>
                )}
          </div>

          {/* Tags: typed ones, plus the AI's suggestions to tap. */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="savedly-tags">
              Tags
            </label>
            <div style={styles.tagField} onClick={() => document.getElementById("savedly-tags")?.focus()}>
              {tags.map((tag) => (
                <button key={tag} type="button" style={styles.tagChip} onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
                  #{tag}
                  <X size={10} />
                </button>
              ))}
              <input
                id="savedly-tags"
                style={styles.tagFieldInput}
                placeholder={tags.length === 0 ? "Add a tag and press Enter" : "Add another"}
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTagFromDraft();
                  } else if (e.key === "Backspace" && !tagDraft && tags.length > 0) {
                    removeTag(tags[tags.length - 1]);
                  }
                }}
                onBlur={addTagFromDraft}
              />
            </div>
            {suggestion && suggestion.tags.some((t) => !tags.includes(t)) && (
              <div style={styles.chipRow}>
                {suggestion.tags
                  .filter((t) => !tags.includes(t))
                  .map((tag) => (
                    <button key={tag} type="button" style={styles.chipSuggestTag} onClick={() => setTags((list) => [...list, tag])} title="Suggested for this page">
                      + {tag}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Always in reach, however long the form gets. */}
          <div style={styles.footer}>
            <button style={{ ...styles.primaryButton, width: "100%", height: "40px", fontSize: "13px" }} onClick={captureMode === "page" ? handleSave : captureMode === "screenshot" ? handleTakeScreenshot : handleFullPageScreenshot}>
              {captureMode === "page" ? "Save to Savedly" : captureMode === "screenshot" ? "Select an area to save" : "Save what's visible"}
            </button>
          </div>
        </div>
      )}

      {!searching && state === "saved" && (
        <div style={styles.savedForm}>
          <div style={styles.statusHeader}>
            <Check size={16} color="#1447E6" />
            <span style={styles.statusText}>Saved to Savedly</span>
          </div>

          {/* Non-blocking duplicate notice (docs/URL_CAPTURE_AND_PREVIEW.md —
              the memory above was already created either way). */}
          {savedMemory?.duplicateOf && (
            <div style={styles.duplicateNotice}>
              <RefreshCw size={12} color="#8e8e93" />
              <span>
                You already saved a similar link ("{savedMemory.duplicateOf.title}").{" "}
                <button
                  style={styles.inlineLinkButton}
                  onClick={() => handleOpenSavedly(`/app/memories/${savedMemory.duplicateOf!.id}`)}
                >
                  View it
                </button>
              </span>
            </div>
          )}

          {savedMemory ? (
            <SavedPanel memoryId={savedMemory.id} />
          ) : (
            <div style={styles.previewBox}>
              <TextTruncate text={pageInfo?.title || "Untitled"} lines={2} style={styles.previewTitle} />
              <span style={styles.previewDomain}>{getDomain(pageInfo?.url)}</span>
            </div>
          )}

          <button style={styles.primaryButton} onClick={() => window.close()}>
            Done
          </button>

          <button style={styles.openDashboardLink} onClick={() => handleOpenSavedly()}>
            <span>Open Savedly</span>
            <ExternalLink size={12} style={{ marginLeft: 4 }} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes fillProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}

// Helpers
function getDomain(url?: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "");
  } catch (e) {
    return "";
  }
}

const TextTruncate = ({ text, lines, style }: { text: string; lines: number; style: React.CSSProperties }) => {
  return (
    <div style={{ ...style, display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
      {text}
    </div>
  );
};

// inline Styles
const styles = {
  container: {
    width: "100%",
    backgroundColor: "#ffffff",
    padding: "16px",
    boxSizing: "border-box" as const,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  logoText: {
    fontSize: "15px",
    fontWeight: "bold",
    letterSpacing: "-0.5px",
  },
  iconButton: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "4px",
  },
  centerContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "36px 0",
    textAlign: "center" as const,
  },
  statusLabel: {
    fontSize: "12px",
    color: "#8e8e93",
    marginTop: "12px",
  },
  unauthLabel: {
    fontSize: "15px",
    fontWeight: "bold",
    marginTop: "16px",
    color: "#1c1c1e",
  },
  unauthSub: {
    fontSize: "11px",
    color: "#8e8e93",
    padding: "0 16px",
    lineHeight: "15px",
    margin: "8px 0 20px 0",
  },
  savingLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#1c1c1e",
    marginBottom: "12px",
  },
  progressTrack: {
    width: "140px",
    height: "4px",
    backgroundColor: "#f2f2f7",
    borderRadius: "2px",
    overflow: "hidden",
  },
  progressBar: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1447E6",
    animation: "fillProgress 1s ease-out forwards",
  },
  errorLabel: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#ff3b30",
    marginTop: "12px",
  },
  errorSub: {
    fontSize: "11px",
    color: "#8e8e93",
    margin: "6px 0 16px 0",
  },
  statusHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "2px",
  },
  statusText: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "#1447E6",
  },
  duplicateNotice: {
    display: "flex",
    alignItems: "flex-start",
    gap: "6px",
    fontSize: "11px",
    color: "#8e8e93",
    lineHeight: "15px",
    backgroundColor: "#f2f2f7",
    borderRadius: "8px",
    padding: "8px 10px",
  },
  inlineLinkButton: {
    background: "transparent",
    border: "none",
    padding: 0,
    fontSize: "11px",
    fontWeight: "bold" as const,
    color: "#1447E6",
    cursor: "pointer",
    textDecoration: "underline",
  },
  previewBox: {
    border: "1px solid #e5e5ea",
    borderRadius: "12px",
    padding: "12px",
    backgroundColor: "#f9f9f9",
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  previewTitle: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#1c1c1e",
    lineHeight: "16px",
  },
  previewDomain: {
    fontSize: "10px",
    color: "#8e8e93",
    fontFamily: "monospace",
  },
  previewDescription: {
    fontSize: "10px",
    color: "#8e8e93",
    lineHeight: "14px",
    marginTop: "2px",
  },
  savedForm: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "14px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    // Never wider than the popup, whatever is inside.
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: "9px",
    fontWeight: "bold",
    color: "#8e8e93",
    letterSpacing: "0.5px",
  },
  textarea: {
    border: "1px solid #e5e5ea",
    borderRadius: "10px",
    padding: "8px 10px",
    fontSize: "11px",
    height: "48px",
    color: "#1c1c1e",
    backgroundColor: "#f9f9f9",
    resize: "none" as const,
    fontFamily: "inherit",
    outline: "none",
  },
  tagsContainer: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
  },
  tagBadge: {
    border: "1px solid transparent",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "10px",
    fontWeight: "bold" as const,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tagBadgeActive: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #1447E6",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "10px",
    fontWeight: "bold" as const,
    cursor: "pointer",
    backgroundColor: "rgba(20,71,230,0.1)",
    color: "#1447E6",
  },
  tagInput: {
    border: "1px solid #e5e5ea",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "10px",
    color: "#1c1c1e",
    backgroundColor: "#f9f9f9",
    outline: "none",
    minWidth: "110px",
    flex: 1,
  },
  modeRow: {
    display: "flex",
    gap: "8px",
  },
  modeButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    flex: 1,
    border: "1px solid #e5e5ea",
    borderRadius: "10px",
    padding: "8px",
    fontSize: "11px",
    fontWeight: "bold" as const,
    color: "#8e8e93",
    backgroundColor: "#f9f9f9",
    cursor: "pointer",
  },
  modeButtonActive: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    flex: 1,
    border: "1px solid #1447E6",
    borderRadius: "10px",
    padding: "8px",
    fontSize: "11px",
    fontWeight: "bold" as const,
    color: "#1447E6",
    backgroundColor: "rgba(20,71,230,0.1)",
    cursor: "pointer",
  },
  dropdownTrigger: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    border: "1px solid #e5e5ea",
    borderRadius: "8px",
    padding: "7px 10px",
    fontSize: "11px",
    color: "#1c1c1e",
    backgroundColor: "#f9f9f9",
    outline: "none",
    cursor: "pointer",
    boxSizing: "border-box" as const,
  },
  dropdownTriggerText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  dropdownMenu: {
    position: "absolute" as const,
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    zIndex: 10,
    display: "flex",
    flexDirection: "column" as const,
    maxHeight: "180px",
    overflowY: "auto" as const,
    border: "1px solid #e5e5ea",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    padding: "4px",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    border: "none",
    background: "transparent",
    borderRadius: "6px",
    padding: "6px 8px",
    fontSize: "11px",
    color: "#1c1c1e",
    cursor: "pointer",
    textAlign: "left" as const,
  },
  dropdownEmpty: {
    fontSize: "11px",
    color: "#8e8e93",
    padding: "6px 8px",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "14px",
  },
  segmented: {
    display: "flex",
    gap: "3px",
    padding: "3px",
    borderRadius: "11px",
    backgroundColor: "#f2f2f5",
  },
  segment: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    height: "30px",
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: "#6b6b70",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  segmentActive: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    height: "30px",
    border: "none",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#1c1c1e",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
  },
  pageCard: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    padding: "10px",
    borderRadius: "14px",
    border: "1px solid #ececf0",
    backgroundColor: "#fafafb",
  },
  pageThumb: {
    width: "56px",
    height: "56px",
    flexShrink: 0,
    borderRadius: "10px",
    overflow: "hidden",
    backgroundColor: "#e8eefc",
    display: "grid",
    placeItems: "center",
  },
  pageTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#1c1c1e",
    lineHeight: "17px",
  },
  pageMeta: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    color: "#8e8e93",
    minWidth: 0,
  },
  textLink: {
    marginLeft: "auto",
    flexShrink: 0,
    background: "none",
    border: "none",
    padding: 0,
    color: "#1447E6",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    minWidth: 0,
  },
  label: {
    fontSize: "11.5px",
    fontWeight: 650,
    color: "#3a3a3c",
  },
  noteInput: {
    width: "100%",
    boxSizing: "border-box" as const,
    resize: "vertical" as const,
    minHeight: "54px",
    border: "1px solid #e5e5ea",
    borderRadius: "10px",
    backgroundColor: "#fafafb",
    padding: "8px 10px",
    fontSize: "12px",
    lineHeight: "17px",
    color: "#1c1c1e",
    fontFamily: "inherit",
    outline: "none",
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
  },
  chipSuggested: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    height: "26px",
    fontSize: "11.5px",
    fontWeight: 600,
    color: "#1447E6",
    backgroundColor: "#ffffff",
    border: "1px dashed #9db4f5",
    borderRadius: "999px",
    padding: "0 10px",
    cursor: "pointer",
  },
  chipGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    height: "26px",
    fontSize: "11.5px",
    fontWeight: 600,
    color: "#6b6b70",
    backgroundColor: "#f2f2f5",
    border: "1px solid transparent",
    borderRadius: "999px",
    padding: "0 10px",
    cursor: "pointer",
  },
  chipSuggestTag: {
    display: "inline-flex",
    alignItems: "center",
    height: "24px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#6b6b70",
    backgroundColor: "transparent",
    border: "1px dashed #d1d1d6",
    borderRadius: "999px",
    padding: "0 9px",
    cursor: "pointer",
  },
  tagField: {
    display: "flex",
    flexWrap: "wrap" as const,
    alignItems: "center",
    gap: "5px",
    minHeight: "36px",
    boxSizing: "border-box" as const,
    padding: "5px 8px",
    border: "1px solid #e5e5ea",
    borderRadius: "10px",
    backgroundColor: "#fafafb",
    cursor: "text",
  },
  tagChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    height: "22px",
    padding: "0 7px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#e8eefc",
    color: "#1447E6",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  tagFieldInput: {
    flex: 1,
    minWidth: "90px",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "12px",
    color: "#1c1c1e",
    padding: "3px 2px",
  },
  footer: {
    position: "sticky" as const,
    bottom: 0,
    margin: "0 -16px -16px",
    padding: "12px 16px 16px",
    backgroundColor: "#ffffff",
    borderTop: "1px solid #f0f0f3",
    zIndex: 2,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    height: "26px",
    fontSize: "11.5px",
    fontWeight: 600,
    color: "#1c1c1e",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e5ea",
    borderRadius: "999px",
    padding: "0 10px",
    cursor: "pointer",
  },
  chipActive: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    height: "26px",
    fontSize: "11.5px",
    fontWeight: 700,
    color: "#1447E6",
    backgroundColor: "#e8eefc",
    border: "1px solid #9db4f5",
    borderRadius: "999px",
    padding: "0 10px",
    cursor: "pointer",
  },
  coverGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "6px",
  },
  coverThumb: {
    aspectRatio: "16 / 10",
    width: "100%",
    padding: 0,
    borderRadius: "8px",
    overflow: "hidden",
    border: "2px solid transparent",
    backgroundColor: "#f2f2f5",
    cursor: "pointer",
  },
  coverThumbChosen: {
    border: "2px solid #1447E6",
  },
  primaryButton: {
    backgroundColor: "#1447E6",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    padding: "10px 16px",
    fontSize: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    textAlign: "center" as const,
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e5ea",
    borderRadius: "12px",
    padding: "10px 16px",
    fontSize: "12px",
    fontWeight: "bold",
    color: "#1c1c1e",
    cursor: "pointer",
    textAlign: "center" as const,
  },
  linkButton: {
    background: "transparent",
    border: "none",
    fontSize: "11px",
    color: "#8e8e93",
    cursor: "pointer",
    textDecoration: "underline",
    textAlign: "center" as const,
  },
  openDashboardLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    fontSize: "11px",
    color: "#1447E6",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "4px",
  }
};
