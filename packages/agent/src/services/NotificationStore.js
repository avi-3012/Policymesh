/**
 * In-memory notification bus for UI polling / WebSocket substitute.
 */
export class NotificationStore {
  constructor(maxSize = 200) {
    this.maxSize = maxSize;
    /** @type {Array<object>} */
    this.events = [];
    /** @type {Set<(event: object) => void>} */
    this.listeners = new Set();
  }

  emit(type, payload) {
    const event = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.events.unshift(event);
    if (this.events.length > this.maxSize) {
      this.events.length = this.maxSize;
    }
    for (const listener of this.listeners) {
      listener(event);
    }
    return event;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  list({ limit = 50, type } = {}) {
    let items = [...this.events];
    if (type) items = items.filter((e) => e.type === type);
    return items.slice(0, limit);
  }
}

export const notificationStore = new NotificationStore();
