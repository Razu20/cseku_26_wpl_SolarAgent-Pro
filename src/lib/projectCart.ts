export interface ProjectCartItem {
  product: {
    id: string;
    name: string;
    sku: string;
    brand?: string;
    company_name?: string;
    model?: string;
    category: string;
    price: number;
    discountPrice?: number | null;
    capacity?: number | null;
    capacityUnit?: string | null;
    image?: string;
    warranty?: string;
    specifications?: any;
    unit?: string;
  };
  quantity: number;
}

export interface ProjectCartState {
  projectName: string;
  projectType: 'solar' | 'wind' | 'hybrid';
  items: ProjectCartItem[];
}

const STORAGE_KEY = 'solaragent.project_cart';

export function getProjectCart(): ProjectCartState {
  if (typeof window === 'undefined') {
    return {
      projectName: 'My Renewable Energy Project',
      projectType: 'solar',
      items: [],
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse project cart', e);
  }
  return {
    projectName: 'My Renewable Energy Project',
    projectType: 'solar',
    items: [],
  };
}

export function saveProjectCart(cart: ProjectCartState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('solaragent:project-updated', { detail: cart }));
  } catch (e) {
    console.error('Failed to save project cart', e);
  }
}

export function addToProjectCart(product: any, quantity = 1): ProjectCartState {
  const cart = getProjectCart();
  const existingIdx = cart.items.findIndex((item) => item.product.id === product.id);

  if (existingIdx >= 0) {
    cart.items[existingIdx].quantity += quantity;
  } else {
    cart.items.push({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        brand: product.brand || product.company_name,
        company_name: product.company_name || product.brand,
        model: product.model,
        category: product.category,
        price: Number(product.price || product.regularPrice || 0),
        discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
        capacity: product.capacity || product.wattage,
        capacityUnit: product.capacityUnit || (product.wattage ? 'W' : ''),
        image: product.image,
        warranty: product.warranty,
        specifications: product.specifications,
        unit: product.unit || 'unit',
      },
      quantity: Math.max(1, quantity),
    });
  }

  // Detect project type if hybrid or wind
  const hasSolar = cart.items.some((i) => i.product.category.toLowerCase().includes('solar') || i.product.category.toLowerCase().includes('module') || i.product.category.toLowerCase().includes('panel'));
  const hasWind = cart.items.some((i) => i.product.category.toLowerCase().includes('wind') || i.product.category.toLowerCase().includes('turbine'));

  if (hasSolar && hasWind) cart.projectType = 'hybrid';
  else if (hasWind) cart.projectType = 'wind';
  else cart.projectType = 'solar';

  saveProjectCart(cart);
  return cart;
}

export function updateProjectCartQuantity(productId: string, quantity: number): ProjectCartState {
  const cart = getProjectCart();
  if (quantity <= 0) {
    cart.items = cart.items.filter((i) => i.product.id !== productId);
  } else {
    const item = cart.items.find((i) => i.product.id === productId);
    if (item) item.quantity = quantity;
  }
  saveProjectCart(cart);
  return cart;
}

export function removeFromProjectCart(productId: string): ProjectCartState {
  const cart = getProjectCart();
  cart.items = cart.items.filter((i) => i.product.id !== productId);
  saveProjectCart(cart);
  return cart;
}

export function clearProjectCart(): ProjectCartState {
  const empty: ProjectCartState = {
    projectName: 'My Renewable Energy Project',
    projectType: 'solar',
    items: [],
  };
  saveProjectCart(empty);
  return empty;
}

export function calculateProjectTotal(items: ProjectCartItem[]): number {
  return items.reduce((sum, item) => {
    const itemPrice = item.product.discountPrice || item.product.price;
    return sum + itemPrice * item.quantity;
  }, 0);
}

