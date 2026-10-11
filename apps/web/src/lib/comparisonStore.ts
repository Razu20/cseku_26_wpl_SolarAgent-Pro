export interface ComparisonProduct {
  id: string;
  name: string;
  brand?: string;
  company_name?: string;
  model?: string;
  category: string;
  price: number;
  discountPrice?: number | null;
  capacity?: number | null;
  capacityUnit?: string | null;
  efficiency?: number | string | null;
  dimensions?: string | null;
  warranty?: string | null;
  image?: string;
  stock?: number;
  availability?: string;
  specifications?: any;
}

const STORAGE_KEY = 'solaragent.compare_products';

export function getComparisonList(): ComparisonProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse comparison list', e);
  }
  return [];
}

export function saveComparisonList(list: ComparisonProduct[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('solaragent:compare-updated', { detail: list }));
  } catch (e) {
    console.error('Failed to save comparison list', e);
  }
}

export function addToComparison(product: any): { list: ComparisonProduct[]; added: boolean; reason?: string } {
  const current = getComparisonList();
  if (current.some((p) => p.id === product.id)) {
    return { list: current, added: false, reason: 'Already in comparison' };
  }
  if (current.length >= 4) {
    return { list: current, added: false, reason: 'You can compare up to 4 products at once' };
  }

  const item: ComparisonProduct = {
    id: product.id,
    name: product.name,
    brand: product.brand || product.company_name,
    company_name: product.company_name || product.brand,
    model: product.model,
    category: product.category,
    price: Number(product.price || product.regularPrice || 0),
    discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
    capacity: product.capacity || product.wattage,
    capacityUnit: product.capacityUnit || (product.wattage ? 'W' : ''),
    efficiency: product.efficiency,
    dimensions: product.dimensions,
    warranty: product.warranty,
    image: product.image,
    stock: product.stock,
    availability: product.availability,
    specifications: product.specifications,
  };

  const updated = [...current, item];
  saveComparisonList(updated);
  return { list: updated, added: true };
}

export function removeFromComparison(productId: string): ComparisonProduct[] {
  const current = getComparisonList();
  const updated = current.filter((p) => p.id !== productId);
  saveComparisonList(updated);
  return updated;
}

export function clearComparison(): void {
  saveComparisonList([]);
}
