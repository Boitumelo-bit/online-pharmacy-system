import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../../stores/cartStore';
import { useAuthStore } from '../../../stores/authStore';
import { MapPin, CreditCard, Truck, AlertCircle, ArrowLeft, CheckCircle, Shield, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    address: '',
    city: 'Maseru',
    notes: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState('CASH_ON_DELIVERY');
  const [isProcessing, setIsProcessing] = useState(false);

  const tax = totalPrice * 0.15;
  const deliveryFee = totalPrice > 100 ? 0 : 5;
  const grandTotal = totalPrice + tax + deliveryFee;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.address) {
      toast.error('Please enter your delivery address');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Create address
      const newAddressResponse = await api.post('/addresses', {
        fullName: formData.fullName,
        phone: formData.phone,
        addressLine1: formData.address,
        city: formData.city,
        state: formData.city,
        zipCode: '100',
        country: 'Lesotho',
        isDefault: false,
      });
      
      const addressId = newAddressResponse.data.id;
      
      // Prepare order items
      const orderItems = items.map(item => ({
        medicineId: item.id,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0,
      }));
      
      // Create order
      const orderResponse = await api.post('/orders', {
        addressId,
        paymentMethod,
        notes: formData.notes,
        items: orderItems,
      });
      
      if (orderResponse.data.success) {
        toast.success('Order placed successfully!');
        // Clear cart
        clearCart();
        // Navigate to orders page
        navigate('/orders');
      } else {
        toast.error('Failed to place order');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-16 h-16 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Add items to proceed with checkout</p>
        <button
          onClick={() => navigate('/shop')}
          className="btn-primary inline-flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Continue Shopping</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/cart')}
        className="group flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors duration-200 mb-6"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Cart</span>
      </button>
      
      <h1 className="text-3xl font-bold gradient-text mb-8">Checkout</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column - Forms */}
        <div className="lg:w-2/3">
          {/* Delivery Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delivery Information</h2>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="+266 1234 5678"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delivery Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows="3"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your complete delivery address"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City
                  </label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="Maseru">Maseru</option>
                    <option value="Leribe">Leribe</option>
                    <option value="Mafeteng">Mafeteng</option>
                    <option value="Mohales Hoek">Mohale's Hoek</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="Any special instructions? (e.g., gate code, delivery time)"
                />
              </div>
            </div>
          </div>
          
          {/* Payment Method */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Payment Method</h2>
            </div>
            
            <div className="space-y-3">
              <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                paymentMethod === 'CASH_ON_DELIVERY' 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  value="CASH_ON_DELIVERY"
                  checked={paymentMethod === 'CASH_ON_DELIVERY'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3 mt-1 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Cash on Delivery</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Pay when you receive your order</p>
                    </div>
                    {paymentMethod === 'CASH_ON_DELIVERY' && (
                      <CheckCircle className="w-5 h-5 text-primary-500" />
                    )}
                  </div>
                </div>
              </label>
              
              <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                paymentMethod === 'MOBILE_MONEY' 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  value="MOBILE_MONEY"
                  checked={paymentMethod === 'MOBILE_MONEY'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3 mt-1 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Mobile Money</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Pay via M-Pesa, EcoCash, etc.</p>
                    </div>
                    {paymentMethod === 'MOBILE_MONEY' && (
                      <CheckCircle className="w-5 h-5 text-primary-500" />
                    )}
                  </div>
                </div>
              </label>
            </div>
            
            {paymentMethod === 'MOBILE_MONEY' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  After placing order, you will receive payment instructions via SMS
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column - Order Summary */}
        <div className="lg:w-1/3">
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl shadow-lg p-6 sticky top-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold gradient-text">Order Summary</h2>
            </div>
            
            {/* Items List */}
            <div className="space-y-3 mb-5 max-h-80 overflow-y-auto">
              {items.map((item) => {
                const discountedPrice = item.price * (1 - (item.discount || 0) / 100);
                return (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-semibold text-primary-600">M{(discountedPrice * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            
            {/* Totals */}
            <div className="space-y-3 mb-5 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-medium">M{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tax (15%)</span>
                <span className="font-medium">M{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
                <span className="font-medium">
                  {deliveryFee === 0 ? (
                    <span className="text-green-500">Free</span>
                  ) : (
                    `M${deliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              {totalPrice > 100 && (
                <div className="flex justify-end">
                  <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                    🎉 Free delivery applied!
                  </span>
                </div>
              )}
              <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-2xl font-bold text-primary-600">
                    M{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Place Order Button */}
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Truck className="w-5 h-5" />
                  <span>Place Order</span>
                </>
              )}
            </button>
            
            {/* Terms */}
            <p className="text-xs text-gray-500 text-center mt-4">
              By placing an order, you agree to our 
              <a href="#" className="text-primary-600 hover:underline ml-1">Terms of Service</a> and 
              <a href="#" className="text-primary-600 hover:underline ml-1">Privacy Policy</a>
            </p>
            
            {/* Secure Checkout Badge */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-center gap-4">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500">Secure Checkout</span>
                <span className="text-xs text-gray-500">SSL Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;