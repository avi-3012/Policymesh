'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { AuditEntry } from '@/components/AuditEntry';
import { api } from '@/lib/api';

const EVENT_TYPES = [
  '',
  'policy.approved',
  'policy.violation',
  'procurement.completed',
  'procurement.confirmed',
  'procurement.intent',
  'procurement.failed',
  'procurement.swap',
];

export default function AuditPage() {
  const [eventType, setEventType] = useState('');
  const { data: status } = useQuery({ queryKey: ['status'], queryFn: api.getStatus });
  const { data: audit, isLoading } = useQuery({
    queryKey: ['audit', eventType],
    queryFn: () => api.getAudit({ limit: 50, eventType: eventType || undefined }),
  });

  function exportCsv() {
    const items = audit?.items ?? [];
    const headers = ['timestamp', 'eventType', 'procurementId', 'policyName', 'passed', 'reason'];
    const rows = items.map((e) =>
      headers.map((h) => JSON.stringify(e[h] ?? '')).join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'policymesh-audit.csv';
    a.click();
  }

  return (
    <div className="min-h-screen">
      <Navigation status={status} />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Audit Explorer</h1>
            <p className="mt-1 text-sm text-slate-500">Immutable HCS audit trail (cached in demo mode)</p>
          </div>
          <button type="button" onClick={exportCsv} className="btn-secondary">
            Export CSV
          </button>
        </div>

        <div className="mt-4 flex gap-3">
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="input max-w-xs"
          >
            <option value="">All events</option>
            {EVENT_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <span className="self-center text-sm text-slate-500">
            {audit?.total ?? 0} entries
          </span>
        </div>

        <div className="card mt-4">
          {isLoading ? (
            <p className="py-8 text-center text-slate-400">Loading audit log…</p>
          ) : !audit?.items?.length ? (
            <p className="py-8 text-center text-slate-400">No audit events yet</p>
          ) : (
            audit.items.map((entry) => <AuditEntry key={entry.id} entry={entry} />)
          )}
        </div>
      </main>
    </div>
  );
}
