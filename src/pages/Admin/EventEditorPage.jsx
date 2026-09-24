import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Save, Upload, Sparkles, Plus, Trash2, 
  Image as ImageIcon, CheckCircle2, AlertCircle, Trophy,
  Calendar, Clock, MapPin, DollarSign, Shield, ExternalLink
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

const DEFAULT_EVENT_TEMPLATE = {
  title: '',
  category: 'Technical',
  department: 'CSE',
  club: 'RPA Club',
  date: 'March 14, 2026',
  time: '10:00 AM IST',
  venue: 'KL Cyber Dome, Lab Complex 4',
  prize: '₹1,00,000',
  fee: '₹499 / Team',
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
  tags: ['Technical', 'CSE']
};

export default function EventEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAdminAuth();
  const { events, departments, addEvent, updateEvent } = useSiteContent();

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
        return {
          ...DEFAULT_EVENT_TEMPLATE,
          ...found,
          registrationLink: found.registrationLink || 'https://samyak.kluniversity.in/register',
        };
      }
    }
    return { ...DEFAULT_EVENT_TEMPLATE };
  });

  // Redirect if not logged in as admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAdmin, navigate]);

  // Sync if editing and events loaded later
  useEffect(() => {
    if (id && events?.length > 0) {
      const found = events.find((e) => e.id === id);
      if (found) {
        setFormData((prev) => ({
          ...prev,
          ...found,
          registrationLink: found.registrationLink || prev.registrationLink || 'https://samyak.kluniversity.in/register',
        }));
      }
    }
  }, [id, events]);

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

    try {
      setSaving(true);
      if (isEditing) {
        await updateEvent(id, formData);
        showToast(`Event "${formData.title}" updated successfully!`);
      } else {
        await addEvent(formData);
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
    <div className="min-h-screen bg-neutral-950 text-slate-100 pb-20 select-none">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-neutral-900/95 border-red-500/60 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]'
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
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
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
                className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-red-500/40 text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
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

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Prize Pool</label>
                <input
                  type="text"
                  value={formData.prize}
                  onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Entry Fee</label>
                <input
                  type="text"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>
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
                <span>Event Banner &amp; Media Showcase</span>
              </div>
              {isEditing && (
                <Link
                  to={`/media?event=${id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-red-400 hover:text-white transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Media Library</span>
                </Link>
              )}
            </div>

            {/* 3A. Primary Event Banner */}
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase text-neutral-300 font-bold block">
                Primary Event Banner (Hero &amp; Card Artwork)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                {/* Image Preview */}
                <div className="h-44 sm:h-52 rounded-2xl border-2 border-dashed border-red-500/40 bg-neutral-950 overflow-hidden relative flex items-center justify-center">
                  {formData.image || formData.banner_url ? (
                    <img
                      src={formData.banner_url || formData.image}
                      alt="Event Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-mono text-neutral-600">No banner uploaded</span>
                  )}
                  {uploadingPoster && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs font-mono text-white">
                      Uploading to Cloudflare R2...
                    </div>
                  )}
                </div>

                {/* Upload & URL Controls */}
                <div className="sm:col-span-2 space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5">
                      Banner Image URL
                    </label>
                    <input
                      type="text"
                      value={formData.banner_url || formData.image}
                      onChange={(e) => setFormData({ ...formData, banner_url: e.target.value, image: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
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
                      className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 hover:border-red-500 text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <Upload className="w-4 h-4 text-red-500" />
                      <span>{uploadingPoster ? 'Uploading...' : 'Upload Banner to Cloudflare R2'}</span>
                    </button>
                    <span className="text-[11px] font-mono text-neutral-500">Stored at Cloudflare R2 samyak/banners</span>
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
              className="px-8 py-3 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading text-xs font-black uppercase tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.5)] flex items-center gap-2 transition-all hover:scale-102"
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
