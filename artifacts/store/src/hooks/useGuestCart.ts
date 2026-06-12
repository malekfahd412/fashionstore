import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "luxe_guest_cart";

export type GuestCartItem = {
  variantId: number;
  productId: number;
  nameEn: string;
  nameAr: string;
  imageUrl: string | null;
  price: number;
  salePrice: number | null;
  color: string | null;
  size: string | null;
  stockQuantity: number;
  quantity: number;
};

function readStorage(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GuestCartItem[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: GuestCartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function clearGuestCart() {
  localStorage.removeItem(STORAGE_KEY);
}

export function readGuestCartItems(): GuestCartItem[] {
  return readStorage();
}

export function useGuestCart() {
  const [items, setItems] = useState<GuestCartItem[]>(() => readStorage());

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setItems(readStorage());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const sync = useCallback((next: GuestCartItem[]) => {
    writeStorage(next);
    setItems(next);
  }, []);

  const addItem = useCallback((item: Omit<GuestCartItem, "quantity"> & { quantity?: number }) => {
    setItems(prev => {
      const existing = prev.find(i => i.variantId === item.variantId);
      let next: GuestCartItem[];
      if (existing) {
        next = prev.map(i =>
          i.variantId === item.variantId
            ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
            : i
        );
      } else {
        next = [...prev, { ...item, quantity: item.quantity ?? 1 }];
      }
      writeStorage(next);
      return next;
    });
  }, []);

  const updateItem = useCallback((variantId: number, quantity: number) => {
    setItems(prev => {
      const next = quantity < 1
        ? prev.filter(i => i.variantId !== variantId)
        : prev.map(i => i.variantId === variantId ? { ...i, quantity } : i);
      writeStorage(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((variantId: number) => {
    setItems(prev => {
      const next = prev.filter(i => i.variantId !== variantId);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    sync([]);
  }, [sync]);

  const subtotal = items.reduce((s, i) => s + (i.salePrice ?? i.price) * i.quantity, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return { items, totalItems, subtotal, addItem, updateItem, removeItem, clear };
}
