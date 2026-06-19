import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { createHederaClient, getAgentStatus } from './hedera/client.js';
import { spendTracker } from './services/SpendTracker.js';
import { HcsService } from './services/HcsService.js';
import { ReputationService } from './services/ReputationService.js';
import { procurementStore } from './services/ProcurementStore.js';
import { SaucerSwapService } from './services/SaucerSwapService.js';
import { FilecoinService } from './services/FilecoinService.js';
import { AkashService } from './services/AkashService.js';
import { notificationStore } from './services/NotificationStore.js';
import { createPolicyEngine } from './policies/index.js';
import { AuditHook } from './hooks/AuditHook.js';
import { PriceOracleHook } from './hooks/PriceOracleHook.js';
import { NotificationHook } from './hooks/NotificationHook.js';
import { ProcurementAgent } from './agent/ProcurementAgent.js';
import { LangChainProcurementService } from './agent/LangChainProcurementService.js';
import { createStatusRouter } from './routes/status.js';
import { createPoliciesRouter } from './routes/policies.js';
import { createAuditRouter } from './routes/audit.js';
import { createProvidersRouter } from './routes/providers.js';
import { createProcureRouter } from './routes/procure.js';
import { createNotificationsRouter } from './routes/notifications.js';
import { createAgentRouter } from './routes/agent.js';

export function createApp() {
  const app = express();
  const hederaClient = createHederaClient();

  const hcsService = new HcsService({
    client: hederaClient,
    topicId: config.hedera.hcsAuditTopicId,
    demoMode: config.demoMode,
  });

  const reputationService = new ReputationService({ hcsService });
  const saucerSwapService = new SaucerSwapService({ demoMode: config.demoMode });
  const filecoinService = new FilecoinService({ demoMode: config.demoMode, reputationService });
  const akashService = new AkashService({ demoMode: config.demoMode, reputationService });

  const policyEngine = createPolicyEngine({
    spendTracker,
    reputationService,
    filecoinService,
    akashService,
    config,
  });

  const auditHook = new AuditHook(hcsService);
  const priceOracleHook = new PriceOracleHook(saucerSwapService);
  const notificationHook = new NotificationHook(notificationStore);

  const procurementAgent = new ProcurementAgent({
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
    demoMode: config.demoMode,
  });

  const langChainService = new LangChainProcurementService({
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
  });

  app.use(cors());
  app.use(express.json());

  app.use(
    '/api',
    createStatusRouter({
      budgetPolicy: policyEngine.budgetPolicy,
      hederaClient,
      procurementAgent,
      procurementStore,
      langChainService,
    }),
  );
  app.use('/api/policies', createPoliciesRouter({ policyEngine }));
  app.use('/api/audit', createAuditRouter({ hcsService, config }));
  app.use('/api/providers', createProvidersRouter({ reputationService }));
  app.use('/api/notifications', createNotificationsRouter({ notificationStore }));
  app.use('/api/agent', createAgentRouter({ langChainService }));
  app.use(
    '/api/procure',
    createProcureRouter({
      policyEngine,
      procurementStore,
      auditHook,
      reputationService,
      procurementAgent,
      config,
    }),
  );
  app.use(
    '/api/procurements',
    createProcureRouter({
      policyEngine,
      procurementStore,
      auditHook,
      reputationService,
      procurementAgent,
      config,
    }),
  );

  app.get('/', (req, res) => {
    const uiUrl = process.env.WEB_UI_URL || 'http://localhost:3000';
    const payload = {
      name: 'PolicyMesh',
      type: 'api',
      message: 'Backend API is running. Use the web dashboard for procurement.',
      ui: uiUrl,
      docs: '/api/health',
      agentStatus: getAgentStatus(hederaClient),
      langChainAgent: langChainService.getStatus(),
      policies: Object.keys(policyEngine.getAllPolicies()),
    };

    if (req.accepts('html')) {
      return res.type('html').send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>PolicyMesh API</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#1e293b}
a{color:#1e3a8a}code{background:#f1f5f9;padding:.2em .4em;border-radius:4px}</style></head>
<body><h1>PolicyMesh API</h1>
<p>This is the <strong>backend API</strong>, not the user interface.</p>
<p><a href="${uiUrl}">Open PolicyMesh Dashboard →</a></p>
<p>Health: <code>GET /api/health</code> · Agent chat: <code>POST /api/agent/chat</code></p></body></html>`);
    }

    res.json(payload);
  });

  return {
    app,
    policyEngine,
    auditHook,
    hcsService,
    procurementStore,
    procurementAgent,
    langChainService,
    filecoinService,
    akashService,
    saucerSwapService,
  };
}
