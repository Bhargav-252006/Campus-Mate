import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {initSession} from './services/api';
import './index.css';
import './app-enhancements.css';

// Initialize session before rendering — ensures JWT token is ready for API calls
initSession().then(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}).catch(() => {
    // Render even if session init fails — interceptor will retry on 401
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
});
