import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Lead = { id: string; status: string };

export function LandingPage() {
  const [leadCount, setLeadCount] = useState<number | null>(null);
  useEffect(() => { api<{ leads: Lead[] }>('/leads').then((data) => setLeadCount(data.leads.length)).catch(() => setLeadCount(null)); }, []);

  return <main className="landing-page"><section className="landing-hero"><div className="landing-copy"><span className="eyebrow">Renewable energy operating system</span><h1>Turn every solar question into a confident next step.</h1><p>SolarAgent Pro connects customer intake, engineering, procurement, installation, and monitoring in one auditable workspace.</p><div className="landing-actions"><Link className="primary-button" to="/signup?role=customer">Create customer account</Link><Link className="secondary-button" to="/login?role=admin">Admin sign in</Link></div><div className="landing-trust"><span>● Deterministic engineering</span><span>● Auditable decisions</span><span>● Customer-ready workflows</span></div></div><div className="landing-orbit"><div className="orbit-card orbit-main"><span className="eyebrow">Live portfolio</span><strong>{leadCount === null ? '--' : leadCount}</strong><span>active customer leads</span></div><div className="orbit-card orbit-top">2.5 kWp<br /><small>typical starting design</small></div><div className="orbit-card orbit-bottom">99.2%<br /><small>fleet availability</small></div><div className="sun-disc" /></div></section><section className="landing-strip"><div><span className="eyebrow">One connected workflow</span><h2>From first conversation to long-term performance.</h2></div><div className="landing-steps"><Step number="01" title="Understand" text="Capture needs, evidence, and site context." /><Step number="02" title="Design" text="Run transparent engineering calculations." /><Step number="03" title="Deliver" text="Coordinate quotes, work, and monitoring." /></div></section></main>;
}

function Step({ number, title, text }: { number: string; title: string; text: string }) { return <div className="landing-step"><span>{number}</span><strong>{title}</strong><p>{text}</p></div>; }
