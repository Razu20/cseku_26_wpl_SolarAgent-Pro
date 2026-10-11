import { useEffect, useState } from 'react';
import {
  getComparisonList,
  removeFromComparison,
  clearComparison,
  type ComparisonProduct,
} from '../lib/comparisonStore';
import { addToProjectCart } from '../lib/projectCart';

export interface ProductComparisonModalProps {
  onClose: () => void;
  onAddedToProject?: (product: any) => void;
}

export function ProductComparisonModal({ onClose, onAddedToProject }: ProductComparisonModalProps) {
  const [list, setList] = useState<ComparisonProduct[]>(getComparisonList());
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function handleUpdate(e: any) {
      setList(e.detail || getComparisonList());
    }
    window.addEventListener('solaragent:compare-updated', handleUpdate);
    return () => window.removeEventListener('solaragent:compare-updated', handleUpdate);
  }, []);

  function handleRemove(id: string) {
    removeFromComparison(id);
  }

  function handleClear() {
    clearComparison();
  }

  function handleAdd(prod: ComparisonProduct) {
    addToProjectCart(prod, 1);
    setAddedIds((prev) => ({ ...prev, [prod.id]: true }));
    if (onAddedToProject) onAddedToProject(prod);
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [prod.id]: false }));
    }, 2000);
  }

  return (
    <div className="product-modal-backdrop" onClick={onClose}>
      <div className="comparison-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="comparison-header">
          <div>
            <span className="eyebrow">Equipment Benchmarking</span>
            <h2>Compare Renewable Energy Hardware</h2>
            <p>Side-by-side performance, warranty, pricing, and sizing metrics</p>
          </div>
          <div className="comparison-header-actions">
            {list.length > 0 && (
              <button type="button" className="secondary-button" onClick={handleClear}>
                Clear All
              </button>
            )}
            <button type="button" className="product-modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="comparison-empty-state">
            <span className="empty-icon">⚖️</span>
            <h3>No products selected for comparison</h3>
            <p>Click the compare icon ⚖ on any product card in the marketplace to add it here.</p>
            <button type="button" className="primary-button" onClick={onClose}>
              Browse Equipment Marketplace
            </button>
          </div>
        ) : (
          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="feature-label-col">Metric / Feature</th>
                  {list.map((prod) => (
                    <th key={prod.id} className="product-col">
                      <div className="compare-card-head">
                        <button
                          type="button"
                          className="compare-remove-btn"
                          title="Remove from comparison"
                          onClick={() => handleRemove(prod.id)}
                        >
                          ✕
                        </button>
                        <img src={prod.image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=400&auto=format&fit=crop&q=80'} alt={prod.name} />
                        <h4>{prod.name}</h4>
                        <span className="compare-brand-badge">{prod.company_name || prod.brand}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Category</td>
                  {list.map((p) => (
                    <td key={p.id}>
                      <span className="compare-tag">{p.category}</span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>Model</td>
                  {list.map((p) => (
                    <td key={p.id}>
                      <strong>{p.model || '--'}</strong>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>Price (BDT)</td>
                  {list.map((p) => {
                    const price = Number(p.price || 0);
                    const discount = p.discountPrice ? Number(p.discountPrice) : null;
                    return (
                      <td key={p.id} className="price-cell">
                        {discount ? (
                          <>
                            <strong className="active-price">৳{discount.toLocaleString()}</strong>
                            <small className="cut-price">৳{price.toLocaleString()}</small>
                          </>
                        ) : (
                          <strong className="active-price">৳{price.toLocaleString()}</strong>
                        )}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td>Rated Capacity</td>
                  {list.map((p) => (
                    <td key={p.id}>
                      {p.capacity ? `${p.capacity} ${p.capacityUnit || 'W'}` : '--'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>Efficiency</td>
                  {list.map((p) => (
                    <td key={p.id}>
                      {p.efficiency ? `${p.efficiency}%` : p.specifications?.efficiency || '--'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>Dimensions</td>
                  {list.map((p) => (
                    <td key={p.id}>{p.dimensions || p.specifications?.dimensions || '--'}</td>
                  ))}
                </tr>

                <tr>
                  <td>Warranty</td>
                  {list.map((p) => (
                    <td key={p.id}>{p.warranty || 'Manufacturer standard warranty'}</td>
                  ))}
                </tr>

                <tr>
                  <td>Stock & Availability</td>
                  {list.map((p) => (
                    <td key={p.id}>
                      {p.stock !== undefined && p.stock <= 0 ? (
                        <span className="stock-pill out-of-stock">Out of Stock</span>
                      ) : p.availability === 'pre_order' ? (
                        <span className="stock-pill pre-order">Pre-Order</span>
                      ) : (
                        <span className="stock-pill in-stock">✓ Available</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>Action</td>
                  {list.map((p) => (
                    <td key={p.id}>
                      <button
                        type="button"
                        className={`compare-add-btn ${addedIds[p.id] ? 'added' : ''}`}
                        onClick={() => handleAdd(p)}
                      >
                        {addedIds[p.id] ? '✓ Added' : '+ Add to Project'}
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
