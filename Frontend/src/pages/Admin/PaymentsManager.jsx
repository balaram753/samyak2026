import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Search, CheckCircle2, XCircle, Clock, 
  Download, Eye, Copy, Check, RefreshCw, 
  Trash2, ShieldCheck, Sparkles, BookOpen, Layers,
  Users
} from 'lucide-react';
import { 
  collection, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { 
  issueGatePassForRegistration, 
  rejectPaymentForRegistration, 
  PAYMENT_STATUS, 
  GATE_PASS_STATUS,
  isKlUniversityStudent
} from '../../services/gatePassService';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { maskUtr, maskPhone } from '../../services/fileSecurityService';
import SecureImage from '../../components/SecureImage/SecureImage';

// Helper to safely format dates and Firestore Timestamps
function formatDateTime(val) {
  if (!val) return 'Recent';
  try {
    if (typeof val === 'object' && typeof val.toDate === 'function') {
      return val.toDate().toLocaleString('en-IN');
    }
    if (typeof val === 'object' && val.seconds) {
      return new Date(val.seconds * 1000).toLocaleString('en-IN');
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-IN');
    }
  } catch (err) {
    console.warn('Date format note:', err);
  }
  return 'Recent';
}

export default function PaymentsManager({ onToast }) {
  const { canVerifyPayments } = useAdminAuth();
  
  // 1. Data States
  const [payments, setPayments] = useState([]);
  const [workshopPayments, setWorkshopPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 2. Navigation & Point Controls
  // 'workshops' | 'passes' | 'all'
  const [categoryTab, setCategoryTab] = useState('workshops');
  
  // 3. Filters & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'verified' | 'rejected' | 'klu'
  const [selectedWorkshopFilter, setSelectedWorkshopFilter] = useState('ALL');
  
  // 4. Modals & Action States
  const [selectedPaymentModal, setSelectedPaymentModal] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [copiedUtr, setCopiedUtr] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purging, setPurging] = useState(false);

  // 1. Live Firestore listener on 'payments' collection
  useEffect(() => {
    let unsubPay = () => {};
    let unsubWs = () => {};

    try {
      setLoading(true);

      // A. Fest Passes & General Payments
      const payCol = collection(db, 'payments');
      unsubPay = onSnapshot(payCol, (snap) => {
        const list = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data(), _source: 'fest_payments' });
        });

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

      // B. Workshop Registrations & Payments ('workshop_registrations')
      const wsCol = collection(db, 'workshop_registrations');
      unsubWs = onSnapshot(wsCol, (snap) => {
        const wsList = [];
        snap.forEach((d) => {
          wsList.push({ id: d.id, ...d.data(), _source: 'workshop_registrations' });
        });

        wsList.sort((a, b) => {
          const timeA = a.created_at?.seconds ? a.created_at.seconds * 1000 : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
          const timeB = b.created_at?.seconds ? b.created_at.seconds * 1000 : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
          return timeB - timeA;
        });

        setWorkshopPayments(wsList);
      }, (err) => {
        console.warn('Workshop registrations listener note:', err);
      });

    } catch (e) {
      console.warn('Error setting up payments listener:', e);
      setLoading(false);
    }

    return () => {
      unsubPay();
      unsubWs();
    };
  }, []);

  // Copy UTR ID helper
  const handleCopyUtr = (utr, id) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // Distinct list of Workshop Titles from database
  const uniqueWorkshopTitles = useMemo(() => {
    const set = new Set();
    workshopPayments.forEach((w) => {
      if (w.workshop_title) set.add(w.workshop_title);
    });
    return Array.from(set);
  }, [workshopPayments]);

  // Counts for Top Category Tabs
  const pendingPassesCount = useMemo(() => {
    return payments.filter(p => !p.status || p.status === 'pending' || p.paymentStatus === 'PENDING' || p.paymentStatus === 'PENDING_VERIFICATION').length;
  }, [payments]);

  const pendingWorkshopsCount = useMemo(() => {
    return workshopPayments.filter(w => !w.status || w.status === 'PENDING_VERIFICATION' || w.status === 'PENDING').length;
  }, [workshopPayments]);

  // =========================================================================
  // ACTIONS: FEST PASS PAYMENTS
  // =========================================================================
  const handleVerifyPassPayment = async (payment) => {
    try {
      setUpdatingId(payment.id);

      const regId = payment.registrationId || payment.registrationNumber || payment.rollNo || payment.id;
      const res = await issueGatePassForRegistration({
        paymentId: payment.id,
        registrationId: regId,
        adminId: 'super_admin',
        attendeeData: payment,
      });

      const isKlu = isKlUniversityStudent(payment);

      try {
        await updateDoc(doc(db, 'payments', payment.id), {
          status: 'verified',
          paymentStatus: PAYMENT_STATUS.VERIFIED,
          gatePassStatus: isKlu ? 'NOT_REQUIRED' : (res.gatePassStatus || GATE_PASS_STATUS.ISSUED),
          gatePassToken: isKlu ? null : (res.gatePassToken || null),
          category: isKlu ? 'INTERNAL' : (payment.category || 'EXTERNAL'),
          verifiedAt: serverTimestamp(),
          verifiedBy: 'super_admin',
        });
      } catch (e) {
        console.warn('Direct update payment verified status note:', e.message);
      }

      if (res.alreadyIssued) {
        if (onToast) onToast(`Gate Pass already active: ${res.gatePassToken || 'Active'}`, 'info');
      } else {
        const msg = res.message || (isKlu 
          ? 'KL University student registration verified successfully! (Gate pass not required - ID card entry)' 
          : `Payment verified! Unique Gate Pass issued: ${res.gatePassToken || 'Active'}`);
        if (onToast) onToast(msg, 'success');
      }

      if (selectedPaymentModal?.id === payment.id) {
        setSelectedPaymentModal((prev) => ({ 
          ...prev, 
          status: 'verified', 
          paymentStatus: PAYMENT_STATUS.VERIFIED,
          gatePassStatus: isKlu ? 'NOT_REQUIRED' : (res.gatePassStatus || GATE_PASS_STATUS.ISSUED),
          gatePassToken: isKlu ? null : (res.gatePassToken || null),
        }));
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      if (onToast) onToast('Failed to verify payment: ' + err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRejectPassPayment = async (payment) => {
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

  const handleDeletePassPayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record from the database?')) return;
    try {
      await deleteDoc(doc(db, 'payments', paymentId));
      if (onToast) onToast('Payment record deleted.');
      if (selectedPaymentModal?.id === paymentId) setSelectedPaymentModal(null);
    } catch (err) {
      if (onToast) onToast('Delete failed: ' + err.message, 'error');
    }
  };

  // =========================================================================
  // ACTIONS: WORKSHOPS PAYMENTS
  // =========================================================================
  const handleVerifyWorkshopPayment = async (reg) => {
    try {
      setUpdatingId(reg.id);

      const regDocRef = doc(db, 'workshop_registrations', reg.id);
      await updateDoc(regDocRef, {
        status: 'CONFIRMED',
        paymentStatus: 'VERIFIED',
        verified_at: serverTimestamp(),
        verifiedBy: 'super_admin'
      });

      // Update linked user document if exists
      if (reg.uid) {
        try {
          const userDocRef = doc(db, 'users', reg.uid);
          await updateDoc(userDocRef, {
            'lastVerifiedWorkshop': reg.workshop_title || 'Technical Workshop',
            'lastWorkshopVerificationDate': serverTimestamp()
          });
        } catch (e) {
          console.warn('Notice updating user profile workshop link:', e.message);
        }
      }

      if (onToast) onToast(`Workshop payment for ${reg.student_name || 'student'} verified & seat confirmed!`, 'success');

      if (selectedPaymentModal?.id === reg.id) {
        setSelectedPaymentModal((prev) => ({
          ...prev,
          status: 'CONFIRMED',
          paymentStatus: 'VERIFIED'
        }));
      }
    } catch (err) {
      console.error('Error verifying workshop payment:', err);
      if (onToast) onToast('Failed to verify workshop payment: ' + err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRejectWorkshopPayment = async (reg) => {
    const reason = window.prompt(
      'Enter reason for rejecting this workshop payment proof (e.g. Invalid UTR, Duplicate payment, Blur screenshot):',
      reg.rejectionReason || ''
    );
    if (reason === null) return;

    try {
      setUpdatingId(reg.id);

      const regDocRef = doc(db, 'workshop_registrations', reg.id);
      await updateDoc(regDocRef, {
        status: 'REJECTED',
        paymentStatus: 'REJECTED',
        rejectionReason: reason || 'Payment proof rejected by admin committee.',
        rejected_at: serverTimestamp(),
        rejectedBy: 'super_admin'
      });

      if (onToast) onToast(`Workshop registration for ${reg.student_name || 'student'} rejected.`, 'error');

      if (selectedPaymentModal?.id === reg.id) {
        setSelectedPaymentModal((prev) => ({
          ...prev,
          status: 'REJECTED',
          paymentStatus: 'REJECTED',
          rejectionReason: reason
        }));
      }
    } catch (err) {
      console.error('Error rejecting workshop payment:', err);
      if (onToast) onToast('Failed to reject workshop payment: ' + err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteWorkshopPayment = async (regId) => {
    if (!window.confirm('Are you sure you want to delete this workshop registration & payment record?')) return;
    try {
      await deleteDoc(doc(db, 'workshop_registrations', regId));
      if (onToast) onToast('Workshop registration record deleted.');
      if (selectedPaymentModal?.id === regId) setSelectedPaymentModal(null);
    } catch (err) {
      if (onToast) onToast('Delete failed: ' + err.message, 'error');
    }
  };

  // Action: Purge Temp / Demo Payments
  const handlePurgeTempData = async () => {
    try {
      setPurging(true);
      if (categoryTab === 'workshops') {
        for (const w of workshopPayments) {
          await deleteDoc(doc(db, 'workshop_registrations', w.id));
        }
        if (onToast) onToast('All workshop payment records have been cleared from Firestore.');
      } else {
        for (const p of payments) {
          await deleteDoc(doc(db, 'payments', p.id));
        }
        if (onToast) onToast('All fest payment records have been cleared from Firestore.');
      }
      setShowPurgeConfirm(false);
    } catch (err) {
      if (onToast) onToast('Failed to purge data: ' + err.message, 'error');
    } finally {
      setPurging(false);
    }
  };

  // =========================================================================
  // FILTERED LIST COMPUTATIONS
  // =========================================================================

  // 1. Filtered Fest Pass Payments
  const filteredPassPayments = useMemo(() => {
    return payments.filter((p) => {
      const u = (p.university || p.college || '').toLowerCase();
      const email = (p.email || p.userEmail || '').toLowerCase();
      const isKlu = u.includes('kl') || email.endsWith('@kluniversity.in') || p.category === 'INTERNAL';

      const isVerified = p.status === 'verified' || p.paymentStatus === 'VERIFIED' || p.status === 'APPROVED';
      const isPending = !p.status || p.status === 'pending' || p.paymentStatus === 'PENDING' || p.paymentStatus === 'PENDING_VERIFICATION';
      const isRejected = p.status === 'rejected' || p.paymentStatus === 'REJECTED';

      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'pending' && isPending) ||
        (statusFilter === 'verified' && isVerified) ||
        (statusFilter === 'rejected' && isRejected) ||
        (statusFilter === 'klu' && isKlu);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.rollNo && p.rollNo.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.utrId && p.utrId.toLowerCase().includes(q)) ||
        (p.transactionId && p.transactionId.toLowerCase().includes(q)) ||
        (p.university && p.university.toLowerCase().includes(q)) ||
        (p.registrationId && p.registrationId.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [payments, statusFilter, searchQuery]);

  // 2. Filtered Workshop Payments
  const filteredWorkshopPayments = useMemo(() => {
    return workshopPayments.filter((w) => {
      const u = (w.college_name || w.college_choice || '').toLowerCase();
      const email = (w.email || '').toLowerCase();
      const isKlu = w.college_choice === 'kl_university' || u.includes('kl') || email.endsWith('@kluniversity.in');

      const isConfirmed = w.status === 'CONFIRMED' || w.status === 'APPROVED' || w.status === 'VERIFIED';
      const isPending = !w.status || w.status === 'PENDING_VERIFICATION' || w.status === 'PENDING';
      const isRejected = w.status === 'REJECTED';

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && isPending) ||
        (statusFilter === 'verified' && isConfirmed) ||
        (statusFilter === 'rejected' && isRejected) ||
        (statusFilter === 'klu' && isKlu);

      const matchesWorkshop = 
        selectedWorkshopFilter === 'ALL' || 
        w.workshop_id === selectedWorkshopFilter || 
        w.workshop_title === selectedWorkshopFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (w.student_name && w.student_name.toLowerCase().includes(q)) ||
        (w.email && w.email.toLowerCase().includes(q)) ||
        (w.phone && w.phone.toLowerCase().includes(q)) ||
        (w.university_id && w.university_id.toLowerCase().includes(q)) ||
        (w.utr && w.utr.toLowerCase().includes(q)) ||
        (w.regCode && w.regCode.toLowerCase().includes(q)) ||
        (w.workshop_title && w.workshop_title.toLowerCase().includes(q)) ||
        (w.college_name && w.college_name.toLowerCase().includes(q));

      return matchesStatus && matchesWorkshop && matchesSearch;
    });
  }, [workshopPayments, statusFilter, selectedWorkshopFilter, searchQuery]);

  // 3. Combined / All Payments Stream
  const combinedList = useMemo(() => {
    const listA = filteredPassPayments.map(p => ({
      ...p,
      _type: 'pass',
      _displayTitle: p.tier || 'Fest Entry Pass',
      _displayAmount: Number(p.amount) || 0,
      _displayName: p.name || 'Anonymous Student',
      _displayRoll: p.rollNo || 'N/A',
      _displayCollege: p.university || 'KL University',
      _displayUtr: p.utrId || p.transactionId || 'N/A',
      _displayStatus: (p.status === 'verified' || p.paymentStatus === 'VERIFIED' || p.status === 'APPROVED') 
        ? 'VERIFIED' 
        : (p.status === 'rejected' || p.paymentStatus === 'REJECTED') ? 'REJECTED' : 'PENDING',
      _displayDate: p.date || p.submittedAt || (p.timestamp?.seconds ? new Date(p.timestamp.seconds * 1000) : null),
      _screenshotUrl: p.paymentScreenshotUrl,
      _idPicUrl: p.clgIdPicUrl || p.collegeIdCardUrl,
    }));

    const listB = filteredWorkshopPayments.map(w => ({
      ...w,
      _type: 'workshop',
      _displayTitle: w.workshop_title || 'Technical Workshop',
      _displayAmount: Number(w.workshop_fee) || 0,
      _displayName: w.student_name || 'Anonymous Student',
      _displayRoll: w.university_id || 'N/A',
      _displayCollege: w.college_name || (w.college_choice === 'kl_university' ? 'KL University' : 'External College'),
      _displayUtr: w.utr || 'NOT_PROVIDED',
      _displayStatus: (w.status === 'CONFIRMED' || w.status === 'APPROVED' || w.status === 'VERIFIED')
        ? 'CONFIRMED'
        : (w.status === 'REJECTED') ? 'REJECTED' : 'PENDING',
      _displayDate: w.created_at?.seconds ? new Date(w.created_at.seconds * 1000) : w.timestamp,
      _screenshotUrl: w.payment_screenshot_url,
      _idPicUrl: null,
    }));

    return [...listA, ...listB];
  }, [filteredPassPayments, filteredWorkshopPayments]);

  // =========================================================================
  // KPI CALCULATIONS
  // =========================================================================

  // A. Fest Pass Stats
  const passStats = useMemo(() => {
    let revenue = 0;
    let verified = 0;
    let pending = 0;
    let rejected = 0;
    let klu = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      const u = (p.university || p.college || '').toLowerCase();
      const email = (p.email || p.userEmail || '').toLowerCase();
      const isKlu = u.includes('kl') || email.endsWith('@kluniversity.in') || p.category === 'INTERNAL';

      if (isKlu) klu++;

      const isV = p.status === 'verified' || p.paymentStatus === 'VERIFIED' || p.status === 'APPROVED';
      const isR = p.status === 'rejected' || p.paymentStatus === 'REJECTED';

      if (isV) {
        verified++;
        revenue += amt;
      } else if (isR) {
        rejected++;
      } else {
        pending++;
      }
    });

    return { total: payments.length, revenue, verified, pending, rejected, klu };
  }, [payments]);

  // B. Workshops Stats
  const wsStats = useMemo(() => {
    let revenue = 0;
    let confirmed = 0;
    let pending = 0;
    let rejected = 0;
    let gatePassBundled = 0;
    let directPaid = 0;

    workshopPayments.forEach((w) => {
      const fee = Number(w.workshop_fee) || 0;
      const isC = w.status === 'CONFIRMED' || w.status === 'APPROVED' || w.status === 'VERIFIED';
      const isR = w.status === 'REJECTED';

      if (w.is_gate_pass_verified || fee === 0) {
        gatePassBundled++;
      } else {
        directPaid++;
      }

      if (isC) {
        confirmed++;
        revenue += fee;
      } else if (isR) {
        rejected++;
      } else {
        pending++;
      }
    });

    return { total: workshopPayments.length, revenue, confirmed, pending, rejected, gatePassBundled, directPaid };
  }, [workshopPayments]);

  // Combined Stats
  const combinedStats = useMemo(() => {
    return {
      total: passStats.total + wsStats.total,
      revenue: passStats.revenue + wsStats.revenue,
      verified: passStats.verified + wsStats.confirmed,
      pending: passStats.pending + wsStats.pending,
      rejected: passStats.rejected + wsStats.rejected,
    };
  }, [passStats, wsStats]);

  // =========================================================================
  // ACTION: EXPORT CSV
  // =========================================================================
  const handleExportCSV = () => {
    try {
      if (categoryTab === 'workshops') {
        if (workshopPayments.length === 0) {
          if (onToast) onToast('No workshop payments to export.', 'error');
          return;
        }

        const headers = [
          'Registration Code',
          'Workshop Title',
          'Student Name',
          'Roll / College ID',
          'Phone Number',
          'Email Address',
          'College / Institution',
          'Branch / Dept',
          'Fee Paid (INR)',
          'Payment Mode',
          'UTR / Transaction ID',
          'Verification Status',
          'Gate Pass Token',
          'Submission Date',
          'Payment Proof URL'
        ];

        const rows = workshopPayments.map((w) => [
          `"${w.regCode || w.id || ''}"`,
          `"${w.workshop_title || ''}"`,
          `"${w.student_name || ''}"`,
          `"${w.university_id || ''}"`,
          `"${w.phone || ''}"`,
          `"${w.email || ''}"`,
          `"${w.college_name || (w.college_choice === 'kl_university' ? 'KL University' : '')}"`,
          `"${w.branch || ''}"`,
          `"${w.workshop_fee || 0}"`,
          `"${w.is_gate_pass_verified ? 'Gate Pass Free Access' : 'Direct UPI Payment'}"`,
          `"${w.utr || ''}"`,
          `"${w.status || 'PENDING'}"`,
          `"${w.gate_pass_token || ''}"`,
          `"${formatDateTime(w.created_at || w.timestamp)}"`,
          `"${w.payment_screenshot_url || ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `samyak_workshop_payments_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (onToast) onToast('Workshop payments exported to CSV successfully!');

      } else if (categoryTab === 'passes') {
        if (payments.length === 0) {
          if (onToast) onToast('No fest payment records to export.', 'error');
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
          `"${formatDateTime(p.date || p.submittedAt || p.timestamp)}"`,
          `"${p.clgIdPicUrl || p.collegeIdCardUrl || ''}"`,
          `"${p.paymentScreenshotUrl || ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `samyak_fest_payments_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (onToast) onToast('Fest payments exported to CSV successfully!');

      } else {
        // Combined All Payments Export
        const headers = [
          'Transaction Category',
          'Registration Reference',
          'Title / Tier',
          'Student Name',
          'Roll No / ID',
          'Mobile Number',
          'Email Address',
          'College / Institution',
          'Amount Paid (INR)',
          'UTR / Reference ID',
          'Verification Status',
          'Submission Date',
          'Proof Screenshot URL'
        ];

        const rows = combinedList.map((item) => [
          `"${item._type === 'workshop' ? 'Technical Workshop' : 'Fest Entry Pass'}"`,
          `"${item.regCode || item.registrationId || item.id || ''}"`,
          `"${item._displayTitle}"`,
          `"${item._displayName}"`,
          `"${item._displayRoll}"`,
          `"${item.phone || ''}"`,
          `"${item.email || item.userEmail || ''}"`,
          `"${item._displayCollege}"`,
          `"${item._displayAmount}"`,
          `"${item._displayUtr}"`,
          `"${item._displayStatus}"`,
          `"${formatDateTime(item._displayDate)}"`,
          `"${item._screenshotUrl || ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `samyak_all_payments_unified_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (onToast) onToast('Combined payment records exported to CSV!');
      }
    } catch (err) {
      if (onToast) onToast('Export failed: ' + err.message, 'error');
    }
  };

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
            PAYMENTS &amp; <span className="text-red-500">PASSES HUB</span>
          </h2>
          <p className="text-xs text-neutral-400 font-cyber">
            Review UPI payments, inspect college ID proofs, cross-reference UTR transaction numbers, and approve workshop &amp; fest passes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export CSV of currently active payments"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPurgeConfirm(true)}
            className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-xs font-mono font-bold text-red-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Clean/purge temporary test records"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Purge Data</span>
          </button>
        </div>
      </div>

      {/* TOP NAVIGATION POINTS: WORKSHOPS PAYMENTS vs FEST PASSES vs ALL */}
      <div className="p-2 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-wrap items-center gap-2">
        
        {/* Point 1: Workshops Payments (NEW & HIGHLIGHTED) */}
        <button
          type="button"
          onClick={() => { setCategoryTab('workshops'); setStatusFilter('all'); }}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            categoryTab === 'workshops'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_25px_rgba(223,37,49,0.5)] border border-red-400/50'
              : 'bg-black/60 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-300" />
          <span>Workshops Payments</span>
          <span className="px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-mono font-bold">
            {workshopPayments.length}
          </span>
          {pendingWorkshopsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[9px] font-mono font-black animate-pulse">
              {pendingWorkshopsCount} PENDING
            </span>
          )}
        </button>

        {/* Point 2: Fest Passes & Entry Payments */}
        <button
          type="button"
          onClick={() => { setCategoryTab('passes'); setStatusFilter('all'); }}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            categoryTab === 'passes'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_25px_rgba(223,37,49,0.5)] border border-red-400/50'
              : 'bg-black/60 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <CreditCard className="w-4 h-4 text-cyan-400" />
          <span>Fest Passes &amp; Entry</span>
          <span className="px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-mono font-bold">
            {payments.length}
          </span>
          {pendingPassesCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[9px] font-mono font-black animate-pulse">
              {pendingPassesCount} PENDING
            </span>
          )}
        </button>

        {/* Point 3: All Combined Transactions */}
        <button
          type="button"
          onClick={() => { setCategoryTab('all'); setStatusFilter('all'); }}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            categoryTab === 'all'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_25px_rgba(223,37,49,0.5)] border border-red-400/50'
              : 'bg-black/60 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>All Transactions</span>
          <span className="px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-mono font-bold">
            {payments.length + workshopPayments.length}
          </span>
        </button>
      </div>

      {/* KPI STATS STRIP: Dynamically adapts to active point */}
      {categoryTab === 'workshops' ? (
        /* Workshops Stats Cards */
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" /> Enrolled Students
            </div>
            <div className="text-2xl font-black font-heading text-white mt-1">{wsStats.total}</div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Workshop Revenue
            </div>
            <div className="text-2xl font-black font-heading text-emerald-400 mt-1">₹{wsStats.revenue.toLocaleString('en-IN')}</div>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Pending Verification
            </div>
            <div className="text-2xl font-black font-heading text-amber-300 mt-1">{wsStats.pending}</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'verified' ? 'all' : 'verified')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'verified'
                ? 'bg-emerald-500/15 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed Seats
            </div>
            <div className="text-2xl font-black font-heading text-emerald-300 mt-1">{wsStats.confirmed}</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-red-500/15 border-red-500 shadow-[0_0_20px_rgba(223,37,49,0.2)]'
                : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Rejected Proofs
            </div>
            <div className="text-2xl font-black font-heading text-red-400 mt-1">{wsStats.rejected}</div>
          </button>
        </div>
      ) : categoryTab === 'passes' ? (
        /* Fest Passes Stats Cards */
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Total Submissions</div>
            <div className="text-2xl font-black font-heading text-white mt-1">{passStats.total}</div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">Pass Revenue</div>
            <div className="text-2xl font-black font-heading text-emerald-400 mt-1">₹{passStats.revenue.toLocaleString('en-IN')}</div>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(223,37,49,0.2)]'
                : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Pending Pass Approval
            </div>
            <div className="text-2xl font-black font-heading text-amber-300 mt-1">{passStats.pending}</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'verified' ? 'all' : 'verified')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'verified'
                ? 'bg-emerald-500/15 border-emerald-500 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified Passes
            </div>
            <div className="text-2xl font-black font-heading text-emerald-300 mt-1">{passStats.verified}</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-red-500/15 border-red-500 shadow-[0_0_20px_rgba(223,37,49,0.2)]'
                : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Rejected Passes
            </div>
            <div className="text-2xl font-black font-heading text-red-400 mt-1">{passStats.rejected}</div>
          </button>
        </div>
      ) : (
        /* Unified All Transactions Stats */
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Total All Records</div>
            <div className="text-2xl font-black font-heading text-white mt-1">{combinedStats.total}</div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">Cumulative Revenue</div>
            <div className="text-2xl font-black font-heading text-emerald-400 mt-1">₹{combinedStats.revenue.toLocaleString('en-IN')}</div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Total Pending
            </div>
            <div className="text-2xl font-black font-heading text-amber-300 mt-1">{combinedStats.pending}</div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Total Approved
            </div>
            <div className="text-2xl font-black font-heading text-emerald-300 mt-1">{combinedStats.verified}</div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Total Flagged
            </div>
            <div className="text-2xl font-black font-heading text-red-400 mt-1">{combinedStats.rejected}</div>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 flex-wrap">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'verified', label: 'Verified / Confirmed' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'klu', label: 'KL University' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(223,37,49,0.4)]'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Workshop Selector Filter (Visible when viewing workshops or all) */}
          {categoryTab === 'workshops' && uniqueWorkshopTitles.length > 0 && (
            <select
              value={selectedWorkshopFilter}
              onChange={(e) => setSelectedWorkshopFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-amber-300 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="ALL">All Workshops ({workshopPayments.length})</option>
              {uniqueWorkshopTitles.map((title) => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder={
              categoryTab === 'workshops' 
                ? 'Search student, workshop, UTR, roll...'
                : 'Search name, roll, UTR, email...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* PAYMENTS CONTENT SECTION */}
      {loading ? (
        <div className="p-16 text-center text-xs font-mono text-neutral-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
          <span>Syncing real-time records from Firestore...</span>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* VIEW A: DEDICATED WORKSHOPS PAYMENTS VIEW */}
          {/* ========================================================================= */}
          {categoryTab === 'workshops' && (
            filteredWorkshopPayments.length === 0 ? (
              <div className="p-16 rounded-3xl bg-neutral-900/30 border border-neutral-800 text-center space-y-2">
                <BookOpen className="w-10 h-10 text-neutral-600 mx-auto" />
                <h4 className="text-base font-bold font-heading text-neutral-300">No Workshop Payment Records</h4>
                <p className="text-xs font-mono text-neutral-500">
                  {searchQuery || statusFilter !== 'all' || selectedWorkshopFilter !== 'ALL'
                    ? 'No workshop payment matching your current filter criteria.'
                    : 'Delegates registering for workshops with payments or gate passes will appear here live.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/40">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-black/80 text-neutral-400 text-[10px] uppercase tracking-wider">
                      <th className="p-3.5">Student Details</th>
                      <th className="p-3.5">Workshop Name</th>
                      <th className="p-3.5">Fee &amp; Payment Mode</th>
                      <th className="p-3.5">UTR / Transaction Ref</th>
                      <th className="p-3.5">Roll No &amp; College</th>
                      <th className="p-3.5 text-center">Payment Proof</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {filteredWorkshopPayments.map((reg) => {
                      const isConfirmed = reg.status === 'CONFIRMED' || reg.status === 'APPROVED' || reg.status === 'VERIFIED';
                      const isPending = !reg.status || reg.status === 'PENDING_VERIFICATION' || reg.status === 'PENDING';
                      const isRejected = reg.status === 'REJECTED';
                      const isBundled = reg.is_gate_pass_verified || Number(reg.workshop_fee) === 0;

                      return (
                        <tr key={reg.id} className="hover:bg-neutral-800/40 transition-colors">
                          
                          {/* Student Details */}
                          <td className="p-3.5">
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              <span>{reg.student_name || 'Student'}</span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-[9px] font-mono text-amber-300">
                                {reg.regCode || 'WS-TICKET'}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5">{reg.email || 'No email'}</div>
                            <div className="text-[11px] text-red-400">{maskPhone(reg.phone)}</div>
                          </td>

                          {/* Workshop Name */}
                          <td className="p-3.5">
                            <div className="font-bold text-white max-w-[200px] truncate" title={reg.workshop_title}>
                              {reg.workshop_title || 'Technical Workshop'}
                            </div>
                            <div className="text-[10px] text-neutral-500 mt-0.5">
                              ID: {reg.workshop_id || 'ws-custom'}
                            </div>
                          </td>

                          {/* Fee & Payment Mode */}
                          <td className="p-3.5">
                            <div className="font-heading font-black text-emerald-400 text-sm">
                              ₹{reg.workshop_fee ?? 0}
                            </div>
                            {isBundled ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-[9px] font-mono text-emerald-300 font-bold mt-0.5">
                                <Check className="w-3 h-3" /> Gate Pass Access
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[9px] font-mono text-neutral-300 mt-0.5">
                                Direct UPI
                              </span>
                            )}
                          </td>

                          {/* UTR / Ref ID */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <code className="px-2 py-0.5 rounded-lg bg-black border border-neutral-700 text-red-300 font-bold tracking-wider">
                                {maskUtr(reg.utr)}
                              </code>
                              {reg.utr && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyUtr(reg.utr, reg.id)}
                                  className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                  title="Copy UTR ID"
                                >
                                  {copiedUtr === reg.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-500 mt-1">
                              {formatDateTime(reg.created_at || reg.timestamp)}
                            </div>
                          </td>

                          {/* Roll No & College */}
                          <td className="p-3.5">
                            <div className="font-bold text-slate-200">{reg.university_id || 'N/A'}</div>
                            <div className="text-[11px] text-neutral-400 truncate max-w-[140px]" title={reg.college_name}>
                              {reg.college_name || (reg.college_choice === 'kl_university' ? 'KL University' : 'External College')}
                            </div>
                          </td>

                          {/* Payment Proof Screenshot */}
                          <td className="p-3.5 text-center">
                            {reg.payment_screenshot_url ? (
                              <button
                                type="button"
                                onClick={() => setZoomedImage({
                                  url: reg.payment_screenshot_url,
                                  title: `Workshop Payment Proof: ${reg.student_name} (${reg.workshop_title}) — UTR: ${reg.utr || 'N/A'}`
                                })}
                                className="group relative inline-block rounded-xl border border-neutral-700 overflow-hidden hover:border-emerald-500 transition-all cursor-pointer"
                              >
                                <SecureImage 
                                  src={reg.payment_screenshot_url} 
                                  alt="Workshop Payment Screenshot" 
                                  className="w-12 h-12 object-cover bg-black" 
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            ) : isBundled ? (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[9px] font-mono text-emerald-300 font-bold whitespace-nowrap">
                                  Gate Pass Verified
                                </span>
                                <span className="text-[8px] text-neutral-400 font-mono">
                                  {reg.gate_pass_token ? reg.gate_pass_token.slice(-10) : 'Pass Active'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-neutral-500 italic">No Proof</span>
                            )}
                          </td>

                          {/* Verification Status */}
                          <td className="p-3.5 text-center">
                            {isConfirmed && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-bold text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                CONFIRMED
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-[10px] font-bold text-amber-300 animate-pulse">
                                <Clock className="w-3 h-3" />
                                PENDING
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-[10px] font-bold text-red-400" title={reg.rejectionReason}>
                                <XCircle className="w-3 h-3" />
                                REJECTED
                              </span>
                            )}
                          </td>

                          {/* Quick Actions */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              
                              {/* View Full Dossier */}
                              <button
                                type="button"
                                onClick={() => setSelectedPaymentModal({ ...reg, _type: 'workshop' })}
                                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 transition-all cursor-pointer"
                                title="View Complete Workshop Dossier"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Approve Button */}
                              {canVerifyPayments && !isConfirmed && (
                                <button
                                  type="button"
                                  disabled={updatingId === reg.id}
                                  onClick={() => handleVerifyWorkshopPayment(reg)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                  title="Confirm Workshop Seat & Payment"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Confirm</span>
                                </button>
                              )}

                              {/* Reject Button */}
                              {canVerifyPayments && !isRejected && (
                                <button
                                  type="button"
                                  disabled={updatingId === reg.id}
                                  onClick={() => handleRejectWorkshopPayment(reg)}
                                  className="px-2 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-red-400 hover:text-white text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                  title="Reject Workshop Payment Proof"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Record */}
                              <button
                                type="button"
                                onClick={() => handleDeleteWorkshopPayment(reg.id)}
                                className="p-1.5 rounded-lg hover:bg-red-950/50 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                                title="Delete workshop registration"
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
            )
          )}

          {/* ========================================================================= */}
          {/* VIEW B: FEST PASSES & ENTRY PAYMENTS */}
          {/* ========================================================================= */}
          {categoryTab === 'passes' && (
            filteredPassPayments.length === 0 ? (
              <div className="p-16 rounded-3xl bg-neutral-900/30 border border-neutral-800 text-center space-y-2">
                <CreditCard className="w-8 h-8 text-neutral-600 mx-auto" />
                <h4 className="text-base font-bold font-heading text-neutral-300">No Pass Records Found</h4>
                <p className="text-xs font-mono text-neutral-500">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try modifying your search query or filter selection.' 
                    : 'New student registrations and UPI payment submissions will appear here live.'}
                </p>
              </div>
            ) : (
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
                    {filteredPassPayments.map((p) => {
                      const isPending = !p.status || p.status === 'pending';
                      const isVerified = p.status === 'verified';
                      const isRejected = p.status === 'rejected';
                      const isKlu = isKlUniversityStudent(p);

                      return (
                        <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors">
                          
                          {/* Student Details: Name, Mail, Mobile */}
                          <td className="p-3.5">
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              <span>{p.name || 'Anonymous Student'}</span>
                              {isKlu && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-[9px] font-mono text-blue-300">
                                  KLU
                                </span>
                              )}
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

                          {/* UTR ID */}
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
                              {formatDateTime(p.date || p.submittedAt || p.timestamp)}
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
                            ) : isKlu ? (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[9px] font-mono text-emerald-300 font-bold whitespace-nowrap">
                                  KL Univ (Verified via ID)
                                </span>
                              </div>
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
                                  {isKlu ? (
                                    <span className="text-[9px] font-mono text-emerald-400/90 font-semibold whitespace-nowrap">
                                      🎓 KLU ID Entry (No Pass)
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono text-cyan-400 font-semibold">
                                      {p.gatePassStatus === 'USED' ? '🎟️ Pass Used' : (p.gatePassStatus === 'ISSUED' || p.gatePassToken) ? '🎫 Pass: ISSUED' : '🎫 Pending Issue'}
                                    </span>
                                  )}
                                </>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-[10px] font-bold text-amber-300">
                                  <Clock className="w-3 h-3" />
                                  PENDING
                                </span>
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
                              
                              <button
                                type="button"
                                onClick={() => setSelectedPaymentModal({ ...p, _type: 'pass' })}
                                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 transition-all cursor-pointer"
                                title="View Full Inspection Dossier"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {canVerifyPayments && !isVerified && (
                                <button
                                  type="button"
                                  disabled={updatingId === p.id}
                                  onClick={() => handleVerifyPassPayment(p)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                  title={isKlu ? "Verify KL University student without payment screenshot" : "Verify and Approve Payment"}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{isKlu && !p.paymentScreenshotUrl ? 'Verify (KLU)' : 'Verify'}</span>
                                </button>
                              )}

                              {canVerifyPayments && !isRejected && (
                                <button
                                  type="button"
                                  disabled={updatingId === p.id}
                                  onClick={() => handleRejectPassPayment(p)}
                                  className="px-2 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-red-400 hover:text-white text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                  title="Reject Payment"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeletePassPayment(p.id)}
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
            )
          )}

          {/* ========================================================================= */}
          {/* VIEW C: COMBINED ALL PAYMENTS STREAM */}
          {/* ========================================================================= */}
          {categoryTab === 'all' && (
            combinedList.length === 0 ? (
              <div className="p-16 rounded-3xl bg-neutral-900/30 border border-neutral-800 text-center space-y-2">
                <Layers className="w-8 h-8 text-neutral-600 mx-auto" />
                <h4 className="text-base font-bold font-heading text-neutral-300">No Transaction Records</h4>
                <p className="text-xs font-mono text-neutral-500">
                  Try clearing your search query or status filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/40">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-black/80 text-neutral-400 text-[10px] uppercase tracking-wider">
                      <th className="p-3.5">Transaction Type</th>
                      <th className="p-3.5">Student &amp; Roll</th>
                      <th className="p-3.5">Item / Pass Name</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">UTR / Ref</th>
                      <th className="p-3.5 text-center">Proof Pic</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {combinedList.map((item) => {
                      const isWs = item._type === 'workshop';
                      const isV = item._displayStatus === 'VERIFIED' || item._displayStatus === 'CONFIRMED';
                      const isR = item._displayStatus === 'REJECTED';

                      return (
                        <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                          {/* Type */}
                          <td className="p-3.5">
                            {isWs ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-[10px] font-bold text-amber-300">
                                <BookOpen className="w-3 h-3" /> WORKSHOP
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-bold text-cyan-300">
                                <CreditCard className="w-3 h-3" /> FEST PASS
                              </span>
                            )}
                          </td>

                          {/* Student & Roll */}
                          <td className="p-3.5">
                            <div className="font-bold text-white text-sm">{item._displayName}</div>
                            <div className="text-[11px] text-neutral-400">{item._displayRoll} · {item._displayCollege}</div>
                            <div className="text-[10px] text-neutral-500">{maskPhone(item.phone)}</div>
                          </td>

                          {/* Item Name */}
                          <td className="p-3.5">
                            <div className="font-bold text-slate-200 max-w-[200px] truncate" title={item._displayTitle}>
                              {item._displayTitle}
                            </div>
                            <div className="text-[10px] text-neutral-500">{formatDateTime(item._displayDate)}</div>
                          </td>

                          {/* Amount */}
                          <td className="p-3.5">
                            <div className="font-heading font-black text-emerald-400 text-sm">
                              ₹{item._displayAmount}
                            </div>
                          </td>

                          {/* UTR */}
                          <td className="p-3.5">
                            <code className="px-2 py-0.5 rounded-lg bg-black border border-neutral-700 text-red-300 font-bold">
                              {maskUtr(item._displayUtr)}
                            </code>
                          </td>

                          {/* Proof */}
                          <td className="p-3.5 text-center">
                            {item._screenshotUrl ? (
                              <button
                                type="button"
                                onClick={() => setZoomedImage({
                                  url: item._screenshotUrl,
                                  title: `Proof: ${item._displayName} — ${item._displayTitle}`
                                })}
                                className="group relative inline-block rounded-xl border border-neutral-700 overflow-hidden hover:border-emerald-500 transition-all cursor-pointer"
                              >
                                <img 
                                  src={item._screenshotUrl} 
                                  alt="Screenshot" 
                                  className="w-10 h-10 object-cover bg-black" 
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3 h-3 text-white" />
                                </div>
                              </button>
                            ) : item._idPicUrl ? (
                              <button
                                type="button"
                                onClick={() => setZoomedImage({
                                  url: item._idPicUrl,
                                  title: `College ID: ${item._displayName}`
                                })}
                                className="group relative inline-block rounded-xl border border-neutral-700 overflow-hidden hover:border-red-500 transition-all cursor-pointer"
                              >
                                <img 
                                  src={item._idPicUrl} 
                                  alt="ID" 
                                  className="w-10 h-10 object-cover bg-black" 
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3 h-3 text-white" />
                                </div>
                              </button>
                            ) : (
                              <span className="text-[10px] text-neutral-500 italic">No Pic</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-3.5 text-center">
                            {isV && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-bold text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> {item._displayStatus}
                              </span>
                            )}
                            {!isV && !isR && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-[10px] font-bold text-amber-300">
                                <Clock className="w-3 h-3" /> PENDING
                              </span>
                            )}
                            {isR && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-500/50 text-[10px] font-bold text-red-400">
                                <XCircle className="w-3 h-3" /> REJECTED
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedPaymentModal(item)}
                                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 transition-all cursor-pointer"
                                title="Inspect Record"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {canVerifyPayments && !isV && (
                                <button
                                  type="button"
                                  disabled={updatingId === item.id}
                                  onClick={() => isWs ? handleVerifyWorkshopPayment(item) : handleVerifyPassPayment(item)}
                                  className="px-2 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white text-[11px] font-bold transition-all cursor-pointer"
                                  title="Approve / Confirm"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canVerifyPayments && !isR && (
                                <button
                                  type="button"
                                  disabled={updatingId === item.id}
                                  onClick={() => isWs ? handleRejectWorkshopPayment(item) : handleRejectPassPayment(item)}
                                  className="px-2 py-1 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-red-400 hover:text-white text-[11px] font-bold transition-all cursor-pointer"
                                  title="Reject"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => isWs ? handleDeleteWorkshopPayment(item.id) : handleDeletePassPayment(item.id)}
                                className="p-1.5 rounded-lg hover:bg-red-950/50 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                                title="Delete"
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
            )
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FULL INSPECTION DOSSIER (FEST PASS & WORKSHOPS) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-red-500/50 rounded-3xl max-w-3xl w-full p-6 sm:p-8 relative overflow-hidden shadow-[0_0_60px_rgba(223,37,49,0.3)] max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setSelectedPaymentModal(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-neutral-900 hover:bg-red-600/30 text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500 text-red-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-xl text-white">
                    {selectedPaymentModal.student_name || selectedPaymentModal.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-red-400">
                      Ref: {selectedPaymentModal.regCode || selectedPaymentModal.registrationId || selectedPaymentModal.id}
                    </span>
                    {selectedPaymentModal._type === 'workshop' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-[9px] font-mono text-amber-300 font-bold uppercase">
                        Workshop Registration
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-[9px] font-mono text-cyan-300 font-bold uppercase">
                        Fest Pass Registration
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Student Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs font-mono mb-6">
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">College ID / Roll</span>
                  <span className="font-bold text-white text-sm">
                    {selectedPaymentModal.university_id || selectedPaymentModal.rollNo || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">Mobile Phone</span>
                  <span className="font-bold text-white">{selectedPaymentModal.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">Email</span>
                  <span className="font-bold text-white truncate block">
                    {selectedPaymentModal.email || selectedPaymentModal.userEmail || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">College</span>
                  <span className="font-bold text-white truncate block">
                    {selectedPaymentModal.college_name || selectedPaymentModal.university || 'KL University'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">Program / Item</span>
                  <span className="font-bold text-red-400">
                    {selectedPaymentModal.workshop_title || selectedPaymentModal.tier || 'Fest Pass'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] block">Amount Paid</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ₹{selectedPaymentModal.workshop_fee ?? (selectedPaymentModal.amount || 0)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-neutral-500 uppercase text-[10px] block">UTR Transaction ID</span>
                  <span className="font-bold text-white font-mono tracking-widest">
                    {selectedPaymentModal.utr || selectedPaymentModal.utrId || selectedPaymentModal.transactionId || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Images Preview in Modal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                
                {/* College ID Card Photo (Fest Pass) or Details Card */}
                {selectedPaymentModal._type !== 'workshop' ? (
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
                      <SecureImage 
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
                ) : (
                  <div className="p-4 rounded-2xl bg-black border border-neutral-800 space-y-3 font-mono text-xs">
                    <span className="text-xs font-mono font-bold text-amber-400 block border-b border-neutral-800 pb-2">
                      Workshop Registration Summary
                    </span>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase block">Workshop Title</span>
                      <span className="text-white font-bold">{selectedPaymentModal.workshop_title}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase block">Branch &amp; Year</span>
                      <span className="text-slate-200">
                        {selectedPaymentModal.branch || 'General'} {selectedPaymentModal.year ? `· Year ${selectedPaymentModal.year}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase block">Payment Channel</span>
                      <span className="text-emerald-400 font-bold">
                        {selectedPaymentModal.is_gate_pass_verified 
                          ? `Included with Fest Gate Pass (${selectedPaymentModal.gate_pass_token || 'Verified'})`
                          : 'Direct UPI Transaction'}
                      </span>
                    </div>
                    {selectedPaymentModal.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-[11px]">
                        <strong>Rejection Reason:</strong> {selectedPaymentModal.rejectionReason}
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Screenshot */}
                <div className="p-3 rounded-2xl bg-black border border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-300">Payment Screenshot Proof</span>
                    {(selectedPaymentModal.paymentScreenshotUrl || selectedPaymentModal.payment_screenshot_url) && (
                      <button
                        type="button"
                        onClick={() => setZoomedImage({
                          url: selectedPaymentModal.paymentScreenshotUrl || selectedPaymentModal.payment_screenshot_url,
                          title: `Payment Screenshot: ${selectedPaymentModal.student_name || selectedPaymentModal.name}`
                        })}
                        className="text-[10px] font-mono text-emerald-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Zoom
                      </button>
                    )}
                  </div>
                  {(selectedPaymentModal.paymentScreenshotUrl || selectedPaymentModal.payment_screenshot_url) ? (
                    <SecureImage 
                      src={selectedPaymentModal.paymentScreenshotUrl || selectedPaymentModal.payment_screenshot_url} 
                      alt="Payment Screenshot" 
                      className="w-full h-56 object-contain rounded-xl bg-neutral-900 border border-neutral-800" 
                    />
                  ) : selectedPaymentModal.is_gate_pass_verified ? (
                    <div className="h-56 rounded-xl bg-emerald-950/20 border border-dashed border-emerald-500/40 p-4 flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-300">
                        Verified via Fest Pass
                      </span>
                      <p className="text-[11px] font-mono text-neutral-300 max-w-xs leading-relaxed">
                        Student is eligible for this workshop with their verified Fest Gate Pass ({selectedPaymentModal.gate_pass_token || 'ACTIVE'}).
                      </p>
                    </div>
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

                {selectedPaymentModal._type === 'workshop' ? (
                  <>
                    <button
                      type="button"
                      disabled={updatingId === selectedPaymentModal.id}
                      onClick={() => handleRejectWorkshopPayment(selectedPaymentModal)}
                      className="px-4 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-xs font-mono font-bold text-red-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                    >
                      Reject Proof
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === selectedPaymentModal.id}
                      onClick={() => handleVerifyWorkshopPayment(selectedPaymentModal)}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-xs font-heading font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(223,37,49,0.4)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      Confirm Workshop Seat
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={updatingId === selectedPaymentModal.id}
                      onClick={() => handleRejectPassPayment(selectedPaymentModal)}
                      className="px-4 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-xs font-mono font-bold text-red-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                    >
                      Reject Proof
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === selectedPaymentModal.id}
                      onClick={() => handleVerifyPassPayment(selectedPaymentModal)}
                      className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-heading font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isKlUniversityStudent(selectedPaymentModal)
                        ? 'Verify Student (KL University - No Pass)'
                        : 'Verify & Issue Gate Pass'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX / ZOOM MODAL */}
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
                  className="p-1 rounded-full bg-neutral-800 hover:bg-red-600 text-white transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[80vh] flex items-center justify-center overflow-auto rounded-2xl bg-black p-2">
                <SecureImage 
                  src={zoomedImage.url} 
                  alt="Zoomed proof" 
                  className="max-h-[75vh] w-auto object-contain rounded-xl" 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM PURGE MODAL */}
      <AnimatePresence>
        {showPurgeConfirm && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-red-500 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-[0_0_50px_rgba(223,37,49,0.5)]"
            >
              <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500 text-red-500 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black font-heading text-white">
                PURGE {categoryTab === 'workshops' ? 'WORKSHOP PAYMENTS' : 'PAYMENT RECORDS'}?
              </h3>
              <p className="text-xs font-mono text-neutral-400 leading-relaxed">
                This will delete payment documents from the live Firestore collection. This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPurgeConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={purging}
                  onClick={handlePurgeTempData}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white flex items-center gap-1.5 cursor-pointer"
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
