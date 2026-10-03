import { useState } from 'react';
import { CloudUpload, Loader2, CheckCircle2 } from 'lucide-react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { cloudFetch, isCloudConfigured } from '../../services/cloudApi';

// Content that now lives in Cloudflare D1. Everything else (users, admins,
// registrations, payments, gate passes, attendance, core team) stays in Firebase.
const COLLECTIONS = ['events', 'site_content', 'media_folders', 'media_files', 'gallery_photos', 'inquiries', 'club_reports'];
// Stays in Firebase: maintenance / access switch read by App.jsx.
const KEEP_IN_FIREBASE = { site_content: ['settings'] };
const BATCH = 100;

// Firestore Timestamps -> epoch ms, recursively, so the JSON is portable.
function toPlain(value) {
  if (value instanceof Timestamp) return value.toMillis();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toPlain(v)]));
  }
  return value;
}

export default function CloudMigrationPanel({ onToast }) {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);

  const run = async () => {
    if (!window.confirm('Copy site content from Firebase into Cloudflare? Existing Cloudflare documents with the same id are overwritten.')) return;
    setRunning(true);
    setLog([]);
    let total = 0;
    try {
      for (const name of COLLECTIONS) {
        const snap = await getDocs(collection(db, name));
        const skip = KEEP_IN_FIREBASE[name] || [];
        const docs = snap.docs
          .filter((d) => !skip.includes(d.id))
          .map((d) => ({ id: d.id, data: toPlain(d.data()) }));
        for (let i = 0; i < docs.length; i += BATCH) {
          await cloudFetch('/api/content/_import', {
            method: 'POST',
            body: { collection: name, docs: docs.slice(i, i + BATCH) },
          });
        }
        total += docs.length;
        setLog((prev) => [...prev, `${name}: ${docs.length} copied`]);
      }
      onToast?.(`Copied ${total} documents to Cloudflare.`);
    } catch (err) {
      setLog((prev) => [...prev, `Stopped: ${err.message}`]);
      onToast?.('Migration stopped: ' + err.message, 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#080808] p-5 space-y-3">
      <h3 className="!text-sm !tracking-[0.15em] font-mono text-white/70 flex items-center gap-2">
        <CloudUpload className="w-4 h-4 text-red-500" /> Move content to Cloudflare
      </h3>
      <p className="text-sm text-white/45">
        One-time copy of events, site content, media lists, gallery, inquiries and club reports from Firebase into
        Cloudflare D1. Logins, admins and all registration data stay in Firebase. Safe to run again.
      </p>
      {!isCloudConfigured() && (
        <p className="text-sm text-red-400">Set VITE_CLOUD_API_URL first (the deployed Worker URL).</p>
      )}
      <button
        type="button"
        onClick={run}
        disabled={running || !isCloudConfigured()}
        className="min-h-[44px] px-5 rounded-xl bg-red-600 hover:bg-red-400 disabled:bg-white/[0.08] disabled:text-white/35 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2"
      >
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
        {running ? 'Copying…' : 'Copy content now'}
      </button>
      {log.length > 0 && (
        <ul className="text-xs font-mono text-white/70 space-y-1">
          {log.map((line) => (
            <li key={line} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-red-500" /> {line}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
