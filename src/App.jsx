import { useState, useEffect } from 'react';

import MainLayout from './layouts/MainLayout';
import ToastProvider from './components/Toast';

import Dashboard from './pages/Dashboard';
import InventoryManager from './pages/InventoryManager';
import CustomerManager from './pages/CustomerManager';
import OrderManager from './pages/OrderManager';
import Reports from './pages/Reports';
import SettingsManager from './pages/SettingsManager';
import BackupManager from './pages/BackupManager';
import ExpenseManager from './pages/ExpenseManager';
import UserManager from './pages/UserManager';
import Login from './pages/Login';
import InvoiceView from './pages/InvoiceView';

const DEFAULT_SETTINGS = {
    companyName: 'SoundLight Pro',
    logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MDAgNTAwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQxIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNGY0NmU1O3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzdjM2FlZDtzdG9wLW9wYWNpdHk6MSIgLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgcng9IjEwMCIgcnk9IjEwMCIgZmlsbD0idXJsKCNncmFkMSkiIC8+PHBhdGggZD0iTTE1MCwyNTAgUTI1MCwxNTAgMzUwLDI1MCBUNTUwLDI1MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxNSIgZmlsbD0ibm9uZSIgb3BhY2l0eT0iMC44IiAvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmb250LXNpemU9IjIwMCIgZmlsbD0id2hpdGUiIGR5PSIyMCI+UzwvdGV4dD48L3N2Zz4=',
    address: '123 Event Lane, Show City',
    email: 'contact@soundlightpro.com',
    phone: '+1 (555) 123-4567',
    currency: '$',
    taxPercentage: 5,
};

const INITIAL_CATEGORIES = [
    { id: 'cat-1', name: 'Lighting' },
    { id: 'cat-2', name: 'Audio' },
    { id: 'cat-3', name: 'Furniture' },
    { id: 'cat-4', name: 'Decoration' },
];

export function App() {
    const [activeView, setActiveView] = useState(() => {
        const saved = localStorage.getItem('rental_active_view');
        return saved || 'dashboard';
    });

    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('rental_current_user');
        return saved ? JSON.parse(saved) : null;
    });


    const [isSqlOnline, setIsSqlOnline] = useState(false);
    const sqlMode = localStorage.getItem('rental_sql_mode') !== 'false';

    const [equipment, setEquipment] = useState(() => JSON.parse(localStorage.getItem('rental_equipment')) || []);
    const [customers, setCustomers] = useState(() => JSON.parse(localStorage.getItem('rental_customers')) || []);
    const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('rental_orders')) || []);
    const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem('rental_expenses')) || []);
    const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem('rental_users')) || []);
    const [categories, setCategories] = useState(() => JSON.parse(localStorage.getItem('rental_categories')) || INITIAL_CATEGORIES);
    const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem('rental_settings')) || DEFAULT_SETTINGS);


    useEffect(() => {
        const loadData = async () => {
            if (sqlMode) {
                if (!currentUser && sqlMode) return; // Stop if no user is logged in
                try {
                    const { api } = await import('./services/apiService');
                    const [eq, cust, ord, exp, usrs, cats, sett] = await Promise.all([
                        api.getEquipment(),
                        api.getCustomers(),
                        api.getOrders(),
                        api.getExpenses(),
                        api.getUsers(),
                        api.getCategories(),
                        api.getSettings()
                    ]);
                    setEquipment(eq);
                    setCustomers(cust);
                    setOrders(ord);
                    setExpenses(Array.isArray(exp) ? exp : []);
                    setUsers(usrs);
                    setCategories(cats);
                    if (sett && sett.companyName) setSettings(sett);
                    setIsSqlOnline(true);
                } catch (error) {
                    console.error("SQL Connection Failed, falling back to Local Storage:", error);
                    loadFromLocal();
                    setIsSqlOnline(false);
                }
            } else {
                loadFromLocal();
            }
        };

        const loadFromLocal = () => {
            const savedEq = localStorage.getItem('rental_equipment');
            const savedCust = localStorage.getItem('rental_customers');
            const savedOrd = localStorage.getItem('rental_orders');
            const savedExp = localStorage.getItem('rental_expenses');
            const savedUsrs = localStorage.getItem('rental_users');
            const savedCats = localStorage.getItem('rental_categories');
            const savedSett = localStorage.getItem('rental_settings');

            if (savedEq) setEquipment(JSON.parse(savedEq));
            if (savedCust) setCustomers(JSON.parse(savedCust));
            if (savedOrd) setOrders(JSON.parse(savedOrd));
            if (savedExp) setExpenses(JSON.parse(savedExp));
            if (savedUsrs) setUsers(JSON.parse(savedUsrs));
            if (savedCats) setCategories(JSON.parse(savedCats));
            if (savedSett) setSettings(JSON.parse(savedSett));
        };

        loadData();
    }, [sqlMode, currentUser]);


    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const orderIdParam = urlParams.get('id');


    useEffect(() => {
        localStorage.setItem('rental_equipment', JSON.stringify(equipment));
    }, [equipment]);

    useEffect(() => {
        localStorage.setItem('rental_customers', JSON.stringify(customers));
    }, [customers]);

    useEffect(() => {
        localStorage.setItem('rental_orders', JSON.stringify(orders));
    }, [orders]);

    useEffect(() => {
        localStorage.setItem('rental_expenses', JSON.stringify(expenses));
    }, [expenses]);

    useEffect(() => {
        localStorage.setItem('rental_users', JSON.stringify(users));
    }, [users]);

    useEffect(() => {
        localStorage.setItem('rental_settings', JSON.stringify(settings));
        if (sqlMode && isSqlOnline) {
            import('./services/apiService').then(({ api }) => api.saveSettings(settings));
        }
    }, [settings, sqlMode, isSqlOnline]);

    useEffect(() => {
        localStorage.setItem('rental_categories', JSON.stringify(categories));
    }, [categories]);

    useEffect(() => {
        localStorage.setItem('rental_active_view', activeView);
    }, [activeView]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('rental_current_user', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('rental_current_user');
        }
    }, [currentUser]);

    const handleLogout = () => {
        localStorage.removeItem('rental_auth_token');
        setCurrentUser(null);
        setActiveView('dashboard');
    };


    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'rental_orders' && e.newValue) {
                setOrders(JSON.parse(e.newValue));
            }
            if (e.key === 'rental_expenses' && e.newValue) {
                setExpenses(JSON.parse(e.newValue));
            }
            if (e.key === 'rental_users' && e.newValue) {
                setUsers(JSON.parse(e.newValue));
            }
            if (e.key === 'rental_equipment' && e.newValue) {
                setEquipment(JSON.parse(e.newValue));
            }
            if (e.key === 'rental_customers' && e.newValue) {
                setCustomers(JSON.parse(e.newValue));
            }
            if (e.key === 'rental_settings' && e.newValue) {
                setSettings(JSON.parse(e.newValue));
            }
            if (e.key === 'rental_categories' && e.newValue) {
                setCategories(JSON.parse(e.newValue));
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return <Dashboard equipment={equipment} customers={customers} orders={orders} settings={settings} />;
            case 'inventory':
                return <InventoryManager
                    equipment={equipment}
                    setEquipment={setEquipment}
                    categories={categories}
                    setCategories={setCategories}
                    settings={settings}
                />;
            case 'customers':
                return <CustomerManager customers={customers} setCustomers={setCustomers} />;
            case 'orders':
                return <OrderManager
                    orders={orders}
                    setOrders={setOrders}
                    equipment={equipment}
                    setEquipment={setEquipment}
                    customers={customers}
                    setCustomers={setCustomers}
                    settings={settings}
                />;
            case 'expenses':
                return <ExpenseManager
                    expenses={expenses}
                    setExpenses={setExpenses}
                    orders={orders}
                    settings={settings}
                />;
            case 'users':
                return <UserManager
                    users={users}
                    onAddUser={async (user) => {
                        const sqlMode = localStorage.getItem('rental_sql_mode') === 'true';
                        if (sqlMode) {
                            const { api } = await import('./services/apiService');
                            await api.saveUser(user);
                        }
                        setUsers([...users, user]);
                    }}
                    onUpdateUser={async (updatedUser) => {
                        const sqlMode = localStorage.getItem('rental_sql_mode') === 'true';
                        if (sqlMode) {
                            const { api } = await import('./services/apiService');
                            await api.updateUser(updatedUser);
                        }
                        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
                    }}
                    onDeleteUser={async (id) => {
                        const sqlMode = localStorage.getItem('rental_sql_mode') === 'true';
                        if (sqlMode) {
                            const { api } = await import('./services/apiService');
                            await api.deleteUser(id);
                        }
                        setUsers(users.filter(u => u.id !== id));
                    }}
                />;
            case 'reports':
                return <Reports orders={orders} equipment={equipment} settings={settings} expenses={expenses} />;
            case 'settings':
                return <SettingsManager settings={settings} setSettings={setSettings} />;
            case 'backup':
                return <BackupManager />;
            default:
                return <Dashboard equipment={equipment} customers={customers} orders={orders} settings={settings} />;
        }
    };

    if (viewParam === 'invoice' && orderIdParam) {
        const order = orders.find(o => o.id === orderIdParam);
        const customer = customers.find(c => c.id === order?.customerId);
        if (order) {
            return <InvoiceView order={order} customer={customer} settings={settings} onClose={() => window.close()} />;
        }
        return <div className="p-10 text-center">Order not found.</div>;
    }

    if (!currentUser) {
        return <Login onLogin={setCurrentUser} users={users} />;
    }

    return (
        <ToastProvider>
            <MainLayout
                activeView={activeView}
                setActiveView={setActiveView}
                currentUser={currentUser}
                handleLogout={handleLogout}
                settings={settings}
                sqlMode={sqlMode}
                isSqlOnline={isSqlOnline}
            >
                {renderView()}
            </MainLayout>
        </ToastProvider>
    );
}

