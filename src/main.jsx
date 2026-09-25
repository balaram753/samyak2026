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

// Host Integrity Guard: Terminate unauthorized Firebase clones immediately
if (typeof window !== 'undefined') {
  const host = window.location.hostname.toLowerCase();
  if (host.includes('.web.app') || host.includes('.firebaseapp.com') || host.includes('kl--samyak')) {
    document.title = "403 Forbidden - System Terminated";
    document.body.innerHTML = `
      <div style="background:#050505;color:#ef4444;height:100vh;display:flex;align-items:center;justify-content:center;font-family:monospace;text-align:center;padding:24px;margin:0;">
        <div style="border:1px solid rgba(239,68,68,0.3);background:#111;padding:32px;border-radius:16px;max-width:500px;box-shadow:0 0 50px rgba(239,68,68,0.25);">
          <h1 style="margin:0 0 12px;font-size:24px;">⚠️ 403 FORBIDDEN</h1>
          <p style="color:#fff;font-weight:bold;margin:0 0 8px;">SYSTEM DEPLOYMENT REVOKED</p>
          <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 20px;">This unauthorized Firebase instance has been revoked and rendered unreachable by the Lead Architect (Balaram / @balaram753).</p>
          <a href="https://samyak2026.balaram753-ch.workers.dev" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">VISIT OFFICIAL PORTAL &rarr;</a>
        </div>
      </div>
    `;
    throw new Error("TERMINATED: Unauthorized deployment host.");
  }
}

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
