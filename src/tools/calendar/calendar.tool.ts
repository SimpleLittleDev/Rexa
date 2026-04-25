import { fail, ok, type ToolResult } from "../../common/result";
import { CalendarOAuth } from "./oauth";

export class CalendarTool {
  constructor(private readonly oauth = new CalendarOAuth()) {}

  async listEvents(): Promise<ToolResult<{ events: unknown[] }>> {
    if (!this.oauth.isConfigured()) return fail("CALENDAR_OAUTH_MISSING", "Calendar OAuth is not configured", { recoverable: true });
    return ok({ events: [] });
  }

  async createEvent(event: Record<string, unknown>, options: { confirmed?: boolean } = {}): Promise<ToolResult<{ event: Record<string, unknown> }>> {
    if (!options.confirmed) return fail("CONFIRMATION_REQUIRED", "Creating a calendar event requires confirmation", { recoverable: true });
    if (!this.oauth.isConfigured()) return fail("CALENDAR_OAUTH_MISSING", "Calendar OAuth is not configured", { recoverable: true });
    return ok({ event });
  }

  async deleteEvent(eventId: string, options: { confirmed?: boolean } = {}): Promise<ToolResult<{ eventId: string }>> {
    if (!options.confirmed) return fail("CONFIRMATION_REQUIRED", "Deleting a calendar event requires confirmation", { recoverable: true });
    if (!this.oauth.isConfigured()) return fail("CALENDAR_OAUTH_MISSING", "Calendar OAuth is not configured", { recoverable: true });
    return ok({ eventId });
  }
}
