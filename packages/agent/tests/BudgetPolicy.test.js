import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BudgetPolicy } from '../src/policies/BudgetPolicy.js';
import { SpendTracker } from '../src/services/SpendTracker.js';

describe('BudgetPolicy', { concurrency: false }, () => {
  let spendTracker;
  let policy;

  beforeEach(() => {
    spendTracker = new SpendTracker();
    policy = new BudgetPolicy(
      {
        maxPerProcurement: 500,
        maxDailySpend: 2000,
        maxMonthlySpend: 20000,
        minProcurementAmount: 10,
      },
      spendTracker,
    );
  });

  it('allows procurement within all limits', () => {
    const result = policy.checkProcurement(100);
    assert.equal(result.passed, true);
    assert.equal(result.reason, null);
  });

  it('blocks procurement below minimum amount', () => {
    const result = policy.checkProcurement(5);
    assert.equal(result.passed, false);
    assert.match(result.reason, /below minimum/);
  });

  it('blocks procurement exceeding per-transaction limit', () => {
    const result = policy.checkProcurement(600);
    assert.equal(result.passed, false);
    assert.match(result.reason, /per-procurement limit/);
  });

  it('blocks when daily limit would be exceeded', () => {
    spendTracker.recordSpend(1900, 'prior-1');
    const result = policy.checkProcurement(200);
    assert.equal(result.passed, false);
    assert.match(result.reason, /Daily spend limit/);
  });

  it('blocks when monthly limit would be exceeded', () => {
    const localTracker = new SpendTracker();
    const monthlyPolicy = new BudgetPolicy(
      {
        maxPerProcurement: 500,
        maxDailySpend: 50000,
        maxMonthlySpend: 20000,
        minProcurementAmount: 10,
      },
      localTracker,
    );
    localTracker.recordSpend(19900, 'prior-1');
    const result = monthlyPolicy.checkProcurement(200);
    assert.equal(result.passed, false);
    assert.match(result.reason, /Monthly spend limit/);
  });

  it('shouldBlockPostParamsNormalization blocks invalid amount', () => {
    const blocked = policy.shouldBlockPostParamsNormalization(
      {},
      { normalisedParams: {} },
      'procure_filecoin_storage',
    );
    assert.equal(blocked, true);
    assert.match(policy.lastBlockReason, /Missing or invalid/);
  });

  it('shouldBlockPostParamsNormalization allows valid request', () => {
    const blocked = policy.shouldBlockPostParamsNormalization(
      {},
      { normalisedParams: { maxCostHBAR: 50 } },
      'procure_filecoin_storage',
    );
    assert.equal(blocked, false);
  });

  it('ignores non-procurement tools', () => {
    const blocked = policy.shouldBlockPostParamsNormalization(
      {},
      { normalisedParams: { amount: 99999 } },
      'transfer_hbar',
    );
    assert.equal(blocked, false);
  });

  it('allows USDC procurement within limit', () => {
    const usdcPolicy = new BudgetPolicy(
      { maxUSDCPerProcurement: 100, usdcTokenId: '0.0.429274' },
      spendTracker,
    );
    const result = usdcPolicy.checkProcurement(50, 'USDC');
    assert.equal(result.passed, true);
    assert.equal(result.paymentToken, 'USDC');
  });

  it('blocks USDC procurement over limit', () => {
    const usdcPolicy = new BudgetPolicy(
      { maxUSDCPerProcurement: 100, usdcTokenId: '0.0.429274' },
      spendTracker,
    );
    const result = usdcPolicy.checkProcurement(150, 'USDC');
    assert.equal(result.passed, false);
    assert.match(result.reason, /USDC amount 150 exceeds max 100/);
  });

  it('accepts USDC token id as payment token', () => {
    const usdcPolicy = new BudgetPolicy(
      { maxUSDCPerProcurement: 100, usdcTokenId: '0.0.429274' },
      spendTracker,
    );
    const result = usdcPolicy.checkProcurement(25, '0.0.429274');
    assert.equal(result.passed, true);
  });
});
