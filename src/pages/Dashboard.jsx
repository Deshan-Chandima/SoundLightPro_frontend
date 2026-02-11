import React from 'react';
import {
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  Clock
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '../utils/cn';

const Dashboard = ({ equipment, customers, orders, settings }) => {
  const activeOrders = orders.filter(o => o.status === 'Active' || o.status === 'Partially Returned');
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0) + (parseFloat(o.lateFee) || 0) + (parseFloat(o.damageFee) || 0), 0);
  const pendingPayments = orders.reduce((sum, o) => sum + (parseFloat(o.balanceAmount) || 0), 0);

  const upcomingReturnsCount = activeOrders.filter(o => {
    const daysUntilDue = differenceInDays(parseISO(o.endDate), new Date());
    return daysUntilDue <= 3; // Due within 3 days or already overdue
  }).length;

  const damagedItems = equipment.filter(e => e.status === 'Damaged').length;

  const recentOrders = [...orders].sort((a, b) =>
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  ).slice(0, 5);

  const stats = [
    { label: 'Total Equipment', value: equipment.length, icon: Package, color: 'text-white', bg: 'bg-indigo-600', gradient: 'from-blue-600 to-indigo-700', shadow: 'shadow-blue-500/20' },
    { label: 'Active Rentals', value: activeOrders.length, icon: Clock, color: 'text-white', bg: 'bg-emerald-600', gradient: 'from-emerald-500 to-teal-700', shadow: 'shadow-emerald-500/20' },
    { label: 'Total Customers', value: customers.length, icon: Users, color: 'text-white', bg: 'bg-violet-600', gradient: 'from-violet-500 to-purple-800', shadow: 'shadow-purple-500/20' },
    { label: 'Total Revenue', value: `${settings.currency}${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-white', bg: 'bg-pink-600', gradient: 'from-pink-500 to-rose-700', shadow: 'shadow-rose-500/20' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-indigo-600">Dashboard</h1>
          <p className="text-slate-500 font-bold tracking-tight">Your business performance at a glance.</p>
        </div>
        <div className="flex gap-2">
          {damagedItems > 0 && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-rose-500/30 animate-pulse">
              <AlertCircle className="w-5 h-5" />
              {damagedItems} Damaged Items
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className={cn(
            "relative overflow-hidden p-8 rounded-[2rem] shadow-2xl transition-all duration-500 hover:scale-[1.02] group border border-white/20",
            "bg-gradient-to-br", stat.gradient, stat.shadow
          )}>
            <div className="absolute -top-6 -right-6 p-8 opacity-10 group-hover:opacity-20 transition-all duration-700 rotate-12 group-hover:rotate-0">
              <stat.icon className="w-32 h-32 text-white" />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full text-white">
              <div className="flex items-center justify-between mb-8">
                <div className="bg-white/30 p-4 rounded-[1.25rem] backdrop-blur-xl shadow-inner">
                  <stat.icon className="w-8 h-8" />
                </div>
                <div className="bg-white/20 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md">
                  Active
                </div>
              </div>
              <div>
                <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                <p className="text-4xl font-black mt-2 drop-shadow-2xl">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent Orders</h2>
            <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-4 sm:px-6 py-4 font-semibold">Customer</th>
                  <th className="px-4 sm:px-6 py-4 font-semibold">Date</th>
                  <th className="px-4 sm:px-6 py-4 font-semibold">Amount</th>
                  <th className="px-4 sm:px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.length > 0 ? recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{order.customerName}</p>
                      <p className="text-xs text-slate-500">{order.id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {format(parseISO(order.startDate), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {settings.currency}{order.totalAmount}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm",
                        order.status === 'Active' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          order.status === 'Confirmed' ? "bg-indigo-100 text-indigo-800 border border-indigo-200" :
                            order.status === 'Returned' ? "bg-slate-100 text-slate-800 border border-slate-200" :
                              order.status === 'Quotation' ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                "bg-rose-100 text-rose-800 border border-rose-200"
                      )}>
                        {order.status}
                      </span>
                    </td>

                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Pending Actions</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-4 p-4 rounded-lg bg-orange-50 border border-orange-100">
              <Clock className="w-5 h-5 text-orange-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-900">Upcoming Returns</p>
                <p className="text-xs text-orange-700 mt-1">
                  {upcomingReturnsCount} order{upcomingReturnsCount !== 1 ? 's' : ''} {upcomingReturnsCount === 1 ? 'is' : 'are'} due to be returned soon. Check the dashboard to process them.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
              <DollarSign className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Pending Payments</p>
                <p className="text-xs text-blue-700 mt-1">
                  Total of {settings.currency}{pendingPayments} in outstanding balance from active orders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

