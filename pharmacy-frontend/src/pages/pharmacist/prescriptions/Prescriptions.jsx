import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Eye, FileText } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const PharmacistPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetchPrescriptions();
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

  const updateStatus = async (id, status, reason = null) => {
    const approvedItemIds = selectedItems.map(item => item.id);
    
    try {
      const response = await api.put(`/prescriptions/${id}/status`, {
        status,
        rejectionReason: reason,
        approvedItemIds: status === 'APPROVED' ? approvedItemIds : []
      });
      if (response.data.success) {
        toast.success(`Prescription ${status.toLowerCase()}`);
        fetchPrescriptions();
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedItems([]);
        setSelectedPrescription(null);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const toggleItemSelection = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const selectAllItems = () => {
    if (selectedPrescription && selectedPrescription.items) {
      setSelectedItems([...selectedPrescription.items]);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      PENDING: { color: 'bg-yellow-500', text: 'Pending' },
      APPROVED: { color: 'bg-green-500', text: 'Approved' },
      REJECTED: { color: 'bg-red-500', text: 'Rejected' },
      FULFILLED: { color: 'bg-blue-500', text: 'Fulfilled' },
    };
    const statusConfig = config[status] || config.PENDING;
    return (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold text-white ${statusConfig.color}`}>
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Prescription Queue</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        {prescriptions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No prescriptions to review</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
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
                        Notes: {prescription.notes}
                      </p>
                    )}
                    {prescription.items && prescription.items.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-semibold">Requested Medicines:</p>
                        <ul className="text-sm text-gray-500 list-disc list-inside">
                          {prescription.items.map(item => (
                            <li key={item.id}>{item.medicineName} - {item.quantity} {item.dosage}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedPrescription(prescription)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Review Prescription</h3>
              <button onClick={() => {
                setSelectedPrescription(null);
                setSelectedItems([]);
              }} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            <div className="p-6">
              <img src={selectedPrescription.imageUrl} alt="Prescription" className="w-full rounded-lg mb-4" />
              
              <div className="mb-4">
                <p className="font-semibold">Patient Information:</p>
                <p>Name: {selectedPrescription.user?.fullName}</p>
                <p>Email: {selectedPrescription.user?.email}</p>
                <p>Phone: {selectedPrescription.user?.phone}</p>
              </div>
              
              {selectedPrescription.notes && (
                <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                  <p className="font-semibold">Patient Notes:</p>
                  <p>{selectedPrescription.notes}</p>
                </div>
              )}
              
              <div className="mb-4">
                <p className="font-semibold mb-2">Requested Medicines:</p>
                <div className="space-y-2">
                  {selectedPrescription.items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">{item.medicineName}</p>
                        <p className="text-sm text-gray-500">Quantity: {item.quantity} | Dosage: {item.dosage || 'Not specified'}</p>
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedItems.some(i => i.id === item.id)}
                          onChange={() => toggleItemSelection(item)}
                          className="w-5 h-5"
                          disabled={selectedPrescription.status !== 'PENDING'}
                        />
                        <span className="text-sm">Approve</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedPrescription.status === 'PENDING' && (
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={selectAllItems}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => updateStatus(selectedPrescription.id, 'APPROVED')}
                    disabled={selectedItems.length === 0}
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    Approve Selected ({selectedItems.length})
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
                  >
                    Reject All
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Reject Prescription</h3>
            <textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 mb-4"
              rows="3"
            />
            <div className="flex space-x-3">
              <button onClick={() => updateStatus(selectedPrescription.id, 'REJECTED', rejectionReason)} className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600">
                Confirm Reject
              </button>
              <button onClick={() => { setShowRejectModal(false); setRejectionReason(''); }} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacistPrescriptions;