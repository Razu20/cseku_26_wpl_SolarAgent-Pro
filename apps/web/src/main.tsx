import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/LeadsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { EngineeringPage } from './pages/EngineeringPage';
import { InventoryPage } from './pages/InventoryPage';
import { TicketsPage } from './pages/TicketsPage';
import { RecommendationPage } from './pages/RecommendationPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { AuditPage } from './pages/AuditPage';
import { AdminPanelPage } from './pages/AdminPanelPage';
import { CustomerPanelPage } from './pages/CustomerPanelPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AuthPage } from './pages/AuthPage';
import { AppShell } from './components/AppShell';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/engineering" element={<EngineeringPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/recommendations" element={<RecommendationPage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin" element={<AdminPanelPage section="orders" />} />
          <Route path="/admin/users" element={<AdminPanelPage section="users" />} />
          <Route path="/admin/orders" element={<AdminPanelPage section="orders" />} />
          <Route path="/admin/technicians" element={<AdminPanelPage section="technicians" />} />
          <Route path="/admin/technician-types" element={<AdminPanelPage section="technician_types" />} />
          <Route path="/admin/technician-payments" element={<AdminPanelPage section="tech_payments" />} />
          <Route path="/admin/appliances" element={<AdminPanelPage section="appliances" />} />
          <Route path="/admin/products" element={<AdminPanelPage section="products" />} />
          <Route path="/admin/packages" element={<AdminPanelPage section="packages" />} />
          <Route path="/admin/control" element={<AdminPanelPage section="settings" />} />
          <Route path="/customer" element={<CustomerPanelPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
