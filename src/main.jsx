import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from './data/userContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { SiteContentProvider } from './context/SiteContentContext';
import './index.css';
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <SiteContentProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </SiteContentProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  </StrictMode>
);
