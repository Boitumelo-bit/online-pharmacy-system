// frontend/src/hooks/useOrderPermissions.js
import { useAuthStore } from "../stores/authStore";

export const useOrderPermissions = () => {
  const { user } = useAuthStore();
  const userRole = user?.role;

  // Get available statuses for current order based on role and current status
  const getAvailableStatuses = (currentStatus) => {
    if (userRole === 'ADMIN') {
      return ['APPROVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    }
    
    if (userRole === 'PHARMACIST') {
      const transitions = {
        'PENDING': ['APPROVED', 'CANCELLED'],
        'APPROVED': ['PREPARING'],
        'PREPARING': ['READY'],
        'READY': []
      };
      return transitions[currentStatus] || [];
    }
    
    if (userRole === 'DELIVERY_STAFF') {
      return ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
    }
    
    return [];
  };

  // Check if user can update order status (shows the Update Status button)
  const canUpdateStatus = (orderStatus, orderUserId) => {
    if (userRole === 'ADMIN') return true;
    if (userRole === 'PHARMACIST' && ['PENDING', 'APPROVED', 'PREPARING'].includes(orderStatus)) return true;
    if (userRole === 'DELIVERY_STAFF' && orderStatus === 'OUT_FOR_DELIVERY') return true;
    return false;
  };

  // Check if user can cancel order
  const canCancelOrder = (orderStatus, orderUserId) => {
    if (userRole === 'ADMIN') return true;
    if (userRole === 'CUSTOMER' && orderStatus === 'PENDING' && orderUserId === user?.id) return true;
    if (userRole === 'PHARMACIST' && orderStatus === 'PENDING') return true;
    return false;
  };

  // Check if user can assign delivery
  const canAssignDelivery = (orderStatus) => {
    return (userRole === 'ADMIN' || userRole === 'PHARMACIST') && orderStatus === 'READY';
  };

  // Check if user can self-assign (delivery staff)
  const canSelfAssign = (orderStatus, hasDeliveryStaff) => {
    return userRole === 'DELIVERY_STAFF' && orderStatus === 'READY' && !hasDeliveryStaff;
  };

  // Get role-specific dashboard title
  const getDashboardTitle = () => {
    switch(userRole) {
      case 'ADMIN': return 'All Orders';
      case 'PHARMACIST': return 'Order Management';
      case 'DELIVERY_STAFF': return 'Delivery Dashboard';
      default: return 'My Orders';
    }
  };

  return {
    userRole,
    getAvailableStatuses,
    canUpdateStatus,
    canCancelOrder,
    canAssignDelivery,
    canSelfAssign,
    getDashboardTitle
  };
};