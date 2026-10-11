import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { addToProjectCart } from '../lib/projectCart';
import { addToComparison } from '../lib/comparisonStore';
import { ProductCard } from '../components/ProductCard';

export function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);
  const [compareNotice, setCompareNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api<{ product: any; related: any[] }>(`/products/${id}`)
      .then((data) => {
        setProduct(data.product);
        setRelated(data.related || []);
        setSelectedImage(data.product.image || '');
      })
      .catch((err) => {
        setError(err.message || 'Product not found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="product-details-page loading-state">
        <div className="spinner-large" />
        <p>Loading renewable equipment specifications...</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="product-details-page error-state">
        <h2>Equipment Not Found</h2>
        <p>{error || 'The requested product could not be found in our database.'}</p>
        <Link to="/" className="primary-button">
          Return to Marketplace
        </Link>
      </main>
    );
  }

  const gallery: string[] = [
    product.image,
    ...(Array.isArray(product.galleryImages) ? product.galleryImages : []),
    ...(Array.isArray(product.gallery_images) ? product.gallery_images : []),
  ].filter(Boolean);
  const uniqueGallery = Array.from(new Set(gallery));

  const price = Number(product.price || product.regularPrice || 0);
  const discountPrice = product.discountPrice || product.discount_price ? Number(product.discountPrice || product.discount_price) : null;
  const isOutOfStock = (product.stock !== undefined && product.stock <= 0) || product.availability === 'out_of_stock';
  const isPreOrder = product.availability === 'pre_order';
  const displayCompany = product.company_name || product.brand || 'Certified Partner';
  const specs = typeof product.specifications === 'object' && product.specifications !== null ? product.specifications : {};

  function handleAdd() {
    if (isOutOfStock) return;
    addToProjectCart(product, quantity);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  }

  function handleCompare() {
    const res = addToComparison(product);
    if (res.added) {
      setCompareNotice('Added to equipment comparison table!');
    } else {
      setCompareNotice(res.reason || 'Already in comparison');
    }
    setTimeout(() => setCompareNotice(null), 2500);
  }

  return (
    <main className="product-details-page">
      {/* Breadcrumb navigation */}
      <div className="marketplace-breadcrumbs">
        <Link to="/">Home Marketplace</Link>
        <span>›</span>
        <span>{product.category}</span>
        <span>›</span>
        <strong>{product.name}</strong>
      </div>

      <section className="product-detail-hero-card">
        <div className="product-modal-grid">
          {/* Gallery View */}
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
                  <p>{product.warranty || '5-25 Years certified linear degradation warranty'}</p>
                </div>
              </div>
              <div className="trust-item">
                <span className="trust-icon">⚡</span>
                <div>
                  <strong>System Integration</strong>
                  <p>Certified for on-grid net metering (NEM) & off-grid hybrid setups</p>
                </div>
              </div>
            </div>
          </div>

          {/* Details & Specs */}
          <div className="modal-info-column">
            <div className="modal-meta-top">
              <span className="modal-category-tag">{product.category}</span>
              <span className="modal-sku-tag">SKU: {product.sku || 'SA-PRO-01'}</span>
            </div>

            <h1 className="modal-product-title">{product.name}</h1>

            <div className="modal-brand-model-row">
              <div className="company-badge-pill">
                <span className="label">Brand/Company:</span>
                <strong>{displayCompany}</strong>
              </div>
              {product.model && (
                <div className="model-badge-pill">
                  <span className="label">Model:</span>
                  <strong>{product.model}</strong>
                </div>
              )}
            </div>

            {/* Pricing */}
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
                <span className="unit-text">/{product.unit || 'unit'}</span>
              </div>

              <div className="stock-status-wrapper">
                {isOutOfStock ? (
                  <span className="status-badge out-of-stock">✕ Out of Stock</span>
                ) : isPreOrder ? (
                  <span className="status-badge pre-order">⏳ Pre-order Available</span>
                ) : (
                  <span className="status-badge in-stock">✓ Available ({product.stock ?? 100} in stock)</span>
                )}
              </div>
            </div>

            {/* Capacity */}
            {product.capacity && (
              <div className="modal-capacity-callout">
                <span className="capacity-label">Rated Capacity:</span>
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
                <h4>Equipment Overview & Description</h4>
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

            {/* Actions */}
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
                {addedNotice ? '✓ Added to Your Project!' : isOutOfStock ? 'Unavailable' : `+ Add ${quantity > 1 ? `${quantity} Items ` : ''}to Project`}
              </button>

              <button
                type="button"
                className="modal-compare-btn"
                onClick={handleCompare}
              >
                ⚖ Compare Equipment
              </button>
            </div>

            {compareNotice && <div className="modal-alert-notice">{compareNotice}</div>}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="related-equipment-section">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Alternative Options</span>
              <h2>Compare Similar {product.category}s</h2>
            </div>
          </div>
          <div className="product-marketplace-grid">
            {related.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onViewDetails={(p) => navigate(`/products/${p.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
