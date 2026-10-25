// Titles nobody chose: the schema default or a device/clipboard file name ("image.png",
// "IMG_1234"). The AI title replaces them and they're kept out of the AI's context.
const PLACEHOLDER_TITLE =
  /^(untitled( note)?|image( ?\(\d+\))?|pasted image( \d.*)?|photo|picture|screen ?shot([ _-]?\d.*| ?\(\d+\))?|img[_-]?\d+.*|pxl_\d+.*|dsc[_-]?\d+.*|\d{6,}.*)$/i;

export function isPlaceholderTitle(title: string | null | undefined): boolean {
  return !title || PLACEHOLDER_TITLE.test(title.trim());
}
