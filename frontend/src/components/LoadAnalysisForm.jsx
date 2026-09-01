import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useSession } from '../context/SessionContext.jsx';

const PRESETS = [
  { name: 'LED Bulb', power_w: 10 }, { name: 'Ceiling Fan', power_w: 75 }, { name: 'Table Fan', power_w: 55 },
  { name: 'LED TV', power_w: 100 }, { name: 'Refrigerator', power_w: 150 }, { name: '1 Ton AC', power_w: 1100 },
  { name: '1.5 Ton AC', power_w: 1650 }, { name: 'Washing Machine', power_w: 500 }, { name: 'Water Pump', power_w: 750 },
  { name: 'Desktop PC', power_w: 200 }, { name: 'Iron', power_w: 1000 }, { name: 'Shop Lighting', power_w: 40 },
];

export default function LoadAnalysisForm({ onDone, onBack }) {
  const { submitLoad } = useSession();
  const [appliances, setAppliances] = useState([
    { id: 1, name: 'LED Bulb', power_w: 10, hours_per_day: 6, quantity: 6, runs_simultaneously: true },
    { id: 2, name: 'Ceiling Fan', power_w: 75, hours_per_day: 8, quantity: 3, runs_simultaneously: true },
    { id: 3, name: 'Refrigerator', power_w: 150, hours_per_day: 8, quantity: 1, runs_simultaneously: true },
  ]);
  const [nextId, setNextId] = useState(4);
  const [systemMode, setSystemMode] = useState('hybrid');
  const [autonomyDays, setAutonomyDays] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function addPreset(p) {
    setAppliances((l) => [...l, { id: nextId, name: p.name, power_w: p.power_w, hours_per_day: 4, quantity: 1, runs_simultaneously: true }]);
    setNextId((n) => n + 1);
  }
  function update(id, field, value) {
    setAppliances((l) => l.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  }
  function remove(id) {
    setAppliances((l) => l.filter((a) => a.id !== id));
  }

  const dailyKwh = appliances.reduce((sum, a) => sum + (a.power_w * a.hours_per_day * a.quantity) / 1000, 0);

  async function handleSubmit() {
    if (appliances.length === 0) {
      setError('Add at least one appliance.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitLoad({
        appliances: appliances.map(({ id, ...rest }) => rest),
        system_mode: systemMode,
        autonomy_days: Number(autonomyDays),
      });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-panel border border-slate-200 dark:border-panelBorder rounded-xl p-6 max-w-2xl">
      <button onClick={onBack} className="text-xs text-steel mb-4">← Back to Site</button>
      <h2 className="font-semibold text-lg mb-4">Appliances &amp; Load</h2>

      <div className="space-y-2 mb-2">
        {appliances.map((a) => (
          <div key={a.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: '2fr 1fr 1fr 0.6fr auto' }}>
            <input className="input !py-1.5" value={a.name} onChange={(e) => update(a.id, 'name', e.target.value)} />
            <input type="number" title="Watts" className="input !py-1.5 font-mono text-xs" value={a.power_w} onChange={(e) => update(a.id, 'power_w', Number(e.target.value))} />
            <input type="number" title="Hours/day" className="input !py-1.5 font-mono text-xs" value={a.hours_per_day} onChange={(e) => update(a.id, 'hours_per_day', Number(e.target.value))} />
            <input type="number" title="Quantity" className="input !py-1.5 font-mono text-xs" value={a.quantity} onChange={(e) => update(a.id, 'quantity', Number(e.target.value))} />
            <button onClick={() => remove(a.id)} className="text-copper" aria-label="Remove appliance"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <div className="font-mono text-[9px] text-steel mb-3">NAME · WATTS · HOURS/DAY · QTY</div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {PRESETS.map((p) => (
          <button key={p.name} onClick={() => addPreset(p)} className="input !py-1 !px-2.5 !rounded-full text-xs flex items-center gap-1 w-auto">
            <Plus size={10} />{p.name}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="block font-mono text-[10px] text-steel tracking-wide mb-1">SYSTEM CONFIGURATION</label>
        <div className="flex gap-2">
          {['on_grid', 'hybrid', 'off_grid'].map((m) => (
            <button
              key={m}
              onClick={() => setSystemMode(m)}
              className={`flex-1 py-2 rounded-md text-xs font-semibold border transition-colors ${
                systemMode === m ? 'bg-solar text-ink border-solar' : 'border-slate-300 dark:border-panelBorder'
              }`}
            >
              {m === 'on_grid' ? 'On-Grid' : m === 'hybrid' ? 'Hybrid' : 'Off-Grid'}
            </button>
          ))}
        </div>
      </div>

      {systemMode !== 'on_grid' && (
        <div className="mb-4 max-w-[200px]">
          <label className="block font-mono text-[10px] text-steel tracking-wide mb-1">BATTERY AUTONOMY (DAYS)</label>
          <input type="number" step="0.5" min="0.5" className="input" value={autonomyDays} onChange={(e) => setAutonomyDays(e.target.value)} />
        </div>
      )}

      <div className="font-mono text-sm mb-4">
        <span className="text-solar">{dailyKwh.toFixed(2)} kWh/day</span>
      </div>

      {error && <p className="text-copper text-sm mb-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 rounded-md bg-solar text-ink font-bold text-sm disabled:opacity-50"
      >
        {submitting ? 'Designing your system…' : 'Generate My Plan →'}
      </button>
    </div>
  );
}
