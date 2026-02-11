# Rental Management System - Frontend

React-based frontend for the Equipment Rental Management System.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Frontend will start on: `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## 📦 Technologies

- **React** - UI framework
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **jsPDF** - PDF generation
- **date-fns** - Date utilities

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── Dashboard.jsx
│   │   ├── Login.jsx
│   │   ├── InventoryManager.jsx
│   │   ├── CustomerManager.jsx
│   │   ├── OrderManager.jsx
│   │   ├── ExpenseManager.jsx
│   │   ├── UserManager.jsx
│   │   ├── Reports.jsx
│   │   ├── SettingsManager.jsx
│   │   ├── BackupManager.jsx
│   │   └── InvoiceView.jsx
│   ├── services/
│   │   └── apiService.js  # API integration
│   ├── utils/
│   │   ├── cn.js          # Utility functions
│   │   └── pdfGenerator.js # PDF generation
│   ├── App.jsx            # Main application
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── index.html             # HTML template
├── vite.config.js         # Vite configuration
└── package.json           # Dependencies

```

## 🔌 Backend Connection

The frontend connects to the backend API at `http://localhost:5000/api`

To change the API URL, edit `src/services/apiService.js`:

```javascript
const API_URL = localStorage.getItem('rental_api_url') || 'http://localhost:5000/api';
```

## 🔐 Authentication

Default login credentials:
- **Username:** `akil`
- **Password:** `eternals`

> ⚠️ Change these credentials after first login!

## ✨ Features

- Dashboard with key metrics
- Equipment inventory management
- Customer database
- Rental orders & quotations
- Expense tracking
- User management
- Reports & analytics
- PDF invoice generation
- Backup & restore functionality
- Responsive design

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 📄 License

ISC
