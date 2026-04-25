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
    return {
      environment,
      canUseTerminal: true,
      canUseLocalBrowser: environment.browser.recommendedMode === "playwright" || environment.browser.recommendedMode === "termux-chromium",
      canUseRemoteBrowser: true,
      canUseSQLite: true,
      defaultStorage: environment.isTermux ? "json" : "sqlite",
    };
  }
}
