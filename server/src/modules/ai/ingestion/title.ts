// Titles nobody chose: the schema default, or the name a device or the
// clipboard gave a file ("image.png" from a paste, "Screenshot 2026-09-26 at
// 10.14.03", "Screenshot_20260926-101010", "IMG_1234", "PXL_2026..."). The AI
// title replaces these, and they're left out of the AI's context since they
// say nothing about the content. Anything else is the user's own title.
const PLACEHOLDER_TITLE =
  /^(untitled( note)?|image( ?\(\d+\))?|pasted image( \d.*)?|photo|picture|screen ?shot([ _-]?\d.*| ?\(\d+\))?|img[_-]?\d+.*|pxl_\d+.*|dsc[_-]?\d+.*|\d{6,}.*)$/i;

export function isPlaceholderTitle(title: string | null | undefined): boolean {
  return !title || PLACEHOLDER_TITLE.test(title.trim());
}
