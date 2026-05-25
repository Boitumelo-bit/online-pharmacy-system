import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, ShoppingCart, FileText, 
  CreditCard, Truck, Users, Package, Settings, BarChart3, 
  LogOut, UserCircle, Heart, Pill, Tag, ClipboardList, 
  Menu, X, ChevronLeft, ChevronRight
} from 'lucide-react';

const Sidebar = ({ user, onLogout }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const getMenuItems = () => {
    const role = user?.role;
    
    // Common items for all roles
    const commonItems = [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Profile', icon: UserCircle, path: '/profile' },
    ];
    
    // Customer items
    const customerItems = [
      { name: 'Shop', icon: ShoppingBag, path: '/shop' },
      { name: 'Cart', icon: ShoppingCart, path: '/cart' },
      { name: 'My Orders', icon: ClipboardList, path: '/orders' },
      { name: 'Prescriptions', icon: FileText, path: '/prescriptions' },
      { name: 'Wishlist', icon: Heart, path: '/wishlist' },
    ];
    
    // Pharmacist items
    const pharmacistItems = [
      { name: 'POS Terminal', icon: CreditCard, path: '/pos' },
      { name: 'Prescription Queue', icon: FileText, path: '/pharmacist-prescriptions' },
      { name: 'Orders', icon: ClipboardList, path: '/orders' },
    ];
    
    // Admin items - grouped for better organization
    const adminItems = [
      { name: 'Medicines', icon: Pill, path: '/medicines' },
      { name: 'Categories', icon: Tag, path: '/categories' },
      { name: 'Orders', icon: ClipboardList, path: '/orders' },
      { name: 'Prescriptions', icon: FileText, path: '/admin-prescriptions' },
      { name: 'Users', icon: Users, path: '/users' },
      { name: 'Reports', icon: BarChart3, path: '/reports' },
      { name: 'Settings', icon: Settings, path: '/settings' },
    ];
    
    // Delivery items
    const deliveryItems = [
      { name: 'My Deliveries', icon: Truck, path: '/my-deliveries' },
    ];
    
    let roleItems = [];
    if (user?.role === 'CUSTOMER') roleItems = customerItems;
    else if (user?.role === 'PHARMACIST') roleItems = pharmacistItems;
    else if (user?.role === 'ADMIN') roleItems = adminItems;
    else if (user?.role === 'DELIVERY_STAFF') roleItems = deliveryItems;
    
    return [...commonItems, ...roleItems];
  };
  
  const menuItems = getMenuItems();
  
  // Get role-specific gradient
  const getSidebarGradient = () => {
    const role = user?.role;
    switch(role) {
      case 'ADMIN': return 'from-purple-700 via-purple-800 to-indigo-900';
      case 'PHARMACIST': return 'from-blue-700 via-blue-800 to-cyan-900';
      case 'DELIVERY_STAFF': return 'from-orange-700 via-orange-800 to-amber-900';
      case 'CUSTOMER': return 'from-emerald-700 via-emerald-800 to-teal-900';
      default: return 'from-primary-700 via-primary-800 to-primary-900';
    }
  };
  
  // Get role icon
  const getRoleIcon = () => {
    const role = user?.role;
    switch(role) {
      case 'ADMIN': return <Settings className="w-6 h-6" />;
      case 'PHARMACIST': return <CreditCard className="w-6 h-6" />;
      case 'DELIVERY_STAFF': return <Truck className="w-6 h-6" />;
      case 'CUSTOMER': return <ShoppingBag className="w-6 h-6" />;
      default: return <UserCircle className="w-6 h-6" />;
    }
  };
  
  // Get role display name
  const getRoleDisplayName = () => {
    const role = user?.role;
    switch(role) {
      case 'ADMIN': return 'Administrator';
      case 'PHARMACIST': return 'Pharmacist';
      case 'DELIVERY_STAFF': return 'Delivery Staff';
      case 'CUSTOMER': return 'Customer';
      default: return role;
    }
  };

  // Group menu items for admin
  const getGroupedMenuItems = () => {
    if (user?.role !== 'ADMIN') return { main: menuItems, others: [] };
    
    const mainItems = menuItems.filter(item => 
      ['Dashboard', 'Profile', 'Medicines', 'Categories', 'Orders', 'Prescriptions'].includes(item.name)
    );
    const otherItems = menuItems.filter(item => 
      ['Users', 'Reports', 'Settings'].includes(item.name)
    );
    
    return { main: mainItems, others: otherItems };
  };
  
  const groupedItems = getGroupedMenuItems();

  // Sidebar content component
  const SidebarContent = () => (
    <div className={`flex flex-col h-full ${isCollapsed ? 'items-center' : ''}`}>
      {/* Logo Section */}
      <div className={`p-4 border-b border-white/20 ${isCollapsed ? 'text-center' : ''}`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">Pharmacy POS</h1>
              <p className="text-[10px] text-white/70 truncate">Complete Care</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mx-auto">
            <Pill className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      
      {/* User Info - Compact */}
      <div className={`p-4 border-b border-white/20 ${isCollapsed ? 'text-center' : ''}`}>
        <div className={`flex ${isCollapsed ? 'flex-col' : 'items-center gap-2'}`}>
          <div className={`${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'} rounded-lg flex items-center justify-center bg-white/20 shrink-0 ${isCollapsed ? 'mx-auto' : ''}`}>
            {getRoleIcon()}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white text-sm truncate">{user?.fullName?.split(' ')[0]}</p>
              <p className="text-[10px] text-white/70 truncate">{getRoleDisplayName()}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main Menu Items */}
        {groupedItems.main.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
            title={isCollapsed ? item.name : ''}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium truncate">{item.name}</span>}
          </NavLink>
        ))}
        
        {/* Separator for Admin other items */}
        {user?.role === 'ADMIN' && groupedItems.others.length > 0 && !isCollapsed && (
          <div className="my-3 pt-2 border-t border-white/20">
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider px-2 mb-2">
              Management
            </p>
          </div>
        )}
        
        {user?.role === 'ADMIN' && groupedItems.others.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
            title={isCollapsed ? item.name : ''}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium truncate">{item.name}</span>}
          </NavLink>
        ))}
      </nav>
      
      {/* Collapse Toggle Button (Desktop only) */}
      {!isMobile && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="m-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 text-white/70 hover:text-white"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}
      
      {/* Logout Button */}
      <div className={`p-3 border-t border-white/20 ${isCollapsed ? 'text-center' : ''}`}>
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-all duration-200 group ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );

  // Desktop Sidebar (collapsible)
  if (!isMobile) {
    return (
      <>
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-primary-600 text-white shadow-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Desktop Sidebar */}
        <aside 
          className={`fixed left-0 top-0 h-full bg-gradient-to-b ${getSidebarGradient()} shadow-2xl transition-all duration-300 z-40 hidden lg:block`}
          style={{ width: isCollapsed ? '72px' : '260px' }}
        >
          <SidebarContent />
        </aside>
        
        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <aside 
              className="fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-purple-700 via-purple-800 to-indigo-900 shadow-2xl z-50 animate-slide-in"
            >
              <div className="flex justify-end p-4">
                <button onClick={() => setIsMobileOpen(false)} className="p-2 rounded-lg bg-white/10 text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="-mt-12">
                <SidebarContent />
              </div>
            </aside>
          </>
        )}
      </>
    );
  }

  // Mobile Sidebar (full width overlay)
  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary-600 text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>
      
      {isMobileOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside 
            className="fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-purple-700 via-purple-800 to-indigo-900 shadow-2xl z-50 animate-slide-in"
          >
            <div className="flex justify-end p-4">
              <button onClick={() => setIsMobileOpen(false)} className="p-2 rounded-lg bg-white/10 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="-mt-12">
              <SidebarContent />
            </div>
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;