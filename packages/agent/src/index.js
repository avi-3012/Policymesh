import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { createHederaClient, getAgentStatus } from './hedera/client.js';
import { spendTracker } from './services/SpendTracker.js';
import { BudgetPolicy } from './policies/BudgetPolicy.js';
import { createStatusRouter } from './routes/status.js';

const app = express();
const hederaClient = createHederaClient();

const budgetPolicy = new BudgetPolicy(config.budget, spendTracker);

app.use(cors());
app.use(express.json());

app.use('/api', createStatusRouter({ budgetPolicy, hederaClient }));

app.get('/', (_req, res) => {
  res.json({
    name: 'PolicyMesh',
    description:
      'Autonomous Hedera procurement agent for decentralized infrastructure',
    docs: '/api/health',
    agentStatus: getAgentStatus(hederaClient),
  });
});

app.listen(config.port, () => {
  console.log(`PolicyMesh agent listening on port ${config.port}`);
  console.log(
    `Mode: ${config.demoMode ? 'DEMO (no Hedera credentials)' : 'HEDERA ' + config.hedera.network}`,
  );
});

export { app, budgetPolicy, spendTracker };
