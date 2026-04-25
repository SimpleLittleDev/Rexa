import { ChromiumAdapter, type ChromiumAdapterOptions } from "./chromium.adapter";

export type PlaywrightAdapterOptions = ChromiumAdapterOptions;

/**
 * Backwards-compat alias: PlaywrightAdapter is now the same fully-featured
 * Chromium adapter. Existing imports continue to work.
 */
export class PlaywrightAdapter extends ChromiumAdapter {
  constructor(options: PlaywrightAdapterOptions = {}) {
    super({ headless: true, ...options });
  }
}
