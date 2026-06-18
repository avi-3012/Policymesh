'use client';

import clsx from 'clsx';

const colors = {
  pass: 'bg-success text-white',
  block: 'bg-error text-white',
  warning: 'bg-accent text-white',
  pending: 'bg-slate-300 text-slate-700',
};

export function PolicyStatusIndicator({ name, passed, reason, warning }) {
  const state = warning ? 'warning' : passed ? 'pass' : passed === false ? 'block' : 'pending';

  return (
    <div className="group relative">
      <div
        className={clsx(
          'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition',
          colors[state],
        )}
        title={reason || name}
      >
        {state === 'pass' ? '✓' : state === 'block' ? '✕' : state === 'warning' ? '!' : '…'}
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-lg bg-slate-900 p-2 text-xs text-white shadow-lg group-hover:block">
        <p className="font-semibold">{name}</p>
        {reason && <p className="mt-1 text-slate-300">{reason}</p>}
      </div>
    </div>
  );
}
