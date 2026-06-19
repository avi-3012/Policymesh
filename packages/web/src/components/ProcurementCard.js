'use client';

import clsx from 'clsx';
import { HardDrive, Cpu, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const statusColors = {
  completed: 'bg-success/15 text-emerald-700',
  awaiting_confirmation: 'bg-accent/15 text-amber-700',
  executing: 'bg-secondary/15 text-teal-700',
  policy_rejected: 'bg-error/15 text-rose-700',
  failed: 'bg-error/15 text-rose-700',
  confirmed: 'bg-primary/15 text-blue-700',
};

const stages = ['pending', 'policy', 'confirm', 'swap', 'purchase', 'verify', 'done'];

function stageIndex(status) {
  const map = {
    policy_rejected: 1,
    awaiting_confirmation: 2,
    confirmed: 3,
    executing: 4,
    completed: 6,
    failed: 5,
  };
  return map[status] ?? 0;
}

export function ProcurementCard({ procurement, onConfirm }) {
  const [expanded, setExpanded] = useState(false);
  const isStorage = procurement.serviceType === 'filecoin-storage';
  const progress = (stageIndex(procurement.status) / (stages.length - 1)) * 100;

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            {isStorage ? <HardDrive className="h-5 w-5" /> : <Cpu className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-medium text-slate-900">
              {isStorage ? 'Filecoin Storage' : 'Akash Compute'}
            </p>
            <p className="text-sm text-slate-500">
              {procurement.estimatedCostHBAR ?? procurement.maxCostHBAR} HBAR ·{' '}
              {new Date(procurement.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <span className={clsx('badge', statusColors[procurement.status] || 'bg-slate-100')}>
          {procurement.status?.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-secondary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="font-mono text-xs text-slate-400">
          {procurement.id?.slice(0, 8)}…
        </p>
        <div className="flex gap-2">
          {procurement.status === 'awaiting_confirmation' && onConfirm && (
            <button type="button" onClick={() => onConfirm(procurement)} className="btn-primary text-xs">
              Confirm
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="btn-secondary flex items-center gap-1 text-xs"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Details
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
          {procurement.policyChecks?.map((c) => (
            <div key={c.policy} className="flex items-center justify-between">
              <span>{c.policy}</span>
              <span className={c.passed ? 'text-success' : 'text-error'}>
                {c.passed ? 'Pass' : 'Block'}
              </span>
            </div>
          ))}
          {procurement.swap?.transactionHash && (
            <p className="font-mono text-xs">
              Swap: {procurement.swap.transactionHash}
            </p>
          )}
          {procurement.delivery?.pieceCid && (
            <p className="font-mono text-xs break-all">
              CID: {procurement.delivery.pieceCid}
            </p>
          )}
          {procurement.delivery?.deploymentId && (
            <p className="font-mono text-xs">
              Deployment: {procurement.delivery.deploymentId}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
