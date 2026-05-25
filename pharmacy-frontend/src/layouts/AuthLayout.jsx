import React from 'react';
import { Outlet } from 'react-router-dom';
import { Pill } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-4">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl mb-2">
            <Pill className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pharmacy POS System</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your trusted online pharmacy</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;