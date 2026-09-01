import React, { useState } from 'react';
import { useSession } from '../context/SessionContext.jsx';

const COUNTRIES = [
  'Bangladesh', 'India', 'Pakistan', 'Nepal', 'Sri Lanka', 'UAE', 'Saudi Arabia',
  'United States', 'United Kingdom', 'Germany', 'Australia', 'Nigeria', 'Kenya',
  'Egypt', 'Philippines', 'Indonesia',
];

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block font-mono text-[10px] text-steel tracking-wide mb-1">{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

export default function SiteAnalysisForm({ onDone }) {
  const { submitSite } = useSession();
  const [form, setForm] = useState({
    country: 'Bangladesh',
    city: 'Khulna',
    address: '',
    roof_type: 'sloped_tin',
    roof_area_m2: 200,
    shading: 'none',
    building_type: 'house',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await submitSite({ ...form, roof_area_m2: Number(form.roof_area_m2) || null, address: form.address || null });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-panel border border-slate-200 dark:border-panelBorder rounded-xl p-6 max-w-xl">
      <h2 className="font-semibold text-lg mb-4">Site &amp; Location</h2>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Country">
          <select className="input" value={form.country} onChange={(e) => update('country', e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="City / Region">
          <input className="input" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. Khulna" />
        </Field>
      </div>

      <Field label="Address (optional)">
        <input className="input" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Street address or coordinates" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Building type">
          <select className="input" value={form.building_type} onChange={(e) => update('building_type', e.target.value)}>
            <option value="house">House</option>
            <option value="shop">Shop</option>
            <option value="small_commercial">Small commercial</option>
          </select>
        </Field>
        <Field label="Roof type">
          <select className="input" value={form.roof_type} onChange={(e) => update('roof_type', e.target.value)}>
            <option value="sloped_tin">Sloped — tin</option>
            <option value="sloped_tile">Sloped — tile</option>
            <option value="flat_concrete">Flat concrete</option>
            <option value="ground_mount">Ground mount</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Roof area (m²)">
          <input type="number" className="input" value={form.roof_area_m2} onChange={(e) => update('roof_area_m2', e.target.value)} />
        </Field>
        <Field label="Shading">
          <select className="input" value={form.shading} onChange={(e) => update('shading', e.target.value)}>
            <option value="none">None</option>
            <option value="partial">Partial</option>
            <option value="significant">Significant</option>
          </select>
        </Field>
      </div>

      {error && <p className="text-copper text-sm mb-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 rounded-md bg-solar text-ink font-bold text-sm disabled:opacity-50 mt-2"
      >
        {submitting ? 'Analyzing site…' : 'Continue to Load & Appliances →'}
      </button>
    </div>
  );
}
