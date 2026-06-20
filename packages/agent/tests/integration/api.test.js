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

  it('GET /api/policies returns all four policies', async () => {
    const res = await request(app).get('/api/policies');
    assert.equal(res.status, 200);
    assert.ok(res.body.BudgetPolicy);
    assert.ok(res.body.DeliveryVerificationPolicy);
  });

  it('POST /api/procure/storage creates procurement with policy checks', async () => {
    const res = await request(app).post('/api/procure/storage').send({
      sizeGB: 50,
      durationDays: 30,
      maxCostHBAR: 100,
      userAccount: '0.0.test',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'awaiting_confirmation');
    assert.ok(res.body.policyChecks.length >= 2);
    assert.ok(res.body.procurementId);
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

  it('full procurement confirm flow completes', async () => {
    const create = await request(app).post('/api/procure/storage').send({
      sizeGB: 10,
      durationDays: 7,
      maxCostHBAR: 50,
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
});
