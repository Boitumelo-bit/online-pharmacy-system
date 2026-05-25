import React from 'react';
import { CheckCircle, Clock, Package, Truck, Home } from 'lucide-react';

const OrderTimeline = ({ status }) => {
  const steps = [
    { key: 'PENDING', label: 'Order Placed', icon: Clock },
    { key: 'APPROVED', label: 'Order Approved', icon: CheckCircle },
    { key: 'PREPARING', label: 'Preparing', icon: Package },
    { key: 'READY', label: 'Ready for Pickup', icon: CheckCircle },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', icon: Home },
  ];

  const statusOrder = ['PENDING', 'APPROVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentIndex = statusOrder.indexOf(status);

  return (
    <div className="py-4">
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
        <div 
          className="absolute top-5 left-0 h-0.5 bg-green-500 transition-all duration-500"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        ></div>
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <div key={step.key} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all
                    ${isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}
                    ${isCurrent ? 'ring-4 ring-green-200 dark:ring-green-900' : ''}
                  `}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className={`text-xs mt-2 text-center ${isCompleted ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderTimeline;