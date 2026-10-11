'use client';

import { usePathname } from 'next/navigation';
import { LandingPage } from '../../src/screens/LandingPage';
import { DashboardPage } from '../../src/screens/DashboardPage';
import { LeadsPage } from '../../src/screens/LeadsPage';
import { ProjectsPage } from '../../src/screens/ProjectsPage';
import { EngineeringPage } from '../../src/screens/EngineeringPage';
import { InventoryPage } from '../../src/screens/InventoryPage';
import { TicketsPage } from '../../src/screens/TicketsPage';
import { RecommendationPage } from '../../src/screens/RecommendationPage';
import { MonitoringPage } from '../../src/screens/MonitoringPage';
import { AuditPage } from '../../src/screens/AuditPage';
import { AdminPanelPage } from '../../src/screens/AdminPanelPage';
import { CustomerPanelPage } from '../../src/screens/CustomerPanelPage';
import { AdminDashboardPage } from '../../src/screens/AdminDashboardPage';
import { AuthPage } from '../../src/screens/AuthPage';
import { ProductDetailsPage } from '../../src/screens/ProductDetailsPage';
import { AppShell, ProtectedRoute } from '../../src/components/AppShell';

const adminSections: Record<string, Parameters<typeof AdminPanelPage>[0]['section']> = {
  admin: 'orders',
  users: 'users',
  orders: 'orders',
  technicians: 'technicians',
  'technician-types': 'technician_types',
  'technician-payments': 'tech_payments',
  appliances: 'appliances',
  products: 'products',
  companies: 'companies',
  categories: 'categories',
  packages: 'packages',
  control: 'settings',
};

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function Page() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (pathname === '/') return <LandingPage />;
  if (segments[0] === 'products' && segments[1]) return <ProductDetailsPage id={segments[1]} />;
  if (pathname === '/login' || pathname === '/signup') {
    return <AuthPage mode={pathname === '/signup' ? 'signup' : 'login'} />;
  }

  let content: React.ReactNode;
  switch (pathname) {
    case '/dashboard': content = <DashboardPage />; break;
    case '/leads': content = <LeadsPage />; break;
    case '/projects': content = <ProjectsPage />; break;
    case '/engineering': content = <EngineeringPage />; break;
    case '/inventory': content = <InventoryPage />; break;
    case '/tickets': content = <TicketsPage />; break;
    case '/recommendations': content = <RecommendationPage />; break;
    case '/monitoring': content = <MonitoringPage />; break;
    case '/audit': content = <AuditPage />; break;
    case '/customer': content = <CustomerPanelPage />; break;
    case '/admin/dashboard': content = <AdminDashboardPage />; break;
    default:
      if (segments[0] === 'admin' && adminSections[segments[1] || 'admin']) {
        content = <AdminPanelPage section={adminSections[segments[1] || 'admin']} />;
      } else {
        content = <LandingPage />;
      }
  }

  return <Protected><AppShell>{content}</AppShell></Protected>;
}
