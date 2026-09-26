import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck, Search, CheckCircle2, XCircle, Loader2,
  AlertCircle, Clock, BarChart3, Users, X
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { getStaffProfile } from '../../services/gatePassService';
import { markAttendance, cancelAttendance, ATTENDANCE_STATUS } from '../../services/attendanceService';
import { listenToEventStats } from '../../services/registrationService';

export default function AttendanceManager({ onToast }) {
  const { isSuperAdmin, adminUser } = useAdminAuth();

  // Live stats
  const [stats, setStats] = useState(null);
  // Audit log
  const [auditLog, setAuditLog] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);

  // Staff profile for permission checks
  const [staffInfo, setStaffInfo] = useState(null);

  // Action state
  const [actionLoading, setActionLoading] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Load staff profile
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const profile = await getStaffProfile(user);
          setStaffInfo(profile);
        } catch {
          setStaffInfo(null);
        }
      }
    });
    return () => unsub();
  }, []);

  // Live eventStats listener
  useEffect(() => {
    const unsub = listenToEventStats((data) => setStats(data));
    return () => { if (unsub) unsub(); };
  }, []);

  // Live attendance audit log (last 50)
  useEffect(() => {
    setLoadingAudit(true);
    try {
      const q = query(
        collection(db, 'attendanceAudit'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const unsub = onSnapshot(q, (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setAuditLog(list);
        setLoadingAudit(false);
      }, (err) => {
        console.warn('attendanceAudit listener:', err.message);
        setLoadingAudit(false);
      });
      return () => unsub();
    } catch (e) {
      setLoadingAudit(false);
    }
  }, []);

  // All participants listener
  useEffect(() => {
    setLoadingParticipants(true);
    const colRef = collection(db, 'registrations');
    const unsub = onSnapshot(colRef, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setParticipants(list);
      setLoadingParticipants(false);
    }, () => setLoadingParticipants(false));
    return () => unsub();
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return participants.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.studentId || '').toLowerCase().includes(q) ||
      (p.mobile || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.registrationId || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [searchQuery, participants]);

  const canManageAttendance = staffInfo?.isStaff &&
    ['SUPER_ADMIN', 'ADMIN', 'CORE_TEAM'].includes(staffInfo?.role) &&
    staffInfo?.permissions?.manageAttendance !== false;

  const handleMarkPresent = async (participant) => {
    if (!canManageAttendance) {
      onToast?.('You do not have permission to mark attendance.', 'error');
      return;
    }
    try {
      setActionLoading(participant.id);
      await markAttendance(participant.id, staffInfo);
      onToast?.(`✓ Marked PRESENT — ${participant.name}`);
    } catch (err) {
      if (err.message?.includes('ALREADY_PRESENT')) {
        onToast?.(`${participant.name} is already marked present.`, 'error');
      } else {
        onToast?.(err.message || 'Failed to mark attendance.', 'error');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelAttendance = async () => {
    if (!showCancelModal || !cancelReason.trim()) {
      onToast?.('Please enter a reason to cancel attendance.', 'error');
      return;
    }
    try {
      setActionLoading(showCancelModal.id);
      await cancelAttendance(showCancelModal.id, staffInfo, cancelReason.trim());
      onToast?.(`Attendance cancelled — ${showCancelModal.name}`);
      setShowCancelModal(null);
      setCancelReason('');
    } catch (err) {
      onToast?.(err.message || 'Failed to cancel attendance.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="space-y-6">

      {/* Live Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Enrolled', value: stats?.totalEnrolled ?? '—', color: 'text-white', bg: 'bg-neutral-900 border-neutral-800' },
          { label: 'Internal', value: stats?.internalCount ?? '—', color: 'text-blue-400', bg: 'bg-blue-950/30 border-blue-500/20' },
          { label: 'External', value: stats?.externalCount ?? '—', color: 'text-purple-400', bg: 'bg-purple-950/30 border-purple-500/20' },
          { label: 'Present', value: stats?.presentCount ?? '—', color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-500/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-4 ${bg}`}>
            <div className="text-neutral-500 text-xs font-mono uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-2xl font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Quick Search + Mark Attendance */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <UserCheck className="w-5 h-5 text-red-400" />
          <h3 className="text-base font-black text-white font-heading">Mark Attendance</h3>
          {!canManageAttendance && (
            <span className="text-xs font-mono text-amber-400 bg-amber-950/30 border border-amber-500/30 px-2 py-0.5 rounded-full">
              View only — insufficient permissions
            </span>
          )}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/60 text-sm"
            placeholder="Search participant by name, student ID, mobile…"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-neutral-500 hover:text-white" />
            </button>
          )}
        </div>

        {/* Search Results */}
        <AnimatePresence>
          {searchQuery.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {loadingParticipants ? (
                <div className="flex items-center justify-center py-4 text-neutral-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />Searching…
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4 text-neutral-600 text-sm font-mono">
                  No participants found for "{searchQuery}"
                </div>
              ) : (
                searchResults.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-700 to-rose-500 flex items-center justify-center text-sm font-black text-white flex-shrink-0">
                      {(p.name || 'U').charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm">{p.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                          p.category === 'INTERNAL'
                            ? 'text-blue-400 bg-blue-950/40 border border-blue-500/30'
                            : 'text-purple-400 bg-purple-950/40 border border-purple-500/30'
                        }`}>
                          {p.category || 'Unknown'}
                        </span>
                      </div>
                      <div className="text-neutral-500 text-xs font-mono">
                        {p.studentId} · {p.college}
                      </div>
                    </div>

                    {/* Attendance status + action */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                      {p.attendance?.status === ATTENDANCE_STATUS.PRESENT ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 text-xs font-mono font-bold">PRESENT</span>
                        </div>
                      ) : (
                        canManageAttendance && (
                          <button
                            onClick={() => handleMarkPresent(p)}
                            disabled={actionLoading === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-950 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {actionLoading === p.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <UserCheck className="w-3 h-3" />
                            }
                            Mark Present
                          </button>
                        )
                      )}
                      {p.attendance?.status === ATTENDANCE_STATUS.PRESENT && isSuperAdmin && (
                        <button
                          onClick={() => setShowCancelModal(p)}
                          className="text-[10px] text-red-500 hover:text-red-400 font-mono"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Attendance Audit Log */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800">
          <Clock className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-black text-white font-heading">Recent Attendance Actions</h3>
          {loadingAudit && <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />}
        </div>

        <div className="overflow-x-auto">
          {auditLog.length === 0 ? (
            <div className="text-center py-8 text-neutral-600 font-mono text-sm">
              {loadingAudit ? 'Loading audit log…' : 'No attendance actions recorded yet'}
            </div>
          ) : (
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-800">
                  {['Time', 'Action', 'Registration', 'Performed By', 'Role', 'Reason'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-neutral-500 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry) => (
                  <tr key={entry.id} className="border-b border-neutral-900 hover:bg-neutral-900/50 transition-colors">
                    <td className="px-4 py-2.5 text-neutral-500 whitespace-nowrap">{formatTime(entry.timestamp)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        entry.action === 'MARK_PRESENT'
                          ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30'
                          : entry.action === 'CANCEL_ATTENDANCE'
                          ? 'text-red-400 bg-red-950/40 border border-red-500/30'
                          : 'text-neutral-400 bg-neutral-900 border-neutral-700'
                      }`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-300 whitespace-nowrap">{entry.registrationId || '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-400 whitespace-nowrap">{entry.performedByName || entry.performedBy || '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-500 whitespace-nowrap">{entry.performedByRole || '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-600 max-w-[150px] truncate">{entry.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
              <h3 className="text-lg font-black text-white font-heading mb-1">Cancel Attendance?</h3>
              <p className="text-neutral-400 text-sm mb-4">
                Cancelling attendance for <strong className="text-white">{showCancelModal.name}</strong>.
                This is permanently logged in the audit trail.
              </p>
              <div className="mb-4">
                <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">Reason (required)</label>
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
                  Go Back
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
