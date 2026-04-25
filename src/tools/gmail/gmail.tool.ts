import { fail, ok, type ToolResult } from "../../common/result";
import { GmailOAuth } from "./oauth";

export class GmailTool {
  constructor(private readonly oauth = new GmailOAuth()) {}

  async searchEmail(query: string): Promise<ToolResult<{ query: string; messages: unknown[] }>> {
    if (!this.oauth.isConfigured()) return fail("GMAIL_OAUTH_MISSING", "Gmail OAuth is not configured", { recoverable: true });
    return ok({ query, messages: [] });
  }

  async readEmail(id: string): Promise<ToolResult<{ id: string; message: unknown | null }>> {
    if (!this.oauth.isConfigured()) return fail("GMAIL_OAUTH_MISSING", "Gmail OAuth is not configured", { recoverable: true });
    return ok({ id, message: null });
  }

  async createDraft(input: { to: string; subject: string; body: string }): Promise<ToolResult<{ draftId: string; input: typeof input }>> {
    if (!this.oauth.isConfigured()) return fail("GMAIL_OAUTH_MISSING", "Gmail OAuth is not configured", { recoverable: true });
    return ok({ draftId: "draft_local_placeholder", input });
  }

  async sendEmail(draftId: string, options: { confirmed?: boolean } = {}): Promise<ToolResult<{ draftId: string }>> {
    if (!options.confirmed) return fail("CONFIRMATION_REQUIRED", "Sending email requires confirmation", { recoverable: true });
    if (!this.oauth.isConfigured()) return fail("GMAIL_OAUTH_MISSING", "Gmail OAuth is not configured", { recoverable: true });
    return ok({ draftId });
  }
}
