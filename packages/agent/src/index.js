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
import { createStatusRouter } from './routes/status.js';
import { createPoliciesRouter } from './routes/policies.js';
import { createAuditRouter } from './routes/audit.js';
import { createProvidersRouter } from './routes/providers.js';
import { createProcureRouter } from './routes/procure.js';
import { createNotificationsRouter } from './routes/notifications.js';

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

app.use(cors());
app.use(express.json());

app.use(
  '/api',
  createStatusRouter({
    budgetPolicy: policyEngine.budgetPolicy,
    hederaClient,
    procurementAgent,
    procurementStore,
  }),
);
app.use('/api/policies', createPoliciesRouter({ policyEngine }));
app.use('/api/audit', createAuditRouter({ hcsService }));
app.use('/api/providers', createProvidersRouter({ reputationService }));
app.use('/api/notifications', createNotificationsRouter({ notificationStore }));
app.use(
  '/api/procure',
  createProcureRouter({
    policyEngine,
    procurementStore,
    auditHook,
    reputationService,
    procurementAgent,
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
  }),
);

app.get('/', (_req, res) => {
  res.json({
    name: 'PolicyMesh',
    description:
      'Autonomous Hedera procurement agent for decentralized infrastructure',
    docs: '/api/health',
    agentStatus: getAgentStatus(hederaClient),
    policies: Object.keys(policyEngine.getAllPolicies()),
  });
});

app.listen(config.port, () => {
  console.log(`PolicyMesh agent listening on port ${config.port}`);
  console.log(
    `Mode: ${config.demoMode ? 'DEMO (no Hedera credentials)' : 'HEDERA ' + config.hedera.network}`,
  );
});

export {
  app,
  policyEngine,
  auditHook,
  hcsService,
  procurementStore,
  procurementAgent,
  filecoinService,
  akashService,
  saucerSwapService,
};
