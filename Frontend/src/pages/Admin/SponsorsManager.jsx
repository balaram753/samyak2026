import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, Plus, Trash2, Edit3, X, Sparkles, Check, 
  ExternalLink, Upload, RefreshCw, Globe, Image as ImageIcon,
  Building2, AlertCircle, ArrowUpDown
} from 'lucide-react';
import { useSiteContent } from '../../context/SiteContentContext';
import { uploadImage } from '../../services/r2Storage';

const COMMON_TIERS = [
  'Title Partner',
  'Powered By Partner',
  'Robotics Partner',
  'Hackathon Partner',
  'Cloud & AI Partner',
  'Entertainment Partner',
  'Drone Arena Partner',
  'Cybersecurity Partner',
  'Associate Partner',
  'Official Media Partner',
];

export default function SponsorsManager({ onToast }) {
  const { 
    sponsors, 
    addSponsor, 
    editSponsor, 
    deleteSponsor, 
    resetDefaultSponsors 
  } = useSiteContent();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [tier, setTier] = useState('Title Partner');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [order, setOrder] = useState(1);
  const [uploadingImage, setUploadingImage] = useState(false);

  const resetForm = () => {
    setName('');
    setSubtitle('');
    setTier('Title Partner');
    setLogoUrl('');
    setWebsiteUrl('');
    setOrder(sponsors.length + 1);
    setEditingSponsorId(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setOrder(sponsors.length + 1);
    setModalOpen(true);
  };

  const handleOpenEditModal = (sponsor) => {
    setEditingSponsorId(sponsor.id);
    setName(sponsor.name || '');
    setSubtitle(sponsor.subtitle || '');
    setTier(sponsor.tier || 'Title Partner');
    setLogoUrl(sponsor.logoUrl || '');
    setWebsiteUrl(sponsor.websiteUrl || '');
    setOrder(sponsor.order || 1);
    setModalOpen(true);
  };

  const handleImageFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      onToast('Image size exceeds 5MB limit.', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await uploadImage(file, 'sponsors');
      setLogoUrl(res.url);
      onToast('Sponsor logo uploaded.', 'success');
    } catch (err) {
      onToast('Logo upload failed: ' + err.message, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      onToast('Sponsor name is required.', 'error');
      return;
    }

    if (!subtitle.trim()) {
      onToast('Business subtitle / description is required.', 'error');
      return;
    }

    const payload = {
      name: name.trim().toUpperCase(),
      subtitle: subtitle.trim(),
      tier: tier.trim(),
      logoUrl: logoUrl.trim() || '/samyak-emblem.png',
      websiteUrl: websiteUrl.trim(),
      order: Number(order) || 1,
    };

    try {
      if (editingSponsorId) {
        await editSponsor(editingSponsorId, payload);
        onToast(`Sponsor "${payload.name}" updated successfully!`, 'success');
      } else {
        await addSponsor(payload);
        onToast(`Sponsor "${payload.name}" added to live website!`, 'success');
      }
      setModalOpen(false);
      resetForm();
    } catch (err) {
      onToast('Failed to save sponsor: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id, sponsorName) => {
    const confirm = window.confirm(`Are you sure you want to remove sponsor "${sponsorName}"?`);
    if (!confirm) return;

    try {
      await deleteSponsor(id);
      onToast(`Sponsor "${sponsorName}" removed.`, 'success');
    } catch (err) {
      onToast('Failed to delete sponsor: ' + err.message, 'error');
    }
  };

  const handleResetDefaults = async () => {
    const confirm = window.confirm('Reset all sponsors to default SAMYAK ecosystem partners?');
    if (!confirm) return;

    try {
      await resetDefaultSponsors();
      onToast('Sponsors reset to defaults successfully!', 'success');
    } catch (err) {
      onToast('Failed to reset sponsors: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* ── TOP HEADER / TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(223,37,49,0.3)]">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
                SPONSORS &amp; PARTNERS MANAGER
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-600/30 border border-red-500/50 text-red-300">
                {sponsors.length} Active
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-cyber mt-0.5">
              Manage circular logos, sponsor names, business subtitles, and tiers displayed on the Homepage and About pages.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset to default initial sponsors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(223,37,49,0.4)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Sponsor</span>
          </button>
        </div>
      </div>

      {/* ── LIVE SPONSORS LIST ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sponsors.map((s, idx) => (
          <div 
            key={s.id || idx}
            className="p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-red-500/50 flex flex-col justify-between transition-all duration-300 shadow-md group relative overflow-hidden"
          >
            {/* Top Order & Tier Pill */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/60 border border-red-500/40 text-[10px] font-mono text-red-300 font-bold uppercase">
                <Sparkles className="w-3 h-3 text-red-400" />
                {s.tier || 'Partner'}
              </span>

              <span className="text-[10px] font-mono text-neutral-500">
                #0{s.order || idx + 1}
              </span>
            </div>

            {/* Middle: Circular Logo & Left-line Content Preview */}
            <div className="flex items-center gap-4 my-2">
              {/* Circular Logo */}
              <div className="w-20 h-20 rounded-full border-2 border-neutral-800 bg-neutral-900/90 flex-shrink-0 p-1 flex items-center justify-center overflow-hidden group-hover:border-red-500/60 transition-colors shadow-inner">
                {s.logoUrl ? (
                  <img
                    src={s.logoUrl}
                    alt={s.name}
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full items-center justify-center text-neutral-600 ${s.logoUrl ? 'hidden' : 'flex'}`}>
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              {/* Red-line Content Block */}
              <div className="border-l-2 border-red-500 pl-3 text-left flex-1 min-w-0">
                <h4 className="font-heading font-black text-base text-white uppercase tracking-wider truncate">
                  {s.name}
                </h4>
                <p className="text-xs text-neutral-400 font-cyber line-clamp-2 mt-0.5">
                  {s.subtitle || 'Official Festival Partner'}
                </p>
                {s.websiteUrl && (
                  <a
                    href={s.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-red-400 hover:text-red-300 hover:underline mt-1 truncate max-w-full"
                  >
                    <span>{s.websiteUrl.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                  </a>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] text-neutral-500">
                ID: <code className="text-neutral-400">{s.id}</code>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(s)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(s.id, s.name)}
                  className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-white border border-red-500/30 transition-all cursor-pointer"
                  title="Delete Sponsor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl rounded-2xl bg-neutral-950 border border-neutral-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-red-950/70 border border-red-500/40 text-red-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-xl text-white">
                      {editingSponsorId ? 'EDIT SPONSOR' : 'ADD NEW SPONSOR'}
                    </h3>
                    <p className="text-xs font-cyber text-neutral-400">
                      Configure circular brand logo, business description, and partnership tier.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Circular Logo Preview & Upload */}
                <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full border-2 border-red-500/60 bg-black flex-shrink-0 p-1 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(223,37,49,0.3)]">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain rounded-full" />
                    ) : (
                      <Building2 className="w-8 h-8 text-neutral-600" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-mono uppercase font-bold text-neutral-300 block">
                      Circular Sponsor Logo
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all border border-neutral-700">
                        <Upload className="w-3.5 h-3.5 text-red-400" />
                        <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileSelect}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                      <span className="text-[11px] text-neutral-500 font-mono">PNG / JPG / WebP</span>
                    </div>
                    <input
                      type="url"
                      placeholder="Or enter direct image URL (https://...)"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black border border-neutral-800 text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Sponsor Name */}
                <div>
                  <label className="text-xs font-mono uppercase font-bold text-neutral-300 block mb-1">
                    Sponsor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MICROSOFT AZURE or NEXUS CLOUD"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm font-heading font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Subtitle / Business Description */}
                <div>
                  <label className="text-xs font-mono uppercase font-bold text-neutral-300 block mb-1">
                    Business Subtitle / Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="What the business is about (e.g. Cloud & AI Infrastructure Partner)"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-cyber text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Tier and Order Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono uppercase font-bold text-neutral-300 block mb-1">
                      Partnership Tier
                    </label>
                    <select
                      value={tier}
                      onChange={(e) => setTier(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    >
                      {COMMON_TIERS.map((t) => (
                        <option key={t} value={t} className="bg-neutral-950 text-white">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase font-bold text-neutral-300 block mb-1">
                      Display Order (1 = First)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={order}
                      onChange={(e) => setOrder(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Website URL */}
                <div>
                  <label className="text-xs font-mono uppercase font-bold text-neutral-300 block mb-1">
                    Website URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://sponsor.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(223,37,49,0.4)] cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingSponsorId ? 'Save Changes' : 'Publish Sponsor'}</span>
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
