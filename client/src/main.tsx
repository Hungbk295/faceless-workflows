import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/globals.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
