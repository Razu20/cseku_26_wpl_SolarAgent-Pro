import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailsModal } from '../components/ProductDetailsModal';
import { ProductComparisonModal } from '../components/ProductComparisonModal';
import { ProjectDrawer } from '../components/ProjectDrawer';
import { getProjectCart, calculateProjectTotal } from '../lib/projectCart';
import { getComparisonList } from '../lib/comparisonStore';

export function LandingPage() {
  const navigate = useNavigate();

  // State
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [priceSort, setPriceSort] = useState<string>('default');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(300000);

  // Modals & Drawer
  const [selectedProductDetails, setSelectedProductDetails] = useState<any | null>(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showProjectDrawer, setShowProjectDrawer] = useState(false);

  // Cart & Comparison Count
  const [cartState, setCartState] = useState(getProjectCart());
  const [compareCount, setCompareCount] = useState(getComparisonList().length);

  // Auth state
  const userToken = localStorage.getItem('solaragent.token');
  const userRole = localStorage.getItem('solaragent.role');

  useEffect(() => {
    // Listen for cart and comparison updates
    function onCartUpdate(e: any) {
      setCartState(e.detail || getProjectCart());
    }
    function onCompareUpdate(e: any) {
      const list = e.detail || getComparisonList();
      setCompareCount(list.length);
    }

    window.addEventListener('solaragent:project-updated', onCartUpdate);
    window.addEventListener('solaragent:compare-updated', onCompareUpdate);
    return () => {
      window.removeEventListener('solaragent:project-updated', onCartUpdate);
      window.removeEventListener('solaragent:compare-updated', onCompareUpdate);
    };
  }, []);

  // Fetch products, categories, companies
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<{ products: any[] }>('/products'),
      api<{ categories: any[] }>('/categories'),
      api<{ companies: any[] }>('/companies'),
    ])
      .then(([prodRes, catRes, compRes]) => {
        setProducts(prodRes.products || []);
        setCategories(catRes.categories || []);
        setCompanies(compRes.companies || []);
      })
      .catch((err) => {
        console.error('Failed to load marketplace catalog', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filtered and Sorted products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const comp = (p.company_name || p.company?.name || '').toLowerCase();
        const model = (p.model || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return (
          name.includes(q) ||
          brand.includes(q) ||
          comp.includes(q) ||
          model.includes(q) ||
          cat.includes(q) ||
          desc.includes(q)
        );
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((p) => {
        const cat = (p.category || '').toLowerCase();
        const target = selectedCategory.toLowerCase();
        return cat === target || cat.includes(target) || target.includes(cat);
      });
    }

    // Company filter
    if (selectedCompany !== 'all') {
      result = result.filter((p) => {
        const b = (p.brand || '').toLowerCase();
        const c = (p.company_name || p.company?.name || '').toLowerCase();
        const target = selectedCompany.toLowerCase();
        return b === target || c === target || b.includes(target) || c.includes(target);
      });
    }

    // Availability filter
    if (selectedAvailability !== 'all') {
      if (selectedAvailability === 'in_stock') {
        result = result.filter((p) => (p.stock === undefined || p.stock > 0) && p.availability !== 'out_of_stock');
      } else if (selectedAvailability === 'pre_order') {
        result = result.filter((p) => p.availability === 'pre_order');
      }
    }

    // Featured filter
    if (featuredOnly) {
      result = result.filter((p) => p.featured === true);
    }

    // Price range
    result = result.filter((p) => Number(p.price || p.regularPrice || 0) <= maxPriceFilter);

    // Sorting
    if (priceSort === 'price_asc') {
      result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (priceSort === 'price_desc') {
      result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (priceSort === 'featured') {
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    } else if (priceSort === 'popular') {
      result.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    } else if (priceSort === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return result;
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedCompany,
    selectedAvailability,
    priceSort,
    featuredOnly,
    maxPriceFilter,
  ]);

  const featuredProducts = useMemo(() => {
    return products.filter((p) => p.featured);
  }, [products]);

  const totalCartCost = calculateProjectTotal(cartState.items);
  const totalCartItems = cartState.items.reduce((s, i) => s + i.quantity, 0);

  function handleQuickProjectCategory(type: 'solar' | 'wind' | 'hybrid') {
    if (type === 'solar') setSelectedCategory('Solar Panel');
    else if (type === 'wind') setSelectedCategory('Wind Turbine');
    else setSelectedCategory('all');

    // Scroll smoothly to shop section
    document.getElementById('shop-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="marketplace-home-layout">
      {/* 1. TOP NAVBAR */}
      <header className="marketplace-navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            <span className="brand-logo-icon">☀️</span>
            <div className="brand-text">
              <strong>SolarAgent-Pro</strong>
              <small>Renewable Planning & Equipment Shop</small>
            </div>
          </Link>

          <nav className="navbar-links">
            <a href="#hero">Home</a>
            <a href="#project-types">Project Types</a>
            <a href="#shop-section">Equipment Shop</a>
            <a href="#categories-section">Categories</a>
            <a href="#why-section">Why Us</a>
            {compareCount > 0 && (
              <button
                type="button"
                className="nav-compare-pill"
                onClick={() => setShowComparisonModal(true)}
              >
                ⚖ Compare ({compareCount})
              </button>
            )}
          </nav>

          <div className="navbar-actions">
            {userToken ? (
              <Link
                to={userRole === 'admin' ? '/admin/dashboard' : '/customer'}
                className="primary-button nav-account-btn"
              >
                {userRole === 'admin' ? '⚙ Admin Panel' : '👤 My Projects Portal'}
              </Link>
            ) : (
              <>
                <Link to="/login" className="secondary-button nav-login-btn">
                  Sign In
                </Link>
                <Link to="/signup" className="primary-button nav-signup-btn">
                  Create Account
                </Link>
              </>
            )}

            {/* Cart / Project Config Badge */}
            <button
              type="button"
              className="navbar-cart-trigger"
              onClick={() => setShowProjectDrawer(true)}
              title="Open Project Equipment Builder"
            >
              <span className="cart-icon">⚡</span>
              <span className="cart-counter">{totalCartItems}</span>
              <span className="cart-total-text">৳{totalCartCost.toLocaleString()}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section id="hero" className="marketplace-hero">
        <div className="hero-grid-container">
          <div className="hero-text-content">
            <span className="hero-eyebrow">Smart Renewable Energy Planning & Marketplace</span>
            <h1 className="hero-headline">
              Plan, Size & Procure Your <span style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Clean Energy Project</span> with Confidence.
            </h1>
            <p className="hero-subtext">
              Direct access to tier-1 Solar Panels, Wind Turbines, Inverters, and LiFePO4 Batteries
              engineered for Bangladesh homes, commercial roofs, and agricultural microgrids.
            </p>

            <div className="hero-actions-row">
              <Link to="/customer" className="hero-cta-btn">
                Start Your Project Sizing →
              </Link>
              <a href="#shop-section" className="hero-secondary-cta">
                Browse Equipment Catalog
              </a>
            </div>

            <div className="hero-trust-metrics">
              <div className="metric-item">
                <strong>100%</strong>
                <span>Certified Equipment</span>
              </div>
              <div className="metric-item">
                <strong>SREDA & BPDB</strong>
                <span>Net-Metering Ready</span>
              </div>
              <div className="metric-item">
                <strong>25 Years</strong>
                <span>Performance Guarantee</span>
              </div>
            </div>
          </div>

          <div className="hero-visual-card">
            <div className="hero-card-inner">
              <div className="hero-badge-live">● Live Equipment Marketplace</div>
              <img
                src="/solar-energy-hero.svg"
                alt="Solar and renewable equipment installation"
                className="hero-main-img"
              />
              <div className="hero-floating-stat stat-left">
                <span className="stat-title">LONGi • Jinko • Huawei</span>
                <span className="stat-sub">Official partner warranties</span>
              </div>
              <div className="hero-floating-stat stat-right">
                <span className="stat-title">Real-time Sizing</span>
                <span className="stat-sub">Automated BOM & pricing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROJECT TYPES SECTION */}
      <section id="project-types" className="project-types-strip">
        <div className="container-narrow">
          <div className="strip-heading">
            <span className="eyebrow">Renewable Energy Solutions</span>
            <h2>Choose Your Project Type</h2>
            <p>Select a renewable architecture to explore customized equipment setups</p>
          </div>

          <div className="project-types-cards" role="region" aria-label="Project types">
            <div
              className="type-card solar-type"
              onClick={() => handleQuickProjectCategory('solar')}
            >
              <span className="type-icon">☀️</span>
              <h3>Solar Project</h3>
              <p>Rooftop on-grid net metering and standalone off-grid residential setups with monocrystalline panels.</p>
              <span className="type-action-link">Browse Solar Panels & Inverters →</span>
            </div>

            <div
              className="type-card wind-type"
              onClick={() => handleQuickProjectCategory('wind')}
            >
              <span className="type-icon">🌬️</span>
              <h3>Wind Energy Project</h3>
              <p>Aerodynamic small wind turbines with guyed masts designed for coastal & hilly breezy zones.</p>
              <span className="type-action-link">Browse Wind Turbines →</span>
            </div>

            <div
              className="type-card hybrid-type"
              onClick={() => handleQuickProjectCategory('hybrid')}
            >
              <span className="type-icon">☀️ + 🌬️</span>
              <h3>Hybrid Energy System</h3>
              <p>Combined solar PV + wind turbine + lithium battery storage with hybrid inverters for continuous 24/7 power.</p>
              <span className="type-action-link">Explore Hybrid Equipment →</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURED PRODUCTS CAROUSEL / GRID */}
      {featuredProducts.length > 0 && (
        <section className="featured-products-section">
          <div className="container-wide">
            <div className="section-title-row">
              <div>
                <span className="eyebrow">Top Recommendations</span>
                <h2>Featured Renewable Energy Products</h2>
                <p>High-efficiency, certified solar and wind components approved by our engineers</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setFeaturedOnly((f) => !f);
                  document.getElementById('shop-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {featuredOnly ? 'Show All Equipment' : 'View All Featured Items'}
              </button>
            </div>

            <div className="product-marketplace-grid">
              {featuredProducts.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewDetails={setSelectedProductDetails}
                  onAddedToCompare={() => setCompareCount(getComparisonList().length)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. MAIN EQUIPMENT SHOP SECTION (DYNAMIC WITH FILTERS) */}
      <section id="shop-section" className="marketplace-shop-section">
        <div className="container-wide">
          <div className="section-title-row">
            <div>
              <span className="eyebrow">Equipment Marketplace</span>
              <h2>Browse Renewable Energy Hardware</h2>
              <p>Real-time inventory from authorized manufacturers across Bangladesh and internationally</p>
            </div>
            <div className="shop-counter-tag">
              Showing <strong>{filteredProducts.length}</strong> of {products.length} products
            </div>
          </div>

          {/* Search, Filters and Sorting Toolbar */}
          <div className="shop-filter-toolbar">
            {/* Search Input */}
            <div className="toolbar-search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search products... (e.g. 550W solar, Huawei inverter, wind turbine, battery)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="toolbar-dropdowns">
              {/* Category Dropdown */}
              <div className="filter-group">
                <label>Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="Solar Panel">☀️ Solar Panel</option>
                  <option value="Wind Turbine">🌬️ Wind Turbine</option>
                  <option value="Battery">🔋 Battery</option>
                  <option value="Inverter">⚡ Inverter</option>
                  <option value="Charge Controller">🔌 Charge Controller</option>
                  <option value="Mounting Structure">🏗️ Mounting Structure</option>
                  <option value="Accessories">🔧 Accessories</option>
                </select>
              </div>

              {/* Company / Brand Dropdown */}
              <div className="filter-group">
                <label>Brand / Company:</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                >
                  <option value="all">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <div className="filter-group">
                <label>Availability:</label>
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                >
                  <option value="all">All Stock Status</option>
                  <option value="in_stock">In Stock Only</option>
                  <option value="pre_order">Pre-Order</option>
                </select>
              </div>

              {/* Sorting */}
              <div className="filter-group">
                <label>Sort By:</label>
                <select
                  value={priceSort}
                  onChange={(e) => setPriceSort(e.target.value)}
                >
                  <option value="default">Default / Recommended</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="featured">Featured First</option>
                  <option value="newest">Newest Equipment</option>
                  <option value="popular">Stock / Popular</option>
                </select>
              </div>
            </div>

            {/* Quick Category Chips */}
            <div className="category-chips-row">
              <button
                type="button"
                className={`category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                All Products
              </button>
              <button
                type="button"
                className={`category-chip ${selectedCategory === 'Solar Panel' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('Solar Panel')}
              >
                ☀️ Solar Panels
              </button>
              <button
                type="button"
                className={`category-chip ${selectedCategory === 'Wind Turbine' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('Wind Turbine')}
              >
                🌬️ Wind Turbines
              </button>
              <button
                type="button"
                className={`category-chip ${selectedCategory === 'Battery' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('Battery')}
              >
                🔋 Batteries
              </button>
              <button
                type="button"
                className={`category-chip ${selectedCategory === 'Inverter' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('Inverter')}
              >
                ⚡ Inverters
              </button>
              <button
                type="button"
                className={`category-chip ${selectedCategory === 'Charge Controller' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('Charge Controller')}
              >
                🔌 Charge Controllers
              </button>
              <button
                type="button"
                className={`category-chip ${selectedCategory === 'Mounting Structure' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('Mounting Structure')}
              >
                🏗️ Mounting Structure
              </button>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="shop-loading-state">
              <div className="spinner-large" />
              <p>Connecting to renewable equipment database...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="shop-empty-state">
              <span className="empty-icon">🔎</span>
              <h3>No products matched your filters</h3>
              <p>Try searching with broader terms or clear some filters to see all available inventory.</p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedCompany('all');
                  setSelectedAvailability('all');
                  setFeaturedOnly(false);
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="product-marketplace-grid">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewDetails={setSelectedProductDetails}
                  onAddedToCompare={() => setCompareCount(getComparisonList().length)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. SHOP BY CATEGORY SECTION */}
      <section id="categories-section" className="shop-by-category-section">
        <div className="container-wide">
          <div className="section-title-row">
            <div>
              <span className="eyebrow">Component Directory</span>
              <h2>Shop by Category</h2>
              <p>Direct equipment procurement across every stage of renewable generation</p>
            </div>
          </div>

          <div className="category-cards-grid">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="category-tile-card"
                onClick={() => {
                  setSelectedCategory(cat.name);
                  document.getElementById('shop-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div className="category-tile-icon">{cat.icon || '☀️'}</div>
                <div className="category-tile-content">
                  <h4>{cat.name}</h4>
                  <p>{cat.description}</p>
                  <span className="category-count">
                    {cat.productCount ? `${cat.productCount} models available` : 'Browse models →'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. WHY SOLARAGENT-PRO */}
      <section id="why-section" className="why-solaragent-section">
        <div className="container-narrow">
          <div className="section-title-row text-center">
            <div>
              <span className="eyebrow">Enterprise Grade Engineering</span>
              <h2>Why SolarAgent-Pro?</h2>
              <p>Not just an online store — an autonomous engineering & project planner</p>
            </div>
          </div>

          <div className="benefits-grid">
            <div className="benefit-card">
              <span className="benefit-icon">📐</span>
              <h4>Smart Sizing</h4>
              <p>Calculate exact solar panel wattage, wind swept area, and inverter capacity matching your exact connected load.</p>
            </div>

            <div className="benefit-card">
              <span className="benefit-icon">৳</span>
              <h4>Deterministic Cost Estimation</h4>
              <p>Transparent itemized bill-of-materials with equipment prices directly sourced from verified partner brands.</p>
            </div>

            <div className="benefit-card">
              <span className="benefit-icon">🤖</span>
              <h4>Equipment Recommendation</h4>
              <p>Our recommendation engine matches certified panels, inverters, and lithium storage tailored to your roof and budget.</p>
            </div>

            <div className="benefit-card">
              <span className="benefit-icon">🏗️</span>
              <h4>Project Design & BOM</h4>
              <p>Complete single-line diagrams (SLD), array stringing plans, and wind-loading compliance documentation.</p>
            </div>

            <div className="benefit-card">
              <span className="benefit-icon">📋</span>
              <h4>Net-Metering Documentation</h4>
              <p>Automated paperwork for BPDB, DESCO, DPDC, and BREB net-metering (NEM) applications according to SREDA rules.</p>
            </div>

            <div className="benefit-card">
              <span className="benefit-icon">📊</span>
              <h4>Autonomous Monitoring</h4>
              <p>Real-time irradiance sensors, inverter telemetry, and dispatchable technician work-order coordination.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="marketplace-footer">
        <div className="container-wide footer-grid">
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <span className="brand-logo-icon">☀️</span>
              <strong>SolarAgent-Pro</strong>
            </div>
            <p>
              Smart Renewable Energy Planning & Project Solutions. Powering homes, industries,
              and farms with clean solar and wind energy across Bangladesh.
            </p>
            <small>© {new Date().getFullYear()} SolarAgent Pro Bangladesh. All rights reserved.</small>
          </div>

          <div className="footer-col">
            <h4>Equipment Categories</h4>
            <ul>
              <li><button type="button" onClick={() => setSelectedCategory('Solar Panel')}>Solar Panels</button></li>
              <li><button type="button" onClick={() => setSelectedCategory('Wind Turbine')}>Wind Turbines</button></li>
              <li><button type="button" onClick={() => setSelectedCategory('Battery')}>Lithium & Tubular Batteries</button></li>
              <li><button type="button" onClick={() => setSelectedCategory('Inverter')}>On-Grid & Hybrid Inverters</button></li>
              <li><button type="button" onClick={() => setSelectedCategory('Charge Controller')}>MPPT Controllers</button></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Partner Brands</h4>
            <ul>
              <li>LONGi Solar</li>
              <li>JinkoSolar</li>
              <li>Huawei FusionSolar</li>
              <li>Growatt New Energy</li>
              <li>Pylontech Storage</li>
              <li>Bergey Windpower</li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Platform Access</h4>
            <ul>
              <li><Link to="/customer">Project Sizing Calculator</Link></li>
              <li><Link to="/login?role=admin">Admin Panel</Link></li>
              <li><Link to="/login">Customer Portal</Link></li>
              <li><Link to="/signup">Create Account</Link></li>
            </ul>
          </div>
        </div>
      </footer>

      {/* FLOATING ACTION BAR: MY PROJECT BUILDER */}
      {totalCartItems > 0 && (
        <div className="floating-project-pill" onClick={() => setShowProjectDrawer(true)}>
          <div className="pill-left">
            <span className="pill-icon">⚡</span>
            <div>
              <strong>{cartState.projectName}</strong>
              <small>{totalCartItems} components selected</small>
            </div>
          </div>
          <div className="pill-right">
            <span className="pill-price">৳{totalCartCost.toLocaleString()}</span>
            <span className="pill-open-arrow">Configure Project →</span>
          </div>
        </div>
      )}

      {/* MODALS */}
      {selectedProductDetails && (
        <ProductDetailsModal
          product={selectedProductDetails}
          onClose={() => setSelectedProductDetails(null)}
          onAddedToCompare={() => setCompareCount(getComparisonList().length)}
        />
      )}

      {showComparisonModal && (
        <ProductComparisonModal
          onClose={() => setShowComparisonModal(false)}
        />
      )}

      <ProjectDrawer
        isOpen={showProjectDrawer}
        onClose={() => setShowProjectDrawer(false)}
        onOpenCompare={() => setShowComparisonModal(true)}
      />
    </div>
  );
}
