import type { Config } from './config.js';

export class SiteDeployService {
  constructor(private readonly config: Config) {}

  isConfigured() {
    return Boolean(this.config.GITHUB_REPOSITORY && this.config.GITHUB_DISPATCH_TOKEN);
  }

  async requestBuild(reason: string): Promise<boolean> {
    if (!this.config.GITHUB_REPOSITORY || !this.config.GITHUB_DISPATCH_TOKEN) return false;
    const response = await fetch(
      `https://api.github.com/repos/${this.config.GITHUB_REPOSITORY}/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.config.GITHUB_DISPATCH_TOKEN}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2026-03-10',
          'User-Agent': 'aydinlar-admin-server',
        },
        body: JSON.stringify({
          event_type: 'content-updated',
          client_payload: { reason: reason.slice(0, 100) },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status !== 204) {
      throw new Error(`GitHub build dispatch failed (${response.status})`);
    }
    return true;
  }
}
