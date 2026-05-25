import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Clock, CheckCircle, Package, Phone, User, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const DeliveryDashboard = () => {
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my');
  const [acceptingId, setAcceptingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes, availableRes] = await Promise.all([
        api.get('/delivery/my'),
        api.get('/delivery/available')
      ]);
      
      if (myRes.data.success) setMyDeliveries(myRes.data.data || []);
      if (availableRes.data.success) setAvailableOrders(availableRes.data.data || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const acceptDelivery = async (orderId) => {
    setAcceptingId(orderId);
    try {
      const response = await api.post(`/delivery/accept/${orderId}`);
      if (response.data.success) {
        toast.success(response.data.message || 'Delivery accepted!');
        fetchData();
        setActiveTab('my');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept delivery');
    } finally {
      setAcceptingId(null);
    }
  };

  const updateDeliveryStatus = async (deliveryId, status, location) => {
    setUpdatingId(deliveryId);
    try {
      const response = await api.put(`/delivery/${deliveryId}/status`, { status, location });
      if (response.data.success) {
        toast.success(`Delivery marked as ${status.replace('_', ' ')}`);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getLastStatus = (delivery) => {
    if (!delivery.trackingHistory || delivery.trackingHistory.length === 0) return 'ASSIGNED';
    return delivery.trackingHistory[delivery.trackingHistory.length - 1].status;
  };

  const getStatusBadge = (status) => {
    const config = {
      ASSIGNED: { color: 'bg-blue-100 text-blue-700', text: 'Assigned' },
      PICKED_UP: { color: 'bg-purple-100 text-purple-700', text: 'Picked Up' },
      OUT_FOR_DELIVERY: { color: 'bg-orange-100 text-orange-700', text: 'Out for Delivery' },
      DELIVERED: { color: 'bg-green-100 text-green-700', text: 'Delivered' },
      FAILED: { color: 'bg-red-100 text-red-700', text: 'Failed' },
    };
    const statusConfig = config[status] || config.ASSIGNED;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}>
        {statusConfig.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold gradient-text mb-8">Delivery Dashboard</h1>

      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'my' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          My Deliveries ({myDeliveries.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'available' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Available Orders ({availableOrders.length})
        </button>
      </div>

      {activeTab === 'my' && (
        <div className="space-y-4">
          {myDeliveries.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No deliveries assigned</p>
              <p className="text-sm text-gray-400 mt-1">Check available orders to start delivering</p>
            </div>
          ) : (
            myDeliveries.map((delivery) => {
              const currentStatus = getLastStatus(delivery);
              const isUpdating = updatingId === delivery.id;
              
              return (
                <div key={delivery.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Order #{delivery.order?.orderNumber}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          {getStatusBadge(currentStatus)}
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(delivery.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Customer</p>
                        <p className="font-medium">{delivery.order?.user?.fullName}</p>
                        <p className="text-sm text-gray-500">{delivery.order?.user?.phone}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Delivery Address</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.order?.address?.addressLine1}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.order?.address?.city}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Package className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Items</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {delivery.order?.orderItems?.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {item.medicine?.name} x{item.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {currentStatus !== 'DELIVERED' && (
                    <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/30 flex flex-wrap gap-2">
                      {currentStatus === 'ASSIGNED' && (
                        <button
                          onClick={() => updateDeliveryStatus(delivery.id, 'PICKED_UP', 'Pharmacy')}
                          disabled={isUpdating}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition disabled:opacity-50"
                        >
                          {isUpdating ? 'Updating...' : 'Mark as Picked Up'}
                        </button>
                      )}
                      {currentStatus === 'PICKED_UP' && (
                        <button
                          onClick={() => updateDeliveryStatus(delivery.id, 'OUT_FOR_DELIVERY', 'En Route')}
                          disabled={isUpdating}
                          className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition disabled:opacity-50"
                        >
                          {isUpdating ? 'Updating...' : 'Start Delivery'}
                        </button>
                      )}
                      {currentStatus === 'OUT_FOR_DELIVERY' && (
                        <button
                          onClick={() => updateDeliveryStatus(delivery.id, 'DELIVERED', 'Customer Location')}
                          disabled={isUpdating}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition disabled:opacity-50"
                        >
                          {isUpdating ? 'Updating...' : 'Mark as Delivered'}
                        </button>
                      )}
                    </div>
                  )}
                  {currentStatus === 'DELIVERED' && (
                    <div className="px-5 py-3 bg-green-50 dark:bg-green-900/20 text-center">
                      <span className="text-sm text-green-600 flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Completed - Delivered to customer
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'available' && (
        <div className="space-y-4">
          {availableOrders.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No available orders</p>
              <p className="text-sm text-gray-400 mt-1">Check back later for new orders</p>
            </div>
          ) : (
            availableOrders.map((order) => (
              <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Order #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Placed: {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">M{parseFloat(order.grandTotal).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">Ready for pickup</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 space-y-3">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Customer</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.user?.fullName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {order.user?.phone}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Delivery Address</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.address?.addressLine1}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.address?.city}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Package className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Items</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {order.orderItems?.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {item.medicine?.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/30">
                  <button
                    onClick={() => acceptDelivery(order.id)}
                    disabled={acceptingId === order.id}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {acceptingId === order.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Accepting...</span>
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4" />
                        <span>Accept Delivery</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;