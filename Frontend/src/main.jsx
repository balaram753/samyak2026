import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from './data/userContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { SiteContentProvider } from './context/SiteContentContext';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import App from './App.jsx';

// Developer & Architecture Attribution & Emergency Contact
console.log(
  "%c⚡ SAMYAK 2026 DIGITAL PLATFORM %c\n" +
  "Architected & Engineered by Balaram (@balaram753)\n" +
  "Portfolio: https://balaram.me | LinkedIn: https://linkedin.com/in/chbalaram\n\n" +
  "%c⚠️ In case of any technical issues, system anomalies, or emergency downtime, please contact the Lead Architect: Balaram.",
  "background: #dc2626; color: #ffffff; font-weight: bold; font-size: 14px; padding: 4px 8px; border-radius: 4px;",
  "color: #ef4444; font-size: 12px; font-weight: 600; line-height: 1.6;",
  "color: #fca5a5; font-size: 11px; font-weight: 500; font-family: monospace;"
);

// Cryptographic Hidden System Watermark (Read-Only & Tamper-Proof)
try {
  if (typeof window !== 'undefined' && !window.__SYSTEM_SIGNATURE__) {
    Object.defineProperty(window, '__SYSTEM_SIGNATURE__', {
      value: Object.freeze({
        architect: "Balaram",
        handle: "balaram753",
        contact: "https://balaram.me",
        portfolio: "https://balaram.me",
        linkedin: "https://linkedin.com/in/chbalaram",
        instagram: "https://instagram.com/_.roc_ram._",
        emergencyContact: "In case of any problem, please contact Balaram",
        hash: "QmFsYXJhbS1jaGJhbGFyYW0tMjAyNi1zeXN0ZW0="
      }),
      writable: false,
      configurable: false
    });
  }
} catch (_) {}

// Auto-recover from stale Vite dynamic import chunk errors after deployments
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('Vite preload error detected. Auto-reloading with latest chunks...', event);
    event.preventDefault();
    const now = Date.now();
    const lastReload = Number(sessionStorage.getItem('last_vite_preload_reload') || 0);
    if (now - lastReload > 8000) {
      sessionStorage.setItem('last_vite_preload_reload', String(now));
      window.location.reload();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event?.message || '');
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Expected a JavaScript-or-Wasm module script') ||
      msg.includes('Failed to load module script') ||
      msg.includes('error loading dynamically imported module')
    ) {
      console.warn('Dynamic chunk load failure detected on window. Triggering refresh...');
      const now = Date.now();
      const lastReload = Number(sessionStorage.getItem('last_vite_preload_reload') || 0);
      if (now - lastReload > 8000) {
        sessionStorage.setItem('last_vite_preload_reload', String(now));
        window.location.reload();
      }
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AdminAuthProvider>
          <SiteContentProvider>
            <UserProvider>
              <App />
            </UserProvider>
          </SiteContentProvider>
        </AdminAuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
