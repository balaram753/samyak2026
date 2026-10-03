import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Plus, ArrowLeft, Download, Search, Filter, 
  Copy, Trash2, CheckCircle2, AlertCircle, 
  UserCheck, Lock, ExternalLink, ChevronDown, 
  Building
} from 'lucide-react';
import { 
  collection, 
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAdminAuth, isSuperAdminEmail } from '../../context/AdminAuthContext';
import { isKnownRole } from '../../services/roles';
import { useSiteContent } from '../../context/SiteContentContext';
import CloudMigrationPanel from './CloudMigrationPanel';

const WING_OPTIONS = [
  'All Wings / Depts',
  'CSE - Core',
  'TECH & SOCIETY',
  'Technical Events Wing',
  'Cultural & Arts Wing',
  'Workshops & Emerging Tech',
  'Gaming & Esports Arena',
  'Finance & Registrations',
  'Media & Public Relations',
  'Faculty & Advisory Board',
];

// Display label -> least-privilege role enforced by firestore.rules and the Worker.
// "Cultural Coordinator" has no defined scope yet, so it cannot be provisioned.
const ROLE_FOR_LABEL = {
  'Full Administrator': 'admin',
  'Registrations Desk Admin': 'registrations_desk',
  'Events Wing Admin': 'events_admin',
  'Technology Club Admin': 'club_admin',
};

const ROLE_OPTIONS = ['All Roles', ...Object.keys(ROLE_FOR_LABEL)];

const STATUS_OPTIONS = [
  'All Statuses',
  'Active',
  'Suspended',
];

const STARTER_ROSTER = [
  {
    id: 'admin_tech_01',
    fullName: 'Rahul Sharma',
    username: 'rahul.samyak',
    email: 'rahul.tech@kluniversity.in',
    phone: '+91 98480 12345',
    wing: 'Technical Events Wing',
    role: 'Full Administrator',
    club: 'RPA Club',
    status: 'active',
  },
  {
    id: 'admin_rpa_02',
    fullName: 'Uday Kiran',
    username: 'uday.rpa',
    email: 'uday.rpa@kluniversity.in',
    phone: '+91 98765 43210',
    wing: 'CSE - Core',
    role: 'Technology Club Admin',
    club: 'RPA Club',
    status: 'active',
  },
  {
    id: 'admin_cult_03',
    fullName: 'Priya Varma',
    username: 'priya.samyak',
    email: 'priya.cult@kluniversity.in',
    phone: '+91 98480 23456',
    wing: 'Cultural & Arts Wing',
    role: 'Cultural Coordinator',
    club: 'Music & Dance Guild',
    status: 'active',
  },
  {
    id: 'admin_game_04',
    fullName: 'Karthik Raja',
    username: 'karthik.samyak',
    email: 'karthik.game@kluniversity.in',
    phone: '+91 98480 34567',
    wing: 'Gaming & Esports Arena',
    role: 'Events Wing Admin',
    club: 'Gaming & Animation Club',
    status: 'active',
  },
  {
    id: 'admin_fin_05',
    fullName: 'Ananya Reddy',
    username: 'ananya.samyak',
    email: 'ananya.fin@kluniversity.in',
    phone: '+91 98480 45678',
    wing: 'Finance & Registrations',
    role: 'Registrations Desk Admin',
    club: 'FinTech & Trading Club',
    status: 'active',
  },
  {
    id: 'admin_media_06',
    fullName: 'Siddharth Rao',
    username: 'siddharth.samyak',
    email: 'siddharth.media@kluniversity.in',
    phone: '+91 98480 56789',
    wing: 'Media & Public Relations',
    role: 'Full Administrator',
    club: 'Marketing & Branding Guild',
    status: 'active',
  },
  {
    id: 'admin_ai_07',
    fullName: 'Meera Nambiar',
    username: 'meera.samyak',
    email: 'meera.ai@kluniversity.in',
    phone: '+91 98480 67890',
    wing: 'Workshops & Emerging Tech',
    role: 'Technology Club Admin',
    club: 'AI & Machine Learning Club',
    status: 'active',
  },
];



export default function SuperadminSuite({ onToast }) {
  const { provisionNewAdmin, deleteAdmin } = useAdminAuth();
  const { departments } = useSiteContent();

  const [viewMode, setViewMode] = useState('roster'); // 'roster' or 'provision'
  const [adminsList, setAdminsList] = useState([]);

  // Extract all active clubs configured dynamically across all departments
  const activeClubs = useMemo(() => {
    if (!departments || departments.length === 0) return [];
    const list = [];
    departments.forEach((dept) => {
      (dept.clubs || []).forEach((c) => {
        if (c && !list.some((item) => item.name.toLowerCase() === c.toLowerCase())) {
          list.push({
            name: c,
            deptCode: dept.code,
            deptName: dept.name,
          });
        }
      });
    });
    return list;
  }, [departments]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWing, setSelectedWing] = useState('All Wings / Depts');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');

  const [copiedCardId, setCopiedCardId] = useState(null);

  // Provision Form State
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    wing: 'TECH & SOCIETY',
    role: 'Full Administrator',
    club: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Platform Lockdown / Maintenance State (Synced to Firestore site_content/settings)
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState('Scheduled Platform Maintenance & Upgrades in Progress');
  const [updatingMaintenance, setUpdatingMaintenance] = useState(false);

  useEffect(() => {
    try {
      const settingsRef = doc(db, 'site_content', 'settings');
      const unsub = onSnapshot(settingsRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setMaintenanceActive(Boolean(d.maintenance_mode));
          if (d.maintenance_reason) setMaintenanceReason(d.maintenance_reason);
        }
      });
      return () => unsub();
    } catch {}
  }, []);

  const handleToggleLockdown = async () => {
    const newStatus = !maintenanceActive;
    if (newStatus) {
      const confirmLock = window.confirm(
        'Enable Platform Maintenance Mode & System Lockdown?\n\n' +
        '• Public visitors and delegates will see the Maintenance & Security Lock page.\n' +
        '• Regular sub-admins will be restricted.\n' +
        '• Super Admin retains full access to this console.\n\n' +
        'Proceed with lockdown?'
      );
      if (!confirmLock) return;
    }

    try {
      setUpdatingMaintenance(true);
      const settingsRef = doc(db, 'site_content', 'settings');
      await setDoc(settingsRef, {
        maintenance_mode: newStatus,
        maintenance_reason: maintenanceReason,
        updated_at: serverTimestamp(),
      }, { merge: true });

      setMaintenanceActive(newStatus);
      onToast(
        newStatus
          ? 'Platform Lockdown ACTIVE: Visitors & sub-admins locked out. Open for Super Admin.'
          : 'Platform Lockdown DISABLED: Public and sub-admin access restored!',
        newStatus ? 'info' : 'success'
      );
    } catch (err) {
      onToast('Error updating lockdown: ' + err.message, 'error');
    } finally {
      setUpdatingMaintenance(false);
    }
  };

  // Real-time Firestore sync of admins collection
  useEffect(() => {
    const adminsCol = collection(db, 'admins');
    const unsub = onSnapshot(adminsCol, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Don't show super admins in sub-admin roster
        if (!isSuperAdminEmail(data.email)) {
          list.push({ id: docSnap.id, ...data });
        }
      });

      if (list.length === 0) {
        // Fall back to starter roster if Firestore has no sub-admins yet
        setAdminsList(STARTER_ROSTER);
      } else {
        setAdminsList(list);
      }
    }, (err) => {
      console.warn('Admins listener note:', err);
      setAdminsList(STARTER_ROSTER);
    });

    return () => unsub();
  }, []);

  // Filtered sub-administrators
  const filteredAdmins = useMemo(() => {
    return adminsList.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.fullName?.toLowerCase().includes(q);
        const matchUsername = item.username?.toLowerCase().includes(q);
        const matchEmail = item.email?.toLowerCase().includes(q);
        const matchClub = item.club?.toLowerCase().includes(q);
        if (!matchName && !matchUsername && !matchEmail && !matchClub) return false;
      }

      // Wing filter
      if (selectedWing !== 'All Wings / Depts' && item.wing !== selectedWing) {
        return false;
      }

      // Role filter
      if (selectedRole !== 'All Roles' && (item.roleLabel || item.role) !== selectedRole) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'All Statuses' && item.status?.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [adminsList, searchQuery, selectedWing, selectedRole, selectedStatus]);

  // Copy Onboarding Card / Invitation to Clipboard (Exact Reference Format)
  const handleCopyCard = async (admin) => {
    const portalUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'))
      ? `${window.location.origin}/admin/login` 
      : 'https://kl--samyak.web.app/admin/login';

    const invitationText = `SAMYAK 2026 ADMIN ACCESS INVITATION
--------------------------------
Admin Portal: ${portalUrl}
Sign in with Google using: ${admin.email}
Department / Wing: ${admin.wing}
Role: ${admin.roleLabel || admin.role}${admin.club ? `\nAssigned Club: ${admin.club}` : ''}`;

    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(invitationText);
        copied = true;
      }
    } catch {}

    if (!copied) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = invitationText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.error('Clipboard copy fallback error:', err);
      }
    }

    setCopiedCardId(admin.id);
    setTimeout(() => setCopiedCardId(null), 2500);
    onToast(`Admin invitation card for @${admin.username} copied to clipboard!`, 'success');
  };

  // Revoke / Delete Admin
  const handleDeleteAdmin = async (admin) => {
    const confirm = window.confirm(`Are you sure you want to revoke and delete administrator access for ${admin.fullName} (@${admin.username})?`);
    if (!confirm) return;

    try {
      await deleteAdmin(admin.id);
      setAdminsList((prev) => prev.filter((a) => a.id !== admin.id));
      onToast(`Administrator @${admin.username} revoked successfully.`, 'success');
    } catch (e) {
      onToast('Failed to delete admin: ' + e.message, 'error');
    }
  };

  // Export Roster CSV
  const handleExportCSV = () => {
    const headers = ['Full Name', 'Username', 'Email', 'Phone', 'Wing', 'Role', 'Club/Unit', 'Status'];
    const rows = filteredAdmins.map((a) => [
      `"${a.fullName || ''}"`,
      `"@${a.username || ''}"`,
      `"${a.email || ''}"`,
      `"${a.phone || ''}"`,
      `"${a.wing || ''}"`,
      `"${a.role || ''}"`,
      `"${a.club || ''}"`,
      `"${a.status || 'active'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `samyak_2026_administrators_roster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('Administrators roster exported as CSV successfully!');
  };

  // Submit Provision Form
  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.username.trim() || !formData.email.trim()) {
      onToast('Full name, admin username and Google account email are required.', 'error');
      return;
    }

    if (formData.role === 'Technology Club Admin' && !formData.club?.trim()) {
      onToast('Please select or enter the assigned Technology Club for this admin.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const created = await provisionNewAdmin({
        ...formData,
        role: ROLE_FOR_LABEL[formData.role],
        roleLabel: formData.role,
      });
      onToast(`Administrator @${created.username} provisioned. They sign in with Google as ${created.email}.`, 'success');
      
      // Reset and return to roster
      setFormData({
        fullName: '',
        username: '',
        email: '',
        phone: '',
        wing: 'TECH & SOCIETY',
        role: 'Full Administrator',
        club: '',
      });
      setViewMode('roster');
    } catch (err) {
      onToast('Provisioning failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 select-none">
      <CloudMigrationPanel onToast={onToast} />

      {/* =====================================================================
          VIEW: PROVISION NEW ADMINISTRATOR (MATCHING SCREENSHOT 2)
          ===================================================================== */}
      {viewMode === 'provision' ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-4xl mx-auto"
        >
          {/* Top Bar with Back, Cancel & Provision buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <button
              type="button"
              onClick={() => setViewMode('roster')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono transition-all w-fit cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-red-400" />
              <span>Back to Administrators Roster</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('roster')}
                className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs font-mono transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleProvisionSubmit}
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(223,37,49,0.4)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>{submitting ? 'Provisioning...' : 'Provision Administrator'}</span>
              </button>
            </div>
          </div>

          {/* Provision Header */}
          <div>
            <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-1">
              SUPERADMIN SUITE • SAMYAK 2026
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">
              Provision New <span className="text-red-500 text-glow-red">Administrator</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400 font-cyber">
              Superadmin Console: Assign wing leadership and role privileges. Admins sign in with the Google account entered here.
            </p>
          </div>

          <form onSubmit={handleProvisionSubmit} className="space-y-6">
            
            {/* Section 1: Administrator Identity & Contact Details */}
            <div className="p-6 sm:p-7 rounded-3xl cyber-card border border-neutral-800 bg-neutral-900/60 space-y-5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-red-400 pb-3 border-b border-neutral-800/80">
                <Shield className="w-4 h-4 text-red-500" />
                <span>1. Administrator Identity &amp; Contact Details</span>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 font-cyber focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    Admin Username (Login Handle) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">@</span>
                    <input
                      type="text"
                      placeholder="e.g. rahul.samyak"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') })}
                      required
                      className="w-full pl-8 pr-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 font-mono focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 mt-1 block">
                    Allowed: lowercase letters, numbers, dots, underscores.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    Google Account Email *
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@kluniversity.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 font-cyber focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                  Contact Phone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full sm:w-1/2 px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 font-mono focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
              </div>
            </div>

            {/* Section 2: Wings of SAMYAK & Role Permissions */}
            <div className="p-6 sm:p-7 rounded-3xl cyber-card border border-neutral-800 bg-neutral-900/60 space-y-5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-red-400 pb-3 border-b border-neutral-800/80">
                <Building className="w-4 h-4 text-red-500" />
                <span>2. Wings of SAMYAK &amp; Role Permissions</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    Assigned Wing / Department *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.wing}
                      onChange={(e) => setFormData({ ...formData, wing: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500 appearance-none cursor-pointer"
                    >
                      {WING_OPTIONS.filter((w) => w !== 'All Wings / Depts').map((w) => (
                        <option key={w} value={w} className="bg-neutral-950 text-white">{w}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 mt-1 block">
                    Select from festival student governance wings or department tracks.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    Assigned Administrative Role *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500 appearance-none cursor-pointer"
                    >
                      {ROLE_OPTIONS.filter((r) => r !== 'All Roles').map((r) => (
                        <option key={r} value={r} className="bg-neutral-950 text-white">{r}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 mt-1 block">
                    Defines administrative privileges across pages, clubs, events, and forms.
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-[11px] font-mono uppercase tracking-wider ${
                    formData.role === 'Technology Club Admin' ? 'text-red-400 font-bold' : 'text-neutral-300'
                  }`}>
                    Assigned Technology Club {formData.role === 'Technology Club Admin' ? '*' : '(Optional)'}
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {activeClubs.length} Active Clubs from Depts
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <select
                      value={formData.club}
                      onChange={(e) => {
                        const selectedVal = e.target.value;
                        const matched = activeClubs.find((c) => c.name === selectedVal);
                        setFormData({
                          ...formData,
                          club: selectedVal,
                          ...(matched && (!formData.wing || formData.wing === 'TECH & SOCIETY') ? { wing: `${matched.deptCode} - Core` } : {}),
                        });
                      }}
                      className={`w-full px-4 py-3 rounded-2xl bg-neutral-950 border text-xs text-white font-cyber focus:outline-none appearance-none cursor-pointer transition-all ${
                        formData.role === 'Technology Club Admin' && !formData.club
                          ? 'border-red-500 ring-1 ring-red-500/40'
                          : 'border-neutral-800 focus:border-red-500'
                      }`}
                    >
                      <option value="">-- Select from Configured Technology Clubs ({activeClubs.length}) --</option>
                      {departments?.map((dept) => (
                        <optgroup key={dept.code} label={`${dept.code} — ${dept.name}`}>
                          {(dept.clubs || []).map((clubName) => (
                            <option key={clubName} value={clubName}>
                              {clubName}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Manual fallback input */}
                  <input
                    type="text"
                    placeholder="Or enter custom club name..."
                    value={formData.club}
                    onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 placeholder:text-neutral-600 font-cyber focus:outline-none focus:border-red-500 transition-all"
                  />
                </div>
                <span className="text-[10px] font-mono text-neutral-500 mt-1 block">
                  {formData.role === 'Technology Club Admin'
                    ? '⚠️ This admin will have a dedicated Technology Club Portal filtered to this club for Attendance & Event Reports.'
                    : 'Assigning a club links the administrator to their designated student organization.'}
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setViewMode('roster')}
                className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs font-mono transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(223,37,49,0.45)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>{submitting ? 'Provisioning...' : 'Provision Administrator'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        /* =====================================================================
            VIEW: ADMINISTRATORS ROSTER (MATCHING SCREENSHOT 1)
            ===================================================================== */
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <span>SUPERADMIN SUITE • SAMYAK 2026</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">
                Administrator Management &amp; <span className="text-red-500 text-glow-red">Access Control</span>
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-neutral-400 font-cyber">
                Exclusive Superadmin Console: Create and manage sub-administrators and their security privileges.
              </p>
            </div>

          </div>

          {/* Action Hero Card (Administrator Governance & Provisioning) */}
          <div className="p-6 sm:p-8 rounded-3xl cyber-card border border-red-500/30 bg-gradient-to-r from-neutral-900/90 via-red-950/20 to-neutral-900/90 shadow-[0_0_40px_rgba(223,37,49,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono uppercase tracking-widest text-amber-300">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>SUPERADMIN ACCESS CONSOLE</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight">
                Administrator Governance &amp; Provisioning
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 font-cyber leading-relaxed">
                Provision sub-administrators across all SAMYAK wings by Google account and manage security permissions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-600 text-xs font-mono transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-red-400" />
                <span>Export Roster CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData({
                    fullName: '',
                    username: '',
                    email: '',
                    phone: '',
                    wing: 'TECH & SOCIETY',
                    role: 'Full Administrator',
                    club: '',
                  });
                  setViewMode('provision');
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(223,37,49,0.4)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Admin</span>
              </button>
            </div>
          </div>

          {/* Platform Maintenance Mode & Security Lockdown Controller Card */}
          <div className={`p-6 sm:p-7 rounded-3xl cyber-card border transition-all duration-300 ${
            maintenanceActive 
              ? 'bg-red-950/30 border-red-500/60 shadow-[0_0_35px_rgba(223,37,49,0.2)]' 
              : 'bg-neutral-900/60 border-neutral-800'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 ${
                    maintenanceActive
                      ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                      : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${maintenanceActive ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
                    <span>SYSTEM LOCK: {maintenanceActive ? 'SECURITY LOCKDOWN ACTIVE' : 'PLATFORM ONLINE (NORMAL)'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">Real-time Cloud Switch</span>
                </div>

                <h3 className="text-xl font-black font-heading text-white tracking-tight">
                  Platform Lockdown &amp; Maintenance Gateway
                </h3>

                <p className="text-xs text-neutral-400 font-cyber leading-relaxed">
                  {maintenanceActive ? (
                    <span className="text-red-300">
                      ⚠️ <strong>Lockdown is currently ON:</strong> Public visitors and regular sub-admins see the Maintenance &amp; Security Lock screen. You (Super Admin) have exclusive operational access to this dashboard.
                    </span>
                  ) : (
                    <span>
                      Control the global site maintenance screen. When enabled, regular visitors and sub-admins are restricted, while Super Admin maintains complete uninterrupted access.
                    </span>
                  )}
                </p>
              </div>

              {/* Big Action Toggle Switch */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleToggleLockdown}
                  disabled={updatingMaintenance}
                  className={`px-6 py-3.5 rounded-2xl font-heading font-black text-xs uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer shadow-lg disabled:opacity-50 ${
                    maintenanceActive
                      ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white shadow-[0_0_25px_rgba(223,37,49,0.5)] hover:brightness-110'
                      : 'bg-neutral-950 hover:bg-neutral-900 text-neutral-300 border border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  <Lock className={`w-4 h-4 ${maintenanceActive ? 'text-white animate-pulse' : 'text-neutral-400'}`} />
                  <span>
                    {updatingMaintenance
                      ? 'Updating Cloud State...'
                      : maintenanceActive
                      ? 'Turn Lockdown OFF'
                      : 'Turn Lockdown ON'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, username, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 font-cyber focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Wing Filter */}
              <select
                value={selectedWing}
                onChange={(e) => setSelectedWing(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 font-cyber focus:outline-none focus:border-red-500 cursor-pointer"
              >
                {WING_OPTIONS.map((w) => (
                  <option key={w} value={w} className="bg-neutral-950 text-white">{w}</option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 font-cyber focus:outline-none focus:border-red-500 cursor-pointer"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r} className="bg-neutral-950 text-white">{r}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 font-cyber focus:outline-none focus:border-red-500 cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-neutral-950 text-white">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Administrator Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {filteredAdmins.map((admin) => {
                return (
                  <motion.div
                    key={admin.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="p-5 rounded-3xl cyber-card border border-neutral-800 bg-neutral-900/50 hover:border-red-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-sm hover:shadow-[0_0_25px_rgba(223,37,49,0.15)]"
                  >
                    {/* Top Row: Role Badge & Active Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-800 text-neutral-300 border border-neutral-700 truncate">
                        {admin.roleLabel || admin.role}
                      </span>
                      {!isKnownRole(admin.role) && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-amber-950/60 text-amber-300 border border-amber-500/40" title="This legacy role grants no access until it is migrated to a supported role.">
                          Needs migration
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="capitalize">{admin.status || 'Active'}</span>
                      </div>
                    </div>

                    {/* Admin Identity Info */}
                    <div className="space-y-1">
                      <h4 className="text-base font-black font-heading text-white group-hover:text-red-400 transition-colors">
                        {admin.fullName}
                      </h4>
                      <div className="text-xs font-mono text-neutral-400">
                        @{admin.username}
                      </div>
                      <div className="text-[11px] font-cyber text-neutral-400 flex items-center gap-1.5 pt-1">
                        <Building className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span className="truncate">{admin.wing}</span>
                      </div>
                    </div>

                    {/* Assigned Club / Panel Pill (if present) */}
                    {admin.club && (
                      <div className="p-2 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-cyber text-neutral-300 truncate">
                          {admin.club}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono text-red-300 bg-red-950/60 border border-red-500/30 flex-shrink-0">
                          Club Panel
                        </span>
                      </div>
                    )}

                    {/* Card Actions: Copy Card, Revoke */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
                      <button
                        type="button"
                        onClick={() => handleCopyCard(admin)}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                          copiedCardId === admin.id
                            ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700 hover:border-red-500/40'
                        }`}
                        title="Copy formatted invitation to send via WhatsApp or Email"
                      >
                        {copiedCardId === admin.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="font-bold text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-red-400" />
                            <span>Copy Card</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAdmin(admin)}
                        className="p-2 rounded-xl bg-neutral-900 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-500/40 transition-colors"
                        title="Revoke and delete administrator access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredAdmins.length === 0 && (
            <div className="p-12 text-center rounded-3xl bg-neutral-900/30 border border-dashed border-neutral-800 space-y-2">
              <p className="text-sm font-cyber text-neutral-400">
                No administrators found matching your filter criteria.
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedWing('All Wings / Depts'); setSelectedRole('All Roles'); setSelectedStatus('All Statuses'); }}
                className="text-xs font-mono text-red-400 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
