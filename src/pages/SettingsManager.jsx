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
  currency VARCHAR(10),
  taxPercentage DECIMAL(5,2),
  smtpHost VARCHAR(255),
  smtpPort INT,
  smtpUser VARCHAR(255),
  smtpPass VARCHAR(255),
  smtpFrom VARCHAR(255),
  bankDetails TEXT,
  termsAndConditions TEXT
);
  `;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Document Settings (Invoices & Quotations)
              </h2>
            </div>

            <div className="p-6 grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">Bank Details (Shows on Invoices)</label>
                <textarea
                  placeholder="Account Title: ...&#10;Bank: ...&#10;Account Number: ...&#10;IBAN: ..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 h-32 resize-none"
                  value={formData.bankDetails || ''}
                  onChange={e => setFormData({ ...formData, bankDetails: e.target.value })}
                ></textarea>
                <p className="text-xs text-slate-500">These details will be printed at the bottom of standard invoices.</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">Terms & Conditions (Shows on Quotations)</label>
                <textarea
                  placeholder="* Equipments supplied purely on a rental basis.&#10;* PAYMENT TERMS: 50% Advance..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 h-48 resize-none"
                  value={formData.termsAndConditions || ''}
                  onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
                ></textarea>
                <p className="text-xs text-slate-500">These terms will be printed at the bottom of Quotation documents.</p>
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

