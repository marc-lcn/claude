import React from 'react';
import ReactDOM from 'react-dom/client';
import { installStorage } from './lib/storage.js';
import App from './App.jsx';

// Must run before App mounts: App's hooks call window.storage on first render.
installStorage();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
