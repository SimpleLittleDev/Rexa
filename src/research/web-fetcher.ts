import { logger } from "../logs/logger";

export interface FetchedPage {
  url: string;
  status: number;
  contentType: string;
  title: string;
  text: string;
  length: number;
}

export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  userAgent?: string;
}

/**
 * Fetches a URL and extracts the main readable text. Strips out script,
 * style, nav, footer, header, aside, and form blocks so we don't waste
 * tokens summarising boilerplate. Caps body length to keep prompts
 * sane.
 */
export async function fetchAndExtract(url: string, options: FetchOptions = {}): Promise<FetchedPage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": options.userAgent ?? DEFAULT_UA,
        accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok) return null;
    // We only handle text-ish responses; binary blobs are skipped.
    if (!/^(text\/|application\/(json|xml|xhtml))/.test(contentType)) {
      return null;
    }
    const buffer = await response.arrayBuffer();
    const limit = options.maxBytes ?? 1_500_000;
    const slice = buffer.byteLength > limit ? buffer.slice(0, limit) : buffer;
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    const cleaned = extractReadableText(raw);
    return {
      url: response.url || url,
      status: response.status,
      contentType,
      title: cleaned.title,
      text: cleaned.text,
      length: cleaned.text.length,
    };
  } catch (error) {
    logger.warn("[research] fetch failed", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface ReadableText {
  title: string;
  text: string;
}

export function extractReadableText(html: string): ReadableText {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(stripTags(titleMatch[1])).trim() : "";
  let working = html;
  // Drop noisy regions outright.
  for (const tag of ["script", "style", "noscript", "iframe", "svg", "form", "nav", "footer", "header", "aside"]) {
    working = working.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  }
  // Prefer <article>/<main> if present, else fallback to <body>.
  const article = working.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const main = working.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const body = working.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const inner = article?.[1] ?? main?.[1] ?? body?.[1] ?? working;
  const text = decodeEntities(stripTags(inner))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, text };
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    });
}

const DEFAULT_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 RexaResearch";
