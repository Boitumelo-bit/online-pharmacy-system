import { create } from 'zustand';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useWishlistStore = create((set, get) => ({
  items: [],
  loading: false,
  
  fetchWishlist: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/wishlist');
      set({ items: response.data.data || [] });
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      set({ loading: false });
    }
  },
  
  addToWishlist: async (medicine) => {
    try {
      const response = await api.post('/wishlist', { medicineId: medicine.id });
      if (response.data.success) {
        set({ items: [response.data.data, ...get().items] });
        toast.success(`${medicine.name} added to wishlist`);
        return true;
      }
    } catch (error) {
      if (error.response?.data?.message === 'Item already in wishlist') {
        toast.error('Item already in wishlist');
      } else {
        toast.error('Failed to add to wishlist');
      }
      return false;
    }
  },
  
  removeFromWishlist: async (wishlistId, medicineName) => {
    try {
      await api.delete(`/wishlist/${wishlistId}`);
      set({ items: get().items.filter(item => item.id !== wishlistId) });
      toast.success(`${medicineName} removed from wishlist`);
      return true;
    } catch (error) {
      toast.error('Failed to remove from wishlist');
      return false;
    }
  },
  
  checkInWishlist: async (medicineId) => {
    try {
      const response = await api.get(`/wishlist/check/${medicineId}`);
      return response.data.inWishlist;
    } catch (error) {
      return false;
    }
  },
}));