import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ServiceTypePolicy } from '../src/policies/ServiceTypePolicy.js';
import { ServiceProviderReputationPolicy } from '../src/policies/ServiceProviderReputationPolicy.js';
import { AllowlistPolicy } from '../src/policies/AllowlistPolicy.js';
import { ReputationService } from '../src/services/ReputationService.js';
import { HcsService } from '../src/services/HcsService.js';

describe('ServiceTypePolicy', { concurrency: false }, () => {
  let policy;

  beforeEach(() => {
    policy = new ServiceTypePolicy();
  });

  it('allows approved service types', () => {
    const result = policy.checkRequest({
      serviceType: 'filecoin-storage',
      estimatedCostHBAR: 100,
    });
    assert.equal(result.passed, true);
  });

  it('blocks unapproved service types', () => {
    const result = policy.checkRequest({
      serviceType: 'unknown-service',
      estimatedCostHBAR: 100,
    });
    assert.equal(result.passed, false);
    assert.match(result.reason, /not in the allowed list/);
  });

  it('blocks GPU compute without human approval', () => {
    const result = policy.checkRequest({
      serviceType: 'akash-gpu',
      estimatedCostHBAR: 100,
    });
    assert.equal(result.passed, false);
    assert.match(result.reason, /requires human approval/);
  });

  it('allows GPU compute with approval token', () => {
    const policyWithGpu = new ServiceTypePolicy({
      allowedServices: ['filecoin-storage', 'akash-compute', 'akash-gpu'],
    });
    const result = policyWithGpu.checkRequest({
      serviceType: 'akash-gpu',
      estimatedCostHBAR: 100,
      humanApprovalToken: 'approved-by-admin',
    });
    assert.equal(result.passed, true);
  });

  it('blocks when cost exceeds service max', () => {
    const result = policy.checkRequest({
      serviceType: 'filecoin-storage',
      estimatedCostHBAR: 400,
    });
    assert.equal(result.passed, false);
    assert.match(result.reason, /exceeds max allowed/);
  });
});

describe('ServiceProviderReputationPolicy', { concurrency: false }, () => {
  let policy;
  let reputationService;

  beforeEach(() => {
    const hcsService = new HcsService({ demoMode: true });
    reputationService = new ReputationService({ hcsService });
    policy = new ServiceProviderReputationPolicy({}, reputationService);
  });

  it('approves high-reputation provider', () => {
    const result = policy.evaluateProvider('f01234');
    assert.equal(result.passed, true);
    assert.equal(result.provider.id, 'f01234');
  });

  it('blocks low-reputation provider', () => {
    const result = policy.evaluateProvider('f05678');
    assert.equal(result.passed, false);
    assert.match(result.reason, /reputation score/);
    assert.ok(result.suggestedAlternatives?.length > 0);
  });

  it('blocks unknown provider', () => {
    const result = policy.evaluateProvider('unknown-provider');
    assert.equal(result.passed, false);
    assert.match(result.reason, /not found/);
  });
});

describe('AllowlistPolicy', { concurrency: false }, () => {
  let policy;

  beforeEach(() => {
    policy = new AllowlistPolicy({
      allowedProviders: ['f01234', 'akash-provider-1'],
    });
  });

  it('allows whitelisted Filecoin miner', () => {
    const result = policy.evaluateProvider('f01234');
    assert.equal(result.passed, true);
  });

  it('blocks provider not on allowlist', () => {
    const result = policy.evaluateProvider('f09999');
    assert.equal(result.passed, false);
    assert.match(result.reason, /not in the allowed counterparties list/);
  });

  it('filters provider candidates to allowlist only', () => {
    const filtered = policy.filterProviders(
      [{ providerId: 'f01234' }, { providerId: 'f09999' }],
      'providerId',
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].providerId, 'f01234');
  });

  it('passes all providers when disabled', () => {
    policy.updateConfig({ enabled: false });
    const filtered = policy.filterProviders(
      [{ providerId: 'f01234' }, { providerId: 'f09999' }],
      'providerId',
    );
    assert.equal(filtered.length, 2);
  });
});
