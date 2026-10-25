import { isHttpUrl } from "../../shared/utils/is-http-url";

export interface ParsedUrl {
  url: string;
  title: null;
}

/** One URL per line — from a pasted textarea or an uploaded .txt. Blank lines and non-URL lines are silently skipped. */
export function parseUrlList(text: string): ParsedUrl[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(isHttpUrl)
    .map((url) => ({ url, title: null }));
}
