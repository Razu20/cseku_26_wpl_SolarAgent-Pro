import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '../lib/api';
import {
  BANGLADESH_DIVISIONS,
  getDistrictsByDivision,
  getUpazilas,
} from '../data/bangladeshLocations';
import { ChatbotWidget } from '../components/ChatbotWidget';
import { InstallationDocumentModal } from '../components/InstallationDocumentModal';
import { PackageCustomizerModal } from '../components/PackageCustomizerModal';

type ProjectType = 'solar' | 'wind' | 'hybrid';
type SystemType = 'on-grid' | 'off-grid' | 'hybrid-grid';
const CUSTOMER_PAGE_SIZE = 10;

function CustomerPagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE));
  if (pageCount <= 1) return null;
  return (
    <div className="customer-pagination">
      <span>Showing {(page - 1) * CUSTOMER_PAGE_SIZE + 1}-{Math.min(page * CUSTOMER_PAGE_SIZE, total)} of {total}</span>
      <div>
        <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button>
        <strong>Page {page} of {pageCount}</strong>
        <button type="button" disabled={page === pageCount} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

interface Appliance {
  id: string;
  name: string;
  category: string;
  ratedPowerW: number;
  defaultHours: string;
  surgePowerW?: number;
}

interface Selection {
  applianceId: string;
  name?: string;
  category?: string;
  ratedPowerW?: number;
  surgePowerW?: number;
  quantity: number;
  dailyHours: number;
}

interface WeatherInfo {
  temperatureC: number;
  relativeHumidity: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windGustsKmh?: number;
  cloudCoverPercent: number;
  timestamp: string;
  dataSource: string;
  solarPlanningBenchmark: {
    peakSunHoursPerDay: number;
    standardPerformanceRatio: number;
    note: string;
  };
  windPlanningBenchmark: {
    averageAnnualWindKmh: number;
    note: string;
  };
  disclaimer: string;
}

export function CustomerPanelPage() {
  const searchParams = useSearchParams();
  const paymentStatusParam = searchParams.get('payment');
  const tranIdParam = searchParams.get('tran_id');

  // Navigation tab: 'request' | 'orders' | 'packages' | 'support' | 'profile'
  const [activeTab, setActiveTab] = useState<'request' | 'orders' | 'packages' | 'support' | 'profile'>('request');

  // Request mode: 'customized' | 'recommended' (for solar)
  const [solarMode, setSolarMode] = useState<'customized' | 'recommended'>('customized');
  const [projectType, setProjectType] = useState<ProjectType>('solar');

  // Multi-step wizard: 1 (Location & Site) -> 2 (Weather) -> 3 (Appliances & Load) -> 4 (System Type) -> 5 (Estimate & Products) -> 6 (Checkout)
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Catalogs
  const [appliancesCatalog, setAppliancesCatalog] = useState<Appliance[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<any[]>([]);
  const [packagesCatalog, setPackagesCatalog] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [customerPage, setCustomerPage] = useState(1);

  // User Profile
  const storedUser = localStorage.getItem('solaragent.user') ? JSON.parse(localStorage.getItem('solaragent.user')!) : null;
  const [userProfile, setUserProfile] = useState({
    fullName: storedUser?.fullName || 'Valued Customer',
    contactNumber: storedUser?.contactNumber || '+8801700000000',
    email: storedUser?.email || '',
    division: storedUser?.division || 'Dhaka',
    district: storedUser?.district || 'Dhaka',
    upazila: storedUser?.upazila || 'Gulshan',
    village: storedUser?.village || 'Gulshan-2',
  });

  // Wizard Form State
  const [location, setLocation] = useState({
    division: storedUser?.division || 'Dhaka',
    district: storedUser?.district || 'Dhaka',
    upazila: storedUser?.upazila || 'Gulshan',
    village: storedUser?.village || 'Gulshan-2',
  });

  const [configuration, setConfiguration] = useState({
    system: 'on-grid' as SystemType,
    locationType: 'urban' as 'urban' | 'rural' | 'city',
    rooftopType: 'concrete' as 'concrete' | 'metal' | 'tile' | 'other',
    rooftopAreaSqFt: '500',
    towerHeightM: '18',
    terrainType: 'plain' as 'open_coastal' | 'plain' | 'suburban' | 'obstructed',
  });

  const [selections, setSelections] = useState<Selection[]>([]);
  const [customAppliance, setCustomAppliance] = useState({ name: '', category: 'Custom', ratedPowerW: 100, surgePowerW: 150, quantity: 1, dailyHours: 4 });
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Weather data
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Selected equipment overrides
  const [selectedPanelId, setSelectedPanelId] = useState<string>('');
  const [selectedInverterId, setSelectedInverterId] = useState<string>('');
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>('');
  const [selectedTurbineId, setSelectedTurbineId] = useState<string>('');

  // Engineering Estimate
  const [estimate, setEstimate] = useState<any | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Confirmation & Checkout
  const [confirmedTerms, setConfirmedTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'sslcommerz' | 'cod'>('cod');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Modals
  const [viewingOrderDoc, setViewingOrderDoc] = useState<any | null>(null);
  const [customizingPackage, setCustomizingPackage] = useState<any | null>(null);

  useEffect(() => {
    setCustomerPage(1);
  }, [activeTab]);

  const pagedCustomerOrders = ordersList.slice((customerPage - 1) * CUSTOMER_PAGE_SIZE, customerPage * CUSTOMER_PAGE_SIZE);
  const pagedCustomerPackages = packagesCatalog.slice((customerPage - 1) * CUSTOMER_PAGE_SIZE, customerPage * CUSTOMER_PAGE_SIZE);

  // Load catalogs on mount
  useEffect(() => {
    void api<{ appliances: Appliance[] }>('/renewable/appliances')
      .then((res) => {
        setAppliancesCatalog(res.appliances);
        // Pre-populate sensible home appliances if empty
        if (selections.length === 0 && res.appliances.length > 0) {
          const defaultItems = res.appliances.slice(0, 3).map((a) => ({
            applianceId: a.id,
            name: a.name,
            category: a.category,
            ratedPowerW: a.ratedPowerW,
            surgePowerW: a.surgePowerW || a.ratedPowerW,
            quantity: a.category === 'Lighting' ? 6 : 2,
            dailyHours: Number(a.defaultHours) || 6,
          }));
          setSelections(defaultItems);
        }
      })
      .catch(() => null);

    void api<{ products: any[] }>('/renewable/products').then((res) => setProductsCatalog(res.products)).catch(() => null);
    void api<{ packages: any[] }>('/renewable/packages').then((res) => setPackagesCatalog(res.packages)).catch(() => null);
    void loadUserOrders();

    if (paymentStatusParam === 'success') {
      setSuccessNotice(`Payment successfully verified via SSLCommerz! Transaction ID: ${tranIdParam || 'N/A'}. Your project status is now updated.`);
    } else if (paymentStatusParam === 'failed') {
      setErrorMessage('Payment transaction was unsuccessful or was cancelled. You may re-try payment or select Cash on Delivery.');
    }
  }, []);

  useEffect(() => {
    if (productsCatalog.length === 0) return;
    const rawPendingProject = localStorage.getItem('solaragent.pending_project');
    if (!rawPendingProject) return;

    try {
      const pendingProject = JSON.parse(rawPendingProject) as {
        projectType?: ProjectType;
        items?: Array<{ product?: { id?: string; category?: string } }>;
      };
      const pendingItems = pendingProject.items || [];
      const findProductId = (terms: string[]) => {
        const item = pendingItems.find((entry) => terms.some((term) => (entry.product?.category || '').toLowerCase().includes(term)));
        return item?.product?.id || '';
      };

      setProjectType(pendingProject.projectType || 'solar');
      setSelectedPanelId(findProductId(['panel', 'module', 'solar']));
      setSelectedInverterId(findProductId(['inverter']));
      setSelectedBatteryId(findProductId(['battery', 'storage']));
      setSelectedTurbineId(findProductId(['wind', 'turbine']));
      setWizardStep(4);
      setSuccessNotice(`Equipment Builder configuration synced: ${pendingItems.length} catalog item${pendingItems.length === 1 ? '' : 's'} loaded into your sizing workflow.`);
      localStorage.removeItem('solaragent.pending_project');
    } catch (error) {
      console.error('Failed to sync pending equipment builder configuration:', error);
      localStorage.removeItem('solaragent.pending_project');
    }
  }, [productsCatalog.length]);

  async function loadUserOrders() {
    try {
      const res = await api<{ orders: any[] }>('/renewable/orders');
      setOrdersList(res.orders);
    } catch {
      // ignore
    }
  }

  // Location selector helpers
  const availableDistricts = useMemo(() => getDistrictsByDivision(location.division), [location.division]);
  const availableUpazilas = useMemo(() => getUpazilas(location.district), [location.district]);

  function onDivisionChange(div: string) {
    setLocation({ ...location, division: div, district: '', upazila: '' });
  }

  function onDistrictChange(dist: string) {
    setLocation({ ...location, district: dist, upazila: '' });
  }

  // Load weather when district changes or step 2 is entered
  async function loadWeather() {
    if (!location.district) return;
    setWeatherLoading(true);
    try {
      const res = await api<{ weather: WeatherInfo }>(
        `/renewable/weather?district=${encodeURIComponent(location.district)}&division=${encodeURIComponent(location.division)}`
      );
      setWeather(res.weather);
    } catch {
      // ignore
    } finally {
      setWeatherLoading(false);
    }
  }

  // Appliance functions
  function addAppliance(applianceId: string) {
    if (!applianceId) return;
    if (selections.some((s) => s.applianceId === applianceId)) {
      setErrorMessage('This appliance is already in your load schedule. You can adjust its quantity below.');
      return;
    }
    const item = appliancesCatalog.find((a) => a.id === applianceId);
    if (!item) return;

    setSelections([
      ...selections,
      {
        applianceId: item.id,
        name: item.name,
        category: item.category,
        ratedPowerW: item.ratedPowerW,
        surgePowerW: item.surgePowerW || item.ratedPowerW,
        quantity: 1,
        dailyHours: Number(item.defaultHours) || 4,
      },
    ]);
    setErrorMessage('');
  }

  function addCustomApplianceItem() {
    if (!customAppliance.name.trim() || customAppliance.ratedPowerW <= 0) {
      setErrorMessage('Please provide a valid appliance name and rated wattage.');
      return;
    }
    const customId = `custom-${Date.now()}`;
    setSelections([
      ...selections,
      {
        applianceId: customId,
        name: customAppliance.name,
        category: customAppliance.category,
        ratedPowerW: customAppliance.ratedPowerW,
        surgePowerW: customAppliance.surgePowerW || customAppliance.ratedPowerW,
        quantity: customAppliance.quantity,
        dailyHours: customAppliance.dailyHours,
      },
    ]);
    setCustomAppliance({ name: '', category: 'Custom', ratedPowerW: 100, surgePowerW: 150, quantity: 1, dailyHours: 4 });
    setShowCustomForm(false);
    setErrorMessage('');
  }

  function updateSelection(index: number, patch: Partial<Selection>) {
    setSelections(selections.map((s, idx) => (idx === index ? { ...s, ...patch } : s)));
  }

  function removeSelection(index: number) {
    setSelections(selections.filter((_, idx) => idx !== index));
  }

  // Live Load Calculations
  const loadSummary = useMemo(() => {
    const totalWatts = selections.reduce((sum, s) => sum + (s.ratedPowerW || 50) * s.quantity, 0);
    const dailyKwh = selections.reduce((sum, s) => sum + ((s.ratedPowerW || 50) * s.quantity * s.dailyHours) / 1000, 0);
    const peakDemandKw = Number(((totalWatts * 0.75) / 1000).toFixed(2));
    const maxSurgeW = Math.max(...selections.map((s) => (s.surgePowerW || s.ratedPowerW || 50) * s.quantity), totalWatts * 1.3);

    return {
      totalWatts,
      dailyKwh: Number(dailyKwh.toFixed(2)),
      peakDemandKw,
      maxSurgeW: Math.round(maxSurgeW),
    };
  }, [selections]);

  // Sizing Calculation Request
  async function runEngineeringCalculation() {
    if (selections.length === 0) {
      setErrorMessage('Please add at least one appliance to calculate your daily energy demand.');
      return;
    }
    setCalcLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        type: projectType,
        userId: storedUser?.id || undefined,
        location,
        configuration: {
          system: configuration.system,
          locationType: configuration.locationType,
          rooftopType: configuration.rooftopType,
          rooftopAreaSqFt: configuration.rooftopAreaSqFt ? Number(configuration.rooftopAreaSqFt) : undefined,
          towerHeightM: configuration.towerHeightM ? Number(configuration.towerHeightM) : undefined,
          terrainType: configuration.terrainType,
        },
        appliances: selections,
        selectedPanelId: selectedPanelId || undefined,
        selectedInverterId: selectedInverterId || undefined,
        selectedBatteryId: selectedBatteryId || undefined,
        selectedTurbineId: selectedTurbineId || undefined,
      };

      const result = await api<{ estimate: any }>('/renewable/estimate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setEstimate(result.estimate);
      setWizardStep(5);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Calculation failed. Please verify your inputs.');
    } finally {
      setCalcLoading(false);
    }
  }

  // Order Submission
  async function submitProjectOrder() {
    if (!estimate) {
      setErrorMessage('Please generate an engineering calculation before confirming your project.');
      return;
    }
    if (!confirmedTerms) {
      setErrorMessage('Please check the confirmation box verifying that you accept the preliminary engineering estimates.');
      return;
    }

    setSubmittingOrder(true);
    setErrorMessage('');

    try {
      const payload = {
        type: projectType,
        location,
        configuration: {
          system: configuration.system,
          locationType: configuration.locationType,
          rooftopType: configuration.rooftopType,
          rooftopAreaSqFt: configuration.rooftopAreaSqFt ? Number(configuration.rooftopAreaSqFt) : undefined,
        },
        appliances: selections,
        selectedPanelId: selectedPanelId || undefined,
        selectedInverterId: selectedInverterId || undefined,
        selectedBatteryId: selectedBatteryId || undefined,
        selectedTurbineId: selectedTurbineId || undefined,
        customerName: userProfile.fullName,
        contactNumber: userProfile.contactNumber,
        email: userProfile.email || undefined,
        address: `${location.village}, ${location.upazila}, ${location.district}`,
        paymentMethod,
      };

      const res = await api<{ request: any; order: any; estimate: any }>('/renewable/requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const newOrder = res.order;

      if (paymentMethod === 'sslcommerz') {
        // Initialize SSLCommerz session
        const initRes = await api<{ gatewayUrl: string }>('/payments/sslcommerz/init', {
          method: 'POST',
          body: JSON.stringify({ orderId: newOrder.id }),
        });
        window.location.href = initRes.gatewayUrl;
        return;
      } else {
        setSuccessNotice(`Project submitted successfully under order number ${newOrder.orderNumber}! Payment will be verified upon on-site physical inspection.`);
        await loadUserOrders();
        setActiveTab('orders');
      }
    } catch (err) {
      setErrorMessage((err as Error).message || 'Could not place order. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  }

  // Profile Update
  async function saveProfile() {
    try {
      await api('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(userProfile),
      });
      localStorage.setItem('solaragent.user', JSON.stringify({ ...storedUser, ...userProfile }));
      setSuccessNotice('Your customer profile and installation location have been updated.');
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  return (
    <main className="workspace-page customer-page">
      {/* Page Heading & Global Nav */}
      <div className="page-heading customer-heading customer-workspace-hero">
        <div>
          <span className="eyebrow">SolarAgent Pro · Customer Portal</span>
          <h1>Renewable Energy Workspace</h1>
          <p>
            Configure custom Solar, Wind, and Hybrid systems, inspect meteorological data, and manage verified installation.
          </p>
          <div className="customer-hero-stats" aria-label="Workspace features">
            <span><strong>01</strong> Guided sizing</span>
            <span><strong>02</strong> Local weather data</span>
            <span><strong>03</strong> Verified installation</span>
          </div>
        </div>
        <div className="customer-hero-status">
          <span className="pill success">● Bangladesh feed connected</span>
          <div className="customer-avatar">
            {userProfile.fullName ? userProfile.fullName.slice(0, 2).toUpperCase() : 'CU'}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <nav className="tab-navigation customer-tabs" aria-label="Customer workspace navigation">
        <button
          className={`tab-btn ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          ⚡ Project Request
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('orders');
            void loadUserOrders();
          }}
        >
          📦 My Orders & Tracking ({ordersList.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'packages' ? 'active' : ''}`}
          onClick={() => setActiveTab('packages')}
        >
          ⭐ Recommended Packages
        </button>
        <button
          className={`tab-btn ${activeTab === 'support' ? 'active' : ''}`}
          onClick={() => setActiveTab('support')}
        >
          🛠️ Support & Assistance
        </button>
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 My Profile
        </button>
      </nav>

      {/* Global confirmation modal */}
      {(successNotice || errorMessage) && (
        <div
          className={`customer-confirmation-overlay ${errorMessage ? 'is-error' : 'is-success'}`}
          role="presentation"
          onClick={() => {
            setSuccessNotice('');
            setErrorMessage('');
          }}
        >
          <section
            className="customer-confirmation-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="customer-confirmation-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-confirmation-icon" aria-hidden="true">
              {errorMessage ? '!' : '✓'}
            </div>
            <div className="customer-confirmation-content">
              <span className="eyebrow">{errorMessage ? 'Action needs attention' : 'Request update'}</span>
              <h2 id="customer-confirmation-title">{errorMessage ? 'Unable to complete request' : 'Request completed successfully'}</h2>
              <p>{errorMessage || successNotice}</p>
            </div>
            <button
              type="button"
              className="customer-confirmation-close"
              aria-label="Close confirmation"
              onClick={() => {
                setSuccessNotice('');
                setErrorMessage('');
              }}
            >
              ×
            </button>
            <div className="customer-confirmation-actions">
              <button
                type="button"
                className={errorMessage ? 'primary-button' : 'secondary-button'}
                onClick={() => {
                  setSuccessNotice('');
                  setErrorMessage('');
                }}
              >
                {errorMessage ? 'Close and try again' : 'Continue'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TAB 1: PROJECT REQUEST */}
      {activeTab === 'request' && (
        <div className="request-flow">
          {/* Project Type Selector */}
          <section className="package-grid customer-project-types">
            <button
              type="button"
              className={`package-option customer-project-card ${projectType === 'solar' ? 'selected-option' : ''}`}
              onClick={() => {
                setProjectType('solar');
                setEstimate(null);
              }}
            >
              <span className="eyebrow">Solar Photovoltaic</span>
              <h2>Solar Panel</h2>
              <p>Rooftop or ground-mounted monocrystalline PV system calibrated for Bangladesh sun hours.</p>
              <span className="text-button">Configure Solar →</span>
            </button>

            <button
              type="button"
              className={`package-option customer-project-card ${projectType === 'wind' ? 'selected-option' : ''}`}
              onClick={() => {
                setProjectType('wind');
                setEstimate(null);
              }}
            >
              <span className="eyebrow">Wind Energy</span>
              <h2>Windmill</h2>
              <p>Small to medium aerodynamic wind turbine tailored for coastal, island, and open plain regions.</p>
              <span className="text-button">Configure Wind →</span>
            </button>

            <button
              type="button"
              className={`package-option customer-project-card ${projectType === 'hybrid' ? 'selected-option' : ''}`}
              onClick={() => {
                setProjectType('hybrid');
                setEstimate(null);
              }}
            >
              <span className="eyebrow">Multi-Source Renewable</span>
              <h2>Hybrid — Solar + Wind</h2>
              <p>Combines solar PV array, wind generation, smart grid changeover, and lithium battery storage.</p>
              <span className="text-button">Configure Hybrid →</span>
            </button>
          </section>

          {/* Sub-selector for Solar: Customized vs Recommended */}
          {projectType === 'solar' && (
            <div className="solar-sub-toggle">
              <button
                className={`sub-toggle-btn ${solarMode === 'customized' ? 'active' : ''}`}
                onClick={() => setSolarMode('customized')}
              >
                🛠️ Customized Solar Project Request (Multi-Step Sizing)
              </button>
              <button
                className={`sub-toggle-btn ${solarMode === 'recommended' ? 'active' : ''}`}
                onClick={() => setSolarMode('recommended')}
              >
                ⭐ Recommended Solar Packages (Pre-Sized & Custom-Tunable)
              </button>
            </div>
          )}

          {/* If Solar Mode is Recommended Packages */}
          {projectType === 'solar' && solarMode === 'recommended' ? (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Admin-Managed Recommended Packages</span>
                  <h2>Choose an Engineered Solar Package</h2>
                  <p>
                    All packages can be customized: modify panel brands, adjust quantities, swap inverters, or add battery storage.
                  </p>
                </div>
              </div>

              <div className="recommended-packages-grid">
                {pagedCustomerPackages.map((pkg) => (
                  <div key={pkg.id} className="package-card">
                    <div className="package-card-header">
                      <span className="pill">{pkg.systemType?.toUpperCase()}</span>
                      <h3>{pkg.name}</h3>
                      <div className="package-capacity">{pkg.capacityKwp} kWp</div>
                    </div>

                    <p className="package-desc">{pkg.description}</p>

                    <div className="package-specs">
                      <div><strong>Expected Output:</strong> ~{pkg.expectedGenerationMonthlyKwh} kWh / month</div>
                      <div><strong>Warranty:</strong> {pkg.warranty}</div>
                      <div><strong>Suitable Profile:</strong> {pkg.suitableProfile}</div>
                    </div>

                    <div className="package-price-row">
                      <span>Standard Package Price:</span>
                      <strong>BDT {Number(pkg.totalPrice).toLocaleString()}</strong>
                    </div>

                    <div className="package-card-actions">
                      <button
                        className="primary-button"
                        onClick={() => setCustomizingPackage(pkg)}
                        type="button"
                      >
                        ⚙️ Customize This Package
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            /* Multi-Step Customized Workflow */
            <div className="wizard-container">
              {/* Stepper Bar */}
              <div className="stepper-bar">
                <div className={`step-item ${wizardStep >= 1 ? 'completed' : ''} ${wizardStep === 1 ? 'current' : ''}`} onClick={() => setWizardStep(1)}>
                  <span className="step-circle">1</span>
                  <span className="step-label">Location & Rooftop</span>
                </div>
                <div className={`step-item ${wizardStep >= 2 ? 'completed' : ''} ${wizardStep === 2 ? 'current' : ''}`} onClick={() => { setWizardStep(2); void loadWeather(); }}>
                  <span className="step-circle">2</span>
                  <span className="step-label">Weather Data</span>
                </div>
                <div className={`step-item ${wizardStep >= 3 ? 'completed' : ''} ${wizardStep === 3 ? 'current' : ''}`} onClick={() => setWizardStep(3)}>
                  <span className="step-circle">3</span>
                  <span className="step-label">Appliances & Load</span>
                </div>
                <div className={`step-item ${wizardStep >= 4 ? 'completed' : ''} ${wizardStep === 4 ? 'current' : ''}`} onClick={() => setWizardStep(4)}>
                  <span className="step-circle">4</span>
                  <span className="step-label">System Type</span>
                </div>
                <div className={`step-item ${wizardStep >= 5 ? 'completed' : ''} ${wizardStep === 5 ? 'current' : ''}`} onClick={() => { if (estimate) setWizardStep(5); }}>
                  <span className="step-circle">5</span>
                  <span className="step-label">Engineering Sizing & BOM</span>
                </div>
                <div className={`step-item ${wizardStep >= 6 ? 'completed' : ''} ${wizardStep === 6 ? 'current' : ''}`} onClick={() => { if (estimate) setWizardStep(6); }}>
                  <span className="step-circle">6</span>
                  <span className="step-label">Confirmation & Payment</span>
                </div>
              </div>

              {/* STEP 1: LOCATION & ROOFTOP */}
              {wizardStep === 1 && (
                <section className="panel assessment-panel customer-step1-panel">
                  <div className="panel-heading customer-step-heading">
                    <div>
                      <div className="customer-step-kicker"><span className="step-kicker-number">01</span><span>Location & site</span></div>
                      <h2>Installation Site Identification</h2>
                      <p>
                        Tell us where the system will be installed. We use this information to estimate sun hours, wind conditions, and structural requirements.
                      </p>
                    </div>
                    <div className="customer-step-helper">
                      <span className="customer-step-helper-icon">⌖</span>
                      <span><strong>Why we ask</strong><small>Accurate location means a more reliable first estimate.</small></span>
                    </div>
                  </div>

                  <div className="customer-form customer-step1-form">
                    <label>
                      Division
                      <select value={location.division} onChange={(e) => onDivisionChange(e.target.value)} required>
                        <option value="">Select Division</option>
                        {BANGLADESH_DIVISIONS.map((div) => (
                          <option key={div} value={div}>{div}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      District
                      <select
                        value={location.district}
                        onChange={(e) => onDistrictChange(e.target.value)}
                        disabled={!location.division}
                        required
                      >
                        <option value="">{location.division ? 'Select District' : 'Choose Division first'}</option>
                        {availableDistricts.map((d) => (
                          <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Upazila / Thana
                      <select
                        value={location.upazila}
                        onChange={(e) => setLocation({ ...location, upazila: e.target.value })}
                        disabled={!location.district}
                        required
                      >
                        <option value="">{location.district ? 'Select Upazila' : 'Choose District first'}</option>
                        {availableUpazilas.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Village / Area / Ward
                      <input
                        value={location.village}
                        onChange={(e) => setLocation({ ...location, village: e.target.value })}
                        placeholder="e.g., Road 8/A, House 12"
                        required
                      />
                    </label>

                    <label>
                      Location Setting
                      <select
                        value={configuration.locationType}
                        onChange={(e) => setConfiguration({ ...configuration, locationType: e.target.value as any })}
                      >
                        <option value="urban">Urban / Residential Area</option>
                        <option value="city">Dense City Center (High-rise shading)</option>
                        <option value="rural">Rural / Open Agro Field</option>
                      </select>
                    </label>

                    {projectType !== 'wind' && (
                      <>
                        <label>
                          Rooftop Construction Substrate
                          <select
                            value={configuration.rooftopType}
                            onChange={(e) => setConfiguration({ ...configuration, rooftopType: e.target.value as any })}
                          >
                            <option value="concrete">Concrete RCC Flat Roof (Chemical Anchor)</option>
                            <option value="metal">Metal / Industrial Tin Sheet (Standing Seam Clamps)</option>
                            <option value="tile">Clay Tile Slanted Roof</option>
                            <option value="other">Ground Mount / RCC Shed</option>
                          </select>
                        </label>

                        <label>
                          Available Clear Rooftop Area (Sq Ft)
                          <input
                            type="number"
                            min="50"
                            max="50000"
                            value={configuration.rooftopAreaSqFt}
                            onChange={(e) => setConfiguration({ ...configuration, rooftopAreaSqFt: e.target.value })}
                            placeholder="e.g., 500 sq ft"
                            required
                          />
                        </label>
                      </>
                    )}

                    {projectType !== 'solar' && (
                      <>
                        <label>
                          Tower Height (Meters)
                          <select
                            value={configuration.towerHeightM}
                            onChange={(e) => setConfiguration({ ...configuration, towerHeightM: e.target.value })}
                          >
                            <option value="12">12 Meters (Rooftop Mast / Low Profile)</option>
                            <option value="18">18 Meters (Standard Rural Lattice Guyed)</option>
                            <option value="24">24 Meters (Elevated Coastal / Free-standing)</option>
                          </select>
                        </label>

                        <label>
                          Terrain Roughness / Exposure
                          <select
                            value={configuration.terrainType}
                            onChange={(e) => setConfiguration({ ...configuration, terrainType: e.target.value as any })}
                          >
                            <option value="open_coastal">Open Coastal / Island Shoreline (Minimal Friction)</option>
                            <option value="plain">Open Agricultural Plain</option>
                            <option value="suburban">Suburban with Scattered Trees</option>
                            <option value="obstructed">Obstructed Building Environment</option>
                          </select>
                        </label>
                      </>
                    )}
                  </div>

                  <div className="wizard-actions">
                    <button
                      className="primary-button"
                      type="button"
                      disabled={!location.division || !location.district || !location.upazila}
                      onClick={() => {
                        setWizardStep(2);
                        void loadWeather();
                      }}
                    >
                      Continue to Weather Analysis →
                    </button>
                  </div>
                </section>
              )}

              {/* STEP 2: WEATHER INTEGRATION */}
              {wizardStep === 2 && (
                <section className="panel assessment-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">Step 2 of 6 · Meteorological Observation</span>
                      <h2>Google Weather & Regional Climate Benchmarks</h2>
                      <p>
                        Real-time weather observation for <strong>{location.district}, {location.division}</strong>.
                      </p>
                    </div>
                    <button className="secondary-button" onClick={() => void loadWeather()} type="button">
                      🔄 Refresh Observation
                    </button>
                  </div>

                  {weatherLoading ? (
                    <div className="loading-state">Retrieving meteorological feed for {location.district}...</div>
                  ) : weather ? (
                    <div className="weather-container">
                      <div className="metric-grid">
                        <div className="metric-card teal">
                          <span>Temperature</span>
                          <strong>{weather.temperatureC}°C</strong>
                          <small>Relative Humidity: {weather.relativeHumidity}%</small>
                        </div>

                        <div className="metric-card amber">
                          <span>Wind Conditions</span>
                          <strong>{weather.windSpeedKmh} km/h</strong>
                          <small>Gusts: {weather.windGustsKmh} km/h · Dir: {weather.windDirectionDeg}°</small>
                        </div>

                        <div className="metric-card blue">
                          <span>Cloud Cover</span>
                          <strong>{weather.cloudCoverPercent}%</strong>
                          <small>Observation at: {new Date(weather.timestamp).toLocaleTimeString()}</small>
                        </div>

                        <div className="metric-card green">
                          <span>Solar Insolation Benchmark</span>
                          <strong>{weather.solarPlanningBenchmark?.peakSunHoursPerDay} PSH / Day</strong>
                          <small>Calibrated for {location.district}</small>
                        </div>
                      </div>

                      <div className="weather-meta-box">
                        <div><strong>Data Source:</strong> {weather.dataSource}</div>
                        <div><strong>Data Timestamp:</strong> {new Date(weather.timestamp).toLocaleString()}</div>
                        <div style={{ marginTop: '8px', color: '#c53030', fontWeight: 'bold' }}>
                          ⚠️ Critical Engineering Distinction:
                        </div>
                        <div style={{ fontSize: '12px', color: '#4a5568' }}>
                          {weather.disclaimer} Current cloud cover or wind velocity represents instantaneous weather and is NOT used as long-term annualized energy yields. Long-term renewable designs use the regional multi-year benchmarks shown above.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">Click 'Refresh Observation' to query weather data for {location.district}.</div>
                  )}

                  <div className="wizard-actions">
                    <button className="secondary-button" onClick={() => setWizardStep(1)} type="button">
                      ← Back to Location
                    </button>
                    <button className="primary-button" onClick={() => setWizardStep(3)} type="button">
                      Proceed to Load Selection →
                    </button>
                  </div>
                </section>
              )}

              {/* STEP 3: APPLIANCE & ELECTRICAL LOAD */}
              {wizardStep === 3 && (
                <section className="panel assessment-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">Step 3 of 6 · Electrical Load Profiling</span>
                      <h2>Appliance & Energy Demand Schedule</h2>
                      <p>
                        Selected from admin-managed appliances database. Sizing calculates peak demand, daily kWh, and motor startup surge.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        onChange={(e) => {
                          addAppliance(e.target.value);
                          e.target.value = '';
                        }}
                        defaultValue=""
                      >
                        <option value="">+ Add Catalog Appliance...</option>
                        {appliancesCatalog.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.category}) · {a.ratedPowerW}W
                          </option>
                        ))}
                      </select>
                      <button className="secondary-button" onClick={() => setShowCustomForm(!showCustomForm)} type="button">
                        {showCustomForm ? 'Cancel' : '+ Custom Appliance'}
                      </button>
                    </div>
                  </div>

                  {/* Custom Appliance Form */}
                  {showCustomForm && (
                    <div className="custom-appliance-banner">
                      <h4>Add Custom Appliance Not In Database</h4>
                      <div className="customer-form" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                        <label>
                          Appliance Name
                          <input
                            value={customAppliance.name}
                            onChange={(e) => setCustomAppliance({ ...customAppliance, name: e.target.value })}
                            placeholder="e.g., Oxygen Concentrator"
                          />
                        </label>
                        <label>
                          Rated Watts (W)
                          <input
                            type="number"
                            min="1"
                            value={customAppliance.ratedPowerW}
                            onChange={(e) => setCustomAppliance({ ...customAppliance, ratedPowerW: Number(e.target.value) })}
                          />
                        </label>
                        <label>
                          Surge Watts (W)
                          <input
                            type="number"
                            min="1"
                            value={customAppliance.surgePowerW}
                            onChange={(e) => setCustomAppliance({ ...customAppliance, surgePowerW: Number(e.target.value) })}
                          />
                        </label>
                        <label>
                          Quantity
                          <input
                            type="number"
                            min="1"
                            value={customAppliance.quantity}
                            onChange={(e) => setCustomAppliance({ ...customAppliance, quantity: Number(e.target.value) })}
                          />
                        </label>
                        <label>
                          Daily Hours
                          <input
                            type="number"
                            min="0.1"
                            max="24"
                            step="0.5"
                            value={customAppliance.dailyHours}
                            onChange={(e) => setCustomAppliance({ ...customAppliance, dailyHours: Number(e.target.value) })}
                          />
                        </label>
                      </div>
                      <button className="primary-button" onClick={addCustomApplianceItem} type="button" style={{ marginTop: '10px' }}>
                        Add to Schedule
                      </button>
                    </div>
                  )}

                  {/* Appliance List Table */}
                  {selections.length === 0 ? (
                    <div className="empty-state">No electrical loads selected yet. Choose appliances above.</div>
                  ) : (
                    <div className="load-table-wrapper">
                      <table className="doc-table-bordered">
                        <thead>
                          <tr>
                            <th>Appliance</th>
                            <th>Rating (Watts)</th>
                            <th>Surge (Watts)</th>
                            <th style={{ width: '90px' }}>Quantity</th>
                            <th style={{ width: '100px' }}>Daily Hours</th>
                            <th>Daily Energy</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selections.map((sel, idx) => (
                            <tr key={sel.applianceId}>
                              <td>
                                <strong>{sel.name}</strong>
                                <small style={{ display: 'block', color: '#718096' }}>{sel.category}</small>
                              </td>
                              <td>{sel.ratedPowerW} W</td>
                              <td>{sel.surgePowerW} W</td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={sel.quantity}
                                  onChange={(e) => updateSelection(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                                  style={{ width: '60px', padding: '4px' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0.1"
                                  max="24"
                                  step="0.5"
                                  value={sel.dailyHours}
                                  onChange={(e) => updateSelection(idx, { dailyHours: Math.max(0.1, Number(e.target.value)) })}
                                  style={{ width: '60px', padding: '4px' }}
                                />
                              </td>
                              <td>
                                <strong>{(((sel.ratedPowerW || 50) * sel.quantity * sel.dailyHours) / 1000).toFixed(2)} kWh</strong>
                              </td>
                              <td>
                                <button className="text-button" onClick={() => removeSelection(idx)} type="button" style={{ color: '#e53e3e' }}>
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Live Calculated Metric Cards */}
                  <div className="metric-grid" style={{ marginTop: '20px' }}>
                    <div className="metric-card teal">
                      <span>Total Connected Load</span>
                      <strong>{loadSummary.totalWatts.toLocaleString()} W</strong>
                      <small>Sum of rated equipment capacity</small>
                    </div>
                    <div className="metric-card green">
                      <span>Daily Energy Consumption</span>
                      <strong>{loadSummary.dailyKwh} kWh/day</strong>
                      <small>~{(loadSummary.dailyKwh * 30).toFixed(0)} kWh monthly demand</small>
                    </div>
                    <div className="metric-card amber">
                      <span>Peak Demand Estimate</span>
                      <strong>{loadSummary.peakDemandKw} kW</strong>
                      <small>Coincidence factor 0.75</small>
                    </div>
                    <div className="metric-card blue">
                      <span>Max Surge Load</span>
                      <strong>{loadSummary.maxSurgeW.toLocaleString()} W</strong>
                      <small>Sizing inverter startup reserve</small>
                    </div>
                  </div>

                  <div className="wizard-actions">
                    <button className="secondary-button" onClick={() => setWizardStep(2)} type="button">
                      ← Back to Weather
                    </button>
                    <button className="primary-button" onClick={() => setWizardStep(4)} type="button" disabled={selections.length === 0}>
                      Proceed to System Type →
                    </button>
                  </div>
                </section>
              )}

              {/* STEP 4: SYSTEM TYPE */}
              {wizardStep === 4 && (
                <section className="panel assessment-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">Step 4 of 6 · System Architecture</span>
                      <h2>Choose Grid & Storage Configuration</h2>
                      <p>
                        Your selection directly determines inverter technology, battery bank autonomy, grid-export approvals, and bill savings.
                      </p>
                    </div>
                  </div>

                  <div className="system-type-grid">
                    {/* On-grid */}
                    <div
                      className={`system-type-card ${configuration.system === 'on-grid' ? 'selected' : ''}`}
                      onClick={() => setConfiguration({ ...configuration, system: 'on-grid' })}
                    >
                      <div className="card-badge">Cost-Effective & Fastest Payback</div>
                      <h3>On-Grid (Net Metered)</h3>
                      <p>
                        Tied directly to the national utility grid (DESCO, DPDC, BPDB) via a bidirectional meter adhering to Bangladesh Net Metering Guidelines 2018.
                      </p>
                      <ul className="system-features">
                        <li>✓ <strong>Zero Battery Cost:</strong> Lowest capital investment</li>
                        <li>✓ <strong>Net Metering Export:</strong> Excess solar generation credits your bill</li>
                        <li>✓ <strong>Anti-Islanding:</strong> Inverter shuts down during grid outages for utility safety</li>
                        <li>✓ Payback period typically <strong>3.5 - 4.5 years</strong></li>
                      </ul>
                    </div>

                    {/* Off-grid */}
                    <div
                      className={`system-type-card ${configuration.system === 'off-grid' ? 'selected' : ''}`}
                      onClick={() => setConfiguration({ ...configuration, system: 'off-grid' })}
                    >
                      <div className="card-badge">100% Autonomous</div>
                      <h3>Off-Grid (Self-Sustaining)</h3>
                      <p>
                        Completely decoupled from the electric grid. Powers loads solely from solar/wind and a dedicated deep-cycle battery bank.
                      </p>
                      <ul className="system-features">
                        <li>✓ <strong>Complete Independence:</strong> Immune to power grid load shedding</li>
                        <li>✓ Sized for <strong>1.5 days autonomy</strong> for monsoon rainy periods</li>
                        <li>✓ Requires heavy-duty Lithium or Tall Tubular Solar Batteries</li>
                        <li>✓ Ideal for remote rural homes, farmhouses, or char islands</li>
                      </ul>
                    </div>

                    {/* High-grid */}
                    <div
                      className={`system-type-card ${configuration.system === 'hybrid-grid' ? 'selected' : ''}`}
                      onClick={() => setConfiguration({ ...configuration, system: 'hybrid-grid' })}
                    >
                      <div className="card-badge">Premium High-Voltage Architecture</div>
                      <h3>High-Grid (Hybrid Interactive)</h3>
                      <p>
                        Advanced grid-interactive topology with automated net-metering export plus high-voltage lithium battery essential load backup.
                      </p>
                      <ul className="system-features">
                        <li>✓ <strong>Smart Grid Feed-In:</strong> Exports daytime surplus to utility</li>
                        <li>✓ <strong>Instant UPS Failover (&lt;4ms):</strong> Zero blackout during outages</li>
                        <li>✓ Powers critical circuits (Lights, Fans, Refrigerator, Router) 24/7</li>
                        <li>✓ Compatible with Lithium Iron Phosphate (LiFePO4) storage</li>
                      </ul>
                    </div>
                  </div>

                  <div className="wizard-actions">
                    <button className="secondary-button" onClick={() => setWizardStep(3)} type="button">
                      ← Back to Load Schedule
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => void runEngineeringCalculation()}
                      type="button"
                      disabled={calcLoading}
                    >
                      {calcLoading ? 'Running Engineering Calculation Engine...' : 'Calculate Preliminary Recommendation →'}
                    </button>
                  </div>
                </section>
              )}

              {/* STEP 5: ENGINEERING ESTIMATE, PRODUCTS & BOM */}
              {wizardStep === 5 && estimate && (
                <div className="estimate-view">
                  {/* Suitability Score Banner */}
                  <section className="panel" style={{ borderLeft: '6px solid #319795' }}>
                    <div className="panel-heading">
                      <div>
                        <span className="eyebrow">Location Matching & Suitability Algorithm</span>
                        <h2>Site Suitability Rating: {estimate.suitability?.totalPercent}%</h2>
                        <p>Based on documented four-factor algorithm combining area, substrate, climate, and load profile.</p>
                      </div>
                      <span className="pill success" style={{ fontSize: '16px', padding: '8px 16px' }}>
                        {estimate.suitability?.totalPercent}% SUITABILITY
                      </span>
                    </div>

                    <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <div className="metric-card teal">
                        <span>Roof Area Fit</span>
                        <strong>{estimate.suitability?.areaFactor?.score} / 35 Pts</strong>
                        <small>{estimate.suitability?.areaFactor?.description}</small>
                      </div>
                      <div className="metric-card green">
                        <span>Structural Substrate</span>
                        <strong>{estimate.suitability?.structureFactor?.score} / 25 Pts</strong>
                        <small>{estimate.suitability?.structureFactor?.description}</small>
                      </div>
                      <div className="metric-card amber">
                        <span>Resource Insolation</span>
                        <strong>{estimate.suitability?.resourceFactor?.score} / 25 Pts</strong>
                        <small>{estimate.suitability?.resourceFactor?.description}</small>
                      </div>
                      <div className="metric-card blue">
                        <span>Exposure Index</span>
                        <strong>{estimate.suitability?.locationFactor?.score} / 15 Pts</strong>
                        <small>{estimate.suitability?.locationFactor?.description}</small>
                      </div>
                    </div>
                  </section>

                  {/* Sizing & Generation Metrics */}
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <span className="eyebrow">Engineering System Recommendation</span>
                        <h2>Recommended Capacity: {estimate.systemSizing?.totalSystemCapacityKwp} kWp</h2>
                        <p>{estimate.systemDesign?.architectureType}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="secondary-button"
                          onClick={() => setViewingOrderDoc({ ...estimate, orderNumber: 'PREVIEW-ESTIMATE' })}
                          type="button"
                        >
                          📄 Preview Full Installation Document & BOM
                        </button>
                      </div>
                    </div>

                    <div className="metric-grid">
                      <div className="metric-card teal">
                        <span>Daily Generation</span>
                        <strong>{estimate.generationEstimates?.dailyKwh} kWh</strong>
                        <small>~{estimate.generationEstimates?.monthlyKwh} kWh/month</small>
                      </div>

                      <div className="metric-card green">
                        <span>Estimated Savings</span>
                        <strong>BDT {estimate.financialEstimates?.monthlySavingsBdt?.toLocaleString()} / mo</strong>
                        <small>BDT {estimate.financialEstimates?.annualSavingsBdt?.toLocaleString()} / year</small>
                      </div>

                      <div className="metric-card amber">
                        <span>Estimated Payback</span>
                        <strong>{estimate.financialEstimates?.paybackPeriodYears} Years</strong>
                        <small>10-Yr Net Savings: BDT {estimate.financialEstimates?.estimatedTenYearSavingsBdt?.toLocaleString()}</small>
                      </div>

                      <div className="metric-card blue">
                        <span>Rooftop Footprint</span>
                        <strong>{estimate.systemSizing?.requiredRoofAreaSqFt} Sq Ft</strong>
                        <small>Available: {estimate.systemSizing?.availableRoofAreaSqFt} sq ft</small>
                      </div>
                    </div>

                    <div className="notice" style={{ marginTop: '16px' }}>
                      <strong>Assumptions:</strong> {estimate.generationEstimates?.assumptions?.join(' · ')}
                    </div>
                  </section>

                  {/* Equipment Comparison & Selector */}
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <span className="eyebrow">Database Catalog Equipment</span>
                        <h2>Selected Equipment & Model Switching</h2>
                        <p>All products sourced from approved tier-1 hardware database.</p>
                      </div>
                    </div>

                    <div className="equipment-selector-grid">
                      {/* Solar Panel Selector */}
                      {estimate.systemSizing?.solarCapacityKwp > 0 && (
                        <div className="equipment-card">
                          <span className="pill">SOLAR MODULE</span>
                          <h4>{estimate.selectedProducts?.panel?.name}</h4>
                          <div style={{ fontSize: '13px', color: '#718096', margin: '8px 0' }}>
                            <div>Brand: {estimate.selectedProducts?.panel?.brand} · {estimate.selectedProducts?.panel?.wattage}W</div>
                            <div>Efficiency: {estimate.selectedProducts?.panel?.efficiency}%</div>
                            <div>Warranty: {estimate.selectedProducts?.panel?.warranty}</div>
                            <div>Required Quantity: <strong>{estimate.systemSizing?.panelCount} Panels</strong></div>
                          </div>

                          <label style={{ fontSize: '12px' }}>Switch Panel Model:</label>
                          <select
                            value={selectedPanelId}
                            onChange={(e) => {
                              setSelectedPanelId(e.target.value);
                              void runEngineeringCalculation();
                            }}
                          >
                            <option value="">Default Recommended Panel</option>
                            {productsCatalog.filter((p) => p.category === 'module').map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.wattage}W) · BDT {Number(m.price).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Inverter Selector */}
                      <div className="equipment-card">
                        <span className="pill">INVERTER</span>
                        <h4>{estimate.selectedProducts?.inverter?.name}</h4>
                        <div style={{ fontSize: '13px', color: '#718096', margin: '8px 0' }}>
                          <div>Brand: {estimate.selectedProducts?.inverter?.brand}</div>
                          <div>Capacity: {((estimate.selectedProducts?.inverter?.wattage || 3000) / 1000)} kW</div>
                          <div>Warranty: {estimate.selectedProducts?.inverter?.warranty}</div>
                        </div>

                        <label style={{ fontSize: '12px' }}>Switch Inverter Model:</label>
                        <select
                          value={selectedInverterId}
                          onChange={(e) => {
                            setSelectedInverterId(e.target.value);
                            void runEngineeringCalculation();
                          }}
                        >
                          <option value="">Default Recommended Inverter</option>
                          {productsCatalog.filter((p) => p.category === 'inverter').map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} · BDT {Number(inv.price).toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Battery Selector */}
                      {estimate.systemSizing?.batteryCapacityKwh > 0 && (
                        <div className="equipment-card">
                          <span className="pill">STORAGE BATTERY</span>
                          <h4>{estimate.selectedProducts?.battery?.name}</h4>
                          <div style={{ fontSize: '13px', color: '#718096', margin: '8px 0' }}>
                            <div>Brand: {estimate.selectedProducts?.battery?.brand}</div>
                            <div>Required Capacity: {estimate.systemSizing?.batteryCapacityKwh} kWh</div>
                            <div>Required Quantity: <strong>{estimate.systemSizing?.batteryCount} Units</strong></div>
                          </div>

                          <label style={{ fontSize: '12px' }}>Switch Battery Model:</label>
                          <select
                            value={selectedBatteryId}
                            onChange={(e) => {
                              setSelectedBatteryId(e.target.value);
                              void runEngineeringCalculation();
                            }}
                          >
                            <option value="">Default Recommended Battery</option>
                            {productsCatalog.filter((p) => p.category === 'battery').map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name} · BDT {Number(b.price).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Wind Turbine Selector */}
                      {projectType !== 'solar' && estimate.selectedProducts?.turbine && (
                        <div className="equipment-card">
                          <span className="pill">WIND TURBINE</span>
                          <h4>{estimate.selectedProducts?.turbine?.name}</h4>
                          <div style={{ fontSize: '13px', color: '#718096', margin: '8px 0' }}>
                            <div>Brand: {estimate.selectedProducts?.turbine?.brand} · {estimate.selectedProducts?.turbine?.wattage}W</div>
                            <div>Quantity: {estimate.systemSizing?.windTurbineCount} Units</div>
                          </div>

                          <label style={{ fontSize: '12px' }}>Switch Turbine Model:</label>
                          <select
                            value={selectedTurbineId}
                            onChange={(e) => {
                              setSelectedTurbineId(e.target.value);
                              void runEngineeringCalculation();
                            }}
                          >
                            <option value="">Default Recommended Turbine</option>
                            {productsCatalog.filter((p) => p.category === 'turbine').map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} · BDT {Number(t.price).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Certified Bill of Materials (BOM) Table */}
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <span className="eyebrow">Certified Equipment Schedule</span>
                        <h2>Bill of Materials (BOM)</h2>
                      </div>
                    </div>

                    <table className="doc-table-bordered">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Component</th>
                          <th>Manufacturer / Brand</th>
                          <th>Specification</th>
                          <th>Qty</th>
                          <th>Unit Price (BDT)</th>
                          <th>Total (BDT)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estimate.billOfMaterials?.map((item: any, i: number) => (
                          <tr key={i}>
                            <td>{item.itemNo}</td>
                            <td><strong>{item.component}</strong></td>
                            <td>{item.manufacturer}</td>
                            <td>{item.specification}</td>
                            <td>{item.quantity}</td>
                            <td>{Number(item.unitPrice).toLocaleString()}</td>
                            <td><strong>{Number(item.totalPrice).toLocaleString()}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>

                  {/* Itemized Cost Breakdown */}
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <span className="eyebrow">Transparent Commercial Quotation</span>
                        <h2>Itemized System Pricing</h2>
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2b6cb0' }}>
                        BDT {Number(estimate.pricing?.finalTotal).toLocaleString()}
                      </div>
                    </div>

                    <div className="pricing-grid">
                      {estimate.pricing?.solarPanels && (
                        <div className="pricing-row">
                          <span>Solar PV Modules ({estimate.pricing.solarPanels.count} × {estimate.pricing.solarPanels.name}):</span>
                          <strong>BDT {estimate.pricing.solarPanels.total?.toLocaleString()}</strong>
                        </div>
                      )}
                      <div className="pricing-row">
                        <span>Inverter Unit ({estimate.pricing?.inverter?.name}):</span>
                        <strong>BDT {estimate.pricing?.inverter?.total?.toLocaleString()}</strong>
                      </div>
                      {estimate.pricing?.battery && (
                        <div className="pricing-row">
                          <span>Energy Storage Battery Bank ({estimate.pricing.battery.count} × {estimate.pricing.battery.name}):</span>
                          <strong>BDT {estimate.pricing.battery.total?.toLocaleString()}</strong>
                        </div>
                      )}
                      {estimate.pricing?.windTurbine && (
                        <div className="pricing-row">
                          <span>Wind Turbine Assemblies ({estimate.pricing.windTurbine.count} × {estimate.pricing.windTurbine.name}):</span>
                          <strong>BDT {estimate.pricing.windTurbine.total?.toLocaleString()}</strong>
                        </div>
                      )}
                      <div className="pricing-row">
                        <span>Anodized Aluminum Mounting Structure:</span>
                        <strong>BDT {estimate.pricing?.mountingStructure?.total?.toLocaleString()}</strong>
                      </div>
                      <div className="pricing-row">
                        <span>Electrical BOS (Combiner Box, SPD 1000V, Cables, Earthing):</span>
                        <strong>BDT {estimate.pricing?.electricalComponents?.total?.toLocaleString()}</strong>
                      </div>
                      <div className="pricing-row">
                        <span>Turnkey Field Installation & Testing:</span>
                        <strong>BDT {estimate.pricing?.installation?.total?.toLocaleString()}</strong>
                      </div>
                      <div className="pricing-row">
                        <span>Engineering Setup & Delivery Logistics:</span>
                        <strong>BDT {((estimate.pricing?.setup || 0) + (estimate.pricing?.delivery || 0)).toLocaleString()}</strong>
                      </div>
                      <div className="pricing-row">
                        <span>Documentation & Net-Metering (NEM) Utility Processing:</span>
                        <strong>BDT {estimate.pricing?.documentation?.toLocaleString()}</strong>
                      </div>
                      {estimate.pricing?.discounts > 0 && (
                        <div className="pricing-row" style={{ color: '#38a169' }}>
                          <span>Promotional Discount:</span>
                          <strong>- BDT {estimate.pricing.discounts?.toLocaleString()}</strong>
                        </div>
                      )}
                      <div className="pricing-row">
                        <span>Applicable VAT / Tax ({estimate.pricing?.taxPercent}%):</span>
                        <strong>BDT {estimate.pricing?.taxes?.toLocaleString()}</strong>
                      </div>
                      <div className="pricing-row total-highlight">
                        <span>Final Total (All Inclusive):</span>
                        <span>BDT {Number(estimate.pricing?.finalTotal).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="wizard-actions">
                      <button className="secondary-button" onClick={() => setWizardStep(4)} type="button">
                        ← Back to System Type
                      </button>
                      <button className="primary-button" onClick={() => setWizardStep(6)} type="button">
                        Proceed to Order Confirmation & Payment →
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* STEP 6: ORDER CONFIRMATION & PAYMENT */}
              {wizardStep === 6 && estimate && (
                <section className="panel assessment-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">Step 6 of 6 · Project Confirmation & Payment</span>
                      <h2>Confirm Project Order</h2>
                      <p>
                        Verify your installation details, select your preferred payment method, and confirm your project.
                      </p>
                    </div>
                  </div>

                  <div className="confirmation-summary-box">
                    <table className="doc-table">
                      <tbody>
                        <tr>
                          <td><strong>Project:</strong> {projectType.toUpperCase()} ({configuration.system.toUpperCase()})</td>
                          <td><strong>Capacity:</strong> {estimate.systemSizing?.totalSystemCapacityKwp} kWp</td>
                        </tr>
                        <tr>
                          <td><strong>Customer:</strong> {userProfile.fullName} ({userProfile.contactNumber})</td>
                          <td><strong>Email:</strong> {userProfile.email || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Installation Site:</strong> {location.village}, {location.upazila}, {location.district}, {location.division}</td>
                          <td><strong>Rooftop Area:</strong> {configuration.rooftopAreaSqFt} sq ft ({configuration.rooftopType})</td>
                        </tr>
                        <tr>
                          <td><strong>Total Payable Amount:</strong></td>
                          <td style={{ fontSize: '20px', fontWeight: 'bold', color: '#2b6cb0' }}>
                            BDT {Number(estimate.pricing?.finalTotal).toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="payment-method-selector">
                    <h4>Select Payment Method</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                      <div
                        className={`payment-option-card ${paymentMethod === 'sslcommerz' ? 'selected' : ''}`}
                        onClick={() => setPaymentMethod('sslcommerz')}
                      >
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>💳 Online Payment (SSLCommerz)</div>
                        <p style={{ fontSize: '13px', color: '#4a5568', margin: '8px 0' }}>
                          Instant checkout using bKash, Nagad, Rocket, or Visa/MasterCard. Secure server-side validated gateway.
                        </p>
                        <span className="pill success">Instant Verification</span>
                      </div>

                      <div
                        className={`payment-option-card ${paymentMethod === 'cod' ? 'selected' : ''}`}
                        onClick={() => setPaymentMethod('cod')}
                      >
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>💵 Cash on Delivery (COD / Site Inspection)</div>
                        <p style={{ fontSize: '13px', color: '#4a5568', margin: '8px 0' }}>
                          Pay directly to our certified installation engineer after on-site physical delivery and rooftop survey.
                        </p>
                        <span className="pill">Pay On-Site</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions Checkbox */}
                  <div className={`terms-confirmation ${confirmedTerms ? 'is-confirmed' : ''}`}>
                    <label className="terms-confirmation-label">
                      <input
                        className="terms-checkbox"
                        type="checkbox"
                        checked={confirmedTerms}
                        onChange={(e) => setConfirmedTerms(e.target.checked)}
                      />
                      <span className="terms-confirmation-copy">
                        <strong>{confirmedTerms ? 'Policy acknowledged' : 'Policy acknowledgement required'}</strong>
                        I understand this is a preliminary engineering estimate. A certified SolarAgent Pro field technician will verify rooftop structural integrity, orientation, and shadow trajectories prior to final commissioning.
                      </span>
                    </label>
                  </div>

                  <div className="wizard-actions">
                    <button className="secondary-button" onClick={() => setWizardStep(5)} type="button">
                      ← Back to Sizing Review
                    </button>
                    <button
                      className={`primary-button project-submit-button ${!confirmedTerms ? 'is-disabled' : ''}`}
                      onClick={() => void submitProjectOrder()}
                      type="button"
                      disabled={!confirmedTerms || submittingOrder}
                      style={{ fontSize: '16px', padding: '12px 24px' }}
                    >
                      {submittingOrder
                        ? 'Confirming Order & Dispatching...'
                        : paymentMethod === 'sslcommerz'
                        ? 'Proceed to SSLCommerz Online Payment →'
                        : 'Submit Project Request (Pay on Site) →'}
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY ORDERS & TRACKING */}
      {activeTab === 'orders' && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Lifecycle Tracking & Documents</span>
              <h2>My Registered Project Orders ({ordersList.length})</h2>
              <p>Track order status, payment verification, assigned technician, and view official documents.</p>
            </div>
            <button className="secondary-button" onClick={() => void loadUserOrders()} type="button">
              🔄 Refresh Orders
            </button>
          </div>

          {ordersList.length === 0 ? (
            <div className="empty-state">
              You haven't submitted any renewable project orders yet. Use the 'Project Request' tab to configure your first system!
            </div>
          ) : (
            <>
            <div className="orders-grid">
              {pagedCustomerOrders.map((ord) => (
                <div key={ord.id} className="order-summary-card">
                  <div className="order-card-header">
                    <div>
                      <span className="order-number">{ord.orderNumber}</span>
                      <h3 style={{ margin: '4px 0' }}>{ord.projectType?.toUpperCase()} System</h3>
                      <small style={{ color: '#718096' }}>Placed on: {new Date(ord.createdAt).toLocaleDateString()}</small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`pill ${ord.status === 'completed' || ord.status === 'confirmed' ? 'success' : ''}`}>
                        {ord.status?.replace('_', ' ').toUpperCase()}
                      </span>
                      <div style={{ marginTop: '6px' }}>
                        <span className={`pill ${ord.paymentStatus === 'verified' ? 'success' : 'amber'}`}>
                          Payment: {ord.paymentStatus?.toUpperCase()} ({ord.paymentMethod?.toUpperCase()})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="order-card-body">
                    <div><strong>Location:</strong> {ord.village}, {ord.upazila}, {ord.district}</div>
                    <div><strong>Total Estimate:</strong> BDT {Number(ord.totalAmount).toLocaleString()}</div>
                    <div>
                      <strong>Technician Assignment:</strong>{' '}
                      {ord.technicianId ? (
                        <span style={{ color: '#2b6cb0', fontWeight: 'bold' }}>Technician Assigned</span>
                      ) : (
                        'Under Engineering Dispatch Review'
                      )}
                    </div>
                    {ord.scheduledDate && (
                      <div><strong>Scheduled Site Visit:</strong> {ord.scheduledDate}</div>
                    )}
                  </div>

                  <div className="order-card-footer">
                    <button
                      className="primary-button"
                      onClick={() => setViewingOrderDoc(ord)}
                      type="button"
                    >
                      📄 View Installation Document & BOM
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <CustomerPagination page={customerPage} total={ordersList.length} onChange={setCustomerPage} />
            </>
          )}
        </section>
      )}

      {/* TAB 3: RECOMMENDED PACKAGES CATALOG */}
      {activeTab === 'packages' && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Engineered Renewable Packages</span>
              <h2>Pre-Configured Solar Packages</h2>
              <p>Explore our pre-configured turn-key packages or customize any package to your exact needs.</p>
            </div>
          </div>

          <div className="recommended-packages-grid">
            {pagedCustomerPackages.map((pkg) => (
              <div key={pkg.id} className="package-card">
                <div className="package-card-header">
                  <span className="pill">{pkg.systemType?.toUpperCase()}</span>
                  <h3>{pkg.name}</h3>
                  <div className="package-capacity">{pkg.capacityKwp} kWp</div>
                </div>

                <p className="package-desc">{pkg.description}</p>

                <div className="package-specs">
                  <div><strong>Monthly Generation:</strong> ~{pkg.expectedGenerationMonthlyKwh} kWh</div>
                  <div><strong>Warranty:</strong> {pkg.warranty}</div>
                  <div><strong>Ideal For:</strong> {pkg.suitableProfile}</div>
                </div>

                <div className="package-price-row">
                  <span>Price (All Inclusive):</span>
                  <strong>BDT {Number(pkg.totalPrice).toLocaleString()}</strong>
                </div>

                <div className="package-card-actions">
                  <button
                    className="primary-button"
                    onClick={() => setCustomizingPackage(pkg)}
                    type="button"
                  >
                    ⚙️ Customize Equipment & Sizing
                  </button>
                </div>
              </div>
            ))}
          </div>
          <CustomerPagination page={customerPage} total={packagesCatalog.length} onChange={setCustomerPage} />
        </section>
      )}

      {/* TAB 4: SUPPORT & TECHNICAL ASSISTANCE */}
      {activeTab === 'support' && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Support & Technical Assistance</span>
              <h2>How Can We Assist Your Renewable Journey?</h2>
            </div>
          </div>

          <div className="support-grid">
            <div className="support-card">
              <h3>🤖 AI Technical Assistant</h3>
              <p>
                Our AI Assistant understands your active load configuration, rooftop sizing, battery autonomy, and Bangladesh solar insolation benchmarks.
              </p>
              <p style={{ fontSize: '13px', color: '#718096' }}>
                Click the <strong>AI Assistant</strong> button in the bottom right corner anytime for instant answers.
              </p>
            </div>

            <div className="support-card">
              <h3>📞 Corporate Customer Care</h3>
              <p>Speak directly with our engineering and dispatch coordination officers:</p>
              <ul style={{ fontSize: '13px', lineHeight: '1.8', color: '#4a5568' }}>
                <li><strong>Helpline:</strong> +880 9612-SOLAR (76527)</li>
                <li><strong>Hotline:</strong> +880 1700-000000</li>
                <li><strong>Email:</strong> support@solaragent.com.bd</li>
                <li><strong>Hours:</strong> 9:00 AM – 8:00 PM (Saturday – Thursday)</li>
              </ul>
            </div>

            <div className="support-card">
              <h3>🛡️ Guarantee & Service Commitments</h3>
              <p>
                All SolarAgent Pro systems include certified equipment warranties, 1-year complimentary preventative maintenance, and Net Metering (NEM) coordination.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: MY PROFILE */}
      {activeTab === 'profile' && (
        <section className="panel assessment-panel" style={{ maxWidth: '650px' }}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Account Settings</span>
              <h2>Customer Profile & Installation Address</h2>
            </div>
          </div>

          <form
            className="customer-form"
            onSubmit={(e) => {
              e.preventDefault();
              void saveProfile();
            }}
          >
            <label>
              Full Name
              <input
                value={userProfile.fullName}
                onChange={(e) => setUserProfile({ ...userProfile, fullName: e.target.value })}
                required
              />
            </label>

            <label>
              Contact Number
              <input
                value={userProfile.contactNumber}
                onChange={(e) => setUserProfile({ ...userProfile, contactNumber: e.target.value })}
                required
              />
            </label>

            <label>
              Email Address
              <input
                type="email"
                value={userProfile.email}
                onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                required
              />
            </label>

            <label>
              Division
              <select
                value={userProfile.division}
                onChange={(e) => {
                  setUserProfile({ ...userProfile, division: e.target.value, district: '', upazila: '' });
                }}
                required
              >
                {BANGLADESH_DIVISIONS.map((div) => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </label>

            <label>
              District
              <select
                value={userProfile.district}
                onChange={(e) => {
                  setUserProfile({ ...userProfile, district: e.target.value, upazila: '' });
                }}
                required
              >
                <option value="">Select District</option>
                {getDistrictsByDivision(userProfile.division).map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </label>

            <label>
              Upazila / Thana
              <select
                value={userProfile.upazila}
                onChange={(e) => setUserProfile({ ...userProfile, upazila: e.target.value })}
                required
              >
                <option value="">Select Upazila</option>
                {getUpazilas(userProfile.district).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>

            <label>
              Village / Area / Street
              <input
                value={userProfile.village}
                onChange={(e) => setUserProfile({ ...userProfile, village: e.target.value })}
                required
              />
            </label>

            <div style={{ marginTop: '16px' }}>
              <button className="primary-button" type="submit">
                Save Profile Changes
              </button>
            </div>
          </form>
        </section>
      )}

      {/* MODAL: Full Installation Document Preview & Download */}
      {viewingOrderDoc && (
        <InstallationDocumentModal
          order={viewingOrderDoc}
          onClose={() => setViewingOrderDoc(null)}
        />
      )}

      {/* MODAL: Package Customizer */}
      {customizingPackage && (
        <PackageCustomizerModal
          originalPackage={customizingPackage}
          availableProducts={productsCatalog}
          onClose={() => setCustomizingPackage(null)}
          onProceed={(customizedData) => {
            setCustomizingPackage(null);
            // Preload customized package into the estimate state
            setProjectType('solar');
            setSolarMode('customized');
            setSelectedPanelId(customizedData.panelProduct?.id || '');
            setSelectedInverterId(customizedData.inverterProduct?.id || '');
            if (customizedData.batteryProduct) {
              setSelectedBatteryId(customizedData.batteryProduct.id);
            }
            setConfiguration({
              ...configuration,
              system: customizedData.systemType,
              rooftopAreaSqFt: String(customizedData.requiredRooftopAreaSqFt * 1.2),
            });
            setSuccessNotice(`Loaded customized ${customizedData.originalPackageName} configuration (${customizedData.capacityKwp} kWp). Run calculation to review BOM.`);
            setWizardStep(4);
          }}
        />
      )}

      {/* FLOATING CONTEXT-AWARE CHATBOT */}
      <ChatbotWidget
        context={{
          page: '/customer',
          step: wizardStep,
          projectType,
          systemType: configuration.system,
          connectedLoadW: loadSummary.totalWatts,
          dailyConsumptionKwh: loadSummary.dailyKwh,
          rooftopAreaSqFt: Number(configuration.rooftopAreaSqFt) || undefined,
          rooftopType: configuration.rooftopType,
          validationError: errorMessage || undefined,
        }}
      />
    </main>
  );
}
