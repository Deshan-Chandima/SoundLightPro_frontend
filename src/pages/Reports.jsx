import React from 'react';
import {
  BarChart,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  History,
  Package,
  Activity,
  Receipt
} from 'lucide-react';
import { cn } from '../utils/cn';

const Reports = ({ orders, equipment, settings, expenses = [] }) => {
  const totalSales = orders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0) + (parseFloat(o.lateFee) || 0) + (parseFloat(o.damageFee) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const netProfit = totalSales - totalExpenses;
  const collectedPayments = orders.reduce((sum, o) => sum + (parseFloat(o.paidAmount) || 0), 0);
  const pendingSales = totalSales - collectedPayments;

  const equipmentStatusCounts = {
    New: equipment.filter(e => e.status === 'New').length,
    Reusable: equipment.filter(e => e.status === 'Reusable').length,
    Damaged: equipment.filter(e => e.status === 'Damaged').length,
  };

  const categoryCounts = {};
  equipment.forEach(e => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500">Overview of business performance and asset health</p>
        </div>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.3)] text-white group hover:scale-[1.02] transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-xl border border-white/20">
              <TrendingUp className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1.5 rounded-full border border-white/10">Revenue</span>
          </div>
          <p className="text-xs font-black text-indigo-100 uppercase tracking-[0.2em] opacity-80">Total Sales</p>
          <p className="text-5xl font-black mt-2 drop-shadow-2xl">{settings.currency}{totalSales.toLocaleString()}</p>
          <p className="text-xs text-white/50 mt-4 font-bold">Gross combined rental income</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(16,185,129,0.3)] text-white group hover:scale-[1.02] transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-xl border border-white/20">
              <CheckCircle className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1.5 rounded-full border border-white/10">Liquidity</span>
          </div>
          <p className="text-xs font-black text-emerald-100 uppercase tracking-[0.2em] opacity-80">Payments Collected</p>
          <p className="text-5xl font-black mt-2 drop-shadow-2xl">{settings.currency}{collectedPayments.toLocaleString()}</p>
          <p className="text-xs text-white/50 mt-4 font-bold">Actual cash in hand</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(245,158,11,0.3)] text-white group hover:scale-[1.02] transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-xl border border-white/20">
              <History className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1.5 rounded-full border border-white/10">Receivables</span>
          </div>
          <p className="text-xs font-black text-orange-100 uppercase tracking-[0.2em] opacity-80">Outstanding Balance</p>
          <p className="text-5xl font-black mt-2 drop-shadow-2xl">{settings.currency}{pendingSales.toLocaleString()}</p>
          <p className="text-xs text-white/50 mt-4 font-bold">Total to be collected</p>
        </div>

        <div className="bg-gradient-to-br from-rose-600 via-pink-700 to-purple-800 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(225,29,72,0.3)] text-white group hover:scale-[1.02] transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-xl border border-white/20">
              <Receipt className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1.5 rounded-full border border-white/10">Outflow</span>
          </div>
          <p className="text-xs font-black text-rose-100 uppercase tracking-[0.2em] opacity-80">Total Expenses</p>
          <p className="text-5xl font-black mt-2 drop-shadow-2xl">{settings.currency}{totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-white/50 mt-4 font-bold">Staff & operational costs</p>
        </div>

        <div className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(124,58,237,0.3)] text-white group hover:scale-[1.02] transition-all lg:col-span-2 relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 rounded-full group-hover:scale-125 transition-transform duration-1000"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-xl border border-white/20">
              <BarChart className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1.5 rounded-full border border-white/10">Profitability</span>
          </div>
          <p className="text-xs font-black text-violet-100 uppercase tracking-[0.2em] opacity-80">Net Balance</p>
          <p className="text-6xl font-black mt-2 drop-shadow-2xl tracking-tighter">{settings.currency}{netProfit.toLocaleString()}</p>
          <p className="text-xs text-white/50 mt-4 font-bold">Total profit after all expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400" />
              Equipment Health
            </h3>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm mb-1 items-center">
                <span className="font-black text-indigo-600 uppercase tracking-widest text-[10px]">New Condition</span>
                <span className="text-slate-900 font-black px-2 py-0.5 bg-indigo-50 rounded-md">{equipmentStatusCounts.New} items</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${(equipmentStatusCounts.New / equipment.length * 100) || 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm mb-1 items-center">
                <span className="font-black text-emerald-600 uppercase tracking-widest text-[10px]">Reusable</span>
                <span className="text-slate-900 font-black px-2 py-0.5 bg-emerald-50 rounded-md">{equipmentStatusCounts.Reusable} items</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${(equipmentStatusCounts.Reusable / equipment.length * 100) || 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm mb-1 items-center">
                <span className="font-black text-rose-600 uppercase tracking-widest text-[10px] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Damaged
                </span>
                <span className="text-slate-900 font-black px-2 py-0.5 bg-rose-50 rounded-md">{equipmentStatusCounts.Damaged} items</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-rose-500 to-pink-600 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${(equipmentStatusCounts.Damaged / equipment.length * 100) || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>


        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              Inventory Categories
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(categoryCounts).map(([cat, count], idx) => {
              const colors = ['bg-indigo-50 text-indigo-700 border-indigo-100', 'bg-emerald-50 text-emerald-700 border-emerald-100', 'bg-amber-50 text-amber-700 border-amber-100', 'bg-rose-50 text-rose-700 border-rose-100', 'bg-violet-50 text-violet-700 border-violet-100', 'bg-cyan-50 text-cyan-700 border-cyan-100'];
              const colorClass = colors[idx % colors.length];
              return (
                <div key={cat} className={cn("p-4 rounded-2xl border transition-all hover:scale-105", colorClass)}>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{cat}</p>
                  <p className="text-3xl font-black">{count}</p>
                </div>
              );
            })}
            {Object.keys(categoryCounts).length === 0 && (
              <p className="col-span-2 text-center text-slate-400 py-8 italic">No data available</p>
            )}
          </div>
        </div>
      </div>


      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-slate-400" />
            Recent Sales Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-4 sm:px-6 py-4">Order Date</th>
                <th className="px-4 sm:px-6 py-4">Customer</th>
                <th className="px-4 sm:px-6 py-4">Payment Method</th>
                <th className="px-4 sm:px-6 py-4 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.slice(0, 10).map((o) => (
                <tr key={o.id}>
                  <td className="px-6 py-4 text-sm text-slate-600">{o.startDate}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{o.customerName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{o.paymentMethod}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{settings.currency}{o.totalAmount}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No sales records available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;

