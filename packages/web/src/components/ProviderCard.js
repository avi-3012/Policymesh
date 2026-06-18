'use client';

import { Star } from 'lucide-react';
import clsx from 'clsx';

export function ProviderCard({ provider }) {
  const stars = Math.round(provider.reputationScore * 5);
  const failureRate =
    provider.completedDeals + provider.failedDeals > 0
      ? ((provider.failedDeals / (provider.completedDeals + provider.failedDeals)) * 100).toFixed(1)
      : '0';

  return (
    <div className="card hover:border-secondary/50 transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono font-medium text-primary">{provider.id}</p>
          <p className="text-xs text-slate-500">{provider.serviceType}</p>
        </div>
        <div className="flex items-center gap-0.5 text-accent">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={clsx('h-3.5 w-3.5', i < stars ? 'fill-accent' : 'text-slate-200')}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-slate-500">Score</p>
          <p className="font-semibold">{(provider.reputationScore * 100).toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-slate-500">Deals</p>
          <p className="font-semibold">{provider.completedDeals}</p>
        </div>
        <div>
          <p className="text-slate-500">Uptime</p>
          <p className="font-semibold">{provider.uptimePercent}%</p>
        </div>
        <div>
          <p className="text-slate-500">Fail rate</p>
          <p className="font-semibold">{failureRate}%</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span
          className={clsx(
            'badge',
            provider.available ? 'bg-success/15 text-emerald-700' : 'bg-slate-100 text-slate-500',
          )}
        >
          {provider.available ? 'Available' : 'Unavailable'}
        </span>
        <span className="text-xs text-slate-400">{provider.verificationLevel}</span>
      </div>
    </div>
  );
}
