export interface OAuthConfig {
  clientIdEnv: string;
  clientSecretEnv: string;
  redirectUri?: string;
}

export class GmailOAuth {
  constructor(private readonly config: OAuthConfig = { clientIdEnv: "GOOGLE_CLIENT_ID", clientSecretEnv: "GOOGLE_CLIENT_SECRET" }) {}

  isConfigured(): boolean {
    return Boolean(process.env[this.config.clientIdEnv] && process.env[this.config.clientSecretEnv]);
  }
}
