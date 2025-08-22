import React from 'react';
import { createRoot } from 'react-dom/client';
import './App.css';
import App from './App.jsx';
import { Provider } from 'react-redux';
import { store } from './store';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Create root
const container = document.getElementById('root');
const root = createRoot(container);

// Register service worker
serviceWorkerRegistration.register();

// Render app
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);






