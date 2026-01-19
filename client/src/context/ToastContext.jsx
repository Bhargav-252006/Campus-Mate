import React, {createContext, useContext, useState, useCallback} from 'react';
import {CheckCircle, XCircle, AlertCircle, Info, X} from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const Toast = ({toast, onRemove}) => {
    const icons = {
        success: <CheckCircle size={20} />,
        error: <XCircle size={20} />,
        warning: <AlertCircle size={20} />,
        info: <Info size={20} />
    };

    return (
        <div className={`toast toast-${toast.type}`}>
            <div className="toast-icon">{icons[toast.type]}</div>
            <div className="toast-content">
                {toast.title && <div className="toast-title">{toast.title}</div>}
                <div className="toast-message">{toast.message}</div>
            </div>
            <button className="toast-close" onClick={() => onRemove(toast.id)}>
                <X size={16} />
            </button>
        </div>
    );
};

export const ToastProvider = ({children}) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', title = '', duration = 4000) => {
        const id = Date.now() + Math.random();
        const toast = {id, message, type, title};

        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = useCallback((message, title = '') => addToast(message, 'success', title), [addToast]);
    const error = useCallback((message, title = '') => addToast(message, 'error', title), [addToast]);
    const warning = useCallback((message, title = '') => addToast(message, 'warning', title), [addToast]);
    const info = useCallback((message, title = '') => addToast(message, 'info', title), [addToast]);

    return (
        <ToastContext.Provider value={{addToast, removeToast, success, error, warning, info}}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastContext;
