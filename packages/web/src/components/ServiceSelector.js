'use client';

import { HardDrive, Cpu } from 'lucide-react';
import clsx from 'clsx';

const services = [
  {
    id: 'filecoin-storage',
    label: 'Filecoin Storage',
    icon: HardDrive,
    description: 'Decentralized archival storage with content addressing',
    useCases: ['Backups', 'Archival', 'CID-based retrieval'],
    risk: 'low',
  },
  {
    id: 'akash-compute',
    label: 'Akash Compute',
    icon: Cpu,
    description: 'Open-source cloud compute on decentralized providers',
    useCases: ['APIs', 'Web hosting', 'Batch jobs'],
    risk: 'medium',
  },
];

export function ServiceSelector({ selected, onSelect }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {services.map((s) => {
        const Icon = s.icon;
        const active = selected === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={clsx(
              'card text-left transition',
              active ? 'border-secondary ring-2 ring-secondary/30' : 'hover:border-slate-300',
            )}
          >
            <div className="flex items-center gap-3">
              <div className={clsx('rounded-lg p-2', active ? 'bg-secondary/15 text-secondary' : 'bg-slate-100')}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">{s.label}</p>
                <span className="badge bg-slate-100 text-slate-600">{s.risk} risk</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-500">{s.description}</p>
            <p className="mt-1 text-xs text-slate-400">{s.useCases.join(' · ')}</p>
          </button>
        );
      })}
    </div>
  );
}
