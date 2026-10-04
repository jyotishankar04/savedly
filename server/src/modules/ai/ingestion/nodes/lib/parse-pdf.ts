import { PDFParse } from "pdf-parse";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getTextFallbackModels, invokeWithFallback, type UsageContext } from "../../../ai.providers";
import { logger } from "../../../../../shared/utils/logger";

const MAX_CONTENT_LENGTH = 20000;
// Above this page count, extracting (and paying an LLM to digest) the whole
// document stops being worth it — page 1 + a summary noting it's partial
// beats either failing or silently truncating mid-document.
const LARGE_PDF_PAGE_THRESHOLD = 8;

const summaryPrompt = ChatPromptTemplate.fromTemplate(
  `This is the text extracted from page 1 of a {totalPages}-page document{captionContext}.
Only this first page could be processed (the full document was too large).
Write a 2-4 sentence summary of what this document appears to be about, based
only on this first page's content — make it clear in the summary that it
reflects page 1 only, not the whole document.

Page 1 text:
{pageOneText}

Summary:`,
);

async function summarizeFirstPage(pageOneText: string, totalPages: number, usage: UsageContext, caption?: string): Promise<string> {
  if (!usage.userId) return "";
  const messages = await summaryPrompt.formatMessages({
    totalPages,
    captionContext: caption ? ` titled/captioned "${caption}"` : "",
    pageOneText: pageOneText.slice(0, MAX_CONTENT_LENGTH),
  });
  return (await invokeWithFallback(await getTextFallbackModels(usage.userId, { kind: "save", memoryId: usage.memoryId ?? null }), messages, usage)).trim();
}

/**
 * Extracts text from a PDF's raw bytes. Small documents get their full text
 * (truncated to MAX_CONTENT_LENGTH, same as before); documents over
 * LARGE_PDF_PAGE_THRESHOLD pages get only page 1 extracted, then summarized
 * by an LLM — that summary becomes the returned content instead of a raw
 * (and likely mid-sentence) truncation of the whole thing. Never throws —
 * a corrupt/unreadable PDF degrades to "", same as every other ingestion
 * step in this pipeline.
 */
export async function extractPdfContent(data: ArrayBuffer | Buffer, usage: UsageContext, caption?: string): Promise<string> {
  const parser = new PDFParse({ data });
  try {
    const { total } = await parser.getInfo({ parsePageInfo: true });

    if (!total || total <= LARGE_PDF_PAGE_THRESHOLD) {
      const result = await parser.getText();
      return result.text.slice(0, MAX_CONTENT_LENGTH);
    }

    const firstPage = await parser.getText({ first: 1 });
    return await summarizeFirstPage(firstPage.text, total, usage, caption);
  } catch (err) {
    logger.warn({ err }, "extractPdfContent: failed to parse PDF");
    return "";
  } finally {
    await parser.destroy();
  }
}
