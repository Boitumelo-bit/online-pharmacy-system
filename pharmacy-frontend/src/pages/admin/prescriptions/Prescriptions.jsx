import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Eye, FileText, AlertCircle } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const AdminPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPrescriptions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const response = await api.get('/prescriptions');
      if (response.data.success) {
        setPrescriptions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      PENDING: { color: 'bg-yellow-500', text: 'Pending', icon: Clock },
      APPROVED: { color: 'bg-green-500', text: 'Approved', icon: CheckCircle },
      REJECTED: { color: 'bg-red-500', text: 'Rejected', icon: XCircle },
      FULFILLED: { color: 'bg-blue-500', text: 'Fulfilled', icon: CheckCircle },
    };
    const statusConfig = config[status] || config.PENDING;
    const Icon = statusConfig.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold text-white ${statusConfig.color}`}>
        <Icon className="w-3 h-3" />
        {statusConfig.text}
      </span>
    );
  };

  const getPendingCount = () => {
    return prescriptions.filter(p => p.status === 'PENDING').length;
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Prescriptions Management</h1>
        {getPendingCount() > 0 && (
          <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm">
            {getPendingCount()} Pending
          </span>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        {prescriptions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No prescriptions found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      {getStatusBadge(prescription.status)}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {prescription.user?.fullName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(prescription.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{prescription.user?.email}</p>
                    <p className="text-sm text-gray-500">{prescription.user?.phone}</p>
                    {prescription.notes && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                        📝 Notes: {prescription.notes}
                      </p>
                    )}
                    {prescription.items && prescription.items.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-semibold">Requested Medicines:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {prescription.items.map(item => (
                            <span 
                              key={item.id} 
                              className={`text-xs px-2 py-1 rounded-full ${
                                item.status === 'APPROVED' 
                                  ? 'bg-green-100 text-green-800' 
                                  : item.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {item.medicineName} ({item.quantity})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {prescription.rejectionReason && (
                      <p className="text-sm text-red-600 mt-2">
                        ❌ Rejection reason: {prescription.rejectionReason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedPrescription(prescription)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Details Modal - READ ONLY (No approve/reject buttons) */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Prescription Details</h3>
              <button 
                onClick={() => setSelectedPrescription(null)} 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {/* Prescription Image */}
              {selectedPrescription.imageUrl && (
                <div className="mb-6">
                  <img 
                    src={selectedPrescription.imageUrl} 
                    alt="Prescription" 
                    className="w-full rounded-lg border"
                  />
                </div>
              )}
              
              {/* Patient Information */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-semibold mb-2">Patient Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-gray-500">Name:</span> {selectedPrescription.user?.fullName}</p>
                  <p><span className="text-gray-500">Email:</span> {selectedPrescription.user?.email}</p>
                  <p><span className="text-gray-500">Phone:</span> {selectedPrescription.user?.phone}</p>
                  <p><span className="text-gray-500">Date:</span> {new Date(selectedPrescription.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              {/* Patient Notes */}
              {selectedPrescription.notes && (
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <h4 className="font-semibold mb-1">Patient Notes</h4>
                  <p className="text-sm">{selectedPrescription.notes}</p>
                </div>
              )}
              
              {/* Medicines List */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Requested Medicines</h4>
                <div className="space-y-2">
                  {selectedPrescription.items?.map(item => (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        item.status === 'APPROVED' ? 'bg-green-50 border-green-200' :
                        item.status === 'REJECTED' ? 'bg-red-50 border-red-200' : ''
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{item.medicineName}</p>
                        <p className="text-sm text-gray-500">
                          Quantity: {item.quantity} | Dosage: {item.dosage || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        {item.status === 'APPROVED' && (
                          <span className="text-green-600 font-semibold text-sm">✓ Approved</span>
                        )}
                        {item.status === 'REJECTED' && (
                          <span className="text-red-600 font-semibold text-sm">✗ Rejected</span>
                        )}
                        {item.status === 'PENDING' && (
                          <span className="text-yellow-600 font-semibold text-sm">⏳ Pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Rejection Reason (if rejected) */}
              {selectedPrescription.rejectionReason && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <p className="font-semibold text-red-800">Rejection Reason</p>
                  <p className="text-sm text-red-600">{selectedPrescription.rejectionReason}</p>
                </div>
              )}
              
              {/* Admin Note - No approve buttons */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-sm text-blue-600">
                  👁️ Admin View Only - Prescription approval is managed by pharmacists
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPrescriptions;