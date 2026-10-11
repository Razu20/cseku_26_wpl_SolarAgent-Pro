import { useState } from 'react';
import { addToProjectCart } from '../lib/projectCart';
import { addToComparison, getComparisonList } from '../lib/comparisonStore';

export interface ProductCardProps {
  product: {
    id: string;
    sku: string;
    name: string;
    brand?: string;
    company_name?: string;
    model?: string;
    category: string;
    price: number;
    discountPrice?: number | null;
    capacity?: number | null;
    capacityUnit?: string | null;
    image?: string;
    stock?: number;
    availability?: string;
    warranty?: string;
    specifications?: any;
    unit?: string;
    featured?: boolean;
    description?: string;
  };
  onViewDetails: (product: any) => void;
  onAddedToProject?: (product: any) => void;
  onAddedToCompare?: () => void;
}

export function ProductCard({ product, onViewDetails, onAddedToProject, onAddedToCompare }: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);
  const [compareMessage, setCompareMessage] = useState<string | null>(null);

  const price = Number(product.price || 0);
  const discountPrice = product.discountPrice ? Number(product.discountPrice) : null;
  const isOutOfStock = (product.stock !== undefined && product.stock <= 0) || product.availability === 'out_of_stock';
  const isPreOrder = product.availability === 'pre_order';
  const displayCompany = product.company_name || product.brand || 'Certified Partner';

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToProjectCart(product, 1);
    setJustAdded(true);
    if (onAddedToProject) onAddedToProject(product);
    setTimeout(() => setJustAdded(false), 1600);
  }

  function handleCompare(e: React.MouseEvent) {
    e.stopPropagation();
    const result = addToComparison(product);
    if (result.added) {
      setCompareMessage('Added to compare');
      if (onAddedToCompare) onAddedToCompare();
    } else {
      setCompareMessage(result.reason || 'Already in compare');
    }
    setTimeout(() => setCompareMessage(null), 2000);
  }

  // Fallback image based on category
  const defaultImage = product.category.toLowerCase().includes('panel') || product.category.toLowerCase().includes('solar')
    ? 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80'
    : product.category.toLowerCase().includes('wind') || product.category.toLowerCase().includes('turbine')
    ? 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&auto=format&fit=crop&q=80'
    : product.category.toLowerCase().includes('battery')
    ? 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&auto=format&fit=crop&q=80'
    : product.category.toLowerCase().includes('inverter')
    ? 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=600&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80';

  const imageUrl = product.image || defaultImage;

  return (
    <div className="product-marketplace-card" onClick={() => onViewDetails(product)}>
      <div className="product-card-media">
        <img src={imageUrl} alt={product.name} loading="lazy" />
        <div className="product-card-badges">
          <span className="badge category-badge">{product.category}</span>
          {product.featured && <span className="badge featured-badge">★ Featured</span>}
          {discountPrice && <span className="badge discount-badge">Offer</span>}
        </div>
        <button
          className="compare-quick-btn"
          title="Compare this product"
          onClick={handleCompare}
          type="button"
        >
          ⚖
        </button>
        {compareMessage && <div className="compare-toast-pill">{compareMessage}</div>}
      </div>

      <div className="product-card-body">
        <div className="product-card-brand-row">
          <span className="brand-label">{displayCompany}</span>
          {product.model && <span className="model-label">Model: {product.model}</span>}
        </div>

        <h3 className="product-card-title" title={product.name}>
          {product.name}
        </h3>

        {/* Short specification line */}
        <div className="product-card-spec-line">
          {product.capacity && (
            <span className="spec-item">
              ⚡ {product.capacity} {product.capacityUnit || 'W'}
            </span>
          )}
          {product.specifications?.efficiency && (
            <span className="spec-item">η {product.specifications.efficiency}</span>
          )}
          {product.specifications?.technology && (
            <span className="spec-item">{product.specifications.technology}</span>
          )}
        </div>

        <div className="product-card-pricing-row">
          <div className="price-block">
            {discountPrice ? (
              <>
                <span className="current-price">৳{discountPrice.toLocaleString()}</span>
                <span className="original-price">৳{price.toLocaleString()}</span>
              </>
            ) : (
              <span className="current-price">৳{price.toLocaleString()}</span>
            )}
            <small className="unit-label">/{product.unit || 'unit'}</small>
          </div>

          <div className="availability-block">
            {isOutOfStock ? (
              <span className="stock-pill out-of-stock">Out of Stock</span>
            ) : isPreOrder ? (
              <span className="stock-pill pre-order">Pre-Order</span>
            ) : (
              <span className="stock-pill in-stock">● In Stock</span>
            )}
          </div>
        </div>

        <div className="product-card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="card-btn details-btn"
            onClick={() => onViewDetails(product)}
          >
            View Details
          </button>
          <button
            type="button"
            className={`card-btn add-btn ${justAdded ? 'added' : ''}`}
            disabled={isOutOfStock}
            onClick={handleAdd}
          >
            {justAdded ? '✓ Added!' : isOutOfStock ? 'Unavailable' : '+ Add to Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
