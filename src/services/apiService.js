
const API_URL = import.meta.env.VITE_API_URL || localStorage.getItem('rental_api_url') || 'http://localhost:5000';
const SQL_MODE = localStorage.getItem('rental_sql_mode') !== 'false';

export const isSqlMode = () => SQL_MODE;

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('rental_auth_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Making request to:', `${API_URL}${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    console.log('Response status:', response.status);

    if (response.status === 401 || response.status === 403) {
        console.warn('Authentication failed, clearing tokens.');
        localStorage.removeItem('rental_auth_token');
        localStorage.removeItem('rental_current_user');
        // window.location.reload(); // Removed to prevent infinite loop
    }

    if (!response.ok) {
        console.error('API request failed:', response.statusText);
        throw new Error('API request failed');
    }
    return response.json();
}

export const api = {
    // Categories
    getCategories: () => request('/categories'),
    saveCategory: (category) => request('/categories', { method: 'POST', body: JSON.stringify(category) }),
    deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

    // Equipment
    getEquipment: () => request('/equipment'),
    saveEquipment: (item) => request('/equipment', { method: 'POST', body: JSON.stringify(item) }),
    updateEquipment: (item) => request(`/equipment/${item.id}`, { method: 'PUT', body: JSON.stringify(item) }),
    deleteEquipment: (id) => request(`/equipment/${id}`, { method: 'DELETE' }),

    // Customers
    getCustomers: () => request('/customers'),
    saveCustomer: (customer) => request('/customers', { method: 'POST', body: JSON.stringify(customer) }),
    updateCustomer: (customer) => request(`/customers/${customer.id}`, { method: 'PUT', body: JSON.stringify(customer) }),
    deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

    // Orders
    getOrders: () => request('/orders'),
    saveOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
    updateOrder: (order) => request(`/orders/${order.id}`, { method: 'PUT', body: JSON.stringify(order) }),
    deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),

    // Expenses
    getExpenses: () => request('/expenses'),
    saveExpense: (expense) => request('/expenses', { method: 'POST', body: JSON.stringify(expense) }),
    updateExpense: (expense) => request(`/expenses/${expense.id}`, { method: 'PUT', body: JSON.stringify(expense) }),
    deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

    // Users
    getUsers: () => request('/users'),
    saveUser: (user) => request('/users', { method: 'POST', body: JSON.stringify(user) }),
    updateUser: (user) => request(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify(user) }),
    deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

    // Settings
    getSettings: () => request('/settings'),
    saveSettings: (settings) => request('/settings', { method: 'POST', body: JSON.stringify(settings) }),

    // Auth
    login: (credentials) => request('/login', { method: 'POST', body: JSON.stringify(credentials) }),
};
