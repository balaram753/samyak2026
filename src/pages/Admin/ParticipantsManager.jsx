import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, Filter, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, ShieldCheck, UserCheck, X,
  RefreshCw, Loader2, AlertCircle
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { getStaffProfile } from '../../services/gatePassService';
import { markAttendance, cancelAttendance, ATTENDANCE_STATUS } from '../../services/attendanceService';
import { auth } from '../../services/firebase';
import { maskPhone } from '../../services/fileSecurityService';

const FILTER_OPTIONS = [
  { id: 'ALL', label: 'All' },
  { id: 'INTERNAL', label: 'Internal' },
  { id: 'EXTERNAL', label: 'External' },
  { id: 'PAYMENT_PENDING', label: 'Payment Pending' },
  { id: 'PAYMENT_VERIFIED', label: 'Payment Verified' },
  { id: 'PRESENT', label: 'Present' },
  { id: 'ABSENT', label: 'Absent' },
];

function CategoryBadge({ category, verificationStatus }) {
  if (!category) return null;
  const isInternal = category === 'INTERNAL';
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
        isInternal
          ? 'bg-blue-950/60 border border-blue-500/40 text-blue-400'
          : 'bg-purple-950/60 border border-purple-500/40 text-purple-400'
      }`}>
        {isInternal ? '🏫' : '🎓'} {category}
      </span>
      {verificationStatus && verificationStatus !== 'VERIFIED' && (
        <span className={`inline-flex text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
          verificationStatus === 'PENDING' ? 'text-amber-400 bg-amber-950/40' : 'text-red-400 bg-red-950/40'
        }`}>
          {verificationStatus}
        </span>
      )}
    </div>
  );
}

function PaymentBadge({ status }) {
  const map = {
    PENDING_PAYMENT: { label: 'Pending Payment', cls: 'text-neutral-400 bg-neutral-900 border-neutral-700' },
    PAYMENT_SUBMITTED: { label: 'Submitted', cls: 'text-amber-400 bg-amber-950/40 border-amber-500/30' },
    PENDING_VERIFICATION: { label: 'Under Review', cls: 'text-amber-400 bg-amber-950/40 border-amber-500/30' },
    VERIFIED: { label: '✓ Verified', cls: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' },
    REJECTED: { label: '✗ Rejected', cls: 'text-red-400 bg-red-950/40 border-red-500/30' },
  };
  const info = map[status] || { label: status || 'Unknown', cls: 'text-neutral-500 bg-neutral-900 border-neutral-800' };
  return (
    <span className={`inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full border ${info.cls}`}>
      {info.label}
    </span>
  );
}

function AttendanceBadge({ status }) {
  if (status === ATTENDANCE_STATUS.PRESENT) {
    return <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/40 text-emerald-400"><CheckCircle2 className="w-3 h-3" />PRESENT</span>;
  }
  if (status === ATTENDANCE_STATUS.CANCELLED) {
    return <span className="inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/50 border border-red-500/40 text-red-400">CANCELLED</span>;
  }
  return <span className="inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500">NOT MARKED</span>;
}

function GatePassBadge({ category, gatePassStatus }) {
  if (category === 'INTERNAL') {
    return <span className="inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/40 border border-blue-500/30 text-blue-400">NOT REQUIRED</span>;
  }
  const map = {
    NOT_ISSUED: { label: 'Not Issued', cls: 'text-neutral-500 bg-neutral-900 border-neutral-800' },
    ISSUED: { label: '✓ Issued', cls: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' },
    USED: { label: 'Used ✓', cls: 'text-blue-400 bg-blue-950/40 border-blue-500/30' },
    CANCELLED: { label: 'Revoked', cls: 'text-red-400 bg-red-950/40 border-red-500/30' },
    NOT_REQUIRED: { label: 'N/A', cls: 'text-neutral-500 bg-neutral-900 border-neutral-800' },
  };
  const status = gatePassStatus || 'NOT_ISSUED';
  const info = map[status] || { label: status, cls: 'text-neutral-500 bg-neutral-900 border-neutral-800' };
  return <span className={`inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full border ${info.cls}`}>{info.label}</span>;
}

export default function ParticipantsManager({ onToast }) {
  const { adminUser, isSuperAdmin } = useAdminAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(null);

  // Load staff profile for permission checks
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const profile = await getStaffProfile(user);
          setStaffInfo(profile);
        } catch {
          setStaffInfo(null);
        }
      } else {
        setStaffInfo(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Live Firestore listener on registrations collection
  useEffect(() => {
    setLoading(true);
    try {
      const colRef = collection(db, 'registrations');
      const unsub = onSnapshot(colRef, (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        // Sort by createdAt descending
        list.sort((a, b) => {
          const ta = a.createdAt?.seconds ? a.createdAt.seconds : 0;
          const tb = b.createdAt?.seconds ? b.createdAt.seconds : 0;
          return tb - ta;
        });
        setParticipants(list);
        setLoading(false);
      }, (err) => {
        console.warn('Participants listener note:', err);
        setLoading(false);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Participants listener error:', e);
      setLoading(false);
    }
  }, []);

  // Filtered + searched list
  const filtered = useMemo(() => {
    let list = [...participants];

    // Filter
    if (activeFilter === 'INTERNAL') list = list.filter(p => p.category === 'INTERNAL');
    else if (activeFilter === 'EXTERNAL') list = list.filter(p => p.category === 'EXTERNAL');
    else if (activeFilter === 'PAYMENT_PENDING') {
      list = list.filter(p => ['PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PENDING_VERIFICATION'].includes(p.payment?.status));
    }
    else if (activeFilter === 'PAYMENT_VERIFIED') list = list.filter(p => p.payment?.status === 'VERIFIED');
    else if (activeFilter === 'PRESENT') list = list.filter(p => p.attendance?.status === 'PRESENT');
    else if (activeFilter === 'ABSENT') list = list.filter(p => p.attendance?.status !== 'PRESENT');

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => (
        (p.name || '').toLowerCase().includes(q) ||
        (p.studentId || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.mobile || '').toLowerCase().includes(q) ||
        (p.college || '').toLowerCase().includes(q) ||
        (p.registrationId || '').toLowerCase().includes(q)
      ));
    }

    return list;
  }, [participants, activeFilter, searchQuery]);

  const canManageAttendance = staffInfo && staffInfo.isStaff &&
    ['SUPER_ADMIN', 'ADMIN', 'CORE_TEAM'].includes(staffInfo.role) &&
    staffInfo.permissions?.manageAttendance !== false;

  const handleMarkPresent = async (participant) => {
    if (!canManageAttendance) {
      onToast?.('You do not have permission to mark attendance.', 'error');
      return;
    }
    try {
      setActionLoading(participant.id);
      await markAttendance(participant.id, staffInfo);
      onToast?.(`✓ Attendance marked — ${participant.name}`);
    } catch (err) {
      if (err.message.includes('ALREADY_PRESENT')) {
        onToast?.(`${participant.name} is already marked present.`, 'error');
      } else {
        onToast?.(err.message || 'Failed to mark attendance.', 'error');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelAttendance = async () => {
    if (!showCancelModal || !canManageAttendance) return;
    if (!cancelReason.trim()) {
      onToast?.('Please enter a reason for cancelling attendance.', 'error');
      return;
    }
    try {
      setActionLoading(showCancelModal.id);
      await cancelAttendance(showCancelModal.id, staffInfo, cancelReason.trim());
      onToast?.(`Attendance cancelled for ${showCancelModal.name}.`);
      setShowCancelModal(null);
      setCancelReason('');
    } catch (err) {
      onToast?.(err.message || 'Failed to cancel attendance.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-black text-white font-heading">Participants</h2>
          <span className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-400">
            {filtered.length} / {participants.length}
          </span>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-red-400 animate-spin" />}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/60 text-sm"
            placeholder="Search by name, student ID, email, mobile, college…"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-neutral-500 hover:text-white" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                activeFilter === f.id
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-red-500/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Participants List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-neutral-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading participants…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-neutral-600 font-mono text-sm">
          No participants found
          {searchQuery ? ` matching "${searchQuery}"` : ''}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <motion.div
              key={p.id}
              layout
              className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 transition-all"
            >
              {/* Row */}
              <button
                className="w-full px-4 py-3 text-left flex items-center gap-4"
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-700 to-rose-500 flex items-center justify-center text-sm font-black text-white flex-shrink-0">
                  {(p.name || 'U').charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm truncate">{p.name || '—'}</span>
                    <CategoryBadge category={p.category} verificationStatus={p.categoryVerificationStatus} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-neutral-500 text-xs font-mono">{p.studentId || 'No ID'}</span>
                    <span className="text-neutral-700">·</span>
                    <span className="text-neutral-500 text-xs truncate">{p.college || '—'}</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex-shrink-0 flex flex-col gap-1 items-end">
                  <PaymentBadge status={p.payment?.status} />
                  <AttendanceBadge status={p.attendance?.status} />
                </div>

                {expandedId === p.id
                  ? <ChevronUp className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                }
              </button>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedId === p.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-neutral-800 px-4 pb-4 pt-3"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      {[
                        ['Registration ID', p.registrationId || p.id],
                        ['Email', p.email || '—'],
                        ['Mobile', maskPhone(p.mobile)],
                        ['Branch', p.branch || '—'],
                        ['Gate Pass', null],
                        ['Attendance', null],
                      ].map(([label, value]) => (
                        <div key={label} className="bg-neutral-900 rounded-xl p-2.5">
                          <div className="text-[10px] font-mono text-neutral-500 uppercase mb-1">{label}</div>
                          {label === 'Gate Pass' ? (
                            <GatePassBadge category={p.category} gatePassStatus={p.gatePass?.status} />
                          ) : label === 'Attendance' ? (
                            <AttendanceBadge status={p.attendance?.status} />
                          ) : (
                            <div className="text-white text-xs font-mono truncate">{value}</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Attendance Actions */}
                    {canManageAttendance && (
                      <div className="flex flex-wrap gap-2">
                        {p.attendance?.status !== ATTENDANCE_STATUS.PRESENT ? (
                          <button
                            onClick={() => handleMarkPresent(p)}
                            disabled={actionLoading === p.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/70 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {actionLoading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                            {p.category === 'INTERNAL' ? 'Mark Present' : 'Mark Present (Manual)'}
                          </button>
                        ) : (
                          isSuperAdmin && (
                            <button
                              onClick={() => setShowCancelModal(p)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/50 border border-red-500/40 text-red-400 hover:bg-red-950/70 text-xs font-bold transition-all"
                            >
                              <XCircle className="w-3 h-3" />
                              Cancel Attendance
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {/* External gate pass note */}
                    {p.category === 'EXTERNAL' && p.payment?.status === 'VERIFIED' && p.gatePass?.status === 'ISSUED' && (
                      <div className="mt-2 text-xs text-neutral-500 font-mono">
                        External participant — attendance via Gate Pass QR scan at entry.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Cancel Attendance Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-neutral-950 border border-red-500/40 rounded-3xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-black text-white font-heading mb-1">Cancel Attendance</h3>
              <p className="text-neutral-400 text-sm mb-4">
                You are cancelling the attendance record for <strong className="text-white">{showCancelModal.name}</strong>.
                This action is logged in the audit trail.
              </p>
              <div className="mb-4">
                <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">Reason *</label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-sm focus:outline-none focus:border-red-500/60 resize-none"
                  placeholder="Enter reason for cancellation…"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCancelModal(null); setCancelReason(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelAttendance}
                  disabled={actionLoading !== null}
                  className="flex-1 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Processing…' : 'Confirm Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
