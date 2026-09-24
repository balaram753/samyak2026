import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ZoomIn, Sparkles, Upload, Camera, Loader2, CheckCircle2, 
  Folder, ExternalLink, Filter, Calendar 
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../services/firebase';
import { uploadImage } from '../../services/r2Storage';
import { useSiteContent } from '../../context/SiteContentContext';

const INITIAL_GALLERY_ITEMS = [
  {
    id: 'g1',
    title: 'Cyber Colosseum Mega Arena',
    category: 'RoboWars',
    eventId: 'robowars-2026',
    eventTitle: 'RoboWars Mega Arena',
    image: '/hero-bg.png',
    span: 'col-span-1 md:col-span-2 row-span-2',
    caption: 'High-RPM combat robotics colliding inside the reinforced shatterproof arena.',
  },
  {
    id: 'g2',
    title: 'SAMYAK Official Mascot Experience',
    category: 'Mascot',
    image: '/mascot-robot.png',
    span: 'col-span-1 row-span-1',
    caption: 'The cybernetic ambassador welcoming delegates across national universities.',
  },
  {
    id: 'g3',
    title: 'Futuristic Architectural Pyramid',
    category: 'Atmosphere',
    image: '/hero-bg.png',
    span: 'col-span-1 row-span-1',
    caption: 'The illuminated center structure during nighttime laser mapping tests.',
  },
  {
    id: 'g4',
    title: 'National Techno-Management Symbol',
    category: 'Identity',
    image: '/samyak-logo-white.png',
    span: 'col-span-1 md:col-span-2 row-span-1',
    caption: 'The official typography and brand identity of SAMYAK 2026.',
  },
  {
    id: 'g5',
    title: 'ProNite Laser & Sound Stage',
    category: 'Concert',
    image: '/hero-bg.png',
    span: 'col-span-1 row-span-1',
    caption: 'A stadium of 25,000 students united under kinetic laser beams.',
  },
  {
    id: 'g6',
    title: 'KL University Emblem',
    category: 'Heritage',
    image: '/samyak-emblem.png',
    span: 'col-span-1 row-span-1',
    caption: 'The eternal flame and soaring wings representing visionary education.',
  },
];

export default function GallerySection() {
  const { events } = useSiteContent();
  const [galleryItems, setGalleryItems] = useState(INITIAL_GALLERY_ITEMS);
  const [activeImage, setActiveImage] = useState(null);
  const [filter, setFilter] = useState('All');
  const [selectedEventFilter, setSelectedEventFilter] = useState('All');

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Atmosphere');
  const [uploadEventId, setUploadEventId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Live subscription to Firestore 'gallery_photos'
  useEffect(() => {
    try {
      const q = query(collection(db, 'gallery_photos'), orderBy('uploadedAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const liveList = [];
          snapshot.forEach((d) => {
            const data = d.data();
            liveList.push({
              id: d.id,
              title: data.title || 'Festival Memory',
              category: data.category || 'Atmosphere',
              eventId: data.event_id || data.eventId || null,
              eventTitle: data.event_title || data.eventTitle || null,
              image: data.imageUrl || data.image || '/hero-bg.png',
              span: 'col-span-1 row-span-1',
              caption: data.caption || `Uploaded live by delegates${data.event_title ? ` for ${data.event_title}` : ''}.`,
            });
          });
          // Merge unique items with defaults
          const merged = [...liveList];
          for (const init of INITIAL_GALLERY_ITEMS) {
            if (!merged.some((m) => m.id === init.id)) {
              merged.push(init);
            }
          }
          setGalleryItems(merged);
        }
      }, (err) => {
        console.warn('Gallery photos snapshot note:', err.message);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Gallery photos listener setup note:', e);
    }
  }, []);

  const filtered = galleryItems.filter((item) => {
    const matchCat = filter === 'All' || item.category === filter;
    const matchEvent = selectedEventFilter === 'All' || item.eventId === selectedEventFilter;
    return matchCat && matchEvent;
  });

  const categories = ['All', 'RoboWars', 'Atmosphere', 'Mascot', 'Identity', 'Concert'];

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please choose a festival photo to upload.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      // Direct Cloudflare R2 upload (with fallback)
      const result = await uploadImage(uploadFile, 'gallery');

      const matchedEvent = events?.find((ev) => ev.id === uploadEventId);

      const newItem = {
        id: 'uploaded_' + Date.now(),
        title: uploadTitle || 'Samyak Community Memory',
        category: uploadCategory,
        eventId: uploadEventId || null,
        eventTitle: matchedEvent?.title || null,
        image: result.url,
        span: 'col-span-1 row-span-1',
        caption: `Uploaded live by festival delegate${matchedEvent ? ` for ${matchedEvent.title}` : ''}.`,
      };

      // Add to local state immediately
      setGalleryItems((prev) => [newItem, ...prev]);

      // Save record in Firestore gallery_photos
      try {
        await addDoc(collection(db, 'gallery_photos'), {
          title: newItem.title,
          category: newItem.category,
          event_id: newItem.eventId,
          event_title: newItem.eventTitle,
          imageUrl: result.url,
          thumbUrl: result.thumbUrl || result.url,
          uploadedAt: serverTimestamp(),
        });

        // Also if an event was selected, store in media_files collection so it appears in /media
        if (uploadEventId) {
          const mediaDocId = 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          await setDoc(doc(db, 'media_files', mediaDocId), {
            id: mediaDocId,
            event_id: uploadEventId,
            folder_id: 'root',
            name: uploadFile.name,
            url: result.url,
            thumb_url: result.thumbUrl || result.url,
            caption: newItem.title,
            size: uploadFile.size,
            type: uploadFile.type,
            created_by: 'Delegate',
            uploaded_at: serverTimestamp(),
            timestamp: Date.now(),
          });
        }
      } catch (fbErr) {
        console.warn('Firestore gallery record note:', fbErr.message);
      }

      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setUploadModalOpen(false);
        setUploadTitle('');
        setUploadEventId('');
        setUploadFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1500);
    } catch (err) {
      setUploadError('Failed to upload to ImgBB: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <section id="gallery" className="relative py-24 sm:py-32 bg-black overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            Visual Odyssey
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
            SAMYAK <span className="text-red-500 text-glow-red">GALLERY &amp; ARCHIVES</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 font-cyber">
            Moments of high-voltage competition, campus lighting, robotic engineering, and historic celebrations at KL University.
          </p>

          {/* Action Row: Category Filter + Event Filter + ImgBB Direct Upload Button */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-cyber uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    filter === cat
                      ? 'bg-red-600 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Event Filter Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
              <Filter className="w-3.5 h-3.5 text-red-400" />
              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                className="bg-transparent text-white text-xs outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="All" className="bg-neutral-900 text-white">All Events</option>
                {events?.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-neutral-900 text-white">
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="px-5 py-1.5 rounded-full font-heading text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo (ImgBB)</span>
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 auto-rows-[240px]">
          {filtered.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              onClick={() => setActiveImage(item)}
              className={`${item.span} min-h-[220px] relative rounded-2xl overflow-hidden cursor-pointer group cyber-card border border-neutral-800 hover:border-red-500/60 transition-all duration-300 shadow-lg flex items-center justify-center bg-neutral-950/90`}
            >
              <img
                src={item.image}
                alt={item.title}
                className={`w-full h-full ${
                  item.category === 'Identity' || item.category === 'Mascot' || item.category === 'Heritage'
                    ? 'object-contain p-8 sm:p-10 filter drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                    : 'object-cover filter contrast-110 brightness-85'
                } group-hover:scale-105 group-hover:brightness-100 transition-all duration-500`}
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

              {/* Hover Zoom Icon */}
              <div className="absolute top-4 right-4 p-2 rounded-full bg-neutral-950/80 border border-neutral-700 text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110">
                <ZoomIn className="w-4 h-4" />
              </div>

              {/* Title & Category Info */}
              <div className="absolute bottom-4 left-4 right-4 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                    {item.category}
                  </span>
                  {item.eventTitle && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-neutral-900/90 text-red-400 border border-red-500/40 font-bold tracking-wider truncate max-w-[150px]">
                      {item.eventTitle}
                    </span>
                  )}
                </div>
                <h4 className="text-base sm:text-lg font-bold font-heading text-white leading-snug">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400 font-cyber line-clamp-1">
                  {item.caption}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveImage(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-4xl w-full bg-[#09090b] border border-red-500/40 rounded-2xl overflow-hidden z-10 shadow-2xl"
            >
              <div className="relative max-h-[70vh] flex items-center justify-center bg-black p-4">
                <img
                  src={activeImage.image}
                  alt={activeImage.title}
                  className="max-h-[65vh] w-auto object-contain rounded-lg"
                />
                
                <button
                  type="button"
                  onClick={() => setActiveImage(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/80 border border-neutral-700 text-white hover:border-red-500 transition-colors cursor-pointer"
                  aria-label="Close Lightbox"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 bg-[#09090b] border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase text-red-400">
                      {activeImage.category}
                    </span>
                    {activeImage.eventTitle && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-red-600/20 text-red-300 border border-red-500/40 font-bold">
                        {activeImage.eventTitle}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold font-heading text-white mt-0.5">
                    {activeImage.title}
                  </h3>
                  <p className="text-sm text-slate-300 font-cyber">
                    {activeImage.caption}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {activeImage.eventId && (
                    <>
                      <Link
                        to={`/events/${activeImage.eventId}`}
                        className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-white flex items-center gap-1.5"
                      >
                        <span>View Event</span>
                        <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                      </Link>
                      <Link
                        to={`/media?event=${activeImage.eventId}`}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-mono text-white flex items-center gap-1.5 font-bold"
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>Media Library</span>
                      </Link>
                    </>
                  )}
                  <span className="text-xs font-mono text-neutral-500 whitespace-nowrap pl-2">
                    SAMYAK 2026
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Memory Modal (ImgBB & Firebase) */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !uploading && setUploadModalOpen(false)}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#09090b] border border-red-500/40 rounded-3xl p-6 sm:p-8 z-10 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-red-400" />
                  <h3 className="text-base font-bold font-heading text-white">
                    UPLOAD FESTIVAL PHOTO
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={uploading}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {uploadSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-heading font-bold text-white">
                    Photo Uploaded Successfully!
                  </h4>
                  <p className="text-xs text-neutral-400 font-cyber">
                    Saved to ImgBB and linked to festival gallery.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-neutral-400">
                      Photo Title / Moment
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RoboWars Knockout Round"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      required
                      className="w-full mt-1 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Relational Event Link Dropdown */}
                  <div>
                    <label className="text-[10px] font-mono uppercase text-neutral-400">
                      Associated Fest Event (Optional)
                    </label>
                    <select
                      value={uploadEventId}
                      onChange={(e) => setUploadEventId(e.target.value)}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="">General Festival / Atmosphere (No specific event)</option>
                      {events?.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} ({ev.department || 'KL'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-neutral-400">
                      Category
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="RoboWars">RoboWars</option>
                      <option value="Atmosphere">Atmosphere</option>
                      <option value="Concert">Concert / ProNite</option>
                      <option value="Identity">Identity</option>
                      <option value="Mascot">Mascot</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-neutral-400">
                      Select Image File (ImgBB Upload)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      required
                      className="w-full mt-1 text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-mono file:bg-red-500/20 file:text-red-300 hover:file:bg-red-500/30"
                    />
                  </div>

                  {uploadError && (
                    <p className="text-xs text-rose-400 font-cyber">{uploadError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full py-3.5 rounded-full font-heading text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading to ImgBB...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Publish to Gallery</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}
