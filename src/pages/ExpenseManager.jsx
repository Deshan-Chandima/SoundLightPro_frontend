import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Receipt, User, DollarSign, X } from 'lucide-react';
import { format } from 'date-fns';

const ExpenseManager = ({ expenses = [], setExpenses, orders, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [formData, setFormData] = useState({
    orderId: '',
    staffName: '',
    amount: 0,
    reason: '',
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sqlMode = localStorage.getItem('rental_sql_mode') !== 'false';

    try {
      if (editingExpense) {
        const updatedExpense = { ...editingExpense, ...formData, amount: Number(formData.amount) };
        if (sqlMode) {
          const { api } = await import('../services/apiService');
          await api.updateExpense(updatedExpense);
        }
        setExpenses(prev => prev.map(ex => ex.id === editingExpense.id ? updatedExpense : ex));
      } else {
        const newExpense = {
          ...formData,
          amount: Number(formData.amount),
          id: `EXP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          date: formData.date || format(new Date(), 'yyyy-MM-dd')
        };
        if (sqlMode) {
          const { api } = await import('../services/apiService');
          await api.saveExpense(newExpense);
        }
        setExpenses(prev => [newExpense, ...prev]);
      }
      setShowForm(false);
      setEditingExpense(null);
      setFormData({ orderId: '', staffName: '', amount: 0, reason: '', notes: '', date: format(new Date(), 'yyyy-MM-dd') });
    } catch (error) {
      console.error("Failed to save expense:", error);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData(expense);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this expense record?')) {
      const sqlMode = localStorage.getItem('rental_sql_mode') !== 'false';
      if (sqlMode) {
        try {
          const { api } = await import('../services/apiService');
          await api.deleteExpense(id);
        } catch (error) {
          console.error("Failed to delete expense:", error);
        }
      }
      setExpenses(prev => prev.filter(ex => ex.id !== id));
    }
  };

  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const filteredExpenses = safeExpenses.filter(ex =>
    (ex.staffName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ex.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ex.orderId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((sum, ex) => sum + Number(ex.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses & Petty Cash</h1>
          <p className="text-slate-500">Track staff expenses and petty cash records</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingExpense(null);
            setFormData({
              orderId: '',
              staffName: '',
              amount: 0,
              reason: '',
              notes: '',
              date: format(new Date(), 'yyyy-MM-dd')
            });
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by staff, reason or order ID..."
          className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order ID (Optional)</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.orderId}
                    onChange={e => setFormData({ ...formData, orderId: e.target.value })}
                  >
                    <option value="">None / Not linked to order</option>
                    {orders.map(order => (
                      <option key={order.id} value={order.id}>{order.id} - {order.customerName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Staff Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="text"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.staffName}
                      onChange={e => setFormData({ ...formData, staffName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    required
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.amount || ''}
                      onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  {editingExpense ? 'Update Record' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-4 sm:px-6 py-4 font-semibold">Date</th>
              <th className="px-4 sm:px-6 py-4 font-semibold">Staff</th>
              <th className="px-4 sm:px-6 py-4 font-semibold">Order ID</th>
              <th className="px-4 sm:px-6 py-4 font-semibold">Reason</th>
              <th className="px-4 sm:px-6 py-4 font-semibold">Amount</th>
              <th className="px-4 sm:px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.length > 0 ? filteredExpenses.map((ex) => (
              <tr key={ex.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">
                  {ex.date}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-900">{ex.staffName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {ex.orderId ? (
                    <span className="font-mono text-xs font-bold text-blue-600">{ex.orderId}</span>
                  ) : (
                    <span className="text-slate-400 text-xs italic">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-700">{ex.reason}</p>
                  {ex.notes && <p className="text-xs text-slate-400 truncate max-w-[200px]">{ex.notes}</p>}
                </td>
                <td className="px-6 py-4 font-bold text-slate-900">
                  {settings.currency}{Number(ex.amount || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(ex)}
                      className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ex.id)}
                      className="p-1.5 hover:bg-red-50 rounded-md text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Receipt className="w-12 h-12 text-slate-200" />
                    <p>No expense records found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          {filteredExpenses.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={4} className="px-6 py-4 text-right font-bold text-slate-900">
                  Total Expenses:
                </td>
                <td className="px-6 py-4 font-black text-red-600 text-lg">
                  {settings.currency}{totalExpenses.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default ExpenseManager;

