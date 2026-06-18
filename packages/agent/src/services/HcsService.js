/**
 * HCS audit logging with in-memory cache for real-time queries.
 * Writes to Hedera when configured; always caches locally.
 */
export class HcsService {
  constructor({ client, topicId, demoMode = true }) {
    this.client = client;
    this.topicId = topicId;
    this.demoMode = demoMode || !client || !topicId;
    /** @type {Array<object>} */
    this.cache = [];
    this.maxCacheSize = 1000;
  }

  async submitMessage(payload) {
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    this.cache.unshift(entry);
    if (this.cache.length > this.maxCacheSize) {
      this.cache.length = this.maxCacheSize;
    }

    if (!this.demoMode && this.client && this.topicId) {
      try {
        const { TopicMessageSubmitTransaction } = await import('@hashgraph/sdk');
        const tx = await new TopicMessageSubmitTransaction()
          .setTopicId(this.topicId)
          .setMessage(JSON.stringify(entry))
          .execute(this.client);
        entry.sequenceNumber = tx.topicSequenceNumber?.toString();
        entry.consensusTimestamp = tx.consensusTimestamp?.toString();
      } catch (err) {
        entry.hcsError = err.message;
        console.error('[HcsService] Failed to submit to HCS:', err.message);
      }
    } else {
      entry.demoMode = true;
    }

    return entry;
  }

  query({ limit = 50, offset = 0, eventType, startDate, endDate } = {}) {
    let items = [...this.cache];
    if (eventType) items = items.filter((e) => e.eventType === eventType);
    if (startDate) {
      const start = new Date(startDate);
      items = items.filter((e) => new Date(e.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      items = items.filter((e) => new Date(e.timestamp) <= end);
    }
    const total = items.length;
    return { items: items.slice(offset, offset + limit), total };
  }
}
