'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { api } from '@/lib/api';

export default function PoliciesPage() {
  const queryClient = useQueryClient();
  const { data: status } = useQuery({ queryKey: ['status'], queryFn: api.getStatus });
  const { data: policies, isLoading } = useQuery({ queryKey: ['policies'], queryFn: api.getPolicies });
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: api.updatePolicies,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) return <div className="p-8 text-center">Loading policies…</div>;

  const current = draft ?? policies;

  function updatePolicy(policyName, key, value) {
    setDraft({
      ...current,
      [policyName]: { ...current[policyName], [key]: Number(value) || value },
    });
  }

  function reset() {
    setDraft(null);
  }

  return (
    <div className="min-h-screen">
      <Navigation status={status} />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Policy Configuration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Adjust spending limits, allowed services, and reputation thresholds
        </p>

        <div className="mt-6 space-y-6">
          <PolicySection
            title="Budget Policy"
            description="Enforces per-procurement, daily, and monthly HBAR spending limits"
          >
            {['maxPerProcurement', 'maxDailySpend', 'maxMonthlySpend', 'minProcurementAmount'].map((key) => (
              <Field
                key={key}
                label={key.replace(/([A-Z])/g, ' $1')}
                value={current.BudgetPolicy[key]}
                onChange={(v) => updatePolicy('BudgetPolicy', key, v)}
              />
            ))}
          </PolicySection>

          <PolicySection
            title="Service Type Policy"
            description="Controls which infrastructure services the agent may procure"
          >
            <div className="mb-3">
              <p className="text-sm text-slate-500 mb-2">Allowed services</p>
              <div className="flex flex-wrap gap-2">
                {current.ServiceTypePolicy.allowedServices?.map((s) => (
                  <span key={s} className="badge bg-primary/10 text-primary">{s}</span>
                ))}
              </div>
            </div>
            <Field
              label="Max cost — filecoin-storage (HBAR)"
              value={current.ServiceTypePolicy.maxServiceCost?.['filecoin-storage']}
              onChange={(v) =>
                setDraft({
                  ...current,
                  ServiceTypePolicy: {
                    ...current.ServiceTypePolicy,
                    maxServiceCost: {
                      ...current.ServiceTypePolicy.maxServiceCost,
                      'filecoin-storage': Number(v),
                    },
                  },
                })
              }
            />
            <Field
              label="Max cost — akash-compute (HBAR)"
              value={current.ServiceTypePolicy.maxServiceCost?.['akash-compute']}
              onChange={(v) =>
                setDraft({
                  ...current,
                  ServiceTypePolicy: {
                    ...current.ServiceTypePolicy,
                    maxServiceCost: {
                      ...current.ServiceTypePolicy.maxServiceCost,
                      'akash-compute': Number(v),
                    },
                  },
                })
              }
            />
          </PolicySection>

          <PolicySection
            title="Provider Reputation Policy"
            description="Minimum quality standards for Filecoin and Akash providers"
          >
            <Field
              label="Min reputation score (0–1)"
              value={current.ServiceProviderReputationPolicy.minReputationScore}
              onChange={(v) => updatePolicy('ServiceProviderReputationPolicy', 'minReputationScore', v)}
              step={0.05}
            />
            <Field
              label="Min completed deals"
              value={current.ServiceProviderReputationPolicy.minCompletedDeals}
              onChange={(v) => updatePolicy('ServiceProviderReputationPolicy', 'minCompletedDeals', v)}
            />
            <Field
              label="Max slashing events"
              value={current.ServiceProviderReputationPolicy.maxProviderStrikes}
              onChange={(v) => updatePolicy('ServiceProviderReputationPolicy', 'maxProviderStrikes', v)}
            />
          </PolicySection>

          <PolicySection
            title="Delivery Verification Policy"
            description="On-chain verification before finalizing procurement"
          >
            <Field
              label="Verification timeout (minutes)"
              value={current.DeliveryVerificationPolicy.verificationTimeout}
              onChange={(v) => updatePolicy('DeliveryVerificationPolicy', 'verificationTimeout', v)}
            />
            <Field
              label="Max retries"
              value={current.DeliveryVerificationPolicy.maxRetries}
              onChange={(v) => updatePolicy('DeliveryVerificationPolicy', 'maxRetries', v)}
            />
          </PolicySection>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => mutation.mutate(draft ?? {})}
            className="btn-primary"
            disabled={!draft || mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" onClick={reset} className="btn-secondary" disabled={!draft}>
            Reset
          </button>
          {saved && <span className="self-center text-sm text-success">Saved!</span>}
        </div>
      </main>
    </div>
  );
}

function PolicySection({ title, description, children }) {
  return (
    <div className="card">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, step = 1 }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium capitalize">{label}</label>
      <input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="input max-w-xs"
      />
    </div>
  );
}
