import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { createHederaClient, getAgentStatus } from './hedera/client.js';
import { spendTracker } from './services/SpendTracker.js';
import { HcsService } from './services/HcsService.js';
import { ReputationService } from './services/ReputationService.js';
import { procurementStore } from './services/ProcurementStore.js';
import { createPolicyEngine } from './policies/index.js';
import { AuditHook } from './hooks/AuditHook.js';
import { createStatusRouter } from './routes/status.js';
import { createPoliciesRouter } from './routes/policies.js';
import { createAuditRouter } from './routes/audit.js';
import { createProvidersRouter } from './routes/providers.js';
import { createProcureRouter } from './routes/procure.js';

const app = express();
const hederaClient = createHederaClient();

const hcsService = new HcsService({
  client: hederaClient,
  topicId: config.hedera.hcsAuditTopicId,
  demoMode: config.demoMode,
});

const reputationService = new ReputationService({ hcsService });
const policyEngine = createPolicyEngine({
  spendTracker,
  reputationService,
  config,
});
const auditHook = new AuditHook(hcsService);

app.use(cors());
app.use(express.json());

app.use('/api', createStatusRouter({ budgetPolicy: policyEngine.budgetPolicy, hederaClient }));
app.use('/api/policies', createPoliciesRouter({ policyEngine }));
app.use('/api/audit', createAuditRouter({ hcsService }));
app.use('/api/providers', createProvidersRouter({ reputationService }));
app.use('/api/procure', createProcureRouter({
  policyEngine,
  procurementStore,
  auditHook,
  reputationService,
}));
app.use('/api/procurements', createProcureRouter({
  policyEngine,
  procurementStore,
  auditHook,
  reputationService,
}));

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

export { app, policyEngine, auditHook, hcsService, procurementStore };
