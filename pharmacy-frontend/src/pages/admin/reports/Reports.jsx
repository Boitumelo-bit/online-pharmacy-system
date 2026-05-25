import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Package, Users, 
  ShoppingCart, Download, Printer, TrendingDown, 
  CheckCircle, XCircle, AlertTriangle, UserPlus, Activity, Truck
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesData, setSalesData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [reportType, dateRange, startDate, endDate]);

  const getDateRangeFilter = () => {
    const now = new Date();
    let start = new Date();
    
    switch(dateRange) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        start = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        start = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case 'custom':
        start = new Date(startDate);
        break;
      default:
        start = new Date(now.setDate(now.getDate() - 7));
    }
    
    return {
      start: startDate ? new Date(startDate) : start,
      end: endDate ? new Date(endDate) : new Date()
    };
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRangeFilter();
      
      const [salesRes, productsRes, statusRes, dailyRes, inventoryRes, usersRes] = await Promise.all([
        api.get('/reports/sales', { params: { startDate: start.toISOString(), endDate: end.toISOString() } }),
        api.get('/reports/top-products', { params: { limit: 10, startDate: start.toISOString(), endDate: end.toISOString() } }),
        api.get('/reports/orders-by-status'),
        api.get('/reports/daily-sales', { params: { days: 30 } }),
        api.get('/reports/inventory-alerts'),
        api.get('/reports/user-statistics')
      ]);
      
      setSalesData(salesRes.data);
      setTopProducts(productsRes.data);
      setOrdersByStatus(statusRes.data);
      setDailySales(dailyRes.data);
      setInventoryAlerts(inventoryRes.data);
      setUserStats(usersRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    setSalesData({
      totalRevenue: 45678.50,
      totalOrders: 342,
      averageOrderValue: 133.56,
      totalItems: 1245,
      revenueChange: 12.5,
      ordersChange: 8.3
    });
    
    setTopProducts([
      { name: 'Paracetamol 500mg', quantity: 342, revenue: 3420.00, percentage: 15 },
      { name: 'Amoxicillin 250mg', quantity: 278, revenue: 4170.00, percentage: 12 },
      { name: 'Vitamin C 1000mg', quantity: 245, revenue: 3675.00, percentage: 10 },
      { name: 'Ibuprofen 400mg', quantity: 198, revenue: 1980.00, percentage: 8 },
      { name: 'Cetirizine 10mg', quantity: 167, revenue: 1336.00, percentage: 7 }
    ]);
    
    setOrdersByStatus([
      { status: 'PENDING', count: 23, color: '#F59E0B' },
      { status: 'APPROVED', count: 31, color: '#3B82F6' },
      { status: 'PREPARING', count: 18, color: '#8B5CF6' },
      { status: 'READY', count: 25, color: '#06B6D4' },
      { status: 'OUT_FOR_DELIVERY', count: 15, color: '#EC4899' },
      { status: 'DELIVERED', count: 189, color: '#10B981' },
      { status: 'CANCELLED', count: 41, color: '#EF4444' }
    ]);
    
    setDailySales([
      { date: '2024-05-18', sales: 1250, orders: 12 },
      { date: '2024-05-19', sales: 1450, orders: 14 },
      { date: '2024-05-20', sales: 1100, orders: 10 },
      { date: '2024-05-21', sales: 1680, orders: 16 },
      { date: '2024-05-22', sales: 1920, orders: 18 },
      { date: '2024-05-23', sales: 2100, orders: 20 },
      { date: '2024-05-24', sales: 2350, orders: 22 }
    ]);
    
    setInventoryAlerts([
      { name: 'Amoxicillin 250mg', stock: 15, reorderLevel: 50, status: 'low' },
      { name: 'Paracetamol 500mg', stock: 8, reorderLevel: 50, status: 'critical' },
      { name: 'Insulin Injection', stock: 5, reorderLevel: 20, status: 'critical' },
      { name: 'Blood Pressure Monitor', stock: 3, reorderLevel: 10, status: 'low' }
    ]);
    
    setUserStats({
      totalCustomers: 456,
      newCustomers: 23,
      activePharmacists: 5,
      activeDeliveryStaff: 3,
      customerRetention: 78.5
    });
  };

  const exportToCSV = () => {
    let csvContent = "Pharmacy Report\n\n";
    csvContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
    
    csvContent += "SALES SUMMARY\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Revenue,M${salesData?.totalRevenue?.toLocaleString() || 0}\n`;
    csvContent += `Total Orders,${salesData?.totalOrders || 0}\n`;
    csvContent += `Average Order Value,M${salesData?.averageOrderValue?.toFixed(2) || 0}\n`;
    csvContent += `Items Sold,${salesData?.totalItems || 0}\n\n`;
    
    csvContent += "TOP PRODUCTS\n";
    csvContent += "Product Name,Quantity Sold,Revenue,Percentage\n";
    topProducts.forEach(p => {
      csvContent += `"${p.name}",${p.quantity},${p.revenue},${p.percentage}%\n`;
    });
    csvContent += "\n";
    
    csvContent += "ORDERS BY STATUS\n";
    csvContent += "Status,Count\n";
    ordersByStatus.forEach(s => {
      csvContent += `${s.status},${s.count}\n`;
    });
    csvContent += "\n";
    
    csvContent += "INVENTORY ALERTS\n";
    csvContent += "Product,Current Stock,Reorder Level,Status\n";
    inventoryAlerts.forEach(i => {
      csvContent += `"${i.name}",${i.stock},${i.reorderLevel},${i.status}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report exported as CSV!');
  };

  const printReport = () => {
    window.print();
  };

  const StatCard = ({ title, value, icon: Icon, change, color }) => (
    <div className="stat-card p-6 hover:scale-105 transition-transform duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold" style={{ color }}>{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(change)}% from last period
              </span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );

  // Simple bar chart component
  const SimpleBarChart = ({ data, dataKey, fill, label }) => {
    const maxValue = Math.max(...data.map(d => d[dataKey]), 1);
    return (
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs w-24 truncate">{item.date || item.name}</span>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 flex items-center justify-end px-2 text-xs text-white"
                style={{ 
                  width: `${(item[dataKey] / maxValue) * 100}%`,
                  backgroundColor: fill
                }}
              >
                {item[dataKey] > maxValue * 0.15 && (
                  <span className="text-white text-xs">
                    {dataKey === 'sales' ? `M${item[dataKey]}` : item[dataKey]}
                  </span>
                )}
              </div>
            </div>
            {item[dataKey] <= maxValue * 0.15 && (
              <span className="text-xs font-medium w-16 text-right">
                {dataKey === 'sales' ? `M${item[dataKey]}` : item[dataKey]}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Simple pie chart component
  const SimplePieChart = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    
    return (
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
            <span className="text-sm flex-1">{item.status?.replace('_', ' ')}</span>
            <span className="text-sm font-semibold">{item.count}</span>
            <span className="text-xs text-gray-500">({((item.count / total) * 100).toFixed(1)}%)</span>
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full"
                style={{ 
                  width: `${(item.count / total) * 100}%`,
                  backgroundColor: colors[idx % colors.length]
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="loader mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:block">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Comprehensive business insights</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={printReport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Report Filters */}
      <div className="glass-morphism rounded-2xl p-4 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500"
            >
              <option value="sales">Sales Report</option>
              <option value="products">Products Report</option>
              <option value="inventory">Inventory Report</option>
              <option value="customers">Customers Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last 12 Months</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50"
                />
              </div>
            </>
          )}
          <button
            onClick={fetchReports}
            className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* Sales Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`M${salesData?.totalRevenue?.toLocaleString() || 0}`}
          icon={DollarSign}
          change={salesData?.revenueChange}
          color="#4F46E5"
        />
        <StatCard 
          title="Total Orders" 
          value={salesData?.totalOrders || 0}
          icon={ShoppingCart}
          change={salesData?.ordersChange}
          color="#10B981"
        />
        <StatCard 
          title="Average Order Value" 
          value={`M${salesData?.averageOrderValue?.toFixed(2) || 0}`}
          icon={TrendingUp}
          color="#F59E0B"
        />
        <StatCard 
          title="Items Sold" 
          value={salesData?.totalItems || 0}
          icon={Package}
          color="#EF4444"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="dashboard-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Sales Trend</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Sales (M)</p>
              <SimpleBarChart data={dailySales} dataKey="sales" fill="#4F46E5" />
            </div>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-600 mb-2">Orders Count</p>
              <SimpleBarChart data={dailySales} dataKey="orders" fill="#10B981" />
            </div>
          </div>
        </div>

        {/* Orders by Status */}
        <div className="dashboard-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Orders by Status</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <SimplePieChart data={ordersByStatus} />
        </div>
      </div>

      {/* Top Products Table */}
      <div className="dashboard-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Selling Products</h3>
          <Package className="w-5 h-5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/30">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Product Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Quantity Sold</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Revenue</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {topProducts.map((product, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3">{product.quantity}</td>
                  <td className="px-4 py-3 text-primary-600">M{product.revenue?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${product.percentage}%` }}></div>
                      </div>
                      <span className="text-sm">{product.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Alerts */}
      <div className="dashboard-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory Alerts</h3>
          <AlertTriangle className="w-5 h-5 text-orange-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventoryAlerts.length === 0 ? (
            <div className="col-span-3 text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-500">All inventory levels are healthy!</p>
            </div>
          ) : (
            inventoryAlerts.map((item, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${
                item.status === 'critical' 
                  ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">{item.name}</p>
                  {item.status === 'critical' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Current Stock:</span>
                  <span className={`font-semibold ${item.status === 'critical' ? 'text-red-600' : 'text-orange-600'}`}>
                    {item.stock} units
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Reorder Level:</span>
                  <span>{item.reorderLevel} units</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Customer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="dashboard-card p-6 text-center">
          <Users className="w-8 h-8 text-primary-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{userStats?.totalCustomers || 0}</p>
          <p className="text-sm text-gray-500">Total Customers</p>
        </div>
        <div className="dashboard-card p-6 text-center">
          <UserPlus className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{userStats?.newCustomers || 0}</p>
          <p className="text-sm text-gray-500">New Customers (30d)</p>
        </div>
        <div className="dashboard-card p-6 text-center">
          <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{userStats?.activePharmacists || 0}</p>
          <p className="text-sm text-gray-500">Active Pharmacists</p>
        </div>
        <div className="dashboard-card p-6 text-center">
          <Truck className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{userStats?.activeDeliveryStaff || 0}</p>
          <p className="text-sm text-gray-500">Delivery Staff</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;