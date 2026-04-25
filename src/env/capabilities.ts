import { EnvironmentDetector, type EnvironmentInfo } from "./detector";

export interface RuntimeCapabilities {
  environment: EnvironmentInfo;
  canUseTerminal: boolean;
  canUseLocalBrowser: boolean;
  canUseRemoteBrowser: boolean;
  canUseSQLite: boolean;
  defaultStorage: "json" | "sqlite" | "postgres" | "memory";
}

export class CapabilityDetector {
  constructor(private readonly detector = new EnvironmentDetector()) {}

  async detect(): Promise<RuntimeCapabilities> {
    const environment = await this.detector.detect();
    const canUseLocalBrowser =
      environment.browser.recommendedMode === "chromium" || environment.browser.recommendedMode === "playwright";
    return {
      environment,
      canUseTerminal: true,
      canUseLocalBrowser,
      canUseRemoteBrowser: true,
      canUseSQLite: true,
      defaultStorage: "sqlite",
    };
  }
}
