import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Save, Upload, Sparkles, Plus, Trash2, 
  Image as ImageIcon, CheckCircle2, AlertCircle, Trophy,
  Calendar, Clock, MapPin, DollarSign, Shield, ExternalLink, Star
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useSiteContent } from '../../context/SiteContentContext';
import { uploadImage } from '../../services/r2Storage';
import { EVENTS_DATA } from '../../data/events';

const EVENT_CATEGORIES = [
  'Technical',
  'Cultural',
  'Workshops',
  'Competitions',
  'Gaming',
  'Entertainment'
];

// "₹1,00,000" / "₹499 / Team" -> 100000 / 499 (only the first number counts)
function parseAmount(value) {
  const match = String(value || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function formatRupees(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

// Yes / No question; the amount box only appears (and only counts) on "Yes".
function AmountQuestion({ label, question, enabled, amount, onChange }) {
  return (
    <div className="space-y-2">
      <span className="block text-xs font-mono uppercase text-neutral-400">{label}</span>
      <p className="text-xs text-neutral-300">{question}</p>
      <div className="flex gap-2" role="radiogroup" aria-label={question}>
        {[['Yes', true], ['No', false]].map(([text, value]) => (
          <button
            key={text}
            type="button"
            role="radio"
            aria-checked={enabled === value}
            onClick={() => onChange({ enabled: value, amount })}
            className={`min-h-[44px] flex-1 rounded-xl border text-xs font-mono font-bold uppercase transition-colors ${
              enabled === value
                ? 'bg-red-600 border-red-600 text-white'
                : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-red-500'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
      {enabled && (
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">₹</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            required
            placeholder="Amount"
            aria-label={`${label} amount in rupees`}
            value={amount || ''}
            onChange={(e) => onChange({ enabled: true, amount: e.target.value === '' ? '' : Number(e.target.value) })}
            className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
          />
        </div>
      )}
    </div>
  );
}

// Older events stored free text; derive the yes/no + amount fields from it.
function withMoneyFields(event) {
  const prizeAmount = event.prizeAmount ?? parseAmount(event.prize);
  const feeAmount = event.feeAmount ?? parseAmount(event.fee);
  return {
    ...event,
    hasPrize: event.hasPrize ?? prizeAmount > 0,
    prizeAmount: prizeAmount || '',
    hasFee: event.hasFee ?? feeAmount > 0,
    feeAmount: feeAmount || '',
  };
}

const DEFAULT_EVENT_TEMPLATE = {
  title: '',
  category: 'Technical',
  department: 'CSE',
  club: 'RPA Club',
  featured: false,
  date: 'March 14, 2026',
  time: '10:00 AM IST',
  venue: 'KL Cyber Dome, Lab Complex 4',
  prize: '',
  fee: 'Free',
  hasPrize: false,
  prizeAmount: '',
  hasFee: false,
  feeAmount: '',
  registrationStatus: 'Open',
  registrationLink: 'https://samyak.kluniversity.in/register',
  image: '/hero-bg.png',
  banner_url: '/hero-bg.png',
  gallery: [],
  shortDescription: '',
  fullDescription: '',
  eligibility: 'Open to all undergraduate and postgraduate students from recognized colleges.',
  rules: [
    'Standard tournament and festival ethics apply.',
    'Valid student identity card mandatory upon physical check-in.',
    'Decision of the jury and faculty leads will be final and binding.'
  ],
  coordinators: [
    { name: 'Student Coordinator', role: 'Event Lead', phone: '+91 98480 12345' }
  ],
  tags: ['Technical', 'CSE'],
  displayOrder: 0,
  isCancelled: false,
  cancellationReason: '',
};

export default function EventEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, adminLoading } = useAdminAuth();
  const { events, departments, loadingContent, addEvent, updateEvent } = useSiteContent();

  const fileInputRef = useRef(null);
  const galleryFileInputRef = useRef(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryInputUrl, setGalleryInputUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const isEditing = Boolean(id);

  const [formData, setFormData] = useState(() => {
    if (id) {
      const found = (events && events.length > 0 ? events : EVENTS_DATA).find((e) => e.id === id);
      if (found) {
        return withMoneyFields({
          ...DEFAULT_EVENT_TEMPLATE,
          ...found,
          registrationLink: found.registrationLink || 'https://samyak.kluniversity.in/register',
        });
      }
    }
    return { ...DEFAULT_EVENT_TEMPLATE };
  });

  // Redirect if not logged in as admin
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAdmin, adminLoading, navigate]);

  // Sync once if editing and the saved event arrives after the first render.
  // Events are re-polled every 20s; syncing again would wipe unsaved edits.
  const syncedEventRef = useRef(false);
  useEffect(() => {
    if (!id || syncedEventRef.current || loadingContent) return;
    syncedEventRef.current = true;
    const found = events?.find((e) => e.id === id);
    if (found) {
      setFormData((prev) => withMoneyFields({
        ...prev,
        ...found,
        registrationLink: found.registrationLink || prev.registrationLink || 'https://samyak.kluniversity.in/register',
      }));
    }
  }, [id, events, loadingContent]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePosterUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPoster(true);
      const res = await uploadImage(file, 'banners');
      setFormData((prev) => ({ 
        ...prev, 
        image: res.url,
        banner_url: res.url 
      }));
      showToast('Poster uploaded successfully to Cloudflare R2!');
    } catch (err) {
      showToast('Poster upload failed: ' + err.message, 'error');
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleAddGalleryUrl = () => {
    if (!galleryInputUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      gallery: [...(prev.gallery || []), galleryInputUrl.trim()]
    }));
    setGalleryInputUrl('');
    showToast('Showcase image URL added!');
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      setUploadingGallery(true);
      const uploadedUrls = [];
      for (const file of files) {
        const res = await uploadImage(file, 'event_gallery');
        uploadedUrls.push(res.url);
      }
      setFormData((prev) => ({
        ...prev,
        gallery: [...(prev.gallery || []), ...uploadedUrls]
      }));
      showToast(`Added ${uploadedUrls.length} showcase photo${uploadedUrls.length > 1 ? 's' : ''}!`);
    } catch (err) {
      showToast('Showcase upload failed: ' + err.message, 'error');
    } finally {
      setUploadingGallery(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  const handleRemoveGalleryImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      gallery: (prev.gallery || []).filter((_, i) => i !== index)
    }));
  };

  // Rule management
  const handleAddRule = () => {
    setFormData((prev) => ({
      ...prev,
      rules: [...(prev.rules || []), '']
    }));
  };

  const handleRuleChange = (index, value) => {
    const updated = [...(formData.rules || [])];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, rules: updated }));
  };

  const handleDeleteRule = (index) => {
    const updated = (formData.rules || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, rules: updated }));
  };

  // Coordinator management
  const handleAddCoordinator = () => {
    setFormData((prev) => ({
      ...prev,
      coordinators: [...(prev.coordinators || []), { name: '', role: '', phone: '' }]
    }));
  };

  const handleCoordinatorChange = (index, field, value) => {
    const updated = [...(formData.coordinators || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, coordinators: updated }));
  };

  const handleDeleteCoordinator = (index) => {
    const updated = (formData.coordinators || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, coordinators: updated }));
  };

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Event title is required.', 'error');
      return;
    }
    if (formData.hasPrize && !(Number(formData.prizeAmount) > 0)) {
      showToast('Enter the prize pool amount, or choose "No".', 'error');
      return;
    }
    if (formData.hasFee && !(Number(formData.feeAmount) > 0)) {
      showToast('Enter the entry fee amount, or choose "No".', 'error');
      return;
    }

    // prize / fee stay display strings so every existing page keeps working.
    const isCancelled = Boolean(formData.isCancelled);
    const payload = {
      ...formData,
      displayOrder: Number(formData.displayOrder) || 0,
      // Tags aren't editable; keep them in step with category + department.
      tags: [formData.category, formData.department].filter(Boolean),
      isCancelled,
      cancellationReason: formData.cancellationReason || '',
      registrationStatus: isCancelled ? 'Cancelled' : (formData.registrationStatus === 'Cancelled' ? 'Open' : (formData.registrationStatus || 'Open')),
      prizeAmount: formData.hasPrize ? Number(formData.prizeAmount) : 0,
      feeAmount: formData.hasFee ? Number(formData.feeAmount) : 0,
      prize: formData.hasPrize ? formatRupees(formData.prizeAmount) : '',
      fee: formData.hasFee ? formatRupees(formData.feeAmount) : 'Free',
    };

    try {
      setSaving(true);
      if (isEditing) {
        await updateEvent(id, payload);
        showToast(`Event "${formData.title}" updated successfully!`);
      } else {
        await addEvent(payload);
        showToast(`Event "${formData.title}" published live!`);
      }

      setTimeout(() => {
        navigate('/samyakadmin/events');
      }, 1000);
    } catch (err) {
      showToast('Failed to save event: ' + err.message, 'error');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100 pb-20">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-neutral-900/95 border-red-500/60 text-white shadow-[0_0_30px_rgba(223,37,49,0.3)]'
                : 'bg-red-950/95 border-red-500 text-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-red-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="text-xs sm:text-sm font-mono">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-black/90 border-b border-red-500/20 backdrop-blur-xl px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/samyakadmin/events')}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4 text-red-500" />
            <span>Cancel &amp; Return</span>
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-black font-heading text-white tracking-wide flex items-center gap-2">
              <span>{isEditing ? 'EDIT EVENT' : 'CREATE NEW EVENT'}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400">
                {formData.department}
              </span>
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(223,37,49,0.5)] flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Event'}</span>
        </button>
      </header>

      {/* Form Body */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Core Details & Academic Department */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/70 border border-neutral-800 space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider border-b border-neutral-800 pb-3">
              <Sparkles className="w-4 h-4" />
              <span>Basic Information &amp; Academic Alignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RPA Bot Sprint: Autonomous Process Challenge"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Star / Feature on Home Page Toggle */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border transition-colors ${formData.featured ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}>
                    <Star className={`w-5 h-5 ${formData.featured ? 'fill-amber-400' : ''}`} />
                  </div>
                  <div>
                    <div className="text-sm font-heading font-black text-white uppercase tracking-wide flex items-center gap-2">
                      <span>Feature on Home Page (1080×1350 Showcase)</span>
                      {formData.featured && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Active on Home
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400 font-cyber">
                      Stars this competition to be displayed in the animated 1080×1350 dual-scrolling poster showcase on the homepage.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                    formData.featured
                      ? 'bg-amber-500 text-black shadow-[0_0_18px_rgba(223,37,49,0.6)] font-black'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${formData.featured ? 'fill-black' : ''}`} />
                  <span>{formData.featured ? '★ Starred' : '☆ Not Starred'}</span>
                </button>
              </div>

              {/* Display Order Priority (Order of Displaying) */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <label className="block text-xs font-mono uppercase text-neutral-300 font-bold flex items-center justify-between">
                  <span>Display Order Priority</span>
                  <span className="text-[10px] font-mono text-red-400">1 = First, 2 = Second, 3...</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 1 (lower numbers display first)"
                  value={formData.displayOrder ?? 0}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
                <p className="text-[11px] text-neutral-400 font-cyber">
                  Defines the exact showcase ordering of this event on the events page and posters showcase.
                </p>
              </div>

              {/* Event Cancellation Control (Cancel Event) */}
              <div className={`sm:col-span-2 p-5 rounded-2xl border transition-all ${
                formData.isCancelled 
                  ? 'bg-red-950/80 border-red-500 shadow-[0_0_30px_rgba(223,37,49,0.4)]' 
                  : 'bg-neutral-950 border-neutral-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border mt-0.5 ${formData.isCancelled ? 'bg-red-600/30 border-red-500 text-red-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}>
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-heading font-black text-white uppercase tracking-wide flex items-center gap-2">
                        <span>Event Status: {formData.isCancelled ? 'CANCELLED' : 'ACTIVE / LIVE'}</span>
                        {formData.isCancelled && (
                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold">
                            Cancellation Alert Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 font-cyber mt-0.5 max-w-xl">
                        {formData.isCancelled
                          ? 'This event is marked as CANCELLED. On the user portal, registration will be locked, an alert prompting to register for another event will be shown, and all events happening at the same time will be displayed.'
                          : 'Cancel this event if it has been called off. Users will see a cancellation notice and all other events at the same time will be recommended.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !formData.isCancelled;
                      setFormData({ 
                        ...formData, 
                        isCancelled: next, 
                        registrationStatus: next ? 'Cancelled' : (formData.registrationStatus === 'Cancelled' ? 'Open' : formData.registrationStatus) 
                      });
                    }}
                    className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                      formData.isCancelled
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700'
                    }`}
                  >
                    {formData.isCancelled ? '✕ Event Cancelled (Click to Restore)' : 'Cancel This Event'}
                  </button>
                </div>

                {formData.isCancelled && (
                  <div className="mt-4 pt-4 border-t border-red-500/30 space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase text-red-300 font-bold">
                      Cancellation Reason / Notice to Delegates (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. This event was cancelled. Please register for another event happening at the same time below."
                      value={formData.cancellationReason || ''}
                      onChange={(e) => setFormData({ ...formData, cancellationReason: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black border border-red-500/50 text-xs font-mono text-white placeholder-red-400/50 focus:outline-none focus:border-red-400"
                    />
                  </div>
                )}
              </div>

              {/* Academic Department Selector */}
              <div>
                <label className="block text-xs font-mono uppercase text-red-400 font-bold mb-1.5">
                  Academic Department *
                </label>
                <select
                  value={formData.department || 'CSE'}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value, club: '' })}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-700 text-sm font-mono text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  {departments?.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Filter Club Selector */}
              <div>
                <label className="block text-xs font-mono uppercase text-red-400 font-bold mb-1.5">
                  Sub-Filter Club / Domain *
                </label>
                <select
                  value={formData.club || ''}
                  onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-700 text-sm font-mono text-white focus:outline-none focus:border-red-500 cursor-pointer mb-2"
                >
                  <option value="">-- Select from {formData.department} Clubs --</option>
                  {departments
                    ?.find((d) => d.code.toLowerCase() === (formData.department || 'CSE').toLowerCase())
                    ?.clubs?.map((club) => (
                      <option key={club} value={club}>
                        {club}
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter custom club name..."
                  value={formData.club || ''}
                  onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5">
                  Festival Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm font-mono text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Registration Status */}
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5">
                  Registration Status
                </label>
                <select
                  value={formData.registrationStatus || 'Open'}
                  onChange={(e) => setFormData({ ...formData, registrationStatus: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm font-mono text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="Open">Open</option>
                  <option value="Fast Filling">Fast Filling</option>
                  <option value="Closed">Closed</option>
                  <option value="Included with Pass">Included with Pass</option>
                </select>
              </div>

            </div>
          </div>

          {/* Section 2: Registration Link, Schedule, Venue & Fees */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/70 border border-neutral-800 space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider border-b border-neutral-800 pb-3">
              <Calendar className="w-4 h-4" />
              <span>Registration Link, Logistics &amp; Prize Pool</span>
            </div>

            {/* Default Registration Link */}
            <div>
              <label className="block text-xs font-mono uppercase text-red-400 font-bold mb-1.5 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Default Event Registration Link *</span>
              </label>
              <input
                type="text"
                required
                placeholder="https://samyak.kluniversity.in/register"
                value={formData.registrationLink}
                onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-red-500/40 text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-red-500 shadow-[0_0_15px_rgba(223,37,49,0.15)]"
              />
              <span className="text-[11px] font-mono text-neutral-500 mt-1 block">
                Default link pre-filled. Delegates clicking &quot;Register Now&quot; on this event will be directed here.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Date</label>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Time</label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <AmountQuestion
                label="Prize Pool"
                question="Does this event have a prize pool?"
                enabled={Boolean(formData.hasPrize)}
                amount={formData.prizeAmount}
                onChange={({ enabled, amount }) => setFormData((prev) => ({ ...prev, hasPrize: enabled, prizeAmount: amount }))}
              />

              <AmountQuestion
                label="Entry Fee"
                question="Does this event have an entry fee?"
                enabled={Boolean(formData.hasFee)}
                amount={formData.feeAmount}
                onChange={({ enabled, amount }) => setFormData((prev) => ({ ...prev, hasFee: enabled, feeAmount: amount }))}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Venue Location</label>
              <input
                type="text"
                placeholder="e.g. KL Cyber Dome, Lab Complex 4"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
              />
            </div>

          </div>

          {/* Section 3: Event Banner & Showcase Gallery */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/70 border border-neutral-800 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                <ImageIcon className="w-4 h-4" />
                <span>Event Banner &amp; Showcase</span>
              </div>
            </div>

            {/* 3A. Primary Event Banner */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2">
                <div>
                  <span className="text-xs font-mono uppercase text-white font-bold block">
                    Official Event Poster (1080×1350 - 4:5 Portrait)
                  </span>
                  <span className="text-[11px] font-cyber text-neutral-400">
                    Primary showcase artwork displayed across festival arenas, cards, and home 3D showcases.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-red-300 bg-red-950/80 px-2.5 py-1 rounded-full border border-red-500/40">
                    Target: 1080 × 1350 px (4:5)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Image Preview - 4:5 Aspect Ratio */}
                <div className="md:col-span-4 flex flex-col items-center">
                  <div className="w-full max-w-[240px] aspect-[4/5] rounded-2xl border-2 border-dashed border-red-500/50 bg-black overflow-hidden relative flex items-center justify-center shadow-xl">
                    {formData.image || formData.banner_url ? (
                      <img
                        src={formData.banner_url || formData.image}
                        alt="Event Banner Preview"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/hero-bg.png';
                        }}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <ImageIcon className="w-8 h-8 text-neutral-600 mb-2" />
                        <span className="text-xs font-mono text-neutral-500">No poster uploaded</span>
                        <span className="text-[10px] font-mono text-neutral-600 mt-1">1080 × 1350 recommended</span>
                      </div>
                    )}
                    {uploadingPoster && (
                      <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 text-xs font-mono text-white p-4 text-center">
                        <span className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <span>Uploading to Cloudflare R2...</span>
                      </div>
                    )}
                  </div>

                  {(formData.banner_url || formData.image) && (
                    <a
                      href={formData.banner_url || formData.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-mono text-red-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open full-resolution image</span>
                    </a>
                  )}
                </div>

                {/* Upload & URL Controls */}
                <div className="md:col-span-8 space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-neutral-300 font-bold mb-1.5">
                      Poster Image URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://... or upload to Cloudflare R2 below"
                      value={formData.banner_url || formData.image}
                      onChange={(e) => setFormData({ ...formData, banner_url: e.target.value, image: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-red-500"
                    />
                    <span className="text-[10px] font-mono text-neutral-500 mt-1 block">
                      Direct image link or Cloudflare R2 public URL. The poster updates in the preview frame above instantly.
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <span className="text-xs font-mono uppercase text-neutral-400 block font-bold">
                      Direct Cloudflare R2 Upload
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePosterUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploadingPoster}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4 text-white" />
                        <span>{uploadingPoster ? 'Uploading to R2...' : 'Select File & Upload to R2'}</span>
                      </button>
                      <span className="text-[11px] font-mono text-neutral-400">
                        Target path: <code className="text-red-400">samyak/banners/</code>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3B. Event Showcase Gallery (gallery[]) */}
            <div className="pt-6 border-t border-neutral-800/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono uppercase text-neutral-300 font-bold block">
                    Event Showcase Gallery ({formData.gallery?.length || 0} images)
                  </span>
                  <span className="text-[11px] font-cyber text-neutral-400">
                    Additional showcase photos displayed directly on the event details page.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={galleryFileInputRef}
                    multiple
                    onChange={handleGalleryUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingGallery}
                    onClick={() => galleryFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-red-500 text-xs font-mono text-white flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-red-400" />
                    <span>{uploadingGallery ? 'Uploading...' : 'Upload Photos'}</span>
                  </button>
                </div>
              </div>

              {/* Add by URL input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={galleryInputUrl}
                  onChange={(e) => setGalleryInputUrl(e.target.value)}
                  placeholder="Paste showcase image URL..."
                  className="flex-1 px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={handleAddGalleryUrl}
                  disabled={!galleryInputUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-mono font-bold uppercase cursor-pointer"
                >
                  Add URL
                </button>
              </div>

              {/* Gallery Thumbnails Grid */}
              {formData.gallery && formData.gallery.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                  {formData.gallery.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-video rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden"
                    >
                      <img
                        src={imgUrl}
                        alt={`Gallery ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(idx)}
                          className="p-1.5 rounded-lg bg-red-600 text-white cursor-pointer"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center border border-dashed border-neutral-800/80 rounded-2xl p-4 text-xs font-mono text-neutral-500">
                  No showcase gallery images added yet. Upload photos or paste URLs above.
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Descriptions & Eligibility */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/70 border border-neutral-800 space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider border-b border-neutral-800 pb-3">
              <Shield className="w-4 h-4" />
              <span>Descriptions &amp; Eligibility</span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                Short Description (Card summary)
              </label>
              <textarea
                rows={2}
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-cyber text-white placeholder-neutral-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                Full Description (Detailed overview on event details page)
              </label>
              <textarea
                rows={4}
                value={formData.fullDescription}
                onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-cyber text-white placeholder-neutral-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                Eligibility Criteria
              </label>
              <input
                type="text"
                value={formData.eligibility}
                onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-cyber text-white placeholder-neutral-600 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Section 5: Rules & Regulations Editor */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/70 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Rules &amp; Guidelines</span>
              </div>
              <button
                type="button"
                onClick={handleAddRule}
                className="text-xs font-mono text-red-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {(formData.rules || []).map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-mono text-neutral-500">{idx + 1}.</span>
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => handleRuleChange(idx, e.target.value)}
                    placeholder={`Rule #${idx + 1}...`}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-cyber text-white focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(idx)}
                    className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Coordinators Editor */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/70 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                <Shield className="w-4 h-4" />
                <span>Event Coordinators &amp; Faculty Leads</span>
              </div>
              <button
                type="button"
                onClick={handleAddCoordinator}
                className="text-xs font-mono text-red-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Coordinator</span>
              </button>
            </div>

            <div className="space-y-3">
              {(formData.coordinators || []).map((coord, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 relative">
                  <input
                    type="text"
                    placeholder="Coordinator Name"
                    value={coord.name}
                    onChange={(e) => handleCoordinatorChange(idx, 'name', e.target.value)}
                    className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                  <input
                    type="text"
                    placeholder="Role (e.g. Student Lead, Faculty)"
                    value={coord.role}
                    onChange={(e) => handleCoordinatorChange(idx, 'role', e.target.value)}
                    className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={coord.phone}
                      onChange={(e) => handleCoordinatorChange(idx, 'phone', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteCoordinator(idx)}
                      className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => navigate('/samyakadmin/events')}
              className="px-6 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading text-xs font-black uppercase tracking-wider shadow-[0_0_25px_rgba(223,37,49,0.5)] flex items-center gap-2 transition-all hover:scale-102"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Event Live'}</span>
            </button>
          </div>

        </form>
      </main>

    </div>
  );
}
