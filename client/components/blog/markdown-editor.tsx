"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent, type Ref } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Heading02Icon as H2,
  Heading03Icon as H3,
  ImageAdd01Icon as ImageAdd,
  LeftToRightListBulletIcon as BulletList,
  LeftToRightListNumberIcon as NumberList,
  Link01Icon as LinkIcon,
  MinusSignIcon as Rule,
  QuoteDownIcon as Quote,
  SourceCodeIcon as Code,
  TextBoldIcon as Bold,
  TextItalicIcon as Italic,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

// A Markdown writing box: a toolbar, the usual shortcuts, lists that carry
// on when you press Enter, and pictures by button, paste or drop.
//
// Edits go through the browser's own "insert text" command where it exists,
// so Ctrl+Z undoes a toolbar action the same as it undoes typing.

export interface MarkdownEditorHandle {
  /** The writing box, for scroll syncing. */
  textarea: HTMLTextAreaElement | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Uploads a picture and returns its address. */
  onUploadImage: (file: File) => Promise<string>;
  onUploadError?: (message: string) => void;
  placeholder?: string;
  className?: string;
  textareaClassName?: string;
  ref?: Ref<MarkdownEditorHandle>;
  onScroll?: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";

// Numbers the stand-ins for pictures still uploading, so each is found again.
let uploadSeq = 0;

type ToolId = "h2" | "h3" | "bold" | "italic" | "link" | "code" | "bullets" | "numbers" | "quote" | "rule" | "image";

const TOOLS: ({ id: ToolId; label: string; icon: IconSvgElement; keys?: string } | "gap")[] = [
  { id: "h2", label: "Heading", icon: H2 },
  { id: "h3", label: "Smaller heading", icon: H3 },
  "gap",
  { id: "bold", label: "Bold", icon: Bold, keys: `${MOD}B` },
  { id: "italic", label: "Italic", icon: Italic, keys: `${MOD}I` },
  { id: "link", label: "Link", icon: LinkIcon, keys: `${MOD}K` },
  { id: "code", label: "Code", icon: Code, keys: `${MOD}E` },
  "gap",
  { id: "bullets", label: "Bulleted list", icon: BulletList },
  { id: "numbers", label: "Numbered list", icon: NumberList },
  { id: "quote", label: "Quote", icon: Quote },
  { id: "rule", label: "Dividing line", icon: Rule },
  "gap",
  { id: "image", label: "Add an image", icon: ImageAdd },
];

/** "- ", "* ", "1. ", "> " and "- [ ] " at the start of a line, with its indent. */
const LIST_MARKER = /^(\s*)(?:([-*+])\s(\[[ xX]\]\s)?|(\d+)([.)])\s|(>)\s?)/;

export function MarkdownEditor({ value, onChange, onUploadImage, onUploadError, placeholder, className, textareaClassName, ref, onScroll }: Props) {
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  // The newest text, for an upload that finishes after more has been typed.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const [uploads, setUploads] = useState(0);
  const [dropping, setDropping] = useState(false);

  useImperativeHandle(ref, () => ({ get textarea() { return box.current; } }), []);

  /** Replaces [start, end) with `text`, then selects [selectFrom, selectTo) of the result. */
  const replace = (start: number, end: number, text: string, selectFrom = start + text.length, selectTo = selectFrom) => {
    const el = box.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(start, end);
    // Keeps the browser's undo history. Falls back to setting the text.
    const done = typeof document.execCommand === "function" && document.execCommand("insertText", false, text);
    if (done) {
      // The box already holds the new text, so the selection can be set at
      // once. Waiting a frame would let the next keystroke land first.
      el.setSelectionRange(selectFrom, selectTo);
      return;
    }
    onChange(el.value.slice(0, start) + text + el.value.slice(end));
    requestAnimationFrame(() => el.setSelectionRange(selectFrom, selectTo));
  };

  /** **bold**, *italic*, `code`: wraps the selection, or unwraps it if it already is. */
  const wrap = (mark: string, sample: string) => {
    const el = box.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value: v } = el;
    const selected = v.slice(s, e);
    const n = mark.length;
    if (v.slice(s - n, s) === mark && v.slice(e, e + n) === mark) {
      replace(s - n, e + n, selected, s - n, e - n);
    } else if (selected.length >= 2 * n && selected.startsWith(mark) && selected.endsWith(mark)) {
      replace(s, e, selected.slice(n, -n), s, e - 2 * n);
    } else {
      const inner = selected || sample;
      replace(s, e, mark + inner + mark, s + n, s + n + inner.length);
    }
  };

  /** The whole lines the selection touches. */
  const lines = () => {
    const el = box.current!;
    const start = el.value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    let end = el.value.indexOf("\n", el.selectionEnd);
    if (end === -1) end = el.value.length;
    return { start, end, text: el.value.slice(start, end).split("\n") };
  };

  /** Starts each selected line with `prefix` ("## ", "- ", "> "), or takes it off if they all have it. */
  const prefixLines = (prefix: (index: number) => string, strip: RegExp) => {
    if (!box.current) return;
    const { start, end, text } = lines();
    const allHave = text.every((line, i) => line.startsWith(prefix(i)));
    const next = text.map((line, i) => (allHave ? line.slice(prefix(i).length) : prefix(i) + line.replace(strip, ""))).join("\n");
    replace(start, end, next, start, start + next.length);
  };

  const link = () => {
    const el = box.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = el.value.slice(s, e);
    if (/^https?:\/\/\S+$/.test(selected)) {
      // An address is selected: ask for the words.
      replace(s, e, `[link text](${selected})`, s + 1, s + 10);
    } else {
      const words = selected || "link text";
      const at = s + words.length + 3;
      replace(s, e, `[${words}](https://)`, at, at + 8);
    }
  };

  const code = () => {
    const el = box.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = el.value.slice(s, e);
    if (selected.includes("\n")) replace(s, e, "```\n" + selected + "\n```", s + 4, s + 4 + selected.length);
    else wrap("`", "code");
  };

  /** A block on its own lines (a picture, a rule), with blank lines around it. */
  const insertBlock = (block: string, at?: number) => {
    const el = box.current;
    if (!el) return;
    const pos = at ?? el.selectionEnd;
    const before = el.value.slice(0, pos);
    const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const after = el.value.slice(pos);
    const trail = after.startsWith("\n\n") || after === "" ? "\n" : after.startsWith("\n") ? "\n" : "\n\n";
    replace(pos, pos, lead + block + trail);
  };

  const uploadImages = async (files: File[], at?: number) => {
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        onUploadError?.(`"${file.name}" isn't an image.`);
        continue;
      }
      const name = file.name.replace(/\.[^.]+$/, "").replace(/[[\]()]/g, "") || "image";
      // Stands in the text while the upload runs, and is swapped for the picture after.
      const token = `![Uploading ${name}…](upload-${++uploadSeq})`;
      insertBlock(token, at);
      setUploads((n) => n + 1);
      try {
        const url = await onUploadImage(file);
        onChange(latest.current.replace(token, `![${name}](${url})`));
      } catch (err) {
        onChange(latest.current.replace(token, ""));
        onUploadError?.(err instanceof Error ? err.message : "Couldn't upload the image.");
      } finally {
        setUploads((n) => n - 1);
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    const mod = event.metaKey || event.ctrlKey;

    if (mod && !event.altKey) {
      const key = event.key.toLowerCase();
      const action = key === "b" ? () => wrap("**", "bold text") : key === "i" ? () => wrap("*", "italic text") : key === "k" ? link : key === "e" ? code : null;
      if (action) {
        event.preventDefault();
        action();
      }
      return;
    }

    const { selectionStart: s, selectionEnd: e, value: v } = el;
    const lineStart = v.lastIndexOf("\n", s - 1) + 1;
    const line = v.slice(lineStart, s);
    const marker = line.match(LIST_MARKER);

    // Enter inside a list or quote starts the next item; on an empty item it ends the list.
    if (event.key === "Enter" && !event.shiftKey && s === e && marker) {
      event.preventDefault();
      if (line.slice(marker[0].length).trim() === "") {
        // Leaves a blank line behind, so what comes next is a new paragraph
        // and not read as more of the last item.
        replace(lineStart, s, "\n");
        return;
      }
      const [, indent, bullet, task, number, numberEnd, quote] = marker;
      const next = bullet ? `${bullet} ${task ? "[ ] " : ""}` : number ? `${Number(number) + 1}${numberEnd} ` : `${quote} `;
      replace(s, e, `\n${indent}${next}`);
      return;
    }

    // Tab moves a list item in or out. Anywhere else it is left alone, so the keyboard can still leave the box.
    if (event.key === "Tab" && marker && !marker[6]) {
      event.preventDefault();
      if (event.shiftKey) {
        const remove = line.startsWith("  ") ? 2 : line.startsWith(" ") ? 1 : 0;
        if (remove) replace(lineStart, lineStart + remove, "", s - remove, e - remove);
      } else {
        replace(lineStart, lineStart, "  ", s + 2, e + 2);
      }
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const images = [...event.clipboardData.files].filter((f) => f.type.startsWith("image/"));
    if (images.length > 0) {
      event.preventDefault();
      void uploadImages(images);
      return;
    }
    // An address pasted over selected words makes them a link.
    const el = event.currentTarget;
    const text = event.clipboardData.getData("text").trim();
    const selected = el.value.slice(el.selectionStart, el.selectionEnd);
    if (selected && !selected.includes("\n") && /^https?:\/\/\S+$/.test(text) && !/^https?:\/\//.test(selected)) {
      event.preventDefault();
      const s = el.selectionStart;
      replace(s, el.selectionEnd, `[${selected}](${text})`);
    }
  };

  const onDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    setDropping(false);
    const images = [...event.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    event.preventDefault();
    void uploadImages(images, event.currentTarget.selectionEnd);
  };

  // What each toolbar button does. Looked up when a button is pressed, not
  // while drawing, since every action reads the writing box.
  const run = (id: ToolId) => {
    const listMarker = /^\s*(?:[-*+]|\d+[.)])\s+/;
    if (id === "h2") prefixLines(() => "## ", /^#{1,6}\s+/);
    else if (id === "h3") prefixLines(() => "### ", /^#{1,6}\s+/);
    else if (id === "bold") wrap("**", "bold text");
    else if (id === "italic") wrap("*", "italic text");
    else if (id === "link") link();
    else if (id === "code") code();
    else if (id === "bullets") prefixLines(() => "- ", listMarker);
    else if (id === "numbers") prefixLines((i) => `${i + 1}. `, listMarker);
    else if (id === "quote") prefixLines(() => "> ", /^>\s?/);
    else if (id === "rule") insertBlock("---");
    else picker.current?.click();
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div role="toolbar" aria-label="Formatting" className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        {TOOLS.map((tool, i) =>
          tool === "gap" ? (
            <span key={i} aria-hidden className="mx-1 h-4 w-px bg-border" />
          ) : (
            <button
              key={tool.label}
              type="button"
              title={tool.keys ? `${tool.label} (${tool.keys})` : tool.label}
              aria-label={tool.label}
              // Keeps the selection in the writing box while the button is pressed.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(tool.id)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <HugeiconsIcon icon={tool.icon} strokeWidth={2} className="h-4 w-4" />
            </button>
          ),
        )}
        {uploads > 0 && (
          <span role="status" className="ml-auto pr-1 text-[11px] text-muted-foreground">
            Uploading {uploads === 1 ? "image" : `${uploads} images`}…
          </span>
        )}
        <input
          ref={picker}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            if (files.length) void uploadImages(files);
          }}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <textarea
          ref={box}
          aria-label="Post, in Markdown"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onDrop={onDrop}
          onDragOver={(e) => {
            if ([...e.dataTransfer.types].includes("Files")) {
              e.preventDefault();
              setDropping(true);
            }
          }}
          onDragLeave={() => setDropping(false)}
          onScroll={onScroll}
          placeholder={placeholder}
          spellCheck
          className={cn(
            "block h-full w-full resize-none bg-transparent px-5 py-4 font-mono text-[13.5px] leading-[1.75] text-foreground outline-none placeholder:text-muted-foreground/70",
            textareaClassName,
          )}
        />
        {dropping && (
          <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/60 bg-primary/5 text-sm font-medium text-primary">
            Drop the image to add it here
          </div>
        )}
      </div>
    </div>
  );
}
