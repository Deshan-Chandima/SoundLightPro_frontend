import React, { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle2, Database, Server, HardDrive } from 'lucide-react';
import { api } from '../services/apiService';

const BackupManager = () => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const isSqlMode = localStorage.getItem('rental_sql_mode') !== 'false';

  const showStatus = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 5000);
  };

  const downloadFile = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBackup = async () => {
    setLoading(true);
    setStatus(null);

    try {
      let data;
      if (isSqlMode) {

        data = await api.getBackup();
      } else {

        data = {
          equipment: JSON.parse(localStorage.getItem('rental_equipment') || '[]'),
          customers: JSON.parse(localStorage.getItem('rental_customers') || '[]'),
          orders: JSON.parse(localStorage.getItem('rental_orders') || '[]'),
          expenses: JSON.parse(localStorage.getItem('rental_expenses') || '[]'),
          users: JSON.parse(localStorage.getItem('rental_users') || '[]'),
          settings: JSON.parse(localStorage.getItem('rental_settings') || 'null'),
          categories: JSON.parse(localStorage.getItem('rental_categories') || '[]'),
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          source: 'local_storage'
        };
      }

      const filename = `rental_system_backup_${isSqlMode ? 'sql' : 'local'}_${new Date().toISOString().slice(0, 10)}.json`;
      downloadFile(data, filename);
      showStatus('success', 'Backup created successfully!');

    } catch (error) {
      console.error('Backup failed:', error);
      showStatus('error', 'Failed to create backup: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you sure you want to restore? This will overwrite all current data. This action cannot be undone.')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    setStatus(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result);

        if (isSqlMode) {

          await api.restoreBackup(data);
          alert('Data restored successfully to SQL Database! The application will now reload.');
          window.location.reload();
        } else {

          if (data.equipment) localStorage.setItem('rental_equipment', JSON.stringify(data.equipment));
          if (data.customers) localStorage.setItem('rental_customers', JSON.stringify(data.customers));
          if (data.orders) localStorage.setItem('rental_orders', JSON.stringify(data.orders));
          if (data.expenses) localStorage.setItem('rental_expenses', JSON.stringify(data.expenses));
          if (data.users) localStorage.setItem('rental_users', JSON.stringify(data.users));
          if (data.settings) localStorage.setItem('rental_settings', JSON.stringify(data.settings));
          if (data.categories) localStorage.setItem('rental_categories', JSON.stringify(data.categories));

          alert('Data restored successfully to Local Storage! The application will now reload.');
          window.location.reload();
        }
      } catch (error) {
        console.error('Restore failed:', error);
        showStatus('error', 'Error restoring data: ' + (error.message || 'Invalid file format'));
        alert('Error restoring data. Please check the console or ensure the file is valid.');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
          {isSqlMode ? <Server size={14} className="text-blue-500" /> : <HardDrive size={14} className="text-orange-500" />}
          Current Mode: {isSqlMode ? 'SQL Database' : 'Local Storage'}
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-lg border ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {status.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Download size={24} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Create Backup</h2>
            <p className="text-slate-500 text-sm mb-6">
              Download a full snapshot of your current system data, including inventory, customers, orders, users, and settings.
            </p>
            <button
              onClick={handleBackup}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <Download size={20} />
              {loading ? 'Processing...' : 'Download Backup File'}
            </button>
          </div>
          <div className="bg-slate-50 p-4 border-t border-slate-200">
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle2 size={14} className="text-green-500 mt-0.5" />
              <p>Recommended to perform weekly backups to prevent data loss.</p>
            </div>
          </div>
        </div>


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
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <Upload size={20} />
              {loading ? 'Processing...' : 'Upload & Restore'}
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
