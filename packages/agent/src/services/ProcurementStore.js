/**
 * In-memory procurement store. Phase 3 adds full lifecycle execution.
 */
export class ProcurementStore {
  constructor() {
    /** @type {Map<string, object>} */
    this.procurements = new Map();
  }

  create(data) {
    const record = {
      id: data.id,
      status: 'pending_policy_check',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    this.procurements.set(record.id, record);
    return record;
  }

  get(id) {
    return this.procurements.get(id) ?? null;
  }

  update(id, updates) {
    const existing = this.procurements.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.procurements.set(id, updated);
    return updated;
  }

  list({ status, serviceType, user, limit = 50, offset = 0 } = {}) {
    let items = [...this.procurements.values()];
    if (status) items = items.filter((p) => p.status === status);
    if (serviceType) items = items.filter((p) => p.serviceType === serviceType);
    if (user) items = items.filter((p) => p.userAccount === user);
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = items.length;
    return { items: items.slice(offset, offset + limit), total };
  }
}

export const procurementStore = new ProcurementStore();
