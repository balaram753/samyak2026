import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, FolderPlus, Upload, ChevronRight, Home, Image as ImageIcon,
  Search, ArrowLeft, Trash2, Download, Copy, Check, ExternalLink,
  Sparkles, Eye, X, RefreshCw, LayoutGrid, List, HardDrive, Plus,
  ShieldAlert, AlertCircle, CheckCircle2, ChevronLeft, Lock, Shield, ShieldCheck,
  Cloud
} from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { EVENTS_DATA } from '../data/events';
import { 
  subscribeEventFolders, 
  subscribeEventFiles, 
  createMediaFolder, 
  deleteMediaFolder, 
  uploadEventMedia, 
  deleteMediaFile,
  isR2Configured,
  listR2EventsWithMedia,
  getFolders,
  getFiles,
  createFolder,
  uploadFile,
  deleteFolder,
  deleteFile
} from '../services/mediaService';
import { pageVariants } from '../animations/pageAnimations';

export default function MediaExplorerPage() {
  const { eventId: routeEventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { events: siteEvents } = useSiteContent();
  const { isAdmin } = useAdminAuth();

  // Discovered events from Cloudflare R2
  const [r2Events, setR2Events] = useState([]);

  useEffect(() => {
    listR2EventsWithMedia().then((res) => {
      if (res && res.length > 0) {
        setR2Events(res);
      }
    }).catch(() => {});
  }, []);

  const baseEvents = siteEvents && siteEvents.length > 0 ? siteEvents : EVENTS_DATA;
  const allEvents = useMemo(() => {
    const map = new Map();
    baseEvents.forEach((ev) => map.set(ev.id, ev));
    r2Events.forEach((ev) => {
      if (!map.has(ev.id)) {
        map.set(ev.id, ev);
      }
    });
    return Array.from(map.values());
  }, [baseEvents, r2Events]);

  // Active Event resolution
  const queryEventId = searchParams.get('event');
  const targetEventId = routeEventId || queryEventId;

  const selectedEvent = useMemo(() => {
    if (!targetEventId) return null;
    const found = allEvents.find(
      (e) => e.id === targetEventId || (e.title && e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === targetEventId.toLowerCase())
    );
    if (found) return found;

    // Direct access fallback for normal users (e.g. ?event=test-ram)
    const formattedTitle = targetEventId
      .split(/[-_]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return {
      id: targetEventId,
      title: formattedTitle,
      department: 'Festival Event',
      category: 'Event Media',
      banner_url: '/hero-bg.png',
      isCustomOrDynamic: true,
    };
  }, [allEvents, targetEventId]);

  // Folder navigation state
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]); // Array of { id, name }

  // Media data
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Modals
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Reset folder state when event changes
  useEffect(() => {
    setCurrentFolder(null);
    setFolderPath([]);
    setSearchTerm('');
  }, [selectedEvent?.id]);

  // Subscribe to Folders & Files for current event & folder
  useEffect(() => {
    if (!selectedEvent) return;

    setLoadingMedia(true);
    const parentFolderId = currentFolder ? currentFolder.id : null;
    const folderKey = currentFolder ? currentFolder.id : 'root';

    const unsubFolders = subscribeEventFolders(selectedEvent.id, parentFolderId, (newFolders) => {
      setFolders(newFolders);
      setLoadingMedia(false);
    });

    const unsubFiles = subscribeEventFiles(selectedEvent.id, folderKey, (newFiles) => {
      setFiles(newFiles);
      setLoadingMedia(false);
    });

    return () => {
      unsubFolders();
      unsubFiles();
    };
  }, [selectedEvent?.id, currentFolder?.id]);

  // Navigate into a subfolder
  const handleOpenFolder = (folder) => {
    setCurrentFolder(folder);
    setFolderPath((prev) => [...prev, folder]);
    setSearchTerm('');
  };

  // Navigate back to an ancestor folder or root
  const handleNavigateBreadcrumb = (index) => {
    if (index === -1) {
      // Go to Root of current event
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      const target = folderPath[index];
      setCurrentFolder(target);
      setFolderPath(folderPath.slice(0, index + 1));
    }
  };

  // Switch / Clear Event Selection
  const handleClearEvent = () => {
    setSearchParams({});
    navigate('/media');
    setCurrentFolder(null);
    setFolderPath([]);
  };

  const handleSelectEvent = (event) => {
    setSearchParams({ event: event.id });
    setCurrentFolder(null);
    setFolderPath([]);
  };

  // Create Folder Handler (Admin Only)
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || !selectedEvent) return;

    if (!isAdmin) {
      showToast('Permission Denied: Only festival administrators can create media folders.', 'error');
      return;
    }

    try {
      setCreatingFolder(true);
      await createFolder(
        selectedEvent.id,
        currentFolder?.id || null,
        newFolderName.trim(),
        'Admin'
      );
      setNewFolderName('');
      setNewFolderModalOpen(false);
      showToast(`Folder "${newFolderName.trim()}" created successfully!`);
    } catch (err) {
      showToast(err.message || 'Failed to create folder', 'error');
    } finally {
      setCreatingFolder(false);
    }
  };

  // Delete Folder Handler (Admin Only)
  const handleDeleteFolder = async (folder, e) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast('Permission Denied: Only festival administrators can delete folders.', 'error');
      return;
    }

    if (!window.confirm(`Delete folder "${folder.name}" and all media inside it?`)) return;

    try {
      await deleteFolder(folder.id, selectedEvent.id);
      showToast(`Folder "${folder.name}" deleted`);
    } catch (err) {
      showToast(err.message || 'Failed to delete folder', 'error');
    }
  };

  // File Upload Handlers (Admin Only with 50MB Limit Enforcement)
  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB per file

  const handleFilesChosen = (e) => {
    const filesList = Array.from(e.target.files || []);
    if (!filesList.length) return;

    const oversized = filesList.find((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      showToast(`File "${oversized.name}" exceeds the 50MB limit (${(oversized.size / (1024 * 1024)).toFixed(1)} MB).`, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFiles(filesList);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFiles.length || !selectedEvent) return;

    if (!isAdmin) {
      showToast('Permission Denied: Only festival administrators can upload event media.', 'error');
      return;
    }

    try {
      setUploading(true);
      const total = selectedFiles.length;
      let completed = 0;

      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          showToast(`Skipped "${file.name}" as it exceeds 50MB.`, 'error');
          continue;
        }

        await uploadFile(
          selectedEvent.id,
          currentFolder?.id || 'root',
          file,
          uploadCaption,
          'Admin'
        );
        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
      }

      showToast(`Successfully uploaded ${completed} media file${completed > 1 ? 's' : ''}!`);
      setUploadModalOpen(false);
      setSelectedFiles([]);
      setUploadCaption('');
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      showToast('Upload error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setUploading(false);
    }
  };

  // Delete File Handler (Admin Only)
  const handleDeleteFile = async (file, e) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast('Permission Denied: Only festival administrators can delete media.', 'error');
      return;
    }

    if (!window.confirm(`Delete file "${file.name}"?`)) return;

    try {
      await deleteFile(file.id, file.storage_path || file.storagePath);
      showToast(`File deleted`);
      if (lightboxIndex !== null) setLightboxIndex(null);
    } catch (err) {
      showToast(err.message || 'Failed to delete file', 'error');
    }
  };

  // Copy Link
  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered files & folders by search term
  const filteredFolders = folders.filter((f) => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredFiles = files.filter((f) => 
    (f.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.caption || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered events for event selector
  const filteredEvents = allEvents.filter((ev) => 
    ev.title.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
    (ev.department || '').toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
    (ev.category || '').toLowerCase().includes(eventSearchQuery.toLowerCase())
  );

  // Current storage scoped path display: {event_id}/{folder_id || 'root'}
  const currentScopedPath = selectedEvent 
    ? `${selectedEvent.id}/${currentFolder?.id || 'root'}` 
    : '';

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 min-h-screen bg-black text-slate-100 pb-20 select-none"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-xl text-xs font-mono ${
              toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/60 text-red-200'
                : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* If NO event is selected -> Render Event Selection Screen */}
        {!selectedEvent ? (
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto pt-6 pb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-4">
                <HardDrive className="w-3.5 h-3.5 text-red-400" />
                Per-Event Media Library
              </div>
              <h1 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
                SELECT AN <span className="text-red-500 text-glow-red">EVENT ARCHIVE</span>
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-300 font-cyber">
                Browse hierarchical media folders, backstage photography, drone reels, and delegate memories scoped to each festival competition.
              </p>

              {/* Event Search Box */}
              <div className="mt-8 relative max-w-lg mx-auto">
                <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={eventSearchQuery}
                  onChange={(e) => setEventSearchQuery(e.target.value)}
                  placeholder="Search by event title, department (CSE, ECE, Mech)..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 focus:border-red-500/80 focus:ring-2 focus:ring-red-500/20 text-sm font-cyber text-white outline-none transition-all placeholder:text-neutral-500 shadow-inner"
                />
              </div>
            </div>

            {/* Event Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {filteredEvents.map((ev) => {
                const banner = ev.banner_url || ev.image || '/hero-bg.png';
                return (
                  <motion.div
                    key={ev.id}
                    whileHover={{ y: -5, scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleSelectEvent(ev)}
                    className="rounded-3xl border border-neutral-800/80 hover:border-red-500/60 bg-neutral-950/80 hover:shadow-[0_10px_35px_rgba(239,68,68,0.2)] overflow-hidden cursor-pointer group flex flex-col transition-all"
                  >
                    {/* Event Banner */}
                    <div className="relative h-44 w-full overflow-hidden bg-neutral-900">
                      <img
                        src={banner}
                        alt={ev.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter brightness-90 contrast-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-black tracking-wider bg-red-600 text-white shadow-md">
                          {ev.department || 'KL University'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-black/70 border border-neutral-700 text-neutral-300">
                          {ev.category}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="text-lg font-heading font-black text-white group-hover:text-red-400 transition-colors line-clamp-1">
                          {ev.title}
                        </h3>
                        <p className="text-xs text-neutral-400 font-cyber line-clamp-2 mt-1.5 leading-relaxed">
                          {ev.shortDescription || 'Official event records, media reels, and visual archives.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-xs font-mono">
                        <span className="text-neutral-500">{ev.date || 'March 2026'}</span>
                        <span className="inline-flex items-center gap-1 text-red-400 group-hover:translate-x-1 transition-transform font-bold">
                          <span>Open Library</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          /* When Event IS Selected -> Hierarchical Media Library */
          <div className="space-y-6">
            
            {/* Event Header Banner Card */}
            <div className="relative rounded-3xl border border-red-500/30 overflow-hidden bg-neutral-950 p-6 sm:p-8 backdrop-blur-xl shadow-[0_0_35px_rgba(239,68,68,0.15)]">
              {/* Background Glow */}
              <div 
                className="absolute inset-0 opacity-20 bg-cover bg-center filter blur-xl scale-110 pointer-events-none"
                style={{ backgroundImage: `url(${selectedEvent.banner_url || selectedEvent.image || '/hero-bg.png'})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/60 pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearEvent}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-red-400" />
                      <span>Switch Event</span>
                    </button>
                    <span className="px-3 py-1 rounded-full text-xs font-mono uppercase font-black bg-red-600 text-white">
                      {selectedEvent.department || 'KL University'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-mono uppercase bg-black/70 border border-neutral-700 text-neutral-300">
                      {selectedEvent.category}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-heading font-black text-white tracking-tight">
                    {selectedEvent.title}
                  </h1>

                  <div className="flex items-center gap-4 text-xs font-mono text-neutral-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-red-500" />
                      <span>Scoped Path: <code className="text-red-400 font-bold">{currentScopedPath}</code></span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={`/events/${selectedEvent.id}`}
                    className="px-4 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Event Details</span>
                    <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                  </Link>

                  {/* Privilege Guard: Admin vs Public / Student */}
                  {isAdmin ? (
                    <>
                      <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-500/40 text-[11px] font-mono text-red-300">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span>Admin Privileges Active</span>
                      </div>

                      {isR2Configured() ? (
                        <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-[11px] font-mono text-amber-300">
                          <Cloud className="w-3.5 h-3.5 text-amber-400" />
                          <span>Cloudflare R2 (S3)</span>
                        </div>
                      ) : (
                        <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-400" title="Set VITE_R2_ACCESS_KEY_ID in .env to activate Cloudflare R2">
                          <Cloud className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Cloudflare R2 (Unconfigured)</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setNewFolderModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-red-500/40 hover:border-red-500 text-white text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-md"
                      >
                        <FolderPlus className="w-4 h-4 text-red-400" />
                        <span>New Folder</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUploadModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Media</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs font-mono text-neutral-400" title="Read-Only Mode for Visitors & Students">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Read-Only Mode</span>
                      </div>
                      <Link
                        to="/admin/login"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-red-500/40 text-xs font-mono text-neutral-300 hover:text-white transition-all cursor-pointer"
                        title="Festival Committee Sign-In"
                      >
                        <Shield className="w-3.5 h-3.5 text-red-500" />
                        <span>Admin Sign In</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Breadcrumb Navigation & Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 backdrop-blur-md">
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-2 flex-wrap text-xs font-mono">
                <button
                  type="button"
                  onClick={() => handleNavigateBreadcrumb(-1)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    folderPath.length === 0
                      ? 'bg-red-600/20 text-red-400 border border-red-500/30 font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>root</span>
                </button>

                {folderPath.map((f, idx) => {
                  const isLast = idx === folderPath.length - 1;
                  return (
                    <div key={f.id} className="flex items-center gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                      <button
                        type="button"
                        onClick={() => handleNavigateBreadcrumb(idx)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          isLast
                            ? 'bg-red-600/20 text-red-400 border border-red-500/30 font-bold'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 text-red-400" />
                        <span>{f.name}</span>
                      </button>
                    </div>
                  );
                })}
              </nav>

              {/* View Mode & Folder Search */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search folder content..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs font-mono text-white outline-none focus:border-red-500/70 w-44 sm:w-56"
                  />
                </div>

                <div className="flex items-center border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/80 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'list' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="List View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content Display: Folders & Files */}
            <div className="space-y-8">
              
              {/* 1. Folders Section */}
              {filteredFolders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                    <Folder className="w-4 h-4 text-red-500" />
                    <span>Folders ({filteredFolders.length})</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredFolders.map((f) => (
                      <motion.div
                        key={f.id}
                        whileHover={{ y: -3 }}
                        onClick={() => handleOpenFolder(f)}
                        className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-red-500/50 hover:bg-neutral-900/50 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform flex-shrink-0">
                            <Folder className="w-5 h-5 fill-red-500/20" />
                          </div>
                          <div className="overflow-hidden">
                            <span className="block text-sm font-heading font-bold text-white group-hover:text-red-400 truncate">
                              {f.name}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500 block">
                              Created by {f.created_by || 'Admin'}
                            </span>
                          </div>
                        </div>

                        {/* Delete Folder action (Admin Only) */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFolder(f, e)}
                            className="p-2 rounded-xl text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Delete Folder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Files Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-red-500" />
                  <span>Files &amp; Media Assets ({filteredFiles.length})</span>
                </h3>

                {filteredFiles.length === 0 && filteredFolders.length === 0 && (
                  <div className="py-16 text-center rounded-3xl bg-neutral-950/60 border border-dashed border-neutral-800 p-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                      <Folder className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-base font-heading font-bold text-white">This folder is empty</h4>
                      <p className="text-xs text-neutral-500 font-cyber mt-1 max-w-sm mx-auto">
                        No photos or subfolders uploaded yet at path <code className="text-red-400">{currentScopedPath}</code>.
                      </p>
                    </div>

                    {isAdmin ? (
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setNewFolderModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono cursor-pointer"
                        >
                          Create Subfolder
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold cursor-pointer"
                        >
                          Upload Photo
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-[11px] font-mono text-neutral-400">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Read-Only Mode: Festival organizers will publish assets here.</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Grid View for Files */}
                {viewMode === 'grid' && filteredFiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredFiles.map((file, idx) => (
                      <motion.div
                        key={file.id}
                        whileHover={{ y: -4 }}
                        onClick={() => setLightboxIndex(idx)}
                        className="group relative rounded-2xl bg-neutral-950 border border-neutral-800/80 hover:border-red-500/60 overflow-hidden cursor-pointer flex flex-col shadow-md"
                      >
                        <div className="relative aspect-square w-full bg-neutral-900 overflow-hidden">
                          <img
                            src={file.thumb_url || file.url}
                            alt={file.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <span className="p-2 rounded-full bg-red-600/90 text-white shadow-lg">
                              <Eye className="w-4 h-4" />
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-neutral-950 flex flex-col justify-between flex-1">
                          <span className="text-xs font-heading font-semibold text-white truncate block" title={file.name}>
                            {file.name}
                          </span>
                          {file.caption && (
                            <p className="text-[11px] text-neutral-400 font-cyber truncate mt-0.5">
                              {file.caption}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-neutral-900 text-[10px] font-mono text-neutral-500">
                            <span>{file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : 'Photo'}</span>
                            
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteFile(file, e)}
                                  className="text-neutral-600 hover:text-red-400 p-1 cursor-pointer"
                                  title="Delete file"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* List View for Files */}
                {viewMode === 'list' && filteredFiles.length > 0 && (
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400">
                        <tr>
                          <th className="p-3.5">Name</th>
                          <th className="p-3.5 hidden sm:table-cell">Caption</th>
                          <th className="p-3.5 hidden md:table-cell">Uploaded Path</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900">
                        {filteredFiles.map((file, idx) => (
                          <tr 
                            key={file.id} 
                            onClick={() => setLightboxIndex(idx)}
                            className="hover:bg-neutral-900/50 cursor-pointer transition-colors"
                          >
                            <td className="p-3.5 flex items-center gap-3">
                              <img
                                src={file.thumb_url || file.url}
                                alt={file.name}
                                className="w-8 h-8 rounded-lg object-cover bg-neutral-900"
                              />
                              <span className="font-bold text-white truncate max-w-xs">{file.name}</span>
                            </td>
                            <td className="p-3.5 text-neutral-400 hidden sm:table-cell truncate max-w-xs">
                              {file.caption || '—'}
                            </td>
                            <td className="p-3.5 text-neutral-500 hidden md:table-cell font-mono text-[11px]">
                              {file.storage_path || `${selectedEvent.id}/${currentFolder?.id || 'root'}`}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                                  title="Download"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteFile(file, e)}
                                    className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}


              </div>

            </div>

          </div>
        )}

      </div>

      {/* MODAL: Create New Folder */}
      <AnimatePresence>
        {newFolderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-neutral-950 border border-neutral-800 p-6 space-y-5 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 text-white font-heading font-bold text-base">
                  <FolderPlus className="w-5 h-5 text-red-500" />
                  <span>Create Media Folder</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewFolderModalOpen(false)}
                  className="text-neutral-500 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateFolder} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Finals Highlight Reel, Arena Drone Shots"
                    className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-red-500 text-sm font-cyber text-white outline-none"
                  />
                  <span className="text-[11px] font-mono text-neutral-500 mt-1 block">
                    Path: {currentScopedPath}/[folder-name]
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewFolderModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingFolder || !newFolderName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {creatingFolder ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Create Folder</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Upload Media */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-neutral-950 border border-neutral-800 p-6 sm:p-7 space-y-5 shadow-[0_0_50px_rgba(239,68,68,0.25)]"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 text-white font-heading font-bold text-base">
                  <Upload className="w-5 h-5 text-red-500" />
                  <span>Upload to {selectedEvent?.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="text-neutral-500 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {/* Destination note */}
                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs font-mono text-neutral-400">
                  <span>Uploading to folder: </span>
                  <code className="text-red-400 font-bold">{currentScopedPath}</code>
                </div>

                {/* File input area with Drag-and-Drop */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const filesList = Array.from(e.dataTransfer.files || []);
                    if (!filesList.length) return;
                    const oversized = filesList.find((f) => f.size > MAX_FILE_SIZE_BYTES);
                    if (oversized) {
                      showToast(`File "${oversized.name}" exceeds the 50MB limit (${(oversized.size / (1024 * 1024)).toFixed(1)} MB).`, 'error');
                      return;
                    }
                    setSelectedFiles(filesList);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-red-500 bg-red-500/15 scale-[1.01]' 
                      : 'border-neutral-800 hover:border-red-500/60 bg-neutral-900/40 hover:bg-neutral-900/70'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFilesChosen}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-3">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  {selectedFiles.length > 0 ? (
                    <div className="space-y-1">
                      <span className="text-xs font-mono text-emerald-400 font-bold block">
                        {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                      </span>
                      <span className="text-[11px] font-cyber text-neutral-500">
                        Click or drag new files to replace selection
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-xs font-mono text-neutral-300 font-bold block">
                        Drag &amp; drop photos here or click to browse
                      </span>
                      <span className="text-[11px] font-cyber text-neutral-500">
                        JPG, PNG, WEBP up to 50MB per file (Admin Upload)
                      </span>
                    </div>
                  )}
                </div>

                {/* Storage Target Banner */}
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    {isR2Configured() ? (
                      <>
                        <Cloud className="w-4 h-4 text-amber-400" />
                        <span className="text-white font-bold">Storage: Cloudflare R2 S3 (samyak)</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4 text-amber-500/50" />
                        <span className="text-neutral-300">Storage: Cloudflare R2 (Requires .env setup)</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    {isR2Configured() ? 'S3 API Active' : 'Add R2 API keys to .env'}
                  </span>
                </div>

                {/* Optional Caption */}
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5">
                    Caption / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    placeholder="e.g. Grand Finale RoboWars crowd view"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-red-500 text-xs font-cyber text-white outline-none"
                  />
                </div>

                {/* Progress bar */}
                {uploading && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                      <span>Uploading media...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden">
                      <div 
                        className="h-full bg-red-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || selectedFiles.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 disabled:opacity-50 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Start Upload</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN LIGHTBOX VIEWER */}
      <AnimatePresence>
        {lightboxIndex !== null && filteredFiles[lightboxIndex] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 sm:p-8">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-neutral-900/80 hover:bg-red-600 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left Nav */}
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-800 cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Right Nav */}
            {lightboxIndex < filteredFiles.length - 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-800 cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Media Content */}
            <div className="max-w-5xl w-full flex flex-col items-center space-y-4">
              <div className="max-h-[75vh] w-auto overflow-hidden rounded-2xl border border-neutral-800 shadow-2xl flex items-center justify-center bg-neutral-950">
                <img
                  src={filteredFiles[lightboxIndex].url}
                  alt={filteredFiles[lightboxIndex].name}
                  className="max-h-[75vh] w-auto object-contain"
                />
              </div>

              {/* Caption & Metadata Toolbar */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs font-mono">
                <div className="text-center sm:text-left">
                  <span className="font-bold text-white block text-sm">{filteredFiles[lightboxIndex].name}</span>
                  {filteredFiles[lightboxIndex].caption && (
                    <span className="text-neutral-400 font-cyber text-xs block mt-0.5">
                      {filteredFiles[lightboxIndex].caption}
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-500 block mt-1">
                    Path: {filteredFiles[lightboxIndex].storage_path || `${selectedEvent.id}/${currentFolder?.id || 'root'}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(filteredFiles[lightboxIndex].url)}
                    className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied' : 'Copy URL'}</span>
                  </button>

                  <a
                    href={filteredFiles[lightboxIndex].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFile(filteredFiles[lightboxIndex], e)}
                      className="p-2 rounded-xl bg-neutral-900 hover:bg-red-600/30 text-neutral-400 hover:text-red-400 cursor-pointer"
                      title="Delete Media"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
