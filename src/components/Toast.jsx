import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const Toast = ({ id, type, title, message, onClose }) => {
    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        warning: <AlertTriangle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
    };

    const styles = {
        success: {
            container: 'from-emerald-500 to-teal-600',
            icon: 'bg-white/20',
            glow: 'shadow-emerald-500/30',
        },
        error: {
            container: 'from-rose-500 to-red-600',
            icon: 'bg-white/20',
            glow: 'shadow-rose-500/30',
        },
        warning: {
            container: 'from-amber-500 to-orange-600',
            icon: 'bg-white/20',
            glow: 'shadow-amber-500/30',
        },
        info: {
            container: 'from-blue-500 to-indigo-600',
            icon: 'bg-white/20',
            glow: 'shadow-blue-500/30',
        },
    };

    const style = styles[type] || styles.info;

    return (
        <div
            className={`
        flex items-start gap-3 p-4 rounded-2xl
        bg-gradient-to-r ${style.container}
        text-white shadow-xl ${style.glow}
        transform transition-all duration-500 ease-out
        animate-slide-in backdrop-blur-sm
        min-w-[320px] max-w-[420px]
      `}
        >
            <div className={`p-2 rounded-xl ${style.icon} flex-shrink-0`}>
                {icons[type]}
            </div>
            <div className="flex-1 min-w-0">
                {title && (
                    <p className="font-bold text-sm tracking-wide">{title}</p>
                )}
                <p className="text-sm text-white/90 mt-0.5">{message}</p>
            </div>
            <button
                onClick={() => onClose(id)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((options) => {
        const id = Date.now() + Math.random();
        const toast = {
            id,
            type: options.type || 'info',
            title: options.title,
            message: options.message,
            duration: options.duration || 4000,
        };

        setToasts((prev) => [...prev, toast]);


        setTimeout(() => {
            removeToast(id);
        }, toast.duration);

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);


    const success = useCallback((message, title = 'Success') => {
        return addToast({ type: 'success', title, message });
    }, [addToast]);

    const error = useCallback((message, title = 'Error') => {
        return addToast({ type: 'error', title, message });
    }, [addToast]);

    const warning = useCallback((message, title = 'Warning') => {
        return addToast({ type: 'warning', title, message });
    }, [addToast]);

    const info = useCallback((message, title = 'Info') => {
        return addToast({ type: 'info', title, message });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
            {children}

            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        id={toast.id}
                        type={toast.type}
                        title={toast.title}
                        message={toast.message}
                        onClose={removeToast}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
