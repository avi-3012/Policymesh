import { z } from 'zod';
import { BaseTool } from '@hashgraph/hedera-agent-kit';
import { v4 as uuidv4 } from 'uuid';

function getServices(context) {
  return context.polymesh;
}

function policySummary(checks) {
  return checks.map((c) => `${c.policy}: ${c.passed ? 'PASS' : 'BLOCK'}${c.reason ? ` (${c.reason})` : ''}`).join('; ');
}

export class ProcureFilecoinStorageTool extends BaseTool {
  method = 'procure_filecoin_storage';
  name = 'Procure Filecoin Storage';
  description =
    'Create a Filecoin storage procurement request. Policies (budget, service type, reputation) are enforced automatically.';
  parameters = z.object({
    sizeGB: z.number().min(1).describe('Storage size in GB'),
    durationDays: z.number().min(1).describe('Storage duration in days'),
    maxCostHBAR: z.number().min(1).describe('Maximum budget in HBAR'),
    userAccount: z.string().optional().describe('Requesting Hedera account ID'),
    providerId: z.string().optional().describe('Preferred Filecoin provider ID'),
    humanApprovalToken: z.string().optional(),
    redundancy: z.enum(['standard', 'enhanced']).optional(),
  });

  async normalizeParams(params) {
    return {
      sizeGB: Number(params.sizeGB),
      durationDays: Number(params.durationDays),
      maxCostHBAR: Number(params.maxCostHBAR),
      userAccount: params.userAccount ?? '0.0.agent',
      providerId: params.providerId,
      humanApprovalToken: params.humanApprovalToken,
      redundancy: params.redundancy ?? 'standard',
    };
  }

  async coreAction(normalisedParams, context) {
    const { policyEngine, procurementStore, auditHook, reputationService } = getServices(context);
    const procurementId = uuidv4();
    const policyChecks = policyEngine.evaluateProcurement({
      serviceType: 'filecoin-storage',
      amountHBAR: normalisedParams.maxCostHBAR,
      providerId: normalisedParams.providerId,
      humanApprovalToken: normalisedParams.humanApprovalToken,
    });

    for (const check of policyChecks) {
      await auditHook.logPolicyDecision({
        procurementId,
        policyName: check.policy,
        passed: check.passed,
        reason: check.reason,
        details: check,
      });
    }

    const allPassed = policyChecks.every((c) => c.passed);
    const record = procurementStore.create({
      id: procurementId,
      serviceType: 'filecoin-storage',
      status: allPassed ? 'awaiting_confirmation' : 'policy_rejected',
      estimatedCostHBAR: normalisedParams.maxCostHBAR,
      policyChecks,
      ...normalisedParams,
    });

    if (!normalisedParams.providerId && allPassed) {
      const providers = reputationService.listProviders({
        serviceType: 'filecoin-storage',
        minReputation: policyEngine.reputationPolicy.minReputationScore,
        availableOnly: true,
      });
      if (providers[0]) {
        procurementStore.update(procurementId, { recommendedProvider: providers[0] });
        record.recommendedProvider = providers[0];
      }
    }

    return {
      procurementId,
      status: record.status,
      policyChecks,
      recommendedProvider: record.recommendedProvider ?? null,
      verificationResult: allPassed
        ? { passed: true, policy: 'DeliveryVerificationPolicy', reason: null }
        : { passed: false, policy: 'DeliveryVerificationPolicy', reason: 'Pending execution' },
    };
  }

  async secondaryAction() {
    return null;
  }

  async shouldSecondaryAction() {
    return false;
  }

  outputParser(rawOutput) {
    const data = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
    return {
      raw: data,
      humanMessage: data.status === 'policy_rejected'
        ? `Policy blocked: ${policySummary(data.policyChecks)}`
        : `Storage procurement ${data.procurementId} created. ${policySummary(data.policyChecks)}. Confirm to execute.`,
    };
  }
}

export class ProcureAkashComputeTool extends BaseTool {
  method = 'procure_akash_compute';
  name = 'Procure Akash Compute';
  description =
    'Create an Akash compute procurement request with policy enforcement.';
  parameters = z.object({
    cpuCount: z.number().min(1),
    memoryGB: z.number().min(1),
    durationHours: z.number().min(1),
    maxCostHBAR: z.number().min(1),
    gpuEnabled: z.boolean().optional(),
    userAccount: z.string().optional(),
    providerId: z.string().optional(),
    humanApprovalToken: z.string().optional(),
  });

  async normalizeParams(params) {
    return {
      cpuCount: Number(params.cpuCount),
      memoryGB: Number(params.memoryGB),
      durationHours: Number(params.durationHours),
      maxCostHBAR: Number(params.maxCostHBAR),
      gpuEnabled: Boolean(params.gpuEnabled),
      userAccount: params.userAccount ?? '0.0.agent',
      providerId: params.providerId,
      humanApprovalToken: params.humanApprovalToken,
    };
  }

  async coreAction(normalisedParams, context) {
    const { policyEngine, procurementStore, auditHook, reputationService } = getServices(context);
    const serviceType = normalisedParams.gpuEnabled ? 'akash-gpu' : 'akash-compute';
    const procurementId = uuidv4();

    const policyChecks = policyEngine.evaluateProcurement({
      serviceType,
      amountHBAR: normalisedParams.maxCostHBAR,
      providerId: normalisedParams.providerId,
      humanApprovalToken: normalisedParams.humanApprovalToken,
    });

    for (const check of policyChecks) {
      await auditHook.logPolicyDecision({
        procurementId,
        policyName: check.policy,
        passed: check.passed,
        reason: check.reason,
        details: check,
      });
    }

    const allPassed = policyChecks.every((c) => c.passed);
    const record = procurementStore.create({
      id: procurementId,
      serviceType,
      status: allPassed ? 'awaiting_confirmation' : 'policy_rejected',
      estimatedCostHBAR: normalisedParams.maxCostHBAR,
      policyChecks,
      ...normalisedParams,
    });

    return {
      procurementId,
      status: record.status,
      serviceType,
      policyChecks,
      verificationResult: { passed: allPassed, policy: 'DeliveryVerificationPolicy', reason: null },
    };
  }

  async secondaryAction() {
    return null;
  }

  async shouldSecondaryAction() {
    return false;
  }

  outputParser(rawOutput) {
    const data = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
    return {
      raw: data,
      humanMessage:
        data.status === 'policy_rejected'
          ? `Policy blocked: ${policySummary(data.policyChecks)}`
          : `Compute procurement ${data.procurementId} created awaiting confirmation.`,
    };
  }
}

export class SwapHbarToFilTool extends BaseTool {
  method = 'swap_hbar_to_fil';
  name = 'Swap HBAR to FIL';
  description = 'Swap HBAR to FIL via SaucerSwap for Filecoin procurement.';
  parameters = z.object({
    amountHBAR: z.number().min(1),
    procurementId: z.string().optional(),
  });

  async normalizeParams(params) {
    return {
      amountHBAR: Number(params.amountHBAR),
      procurementId: params.procurementId,
      estimatedCostHBAR: Number(params.amountHBAR),
      maxCostHBAR: Number(params.amountHBAR),
    };
  }

  async coreAction(normalisedParams, context) {
    const { saucerSwapService, priceOracleHook } = getServices(context);
    const rate = await priceOracleHook.getRate('FIL');
    const swap = await saucerSwapService.swapHBARToToken(normalisedParams.amountHBAR, 'FIL');
    return { swap, rate, procurementId: normalisedParams.procurementId };
  }

  async secondaryAction() {
    return null;
  }

  async shouldSecondaryAction() {
    return false;
  }

  outputParser(rawOutput) {
    const data = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
    return {
      raw: data,
      humanMessage: `Swapped ${data.swap.inputHBAR} HBAR → ${data.swap.outputAmount.toFixed(4)} FIL (tx: ${data.swap.transactionHash})`,
    };
  }
}

export class SwapHbarToAktTool extends BaseTool {
  method = 'swap_hbar_to_akt';
  name = 'Swap HBAR to AKT';
  description = 'Swap HBAR to AKT via SaucerSwap for Akash procurement.';
  parameters = z.object({
    amountHBAR: z.number().min(1),
    procurementId: z.string().optional(),
  });

  async normalizeParams(params) {
    return {
      amountHBAR: Number(params.amountHBAR),
      procurementId: params.procurementId,
      estimatedCostHBAR: Number(params.amountHBAR),
      maxCostHBAR: Number(params.amountHBAR),
    };
  }

  async coreAction(normalisedParams, context) {
    const { saucerSwapService, priceOracleHook } = getServices(context);
    const rate = await priceOracleHook.getRate('AKT');
    const swap = await saucerSwapService.swapHBARToToken(normalisedParams.amountHBAR, 'AKT');
    return { swap, rate, procurementId: normalisedParams.procurementId };
  }

  async secondaryAction() {
    return null;
  }

  async shouldSecondaryAction() {
    return false;
  }

  outputParser(rawOutput) {
    const data = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
    return {
      raw: data,
      humanMessage: `Swapped ${data.swap.inputHBAR} HBAR → ${data.swap.outputAmount.toFixed(4)} AKT (tx: ${data.swap.transactionHash})`,
    };
  }
}
