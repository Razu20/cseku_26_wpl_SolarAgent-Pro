import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface AdminStats {
  totalProducts: number;
  totalCompanies: number;
  totalCategories: number;
  activeProducts: number;
  outOfStockProducts: number;
  totalUsers: number;
  totalProjects: number;
  pendingRequests: number;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<AdminStats>('/admin/stats')
      .then((data) => setStats(data))
      .catch((err) => {
        console.error('Failed to fetch admin dashboard stats:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="workspace-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Enterprise Control Center</span>
          <h1>Admin Command Dashboard</h1>
          <p>Real-time metrics on renewable equipment catalog, companies, user accounts, and project requests.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/" className="secondary-button" target="_blank" rel="noreferrer">
            🌐 Live Storefront
          </Link>
          <span className="role-badge">System Administrator</span>
        </div>
      </div>

      {/* 8 Core Admin Dashboard Overview Metrics (Section 22) */}
      <section className="metric-grid">
        <Metric
          label="Total Products"
          value={stats?.totalProducts ?? (loading ? '...' : 0)}
          sub="Catalog hardware items"
          tone="teal"
          link="/admin/products"
        />
        <Metric
          label="Total Companies"
          value={stats?.totalCompanies ?? (loading ? '...' : 0)}
          sub="Authorized brands"
          tone="blue"
          link="/admin/companies"
        />
        <Metric
          label="Total Categories"
          value={stats?.totalCategories ?? (loading ? '...' : 0)}
          sub="Component families"
          tone="amber"
          link="/admin/categories"
        />
        <Metric
          label="Active Products"
          value={stats?.activeProducts ?? (loading ? '...' : 0)}
          sub="Approved & preferred"
          tone="green"
          link="/admin/products"
        />
        <Metric
          label="Out of Stock"
          value={stats?.outOfStockProducts ?? (loading ? '...' : 0)}
          sub="Zero quantity alert"
          tone={stats && stats.outOfStockProducts > 0 ? 'amber' : 'green'}
          link="/admin/products"
        />
        <Metric
          label="Total Users"
          value={stats?.totalUsers ?? (loading ? '...' : 0)}
          sub="Registered accounts"
          tone="teal"
          link="/admin/users"
        />
        <Metric
          label="Total Projects"
          value={stats?.totalProjects ?? (loading ? '...' : 0)}
          sub="Requests & orders"
          tone="blue"
          link="/admin/orders"
        />
        <Metric
          label="Pending Requests"
          value={stats?.pendingRequests ?? (loading ? '...' : 0)}
          sub="Awaiting review"
          tone="amber"
          link="/admin/orders"
        />
      </section>

      <section className="admin-control-grid">
        <section className="panel control-hero">
          <span className="eyebrow">Equipment & Planning Control</span>
          <h2>Marketplace Operations & Logistics</h2>
          <p>
            Add or update products, edit pricing in BDT, manage brand logos, adjust stock availability,
            and monitor customer system sizing requests in real-time.
          </p>
          <div className="control-actions">
            <Link className="primary-button" href="/admin/products">
              + Manage Products & Pricing
            </Link>
            <Link className="secondary-button" href="/admin/companies">
              Manage Companies / Brands
            </Link>
            <Link className="secondary-button" href="/admin/categories">
              Manage Categories
            </Link>
          </div>
        </section>

        <section className="panel admin-quick-operations">
          <div className="panel-heading admin-quick-heading">
            <div>
              <span className="eyebrow">Workspace shortcuts</span>
              <h2>Quick Operations</h2>
              <p>Jump directly to the areas that need attention.</p>
            </div>
            <span className="admin-quick-status">5 modules</span>
          </div>
          <div className="shortcut-list">
            <Link href="/admin/orders" className="shortcut-card shortcut-card-orders">
              <span className="shortcut-icon">↗</span>
              <span className="shortcut-card-copy">
                <strong>Review project requests</strong>
                <span>Check new orders, payment status, and technician assignments.</span>
              </span>
              <span className="shortcut-arrow">→</span>
            </Link>
            <Link href="/admin/products" className="shortcut-card shortcut-card-products">
              <span className="shortcut-icon">⚡</span>
              <span className="shortcut-card-copy">
                <strong>Manage equipment catalog</strong>
                <span>Update pricing, stock, images, discounts, and specifications.</span>
              </span>
              <span className="shortcut-arrow">→</span>
            </Link>
            <Link href="/admin/technicians" className="shortcut-card shortcut-card-technicians">
              <span className="shortcut-icon">✦</span>
              <span className="shortcut-card-copy">
                <strong>Coordinate technicians</strong>
                <span>View availability, active jobs, certifications, and field teams.</span>
              </span>
              <span className="shortcut-arrow">→</span>
            </Link>
            <Link href="/admin/companies" className="shortcut-card shortcut-card-companies">
              <span className="shortcut-icon">⌂</span>
              <span className="shortcut-card-copy">
                <strong>Manage brands & suppliers</strong>
                <span>Maintain manufacturers, company profiles, and product relationships.</span>
              </span>
              <span className="shortcut-arrow">→</span>
            </Link>
            <Link href="/admin/control" className="shortcut-card shortcut-card-control">
              <span className="shortcut-icon">⚙</span>
              <span className="shortcut-card-copy">
                <strong>Update pricing controls</strong>
                <span>Configure installation, delivery, VAT, BOS, and engineering rates.</span>
              </span>
              <span className="shortcut-arrow">→</span>
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
  link,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone: string;
  link?: string;
}) {
  const content = (
    <div className={`metric-card ${tone}`} style={{ cursor: link ? 'pointer' : 'default' }}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );

  return link ? <Link href={link} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link> : content;
}
