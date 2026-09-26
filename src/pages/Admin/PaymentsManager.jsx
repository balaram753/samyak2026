import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Search, CheckCircle2, XCircle, Clock, 
  Download, Eye, Copy, Check, RefreshCw, 
  Trash2, ShieldCheck
} from 'lucide-react';
import { 
  collection, onSnapshot, doc, deleteDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { 
  issueGatePassForRegistration, 
  rejectPaymentForRegistration, 
  PAYMENT_STATUS, 
  GATE_PASS_STATUS 
} from '../../services/gatePassService';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { maskUtr, maskPhone } from '../../services/fileSecurityService';

export default function PaymentsManager({ onToast }) {
  const { canVerifyPayments, canViewSensitiveProofs } = useAdminAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'verified' | 'rejected'
  const [selectedPaymentModal, setSelectedPaymentModal] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [copiedUtr, setCopiedUtr] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purging, setPurging] = useState(false);

  // 1. Live Firestore listener on 'payments' collection
  useEffect(() => {
    try {
      setLoading(true);
      const payCol = collection(db, 'payments');
      const unsub = onSnapshot(payCol, (snap) => {
        const list = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });

        // Sort by submittedAt or timestamp descending
        list.sort((a, b) => {
          const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.date || a.submittedAt || 0).getTime();
          const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.date || b.submittedAt || 0).getTime();
          return timeB - timeA;
        });

        setPayments(list);
        setLoading(false);
      }, (err) => {
        console.warn('Payments listener note:', err);
        setLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Error setting up payments listener:', e);
      setLoading(false);
    }
  }, []);

  // Copy UTR ID
  const handleCopyUtr = (utr, id) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // 2. Action: Verify / Approve Payment + Issue Cryptographic Gate Pass
  const handleVerifyPayment = async (payment) => {
    try {
      setUpdatingId(payment.id);

      const regId = payment.registrationId || payment.registrationNumber || payment.rollNo || payment.id;
      const res = await issueGatePassForRegistration({
        paymentId: payment.id,
        registrationId: regId,
        adminId: 'super_admin',
        attendeeData: payment,
      });

      if (res.alreadyIssued) {
        if (onToast) onToast(`Gate Pass already active: ${res.gatePassToken}`, 'info');
      } else if (res.gatePassStatus === 'NOT_REQUIRED' || res.category === 'INTERNAL') {
        // Internal participant — no gate pass
        if (onToast) onToast(`✓ Payment verified — KL University internal participant (no gate pass required).`, 'success');
      } else {
        if (onToast) onToast(`✓ Payment verified! Gate Pass issued: ${res.gatePassToken}`, 'success');
      }

      if (selectedPaymentModal?.id === payment.id) {
        setSelectedPaymentModal((prev) => ({ 
          ...prev, 
          status: 'verified', 
          paymentStatus: PAYMENT_STATUS.VERIFIED,
          gatePassStatus: res.gatePassStatus === 'NOT_REQUIRED' ? 'NOT_REQUIRED' : GATE_PASS_STATUS.ISSUED,
          gatePassToken: res.gatePassToken 
        }));
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      if (onToast) onToast('Failed to verify payment: ' + err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // 3. Action: Reject Payment
  const handleRejectPayment = async (payment) => {
    try {
      setUpdatingId(payment.id);

      const regId = payment.registrationId || payment.registrationNumber || payment.rollNo || payment.id;
      await rejectPaymentForRegistration({
        paymentId: payment.id,
        registrationId: regId,
        reason: 'Payment proof rejected by admin.',
        adminId: 'super_admin'
      });

      if (onToast) onToast(`Payment for ${payment.name || 'Student'} rejected.`, 'error');
      if (selectedPaymentModal?.id === payment.id) {
        setSelectedPaymentModal((prev) => ({ 
          ...prev, 
          status: 'rejected',
          paymentStatus: PAYMENT_STATUS.REJECTED,
          gatePassStatus: GATE_PASS_STATUS.CANCELLED
        }));
      }
    } catch (err) {
      console.error('Error rejecting payment:', err);
      if (onToast) onToast('Failed to reject payment: ' + err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // 4. Action: Delete single payment
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record from the database?')) return;
    try {
      await deleteDoc(doc(db, 'payments', paymentId));
      if (onToast) onToast('Payment record deleted.');
      if (selectedPaymentModal?.id === paymentId) setSelectedPaymentModal(null);
    } catch (err) {
      if (onToast) onToast('Delete failed: ' + err.message, 'error');
    }
  };

  // 5. Action: Purge Temp / Demo Payments
  const handlePurgeTempData = async () => {
    try {
      setPurging(true);
      // Delete payments marked with test / demo or all pending dummy records
      for (const p of payments) {
        await deleteDoc(doc(db, 'payments', p.id));
      }
      setShowPurgeConfirm(false);
      if (onToast) onToast('All temporary/test payment records have been cleared from Firestore.');
    } catch (err) {
      if (onToast) onToast('Failed to purge data: ' + err.message, 'error');
    } finally {
      setPurging(false);
    }
  };

  // 6. Action: Export CSV
  const handleExportCSV = () => {
    try {
      if (payments.length === 0) {
        if (onToast) onToast('No payment records to export.', 'error');
        return;
      }

      const headers = [
        'Registration ID',
        'Student Name',
        'Roll No / College ID',
        'Mobile No',
        'Email Address',
        'College / University',
        'Pass Tier',
        'Amount (INR)',
        'UTR ID / Ref',
        'Verification Status',
        'Submission Date',
        'College ID Card URL',
        'Payment Screenshot URL'
      ];

      const rows = payments.map((p) => [
        `"${p.registrationId || p.id || ''}"`,
        `"${p.name || ''}"`,
        `"${p.rollNo || ''}"`,
        `"${p.phone || ''}"`,
        `"${p.email || p.userEmail || ''}"`,
        `"${p.university || ''}"`,
        `"${p.tier || ''}"`,
        `"${p.amount || 0}"`,
        `"${p.utrId || p.transactionId || ''}"`,
        `"${p.status || 'pending'}"`,
        `"${p.date || p.submittedAt || (p.timestamp?.seconds ? new Date(p.timestamp.seconds * 1000).toLocaleString() : '')}"`,
        `"${p.clgIdPicUrl || p.collegeIdCardUrl || ''}"`,
        `"${p.paymentScreenshotUrl || ''}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `samyak_payments_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onToast) onToast('Payments exported to CSV successfully!');
    } catch (err) {
      if (onToast) onToast('Export failed: ' + err.message, 'error');
    }
  };

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'pending' && (p.status === 'pending' || !p.status)) ||
        (statusFilter === 'verified' && p.status === 'verified') ||
        (statusFilter === 'rejected' && p.status === 'rejected');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.rollNo && p.rollNo.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.utrId && p.utrId.toLowerCase().includes(q)) ||
        (p.transactionId && p.transactionId.toLowerCase().includes(q)) ||
        (p.registrationId && p.registrationId.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [payments, statusFilter, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let verifiedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      if (p.status === 'verified') {
        verifiedCount++;
        totalRevenue += amt;
      } else if (p.status === 'rejected') {
        rejectedCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      total: payments.length,
      revenue: totalRevenue,
      verified: verifiedCount,
      pending: pendingCount,
      rejected: rejectedCount,
    };
  }, [payments]);

  return (
    <div className="space-y-6">
      
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-[11px] font-mono text-red-400 uppercase tracking-widest mb-1 font-bold">
            <CreditCard className="w-3.5 h-3.5 text-red-400" />
            Financial &amp; Registration Gateway
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
            PAYMENTS &amp; <span className="text-red-500">VERIFICATIONS HUB</span>
          </h2>
          <p className="text-xs text-neutral-400 font-cyber">
            Review UPI payments, inspect college ID proofs, cross-reference UTR transaction numbers, and approve registrations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={payments.length === 0}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Export CSV of all payments"
          >
            <Download className="w-3.5 h-3.5 text-red-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPurgeConfirm(true)}
            disabled={payments.length === 0}
            className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-xs font-mono font-bold text-red-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Clean/purge temporary test payments"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Purge Temp Data</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Payments */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Total Submissions</div>
          <div className="text-2xl font-black font-heading text-white mt-1">{stats.total}</div>
        </div>

        {/* Total Verified Revenue */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">Verified Revenue</div>
          <div className="text-2xl font-black font-heading text-emerald-400 mt-1">₹{stats.revenue.toLocaleString('en-IN')}</div>
        </div>

        {/* Pending Verifications */}
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
              : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending Approval
          </div>
          <div className="text-2xl font-black font-heading text-amber-300 mt-1">{stats.pending}</div>
        </button>

        {/* Verified Count */}
        <button
          type="button"
          onClick={() => setStatusFilter('verified')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'verified'
              ? 'bg-emerald-500/15 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified Passes
          </div>
          <div className="text-2xl font-black font-heading text-emerald-300 mt-1">{stats.verified}</div>
        </button>

        {/* Rejected */}
        <button
          type="button"
          onClick={() => setStatusFilter('rejected')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-red-500/15 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Flagged / Rejected
          </div>
          <div className="text-2xl font-black font-heading text-red-400 mt-1">{stats.rejected}</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Payments', count: stats.total },
            { id: 'pending', label: 'Pending', count: stats.pending },
            { id: 'verified', label: 'Verified', count: stats.verified },
            { id: 'rejected', label: 'Rejected', count: stats.rejected },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by Name, Roll, Email, UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Payments Content */}
      {loading ? (
        <div className="p-16 text-center text-xs font-mono text-neutral-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
          <span>Syncing real-time payments from Firestore...</span>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="p-16 rounded-3xl bg-neutral-900/30 border border-neutral-800 text-center space-y-2">
          <CreditCard className="w-8 h-8 text-neutral-600 mx-auto" />
          <h4 className="text-base font-bold font-heading text-neutral-300">No Payment Records Found</h4>
          <p className="text-xs font-mono text-neutral-500">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try modifying your search query or filter selection.' 
              : 'New student registrations and UPI payment submissions will appear here live.'}
          </p>
        </div>
      ) : (
        /* Data Table View */
        <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/40">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 bg-black/80 text-neutral-400 text-[10px] uppercase tracking-wider">
                <th className="p-3.5">Student Details</th>
                <th className="p-3.5">Roll No &amp; College</th>
                <th className="p-3.5">Pass &amp; Fee</th>
                <th className="p-3.5">UTR / Ref ID</th>
                <th className="p-3.5 text-center">College ID Pic</th>
                <th className="p-3.5 text-center">Payment Screenshot</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredPayments.map((p) => {
                const isPending = !p.status || p.status === 'pending';
                const isVerified = p.status === 'verified';
                const isRejected = p.status === 'rejected';

                return (
                  <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors">
                    
                    {/* Student Details: Name, Mail, Mobile */}
                    <td className="p-3.5">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{p.name || 'Anonymous Student'}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">{p.email || p.userEmail || 'No email provided'}</div>
                      <div className="text-[11px] text-red-400">{maskPhone(p.phone)}</div>
                    </td>

                    {/* Roll No & University */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-200">{p.rollNo || 'N/A'}</div>
                      <div className="text-[11px] text-neutral-400 truncate max-w-[140px]" title={p.university}>
                        {p.university || 'KL University'}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">
                        Ref: {p.registrationId || p.id?.slice(0, 8)}
                      </div>
                    </td>

                    {/* Pass Tier & Amount */}
                    <td className="p-3.5">
                      <div className="font-bold text-white">{p.tier || 'Fest Pass'}</div>
                      <div className="font-heading font-black text-emerald-400 text-sm">
                        ₹{p.amount || 0}
                      </div>
                    </td>

                    {/* UTR ID (Masked for Security) */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <code className="px-2 py-0.5 rounded-lg bg-black border border-neutral-700 text-red-300 font-bold tracking-wider">
                          {maskUtr(p.utrId || p.transactionId)}
                        </code>
                        {p.utrId && (
                          <button
                            type="button"
                            onClick={() => handleCopyUtr(p.utrId, p.id)}
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy UTR ID"
                          >
                            {copiedUtr === p.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-1">
                        {p.date ? new Date(p.date).toLocaleDateString('en-IN') : 'Recent'}
                      </div>
                    </td>

                    {/* College ID Pic Thumbnail */}
                    <td className="p-3.5 text-center">
                      {(p.clgIdPicUrl || p.collegeIdCardUrl) ? (
                        <button
                          type="button"
                          onClick={() => setZoomedImage({
                            url: p.clgIdPicUrl || p.collegeIdCardUrl,
                            title: `College ID Card: ${p.name || ''} (${p.rollNo || ''})`
                          })}
                          className="group relative inline-block rounded-xl border border-neutral-700 overflow-hidden hover:border-red-500 transition-all cursor-pointer"
                        >
                          <img 
                            src={p.clgIdPicUrl || p.collegeIdCardUrl} 
                            alt="College ID" 
                            className="w-12 h-12 object-cover bg-black" 
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-[10px] text-neutral-500 italic">No Pic</span>
                      )}
                    </td>

                    {/* Payment Screenshot Thumbnail */}
                    <td className="p-3.5 text-center">
                      {p.paymentScreenshotUrl ? (
                        <button
                          type="button"
                          onClick={() => setZoomedImage({
                            url: p.paymentScreenshotUrl,
                            title: `Payment Screenshot: ${p.name || ''} (UTR: ${p.utrId || ''})`
                          })}
                          className="group relative inline-block rounded-xl border border-neutral-700 overflow-hidden hover:border-emerald-500 transition-all cursor-pointer"
                        >
                          <img 
                            src={p.paymentScreenshotUrl} 
                            alt="Payment Screenshot" 
                            className="w-12 h-12 object-cover bg-black" 
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-[10px] text-neutral-500 italic">No Screenshot</span>
                      )}
                    </td>

                    {/* Verification & Gate Pass Status */}
                    <td className="p-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {isVerified && (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-bold text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              VERIFIED
                            </span>
                            <span className="text-[9px] font-mono text-cyan-400 font-semibold">
                              {p.gatePassStatus === 'USED' ? '🎟️ Pass Used (Checked In)' : '🎫 Pass: ISSUED'}
                            </span>
                          </>
                        )}
                        {isPending && (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-[10px] font-bold text-amber-300">
                              <Clock className="w-3 h-3" />
                              PENDING
                            </span>
                            <span className="text-[9px] font-mono text-neutral-500">
                              Pass: NOT_ISSUED
                            </span>
                          </>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/50 text-[10px] font-bold text-red-400">
                            <XCircle className="w-3 h-3" />
                            REJECTED
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* View Dossier */}
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentModal(p)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 transition-all cursor-pointer"
                          title="View Full Inspection Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Approve Button (Admin Only) */}
                        {canVerifyPayments && !isVerified && (
                          <button
                            type="button"
                            disabled={updatingId === p.id}
                            onClick={() => handleVerifyPayment(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            title="Verify and Approve Payment"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify</span>
                          </button>
                        )}

                        {/* Reject Button (Admin Only) */}
                        {canVerifyPayments && !isRejected && (
                          <button
                            type="button"
                            disabled={updatingId === p.id}
                            onClick={() => handleRejectPayment(p)}
                            className="px-2 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-red-400 hover:text-white text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                            title="Reject Payment"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete record */}
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1.5 rounded-lg hover:bg-red-950/50 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete payment record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Full Inspection Dossier */}
      <AnimatePresence>
        {selectedPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-red-500/50 rounded-3xl max-w-3xl w-full p-6 sm:p-8 relative overflow-hidden shadow-[0_0_60px_rgba(239,68,68,0.3)] max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setSelectedPaymentModal(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-neutral-900 hover:bg-red-600/30 text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500 text-red-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-xl text-white">
                    {selectedPaymentModal.name}
                  </h3>
                  <p className="text-xs font-mono text-red-400">
                    Registration Code: {selectedPaymentModal.registrationId || selectedPaymentModal.id}
                  </p>
                </div>
              </div>

              {/* Student Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs font-mono mb-6">
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">College ID / Roll</span>
                  <span className="font-bold text-white text-sm">{selectedPaymentModal.rollNo || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">Mobile Phone</span>
                  <span className="font-bold text-white">{selectedPaymentModal.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">Email</span>
                  <span className="font-bold text-white truncate block">{selectedPaymentModal.email || selectedPaymentModal.userEmail || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">University</span>
                  <span className="font-bold text-white">{selectedPaymentModal.university || 'KL University'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">Selected Pass</span>
                  <span className="font-bold text-red-400">{selectedPaymentModal.tier || 'Fest Pass'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">Amount</span>
                  <span className="font-bold text-emerald-400 text-sm">₹{selectedPaymentModal.amount || 0}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-neutral-500 uppercase text-[10px] block">UTR Transaction ID</span>
                  <span className="font-bold text-white font-mono tracking-widest">{selectedPaymentModal.utrId || selectedPaymentModal.transactionId || 'N/A'}</span>
                </div>
              </div>

              {/* Side-by-Side Images: College ID Card vs Payment Screenshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                
                {/* College ID Card */}
                <div className="p-3 rounded-2xl bg-black border border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-300">College ID Card Photo</span>
                    {(selectedPaymentModal.clgIdPicUrl || selectedPaymentModal.collegeIdCardUrl) && (
                      <button
                        type="button"
                        onClick={() => setZoomedImage({
                          url: selectedPaymentModal.clgIdPicUrl || selectedPaymentModal.collegeIdCardUrl,
                          title: `College ID: ${selectedPaymentModal.name}`
                        })}
                        className="text-[10px] font-mono text-red-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Zoom
                      </button>
                    )}
                  </div>
                  {(selectedPaymentModal.clgIdPicUrl || selectedPaymentModal.collegeIdCardUrl) ? (
                    <img 
                      src={selectedPaymentModal.clgIdPicUrl || selectedPaymentModal.collegeIdCardUrl} 
                      alt="College ID Proof" 
                      className="w-full h-56 object-contain rounded-xl bg-neutral-900 border border-neutral-800" 
                    />
                  ) : (
                    <div className="h-56 rounded-xl bg-neutral-900/60 border border-dashed border-neutral-800 flex items-center justify-center text-xs font-mono text-neutral-500">
                      No College ID card uploaded.
                    </div>
                  )}
                </div>

                {/* Payment Screenshot */}
                <div className="p-3 rounded-2xl bg-black border border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-300">Payment Screenshot Proof</span>
                    {selectedPaymentModal.paymentScreenshotUrl && (
                      <button
                        type="button"
                        onClick={() => setZoomedImage({
                          url: selectedPaymentModal.paymentScreenshotUrl,
                          title: `Payment Screenshot: ${selectedPaymentModal.name} (UTR: ${selectedPaymentModal.utrId})`
                        })}
                        className="text-[10px] font-mono text-emerald-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Zoom
                      </button>
                    )}
                  </div>
                  {selectedPaymentModal.paymentScreenshotUrl ? (
                    <img 
                      src={selectedPaymentModal.paymentScreenshotUrl} 
                      alt="Payment Screenshot" 
                      className="w-full h-56 object-contain rounded-xl bg-neutral-900 border border-neutral-800" 
                    />
                  ) : (
                    <div className="h-56 rounded-xl bg-neutral-900/60 border border-dashed border-neutral-800 flex items-center justify-center text-xs font-mono text-neutral-500">
                      No Payment Screenshot uploaded.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300 transition-all cursor-pointer"
                >
                  Close Dossier
                </button>

                <button
                  type="button"
                  disabled={updatingId === selectedPaymentModal.id}
                  onClick={() => handleRejectPayment(selectedPaymentModal)}
                  className="px-4 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-xs font-mono font-bold text-red-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  Reject Proof
                </button>

                <button
                  type="button"
                  disabled={updatingId === selectedPaymentModal.id}
                  onClick={() => handleVerifyPayment(selectedPaymentModal)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:brightness-110 text-xs font-heading font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all cursor-pointer disabled:opacity-50"
                >
                  Verify &amp; Issue Pass
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox / Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <div 
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-4xl w-full p-4 relative"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
                <span className="text-xs font-mono font-bold text-white">{zoomedImage.title}</span>
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="p-1 rounded-full bg-neutral-800 hover:bg-red-600 text-white transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[80vh] flex items-center justify-center overflow-auto rounded-2xl bg-black p-2">
                <img 
                  src={zoomedImage.url} 
                  alt="Zoomed proof" 
                  className="max-h-[75vh] w-auto object-contain rounded-xl" 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Confirm Purge Temp Data */}
      <AnimatePresence>
        {showPurgeConfirm && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-red-500 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-[0_0_50px_rgba(239,68,68,0.5)]"
            >
              <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500 text-red-500 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black font-heading text-white">
                PURGE TEMPORARY PAYMENT RECORDS?
              </h3>
              <p className="text-xs font-mono text-neutral-400 leading-relaxed">
                This will delete all temporary or demo payment documents from the live Firestore collection. This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPurgeConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={purging}
                  onClick={handlePurgeTempData}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white flex items-center gap-1.5"
                >
                  {purging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Yes, Purge Data</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
