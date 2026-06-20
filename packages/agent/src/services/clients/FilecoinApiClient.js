import { jsonRpc } from '../../lib/http.js';

/**
 * Filecoin Calibration network client via Glif public RPC.
 * Optional FILECOIN_API_KEY for premium RPC providers.
 */
export class FilecoinApiClient {
  constructor({ rpcUrl = 'https://api.calibration.node.glif.io/rpc/v1', apiKey = null } = {}) {
    this.rpcUrl = rpcUrl;
    this.apiKey = apiKey;
  }

  async getChainHead() {
    return jsonRpc(this.rpcUrl, 'Filecoin.ChainHead', [], this.apiKey);
  }

  async listMiners(limit = 20) {
    const miners = await jsonRpc(this.rpcUrl, 'Filecoin.StateListMiners', [null], this.apiKey);
    return (miners ?? []).slice(0, limit);
  }

  async getMinerInfo(minerId) {
    try {
      const head = await this.getChainHead();
      const tipset = head.Cids ?? head.Blocks?.map((b) => b.Cid) ?? [];
      if (!tipset.length) return null;
      return jsonRpc(
        this.rpcUrl,
        'Filecoin.StateMinerInfo',
        [minerId, tipset],
        this.apiKey,
      );
    } catch {
      return null;
    }
  }

  async fetchLiveProviders(limit = 10) {
    const minerIds = await this.listMiners(limit);
    const providers = [];

    for (const minerId of minerIds) {
      const info = await this.getMinerInfo(minerId);
      const power = info?.MinerPower?.RawBytePower ?? info?.MinerPower?.QualityAdjPower;
      providers.push({
        id: minerId,
        serviceType: 'filecoin-storage',
        minerId,
        sectorSize: info?.SectorSize,
        windowPoStProofType: info?.WindowPoStProofType,
        availableCapacityGB: power ? Number(BigInt(power)) / 1e9 : null,
        source: 'filecoin-calibration-glif',
        verificationLevel: 'verified',
        available: true,
      });
    }

    return providers;
  }
}
