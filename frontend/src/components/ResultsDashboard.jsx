import React from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download } from 'lucide-react';
import { useSession } from '../context/SessionContext.jsx';
import { reportUrl } from '../api.js';

function SuitabilityGauge({ score }) {
  const cx = 100, cy = 95, r = 75;
  const pt = (deg) => {
    const t = (deg * Math.PI) / 180;
    return { x: cx + r * Math.sin(t), y: cy - r * Math.cos(t) };
  };
  const left = pt(-90);
  const scoreAngle = -90 + (Math.max(0, Math.min(100, score)) / 100) * 180;
  const scoreEnd = pt(scoreAngle);
  const right = pt(90);
  const arcColor = score >= 80 ? '#E8A93A' : score >= 60 ? '#3E7C8C' : score >= 40 ? '#B5623F' : '#A15B5B';

  return (
    <svg viewBox="0 0 200 118" className="w-full max-w-[220px] mx-auto block">
      <path d={`M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${right.x} ${right.y}`} fill="none" className="stroke-slate-200 dark:stroke-panelBorder" strokeWidth="16" strokeLinecap="round" />
      <path d={`M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${scoreEnd.x} ${scoreEnd.y}`} fill="none" stroke={arcColor} strokeWidth="16" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={scoreEnd.x} y2={scoreEnd.y} strokeWidth="2" className="stroke-ink dark:stroke-slate-100" />
      <circle cx={cx} cy={cy} r="4" className="fill-ink dark:fill-slate-100" />
      <text x={cx} y={cy - 16} textAnchor="middle" fontSize="30" fontWeight="700" className="fill-ink dark:fill-slate-100 font-display">{score}</text>
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize="9" letterSpacing="1" className="fill-steel font-mono">OUT OF 100</text>
    </svg>
  );
}

export default function ResultsDashboard({ onBack }) {
  const { results, sessionId } = useSession();
  if (!results) return null;
  const { site_analysis, energy, design, cost, roadmap } = results;
  const suitability = design.suitability;
  const tilt = site_analysis.tilt_orientation;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-steel mb-4">
        <ArrowLeft size={13} /> Back to Load
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Suitability */}
        <div className="bg-white dark:bg-panel border border-slate-200 dark:border-panelBorder rounded-xl p-5 flex flex-col items-center text-center">
          <div className="font-mono text-[10px] text-steel tracking-widest mb-1.5">SUITABILITY</div>
          <SuitabilityGauge score={suitability.score} />
          <div className="font-bold text-lg mt-1">{suitability.tier}</div>
          <div className="w-full mt-4 space-y-1.5 text-left">
            {suitability.factors.map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-xs">
                {f.ok ? <CheckCircle2 size={13} className="text-sky flex-shrink-0" /> : <AlertTriangle size={13} className="text-copper flex-shrink-0" />}
                <span className="text-steel">{f.label}:</span>
                <span className="font-mono">{f.detail}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 size={13} className="text-sky flex-shrink-0" />
              <span className="text-steel">Tilt / orientation:</span>
              <span className="font-mono">~{tilt.tilt_degrees}°, {tilt.orientation}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-5">
          {/* System design */}
          <div className="bg-white dark:bg-panel border border-slate-200 dark:border-panelBorder rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3">
              System Design — <span className="text-solar">{energy.system_mode.replace('_', '-')}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <div className="text-steel">Panels</div>
                <div className="font-mono">{design.panel.count} × {design.panel.wattage}W {design.panel.type}</div>
                <div className="text-steel text-xs">{design.panel.examples.join(' / ')}</div>
              </div>
              <div>
                <div className="text-steel">Array size</div>
                <div className="font-mono">{design.panel.actual_array_kw} kW · ≈{design.panel.required_area_m2} m²</div>
              </div>
              <div>
                <div className="text-steel">Inverter</div>
                <div className="font-mono">{design.inverter.type}</div>
                <div className="text-steel text-xs">{design.inverter.size_kw} kW · {design.inverter.examples.join(' / ')}</div>
              </div>
              <div>
                <div className="text-steel">Battery</div>
                {design.battery ? (
                  <>
                    <div className="font-mono">{design.battery.nominal_capacity_kwh} kWh {design.battery.chemistry}</div>
                    <div className="text-steel text-xs">{design.battery.recommended_voltage} · {design.battery.examples.join(' / ')}</div>
                  </>
                ) : (
                  <div className="font-mono">None (grid-tied)</div>
                )}
              </div>
              <div className="sm:col-span-2">
                <div className="text-steel">Mounting</div>
                <div className="font-mono">{design.mounting}</div>
              </div>
            </div>
          </div>

          {/* Cost */}
          <div className="bg-white dark:bg-panel border border-slate-200 dark:border-panelBorder rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3">
              Cost &amp; Payback <span className="text-steel font-normal text-xs">(USD-equivalent, approximate)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-steel">Installed range</div>
                <div className="font-mono text-solar text-base">${cost.installed_cost_low.toLocaleString()}–{cost.installed_cost_high.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-steel">Annual generation</div>
                <div className="font-mono">{cost.annual_generation_kwh.toLocaleString()} kWh</div>
              </div>
              <div>
                <div className="text-steel">Annual savings</div>
                <div className="font-mono">${cost.annual_savings_usd.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-steel">Payback</div>
                <div className="font-mono">{cost.payback_years ? `${cost.payback_years} yrs` : 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Roadmap */}
          <div className="bg-white dark:bg-panel border border-slate-200 dark:border-panelBorder rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3">Installation Roadmap</h3>
            <div className="space-y-3">
              {roadmap.phases.map((p, i) => (
                <div key={p.phase} className="flex gap-3">
                  <div className="font-mono text-xs text-copper flex-shrink-0 w-5">0{i + 1}</div>
                  <div>
                    <div className="font-semibold text-sm">{p.phase}</div>
                    <div className="text-xs text-steel">{p.items.join(' · ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <a
            href={reportUrl(sessionId)}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 rounded-md border border-slate-200 dark:border-panelBorder font-semibold text-sm flex items-center justify-center gap-2 hover:border-solar transition-colors"
          >
            <Download size={15} /> Download Full Report (PDF)
          </a>
        </div>
      </div>
    </div>
  );
}
