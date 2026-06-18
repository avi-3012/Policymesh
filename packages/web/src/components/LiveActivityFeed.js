'use client';

import { AuditEntry } from './AuditEntry';

export function LiveActivityFeed({ events = [] }) {
  if (!events.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">No recent activity</p>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      {events.slice(0, 10).map((entry) => (
        <AuditEntry key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
