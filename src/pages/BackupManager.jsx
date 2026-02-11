import React, { useRef } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle2, Database } from 'lucide-react';

const BackupManager = () => {
  const fileInputRef = useRef(null);

  const handleBackup = () => {
    const data = {
      equipment: JSON.parse(localStorage.getItem('rental_equipment') || '[]'),
      customers: JSON.parse(localStorage.getItem('rental_customers') || '[]'),
      orders: JSON.parse(localStorage.getItem('rental_orders') || '[]'),
      expenses: JSON.parse(localStorage.getItem('rental_expenses') || '[]'),
      users: JSON.parse(localStorage.getItem('rental_users') || '[]'),
      settings: JSON.parse(localStorage.getItem('rental_settings') || 'null'),
      categories: JSON.parse(localStorage.getItem('rental_categories') || '[]'),
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rental_system_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestore = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you sure you want to restore? This will overwrite all current data. This action cannot be undone.')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result);

        if (data.equipment) localStorage.setItem('rental_equipment', JSON.stringify(data.equipment));
        if (data.customers) localStorage.setItem('rental_customers', JSON.stringify(data.customers));
        if (data.orders) localStorage.setItem('rental_orders', JSON.stringify(data.orders));
        if (data.expenses) localStorage.setItem('rental_expenses', JSON.stringify(data.expenses));
        if (data.users) localStorage.setItem('rental_users', JSON.stringify(data.users));
        if (data.settings) localStorage.setItem('rental_settings', JSON.stringify(data.settings));
        if (data.categories) localStorage.setItem('rental_categories', JSON.stringify(data.categories));

        alert('Data restored successfully! The application will now reload.');
        window.location.reload();
      } catch (error) {
        alert('Error restoring data. Please make sure the file is a valid backup JSON.');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Backup & Restore</h1>
          <p className="text-slate-500">Manage your system data and create secure backups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Download size={24} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Create Backup</h2>
            <p className="text-slate-500 text-sm mb-6">
              Download a full snapshot of your current system data, including inventory, customers, orders, and settings.
            </p>
            <button
              onClick={handleBackup}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Download size={20} />
              Download Backup File
            </button>
          </div>
          <div className="bg-slate-50 p-4 border-t border-slate-200">
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle2 size={14} className="text-green-500 mt-0.5" />
              <p>Recommended to perform weekly backups to prevent data loss.</p>
            </div>
          </div>
        </div>

        {/* Restore Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mb-4">
              <Upload size={24} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Restore System</h2>
            <p className="text-slate-500 text-sm mb-6">
              Upload a previously created backup file to restore your system to that state. All current data will be overwritten.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRestore}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              <Upload size={20} />
              Upload & Restore
            </button>
          </div>
          <div className="bg-orange-50 p-4 border-t border-orange-100">
            <div className="flex items-start gap-2 text-xs text-orange-700 font-medium">
              <AlertTriangle size={14} className="mt-0.5" />
              <p>Caution: Restoring will delete all current information!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="bg-blue-600 text-white p-2 rounded-lg shrink-0 h-fit">
            <Database size={20} />
          </div>
          <div>
            <h3 className="text-blue-900 font-semibold mb-1">What is included in the backup?</h3>
            <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside opacity-80">
              <li>Complete Equipment Inventory & Stock levels</li>
              <li>Customer Database & Addresses</li>
              <li>All Orders, Quotations & Rental History</li>
              <li>Staff Expenses & Petty Cash Records</li>
              <li>System User Profiles & Staff Management</li>
              <li>System Settings, Categories & Company Profile</li>
              <li>Financial Records & Payment History</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupManager;

