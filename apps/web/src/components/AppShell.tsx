import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const adminLinks = [
  ['Control Dashboard', '/admin/dashboard'],
  ['User Management', '/admin/users'],
  ['Order Monitor', '/admin/orders'],
  ['Technicians', '/admin/technicians'],
  ['Technician Types', '/admin/technician-types'],
  ['Technician Payments', '/admin/technician-payments'],
  ['Appliance & Load', '/admin/appliances'],
  ['Products & Equipment', '/admin/products'],
  ['Companies & Brands', '/admin/companies'],
  ['Product Categories', '/admin/categories'],
  ['Solar Packages', '/admin/packages'],
  ['Control & Pricing', '/admin/control'],
  ['View Marketplace Shop', '/'],
];

const customerLinks = [
  ['Marketplace Shop', '/'],
  ['My solar journey', '/customer'],
  ['Recommendations', '/recommendations'],
  ['System monitoring', '/monitoring'],
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = localStorage.getItem('solaragent.role') === 'admin' ? 'admin' : 'customer';
  const links = role === 'admin' ? adminLinks : customerLinks;

  useEffect(() => {
    setMenuOpen(false);
    if (role === 'admin' && location.pathname === '/customer') navigate('/admin/dashboard', { replace: true });
    if (role === 'customer' && location.pathname.startsWith('/admin')) navigate('/customer', { replace: true });
  }, [location.pathname, navigate, role]);

  function signOut() {
    localStorage.removeItem('solaragent.token');
    localStorage.removeItem('solaragent.role');
    navigate('/login');
  }

  return (
    <div className={`app-shell${menuOpen ? ' mobile-menu-open' : ''}`}>
      {menuOpen && <button className="sidebar-backdrop" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
      <aside className="sidebar">
        <div className="brand-mark"><span>SA</span><div><strong>SolarAgent</strong><small>Operations platform</small></div></div>
        <nav className="nav-list" aria-label="Primary navigation">
          <span className="nav-section-label">{role === 'admin' ? 'Admin workspace' : 'Customer workspace'}</span>
          {links.map(([label, path]) => <NavLink key={path} to={path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}
        </nav>
        <div className="sidebar-bottom"><button className="nav-link nav-button" onClick={signOut}>Sign out</button></div>
      </aside>
      <section className="app-content">
        <header className="topbar"><button className="mobile-menu-toggle" type="button" aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>☰</button><div><span className="eyebrow">{role === 'admin' ? 'Admin control' : 'Customer portal'}</span><strong>{role === 'admin' ? 'Operations command center' : 'Your solar workspace'}</strong></div><div className="topbar-actions"><span className="status-dot">Connected</span><span className="avatar">{role === 'admin' ? 'AD' : 'CU'}</span></div></header>
        <div className="page-frame"><Outlet /></div>
      </section>
    </div>
  );
}

export function ProtectedRoute() {
  const token = localStorage.getItem('solaragent.token');
  return token ? <AppShell /> : <Navigate to="/login" replace />;
}
