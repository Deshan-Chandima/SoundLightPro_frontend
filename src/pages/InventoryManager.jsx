import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Tag, Hash, DollarSign, List, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

const InventoryManager = ({ equipment, setEquipment, categories, setCategories, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const toast = useToast();

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDestructive: true
  });

  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: categories.length > 0 ? categories[0].name : '',
    pricePerDay: 0,
    value: 0,
    totalQuantity: 0,
    status: 'Reusable',
    description: ''
  });

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (categories.some(c => c.name.toLowerCase() === newCategoryName.toLowerCase().trim())) {
      toast.error('Category with this name already exists');
      return;
    }
    const newCat = {
      id: `cat-${Math.random().toString(36).substr(2, 9)}`,
      name: newCategoryName.trim()
    };

    const sqlMode = localStorage.getItem('rental_sql_mode') !== 'false';
    if (sqlMode) {
      try {
        const { api } = await import('../services/apiService');
        await api.saveCategory(newCat);
      } catch (error) {
        console.error("Failed to save category:", error);
        toast.error('Failed to save category to database');
      }
    }

    setCategories([...categories, newCat]);
    setNewCategoryName('');
    toast.success('Category added successfully');
  };

  const handleDeleteCategory = (id) => {
    const catToDelete = categories.find(c => c.id === id);
    if (!catToDelete) return;

    const isUsed = equipment.some(e => e.category === catToDelete.name);
    if (isUsed) {
      toast.warning('Cannot delete this category because it is currently assigned to equipment items.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete "${catToDelete.name}"? This action cannot be undone.`,
      confirmText: 'Delete Category',
      isDestructive: true,
      onConfirm: async () => {
        const sqlMode = localStorage.getItem('rental_sql_mode') !== 'false';
        if (sqlMode) {
          try {
            const { api } = await import('../services/apiService');
            await api.deleteCategory(id);
          } catch (error) {
            console.error("Failed to delete category:", error);
            toast.error('Failed to delete category');
            return;
          }
        }
        setCategories(categories.filter(c => c.id !== id));
        toast.success('Category deleted successfully');
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sqlMode = localStorage.getItem('rental_sql_mode') !== 'false';

    try {
      if (editingItem) {
        const updatedItem = { ...editingItem, ...formData };
        if (sqlMode) {
          const { api } = await import('../services/apiService');
          await api.updateEquipment(updatedItem);
        }
        setEquipment(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
        toast.success('Equipment updated successfully');
      } else {
        const newItem = {
          ...formData,
          id: `EQ-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          availableQuantity: formData.totalQuantity || 0,
        };
        if (sqlMode) {
          const { api } = await import('../services/apiService');
          await api.saveEquipment(newItem);
        }
        setEquipment(prev => [...prev, newItem]);
        toast.success('Equipment added successfully');
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({ name: '', category: categories.length > 0 ? categories[0].name : '', pricePerDay: 0, value: 0, totalQuantity: 0, status: 'Reusable', description: '' });
    } catch (error) {
      console.error("Failed to save equipment:", error);
      toast.error("Error saving to database. Changes saved locally only.");
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Equipment',
      message: 'Are you sure you want to delete this equipment item? This action cannot be undone.',
      confirmText: 'Delete Item',
      isDestructive: true,
      onConfirm: async () => {
        const sqlMode = localStorage.getItem('rental_sql_mode') !== 'false';
        if (sqlMode) {
          try {
            const { api } = await import('../services/apiService');
            await api.deleteEquipment(id);
          } catch (error) {
            console.error("Failed to delete equipment:", error);
            toast.error('Failed to delete equipment');
            return;
          }
        }
        setEquipment(prev => prev.filter(item => item.id !== id));
        toast.success('Equipment deleted successfully');
      }
    });
  };

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipment Inventory</h1>
          <p className="text-slate-500">Manage your rental assets and their condition</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all font-bold shadow-sm active:scale-95"
          >
            <List className="w-5 h-5" />
            Categories
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingItem(null);
              setFormData({
                name: '',
                category: categories.length > 0 ? categories[0].name : '',
                pricePerDay: 0,
                value: 0,
                totalQuantity: 0,
                status: 'Reusable',
                description: ''
              });
            }}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 font-black active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Equipment
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search items by name or category..."
          className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">{editingItem ? 'Edit Equipment' : 'Add New Equipment'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="" disabled>Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="New">New</option>
                    <option value="Reusable">Reusable</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price per Day</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="number"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.pricePerDay || ''}
                      onChange={e => setFormData({ ...formData, pricePerDay: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Value</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="number"
                      placeholder="Replacement cost"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.value || ''}
                      onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="number"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.totalQuantity || ''}
                      onChange={e => setFormData({ ...formData, totalQuantity: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Damaged Qty</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2.5 w-4 h-4 text-red-400" />
                    <input
                      type="number"
                      min="0"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                      value={formData.damagedQuantity || 0}
                      onChange={e => setFormData({ ...formData, damagedQuantity: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
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
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div >
        </div >
      )}

      {
        showCategoryManager && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Manage Categories</h2>
                <button onClick={() => setShowCategoryManager(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New Category Name"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </form>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {categories.length > 0 ? categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-900">{cat.name}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )) : (
                    <p className="text-center text-slate-400 py-4 italic">No categories yet.</p>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowCategoryManager(false)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-[0.2em]">
              <th className="px-4 sm:px-6 py-5">Equipment</th>
              <th className="px-4 sm:px-6 py-4 font-semibold">Category</th>
              <th className="px-4 sm:px-6 py-4 font-semibold">Price/Day</th>
              <th className="px-4 sm:px-6 py-4 font-semibold">Value</th>
              <th className="px-4 sm:px-6 py-4 font-semibold">Stock</th>
              <th className="px-4 sm:px-6 py-4 font-semibold">Status</th>
              <th className="px-4 sm:px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEquipment.length > 0 ? filteredEquipment.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                      <Package className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {settings.currency}{item.pricePerDay}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-500">
                  {settings.currency}{item.value}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col text-xs gap-1">
                    <div className="font-bold text-slate-500">
                      {item.totalQuantity - (item.damagedQuantity || 0)} <span className="text-[10px] font-normal uppercase tracking-wider">Rentable Total</span>
                    </div>
                    <div className="font-bold text-indigo-600">
                      {item.availableQuantity} <span className="text-[10px] font-normal uppercase tracking-wider">Available in Shop</span>
                    </div>
                    {(item.damagedQuantity > 0) && (
                      <div className="font-bold text-red-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block mr-1"></span>
                        {item.damagedQuantity} <span className="text-[10px] font-normal uppercase tracking-wider">Damaged Units</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm border",
                    item.status === 'New' ? "bg-cyan-100 text-cyan-800 border-cyan-200" :
                      item.status === 'Reusable' ? "bg-indigo-100 text-indigo-800 border-indigo-200" :
                        "bg-rose-100 text-rose-800 border-rose-200"
                  )}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 hover:bg-red-50 rounded-md text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-12 h-12 text-slate-200" />
                    <p>No equipment found. Start by adding some.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
};

export default InventoryManager;

