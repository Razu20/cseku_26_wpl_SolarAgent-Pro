import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getProjectCart,
  updateProjectCartQuantity,
  removeFromProjectCart,
  clearProjectCart,
  calculateProjectTotal,
  saveProjectCart,
  type ProjectCartState,
} from '../lib/projectCart';

export interface ProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCompare?: () => void;
}

export function ProjectDrawer({ isOpen, onClose, onOpenCompare }: ProjectDrawerProps) {
  const router = useRouter();
  const [cart, setCart] = useState<ProjectCartState>(getProjectCart());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(cart.projectName);

  useEffect(() => {
    function handleUpdate(e: any) {
      setCart(e.detail || getProjectCart());
    }
    window.addEventListener('solaragent:project-updated', handleUpdate);
    return () => window.removeEventListener('solaragent:project-updated', handleUpdate);
  }, []);

  const totalCost = calculateProjectTotal(cart.items);
  const totalItemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  function handleSaveTitle() {
    const updated = { ...cart, projectName: titleDraft || 'My Renewable Project' };
    saveProjectCart(updated);
    setIsEditingTitle(false);
  }

  function handleTypeChange(type: 'solar' | 'wind' | 'hybrid') {
    const updated = { ...cart, projectType: type };
    saveProjectCart(updated);
  }

  function handleProceedToPlan() {
    // Save current configuration to solaragent.pending_project
    localStorage.setItem('solaragent.pending_project', JSON.stringify(cart));
    onClose();
    // Navigate to customer panel to run sizing or submit request
    router.push('/customer');
  }

  if (!isOpen) return null;

  return (
    <div className="project-drawer-backdrop" onClick={onClose}>
      <aside className="project-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="project-drawer-header">
          <div className="drawer-title-area">
            <span className="eyebrow">Project Equipment Builder</span>
            {isEditingTitle ? (
              <div className="drawer-title-edit">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                />
                <button type="button" className="inline-save-btn" onClick={handleSaveTitle}>
                  ✓
                </button>
              </div>
            ) : (
              <h3 onClick={() => { setTitleDraft(cart.projectName); setIsEditingTitle(true); }}>
                {cart.projectName} <span className="edit-pencil-icon">✎</span>
              </h3>
            )}
          </div>
          <button type="button" className="project-modal-close" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>

        {/* Project Type Switcher */}
        <div className="drawer-type-switcher">
          <span className="type-label">Project Type:</span>
          <div className="type-buttons">
            <button
              type="button"
              className={cart.projectType === 'solar' ? 'active' : ''}
              onClick={() => handleTypeChange('solar')}
            >
              ☀️ Solar
            </button>
            <button
              type="button"
              className={cart.projectType === 'wind' ? 'active' : ''}
              onClick={() => handleTypeChange('wind')}
            >
              🌬️ Wind
            </button>
            <button
              type="button"
              className={cart.projectType === 'hybrid' ? 'active' : ''}
              onClick={() => handleTypeChange('hybrid')}
            >
              ☀️ + 🌬️ Hybrid
            </button>
          </div>
        </div>

        {/* Item List */}
        <div className="project-drawer-body">
          {cart.items.length === 0 ? (
            <div className="drawer-empty-state">
              <span className="empty-cart-icon">📦</span>
              <h4>Your Project is Empty</h4>
              <p>Browse our renewable energy shop and click <strong>"+ Add to Project"</strong> on panels, inverters, batteries or wind turbines.</p>
              <button type="button" className="primary-button" onClick={onClose}>
                Browse Equipment Catalog
              </button>
            </div>
          ) : (
            <div className="drawer-items-list">
              {cart.items.map((item) => {
                const p = item.product;
                const unitPrice = p.discountPrice || p.price;
                const lineTotal = unitPrice * item.quantity;
                return (
                  <div key={p.id} className="drawer-item-card">
                    <img
                      src={p.image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200&auto=format&fit=crop&q=80'}
                      alt={p.name}
                      className="drawer-item-thumb"
                    />
                    <div className="drawer-item-info">
                      <div className="drawer-item-meta">
                        <span className="drawer-cat-badge">{p.category}</span>
                        <span className="drawer-brand-name">{p.company_name || p.brand}</span>
                      </div>
                      <h4 className="drawer-item-title">{p.name}</h4>
                      {p.capacity && (
                        <span className="drawer-item-capacity">
                          ⚡ {p.capacity} {p.capacityUnit || 'W'}
                        </span>
                      )}
                      <div className="drawer-item-pricing">
                        <strong>৳{unitPrice.toLocaleString()}</strong>
                        <small>/{p.unit || 'unit'}</small>
                      </div>
                    </div>

                    <div className="drawer-item-controls">
                      <div className="drawer-qty-picker">
                        <button
                          type="button"
                          className="drawer-qty-btn"
                          onClick={() => updateProjectCartQuantity(p.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="drawer-qty-num">{item.quantity}</span>
                        <button
                          type="button"
                          className="drawer-qty-btn"
                          onClick={() => updateProjectCartQuantity(p.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="drawer-line-total">
                        <span>Line Total:</span>
                        <strong>৳{lineTotal.toLocaleString()}</strong>
                      </div>

                      <button
                        type="button"
                        className="drawer-remove-item"
                        title="Remove from project"
                        onClick={() => removeFromProjectCart(p.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Summary & Checkout / Planning Action */}
        {cart.items.length > 0 && (
          <div className="project-drawer-footer">
            <div className="drawer-cost-summary">
              <div className="cost-row">
                <span>Selected Equipment Count</span>
                <strong>{totalItemCount} items</strong>
              </div>
              <div className="cost-row major-cost">
                <div>
                  <span className="cost-label">Estimated Equipment Cost</span>
                  <small>Excludes regional balance of system & logistics</small>
                </div>
                <strong className="grand-total-digits">৳{totalCost.toLocaleString()}</strong>
              </div>
            </div>

            <div className="drawer-action-buttons">
              <button
                type="button"
                className="secondary-button clear-btn"
                onClick={clearProjectCart}
              >
                Clear
              </button>
              {onOpenCompare && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onClose();
                    onOpenCompare();
                  }}
                >
                  ⚖ Compare
                </button>
              )}
              <button
                type="button"
                className="primary-button proceed-btn"
                onClick={handleProceedToPlan}
              >
                Proceed to Project Plan →
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
