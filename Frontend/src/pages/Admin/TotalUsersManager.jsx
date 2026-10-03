import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, CheckCircle2, 
  Download, Eye, Copy, Check, RefreshCw, 
  ShieldCheck, School, Phone, Mail, 
  CreditCard, AlertCircle, ExternalLink, 
  Edit3, Save, X, ZoomIn, ZoomOut, RotateCw,
  Sparkles, Filter, Calendar, Clock, MapPin, Ban, Trash2,
  ArrowLeft, Ticket
} from 'lucide-react';
import { 
  collection, onSnapshot, doc, updateDoc, setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { 
  issueGatePassForRegistration, 
  recordAuditLog,
  isKlUniversityStudent
} from '../../services/gatePassService';
import { 
  cancelEventRegistration, 
  reactivateEventRegistration, 
  deleteEventRegistration 
} from '../../services/eventRegistrationService';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { exportUsersToExcel } from '../../services/excelExportService';
import SecureImage from '../../components/SecureImage/SecureImage';
import { FEST_FEE } from '../../config/paymentConfig';

export default function TotalUsersManager({ onToast }) {
  const { adminUser, adminRole } = useAdminAuth();

  // Raw data from collections
  const [usersCollection, setUsersCollection] = useState([]);
  const [registrationsCollection, setRegistrationsCollection] = useState([]);
  const [studentRegistrationsCollection, setStudentRegistrationsCollection] = useState([]);
  const [paymentsCollection, setPaymentsCollection] = useState([]);
  const [eventRegistrationsCollection, setEventRegistrationsCollection] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState('ALL'); // 'ALL' | 'ENROLLED' | 'UNENROLLED'
  const [categoryFilter, setCategoryFilter] = useState('ALL');     // 'ALL' | 'INTERNAL' | 'EXTERNAL'
  const [paymentFilter, setPaymentFilter] = useState('ALL');       // 'ALL' | 'VERIFIED' | 'PENDING' | 'UNPAID'
  const [idCardFilter, setIdCardFilter] = useState('ALL');         // 'ALL' | 'UPLOADED' | 'VERIFIED' | 'MISSING'
  const [attendanceFilter, setAttendanceFilter] = useState('ALL'); // 'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN'
  const [sortBy, setSortBy] = useState('RECENT');                  // 'RECENT' | 'NAME' | 'SAMYAK_ID' | 'ROLL_NO'

  // Modals & UI states
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [idCardModalUrl, setIdCardModalUrl] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [updatingUid, setUpdatingUid] = useState(null);

  // Edit form state inside modal
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    studentId: '',
    mobile: '',
    college: '',
    branch: '',
    category: 'INTERNAL'
  });

  // ID Card viewer zoom/rotation state
  const [imgZoom, setImgZoom] = useState(1);
  const [imgRotate, setImgRotate] = useState(0);

  // 1. Live Firestore Listeners
  useEffect(() => {
    let unsubUsers = () => {};
    let unsubReg = () => {};
    let unsubStReg = () => {};
    let unsubPay = () => {};
    let unsubEvReg = () => {};

    try {
      // 1. Users collection
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, uid: d.id, ...d.data() }));
        setUsersCollection(list);
      }, (err) => console.warn('Users listener notice:', err));

      // 2. Registrations collection
      unsubReg = onSnapshot(collection(db, 'registrations'), (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setRegistrationsCollection(list);
      }, (err) => console.warn('Registrations listener notice:', err));

      // 3. Student Registrations collection (legacy/ID cards)
      unsubStReg = onSnapshot(collection(db, 'student_registrations'), (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setStudentRegistrationsCollection(list);
      }, (err) => console.warn('Student Registrations listener notice:', err));

      // 4. Payments collection
      unsubPay = onSnapshot(collection(db, 'payments'), (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setPaymentsCollection(list);
        setLoading(false);
      }, (err) => {
        console.warn('Payments listener notice:', err);
        setLoading(false);
      });

      // 5. Event Registrations collection
      unsubEvReg = onSnapshot(collection(db, 'event_registrations'), (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setEventRegistrationsCollection(list);
      }, (err) => console.warn('Event Registrations listener notice:', err));
    } catch (e) {
      console.warn('Listeners init notice:', e);
      setLoading(false);
    }

    return () => {
      unsubUsers();
      unsubReg();
      unsubStReg();
      unsubPay();
      unsubEvReg();
    };
  }, []);

  // 2. Consolidation & Unified User Mapping
  const consolidatedUsers = useMemo(() => {
    const userMap = new Map();

    // Step A: Seed from 'users' collection
    usersCollection.forEach((u) => {
      const key = u.uid || u.id;
      const isInternal = Boolean(
        u.email?.toLowerCase().includes('@kluniversity.in') || 
        (u.college || '').toLowerCase().includes('kl')
      );

      userMap.set(key, {
        uid: key,
        userId: key,
        name: u.name || u.displayName || '',
        email: u.email || '',
        studentId: u.studentId || u.rollNo || '',
        rollNo: u.studentId || u.rollNo || '',
        mobile: u.mobile || u.phone || '',
        phone: u.mobile || u.phone || '',
        college: u.college || u.university || 'KL University',
        university: u.college || u.university || 'KL University',
        branch: u.branch || '',
        idCardUrl: u.idCardUrl || u.collegeIdCardUrl || null,
        avatarUrl: u.avatarUrl || u.photoURL || null,
        profileCompleted: Boolean(u.profileCompleted),
        idVerified: Boolean(u.verified || u.idVerified),
        categoryVerificationStatus: u.categoryVerificationStatus || (isInternal ? 'VERIFIED' : 'PENDING'),
        isInternal,
        category: isInternal ? 'INTERNAL' : 'EXTERNAL',
        samyakId: u.samyakId || '',
        hasSamyakId: Boolean(u.samyakId),
        paymentStatus: u.paymentStatus || 'UNPAID',
        payment: null,
        gatePassStatus: u.gatePassStatus || 'NOT_ISSUED',
        gatePassToken: u.gatePassToken || '',
        checkedIn: Boolean(u.checkedIn),
        checkedInAt: u.checkedInAt || null,
        registeredEvents: u.registeredEvents || [],
        createdAt: u.createdAt || null,
        updatedAt: u.updatedAt || null,
        source: 'user_profile',
        rawUserDoc: u,
        rawRegDoc: null,
        rawPayDoc: null,
        rawStRegDoc: null
      });
    });

    // Step B: Enrich or merge from 'registrations' collection (Fest enrollment)
    registrationsCollection.forEach((r) => {
      let matchedKey = null;

      // Try match by uid
      if (r.uid && userMap.has(r.uid)) {
        matchedKey = r.uid;
      } else {
        // Try match by email
        for (const [k, u] of userMap.entries()) {
          if (r.email && u.email && r.email.toLowerCase() === u.email.toLowerCase()) {
            matchedKey = k;
            break;
          }
          if (r.studentId && u.studentId && r.studentId.toLowerCase() === u.studentId.toLowerCase()) {
            matchedKey = k;
            break;
          }
        }
      }

      const samyakId = r.registrationId || r.samyakId || '';
      const category = r.category || (r.email?.toLowerCase().includes('@kluniversity.in') ? 'INTERNAL' : 'EXTERNAL');
      const isInternal = category === 'INTERNAL';
      const payStatus = r.payment?.status || (r.payment ? 'VERIFIED' : 'UNPAID');
      const gpStatus = r.gatePass?.status || 'NOT_ISSUED';
      const checkedIn = Boolean(r.gatePass?.checkedIn || r.attendance?.status === 'PRESENT');

      if (matchedKey) {
        const u = userMap.get(matchedKey);
        userMap.set(matchedKey, {
          ...u,
          samyakId: samyakId || u.samyakId,
          hasSamyakId: Boolean(samyakId || u.samyakId),
          name: u.name || r.name || '',
          email: u.email || r.email || '',
          studentId: u.studentId || r.studentId || '',
          rollNo: u.studentId || r.studentId || '',
          mobile: u.mobile || r.mobile || '',
          phone: u.mobile || r.mobile || '',
          college: u.college || r.college || 'KL University',
          university: u.college || r.college || 'KL University',
          branch: u.branch || r.branch || '',
          category,
          isInternal,
          categoryVerificationStatus: r.categoryVerificationStatus || u.categoryVerificationStatus,
          payment: r.payment || u.payment,
          paymentStatus: payStatus !== 'UNPAID' ? payStatus : u.paymentStatus,
          gatePass: r.gatePass || u.gatePass,
          gatePassStatus: gpStatus !== 'NOT_ISSUED' ? gpStatus : u.gatePassStatus,
          gatePassToken: r.gatePass?.token || u.gatePassToken,
          checkedIn: checkedIn || u.checkedIn,
          checkedInAt: r.gatePass?.checkedInAt || r.attendance?.timestamp || u.checkedInAt,
          registeredEvents: r.registeredEvents || u.registeredEvents,
          createdAt: u.createdAt || r.createdAt,
          rawRegDoc: r
        });
      } else {
        // Register doc without a matching users/{uid} account
        const newKey = r.uid || r.registrationId || r.id;
        userMap.set(newKey, {
          uid: newKey,
          userId: r.uid || newKey,
          name: r.name || 'SAMYAK Participant',
          email: r.email || '',
          studentId: r.studentId || '',
          rollNo: r.studentId || '',
          mobile: r.mobile || '',
          phone: r.mobile || '',
          college: r.college || 'KL University',
          university: r.college || 'KL University',
          branch: r.branch || '',
          idCardUrl: null,
          avatarUrl: null,
          profileCompleted: Boolean(r.name && r.studentId),
          idVerified: false,
          categoryVerificationStatus: r.categoryVerificationStatus || (isInternal ? 'VERIFIED' : 'PENDING'),
          isInternal,
          category,
          samyakId,
          hasSamyakId: Boolean(samyakId),
          payment: r.payment || null,
          paymentStatus: payStatus,
          gatePass: r.gatePass || null,
          gatePassStatus: gpStatus,
          gatePassToken: r.gatePass?.token || '',
          checkedIn,
          checkedInAt: r.gatePass?.checkedInAt || null,
          registeredEvents: r.registeredEvents || [],
          createdAt: r.createdAt || null,
          updatedAt: r.updatedAt || null,
          source: 'registration',
          rawUserDoc: null,
          rawRegDoc: r,
          rawPayDoc: null,
          rawStRegDoc: null
        });
      }
    });

    // Step C: Enrich with 'payments'
    paymentsCollection.forEach((p) => {
      let matchedKey = null;
      if (p.userId && userMap.has(p.userId)) {
        matchedKey = p.userId;
      } else {
        for (const [k, u] of userMap.entries()) {
          if (p.userEmail && u.email && p.userEmail.toLowerCase() === u.email.toLowerCase()) {
            matchedKey = k;
            break;
          }
          if (p.studentId && u.studentId && p.studentId.toLowerCase() === u.studentId.toLowerCase()) {
            matchedKey = k;
            break;
          }
          if (p.samyakId && u.samyakId && p.samyakId.toLowerCase() === u.samyakId.toLowerCase()) {
            matchedKey = k;
            break;
          }
        }
      }

      if (matchedKey) {
        const u = userMap.get(matchedKey);
        const pStatus = p.paymentStatus || p.status || 'VERIFIED';
        userMap.set(matchedKey, {
          ...u,
          rawPayDoc: p,
          utrId: p.utrId || p.utr || u.utrId,
          paymentStatus: u.paymentStatus === 'UNPAID' ? pStatus : u.paymentStatus,
          payment: u.payment || {
            status: pStatus,
            amount: p.amount || FEST_FEE,
            utr: p.utrId || p.utr,
            screenshotUrl: p.screenshotUrl,
            submittedAt: p.timestamp || p.date,
            verifiedAt: p.verifiedAt
          }
        });
      }
    });

    // Step D: Enrich with 'student_registrations' (legacy/ID card records)
    studentRegistrationsCollection.forEach((st) => {
      let matchedKey = null;
      for (const [k, u] of userMap.entries()) {
        if (st.rollNo && u.studentId && st.rollNo.toLowerCase() === u.studentId.toLowerCase()) {
          matchedKey = k;
          break;
        }
        if (st.phone && u.mobile && st.phone === u.mobile) {
          matchedKey = k;
          break;
        }
        if (st.samyakId && u.samyakId && st.samyakId.toLowerCase() === u.samyakId.toLowerCase()) {
          matchedKey = k;
          break;
        }
      }

      if (matchedKey) {
        const u = userMap.get(matchedKey);
        userMap.set(matchedKey, {
          ...u,
          idCardUrl: u.idCardUrl || st.idCardUrl || null,
          checkedIn: u.checkedIn || Boolean(st.attended),
          checkedInAt: u.checkedInAt || st.checkedInAt || null,
          rawStRegDoc: st
        });
      } else {
        const newKey = st.id || (st.rollNo ? `roll_${st.rollNo}` : (st.phone ? `phone_${st.phone}` : `st_${st.name || 'entry'}`));
        const isInternal = Boolean((st.university || '').toLowerCase().includes('kl'));
        userMap.set(newKey, {
          uid: newKey,
          userId: newKey,
          name: st.name || 'Student Attendee',
          email: '',
          studentId: st.rollNo || '',
          rollNo: st.rollNo || '',
          mobile: st.phone || '',
          phone: st.phone || '',
          college: st.university || 'KL University',
          university: st.university || 'KL University',
          branch: '',
          idCardUrl: st.idCardUrl || null,
          avatarUrl: null,
          profileCompleted: Boolean(st.name && st.rollNo),
          idVerified: false,
          categoryVerificationStatus: isInternal ? 'VERIFIED' : 'PENDING',
          isInternal,
          category: isInternal ? 'INTERNAL' : 'EXTERNAL',
          samyakId: st.samyakId || '',
          hasSamyakId: Boolean(st.samyakId),
          payment: null,
          paymentStatus: st.paymentStatus || 'UNPAID',
          gatePass: null,
          gatePassStatus: st.attended ? 'USED' : 'NOT_ISSUED',
          gatePassToken: '',
          checkedIn: Boolean(st.attended),
          checkedInAt: st.checkedInAt || null,
          registeredEvents: [],
          createdAt: null,
          updatedAt: null,
          source: 'student_registration',
          rawUserDoc: null,
          rawRegDoc: null,
          rawPayDoc: null,
          rawStRegDoc: st
        });
      }
    });

    // Step E: Enrich with actual event registrations from 'event_registrations'
    eventRegistrationsCollection.forEach((ev) => {
      let matchedKey = null;
      if (ev.uid && userMap.has(ev.uid)) {
        matchedKey = ev.uid;
      } else if (ev.email) {
        const evEmail = ev.email.toLowerCase().trim();
        for (const [k, u] of userMap.entries()) {
          if (u.email && u.email.toLowerCase().trim() === evEmail) {
            matchedKey = k;
            break;
          }
        }
      }

      if (matchedKey) {
        const u = userMap.get(matchedKey);
        const list = u.enrolledEventsList || [];
        if (!list.some((item) => item.id === ev.id)) {
          list.push(ev);
        }
        u.enrolledEventsList = list;
        u.enrolledEventsCount = list.filter(
          (x) => (x.status || '').toLowerCase() !== 'cancelled' && !x.isCancelled
        ).length;
      }
    });

    return Array.from(userMap.values());
  }, [usersCollection, registrationsCollection, studentRegistrationsCollection, paymentsCollection, eventRegistrationsCollection]);

  // 3. Search & Filter Filtering
  const filteredUsers = useMemo(() => {
    let result = consolidatedUsers;

    // Search query: searches Name, Student ID (Roll No), Samyak ID, Email, Phone, College, Branch, UTR
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((u) => {
        return (
          u.name?.toLowerCase().includes(q) ||
          u.studentId?.toLowerCase().includes(q) ||
          u.rollNo?.toLowerCase().includes(q) ||
          u.samyakId?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.mobile?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.college?.toLowerCase().includes(q) ||
          u.university?.toLowerCase().includes(q) ||
          u.branch?.toLowerCase().includes(q) ||
          u.utrId?.toLowerCase().includes(q) ||
          u.payment?.utr?.toLowerCase().includes(q) ||
          u.gatePassToken?.toLowerCase().includes(q)
        );
      });
    }

    // Enrollment filter
    if (enrollmentFilter === 'ENROLLED') {
      result = result.filter((u) => u.hasSamyakId);
    } else if (enrollmentFilter === 'UNENROLLED') {
      result = result.filter((u) => !u.hasSamyakId);
    }

    // Category filter
    if (categoryFilter === 'INTERNAL') {
      result = result.filter((u) => u.isInternal || u.category === 'INTERNAL');
    } else if (categoryFilter === 'EXTERNAL') {
      result = result.filter((u) => !u.isInternal && u.category === 'EXTERNAL');
    }

    // Payment status filter
    if (paymentFilter === 'VERIFIED') {
      result = result.filter((u) => 
        u.paymentStatus === 'VERIFIED' || 
        u.paymentStatus === 'Completed' || 
        u.paymentStatus === 'APPROVED'
      );
    } else if (paymentFilter === 'PENDING') {
      result = result.filter((u) => 
        u.paymentStatus === 'PENDING' || 
        u.paymentStatus === 'PENDING_VERIFICATION' || 
        u.paymentStatus === 'PAYMENT_SUBMITTED'
      );
    } else if (paymentFilter === 'UNPAID') {
      result = result.filter((u) => 
        !u.paymentStatus || 
        u.paymentStatus === 'UNPAID' || 
        u.paymentStatus === 'PENDING_PAYMENT'
      );
    }

    // ID card filter
    if (idCardFilter === 'UPLOADED') {
      result = result.filter((u) => Boolean(u.idCardUrl));
    } else if (idCardFilter === 'VERIFIED') {
      result = result.filter((u) => u.idVerified);
    } else if (idCardFilter === 'MISSING') {
      result = result.filter((u) => !u.idCardUrl);
    }

    // Attendance filter
    if (attendanceFilter === 'CHECKED_IN') {
      result = result.filter((u) => u.checkedIn);
    } else if (attendanceFilter === 'NOT_CHECKED_IN') {
      result = result.filter((u) => !u.checkedIn);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'NAME') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'SAMYAK_ID') {
        return (a.samyakId || 'ZZZZ').localeCompare(b.samyakId || 'ZZZZ');
      }
      if (sortBy === 'ROLL_NO') {
        return (a.studentId || 'ZZZZ').localeCompare(b.studentId || 'ZZZZ');
      }
      // RECENT (default)
      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return result;
  }, [consolidatedUsers, searchQuery, enrollmentFilter, categoryFilter, paymentFilter, idCardFilter, attendanceFilter, sortBy]);

  // Keep active inspected user in sync with live data
  const currentInspectedUser = useMemo(() => {
    if (!selectedUserModal) return null;
    return consolidatedUsers.find((u) => u.uid === selectedUserModal.uid) || selectedUserModal;
  }, [consolidatedUsers, selectedUserModal]);

  // Selected user's event registrations for modal inspection
  const currentUserEvents = useMemo(() => {
    if (!currentInspectedUser) return [];
    const uid = currentInspectedUser.uid;
    const email = (currentInspectedUser.email || '').toLowerCase().trim();
    return eventRegistrationsCollection.filter((r) => {
      if (uid && r.uid === uid) return true;
      if (email && r.email && r.email.toLowerCase().trim() === email) return true;
      return false;
    });
  }, [currentInspectedUser, eventRegistrationsCollection]);

  // 4. Statistics Counts
  const stats = useMemo(() => {
    const total = consolidatedUsers.length;
    const enrolled = consolidatedUsers.filter((u) => u.hasSamyakId).length;
    const internal = consolidatedUsers.filter((u) => u.isInternal || u.category === 'INTERNAL').length;
    const external = total - internal;
    const withIdCard = consolidatedUsers.filter((u) => Boolean(u.idCardUrl)).length;
    const idVerified = consolidatedUsers.filter((u) => u.idVerified).length;
    const paidVerified = consolidatedUsers.filter((u) => 
      u.paymentStatus === 'VERIFIED' || u.paymentStatus === 'Completed' || u.paymentStatus === 'APPROVED'
    ).length;
    const checkedIn = consolidatedUsers.filter((u) => u.checkedIn).length;

    return { total, enrolled, internal, external, withIdCard, idVerified, paidVerified, checkedIn };
  }, [consolidatedUsers]);

  // Copy helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open full-screen verification page & prep edit form
  const handleInspectUser = (user) => {
    setSelectedUserModal(user);
    setIsEditing(false);
    setEditForm({
      name: user.name || '',
      studentId: user.studentId || user.rollNo || '',
      mobile: user.mobile || user.phone || '',
      college: user.college || user.university || 'KL University',
      branch: user.branch || '',
      category: user.category || (user.isInternal ? 'INTERNAL' : 'EXTERNAL')
    });
    setImgZoom(1);
    setImgRotate(0);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('inspect', user.uid);
      window.history.pushState({ inspect: user.uid }, '', url.toString());
    } catch {}
  };

  // Close full-screen verification page
  const handleCloseInspect = () => {
    setSelectedUserModal(null);
    setIsEditing(false);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('inspect')) {
        url.searchParams.delete('inspect');
        window.history.pushState({}, '', url.toString());
      }
    } catch {}
  };

  // Lock backside body scrolling when student inspection page or lightbox modal is open
  useEffect(() => {
    if (selectedUserModal || idCardModalUrl) {
      const prevOverflow = document.body.style.overflow;
      const prevOverscroll = document.body.style.overscrollBehavior;
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.overscrollBehavior = prevOverscroll;
      };
    }
  }, [selectedUserModal, idCardModalUrl]);

  // Handle browser back button smoothly
  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const inspectUid = params.get('inspect');
        if (inspectUid) {
          const found = consolidatedUsers.find((u) => u.uid === inspectUid);
          if (found) {
            setSelectedUserModal(found);
            setIsEditing(false);
            return;
          }
        }
        setSelectedUserModal(null);
        setIsEditing(false);
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [consolidatedUsers]);

  // Check URL param on first load
  useEffect(() => {
    if (consolidatedUsers.length > 0 && !selectedUserModal) {
      try {
        const params = new URLSearchParams(window.location.search);
        const inspectUid = params.get('inspect');
        if (inspectUid) {
          const found = consolidatedUsers.find((u) => u.uid === inspectUid);
          if (found) {
            handleInspectUser(found);
          }
        }
      } catch {}
    }
  }, [consolidatedUsers]);

  // Save edited user profile directly to Firestore
  const handleSaveUserEdits = async () => {
    if (!selectedUserModal) return;
    try {
      setUpdatingUid(selectedUserModal.uid);
      const updates = {
        name: editForm.name.trim(),
        studentId: editForm.studentId.trim(),
        rollNo: editForm.studentId.trim(),
        mobile: editForm.mobile.trim(),
        phone: editForm.mobile.trim(),
        college: editForm.college.trim(),
        university: editForm.college.trim(),
        branch: editForm.branch.trim(),
        category: editForm.category,
        updatedAt: serverTimestamp()
      };

      // 1. Update in 'users' collection if uid exists
      if (selectedUserModal.rawUserDoc) {
        await updateDoc(doc(db, 'users', selectedUserModal.uid), updates);
      }

      // 2. Update in 'registrations' collection if exists
      if (selectedUserModal.rawRegDoc?.id) {
        await updateDoc(doc(db, 'registrations', selectedUserModal.rawRegDoc.id), {
          name: updates.name,
          studentId: updates.studentId,
          mobile: updates.mobile,
          college: updates.college,
          branch: updates.branch,
          category: updates.category,
          updatedAt: serverTimestamp()
        });
      }

      // 3. Update in 'student_registrations' if exists
      if (selectedUserModal.rawStRegDoc?.id) {
        await updateDoc(doc(db, 'student_registrations', selectedUserModal.rawStRegDoc.id), {
          name: updates.name,
          rollNo: updates.studentId,
          phone: updates.mobile,
          university: updates.college
        });
      }

      // Record audit log
      await recordAuditLog({
        registrationId: selectedUserModal.samyakId || selectedUserModal.studentId || selectedUserModal.uid,
        action: 'ADMIN_USER_UPDATED',
        actorId: adminUser?.email || 'admin',
        details: updates
      });

      setSelectedUserModal((prev) => ({ ...prev, ...updates }));
      setIsEditing(false);
      if (onToast) onToast(`Updated details for ${updates.name || 'User'}`, 'success');
    } catch (err) {
      console.error('Failed to update user:', err);
      if (onToast) onToast('Failed to save changes: ' + err.message, 'error');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Admin cancel user event registration (frees seat & slot)
  const handleAdminCancelEvent = async (reg) => {
    const studentName = selectedUserModal?.name || 'Student';
    const confirmMsg = `Cancel ${studentName}'s registration for "${reg.event_title}"?\n\nThis will mark the registration as CANCELLED, restore the seat for the event, and allow the student to register again or choose another event in this time slot.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setUpdatingUid(reg.id);
      await cancelEventRegistration(
        reg.id, 
        `Cancelled by admin (${adminUser?.email || 'admin'}) from Users Console`, 
        adminUser?.email || 'admin'
      );
      if (onToast) onToast(`Registration for "${reg.event_title}" cancelled. Seat restored and slot unlocked!`, 'success');
    } catch (err) {
      console.error('Cancel event error:', err);
      if (onToast) onToast('Failed to cancel event registration: ' + err.message, 'error');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Admin reactivate user event registration
  const handleAdminReactivateEvent = async (reg) => {
    try {
      setUpdatingUid(reg.id);
      await reactivateEventRegistration(reg.id, adminUser?.email || 'admin');
      if (onToast) onToast(`Registration for "${reg.event_title}" restored to ACTIVE!`, 'success');
    } catch (err) {
      console.error('Reactivate event error:', err);
      if (onToast) onToast('Failed to restore event registration: ' + err.message, 'error');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Admin delete registration record permanently
  const handleAdminDeleteEvent = async (reg) => {
    if (!window.confirm(`Permanently delete the registration record for "${reg.event_title}"?`)) return;
    try {
      setUpdatingUid(reg.id);
      await deleteEventRegistration(reg.id);
      if (onToast) onToast('Registration record deleted.', 'info');
    } catch (err) {
      console.error('Delete event error:', err);
      if (onToast) onToast('Failed to delete event registration: ' + err.message, 'error');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Toggle ID card verification status
  const handleToggleIdCardVerification = async (user) => {
    try {
      setUpdatingUid(user.uid);
      const newStatus = !user.idVerified;
      const updates = {
        verified: newStatus,
        idVerified: newStatus,
        idVerifiedAt: newStatus ? serverTimestamp() : null,
        idVerifiedBy: newStatus ? (adminUser?.email || 'admin') : null
      };

      if (user.rawUserDoc) {
        await updateDoc(doc(db, 'users', user.uid), updates);
      }
      if (user.rawRegDoc?.id) {
        await updateDoc(doc(db, 'registrations', user.rawRegDoc.id), {
          idCardVerified: newStatus,
          idVerifiedAt: newStatus ? serverTimestamp() : null
        });
      }

      if (onToast) onToast(newStatus ? `Verified ID card for ${user.name}` : `Unverified ID card for ${user.name}`, 'success');
      if (selectedUserModal?.uid === user.uid) {
        setSelectedUserModal((prev) => ({ ...prev, idVerified: newStatus }));
      }
    } catch (err) {
      console.error('Verify ID card error:', err);
      if (onToast) onToast('Failed to toggle verification: ' + err.message, 'error');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Approve Category (Internal vs External)
  const handleApproveCategory = async (user) => {
    try {
      setUpdatingUid(user.uid);
      const updates = {
        categoryVerificationStatus: 'VERIFIED',
        categoryVerifiedAt: serverTimestamp(),
        categoryVerifiedBy: adminUser?.email || 'admin'
      };

      if (user.rawRegDoc?.id) {
        await updateDoc(doc(db, 'registrations', user.rawRegDoc.id), updates);
      }
      if (user.rawUserDoc) {
        await updateDoc(doc(db, 'users', user.uid), updates);
      }

      if (onToast) onToast(`Approved ${user.category} category for ${user.name}`, 'success');
      if (selectedUserModal?.uid === user.uid) {
        setSelectedUserModal((prev) => ({ ...prev, categoryVerificationStatus: 'VERIFIED' }));
      }
    } catch (err) {
      console.error('Approve category error:', err);
      if (onToast) onToast('Failed to approve category: ' + err.message, 'error');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Generate / Assign Samyak ID for unenrolled user
  const handleGenerateSamyakId = async (user) => {
    try {
      setUpdatingUid(user.uid);
      const generatedId = `SMYK-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const updates = {
        samyakId: generatedId,
        registrationId: generatedId,
        registrationStatus: 'REGISTERED',
        enrolledAt: serverTimestamp(),
        enrolledByAdmin: adminUser?.email || 'admin'
      };

      // 1. Update in 'users'
      if (user.rawUserDoc) {
        await updateDoc(doc(db, 'users', user.uid), updates);
      }

      // 2. Upsert in 'registrations'
      const regRef = doc(db, 'registrations', generatedId);
      await setDoc(regRef, {
        registrationId: generatedId,
        uid: user.uid,
        name: user.name || 'SAMYAK Attendee',
        email: user.email || '',
        studentId: user.studentId || user.rollNo || '',
        mobile: user.mobile || user.phone || '',
        college: user.college || user.university || 'KL University',
        branch: user.branch || '',
        category: user.category || (user.isInternal ? 'INTERNAL' : 'EXTERNAL'),
        categoryVerificationStatus: user.categoryVerificationStatus || 'VERIFIED',
        registrationStatus: 'REGISTERED',
        payment: user.payment || {
          status: 'PENDING_PAYMENT',
          amount: FEST_FEE,
          currency: 'INR'
        },
        gatePass: {
          status: 'NOT_ISSUED',
          token: null
        },
        createdAt: serverTimestamp()
      }, { merge: true });

      if (onToast) onToast(`Generated Samyak ID: ${generatedId} for ${user.name}`, 'success');
      if (selectedUserModal?.uid === user.uid) {
        setSelectedUserModal((prev) => ({ 
          ...prev, 
          samyakId: generatedId, 
          hasSamyakId: true,
          registrationStatus: 'REGISTERED' 
        }));
      }
    } catch (err) {
      console.error('Assign Samyak ID error:', err);
      if (onToast) onToast('Failed to assign Samyak ID: ' + err.message, 'error');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Quick Action: Approve Payment & Issue Gate Pass
  const handleApprovePaymentAndIssuePass = async (user) => {
    try {
      setUpdatingUid(user.uid);
      const isKlu = isKlUniversityStudent(user);
      const regId = user.samyakId || user.studentId || user.uid;
      const res = await issueGatePassForRegistration({
        registrationId: regId,
        paymentId: user.paymentId || user.payment?.id || user.uid,
        adminId: adminUser?.email || 'admin',
        attendeeData: {
          ...user,
          university: user.college || user.university || (isKlu ? 'KL University' : 'External College'),
          category: isKlu ? 'INTERNAL' : (user.category || 'EXTERNAL'),
        }
      });

      if (res.success) {
        if (onToast) {
          const msg = isKlu
            ? `Payment verified for ${user.name}! (KL University student — Gate pass not required, direct ID card entry)`
            : `Payment verified & Gate Pass issued for ${user.name}! Token: ${res.gatePassToken || 'Active'}`;
          onToast(msg, 'success');
        }
        if (selectedUserModal?.uid === user.uid) {
          setSelectedUserModal((prev) => ({
            ...prev,
            paymentStatus: 'VERIFIED',
            gatePassStatus: isKlu ? 'NOT_REQUIRED' : (res.gatePassStatus || 'ISSUED'),
            gatePassToken: isKlu ? null : (res.gatePassToken || null)
          }));
        }
      } else {
        if (onToast) onToast('Failed to verify payment: ' + (res.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error('Approve payment error:', err);
      if (onToast) onToast('Error verifying payment: ' + err.message, 'error');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Toggle check-in attendance
  const handleToggleCheckIn = async (user) => {
    try {
      setUpdatingUid(user.uid);
      const newStatus = !user.checkedIn;
      
      // Update in registrations if exists
      if (user.rawRegDoc?.id) {
        await updateDoc(doc(db, 'registrations', user.rawRegDoc.id), {
          'gatePass.checkedIn': newStatus,
          'gatePass.checkedInAt': newStatus ? serverTimestamp() : null,
          'attendance.status': newStatus ? 'PRESENT' : 'ABSENT',
          'attendance.timestamp': newStatus ? serverTimestamp() : null
        });
      }

      // Update in student_registrations if exists
      if (user.rawStRegDoc?.id) {
        await updateDoc(doc(db, 'student_registrations', user.rawStRegDoc.id), {
          attended: newStatus,
          checkedInAt: newStatus ? serverTimestamp() : null
        });
      }

      if (onToast) onToast(newStatus ? `Checked in: ${user.name}` : `Check-in undone for: ${user.name}`, 'success');
      if (selectedUserModal?.uid === user.uid) {
        setSelectedUserModal((prev) => ({ ...prev, checkedIn: newStatus }));
      }
    } catch (err) {
      console.error('Check-in error:', err);
      if (onToast) onToast('Failed to toggle check-in: ' + err.message, 'error');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await exportUsersToExcel({
        users: filteredUsers,
        filterName: searchQuery ? `SEARCH_${searchQuery}` : `${enrollmentFilter}_${categoryFilter}`,
        adminUser,
        adminRole
      });
      if (onToast) onToast(`Exported ${filteredUsers.length} user records to Excel!`, 'success');
    } catch (err) {
      console.error('Export error:', err);
      if (onToast) onToast('Export failed: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-neutral-900/90 via-neutral-900/50 to-neutral-950 p-6 rounded-2xl border border-neutral-800 shadow-xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight flex items-center gap-3">
                TOTAL USERS <span className="text-red-500 text-glow-red">DIRECTORY</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-mono font-normal">
                  LIVE REGISTRY
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 font-cyber mt-0.5">
                Verify student credentials, search by Samyak ID, Roll Number, Name, verify college ID cards, payments & entry gate passes.
              </p>
            </div>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={exporting || filteredUsers.length === 0}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-white text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md hover:border-red-500/50 disabled:opacity-50 cursor-pointer"
            title="Download full filtered user records as genuine .xlsx"
          >
            <Download className="w-4 h-4 text-red-400" />
            {exporting ? 'Exporting...' : `Export Excel (${filteredUsers.length})`}
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Total Users</span>
          <span className="text-2xl font-black text-white mt-1 font-mono">{stats.total}</span>
          <span className="text-[10px] text-neutral-500 font-cyber mt-1">Across all databases</span>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-red-900/30 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-red-400">Samyak IDs</span>
          <span className="text-2xl font-black text-red-400 mt-1 font-mono">{stats.enrolled}</span>
          <span className="text-[10px] text-red-500/70 font-cyber mt-1">Fest enrolled</span>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Internal KLU</span>
          <span className="text-2xl font-black text-sky-400 mt-1 font-mono">{stats.internal}</span>
          <span className="text-[10px] text-neutral-500 font-cyber mt-1">KL Students</span>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">External</span>
          <span className="text-2xl font-black text-amber-400 mt-1 font-mono">{stats.external}</span>
          <span className="text-[10px] text-neutral-500 font-cyber mt-1">Other Colleges</span>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">ID Cards</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 font-mono">{stats.withIdCard}</span>
          <span className="text-[10px] text-emerald-500/70 font-cyber mt-1">{stats.idVerified} verified</span>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Payments Paid</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 font-mono">{stats.paidVerified}</span>
          <span className="text-[10px] text-neutral-500 font-cyber mt-1">Approved passes</span>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Checked In</span>
          <span className="text-2xl font-black text-purple-400 mt-1 font-mono">{stats.checkedIn}</span>
          <span className="text-[10px] text-neutral-500 font-cyber mt-1">At campus gate</span>
        </div>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        {/* Row 1: Search Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, ID / roll number, Samyak ID (SMYK-2026-...), email, phone, college, branch, UTR..."
              className="w-full pl-11 pr-10 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-xs sm:text-sm font-cyber focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/80 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs font-mono focus:outline-none focus:border-red-500/80 cursor-pointer"
            >
              <option value="RECENT">Sort: Newest First</option>
              <option value="NAME">Sort: Name (A-Z)</option>
              <option value="SAMYAK_ID">Sort: Samyak ID</option>
              <option value="ROLL_NO">Sort: Roll / ID No</option>
            </select>
          </div>
        </div>

        {/* Row 2: Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-neutral-500 text-[11px] uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          {/* Enrollment */}
          <div className="flex items-center bg-neutral-950 rounded-lg p-0.5 border border-neutral-800">
            <button
              onClick={() => setEnrollmentFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${enrollmentFilter === 'ALL' ? 'bg-red-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              All Users ({consolidatedUsers.length})
            </button>
            <button
              onClick={() => setEnrollmentFilter('ENROLLED')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${enrollmentFilter === 'ENROLLED' ? 'bg-red-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              Samyak ID ({stats.enrolled})
            </button>
            <button
              onClick={() => setEnrollmentFilter('UNENROLLED')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${enrollmentFilter === 'UNENROLLED' ? 'bg-red-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              Unenrolled ({stats.total - stats.enrolled})
            </button>
          </div>

          {/* Category */}
          <div className="flex items-center bg-neutral-950 rounded-lg p-0.5 border border-neutral-800">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${categoryFilter === 'ALL' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              All Types
            </button>
            <button
              onClick={() => setCategoryFilter('INTERNAL')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${categoryFilter === 'INTERNAL' ? 'bg-sky-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              KLU Internal ({stats.internal})
            </button>
            <button
              onClick={() => setCategoryFilter('EXTERNAL')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${categoryFilter === 'EXTERNAL' ? 'bg-amber-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              External ({stats.external})
            </button>
          </div>

          {/* Payment */}
          <div className="flex items-center bg-neutral-950 rounded-lg p-0.5 border border-neutral-800">
            <button
              onClick={() => setPaymentFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${paymentFilter === 'ALL' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              All Payment
            </button>
            <button
              onClick={() => setPaymentFilter('VERIFIED')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${paymentFilter === 'VERIFIED' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              Paid ({stats.paidVerified})
            </button>
            <button
              onClick={() => setPaymentFilter('PENDING')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${paymentFilter === 'PENDING' ? 'bg-amber-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              Pending
            </button>
          </div>

          {/* ID Card */}
          <div className="flex items-center bg-neutral-950 rounded-lg p-0.5 border border-neutral-800">
            <button
              onClick={() => setIdCardFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${idCardFilter === 'ALL' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              All ID Cards
            </button>
            <button
              onClick={() => setIdCardFilter('UPLOADED')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${idCardFilter === 'UPLOADED' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              Uploaded ({stats.withIdCard})
            </button>
            <button
              onClick={() => setIdCardFilter('VERIFIED')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${idCardFilter === 'VERIFIED' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              Verified ({stats.idVerified})
            </button>
            <button
              onClick={() => setIdCardFilter('MISSING')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${idCardFilter === 'MISSING' ? 'bg-rose-900/60 text-rose-300 font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              Missing ID
            </button>
          </div>

          {/* Attendance */}
          <div className="flex items-center bg-neutral-950 rounded-lg p-0.5 border border-neutral-800">
            <button
              onClick={() => setAttendanceFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${attendanceFilter === 'ALL' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              All Check-in
            </button>
            <button
              onClick={() => setAttendanceFilter('CHECKED_IN')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${attendanceFilter === 'CHECKED_IN' ? 'bg-purple-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              Present ({stats.checkedIn})
            </button>
          </div>
        </div>

        {/* Match Count Indicator */}
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400 pt-1 border-t border-neutral-800/60">
          <span>
            Showing <strong className="text-white">{filteredUsers.length}</strong> of <strong className="text-neutral-300">{consolidatedUsers.length}</strong> users
            {searchQuery && <span> for &ldquo;<span className="text-red-400 font-bold">{searchQuery}</span>&rdquo;</span>}
          </span>
          {(searchQuery || enrollmentFilter !== 'ALL' || categoryFilter !== 'ALL' || paymentFilter !== 'ALL' || idCardFilter !== 'ALL' || attendanceFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setEnrollmentFilter('ALL');
                setCategoryFilter('ALL');
                setPaymentFilter('ALL');
                setIdCardFilter('ALL');
                setAttendanceFilter('ALL');
              }}
              className="text-red-400 hover:text-red-300 underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Users Table / List */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400 font-mono">
            <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
            <span>Loading user registry from Firestore...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center space-y-3 font-mono">
            <Users className="w-12 h-12 text-neutral-600 mx-auto" />
            <h3 className="text-lg text-white font-bold">No users match your criteria</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Try adjusting your search terms (check student name, ID number, or Samyak ID) or resetting the filter options.
            </p>
          </div>
        ) : (
          <div>
            {/* Mobile Cards List (Optimized for phone screens < 1024px) */}
            <div className="block lg:hidden divide-y divide-neutral-800/80">
              {filteredUsers.map((user) => {
                const isPaid = user.paymentStatus === 'VERIFIED' || user.paymentStatus === 'Completed' || user.paymentStatus === 'APPROVED';
                const isPending = user.paymentStatus === 'PENDING' || user.paymentStatus === 'PENDING_VERIFICATION' || user.paymentStatus === 'PAYMENT_SUBMITTED';

                return (
                  <div key={user.uid} className="p-4 space-y-3 bg-neutral-900/40 hover:bg-neutral-900/80 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.avatarUrl ? (
                          <img 
                            src={user.avatarUrl} 
                            alt={user.name} 
                            className="w-11 h-11 rounded-full object-cover border border-neutral-700 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 font-bold text-base shrink-0">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-white text-base truncate flex items-center gap-1.5 font-sans">
                            {user.name || 'Unnamed Student'}
                            {user.idVerified && (
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" title="College ID Verified" />
                            )}
                          </div>
                          <div className="text-xs text-neutral-400 truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-neutral-500 shrink-0" />
                            <span className="truncate">{user.email || 'No email provided'}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                        user.isInternal || user.category === 'INTERNAL'
                          ? 'bg-sky-950 text-sky-400 border border-sky-800' 
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {user.isInternal || user.category === 'INTERNAL' ? 'KLU' : 'EXTERNAL'}
                      </span>
                    </div>

                    {/* Quick Metadata Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                      {user.samyakId && (
                        <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/40 text-red-300 font-bold">
                          ID: {user.samyakId}
                        </span>
                      )}
                      {user.studentId && (
                        <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                          Roll: {user.studentId}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1 ${
                        isPaid
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : isPending
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-400' : isPending ? 'bg-amber-400' : 'bg-neutral-500'}`} />
                        {user.paymentStatus || 'UNPAID'}
                      </span>
                      {user.enrolledEventsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-500/40 text-red-300 font-bold">
                          {user.enrolledEventsCount} {user.enrolledEventsCount === 1 ? 'Event' : 'Events'}
                        </span>
                      )}
                    </div>

                    {/* Full-width Tap to Verify Details button */}
                    <button
                      onClick={() => handleInspectUser(user)}
                      className="w-full py-2.5 px-4 rounded-xl bg-red-600/15 hover:bg-red-600 active:bg-red-700 text-red-300 hover:text-white border border-red-500/40 text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <ShieldCheck className="w-4 h-4 text-red-400" />
                      <span>Verify Details</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= 1024px) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
              <thead className="bg-neutral-950/80 border-b border-neutral-800 text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">User & Contact</th>
                  <th className="py-3.5 px-4">Samyak ID</th>
                  <th className="py-3.5 px-4">ID Number / Roll</th>
                  <th className="py-3.5 px-4">College & Dept</th>
                  <th className="py-3.5 px-4">ID Card</th>
                  <th className="py-3.5 px-4">Status & Payment</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-mono">
                {filteredUsers.map((user) => {
                  const isPaid = user.paymentStatus === 'VERIFIED' || user.paymentStatus === 'Completed' || user.paymentStatus === 'APPROVED';
                  const isPending = user.paymentStatus === 'PENDING' || user.paymentStatus === 'PENDING_VERIFICATION' || user.paymentStatus === 'PAYMENT_SUBMITTED';

                  return (
                    <tr 
                      key={user.uid} 
                      className="hover:bg-neutral-800/40 transition-colors group"
                    >
                      {/* 1. User & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img 
                              src={user.avatarUrl} 
                              alt={user.name} 
                              className="w-9 h-9 rounded-full object-cover border border-neutral-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 font-bold flex-shrink-0">
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate flex items-center gap-1.5 font-sans">
                              {user.name || 'Unnamed Student'}
                              {user.idVerified && (
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" title="College ID Verified" />
                              )}
                            </div>

                            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 truncate">
                              <Mail className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                              <span className="truncate">{user.email || 'No email provided'}</span>
                            </div>

                            {user.mobile && (
                              <div className="text-[10px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                                <Phone className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />
                                <span>{user.mobile}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Samyak ID */}
                      <td className="py-3.5 px-4">
                        {user.samyakId ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 font-bold text-xs">
                            <span>{user.samyakId}</span>
                            <button
                              onClick={() => handleCopy(user.samyakId, `samyak_${user.uid}`)}
                              className="p-0.5 hover:text-white text-red-400 transition-colors cursor-pointer"
                              title="Copy Samyak ID"
                            >
                              {copiedKey === `samyak_${user.uid}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400 border border-neutral-700">
                            Not Enrolled
                          </span>
                        )}
                        {user.enrolledEventsCount > 0 && (
                          <div className="mt-1">
                            <span 
                              onClick={() => handleInspectUser(user)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-[10px] font-mono text-red-300 font-bold cursor-pointer transition-colors"
                              title="Click to inspect and manage registered events"
                            >
                              <Calendar className="w-2.5 h-2.5 text-red-400" />
                              <span>{user.enrolledEventsCount} {user.enrolledEventsCount === 1 ? 'Event' : 'Events'}</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. ID Number / Roll No */}
                      <td className="py-3.5 px-4">
                        {user.studentId ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-neutral-200">
                            <span className="font-bold text-slate-200">{user.studentId}</span>
                            <button
                              onClick={() => handleCopy(user.studentId, `roll_${user.uid}`)}
                              className="p-0.5 hover:text-white text-neutral-500 transition-colors cursor-pointer"
                              title="Copy ID Number"
                            >
                              {copiedKey === `roll_${user.uid}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-neutral-500 italic text-[11px]">Not provided</span>
                        )}
                      </td>

                      {/* 4. College & Dept */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[160px] truncate">
                          <div className="flex items-center gap-1 text-xs text-neutral-200 font-sans">
                            <School className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                            <span className="truncate">{user.college || 'KL University'}</span>
                          </div>
                          {user.branch && (
                            <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                              {user.branch}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. ID Card */}
                      <td className="py-3.5 px-4">
                        {user.idCardUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setIdCardModalUrl(user.idCardUrl)}
                              className="relative w-10 h-7 rounded border border-neutral-700 overflow-hidden group/img hover:border-red-500 transition-all flex-shrink-0 cursor-pointer shadow"
                              title="Click to view full college ID card"
                            >
                              <SecureImage 
                                src={user.idCardUrl} 
                                alt="ID Card" 
                                className="w-full h-full object-cover group-hover/img:scale-110 transition-transform" 
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center">
                                <Eye className="w-3 h-3 text-white" />
                              </div>
                            </button>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              user.idVerified 
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                            }`}>
                              {user.idVerified ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-rose-400 bg-rose-950/30 px-2 py-0.5 rounded border border-rose-900/40">
                            No ID Card
                          </span>
                        )}
                      </td>

                      {/* 6. Status & Payment */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {/* Category badge */}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            user.isInternal 
                              ? 'bg-sky-950/60 text-sky-300 border border-sky-800/40' 
                              : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                          }`}>
                            {user.isInternal ? 'KLU INTERNAL' : 'EXTERNAL'}
                          </span>

                          {/* Payment status badge */}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1 ${
                            isPaid
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : isPending
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-400' : isPending ? 'bg-amber-400 animate-pulse' : 'bg-neutral-500'}`} />
                            {user.paymentStatus || 'UNPAID'}
                          </span>

                          {/* Attendance if checked in */}
                          {user.checkedIn && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 font-bold">
                              ✓ CHECKED IN
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInspectUser(user)}
                            className="px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-600 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            title="Verify and check full details"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verify Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>

      {/* 5. Comprehensive Full-Screen User Verification Page (Opens like a dedicated page) */}
      <AnimatePresence>
        {currentInspectedUser && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-neutral-950 text-white overflow-y-auto overscroll-contain flex flex-col font-sans w-full h-[100dvh]"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Top Sticky Navigation Bar */}
            <div className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-xl shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={handleCloseInspect}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
                  title="Return to User Registry"
                >
                  <ArrowLeft className="w-4 h-4 text-red-500" />
                  <span className="hidden sm:inline">Back to User List</span>
                  <span className="sm:hidden">Back</span>
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-neutral-400 hidden md:inline">
                      Admin Console / Users /
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-white truncate font-sans">
                      {currentInspectedUser.name || 'Student Details'}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] sm:text-xs font-mono px-2.5 py-1 rounded-full font-bold uppercase ${
                  currentInspectedUser.isInternal || currentInspectedUser.category === 'INTERNAL'
                    ? 'bg-sky-950 text-sky-400 border border-sky-800' 
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}>
                  {currentInspectedUser.isInternal || currentInspectedUser.category === 'INTERNAL' ? 'KLU INTERNAL' : 'EXTERNAL'}
                </span>

                <button
                  onClick={handleCloseInspect}
                  className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 cursor-pointer transition-colors"
                  title="Close verification page"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Page Content */}
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-28 space-y-6 flex-1">
              
              {/* User Hero Banner */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-black border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-2xl">
                <div className="flex items-start sm:items-center gap-4">
                  {currentInspectedUser.avatarUrl ? (
                    <img 
                      src={currentInspectedUser.avatarUrl} 
                      alt={currentInspectedUser.name} 
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-red-500/50 shadow-lg shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shrink-0 shadow-lg">
                      {currentInspectedUser.name ? currentInspectedUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black text-white font-heading tracking-wide">
                        {currentInspectedUser.name || 'Student Attendee'}
                      </h1>
                      {currentInspectedUser.idVerified && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> ID Verified
                        </span>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm text-neutral-400 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
                      {currentInspectedUser.email && (
                        <a href={`mailto:${currentInspectedUser.email}`} className="text-neutral-300 hover:text-red-400 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{currentInspectedUser.email}</span>
                        </a>
                      )}
                      {currentInspectedUser.mobile && (
                        <a href={`tel:${currentInspectedUser.mobile}`} className="text-neutral-300 hover:text-red-400 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{currentInspectedUser.mobile}</span>
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                      {currentInspectedUser.samyakId && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 font-bold">
                          Samyak ID: {currentInspectedUser.samyakId}
                        </span>
                      )}
                      {currentInspectedUser.studentId && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-neutral-800 text-sky-300 border border-neutral-700 font-bold">
                          Roll: {currentInspectedUser.studentId}
                        </span>
                      )}
                      <span className="text-[11px] text-neutral-500 truncate">
                        UID: {currentInspectedUser.uid}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions in Hero */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 border-t border-neutral-800 md:border-t-0 pt-3 md:pt-0">
                  {currentInspectedUser.idCardUrl && (
                    <button
                      onClick={() => handleToggleIdCardVerification(currentInspectedUser)}
                      disabled={updatingUid === currentInspectedUser.uid}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                        currentInspectedUser.idVerified
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-emerald-950/50'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{currentInspectedUser.idVerified ? 'Undo ID Verification' : 'Approve College ID'}</span>
                    </button>
                  )}

                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveUserEdits}
                        disabled={updatingUid === currentInspectedUser.uid}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-mono text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 1. Quick Verification Overview Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono shadow-lg">
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Verification Overview &amp; Health</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* ID Card Verification Status */}
                    <span className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                      currentInspectedUser.idVerified 
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                        : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    }`}>
                      {currentInspectedUser.idVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      {currentInspectedUser.idVerified ? 'College ID Verified' : 'College ID Pending'}
                    </span>

                    {/* Category Verification Status */}
                    <span className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                      currentInspectedUser.categoryVerificationStatus === 'VERIFIED'
                        ? 'bg-sky-950/60 border-sky-500/40 text-sky-300'
                        : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    }`}>
                      Category: {currentInspectedUser.categoryVerificationStatus || 'PENDING'}
                    </span>

                    {/* Payment Status */}
                    <span className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                      currentInspectedUser.paymentStatus === 'VERIFIED'
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                    }`}>
                      Payment: {currentInspectedUser.paymentStatus || 'UNPAID'}
                    </span>
                  </div>
                </div>

                {/* Quick Toggle Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {currentInspectedUser.categoryVerificationStatus !== 'VERIFIED' && (
                    <button
                      onClick={() => handleApproveCategory(currentInspectedUser)}
                      disabled={updatingUid === currentInspectedUser.uid}
                      className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white border border-sky-500 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Category
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Grid: Academic/Personal Info + ID Card Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Column: Academic Credentials & Edit Mode */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                    <h4 className="font-bold text-white text-sm uppercase font-mono tracking-wider flex items-center gap-2">
                      <School className="w-4 h-4 text-red-500" />
                      Academic &amp; Contact Info
                    </h4>

                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <button
                          onClick={handleSaveUserEdits}
                          disabled={updatingUid === currentInspectedUser.uid}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="space-y-3.5 text-xs sm:text-sm font-mono">
                      <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Student Name:</span>
                        <span className="text-white font-bold text-right">{currentInspectedUser.name || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Student ID / Roll No:</span>
                        <span className="text-sky-400 font-bold text-right">{currentInspectedUser.studentId || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Email Address:</span>
                        <span className="text-white text-right break-all">{currentInspectedUser.email || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Mobile Number:</span>
                        <span className="text-white font-bold text-right flex items-center gap-2">
                          {currentInspectedUser.mobile || 'N/A'}
                          {currentInspectedUser.mobile && (
                            <a
                              href={`tel:${currentInspectedUser.mobile}`}
                              className="text-red-400 hover:underline"
                              title="Call attendee"
                            >
                              📞
                            </a>
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                        <span className="text-neutral-400">College / University:</span>
                        <span className="text-white font-bold text-right">{currentInspectedUser.college || 'KL University'}</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Branch / Department:</span>
                        <span className="text-white text-right">{currentInspectedUser.branch || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-neutral-400">Participant Category:</span>
                        <span className={`font-bold ${currentInspectedUser.isInternal ? 'text-sky-400' : 'text-amber-400'}`}>
                          {currentInspectedUser.category || (currentInspectedUser.isInternal ? 'INTERNAL' : 'EXTERNAL')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Edit Form */
                    <div className="space-y-3.5 font-mono text-xs sm:text-sm">
                      <div>
                        <label className="text-neutral-400 text-xs uppercase block mb-1">Full Name</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-sm sm:text-base focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-400 text-xs uppercase block mb-1">Student ID / Roll No</label>
                        <input
                          type="text"
                          value={editForm.studentId}
                          onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-sm sm:text-base focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-400 text-xs uppercase block mb-1">Mobile Phone</label>
                        <input
                          type="text"
                          value={editForm.mobile}
                          onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-sm sm:text-base focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-400 text-xs uppercase block mb-1">College / University</label>
                        <input
                          type="text"
                          value={editForm.college}
                          onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-sm sm:text-base focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-400 text-xs uppercase block mb-1">Branch / Dept</label>
                        <input
                          type="text"
                          value={editForm.branch}
                          onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-sm sm:text-base focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-400 text-xs uppercase block mb-1">Category</label>
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-sm sm:text-base focus:outline-none focus:border-red-500 cursor-pointer"
                        >
                          <option value="INTERNAL">INTERNAL (KLU)</option>
                          <option value="EXTERNAL">EXTERNAL (Other Universities)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: College ID Card Inspection */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 flex flex-col shadow-xl">
                  <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                    <h4 className="font-bold text-white text-sm uppercase font-mono tracking-wider flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-red-500" />
                      Uploaded College ID Card
                    </h4>

                    {currentInspectedUser.idCardUrl && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setImgZoom((z) => Math.max(0.8, z - 0.2))}
                          className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
                          title="Zoom out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setImgZoom((z) => Math.min(2.5, z + 0.2))}
                          className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
                          title="Zoom in"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setImgRotate((r) => (r + 90) % 360)}
                          className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
                          title="Rotate 90deg"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <a
                          href={currentInspectedUser.idCardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
                          title="Open original high-res image in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>

                  {currentInspectedUser.idCardUrl ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-black/70 rounded-xl p-3 border border-neutral-800/80 overflow-hidden min-h-[260px]">
                      <SecureImage 
                        src={currentInspectedUser.idCardUrl} 
                        alt="ID Card Proof" 
                        style={{
                          transform: `scale(${imgZoom}) rotate(${imgRotate}deg)`,
                          transition: 'transform 0.2s ease-out'
                        }}
                        className="max-h-[300px] max-w-full object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950/40 rounded-xl p-8 border border-dashed border-neutral-800 min-h-[260px] text-center space-y-2">
                      <CreditCard className="w-12 h-12 text-neutral-600" />
                      <span className="text-sm text-neutral-400 font-mono">No college ID card has been uploaded.</span>
                      <span className="text-xs text-neutral-500">Student can upload their ID card from profile.</span>
                    </div>
                  )}

                  {currentInspectedUser.idCardUrl && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono pt-2">
                      <span className="text-neutral-400 text-xs">
                        Status: <strong className={currentInspectedUser.idVerified ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {currentInspectedUser.idVerified ? 'Verified & Authenticated' : 'Pending Verification'}
                        </strong>
                      </span>

                      <button
                        onClick={() => handleToggleIdCardVerification(currentInspectedUser)}
                        disabled={updatingUid === currentInspectedUser.uid}
                        className={`w-full sm:w-auto px-4 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm ${
                          currentInspectedUser.idVerified
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {currentInspectedUser.idVerified ? 'Undo ID Verification' : 'Approve College ID'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. SAMYAK Fest & Pass Details Section */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                <h4 className="font-bold text-white text-sm uppercase font-mono tracking-wider flex items-center gap-2 border-b border-neutral-800/80 pb-3">
                  <Sparkles className="w-4 h-4 text-red-500" />
                  SAMYAK Fest Lifecycle &amp; Gate Pass
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Block A: Samyak ID */}
                  <div className="p-4 sm:p-5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 block">Samyak ID / Registration</span>
                    {currentInspectedUser.samyakId ? (
                      <div className="flex items-center justify-between">
                        <span className="text-lg sm:text-xl font-black text-red-400 font-mono tracking-tight">
                          {currentInspectedUser.samyakId}
                        </span>
                        <button
                          onClick={() => handleCopy(currentInspectedUser.samyakId, 'modal_samyak')}
                          className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-800 hover:bg-neutral-700"
                        >
                          {copiedKey === 'modal_samyak' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-xs text-neutral-500 block">Not enrolled in fest</span>
                        <button
                          onClick={() => handleGenerateSamyakId(currentInspectedUser)}
                          disabled={updatingUid === currentInspectedUser.uid}
                          className="w-full px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate Samyak ID
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Block B: Payment & Fee */}
                  <div className="p-4 sm:p-5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 block">Payment &amp; Fee Status</span>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold font-mono px-2.5 py-1 rounded-lg border ${
                        currentInspectedUser.paymentStatus === 'VERIFIED'
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}>
                        {currentInspectedUser.paymentStatus || 'UNPAID'}
                      </span>

                      {currentInspectedUser.payment?.amount && (
                        <span className="text-sm font-mono text-neutral-300 font-bold">
                          ₹{currentInspectedUser.payment.amount}
                        </span>
                      )}
                    </div>

                    {currentInspectedUser.utrId && (
                      <div className="text-xs font-mono text-neutral-400 flex items-center justify-between">
                        <span>UTR: <strong className="text-white">{currentInspectedUser.utrId}</strong></span>
                        <button
                          onClick={() => handleCopy(currentInspectedUser.utrId, 'modal_utr')}
                          className="p-1 text-neutral-400 hover:text-white"
                        >
                          {copiedKey === 'modal_utr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}

                    {/* Payment verification button */}
                    {currentInspectedUser.paymentStatus !== 'VERIFIED' && (
                      <button
                        onClick={() => handleApprovePaymentAndIssuePass(currentInspectedUser)}
                        disabled={updatingUid === currentInspectedUser.uid}
                        className="w-full mt-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isKlUniversityStudent(currentInspectedUser)
                          ? 'Approve Payment (KLU Student - No Pass)'
                          : 'Approve Payment & Issue Pass'}
                      </button>
                    )}
                  </div>

                  {/* Block C: Gate Pass & Check-In */}
                  <div className="p-4 sm:p-5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 block">Gate Pass &amp; Campus Check-in</span>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                        isKlUniversityStudent(currentInspectedUser)
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : currentInspectedUser.gatePassStatus === 'ISSUED'
                          ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                          : currentInspectedUser.gatePassStatus === 'USED'
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                      }`}>
                        {isKlUniversityStudent(currentInspectedUser)
                          ? 'NOT_REQUIRED (KLU ID)'
                          : (currentInspectedUser.gatePassStatus || 'NOT_ISSUED')}
                      </span>

                      <button
                        onClick={() => handleToggleCheckIn(currentInspectedUser)}
                        disabled={updatingUid === currentInspectedUser.uid}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          currentInspectedUser.checkedIn
                            ? 'bg-purple-900/40 text-purple-300 border border-purple-500/40 hover:bg-purple-900/80'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                        }`}
                      >
                        {currentInspectedUser.checkedIn ? '✓ Attended' : 'Mark Present'}
                      </button>
                    </div>

                    {isKlUniversityStudent(currentInspectedUser) ? (
                      <p className="text-[10px] text-emerald-400/80 font-mono mt-1">
                        🎓 KLU Student — Entry verified with physical ID card.
                      </p>
                    ) : currentInspectedUser.gatePassToken ? (
                      <div className="text-[10px] font-mono text-neutral-500 truncate">
                        Token: <span className="text-neutral-300">{currentInspectedUser.gatePassToken}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* 4. EVENT REGISTRATIONS & MANAGEMENT (Audio 1 & 2 requirements) */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-base uppercase font-mono tracking-wider flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-red-500" />
                      Enrolled Competitions &amp; Events ({currentUserEvents.length})
                    </h4>
                    <p className="text-xs font-mono text-neutral-400 mt-0.5">
                      Cancel registrations to immediately restore event seats and free student time-slots.
                    </p>
                  </div>
                </div>

                {currentUserEvents.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-neutral-950/40 border border-dashed border-neutral-800 text-center space-y-1.5">
                    <Calendar className="w-10 h-10 text-neutral-600 mx-auto" />
                    <p className="text-sm font-mono text-neutral-300 font-bold">No registered competitions found for this student.</p>
                    <p className="text-xs font-mono text-neutral-500">When the student registers for competitions, they will appear here with live seat cancellation and status controls.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {currentUserEvents.map((evReg) => {
                      const isRegCancelled = (evReg.status || '').toLowerCase() === 'cancelled' || evReg.isCancelled === true;
                      return (
                        <div 
                          key={evReg.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            isRegCancelled
                              ? 'bg-red-950/20 border-red-500/30 opacity-75'
                              : 'bg-neutral-950/70 border-neutral-800 shadow-md'
                          }`}
                        >
                          <div className="space-y-2 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-heading font-black text-base sm:text-lg text-white">
                                {evReg.event_title || 'SAMYAK Event'}
                              </span>
                              {isRegCancelled ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-red-950 border border-red-500/60 text-red-400 text-xs font-mono font-bold uppercase flex items-center gap-1">
                                  <Ban className="w-3.5 h-3.5" /> CANCELLED
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-400 text-xs font-mono font-bold uppercase flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE / ENROLLED
                                </span>
                              )}
                              {evReg.attendance && (
                                <span className="px-2.5 py-0.5 rounded-full bg-purple-950 border border-purple-500/60 text-purple-300 text-xs font-mono font-bold uppercase">
                                  Gate Checked-In
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-mono text-neutral-400">
                              {evReg.ticket_code && (
                                <span className="text-red-400 font-bold bg-black/60 px-2.5 py-1 rounded-lg border border-red-500/30 flex items-center gap-1.5">
                                  <Ticket className="w-3.5 h-3.5 text-red-400" />
                                  <span>Pass: {evReg.ticket_code}</span>
                                </span>
                              )}
                              {(evReg.event_date || evReg.event_time) && (
                                <span className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
                                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                  <span>{evReg.event_date} {evReg.event_time}</span>
                                </span>
                              )}
                              {evReg.event_venue && (
                                <span className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
                                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                                  <span>{evReg.event_venue}</span>
                                </span>
                              )}
                            </div>

                            {isRegCancelled && evReg.cancellation_reason && (
                              <p className="text-xs font-mono text-red-300 bg-red-950/40 p-2 rounded-lg border border-red-500/20">
                                Cancellation reason: {evReg.cancellation_reason}
                              </p>
                            )}
                          </div>

                          {/* Admin Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0 border-t border-neutral-800/80 md:border-t-0 pt-3 md:pt-0">
                            {!isRegCancelled ? (
                              <button
                                type="button"
                                onClick={() => handleAdminCancelEvent(evReg)}
                                disabled={updatingUid === evReg.id}
                                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                title="Cancel this registration to free up the seat and allow student to register again"
                              >
                                <Ban className="w-4 h-4" />
                                <span>Cancel Registration</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAdminReactivateEvent(evReg)}
                                disabled={updatingUid === evReg.id}
                                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                title="Restore registration to active"
                              >
                                <RotateCw className="w-4 h-4" />
                                <span>Restore Active</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAdminDeleteEvent(evReg)}
                              disabled={updatingUid === evReg.id}
                              className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 border border-neutral-800 transition-colors cursor-pointer"
                              title="Delete record permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Sticky Mobile Bottom Navigation Bar */}
            <div className="block sm:hidden sticky bottom-0 z-40 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 p-3 shadow-2xl">
              <button
                onClick={handleCloseInspect}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-mono font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-900/40"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to All Users</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Standalone Fullscreen ID Card Lightbox Modal */}
      <AnimatePresence>
        {idCardModalUrl && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
            onClick={() => setIdCardModalUrl(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-3xl max-h-[85vh] bg-neutral-900 border border-neutral-700 rounded-2xl p-3 shadow-2xl flex flex-col cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 px-2 border-b border-neutral-800 text-xs font-mono text-neutral-300">
                <span className="font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-red-500" />
                  College ID Card Scan
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={idCardModalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    title="Open original"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setIdCardModalUrl(null)}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 flex items-center justify-center overflow-auto max-h-[75vh]">
                <SecureImage 
                  src={idCardModalUrl} 
                  alt="Student College ID" 
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
