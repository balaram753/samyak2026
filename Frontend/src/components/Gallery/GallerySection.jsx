import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  X, ZoomIn, Sparkles, Upload, Camera, Loader2,
  CheckCircle2, ExternalLink, Images, ChevronLeft,
  ChevronRight, Grid3X3, LayoutTemplate, Search, ArrowRight
} from 'lucide-react';
import { addContentDoc, setContentDoc, subscribeContent } from '../../services/contentStore';
import { uploadImage } from '../../services/r2Storage';
import { useSiteContent } from '../../context/SiteContentContext';
import { useUser } from '../../data/useUser';

/* ───────────────────────────────────────────────
   STATIC SEED DATA
───────────────────────────────────────────────── */
const INITIAL_GALLERY_ITEMS = [
  {
    id: 'g1', title: 'Cyber Colosseum Mega Arena',
    category: 'RoboWars', eventId: 'robowars-2026', eventTitle: 'RoboWars Mega Arena',
    image: '/hero-bg.png',
    caption: 'High-RPM combat robotics colliding inside the reinforced shatterproof arena.',
    featured: true,
  },
  {
    id: 'g2', title: 'SAMYAK Official Mascot',
    category: 'Mascot', image: '/mascot-robot.png',
    caption: 'The cybernetic ambassador welcoming delegates across national universities.',
    featured: false,
  },
  {
    id: 'g3', title: 'Futuristic Pyramid',
    category: 'Atmosphere', image: '/hero-bg.png',
    caption: 'The illuminated center structure during nighttime laser mapping tests.',
    featured: false,
  },
  {
    id: 'g4', title: 'National Techno-Management Symbol',
    category: 'Identity', image: '/samyak-logo-white.png',
    caption: 'The official typography and brand identity of SAMYAK 2026.',
    featured: false,
  },
  {
    id: 'g5', title: 'ProNite Laser & Sound Stage',
    category: 'Concert', image: '/hero-bg.png',
    caption: 'A stadium of 25,000 students united under kinetic laser beams.',
    featured: false,
  },
  {
    id: 'g6', title: 'KL University Emblem',
    category: 'Heritage', image: '/samyak-emblem.png',
    caption: 'The eternal flame and soaring wings representing visionary education.',
    featured: false,
  },
];

const CATEGORIES = ['All', 'RoboWars', 'Atmosphere', 'Mascot', 'Identity', 'Concert', 'Heritage'];

const CAT_COLOR = {
  RoboWars:   'bg-red-500/20 border-red-500/40 text-red-300',
  Atmosphere: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  Mascot:     'bg-violet-500/20 border-violet-500/40 text-violet-300',
  Identity:   'bg-amber-500/20 border-amber-500/40 text-amber-300',
  Concert:    'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  Heritage:   'bg-rose-500/20 border-rose-500/40 text-rose-300',
};
function catCls(cat) { return CAT_COLOR[cat] || 'bg-neutral-700/30 border-neutral-700 text-neutral-300'; }

/* ───────────────────────────────────────────────
   LIGHTBOX
───────────────────────────────────────────────── */
function Lightbox({ items, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);

  const prev = useCallback(() => setIdx(i => (i - 1 + items.length) % items.length), [items.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % items.length), [items.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  const item = items[idx];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-xl p-4"
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-white/10 hover:bg-red-600/80 border border-white/15 text-white transition-all cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-5 z-20 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs font-mono text-white/70">
        {idx + 1} / {items.length}
      </div>

      {/* Prev */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className="absolute left-3 sm:left-6 z-20 p-3 rounded-full bg-black/60 border border-white/10 hover:bg-red-600/80 hover:border-red-400 text-white transition-all cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Next */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); next(); }}
        className="absolute right-3 sm:right-6 z-20 p-3 rounded-full bg-black/60 border border-white/10 hover:bg-red-600/80 hover:border-red-400 text-white transition-all cursor-pointer"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Image */}
      <motion.div
        key={idx}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-4xl w-full max-h-[82vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.9)]">
          <img
            src={item.image}
            alt={item.title}
            className="w-full max-h-[65vh] object-contain bg-neutral-950"
          />
        </div>

        {/* Caption bar */}
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${catCls(item.category)} mb-2`}>
              {item.category}
            </span>
            <h3 className="text-base sm:text-lg font-black font-heading text-white">{item.title}</h3>
            <p className="text-sm text-neutral-400 font-cyber mt-0.5">{item.caption}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────────────────────────
   MASONRY / BENTO CARD
───────────────────────────────────────────────── */
function GalleryCard({ item, index, onOpen }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.45, delay: (index % 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer border border-neutral-800/60
        hover:border-red-500/40 transition-all duration-400
        hover:shadow-[0_0_35px_rgba(223,37,49,0.18)]
        ${item.featured ? 'md:col-span-2 md:row-span-2' : ''}`}
      onClick={() => onOpen(index)}
    >
      {/* Image */}
      <div className="relative w-full h-full overflow-hidden" style={{ minHeight: item.featured ? '420px' : '220px' }}>
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ minHeight: 'inherit' }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Hover zoom icon */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <div className="p-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/10">
            <ZoomIn className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Featured badge */}
        {item.featured && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600/90 border border-red-400/50 text-white text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-2.5 h-2.5" />
              Featured
            </span>
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${catCls(item.category)} mb-2`}>
            {item.category}
          </span>
          <h3 className="text-sm sm:text-base font-black font-heading text-white leading-snug tracking-wide">
            {item.title}
          </h3>
          <p className="text-xs text-neutral-300/80 font-cyber mt-0.5 line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {item.caption}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ───────────────────────────────────────────────
   UPLOAD MODAL
───────────────────────────────────────────────── */
function UploadModal({ events, onClose, onUploaded }) {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle]     = useState('');
  const [cat, setCat]         = useState('Atmosphere');
  const [eventId, setEventId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState(null);
  const fileRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a photo.'); return; }
    try {
      setUploading(true);
      setError(null);
      const result = await uploadImage(file, 'gallery');
      const matchedEv = events?.find(ev => ev.id === eventId);
      const newItem = {
        id: 'up_' + Date.now(),
        title: title || 'Samyak Memory',
        category: cat,
        eventId: eventId || null,
        eventTitle: matchedEv?.title || null,
        image: result.url,
        caption: `Uploaded live by festival delegate${matchedEv ? ` for ${matchedEv.title}` : ''}.`,
        featured: false,
      };
      await addContentDoc('gallery_photos', {
        title: newItem.title, category: newItem.category,
        event_id: newItem.eventId, event_title: newItem.eventTitle,
        imageUrl: result.url, thumbUrl: result.thumbUrl || result.url,
        storage_path: result.key,
        uploadedAt: Date.now(),
      });
      if (eventId) {
        const mediaDocId = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        await setContentDoc('media_files', mediaDocId, {
          id: mediaDocId, event_id: eventId, folder_id: 'root',
          name: file.name, url: result.url, thumb_url: result.thumbUrl || result.url,
          storage_path: result.key,
          caption: newItem.title, size: file.size, type: file.type,
          created_by: 'Delegate', timestamp: Date.now(),
        }, { merge: false });
      }
      setSuccess(true);
      onUploaded(newItem);
      setTimeout(() => { setSuccess(false); onClose(); }, 2000);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 30 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.9)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-0">
          <div className="h-[2px] absolute top-0 left-0 right-0 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Camera className="w-4 h-4 text-red-400" />
                <span className="text-xs font-mono text-red-400 uppercase tracking-widest">Upload Photo</span>
              </div>
              <h3 className="text-xl font-black font-heading text-white uppercase tracking-tight">Share Your Memory</h3>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden
              ${preview ? 'border-red-500/60' : 'border-neutral-700 hover:border-neutral-500'}`}
            style={{ minHeight: '160px' }}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            {preview ? (
              <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-2xl opacity-80" />
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-neutral-500">
                <Camera className="w-8 h-8" />
                <span className="text-xs font-mono">Click to select or drop image</span>
              </div>
            )}
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder="Photo title (optional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white placeholder:text-neutral-600 font-cyber focus:outline-none focus:border-red-500/60 transition-all"
          />

          {/* Category */}
          <select
            value={cat}
            onChange={e => setCat(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white font-cyber focus:outline-none focus:border-red-500/60 transition-all"
          >
            {CATEGORIES.filter(c => c !== 'All').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Event (optional) */}
          {events?.length > 0 && (
            <select
              value={eventId}
              onChange={e => setEventId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 font-cyber focus:outline-none focus:border-red-500/60 transition-all"
            >
              <option value="">No specific event</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
          )}

          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

          <button
            type="submit"
            disabled={uploading || success}
            className="w-full py-3 rounded-2xl font-heading font-black text-sm tracking-widest uppercase text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-500 border border-red-400/40 shadow-[0_0_25px_rgba(223,37,49,0.4)] hover:shadow-[0_0_40px_rgba(223,37,49,0.7)] disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {success ? <><CheckCircle2 className="w-4 h-4" /> Uploaded!</> :
             uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> :
             <><Upload className="w-4 h-4" /> Submit Photo</>}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────────────────────────
   MAIN GALLERY SECTION
───────────────────────────────────────────────── */
export default function GallerySection({ limit = null, isHomePage = false }) {
  const { events } = useSiteContent();
  const { currentUser, loginWithGoogle } = useUser();

  // Photos go straight into the SAMYAK bucket, so uploading needs an account.
  const openUpload = async () => {
    if (!currentUser) {
      try {
        await loginWithGoogle();
      } catch {
        return;
      }
    }
    setUploadOpen(true);
  };

  const [items, setItems]           = useState(INITIAL_GALLERY_ITEMS);
  const [filter, setFilter]         = useState('All');
  const [search, setSearch]         = useState('');
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewMode, setViewMode]     = useState('bento'); // 'bento' | 'grid'

  const headerRef  = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  // Live gallery (Cloudflare D1: gallery_photos), newest first
  useEffect(() => subscribeContent('gallery_photos', { limit: 300 }, (docs) => {
    if (!docs.length) return;
    const live = docs.map((data) => ({
      id: data.id,
      title: data.title || 'Festival Memory',
      category: data.category || 'Atmosphere',
      eventId: data.event_id || data.eventId || null,
      eventTitle: data.event_title || data.eventTitle || null,
      image: data.imageUrl || data.image || '/hero-bg.png',
      caption: data.caption || 'Uploaded live by festival delegates.',
      featured: false,
    }));
    const merged = [...live];
    for (const init of INITIAL_GALLERY_ITEMS) {
      if (!merged.some(m => m.id === init.id)) merged.push(init);
    }
    setItems(merged);
  }, (err) => console.warn('Gallery load note:', err.message)), []);

  const filtered = items.filter(item => {
    const matchCat  = filter === 'All' || item.category === filter;
    const matchSearch = !search.trim() ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const displayedItems = limit ? filtered.slice(0, limit) : filtered;

  const handleUploaded = (newItem) => {
    setItems(prev => [newItem, ...prev]);
  };

  return (
    <section id="gallery" className="relative py-24 sm:py-32 bg-black overflow-hidden">

      {/* Background atmosphere */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
      <div className="absolute top-1/4 left-0 w-[700px] h-[700px] bg-red-600/[0.05] rounded-full blur-[200px] pointer-events-none -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-violet-600/[0.04] rounded-full blur-[180px] pointer-events-none translate-x-1/3" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 4px)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ══ HEADER ═══════════════════════════════════════ */}
        <div ref={headerRef} className="text-center mb-14 sm:mb-18">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-xs font-mono text-red-400 uppercase tracking-widest mb-5"
          >
            <Images className="w-3.5 h-3.5 animate-pulse" />
            Visual Odyssey
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black font-heading text-white tracking-tight uppercase leading-none"
          >
            SAMYAK{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-red-600 text-glow-red">
              GALLERY
            </span>
          </motion.h2>

        </div>

        {/* ══ TOOLBAR ══════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">

          {/* Category filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider whitespace-nowrap flex-shrink-0 transition-all duration-300 cursor-pointer ${
                  filter === cat
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border border-red-400/50 shadow-[0_0_20px_rgba(223,37,49,0.5)]'
                    : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white hover:border-neutral-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 font-cyber focus:outline-none focus:border-red-500/60 w-36 transition-all"
              />
            </div>

            {/* View mode */}
            <div className="flex items-center p-1 rounded-xl bg-neutral-950 border border-neutral-800">
              <button type="button" onClick={() => setViewMode('bento')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'bento' ? 'bg-red-600 text-white' : 'text-neutral-500 hover:text-white'}`}>
                <LayoutTemplate className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-neutral-500 hover:text-white'}`}>
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Upload CTA */}
            <button
              type="button"
              onClick={openUpload}
              title={currentUser ? 'Upload a photo' : 'Sign in to upload a photo'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-heading font-black uppercase tracking-wider border border-red-400/40 shadow-[0_0_15px_rgba(223,37,49,0.4)] hover:shadow-[0_0_25px_rgba(223,37,49,0.6)] transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        </div>

        {/* ══ COUNT ════════════════════════════════════════ */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <span className="text-xs font-mono text-neutral-500">
            {limit ? (
              <>Showing top <strong className="text-white">{displayedItems.length}</strong> of <strong className="text-white">{filtered.length}</strong> {filter !== 'All' ? filter : ''} memories</>
            ) : (
              <>Showing <strong className="text-white">{filtered.length}</strong> {filter !== 'All' ? filter : ''} memories</>
            )}
          </span>
          {limit && (
            <Link to="/gallery" className="text-xs font-mono text-red-400 hover:text-red-300 flex items-center gap-1 group">
              <span>Explore All Memories ({items.length}+)</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>

        {/* ══ GALLERY GRID ═════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {displayedItems.length > 0 ? (
            <motion.div
              key={`${filter}-${viewMode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={
                viewMode === 'bento'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-[220px] gap-4'
                  : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'
              }
            >
              {displayedItems.map((item, idx) => (
                <GalleryCard
                  key={item.id}
                  item={viewMode === 'grid' ? { ...item, featured: false } : item}
                  index={idx}
                  onOpen={(i) => setLightboxIdx(i)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-24 text-center"
            >
              <Camera className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <p className="text-neutral-500 font-cyber text-sm">No photos match this filter.</p>
              <button type="button" onClick={() => { setFilter('All'); setSearch(''); }}
                className="mt-4 px-5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white font-mono transition-all cursor-pointer">
                Clear Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View All Button on Homepage */}
        {(isHomePage || limit) && (
          <div className="mt-14 text-center">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-heading font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(223,37,49,0.4)] hover:shadow-[0_0_35px_rgba(223,37,49,0.6)] transition-all cursor-pointer group border border-red-400/40"
            >
              <Images className="w-4 h-4 text-red-200 group-hover:scale-110 transition-transform" />
              <span>Explore Full SAMYAK Gallery ({items.length}+ Memories)</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform" />
            </Link>
          </div>
        )}

      </div>

      {/* ══ LIGHTBOX ════════════════════════════════════ */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox
            items={displayedItems}
            startIndex={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </AnimatePresence>

      {/* ══ UPLOAD MODAL ════════════════════════════════ */}
      <AnimatePresence>
        {uploadOpen && (
          <UploadModal
            events={events}
            onClose={() => setUploadOpen(false)}
            onUploaded={handleUploaded}
          />
        )}
      </AnimatePresence>

    </section>
  );
}
