import React, { useState, useEffect } from 'react';
import { X, UserCheck, Truck, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const DeliveryAssignmentModal = ({ order, onClose, onAssign }) => {
  const [deliveryStaff, setDeliveryStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDeliveryStaff();
  }, []);

  const fetchDeliveryStaff = async () => {
    try {
      // FIXED: Correct endpoint
      const response = await api.get('/orders/users/delivery-staff');
      console.log('Delivery staff response:', response.data);
      
      if (response.data.success) {
        setDeliveryStaff(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching delivery staff:', error);
      toast.error('Failed to load delivery staff list');
    }
  };

  const handleAssign = async () => {
    if (!selectedStaff) {
      toast.error('Please select a delivery staff');
      return;
    }
    
    // Check if order status is READY before assigning
    if (order.status !== 'READY') {
      toast.error('Order must be READY before assigning delivery');
      return;
    }
    
    setLoading(true);
    try {
      await api.post(`/orders/${order.id}/assign-delivery`, {
        deliveryStaffId: selectedStaff
      });
      toast.success('Delivery assigned successfully');
      onAssign();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign delivery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full animate-scale-up shadow-2xl">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-green-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assign Delivery</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
            <p className="text-sm text-gray-500">Order</p>
            <p className="font-semibold">{order.orderNumber}</p>
            <p className="text-sm text-gray-500 mt-2">Current Status</p>
            <p className={`font-medium ${
              order.status === 'READY' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {order.status}
            </p>
            {order.status !== 'READY' && (
              <p className="text-xs text-red-500 mt-2">
                Note: Order must be READY before assigning delivery. Current status: {order.status}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-2">Customer</p>
            <p className="font-medium">{order.user?.fullName}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Delivery Staff
            </label>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {deliveryStaff.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No delivery staff available</p>
                  <p className="text-xs text-gray-400 mt-1">Ask admin to add delivery staff</p>
                </div>
              ) : (
                deliveryStaff.map((staff) => (
                  <label
                    key={staff.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedStaff === staff.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="staff"
                      value={staff.id}
                      checked={selectedStaff === staff.id}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">{staff.fullName}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Phone className="w-3 h-3" />
                        <span>{staff.phone || 'No phone'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="w-3 h-3" />
                        <span>{staff.email}</span>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={loading || !selectedStaff || deliveryStaff.length === 0 || order.status !== 'READY'}
              className={`flex-1 px-4 py-2 rounded-xl transition-colors ${
                order.status === 'READY'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {loading ? 'Assigning...' : 'Assign Delivery'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAssignmentModal;