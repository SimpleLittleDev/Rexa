import type { BrowserTool } from "../tools/browser/browser.tool";

export interface ParsedBrowserRequest {
  url: string;
  label: string;
  query?: string;
}

export interface BrowserWorkflowResult {
  status: "completed" | "failed";
  url: string;
  summary: string;
  error?: string;
}

export interface BrowserWorkflowOptions {
  pointerEnabled?: boolean;
  pointerX?: number;
  pointerY?: number;
}

export class BrowserWorkflow {
  constructor(
    private readonly browser: BrowserTool,
    private readonly options: BrowserWorkflowOptions = {},
  ) {}

  async run(message: string): Promise<BrowserWorkflowResult> {
    const target = parseBrowserRequest(message);
    const opened = await this.browser.open(target.url);
    if (!opened.success) {
      return {
        status: "failed",
        url: target.url,
        summary: `Browser gagal dibuka: ${opened.error.message}`,
        error: opened.error.message,
      };
    }

    if (this.options.pointerEnabled !== false) {
      await this.browser.moveMouse(this.options.pointerX ?? 240, this.options.pointerY ?? 360);
    }

    return {
      status: "completed",
      url: target.url,
      summary: `Sudah, aku buka ${target.label} di Chromium: ${target.url}${captchaNotice(message)}`,
    };
  }
}

export function parseBrowserRequest(message: string): ParsedBrowserRequest {
  const text = message.trim();
  const explicitUrl = text.match(/https?:\/\/[^\s)]+/i)?.[0];
  if (explicitUrl) return { url: stripTrailingPunctuation(explicitUrl), label: explicitUrl };

  const domain = text.match(/\b((?:www\.)?[a-z0-9-]+(?:\.[a-z]{2,})(?:\/[^\s)]*)?)/i)?.[1];
  if (domain) {
    const cleanedDomain = stripTrailingPunctuation(domain);
    return { url: `https://${cleanedDomain}`, label: cleanedDomain };
  }

  if (/\b(you\s*tube|youtube|yt)\b/i.test(text)) {
    const normalized = normalizeSearchQuery(text);
    if (isSearchForYoutubeItself(text, normalized)) {
      return {
        url: `https://www.google.com/search?q=${encodeURIComponent("YouTube")}`,
        label: "Google search: YouTube",
        query: "YouTube",
      };
    }

    const query = extractYoutubeQuery(text);
    if (query) {
      return {
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        label: `YouTube search: ${query}`,
        query,
      };
    }
    return { url: "https://www.youtube.com", label: "YouTube" };
  }

  const query = normalizeSearchQuery(text) || text || "Rexa";
  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    label: `Google search: ${query}`,
    query,
  };
}

function extractYoutubeQuery(text: string): string {
  const parts = text.split(/\b(?:you\s*tube|youtube|yt)\b/i);
  const before = normalizeSearchQuery(parts[0] ?? "");
  const after = normalizeSearchQuery(parts.slice(1).join(" "));
  if (after && !isCaptchaInstruction(after)) return after;
  if (/\b(di|on|via|lewat)\s+(?:you\s*tube|youtube|yt)\b/i.test(text)) return before;
  return "";
}

function normalizeSearchQuery(text: string): string {
  return text
    .replace(/[?!.,;:()[\]{}"']/g, " ")
    .replace(
      /\b(bisa|tolong|coba|bukain|buka|open|browser|chromium|dan|lalu|terus|carikan|cari|search|google|website|web|di|ke|on|via|lewat|dong|ya|aja)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[?!.,;:]+$/g, "");
}

function isSearchForYoutubeItself(text: string, normalized: string): boolean {
  return /\b(cari|carikan|search|google)\b/i.test(text) && /^(you\s*tube|youtube|yt)$/i.test(normalized);
}

function isCaptchaInstruction(text: string): boolean {
  return /\b(captcha|recaptcha|hcaptcha)\b/i.test(text);
}

function captchaNotice(text: string): string {
  return isCaptchaInstruction(text) ? ". Kalau muncul CAPTCHA, kamu perlu menyelesaikannya manual; Rexa tidak akan bypass atau solve CAPTCHA otomatis." : "";
}
