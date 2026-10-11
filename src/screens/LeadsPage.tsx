import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';

type Lead = { id: string; name: string; phone: string; email?: string; source: string; status: string; location?: string };

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', source: 'web', location: '' });
  const load = () => { setLoading(true); api<{ leads: Lead[] }>('/leads').then((data) => setLeads(data.leads)).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function createLead(event: FormEvent) { event.preventDefault(); await api('/leads', { method: 'POST', body: JSON.stringify(form) }); setForm({ name: '', phone: '', email: '', source: 'web', location: '' }); load(); }
  async function removeLead(id: string) { await api(`/leads/${id}`, { method: 'DELETE' }); setLeads((current) => current.filter((lead) => lead.id !== id)); }

  return <main className="workspace-page"><div className="page-heading"><div><span className="eyebrow">CRM pipeline</span><h1>Leads</h1><p>Every conversation, source, and next action in one working queue.</p></div><span className="role-badge">{leads.length} records</span></div><section className="panel create-panel"><div className="panel-heading"><div><h2>Add a lead</h2><p>New customer requests are saved directly to PostgreSQL.</p></div></div><form className="lead-form" onSubmit={createLead}><input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /><input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><button className="primary-button" type="submit">Create lead</button></form></section>{error && <div className="notice">{error}</div>}<section className="panel"><div className="panel-heading"><h2>Active pipeline</h2><button className="text-button" onClick={load}>Refresh</button></div>{loading ? <div className="loading-state">Loading live leads...</div> : leads.length === 0 ? <div className="empty-state">No leads yet. Create the first customer request above.</div> : <div className="data-list">{leads.map((lead) => <div className="lead-row" key={lead.id}><div className="lead-initial">{lead.name.slice(0, 1).toUpperCase()}</div><div className="lead-info"><strong>{lead.name}</strong><span>{lead.phone}{lead.location ? ` · ${lead.location}` : ''}</span></div><span className="pill success">{lead.status}</span><span className="source-label">{lead.source}</span><button className="icon-button" onClick={() => removeLead(lead.id)} aria-label={`Delete ${lead.name}`}>×</button></div>)}</div>}</section></main>;
}
