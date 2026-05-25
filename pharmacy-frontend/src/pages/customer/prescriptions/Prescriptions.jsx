import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Clock, Eye, Trash2, Plus, Minus, Shield, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const Prescriptions = () => {
  const { user } = useAuthStore();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [showMedicineSelector, setShowMedicineSelector] = useState(false);

  // Only customers can upload
  const canUpload = user?.role === 'CUSTOMER';

  useEffect(() => {
    fetchPrescriptions();
    if (canUpload) {
      fetchMedicines();
    }
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const response = await api.get('/prescriptions/my');
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

  const fetchMedicines = async () => {
    try {
      const response = await api.get('/medicines');
      const rxMedicines = response.data.data.filter(m => m.prescriptionRequired === true);
      setMedicines(rxMedicines);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!file.type.match('image.*') && !file.type.match('application/pdf')) {
        toast.error('Only images and PDF files are allowed');
        return;
      }
      setSelectedFile(file);
      setShowMedicineSelector(true);
    }
  };

  const toggleMedicineSelection = (medicine) => {
    setSelectedMedicines(prev => {
      const exists = prev.find(m => m.medicineId === medicine.id);
      if (exists) {
        return prev.filter(m => m.medicineId !== medicine.id);
      } else {
        return [...prev, { medicineId: medicine.id, medicineName: medicine.name, quantity: 1, dosage: '' }];
      }
    });
  };

  const updateQuantity = (medicineId, quantity) => {
    setSelectedMedicines(prev =>
      prev.map(m =>
        m.medicineId === medicineId ? { ...m, quantity: Math.max(1, quantity) } : m
      )
    );
  };

  const updateDosage = (medicineId, dosage) => {
    setSelectedMedicines(prev =>
      prev.map(m =>
        m.medicineId === medicineId ? { ...m, dosage } : m
      )
    );
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    if (selectedMedicines.length === 0) {
      toast.error('Please select at least one medicine for this prescription');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('notes', notes);
    formData.append('items', JSON.stringify(selectedMedicines));

    try {
      const response = await api.post('/prescriptions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        toast.success('Prescription uploaded successfully!');
        setSelectedFile(null);
        setNotes('');
        setSelectedMedicines([]);
        setShowMedicineSelector(false);
        fetchPrescriptions();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      PENDING: { color: 'bg-yellow-500', text: 'Pending', icon: Clock, bgLight: 'bg-yellow-50 dark:bg-yellow-900/20', textLight: 'text-yellow-700 dark:text-yellow-400' },
      APPROVED: { color: 'bg-green-500', text: 'Approved', icon: CheckCircle, bgLight: 'bg-green-50 dark:bg-green-900/20', textLight: 'text-green-700 dark:text-green-400' },
      REJECTED: { color: 'bg-red-500', text: 'Rejected', icon: XCircle, bgLight: 'bg-red-50 dark:bg-red-900/20', textLight: 'text-red-700 dark:text-red-400' },
      FULFILLED: { color: 'bg-blue-500', text: 'Fulfilled', icon: CheckCircle, bgLight: 'bg-blue-50 dark:bg-blue-900/20', textLight: 'text-blue-700 dark:text-blue-400' },
    };
    const statusConfig = config[status] || config.PENDING;
    const Icon = statusConfig.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bgLight} ${statusConfig.textLight}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{statusConfig.text}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="loader mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading your prescriptions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">My Prescriptions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Upload and track your prescriptions</p>
        </div>
        {canUpload && (
          <div className="hidden md:flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500">Secure & Confidential</span>
          </div>
        )}
      </div>

      {/* Upload Section - ONLY SHOW FOR CUSTOMERS */}
      {canUpload && (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload New Prescription</h2>
          </div>
          
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-primary-400 transition-colors duration-200">
            <input
              type="file"
              id="prescription"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="prescription"
              className="cursor-pointer inline-flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mb-4">
                <ImageIcon className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {selectedFile ? selectedFile.name : 'Click to upload prescription'}
              </p>
              <p className="text-xs text-gray-500 mt-2">JPG, PNG, PDF (Max 5MB)</p>
            </label>
          </div>

          {selectedFile && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes
                </label>
                <textarea
                  placeholder="Add any additional notes for the pharmacist (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-modern"
                  rows="3"
                />
              </div>
              
              {showMedicineSelector && (
                <div className="mt-4 p-5 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary-500" />
                    Select Medicines for this Prescription
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                    {medicines.map((medicine) => {
                      const isSelected = selectedMedicines.find(m => m.medicineId === medicine.id);
                      const selectedData = selectedMedicines.find(m => m.medicineId === medicine.id);
                      
                      return (
                        <div key={medicine.id} className={`border rounded-xl p-4 transition-all duration-200 ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={!!isSelected}
                                onChange={() => toggleMedicineSelection(medicine)}
                                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                              />
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{medicine.name}</p>
                                <p className="text-sm text-gray-500">{medicine.dosage}</p>
                              </div>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="mt-4 ml-8 grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-gray-500 font-medium">Quantity</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    onClick={() => updateQuantity(medicine.id, (selectedData?.quantity || 1) - 1)}
                                    className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 transition"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="w-12 text-center font-medium">{selectedData?.quantity || 1}</span>
                                  <button
                                    onClick={() => updateQuantity(medicine.id, (selectedData?.quantity || 1) + 1)}
                                    className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 transition"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 font-medium">Dosage Instructions</label>
                                <input
                                  type="text"
                                  placeholder="e.g., Take 1 tablet daily"
                                  value={selectedData?.dosage || ''}
                                  onChange={(e) => updateDosage(medicine.id, e.target.value)}
                                  className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {medicines.length === 0 && (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No prescription medicines available</p>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Upload Prescription</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Prescriptions List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Prescription History</h2>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        
        {prescriptions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">No prescriptions yet</p>
            {canUpload && (
              <p className="text-sm text-gray-400 mt-2">Upload your first prescription above</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      {getStatusBadge(prescription.status)}
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(prescription.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {prescription.notes && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg">
                        📝 {prescription.notes}
                      </p>
                    )}
                    {prescription.rejectionReason && (
                      <p className="text-red-600 text-sm mb-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Reason: {prescription.rejectionReason}
                      </p>
                    )}
                    {prescription.items && prescription.items.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Requested Medicines:</p>
                        <div className="flex flex-wrap gap-2">
                          {prescription.items.map(item => (
                            <span key={item.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              item.status === 'APPROVED' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {item.medicineName} ({item.quantity})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedPrescription(prescription)}
                    className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all duration-200"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescription Modal - Modern Design */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-up shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-primary-600 p-5 flex justify-between items-center">
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
            <div className="p-6 space-y-6">
              {/* Prescription Image */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 text-center">
                <img
                  src={selectedPrescription.imageUrl}
                  alt="Prescription"
                  className="max-w-full max-h-96 mx-auto rounded-lg object-contain"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Uploaded</p>
                  <p className="font-medium text-gray-900 dark:text-white">{new Date(selectedPrescription.createdAt).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                  {getStatusBadge(selectedPrescription.status)}
                </div>
              </div>
              
              {selectedPrescription.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-1">Patient Notes</p>
                  <p className="text-gray-700 dark:text-gray-300">{selectedPrescription.notes}</p>
                </div>
              )}
              
              {selectedPrescription.items && selectedPrescription.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary-500" />
                    Requested Medicines
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 font-semibold">Medicine</th>
                          <th className="text-left py-3 font-semibold">Quantity</th>
                          <th className="text-left py-3 font-semibold">Dosage</th>
                          <th className="text-left py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPrescription.items.map(item => (
                          <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-3 font-medium">{item.medicineName}</td>
                            <td className="py-3">{item.quantity}</td>
                            <td className="py-3">{item.dosage || '-'}</td>
                            <td className="py-3">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'APPROVED' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prescriptions;