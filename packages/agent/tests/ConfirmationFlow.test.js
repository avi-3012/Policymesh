import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  requiresHumanConfirmation,
  requiresApproverSignature,
} from '../src/services/ProcurementExecutor.js';

describe('ProcurementExecutor thresholds', { concurrency: false }, () => {
  const config = {
    confirmation: {
      thresholdHBAR: 100,
      approverSignatureThresholdHBAR: 300,
    },
  };

  it('requires human confirmation above threshold', () => {
    assert.equal(requiresHumanConfirmation(101, config), true);
    assert.equal(requiresHumanConfirmation(100, config), false);
    assert.equal(requiresHumanConfirmation(50, config), false);
  });

  it('requires approver signature above high-value threshold', () => {
    assert.equal(requiresApproverSignature(301, config), true);
    assert.equal(requiresApproverSignature(300, config), false);
    assert.equal(requiresApproverSignature(150, config), false);
  });
});
