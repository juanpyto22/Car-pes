import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { DemoProvider } from '@/contexts/DemoContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <DemoProvider>
    <App />
  </DemoProvider>
);