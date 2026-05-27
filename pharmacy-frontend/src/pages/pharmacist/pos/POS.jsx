import React, { useState, useEffect, useRef } from 'react';
import { Search, Barcode, Plus, Minus, Trash2, Printer, FileText, ShoppingCart, X, CreditCard, Receipt, User, Phone, DollarSign, Package } from 'lucide-react';
import { useCartStore } from '../../../stores/cartStore';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import { useReactToPrint } from 'react-to-print';

const POS = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [settings, setSettings] = useState({
    vat_percentage: 15,
    delivery_fee: 5,
    free_delivery_min: 100,
    currency: 'M'
  });
  const { items, addItem, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();
  const receiptRef = useRef();

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/dashboard/settings');
      if (response.data.success) {
        const data = response.data.data;
        setSettings({
          vat_percentage: parseFloat(data.vat_percentage) || 15,
          delivery_fee: parseFloat(data.delivery_fee) || 5,
          free_delivery_min: parseFloat(data.free_delivery_min_amount) || 100,
          currency: data.currency || 'M'
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    if (searchTerm.length > 2) {
      searchMedicines();
    }
  }, [searchTerm]);

  const searchMedicines = async () => {
    setLoading(true);
    try {
      const response = await api.get('/medicines', {
        params: { search: searchTerm, limit: 10 }
      });
      setMedicines(response.data.data || []);
    } catch (error) {
      console.error('Error searching medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeInput = async (e) => {
    if (e.key === 'Enter') {
      const barcode = e.target.value;
      try {
        const response = await api.get('/medicines', {
          params: { search: barcode }
        });
        if (response.data.data && response.data.data.length > 0) {
          addItem(response.data.data[0], 1);
          toast.success(`${response.data.data[0].name} added to cart`);
          e.target.value = '';
          setShowScanner(false);
        } else {
          toast.error('Medicine not found');
        }
      } catch (error) {
        toast.error('Error finding medicine');
      }
    }
  };

  const generateInvoice = () => {
    const doc = new jsPDF();
    const tax = totalPrice * (settings.vat_percentage / 100);
    const deliveryFee = totalPrice > settings.free_delivery_min ? 0 : settings.delivery_fee;
    const grandTotal = totalPrice + tax + deliveryFee;
    const currencySymbol = settings.currency;
    
    // Header with gradient effect
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Pharmacy POS System', 105, 20, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 45);
    doc.text(`Invoice #: INV-${Date.now()}`, 20, 52);
    doc.text(`Cashier: ${customerInfo.name || 'Walk-in Customer'}`, 20, 59);
    doc.line(20, 65, 190, 65);
    
    let y = 75;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Item', 20, y);
    doc.text('Qty', 120, y);
    doc.text('Price', 150, y);
    doc.text('Total', 170, y);
    y += 8;
    doc.line(20, y, 190, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    
    items.forEach((item) => {
      const discountedPrice = item.price * (1 - item.discount / 100);
      const itemTotal = discountedPrice * item.quantity;
      doc.text(item.name.substring(0, 25), 20, y);
      doc.text(item.quantity.toString(), 120, y);
      doc.text(`${currencySymbol}${discountedPrice.toFixed(2)}`, 150, y);
      doc.text(`${currencySymbol}${itemTotal.toFixed(2)}`, 170, y);
      y += 7;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    
    doc.line(20, y, 190, y);
    y += 8;
    doc.text(`Subtotal: ${currencySymbol}${totalPrice.toFixed(2)}`, 140, y);
    y += 7;
    doc.text(`Tax (${settings.vat_percentage}%): ${currencySymbol}${tax.toFixed(2)}`, 140, y);
    y += 7;
    doc.text(`Delivery: ${deliveryFee === 0 ? 'Free' : `${currencySymbol}${deliveryFee.toFixed(2)}`}`, 140, y);
    y += 10;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${currencySymbol}${grandTotal.toFixed(2)}`, 140, y);
    y += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Thank you for shopping with us!', 105, y, { align: 'center' });
    doc.text('Follow us on social media', 105, y + 7, { align: 'center' });
    
    doc.save(`invoice-${Date.now()}.pdf`);
    toast.success('Invoice downloaded!');
  };

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setShowCustomerModal(true);
  };

  const completeSale = async () => {
    if (!customerInfo.name) {
      toast.error('Please enter customer name');
      return;
    }
    
    toast.success('Sale completed successfully!');
    clearCart();
    setShowCustomerModal(false);
    setCustomerInfo({ name: '', phone: '' });
  };

  const tax = totalPrice * (settings.vat_percentage / 100);
  const deliveryFee = totalPrice > settings.free_delivery_min ? 0 : settings.delivery_fee;
  const grandTotal = totalPrice + tax + deliveryFee;
  const currencySymbol = settings.currency;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Search & Medicines */}
      <div className="lg:col-span-2 space-y-6">
        {/* Modern Search Card */}
        <div className="glass-morphism rounded-2xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 w-5 h-5 transition-colors duration-200" />
              <input
                type="text"
                placeholder="Search by name or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <button
              onClick={() => setShowScanner(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <Barcode className="w-5 h-5" />
              <span>Scan Barcode</span>
            </button>
          </div>
          
          {/* Modern Scanner Modal */}
          {showScanner && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full animate-scale-up shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-6 h-6 text-primary-500" />
                    <h3 className="text-xl font-bold gradient-text">Scan Barcode</h3>
                  </div>
                  <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Enter or scan barcode..."
                  onKeyPress={handleBarcodeInput}
                  className="w-full px-4 py-3 text-center text-lg font-mono rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  autoFocus
                />
                <p className="text-sm text-gray-500 mt-4 text-center">Use a barcode scanner or type the code and press Enter</p>
              </div>
            </div>
          )}
          
          {/* Search Results */}
          <div className="mt-5 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {loading && (
              <div className="text-center py-8">
                <div className="loader mx-auto"></div>
                <p className="text-gray-500 mt-3">Searching medicines...</p>
              </div>
            )}
            {medicines.map((medicine) => (
              <div
                key={medicine.id}
                className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gradient-to-r hover:from-primary-50 hover:to-transparent dark:hover:from-primary-900/20 transition-all duration-200 cursor-pointer group border border-transparent hover:border-primary-200"
                onClick={() => {
                  addItem(medicine, 1);
                  toast.success(`${medicine.name} added to cart`);
                }}
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 transition">{medicine.name}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Package className="w-3 h-3" />
                    Stock: {medicine.stock}
                    <span className="mx-1">•</span>
                    <DollarSign className="w-3 h-3" />
                    {currencySymbol}{medicine.price}
                  </p>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-md hover:shadow-lg">
                  Add
                </button>
              </div>
            ))}
            {searchTerm.length > 2 && medicines.length === 0 && !loading && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No medicines found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Right Panel - Cart - Modern Design */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 sticky top-4">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold gradient-text">Shopping Cart</h2>
          </div>
          <span className="text-sm text-gray-500">{items.length} items</span>
        </div>
        
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500">Cart is empty</p>
            <p className="text-sm text-gray-400 mt-1">Add items to continue</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-5 custom-scrollbar">
              {items.map((item) => {
                const discountedPrice = item.price * (1 - item.discount / 100);
                return (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:shadow-md transition-all duration-200">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{currencySymbol}{discountedPrice.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{currencySymbol}{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax ({settings.vat_percentage}%)</span>
                <span className="font-semibold">{currencySymbol}{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-semibold">
                  {deliveryFee === 0 ? (
                    <span className="text-green-500">Free</span>
                  ) : (
                    `${currencySymbol}${deliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-3 mt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary-600">{currencySymbol}{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-5">
              <button
                onClick={clearCart}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear</span>
              </button>
              <button
                onClick={generateInvoice}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <FileText className="w-4 h-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
            
            <button
              onClick={handleCheckout}
              className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg font-semibold"
            >
              <CreditCard className="w-5 h-5" />
              <span>Complete Sale</span>
            </button>
          </>
        )}
      </div>
      
      {/* Modern Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full animate-scale-up shadow-2xl">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <User className="w-6 h-6 text-primary-500" />
                <h3 className="text-xl font-bold gradient-text">Customer Information</h3>
              </div>
              <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter customer name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                  <span className="text-2xl font-bold text-primary-600">{currencySymbol}{grandTotal.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={completeSale}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg font-semibold"
              >
                <Receipt className="w-5 h-5" />
                <span>Complete Sale</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden Receipt for Printing */}
      <div style={{ display: 'none' }}>
        <div ref={receiptRef} className="p-6" style={{ width: '320px', fontFamily: 'monospace' }}>
          <div className="text-center border-b pb-3 mb-3">
            <h2 className="text-lg font-bold">💊 Pharmacy POS</h2>
            <p className="text-xs text-gray-500">{new Date().toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Customer: {customerInfo.name || 'Walk-in'}</p>
          </div>
          <div className="space-y-1">
            {items.map((item) => {
              const discountedPrice = item.price * (1 - item.discount / 100);
              return (
                <div key={item.id} className="flex justify-between text-xs">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{currencySymbol}{(discountedPrice * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t my-3 pt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Subtotal:</span>
              <span>{currencySymbol}{totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Tax ({settings.vat_percentage}%):</span>
              <span>{currencySymbol}{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Delivery:</span>
              <span>{deliveryFee === 0 ? 'Free' : `${currencySymbol}${deliveryFee.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t">
              <span>Total:</span>
              <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-center text-xs mt-4 pt-3 border-t">
            <p>Thank you for shopping!</p>
            <p className="text-gray-400 mt-1">Have a great day! 😊</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;