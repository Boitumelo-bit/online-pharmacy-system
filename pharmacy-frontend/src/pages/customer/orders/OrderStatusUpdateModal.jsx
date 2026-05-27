import React, { useState } from 'react';
import { X, Package, CheckCircle, Clock, Truck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const OrderStatusUpdateModal = ({ order, onClose, onUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  const [loading, setLoading] = useState(false);

  // Status flow for pharmacist
  const statusFlow = {
    PENDING: { next: 'APPROVED', label: 'Confirm Order', color: 'blue' },
    APPROVED: { next: 'PREPARING', label: 'Start Preparing', color: 'purple' },
    PREPARING: { next: 'READY', label: 'Mark as Ready', color: 'green' },
    READY: { next: null, label: 'Ready - Assign Delivery', color: 'indigo' },
  };

  const currentFlow = statusFlow[order.status];

  const handleStatusUpdate = async () => {
    if (!currentFlow || !currentFlow.next) {
      toast.error('Cannot update this order status');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/orders/${order.id}/status`, { 
        status: currentFlow.next 
      });
      toast.success(`Order status updated to ${currentFlow.next}`);
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
      APPROVED: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
      PREPARING: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
      READY: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
      OUT_FOR_DELIVERY: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
      DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    };
    return config[status] || config.PENDING;
  };

  const canUpdate = ['PENDING', 'APPROVED', 'PREPARING'].includes(order.status);

  if (!canUpdate) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-gray-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Update Status</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Order is already at <strong>{order.status}</strong> status.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              No further status updates available.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Update Order Status</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Order Info */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
            <p className="text-xs text-gray-500">Order Number</p>
            <p className="font-semibold text-gray-900 dark:text-white">{order.orderNumber}</p>
            <p className="text-xs text-gray-500 mt-2">Customer</p>
            <p className="font-medium text-gray-900 dark:text-white">{order.user?.fullName}</p>
          </div>

          {/* Current Status */}
          <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500">Current Status</p>
              <p className="font-semibold text-gray-900 dark:text-white">{order.status}</p>
            </div>
            <div className={`px-3 py-1 rounded-full ${getStatusBadge(order.status).bg} ${getStatusBadge(order.status).text}`}>
              {order.status}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          {/* Next Status */}
          <div className="flex items-center justify-between p-4 rounded-xl border-2 border-primary-200 bg-primary-50 dark:bg-primary-900/20">
            <div>
              <p className="text-xs text-gray-500">Next Status</p>
              <p className="font-semibold text-primary-700 dark:text-primary-400">{currentFlow.next}</p>
            </div>
            <div className={`px-3 py-1 rounded-full bg-primary-100 text-primary-700`}>
              {currentFlow.label}
            </div>
          </div>

          {/* Note */}
          <div className="text-center text-xs text-gray-500">
            <p>Updating status will send email notification to the customer.</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStatusUpdate}
              disabled={loading}
              className={`flex-1 px-4 py-2 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                currentFlow.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' :
                currentFlow.color === 'purple' ? 'bg-purple-500 hover:bg-purple-600' :
                'bg-green-500 hover:bg-green-600'
              } text-white`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{currentFlow.label}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusUpdateModal;