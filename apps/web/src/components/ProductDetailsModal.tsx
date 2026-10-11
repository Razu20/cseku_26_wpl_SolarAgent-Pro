import { useState } from 'react';
import { addToProjectCart } from '../lib/projectCart';
import { addToComparison } from '../lib/comparisonStore';

export interface ProductDetailsModalProps {
  product: any;
  onClose: () => void;
  onAddedToProject?: (product: any, qty: number) => void;
  onAddedToCompare?: () => void;
}

export function ProductDetailsModal({
  product,
  onClose,
  onAddedToProject,
  onAddedToCompare,
}: ProductDetailsModalProps) {
  const [selectedImage, setSelectedImage] = useState<string>(
    product.image || (product.galleryImages && product.galleryImages[0]) || ''
  );
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);
  const [compareNotice, setCompareNotice] = useState<string | null>(null);

  if (!product) return null;

  const gallery: string[] = [
    product.image,
    ...(Array.isArray(product.galleryImages) ? product.galleryImages : []),
    ...(Array.isArray(product.gallery_images) ? product.gallery_images : []),
  ].filter(Boolean);

  // deduplicate images
  const uniqueGallery = Array.from(new Set(gallery));

  const price = Number(product.price || product.regularPrice || 0);
  const discountPrice = product.discountPrice || product.discount_price ? Number(product.discountPrice || product.discount_price) : null;
  const isOutOfStock = (product.stock !== undefined && product.stock <= 0) || product.availability === 'out_of_stock';
  const isPreOrder = product.availability === 'pre_order';
  const displayCompany = product.company_name || product.brand || 'Certified Brand';

  const specs = typeof product.specifications === 'object' && product.specifications !== null ? product.specifications : {};

  function handleAdd() {
    if (isOutOfStock) return;
    addToProjectCart(product, quantity);
    setAddedNotice(true);
    if (onAddedToProject) onAddedToProject(product, quantity);
    setTimeout(() => setAddedNotice(false), 2000);
  }

  function handleCompare() {
    const res = addToComparison(product);
    if (res.added) {
      setCompareNotice('Added to equipment comparison!');
      if (onAddedToCompare) onAddedToCompare();
    } else {
      setCompareNotice(res.reason || 'Already in comparison');
    }
    setTimeout(() => setCompareNotice(null), 2500);
  }

  return (
    <div className="product-modal-backdrop" onClick={onClose}>
      <div className="product-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="product-modal-close" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        <div className="product-modal-grid">
          {/* Left Column: Visuals & Gallery */}
          <div className="modal-gallery-column">
            <div className="main-image-viewport">
              <img
                src={selectedImage || product.image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'}
                alt={product.name}
              />
              {product.featured && <span className="modal-featured-badge">★ Featured</span>}
            </div>

            {uniqueGallery.length > 1 && (
              <div className="gallery-thumbnail-strip">
                {uniqueGallery.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`thumb-btn ${selectedImage === img ? 'active' : ''}`}
                    onClick={() => setSelectedImage(img)}
                  >
                    <img src={img} alt={`Thumbnail ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}

            <div className="modal-trust-box">
              <div className="trust-item">
                <span className="trust-icon">🛡️</span>
                <div>
                  <strong>Warranty Coverage</strong>
                  <p>{product.warranty || 'Manufacturer guaranteed 5-25 years performance'}</p>
                </div>
              </div>
              <div className="trust-item">
                <span className="trust-icon">⚙️</span>
                <div>
                  <strong>Pre-commission Tested</strong>
                  <p>Certified for grid interconnection & SREDA compliance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Information, Specs & Actions */}
          <div className="modal-info-column">
            <div className="modal-meta-top">
              <span className="modal-category-tag">{product.category}</span>
              <span className="modal-sku-tag">SKU: {product.sku || 'SA-PRO-01'}</span>
            </div>

            <h1 className="modal-product-title">{product.name}</h1>

            <div className="modal-brand-model-row">
              <div className="company-badge-pill">
                <span className="label">Brand:</span>
                <strong>{displayCompany}</strong>
              </div>
              {product.model && (
                <div className="model-badge-pill">
                  <span className="label">Model:</span>
                  <strong>{product.model}</strong>
                </div>
              )}
            </div>

            {/* Pricing block */}
            <div className="modal-pricing-block">
              <div className="price-digits">
                {discountPrice ? (
                  <>
                    <span className="main-price">৳{discountPrice.toLocaleString()}</span>
                    <span className="struck-price">৳{price.toLocaleString()}</span>
                    <span className="discount-tag">Save ৳{(price - discountPrice).toLocaleString()}</span>
                  </>
                ) : (
                  <span className="main-price">৳{price.toLocaleString()}</span>
                )}
                <span className="unit-text">/{product.unit || 'unit'} (BDT)</span>
              </div>

              <div className="stock-status-wrapper">
                {isOutOfStock ? (
                  <span className="status-badge out-of-stock">✕ Out of Stock</span>
                ) : isPreOrder ? (
                  <span className="status-badge pre-order">⏳ Available for Pre-order</span>
                ) : (
                  <span className="status-badge in-stock">
                    ✓ Available (In Stock: {product.stock ?? 'Available'})
                  </span>
                )}
              </div>
            </div>

            {/* Capacity highlight */}
            {product.capacity && (
              <div className="modal-capacity-callout">
                <span className="capacity-label">Rated Capacity / Power:</span>
                <strong className="capacity-value">
                  {product.capacity} {product.capacityUnit || 'W'}
                </strong>
                {product.efficiency && (
                  <span className="efficiency-pill">Efficiency: {product.efficiency}%</span>
                )}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="modal-section-desc">
                <h4>Description & Overview</h4>
                <p>{product.description}</p>
              </div>
            )}

            {/* Technical Specifications */}
            <div className="modal-section-specs">
              <h4>Technical Specifications</h4>
              <div className="specs-table-grid">
                {product.dimensions && (
                  <div className="spec-row">
                    <span className="spec-name">Dimensions</span>
                    <span className="spec-val">{product.dimensions}</span>
                  </div>
                )}
                {product.efficiency && (
                  <div className="spec-row">
                    <span className="spec-name">Efficiency</span>
                    <span className="spec-val">{product.efficiency}%</span>
                  </div>
                )}
                {Object.entries(specs).map(([key, val]) => (
                  <div key={key} className="spec-row">
                    <span className="spec-name">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</span>
                    <span className="spec-val">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Add to Project & Quantity */}
            <div className="modal-action-bar">
              <div className="qty-picker">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="qty-value">{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className={`modal-add-btn ${addedNotice ? 'added' : ''}`}
                disabled={isOutOfStock}
                onClick={handleAdd}
              >
                {addedNotice ? '✓ Added to Project!' : isOutOfStock ? 'Currently Unavailable' : `+ Add ${quantity > 1 ? `${quantity} Items ` : ''}to Project`}
              </button>

              <button
                type="button"
                className="modal-compare-btn"
                onClick={handleCompare}
                title="Add to Comparison"
              >
                ⚖ Compare
              </button>
            </div>

            {compareNotice && <div className="modal-alert-notice">{compareNotice}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
