const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return 'https://mazelineevents.com';
    }
    return import.meta.env.VITE_API_URL || localStorage.getItem('rental_api_url') || 'http://localhost:5000';
};
const API_URL = getApiUrl();
const SQL_MODE = localStorage.getItem('rental_sql_mode') !== 'false';

export const isSqlMode = () => SQL_MODE;

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('rental_auth_token');
    const headers = {
        ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const isGet = !options.method || options.method.toUpperCase() === 'GET';
    const finalEndpoint = isGet
        ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`
        : endpoint;

    const response = await fetch(`${API_URL}${finalEndpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('rental_auth_token');
        localStorage.removeItem('rental_current_user');
    }

    if (!response.ok) {
        let errorMessage = 'API request failed';
        try {
            const errData = await response.json();
            errorMessage = errData.error || errData.message || errorMessage;
        } catch (e) {
            // ignore JSON parse error
        }
        throw new Error(errorMessage);
    }
    return response.json();
}

export const api = {
    getCategories: () => request('/api/categories'),
    saveCategory: (category) => request('/api/categories', { method: 'POST', body: JSON.stringify(category) }),
    deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),

    getEquipment: () => request('/api/equipment'),
    saveEquipment: (item) => request('/api/equipment', { method: 'POST', body: JSON.stringify(item) }),
    updateEquipment: (item) => request(`/api/equipment/${item.id}`, { method: 'PUT', body: JSON.stringify(item) }),
    deleteEquipment: (id) => request(`/api/equipment/${id}`, { method: 'DELETE' }),

    getCustomers: () => request('/api/customers'),
    saveCustomer: (customer) => request('/api/customers', { method: 'POST', body: JSON.stringify(customer) }),
    updateCustomer: (customer) => request(`/api/customers/${customer.id}`, { method: 'PUT', body: JSON.stringify(customer) }),
    deleteCustomer: (id) => request(`/api/customers/${id}`, { method: 'DELETE' }),

    getOrders: () => request('/api/orders'),
    saveOrder: (order) => request('/api/orders', { method: 'POST', body: JSON.stringify(order) }),
    updateOrder: (order) => request(`/api/orders/${order.id}`, { method: 'PUT', body: JSON.stringify(order) }),
    deleteOrder: (id) => request(`/api/orders/${id}`, { method: 'DELETE' }),

    getExpenses: () => request('/api/expenses'),
    saveExpense: (expense) => request('/api/expenses', { method: 'POST', body: JSON.stringify(expense) }),
    updateExpense: (expense) => request(`/api/expenses/${expense.id}`, { method: 'PUT', body: JSON.stringify(expense) }),
    deleteExpense: (id) => request(`/api/expenses/${id}`, { method: 'DELETE' }),

    getUsers: () => request('/api/users'),
    saveUser: (user) => request('/api/users', { method: 'POST', body: JSON.stringify(user) }),
    updateUser: (user) => request(`/api/users/${user.id}`, { method: 'PUT', body: JSON.stringify(user) }),
    deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),

    getSettings: () => request('/api/settings'),
    saveSettings: (settings) => request('/api/settings', { method: 'POST', body: JSON.stringify(settings) }),

    login: (credentials) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

    getBackup: () => request('/api/backup/export'),
    restoreBackup: (data) => request('/api/backup/import', { method: 'POST', body: JSON.stringify(data) }),

    sendInvoice: (formData) => request('/api/email/send-invoice', { method: 'POST', body: formData }),
};
