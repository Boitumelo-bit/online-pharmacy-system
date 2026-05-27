import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        
        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            email,
            password,
          });
          
          const { user, token } = response.data;
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { 
            success: false, 
            error: error.response?.data?.message || 'Login failed' 
          };
        }
      },

      register: async (userData) => {
        set({ isLoading: true });
        
        try {
          const response = await axios.post(`${API_URL}/auth/register`, userData);
          
          if (response.data.requiresOtp) {
            set({ isLoading: false });
            return { 
              success: true, 
              requiresOtp: true,
              email: response.data.email,
              userId: response.data.userId,
              message: response.data.message
            };
          }
          
          const { user, token } = response.data;
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { 
            success: false, 
            error: error.response?.data?.message || 'Registration failed' 
          };
        }
      },

      logout: () => {
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      },

      updateUser: (updatedUser) => {
        set({ user: updatedUser });
        
        const persistedState = localStorage.getItem('auth-storage');
        if (persistedState) {
          try {
            const data = JSON.parse(persistedState);
            data.state.user = updatedUser;
            localStorage.setItem('auth-storage', JSON.stringify(data));
          } catch (error) {
            console.error('Error updating persisted user:', error);
          }
        }
      },

      updateToken: (newToken) => {
        set({ token: newToken });
        localStorage.setItem('token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      },

      fetchCurrentUser: async () => {
        try {
          const response = await axios.get(`${API_URL}/auth/me`);
          const user = response.data;
          set({ user });
          
          const persistedState = localStorage.getItem('auth-storage');
          if (persistedState) {
            try {
              const data = JSON.parse(persistedState);
              data.state.user = user;
              localStorage.setItem('auth-storage', JSON.stringify(data));
            } catch (error) {
              console.error('Error updating persisted user:', error);
            }
          }
          
          return { success: true, user };
        } catch (error) {
          return { success: false, error: error.response?.data?.message };
        }
      },
    }),
    { 
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        console.log('Rehydrated state:', state);
      }
    }
  )
);