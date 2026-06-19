'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import clsx from 'clsx';

const icons = {
  'policy.approved': CheckCircle,
  'policy.violation': XCircle,
  'procurement.completed': CheckCircle,
  'procurement.confirmed': Activity,
  'procurement.intent': Activity,
  'procurement.failed': XCircle,
  'procurement.swap': Activity,
};

const iconColors = {
  'policy.approved': 'text-success',
  'policy.violation': 'text-error',
  'procurement.completed': 'text-success',
  'procurement.failed': 'text-error',
};

export function AuditEntry({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = icons[entry.eventType] || AlertTriangle;
  const color = iconColors[entry.eventType] || 'text-slate-400';

  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 text-left"
      >
        <Icon className={clsx('mt-0.5 h-4 w-4 shrink-0', color)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-800">{entry.eventType}</span>
            <span className="shrink-0 text-xs text-slate-400">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
          </div>
          {entry.policyName && (
            <p className="mt-0.5 text-sm text-slate-500">
              {entry.policyName}: {entry.passed ? 'approved' : entry.reason}
            </p>
          )}
          {entry.procurementId && (
            <p className="font-mono text-xs text-slate-400">{entry.procurementId.slice(0, 12)}…</p>
          )}
          {entry.hashscan?.topic && (
            <a
              href={entry.hashscan.topic}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View on HashScan →
            </a>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {expanded && (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
          {JSON.stringify(entry, null, 2)}
        </pre>
      )}
    </div>
  );
}
