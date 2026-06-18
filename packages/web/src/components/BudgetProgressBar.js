'use client';

import clsx from 'clsx';

export function BudgetProgressBar({ label, spent, limit }) {
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const color =
    pct > 80 ? 'bg-error' : pct > 50 ? 'bg-accent' : 'bg-success';

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500" title={`${spent} / ${limit} HBAR`}>
          {spent.toFixed(0)} / {limit} HBAR
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={clsx('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
