import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Plus, Edit2, Trash2, Upload, CheckCircle2, AlertCircle, 
  X, Eye, Search, Filter, RefreshCw, Download, QrCode, DollarSign, 
  Calendar, Clock, MapPin, Users, User, Phone, Mail, Award, Check, 
  ExternalLink, Layers, ChevronRight, ZoomIn, FileText, Image as ImageIcon,
  ArrowLeft, Star
} from 'lucide-react';
import { 
  subscribeWorkshops, 
  createWorkshop, 
  updateWorkshop, 
  deleteWorkshop,
  subscribeWorkshopRegistrations,
  updateWorkshopRegistrationStatus,
  WORKSHOP_CATEGORIES,
  DEFAULT_WORKSHOPS 
} from '../../services/workshopService';
import { compressImageToDataUrl } from '../../services/fileSecurityService';
import { uploadImage, isR2Configured } from '../../services/r2Storage';
import SecureImage from '../../components/SecureImage/SecureImage';

export default function WorkshopsManager({ onToast }) {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('catalog'); // 'catalog' | 'registrations'
  
  // Registration listener state
  const [registrations, setRegistrations] = useState([]);
  const [selectedWorkshopFilter, setSelectedWorkshopFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Full-Page Editor States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [screenshotModalImage, setScreenshotModalImage] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    category: 'AI & Machine Learning',
    price: 299,
    date: 'March 15, 2026',
    time: '10:00 AM - 04:00 PM',
    venue: 'SAC Computational Lab',
    instructor: '',
    instructorRole: '',
    instructorOrg: '',
    capacity: 60,
    availableSeats: 60,
    status: 'Open',
    featured: false,
    posterUrl: '',
    paymentQrUrl: '',
    merchantUpiId: 'klefsamyak2312@sbi',
    shortDescription: '',
    fullDescription: '',
    topicsText: '',
    benefitsText: '',
    coordinatorName: '',
    coordinatorPhone: '',
    displayOrder: 0
  });

  // Image Uploading States for Editor
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState('');
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState('');
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  const posterInputRef = useRef(null);
  const qrInputRef = useRef(null);

  // 1. Subscribe to workshops
  useEffect(() => {
    const unsub = subscribeWorkshops(
      (data) => {
        setWorkshops(data || []);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (onToast) onToast('Could not load workshops from Firestore: ' + err.message, 'error');
      }
    );
    return () => unsub();
  }, [onToast]);

  // 2. Subscribe to workshop registrations
  useEffect(() => {
    const unsub = subscribeWorkshopRegistrations(
      selectedWorkshopFilter === 'ALL' ? null : selectedWorkshopFilter,
      (data) => {
        setRegistrations(data || []);
      },
      (err) => {
        console.warn('Registration listener notice:', err);
      }
    );
    return () => unsub();
  }, [selectedWorkshopFilter]);

  // Computed metrics
  const totalRevenue = useMemo(() => {
    return registrations
      .filter((r) => r.status === 'APPROVED' || r.status === 'VERIFIED' || r.status === 'CONFIRMED')
      .reduce((sum, r) => sum + (Number(r.workshop_fee) || 0), 0);
  }, [registrations]);

  const pendingApprovalsCount = useMemo(() => {
    return registrations.filter((r) => r.status === 'PENDING_VERIFICATION' || r.status === 'PENDING' || !r.status).length;
  }, [registrations]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      const matchWs = selectedWorkshopFilter === 'ALL' || reg.workshop_id === selectedWorkshopFilter;
      const isConfirmed = reg.status === 'APPROVED' || reg.status === 'VERIFIED' || reg.status === 'CONFIRMED';
      const isPending = !reg.status || reg.status === 'PENDING_VERIFICATION' || reg.status === 'PENDING';
      const isRejected = reg.status === 'REJECTED';

      const matchStatus = 
        statusFilter === 'ALL' || 
        (statusFilter === 'APPROVED' && isConfirmed) ||
        (statusFilter === 'CONFIRMED' && isConfirmed) ||
        (statusFilter === 'PENDING_VERIFICATION' && isPending) ||
        (statusFilter === 'REJECTED' && isRejected) ||
        reg.status === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        (reg.student_name && reg.student_name.toLowerCase().includes(q)) ||
        (reg.email && reg.email.toLowerCase().includes(q)) ||
        (reg.phone && reg.phone.includes(q)) ||
        (reg.university_id && reg.university_id.toLowerCase().includes(q)) ||
        (reg.utr && reg.utr.toLowerCase().includes(q)) ||
        (reg.regCode && reg.regCode.toLowerCase().includes(q)) ||
        (reg.workshop_title && reg.workshop_title.toLowerCase().includes(q));

      return matchWs && matchStatus && matchSearch;
    });
  }, [registrations, selectedWorkshopFilter, statusFilter, searchQuery]);

  // Open Full-Page Editor for Creating a New Workshop
  const handleOpenCreate = () => {
    setEditingWorkshop(null);
    setForm({
      title: '',
      category: 'AI & Machine Learning',
      price: 299,
      date: 'March 15, 2026',
      time: '10:00 AM - 04:00 PM',
      venue: 'SAC Computational Lab',
      instructor: '',
      instructorRole: '',
      instructorOrg: '',
      capacity: 60,
      availableSeats: 60,
      status: 'Open',
      featured: false,
      posterUrl: '',
      paymentQrUrl: '',
      merchantUpiId: 'klefsamyak2312@sbi',
      shortDescription: '',
      fullDescription: '',
      topicsText: 'Introduction to Core Fundamentals\nHands-on Architecture Implementation\nLive Case Study & Pipeline Building\nProject Deployment & Optimization',
      benefitsText: 'Official Certificate of Technical Participation\nCurated Code Templates & Starter Repos\nDirect Mentorship & Networking',
      coordinatorName: '',
      coordinatorPhone: '',
      displayOrder: 0
    });
    setPosterFile(null);
    setPosterPreview('');
    setQrFile(null);
    setQrPreview('');
    setIsEditorOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Full-Page Editor for Editing an Existing Workshop
  const handleOpenEdit = (ws) => {
    setEditingWorkshop(ws);
    setForm({
      title: ws.title || '',
      category: ws.category || 'AI & Machine Learning',
      price: ws.price || 299,
      date: ws.date || 'March 15, 2026',
      time: ws.time || '10:00 AM - 04:00 PM',
      venue: ws.venue || 'SAC Lab',
      instructor: ws.instructor || '',
      instructorRole: ws.instructorRole || '',
      instructorOrg: ws.instructorOrg || '',
      capacity: ws.capacity || 60,
      availableSeats: ws.availableSeats ?? ws.capacity ?? 60,
      status: ws.status || 'Open',
      featured: ws.featured || false,
      posterUrl: ws.posterUrl || '',
      paymentQrUrl: ws.paymentQrUrl || '',
      merchantUpiId: ws.merchantUpiId || 'klefsamyak2312@sbi',
      shortDescription: ws.shortDescription || '',
      fullDescription: ws.fullDescription || '',
      topicsText: (ws.topics || []).join('\n'),
      benefitsText: (ws.benefits || []).join('\n'),
      coordinatorName: ws.coordinators?.[0]?.name || '',
      coordinatorPhone: ws.coordinators?.[0]?.phone || '',
      displayOrder: ws.displayOrder ?? ws.order ?? 0
    });
    setPosterFile(null);
    setPosterPreview(ws.posterUrl || '');
    setQrFile(null);
    setQrPreview(ws.paymentQrUrl || '');
    setIsEditorOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Poster File selection
  const handlePosterSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosterFile(file);
    try {
      const dataUrl = await compressImageToDataUrl(file, 1200, 0.82);
      setPosterPreview(dataUrl);
    } catch {
      setPosterPreview(URL.createObjectURL(file));
    }
  };

  // Handle Payment QR Poster / Screenshot selection
  const handleQrSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrFile(file);
    try {
      const dataUrl = await compressImageToDataUrl(file, 900, 0.85);
      setQrPreview(dataUrl);
    } catch {
      setQrPreview(URL.createObjectURL(file));
    }
  };

  // Save Workshop to Cloud & Local Storage immediately
  const handleSaveWorkshop = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      if (onToast) onToast('Please enter a workshop title.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      // Previews are local data: URLs; only uploaded R2 URLs may be saved.
      let finalPosterUrl = form.posterUrl || '/hero-bg.png';
      let finalQrUrl = form.paymentQrUrl || '';

      if ((posterFile || qrFile) && !isR2Configured()) {
        throw new Error('File uploads are not configured (VITE_CLOUD_API_URL missing).');
      }

      if (posterFile) {
        setUploadingPoster(true);
        try {
          finalPosterUrl = (await uploadImage(posterFile, 'workshop_posters')).url;
        } catch (uploadErr) {
          throw new Error(`Poster upload failed: ${uploadErr.message}`);
        } finally {
          setUploadingPoster(false);
        }
      }

      if (qrFile) {
        setUploadingQr(true);
        try {
          finalQrUrl = (await uploadImage(qrFile, 'workshop_payment_qrs')).url;
        } catch (uploadErr) {
          throw new Error(`Payment QR upload failed: ${uploadErr.message}`);
        } finally {
          setUploadingQr(false);
        }
      }

      const topicsArray = form.topicsText
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);

      const benefitsArray = form.benefitsText
        .split('\n')
        .map((b) => b.trim())
        .filter(Boolean);

      const coordinatorsArray = form.coordinatorName.trim()
        ? [{ name: form.coordinatorName.trim(), phone: form.coordinatorPhone.trim() }]
        : [];

      const payload = {
        title: form.title.trim(),
        category: form.category,
        price: Number(form.price) || 0,
        date: form.date.trim(),
        time: form.time.trim(),
        venue: form.venue.trim(),
        instructor: form.instructor.trim(),
        instructorRole: form.instructorRole.trim(),
        instructorOrg: form.instructorOrg.trim(),
        capacity: Number(form.capacity) || 60,
        availableSeats: Number(form.availableSeats ?? form.capacity ?? 60),
        status: form.status,
        featured: form.featured,
        posterUrl: finalPosterUrl,
        paymentQrUrl: finalQrUrl,
        merchantUpiId: form.merchantUpiId.trim() || 'klefsamyak2312@sbi',
        shortDescription: form.shortDescription.trim(),
        fullDescription: form.fullDescription.trim(),
        topics: topicsArray,
        benefits: benefitsArray,
        coordinators: coordinatorsArray,
        displayOrder: Number(form.displayOrder) || 0
      };

      let savedResult;
      if (editingWorkshop?.id) {
        savedResult = await updateWorkshop(editingWorkshop.id, payload);
        setWorkshops((prev) => prev.map((w) => (w.id === editingWorkshop.id ? { ...w, ...savedResult } : w)));
        if (onToast) onToast(`Workshop "${payload.title}" updated successfully!`);
      } else {
        savedResult = await createWorkshop(payload);
        setWorkshops((prev) => [savedResult, ...prev.filter((w) => w.id !== savedResult.id)]);
        if (onToast) onToast(`Workshop "${payload.title}" published live!`);
      }

      setIsEditorOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error saving workshop:', err);
      if (onToast) onToast('Failed to save workshop: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
      setUploadingPoster(false);
      setUploadingQr(false);
    }
  };

  // Delete Workshop
  const handleDeleteWorkshop = async (id, title) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete workshop "${title}"? This cannot be undone.`);
    if (!confirmDelete) return;

    try {
      await deleteWorkshop(id);
      setWorkshops((prev) => prev.filter((w) => w.id !== id));
      if (onToast) onToast(`Workshop "${title}" removed from catalog.`);
    } catch (err) {
      if (onToast) onToast('Failed to delete workshop: ' + err.message, 'error');
    }
  };

  // Toggle Star / Featured status for Homepage Highlight
  const handleToggleStar = async (ws) => {
    const nextFeatured = !ws.featured;
    try {
      await updateWorkshop(ws.id, { featured: nextFeatured });
      setWorkshops((prev) => prev.map((w) => (w.id === ws.id ? { ...w, featured: nextFeatured } : w)));
      if (onToast) {
        onToast(
          nextFeatured 
            ? `⭐ "${ws.title}" starred as Homepage Highlight!` 
            : `"${ws.title}" unstarred from Homepage.`
        );
      }
    } catch (err) {
      if (onToast) onToast('Failed to update star: ' + err.message, 'error');
    }
  };

  // Approve / Reject Workshop Registration
  const handleUpdateStatus = async (regId, status) => {
    let reason = '';
    if (status === 'REJECTED') {
      reason = window.prompt('Enter reason for rejecting this registration (e.g. Invalid UTR, Unreadable screenshot):') || '';
      if (reason === null) return;
    }

    try {
      await updateWorkshopRegistrationStatus(regId, status, reason);
      if (onToast) onToast(`Registration marked as ${status}.`);
    } catch (err) {
      if (onToast) onToast('Status update failed: ' + err.message, 'error');
    }
  };

  // Export registrations to CSV
  const handleExportCSV = () => {
    if (filteredRegistrations.length === 0) {
      if (onToast) onToast('No registrations found to export.', 'error');
      return;
    }

    const headers = [
      'Registration Code',
      'Workshop Title',
      'Student Name',
      'Email',
      'Phone',
      'College Type',
      'College Name',
      'Roll / ID No',
      'Branch',
      'Fee Paid (INR)',
      'UTR Transaction ID',
      'Status',
      'Submitted Date'
    ];

    const rows = filteredRegistrations.map((r) => [
      `"${r.regCode || ''}"`,
      `"${r.workshop_title || ''}"`,
      `"${r.student_name || ''}"`,
      `"${r.email || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.college_choice || ''}"`,
      `"${r.college_name || ''}"`,
      `"${r.university_id || ''}"`,
      `"${r.branch || ''}"`,
      `"${r.workshop_fee || 0}"`,
      `"${r.utr || ''}"`,
      `"${r.status || 'PENDING'}"`,
      `"${r.created_at?.toDate ? r.created_at.toDate().toLocaleString() : new Date().toLocaleString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SAMYAK_2026_Workshop_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onToast) onToast('Workshop registration list exported to CSV!');
  };

  // =========================================================================
  // VIEW 1: DEDICATED FULL-PAGE WORKSHOP EDITOR (NO POPUP WINDOW)
  // =========================================================================
  if (isEditorOpen) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Top Navigation & Action Bar */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-neutral-950 via-red-950/40 to-neutral-950 border border-red-500/40 shadow-[0_0_50px_rgba(223,37,49,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono transition-all cursor-pointer group mb-2"
            >
              <ArrowLeft className="w-4 h-4 text-red-400 group-hover:-translate-x-1 transition-transform" />
              <span>← Back to Workshops Manager</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold block">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{editingWorkshop ? 'WORKSHOP EDITOR MODE' : 'CREATE NEW WORKSHOP'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight uppercase">
              {editingWorkshop ? `Edit: ${form.title || 'Workshop'}` : 'Publish New Technical Workshop'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-cyber max-w-xl">
              Configure curriculum, individual workshop registration pricing, poster banner, and dedicated payment QR code.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {editingWorkshop && (
              <a
                href={`/workshops/${editingWorkshop.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-all"
                title="View live public page in new tab"
              >
                <Eye className="w-4 h-4 text-red-400" />
                <span>View Live Page</span>
                <ExternalLink className="w-3 h-3 text-neutral-500" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white font-heading font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveWorkshop}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(223,37,49,0.6)] flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <span>{editingWorkshop ? 'Save & Update Workshop' : 'Publish Workshop'}</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Page Form */}
        <form onSubmit={handleSaveWorkshop} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Workshop Parameters & Curriculum (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Core Info */}
            <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" />
                <span>1. Core Workshop Identity</span>
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold">
                    Workshop Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Autonomous Robotics & micro-ROS"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-black border border-neutral-700 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold">
                      Domain / Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    >
                      {WORKSHOP_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold">
                      Status Pill
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="Open">Open</option>
                      <option value="Fast Filling">Fast Filling</option>
                      <option value="Seats Full">Seats Full</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Homepage Star Highlight Toggle */}
                <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Star className={`w-4 h-4 ${form.featured ? 'fill-amber-400 text-amber-400' : 'text-neutral-500'}`} />
                    </div>
                    <div>
                      <span className="font-heading font-black text-xs uppercase tracking-wider text-amber-300 block">
                        Homepage Top Event Highlight (Star)
                      </span>
                      <span className="text-[10px] text-neutral-400 font-cyber block">
                        Pins this workshop as the featured highlight above events on the homepage.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, featured: !form.featured })}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      form.featured
                        ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                        : 'bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${form.featured ? 'fill-black' : ''}`} />
                    <span>{form.featured ? 'Starred' : 'Unstarred'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Independent Workshop Fee & Capacity */}
            <div className="p-6 rounded-3xl bg-neutral-950/80 border border-emerald-500/40 space-y-4 shadow-[0_0_25px_rgba(16,185,129,0.08)]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-heading font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>2. Dedicated Workshop Fee &amp; Capacity</span>
                </h3>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Decoupled from fest fee
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                    Workshop Fee (INR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1}
                      placeholder="299"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-black border border-emerald-500/60 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono block">Attendees pay this fee</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold">
                    Total Capacity
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                  <span className="text-[10px] text-neutral-500 font-mono block">Max lab seats</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold">
                    Available Seats
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.availableSeats}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({
                        ...form,
                        availableSeats: val,
                        status: Number(val) <= 0 ? 'Seats Full' : (form.status === 'Seats Full' ? 'Open' : form.status)
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                  <span className="text-[10px] text-neutral-500 font-mono block">0 = Triggers All Seats Filled</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold">
                    Registration Status
                  </label>
                  <select
                    value={form.status || 'Open'}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setForm({
                        ...form,
                        status: newStatus,
                        availableSeats: newStatus === 'Seats Full' ? 0 : form.availableSeats
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  >
                    <option value="Open">Open</option>
                    <option value="Seats Full">Seats Full</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <span className="text-[10px] text-neutral-500 font-mono block">Controls public intake</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1">
                    <span>Display Order</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.displayOrder ?? 0}
                    onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-amber-500/50 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-neutral-500 font-mono block">Priority (1, 2, 3...)</span>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold">
                  Merchant UPI ID (For Attendees to Pay Fee)
                </label>
                <input
                  type="text"
                  placeholder="klefsamyak2312@sbi"
                  value={form.merchantUpiId}
                  onChange={(e) => setForm({ ...form, merchantUpiId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* 3. Schedule & Venue */}
            <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                <span>3. Date, Timing &amp; Venue</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                    Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. March 15, 2026"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                    Timing
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM - 04:00 PM"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                    Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SAC Computational Lab 1"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Instructor Details */}
            <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-red-500" />
                <span>4. Lead Speaker / Instructor Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">Instructor Name</label>
                  <input
                    type="text"
                    placeholder="Dr. Arvind Swaminathan"
                    value={form.instructor}
                    onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">Role / Designation</label>
                  <input
                    type="text"
                    placeholder="Principal AI Scientist"
                    value={form.instructorRole}
                    onChange={(e) => setForm({ ...form, instructorRole: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">Organization / Company</label>
                  <input
                    type="text"
                    placeholder="Cognitive Computing Labs"
                    value={form.instructorOrg}
                    onChange={(e) => setForm({ ...form, instructorOrg: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* 5. Syllabus, Topics, & Descriptions */}
            <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-500" />
                <span>5. Curriculum, Syllabus &amp; Description</span>
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                    Short Tagline / Catchy Summary
                  </label>
                  <input
                    type="text"
                    placeholder="Catchy 1-line overview of the workshop"
                    value={form.shortDescription}
                    onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                    Full Workshop Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Comprehensive description of the workshop curriculum, hands-on activities, and goals..."
                    value={form.fullDescription}
                    onChange={(e) => setForm({ ...form, fullDescription: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white font-cyber focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                    Hands-On Modules / Topics (One per line)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Topic 1&#10;Topic 2&#10;Topic 3"
                    value={form.topicsText}
                    onChange={(e) => setForm({ ...form, topicsText: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                    Benefits &amp; Takeaways (One per line)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Official Workshop Certificate&#10;Curated Starter Notebooks&#10;Cloud GPU Access"
                    value={form.benefitsText}
                    onChange={(e) => setForm({ ...form, benefitsText: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* 6. Coordinators */}
            <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-500" />
                <span>6. Student Coordinator Contact</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">Coordinator Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={form.coordinatorName}
                    onChange={(e) => setForm({ ...form, coordinatorName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">Coordinator Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98480 12345"
                    value={form.coordinatorPhone}
                    onChange={(e) => setForm({ ...form, coordinatorPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Media Uploads, Live Preview, & Publish Actions (5 cols, sticky) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            
            {/* 1. Workshop Poster Upload */}
            <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-red-400" />
                  <span>Workshop Poster Banner</span>
                </label>
                <button
                  type="button"
                  onClick={() => posterInputRef.current?.click()}
                  className="px-3 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-red-400 cursor-pointer border border-neutral-800"
                >
                  Choose File
                </button>
              </div>

              <input
                type="file"
                ref={posterInputRef}
                accept="image/*"
                onChange={handlePosterSelect}
                className="hidden"
              />

              {posterPreview ? (
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-neutral-700 bg-black">
                  <img src={posterPreview} alt="Poster Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPosterFile(null); setPosterPreview(''); }}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/80 text-white hover:bg-red-600 transition-colors cursor-pointer"
                    title="Remove poster"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => posterInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-800 hover:border-red-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-black/40"
                >
                  <Upload className="w-7 h-7 text-neutral-500 mx-auto mb-2" />
                  <span className="text-xs font-mono text-neutral-300 block font-bold">Upload Workshop Poster</span>
                  <span className="text-[10px] font-mono text-neutral-500 block mt-0.5">Recommended 1080x1350 portrait poster (PNG, JPG, WebP)</span>
                </div>
              )}
            </div>

            {/* 2. Workshop Payment QR Poster / Screenshot Upload */}
            <div className="p-6 rounded-3xl bg-neutral-950/80 border-2 border-emerald-500/50 space-y-3 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>Workshop Payment QR Poster</span>
                </label>
                <button
                  type="button"
                  onClick={() => qrInputRef.current?.click()}
                  className="px-3 py-1 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-xs font-mono text-emerald-300 border border-emerald-500/40 cursor-pointer"
                >
                  Upload QR
                </button>
              </div>

              <input
                type="file"
                ref={qrInputRef}
                accept="image/*"
                onChange={handleQrSelect}
                className="hidden"
              />

              {qrPreview ? (
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-emerald-500/60 bg-neutral-950 flex items-center justify-center p-2">
                  <img src={qrPreview} alt="QR Code Preview" className="max-h-full max-w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => { setQrFile(null); setQrPreview(''); }}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/80 text-white hover:bg-red-600 transition-colors cursor-pointer"
                    title="Remove QR code"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => qrInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-emerald-950/15"
                >
                  <QrCode className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <span className="text-xs font-mono text-emerald-300 block font-bold">
                    Upload Payment QR Poster / Screenshot
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                    Attendees scan this exact QR to pay the workshop fee
                  </span>
                </div>
              )}
            </div>

            {/* 3. Real-Time Live Card Preview */}
            <div className="p-5 rounded-3xl bg-black border border-neutral-800 space-y-3">
              <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold block">
                Catalog Card Preview (1080x1350 Appearance)
              </span>

              <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-lg">
                <div className="relative aspect-[1080/1350] w-full bg-neutral-900">
                  <img
                    src={posterPreview || form.posterUrl || '/hero-bg.png'}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = '/hero-bg.png'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-400 font-heading font-black text-xs shadow-md">
                      ₹{form.price || 0}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <h4 className="font-heading font-bold text-white text-xs leading-tight line-clamp-1">
                      {form.title || 'Untitled Technical Workshop'}
                    </h4>
                  </div>
                </div>

                <div className="p-3 space-y-1.5 text-[10px] font-mono text-neutral-400">
                  <div>Date: <span className="text-white">{form.date}</span></div>
                  <div>Venue: <span className="text-white">{form.venue}</span></div>
                  <div>Fee: <span className="text-emerald-400 font-bold">₹{form.price}</span></div>
                </div>
              </div>
            </div>

            {/* 4. Action Buttons */}
            <div className="p-5 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-3">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(223,37,49,0.5)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>Publishing Workshop &amp; Assets...</span>
                  </>
                ) : (
                  <>
                    <span>{editingWorkshop ? 'Save & Update Workshop' : 'Publish Workshop to Live Site'}</span>
                    <Check className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white font-mono text-xs transition-colors cursor-pointer"
              >
                Cancel &amp; Discard Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: WORKSHOPS CATALOG LIST & ATTENDEE REGISTRATIONS
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-neutral-950 via-red-950/40 to-neutral-950 border border-red-500/40 shadow-[0_0_50px_rgba(223,37,49,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dedicated Technical Training</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight uppercase">
            Workshops &amp; Bootcamps <span className="text-red-500">Manager</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-cyber mt-1 max-w-xl">
            Create technical bootcamps with individual custom pricing, upload distinct payment QR posters, and review attendee verification proofs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveSubTab('catalog')}
            className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'catalog'
                ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(223,37,49,0.5)]'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Workshops ({workshops.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('registrations')}
            className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'registrations'
                ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(223,37,49,0.5)]'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Attendees ({registrations.length})</span>
            {pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-mono font-black animate-pulse">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(223,37,49,0.6)] flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Workshop</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-neutral-400 mb-1">
            <Layers className="w-3.5 h-3.5 text-red-400" />
            <span>Total Bootcamps</span>
          </div>
          <div className="text-2xl font-black font-heading text-white">{workshops.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-neutral-400 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Enrolled Students</span>
          </div>
          <div className="text-2xl font-black font-heading text-white">{registrations.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-neutral-400 mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending Approvals</span>
          </div>
          <div className="text-2xl font-black font-heading text-amber-400">{pendingApprovalsCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-neutral-400 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Revenue</span>
          </div>
          <div className="text-2xl font-black font-heading text-emerald-400">₹{totalRevenue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* SUB-TAB 1: WORKSHOPS CATALOG */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Active Workshops List</span>
              <span className="text-xs text-neutral-500 font-mono">({workshops.length})</span>
            </h3>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="text-xs font-mono text-red-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Workshop</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...workshops].sort((a, b) => {
              const orderA = a.displayOrder !== undefined && a.displayOrder !== '' && a.displayOrder !== null ? Number(a.displayOrder) : (a.order !== undefined ? Number(a.order) : 9999);
              const orderB = b.displayOrder !== undefined && b.displayOrder !== '' && b.displayOrder !== null ? Number(b.displayOrder) : (b.order !== undefined ? Number(b.order) : 9999);
              if (orderA !== orderB) return orderA - orderB;
              return (a.title || '').localeCompare(b.title || '');
            }).map((ws) => (
              <div 
                key={ws.id}
                className="rounded-3xl bg-neutral-950/80 border border-neutral-800 hover:border-red-500/50 transition-all overflow-hidden flex flex-col justify-between group shadow-lg"
              >
                <div>
                  {/* Poster Thumbnail - 1080x1350 Aspect Ratio */}
                  <div className="relative aspect-[1080/1350] w-full bg-neutral-900 overflow-hidden">
                    <img 
                      src={ws.posterUrl || '/hero-bg.png'} 
                      alt={ws.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.currentTarget.src = '/hero-bg.png'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    
                    {/* Display Order Priority Badge */}
                    <div className="absolute top-3.5 left-3.5 z-10">
                      <span className="px-2.5 py-1 rounded-xl bg-black/85 backdrop-blur-md border border-amber-500/50 text-amber-300 font-mono text-[11px] font-bold shadow-md">
                        Order #{ws.displayOrder ?? ws.order ?? '—'}
                      </span>
                    </div>

                    {/* ONLY AMOUNT / FEE BADGE */}
                    <div className="absolute top-3.5 right-3.5 z-10">
                      <span className="px-3.5 py-1.5 rounded-xl bg-emerald-950/95 border-2 border-emerald-500 text-emerald-400 font-heading font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                        ₹{ws.price}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 z-10">
                      <h4 className="font-heading font-black text-white text-base leading-tight line-clamp-2 drop-shadow-md">
                        {ws.title}
                      </h4>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="space-y-1.5 text-xs font-mono text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span className="text-neutral-300">{ws.date}</span>
                        <span>•</span>
                        <span>{ws.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span className="truncate">{ws.venue}</span>
                      </div>
                      {ws.instructor && (
                        <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/80">
                          <User className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="text-white font-bold truncate">{ws.instructor}</span>
                          {ws.instructorOrg && <span className="text-[10px] text-neutral-500 truncate">({ws.instructorOrg})</span>}
                        </div>
                      )}
                    </div>

                    {/* QR Code Status */}
                    <div className="p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-mono text-neutral-300">Payment QR Code</span>
                      </div>
                      {ws.paymentQrUrl ? (
                        <button
                          type="button"
                          onClick={() => setScreenshotModalImage({ url: ws.paymentQrUrl, title: `${ws.title} — Payment QR` })}
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 hover:text-white text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View QR</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-neutral-500">Auto-generated</span>
                      )}
                    </div>

                    {/* Capacity Indicator */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-neutral-500">Capacity</span>
                        {(ws.availableSeats !== undefined && Number(ws.availableSeats) <= 0) || ws.status === 'Seats Full' ? (
                          <span className="text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/50 text-[10px]">
                            All Seats Filled
                          </span>
                        ) : (
                          <span className="text-neutral-300 font-bold">
                            {ws.registeredCount || 0} / {ws.capacity || 60} enrolled ({ws.availableSeats ?? 20} left)
                          </span>
                        )}
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${(ws.availableSeats !== undefined && Number(ws.availableSeats) <= 0) || ws.status === 'Seats Full' ? 'bg-amber-500' : 'bg-gradient-to-r from-red-600 to-rose-500'}`}
                          style={{ width: `${(ws.availableSeats !== undefined && Number(ws.availableSeats) <= 0) || ws.status === 'Seats Full' ? 100 : Math.min(100, Math.round(((ws.registeredCount || 0) / (ws.capacity || 60)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-neutral-900/40 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWorkshopFilter(ws.id);
                        setActiveSubTab('registrations');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="View attendees registered for this workshop"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Attendees</span>
                    </button>

                    <a
                      href={`/workshops/${ws.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-red-400 hover:text-white text-xs font-mono flex items-center gap-1 transition-colors border border-neutral-800"
                      title="Open live public workshop page in new tab"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Live</span>
                      <ExternalLink className="w-2.5 h-2.5 text-neutral-500" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleStar(ws)}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        ws.featured
                          ? 'bg-amber-500/25 border border-amber-500/60 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                          : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-500 hover:text-amber-400 border border-neutral-800'
                      }`}
                      title={ws.featured ? '⭐ Starred on Homepage (Click to unstar)' : 'Star for Homepage Highlight'}
                    >
                      <Star className={`w-3.5 h-3.5 ${ws.featured ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(ws)}
                      className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                      title="Edit Workshop Details & QR Poster"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWorkshop(ws.id, ws.title)}
                      className="p-2 rounded-xl bg-neutral-900 hover:bg-red-600/30 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete Workshop"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ATTENDEE REGISTRATIONS & PAYMENT SCREENSHOTS */}
      {activeSubTab === 'registrations' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-3xl bg-neutral-900/80 border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Workshop selector filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-neutral-500 block">Filter Workshop</label>
                <select
                  value={selectedWorkshopFilter}
                  onChange={(e) => setSelectedWorkshopFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                >
                  <option value="ALL">All Workshops ({workshops.length})</option>
                  {workshops.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.title}</option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-neutral-500 block">Verification Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="APPROVED">Approved / Confirmed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {/* Search box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, roll no, UTR..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Export CSV button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
                title="Download attendee records in CSV format"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Registrations List / Table */}
          {filteredRegistrations.length === 0 ? (
            <div className="p-12 rounded-3xl bg-neutral-950/60 border border-neutral-900 text-center space-y-3">
              <Users className="w-10 h-10 text-neutral-600 mx-auto" />
              <h4 className="text-base font-heading font-bold text-neutral-400 uppercase">No Registrations Found</h4>
              <p className="text-xs text-neutral-500 font-cyber">
                No students have enrolled under the selected criteria yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left Column: Attendee & Workshop Info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-red-950/70 border border-red-500/40 text-red-400 font-mono text-[10px] font-bold">
                        {reg.regCode || 'TICKET'}
                      </span>
                      <h4 className="text-sm font-heading font-black text-white">
                        {reg.student_name}
                      </h4>
                      <span className="text-xs text-neutral-400 font-mono">
                        ({reg.university_id || 'ID N/A'})
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        reg.college_choice === 'kl_university' || (reg.college_name || '').toLowerCase().includes('kl')
                          ? 'bg-red-950 border border-red-500/50 text-red-300'
                          : 'bg-blue-950 border border-blue-500/50 text-blue-300'
                      }`}>
                        {reg.college_name || (reg.college_choice === 'kl_university' ? 'KL University' : 'External College')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-neutral-400">
                      <span>Workshop: <strong className="text-white">{reg.workshop_title}</strong></span>
                      <span>Fee: <strong className="text-emerald-400 font-bold">₹{reg.workshop_fee}</strong></span>
                      <span>Phone: <a href={`tel:${reg.phone}`} className="text-neutral-300 hover:underline">{reg.phone}</a></span>
                      <span>Email: <a href={`mailto:${reg.email}`} className="text-neutral-300 hover:underline">{reg.email}</a></span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
                        <span className="text-neutral-500 text-[10px] uppercase">UTR / Ref:</span>
                        <code className="text-red-400 font-bold">{reg.utr || 'NOT_PROVIDED'}</code>
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        Submitted: {reg.created_at?.toDate ? reg.created_at.toDate().toLocaleString() : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Screenshot Preview & Admin Actions */}
                  <div className="flex flex-wrap items-center gap-3 lg:self-center">
                    {/* Payment Screenshot Thumbnail */}
                    {reg.payment_screenshot_url ? (
                      <button
                        type="button"
                        onClick={() => setScreenshotModalImage({
                          url: reg.payment_screenshot_url,
                          title: `${reg.student_name} — Payment Proof (UTR: ${reg.utr})`
                        })}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono text-neutral-200 transition-all cursor-pointer group"
                      >
                        <ImageIcon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>View Proof</span>
                        <ZoomIn className="w-3.5 h-3.5 text-neutral-500" />
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800">
                        No Screenshot
                      </span>
                    )}

                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border ${
                      reg.status === 'APPROVED' || reg.status === 'VERIFIED' || reg.status === 'CONFIRMED'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                        : reg.status === 'REJECTED'
                        ? 'bg-red-950/80 border-red-500 text-red-400'
                        : 'bg-amber-950/80 border-amber-500 text-amber-400 animate-pulse'
                    }`}>
                      {reg.status || 'PENDING'}
                    </span>

                    {/* Approval Actions */}
                    <div className="flex items-center gap-1.5">
                      {reg.status !== 'APPROVED' && reg.status !== 'VERIFIED' && reg.status !== 'CONFIRMED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(reg.id, 'CONFIRMED')}
                          className="p-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
                          title="Approve & Verify Registration"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {reg.status !== 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(reg.id, 'REJECTED')}
                          className="p-2 rounded-xl bg-red-950 hover:bg-red-900 border border-red-600/50 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
                          title="Reject Registration"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FULL-SCREEN IMAGE / SCREENSHOT LIGHTBOX MODAL */}
      <AnimatePresence>
        {screenshotModalImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
            <button
              type="button"
              onClick={() => setScreenshotModalImage(null)}
              className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-neutral-900/90 text-white hover:bg-red-600 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex flex-col items-center">
              <SecureImage
                src={screenshotModalImage.url}
                alt={screenshotModalImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
              <span className="text-xs font-mono text-neutral-300 mt-3">
                {screenshotModalImage.title}
              </span>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
