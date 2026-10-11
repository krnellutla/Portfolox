import { create } from 'zustand';
import type { Cart } from '@blueflutes/shared';

interface CartStore {
  cart: Cart | null;
  setCart: (cart: Cart) => void;
  clearCart: () => void;
  itemCount: number;
}

export const useCartStore = create<CartStore>((set) => ({
  cart: null,
  setCart: (cart) => set({ cart, itemCount: cart.itemCount }),
  clearCart: () => set({ cart: null, itemCount: 0 }),
  itemCount: 0,
}));
