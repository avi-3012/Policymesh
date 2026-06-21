'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { BudgetProgressBar } from '@/components/BudgetProgressBar';
import { ProcurementCard } from '@/components/ProcurementCard';
import { LiveActivityFeed } from '@/components/LiveActivityFeed';
import { PolicyStatusIndicator } from '@/components/PolicyStatusIndicator';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { api } from '@/lib/api';
import { useState } from 'react';
import { AlertOctagon, Wallet, Shield } from 'lucide-react';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { data: status } = useQuery({ queryKey: ['status'], queryFn: api.getStatus });
  const { data: budget } = useQuery({ queryKey: ['budget'], queryFn: api.getBudget });
  const { data: policies } = useQuery({ queryKey: ['policies'], queryFn: api.getPolicies });
  const { data: procurements } = useQuery({
    queryKey: ['procurements'],
    queryFn: () => api.getProcurements({ limit: 10 }),
  });
  const { data: audit } = useQuery({
    queryKey: ['audit'],
    queryFn: () => api.getAudit({ limit: 10 }),
  });

  const emergencyMutation = useMutation({
    mutationFn: (stopped) => api.setEmergencyStop(stopped),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['status'] }),
  });

  async function handleConfirm(procurement) {
    setConfirmTarget(procurement);
  }

  async function executeConfirm() {
    setConfirmLoading(true);
    try {
      const cost = confirmTarget.estimatedCostHBAR ?? confirmTarget.maxCostHBAR;
      await api.approveProcurement(confirmTarget.id, {
        approverSignature: cost > 300 ? 'admin-confirmed' : undefined,
        approvedBy: 'human',
      });
      queryClient.invalidateQueries({ queryKey: ['procurements'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      setConfirmTarget(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleReject(procurement) {
    if (!confirm('Reject this procurement request?')) return;
    try {
      await api.rejectProcurement(procurement.id, { rejectedBy: 'human' });
      queryClient.invalidateQueries({ queryKey: ['procurements'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen">
      <Navigation status={status} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Agent status, budget, and recent activity</p>
          </div>
          <button
            type="button"
            onClick={() => emergencyMutation.mutate(!status?.emergencyStop)}
            className={status?.emergencyStop ? 'btn-primary' : 'btn-danger flex items-center gap-2'}
          >
            <AlertOctagon className="h-4 w-4" />
            {status?.emergencyStop ? 'Resume Procurements' : 'Emergency Stop'}
          </button>
        </div>

        {status?.emergencyStop && (
          <div className="mb-4 rounded-lg bg-error/10 border border-error/20 px-4 py-3 text-sm text-rose-700">
            Emergency stop is active — all procurements are paused.
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="card flex items-center gap-3">
            <Wallet className="h-8 w-8 text-secondary" />
            <div>
              <p className="text-sm text-slate-500">Daily remaining</p>
              <p className="text-xl font-semibold">
                {(budget?.remainingBudget ?? budget?.dailyLimit ?? 0).toFixed(0)} HBAR
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-slate-500">Active policies</p>
              <p className="text-xl font-semibold">{policies ? Object.keys(policies).length : 5}</p>
            </div>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500">Network</p>
            <p className="text-xl font-semibold capitalize">
              {status?.demoMode ? 'Demo mode' : status?.network}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="mb-4 font-semibold">Active Procurements</h2>
              {!procurements?.items?.length ? (
                <p className="text-sm text-slate-400">No procurements yet. Start one from Procure.</p>
              ) : (
                <div className="space-y-3">
                  {procurements.items.map((p) => (
                    <ProcurementCard
                      key={p.id}
                      procurement={p}
                      onConfirm={handleConfirm}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h2 className="mb-4 font-semibold">Budget Overview</h2>
              <div className="space-y-4">
                <BudgetProgressBar
                  label="Daily"
                  spent={budget?.dailySpend ?? 0}
                  limit={budget?.dailyLimit ?? 2000}
                />
                <BudgetProgressBar
                  label="Monthly"
                  spent={budget?.monthlySpend ?? 0}
                  limit={budget?.monthlyLimit ?? 20000}
                />
              </div>
            </div>

            <div className="card">
              <h2 className="mb-4 font-semibold">Policy Status</h2>
              <div className="flex flex-wrap justify-center gap-4">
                {['BudgetPolicy', 'ServiceTypePolicy', 'AllowlistPolicy', 'ServiceProviderReputationPolicy', 'DeliveryVerificationPolicy'].map(
                  (name) => (
                    <div key={name} className="text-center">
                      <PolicyStatusIndicator name={name} passed={true} />
                      <p className="mt-1 text-xs text-slate-500">{name.replace('Policy', '')}</p>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="card">
              <h2 className="mb-2 font-semibold">Recent Activity</h2>
              <LiveActivityFeed events={audit?.items ?? []} />
            </div>
          </div>
        </div>
      </main>

      <ConfirmationModal
        open={!!confirmTarget}
        procurement={confirmTarget}
        onConfirm={executeConfirm}
        onCancel={() => setConfirmTarget(null)}
        loading={confirmLoading}
      />
    </div>
  );
}
