import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, Image as ImageIcon, Loader, Package, Tag, DollarSign, AlertCircle } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const AdminMedicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [savingMedicine, setSavingMedicine] = useState(false);
  const [medicineImages, setMedicineImages] = useState([]);
  const [medicineImagePreviews, setMedicineImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState('M');
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dosage: '',
    sideEffects: '',
    categoryId: '',
    price: '',
    discount: '',
    stock: '',
    batchNumber: '',
    expiryDate: '',
    barcode: '',
    prescriptionRequired: false,
    isFeatured: false,
  });

  useEffect(() => {
    fetchCurrency();
    fetchMedicines();
    fetchCategories();
  }, [searchTerm]);

  const fetchCurrency = async () => {
    try {
      const response = await api.get('/dashboard/settings');
      if (response.data.success) {
        const currency = response.data.data.currency || 'M';
        setCurrencySymbol(currency);
      }
    } catch (error) {
      console.error('Error fetching currency:', error);
    }
  };

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const response = await api.get('/medicines', {
        params: { search: searchTerm, limit: 50 }
      });
      setMedicines(response.data.data || []);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      toast.error('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await api.get('/categories');
      if (Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleMedicineImagesChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setMedicineImages([...medicineImages, ...files]);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMedicineImagePreviews(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeNewMedicineImage = (index) => {
    setMedicineImages(prev => prev.filter((_, i) => i !== index));
    setMedicineImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageId, imageUrl) => {
    setImagesToDelete([...imagesToDelete, { id: imageId, url: imageUrl }]);
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name) {
      toast.error('Category name is required');
      return;
    }

    setCreatingCategory(true);
    try {
      const response = await api.post('/categories', newCategory);
      toast.success('Category created successfully');
      setShowCategoryModal(false);
      setNewCategory({ name: '', description: '' });
      await fetchCategories();
      setFormData({ ...formData, categoryId: response.data.id });
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error(error.response?.data?.message || 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Medicine name is required');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }
    if (!formData.price || formData.price <= 0) {
      toast.error('Valid price is required');
      return;
    }
    if (!formData.stock || formData.stock < 0) {
      toast.error('Valid stock quantity is required');
      return;
    }
    if (!formData.batchNumber) {
      toast.error('Batch number is required');
      return;
    }
    if (!formData.expiryDate) {
      toast.error('Expiry date is required');
      return;
    }
    if (!formData.barcode) {
      toast.error('Barcode is required');
      return;
    }
    
    setSavingMedicine(true);
    
    try {
      let medicineId;
      
      if (editingMedicine) {
        await api.put(`/medicines/${editingMedicine.id}`, formData);
        medicineId = editingMedicine.id;
        
        if (imagesToDelete.length > 0) {
          const deletePromises = imagesToDelete.map(image => 
            api.delete(`/medicines/images/${image.id}`)
          );
          await Promise.all(deletePromises);
          toast.success(`${imagesToDelete.length} image(s) removed`);
        }
        
        if (medicineImages.length > 0) {
          const imageFormData = new FormData();
          medicineImages.forEach(file => {
            imageFormData.append('images', file);
          });
          
          await api.post(`/medicines/${medicineId}/images`, imageFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.success(`${medicineImages.length} new image(s) uploaded`);
        }
        
        toast.success('Medicine updated successfully');
      } else {
        const response = await api.post('/medicines', formData);
        medicineId = response.data.id;
        
        if (medicineImages.length > 0) {
          const imageFormData = new FormData();
          medicineImages.forEach(file => {
            imageFormData.append('images', file);
          });
          
          await api.post(`/medicines/${medicineId}/images`, imageFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.success(`${medicineImages.length} image(s) uploaded`);
        }
        
        toast.success('Medicine created successfully');
      }
      
      fetchMedicines();
      setShowModal(false);
      setEditingMedicine(null);
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setSavingMedicine(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      dosage: '',
      sideEffects: '',
      categoryId: '',
      price: '',
      discount: '',
      stock: '',
      batchNumber: '',
      expiryDate: '',
      barcode: '',
      prescriptionRequired: false,
      isFeatured: false,
    });
    setMedicineImages([]);
    setMedicineImagePreviews([]);
    setExistingImages([]);
    setImagesToDelete([]);
  };

  const handleEdit = async (medicine) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name || '',
      description: medicine.description || '',
      dosage: medicine.dosage || '',
      sideEffects: medicine.sideEffects || '',
      categoryId: medicine.categoryId || '',
      price: medicine.price || '',
      discount: medicine.discount || '',
      stock: medicine.stock || '',
      batchNumber: medicine.batchNumber || '',
      expiryDate: medicine.expiryDate ? medicine.expiryDate.split('T')[0] : '',
      barcode: medicine.barcode || '',
      prescriptionRequired: medicine.prescriptionRequired || false,
      isFeatured: medicine.isFeatured || false,
    });
    
    if (medicine.id) {
      try {
        const response = await api.get(`/medicines/${medicine.id}/images`);
        if (response.data && response.data.images) {
          setExistingImages(response.data.images);
        } else {
          setExistingImages([]);
        }
      } catch (error) {
        console.error('Error fetching medicine images:', error);
        setExistingImages([]);
      }
    }
    
    setMedicineImages([]);
    setMedicineImagePreviews([]);
    setImagesToDelete([]);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this medicine?')) {
      try {
        await api.delete(`/medicines/${id}`);
        toast.success('Medicine deleted');
        fetchMedicines();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Delete failed');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="loader mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading medicines...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Medicines Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your pharmacy inventory</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Medicine</span>
        </button>
      </div>

      {/* Modern Search Bar */}
      <div className="mb-8">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 w-5 h-5 transition-colors duration-200" />
          <input
            type="text"
            placeholder="Search medicines by name, barcode, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Modern Medicines Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rx Required</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {medicines.map((medicine) => (
                <tr key={medicine.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-200">
                  <td className="px-6 py-4">
                    {medicine.images && medicine.images[0] ? (
                      <img src={medicine.images[0].url} alt={medicine.name} className="w-12 h-12 object-cover rounded-xl shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{medicine.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{medicine.description?.substring(0, 50)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                      <Tag className="w-3 h-3" />
                      {medicine.category?.name || 'N/A'}
                    </span>
                   </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-primary-600">{currencySymbol}{parseFloat(medicine.price).toFixed(2)}</span>
                   </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      medicine.stock < 10 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      <Package className="w-3 h-3" />
                      {medicine.stock} units
                    </span>
                   </td>
                  <td className="px-6 py-4">
                    {medicine.prescriptionRequired ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-xs font-semibold">
                        <AlertCircle className="w-3 h-3" />
                        Yes
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full text-xs font-semibold">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(medicine)}
                        className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all duration-200"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(medicine.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Medicine Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-up shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-primary-600 p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">{editingMedicine ? 'Edit' : 'Add'} Medicine</h2>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingMedicine(null);
                  resetForm();
                }}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Medicine Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter medicine name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    rows="3"
                    placeholder="Enter medicine description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    {loadingCategories ? (
                      <div className="w-full px-4 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700">Loading...</div>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          value={formData.categoryId}
                          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                          required
                        >
                          <option value="">-- Select Category --</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCategoryModal(true)}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center gap-1 shadow-md"
                          title="Add New Category"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="hidden sm:inline">New</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dosage</label>
                    <input
                      type="text"
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., 1 tablet daily"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Side Effects</label>
                  <input
                    type="text"
                    value={formData.sideEffects}
                    onChange={(e) => setFormData({ ...formData, sideEffects: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., Nausea, headache"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price ({currencySymbol}) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Discount (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Stock <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder="Quantity"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Batch Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder="BATCH001"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Barcode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder="123456789012"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.prescriptionRequired}
                      onChange={(e) => setFormData({ ...formData, prescriptionRequired: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Prescription Required</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Featured Medicine</span>
                  </label>
                </div>

                {/* Medicine Images Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Medicine Images</label>
                  
                  {existingImages.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Images:</p>
                      <div className="grid grid-cols-4 gap-3">
                        {existingImages.map((image) => (
                          <div key={image.id} className="relative group">
                            <img 
                              src={image.url} 
                              alt="Medicine" 
                              className="h-20 w-20 object-cover rounded-xl shadow-md" 
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(image.id, image.url)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {medicineImagePreviews.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">New Images:</p>
                      <div className="grid grid-cols-4 gap-3">
                        {medicineImagePreviews.map((preview, idx) => (
                          <div key={`new-${idx}`} className="relative group">
                            <img 
                              src={preview} 
                              alt={`Preview ${idx}`} 
                              className="h-20 w-20 object-cover rounded-xl shadow-md" 
                            />
                            <button
                              type="button"
                              onClick={() => removeNewMedicineImage(idx)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-400 transition-colors duration-200">
                    <div className="space-y-2 text-center">
                      {(medicineImagePreviews.length === 0 && existingImages.length === 0) && (
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      )}
                      <div className="flex justify-center text-sm">
                        <label className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 hover:text-primary-500 transition-colors">
                          <span>{existingImages.length > 0 || medicineImagePreviews.length > 0 ? 'Add more images' : 'Upload images'}</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            multiple
                            onChange={handleMedicineImagesChange}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB each</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={savingMedicine}
                    className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-2.5 rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-md"
                  >
                    {savingMedicine ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-5 h-5" />
                        <span>Save Medicine</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingMedicine(null);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full animate-scale-up shadow-2xl">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Tag className="w-6 h-6 text-primary-500" />
                <h3 className="text-xl font-bold gradient-text">Add New Category</h3>
              </div>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewCategory({ name: '', description: '' });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="e.g., Pain Relief"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  rows="3"
                  placeholder="Category description"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creatingCategory}
                  className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-2.5 rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-md"
                >
                  {creatingCategory ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Create Category</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategory({ name: '', description: '' });
                  }}
                  className="flex-1 px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
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

export default AdminMedicines;