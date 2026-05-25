import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Truck, Activity, CheckCircle, XCircle, Search, Mail, Phone, User, Lock, AlertCircle, Edit, Save, X } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'PHARMACIST'
  });
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, roleFilter, users]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/admin/users');
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)
      );
    }
    
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(filtered);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      const response = await api.post('/auth/admin/create-user', formData);
      toast.success(`${formData.role} created successfully!`);
      setShowCreateModal(false);
      setFormData({ fullName: '', email: '', phone: '', password: '', role: 'PHARMACIST' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!editFormData.fullName || !editFormData.email || !editFormData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const response = await api.put(`/auth/admin/update-user/${selectedUser.id}`, editFormData);
      toast.success('User updated successfully!');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await api.put(`/auth/admin/toggle-status/${userId}`);
      toast.success(response.data.message);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const getRoleBadge = (role) => {
    const config = {
      ADMIN: { color: 'from-purple-500 to-purple-600', icon: Shield, bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
      PHARMACIST: { color: 'from-blue-500 to-blue-600', icon: Activity, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
      DELIVERY_STAFF: { color: 'from-green-500 to-green-600', icon: Truck, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      CUSTOMER: { color: 'from-gray-500 to-gray-600', icon: Users, bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-400' },
    };
    const RoleIcon = config[role]?.icon || Users;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config[role]?.bg} ${config[role]?.text}`}>
        <RoleIcon className="w-3.5 h-3.5" />
        <span>{role.replace('_', ' ')}</span>
      </span>
    );
  };

  const getRoleCount = (role) => {
    return users.filter(u => u.role === role).length;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="loader mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage system users and their roles</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Staff Account</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="stat-card text-center p-3">
          <Users className="w-5 h-5 text-primary-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900 dark:text-white">{users.length}</p>
          <p className="text-xs text-gray-500">Total Users</p>
        </div>
        <div className="stat-card text-center p-3">
          <Activity className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900 dark:text-white">{getRoleCount('PHARMACIST')}</p>
          <p className="text-xs text-gray-500">Pharmacists</p>
        </div>
        <div className="stat-card text-center p-3">
          <Truck className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900 dark:text-white">{getRoleCount('DELIVERY_STAFF')}</p>
          <p className="text-xs text-gray-500">Delivery Staff</p>
        </div>
        <div className="stat-card text-center p-3">
          <Users className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900 dark:text-white">{getRoleCount('CUSTOMER')}</p>
          <p className="text-xs text-gray-500">Customers</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 w-4 h-4 transition-colors duration-200" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-40 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="PHARMACIST">Pharmacist</option>
          <option value="DELIVERY_STAFF">Delivery Staff</option>
          <option value="CUSTOMER">Customer</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center">
                    <Users className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No users found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-200">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">{user.fullName}</p>
                          <p className="text-xs text-gray-500">ID: {user.id.slice(0, 6)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{user.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        user.isActive 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {user.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{user.isActive ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-all duration-200"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                            user.isActive 
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50' 
                              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                          }`}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full animate-scale-up shadow-2xl">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-bold text-white">Create Staff Account</h2>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)} 
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-all duration-200"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200" placeholder="Enter full name" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200" placeholder="staff@pharmacy.com" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200" placeholder="+266 1234 5678" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200" placeholder="Minimum 6 characters" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role <span className="text-red-500">*</span></label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200">
                  <option value="PHARMACIST">👨‍⚕️ Pharmacist</option>
                  <option value="DELIVERY_STAFF">🚚 Delivery Staff</option>
                </select>
              </div>
            
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-2 rounded-lg text-sm font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full animate-scale-up shadow-2xl">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-bold text-white">Edit User</h2>
                </div>
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-all duration-200"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    value={editFormData.fullName}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role <span className="text-red-500">*</span></label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  disabled={selectedUser?.role === 'ADMIN'}
                >
                  <option value="PHARMACIST">👨‍⚕️ Pharmacist</option>
                  <option value="DELIVERY_STAFF">🚚 Delivery Staff</option>
                  <option value="CUSTOMER">👤 Customer</option>
                </select>
                {selectedUser?.role === 'ADMIN' && (
                  <p className="text-xs text-amber-600 mt-1">Admin role cannot be changed</p>
                )}
              </div>
            
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;