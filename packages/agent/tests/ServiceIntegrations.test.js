import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SaucerSwapService } from '../src/services/SaucerSwapService.js';
import { FilecoinService } from '../src/services/FilecoinService.js';
import { AkashService } from '../src/services/AkashService.js';
import { ReputationService } from '../src/services/ReputationService.js';
import { HcsService } from '../src/services/HcsService.js';
import { SpendTracker } from '../src/services/SpendTracker.js';
import { DeliveryVerificationPolicy } from '../src/policies/DeliveryVerificationPolicy.js';
import { ProcurementAgent } from '../src/agent/ProcurementAgent.js';
import { createPolicyEngine } from '../src/policies/index.js';
import { AuditHook } from '../src/hooks/AuditHook.js';
import { PriceOracleHook } from '../src/hooks/PriceOracleHook.js';
import { NotificationHook } from '../src/hooks/NotificationHook.js';
import { notificationStore } from '../src/services/NotificationStore.js';

describe('SaucerSwapService', { concurrency: false }, () => {
  it('returns exchange rates for FIL and AKT', async () => {
    const service = new SaucerSwapService({ demoMode: true });
    const filRate = await service.getExchangeRate('FIL');
    const aktRate = await service.getExchangeRate('AKT');
    assert.ok(filRate.hbarPerToken > 0);
    assert.ok(aktRate.hbarPerToken > 0);
  });

  it('calculates swap output with slippage protection', () => {
    const service = new SaucerSwapService({ demoMode: true });
    const quote = service.calculateSwapOutput(100, 'FIL');
    assert.equal(quote.inputHBAR, 100);
    assert.ok(quote.minOutputAmount < quote.outputAmount);
  });
});

describe('DeliveryVerificationPolicy', { concurrency: false }, () => {
  let policy;
  let filecoinService;

  beforeEach(() => {
    const hcsService = new HcsService({ demoMode: true });
    const reputationService = new ReputationService({ hcsService });
    filecoinService = new FilecoinService({ demoMode: true, reputationService });
    const akashService = new AkashService({ demoMode: true, reputationService });
    policy = new DeliveryVerificationPolicy({}, { filecoinService, akashService });
  });

  it('verifies active filecoin deal', async () => {
    const deal = await filecoinService.createStorageDeal({
      providerId: 'f01234',
      sizeGB: 50,
      durationDays: 30,
      filAmount: 8,
      procurementId: 'test-proc-1',
    });

    const result = await policy.verifyDelivery('filecoin-storage', deal.dealId, {
      pieceCid: deal.pieceCid,
      sizeGB: 50,
    });

    assert.equal(result.passed, true);
    assert.equal(result.deal.dealId, deal.dealId);
  });

  it('blocks missing deal', async () => {
    const result = await policy.verifyDelivery('filecoin-storage', 'nonexistent-deal', {});
    assert.equal(result.passed, false);
    assert.match(result.reason, /not found/);
  });
});

describe('ProcurementAgent', { concurrency: false }, () => {
  let agent;

  beforeEach(() => {
    notificationStore.events = [];
    const hcsService = new HcsService({ demoMode: true });
    const reputationService = new ReputationService({ hcsService });
    const spendTracker = new SpendTracker();
    const filecoinService = new FilecoinService({ demoMode: true, reputationService });
    const akashService = new AkashService({ demoMode: true, reputationService });
    const saucerSwapService = new SaucerSwapService({ demoMode: true });
    const policyEngine = createPolicyEngine({
      spendTracker,
      reputationService,
      filecoinService,
      akashService,
      config: { budget: {}, serviceType: {}, reputation: {}, delivery: {} },
    });
    const auditHook = new AuditHook(hcsService);
    const priceOracleHook = new PriceOracleHook(saucerSwapService);
    const notificationHook = new NotificationHook(notificationStore);

    agent = new ProcurementAgent({
      filecoinService,
      akashService,
      saucerSwapService,
      priceOracleHook,
      deliveryVerificationPolicy: policyEngine.deliveryVerificationPolicy,
      spendTracker,
      auditHook,
      notificationHook,
      reputationService,
      policyEngine,
      demoMode: true,
    });
  });

  it('executes storage procurement end-to-end', async () => {
    const result = await agent.executeProcurement({
      id: 'proc-test-1',
      serviceType: 'filecoin-storage',
      sizeGB: 50,
      durationDays: 30,
      estimatedCostHBAR: 100,
      maxCostHBAR: 100,
    });

    assert.equal(result.success, true);
    assert.equal(result.status, 'completed');
    assert.ok(result.swap.transactionHash);
    assert.ok(result.delivery.pieceCid);
    assert.ok(result.deliveryRef);
  });

  it('executes compute procurement end-to-end', async () => {
    const result = await agent.executeProcurement({
      id: 'proc-test-2',
      serviceType: 'akash-compute',
      cpuCount: 2,
      memoryGB: 4,
      gpuEnabled: false,
      durationHours: 24,
      estimatedCostHBAR: 80,
      maxCostHBAR: 80,
    });

    assert.equal(result.success, true);
    assert.ok(result.delivery.deploymentId);
  });

  it('respects emergency stop', async () => {
    agent.setEmergencyStop(true);
    await assert.rejects(
      () =>
        agent.executeProcurement({
          id: 'proc-test-3',
          serviceType: 'filecoin-storage',
          sizeGB: 10,
          durationDays: 7,
          estimatedCostHBAR: 50,
        }),
      /emergency stop/,
    );
  });
});
