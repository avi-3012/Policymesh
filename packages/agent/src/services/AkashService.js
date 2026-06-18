/**
 * Akash compute integration for testnet deployments.
 */
export class AkashService {
  constructor({ demoMode = true, reputationService } = {}) {
    this.demoMode = demoMode;
    this.reputationService = reputationService;
    /** @type {Map<string, object>} */
    this.deployments = new Map();
  }

  async queryProviders({ cpuCount, memoryGB, gpuEnabled, minReputation = 0.75 }) {
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
    const deploymentId = `dseq-${Date.now()}`;
    const leaseId = `lease-${providerId}-${Date.now()}`;

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
      demoMode: this.demoMode,
    };

    this.deployments.set(deploymentId, deployment);

    await new Promise((r) => setTimeout(r, 100));
    deployment.status = 'active';
    deployment.providerOnline = true;
    deployment.leaseActive = true;
    deployment.confirmations = 6;

    return deployment;
  }

  async verifyDeployment(deploymentId, requestedSpecs) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return { verified: false, reason: `Deployment ${deploymentId} not found on-chain` };
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
