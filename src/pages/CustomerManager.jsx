import React, { useState } from 'react';
import { Plus, Search, Edit2, User, Phone, Mail, MapPin, X } from 'lucide-react';

const CustomerManager = ({ customers, setCustomers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    trn: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sqlMode = localStorage.getItem('rental_sql_mode') !== 'false';

    try {
      if (editingCustomer) {
        const updatedCustomer = { ...editingCustomer, ...formData };
        if (sqlMode) {
          const { api } = await import('../services/apiService');
          await api.updateCustomer(updatedCustomer);
        }
        setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? updatedCustomer : c));
      } else {
        const newCustomer = {
          ...formData,
          id: `CUST-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        };
        if (sqlMode) {
          const { api } = await import('../services/apiService');
          await api.saveCustomer(newCustomer);
        }
        setCustomers(prev => [...prev, newCustomer]);
      }
      setShowForm(false);
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '' });
    } catch (error) {
      console.error("Failed to save customer:", error);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setShowForm(true);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Records</h1>
          <p className="text-slate-500">Manage client information for faster ordering</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingCustomer(null);
            setFormData({ name: '', phone: '', email: '', address: '' });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input
                      required
                      type="tel"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input
                      required
                      type="email"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">TRN Number (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Tax Registration Number"
                    value={formData.trn}
                    onChange={e => setFormData({ ...formData, trn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.length > 0 ? filteredCustomers.map((customer) => (
          <div key={customer.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:border-blue-200 transition-colors group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-slate-500" />
              </div>
              <button
                onClick={() => handleEdit(customer)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-bold text-slate-900 text-lg">{customer.name}</h3>
            <p className="text-xs text-slate-400 mb-4">{customer.id}</p>

            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                {customer.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />
                {customer.email}
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                {customer.address}
              </div>
              {customer.trn && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="w-4 h-4 text-[8px] font-black border border-slate-400 rounded flex items-center justify-center text-slate-400">TRN</span>
                  {customer.trn}
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="col-span-full bg-white py-12 text-center text-slate-500 rounded-xl border border-dashed border-slate-300">
            <User className="w-12 h-12 text-slate-200 mx-auto mb-2" />
            <p>No customers found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerManager;

