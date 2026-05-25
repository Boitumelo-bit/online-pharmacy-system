import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicineAPI, categoryAPI } from '../../../services/api';
import MedicineCard from '../../../components/MedicineCard';
import { Search, Filter, X, ShoppingBag, Grid, List, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../../stores/cartStore';

const Shop = () => {
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchData();
  }, [searchTerm, selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.categoryId = selectedCategory;
      
      const [medicinesRes, categoriesRes] = await Promise.all([
        medicineAPI.getAll(params),
        categoryAPI.getAll(),
      ]);
      
      setMedicines(medicinesRes.data.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (medicine) => {
    addItem(medicine, 1);
    toast.success(`${medicine.name} added to cart!`);
    navigate('/cart');
  };

  const handleViewDetails = (medicine) => {
    setSelectedMedicine(medicine);
  };

  const closeModal = () => {
    setSelectedMedicine(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header - Consistent padding */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold gradient-text">Medicine Shop</h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Quality healthcare products</p>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                />
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all duration-200 ${viewMode === 'grid' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all duration-200 ${viewMode === 'list' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Consistent spacing */}
      <div className="container mx-auto px-4 py-5">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Sidebar Filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-72 flex-shrink-0`}>
            <div className="sticky top-20 space-y-5">
              {/* Mobile Filter Header */}
              <div className="flex items-center justify-between lg:hidden">
                <h3 className="text-base font-semibold">Filters</h3>
                <button onClick={() => setShowFilters(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Categories Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary-500" />
                      <h3 className="font-medium text-sm text-gray-900 dark:text-white">Categories</h3>
                    </div>
                    <span className="text-[10px] text-gray-500">{categories.length} categories</span>
                  </div>
                </div>
                <div className="p-2 space-y-0.5 max-h-[350px] overflow-y-auto">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex justify-between items-center text-sm ${
                      !selectedCategory 
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>All Categories</span>
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{medicines.length}</span>
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex justify-between items-center text-sm ${
                        selectedCategory === category.id 
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="truncate">{category.name}</span>
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0">{category._count?.medicines || 0}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Info Card */}
              <div className="bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-primary-100 dark:border-primary-800">
                <h4 className="font-medium text-primary-700 dark:text-primary-400 text-sm mb-1">💊 Quality Assurance</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">All our medicines are 100% genuine and sourced from certified manufacturers.</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Toolbar - Consistent spacing */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {selectedCategory && <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing <span className="font-semibold text-primary-600">{medicines.length}</span> {medicines.length === 1 ? 'product' : 'products'}
                </p>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory('')}
                  className="flex items-center gap-0.5 text-[11px] text-primary-600 hover:text-primary-700"
                >
                  <X className="w-3 h-3" />
                  <span>Clear filter</span>
                </button>
              )}
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-3"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading medicines...</p>
              </div>
            ) : medicines.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No medicines found</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                  }}
                  className="mt-3 text-primary-600 hover:text-primary-700 text-xs font-medium"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3"
              }>
                {medicines.map((medicine) => (
                  <MedicineCard
                    key={medicine.id}
                    medicine={medicine}
                    onAddToCart={handleAddToCart}
                    onViewDetails={handleViewDetails}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Product Details Modal - Consistent styling */}
      {selectedMedicine && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-primary-600 px-5 py-3 flex justify-between items-center">
              <h2 className="text-base font-semibold text-white">{selectedMedicine.name}</h2>
              <button onClick={closeModal} className="p-1 hover:bg-white/20 rounded-lg transition-all">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            
            <div className="p-5">
              {/* Image */}
              <div className="w-full h-40 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center mb-4">
                <ShoppingBag className="w-12 h-12 text-gray-400" />
              </div>
              
              <div className="space-y-3">
                {/* Description */}
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                  <h3 className="font-medium text-primary-600 dark:text-primary-400 text-xs mb-1">Description</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{selectedMedicine.description}</p>
                </div>
                
                {/* Dosage */}
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                  <h3 className="font-medium text-primary-600 dark:text-primary-400 text-xs mb-1">Dosage</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedMedicine.dosage}</p>
                </div>
                
                {/* Side Effects */}
                {selectedMedicine.sideEffects && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <h3 className="font-medium text-amber-700 dark:text-amber-400 text-xs mb-1">⚠️ Side Effects</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{selectedMedicine.sideEffects}</p>
                  </div>
                )}
                
                {/* Price and Actions */}
                <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="text-2xl font-bold text-primary-600">M{parseFloat(selectedMedicine.price).toFixed(2)}</p>
                  </div>
                  {selectedMedicine.prescriptionRequired && (
                    <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400">⚠️ Prescription Required</p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      handleAddToCart(selectedMedicine);
                      closeModal();
                    }}
                    className="px-5 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all text-sm font-medium shadow-sm"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;