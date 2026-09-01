import React, { useState, useEffect, useRef } from 'react';
import {
  Sun, Moon, MessageCircle, Send, X, Upload, CheckCircle2, AlertTriangle,
  Download, Plus, Trash2, Radio, Loader2, ArrowLeft, Image as ImageIcon,
} from 'lucide-react';

/* ============================================================================
   DESIGN TOKENS
   A "site-survey / single-line-diagram" system: deep dusk navy + brass solar
   gold + circuit copper + graphite steel, IBM Plex Sans for voice, IBM Plex
   Mono for every number and spec (data reads as data, prose reads as prose).
   ============================================================================ */
const COLORS = {
  ink: '#14192B',
  paper: '#F3F5F5',
  dusk: '#10182B',
  panelDark: '#161E33',
  panelDarkBorder: '#2A3350',
  inputDark: '#0D1424',
  solar: '#E8A93A',
  copper: '#B5623F',
  steel: '#5C6478',
  sky: '#3E7C8C',
  mutedDark: '#8A93AB',
};
const FONT_DISPLAY = "'IBM Plex Sans', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";

function useGoogleFonts() {
  useEffect(() => {
    if (document.getElementById('sap-fonts')) return;
    const link = document.createElement('link');
    link.id = 'sap-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);
}

/* ============================================================================
   DATA: solar resource + tariff ESTIMATION MODEL
   This is the "mock realistic data" the spec calls for — a documented,
   transparent heuristic, not a live feed. Swap in PVGIS/Solcast/OpenWeather
   here later (see README "Adding real weather APIs" in the full project).
   ============================================================================ */
const REGIONS = {
  Bangladesh: { lat: 23.8, defaultPsh: 4.7, tempC: 27, tariffUsd: 0.075, cur: 'BDT', cities: {
    Dhaka: { psh: 4.7, lat: 23.81 }, Chattogram: { psh: 4.6, lat: 22.36 }, Khulna: { psh: 4.8, lat: 22.82 },
    Rajshahi: { psh: 4.9, lat: 24.37 }, Sylhet: { psh: 4.3, lat: 24.9 }, Barisal: { psh: 4.6, lat: 22.7 },
    Rangpur: { psh: 4.8, lat: 25.75 }, Mymensingh: { psh: 4.6, lat: 24.75 }, "Cox's Bazar": { psh: 4.7, lat: 21.45 },
  }},
  India: { lat: 22, defaultPsh: 5.1, tempC: 28, tariffUsd: 0.09, cur: 'INR', cities: {
    Delhi: { psh: 5.2, lat: 28.6 }, Mumbai: { psh: 5.0, lat: 19.07 }, Bangalore: { psh: 5.3, lat: 12.97 },
    Kolkata: { psh: 4.7, lat: 22.57 }, Chennai: { psh: 5.4, lat: 13.08 }, Jaipur: { psh: 5.6, lat: 26.91 },
  }},
  Pakistan: { lat: 30, defaultPsh: 5.2, tempC: 27, tariffUsd: 0.08, cur: 'PKR', cities: {
    Karachi: { psh: 5.4, lat: 24.86 }, Lahore: { psh: 5.2, lat: 31.55 }, Islamabad: { psh: 5.0, lat: 33.68 },
  }},
  Nepal: { lat: 28, defaultPsh: 4.6, tempC: 20, tariffUsd: 0.08, cur: 'NPR', cities: { Kathmandu: { psh: 4.6, lat: 27.7 } } },
  'Sri Lanka': { lat: 7.9, defaultPsh: 4.5, tempC: 28, tariffUsd: 0.1, cur: 'LKR', cities: { Colombo: { psh: 4.5, lat: 6.93 } } },
  UAE: { lat: 24, defaultPsh: 5.8, tempC: 30, tariffUsd: 0.08, cur: 'AED', cities: { Dubai: { psh: 5.8, lat: 25.2 }, 'Abu Dhabi': { psh: 5.9, lat: 24.45 } } },
  'Saudi Arabia': { lat: 24, defaultPsh: 6.0, tempC: 30, tariffUsd: 0.05, cur: 'SAR', cities: { Riyadh: { psh: 6.0, lat: 24.7 }, Jeddah: { psh: 6.1, lat: 21.5 } } },
  'United States': { lat: 38, defaultPsh: 4.5, tempC: 18, tariffUsd: 0.16, cur: 'USD', cities: {
    'New York': { psh: 4.2, lat: 40.7 }, 'Los Angeles': { psh: 5.4, lat: 34.05 }, Phoenix: { psh: 6.6, lat: 33.45 },
    Chicago: { psh: 4.0, lat: 41.88 }, Houston: { psh: 4.9, lat: 29.76 }, Miami: { psh: 5.1, lat: 25.76 }, Seattle: { psh: 3.4, lat: 47.6 },
  }},
  'United Kingdom': { lat: 52, defaultPsh: 2.9, tempC: 12, tariffUsd: 0.28, cur: 'GBP', cities: { London: { psh: 2.9, lat: 51.5 } } },
  Germany: { lat: 51, defaultPsh: 3.0, tempC: 11, tariffUsd: 0.35, cur: 'EUR', cities: { Berlin: { psh: 3.0, lat: 52.5 }, Munich: { psh: 3.2, lat: 48.14 } } },
  Australia: { lat: -27, defaultPsh: 4.8, tempC: 21, tariffUsd: 0.28, cur: 'AUD', cities: { Sydney: { psh: 4.6, lat: -33.87 }, Melbourne: { psh: 4.2, lat: -37.81 }, Perth: { psh: 5.5, lat: -31.95 } } },
  Nigeria: { lat: 9, defaultPsh: 4.6, tempC: 29, tariffUsd: 0.06, cur: 'NGN', cities: { Lagos: { psh: 4.4, lat: 6.5 } } },
  Kenya: { lat: -1, defaultPsh: 5.3, tempC: 23, tariffUsd: 0.15, cur: 'KES', cities: { Nairobi: { psh: 5.3, lat: -1.29 } } },
  Egypt: { lat: 26, defaultPsh: 6.0, tempC: 25, tariffUsd: 0.04, cur: 'EGP', cities: { Cairo: { psh: 6.0, lat: 30.04 } } },
  Philippines: { lat: 13, defaultPsh: 4.5, tempC: 28, tariffUsd: 0.17, cur: 'PHP', cities: { Manila: { psh: 4.5, lat: 14.6 } } },
  Indonesia: { lat: -2, defaultPsh: 4.3, tempC: 27, tariffUsd: 0.08, cur: 'IDR', cities: { Jakarta: { psh: 4.2, lat: -6.2 } } },
};
const DEFAULT_REGION = { lat: 15, defaultPsh: 4.5, tempC: 25, tariffUsd: 0.12, cur: 'USD', cities: {} };
const COUNTRY_LIST = Object.keys(REGIONS);

function estimateSite(country, city) {
  const region = REGIONS[country] || DEFAULT_REGION;
  const cityData = region.cities[city];
  return {
    psh: cityData ? cityData.psh : region.defaultPsh,
    lat: cityData ? cityData.lat : region.lat,
    tempC: region.tempC,
    tariffUsd: region.tariffUsd,
    cur: region.cur,
    isCityMatch: !!cityData,
    isKnownCountry: !!REGIONS[country],
  };
}

/* ============================================================================
   ENGINEERING ENGINES — same methodology as backend/app/engines in the full
   project (peak-sun-hour sizing, DoD battery sizing, diversity-factor peak
   load). Real, standard preliminary-design formulas — not toy numbers.
   ============================================================================ */
const PERFORMANCE_RATIO = 0.75;
const DIVERSITY_FACTOR = 0.7;
const BATTERY_DOD = 0.9;
const BATTERY_RTE = 0.95;

function calcEnergyLoad(appliances) {
  let totalWh = 0, theoreticalPeakW = 0, coincidentPeakW = 0;
  appliances.forEach((a) => {
    const wh = a.watts * a.hours * a.qty;
    const w = a.watts * a.qty;
    totalWh += wh;
    theoreticalPeakW += w;
    if (a.simultaneous) coincidentPeakW += w;
  });
  const estimatedPeakW = Math.max(coincidentPeakW, theoreticalPeakW * DIVERSITY_FACTOR);
  return { dailyEnergyKwh: totalWh / 1000, theoreticalPeakW, estimatedPeakW };
}

function sizeSystem({ dailyEnergyKwh, psh, systemMode, autonomyDays }) {
  const arrayKwNeeded = dailyEnergyKwh / (psh * PERFORMANCE_RATIO);
  const batteryKwhNeeded = systemMode === 'on_grid' ? 0 : (dailyEnergyKwh * autonomyDays) / (BATTERY_DOD * BATTERY_RTE);
  return { arrayKwNeeded, batteryKwhNeeded };
}

const PANEL_TIERS = {
  budget: { type: 'Polycrystalline', wattage: 335, efficiency: '16–17%', examples: 'Jinko Eagle / Canadian Solar HiKu (poly)' },
  standard: { type: 'Monocrystalline PERC', wattage: 450, efficiency: '20–21%', examples: 'Trina Vertex S / LONGi Hi-MO 5' },
  premium: { type: 'Mono TOPCon / N-type', wattage: 585, efficiency: '22–23%', examples: 'Jinko Tiger Neo / JA Solar DeepBlue 4.0' },
};

function recommendComponents({ arrayKwNeeded, batteryKwhNeeded, peakLoadW, roofType, roofAreaM2, systemMode }) {
  const requiredAreaStandard = arrayKwNeeded * 6.5;
  let tier = 'standard';
  if (roofAreaM2 && roofAreaM2 < requiredAreaStandard * 0.75) tier = 'premium';
  else if (roofAreaM2 && roofAreaM2 > requiredAreaStandard * 1.6) tier = 'budget';
  const panel = PANEL_TIERS[tier];
  const panelCount = Math.max(1, Math.ceil((arrayKwNeeded * 1000) / panel.wattage));
  const actualArrayKw = (panelCount * panel.wattage) / 1000;
  const requiredAreaM2 = Math.round(panelCount * (tier === 'premium' ? 2.6 : tier === 'budget' ? 1.9 : 2.2));

  const inverterKw = Math.max((peakLoadW / 1000) * 1.25, actualArrayKw / 1.15);
  const inverterType = systemMode === 'off_grid' ? 'Off-grid inverter/charger' : systemMode === 'hybrid' ? 'Hybrid inverter (grid + battery + PV)' : 'Grid-tie string inverter';
  const inverterExamples = systemMode === 'on_grid' ? 'Growatt MIN series / Sungrow SG series' : 'Deye SUN-K hybrid / Growatt SPF hybrid / Victron MultiPlus-II';

  let battery = null;
  if (systemMode !== 'on_grid' && batteryKwhNeeded > 0.1) {
    battery = {
      chemistry: 'LiFePO4 (Lithium Iron Phosphate)',
      nominalKwh: Math.round(batteryKwhNeeded * 10) / 10,
      voltage: actualArrayKw > 5 ? '48V' : '24V',
      examples: 'Pytes E-Box 48V / EG4 LifePower4 / Dyness Powerbox',
    };
  }

  const mounting =
    roofType === 'flat_concrete' ? 'Tilted frame — RCC roof hooks + adjustable tilt legs (10–15°)' :
    roofType === 'sloped_tin' ? 'Tin-roof rail mounting, hook-bolt fixed, follows existing pitch' :
    roofType === 'sloped_tile' ? 'Tile-roof mounting hooks with flashing, follows existing pitch' :
    'Ground-mount galvanized steel structure';

  const bos = [
    'DC solar cable, 4–6 mm², double-insulated, UV-resistant',
    'AC cable sized to inverter output current + local code',
    'DC & AC isolators / MCBs',
    'Surge Protection Device (SPD) — DC and AC side',
    'Earthing kit for array frame + inverter chassis',
    'Combiner/junction box if more than 2 strings',
  ];

  return { tier, panel: { ...panel, count: panelCount, actualArrayKw, requiredAreaM2 }, inverter: { type: inverterType, sizeKw: Math.round(inverterKw * 100) / 100, examples: inverterExamples }, battery, mounting, bos };
}

const COST_PER_WATT_USD = { budget: 0.5, standard: 0.7, premium: 0.9 };
const BATTERY_COST_PER_KWH_USD = 260;
const REGION_COST_MULT = { Bangladesh: 0.5, India: 0.45, Pakistan: 0.45, Nepal: 0.5, 'Sri Lanka': 0.55, Nigeria: 0.6, Kenya: 0.65, Egypt: 0.5, Philippines: 0.6, Indonesia: 0.55 };

function estimateCost({ actualArrayKw, batteryKwh, tier, country, psh, tariffUsd }) {
  const mult = REGION_COST_MULT[country] ?? 1.0;
  const equip = actualArrayKw * 1000 * COST_PER_WATT_USD[tier] * mult;
  const batt = (batteryKwh || 0) * BATTERY_COST_PER_KWH_USD * mult;
  const subtotal = equip + batt;
  const low = Math.round(subtotal * 0.85);
  const high = Math.round(subtotal * 1.25);
  const annualGenerationKwh = Math.round(actualArrayKw * psh * 365 * PERFORMANCE_RATIO);
  const annualSavingsUsd = Math.round(annualGenerationKwh * tariffUsd);
  const paybackYears = annualSavingsUsd > 0 ? Math.round((subtotal / annualSavingsUsd) * 10) / 10 : null;
  return { low, high, annualGenerationKwh, annualSavingsUsd, paybackYears };
}

function calcSuitability({ psh, shading, roofAreaM2, requiredAreaM2 }) {
  const base = psh >= 5.5 ? 100 : psh >= 4.5 ? 85 : psh >= 3.5 ? 65 : psh >= 2.5 ? 40 : 20;
  const shadeMult = shading === 'none' ? 1 : shading === 'partial' ? 0.75 : 0.45;
  let areaMult = 1;
  const factors = [
    { label: 'Sun resource', detail: `${psh.toFixed(1)} peak sun-hours/day`, ok: psh >= 4 },
    { label: 'Shading', detail: shading === 'none' ? 'Clear / unshaded' : shading === 'partial' ? 'Partial shading present' : 'Significant shading present', ok: shading === 'none' },
  ];
  if (roofAreaM2 && requiredAreaM2) {
    const ratio = roofAreaM2 / requiredAreaM2;
    areaMult = ratio >= 1.2 ? 1 : ratio >= 0.9 ? 0.95 : ratio >= 0.6 ? 0.8 : 0.55;
    factors.push({ label: 'Roof area', detail: `${roofAreaM2} m² available vs ~${requiredAreaM2} m² needed`, ok: ratio >= 0.9 });
  }
  const score = Math.max(5, Math.min(100, Math.round(base * shadeMult * areaMult)));
  const tier = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Moderate' : 'Poor';
  return { score, tier, factors };
}

function buildRoadmap(systemMode) {
  return [
    { phase: 'Site Survey & Measurements', items: ['Confirm roof structural capacity and exact usable area', 'Check shading across seasons, not just today', 'Inspect existing electrical panel and grid connection point'] },
    { phase: 'Design Finalization & Approvals', items: ['Lock the single-line diagram and component list', systemMode !== 'off_grid' ? 'Apply for utility net-metering / interconnection approval' : 'Confirm autonomy targets with the client', 'Structural sign-off if roof condition is uncertain'] },
    { phase: 'Material Procurement', items: ['Order panels, inverter, battery, mounting to the confirmed BOM', 'Verify certifications on datasheets (IEC/UL as applicable)', 'Confirm dry, ventilated storage for batteries before install day'] },
    { phase: 'Civil / Mounting Work', items: ['Install racking per roof type with correct waterproofing/flashing', 'Torque all mounting hardware to spec', 'Maintain fall-protection for any roof work'] },
    { phase: 'Electrical Installation', items: ['Mount and wire panel strings', 'Install inverter, battery bank, combiner box', 'DC + AC protection, earthing, cable labeling'] },
    { phase: 'Commissioning & Testing', items: ['Insulation resistance + open-circuit voltage test per string', 'Polarity check before first energization', 'Inverter start-up sequence + battery BMS check', 'Set up production monitoring'] },
    { phase: 'Safety Checks & Handover', items: ['Final visual inspection, label all disconnects', 'Hand over manuals, warranty docs, single-line diagram', 'Walk the client through shutdown procedure and monitoring app'] },
  ];
}

const SAFETY_NOTES = [
  'PV strings are live any time there is light on them — they can\u2019t be "switched off" like AC circuits. Treat DC wiring as energized at all times.',
  'Grid interconnection (on-grid/hybrid) should be signed off by a locally licensed electrician — a regulatory requirement in most places, not just good practice.',
  'Undersized cable is the most common installation defect. Size to the manufacturer\u2019s max current with margin, not just typical operating current.',
  'Keep LiFePO4 batteries ventilated and out of direct heat; follow the manufacturer\u2019s BMS and warranty conditions.',
  'An SPD on both DC and AC sides is cheap insurance against lightning-induced transients — don\u2019t skip it to save cost.',
];

const PRESETS = [
  { name: 'LED Bulb', watts: 10 }, { name: 'Ceiling Fan', watts: 75 }, { name: 'Table Fan', watts: 55 },
  { name: 'LED TV', watts: 100 }, { name: 'Refrigerator', watts: 150 }, { name: '1 Ton AC', watts: 1100 },
  { name: '1.5 Ton AC', watts: 1650 }, { name: 'Washing Machine', watts: 500 }, { name: 'Water Pump', watts: 750 },
  { name: 'Desktop PC', watts: 200 }, { name: 'Iron', watts: 1000 }, { name: 'Shop Lighting', watts: 40 },
];

/* ============================================================================
   AGENT — the conversational layer, genuinely powered by Claude in this chat.
   Numbers are always computed by the deterministic engines above; the agent
   explains, contextualizes, and answers follow-ups against that data.
   ============================================================================ */
const AGENT_SYSTEM_PROMPT = `You are SolarAgent Pro, a senior solar energy systems engineer speaking with a client (homeowner or shop owner) who may know nothing about solar. Be warm, direct, and precise, like a real engineer at a site visit — not a generic chatbot.

Ground every answer in the session data given below. Don't recompute or contradict numbers already calculated; explain, contextualize, and answer follow-ups about them. If asked something the data can't answer (e.g. a live local price), say so plainly rather than inventing a figure.

Keep responses tight: a few short paragraphs at most, this is a chat panel. When wiring, grid connection, or permits come up, mention that the final design should be validated by a locally licensed electrician before installation. Never invent a specific real-time price, exact brand spec, or local regulation you're not confident about.`;

async function askAgent({ messages, contextSummary, imageDataUrl }) {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
  const apiMessages = messages.map((m, i) => {
    if (imageDataUrl && i === lastUserIndex) {
      return { role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageDataUrl.split(',')[1] } },
        { type: 'text', text: m.content },
      ]};
    }
    return { role: m.role, content: m.content };
  });
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: AGENT_SYSTEM_PROMPT + '\n\n--- CURRENT SESSION DATA ---\n' + contextSummary,
        messages: apiMessages,
      }),
    });
    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    return text || "I couldn't quite process that \u2014 mind trying again?";
  } catch (e) {
    return "I'm having trouble connecting right now. The numbers on your dashboard are still accurate \u2014 try asking again in a moment.";
  }
}

/* ============================================================================
   UI
   ============================================================================ */
export default function SolarAgentPro() {
  useGoogleFonts();
  const [isDark, setIsDark] = useState(true);
  const [step, setStep] = useState(1);
  const [site, setSite] = useState({ country: 'Bangladesh', city: 'Khulna', roofType: 'sloped_tin', roofArea: 200, shading: 'none', buildingType: 'house' });
  const [appliances, setAppliances] = useState([
    { id: 1, name: 'LED Bulb', watts: 10, hours: 6, qty: 6, simultaneous: true },
    { id: 2, name: 'Ceiling Fan', watts: 75, hours: 8, qty: 3, simultaneous: true },
    { id: 3, name: 'Refrigerator', watts: 150, hours: 8, qty: 1, simultaneous: true },
  ]);
  const [nextId, setNextId] = useState(4);
  const [systemMode, setSystemMode] = useState('hybrid');
  const [autonomyDays, setAutonomyDays] = useState(1);
  const [results, setResults] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [roofPhoto, setRoofPhoto] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatOpen]);

  const dark = isDark;
  const s = {
    page: { backgroundColor: dark ? COLORS.dusk : COLORS.paper, color: dark ? '#EDEFF5' : COLORS.ink },
    card: { backgroundColor: dark ? COLORS.panelDark : '#FFFFFF', borderColor: dark ? COLORS.panelDarkBorder : '#DDE2E6', borderWidth: 1, borderStyle: 'solid' },
    input: { backgroundColor: dark ? COLORS.inputDark : '#FFFFFF', borderColor: dark ? COLORS.panelDarkBorder : '#CBD2D9', borderWidth: 1, borderStyle: 'solid', color: dark ? '#EDEFF5' : COLORS.ink },
    muted: { color: dark ? COLORS.mutedDark : COLORS.steel },
    mono: { fontFamily: FONT_MONO },
  };
  const inputClass = 'w-full px-3 py-2 rounded-md text-sm outline-none';

  const liveSite = estimateSite(site.country, site.city);
  const liveLoad = calcEnergyLoad(appliances);

  function updateSite(field, value) { setSite((p) => ({ ...p, [field]: value })); }
  function addPreset(p) { setAppliances((l) => [...l, { id: nextId, name: p.name, watts: p.watts, hours: 4, qty: 1, simultaneous: true }]); setNextId((n) => n + 1); }
  function updateAppliance(id, field, value) { setAppliances((l) => l.map((a) => (a.id === id ? { ...a, [field]: value } : a))); }
  function removeAppliance(id) { setAppliances((l) => l.filter((a) => a.id !== id)); }

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 800;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setRoofPhoto(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function buildContextSummary(r) {
    return `Location: ${site.city}, ${site.country} (${site.buildingType}, ${site.roofType} roof, ${site.roofArea} m² available, shading: ${site.shading})
Estimated resource: ${r.siteEst.psh.toFixed(1)} peak sun-hours/day, ~${r.siteEst.tempC}\u00b0C avg (estimated \u2014 not a live feed)
Suitability: ${r.suitability.tier} (${r.suitability.score}/100)
Daily energy need: ${r.load.dailyEnergyKwh.toFixed(2)} kWh/day, peak load ~${Math.round(r.load.estimatedPeakW)} W
System mode: ${systemMode}, autonomy target: ${autonomyDays} day(s)
Recommended array: ${r.components.panel.count} \u00d7 ${r.components.panel.wattage}W ${r.components.panel.type} panels (${r.components.panel.actualArrayKw.toFixed(2)} kW)
Inverter: ${r.components.inverter.type}, ${r.components.inverter.sizeKw} kW
Battery: ${r.components.battery ? `${r.components.battery.nominalKwh} kWh ${r.components.battery.chemistry} @ ${r.components.battery.voltage}` : 'None (grid-tied, no storage)'}
Estimated cost: $${r.cost.low.toLocaleString()}\u2013$${r.cost.high.toLocaleString()} USD-equivalent
Est. payback: ${r.cost.paybackYears ? r.cost.paybackYears + ' years' : 'N/A'}`;
  }

  function computeResults() {
    const siteEst = estimateSite(site.country, site.city);
    const load = calcEnergyLoad(appliances);
    const sizing = sizeSystem({ dailyEnergyKwh: load.dailyEnergyKwh, psh: siteEst.psh, systemMode, autonomyDays });
    const components = recommendComponents({ arrayKwNeeded: sizing.arrayKwNeeded, batteryKwhNeeded: sizing.batteryKwhNeeded, peakLoadW: load.estimatedPeakW, roofType: site.roofType, roofAreaM2: Number(site.roofArea) || null, systemMode });
    const suitability = calcSuitability({ psh: siteEst.psh, shading: site.shading, roofAreaM2: Number(site.roofArea) || null, requiredAreaM2: components.panel.requiredAreaM2 });
    const cost = estimateCost({ actualArrayKw: components.panel.actualArrayKw, batteryKwh: components.battery?.nominalKwh || 0, tier: components.tier, country: site.country, psh: siteEst.psh, tariffUsd: siteEst.tariffUsd });
    const roadmap = buildRoadmap(systemMode);
    const tilt = Math.round(Math.abs(siteEst.lat));
    const orientation = siteEst.lat >= 0 ? 'True South' : 'True North';
    const bundle = { siteEst, load, sizing, suitability, components, cost, roadmap, tilt, orientation };
    setResults(bundle);
    setStep(2);

    const introMsg = { role: 'user', content: 'I\u2019ve filled in my site and load details. Walk me through my results in a few sentences \u2014 what stands out, and what should I double-check?' };
    setMessages([introMsg]);
    setIsThinking(true);
    askAgent({ messages: [introMsg], contextSummary: buildContextSummary(bundle), imageDataUrl: roofPhoto }).then((reply) => {
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      setIsThinking(false);
    });
  }

  function handleSendChat() {
    if (!chatInput.trim() || isThinking) return;
    const userMsg = { role: 'user', content: chatInput.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput('');
    setIsThinking(true);
    const summary = results ? buildContextSummary(results) : 'No site/load data submitted yet \u2014 the client is asking a general question. Offer to walk them through the Site & Load form.';
    askAgent({ messages: newMessages, contextSummary: summary }).then((reply) => {
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      setIsThinking(false);
    });
  }

  function downloadReport() {
    if (!results) return;
    const r = results;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SolarAgent Pro Report</title>
<style>
body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#14192B;line-height:1.55;padding:0 20px}
h1{font-size:24px;border-bottom:3px solid #E8A93A;padding-bottom:10px}
h2{font-size:14px;color:#5C6478;text-transform:uppercase;letter-spacing:1px;margin-top:30px}
table{width:100%;border-collapse:collapse;margin-top:8px}
td{padding:6px 8px;border-bottom:1px solid #e5e5e5;font-family:monospace;font-size:13px}
td:first-child{color:#5C6478;width:42%;font-family:Arial,sans-serif}
.badge{display:inline-block;padding:4px 12px;background:#E8A93A;color:#14192B;font-weight:700;border-radius:4px}
.phase{margin-bottom:10px}.phase b{color:#B5623F}
footer{margin-top:36px;font-size:11px;color:#5C6478;border-top:1px solid #e5e5e5;padding-top:12px}
</style></head><body>
<h1>SolarAgent Pro \u2014 Site Consultation Report</h1>
<p>${site.city}, ${site.country} \u00b7 ${site.buildingType} \u00b7 Generated ${new Date().toLocaleDateString()}</p>
<h2>Suitability</h2>
<p><span class="badge">${r.suitability.tier} \u2014 ${r.suitability.score}/100</span></p>
<table>${r.suitability.factors.map((f) => `<tr><td>${f.label}</td><td>${f.detail}</td></tr>`).join('')}</table>
<h2>Site &amp; Load</h2>
<table>
<tr><td>Roof</td><td>${site.roofType}, ${site.roofArea} m\u00b2, shading: ${site.shading}</td></tr>
<tr><td>Peak sun-hours</td><td>${r.siteEst.psh.toFixed(1)} h/day (estimated)</td></tr>
<tr><td>Recommended tilt</td><td>~${r.tilt}\u00b0 facing ${r.orientation}</td></tr>
<tr><td>Daily energy need</td><td>${r.load.dailyEnergyKwh.toFixed(2)} kWh/day</td></tr>
<tr><td>Estimated peak load</td><td>${Math.round(r.load.estimatedPeakW)} W</td></tr>
</table>
<h2>System Design \u2014 ${systemMode.replace('_', ' ')}</h2>
<table>
<tr><td>Panels</td><td>${r.components.panel.count} \u00d7 ${r.components.panel.wattage}W ${r.components.panel.type} (${r.components.panel.actualArrayKw.toFixed(2)} kW total)</td></tr>
<tr><td>Inverter</td><td>${r.components.inverter.type}, ${r.components.inverter.sizeKw} kW</td></tr>
<tr><td>Battery</td><td>${r.components.battery ? `${r.components.battery.nominalKwh} kWh ${r.components.battery.chemistry} @ ${r.components.battery.voltage}` : 'None'}</td></tr>
<tr><td>Mounting</td><td>${r.components.mounting}</td></tr>
</table>
<h2>Cost Estimate</h2>
<table>
<tr><td>Installed cost range</td><td>$${r.cost.low.toLocaleString()} \u2013 $${r.cost.high.toLocaleString()} (USD-equiv., approximate)</td></tr>
<tr><td>Est. annual generation</td><td>${r.cost.annualGenerationKwh.toLocaleString()} kWh/yr</td></tr>
<tr><td>Est. annual savings</td><td>$${r.cost.annualSavingsUsd.toLocaleString()}/yr (USD-equiv.)</td></tr>
<tr><td>Est. payback</td><td>${r.cost.paybackYears ? r.cost.paybackYears + ' years' : 'N/A'}</td></tr>
</table>
<h2>Installation Roadmap</h2>
${r.roadmap.map((p, i) => `<div class="phase"><b>${i + 1}. ${p.phase}</b><ul>${p.items.map((it) => `<li>${it}</li>`).join('')}</ul></div>`).join('')}
<footer>Generated by SolarAgent Pro. All figures are planning-stage estimates from a documented estimation model \u2014 not a substitute for a licensed site survey, structural check, or local-code compliant electrical design. Get 2\u20133 local supplier quotes before purchasing.</footer>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'SolarAgent_Pro_Report.html'; a.click();
    URL.revokeObjectURL(url);
  }

  function Field({ label, children, hint }) {
    return (
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <label style={{ fontFamily: FONT_MONO, fontSize: 10, ...s.muted, letterSpacing: '0.5px' }}>{label.toUpperCase()}</label>
          {hint && <span style={{ fontFamily: FONT_MONO, fontSize: 10, ...s.muted }}>{hint}</span>}
        </div>
        {children}
      </div>
    );
  }

  function SuitabilityGauge({ score }) {
    const cx = 100, cy = 95, r = 75;
    const pt = (deg) => { const t = (deg * Math.PI) / 180; return { x: cx + r * Math.sin(t), y: cy - r * Math.cos(t) }; };
    const left = pt(-90);
    const scoreAngle = -90 + (Math.max(0, Math.min(100, score)) / 100) * 180;
    const scoreEnd = pt(scoreAngle);
    const right = pt(90);
    const arcColor = score >= 80 ? COLORS.solar : score >= 60 ? COLORS.sky : score >= 40 ? COLORS.copper : '#A15B5B';
    return (
      <svg viewBox="0 0 200 118" style={{ width: '100%', maxWidth: 220, margin: '0 auto', display: 'block' }}>
        <path d={`M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${right.x} ${right.y}`} fill="none" stroke={dark ? COLORS.panelDarkBorder : '#E4E8EB'} strokeWidth="16" strokeLinecap="round" />
        <path d={`M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${scoreEnd.x} ${scoreEnd.y}`} fill="none" stroke={arcColor} strokeWidth="16" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={scoreEnd.x} y2={scoreEnd.y} stroke={dark ? '#EDEFF5' : COLORS.ink} strokeWidth="2" />
        <circle cx={cx} cy={cy} r="4" fill={dark ? '#EDEFF5' : COLORS.ink} />
        <text x={cx} y={cy - 16} textAnchor="middle" fontSize="30" fontWeight="700" fill={dark ? '#EDEFF5' : COLORS.ink} style={{ fontFamily: FONT_DISPLAY }}>{score}</text>
        <text x={cx} y={cy + 2} textAnchor="middle" fontSize="9" fill={dark ? COLORS.mutedDark : COLORS.steel} style={{ fontFamily: FONT_MONO, letterSpacing: 1 }}>OUT OF 100</text>
      </svg>
    );
  }

  return (
    <div style={{ ...s.page, fontFamily: FONT_DISPLAY, minHeight: 640 }} className="w-full rounded-xl overflow-hidden relative">
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${dark ? COLORS.panelDarkBorder : '#DDE2E6'}` }} className="px-5 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>SolarAgent</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLORS.solar, border: `1px solid ${COLORS.solar}`, padding: '1px 6px', borderRadius: 4 }}>PRO</span>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, ...s.muted, letterSpacing: '0.5px', marginTop: 2 }}>SITE CONSULTATION \u2014 DRAFT V1</div>
        </div>
        <button onClick={() => setIsDark((d) => !d)} style={{ ...s.card, borderRadius: 999 }} className="p-2">
          {dark ? <Sun size={16} color={COLORS.solar} /> : <Moon size={16} color={COLORS.ink} />}
        </button>
      </header>

      {/* Step rail */}
      <div className="px-5 pt-4 flex items-center gap-3" style={{ fontFamily: FONT_MONO, fontSize: 11 }}>
        {['SITE & LOAD', 'YOUR PLAN'].map((label, i) => {
          const n = i + 1;
          const active = step === n, done = step > n;
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2" style={{ opacity: active ? 1 : done ? 0.85 : 0.4 }}>
                <span style={{ width: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, backgroundColor: active || done ? COLORS.solar : 'transparent', color: active || done ? COLORS.ink : dark ? COLORS.mutedDark : COLORS.steel, border: active || done ? 'none' : `1px solid ${dark ? COLORS.panelDarkBorder : '#CBD2D9'}` }}>
                  {done ? <CheckCircle2 size={12} /> : `0${n}`}
                </span>
                <span>{label}</span>
              </div>
              {i === 0 && <div style={{ flex: '0 0 40px', height: 1, backgroundColor: dark ? COLORS.panelDarkBorder : '#DDE2E6' }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main */}
      <main className="p-5 md:p-8">
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT: forms */}
            <div>
              {/* SITE */}
              <div style={{ ...s.card, borderRadius: 12, padding: 18 }} className="mb-5">
                <h2 style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Site &amp; Location</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Country">
                    <select className={inputClass} style={s.input} value={site.country} onChange={(e) => updateSite('country', e.target.value)}>
                      {COUNTRY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="City / Region">
                    <input className={inputClass} style={s.input} value={site.city} onChange={(e) => updateSite('city', e.target.value)} placeholder="e.g. Khulna" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Building type">
                    <select className={inputClass} style={s.input} value={site.buildingType} onChange={(e) => updateSite('buildingType', e.target.value)}>
                      <option value="house">House</option><option value="shop">Shop</option><option value="small_commercial">Small commercial</option>
                    </select>
                  </Field>
                  <Field label="Roof type">
                    <select className={inputClass} style={s.input} value={site.roofType} onChange={(e) => updateSite('roofType', e.target.value)}>
                      <option value="sloped_tin">Sloped \u2014 tin</option><option value="sloped_tile">Sloped \u2014 tile</option><option value="flat_concrete">Flat concrete</option><option value="ground_mount">Ground mount</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Roof area (m\u00b2)">
                    <input type="number" className={inputClass} style={s.input} value={site.roofArea} onChange={(e) => updateSite('roofArea', e.target.value)} />
                  </Field>
                  <Field label="Shading">
                    <select className={inputClass} style={s.input} value={site.shading} onChange={(e) => updateSite('shading', e.target.value)}>
                      <option value="none">None</option><option value="partial">Partial</option><option value="significant">Significant</option>
                    </select>
                  </Field>
                </div>
                <Field label="Roof photo (optional)" hint="for visual context">
                  <label style={{ ...s.input, borderStyle: 'dashed', cursor: 'pointer' }} className="flex items-center justify-center gap-2 py-3 rounded-md text-sm">
                    {roofPhoto ? <img src={roofPhoto} alt="roof" style={{ height: 40, borderRadius: 4 }} /> : <><Upload size={14} /><span>Upload a photo</span></>}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </Field>
                <div style={{ ...s.mono, fontSize: 11, ...s.muted, marginTop: 10, borderTop: `1px dashed ${dark ? COLORS.panelDarkBorder : '#DDE2E6'}`, paddingTop: 10 }}>
                  \u2248 {liveSite.psh.toFixed(1)} peak sun-h/day \u00b7 ~{liveSite.tempC}\u00b0C avg {!liveSite.isCityMatch && '\u00b7 country-level estimate'}
                </div>
              </div>

              {/* LOAD */}
              <div style={{ ...s.card, borderRadius: 12, padding: 18 }}>
                <h2 style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Appliances &amp; Load</h2>
                <div className="space-y-2 mb-3">
                  {appliances.map((a) => (
                    <div key={a.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '2fr 1fr 1fr 0.6fr auto' }}>
                      <input className={inputClass} style={{ ...s.input, padding: '6px 8px' }} value={a.name} onChange={(e) => updateAppliance(a.id, 'name', e.target.value)} />
                      <input type="number" className={inputClass} style={{ ...s.input, padding: '6px 8px', ...s.mono, fontSize: 12 }} value={a.watts} onChange={(e) => updateAppliance(a.id, 'watts', Number(e.target.value))} title="Watts" />
                      <input type="number" className={inputClass} style={{ ...s.input, padding: '6px 8px', ...s.mono, fontSize: 12 }} value={a.hours} onChange={(e) => updateAppliance(a.id, 'hours', Number(e.target.value))} title="Hours/day" />
                      <input type="number" className={inputClass} style={{ ...s.input, padding: '6px 8px', ...s.mono, fontSize: 12 }} value={a.qty} onChange={(e) => updateAppliance(a.id, 'qty', Number(e.target.value))} title="Qty" />
                      <button onClick={() => removeAppliance(a.id)} style={{ color: COLORS.copper }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ ...s.mono, fontSize: 9, ...s.muted, marginBottom: 10 }}>NAME \u00b7 WATTS \u00b7 HOURS/DAY \u00b7 QTY</div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {PRESETS.map((p) => (
                    <button key={p.name} onClick={() => addPreset(p)} style={{ ...s.input, fontSize: 11, padding: '4px 9px', borderRadius: 999 }} className="flex items-center gap-1">
                      <Plus size={10} />{p.name}
                    </button>
                  ))}
                </div>
                <Field label="System configuration">
                  <div className="flex gap-2">
                    {['on_grid', 'hybrid', 'off_grid'].map((m) => (
                      <button key={m} onClick={() => setSystemMode(m)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: systemMode === m ? COLORS.solar : (dark ? COLORS.inputDark : '#FFFFFF'), color: systemMode === m ? COLORS.ink : (dark ? '#EDEFF5' : COLORS.ink), border: `1px solid ${systemMode === m ? COLORS.solar : (dark ? COLORS.panelDarkBorder : '#CBD2D9')}` }}>
                        {m === 'on_grid' ? 'On-Grid' : m === 'hybrid' ? 'Hybrid' : 'Off-Grid'}
                      </button>
                    ))}
                  </div>
                </Field>
                {systemMode !== 'on_grid' && (
                  <Field label="Battery autonomy (days)">
                    <input type="number" step="0.5" min="0.5" className={inputClass} style={s.input} value={autonomyDays} onChange={(e) => setAutonomyDays(Number(e.target.value))} />
                  </Field>
                )}
                <div style={{ ...s.mono, fontSize: 12, marginTop: 8, marginBottom: 14 }}>
                  <span style={{ color: COLORS.solar }}>{liveLoad.dailyEnergyKwh.toFixed(2)} kWh/day</span>
                  <span style={{ ...s.muted }}> \u00b7 peak \u2248 {Math.round(liveLoad.estimatedPeakW)} W</span>
                </div>
                <button onClick={computeResults} style={{ backgroundColor: COLORS.solar, color: COLORS.ink, fontWeight: 700 }} className="w-full py-3 rounded-md text-sm">
                  Generate My Plan \u2192
                </button>
              </div>
            </div>

            {/* RIGHT: quick context / how it works */}
            <div style={{ ...s.card, borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>How SolarAgent Pro sizes your system</h3>
              <div style={{ fontSize: 13, lineHeight: 1.6, ...s.muted }} className="space-y-3">
                <p>Array size is set by the peak-sun-hour method: <span style={{ ...s.mono, color: dark ? '#EDEFF5' : COLORS.ink }}>daily kWh \u00f7 (sun-hours \u00d7 0.75 performance ratio)</span>, where 0.75 covers inverter, wiring, soiling and temperature losses \u2014 a standard preliminary-design factor, not a guess.</p>
                <p>Peak load applies a diversity factor, since real households rarely run every appliance at once. Battery sizing (hybrid/off-grid) targets your autonomy days at 90% usable depth-of-discharge for LiFePO4.</p>
                <p>Once you generate a plan, a real solar engineer \u2014 Claude, live via the Anthropic API \u2014 will walk you through it and take follow-up questions in the chat panel (bottom right). Numbers stay deterministic; the conversation is genuinely reasoning about your specific case.</p>
              </div>
              <div style={{ borderTop: `1px dashed ${dark ? COLORS.panelDarkBorder : '#DDE2E6'}`, marginTop: 16, paddingTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertTriangle size={14} color={COLORS.copper} style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: 12, ...s.muted }}>Irradiance and tariff figures here are a documented estimation model, not a live feed \u2014 the full downloadable project shows exactly where to wire in PVGIS, Solcast, or OpenWeather.</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && results && (
          <div>
            <button onClick={() => setStep(1)} style={{ ...s.muted, fontSize: 12 }} className="flex items-center gap-1 mb-4"><ArrowLeft size={13} /> Back to Site &amp; Load</button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Suitability - signature card */}
              <div style={{ ...s.card, borderRadius: 12, padding: 20 }} className="md:col-span-1 flex flex-col items-center text-center">
                <div style={{ ...s.mono, fontSize: 10, ...s.muted, letterSpacing: 1, marginBottom: 6 }}>SUITABILITY</div>
                <SuitabilityGauge score={results.suitability.score} />
                <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>{results.suitability.tier}</div>
                <div className="w-full mt-4 space-y-1.5 text-left">
                  {results.suitability.factors.map((f) => (
                    <div key={f.label} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                      {f.ok ? <CheckCircle2 size={13} color={COLORS.sky} /> : <AlertTriangle size={13} color={COLORS.copper} />}
                      <span style={s.muted}>{f.label}:</span><span style={s.mono}>{f.detail}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2" style={{ fontSize: 12 }}>
                    <CheckCircle2 size={13} color={COLORS.sky} />
                    <span style={s.muted}>Tilt / orientation:</span><span style={s.mono}>~{results.tilt}\u00b0, {results.orientation}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-5">
                {/* System design */}
                <div style={{ ...s.card, borderRadius: 12, padding: 20 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>System Design \u2014 <span style={{ color: COLORS.solar }}>{systemMode.replace('_', '-')}</span></h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3" style={{ fontSize: 13 }}>
                    <div><div style={s.muted}>Panels</div><div style={s.mono}>{results.components.panel.count} \u00d7 {results.components.panel.wattage}W {results.components.panel.type}</div><div style={{ ...s.muted, fontSize: 11 }}>{results.components.panel.examples}</div></div>
                    <div><div style={s.muted}>Array size</div><div style={s.mono}>{results.components.panel.actualArrayKw.toFixed(2)} kW \u00b7 \u2248{results.components.panel.requiredAreaM2} m\u00b2</div></div>
                    <div><div style={s.muted}>Inverter</div><div style={s.mono}>{results.components.inverter.type}</div><div style={{ ...s.muted, fontSize: 11 }}>{results.components.inverter.sizeKw} kW \u00b7 {results.components.inverter.examples}</div></div>
                    <div><div style={s.muted}>Battery</div>{results.components.battery ? <><div style={s.mono}>{results.components.battery.nominalKwh} kWh {results.components.battery.chemistry}</div><div style={{ ...s.muted, fontSize: 11 }}>{results.components.battery.voltage} \u00b7 {results.components.battery.examples}</div></> : <div style={s.mono}>None (grid-tied)</div>}</div>
                    <div><div style={s.muted}>Mounting</div><div style={s.mono}>{results.components.mounting}</div></div>
                    <div><div style={s.muted}>Balance of system</div><div style={{ fontSize: 12 }}>{results.components.bos.slice(0, 3).join(' \u00b7 ')}\u2026</div></div>
                  </div>
                </div>

                {/* Cost */}
                <div style={{ ...s.card, borderRadius: 12, padding: 20 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Cost &amp; Payback <span style={{ ...s.muted, fontWeight: 400, fontSize: 11 }}>(USD-equivalent, approximate)</span></h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ fontSize: 13 }}>
                    <div><div style={s.muted}>Installed range</div><div style={{ ...s.mono, color: COLORS.solar, fontSize: 15 }}>${results.cost.low.toLocaleString()}\u2013{results.cost.high.toLocaleString()}</div></div>
                    <div><div style={s.muted}>Annual generation</div><div style={s.mono}>{results.cost.annualGenerationKwh.toLocaleString()} kWh</div></div>
                    <div><div style={s.muted}>Annual savings</div><div style={s.mono}>${results.cost.annualSavingsUsd.toLocaleString()}</div></div>
                    <div><div style={s.muted}>Payback</div><div style={s.mono}>{results.cost.paybackYears ? `${results.cost.paybackYears} yrs` : 'N/A'}</div></div>
                  </div>
                </div>

                {/* Roadmap */}
                <div style={{ ...s.card, borderRadius: 12, padding: 20 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Installation Roadmap</h3>
                  <div className="space-y-3">
                    {results.roadmap.map((p, i) => (
                      <div key={p.phase} className="flex gap-3">
                        <div style={{ ...s.mono, fontSize: 11, color: COLORS.copper, flexShrink: 0, width: 20 }}>0{i + 1}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.phase}</div>
                          <div style={{ fontSize: 12, ...s.muted }}>{p.items.join(' \u00b7 ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: `1px dashed ${dark ? COLORS.panelDarkBorder : '#DDE2E6'}`, marginTop: 14, paddingTop: 12 }}>
                    <div style={{ ...s.mono, fontSize: 10, ...s.muted, letterSpacing: 1, marginBottom: 6 }}>SAFETY</div>
                    <div style={{ fontSize: 12, ...s.muted }}>{SAFETY_NOTES[0]}</div>
                  </div>
                </div>

                <button onClick={downloadReport} style={{ ...s.card, fontWeight: 600 }} className="w-full py-3 rounded-md text-sm flex items-center justify-center gap-2">
                  <Download size={15} /> Download Full Report (HTML)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating chat toggle */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} style={{ backgroundColor: COLORS.solar, color: COLORS.ink, position: 'absolute', bottom: 18, right: 18, boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }} className="rounded-full p-3.5 flex items-center gap-2">
          <Radio size={18} />
          <span style={{ fontWeight: 700, fontSize: 12 }}>Ask the engineer</span>
        </button>
      )}

      {/* Chat overlay */}
      {chatOpen && (
        <div style={{ ...s.page, position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: `1px solid ${dark ? COLORS.panelDarkBorder : '#DDE2E6'}` }} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div style={{ backgroundColor: COLORS.solar, width: 8, height: 8, borderRadius: 99 }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Your Solar Engineer</span>
            </div>
            <button onClick={() => setChatOpen(false)}><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div style={{ ...s.muted, fontSize: 13 }}>Ask anything \u2014 "why hybrid instead of off-grid?", "what if my roof is smaller?", "is my cable size ok?" Fill in Site &amp; Load first for a grounded answer, or just ask a general question now.</div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ maxWidth: '85%', marginLeft: m.role === 'user' ? 'auto' : 0 }}>
                <div style={{ ...s.mono, fontSize: 9, ...s.muted, marginBottom: 3, textAlign: m.role === 'user' ? 'right' : 'left' }}>{m.role === 'user' ? 'YOU' : 'ENGINEER'}</div>
                <div style={{ ...(m.role === 'user' ? { backgroundColor: COLORS.solar, color: COLORS.ink } : s.card), padding: '9px 12px', borderRadius: 10, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.content}</div>
              </div>
            ))}
            {isThinking && <div className="flex items-center gap-2" style={{ ...s.muted, fontSize: 12 }}><Loader2 size={13} className="animate-spin" /> thinking through your numbers\u2026</div>}
            <div ref={chatEndRef} />
          </div>
          <div style={{ borderTop: `1px solid ${dark ? COLORS.panelDarkBorder : '#DDE2E6'}` }} className="p-3 flex gap-2">
            <input
              className={inputClass} style={s.input} placeholder="Ask a question\u2026" value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
            />
            <button onClick={handleSendChat} disabled={isThinking} style={{ backgroundColor: COLORS.solar, color: COLORS.ink, opacity: isThinking ? 0.5 : 1 }} className="px-3.5 rounded-md">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
