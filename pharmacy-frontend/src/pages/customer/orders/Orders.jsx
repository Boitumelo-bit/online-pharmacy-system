// frontend/src/pages/Orders.jsx
import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, Truck, MapPin, Calendar, Eye, AlertCircle, ArrowLeft, ShoppingBag, CreditCard, Receipt, RefreshCw, UserCheck, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../stores/authStore';
import OrderStatusUpdateModal from './OrderStatusUpdateModal';
import DeliveryAssignmentModal from './DeliveryAssignmentModal';

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [activeTab, setActiveTab] = useState('my-orders');
  const [currentOrderForAction, setCurrentOrderForAction] = useState(null);
  
  const userRole = user?.role;

  useEffect(() => {
    console.log('User role:', userRole);
    fetchOrders();
    if (userRole === 'DELIVERY_STAFF') {
      fetchAvailableOrders();
    }
  }, [userRole]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders');
      console.log('Orders API Response:', response.data);
      
      if (response.data.success) {
        const data = response.data.data;
        
        if (userRole === 'DELIVERY_STAFF') {
          console.log('Delivery staff data received:', data);
          
          // Handle different response structures
          if (data && typeof data === 'object') {
            if (data.assigned !== undefined) {
              setOrders(data.assigned || []);
              setAvailableOrders(data.available || []);
              console.log('Assigned orders:', data.assigned?.length);
              console.log('Available orders from main API:', data.available?.length);
            } else if (Array.isArray(data)) {
              setOrders(data);
              console.log('Orders array length:', data.length);
            } else {
              setOrders([]);
            }
          } else {
            setOrders([]);
          }
        } else {
          setOrders(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const response = await api.get('/orders/delivery/available');
      console.log('Available Orders API Response:', response.data);
      
      if (response.data.success) {
        const available = response.data.data || [];
        setAvailableOrders(available);
        console.log('Available orders set to:', available.length);
      }
    } catch (error) {
      console.error('Error fetching available orders:', error);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
      if (userRole === 'DELIVERY_STAFF') {
        fetchAvailableOrders();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      await api.post(`/orders/${orderId}/cancel`);
      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleSelfAssign = async (orderId) => {
    try {
      await api.post(`/orders/delivery/${orderId}/self-assign`);
      toast.success('Order assigned to you successfully');
      fetchOrders();
      fetchAvailableOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign order');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-500', text: 'Pending', icon: Clock, bgLight: 'bg-yellow-50 dark:bg-yellow-900/20', textLight: 'text-yellow-700 dark:text-yellow-400' },
      APPROVED: { color: 'bg-blue-500', text: 'Approved', icon: CheckCircle, bgLight: 'bg-blue-50 dark:bg-blue-900/20', textLight: 'text-blue-700 dark:text-blue-400' },
      PREPARING: { color: 'bg-purple-500', text: 'Preparing', icon: Package, bgLight: 'bg-purple-50 dark:bg-purple-900/20', textLight: 'text-purple-700 dark:text-purple-400' },
      READY: { color: 'bg-indigo-500', text: 'Ready', icon: Package, bgLight: 'bg-indigo-50 dark:bg-indigo-900/20', textLight: 'text-indigo-700 dark:text-indigo-400' },
      OUT_FOR_DELIVERY: { color: 'bg-orange-500', text: 'Out for Delivery', icon: Truck, bgLight: 'bg-orange-50 dark:bg-orange-900/20', textLight: 'text-orange-700 dark:text-orange-400' },
      DELIVERED: { color: 'bg-green-500', text: 'Delivered', icon: CheckCircle, bgLight: 'bg-green-50 dark:bg-green-900/20', textLight: 'text-green-700 dark:text-green-400' },
      CANCELLED: { color: 'bg-red-500', text: 'Cancelled', icon: AlertCircle, bgLight: 'bg-red-50 dark:bg-red-900/20', textLight: 'text-red-700 dark:text-red-400' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.bgLight} ${config.textLight}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{config.text}</span>
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleBackToShop = () => {
    navigate('/shop');
  };

  const canUpdateStatus = (orderStatus, orderUserId) => {
    if (userRole === 'ADMIN') return true;
    if (userRole === 'PHARMACIST' && ['PENDING', 'APPROVED', 'PREPARING'].includes(orderStatus)) return true;
    if (userRole === 'DELIVERY_STAFF' && orderStatus === 'OUT_FOR_DELIVERY') return true;
    return false;
  };

  const canCancelOrder = (orderStatus, orderUserId) => {
    if (userRole === 'ADMIN') return true;
    if (userRole === 'CUSTOMER' && orderStatus === 'PENDING' && orderUserId === user?.id) return true;
    if (userRole === 'PHARMACIST' && orderStatus === 'PENDING') return true;
    return false;
  };

  const canAssignDelivery = (orderStatus) => {
    return (userRole === 'ADMIN' || userRole === 'PHARMACIST') && orderStatus === 'READY';
  };

  const canSelfAssign = (orderStatus, hasDeliveryStaff) => {
    return userRole === 'DELIVERY_STAFF' && orderStatus === 'READY' && !hasDeliveryStaff;
  };

  const getDashboardTitle = () => {
    switch(userRole) {
      case 'ADMIN': return 'All Orders';
      case 'PHARMACIST': return 'Order Management';
      case 'DELIVERY_STAFF': return 'Delivery Dashboard';
      default: return 'My Orders';
    }
  };

  const renderDeliveryTabs = () => {
    if (userRole !== 'DELIVERY_STAFF') return null;
    
    return (
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('my-orders')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'my-orders'
              ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          My Deliveries ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'available'
              ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Available Orders ({availableOrders.length})
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading orders...</p>
      </div>
    );
  }

  const displayOrders = activeTab === 'available' ? availableOrders : orders;
  
  console.log('Display orders count:', displayOrders.length);
  console.log('Active tab:', activeTab);

  return (
    <div className="max-w-6xl mx-auto">
      {userRole === 'CUSTOMER' && (
        <button
          onClick={handleBackToShop}
          className="group flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors duration-200 mb-6"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Continue Shopping</span>
        </button>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{getDashboardTitle()}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {userRole === 'DELIVERY_STAFF' 
              ? 'Manage your deliveries' 
              : userRole === 'PHARMACIST'
              ? 'Process and prepare orders'
              : 'Track and manage your orders'}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Receipt className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-500">
            {displayOrders.length} orders
          </span>
        </div>
      </div>
      
      {renderDeliveryTabs()}
      
      {displayOrders.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 rounded-2xl">
          <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
            {userRole === 'DELIVERY_STAFF' ? (
              <Truck className="w-16 h-16 text-gray-400" />
            ) : (
              <ShoppingBag className="w-16 h-16 text-gray-400" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {activeTab === 'available' ? 'No available orders' : 'No orders yet'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {activeTab === 'available' 
              ? 'Check back later for delivery opportunities'
              : userRole === 'DELIVERY_STAFF'
              ? 'No deliveries assigned to you yet'
              : 'Looks like you haven\'t placed any orders'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayOrders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {order.orderNumber}
                      </h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {formatDate(order.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {order.address?.city || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4" />
                        {order.paymentMethod?.replace('_', ' ') || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">M{parseFloat(order.grandTotal).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.orderItems?.length || 0} items</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-3">
                  {order.orderItems?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-500 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.medicine?.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-primary-600">M{parseFloat(item.total).toFixed(2)}</p>
                    </div>
                  ))}
                  {order.orderItems?.length > 3 && (
                    <div className="flex items-center px-3 py-2 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                      <span className="text-sm text-gray-500">+{order.orderItems.length - 3} more items</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 flex flex-wrap justify-end gap-3">
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
                
                {canUpdateStatus(order.status, order.userId) && (
                  <button
                    onClick={() => {
                      setCurrentOrderForAction(order);
                      setShowStatusModal(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Update Status</span>
                  </button>
                )}
                
                {canAssignDelivery(order.status) && (
                  <button
                    onClick={() => {
                      setCurrentOrderForAction(order);
                      setShowDeliveryModal(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-200"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Assign Delivery</span>
                  </button>
                )}
                
                {canSelfAssign(order.status, order.delivery) && (
                  <button
                    onClick={() => handleSelfAssign(order.id)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all duration-200"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Accept Delivery</span>
                  </button>
                )}
                
                {canCancelOrder(order.status, order.userId) && (
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Cancel Order</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Modals - same as before */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-primary-600 p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Receipt className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Order Details</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/20 rounded-xl">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Order Number</p>
                  <p className="font-semibold">{selectedOrder.orderNumber}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Order Date</p>
                  <p className="font-semibold">{formatDate(selectedOrder.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showStatusModal && currentOrderForAction && (
        <OrderStatusUpdateModal
          order={currentOrderForAction}
          onClose={() => {
            setShowStatusModal(false);
            setCurrentOrderForAction(null);
          }}
          onUpdate={() => {
            fetchOrders();
            if (userRole === 'DELIVERY_STAFF') fetchAvailableOrders();
          }}
        />
      )}
      
      {showDeliveryModal && currentOrderForAction && (
        <DeliveryAssignmentModal
          order={currentOrderForAction}
          onClose={() => {
            setShowDeliveryModal(false);
            setCurrentOrderForAction(null);
          }}
          onAssign={() => fetchOrders()}
        />
      )}
    </div>
  );
};

export default Orders;