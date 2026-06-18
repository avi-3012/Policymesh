'use client';

export function ConfigurationForm({ serviceType, values, onChange }) {
  const set = (key, val) => onChange({ ...values, [key]: val });

  if (serviceType === 'filecoin-storage') {
    return (
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Storage size (GB)</label>
          <input
            type="range"
            min={1}
            max={1000}
            value={values.sizeGB ?? 50}
            onChange={(e) => set('sizeGB', Number(e.target.value))}
            className="w-full"
          />
          <p className="text-sm text-slate-500">{values.sizeGB ?? 50} GB</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Duration (days)</label>
          <select
            value={values.durationDays ?? 30}
            onChange={(e) => set('durationDays', Number(e.target.value))}
            className="input"
          >
            {[7, 14, 30, 60, 90, 180, 365].map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Redundancy</label>
          <select
            value={values.redundancy ?? 'standard'}
            onChange={(e) => set('redundancy', e.target.value)}
            className="input"
          >
            <option value="standard">Standard</option>
            <option value="enhanced">Enhanced</option>
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">CPU cores</label>
        <input
          type="range"
          min={1}
          max={16}
          value={values.cpuCount ?? 2}
          onChange={(e) => set('cpuCount', Number(e.target.value))}
          className="w-full"
        />
        <p className="text-sm text-slate-500">{values.cpuCount ?? 2} cores</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Memory (GB)</label>
        <input
          type="range"
          min={1}
          max={64}
          value={values.memoryGB ?? 4}
          onChange={(e) => set('memoryGB', Number(e.target.value))}
          className="w-full"
        />
        <p className="text-sm text-slate-500">{values.memoryGB ?? 4} GB</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="gpu"
          checked={values.gpuEnabled ?? false}
          onChange={(e) => set('gpuEnabled', e.target.checked)}
          className="rounded"
        />
        <label htmlFor="gpu" className="text-sm font-medium">
          Enable GPU (requires human approval)
        </label>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Duration (hours)</label>
        <input
          type="number"
          min={1}
          max={720}
          value={values.durationHours ?? 24}
          onChange={(e) => set('durationHours', Number(e.target.value))}
          className="input"
        />
      </div>
    </div>
  );
}
