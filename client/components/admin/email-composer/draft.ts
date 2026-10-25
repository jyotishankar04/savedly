import type { IconSvgElement } from "@hugeicons/react";
import {
  Image01Icon as ImageIcon,
  InformationCircleIcon as NoteIcon,
  LeftToRightListBulletIcon as ListIcon,
  Link01Icon as ButtonIcon,
  MinusSignIcon as DividerIcon,
  TextFontIcon as TextIcon,
} from "@hugeicons/core-free-icons";
import type { EmailBlock, EmailCampaignCategory, EmailContent, EmailTone } from "@/lib/admin-emails";

// What's on screen while writing. Every block keeps every field, so switching
// nothing loses text; toContent() below turns it into what the server takes,
// leaving out anything still empty.

export type BlockType = EmailBlock["type"];

export interface DraftBlock {
  id: string;
  type: BlockType;
  text: string;
  /** Bullet points, one per line. */
  items: string;
  label: string;
  url: string;
  alt: string;
  tone: EmailTone;
}

export interface Draft {
  subject: string;
  category: EmailCampaignCategory;
  label: string;
  tone: EmailTone;
  headline: string;
  blocks: DraftBlock[];
}

let nextBlockId = 0;
export function newBlock(type: BlockType, fields: Partial<DraftBlock> = {}): DraftBlock {
  nextBlockId += 1;
  return { id: `b${nextBlockId}`, type, text: "", items: "", label: "", url: "", alt: "", tone: "neutral", ...fields };
}

export const BLOCK_TYPES: { type: BlockType; name: string; hint: string; icon: IconSvgElement }[] = [
  { type: "text", name: "Text", hint: "A paragraph or two", icon: TextIcon },
  { type: "bullets", name: "Bullet list", hint: "Short points", icon: ListIcon },
  { type: "button", name: "Button", hint: "One link to follow", icon: ButtonIcon },
  { type: "note", name: "Note", hint: "A highlighted box", icon: NoteIcon },
  { type: "image", name: "Image", hint: "A picture by address", icon: ImageIcon },
  { type: "divider", name: "Divider", hint: "A thin line", icon: DividerIcon },
];

export const TONES: { value: EmailTone; name: string; swatch: string }[] = [
  { value: "primary", name: "Blue", swatch: "bg-[#1746d6]" },
  { value: "success", name: "Green", swatch: "bg-[#0f7a4d]" },
  { value: "warning", name: "Amber", swatch: "bg-[#9a5b00]" },
  { value: "danger", name: "Red", swatch: "bg-[#b42318]" },
  { value: "neutral", name: "Grey", swatch: "bg-[#8a94a6]" },
];

// Ready-made starting points, so a common email is a matter of changing words.
export const STARTERS: { name: string; draft: () => Omit<Draft, "category"> & { category: EmailCampaignCategory } }[] = [
  {
    name: "Blank",
    draft: () => ({ subject: "", category: "custom", label: "", tone: "primary", headline: "", blocks: [newBlock("text")] }),
  },
  {
    name: "New feature",
    draft: () => ({
      subject: "New in Savedly",
      category: "announcement",
      label: "New",
      tone: "primary",
      headline: "",
      blocks: [
        newBlock("text", { text: "We've just shipped something we think you'll like." }),
        newBlock("bullets", { items: "What it does\nWhy it's useful\nWhere to find it" }),
        newBlock("button", { label: "Try it now", url: "/app" }),
      ],
    }),
  },
  {
    name: "Product update",
    draft: () => ({
      subject: "What's new this month",
      category: "announcement",
      label: "Product update",
      tone: "primary",
      headline: "",
      blocks: [
        newBlock("text", { text: "Here's what we've been working on." }),
        newBlock("bullets", { items: "First improvement\nSecond improvement\nThird improvement" }),
        newBlock("divider"),
        newBlock("text", { text: "As always, reply through the contact page if anything isn't working for you." }),
        newBlock("button", { label: "Open Savedly", url: "/app" }),
      ],
    }),
  },
  {
    name: "Maintenance notice",
    draft: () => ({
      subject: "Scheduled maintenance",
      category: "alert",
      label: "Heads up",
      tone: "warning",
      headline: "Savedly will be briefly unavailable",
      blocks: [
        newBlock("text", { text: "We're doing some planned maintenance to keep things running well." }),
        newBlock("note", { text: "When: add the date and time here\nHow long: about 30 minutes", tone: "warning" }),
        newBlock("text", { text: "Nothing you've saved is affected, and you don't need to do anything." }),
      ],
    }),
  },
];

/** What stops a block from being included, or null when it's complete. Empty blocks are skipped silently. */
export function blockProblem(block: DraftBlock): string | null {
  if (block.type === "button") {
    const label = block.label.trim();
    const url = block.url.trim();
    if (!label && !url) return null;
    if (!label) return "The button needs a label.";
    if (!url) return "The button needs a link.";
    if (!url.startsWith("/") && !/^https?:\/\//i.test(url)) return "The button's link must start with / or https://";
  }
  if (block.type === "image") {
    const url = block.url.trim();
    if (url && !/^https?:\/\//i.test(url)) return "The image address must start with https://";
  }
  return null;
}

/** The draft as the server takes it: only blocks that have something in them and are complete. */
export function toContent(draft: Draft): EmailContent {
  const blocks: EmailBlock[] = [];
  for (const block of draft.blocks) {
    if (blockProblem(block)) continue;
    if (block.type === "text" && block.text.trim()) blocks.push({ type: "text", text: block.text.trim() });
    if (block.type === "bullets") {
      const items = block.items.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 12);
      if (items.length > 0) blocks.push({ type: "bullets", items });
    }
    if (block.type === "button" && block.label.trim() && block.url.trim()) blocks.push({ type: "button", label: block.label.trim(), url: block.url.trim() });
    if (block.type === "note" && block.text.trim()) blocks.push({ type: "note", text: block.text.trim(), tone: block.tone });
    if (block.type === "image" && block.url.trim()) blocks.push({ type: "image", url: block.url.trim(), alt: block.alt.trim() || undefined });
    if (block.type === "divider") blocks.push({ type: "divider" });
  }
  return {
    label: draft.label.trim() || undefined,
    tone: draft.tone,
    headline: draft.headline.trim() || undefined,
    blocks,
  };
}
