import { fetchJson } from '../../lib/http.js';

/**
 * Akash Console API client for provider discovery.
 * AKASH_API_KEY optional — required only for JWT/deployment management endpoints.
 */
export class AkashApiClient {
  constructor({ consoleApiUrl = 'https://console-api.akash.network', apiKey = null, network = 'mainnet' } = {}) {
    this.baseUrl = consoleApiUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.network = network;
  }

  headers() {
    const h = { Accept: 'application/json' };
    if (this.apiKey) h['x-api-key'] = this.apiKey;
    return h;
  }

  async listProviders({ scope = 'all' } = {}) {
    const url = `${this.baseUrl}/v1/providers?scope=${scope}`;
    const data = await fetchJson(url, { headers: this.headers() });
    return Array.isArray(data) ? data : data.providers ?? [];
  }

  async getProvider(address) {
    return fetchJson(`${this.baseUrl}/v1/providers/${address}`, {
      headers: this.headers(),
    });
  }

  mapToPolicyMeshProvider(raw, gpuEnabled = false) {
    const uptime = raw.uptime30d ?? raw.uptime7d ?? raw.uptime1d ?? 0.95;
    const hasGpu =
      gpuEnabled ||
      (raw.stats?.gpu?.available ?? 0) > 0 ||
      (raw.attributes?.capabilities?.includes?.('gpu') ?? false);

    return {
      id: raw.owner ?? raw.address,
      serviceType: hasGpu ? 'akash-gpu' : 'akash-compute',
      completedDeals: raw.activeLeases ?? raw.leaseCount ?? 100,
      failedDeals: Math.max(0, Math.floor((1 - uptime) * 20)),
      uptimePercent: Math.round(uptime * 1000) / 10,
      avgResponseTimeMs: 800,
      verificationLevel: raw.isAudited ? 'verified' : 'unverified',
      slashingEvents: 0,
      pricingPerCpuHour: 0.5,
      pricingPerGpuHour: 2.5,
      available: raw.isOnline !== false,
      hostUri: raw.hostUri,
      region: raw.region,
      source: 'akash-console-api',
      rawStats: raw.stats,
    };
  }
}
