import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import Login from './pages/auth/login/Login';
import Register from './pages/register/Register';
import ResetPassword from './pages/ResetPassword';
import { initializeSocket } from './services/socket';

// Lazy load components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Shop = lazy(() => import('./pages/customer/shop/Shop'));
const Cart = lazy(() => import('./pages/customer/cart/Cart'));
const Checkout = lazy(() => import('./pages/customer/checkout/Checkout'));
const Orders = lazy(() => import('./pages/customer/orders/Orders'));
const Prescriptions = lazy(() => import('./pages/customer/prescriptions/Prescriptions'));
const Wishlist = lazy(() => import('./pages/customer/shop/Wishlist'));
const POS = lazy(() => import('./pages/pharmacist/pos/POS'));
const PharmacistPrescriptions = lazy(() => import('./pages/pharmacist/prescriptions/Prescriptions'));
const AdminMedicines = lazy(() => import('./pages/admin/medicines/Medicines'));
const AdminCategories = lazy(() => import('./pages/admin/categories/Categories'));
const AdminUsers = lazy(() => import('./pages/admin/users/Users'));
const AdminReports = lazy(() => import('./pages/admin/reports/Reports'));
const AdminSettings = lazy(() => import('./pages/admin/settings/Settings'));
const AdminPrescriptions = lazy(() => import('./pages/admin/prescriptions/Prescriptions'));
const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard'));

const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

// FIXED: ProtectedRoute checks both store and localStorage
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const token = localStorage.getItem('token');
  
  // Check both store state and localStorage
  if (!isAuthenticated && !token) {
    return <Navigate to="/login" />;
  }
  return children;
};

function App() {
  // Initialize socket connection when app loads
  useEffect(() => {
    initializeSocket();
    
    // Restore auth state from localStorage on app load
    const restoreAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        const { fetchCurrentUser } = useAuthStore.getState();
        await fetchCurrentUser();
      }
    };
    restoreAuth();
  }, []);

  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Customer Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/shop" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/cart" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/prescriptions" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/wishlist" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          
          {/* Pharmacist Routes */}
          <Route path="/pos" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/pharmacist-prescriptions" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/medicines" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/admin-prescriptions" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          
          {/* Delivery Routes */}
          <Route path="/my-deliveries" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          
          {/* Common Routes */}
          <Route path="/profile" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/deliveries" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          
          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          
          {/* Reset Password Route */}
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;