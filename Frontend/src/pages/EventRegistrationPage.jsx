import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Sparkles, CheckCircle2, AlertCircle, Copy, Check, 
  Download, QrCode, Calendar, Clock, MapPin, User, Mail, 
  Phone, Hash, School, Award, ArrowRight, Loader2, Info,
  Lock, ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink
} from 'lucide-react';
import { useUser } from '../data/useUser';
import { useSiteContent } from '../context/SiteContentContext';
import { EVENTS_DATA } from '../data/events';
import { 
  registerStudentForEvent, 
  checkStudentAlreadyRegistered, 
  checkUserIsAdminVerified,
  getUserRegistrations,
  checkUserTimeSlotConflictSync
} from '../services/eventRegistrationService';

const BRANCH_OPTIONS = [
  'Computer Science & Engineering (CSE)',
  'Artificial Intelligence & Data Science (AIDS)',
  'Electronics & Communication Engineering (ECE)',
  'Mechanical Engineering (MECH)',
  'Civil Engineering (CIVIL)',
  'Bio-Technology (BIOTECH)',
  'School of Business Management (MBA)',
  'Computer Applications & Software (BCA)',
  'Other / External University'
];

const YEAR_OPTIONS = [
  '1st Year (B.Tech / Degree)',
  '2nd Year (B.Tech / Degree)',
  '3rd Year (B.Tech / Degree)',
  '4th Year (B.Tech / Degree)',
  'Postgraduate (M.Tech / MBA / MCA / PhD)'
];

export default function EventRegistrationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData, currentUser, authLoading, loginWithGoogle } = useUser();
  const { events: siteEvents } = useSiteContent();

  // Combine site content events with static catalog
  const allEvents = useMemo(() => {
    const raw = siteEvents && siteEvents.length > 0 ? siteEvents : EVENTS_DATA;
    return raw.filter(Boolean);
  }, [siteEvents]);

  // Find target event by id or slug
  const event = useMemo(() => {
    if (!id) return null;
    const cleanId = id.toLowerCase().trim();
    return allEvents.find(
      (e) => (e.id && e.id.toLowerCase() === cleanId) ||
             (e.title && e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanId)
    );
  }, [allEvents, id]);

  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    universityId: '',
    phone: '',
    branch: BRANCH_OPTIONS[0],
    year: YEAR_OPTIONS[2], // default 3rd year
    section: '',
    gender: 'Prefer not to say',
    accommodation: 'no',
  });

  const [prefilledNotice, setPrefilledNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedTicket, setConfirmedTicket] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [checkingTicket, setCheckingTicket] = useState(true);
  const [verifiedByAdminState, setVerifiedByAdminState] = useState(false);
  const [checkingAdminVerification, setCheckingAdminVerification] = useState(true);

  // Time-conflict tracking
  const [conflictWarning, setConflictWarning] = useState(null);

  // Determine admin verification status from userData and Firestore check
  const isVerifiedLocally = Boolean(
    userData?.isVerifiedByAdmin ||
    userData?.paymentStatus === 'VERIFIED' ||
    userData?.payment?.status === 'VERIFIED' ||
    userData?.payment?.status === 'verified' ||
    userData?.verified ||
    userData?.idVerified ||
    userData?.adminVerified ||
    userData?.gatePassStatus === 'ISSUED' ||
    userData?.gatePassStatus === 'verified' ||
    userData?.gatePassStatus === 'NOT_REQUIRED' ||
    userData?.categoryVerificationStatus === 'VERIFIED'
  );

  useEffect(() => {
    let isMounted = true;
    async function checkVerification() {
      if (!currentUser?.uid) {
        if (isMounted) {
          setVerifiedByAdminState(false);
          setCheckingAdminVerification(false);
        }
        return;
      }
      if (isVerifiedLocally) {
        if (isMounted) {
          setVerifiedByAdminState(true);
          setCheckingAdminVerification(false);
        }
        return;
      }
      try {
        const verified = await checkUserIsAdminVerified(currentUser.uid);
        if (isMounted) {
          setVerifiedByAdminState(verified);
          setCheckingAdminVerification(false);
        }
      } catch (e) {
        if (isMounted) {
          setVerifiedByAdminState(isVerifiedLocally);
          setCheckingAdminVerification(false);
        }
      }
    }
    checkVerification();
    return () => { isMounted = false; };
  }, [currentUser?.uid, isVerifiedLocally]);

  const isUserAdminVerified = isVerifiedLocally || verifiedByAdminState;

  // Check if student is already registered for this event
  useEffect(() => {
    let isMounted = true;
    async function checkExisting() {
      if (!event?.id || !currentUser?.uid) {
        if (isMounted) {
          setCheckingTicket(false);
        }
        return;
      }
      try {
        setCheckingTicket(true);
        const existing = await checkStudentAlreadyRegistered(event.id);
        if (isMounted) {
          if (existing && existing.status !== 'cancelled' && !existing.isCancelled) {
            setConfirmedTicket(existing);
          } else {
            setConfirmedTicket(null);
          }
        }
      } catch (err) {
        console.warn('Error checking existing ticket:', err);
      } finally {
        if (isMounted) setCheckingTicket(false);
      }
    }
    checkExisting();
    return () => { isMounted = false; };
  }, [event?.id, currentUser?.uid]);

  // Check time-slot conflicts with other registered events
  useEffect(() => {
    let isMounted = true;
    async function checkConflicts() {
      if (!event || !currentUser?.uid || confirmedTicket) {
        setConflictWarning(null);
        return;
      }
      try {
        const userRegs = await getUserRegistrations(currentUser.uid);
        if (!isMounted) return;
        const conflict = checkUserTimeSlotConflictSync(
          { id: event.id, date: event.date, time: event.time },
          userRegs,
          allEvents
        );
        if (conflict.hasConflict) {
          setConflictWarning(conflict.conflictingEvent);
        } else {
          setConflictWarning(null);
        }
      } catch (err) {
        console.warn('Conflict check note:', err);
      }
    }
    checkConflicts();
    return () => { isMounted = false; };
  }, [event, currentUser?.uid, allEvents, confirmedTicket]);

  // Pre-fill profile data
  useEffect(() => {
    if (userData && !confirmedTicket) {
      setFormData((prev) => ({
        ...prev,
        studentName: userData.name || currentUser?.displayName || prev.studentName,
        email: userData.email || currentUser?.email || prev.email,
        universityId: userData.studentId || userData.rollNo || prev.universityId,
        phone: userData.mobile || userData.phone || prev.phone,
        branch: userData.branch || prev.branch,
        year: userData.year || prev.year,
      }));
      if (userData.name || userData.studentId) {
        setPrefilledNotice(true);
      }
    }
  }, [userData, currentUser, confirmedTicket]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const copyTicketCode = () => {
    if (!confirmedTicket?.ticket_code) return;
    navigator.clipboard.writeText(confirmedTicket.ticket_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser) {
      try {
        await loginWithGoogle();
      } catch (err) {
        setErrorMessage('Google Sign-In is required to register.');
        return;
      }
    }

    if (!isUserAdminVerified) {
      setErrorMessage(
        'Event registration is locked. You must be registered and verified by the SAMYAK admin committee to enroll in events.'
      );
      return;
    }

    // Form Validations
    if (!formData.studentName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!formData.universityId.trim()) {
      setErrorMessage('Please enter your College / University ID (Roll No).');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await registerStudentForEvent({
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date || 'TBA',
        eventTime: event.time || 'TBA',
        eventVenue: event.venue || 'Main Arena',
        studentName: formData.studentName,
        email: formData.email,
        universityId: formData.universityId,
        phone: formData.phone,
        branch: formData.branch,
        year: formData.year,
        section: formData.section,
        gender: formData.gender,
        accommodation: formData.accommodation,
        allEvents: allEvents,
      });

      setConfirmedTicket(res.registration);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Event registration submission error:', err);
      if (err.code === 'ALREADY_REGISTERED' && err.existingRegistration) {
        setConfirmedTicket(err.existingRegistration);
      } else {
        setErrorMessage(err.message || 'Registration failed. Please check requirements.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // If event not found
  if (!event) {
    return (
      <div className="pt-28 pb-20 min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
        <div className="p-8 max-w-md w-full rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold font-heading text-white">Event Not Found</h2>
          <p className="text-xs font-mono text-neutral-400">
            The event you are attempting to register for could not be located or has been archived.
          </p>
          <Link
            to="/events"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-heading font-black text-xs uppercase tracking-wider transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Browse All Events</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 sm:pt-28 pb-20 min-h-screen bg-black text-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">

        {/* Top Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to={`/events/${event.id}`}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-red-400" />
            <span>Back to Event Details</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-[10px] font-mono text-red-400 uppercase tracking-widest font-bold">
            <Sparkles className="w-3 h-3 text-red-400" />
            Official Registration Portal
          </div>
        </div>

        {/* Hero Event Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-neutral-950 border border-neutral-800 relative overflow-hidden shadow-[0_0_50px_rgba(223,37,49,0.2)]">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-mono font-bold uppercase">
                  {event.category || 'Festival Event'}
                </span>
                {event.department && (
                  <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800 text-[10px] font-mono">
                    {event.department}
                  </span>
                )}
                {event.club && (
                  <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800 text-[10px] font-mono">
                    {event.club}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black font-heading text-white uppercase tracking-tight">
                {confirmedTicket ? (
                  <>DIGITAL PASS: <span className="text-red-500">{event.title}</span></>
                ) : (
                  <>REGISTER FOR <span className="text-red-500">{event.title}</span></>
                )}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-white">{event.date || 'TBA'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-white">{event.time || 'TBA'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-white">{event.venue || 'Main Arena'}</span>
                </div>
              </div>
            </div>

            {/* Quick pass or seat counter badge */}
            <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 md:border-l border-neutral-800 pt-4 md:pt-0 md:pl-6">
              <span className="text-[10px] font-mono uppercase text-neutral-500">Access Status</span>
              {confirmedTicket ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  SLOT SECURED
                </span>
              ) : isUserAdminVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  VERIFIED DELEGATE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  VERIFICATION PENDING
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Loading Spinner during initial ticket/verification check */}
        {checkingTicket && (
          <div className="p-8 rounded-3xl bg-neutral-950 border border-neutral-800 flex items-center justify-center gap-3 text-neutral-400 font-mono text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
            <span>Verifying your SAMYAK registration and tickets...</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW A: CONFIRMED TICKET PASS DISPLAY                             */}
        {/* ================================================================= */}
        {!checkingTicket && confirmedTicket && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-10 rounded-3xl bg-neutral-950 border-2 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)] space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold bg-emerald-950/60 px-3.5 py-1 rounded-full border border-emerald-500/40 inline-block">
                Confirmed Entry Pass
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
                YOU ARE ENROLLED IN THIS EVENT!
              </h2>
              <p className="text-xs text-neutral-400 font-cyber max-w-md mx-auto">
                Present this official digital ticket pass at the event check-in gate along with your physical Institute ID Card.
              </p>
            </div>

            {/* Official Digital Ticket Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-black border-2 border-red-500/70 shadow-[0_0_40px_rgba(223,37,49,0.35)] relative overflow-hidden space-y-5">
              <img 
                src="/samyak-logo-white.png" 
                alt="SAMYAK 2026" 
                className="absolute right-2 -bottom-6 w-44 h-auto opacity-10 pointer-events-none" 
              />

              {/* Pass Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-neutral-800 pb-4 gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-red-400 font-bold tracking-wider">SAMYAK 2026 EVENT PASS</span>
                  <h3 className="font-heading font-black text-xl sm:text-2xl text-white leading-tight">
                    {confirmedTicket.event_title || event.title}
                  </h3>
                  <p className="text-xs font-mono text-neutral-400 mt-0.5">
                    {event.department || 'KL University'} • {event.category || 'National Competition'}
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block">Unique Pass Code</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <code className="text-base font-mono font-black text-red-400 bg-red-950/70 px-3 py-1 rounded-xl border border-red-500/60 tracking-widest shadow-inner">
                      {confirmedTicket.ticket_code}
                    </code>
                    <button
                      type="button"
                      onClick={copyTicketCode}
                      className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Pass Code"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Attendee Details */}
              <div className="w-full space-y-3 text-xs font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-neutral-500 text-[10px] uppercase block">Registered Attendee</span>
                    <strong className="text-white text-sm sm:text-base font-bold">{confirmedTicket.student_name}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-[10px] uppercase block">College / University ID</span>
                    <span className="text-neutral-200 font-bold">{confirmedTicket.university_id}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-900">
                  <div>
                    <span className="text-neutral-500 text-[10px] uppercase block">Email Address</span>
                    <span className="text-neutral-300 text-[11px] truncate block">{confirmedTicket.email}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-[10px] uppercase block">Contact Phone</span>
                    <span className="text-neutral-300 text-[11px]">{confirmedTicket.phone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-900">
                  <span className="text-neutral-500 text-[10px] uppercase block">Branch &amp; Year</span>
                  <span className="text-neutral-200">{confirmedTicket.branch} ({confirmedTicket.year})</span>
                </div>
              </div>

              {/* Date & Venue Bar */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-neutral-800 text-xs font-mono text-neutral-400 gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-400" />
                  <span className="text-white font-bold">{confirmedTicket.event_date || event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-400" />
                  <span className="text-white font-bold">{confirmedTicket.event_time || event.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span className="text-white font-bold">{confirmedTicket.event_venue || event.venue}</span>
                </div>
              </div>
            </div>

            {/* Mandatory Gate ID Alert */}
            <div className="p-4 rounded-2xl bg-red-950/80 border-2 border-red-500 shadow-[0_0_25px_rgba(223,37,49,0.3)] text-red-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-black font-heading tracking-wide uppercase text-red-300">
                  MANDATORY: PHYSICAL INSTITUTE ID CARD REQUIRED AT GATE
                </p>
                <p className="text-[11px] leading-relaxed text-red-200/90 font-mono">
                  Online ticket or registration alone does not permit entry. You <strong className="text-white underline">MUST present your original physical Institute ID Card</strong> at the event arena for entry verification.
                </p>
              </div>
            </div>

            {/* Pass Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-1/2 py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <Download className="w-4 h-4 text-red-400" />
                <span>Print / Save Digital Ticket</span>
              </button>

              <Link
                to="/profile"
                className="w-full sm:w-1/2 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-xs font-heading font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(223,37,49,0.5)] flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
              >
                <span>View in Profile Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* VIEW B: LOCKED STATE — USER NOT VERIFIED BY ADMIN                */}
        {/* ================================================================= */}
        {!checkingTicket && !confirmedTicket && !isUserAdminVerified && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-10 rounded-3xl bg-neutral-950 border-2 border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.2)] space-y-6"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Eligibility Requirement
                </span>
                <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
                  ADMIN VERIFICATION REQUIRED TO REGISTER
                </h2>
              </div>
            </div>

            {/* Explanation box */}
            <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-2 text-xs font-mono">
                  <p className="text-amber-200 font-bold leading-relaxed">
                    Event registration is restricted to participants who are registered and verified by the SAMYAK Admin Committee.
                  </p>
                  <p className="text-neutral-300 leading-relaxed text-[11px]">
                    To maintain venue capacity, ensure fairness, and uphold strict campus security:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-neutral-300 text-[11px]">
                    <li>You must have completed your SAMYAK delegate profile.</li>
                    <li>External participants must complete the fest pass fee payment (UTR &amp; screenshot submitted).</li>
                    <li>The fest administration must review and verify your delegate registration / payment.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Current Account Status Box */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <span className="text-[10px] font-mono uppercase text-neutral-500 block">Your Current Status</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">Account</span>
                  <span className="text-white font-bold">{currentUser ? 'Signed In' : 'Not Signed In'}</span>
                </div>
                <div className="p-3 rounded-xl bg-black border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">Profile</span>
                  <span className="text-white font-bold">{userData?.profileCompleted ? 'Completed' : 'Incomplete / Pending'}</span>
                </div>
                <div className="p-3 rounded-xl bg-black border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">Admin Verification</span>
                  <span className="text-amber-400 font-bold">Awaiting Admin Verification</span>
                </div>
              </div>
            </div>

            {/* Action buttons to complete registration/payment or sign in */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {!currentUser ? (
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="w-full sm:w-1/2 py-3.5 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                >
                  <User className="w-4 h-4 text-red-600" />
                  <span>Sign In with Google</span>
                </button>
              ) : (
                <Link
                  to="/profile"
                  className="w-full sm:w-1/2 py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer text-center shadow-lg"
                >
                  <User className="w-4 h-4 text-red-400" />
                  <span>View Profile &amp; Verification Status</span>
                </Link>
              )}

              <Link
                to="/payment"
                className="w-full sm:w-1/2 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer text-center shadow-[0_0_25px_rgba(223,37,49,0.5)]"
              >
                <span>Submit Fest Pass / Payment</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* VIEW C: REGISTRATION FORM VIEW — FOR VERIFIED PARTICIPANTS        */}
        {/* ================================================================= */}
        {!checkingTicket && !confirmedTicket && isUserAdminVerified && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-10 rounded-3xl bg-neutral-950 border-2 border-red-500/50 shadow-[0_0_60px_rgba(223,37,49,0.35)] space-y-6"
          >
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-800 gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-red-500 tracking-wider font-bold">
                  Official Event Enrollment Form
                </span>
                <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
                  ENROLL IN <span className="text-red-500">{event.title}</span>
                </h2>
                <p className="text-xs text-neutral-400 font-cyber mt-0.5">
                  Confirm your delegate enrollment details below to generate your digital gate pass.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-400 uppercase font-bold shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Verified Delegate
              </div>
            </div>

            {/* Profile Pre-fill Notice */}
            {prefilledNotice && (
              <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-blue-200 text-xs font-mono flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Your delegate profile information has been automatically synchronized. Please review the details before confirming enrollment.
                </span>
              </div>
            )}

            {/* Conflict Warning */}
            {conflictWarning && (
              <div className="p-4 rounded-2xl bg-amber-950/60 border-2 border-amber-500/80 text-amber-200 space-y-1 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-heading font-black text-xs uppercase tracking-wider text-amber-300">
                    Potential Time Slot Conflict
                  </span>
                </div>
                <p className="text-[11px] font-mono text-amber-200/90 leading-relaxed">
                  You are already registered for <strong>{conflictWarning.title || conflictWarning.event_title}</strong> at {conflictWarning.time || conflictWarning.event_time}. Confirming enrollment here may overlap with your existing slot.
                </p>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-mono flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Mandatory Physical ID Gate Notice */}
            <div className="p-4 rounded-2xl bg-red-950/80 border-2 border-red-500 shadow-[0_0_25px_rgba(223,37,49,0.35)] text-red-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-black font-heading tracking-wide uppercase text-red-300">
                  MANDATORY: PHYSICAL INSTITUTE ID CARD REQUIRED AT GATE
                </p>
                <p className="text-[11px] leading-relaxed text-red-200/90 font-mono">
                  Online ID upload or registration does not confirm identity. You <strong className="text-white underline">MUST bring and present your original physical Institute ID Card</strong> at the fest entry gate for physical verification. Entry will be denied without the physical ID card.
                </p>
              </div>
            </div>

            {/* Main Enrollment Form */}
            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              {/* Full Name & University ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 font-bold">
                    <User className="w-3.5 h-3.5 text-red-400" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="studentName"
                    required
                    placeholder="e.g. Uday Kiran Vempati"
                    value={formData.studentName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 font-bold">
                    <Hash className="w-3.5 h-3.5 text-red-400" />
                    University / College ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="universityId"
                    required
                    placeholder="e.g. 2300030198"
                    value={formData.universityId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Email & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 font-bold">
                    <Mail className="w-3.5 h-3.5 text-red-400" />
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="student@university.in"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 font-bold">
                    <Phone className="w-3.5 h-3.5 text-red-400" />
                    Mobile Phone (10 Digits) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+91 98480 12345"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Branch & Academic Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 font-bold">
                    <School className="w-3.5 h-3.5 text-red-400" />
                    Branch / Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b} value={b} className="bg-neutral-900 text-white">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 font-bold">
                    <Award className="w-3.5 h-3.5 text-red-400" />
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y} className="bg-neutral-900 text-white">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  Gender (Optional)
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-neutral-800 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
                >
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(223,37,49,0.5)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Reserving Slot &amp; Issuing Pass...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Enrollment &amp; Get Pass</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-neutral-500 font-mono mt-2">
                  🔒 Verified delegate registration. One slot per verified attendee account.
                </p>
              </div>
            </form>
          </motion.div>
        )}

      </div>
    </div>
  );
}
