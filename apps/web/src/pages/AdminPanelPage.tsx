import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { InstallationDocumentModal } from '../components/InstallationDocumentModal';

export type AdminSection =
  | 'orders'
  | 'users'
  | 'technicians'
  | 'technician_types'
  | 'tech_payments'
  | 'appliances'
  | 'products'
  | 'companies'
  | 'categories'
  | 'packages'
  | 'settings';

interface AdminPanelPageProps {
  section?: AdminSection;
}

const ADMIN_PAGE_SIZE = 10;

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  if (pageCount <= 1) return null;
  const start = (page - 1) * ADMIN_PAGE_SIZE + 1;
  const end = Math.min(page * ADMIN_PAGE_SIZE, total);

  return (
    <div className="admin-pagination" aria-label="Pagination">
      <span>Showing {start}-{end} of {total}</span>
      <div>
        <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button>
        <strong>Page {page} of {pageCount}</strong>
        <button type="button" disabled={page === pageCount} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function AdminPanelPage({ section }: AdminPanelPageProps) {
  const [activeTab, setActiveTab] = useState<AdminSection>(section || 'orders');
  const [tablePage, setTablePage] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync tab with route property
  useEffect(() => {
    if (section) setActiveTab(section);
  }, [section]);

  // ==========================================
  // 1. ORDERS STATE & MODALS
  // ==========================================
  const [orders, setOrders] = useState<any[]>([]);
  const [orderFilterStatus, setOrderFilterStatus] = useState('all');
  const [orderFilterType, setOrderFilterType] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderDoc, setSelectedOrderDoc] = useState<any | null>(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  const [newOrderForm, setNewOrderForm] = useState({
    customerName: '',
    email: '',
    contactNumber: '',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Mirpur',
    village: 'Mirpur-10',
    address: '',
    projectType: 'solar',
    systemType: 'on-grid',
    capacityKwp: 3.5,
    totalAmount: 265000,
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    status: 'submitted',
    technicianId: '',
    notes: '',
  });

  // ==========================================
  // 2. USERS STATE & MODALS
  // ==========================================
  const [users, setUsers] = useState<any[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [selectedUserDetails, setSelectedUserDetails] = useState<any | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    email: '',
    password: 'password123',
    role: 'customer',
    contactNumber: '',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Mirpur',
    village: 'Mirpur-10',
  });

  // ==========================================
  // 3. TECHNICIANS & TYPES STATE & MODALS
  // ==========================================
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [technicianTypes, setTechnicianTypes] = useState<any[]>([]);
  const [techSearch, setTechSearch] = useState('');
  const [techAvailabilityFilter, setTechAvailabilityFilter] = useState('all');
  const [showCreateTechModal, setShowCreateTechModal] = useState(false);
  const [editingTech, setEditingTech] = useState<any | null>(null);
  const [selectedTechOrders, setSelectedTechOrders] = useState<any[] | null>(null);
  const [selectedTechName, setSelectedTechName] = useState('');

  const [newTech, setNewTech] = useState({
    name: '',
    contactNumber: '',
    email: '',
    address: '',
    technicianTypeId: '',
    serviceArea: 'Dhaka Division',
    experienceYears: 3,
    availability: 'available',
  });

  // Technician Types
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);
  const [newType, setNewType] = useState({ name: '', code: '', description: '' });

  // ==========================================
  // 4. TECHNICIAN PAYMENTS STATE & MODALS
  // ==========================================
  const [techPayments, setTechPayments] = useState<any[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);

  const [newTechPayment, setNewTechPayment] = useState({
    technicianId: '',
    orderId: '',
    amount: 5000,
    paymentType: 'fixed_commission',
    method: 'bank_transfer',
    reference: '',
    notes: '',
  });

  // ==========================================
  // 5. APPLIANCES STATE & MODALS
  // ==========================================
  const [appliances, setAppliances] = useState<any[]>([]);
  const [applianceCategoryFilter, setApplianceCategoryFilter] = useState('all');
  const [applianceSearch, setApplianceSearch] = useState('');
  const [showCreateApplianceModal, setShowCreateApplianceModal] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<any | null>(null);

  const [newAppliance, setNewAppliance] = useState({
    name: '',
    category: 'Cooling',
    ratedPowerW: 1500,
    defaultHours: 6,
    surgePowerW: 3000,
    description: '',
  });

  // ==========================================
  // 6. PRODUCTS, COMPANIES & CATEGORIES STATE & MODALS
  // ==========================================
  const [products, setProducts] = useState<any[]>([]);
  const [productCompanyFilter, setProductCompanyFilter] = useState('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    brand: '',
    company: '',
    companyId: '',
    model: '',
    category: 'Solar Panel',
    categoryId: '',
    wattage: 550,
    capacity: 550,
    capacityUnit: 'W',
    price: 18500,
    discountPrice: 0,
    dimensions: '2278 × 1134 × 35 mm',
    efficiency: 21.3,
    warranty: '25 years performance',
    stock: 50,
    availability: 'in_stock',
    featured: false,
    image: '',
    galleryImagesText: '',
    currency: 'BDT',
    unit: 'piece',
    status: 'approved',
    description: '',
  });

  // Companies Management State
  const [companies, setCompanies] = useState<any[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    logo: '',
    description: '',
    website: '',
    country: 'China',
    contactInformation: '',
    status: 'active',
  });

  // Categories Management State
  const [categories, setCategories] = useState<any[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '☀️',
    image: '',
    status: 'active',
  });

  // ==========================================
  // 7. PACKAGES STATE & MODALS
  // ==========================================
  const [packages, setPackages] = useState<any[]>([]);
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any | null>(null);

  const [newPackage, setNewPackage] = useState({
    name: '',
    description: '',
    systemType: 'on-grid',
    capacityKwp: 3.0,
    totalPrice: 220000,
    expectedGenerationMonthlyKwh: 360,
    panelQuantity: 6,
    installationPrice: 20000,
    warranty: '5 yr system / 25 yr panel',
    suitableProfile: 'Urban rooftop residence',
  });

  // ==========================================
  // 8. CONTROL PAGE (PRICING, COSTS & LABELS)
  // ==========================================
  const [settings, setSettings] = useState<any>({
    pricing_settings: {
      // 1. Installation Price & Label
      baseInstallationRatePerKwp: 6000,
      installationPriceLabel: 'Turnkey Installation & Engineering Commissioning',

      // 2. Delivery Cost & Label
      deliveryBaseCost: 3500,
      deliveryCostLabel: 'Regional Logistics & Secure Site Transport Fee',

      // 3. Setup Cost & Label
      setupAndEngineeringFee: 5000,
      setupCostLabel: 'System Architecture Design & Grid Net-Metering Setup',

      // 4. Component Cost & Label
      componentCostPerKwp: 4500,
      componentCostLabel: 'Balance of System (BOS), SPD & Safety Disconnects',

      // 5. Documentation & Labels
      documentationAndNemFee: 4000,
      documentationLabel: 'Engineering Drawing & SREDA Net-Metering Documentation',
      documentationTermsLabel: 'Standard Warranty & Interconnection Agreement Terms',
      documentationTerms:
        'Turnkey solar installation governed by BPDB / SREDA Net Energy Metering (NEM) guidelines, 5-year comprehensive workmanship warranty, and BNBC 2020 structural safety compliance.',
      complianceNoticeLabel: 'Technical Standards & Quality Certification Notice',
      complianceNotice:
        'All solar PV modules conform to IEC 61215 / IEC 61730; Inverters certified IEC 62109 / UL 1741; DC surge arrestors certified Type II IEC 61643-31.',

      // 6. Tax & Promo
      vatTaxPercent: 5.0,
      defaultPromotionalDiscountPercent: 2.0,
      currency: 'BDT',
    },
    system_settings: {
      defaultPeakSunHours: 4.2,
      systemPerformanceRatio: 0.8,
      defaultElectricityTariffBdtKwh: 8.5,
      batteryAutonomyDaysDefault: 1.5,
    },
    doc_settings: {
      organizationName: 'SolarAgent Pro Bangladesh Ltd.',
      helplineNumber: '+880 9612-SOLAR (76527)',
      supportEmail: 'support@solaragent.com.bd',
      corporateOffice: 'Level 9, Green Energy Tower, Banani, Dhaka-1213',
    },
  });

  useEffect(() => {
    setTablePage(1);
  }, [
    activeTab,
    orderFilterStatus,
    orderFilterType,
    orderSearch,
    userSearch,
    userRoleFilter,
    techSearch,
    techAvailabilityFilter,
    productSearch,
    productCompanyFilter,
    productCategoryFilter,
    companySearch,
    categorySearch,
    applianceSearch,
    applianceCategoryFilter,
    paymentSearch,
    paymentStatusFilter,
  ]);

  // Load Data on Tab or filter change
  useEffect(() => {
    void loadData();
  }, [
    activeTab,
    orderFilterStatus,
    orderFilterType,
    orderSearch,
    userPage,
    userRoleFilter,
    userSearch,
  ]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const [ordersRes, techRes] = await Promise.all([
          api<{ orders: any[] }>(
            `/admin/orders?status=${orderFilterStatus}&projectType=${orderFilterType}&search=${encodeURIComponent(orderSearch)}`
          ),
          api<{ technicians: any[] }>('/admin/technicians'),
        ]);
        setOrders(ordersRes.orders);
        setTechnicians(techRes.technicians);
      } else if (activeTab === 'users') {
        const res = await api<{ users: any[]; total: number }>(
          `/admin/users?page=${userPage}&role=${userRoleFilter}&query=${encodeURIComponent(userSearch)}`
        );
        setUsers(res.users);
        setUserTotal(res.total);
      } else if (activeTab === 'technicians' || activeTab === 'technician_types') {
        const [techRes, typeRes] = await Promise.all([
          api<{ technicians: any[] }>('/admin/technicians'),
          api<{ technicianTypes: any[] }>('/admin/technician-types'),
        ]);
        setTechnicians(techRes.technicians);
        setTechnicianTypes(typeRes.technicianTypes);
      } else if (activeTab === 'tech_payments') {
        const [paymentsRes, techRes, ordersRes] = await Promise.all([
          api<{ payments: any[] }>('/admin/technician-payments'),
          api<{ technicians: any[] }>('/admin/technicians'),
          api<{ orders: any[] }>('/admin/orders'),
        ]);
        setTechPayments(paymentsRes.payments);
        setTechnicians(techRes.technicians);
        setOrders(ordersRes.orders);
      } else if (activeTab === 'appliances') {
        const res = await api<{ appliances: any[] }>('/admin/appliances');
        setAppliances(res.appliances);
      } else if (activeTab === 'companies') {
        const res = await api<{ companies: any[] }>('/admin/companies');
        setCompanies(res.companies);
      } else if (activeTab === 'categories') {
        const res = await api<{ categories: any[] }>('/admin/categories');
        setCategories(res.categories);
      } else if (activeTab === 'products') {
        const [prodRes, compRes, catRes] = await Promise.all([
          api<{ products: any[] }>('/admin/products'),
          api<{ companies: any[] }>('/admin/companies'),
          api<{ categories: any[] }>('/admin/categories'),
        ]);
        setProducts(prodRes.products);
        setCompanies(compRes.companies);
        setCategories(catRes.categories);
      } else if (activeTab === 'packages') {
        const [pkgRes, prodRes] = await Promise.all([
          api<{ packages: any[] }>('/admin/packages'),
          api<{ products: any[] }>('/admin/products'),
        ]);
        setPackages(pkgRes.packages);
        setProducts(prodRes.products);
      } else if (activeTab === 'settings') {
        const res = await api<{ settings: any }>('/admin/settings');
        if (res.settings) {
          setSettings((prev: any) => ({
            ...prev,
            ...res.settings,
            pricing_settings: {
              ...prev.pricing_settings,
              ...(res.settings.pricing_settings || {}),
            },
          }));
        }
      }
    } catch (err) {
      setMessage((err as Error).message || 'Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // ORDER ACTIONS
  // ==========================================
  async function createOrder(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/orders', {
        method: 'POST',
        body: JSON.stringify(newOrderForm),
      });
      setMessage('New order successfully created and logged.');
      setShowCreateOrderModal(false);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function updateOrder(e: FormEvent) {
    e.preventDefault();
    if (!editingOrder) return;
    try {
      await api(`/admin/orders/${editingOrder.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: editingOrder.status,
          technicianId: editingOrder.technicianId || null,
          scheduledDate: editingOrder.scheduledDate,
          paymentStatus: editingOrder.paymentStatus,
          notes: editingOrder.notes,
        }),
      });
      setMessage('Order updated successfully.');
      setEditingOrder(null);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function deleteOrder(orderId: string) {
    if (!confirm('Are you sure you want to permanently delete this order?')) return;
    try {
      await api(`/admin/orders/${orderId}`, { method: 'DELETE' });
      setMessage('Order deleted successfully.');
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function verifyCodPayment(orderId: string) {
    try {
      await api(`/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus: 'verified', status: 'confirmed' }),
      });
      setMessage('Cash on Delivery payment verified & order confirmed.');
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  // ==========================================
  // USER ACTIONS
  // ==========================================
  async function createUser(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUserForm),
      });
      setMessage('New user account registered successfully.');
      setShowCreateUserModal(false);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function updateUser(e: FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api(`/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editingUser.fullName,
          contactNumber: editingUser.contactNumber,
          role: editingUser.role,
          isActive: editingUser.isActive,
        }),
      });
      setMessage('User updated successfully.');
      setEditingUser(null);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await api(`/admin/users/${userId}`, { method: 'DELETE' });
      setMessage('User deleted.');
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function toggleUserActive(userId: string, currentActive: boolean) {
    try {
      await api(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentActive }),
      });
      setMessage(`User account ${!currentActive ? 'activated' : 'suspended'}.`);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function viewUserDetails(userId: string) {
    try {
      const res = await api<{ user: any; orders: any[]; requests: any[] }>(`/admin/users/${userId}`);
      setSelectedUserDetails(res);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  // ==========================================
  // TECHNICIAN & TYPE ACTIONS
  // ==========================================
  async function createTechnician(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/technicians', {
        method: 'POST',
        body: JSON.stringify(newTech),
      });
      setMessage('New certified technician registered successfully.');
      setShowCreateTechModal(false);
      setNewTech({
        name: '',
        contactNumber: '',
        email: '',
        address: '',
        technicianTypeId: '',
        serviceArea: 'Dhaka Division',
        experienceYears: 3,
        availability: 'available',
      });
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function updateTechnician(e: FormEvent) {
    e.preventDefault();
    if (!editingTech) return;
    try {
      await api(`/admin/technicians/${editingTech.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editingTech),
      });
      setMessage('Technician details updated.');
      setEditingTech(null);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function deleteTechnician(id: string) {
    if (!confirm('Deactivate this technician?')) return;
    try {
      await api(`/admin/technicians/${id}`, { method: 'DELETE' });
      setMessage('Technician status updated to inactive.');
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function viewTechOrders(techId: string, techName: string) {
    try {
      const res = await api<{ orders: any[] }>(`/admin/technicians/${techId}/orders`);
      setSelectedTechOrders(res.orders);
      setSelectedTechName(techName);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  // Technician Types
  async function createTechnicianType(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/technician-types', {
        method: 'POST',
        body: JSON.stringify(newType),
      });
      setMessage('Technician type category created.');
      setShowCreateTypeModal(false);
      setNewType({ name: '', code: '', description: '' });
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function updateTechnicianType(e: FormEvent) {
    e.preventDefault();
    if (!editingType) return;
    try {
      await api(`/admin/technician-types/${editingType.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editingType),
      });
      setMessage('Technician type updated.');
      setEditingType(null);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function deleteTechnicianType(id: string) {
    if (!confirm('Permanently delete this technician type?')) return;
    try {
      await api(`/admin/technician-types/${id}`, { method: 'DELETE' });
      setMessage('Technician type deleted.');
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  // ==========================================
  // TECHNICIAN PAYMENT ACTIONS
  // ==========================================
  async function createPayment(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/technician-payments', {
        method: 'POST',
        body: JSON.stringify(newTechPayment),
      });
      setMessage('Technician payment voucher recorded.');
      setShowCreatePaymentModal(false);
      setNewTechPayment({
        technicianId: '',
        orderId: '',
        amount: 5000,
        paymentType: 'fixed_commission',
        method: 'bank_transfer',
        reference: '',
        notes: '',
      });
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function updatePayment(e: FormEvent) {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      await api(`/admin/technician-payments/${editingPayment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          amount: Number(editingPayment.amount),
          status: editingPayment.status,
          method: editingPayment.method,
          reference: editingPayment.reference,
          notes: editingPayment.notes,
        }),
      });
      setMessage('Payment voucher updated.');
      setEditingPayment(null);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function deletePayment(id: string) {
    if (!confirm('Permanently delete this technician payment voucher?')) return;
    try {
      await api(`/admin/technician-payments/${id}`, { method: 'DELETE' });
      setMessage('Payment voucher deleted.');
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  // ==========================================
  // APPLIANCE ACTIONS
  // ==========================================
  async function createAppliance(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/appliances', {
        method: 'POST',
        body: JSON.stringify(newAppliance),
      });
      setMessage('Appliance added to load schedule catalog.');
      setShowCreateApplianceModal(false);
      setNewAppliance({
        name: '',
        category: 'Cooling',
        ratedPowerW: 1500,
        defaultHours: 6,
        surgePowerW: 3000,
        description: '',
      });
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function updateAppliance(e: FormEvent) {
    e.preventDefault();
    if (!editingAppliance) return;
    try {
      await api(`/admin/appliances/${editingAppliance.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingAppliance.name,
          category: editingAppliance.category,
          ratedPowerW: Number(editingAppliance.ratedPowerW),
          defaultHours: Number(editingAppliance.defaultHours),
          surgePowerW: editingAppliance.surgePowerW ? Number(editingAppliance.surgePowerW) : undefined,
          description: editingAppliance.description,
          active: editingAppliance.active,
        }),
      });
      setMessage('Appliance updated.');
      setEditingAppliance(null);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function deleteAppliance(id: string) {
    if (!confirm('Deactivate this appliance?')) return;
    try {
      await api(`/admin/appliances/${id}`, { method: 'DELETE' });
      setMessage('Appliance deactivated.');
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  // ==========================================
  // COMPANY ACTIONS (Section 11)
  // ==========================================
  async function createCompany(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/companies', {
        method: 'POST',
        body: JSON.stringify(newCompany),
      });
      setMessage('Company/brand added successfully.');
      setShowCreateCompanyModal(false);
      setNewCompany({
        name: '',
        logo: '',
        description: '',
        website: '',
        country: 'China',
        contactInformation: '',
        status: 'active',
      });
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function updateCompany(e: FormEvent) {
    e.preventDefault();
    if (!editingCompany) return;
    try {
      await api(`/admin/companies/${editingCompany.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingCompany.name,
          logo: editingCompany.logo,
          description: editingCompany.description,
          website: editingCompany.website,
          country: editingCompany.country,
          contactInformation: editingCompany.contactInformation,
          status: editingCompany.status,
        }),
      });
      setMessage('Company updated successfully.');
      setEditingCompany(null);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function deleteCompany(id: string) {
    if (!confirm('Permanently delete this company?')) return;
    try {
      await api(`/admin/companies/${id}`, { method: 'DELETE' });
      setMessage('Company deleted.');
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  // ==========================================
  // CATEGORY ACTIONS (Section 12)
  // ==========================================
  async function createCategory(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          ...newCategory,
          slug: newCategory.slug || newCategory.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        }),
      });
      setMessage('Category created successfully.');
      setShowCreateCategoryModal(false);
      setNewCategory({
        name: '',
        slug: '',
        description: '',
        icon: '☀️',
        image: '',
        status: 'active',
      });
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function updateCategory(e: FormEvent) {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await api(`/admin/categories/${editingCategory.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingCategory.name,
          slug: editingCategory.slug,
          description: editingCategory.description,
          icon: editingCategory.icon,
          image: editingCategory.image,
          status: editingCategory.status,
        }),
      });
      setMessage('Category updated.');
      setEditingCategory(null);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Permanently delete this category?')) return;
    try {
      await api(`/admin/categories/${id}`, { method: 'DELETE' });
      setMessage('Category deleted.');
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  // ==========================================
  // PRODUCT CATALOG ACTIONS (DIFFERENT COMPANIES)
  // ==========================================
  async function createProduct(e: FormEvent) {
    e.preventDefault();
    try {
      const gallery = newProduct.galleryImagesText
        ? newProduct.galleryImagesText.split('\n').map((s) => s.trim()).filter(Boolean)
        : [];

      await api('/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: newProduct.sku,
          name: newProduct.name,
          brand: newProduct.brand,
          company: newProduct.company || newProduct.brand,
          companyId: newProduct.companyId || null,
          model: newProduct.model,
          category: newProduct.category,
          categoryId: newProduct.categoryId || null,
          wattage: Number(newProduct.wattage || 0),
          capacity: Number(newProduct.capacity || newProduct.wattage || 0),
          capacityUnit: newProduct.capacityUnit || 'W',
          price: Number(newProduct.price),
          discountPrice: newProduct.discountPrice ? Number(newProduct.discountPrice) : null,
          dimensions: newProduct.dimensions,
          efficiency: newProduct.efficiency ? Number(newProduct.efficiency) : null,
          warranty: newProduct.warranty,
          stock: Number(newProduct.stock || 0),
          availability: newProduct.availability,
          featured: Boolean(newProduct.featured),
          image: newProduct.image,
          galleryImages: gallery,
          currency: newProduct.currency || 'BDT',
          unit: newProduct.unit || 'piece',
          status: newProduct.status,
          description: newProduct.description,
        }),
      });
      setMessage('Hardware product added to catalog.');
      setShowCreateProductModal(false);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function updateProduct(e: FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const gallery = typeof editingProduct.galleryImagesText === 'string'
        ? editingProduct.galleryImagesText.split('\n').map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(editingProduct.galleryImages)
        ? editingProduct.galleryImages
        : [];

      await api(`/admin/products/${editingProduct.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          sku: editingProduct.sku,
          name: editingProduct.name,
          brand: editingProduct.brand,
          company: editingProduct.company?.name || editingProduct.company || editingProduct.brand,
          companyId: editingProduct.companyId || null,
          model: editingProduct.model,
          category: editingProduct.category,
          categoryId: editingProduct.categoryId || null,
          wattage: Number(editingProduct.wattage || 0),
          capacity: Number(editingProduct.capacity || editingProduct.wattage || 0),
          capacityUnit: editingProduct.capacityUnit || 'W',
          price: Number(editingProduct.price),
          discountPrice: editingProduct.discountPrice ? Number(editingProduct.discountPrice) : null,
          dimensions: editingProduct.dimensions,
          efficiency: editingProduct.efficiency ? Number(editingProduct.efficiency) : null,
          warranty: editingProduct.warranty,
          stock: Number(editingProduct.stock || 0),
          availability: editingProduct.availability,
          featured: Boolean(editingProduct.featured),
          image: editingProduct.image,
          galleryImages: gallery,
          currency: editingProduct.currency || 'BDT',
          unit: editingProduct.unit || 'piece',
          status: editingProduct.status,
          description: editingProduct.description,
        }),
      });
      setMessage('Product updated successfully.');
      setEditingProduct(null);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Permanently delete this hardware product?')) return;
    try {
      await api(`/admin/products/${id}`, { method: 'DELETE' });
      setMessage('Product removed from catalog.');
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  // Distinct company/brand names for filtering
  const companyList = Array.from(
    new Set([
      ...companies.map((c) => c.name),
      ...products.map((p) => (typeof p.company === 'object' ? p.company?.name : p.company || p.brand)),
    ].filter((b): b is string => Boolean(b && b.trim())))
  ).sort();

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const pComp = typeof p.company === 'object' ? p.company?.name : p.company || p.brand;
    const pCat = typeof p.categoryItem === 'object' ? p.categoryItem?.name : p.category;
    if (productCompanyFilter !== 'all' && pComp !== productCompanyFilter && p.brand !== productCompanyFilter) return false;
    if (productCategoryFilter !== 'all' && pCat !== productCategoryFilter && p.category !== productCategoryFilter) return false;
    if (productSearch) {
      const q = productSearch.toLowerCase();
      const matchSku = p.sku?.toLowerCase().includes(q);
      const matchName = p.name?.toLowerCase().includes(q);
      const matchBrand = (pComp || p.brand)?.toLowerCase().includes(q);
      const matchModel = p.model?.toLowerCase().includes(q);
      if (!matchSku && !matchName && !matchBrand && !matchModel) return false;
    }
    return true;
  });

  const filteredCompanies = companies.filter((c) => {
    if (!companySearch) return true;
    const q = companySearch.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.country?.toLowerCase().includes(q);
  });

  const filteredCategories = categories.filter((c) => {
    if (!categorySearch) return true;
    const q = categorySearch.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.slug?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
  });

  const pageItems = <T,>(items: T[]) => items.slice((tablePage - 1) * ADMIN_PAGE_SIZE, tablePage * ADMIN_PAGE_SIZE);
  const pagedOrders = pageItems(orders);
  const pagedUsers = pageItems(users);
  const pagedTechnicians = pageItems(technicians);
  const pagedTechnicianTypes = pageItems(technicianTypes);
  const pagedTechPayments = pageItems(techPayments);
  const pagedAppliances = pageItems(appliances);
  const pagedProducts = pageItems(filteredProducts);
  const pagedCompanies = pageItems(filteredCompanies);
  const pagedCategories = pageItems(filteredCategories);
  const pagedPackages = pageItems(packages);

  // ==========================================
  // PACKAGE ACTIONS
  // ==========================================
  async function createPackage(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/packages', {
        method: 'POST',
        body: JSON.stringify(newPackage),
      });
      setMessage('Package created successfully.');
      setShowCreatePackageModal(false);
      setNewPackage({
        name: '',
        description: '',
        systemType: 'on-grid',
        capacityKwp: 3.0,
        totalPrice: 220000,
        expectedGenerationMonthlyKwh: 360,
        panelQuantity: 6,
        installationPrice: 20000,
        warranty: '5 yr system / 25 yr panel',
        suitableProfile: 'Urban rooftop residence',
      });
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function updatePackage(e: FormEvent) {
    e.preventDefault();
    if (!editingPackage) return;
    try {
      await api(`/admin/packages/${editingPackage.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingPackage.name,
          description: editingPackage.description,
          systemType: editingPackage.systemType,
          capacityKwp: Number(editingPackage.capacityKwp),
          totalPrice: Number(editingPackage.totalPrice),
          expectedGenerationMonthlyKwh: Number(editingPackage.expectedGenerationMonthlyKwh),
          panelQuantity: Number(editingPackage.panelQuantity),
          installationPrice: Number(editingPackage.installationPrice),
          warranty: editingPackage.warranty,
          suitableProfile: editingPackage.suitableProfile,
          active: editingPackage.active,
        }),
      });
      setMessage('Package updated.');
      setEditingPackage(null);
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function deletePackage(id: string) {
    if (!confirm('Deactivate this package?')) return;
    try {
      await api(`/admin/packages/${id}`, { method: 'DELETE' });
      setMessage('Package deactivated.');
      void loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  // ==========================================
  // CONTROL PAGE (PRICING & LABELS SAVE)
  // ==========================================
  async function saveControlSettings() {
    try {
      await api('/admin/settings/pricing_settings', {
        method: 'PATCH',
        body: JSON.stringify({
          category: 'pricing',
          data: settings.pricing_settings,
        }),
      });
      setMessage('✅ All pricing rates, costs, documentation terms & custom labels updated successfully!');
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <div className="admin-page">
      {/* Top Notification Banner */}
      {message && (
        <div className="info-banner" style={{ marginBottom: '16px', background: '#ebf8ff', color: '#2b6cb0', border: '1px solid #bee3f8', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{message}</span>
          <button className="text-button" onClick={() => setMessage('')} type="button" style={{ padding: '0 8px' }}>✕</button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#718096', fontSize: '13px' }}>
          ⏳ Fetching operational registry data...
        </div>
      )}

      {/* Admin Tab Navigation Bar */}
      <div className="admin-nav-tabs-bar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
        {[
          { id: 'orders', label: '📋 Orders & Requests', count: orders.length },
          { id: 'users', label: '👥 Users', count: userTotal || users.length },
          { id: 'products', label: '⚡ Products & Hardware', count: products.length },
          { id: 'companies', label: '🏢 Companies / Brands', count: companies.length },
          { id: 'categories', label: '📦 Categories', count: categories.length },
          { id: 'packages', label: '🎁 Turnkey Packages', count: packages.length },
          { id: 'appliances', label: '🔌 Appliances', count: appliances.length },
          { id: 'technicians', label: '👷 Technicians', count: technicians.length },
          { id: 'tech_payments', label: '💳 Disbursements', count: techPayments.length },
          { id: 'settings', label: '⚙ Pricing & Control' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-tab-chip ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id as AdminSection);
              window.history.pushState(null, '', tab.id === 'orders' ? '/admin/orders' : tab.id === 'settings' ? '/admin/control' : `/admin/${tab.id}`);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: activeTab === tab.id ? '2px solid #1d4ed8' : '1.5px solid #cbd5e1',
              background: activeTab === tab.id ? '#1d4ed8' : '#ffffff',
              color: activeTab === tab.id ? '#ffffff' : '#334155',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(29, 78, 216, 0.35)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{ fontSize: '11px', background: activeTab === tab.id ? '#fbbf24' : '#e2e8f0', color: activeTab === tab.id ? '#0f172a' : '#475569', fontWeight: 800, padding: '1px 7px', borderRadius: '10px' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 1. ORDER MONITOR PAGE (CRUD)                                             */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <section className="panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Operational Monitor</span>
              <h2>Customer Order Pipeline & Fulfillment ({orders.length})</h2>
            </div>
            <button className="primary-button" onClick={() => setShowCreateOrderModal(true)} type="button">
              + Manual Order Entry
            </button>
          </div>

          {/* Filters Bar */}
          <div className="filters-bar" style={{ display: 'flex', gap: '10px', margin: '16px 0', flexWrap: 'wrap' }}>
            <input
              placeholder="Search by Order #, Customer, Phone, District..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              style={{ flex: 1, minWidth: '220px' }}
            />
            <select value={orderFilterStatus} onChange={(e) => setOrderFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="confirmed">Confirmed</option>
              <option value="site_survey_scheduled">Site Survey Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={orderFilterType} onChange={(e) => setOrderFilterType(e.target.value)}>
              <option value="all">All Tech Types</option>
              <option value="solar">Solar PV</option>
              <option value="wind">Windmill</option>
              <option value="hybrid">Solar + Wind Hybrid</option>
            </select>
          </div>

          <table className="doc-table-bordered">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer & Location</th>
                <th>System & Tech</th>
                <th>Total Value</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Assigned Tech</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#a0aec0' }}>
                    No orders matching selected criteria.
                  </td>
                </tr>
              ) : (
                pagedOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNumber}</strong>
                      <div style={{ fontSize: '11px', color: '#718096' }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <strong>{order.customerName}</strong>
                      <div style={{ fontSize: '12px', color: '#4a5568' }}>
                        📞 {order.contactNumber}
                      </div>
                      <div style={{ fontSize: '11px', color: '#718096' }}>
                        {order.village}, {order.upazila}, {order.district}
                      </div>
                    </td>
                    <td>
                      <span className="pill">{order.projectType?.toUpperCase()}</span>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {order.configuration?.system || 'On-Grid'} · {order.configuration?.capacityKwp || 3.0} kWp
                      </div>
                    </td>
                    <td>
                      <strong>BDT {Number(order.totalAmount).toLocaleString()}</strong>
                    </td>
                    <td>
                      <span className={`pill ${order.paymentStatus === 'paid' || order.paymentStatus === 'verified' ? 'success' : ''}`}>
                        {order.paymentStatus?.toUpperCase()}
                      </span>
                      <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>
                        Via {order.paymentMethod?.toUpperCase()}
                      </div>
                      {order.paymentMethod === 'cod' && order.paymentStatus === 'pending' && (
                        <button
                          className="secondary-button"
                          onClick={() => verifyCodPayment(order.id)}
                          type="button"
                          style={{ marginTop: '4px', fontSize: '11px', padding: '3px 8px' }}
                        >
                          Verify COD
                        </button>
                      )}
                    </td>
                    <td>
                      <span className="pill success">
                        {order.status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {order.technician ? (
                        <div>
                          <strong>{order.technician.name}</strong>
                          <div style={{ fontSize: '11px', color: '#718096' }}>{order.technician.contactNumber}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#e53e3e', fontSize: '12px' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="secondary-button"
                          onClick={() => setSelectedOrderDoc(order)}
                          type="button"
                          title="View Full Turnkey BOM & Spec Document"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          📄 Doc
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => setEditingOrder({ ...order })}
                          type="button"
                          title="Edit Order"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="text-button"
                          onClick={() => deleteOrder(order.id)}
                          type="button"
                          title="Delete Order"
                          style={{ color: '#e53e3e', padding: '4px 8px', fontSize: '12px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination page={tablePage} total={orders.length} onChange={setTablePage} />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. USER MANAGEMENT PAGE                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <section className="panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Access & Stakeholder Management</span>
              <h2>Registered Users & Clients ({userTotal})</h2>
            </div>
            <button className="primary-button" onClick={() => setShowCreateUserModal(true)} type="button">
              + Create User
            </button>
          </div>

          <div className="filters-bar" style={{ display: 'flex', gap: '10px', margin: '16px 0', flexWrap: 'wrap' }}>
            <input
              placeholder="Search by name, email, phone, district..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ flex: 1, minWidth: '220px' }}
            />
            <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="customer">Customers</option>
              <option value="admin">Administrators</option>
            </select>
          </div>

          <table className="doc-table-bordered">
            <thead>
              <tr>
                <th>User Profile</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Location Hierarchy</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.fullName || 'Anonymous'}</strong>
                    <div style={{ fontSize: '12px', color: '#718096' }}>{user.email}</div>
                  </td>
                  <td>
                    <span className={`pill ${user.role === 'admin' ? 'success' : ''}`}>
                      {user.role?.toUpperCase()}
                    </span>
                  </td>
                  <td>📞 {user.contactNumber || 'N/A'}</td>
                  <td>
                    {user.division ? `${user.division} > ${user.district} > ${user.upazila || ''}` : 'Location unconfigured'}
                  </td>
                  <td>
                    <span className={`pill ${user.isActive ? 'success' : ''}`}>
                      {user.isActive ? 'ACTIVE' : 'SUSPENDED'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="secondary-button"
                        onClick={() => viewUserDetails(user.id)}
                        type="button"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        Profile
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => setEditingUser({ ...user })}
                        type="button"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => toggleUserActive(user.id, user.isActive)}
                        type="button"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        {user.isActive ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        className="text-button"
                        onClick={() => deleteUser(user.id)}
                        type="button"
                        style={{ color: '#e53e3e', padding: '4px 8px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={tablePage} total={users.length} onChange={setTablePage} />

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button className="secondary-button" disabled={userPage <= 1} onClick={() => setUserPage((p) => p - 1)}>
              &larr; Prev
            </button>
            <span style={{ alignSelf: 'center', fontSize: '13px' }}>Page {userPage}</span>
            <button className="secondary-button" disabled={users.length < 15} onClick={() => setUserPage((p) => p + 1)}>
              Next &rarr;
            </button>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. TECHNICIAN MANAGEMENT PAGE (CRUD)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'technicians' && (
        <section className="panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Field Engineering Force</span>
              <h2>Certified Field Technicians ({technicians.length})</h2>
            </div>
            <button className="primary-button" onClick={() => setShowCreateTechModal(true)} type="button">
              + Register Technician
            </button>
          </div>

          <table className="doc-table-bordered" style={{ marginTop: '16px' }}>
            <thead>
              <tr>
                <th>Technician</th>
                <th>Trade Type</th>
                <th>Contact</th>
                <th>Service Division</th>
                <th>Experience</th>
                <th>Availability</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedTechnicians.map((tech) => (
                <tr key={tech.id}>
                  <td>
                    <strong>{tech.name}</strong>
                    <div style={{ fontSize: '11px', color: '#718096' }}>{tech.email}</div>
                  </td>
                  <td>
                    <span className="pill">{tech.technicianType?.name || 'Solar PV Installer'}</span>
                  </td>
                  <td>📞 {tech.contactNumber}</td>
                  <td>{tech.serviceArea || 'Dhaka'}</td>
                  <td>{tech.experienceYears} Years</td>
                  <td>
                    <span className={`pill ${tech.availability === 'available' ? 'success' : ''}`}>
                      {tech.availability?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${tech.active ? 'success' : ''}`}>
                      {tech.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="secondary-button"
                        onClick={() => viewTechOrders(tech.id, tech.name)}
                        type="button"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        Orders
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => setEditingTech({ ...tech })}
                        type="button"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-button"
                        onClick={() => deleteTechnician(tech.id)}
                        type="button"
                        style={{ color: '#e53e3e', padding: '4px 8px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={tablePage} total={technicians.length} onChange={setTablePage} />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. TECHNICIAN TYPES (CRUD)                                               */}
      {/* ========================================================================= */}
      {activeTab === 'technician_types' && (
        <section className="panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Field Specializations</span>
              <h2>Technician Types & Certification Roles ({technicianTypes.length})</h2>
            </div>
            <button className="primary-button" onClick={() => setShowCreateTypeModal(true)} type="button">
              + New Technician Type
            </button>
          </div>

          <table className="doc-table-bordered" style={{ marginTop: '16px' }}>
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Trade Code</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedTechnicianTypes.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong></td>
                  <td><code>{t.code}</code></td>
                  <td>{t.description || 'No description provided'}</td>
                  <td>
                    <span className={`pill ${t.active ? 'success' : ''}`}>
                      {t.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="secondary-button"
                        onClick={() => setEditingType({ ...t })}
                        type="button"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-button"
                        onClick={() => deleteTechnicianType(t.id)}
                        type="button"
                        style={{ color: '#e53e3e', padding: '4px 8px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={tablePage} total={technicianTypes.length} onChange={setTablePage} />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 5. TECHNICIAN PAYMENT MANAGEMENT (CRUD)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'tech_payments' && (
        <section className="panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Financial Disbursements</span>
              <h2>Technician Compensation & Ledger ({techPayments.length})</h2>
            </div>
            <button className="primary-button" onClick={() => setShowCreatePaymentModal(true)} type="button">
              + Issue Payment Voucher
            </button>
          </div>

          <table className="doc-table-bordered" style={{ marginTop: '16px' }}>
            <thead>
              <tr>
                <th>Voucher / Trx</th>
                <th>Technician</th>
                <th>Amount (BDT)</th>
                <th>Type</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedTechPayments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code>{p.id.slice(0, 8)}</code>
                    <div style={{ fontSize: '11px', color: '#718096' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <strong>{p.technician?.name || 'Technician'}</strong>
                    <div style={{ fontSize: '11px', color: '#718096' }}>
                      📞 {p.technician?.contactNumber}
                    </div>
                  </td>
                  <td><strong>BDT {Number(p.amount).toLocaleString()}</strong></td>
                  <td><span className="pill">{p.paymentType?.replace(/_/g, ' ').toUpperCase()}</span></td>
                  <td>{p.method?.toUpperCase()}</td>
                  <td><code>{p.reference || 'N/A'}</code></td>
                  <td>
                    <span className={`pill ${p.status === 'paid' ? 'success' : ''}`}>
                      {p.status?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="secondary-button"
                        onClick={() => setEditingPayment({ ...p })}
                        type="button"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-button"
                        onClick={() => deletePayment(p.id)}
                        type="button"
                        style={{ color: '#e53e3e', padding: '4px 8px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={tablePage} total={techPayments.length} onChange={setTablePage} />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 6. APPLIANCE & LOAD MANAGEMENT (CRUD)                                    */}
      {/* ========================================================================= */}
      {activeTab === 'appliances' && (
        <section className="panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Electrical Engineering Parameters</span>
              <h2>Appliance Load Schedules & Surge Ratings ({appliances.length})</h2>
            </div>
            <button className="primary-button" onClick={() => setShowCreateApplianceModal(true)} type="button">
              + Add Appliance
            </button>
          </div>

          <table className="doc-table-bordered" style={{ marginTop: '16px' }}>
            <thead>
              <tr>
                <th>Appliance</th>
                <th>Category</th>
                <th>Continuous (W)</th>
                <th>Surge Power (W)</th>
                <th>Default Daily Hours</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedAppliances.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.name}</strong>
                    {a.description && <div style={{ fontSize: '11px', color: '#718096' }}>{a.description}</div>}
                  </td>
                  <td>{a.category}</td>
                  <td>{a.ratedPowerW} W</td>
                  <td>{a.surgePowerW || a.ratedPowerW} W</td>
                  <td>{a.defaultHours} hrs/day</td>
                  <td>
                    <span className={`pill ${a.active ? 'success' : ''}`}>
                      {a.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="secondary-button"
                        onClick={() => setEditingAppliance({ ...a })}
                        type="button"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-button"
                        onClick={() => deleteAppliance(a.id)}
                        type="button"
                        style={{ color: '#e53e3e', padding: '4px 8px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={tablePage} total={appliances.length} onChange={setTablePage} />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 7. SOLAR PANELS & HARDWARE OF DIFFERENT COMPANIES (CRUD)                */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <section className="panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Tier-1 Hardware Inventory</span>
              <h2>Renewable Energy Equipment Catalog ({filteredProducts.length})</h2>
            </div>
            <button className="primary-button" onClick={() => setShowCreateProductModal(true)} type="button">
              + Add Hardware Product
            </button>
          </div>

          {/* Filter Bar */}
          <div className="filters-bar" style={{ display: 'flex', gap: '10px', margin: '16px 0', flexWrap: 'wrap' }}>
            <input
              placeholder="Search by SKU, Model, Name, Brand..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />
            <select value={productCompanyFilter} onChange={(e) => setProductCompanyFilter(e.target.value)}>
              <option value="all">🏢 All Manufacturers / Companies</option>
              {companyList.map((company) => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
            <select value={productCategoryFilter} onChange={(e) => setProductCategoryFilter(e.target.value)}>
              <option value="all">📦 All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
              <option value="Solar Panel">Solar Panel</option>
              <option value="Wind Turbine">Wind Turbine</option>
              <option value="Battery">Battery</option>
              <option value="Inverter">Inverter</option>
              <option value="Charge Controller">Charge Controller</option>
              <option value="Mounting Structure">Mounting Structure</option>
              <option value="Accessories">Accessories</option>
            </select>
          </div>

          <table className="doc-table-bordered">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Image</th>
                <th>SKU & Model</th>
                <th>Manufacturer / Brand</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Capacity / Specs</th>
                <th>Price & Discount</th>
                <th>Stock / Status</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '28px', color: '#a0aec0' }}>
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                pagedProducts.map((p) => {
                  const companyName = typeof p.company === 'object' ? p.company?.name : p.company || p.brand || 'General';
                  const categoryName = typeof p.categoryItem === 'object' ? p.categoryItem?.name : p.category;
                  const hasDiscount = p.discountPrice && Number(p.discountPrice) > 0 && Number(p.discountPrice) < Number(p.price);

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', background: '#f7fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                          {p.image ? (
                            <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                          ) : (
                            <span style={{ fontSize: '20px' }}>⚡</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <code>{p.sku}</code>
                        {p.model && <div style={{ fontSize: '11px', color: '#718096' }}>Mod: {p.model}</div>}
                      </td>
                      <td>
                        <strong style={{ color: '#2b6cb0' }}>{companyName}</strong>
                      </td>
                      <td>
                        <strong>{p.name}</strong>
                      </td>
                      <td>
                        <span className="pill">{categoryName}</span>
                      </td>
                      <td>
                        {p.capacity ? `${p.capacity} ${p.capacityUnit || 'W'}` : p.wattage ? `${p.wattage} W` : '—'}
                        {p.efficiency ? <div style={{ fontSize: '11px', color: '#718096' }}>{p.efficiency}% eff</div> : null}
                      </td>
                      <td>
                        {hasDiscount ? (
                          <div>
                            <strong style={{ color: '#2f855a' }}>BDT {Number(p.discountPrice).toLocaleString()}</strong>
                            <div style={{ fontSize: '11px', color: '#a0aec0', textDecoration: 'line-through' }}>
                              BDT {Number(p.price).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <strong>BDT {Number(p.price).toLocaleString()}</strong>
                        )}
                        <span style={{ fontSize: '11px', color: '#718096' }}> / {p.unit || 'unit'}</span>
                      </td>
                      <td>
                        <span className={`pill ${p.availability === 'in_stock' ? 'success' : p.availability === 'low_stock' ? 'warning' : ''}`}>
                          {p.availability === 'in_stock' ? 'In Stock' : p.availability === 'low_stock' ? 'Low Stock' : p.availability === 'pre_order' ? 'Pre-Order' : 'Out of Stock'}
                        </span>
                        <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>{p.stock ?? 0} units</div>
                      </td>
                      <td>
                        {p.featured ? (
                          <span title="Featured on home page" style={{ color: '#d69e2e', fontSize: '16px' }}>⭐ Yes</span>
                        ) : (
                          <span style={{ color: '#cbd5e0', fontSize: '12px' }}>No</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="secondary-button"
                            onClick={() => {
                              setEditingProduct({
                                ...p,
                                companyId: p.companyId || (typeof p.company === 'object' ? p.company?.id : ''),
                                categoryId: p.categoryId || (typeof p.categoryItem === 'object' ? p.categoryItem?.id : ''),
                                galleryImagesText: Array.isArray(p.galleryImages) ? p.galleryImages.join('\n') : '',
                              });
                            }}
                            type="button"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-button"
                            onClick={() => deleteProduct(p.id)}
                            type="button"
                            style={{ color: '#e53e3e', padding: '4px 8px', fontSize: '12px' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <Pagination page={tablePage} total={filteredProducts.length} onChange={setTablePage} />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 8. COMPANIES & BRANDS MANAGEMENT (Section 11)                           */}
      {/* ========================================================================= */}
      {activeTab === 'companies' && (
        <section className="panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Brand & Manufacturer Network</span>
              <h2>Companies & Equipment Brands ({filteredCompanies.length})</h2>
            </div>
            <button className="primary-button" onClick={() => setShowCreateCompanyModal(true)} type="button">
              + Add Company / Brand
            </button>
          </div>

          {/* Filter Bar */}
          <div className="filters-bar" style={{ display: 'flex', gap: '10px', margin: '16px 0', flexWrap: 'wrap' }}>
            <input
              placeholder="Search by company name, country..."
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              style={{ flex: 1, minWidth: '220px' }}
            />
          </div>

          <table className="doc-table-bordered">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Logo</th>
                <th>Company / Brand Name</th>
                <th>Country of Origin</th>
                <th>Website</th>
                <th>Contact Info</th>
                <th>Products Count</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: '#a0aec0' }}>
                    No companies found. Click "+ Add Company / Brand" to register one.
                  </td>
                </tr>
              ) : (
                pagedCompanies.map((c) => {
                  const companyProductCount = products.filter((p) => p.companyId === c.id || (typeof p.company === 'string' && p.company === c.name)).length;

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: '#f7fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                          {c.logo ? (
                            <img src={c.logo} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                          ) : (
                            <span style={{ fontSize: '18px' }}>🏢</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong style={{ fontSize: '14px', color: '#2d3748' }}>{c.name}</strong>
                        {c.description && (
                          <div style={{ fontSize: '11px', color: '#718096', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span>{c.country || 'International'}</span>
                      </td>
                      <td>
                        {c.website ? (
                          <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', fontSize: '12px' }}>
                            {c.website.replace(/^https?:\/\//, '')} ↗
                          </a>
                        ) : (
                          <span style={{ color: '#a0aec0', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#4a5568' }}>{c.contactInformation || '—'}</span>
                      </td>
                      <td>
                        <span className="pill">{companyProductCount} items</span>
                      </td>
                      <td>
                        <span className={`pill ${c.status === 'active' ? 'success' : ''}`}>
                          {c.status?.toUpperCase() || 'ACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="secondary-button"
                            onClick={() => setEditingCompany({ ...c })}
                            type="button"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-button"
                            onClick={() => deleteCompany(c.id)}
                            type="button"
                            style={{ color: '#e53e3e', padding: '4px 8px', fontSize: '12px' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <Pagination page={tablePage} total={filteredCompanies.length} onChange={setTablePage} />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 9. CATEGORIES MANAGEMENT (Section 12)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <section className="panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Equipment Taxonomy</span>
              <h2>Product Categories ({filteredCategories.length})</h2>
            </div>
            <button className="primary-button" onClick={() => setShowCreateCategoryModal(true)} type="button">
              + Add Category
            </button>
          </div>

          {/* Filter Bar */}
          <div className="filters-bar" style={{ display: 'flex', gap: '10px', margin: '16px 0', flexWrap: 'wrap' }}>
            <input
              placeholder="Search category name, slug, description..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              style={{ flex: 1, minWidth: '220px' }}
            />
          </div>

          <table className="doc-table-bordered">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Icon</th>
                <th>Category Name</th>
                <th>URL Slug</th>
                <th>Description</th>
                <th>Products Count</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#a0aec0' }}>
                    No categories found. Click "+ Add Category" to create one.
                  </td>
                </tr>
              ) : (
                pagedCategories.map((cat) => {
                  const catProductCount = products.filter((p) => p.categoryId === cat.id || p.category === cat.name).length;

                  return (
                    <tr key={cat.id}>
                      <td style={{ textAlign: 'center', fontSize: '24px' }}>
                        {cat.icon || '📦'}
                      </td>
                      <td>
                        <strong style={{ fontSize: '14px', color: '#2d3748' }}>{cat.name}</strong>
                      </td>
                      <td>
                        <code>{cat.slug}</code>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', color: '#718096', maxWidth: '350px' }}>
                          {cat.description || '—'}
                        </div>
                      </td>
                      <td>
                        <span className="pill">{catProductCount} products</span>
                      </td>
                      <td>
                        <span className={`pill ${cat.status === 'active' ? 'success' : ''}`}>
                          {cat.status?.toUpperCase() || 'ACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="secondary-button"
                            onClick={() => setEditingCategory({ ...cat })}
                            type="button"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-button"
                            onClick={() => deleteCategory(cat.id)}
                            type="button"
                            style={{ color: '#e53e3e', padding: '4px 8px', fontSize: '12px' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <Pagination page={tablePage} total={filteredCategories.length} onChange={setTablePage} />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 8. SOLAR PACKAGES (CRUD)                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'packages' && (
        <section className="panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Standard Packages</span>
              <h2>Turnkey Recommended Systems ({packages.length})</h2>
            </div>
            <button className="primary-button" onClick={() => setShowCreatePackageModal(true)} type="button">
              + Create Package
            </button>
          </div>

          <div className="packages-grid" style={{ marginTop: '16px' }}>
            {pagedPackages.map((pkg) => (
              <div key={pkg.id} className="package-card" style={{ position: 'relative' }}>
                <span className="pill">{pkg.systemType?.toUpperCase()}</span>
                <h3>{pkg.name}</h3>
                <div className="package-capacity">{pkg.capacityKwp} kWp</div>
                <p>{pkg.description}</p>
                <div><strong>Price:</strong> BDT {Number(pkg.totalPrice).toLocaleString()}</div>
                <div><strong>Expected Monthly:</strong> ~{pkg.expectedGenerationMonthlyKwh} kWh</div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    className="secondary-button"
                    onClick={() => setEditingPackage({ ...pkg })}
                    type="button"
                    style={{ flex: 1 }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="text-button"
                    onClick={() => deletePackage(pkg.id)}
                    type="button"
                    style={{ color: '#e53e3e' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={tablePage} total={packages.length} onChange={setTablePage} />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 9. CONTROL PAGE (INSTALLATION, DELIVERY, SETUP, COMPONENT, DOCS & LABELS) */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <section className="panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Commercial & Engineering Governance</span>
              <h2>System Control: Rates, Fees, Documentation & Dynamic Labels</h2>
            </div>
            <button className="primary-button" onClick={saveControlSettings} type="button">
              💾 Save All Control Settings & Labels
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginTop: '20px' }}>
            
            {/* 1. Installation Price & Label */}
            <div className="control-card-section">
              <h4>1. Installation Price Configuration</h4>
              <div className="form-grid-2">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Customer-Facing Label</label>
                  <input
                    type="text"
                    value={settings.pricing_settings?.installationPriceLabel || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, installationPriceLabel: e.target.value },
                      })
                    }
                    placeholder="e.g. Turnkey Installation & Commissioning"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Base Installation Rate (BDT / kWp)</label>
                  <input
                    type="number"
                    value={settings.pricing_settings?.baseInstallationRatePerKwp || 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, baseInstallationRatePerKwp: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* 2. Delivery Cost & Label */}
            <div className="control-card-section">
              <h4>2. Delivery Cost Configuration</h4>
              <div className="form-grid-2">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Customer-Facing Label</label>
                  <input
                    type="text"
                    value={settings.pricing_settings?.deliveryCostLabel || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, deliveryCostLabel: e.target.value },
                      })
                    }
                    placeholder="e.g. Regional Logistics & Transport Fee"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Base Delivery Fee (BDT)</label>
                  <input
                    type="number"
                    value={settings.pricing_settings?.deliveryBaseCost || 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, deliveryBaseCost: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* 3. Setup Cost & Label */}
            <div className="control-card-section">
              <h4>3. Setup Cost Configuration</h4>
              <div className="form-grid-2">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Customer-Facing Label</label>
                  <input
                    type="text"
                    value={settings.pricing_settings?.setupCostLabel || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, setupCostLabel: e.target.value },
                      })
                    }
                    placeholder="e.g. System Design & Net-Metering Setup"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Setup & Engineering Fee (BDT)</label>
                  <input
                    type="number"
                    value={settings.pricing_settings?.setupAndEngineeringFee || 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, setupAndEngineeringFee: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* 4. Component Cost & Label */}
            <div className="control-card-section">
              <h4>4. Component Cost (BOS / Electrical Protection)</h4>
              <div className="form-grid-2">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Customer-Facing Label</label>
                  <input
                    type="text"
                    value={settings.pricing_settings?.componentCostLabel || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, componentCostLabel: e.target.value },
                      })
                    }
                    placeholder="e.g. Balance of System (BOS) & SPD"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Component Rate (BDT / kWp)</label>
                  <input
                    type="number"
                    value={settings.pricing_settings?.componentCostPerKwp || 4500}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, componentCostPerKwp: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* 5. Documentation & Labels */}
            <div className="control-card-section" style={{ gridColumn: '1 / -1' }}>
              <h4>5. Documentation, Legal Terms & Statutory Compliance</h4>
              <div className="form-grid-2" style={{ marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Documentation Fee Label</label>
                  <input
                    type="text"
                    value={settings.pricing_settings?.documentationLabel || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, documentationLabel: e.target.value },
                      })
                    }
                    placeholder="e.g. SREDA Net-Metering & Filing Fee"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Documentation Fee (BDT)</label>
                  <input
                    type="number"
                    value={settings.pricing_settings?.documentationAndNemFee || 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, documentationAndNemFee: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Warranty & Interconnection Agreement Label</label>
                <input
                  type="text"
                  value={settings.pricing_settings?.documentationTermsLabel || 'Standard Turnkey Warranty & Interconnection Agreement Terms'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pricing_settings: { ...settings.pricing_settings, documentationTermsLabel: e.target.value },
                    })
                  }
                  style={{ marginBottom: '6px' }}
                />
                <textarea
                  rows={3}
                  value={settings.pricing_settings?.documentationTerms || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pricing_settings: { ...settings.pricing_settings, documentationTerms: e.target.value },
                    })
                  }
                  placeholder="Official warranty and agreement text rendered on generated Installation Documents..."
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Standards & Compliance Label</label>
                <input
                  type="text"
                  value={settings.pricing_settings?.complianceNoticeLabel || 'Technical Standards & Quality Certification Notice'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pricing_settings: { ...settings.pricing_settings, complianceNoticeLabel: e.target.value },
                    })
                  }
                  style={{ marginBottom: '6px' }}
                />
                <textarea
                  rows={2}
                  value={settings.pricing_settings?.complianceNotice || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pricing_settings: { ...settings.pricing_settings, complianceNotice: e.target.value },
                    })
                  }
                  placeholder="IEC & BNBC compliance notes..."
                />
              </div>
            </div>

            {/* 6. Commercial Tax & Discount Settings */}
            <div className="control-card-section" style={{ gridColumn: '1 / -1' }}>
              <h4>6. Financial Taxation & Promotional Discounts</h4>
              <div className="form-grid-2">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Standard VAT / Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.pricing_settings?.vatTaxPercent || 5.0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, vatTaxPercent: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>Default Promotional Discount (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.pricing_settings?.defaultPromotionalDiscountPercent || 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing_settings: { ...settings.pricing_settings, defaultPromotionalDiscountPercent: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
            </div>

          </div>

          <div style={{ marginTop: '24px', textAlign: 'right' }}>
            <button className="primary-button" onClick={saveControlSettings} type="button" style={{ padding: '12px 28px', fontSize: '15px' }}>
              💾 Save All Control Settings & Labels
            </button>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODALS SECTION                                                           */}
      {/* ========================================================================= */}

      {/* 1. Modal: Create Order */}
      {showCreateOrderModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Create New Manual Order</h3>
              <button className="text-button" onClick={() => setShowCreateOrderModal(false)}>✕</button>
            </div>
            <form onSubmit={createOrder}>
              <div className="form-grid-2">
                <div>
                  <label>Customer Name</label>
                  <input required value={newOrderForm.customerName} onChange={(e) => setNewOrderForm({ ...newOrderForm, customerName: e.target.value })} />
                </div>
                <div>
                  <label>Contact Phone</label>
                  <input required value={newOrderForm.contactNumber} onChange={(e) => setNewOrderForm({ ...newOrderForm, contactNumber: e.target.value })} />
                </div>
                <div>
                  <label>Customer Email</label>
                  <input type="email" value={newOrderForm.email} onChange={(e) => setNewOrderForm({ ...newOrderForm, email: e.target.value })} />
                </div>
                <div>
                  <label>District</label>
                  <input required value={newOrderForm.district} onChange={(e) => setNewOrderForm({ ...newOrderForm, district: e.target.value })} />
                </div>
                <div>
                  <label>Upazila</label>
                  <input required value={newOrderForm.upazila} onChange={(e) => setNewOrderForm({ ...newOrderForm, upazila: e.target.value })} />
                </div>
                <div>
                  <label>Village / Street</label>
                  <input required value={newOrderForm.village} onChange={(e) => setNewOrderForm({ ...newOrderForm, village: e.target.value })} />
                </div>
                <div>
                  <label>Project Type</label>
                  <select value={newOrderForm.projectType} onChange={(e) => setNewOrderForm({ ...newOrderForm, projectType: e.target.value })}>
                    <option value="solar">Solar PV</option>
                    <option value="wind">Windmill</option>
                    <option value="hybrid">Solar + Wind Hybrid</option>
                  </select>
                </div>
                <div>
                  <label>System Type</label>
                  <select value={newOrderForm.systemType} onChange={(e) => setNewOrderForm({ ...newOrderForm, systemType: e.target.value })}>
                    <option value="on-grid">On-Grid</option>
                    <option value="off-grid">Off-Grid</option>
                    <option value="hybrid-grid">High-Grid (Hybrid UPS)</option>
                  </select>
                </div>
                <div>
                  <label>Capacity (kWp)</label>
                  <input type="number" step="0.1" value={newOrderForm.capacityKwp} onChange={(e) => setNewOrderForm({ ...newOrderForm, capacityKwp: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Total Amount (BDT)</label>
                  <input type="number" value={newOrderForm.totalAmount} onChange={(e) => setNewOrderForm({ ...newOrderForm, totalAmount: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Payment Method</label>
                  <select value={newOrderForm.paymentMethod} onChange={(e) => setNewOrderForm({ ...newOrderForm, paymentMethod: e.target.value })}>
                    <option value="cod">Cash on Delivery (COD)</option>
                    <option value="sslcommerz">Online (SSLCommerz)</option>
                    <option value="bank_transfer">Bank Wire</option>
                  </select>
                </div>
                <div>
                  <label>Payment Status</label>
                  <select value={newOrderForm.paymentStatus} onChange={(e) => setNewOrderForm({ ...newOrderForm, paymentStatus: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label>Assign Technician</label>
                  <select value={newOrderForm.technicianId} onChange={(e) => setNewOrderForm({ ...newOrderForm, technicianId: e.target.value })}>
                    <option value="">-- No Technician --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.serviceArea})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Order Lifecycle Status</label>
                  <select value={newOrderForm.status} onChange={(e) => setNewOrderForm({ ...newOrderForm, status: e.target.value })}>
                    <option value="submitted">Submitted</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="site_survey_scheduled">Site Survey Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Engineering & Logistics Notes</label>
                <textarea rows={2} value={newOrderForm.notes} onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setShowCreateOrderModal(false)}>Cancel</button>
                <button className="primary-button" type="submit">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Edit Order */}
      {editingOrder && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Edit Order: {editingOrder.orderNumber}</h3>
              <button className="text-button" onClick={() => setEditingOrder(null)}>✕</button>
            </div>
            <form onSubmit={updateOrder}>
              <div className="form-grid-2">
                <div>
                  <label>Lifecycle Status</label>
                  <select value={editingOrder.status} onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}>
                    <option value="submitted">Submitted</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="site_survey_scheduled">Site Survey Scheduled</option>
                    <option value="technician_assigned">Technician Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label>Payment Status</label>
                  <select value={editingOrder.paymentStatus} onChange={(e) => setEditingOrder({ ...editingOrder, paymentStatus: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label>Assigned Technician</label>
                  <select value={editingOrder.technicianId || ''} onChange={(e) => setEditingOrder({ ...editingOrder, technicianId: e.target.value })}>
                    <option value="">-- No Technician --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.serviceArea})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Scheduled Date / Window</label>
                  <input value={editingOrder.scheduledDate || ''} onChange={(e) => setEditingOrder({ ...editingOrder, scheduledDate: e.target.value })} placeholder="e.g. 2026-10-05" />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Admin & Field Notes</label>
                <textarea rows={3} value={editingOrder.notes || ''} onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setEditingOrder(null)}>Cancel</button>
                <button className="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Create User */}
      {showCreateUserModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Create User Account</h3>
              <button className="text-button" onClick={() => setShowCreateUserModal(false)}>✕</button>
            </div>
            <form onSubmit={createUser}>
              <div className="form-grid-2">
                <div>
                  <label>Full Name</label>
                  <input required value={newUserForm.fullName} onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })} />
                </div>
                <div>
                  <label>Email Address</label>
                  <input required type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} />
                </div>
                <div>
                  <label>Password</label>
                  <input required type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} />
                </div>
                <div>
                  <label>Role</label>
                  <select value={newUserForm.role} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}>
                    <option value="customer">Customer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label>Contact Phone</label>
                  <input required value={newUserForm.contactNumber} onChange={(e) => setNewUserForm({ ...newUserForm, contactNumber: e.target.value })} />
                </div>
                <div>
                  <label>Division</label>
                  <input required value={newUserForm.division} onChange={(e) => setNewUserForm({ ...newUserForm, division: e.target.value })} />
                </div>
                <div>
                  <label>District</label>
                  <input required value={newUserForm.district} onChange={(e) => setNewUserForm({ ...newUserForm, district: e.target.value })} />
                </div>
                <div>
                  <label>Upazila</label>
                  <input required value={newUserForm.upazila} onChange={(e) => setNewUserForm({ ...newUserForm, upazila: e.target.value })} />
                </div>
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setShowCreateUserModal(false)}>Cancel</button>
                <button className="primary-button" type="submit">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Edit User */}
      {editingUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Edit User: {editingUser.email}</h3>
              <button className="text-button" onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <form onSubmit={updateUser}>
              <div className="form-grid-2">
                <div>
                  <label>Full Name</label>
                  <input required value={editingUser.fullName} onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })} />
                </div>
                <div>
                  <label>Phone Number</label>
                  <input required value={editingUser.contactNumber || ''} onChange={(e) => setEditingUser({ ...editingUser, contactNumber: e.target.value })} />
                </div>
                <div>
                  <label>Role</label>
                  <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}>
                    <option value="customer">Customer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label>Status</label>
                  <select value={editingUser.isActive ? 'active' : 'suspended'} onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.value === 'active' })}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setEditingUser(null)}>Cancel</button>
                <button className="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: View User Details */}
      {selectedUserDetails && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '750px' }}>
            <div className="admin-modal-header">
              <h3>User Profile: {selectedUserDetails.user.fullName}</h3>
              <button className="text-button" onClick={() => setSelectedUserDetails(null)}>✕</button>
            </div>
            <div>
              <p><strong>Email:</strong> {selectedUserDetails.user.email} · <strong>Phone:</strong> {selectedUserDetails.user.contactNumber}</p>
              <p><strong>Location:</strong> {selectedUserDetails.user.village}, {selectedUserDetails.user.upazila}, {selectedUserDetails.user.district}, {selectedUserDetails.user.division}</p>
              
              <h4 style={{ marginTop: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                Associated Orders ({selectedUserDetails.orders?.length || 0})
              </h4>
              {selectedUserDetails.orders?.length > 0 ? (
                <table className="doc-table-bordered" style={{ fontSize: '11px' }}>
                  <thead>
                    <tr><th>Order #</th><th>Type</th><th>Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {selectedUserDetails.orders.map((o: any) => (
                      <tr key={o.id}>
                        <td>{o.orderNumber}</td>
                        <td>{o.projectType}</td>
                        <td>BDT {Number(o.totalAmount).toLocaleString()}</td>
                        <td><span className="pill">{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <small style={{ color: '#718096' }}>No orders placed yet.</small>}
            </div>
            <div className="admin-modal-footer">
              <button className="secondary-button" type="button" onClick={() => setSelectedUserDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Create Technician */}
      {showCreateTechModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Register Certified Technician</h3>
              <button className="text-button" onClick={() => setShowCreateTechModal(false)}>✕</button>
            </div>
            <form onSubmit={createTechnician}>
              <div className="form-grid-2">
                <div>
                  <label>Full Name</label>
                  <input required value={newTech.name} onChange={(e) => setNewTech({ ...newTech, name: e.target.value })} />
                </div>
                <div>
                  <label>Contact Phone</label>
                  <input required value={newTech.contactNumber} onChange={(e) => setNewTech({ ...newTech, contactNumber: e.target.value })} />
                </div>
                <div>
                  <label>Email Address</label>
                  <input required type="email" value={newTech.email} onChange={(e) => setNewTech({ ...newTech, email: e.target.value })} />
                </div>
                <div>
                  <label>Technician Specialization</label>
                  <select value={newTech.technicianTypeId} onChange={(e) => setNewTech({ ...newTech, technicianTypeId: e.target.value })}>
                    <option value="">-- Select Trade Type --</option>
                    {technicianTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Service Area / Division</label>
                  <input value={newTech.serviceArea} onChange={(e) => setNewTech({ ...newTech, serviceArea: e.target.value })} />
                </div>
                <div>
                  <label>Years of Experience</label>
                  <input type="number" value={newTech.experienceYears} onChange={(e) => setNewTech({ ...newTech, experienceYears: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Station / Residential Address</label>
                <input value={newTech.address} onChange={(e) => setNewTech({ ...newTech, address: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setShowCreateTechModal(false)}>Cancel</button>
                <button className="primary-button" type="submit">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Edit Technician */}
      {editingTech && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Edit Technician: {editingTech.name}</h3>
              <button className="text-button" onClick={() => setEditingTech(null)}>✕</button>
            </div>
            <form onSubmit={updateTechnician}>
              <div className="form-grid-2">
                <div>
                  <label>Full Name</label>
                  <input required value={editingTech.name} onChange={(e) => setEditingTech({ ...editingTech, name: e.target.value })} />
                </div>
                <div>
                  <label>Contact Phone</label>
                  <input required value={editingTech.contactNumber} onChange={(e) => setEditingTech({ ...editingTech, contactNumber: e.target.value })} />
                </div>
                <div>
                  <label>Email Address</label>
                  <input required type="email" value={editingTech.email} onChange={(e) => setEditingTech({ ...editingTech, email: e.target.value })} />
                </div>
                <div>
                  <label>Specialization</label>
                  <select value={editingTech.technicianTypeId || ''} onChange={(e) => setEditingTech({ ...editingTech, technicianTypeId: e.target.value })}>
                    <option value="">-- Select Type --</option>
                    {technicianTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Service Area</label>
                  <input value={editingTech.serviceArea || ''} onChange={(e) => setEditingTech({ ...editingTech, serviceArea: e.target.value })} />
                </div>
                <div>
                  <label>Availability</label>
                  <select value={editingTech.availability} onChange={(e) => setEditingTech({ ...editingTech, availability: e.target.value })}>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setEditingTech(null)}>Cancel</button>
                <button className="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: View Technician Assigned Orders */}
      {selectedTechOrders && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '750px' }}>
            <div className="admin-modal-header">
              <h3>Assigned Orders: {selectedTechName}</h3>
              <button className="text-button" onClick={() => setSelectedTechOrders(null)}>✕</button>
            </div>
            <div>
              {selectedTechOrders.length === 0 ? (
                <p style={{ color: '#718096' }}>No active field orders assigned currently.</p>
              ) : (
                <table className="doc-table-bordered">
                  <thead>
                    <tr><th>Order #</th><th>Customer</th><th>Location</th><th>Status</th><th>Scheduled</th></tr>
                  </thead>
                  <tbody>
                    {selectedTechOrders.map((o) => (
                      <tr key={o.id}>
                        <td><strong>{o.orderNumber}</strong></td>
                        <td>{o.customerName} (📞 {o.contactNumber})</td>
                        <td>{o.upazila}, {o.district}</td>
                        <td><span className="pill">{o.status}</span></td>
                        <td>{o.scheduledDate || 'Unscheduled'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="admin-modal-footer">
              <button className="secondary-button" type="button" onClick={() => setSelectedTechOrders(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Create Technician Type */}
      {showCreateTypeModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Create Technician Type</h3>
              <button className="text-button" onClick={() => setShowCreateTypeModal(false)}>✕</button>
            </div>
            <form onSubmit={createTechnicianType}>
              <div className="form-grid-2">
                <div>
                  <label>Type / Role Name</label>
                  <input required placeholder="e.g. High-Voltage Substation Lead" value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} />
                </div>
                <div>
                  <label>Code</label>
                  <input required placeholder="e.g. HV_LEAD" value={newType.code} onChange={(e) => setNewType({ ...newType, code: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Description</label>
                <textarea rows={2} value={newType.description} onChange={(e) => setNewType({ ...newType, description: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setShowCreateTypeModal(false)}>Cancel</button>
                <button className="primary-button" type="submit">Create Type</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Modal: Edit Technician Type */}
      {editingType && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Edit Technician Type: {editingType.name}</h3>
              <button className="text-button" onClick={() => setEditingType(null)}>✕</button>
            </div>
            <form onSubmit={updateTechnicianType}>
              <div className="form-grid-2">
                <div>
                  <label>Type / Role Name</label>
                  <input required value={editingType.name} onChange={(e) => setEditingType({ ...editingType, name: e.target.value })} />
                </div>
                <div>
                  <label>Code</label>
                  <input required value={editingType.code} onChange={(e) => setEditingType({ ...editingType, code: e.target.value })} />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Description</label>
                <textarea rows={2} value={editingType.description || ''} onChange={(e) => setEditingType({ ...editingType, description: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setEditingType(null)}>Cancel</button>
                <button className="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. Modal: Create Technician Payment */}
      {showCreatePaymentModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Issue Technician Payment Voucher</h3>
              <button className="text-button" onClick={() => setShowCreatePaymentModal(false)}>✕</button>
            </div>
            <form onSubmit={createPayment}>
              <div className="form-grid-2">
                <div>
                  <label>Select Technician</label>
                  <select required value={newTechPayment.technicianId} onChange={(e) => setNewTechPayment({ ...newTechPayment, technicianId: e.target.value })}>
                    <option value="">-- Choose Technician --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.contactNumber})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Linked Order (Optional)</label>
                  <select value={newTechPayment.orderId} onChange={(e) => setNewTechPayment({ ...newTechPayment, orderId: e.target.value })}>
                    <option value="">-- No Direct Order --</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>{o.orderNumber} - {o.customerName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Disbursement Amount (BDT)</label>
                  <input required type="number" value={newTechPayment.amount} onChange={(e) => setNewTechPayment({ ...newTechPayment, amount: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Compensation Type</label>
                  <select value={newTechPayment.paymentType} onChange={(e) => setNewTechPayment({ ...newTechPayment, paymentType: e.target.value })}>
                    <option value="fixed_commission">Fixed Commission</option>
                    <option value="milestone">Milestone Disbursement</option>
                    <option value="hourly">Daily / Hourly Rate</option>
                    <option value="completion">Completion Bonus</option>
                  </select>
                </div>
                <div>
                  <label>Payment Method</label>
                  <select value={newTechPayment.method} onChange={(e) => setNewTechPayment({ ...newTechPayment, method: e.target.value })}>
                    <option value="bank_transfer">BEFTN / Bank Transfer</option>
                    <option value="bKash">bKash Merchant</option>
                    <option value="cash">Cash Voucher</option>
                  </select>
                </div>
                <div>
                  <label>Trx / Voucher Reference</label>
                  <input placeholder="e.g. TR-91823 / BKASH-891" value={newTechPayment.reference} onChange={(e) => setNewTechPayment({ ...newTechPayment, reference: e.target.value })} />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Accounting Notes</label>
                <textarea rows={2} value={newTechPayment.notes} onChange={(e) => setNewTechPayment({ ...newTechPayment, notes: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setShowCreatePaymentModal(false)}>Cancel</button>
                <button className="primary-button" type="submit">Record Voucher</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. Modal: Edit Technician Payment */}
      {editingPayment && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Edit Payment Voucher</h3>
              <button className="text-button" onClick={() => setEditingPayment(null)}>✕</button>
            </div>
            <form onSubmit={updatePayment}>
              <div className="form-grid-2">
                <div>
                  <label>Status</label>
                  <select value={editingPayment.status} onChange={(e) => setEditingPayment({ ...editingPayment, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label>Amount (BDT)</label>
                  <input type="number" value={editingPayment.amount} onChange={(e) => setEditingPayment({ ...editingPayment, amount: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Method</label>
                  <select value={editingPayment.method} onChange={(e) => setEditingPayment({ ...editingPayment, method: e.target.value })}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label>Reference</label>
                  <input value={editingPayment.reference || ''} onChange={(e) => setEditingPayment({ ...editingPayment, reference: e.target.value })} />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Notes</label>
                <textarea rows={2} value={editingPayment.notes || ''} onChange={(e) => setEditingPayment({ ...editingPayment, notes: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setEditingPayment(null)}>Cancel</button>
                <button className="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13. Modal: Create Appliance */}
      {showCreateApplianceModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Add Appliance to Load Schedule</h3>
              <button className="text-button" onClick={() => setShowCreateApplianceModal(false)}>✕</button>
            </div>
            <form onSubmit={createAppliance}>
              <div className="form-grid-2">
                <div>
                  <label>Appliance Name</label>
                  <input required placeholder="e.g. Inverter Air Conditioner 1.5 Ton" value={newAppliance.name} onChange={(e) => setNewAppliance({ ...newAppliance, name: e.target.value })} />
                </div>
                <div>
                  <label>Category</label>
                  <select value={newAppliance.category} onChange={(e) => setNewAppliance({ ...newAppliance, category: e.target.value })}>
                    <option value="Cooling">Cooling</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Power/Pumps">Power / Water Pumps</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Industrial">Industrial Machinery</option>
                  </select>
                </div>
                <div>
                  <label>Continuous Running Power (W)</label>
                  <input required type="number" value={newAppliance.ratedPowerW} onChange={(e) => setNewAppliance({ ...newAppliance, ratedPowerW: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Starting / Surge Power (W)</label>
                  <input type="number" value={newAppliance.surgePowerW} onChange={(e) => setNewAppliance({ ...newAppliance, surgePowerW: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Default Daily Operating Hours</label>
                  <input type="number" step="0.5" value={newAppliance.defaultHours} onChange={(e) => setNewAppliance({ ...newAppliance, defaultHours: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Description / Technical Specification</label>
                <textarea rows={2} value={newAppliance.description} onChange={(e) => setNewAppliance({ ...newAppliance, description: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setShowCreateApplianceModal(false)}>Cancel</button>
                <button className="primary-button" type="submit">Add Appliance</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 14. Modal: Edit Appliance */}
      {editingAppliance && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Edit Appliance: {editingAppliance.name}</h3>
              <button className="text-button" onClick={() => setEditingAppliance(null)}>✕</button>
            </div>
            <form onSubmit={updateAppliance}>
              <div className="form-grid-2">
                <div>
                  <label>Appliance Name</label>
                  <input required value={editingAppliance.name} onChange={(e) => setEditingAppliance({ ...editingAppliance, name: e.target.value })} />
                </div>
                <div>
                  <label>Category</label>
                  <input required value={editingAppliance.category} onChange={(e) => setEditingAppliance({ ...editingAppliance, category: e.target.value })} />
                </div>
                <div>
                  <label>Continuous Power (W)</label>
                  <input type="number" value={editingAppliance.ratedPowerW} onChange={(e) => setEditingAppliance({ ...editingAppliance, ratedPowerW: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Surge Power (W)</label>
                  <input type="number" value={editingAppliance.surgePowerW || ''} onChange={(e) => setEditingAppliance({ ...editingAppliance, surgePowerW: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Default Hours</label>
                  <input type="number" step="0.5" value={editingAppliance.defaultHours} onChange={(e) => setEditingAppliance({ ...editingAppliance, defaultHours: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Active Status</label>
                  <select value={editingAppliance.active ? 'active' : 'inactive'} onChange={(e) => setEditingAppliance({ ...editingAppliance, active: e.target.value === 'active' })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setEditingAppliance(null)}>Cancel</button>
                <button className="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 15. Modal: Create Hardware Product */}
      {showCreateProductModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '780px' }}>
            <div className="admin-modal-header">
              <h3>Add Equipment Product to Catalog</h3>
              <button className="text-button" onClick={() => setShowCreateProductModal(false)}>✕</button>
            </div>
            <form onSubmit={createProduct}>
              <div className="form-grid-2">
                <div>
                  <label>SKU (Stock Keeping Unit) *</label>
                  <input required placeholder="e.g. PV-LONGI-585-BIF" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} />
                </div>
                <div>
                  <label>Company / Brand *</label>
                  <select
                    value={newProduct.companyId || ''}
                    onChange={(e) => {
                      const compId = e.target.value;
                      const matched = companies.find((c) => c.id === compId);
                      setNewProduct({
                        ...newProduct,
                        companyId: compId,
                        company: matched ? matched.name : newProduct.company,
                        brand: matched ? matched.name : newProduct.brand,
                      });
                    }}
                  >
                    <option value="">-- Select Registered Brand or Enter Manual --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.country || 'Global'})</option>
                    ))}
                  </select>
                  <input
                    style={{ marginTop: '6px' }}
                    placeholder="Or type brand name..."
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value, company: e.target.value })}
                  />
                </div>
                <div>
                  <label>Product Display Name *</label>
                  <input required placeholder="e.g. Hi-MO X6 Explorer 585W Bifacial Solar Panel" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
                </div>
                <div>
                  <label>Model Number</label>
                  <input placeholder="e.g. LR5-72HBD-585M" value={newProduct.model} onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })} />
                </div>
                <div>
                  <label>Equipment Category *</label>
                  <select
                    value={newProduct.categoryId || ''}
                    onChange={(e) => {
                      const catId = e.target.value;
                      const matched = categories.find((c) => c.id === catId);
                      setNewProduct({
                        ...newProduct,
                        categoryId: catId,
                        category: matched ? matched.name : newProduct.category,
                      });
                    }}
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon || '📦'} {c.name}</option>
                    ))}
                    <option value="">Solar Panel</option>
                    <option value="">Wind Turbine</option>
                    <option value="">Battery</option>
                    <option value="">Inverter</option>
                    <option value="">Charge Controller</option>
                    <option value="">Mounting Structure</option>
                    <option value="">Accessories</option>
                  </select>
                </div>
                <div>
                  <label>Capacity / Power Rating & Unit</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="e.g. 585"
                      value={newProduct.capacity || newProduct.wattage}
                      onChange={(e) => setNewProduct({ ...newProduct, capacity: Number(e.target.value), wattage: Number(e.target.value) })}
                      style={{ flex: 2 }}
                    />
                    <select
                      value={newProduct.capacityUnit}
                      onChange={(e) => setNewProduct({ ...newProduct, capacityUnit: e.target.value })}
                      style={{ flex: 1 }}
                    >
                      <option value="W">W</option>
                      <option value="kW">kW</option>
                      <option value="kWh">kWh</option>
                      <option value="Ah">Ah</option>
                      <option value="kVA">kVA</option>
                      <option value="A">A</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label>Regular Price (BDT) *</label>
                  <input required type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Discount Price (BDT, Optional)</label>
                  <input type="number" placeholder="Leave 0 if none" value={newProduct.discountPrice || ''} onChange={(e) => setNewProduct({ ...newProduct, discountPrice: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Availability & Stock</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={newProduct.availability}
                      onChange={(e) => setNewProduct({ ...newProduct, availability: e.target.value })}
                      style={{ flex: 1 }}
                    >
                      <option value="in_stock">In Stock</option>
                      <option value="low_stock">Low Stock</option>
                      <option value="pre_order">Pre-Order</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Units"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                      style={{ width: '90px' }}
                    />
                  </div>
                </div>
                <div>
                  <label>Unit Label</label>
                  <input placeholder="e.g. piece, set, meter" value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })} />
                </div>
                <div>
                  <label>Primary Image URL</label>
                  <input placeholder="https://images.unsplash.com/..." value={newProduct.image} onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })} />
                </div>
                <div>
                  <label>Featured on Home Page?</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'normal' }}>
                      <input
                        type="checkbox"
                        checked={newProduct.featured}
                        onChange={(e) => setNewProduct({ ...newProduct, featured: e.target.checked })}
                      />
                      ⭐ Mark as Featured Showcase Product
                    </label>
                  </div>
                </div>
                <div>
                  <label>Efficiency Rating (%)</label>
                  <input type="number" step="0.1" placeholder="e.g. 22.6" value={newProduct.efficiency || ''} onChange={(e) => setNewProduct({ ...newProduct, efficiency: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Warranty Terms</label>
                  <input value={newProduct.warranty} onChange={(e) => setNewProduct({ ...newProduct, warranty: e.target.value })} placeholder="e.g. 25-Year Linear Power Warranty" />
                </div>
                <div>
                  <label>Physical Dimensions</label>
                  <input value={newProduct.dimensions} onChange={(e) => setNewProduct({ ...newProduct, dimensions: e.target.value })} placeholder="e.g. 2278 × 1134 × 35 mm" />
                </div>
                <div>
                  <label>Approval Status</label>
                  <select value={newProduct.status} onChange={(e) => setNewProduct({ ...newProduct, status: e.target.value })}>
                    <option value="approved">Approved</option>
                    <option value="preferred">Preferred Tier-1</option>
                    <option value="conditional">Conditional</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Gallery Image URLs (one per line)</label>
                <textarea rows={2} placeholder="https://...\nhttps://..." value={newProduct.galleryImagesText} onChange={(e) => setNewProduct({ ...newProduct, galleryImagesText: e.target.value })} />
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Technical Description</label>
                <textarea rows={2} value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setShowCreateProductModal(false)}>Cancel</button>
                <button className="primary-button" type="submit">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 16. Modal: Edit Hardware Product */}
      {editingProduct && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '780px' }}>
            <div className="admin-modal-header">
              <h3>Edit Equipment: {editingProduct.sku}</h3>
              <button className="text-button" onClick={() => setEditingProduct(null)}>✕</button>
            </div>
            <form onSubmit={updateProduct}>
              <div className="form-grid-2">
                <div>
                  <label>SKU (Stock Keeping Unit) *</label>
                  <input required value={editingProduct.sku} onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })} />
                </div>
                <div>
                  <label>Company / Brand *</label>
                  <select
                    value={editingProduct.companyId || ''}
                    onChange={(e) => {
                      const compId = e.target.value;
                      const matched = companies.find((c) => c.id === compId);
                      setEditingProduct({
                        ...editingProduct,
                        companyId: compId,
                        company: matched ? matched.name : editingProduct.company,
                        brand: matched ? matched.name : editingProduct.brand,
                      });
                    }}
                  >
                    <option value="">-- Select Registered Brand or Enter Manual --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.country || 'Global'})</option>
                    ))}
                  </select>
                  <input
                    style={{ marginTop: '6px' }}
                    placeholder="Or type brand name..."
                    value={typeof editingProduct.brand === 'string' ? editingProduct.brand : ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value, company: e.target.value })}
                  />
                </div>
                <div>
                  <label>Product Display Name *</label>
                  <input required value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                </div>
                <div>
                  <label>Model Number</label>
                  <input value={editingProduct.model || ''} onChange={(e) => setEditingProduct({ ...editingProduct, model: e.target.value })} />
                </div>
                <div>
                  <label>Equipment Category *</label>
                  <select
                    value={editingProduct.categoryId || ''}
                    onChange={(e) => {
                      const catId = e.target.value;
                      const matched = categories.find((c) => c.id === catId);
                      setEditingProduct({
                        ...editingProduct,
                        categoryId: catId,
                        category: matched ? matched.name : editingProduct.category,
                      });
                    }}
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon || '📦'} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Capacity / Power Rating & Unit</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      value={editingProduct.capacity || editingProduct.wattage || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, capacity: Number(e.target.value), wattage: Number(e.target.value) })}
                      style={{ flex: 2 }}
                    />
                    <select
                      value={editingProduct.capacityUnit || 'W'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, capacityUnit: e.target.value })}
                      style={{ flex: 1 }}
                    >
                      <option value="W">W</option>
                      <option value="kW">kW</option>
                      <option value="kWh">kWh</option>
                      <option value="Ah">Ah</option>
                      <option value="kVA">kVA</option>
                      <option value="A">A</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label>Regular Price (BDT) *</label>
                  <input required type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Discount Price (BDT, Optional)</label>
                  <input type="number" placeholder="Leave 0 if none" value={editingProduct.discountPrice || ''} onChange={(e) => setEditingProduct({ ...editingProduct, discountPrice: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Availability & Stock</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={editingProduct.availability || 'in_stock'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, availability: e.target.value })}
                      style={{ flex: 1 }}
                    >
                      <option value="in_stock">In Stock</option>
                      <option value="low_stock">Low Stock</option>
                      <option value="pre_order">Pre-Order</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Units"
                      value={editingProduct.stock || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                      style={{ width: '90px' }}
                    />
                  </div>
                </div>
                <div>
                  <label>Unit Label</label>
                  <input placeholder="e.g. piece, set" value={editingProduct.unit || 'piece'} onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })} />
                </div>
                <div>
                  <label>Primary Image URL</label>
                  <input placeholder="https://..." value={editingProduct.image || ''} onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })} />
                </div>
                <div>
                  <label>Featured on Home Page?</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'normal' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(editingProduct.featured)}
                        onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                      />
                      ⭐ Mark as Featured Showcase Product
                    </label>
                  </div>
                </div>
                <div>
                  <label>Efficiency Rating (%)</label>
                  <input type="number" step="0.1" value={editingProduct.efficiency || ''} onChange={(e) => setEditingProduct({ ...editingProduct, efficiency: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Warranty Terms</label>
                  <input value={editingProduct.warranty || ''} onChange={(e) => setEditingProduct({ ...editingProduct, warranty: e.target.value })} />
                </div>
                <div>
                  <label>Physical Dimensions</label>
                  <input value={editingProduct.dimensions || ''} onChange={(e) => setEditingProduct({ ...editingProduct, dimensions: e.target.value })} />
                </div>
                <div>
                  <label>Approval Status</label>
                  <select value={editingProduct.status} onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}>
                    <option value="approved">Approved</option>
                    <option value="preferred">Preferred Tier-1</option>
                    <option value="conditional">Conditional</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Gallery Image URLs (one per line)</label>
                <textarea rows={2} value={editingProduct.galleryImagesText || ''} onChange={(e) => setEditingProduct({ ...editingProduct, galleryImagesText: e.target.value })} />
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Technical Description</label>
                <textarea rows={2} value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setEditingProduct(null)}>Cancel</button>
                <button className="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Company / Brand */}
      {showCreateCompanyModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Register Equipment Company / Brand</h3>
              <button className="text-button" onClick={() => setShowCreateCompanyModal(false)}>✕</button>
            </div>
            <form onSubmit={createCompany}>
              <div className="form-grid-2">
                <div>
                  <label>Company / Brand Name *</label>
                  <input required placeholder="e.g. LONGi Solar, Growatt, Huawei" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                </div>
                <div>
                  <label>Country of Origin</label>
                  <input placeholder="e.g. China, Germany, USA" value={newCompany.country} onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })} />
                </div>
                <div>
                  <label>Official Website</label>
                  <input placeholder="https://..." value={newCompany.website} onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })} />
                </div>
                <div>
                  <label>Contact Information / Support</label>
                  <input placeholder="e.g. bd-support@company.com" value={newCompany.contactInformation} onChange={(e) => setNewCompany({ ...newCompany, contactInformation: e.target.value })} />
                </div>
                <div>
                  <label>Logo Image URL</label>
                  <input placeholder="https://..." value={newCompany.logo} onChange={(e) => setNewCompany({ ...newCompany, logo: e.target.value })} />
                </div>
                <div>
                  <label>Status</label>
                  <select value={newCompany.status} onChange={(e) => setNewCompany({ ...newCompany, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Company Overview & Reputation</label>
                <textarea rows={2} placeholder="Tier-1 global manufacturer of high-efficiency monocrystalline solar panels..." value={newCompany.description} onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setShowCreateCompanyModal(false)}>Cancel</button>
                <button className="primary-button" type="submit">Register Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Company */}
      {editingCompany && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Edit Company: {editingCompany.name}</h3>
              <button className="text-button" onClick={() => setEditingCompany(null)}>✕</button>
            </div>
            <form onSubmit={updateCompany}>
              <div className="form-grid-2">
                <div>
                  <label>Company / Brand Name *</label>
                  <input required value={editingCompany.name} onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })} />
                </div>
                <div>
                  <label>Country of Origin</label>
                  <input value={editingCompany.country || ''} onChange={(e) => setEditingCompany({ ...editingCompany, country: e.target.value })} />
                </div>
                <div>
                  <label>Official Website</label>
                  <input value={editingCompany.website || ''} onChange={(e) => setEditingCompany({ ...editingCompany, website: e.target.value })} />
                </div>
                <div>
                  <label>Contact Information</label>
                  <input value={editingCompany.contactInformation || ''} onChange={(e) => setEditingCompany({ ...editingCompany, contactInformation: e.target.value })} />
                </div>
                <div>
                  <label>Logo Image URL</label>
                  <input value={editingCompany.logo || ''} onChange={(e) => setEditingCompany({ ...editingCompany, logo: e.target.value })} />
                </div>
                <div>
                  <label>Status</label>
                  <select value={editingCompany.status || 'active'} onChange={(e) => setEditingCompany({ ...editingCompany, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Company Overview</label>
                <textarea rows={2} value={editingCompany.description || ''} onChange={(e) => setEditingCompany({ ...editingCompany, description: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setEditingCompany(null)}>Cancel</button>
                <button className="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Category */}
      {showCreateCategoryModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Add Equipment Category</h3>
              <button className="text-button" onClick={() => setShowCreateCategoryModal(false)}>✕</button>
            </div>
            <form onSubmit={createCategory}>
              <div className="form-grid-2">
                <div>
                  <label>Category Name *</label>
                  <input required placeholder="e.g. Solar Panel, Wind Turbine" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
                </div>
                <div>
                  <label>URL Slug (Optional)</label>
                  <input placeholder="e.g. solar-panel (auto if blank)" value={newCategory.slug} onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })} />
                </div>
                <div>
                  <label>Category Icon (Emoji or SVG)</label>
                  <input placeholder="☀️, 🌬️, 🔋, ⚡, 🏗️" value={newCategory.icon} onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })} />
                </div>
                <div>
                  <label>Banner / Header Image URL</label>
                  <input placeholder="https://..." value={newCategory.image} onChange={(e) => setNewCategory({ ...newCategory, image: e.target.value })} />
                </div>
                <div>
                  <label>Status</label>
                  <select value={newCategory.status} onChange={(e) => setNewCategory({ ...newCategory, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Category Description</label>
                <textarea rows={2} placeholder="High-efficiency photovoltaic modules designed for residential, commercial..." value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setShowCreateCategoryModal(false)}>Cancel</button>
                <button className="primary-button" type="submit">Create Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Category */}
      {editingCategory && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Edit Category: {editingCategory.name}</h3>
              <button className="text-button" onClick={() => setEditingCategory(null)}>✕</button>
            </div>
            <form onSubmit={updateCategory}>
              <div className="form-grid-2">
                <div>
                  <label>Category Name *</label>
                  <input required value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} />
                </div>
                <div>
                  <label>URL Slug</label>
                  <input required value={editingCategory.slug} onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })} />
                </div>
                <div>
                  <label>Category Icon</label>
                  <input value={editingCategory.icon || ''} onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })} />
                </div>
                <div>
                  <label>Image URL</label>
                  <input value={editingCategory.image || ''} onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.value })} />
                </div>
                <div>
                  <label>Status</label>
                  <select value={editingCategory.status || 'active'} onChange={(e) => setEditingCategory({ ...editingCategory, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Description</label>
                <textarea rows={2} value={editingCategory.description || ''} onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setEditingCategory(null)}>Cancel</button>
                <button className="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 17. Modal: Create Package */}
      {showCreatePackageModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Create Turnkey Package</h3>
              <button className="text-button" onClick={() => setShowCreatePackageModal(false)}>✕</button>
            </div>
            <form onSubmit={createPackage}>
              <div className="form-grid-2">
                <div>
                  <label>Package Name</label>
                  <input required value={newPackage.name} onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })} />
                </div>
                <div>
                  <label>System Type</label>
                  <select value={newPackage.systemType} onChange={(e) => setNewPackage({ ...newPackage, systemType: e.target.value })}>
                    <option value="on-grid">On-Grid</option>
                    <option value="off-grid">Off-Grid</option>
                    <option value="hybrid-grid">Hybrid-Grid</option>
                  </select>
                </div>
                <div>
                  <label>Capacity (kWp)</label>
                  <input type="number" step="0.1" value={newPackage.capacityKwp} onChange={(e) => setNewPackage({ ...newPackage, capacityKwp: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Total Package Price (BDT)</label>
                  <input type="number" value={newPackage.totalPrice} onChange={(e) => setNewPackage({ ...newPackage, totalPrice: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Expected Monthly Generation (kWh)</label>
                  <input type="number" value={newPackage.expectedGenerationMonthlyKwh} onChange={(e) => setNewPackage({ ...newPackage, expectedGenerationMonthlyKwh: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Panel Quantity</label>
                  <input type="number" value={newPackage.panelQuantity} onChange={(e) => setNewPackage({ ...newPackage, panelQuantity: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label>Description & Customer Profile</label>
                <textarea rows={2} value={newPackage.description} onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setShowCreatePackageModal(false)}>Cancel</button>
                <button className="primary-button" type="submit">Create Package</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 18. Modal: Edit Package */}
      {editingPackage && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Edit Package: {editingPackage.name}</h3>
              <button className="text-button" onClick={() => setEditingPackage(null)}>✕</button>
            </div>
            <form onSubmit={updatePackage}>
              <div className="form-grid-2">
                <div>
                  <label>Package Name</label>
                  <input required value={editingPackage.name} onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })} />
                </div>
                <div>
                  <label>System Type</label>
                  <select value={editingPackage.systemType} onChange={(e) => setEditingPackage({ ...editingPackage, systemType: e.target.value })}>
                    <option value="on-grid">On-Grid</option>
                    <option value="off-grid">Off-Grid</option>
                    <option value="hybrid-grid">Hybrid-Grid</option>
                  </select>
                </div>
                <div>
                  <label>Capacity (kWp)</label>
                  <input type="number" step="0.1" value={editingPackage.capacityKwp} onChange={(e) => setEditingPackage({ ...editingPackage, capacityKwp: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Total Price (BDT)</label>
                  <input type="number" value={editingPackage.totalPrice} onChange={(e) => setEditingPackage({ ...editingPackage, totalPrice: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Monthly Gen (kWh)</label>
                  <input type="number" value={editingPackage.expectedGenerationMonthlyKwh} onChange={(e) => setEditingPackage({ ...editingPackage, expectedGenerationMonthlyKwh: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Active Status</label>
                  <select value={editingPackage.active ? 'active' : 'inactive'} onChange={(e) => setEditingPackage({ ...editingPackage, active: e.target.value === 'active' })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setEditingPackage(null)}>Cancel</button>
                <button className="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 19. Turnkey Installation Document Modal (Preview / Print / Export) */}
      {selectedOrderDoc && (
        <InstallationDocumentModal
          order={selectedOrderDoc}
          onClose={() => setSelectedOrderDoc(null)}
        />
      )}
    </div>
  );
}
