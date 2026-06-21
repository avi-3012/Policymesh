import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/createApp.js';

describe('API integration', { concurrency: false }, () => {
  let app;

  before(() => {
    ({ app } = createApp());
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('GET /api/policies returns all policies including allowlist', async () => {
    const res = await request(app).get('/api/policies');
    assert.equal(res.status, 200);
    assert.ok(res.body.BudgetPolicy);
    assert.ok(res.body.AllowlistPolicy);
    assert.ok(res.body.DeliveryVerificationPolicy);
  });

  it('POST /api/procure/storage requires confirmation above threshold', async () => {
    const res = await request(app).post('/api/procure/storage').send({
      sizeGB: 50,
      durationDays: 30,
      maxCostHBAR: 150,
      userAccount: '0.0.test',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'awaiting_confirmation');
    assert.equal(res.body.requiresHumanConfirmation, true);
    assert.ok(res.body.policyChecks.length >= 2);
    assert.ok(res.body.procurementId);
    assert.match(res.body.message, /requires human approval/i);
  });

  it('POST /api/procure/storage auto-executes under threshold', async () => {
    const res = await request(app).post('/api/procure/storage').send({
      sizeGB: 10,
      durationDays: 7,
      maxCostHBAR: 50,
      userAccount: '0.0.test',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'completed');
    assert.equal(res.body.autoExecuted, true);
    assert.ok(res.body.transactionDetails?.delivery);
  });

  it('POST /api/procure/storage blocks over budget', async () => {
    const res = await request(app).post('/api/procure/storage').send({
      sizeGB: 50,
      durationDays: 30,
      maxCostHBAR: 600,
      userAccount: '0.0.test',
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.status, 'policy_rejected');
  });

  it('confirmation approve flow completes large purchase', async () => {
    const create = await request(app).post('/api/procure/storage').send({
      sizeGB: 10,
      durationDays: 7,
      maxCostHBAR: 150,
      userAccount: '0.0.test',
    });
    assert.equal(create.body.status, 'awaiting_confirmation');
    const id = create.body.procurementId;

    const approve = await request(app)
      .post(`/api/confirmations/${id}/approve`)
      .send({ approvedBy: 'human' });

    assert.equal(approve.status, 200);
    assert.equal(approve.body.status, 'executed');
    assert.equal(approve.body.procurement.status, 'completed');
    assert.ok(approve.body.transactionDetails?.delivery);
  });

  it('confirmation reject flow blocks purchase', async () => {
    const create = await request(app).post('/api/procure/storage').send({
      sizeGB: 10,
      durationDays: 7,
      maxCostHBAR: 150,
      userAccount: '0.0.test',
    });
    const id = create.body.procurementId;

    const reject = await request(app)
      .post(`/api/confirmations/${id}/reject`)
      .send({ reason: 'Budget hold' });

    assert.equal(reject.status, 200);
    assert.equal(reject.body.status, 'rejected');
    assert.equal(reject.body.procurement.status, 'rejected');
  });

  it('legacy confirm endpoint still works for large purchases', async () => {
    const create = await request(app).post('/api/procure/storage').send({
      sizeGB: 10,
      durationDays: 7,
      maxCostHBAR: 150,
      userAccount: '0.0.test',
    });
    const id = create.body.procurementId;

    const confirm = await request(app)
      .post(`/api/procurements/${id}/confirm`)
      .send({ approverSignature: null });

    assert.equal(confirm.status, 200);
    assert.equal(confirm.body.status, 'completed');
    assert.ok(confirm.body.transactionDetails?.delivery);
  });

  it('GET /api/agent/status reports langchain config', async () => {
    const res = await request(app).get('/api/agent/status');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.tools));
    assert.ok(res.body.tools.includes('procure_filecoin_storage'));
  });

  it('GET /api/status includes integration metadata', async () => {
    const res = await request(app).get('/api/status');
    assert.equal(res.status, 200);
    assert.ok('integrations' in res.body);
    assert.ok(res.body.integrations.filecoin);
    assert.ok(res.body.integrations.akash);
    assert.ok(res.body.integrations.saucerswap);
  });

  it('GET /api/swap/quote returns HBAR to USDC quote', async () => {
    const res = await request(app).get('/api/swap/quote?from=HBAR&to=USDC&amount=100');
    assert.equal(res.status, 200);
    assert.equal(res.body.from, 'HBAR');
    assert.equal(res.body.to, 'USDC');
    assert.equal(res.body.tokenId, '0.0.429274');
    assert.ok(res.body.outputAmount > 0);
  });

  it('blocks USDC procurement over budget limit', async () => {
    const res = await request(app).post('/api/procure/storage').send({
      sizeGB: 10,
      durationDays: 7,
      paymentToken: 'USDC',
      maxCostUSDC: 150,
      userAccount: '0.0.test',
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.status, 'policy_rejected');
    assert.ok(res.body.policyChecks.some((c) => c.policy === 'BudgetPolicy' && !c.passed));
  });
});
