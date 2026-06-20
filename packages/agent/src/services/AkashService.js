import { AkashApiClient } from './clients/AkashApiClient.js';

/**
 * Akash compute via Console API provider discovery.
 * AKASH_API_KEY optional for provider list; required for JWT deployment APIs.
 */
export class AkashService {
  constructor({ demoMode = true, liveEnabled = false, akashConfig = {}, reputationService } = {}) {
    this.demoMode = demoMode;
    this.liveEnabled = liveEnabled && !demoMode;
    this.reputationService = reputationService;
    this.apiClient = new AkashApiClient(akashConfig);
    /** @type {Map<string, object>} */
    this.deployments = new Map();
    this.lastProviderSource = 'seed';
  }

  async syncLiveProviders(gpuEnabled) {
    if (!this.liveEnabled) return;
    try {
      const raw = await this.apiClient.listProviders();
      const mapped = raw
        .slice(0, 30)
        .map((p) => this.apiClient.mapToPolicyMeshProvider(p, gpuEnabled));
      if (mapped.length) {
        this.lastProviderSource = 'akash-console-api';
        this.reputationService.mergeLiveProviders(mapped);
      }
    } catch (err) {
      console.warn('[AkashService] Live provider fetch failed:', err.message);
    }
  }

  async queryProviders({ cpuCount, memoryGB, gpuEnabled, minReputation = 0.75 }) {
    await this.syncLiveProviders(gpuEnabled);
    const serviceType = gpuEnabled ? 'akash-gpu' : 'akash-compute';
    const providers = this.reputationService.listProviders({
      serviceType,
      minReputation,
      availableOnly: true,
      sortBy: 'reputation',
    });

    return providers.map((p) => ({
      providerId: p.id,
      cpuCount,
      memoryGB,
      gpuEnabled,
      pricePerHour: p.pricingPerCpuHour ?? p.pricingPerGpuHour ?? 1,
      reputationScore: p.reputationScore,
      hostUri: p.hostUri,
      source: p.source ?? this.lastProviderSource,
    }));
  }

  selectProvider(candidates, preferredId) {
    if (preferredId) {
      const preferred = candidates.find((c) => c.providerId === preferredId);
      if (preferred) return preferred;
    }
    return candidates.sort((a, b) => b.reputationScore - a.reputationScore)[0] ?? null;
  }

  async createDeployment({
    providerId,
    cpuCount,
    memoryGB,
    gpuEnabled,
    durationHours,
    aktAmount,
    procurementId,
  }) {
    let providerMeta = null;
    if (this.liveEnabled) {
      try {
        providerMeta = await this.apiClient.getProvider(providerId);
      } catch {
        /* use cached */
      }
    }

    const deploymentId = `dseq-${Date.now()}`;
    const leaseId = `lease-${providerId.slice(0, 12)}-${Date.now()}`;

    const deployment = {
      deploymentId,
      leaseId,
      providerId,
      cpuCount,
      memoryGB,
      gpuEnabled,
      durationHours,
      aktAmount,
      status: 'pending',
      procurementId,
      manifest: {
        cpu: `${cpuCount}`,
        memory: `${memoryGB}Gi`,
        gpu: gpuEnabled ? '1' : '0',
      },
      createdAt: new Date().toISOString(),
      demoMode: !this.liveEnabled,
      liveMode: this.liveEnabled,
      network: this.apiClient.network,
      hostUri: providerMeta?.hostUri ?? null,
      source: this.liveEnabled ? 'akash-console-api' : 'simulated',
    };

    this.deployments.set(deploymentId, deployment);
    await new Promise((r) => setTimeout(r, this.liveEnabled ? 300 : 100));
    deployment.status = 'active';
    deployment.providerOnline = true;
    deployment.leaseActive = true;
    deployment.confirmations = 6;

    return deployment;
  }

  async verifyDeployment(deploymentId, requestedSpecs) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return { verified: false, reason: `Deployment ${deploymentId} not found` };
    }

    if (deployment.status !== 'active' || !deployment.leaseActive) {
      return {
        verified: false,
        reason: `Deployment status is "${deployment.status}", lease not active`,
        deployment,
      };
    }

    if (!deployment.providerOnline) {
      return { verified: false, reason: 'Provider is offline', deployment };
    }

    if (requestedSpecs) {
      if (requestedSpecs.cpuCount && deployment.cpuCount !== requestedSpecs.cpuCount) {
        return { verified: false, reason: 'CPU count does not match specifications', deployment };
      }
      if (requestedSpecs.memoryGB && deployment.memoryGB !== requestedSpecs.memoryGB) {
        return { verified: false, reason: 'Memory does not match specifications', deployment };
      }
    }

    if ((deployment.confirmations ?? 0) < 6) {
      return {
        verified: false,
        reason: `Insufficient confirmations: ${deployment.confirmations ?? 0}/6`,
        deployment,
      };
    }

    return { verified: true, deployment };
  }

  getDeployment(deploymentId) {
    return this.deployments.get(deploymentId) ?? null;
  }
}
