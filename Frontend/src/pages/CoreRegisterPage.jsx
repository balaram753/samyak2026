import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Upload, CheckCircle2, Lock, WifiOff } from 'lucide-react';
import { getCoreInvite, submitCoreMember, BLOOD_GROUPS } from '../services/coreTeamService';
import { uploadImage } from '../services/r2Storage';

const EMPTY = { name: '', role: '', team: '', studentId: '', branch: '', phone: '', bloodGroup: '' };

const inputClass =
  'w-full min-h-[48px] px-4 rounded-xl bg-[#080808] border border-white/[0.12] text-white text-base placeholder:text-white/35 focus:outline-none focus:border-red-600';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-xs font-mono uppercase tracking-wider text-white/70">{label}</span>
      {children}
    </label>
  );
}

export default function CoreRegisterPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('checking'); // checking | open | closed | offline | done
  const [attempt, setAttempt] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [memberCode, setMemberCode] = useState('');

  // Private page: keep it out of search engines.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('checking');
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'unavailable' })), 12000)
    );
    Promise.race([getCoreInvite(token), timeout])
      .then((invite) => !cancelled && setStatus(invite?.active ? 'open' : 'closed'))
      .catch((err) => {
        if (cancelled) return;
        // Only a definite "no" means closed; network trouble gets a retry.
        setStatus(err?.code === 'permission-denied' || err?.code === 'not-found' ? 'closed' : 'offline');
      });
    return () => { cancelled = true; };
  }, [token, attempt]);

  useEffect(() => () => photoPreview && URL.revokeObjectURL(photoPreview), [photoPreview]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!photoFile) {
      setError('Please add a photo for your ID card.');
      return;
    }
    if (!/^[0-9+\s-]{8,15}$/.test(form.phone.trim())) {
      setError('Enter a valid phone number.');
      return;
    }
    setSubmitting(true);
    try {
      let photoUrl = '';
      try {
        const uploaded = await uploadImage(photoFile, 'avatars', { coreInvite: token });
        photoUrl = uploaded?.url || '';
      } catch (uploadErr) {
        console.warn('Primary R2 upload note, storing data URI:', uploadErr);
        photoUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(photoFile);
        });
      }

      const result = await submitCoreMember(token, { ...form, photoUrl });
      setMemberCode(result.memberCode);
      setStatus('done');
    } catch (err) {
      console.error('Core registration failed:', err);
      setError(
        err?.code === 'permission-denied'
          ? 'This registration link is no longer active. Ask your admin for a new one.'
          : err?.message || 'Could not submit. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-24 min-h-screen bg-black">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-red-500">SAMYAK 2026 · Internal</p>
        <h1 className="mt-3 !text-4xl sm:!text-5xl font-heading font-black text-white">Core Team Registration</h1>

        {status === 'checking' && (
          <div className="mt-10 flex items-center gap-3 text-white/70">
            <Loader2 className="w-5 h-5 animate-spin" /> Checking your link…
          </div>
        )}

        {status === 'closed' && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-[#080808] p-6">
            <Lock className="w-6 h-6 text-red-500" />
            <p className="mt-3 text-white">This registration link is invalid or has been closed.</p>
            <p className="mt-1 text-sm text-white/45">Ask the SAMYAK admin for a new link.</p>
          </div>
        )}

        {status === 'offline' && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-[#080808] p-6">
            <WifiOff className="w-6 h-6 text-red-500" />
            <p className="mt-3 text-white">Couldn't connect to check your link.</p>
            <p className="mt-1 text-sm text-white/45">Check your internet connection and try again.</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-4 min-h-[44px] px-5 rounded-xl border border-white/20 hover:border-red-600 text-sm text-white"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'done' && (
          <div className="mt-10 rounded-2xl border border-red-600/45 bg-[#080808] p-6">
            <CheckCircle2 className="w-6 h-6 text-red-500" />
            <p className="mt-3 text-lg text-white">You're registered.</p>
            <p className="mt-1 text-sm text-white/70">
              Your ID number is <span className="font-mono text-white">{memberCode}</span>. Your ID card will be printed by the admin.
            </p>
          </div>
        )}

        {status === 'open' && (
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-24 h-[120px] rounded-xl overflow-hidden border border-white/[0.12] bg-[#080808] flex-shrink-0 flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Your photo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-white/35 text-center px-2">Passport photo</span>
                )}
              </div>
              <label className="inline-flex items-center gap-2 min-h-[48px] px-4 rounded-xl border border-dashed border-white/20 text-sm text-white cursor-pointer hover:border-red-600 transition-colors">
                <Upload className="w-4 h-4" />
                {photoFile ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} className="sr-only" />
              </label>
            </div>
            <p className="-mt-2 text-xs text-white/45">Clear, front-facing photo. JPG, PNG or WebP, up to 5 MB.</p>

            <Field label="Full name">
              <input required maxLength={80} value={form.name} onChange={set('name')} className={inputClass} autoComplete="name" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Role">
                <input required maxLength={60} value={form.role} onChange={set('role')} placeholder="e.g. Coordinator" className={inputClass} />
              </Field>
              <Field label="Team">
                <input required maxLength={60} value={form.team} onChange={set('team')} placeholder="e.g. Technical Wing" className={inputClass} />
              </Field>
              <Field label="Student ID">
                <input required maxLength={30} value={form.studentId} onChange={set('studentId')} className={inputClass} />
              </Field>
              <Field label="Branch">
                <input required maxLength={60} value={form.branch} onChange={set('branch')} placeholder="e.g. CSE" className={inputClass} />
              </Field>
              <Field label="Phone">
                <input required type="tel" inputMode="tel" maxLength={15} value={form.phone} onChange={set('phone')} className={inputClass} autoComplete="tel" />
              </Field>
              <Field label="Blood group">
                <select required value={form.bloodGroup} onChange={set('bloodGroup')} className={inputClass}>
                  <option value="" disabled>Select</option>
                  {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
            </div>

            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[52px] rounded-xl bg-red-600 hover:bg-red-400 disabled:bg-white/[0.08] disabled:text-white/35 text-white font-heading font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Submitting…' : 'Submit registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
