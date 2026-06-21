'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { ServiceSelector } from '@/components/ServiceSelector';
import { ConfigurationForm } from '@/components/ConfigurationForm';
import { PolicyStatusIndicator } from '@/components/PolicyStatusIndicator';
import { api } from '@/lib/api';
import clsx from 'clsx';

const STEPS = ['Service', 'Configure', 'Budget', 'Review', 'Submit'];

export default function ProcurePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serviceType, setServiceType] = useState('filecoin-storage');
  const [config, setConfig] = useState({
    sizeGB: 50,
    durationDays: 30,
    redundancy: 'standard',
    cpuCount: 2,
    memoryGB: 4,
    gpuEnabled: false,
    durationHours: 24,
    maxCostHBAR: 100,
    userAccount: '0.0.demo',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { data: status } = useQuery({ queryKey: ['status'], queryFn: api.getStatus });
  const { data: policies } = useQuery({ queryKey: ['policies'], queryFn: api.getPolicies });

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const body = {
        maxCostHBAR: config.maxCostHBAR,
        userAccount: config.userAccount,
        humanApprovalToken: config.gpuEnabled ? 'user-approved-gpu' : undefined,
      };

      let res;
      if (serviceType === 'filecoin-storage') {
        res = await api.createStorage({
          ...body,
          sizeGB: config.sizeGB,
          durationDays: config.durationDays,
          redundancy: config.redundancy,
        });
      } else {
        res = await api.createCompute({
          ...body,
          cpuCount: config.cpuCount,
          memoryGB: config.memoryGB,
          gpuEnabled: config.gpuEnabled,
          durationHours: config.durationHours,
        });
      }
      setResult(res);
      setStep(4);
    } catch (err) {
      setError(err.data?.policyChecks ? null : err.message);
      if (err.data?.policyChecks) {
        setResult(err.data);
        setStep(4);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navigation status={status} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-semibold">New Procurement</h1>
        <p className="mt-1 text-sm text-slate-500">Request decentralized infrastructure with policy checks</p>

        <div className="mt-6 flex gap-1">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={clsx(
                'flex-1 rounded-t-lg py-2 text-center text-xs font-medium',
                i === step ? 'bg-primary text-white' : i < step ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-400',
              )}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="card rounded-tl-none">
          {step === 0 && (
            <>
              <h2 className="mb-4 font-medium">Select service type</h2>
              <ServiceSelector
                selected={serviceType}
                onSelect={setServiceType}
              />
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="mb-4 font-medium">Configure requirements</h2>
              <ConfigurationForm
                serviceType={serviceType}
                values={config}
                onChange={setConfig}
              />
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mb-4 font-medium">Budget & limits</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Maximum cost (HBAR)</label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={config.maxCostHBAR}
                    onChange={(e) => setConfig({ ...config, maxCostHBAR: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Your Hedera account</label>
                  <input
                    type="text"
                    value={config.userAccount}
                    onChange={(e) => setConfig({ ...config, userAccount: e.target.value })}
                    className="input font-mono"
                    placeholder="0.0.12345"
                  />
                </div>
                {policies && (
                  <div className="rounded-lg bg-slate-50 p-4 text-sm">
                    <p className="font-medium text-slate-700">Policy limits preview</p>
                    <ul className="mt-2 space-y-1 text-slate-500">
                      <li>Max per procurement: {policies.BudgetPolicy?.maxPerProcurement} HBAR</li>
                      <li>Daily limit: {policies.BudgetPolicy?.maxDailySpend} HBAR</li>
                      <li>Service max: {policies.ServiceTypePolicy?.maxServiceCost?.[serviceType]} HBAR</li>
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="mb-4 font-medium">Review request</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Service</dt><dd>{serviceType}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Max cost</dt><dd>{config.maxCostHBAR} HBAR</dd></div>
                {serviceType === 'filecoin-storage' ? (
                  <>
                    <div className="flex justify-between"><dt className="text-slate-500">Size</dt><dd>{config.sizeGB} GB</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Duration</dt><dd>{config.durationDays} days</dd></div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between"><dt className="text-slate-500">CPU / RAM</dt><dd>{config.cpuCount} cores / {config.memoryGB} GB</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">GPU</dt><dd>{config.gpuEnabled ? 'Yes' : 'No'}</dd></div>
                  </>
                )}
              </dl>
            </>
          )}

          {step === 4 && result && (
            <>
              <h2 className="mb-4 font-medium">
                {result.status === 'policy_rejected' ? 'Policy Blocked' : 'Request Submitted'}
              </h2>
              <div className="flex justify-center gap-3 mb-4">
                {result.policyChecks?.map((c) => (
                  <PolicyStatusIndicator
                    key={c.policy}
                    name={c.policy}
                    passed={c.passed}
                    reason={c.reason}
                  />
                ))}
              </div>
              {result.status === 'awaiting_confirmation' ? (
                <div className="rounded-lg bg-accent/10 p-4 text-sm text-amber-900">
                  Policies passed. This purchase exceeds {result.threshold ?? 100} HBAR and requires human
                  approval from the dashboard.
                  {result.message && <p className="mt-2 text-xs">{result.message}</p>}
                  {result.recommendedProvider && (
                    <p className="mt-2 font-mono text-xs">
                      Recommended provider: {result.recommendedProvider.id}
                    </p>
                  )}
                </div>
              ) : result.status === 'completed' || result.autoExecuted ? (
                <div className="rounded-lg bg-success/10 p-4 text-sm text-emerald-800">
                  Procurement executed automatically (under confirmation threshold).
                  {result.transactionDetails?.delivery?.pieceCid && (
                    <p className="mt-2 font-mono text-xs break-all">
                      CID: {result.transactionDetails.delivery.pieceCid}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-error/10 p-4 text-sm text-rose-800">
                  {result.policyChecks?.find((c) => !c.passed)?.reason || 'Request blocked by policy'}
                </div>
              )}
            </>
          )}

          {error && <p className="mt-3 text-sm text-error">{error}</p>}

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => (step > 0 && step < 4 ? setStep(step - 1) : router.push('/'))}
              className="btn-secondary"
              disabled={loading}
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step < 3 && (
              <button type="button" onClick={() => setStep(step + 1)} className="btn-primary">
                Next
              </button>
            )}
            {step === 3 && (
              <button type="button" onClick={handleSubmit} className="btn-primary" disabled={loading}>
                {loading ? 'Checking policies…' : 'Submit Request'}
              </button>
            )}
            {step === 4 && result?.status === 'awaiting_confirmation' && (
              <button type="button" onClick={() => router.push('/')} className="btn-primary">
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
