import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, Search, CheckCircle2, 
  XCircle, Copy, Check, Download,
  Eye, RefreshCw, ShieldCheck, UserCheck, X
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { GATE_PASS_STATUS, recordAuditLog } from '../../services/gatePassService';
import { maskPhone } from '../../services/fileSecurityService';
import { useAdminAuth } from '../../context/AdminAuthContext';
import GatePassCard from '../../components/Payment/GatePassCard';

export default function GatePassManager({ onToast }) {
  const { isGateStaffOnly, isSuperAdmin } = useAdminAuth();
  const [gatePasses, setGatePasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ISSUED' | 'USED' | 'CANCELLED'
  const [selectedPassModal, setSelectedPassModal] = useState(null);
  const [copiedToken, setCopiedToken] = useState(null);
  const [updatingToken, setUpdatingToken] = useState(null);

  // Live listener on 'gate_passes' collection
  useEffect(() => {
    try {
      setLoading(true);
      const colRef = collection(db, 'gate_passes');
      const unsub = onSnapshot(colRef, (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));

        // Sort descending by issuedAt or createdAt
        list.sort((a, b) => {
          const timeA = a.gatePassIssuedAt?.seconds ? a.gatePassIssuedAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
          const timeB = b.gatePassIssuedAt?.seconds ? b.gatePassIssuedAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setGatePasses(list);
        setLoading(false);
      }, (err) => {
        console.warn('Gate passes listener note:', err);
        setLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Error setting up gate passes listener:', e);
      setLoading(false);
    }
  }, []);

  const handleCopy = (token) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Action: Revoke/Cancel pass
  const handleCancelPass = async (pass) => {
    if (isGateStaffOnly) {
      if (onToast) onToast('Permission denied: Gate staff cannot revoke passes.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to REVOKE Gate Pass for ${pass.name} (${pass.registrationNumber})? This will block entry at the gate.`)) return;

    try {
      setUpdatingToken(pass.gatePassToken);
      const docRef = doc(db, 'gate_passes', pass.gatePassToken);
      await updateDoc(docRef, {
        gatePassStatus: GATE_PASS_STATUS.CANCELLED,
        cancelledAt: serverTimestamp(),
      });

      await recordAuditLog({
        registrationId: pass.registrationNumber,
        action: 'GATE_PASS_CANCELLED',
        actorId: 'admin',
        details: { token: pass.gatePassToken }
      });

      if (onToast) onToast(`Gate Pass ${pass.registrationNumber} cancelled/revoked.`, 'error');
      if (selectedPassModal?.gatePassToken === pass.gatePassToken) {
        setSelectedPassModal((prev) => ({ ...prev, gatePassStatus: GATE_PASS_STATUS.CANCELLED }));
      }
    } catch (err) {
      if (onToast) onToast('Failed to cancel pass: ' + err.message, 'error');
    } finally {
      setUpdatingToken(null);
    }
  };

  // Filtered passes
  const filteredPasses = useMemo(() => {
    return gatePasses.filter((p) => {
      // Status filter
      if (statusFilter !== 'ALL' && p.gatePassStatus !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchReg = p.registrationNumber?.toLowerCase().includes(q) || p.registrationId?.toLowerCase().includes(q);
        const matchName = p.name?.toLowerCase().includes(q);
        const matchPhone = p.phone?.toLowerCase().includes(q);
        const matchToken = p.gatePassToken?.toLowerCase().includes(q);
        const matchTicket = p.ticketType?.toLowerCase().includes(q);
        return matchReg || matchName || matchPhone || matchToken || matchTicket;
      }

      return true;
    });
  }, [gatePasses, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = gatePasses.length;
    const active = gatePasses.filter((p) => p.gatePassStatus === GATE_PASS_STATUS.ISSUED && !p.checkedIn).length;
    const used = gatePasses.filter((p) => p.checkedIn || p.gatePassStatus === GATE_PASS_STATUS.USED).length;
    const cancelled = gatePasses.filter((p) => p.gatePassStatus === GATE_PASS_STATUS.CANCELLED).length;
    return { total, active, used, cancelled };
  }, [gatePasses]);

  // Export CSV
  const handleExportCSV = () => {
    if (gatePasses.length === 0) {
      if (onToast) onToast('No gate passes available to export.', 'info');
      return;
    }

    const headers = ['Registration Number', 'Name', 'Phone', 'Email', 'University', 'Ticket Type', 'Gate Pass Status', 'Checked In', 'Issued At', 'Checked In At', 'Gate Pass Token'];
    const rows = filteredPasses.map((p) => [
      `"${p.registrationNumber || ''}"`,
      `"${p.name || ''}"`,
      `"${p.phone || ''}"`,
      `"${p.email || ''}"`,
      `"${p.university || ''}"`,
      `"${p.ticketType || ''}"`,
      `"${p.gatePassStatus || ''}"`,
      `"${p.checkedIn ? 'YES' : 'NO'}"`,
      `"${p.gatePassIssuedAt?.seconds ? new Date(p.gatePassIssuedAt.seconds * 1000).toLocaleString('en-IN') : ''}"`,
      `"${p.checkedInAt?.seconds ? new Date(p.checkedInAt.seconds * 1000).toLocaleString('en-IN') : ''}"`,
      `"${p.gatePassToken || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAMYAK2026_GatePasses_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onToast) onToast(`Exported ${filteredPasses.length} gate passes to CSV!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Anti-Fraud Gate Pass Control</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wide">
            GATE PASS <span className="text-cyan-400">MANAGEMENT</span>
          </h2>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Real-time monitoring of issued, active, checked-in, and revoked QR gate passes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono text-white flex items-center gap-1.5 transition-all cursor-pointer hover:border-cyan-500/50"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Roster (.CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-neutral-500 block">Total Issued Passes</span>
          <span className="text-2xl font-black font-heading text-white">{stats.total}</span>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30">
          <span className="text-[10px] font-mono uppercase text-cyan-400 block">Active Passes (Ready)</span>
          <span className="text-2xl font-black font-heading text-cyan-300">{stats.active}</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
          <span className="text-[10px] font-mono uppercase text-emerald-400 block">Checked In (At Venue)</span>
          <span className="text-2xl font-black font-heading text-emerald-300">{stats.used}</span>
        </div>

        <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/30">
          <span className="text-[10px] font-mono uppercase text-red-400 block">Cancelled / Revoked</span>
          <span className="text-2xl font-black font-heading text-red-300">{stats.cancelled}</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Passes', count: stats.total },
            { id: 'ISSUED', label: 'Active', count: stats.active },
            { id: 'USED', label: 'Checked In', count: stats.used },
            { id: 'CANCELLED', label: 'Cancelled', count: stats.cancelled },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-cyan-600 text-black font-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search Reg ID, Name, Phone, Token..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="p-16 text-center text-xs font-mono text-neutral-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span>Loading live Gate Passes...</span>
        </div>
      ) : filteredPasses.length === 0 ? (
        <div className="p-16 rounded-3xl bg-neutral-900/30 border border-neutral-800 text-center space-y-2">
          <Ticket className="w-8 h-8 text-neutral-600 mx-auto" />
          <h4 className="text-base font-bold font-heading text-neutral-300">No Gate Passes Found</h4>
          <p className="text-xs font-mono text-neutral-500">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try modifying your search or filter.'
              : 'Approved attendee payments will automatically issue unique QR gate passes here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/40">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 bg-black/80 text-neutral-400 text-[10px] uppercase tracking-wider">
                <th className="p-3.5">Registration &amp; Token</th>
                <th className="p-3.5">Attendee Name</th>
                <th className="p-3.5">Ticket Type</th>
                <th className="p-3.5 text-center">Gate Pass Status</th>
                <th className="p-3.5 text-center">Venue Check-In</th>
                <th className="p-3.5">Issued At</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredPasses.map((p) => {
                const isCheckedIn = p.checkedIn || p.gatePassStatus === GATE_PASS_STATUS.USED;
                const isCancelled = p.gatePassStatus === GATE_PASS_STATUS.CANCELLED;
                const isActive = p.gatePassStatus === GATE_PASS_STATUS.ISSUED && !isCheckedIn;

                return (
                  <tr key={p.gatePassToken} className="hover:bg-neutral-900/60 transition-colors">
                    {/* Reg ID & Token */}
                    <td className="p-3.5">
                      <div className="space-y-1">
                        <span className="font-bold text-cyan-400 text-sm block">
                          {p.registrationNumber}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
                          <span className="truncate max-w-[130px]" title={p.gatePassToken}>
                            {p.gatePassToken}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(p.gatePassToken)}
                            className="hover:text-white transition-colors cursor-pointer"
                            title="Copy Token"
                          >
                            {copiedToken === p.gatePassToken ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Attendee */}
                    <td className="p-3.5">
                      <span className="font-bold text-white block">{p.name}</span>
                      <span className="text-[10px] text-neutral-400">{p.university}</span>
                      {p.phone && (
                        <span className="text-[10px] text-neutral-500 block font-mono">
                          {isSuperAdmin ? p.phone : maskPhone(p.phone)}
                        </span>
                      )}
                    </td>

                    {/* Ticket */}
                    <td className="p-3.5">
                      <span className="font-bold text-slate-200 block">{p.ticketType}</span>
                    </td>

                    {/* Status Pill */}
                    <td className="p-3.5 text-center">
                      {isActive && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-bold text-cyan-300">
                          <CheckCircle2 className="w-3 h-3" />
                          ACTIVE
                        </span>
                      )}
                      {isCheckedIn && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-bold text-emerald-300">
                          <UserCheck className="w-3 h-3" />
                          USED
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-[10px] font-bold text-red-400">
                          <XCircle className="w-3 h-3" />
                          REVOKED
                        </span>
                      )}
                    </td>

                    {/* Check In Info */}
                    <td className="p-3.5 text-center">
                      {isCheckedIn ? (
                        <div className="space-y-0.5">
                          <span className="text-emerald-400 font-bold block text-[11px]">✓ Checked In</span>
                          <span className="text-[9px] text-neutral-400">
                            {p.checkedInAt?.seconds ? new Date(p.checkedInAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recorded'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-500 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Issued At */}
                    <td className="p-3.5 text-neutral-400 text-[11px]">
                      {p.gatePassIssuedAt?.seconds
                        ? new Date(p.gatePassIssuedAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '—'}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Digital Pass */}
                        <button
                          type="button"
                          onClick={() => setSelectedPassModal(p)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-cyan-400 border border-neutral-700 transition-all cursor-pointer"
                          title="View Digital Gate Pass & QR"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Revoke button (Admin only) */}
                        {!isCancelled && !isGateStaffOnly && (
                          <button
                            type="button"
                            disabled={updatingToken === p.gatePassToken}
                            onClick={() => handleCancelPass(p)}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-400 border border-neutral-700 transition-all cursor-pointer disabled:opacity-50"
                            title="Revoke / Cancel Pass"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: View Digital Pass */}
      <AnimatePresence>
        {selectedPassModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setSelectedPassModal(null)}
                className="absolute top-2 right-2 z-30 p-2 rounded-full bg-black/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <GatePassCard passData={selectedPassModal} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
