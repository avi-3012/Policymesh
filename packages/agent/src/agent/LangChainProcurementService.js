import { Client } from '@hashgraph/sdk';
import { AgentMode } from '@hashgraph/hedera-agent-kit';
import { coreAccountQueryPlugin } from '@hashgraph/hedera-agent-kit/plugins';
import { HcsAuditTrailHook } from '@hashgraph/hedera-agent-kit/hooks';
import { HederaLangchainToolkit } from '@hashgraph/hedera-agent-kit-langchain';
import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { procurementPlugin } from '../plugins/procurementPlugin.js';

const SYSTEM_PROMPT = `You are PolicyMesh, an autonomous Hedera procurement officer for decentralized infrastructure.

You help users procure Filecoin storage and Akash compute using HBAR. All actions pass through policy hooks:
- BudgetPolicy: spending limits
- ServiceTypePolicy: allowed services
- AllowlistPolicy: approved provider counterparties only
- ServiceProviderReputationPolicy: provider quality
- DeliveryVerificationPolicy: delivery confirmation

Use procurement tools to create requests. Explain policy results clearly. For GPU compute, note human approval may be required.
Never exceed user-specified budgets. Recommend high-reputation providers when asked.`;

export class LangChainProcurementService {
  constructor({
    hederaClient,
    config,
    policyEngine,
    auditHook,
    priceOracleHook,
    notificationHook,
    procurementAgent,
    procurementStore,
    reputationService,
    saucerSwapService,
  }) {
    this.hederaClient = hederaClient;
    this.config = config;
    this.policyEngine = policyEngine;
    this.auditHook = auditHook;
    this.priceOracleHook = priceOracleHook;
    this.notificationHook = notificationHook;
    this.procurementAgent = procurementAgent;
    this.procurementStore = procurementStore;
    this.reputationService = reputationService;
    this.saucerSwapService = saucerSwapService;
    this.agent = null;
    this.toolkit = null;
    this.enabled = Boolean(config.openaiApiKey);
  }

  getHooks() {
    const hooks = [
      this.policyEngine.budgetPolicy,
      this.policyEngine.serviceTypePolicy,
      this.policyEngine.allowlistPolicy,
      this.policyEngine.reputationPolicy,
      this.policyEngine.deliveryVerificationPolicy,
      this.auditHook,
      this.priceOracleHook,
      this.notificationHook,
    ];

    if (
      !this.config.demoMode &&
      this.config.hedera.hcsAuditTopicId &&
      this.hederaClient
    ) {
      hooks.push(
        new HcsAuditTrailHook(
          ['procure_filecoin_storage', 'procure_akash_compute', 'swap_hbar_to_fil', 'swap_hbar_to_akt', 'swap_hbar_to_usdc'],
          this.config.hedera.hcsAuditTopicId,
          this.hederaClient,
        ),
      );
    }

    return hooks;
  }

  getContext() {
    return {
      mode: this.hederaClient ? AgentMode.AUTONOMOUS : AgentMode.RETURN_BYTES,
      accountId: this.config.hedera.accountId ?? '0.0.demo',
      hooks: this.getHooks(),
      policymesh: {
        policyEngine: this.policyEngine,
        procurementStore: this.procurementStore,
        auditHook: this.auditHook,
        reputationService: this.reputationService,
        saucerSwapService: this.saucerSwapService,
        priceOracleHook: this.priceOracleHook,
        procurementAgent: this.procurementAgent,
      },
    };
  }

  async initialize() {
    if (!this.enabled) {
      return { ready: false, reason: 'OPENAI_API_KEY not configured' };
    }

    const client = this.hederaClient ?? Client.forTestnet();

    this.toolkit = new HederaLangchainToolkit({
      client,
      configuration: {
        plugins: [procurementPlugin, coreAccountQueryPlugin],
        context: this.getContext(),
      },
    });

    const llm = new ChatOpenAI({
      model: this.config.openaiModel ?? 'gpt-4o-mini',
      temperature: 0,
      apiKey: this.config.openaiApiKey,
    });

    this.agent = createAgent({
      model: llm,
      tools: this.toolkit.getTools(),
      systemPrompt: SYSTEM_PROMPT,
    });

    return { ready: true, toolCount: this.toolkit.getTools().length };
  }

  async chat(message, threadId = 'default') {
    if (!this.enabled) {
      return {
        reply:
          'AI agent unavailable. Set OPENAI_API_KEY in environment. REST API procurement remains available.',
        toolCalls: [],
      };
    }

    if (!this.agent) {
      await this.initialize();
    }

    const response = await this.agent.invoke({
      messages: [{ role: 'user', content: message }],
    });

    const lastMessage = response.messages[response.messages.length - 1];
    const toolMessages = response.messages.filter((m) => m.type === 'tool' || m.name);

    return {
      reply: typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content),
      toolCalls: toolMessages.map((m) => ({
        name: m.name,
        content: m.content,
      })),
      policies: this.policyEngine.getAllPolicies(),
    };
  }

  getStatus() {
    return {
      enabled: this.enabled,
      ready: Boolean(this.agent),
      model: this.config.openaiModel ?? 'gpt-4o-mini',
      tools: procurementPlugin.tools({}).map((t) => t.method),
      hooks: this.getHooks().map((h) => h.name),
    };
  }
}
