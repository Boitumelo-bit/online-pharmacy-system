import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { 
  Package, ShoppingCart, Users, LogOut, Menu, X, 
  Home, ShoppingBag, ClipboardList, UserCircle, FileText, 
  CreditCard, Truck, AlertTriangle, Clock, CheckCircle, 
  Pill, DollarSign, BarChart3, Settings, Bell,
  Plus, Edit, Trash2, Eye, Heart,
  Rocket, TrendingUp, TrendingDown
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import DeliveryDashboard from './delivery/DeliveryDashboard';
import { useSocketNotifications} from '../hooks/useSocketNotifications';

// Customer Components
import Shop from './customer/shop/Shop';
import Cart from './customer/cart/Cart';
import Checkout from './customer/checkout/Checkout';
import CustomerOrders from './customer/orders/Orders';
import CustomerPrescriptions from './customer/prescriptions/Prescriptions';
import Wishlist from './customer/shop/Wishlist';

// Pharmacist Components
import POS from './pharmacist/pos/POS';
import PharmacistPrescriptions from './pharmacist/prescriptions/Prescriptions';

// Admin Components
import AdminMedicines from './admin/medicines/Medicines';
import AdminCategories from './admin/categories/Categories';
import AdminUsers from './admin/users/Users';
import AdminReports from './admin/reports/Reports';
import AdminSettings from './admin/settings/Settings';
import AdminPrescriptions from './admin/prescriptions/Prescriptions';

// Notification Component
import NotificationCenter from '../components/NotificationCenter';

// Profile Component
import Profile from './Profile';

// Helper function to safely format currency
const formatCurrency = (value) => {
  if (!value && value !== 0) return '0.00';
  const num = typeof value === 'number' ? value : Number(value);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

const Dashboard = () => {
  const { user, logout, updateUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(user);

  // Update currentUser when user changes from store
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // Determine active page from current route
  const getActivePageFromPath = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    if (path === '/shop') return 'shop';
    if (path === '/cart') return 'cart';
    if (path === '/checkout') return 'checkout';
    if (path === '/orders') return 'customer-orders';
    if (path === '/prescriptions') return 'customer-prescriptions';
    if (path === '/wishlist') return 'wishlist';
    if (path === '/pos') return 'pos';
    if (path === '/pharmacist-prescriptions') return 'pharmacist-prescriptions';
    if (path === '/admin-prescriptions') return 'admin-prescriptions';
    if (path === '/medicines') return 'medicines';
    if (path === '/categories') return 'categories';
    if (path === '/users') return 'users';
    if (path === '/reports') return 'reports';
    if (path === '/settings') return 'settings';
    if (path === '/my-deliveries') return 'my-deliveries';
    if (path === '/profile') return 'profile';
    return 'dashboard';
  };

  const [activePage, setActivePage] = useState(getActivePageFromPath());

  useEffect(() => {
    setActivePage(getActivePageFromPath());
    fetchDashboardData();
  }, [location.pathname]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/stats');
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setDashboardData(getDefaultDashboardData());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(getDefaultDashboardData());
    } finally {
      setLoading(false);
    }
  };
  // Initialize socket notifications for real-time alerts
useSocketNotifications();

  const getDefaultDashboardData = () => {
    return {
      role: currentUser?.role || 'CUSTOMER',
      stats: {
        totalMedicines: 0,
        totalCustomers: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        totalOrders: 0,
        deliveredOrders: 0,
        totalSpent: 0,
        pendingPrescriptions: 0,
        todaysOrders: 0,
        readyOrders: 0,
        lowStockCount: 0,
        assignedOrders: 0,
        completedDeliveries: 0,
        availableOrders: 0
      },
      alerts: { lowStock: [], expiring: [], lowStockCount: 0, expiringCount: 0 },
      recentOrders: [],
      prescriptions: [],
      settings: { pharmacy_name: 'Pharmacy POS System', currency: 'M' }
    };
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (page, path) => {
    setActivePage(page);
    navigate(path);
  };

  const getMenuItems = () => {
    const role = currentUser?.role;
    
    const menuConfig = {
      ADMIN: [
        { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
        { id: 'medicines', name: 'Medicines', icon: Pill, path: '/medicines' },
        { id: 'categories', name: 'Categories', icon: Package, path: '/categories' },
        { id: 'admin-orders', name: 'Orders', icon: ClipboardList, path: '/orders' },
        { id: 'admin-prescriptions', name: 'Prescriptions', icon: FileText, path: '/admin-prescriptions' },
        { id: 'users', name: 'Users', icon: Users, path: '/users' },
        { id: 'reports', name: 'Reports', icon: BarChart3, path: '/reports' },
        { id: 'settings', name: 'Settings', icon: Settings, path: '/settings' },
        { id: 'profile', name: 'Profile', icon: UserCircle, path: '/profile' }
      ],
      PHARMACIST: [
        { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
        { id: 'pos', name: 'POS Terminal', icon: CreditCard, path: '/pos' },
        { id: 'pharmacist-prescriptions', name: 'Prescription Queue', icon: FileText, path: '/pharmacist-prescriptions' },
        { id: 'pharmacist-orders', name: 'Orders', icon: ClipboardList, path: '/orders' },
        { id: 'profile', name: 'Profile', icon: UserCircle, path: '/profile' }
      ],
      CUSTOMER: [
        { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
        { id: 'shop', name: 'Shop', icon: ShoppingBag, path: '/shop' },
        { id: 'cart', name: 'Cart', icon: ShoppingCart, path: '/cart' },
        { id: 'customer-orders', name: 'My Orders', icon: ClipboardList, path: '/orders' },
        { id: 'customer-prescriptions', name: 'Prescriptions', icon: FileText, path: '/prescriptions' },
        { id: 'wishlist', name: 'Wishlist', icon: Heart, path: '/wishlist' },
        { id: 'profile', name: 'Profile', icon: UserCircle, path: '/profile' }
      ],
      DELIVERY_STAFF: [
        { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
        { id: 'my-deliveries', name: 'My Deliveries', icon: Truck, path: '/my-deliveries' },
        { id: 'profile', name: 'Profile', icon: UserCircle, path: '/profile' }
      ]
    };

    return menuConfig[role] || menuConfig.CUSTOMER;
  };

  const menuItems = getMenuItems();

  const renderContent = () => {
    switch (activePage) {
      case 'shop': return <Shop />;
      case 'cart': return <Cart />;
      case 'checkout': return <Checkout />;
      case 'customer-orders': return <CustomerOrders />;
      case 'customer-prescriptions': return <CustomerPrescriptions />;
      case 'wishlist': return <Wishlist />;
      case 'pos': return <POS />;
      case 'pharmacist-prescriptions': return <PharmacistPrescriptions />;
      case 'medicines': return <AdminMedicines />;
      case 'categories': return <AdminCategories />;
      case 'users': return <AdminUsers />;
      case 'reports': return <AdminReports />;
      case 'settings': return <AdminSettings />;
      case 'admin-prescriptions': return <AdminPrescriptions />;
      case 'my-deliveries': return <DeliveryDashboard />;
      case 'profile': return <Profile />;
      case 'dashboard':
        return renderRoleDashboard();
      default:
        return renderRoleDashboard();
    }
  };

  // Consistent Stat Card Component
  const StatCard = ({ title, value, icon: Icon, change }) => (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 dark:bg-primary-900/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center shadow-md">
            <Icon className="w-6 h-6 text-white" />
          </div>
          {change !== undefined && change !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  // Consistent Quick Action Card Component
  const QuickActionCard = ({ title, icon: Icon, onClick, description }) => (
    <button
      onClick={onClick}
      className="group w-full text-left p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        <Rocket className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform duration-200" />
      </div>
    </button>
  );

  const renderRoleDashboard = () => {
    const role = currentUser?.role;
    const data = dashboardData;

    // ADMIN DASHBOARD - Consistent styling with primary color
    if (role === 'ADMIN') {
      return (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary-600 p-8 shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {currentUser?.fullName?.split(' ')[0]}!</h2>
              <p className="text-primary-100">Here's what's happening with your pharmacy today.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard title="Total Medicines" value={data?.stats?.totalMedicines || 0} icon={Pill} />
            <StatCard title="Total Customers" value={data?.stats?.totalCustomers || 0} icon={Users} />
            <StatCard title="Pending Orders" value={data?.stats?.pendingOrders || 0} icon={ShoppingCart} />
            <StatCard title="Total Revenue" value={`M${formatCurrency(data?.stats?.totalRevenue)}`} icon={DollarSign} />
          </div>

          {(data?.alerts?.lowStockCount > 0 || data?.alerts?.expiringCount > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {data?.alerts?.lowStockCount > 0 && (
                <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-5 border border-red-200 dark:border-red-800">
                  <h3 className="font-semibold text-red-800 dark:text-red-400 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Low Stock Alert ({data.alerts.lowStockCount})
                  </h3>
                  <div className="space-y-2">
                    {data.alerts.lowStock?.slice(0, 3).map(item => (
                      <div key={item.id} className="flex justify-between text-sm p-2 bg-white/50 rounded-lg">
                        <span>{item.name}</span>
                        <span className="font-semibold text-red-600">Stock: {item.stock}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data?.alerts?.expiringCount > 0 && (
                <div className="rounded-2xl bg-yellow-50 dark:from-yellow-900/20 p-5 border border-yellow-200 dark:border-yellow-800">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Expiring Soon ({data.alerts.expiringCount})
                  </h3>
                  <div className="space-y-2">
                    {data.alerts.expiring?.slice(0, 3).map(item => (
                      <div key={item.id} className="flex justify-between text-sm p-2 bg-white/50 rounded-lg">
                        <span>{item.name}</span>
                        <span className="text-yellow-600">Expires: {new Date(item.expiryDate).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // PHARMACIST DASHBOARD - Consistent styling with primary color
    if (role === 'PHARMACIST') {
      return (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary-600 p-8 shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {currentUser?.fullName?.split(' ')[0]}!</h2>
              <p className="text-primary-100">Ready to process prescriptions and manage orders.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard title="Pending Prescriptions" value={data?.stats?.pendingPrescriptions || 0} icon={FileText} />
            <StatCard title="Today's Orders" value={data?.stats?.todaysOrders || 0} icon={ShoppingCart} />
            <StatCard title="Ready for Pickup" value={data?.stats?.readyOrders || 0} icon={Package} />
            <StatCard title="Low Stock Items" value={data?.stats?.lowStockCount || 0} icon={AlertTriangle} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <QuickActionCard title="Process Prescriptions" icon={FileText} onClick={() => handleNavigation('pharmacist-prescriptions', '/pharmacist-prescriptions')} description="Review and approve pending prescriptions" />
            <QuickActionCard title="POS Terminal" icon={CreditCard} onClick={() => handleNavigation('pos', '/pos')} description="Process in-store sales quickly" />
          </div>
        </div>
      );
    }

    // CUSTOMER DASHBOARD - WITH REAL DATA FROM API
    if (role === 'CUSTOMER') {
      return (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary-600 p-8 shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {currentUser?.fullName?.split(' ')[0]}!</h2>
              <p className="text-primary-100">Your personal pharmacy dashboard - track orders and manage prescriptions.</p>
            </div>
          </div>

          {/* Stats Grid - Using REAL data from API */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard title="Total Orders" value={data?.stats?.totalOrders || 0} icon={ShoppingCart} />
            <StatCard title="Delivered" value={data?.stats?.deliveredOrders || 0} icon={CheckCircle} />
            <StatCard title="Pending" value={data?.stats?.pendingOrders || 0} icon={Clock} />
            <StatCard title="Total Spent" value={`M${formatCurrency(data?.stats?.totalSpent)}`} icon={DollarSign} />
          </div>

          {/* Recent Orders Section - Show actual recent orders from API */}
          {data?.recentOrders && data.recentOrders.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary-500" />
                Recent Orders
              </h3>
              <div className="space-y-3">
                {data.recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary-600">M{parseFloat(order.grandTotal).toFixed(2)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => handleNavigation('customer-orders', '/orders')}
                className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View All Orders
                <Rocket className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <QuickActionCard title="Browse Medicines" icon={ShoppingBag} onClick={() => handleNavigation('shop', '/shop')} description="Shop for your healthcare needs" />
            <QuickActionCard title="Upload Prescription" icon={FileText} onClick={() => handleNavigation('customer-prescriptions', '/prescriptions')} description="Upload prescription for approval" />
            <QuickActionCard title="View Orders" icon={ClipboardList} onClick={() => handleNavigation('customer-orders', '/orders')} description="Track your order status" />
          </div>

          {/* Health Tips */}
          <div className="rounded-2xl bg-primary-50 dark:bg-primary-900/20 p-5 border border-primary-100 dark:border-primary-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-800 dark:text-primary-400">Health Tip</h3>
                <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">Always take medications as prescribed by your doctor. Never share prescription medicines with others.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // DELIVERY STAFF DASHBOARD - Consistent styling with primary color
    if (role === 'DELIVERY_STAFF') {
      return (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary-600 p-8 shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {currentUser?.fullName?.split(' ')[0]}!</h2>
              <p className="text-primary-100">Ready for deliveries? Check your assigned orders below.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard title="Assigned Orders" value={data?.stats?.assignedOrders || 0} icon={Truck} />
            <StatCard title="Completed" value={data?.stats?.completedDeliveries || 0} icon={CheckCircle} />
            <StatCard title="Available Pickups" value={data?.stats?.availableOrders || 0} icon={Package} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <QuickActionCard title="My Deliveries" icon={Truck} onClick={() => handleNavigation('my-deliveries', '/my-deliveries')} description="View and manage your assigned deliveries" />
            <QuickActionCard title="Available Orders" icon={Package} onClick={() => handleNavigation('my-deliveries', '/my-deliveries')} description="Accept new delivery requests" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Modern Header */}
      <header className="glass-morphism sticky top-0 z-50 shadow-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Pill className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold gradient-text">
                    {dashboardData?.settings?.pharmacy_name || 'Pharmacy POS System'}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Complete Care Management</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <NotificationCenter />
              
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">{currentUser?.fullName?.split(' ')[0]}</p>
                  <p className="text-xs text-gray-500">{currentUser?.role}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md">
                  {currentUser?.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.fullName} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold">
                      {currentUser?.fullName?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 bg-gradient-to-b from-primary-600 to-primary-800 dark:from-gray-800 dark:to-gray-900 min-h-screen shadow-2xl fixed left-0 top-0 overflow-y-auto">
          <nav className="p-6 pt-24 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id, item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  location.pathname === item.path
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            ))}
          </nav>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                {currentUser?.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.fullName} 
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <UserCircle className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{currentUser?.fullName}</p>
                <p className="text-xs text-white/70">{currentUser?.role}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-primary-600 to-primary-800 dark:from-gray-800 dark:to-gray-900 shadow-2xl z-50 overflow-y-auto">
              <div className="p-6 border-b border-white/20 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Menu</h2>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <nav className="p-6 space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleNavigation(item.id, item.path);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      location.pathname === item.path
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </button>
                ))}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    {currentUser?.avatar ? (
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.fullName} 
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <UserCircle className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{currentUser?.fullName}</p>
                    <p className="text-xs text-white/70">{currentUser?.role}</p>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-72 container mx-auto px-6 py-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;