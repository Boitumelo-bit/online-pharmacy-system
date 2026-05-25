import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { initializeSocket, disconnectSocket } from '../services/socket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        console.log('Login started...');
        set({ isLoading: true });
        
        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            email,
            password,
          });
          
          console.log('Login response:', response.data);
          const { user, token } = response.data;
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Initialize Socket.IO connection after successful login
          initializeSocket();
          
          return { success: true };
        } catch (error) {
          console.error('Login error:', error);
          set({ isLoading: false });
          return { 
            success: false, 
            error: error.response?.data?.message || 'Login failed' 
          };
        }
      },

      register: async (userData) => {
        console.log('Register started...');
        set({ isLoading: true });
        
        try {
          const response = await axios.post(`${API_URL}/auth/register`, userData);
          console.log('Register response:', response.data);
          const { user, token } = response.data;
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Initialize Socket.IO connection after successful registration
          initializeSocket();
          
          return { success: true };
        } catch (error) {
          console.error('Register error:', error);
          set({ isLoading: false });
          return { 
            success: false, 
            error: error.response?.data?.message || 'Registration failed' 
          };
        }
      },

      logout: () => {
        // Disconnect Socket.IO on logout
        disconnectSocket();
        
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      },

      // NEW: Update user data in store
      updateUser: (updatedUser) => {
        console.log('Updating user in store:', updatedUser);
        set({ user: updatedUser });
        
        // Also update localStorage persistence
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

      // NEW: Update user token
      updateToken: (newToken) => {
        set({ token: newToken });
        localStorage.setItem('token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      },

      // NEW: Fetch current user data from server
      fetchCurrentUser: async () => {
        try {
          const response = await axios.get(`${API_URL}/auth/me`);
          const user = response.data;
          set({ user });
          
          // Update localStorage persistence
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
          console.error('Error fetching current user:', error);
          return { success: false, error: error.response?.data?.message };
        }
      },
    }),
    { 
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        console.log('Rehydrated state:', state);
        // Re-initialize socket if user is already authenticated
        if (state?.isAuthenticated && state?.user) {
          setTimeout(() => initializeSocket(), 100);
        }
      }
    }
  )
);