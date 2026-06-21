/**
 * Verifies PolicyMesh setup: env, API health, policies, sample procurement.
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../packages/agent/.env') });

const API = process.env.API_URL || 'http://localhost:3001';

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    return false;
  }
}

const results = [];

results.push(
  await check('Environment file exists', async () => {
    const { existsSync } = await import('node:fs');
    if (!existsSync(resolve(__dirname, '../packages/agent/.env'))) {
      throw new Error('packages/agent/.env not found — run npm run setup');
    }
  }),
);

results.push(
  await check('API health', async () => {
    const res = await fetch(`${API}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('unhealthy');
  }),
);

results.push(
  await check('All five policies loaded', async () => {
    const res = await fetch(`${API}/api/policies`);
    const data = await res.json();
    const required = [
      'BudgetPolicy',
      'ServiceTypePolicy',
      'AllowlistPolicy',
      'ServiceProviderReputationPolicy',
      'DeliveryVerificationPolicy',
    ];
    for (const p of required) {
      if (!data[p]) throw new Error(`missing ${p}`);
    }
  }),
);

results.push(
  await check('USDC swap quote', async () => {
    const res = await fetch(`${API}/api/swap/quote?from=HBAR&to=USDC&amount=10`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.to !== 'USDC' || !data.tokenId) throw new Error('invalid USDC quote');
  }),
);

results.push(
  await check('Procurement flow', async () => {
    const res = await fetch(`${API}/api/procure/storage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sizeGB: 10,
        durationDays: 7,
        maxCostHBAR: 50,
        userAccount: process.env.HEDERA_ACCOUNT_ID || '0.0.demo',
      }),
    });
    const data = await res.json();
    if (!data.procurementId) throw new Error('no procurementId');
  }),
);

results.push(
  await check('Agent status', async () => {
    const res = await fetch(`${API}/api/agent/status`);
    const data = await res.json();
    if (!data.tools?.length) throw new Error('no tools');
    if (process.env.OPENAI_API_KEY && !data.enabled) {
      throw new Error('OPENAI_API_KEY set but agent not enabled');
    }
  }),
);

results.push(
  await check('Service integrations status', async () => {
    const res = await fetch(`${API}/api/status`);
    const data = await res.json();
    if (!data.integrations?.filecoin || !data.integrations?.akash) {
      throw new Error('missing integration metadata');
    }
  }),
);

const demoMode = process.env.DEMO_MODE === 'true' || !process.env.HEDERA_ACCOUNT_ID;
const liveServices = process.env.SERVICES_LIVE_MODE !== 'false' && !demoMode;
console.log('\nMode:', demoMode ? 'DEMO' : `HEDERA ${process.env.HEDERA_NETWORK || 'testnet'}`);
console.log('Live APIs:', liveServices ? 'enabled' : 'simulated');
console.log('OpenAI:', process.env.OPENAI_API_KEY ? 'configured' : 'not set');
console.log('USDC token:', process.env.USDC_TOKEN_ID || '0.0.429274 (default)');
console.log('Confirmation threshold:', process.env.CONFIRMATION_THRESHOLD || '100', 'HBAR');
console.log('Allowlist:', process.env.ALLOWLIST_ENABLED !== 'false' ? 'enabled' : 'disabled');

const passed = results.filter(Boolean).length;
const total = results.length;
console.log(`\n${passed}/${total} checks passed`);

if (passed < total) process.exit(1);
