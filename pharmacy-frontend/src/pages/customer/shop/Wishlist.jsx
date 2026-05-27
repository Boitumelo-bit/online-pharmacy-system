import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Package } from 'lucide-react';
import { useWishlistStore } from '../../../stores/wishlistStore';
import { useCartStore } from '../../../stores/cartStore';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const Wishlist = () => {
  const navigate = useNavigate();
  const { items, loading, fetchWishlist, removeFromWishlist } = useWishlistStore();
  const { addItem } = useCartStore();
  const [currencySymbol, setCurrencySymbol] = useState('M');

  useEffect(() => {
    fetchCurrency();
    fetchWishlist();
  }, []);

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

  const handleAddToCart = (item) => {
    const medicine = item.medicine;
    addItem(medicine, 1);
    toast.success(`${medicine.name} added to cart!`);
    navigate('/cart');
  };

  const handleRemove = async (item) => {
    await removeFromWishlist(item.id, item.medicine.name);
    fetchWishlist();
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">My Wishlist</h1>
      
      {items.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-24 h-24 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 dark:text-gray-400">Save your favorite medicines here</p>
          <button
            onClick={() => navigate('/shop')}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const discountedPrice = item.medicine.price * (1 - (item.medicine.discount || 0) / 100);
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden card-hover">
                <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
                  {item.medicine.images && item.medicine.images[0] ? (
                    <img 
                      src={item.medicine.images[0].url} 
                      alt={item.medicine.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  {item.medicine.discount > 0 && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
                      {item.medicine.discount}% OFF
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {item.medicine.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                    {item.medicine.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      {item.medicine.discount > 0 ? (
                        <div>
                          <span className="text-2xl font-bold text-blue-600">
                            {currencySymbol}{discountedPrice.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-400 line-through ml-2">
                            {currencySymbol}{item.medicine.price}
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold text-blue-600">
                          {currencySymbol}{item.medicine.price}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Stock: {item.medicine.stock}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={item.medicine.stock === 0}
                      className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>
                    <button
                      onClick={() => handleRemove(item)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;