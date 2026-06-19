import { Router } from 'express';
import { hashscanTopicUrl, hashscanTransactionUrl } from '../lib/hashscan.js';

export function createAuditRouter({ hcsService, config }) {
  const router = Router();
  const network = config?.hedera?.network ?? 'testnet';
  const topicId = config?.hedera?.hcsAuditTopicId;

  router.get('/', (req, res) => {
    const { limit, offset, eventType, startDate, endDate } = req.query;
    const result = hcsService.query({
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      eventType,
      startDate,
      endDate,
    });

    const items = result.items.map((entry) => ({
      ...entry,
      hashscan: {
        topic: topicId ? hashscanTopicUrl(topicId, network) : null,
        transaction: entry.swap?.transactionHash
          ? hashscanTransactionUrl(entry.swap.transactionHash, network)
          : null,
      },
    }));

    res.json({
      ...result,
      items,
      hcsTopicId: topicId ?? null,
      hashscanTopicUrl: topicId ? hashscanTopicUrl(topicId, network) : null,
    });
  });

  return router;
}
