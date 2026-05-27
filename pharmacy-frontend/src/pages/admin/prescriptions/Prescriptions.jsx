import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Eye, FileText, AlertCircle, User, Mail, Phone, Calendar, Package, Stethoscope, FileWarning, ChevronRight, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const AdminPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchPrescriptions();
    const interval = setInterval(fetchPrescriptions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const response = await api.get('/prescriptions');
      if (response.data.success) {
        let data = response.data.data;
        if (filterStatus !== 'ALL') {
          data = data.filter(p => p.status === filterStatus);
        }
        setPrescriptions(data);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const refreshPrescriptions = async () => {
    setIsRefreshing(true);
    await fetchPrescriptions();
    toast.success('Prescriptions refreshed');
  };

  const getStatusBadge = (status) => {
    const config = {
      PENDING: { color: 'bg-gradient-to-r from-yellow-500 to-amber-500', text: 'Pending', icon: Clock, textColor: 'text-yellow-800 dark:text-yellow-400', bgLight: 'bg-yellow-50 dark:bg-yellow-900/20' },
      APPROVED: { color: 'bg-gradient-to-r from-green-500 to-emerald-500', text: 'Approved', icon: CheckCircle, textColor: 'text-green-800 dark:text-green-400', bgLight: 'bg-green-50 dark:bg-green-900/20' },
      REJECTED: { color: 'bg-gradient-to-r from-red-500 to-rose-500', text: 'Rejected', icon: XCircle, textColor: 'text-red-800 dark:text-red-400', bgLight: 'bg-red-50 dark:bg-red-900/20' },
      FULFILLED: { color: 'bg-gradient-to-r from-blue-500 to-indigo-500', text: 'Fulfilled', icon: CheckCircle, textColor: 'text-blue-800 dark:text-blue-400', bgLight: 'bg-blue-50 dark:bg-blue-900/20' },
    };
    const statusConfig = config[status] || config.PENDING;
    const Icon = statusConfig.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-sm ${statusConfig.color}`}>
        <Icon className="w-3 h-3" />
        {statusConfig.text}
      </span>
    );
  };

  const getPendingCount = () => {
    return prescriptions.filter(p => p.status === 'PENDING').length;
  };

  const getStatusCount = (status) => {
    return prescriptions.filter(p => p.status === status).length;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mt-4">Loading prescriptions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
              <FileText className="w-7 h-7" />
              Prescriptions Management
            </h1>
            <p className="text-primary-100">Review and manage patient prescriptions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refreshPrescriptions}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {getPendingCount() > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/30 backdrop-blur-sm text-white rounded-xl">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">{getPendingCount()} Pending</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-yellow-100 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{getStatusCount('PENDING')}</span>
          </div>
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Pending</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">Awaiting review</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-green-700 dark:text-green-400">{getStatusCount('APPROVED')}</span>
          </div>
          <p className="text-sm font-medium text-green-800 dark:text-green-400">Approved</p>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">Ready for fulfillment</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">{getStatusCount('FULFILLED')}</span>
          </div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Fulfilled</p>
          <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Order completed</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl p-4 border border-red-100 dark:border-red-800">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-2xl font-bold text-red-700 dark:text-red-400">{getStatusCount('REJECTED')}</span>
          </div>
          <p className="text-sm font-medium text-red-800 dark:text-red-400">Rejected</p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-1">Not approved</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filterStatus === 'ALL'
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({prescriptions.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filterStatus === 'PENDING'
                ? 'bg-yellow-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Pending ({getStatusCount('PENDING')})
          </button>
          <button
            onClick={() => setFilterStatus('APPROVED')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filterStatus === 'APPROVED'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Approved ({getStatusCount('APPROVED')})
          </button>
          <button
            onClick={() => setFilterStatus('FULFILLED')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filterStatus === 'FULFILLED'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Fulfilled ({getStatusCount('FULFILLED')})
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filterStatus === 'REJECTED'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Rejected ({getStatusCount('REJECTED')})
          </button>
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        {prescriptions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No prescriptions found</p>
            <p className="text-sm text-gray-400 mt-1">Prescriptions will appear here when patients upload them</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {prescriptions.map((prescription, index) => (
              <div 
                key={prescription.id} 
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-200 group cursor-pointer"
                onClick={() => setSelectedPrescription(prescription)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* Header Row */}
                    <div className="flex items-center flex-wrap gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary-600" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {prescription.user?.fullName}
                        </span>
                      </div>
                      {getStatusBadge(prescription.status)}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(prescription.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Contact Info */}
                    <div className="flex flex-wrap gap-4 mb-3 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {prescription.user?.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {prescription.user?.phone}
                      </div>
                    </div>
                    
                    {/* Patient Notes */}
                    {prescription.notes && (
                      <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-400">
                          <span className="font-semibold">📝 Patient Notes:</span> {prescription.notes}
                        </p>
                      </div>
                    )}
                    
                    {/* Medicines List */}
                    {prescription.items && prescription.items.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Requested Medicines</p>
                        <div className="flex flex-wrap gap-2">
                          {prescription.items.map(item => (
                            <div 
                              key={item.id} 
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
                                item.status === 'APPROVED' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : item.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              <Package className="w-3 h-3" />
                              {item.medicineName} ({item.quantity})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Rejection Reason */}
                    {prescription.rejectionReason && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-semibold">Rejection Reason:</span> {prescription.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* View Button */}
                  <button 
                    className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPrescription(prescription);
                    }}
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
                
                {/* View Details Link */}
                <div className="mt-3 pt-2 flex justify-end">
                  <button 
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    onClick={() => setSelectedPrescription(prescription)}
                  >
                    View Full Details
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Details Modal - READ ONLY (No approve/reject buttons) */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-up shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-primary-600 p-5 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Prescription Details</h3>
                </div>
                <button 
                  onClick={() => setSelectedPrescription(null)} 
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Prescription Image */}
              {selectedPrescription.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
                  <img 
                    src={selectedPrescription.imageUrl} 
                    alt="Prescription" 
                    className="w-full object-cover max-h-96"
                  />
                </div>
              )}
              
              {/* Patient Information */}
              <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white">Patient Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedPrescription.user?.fullName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedPrescription.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedPrescription.user?.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Submitted:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{new Date(selectedPrescription.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Patient Notes */}
              {selectedPrescription.notes && (
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-5 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 mb-3">
                    <FileWarning className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-400">Patient Notes</h4>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{selectedPrescription.notes}</p>
                </div>
              )}
              
              {/* Medicines List */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Stethoscope className="w-5 h-5 text-primary-500" />
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white">Requested Medicines</h4>
                </div>
                <div className="space-y-3">
                  {selectedPrescription.items?.map(item => (
                    <div 
                      key={item.id} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                        item.status === 'APPROVED' 
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                          : item.status === 'REJECTED'
                          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                          : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{item.medicineName}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                          <span>Quantity: {item.quantity}</span>
                          {item.dosage && <span>Dosage: {item.dosage}</span>}
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-0">
                        {item.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-200 text-green-800 dark:bg-green-800/50 dark:text-green-300">
                            <CheckCircle className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {item.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-200 text-red-800 dark:bg-red-800/50 dark:text-red-300">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                        {item.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-200 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-300">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Rejection Reason */}
              {selectedPrescription.rejectionReason && (
                <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl p-5 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-800 dark:text-red-400">Rejection Reason</h4>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">{selectedPrescription.rejectionReason}</p>
                </div>
              )}
              
              {/* Admin Note */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                    👁️ Admin View Only - Prescription approval is managed by pharmacists
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPrescriptions;