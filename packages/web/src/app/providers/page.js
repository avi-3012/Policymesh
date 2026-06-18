'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { ProviderCard } from '@/components/ProviderCard';
import { api } from '@/lib/api';

export default function ProvidersPage() {
  const [serviceType, setServiceType] = useState('');
  const [sortBy, setSortBy] = useState('reputation');
  const [minReputation, setMinReputation] = useState(0);

  const { data: status } = useQuery({ queryKey: ['status'], queryFn: api.getStatus });
  const { data, isLoading } = useQuery({
    queryKey: ['providers', serviceType, sortBy, minReputation],
    queryFn: () =>
      api.getProviders({
        serviceType: serviceType || undefined,
        sortBy,
        minReputation: minReputation || undefined,
        availableOnly: 'true',
      }),
  });

  return (
    <div className="min-h-screen">
      <Navigation status={status} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Provider Directory</h1>
        <p className="mt-1 text-sm text-slate-500">
          Reputation scores from on-chain history and HCS registry
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="input max-w-xs">
            <option value="">All services</option>
            <option value="filecoin-storage">Filecoin Storage</option>
            <option value="akash-compute">Akash Compute</option>
            <option value="akash-gpu">Akash GPU</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input max-w-xs">
            <option value="reputation">Sort by reputation</option>
            <option value="price">Sort by price</option>
          </select>
          <select
            value={minReputation}
            onChange={(e) => setMinReputation(Number(e.target.value))}
            className="input max-w-xs"
          >
            <option value={0}>Any reputation</option>
            <option value={0.75}>≥ 75%</option>
            <option value={0.85}>≥ 85%</option>
          </select>
        </div>

        {isLoading ? (
          <p className="mt-8 text-center text-slate-400">Loading providers…</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.providers?.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
