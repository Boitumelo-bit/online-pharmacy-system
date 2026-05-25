import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, Truck, ShoppingCart, FileText, Clock, Trash2, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { getSocket } from '../services/socket';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuthStore();

  useEffect(() => {
    const socket = getSocket();

    const handleNewNotification = (notification) => {
      console.log('📬 NotificationCenter received:', notification);
      addNotification(notification);
    };

    const handleCustomNotification = (event) => {
      addNotification(event.detail);
    };

    socket.on('new-notification', handleNewNotification);
    window.addEventListener('new-notification', handleCustomNotification);

    fetchNotifications();
    fetchUnreadCount();

    return () => {
      socket.off('new-notification', handleNewNotification);
      window.removeEventListener('new-notification', handleCustomNotification);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.data);
        const unread = response.data.data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: notification.id || Date.now(),
      title: notification.title,
      message: notification.message,
      type: notification.type || 'SYSTEM',
      isRead: false,
      createdAt: notification.createdAt || new Date().toISOString(),
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'ORDER': return { icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' };
      case 'PRESCRIPTION': return { icon: FileText, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' };
      case 'DELIVERY': return { icon: Truck, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' };
      case 'ALERT': return { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' };
      default: return { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700' };
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const clearAll = async () => {
    if (window.confirm('Clear all notifications?')) {
      try {
        await api.delete('/notifications/all');
        setNotifications([]);
        setUnreadCount(0);
        toast.success('All notifications cleared');
      } catch (error) {
        toast.error('Failed to clear notifications');
      }
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const mins = Math.floor((new Date() - date) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1.5 shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 w-[420px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 border overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary-500" />
                  Notifications
                </h3>
                <p className="text-xs text-gray-500">{unreadCount} unread</p>
              </div>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <>
                    <button onClick={markAllAsRead} className="text-xs text-primary-600 px-2 py-1 hover:bg-primary-50 rounded-lg">
                      <CheckCheck className="w-3.5 h-3.5 inline mr-1" />Mark all
                    </button>
                    <button onClick={clearAll} className="text-xs text-red-500 px-2 py-1 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5 inline mr-1" />Clear
                    </button>
                  </>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const { icon: Icon, color, bg } = getIcon(n.type);
                  return (
                    <div
                      key={n.id}
                      className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{n.title}</p>
                          <p className="text-sm text-gray-600">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(n.createdAt)}
                          </p>
                        </div>
                        {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;