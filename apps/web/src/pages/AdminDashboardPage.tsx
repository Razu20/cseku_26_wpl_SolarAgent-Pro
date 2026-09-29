import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type CountResponse = { leads: { id: string; status: string }[] };
type ProductsResponse = { products: { id: string }[] };
type UtilitiesResponse = { utilities: { id: string }[] };

export function AdminDashboardPage() {
  const [data, setData] = useState<{ leads: number; qualified: number; products: number; utilities: number } | null>(null);
  useEffect(() => { Promise.all([api<CountResponse>('/leads'), api<ProductsResponse>('/products'), api<UtilitiesResponse>('/utilities')]).then(([leadData, productData, utilityData]) => setData({ leads: leadData.leads.length, qualified: leadData.leads.filter((lead) => lead.status === 'qualified').length, products: productData.products.length, utilities: utilityData.utilities.length })).catch(() => setData(null)); }, []);
  return <main className="workspace-page"><div className="page-heading"><div><span className="eyebrow">Admin control</span><h1>Command center</h1><p>Monitor the health of sales, delivery, catalog, and platform operations.</p></div><span className="role-badge">Administrator</span></div><section className="metric-grid"><Metric label="All leads" value={data?.leads ?? '--'} tone="teal" /><Metric label="Qualified leads" value={data?.qualified ?? '--'} tone="green" /><Metric label="Catalog products" value={data?.products ?? '--'} tone="amber" /><Metric label="Utility regions" value={data?.utilities ?? '--'} tone="blue" /></section><section className="admin-control-grid"><section className="panel control-hero"><span className="eyebrow">Today at a glance</span><h2>Keep the operating system moving.</h2><p>Review the live pipeline, unblock field work, and keep customer commitments visible to every team.</p><div className="control-actions"><Link className="primary-button" to="/admin">Manage platform data</Link><Link className="secondary-button" to="/leads">Review lead pipeline</Link></div></section><section className="panel"><div className="panel-heading"><div><h2>Admin shortcuts</h2><p>High-frequency operations.</p></div></div><div className="shortcut-list"><Link to="/inventory"><strong>Inventory</strong><span>Review stock and warehouse readiness</span></Link><Link to="/projects"><strong>Projects</strong><span>Track active delivery work</span></Link><Link to="/audit"><strong>Audit log</strong><span>Trace decisions and approvals</span></Link></div></section></section></main>;
}
function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) { return <div className={`metric-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>Live control data</small></div>; }
