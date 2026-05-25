import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,

      addItem: (medicine, quantity = 1) => {
        console.log('=== ADDING TO CART ===');
        console.log('Medicine:', medicine.name);
        console.log('prescriptionRequired value:', medicine.prescriptionRequired);
        console.log('Type:', typeof medicine.prescriptionRequired);
        
        const items = [...get().items];
        const existingItem = items.find(item => item.id === medicine.id);
        
        // Force boolean value
        const isRxRequired = medicine.prescriptionRequired === true || medicine.prescriptionRequired === 'true';
        
        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          const newItem = {
            id: medicine.id,
            name: medicine.name,
            price: parseFloat(medicine.price),
            discount: parseFloat(medicine.discount || 0),
            image: medicine.images?.[0]?.url,
            quantity: quantity,
            prescriptionRequired: isRxRequired, // Force boolean
            stock: medicine.stock,
          };
          console.log('New cart item:', newItem);
          items.push(newItem);
        }
        
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce((sum, item) => {
          const discountedPrice = item.price * (1 - item.discount / 100);
          return sum + discountedPrice * item.quantity;
        }, 0);
        
        set({ items, totalItems, totalPrice });
        
        // Debug: Check what was saved
        console.log('Cart items after add:', get().items);
      },

      removeItem: (id) => {
        const items = get().items.filter(item => item.id !== id);
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce((sum, item) => {
          const discountedPrice = item.price * (1 - item.discount / 100);
          return sum + discountedPrice * item.quantity;
        }, 0);
        
        set({ items, totalItems, totalPrice });
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          get().removeItem(id);
          return;
        }
        
        const items = get().items.map(item =>
          item.id === id ? { ...item, quantity } : item
        );
        
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce((sum, item) => {
          const discountedPrice = item.price * (1 - item.discount / 100);
          return sum + discountedPrice * item.quantity;
        }, 0);
        
        set({ items, totalItems, totalPrice });
      },

      clearCart: () => {
        set({ items: [], totalItems: 0, totalPrice: 0 });
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);