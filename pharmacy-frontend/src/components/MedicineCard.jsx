import React, { useState, useEffect } from 'react';
import { ShoppingCart, Eye, Heart, Shield, AlertCircle } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useWishlistStore } from '../stores/wishlistStore';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';

const MedicineCard = ({ medicine, onViewDetails }) => {
  const { addItem } = useCartStore();
  const { addToWishlist, removeFromWishlist, checkInWishlist } = useWishlistStore();
  const { isAuthenticated, user } = useAuthStore();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [checkingPrescription, setCheckingPrescription] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      checkWishlistStatus();
    }
  }, [medicine.id, isAuthenticated]);

  const checkWishlistStatus = async () => {
    const inWishlist = await checkInWishlist(medicine.id);
    setIsInWishlist(inWishlist);
  };

  const discountedPrice = medicine.price * (1 - (medicine.discount || 0) / 100);
  
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }
    
    if (medicine.prescriptionRequired === true) {
      setCheckingPrescription(true);
      try {
        const response = await api.get(`/medicines/${medicine.id}/can-order`);
        
        if (response.data.success && response.data.canOrder === true) {
          addItem(medicine, 1);
          toast.success(`${medicine.name} added to cart!`);
        } else {
          toast.error(
            (t) => (
              <div className="max-w-sm">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <p className="font-bold">⚠️ Prescription Required</p>
                </div>
                <p className="text-sm mb-2">{medicine.name} requires a prescription.</p>
                <p className="text-xs text-gray-500 mb-3">Please upload a prescription for pharmacist approval.</p>
                <button 
                  onClick={() => {
                    toast.dismiss(t.id);
                    window.location.href = '/prescriptions';
                  }}
                  className="w-full px-3 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm hover:from-primary-600 hover:to-primary-700 transition-all"
                >
                  Upload Prescription
                </button>
              </div>
            ),
            { duration: 8000 }
          );
        }
      } catch (error) {
        console.error('Error checking prescription:', error);
        toast.error('Unable to verify prescription status. Please try again.');
      } finally {
        setCheckingPrescription(false);
      }
    } else {
      addItem(medicine, 1);
      toast.success(`${medicine.name} added to cart!`);
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      return;
    }
    await addToWishlist(medicine);
    checkWishlistStatus();
  };

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
      {/* Image Container - Fixed height */}
      <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 overflow-hidden flex-shrink-0">
        {medicine.images && medicine.images[0] ? (
          <img 
            src={medicine.images[0].url} 
            alt={medicine.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <ShoppingCart className="w-10 h-10 text-gray-400 mx-auto mb-1" />
              <span className="text-[10px] text-gray-400">No Image</span>
            </div>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Wishlist Button - Fixed position */}
        <button
          onClick={handleWishlist}
          className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full hover:scale-110 transition-all duration-200 shadow-sm z-10"
        >
          <Heart className={`w-3.5 h-3.5 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-gray-400'}`} />
        </button>
        
        {/* Discount Badge - Fixed position */}
        {medicine.discount > 0 && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm z-10">
            -{medicine.discount}% OFF
          </div>
        )}
        
        {/* Prescription Required Badge - Fixed position */}
        {medicine.prescriptionRequired === true && (
          <div className="absolute bottom-2 left-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-sm z-10">
            <Shield className="w-2.5 h-2.5" />
            <span>Rx Required</span>
          </div>
        )}
        
        {/* Stock Badge - Fixed position */}
        {medicine.stock < 10 && medicine.stock > 0 && (
          <div className="absolute bottom-2 right-2 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-semibold shadow-sm z-10">
            Low Stock
          </div>
        )}
        {medicine.stock === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold">Out of Stock</span>
          </div>
        )}
      </div>
      
      {/* Content - Flexible to fill remaining space */}
      <div className="p-3 flex flex-col flex-1">
        {/* Title - Fixed height line clamp */}
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 line-clamp-1 hover:text-primary-600 transition-colors min-h-[2.5rem]">
          {medicine.name}
        </h3>
        
        {/* Description - Fixed height line clamp */}
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 line-clamp-2 min-h-[2rem]">
          {medicine.description}
        </p>
        
        {/* Price and Stock Row - Fixed height */}
        <div className="flex items-end justify-between mb-2 min-h-[2rem]">
          <div>
            {medicine.discount > 0 ? (
              <div>
                <span className="text-base font-bold text-primary-600 dark:text-primary-400">
                  M{discountedPrice.toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-400 line-through ml-1">
                  M{medicine.price}
                </span>
              </div>
            ) : (
              <span className="text-base font-bold text-primary-600 dark:text-primary-400">
                M{medicine.price}
              </span>
            )}
          </div>
          <div className="text-[9px] text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            Stock: {medicine.stock}
          </div>
        </div>
        
        {/* Prescription Warning - Dynamic height, consistent styling */}
        {medicine.prescriptionRequired === true && (
          <div className="mb-2 p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0" />
              <span className="text-[9px] text-orange-600 dark:text-orange-400 font-medium">
                Prescription required - Pharmacist approval needed
              </span>
            </div>
          </div>
        )}
        
        {/* Spacer to push buttons down when prescription warning is absent */}
        {!medicine.prescriptionRequired && <div className="mb-2"></div>}
        
        {/* Action Buttons - Fixed height at bottom */}
        <div className="flex gap-1.5 mt-auto">
          <button
            onClick={handleAddToCart}
            disabled={medicine.stock === 0 || checkingPrescription}
            className="flex-1 py-1.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkingPrescription ? (
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <ShoppingCart className="w-3 h-3" />
                <span className="text-[11px] font-medium">
                  {medicine.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </span>
              </>
            )}
          </button>
          <button
            onClick={() => onViewDetails(medicine)}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicineCard;