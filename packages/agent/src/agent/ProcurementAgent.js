/**
 * Orchestrates end-to-end procurement: swap → purchase → verify → audit.
 */
export class ProcurementAgent {
  constructor({
    filecoinService,
    akashService,
    saucerSwapService,
    priceOracleHook,
    deliveryVerificationPolicy,
    spendTracker,
    auditHook,
    notificationHook,
    reputationService,
    policyEngine,
    demoMode = true,
  }) {
    this.filecoinService = filecoinService;
    this.akashService = akashService;
    this.saucerSwapService = saucerSwapService;
    this.priceOracleHook = priceOracleHook;
    this.deliveryVerificationPolicy = deliveryVerificationPolicy;
    this.spendTracker = spendTracker;
    this.auditHook = auditHook;
    this.notificationHook = notificationHook;
    this.reputationService = reputationService;
    this.policyEngine = policyEngine;
    this.demoMode = demoMode;
    this.emergencyStop = false;
  }

  setEmergencyStop(stopped) {
    this.emergencyStop = stopped;
  }

  async executeProcurement(procurement) {
    if (this.emergencyStop) {
      throw new Error('Procurement halted: emergency stop is active');
    }

    const stages = [];
    const providerId =
      procurement.providerId ??
      procurement.recommendedProvider?.id ??
      procurement.recommendedProvider?.providerId;

    try {
      stages.push({ stage: 'provider_selection', status: 'started' });

      const hbarAmount = procurement.estimatedCostHBAR ?? procurement.maxCostHBAR;
      const token = procurement.serviceType === 'filecoin-storage' ? 'FIL' : 'AKT';

      stages.push({ stage: 'token_swap', status: 'started' });
      const rate = await this.priceOracleHook.getRate(token);
      const swap = await this.saucerSwapService.swapHBARToToken(hbarAmount, token);
      stages.push({ stage: 'token_swap', status: 'completed', swap, rate });

      await this.auditHook.logProcurementEvent('procurement.swap', {
        procurementId: procurement.id,
        swap,
        rate,
      });

      let deliveryResult;
      let deliveryRef;
      let retries = 0;
      const maxRetries = this.deliveryVerificationPolicy.maxRetries;

      while (retries <= maxRetries) {
        stages.push({ stage: 'service_purchase', status: 'started', attempt: retries + 1 });

        if (procurement.serviceType === 'filecoin-storage') {
          deliveryResult = await this.executeStoragePurchase(procurement, providerId, swap);
          deliveryRef = deliveryResult.dealId;
        } else {
          deliveryResult = await this.executeComputePurchase(procurement, providerId, swap);
          deliveryRef = deliveryResult.deploymentId;
        }

        stages.push({
          stage: 'service_purchase',
          status: 'completed',
          attempt: retries + 1,
          deliveryResult,
        });

        stages.push({ stage: 'delivery_verification', status: 'started' });
        const verification = await this.deliveryVerificationPolicy.verifyDelivery(
          procurement.serviceType,
          deliveryRef,
          this.buildVerificationSpecs(procurement, deliveryResult),
        );

        if (verification.passed) {
          stages.push({ stage: 'delivery_verification', status: 'completed', verification });
          break;
        }

        retries++;
        stages.push({
          stage: 'delivery_verification',
          status: 'failed',
          verification,
          retries,
        });

        if (!this.deliveryVerificationPolicy.autoRetry || retries > maxRetries) {
          this.notificationHook.notifyDeliveryFailure(procurement.id, verification.reason);
          throw new Error(verification.reason ?? 'Delivery verification failed');
        }

        await this.auditHook.logProcurementEvent('procurement.retry', {
          procurementId: procurement.id,
          attempt: retries,
          reason: verification.reason,
        });
      }

      this.spendTracker.recordSpend(hbarAmount, procurement.id);

      const dailySpend = this.spendTracker.getDailySpend();
      const dailyLimit = this.policyEngine.budgetPolicy.maxDailySpend;
      if (dailySpend / dailyLimit > 0.8) {
        this.notificationHook.notifyBudgetThreshold('daily', dailySpend, dailyLimit);
      }

      await this.auditHook.logProcurementEvent('procurement.completed', {
        procurementId: procurement.id,
        hbarAmount,
        swap,
        deliveryRef,
        deliveryResult,
        policyDecisions: procurement.policyChecks,
      });

      this.notificationHook.notificationStore.emit('procurement.update', {
        procurementId: procurement.id,
        newStatus: 'completed',
        message: 'Procurement completed successfully',
      });

      return {
        success: true,
        status: 'completed',
        stages,
        swap,
        delivery: deliveryResult,
        deliveryRef,
        hbarSpent: hbarAmount,
      };
    } catch (err) {
      await this.auditHook.logProcurementEvent('procurement.failed', {
        procurementId: procurement.id,
        error: err.message,
        stages,
      });

      this.notificationHook.notificationStore.emit('procurement.update', {
        procurementId: procurement.id,
        newStatus: 'failed',
        message: err.message,
      });

      return {
        success: false,
        status: 'failed',
        stages,
        error: err.message,
      };
    }
  }

  async executeStoragePurchase(procurement, providerId, swap) {
    const candidates = await this.filecoinService.queryProviders({
      sizeGB: procurement.sizeGB,
      durationDays: procurement.durationDays,
      minReputation: this.policyEngine.reputationPolicy.minReputationScore,
    });

    const allowed = this.policyEngine.allowlistPolicy.filterProviders(candidates, 'providerId');
    const selected = this.filecoinService.selectProvider(allowed, providerId);
    if (!selected) {
      throw new Error('No suitable Filecoin provider available on the allowlist');
    }

    return this.filecoinService.createStorageDeal({
      providerId: selected.providerId,
      sizeGB: procurement.sizeGB,
      durationDays: procurement.durationDays,
      filAmount: swap.outputAmount,
      procurementId: procurement.id,
    });
  }

  async executeComputePurchase(procurement, providerId, swap) {
    const candidates = await this.akashService.queryProviders({
      cpuCount: procurement.cpuCount,
      memoryGB: procurement.memoryGB,
      gpuEnabled: procurement.gpuEnabled,
      minReputation: this.policyEngine.reputationPolicy.minReputationScore,
    });

    const allowed = this.policyEngine.allowlistPolicy.filterProviders(candidates, 'providerId');
    const selected = this.akashService.selectProvider(allowed, providerId);
    if (!selected) {
      throw new Error('No suitable Akash provider available on the allowlist');
    }

    return this.akashService.createDeployment({
      providerId: selected.providerId,
      cpuCount: procurement.cpuCount,
      memoryGB: procurement.memoryGB,
      gpuEnabled: procurement.gpuEnabled,
      durationHours: procurement.durationHours,
      aktAmount: swap.outputAmount,
      procurementId: procurement.id,
    });
  }

  buildVerificationSpecs(procurement, deliveryResult) {
    if (procurement.serviceType === 'filecoin-storage') {
      return {
        pieceCid: deliveryResult.pieceCid,
        sizeGB: procurement.sizeGB,
      };
    }
    return {
      cpuCount: procurement.cpuCount,
      memoryGB: procurement.memoryGB,
    };
  }
}
