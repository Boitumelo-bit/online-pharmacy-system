import React, { useState, useEffect } from 'react';
import { Save, Building, Phone, Mail, MapPin, DollarSign, Percent, Clock, Globe, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    pharmacy_name: 'Pharmacy POS System',
    phone: '+266 1234 5678',
    email: 'info@pharmacy.com',
    address: 'Maseru, Lesotho',
    currency: 'M',
    vat_percentage: '15',
    delivery_fee: '5',
    free_delivery_min: '100',
    business_hours: 'Mon-Fri: 8am-8pm, Sat: 9am-6pm, Sun: Closed',
    facebook: '',
    twitter: '',
    instagram: '',
    website: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/settings');
      if (response.data.success) {
        const data = response.data.data;
        setSettings({
          pharmacy_name: data.pharmacy_name || 'Pharmacy POS System',
          phone: data.phone || '+266 1234 5678',
          email: data.email || 'info@pharmacy.com',
          address: data.address || 'Maseru, Lesotho',
          currency: data.currency || 'M',
          vat_percentage: data.vat_percentage || '15',
          delivery_fee: data.delivery_fee || '5',
          free_delivery_min: data.free_delivery_min_amount || '100',
          business_hours: data.business_hours || 'Mon-Fri: 8am-8pm, Sat: 9am-6pm, Sun: Closed',
          facebook: data.facebook || '',
          twitter: data.twitter || '',
          instagram: data.instagram || '',
          website: data.website || '',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      // Save each setting individually
      const promises = Object.entries(settings).map(([key, value]) => 
        api.post('/dashboard/settings', { key, value })
      );
      
      await Promise.all(promises);
      
      setSaveSuccess(true);
      toast.success('Settings saved successfully!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="loader mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold gradient-text">System Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Configure your pharmacy system</p>
      </div>

      {/* Settings Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-5 space-y-5">
          {/* General Settings Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <Building className="w-5 h-5 text-primary-500" />
              General Information
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pharmacy Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={settings.pharmacy_name}
                      onChange={(e) => handleChange('pharmacy_name', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder="Pharmacy Name"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={settings.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        placeholder="+266 1234 5678"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="email"
                        value={settings.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        placeholder="info@pharmacy.com"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    <textarea
                      value={settings.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      rows="2"
                      placeholder="Street, City, Country"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-500" />
              Financial Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Currency Symbol
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={settings.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="M"
                    maxLength="3"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  VAT Percentage (%)
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    step="0.01"
                    value={settings.vat_percentage}
                    onChange={(e) => handleChange('vat_percentage', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="15"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Delivery Fee (M)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.delivery_fee}
                  onChange={(e) => handleChange('delivery_fee', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Free Delivery Min. (M)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.free_delivery_min}
                  onChange={(e) => handleChange('free_delivery_min', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="100"
                />
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              Business Hours
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Operating Hours
              </label>
              <textarea
                value={settings.business_hours}
                onChange={(e) => handleChange('business_hours', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                rows="2"
                placeholder="Mon-Fri: 8am-8pm, Sat: 9am-6pm, Sun: Closed"
              />
              <p className="text-xs text-gray-500 mt-1">Example: Mon-Fri: 8am-8pm, Sat: 9am-6pm, Sun: Closed</p>
            </div>
          </div>

          {/* Social Media Links */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-500" />
              Social Media
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Facebook URL
                </label>
                <input
                  type="url"
                  value={settings.facebook}
                  onChange={(e) => handleChange('facebook', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="https://facebook.com/pharmacy"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Twitter URL
                </label>
                <input
                  type="url"
                  value={settings.twitter}
                  onChange={(e) => handleChange('twitter', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="https://twitter.com/pharmacy"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={settings.instagram}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="https://instagram.com/pharmacy"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={settings.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="https://pharmacy.com"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Info Note */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Settings are saved to the database and will apply globally across the system.
        </p>
      </div>
    </div>
  );
};

export default AdminSettings;