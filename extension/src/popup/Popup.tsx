import React, { useEffect, useRef, useState } from "react";
import {
  Check, AlertCircle, RefreshCw, Settings, ExternalLink, ShieldAlert, X, Camera, FileText, ChevronDown, Maximize, Eye, EyeOff
} from "lucide-react";
import { apiFetch, ApiError } from "../lib/api";
import { SHOW_FLOATING_ICON_STORAGE_KEY, WEB_APP_URL } from "../lib/config";

type ExtensionState = "checking" | "unauthorized" | "ready" | "saving" | "saved" | "error";

interface PageInfo {
  url: string;
  title: string;
  favIconUrl?: string;
  description?: string;
  previewImage?: string;
  keywords?: string;
}

interface CreatedMemory {
  id: string;
  title: string;
  duplicateOf: { id: string; title: string } | null;
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

    // Ask the background worker to re-read the auth cookie before trusting
    // storage — it may be stale if login/logout happened since the last
    // chrome.cookies.onChanged event (see background/service-worker.ts).
    let settled = false;
    const proceedFromStorage = () => {
      if (settled) return;
      settled = true;
      chrome.storage.local.get(["memora_token"], (result) => {
        if (!result.memora_token) {
          setState("unauthorized");
        } else {
          loadPageInfo();
        }
      });
    };

    // If the background worker doesn't respond in time (e.g. it's still
    // waking up from being suspended, or busy with something else like an
    // in-flight screenshot upload), fall back to whatever's already in
    // storage from the last sync rather than leaving the popup stuck on
    // this spinner forever — a slow background shouldn't look like the
    // popup didn't open at all.
    const timeout = setTimeout(proceedFromStorage, 1200);
    chrome.runtime.sendMessage({ action: "SYNC_AUTH" }, () => {
      clearTimeout(timeout);
      proceedFromStorage();
    });
  }, []);

  const getPageMetadata = (tabId: number): Promise<{ description?: string; previewImage?: string; keywords?: string }> => {
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
  // nothing is saved until "Save to Memora" is clicked below.
  const loadPageInfo = async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.url || !activeTab.id) {
      setState("error");
      setErrorMessage("Couldn't read the current tab.");
      return;
    }

    activeTabIdRef.current = activeTab.id;
    const metadata = await getPageMetadata(activeTab.id);
    setPageInfo({
      url: activeTab.url,
      title: activeTab.title || "Untitled Webpage",
      favIconUrl: activeTab.favIconUrl,
      description: metadata.description,
      previewImage: metadata.previewImage,
      keywords: metadata.keywords,
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
          previewImageUrl: isValidUrl(pageInfo.previewImage) ? pageInfo.previewImage : undefined,
          keywords: keywords.length > 0 ? keywords : undefined,
          content: note.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          collectionIds: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
          captureMethod: "extension",
        }),
      });

      setSavedMemory(memory);
      setState("saved");
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

  const handleOpenMemora = (path = "/app") => {
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
            save<span style={{ fontWeight: 400, fontSize: "0.78em", color: "#1447E6" }}>for</span>latter
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {state !== "checking" && state !== "unauthorized" && (
            <button
              style={styles.iconButton}
              onClick={toggleFloatingIcon}
              title={showFloatingIcon ? "Hide the floating quick-actions button on pages" : "Show the floating quick-actions button on pages"}
            >
              {showFloatingIcon ? <Eye size={14} color="#8e8e93" /> : <EyeOff size={14} color="#8e8e93" />}
            </button>
          )}
          <button style={styles.iconButton} onClick={() => handleOpenMemora()}>
            <Settings size={14} color="#8e8e93" />
          </button>
        </div>
      </div>

      {/* State Renderers */}

      {state === "checking" && (
        <div style={styles.centerContainer}>
          <RefreshCw size={24} color="#1447E6" className="animate-spin" />
          <p style={styles.statusLabel}>Connecting to Memora...</p>
        </div>
      )}

      {state === "unauthorized" && (
        <div style={styles.centerContainer}>
          <ShieldAlert size={28} color="#ff3b30" />
          <p style={styles.unauthLabel}>Save anything you find.</p>
          <p style={styles.unauthSub}>Connect this extension to your main Memora dashboard account.</p>
          <button style={styles.primaryButton} onClick={handleSignIn}>
            Sign in
          </button>
        </div>
      )}

      {state === "saving" && (
        <div style={styles.centerContainer}>
          <p style={styles.savingLabel}>Saving to Memora...</p>
          <div style={styles.progressTrack}>
            <div style={styles.progressBar} />
          </div>
        </div>
      )}

      {state === "error" && (
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
          Memora" below is the only thing that writes anything. */}
      {state === "ready" && (
        <div style={styles.savedForm}>
          {/* Quick capture-mode buttons — "Page" saves the tab as-is;
              "Region" hands off to the drag-select overlay on the page
              itself; "Full Shot" screenshots the whole current viewport
              (not the whole scrollable page — see content-script.ts's
              captureFullViewport). Room for more modes here later without
              touching anything below, since note/tags/collections apply
              regardless of which mode is picked. */}
          <div style={styles.modeRow}>
            <button
              type="button"
              title="Save this page as a link"
              style={captureMode === "page" ? styles.modeButtonActive : styles.modeButton}
              onClick={() => setCaptureMode("page")}
            >
              <FileText size={13} />
              Page
            </button>
            <button
              type="button"
              title="Drag to screenshot part of the page"
              style={captureMode === "screenshot" ? styles.modeButtonActive : styles.modeButton}
              onClick={() => setCaptureMode("screenshot")}
            >
              <Camera size={13} />
              Region
            </button>
            <button
              type="button"
              title="Screenshot the entire visible page"
              style={captureMode === "fullscreenshot" ? styles.modeButtonActive : styles.modeButton}
              onClick={() => setCaptureMode("fullscreenshot")}
            >
              <Maximize size={13} />
              Visible
            </button>
          </div>

          <div style={styles.previewBox}>
            <TextTruncate text={pageInfo?.title || "Untitled"} lines={2} style={styles.previewTitle} />
            <span style={styles.previewDomain}>{getDomain(pageInfo?.url)}</span>
            {pageInfo?.description && (
              <TextTruncate text={pageInfo.description} lines={2} style={styles.previewDescription} />
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>ADD A NOTE</label>
            <textarea
              style={styles.textarea}
              placeholder="Why are you saving this? (Add context to search later)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button
            style={styles.primaryButton}
            onClick={
              captureMode === "page" ? handleSave : captureMode === "screenshot" ? handleTakeScreenshot : handleFullPageScreenshot
            }
          >
            {captureMode === "page"
              ? "Save to Memora"
              : captureMode === "screenshot"
                ? "Select Area & Save"
                : "Capture Visible Screenshot"}
          </button>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>TAGS</label>
            <div style={styles.tagsContainer}>
              {tags.map((tag) => (
                <button key={tag} style={styles.tagBadgeActive} onClick={() => removeTag(tag)}>
                  {tag}
                  <X size={10} style={{ marginLeft: 4 }} />
                </button>
              ))}
              <input
                style={styles.tagInput}
                placeholder={tags.length === 0 ? "Add a tag, press Enter" : "Add another..."}
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTagFromDraft();
                  }
                }}
                onBlur={addTagFromDraft}
              />
            </div>
          </div>

          {/* Collection selection — a dropdown instead of a chip row, so it
              doesn't grow with the user's collection count. */}
          <div style={styles.fieldGroup} ref={collectionsRef}>
            <label style={styles.fieldLabel}>ADD TO COLLECTION</label>
            <div style={{ position: "relative" }}>
              <button type="button" style={styles.dropdownTrigger} onClick={() => setCollectionsOpen((open) => !open)}>
                <span style={styles.dropdownTriggerText}>
                  {selectedCollectionIds.length === 0
                    ? "None"
                    : collections
                        .filter((c) => selectedCollectionIds.includes(c.id))
                        .map((c) => c.name)
                        .join(", ")}
                </span>
                <ChevronDown size={12} color="#8e8e93" />
              </button>
              {collectionsOpen && (
                <div style={styles.dropdownMenu}>
                  {collections.length === 0 ? (
                    <div style={styles.dropdownEmpty}>No collections yet</div>
                  ) : (
                    collections.map((collection) => {
                      const isActive = selectedCollectionIds.includes(collection.id);
                      return (
                        <button
                          type="button"
                          key={collection.id}
                          style={styles.dropdownItem}
                          onClick={() => toggleCollection(collection.id)}
                        >
                          <Check size={12} color="#1447E6" style={{ visibility: isActive ? "visible" : "hidden" }} />
                          <span>
                            {collection.icon} {collection.name}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {state === "saved" && (
        <div style={styles.savedForm}>
          <div style={styles.statusHeader}>
            <Check size={16} color="#1447E6" />
            <span style={styles.statusText}>Saved to Memora</span>
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
                  onClick={() => handleOpenMemora(`/app/memories/${savedMemory.duplicateOf!.id}`)}
                >
                  View it
                </button>
              </span>
            </div>
          )}

          <div style={styles.previewBox}>
            <TextTruncate text={pageInfo?.title || "Untitled"} lines={2} style={styles.previewTitle} />
            <span style={styles.previewDomain}>{getDomain(pageInfo?.url)}</span>
          </div>

          <button style={styles.primaryButton} onClick={() => window.close()}>
            Done
          </button>

          <button style={styles.openDashboardLink} onClick={() => handleOpenMemora()}>
            <span>Open Memora</span>
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
    width: "320px",
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
    maxHeight: "140px",
    overflowY: "auto" as const,
    border: "1px solid #e5e5ea",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
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
