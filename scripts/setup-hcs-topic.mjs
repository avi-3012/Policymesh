/**
 * Creates an HCS audit topic on Hedera testnet.
 * Usage: node scripts/setup-hcs-topic.mjs
 * Requires HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in packages/agent/.env
 */
import dotenv from 'dotenv';
import { Client, PrivateKey, TopicCreateTransaction } from '@hashgraph/sdk';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../packages/agent/.env');

dotenv.config({ path: envPath });

const accountId = process.env.HEDERA_ACCOUNT_ID;
const privateKey = process.env.HEDERA_PRIVATE_KEY;
const network = process.env.HEDERA_NETWORK || 'testnet';

if (!accountId || !privateKey) {
  console.error('Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY in packages/agent/.env');
  process.exit(1);
}

const client =
  network === 'mainnet'
    ? Client.forMainnet()
    : network === 'previewnet'
      ? Client.forPreviewnet()
      : Client.forTestnet();

function setOperator(client, accountId, privateKey) {
  if (privateKey.startsWith('0x')) {
    client.setOperator(accountId, PrivateKey.fromStringECDSA(privateKey));
    return;
  }
  try {
    client.setOperator(accountId, PrivateKey.fromStringDer(privateKey));
  } catch {
    client.setOperator(accountId, PrivateKey.fromStringECDSA(privateKey));
  }
}

setOperator(client, accountId, privateKey);

const tx = await new TopicCreateTransaction()
  .setTopicMemo('PolicyMesh audit trail')
  .execute(client);

const receipt = await tx.getReceipt(client);
const topicId = receipt.topicId.toString();

console.log('HCS audit topic created:', topicId);
console.log('HashScan:', `https://hashscan.io/${network}/topic/${topicId}`);

if (existsSync(envPath)) {
  let content = readFileSync(envPath, 'utf8');
  if (content.includes('HCS_AUDIT_TOPIC_ID=')) {
    content = content.replace(/HCS_AUDIT_TOPIC_ID=.*/g, `HCS_AUDIT_TOPIC_ID=${topicId}`);
  } else {
    content += `\nHCS_AUDIT_TOPIC_ID=${topicId}\n`;
  }
  writeFileSync(envPath, content);
  console.log('Updated packages/agent/.env with HCS_AUDIT_TOPIC_ID');
}
