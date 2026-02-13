import React, { useState } from 'react';
import { Save, Building2, MapPin, Mail, Phone, Globe, Image as ImageIcon, Database, Receipt } from 'lucide-react';
import { cn } from '../utils/cn';

const SettingsManager = ({ settings, setSettings }) => {
  const [formData, setFormData] = useState(settings);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const [sqlMode, setSqlMode] = useState(localStorage.getItem('rental_sql_mode') !== 'false');
  const envApiUrl = import.meta.env.VITE_API_URL;
  const [apiUrl, setApiUrl] = useState(envApiUrl || localStorage.getItem('rental_api_url') || 'http://localhost:5000');

  const handleSqlToggle = () => {
    const newVal = !sqlMode;
    setSqlMode(newVal);
    localStorage.setItem('rental_sql_mode', newVal.toString());
    localStorage.setItem('rental_api_url', apiUrl);
    alert(`Database Mode changed to ${newVal ? 'SQL API' : 'Local Storage'}. The application will reload.`);
    window.location.reload();
  };

  const currencies = [
    { label: 'US Dollar ($)', value: '$' },
    { label: 'Euro (€)', value: '€' },
    { label: 'British Pound (£)', value: '£' },
    { label: 'Indian Rupee (₹)', value: '₹' },
    { label: 'Yen (¥)', value: '¥' },
    { label: 'Australian Dollar (A$)', value: 'A$' },
    { label: 'Canadian Dollar (C$)', value: 'C$' },
    { label: 'Sri Lankan Rupee (Rs)', value: 'Rs' },
    { label: 'United Arab Emirates dirham (AED)', value: 'AED' },
  ];

  const sqlSchema = `
-- SQL Schema for SoundLight Pro Database
-- Use these queries to create your database tables

CREATE TABLE equipment (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  pricePerDay DECIMAL(10,2),
  value DECIMAL(10,2),
  totalQuantity INT,
  availableQuantity INT,
  status VARCHAR(50),
  description TEXT
);

CREATE TABLE customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  trn VARCHAR(100)
);

CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  customerId VARCHAR(50),
  customerName VARCHAR(255),
  customerAddress TEXT,
  customerTrn VARCHAR(100),
  items JSON, -- MySQL JSON type or TEXT for others
  startDate DATE,
  endDate DATE,
  returnDate DATE,
  status VARCHAR(50),
  subtotalAmount DECIMAL(10,2),
  taxAmount DECIMAL(10,2),
  discountType VARCHAR(20),
  discountValue DECIMAL(10,2),
  totalAmount DECIMAL(10,2),
  advancePayment DECIMAL(10,2),
  paidAmount DECIMAL(10,2),
  balanceAmount DECIMAL(10,2),
  lateFee DECIMAL(10,2),
  damageFee DECIMAL(10,2),
  paymentMethod VARCHAR(50),
  notes TEXT,
  createdAt DATETIME
);

CREATE TABLE expenses (
  id VARCHAR(50) PRIMARY KEY,
  orderId VARCHAR(50),
  staffName VARCHAR(255),
  amount DECIMAL(10,2),
  reason VARCHAR(255),
  notes TEXT,
  date DATE
);

CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  username VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50)
);

CREATE TABLE settings (
  id INT PRIMARY KEY DEFAULT 1,
  companyName VARCHAR(255),
  logo TEXT,
  address TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  currency VARCHAR(10)
);
  `;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-gradient-to-r from-indigo-900 to-violet-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden mb-10">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2">Database Synchronization</h2>
          <p className="opacity-80 font-medium">Connect your local system to a live SQL database for enterprise scaling.</p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-6 bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/20">
            <div className="flex-1 w-full">
              <label className="block text-xs font-black uppercase tracking-widest mb-2 opacity-70">
                Server API URL {envApiUrl && <span className="text-emerald-400 ml-2">(Managed by Environment)</span>}
              </label>
              <input
                type="text"
                className={cn(
                  "w-full bg-black/20 border border-white/20 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-400 transition-all font-mono text-sm",
                  envApiUrl && "opacity-50 cursor-not-allowed"
                )}
                value={apiUrl}
                onChange={e => !envApiUrl && setApiUrl(e.target.value)}
                readOnly={!!envApiUrl}
                placeholder="http://your-server.com"
              />
            </div>
            <div className="shrink-0 flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-widest opacity-70">Database Mode</p>
                <p className="font-bold text-lg">{sqlMode ? 'SQL API (Online)' : 'Local Storage (Offline)'}</p>
              </div>
              <button
                onClick={handleSqlToggle}
                className={cn(
                  "w-16 h-8 rounded-full p-1 transition-all duration-300 relative",
                  sqlMode ? "bg-emerald-500" : "bg-slate-600"
                )}
              >
                <div className={cn(
                  "w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300",
                  sqlMode ? "translate-x-8" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {sqlMode && (
        <div className="bg-slate-900 rounded-3xl p-8 text-white mb-10 border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <Database className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-black">SQL Database Schema</h3>
          </div>
          <p className="text-slate-400 mb-6 text-sm">Copy this schema and run it on your SQL server to prepare the database tables.</p>
          <div className="bg-black/50 p-6 rounded-2xl border border-slate-800 font-mono text-xs overflow-x-auto text-blue-300">
            <pre>{sqlSchema}</pre>
          </div>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <p className="text-slate-500">Configure your company profile and application preferences</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Company Profile
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Logo URL</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.logo}
                  onChange={e => setFormData({ ...formData, logo: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Currency Symbol</label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                <select
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                >
                  {currencies.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">VAT Percentage (%)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">%</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.taxPercentage || 0}
                  onChange={e => setFormData({ ...formData, taxPercentage: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-4 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700">Business Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <textarea
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  required
                ></textarea>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Phone / Mobile</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                Email Server (SMTP) Settings
              </h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">SMTP Host</label>
                <input
                  type="text"
                  placeholder="smtp.example.com"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.smtpHost || ''}
                  onChange={e => setFormData({ ...formData, smtpHost: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">SMTP Port</label>
                <input
                  type="number"
                  placeholder="587"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.smtpPort || ''}
                  onChange={e => setFormData({ ...formData, smtpPort: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">SMTP Username</label>
                <input
                  type="text"
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.smtpUser || ''}
                  onChange={e => setFormData({ ...formData, smtpUser: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">SMTP Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.smtpPass || ''}
                  onChange={e => setFormData({ ...formData, smtpPass: e.target.value })}
                />
              </div>

              <div className="space-y-4 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">From Email Address</label>
                <input
                  type="email"
                  placeholder="info@example.com"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.smtpFrom || ''}
                  onChange={e => setFormData({ ...formData, smtpFrom: e.target.value })}
                />
              </div>
            </div>
          </div>




          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            {isSaved && (
              <span className="text-emerald-600 font-medium flex items-center gap-2">
                <Save className="w-4 h-4" />
                Settings saved successfully!
              </span>
            )}
            <div className="flex-1"></div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-bold transition-all shadow-md shadow-blue-100 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Settings
            </button>
          </div>
        </form>
      </div >
    </div >
  );
};

export default SettingsManager;

