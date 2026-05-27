import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../../stores/cartStore';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft, AlertCircle, CreditCard, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const Cart = () => {
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCartStore();
  const [currencySymbol, setCurrencySymbol] = useState('M');

  // Fetch currency setting on mount
  useEffect(() => {
    fetchCurrency();
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

  const handleUpdateQuantity = (id, quantity) => {
    if (quantity < 1) return;
    updateQuantity(id, quantity);
    toast.success('Cart updated');
  };

  const handleRemoveItem = (id, name) => {
    removeItem(id);
    toast.success(`${name} removed from cart`);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    const prescriptionItems = items.filter(item => item.prescriptionRequired === true);
    
    console.log('Prescription items in cart:', prescriptionItems);
    
    if (prescriptionItems.length > 0) {
      toast.loading('Verifying prescription status...', { id: 'prescription-check' });
      
      try {
        let hasUnapprovedPrescription = false;
        let unapprovedItems = [];
        
        for (const item of prescriptionItems) {
          const response = await api.get(`/medicines/${item.id}/can-order`);
          console.log(`Check for ${item.name}:`, response.data);
          if (!response.data.canOrder) {
            hasUnapprovedPrescription = true;
            unapprovedItems.push(item.name);
          }
        }
        
        toast.dismiss('prescription-check');
        
        if (hasUnapprovedPrescription) {
          toast.error(
            (t) => (
              <div className="max-w-sm">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <p className="font-bold">⚠️ Prescription Required</p>
                </div>
                <p className="text-sm mb-2">The following items require a prescription:</p>
                <ul className="list-disc ml-4 mb-3 text-sm">
                  {unapprovedItems.map((name, idx) => (
                    <li key={idx}>{name}</li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      toast.dismiss(t.id);
                      navigate('/prescriptions');
                    }}
                    className="px-3 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm hover:from-primary-600 hover:to-primary-700"
                  >
                    Upload Prescription
                  </button>
                  <button 
                    onClick={() => toast.dismiss(t.id)}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ),
            { duration: 10000, id: 'prescription-error' }
          );
          return;
        }
        
        navigate('/checkout');
        
      } catch (error) {
        toast.dismiss('prescription-check');
        console.error('Error checking prescriptions:', error);
        toast.error('Unable to verify prescription status. Please try again.');
      }
    } else {
      navigate('/checkout');
    }
  };

  const handleBackToShop = () => {
    navigate('/shop');
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-16 h-16 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Looks like you haven't added any items yet</p>
        <button
          onClick={handleBackToShop}
          className="btn-primary inline-flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Continue Shopping</span>
        </button>
      </div>
    );
  }

  const tax = totalPrice * 0.15;
  const deliveryFee = totalPrice > 100 ? 0 : 5;
  const grandTotal = totalPrice + tax + deliveryFee;
  const hasPrescriptionItems = items.some(item => item.prescriptionRequired === true);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={handleBackToShop}
        className="group flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors duration-200 mb-6"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span>Continue Shopping</span>
      </button>

      <h1 className="text-3xl font-bold gradient-text mb-8">Shopping Cart</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items Section */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-primary-600">{totalItems}</span> items in your cart
              </p>
            </div>
            
            {items.map((item) => {
              const discountedPrice = item.price * (1 - item.discount / 100);
              const itemTotal = discountedPrice * item.quantity;
              
              return (
                <div key={item.id} className="p-5 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-200">
                  <div className="flex flex-col sm:flex-row gap-5">
                    {/* Product Image */}
                    <div className="w-full sm:w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-10 h-10 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 transition-colors">
                            {item.name}
                          </h3>
                          {item.prescriptionRequired === true && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs rounded-full">
                              <AlertCircle className="w-3 h-3" />
                              Prescription Required
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          {item.discount > 0 && (
                            <p className="text-sm text-gray-400 line-through">{currencySymbol}{item.price.toFixed(2)}</p>
                          )}
                          <p className="text-xl font-bold text-primary-600">{currencySymbol}{discountedPrice.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">Total: {currencySymbol}{itemTotal.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id, item.name)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Clear Cart Button */}
            <div className="p-5 bg-gray-50 dark:bg-gray-700/30">
              <button
                onClick={() => clearCart()}
                className="text-red-500 hover:text-red-600 font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Cart
              </button>
            </div>
          </div>
        </div>
        
        {/* Order Summary - Modern Card */}
        <div className="lg:w-96">
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl shadow-lg p-6 sticky top-4 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold gradient-text mb-5 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Order Summary
            </h2>
            
            <div className="space-y-3 mb-5">
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-semibold">{currencySymbol}{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Tax (15%)</span>
                <span className="font-semibold">{currencySymbol}{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
                <span className="font-semibold">
                  {deliveryFee === 0 ? (
                    <span className="text-green-500">Free</span>
                  ) : (
                    `${currencySymbol}${deliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              {totalPrice > 100 && (
                <div className="flex justify-end">
                  <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                    🎉 Free delivery on orders over {currencySymbol}100!
                  </span>
                </div>
              )}
              <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 mt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {currencySymbol}{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Prescription Warning */}
            {hasPrescriptionItems && (
              <div className="mb-5 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-orange-800 dark:text-orange-400">Prescription Required</p>
                    <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                      This order contains items that require a prescription.
                      Please ensure you have an approved prescription before checkout.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Truck className="w-5 h-5" />
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            
            {/* Payment Methods */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 text-center">Secure checkout powered by</p>
              <div className="flex justify-center gap-3 mt-2">
                <span className="text-xs font-semibold text-gray-400">VISA</span>
                <span className="text-xs font-semibold text-gray-400">Mastercard</span>
                <span className="text-xs font-semibold text-gray-400">M-Pesa</span>
                <span className="text-xs font-semibold text-gray-400">COD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;