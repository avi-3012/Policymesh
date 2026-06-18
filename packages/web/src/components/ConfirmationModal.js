'use client';

import { PolicyStatusIndicator } from './PolicyStatusIndicator';

export function ConfirmationModal({ open, procurement, onConfirm, onCancel, loading }) {
  if (!open || !procurement) return null;

  const cost = procurement.estimatedCostHBAR ?? procurement.maxCostHBAR;
  const needsSignature = cost > 300;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Confirm Procurement</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review details before the agent executes swap and purchase.
        </p>

        <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Service</span>
            <span className="font-medium">{procurement.serviceType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Cost</span>
            <span className="font-medium">{cost} HBAR</span>
          </div>
          {procurement.recommendedProvider && (
            <div className="flex justify-between">
              <span className="text-slate-500">Provider</span>
              <span className="font-mono text-xs">
                {procurement.recommendedProvider.id ?? procurement.recommendedProvider.providerId}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center gap-3">
          {procurement.policyChecks?.map((c) => (
            <PolicyStatusIndicator
              key={c.policy}
              name={c.policy}
              passed={c.passed}
              reason={c.reason}
            />
          ))}
        </div>

        {needsSignature && (
          <p className="mt-3 text-xs text-accent">
            High-value procurement — admin signature will be recorded.
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1" disabled={loading}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="btn-primary flex-1" disabled={loading}>
            {loading ? 'Executing…' : 'Confirm Procurement'}
          </button>
        </div>
      </div>
    </div>
  );
}
