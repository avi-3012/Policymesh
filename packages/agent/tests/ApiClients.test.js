import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { FilecoinApiClient } from '../src/services/clients/FilecoinApiClient.js';
import { AkashApiClient } from '../src/services/clients/AkashApiClient.js';
import { SaucerSwapApiClient } from '../src/services/clients/SaucerSwapApiClient.js';
import { ReputationService } from '../src/services/ReputationService.js';
import { HcsService } from '../src/services/HcsService.js';

describe('FilecoinApiClient', { concurrency: false }, () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('parses miner list from Glif JSON-RPC', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        result: ['f01000', 'f01001'],
      }),
    }));

    const client = new FilecoinApiClient({
      rpcUrl: 'https://api.calibration.node.glif.io/rpc/v1',
    });
    const miners = await client.listMiners(2);
    assert.deepEqual(miners, ['f01000', 'f01001']);
  });
});

describe('AkashApiClient', { concurrency: false }, () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists providers from console API', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => [
        { owner: 'akash1abc', hostUri: 'https://provider.example', isOnline: true, uptime30d: 0.99 },
      ],
    }));

    const client = new AkashApiClient({
      consoleApiUrl: 'https://console-api.akash.network',
    });
    const providers = await client.listProviders();
    assert.equal(providers.length, 1);
    assert.equal(providers[0].owner, 'akash1abc');
  });

  it('maps provider to PolicyMesh format', () => {
    const client = new AkashApiClient({ consoleApiUrl: 'https://console-api.akash.network' });
    const mapped = client.mapToPolicyMeshProvider(
      { owner: 'akash1xyz', uptime30d: 0.95, isOnline: true, hostUri: 'https://p.test' },
      false,
    );
    assert.equal(mapped.id, 'akash1xyz');
    assert.equal(mapped.serviceType, 'akash-compute');
    assert.equal(mapped.source, 'akash-console-api');
  });
});

describe('SaucerSwapApiClient', { concurrency: false }, () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches CoinGecko rates for FIL and AKT', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        'hedera-hashgraph': { usd: 0.05 },
        filecoin: { usd: 5 },
        'akash-network': { usd: 2 },
        'usd-coin': { usd: 1 },
      }),
    }));

    const client = new SaucerSwapApiClient({
      rpcUrl: 'https://testnet.hashio.io/api',
      routerId: '0.0.19264',
      quoterId: '0.0.1390002',
      whbarTokenId: '0.0.15058',
      coingeckoUrl: 'https://api.coingecko.com/api/v3',
    });

    const rates = await client.getCoinGeckoRates();
    assert.equal(rates.hbarPerFil, 100);
    assert.equal(rates.hbarPerAkt, 40);
  });
});

describe('ReputationService.mergeLiveProviders', { concurrency: false }, () => {
  it('merges live providers into cache', () => {
    const hcsService = new HcsService({ demoMode: true });
    const reputation = new ReputationService({ hcsService });
    reputation.mergeLiveProviders([
      {
        id: 'f09999',
        serviceType: 'filecoin-storage',
        completedDeals: 500,
        failedDeals: 2,
        uptimePercent: 99,
        avgResponseTimeMs: 400,
        verificationLevel: 'verified',
        slashingEvents: 0,
        pricingPerGbMonth: 0.0000001,
        available: true,
        source: 'filecoin-calibration-glif',
      },
    ]);

    const provider = reputation.getProvider('f09999');
    assert.ok(provider);
    assert.equal(provider.source, 'filecoin-calibration-glif');
    assert.ok(provider.reputationScore > 0.7);
  });
});
