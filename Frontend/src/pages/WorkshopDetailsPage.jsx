import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, MapPin, ArrowLeft, Sparkles, 
  CheckCircle2, AlertCircle, Download, 
  User, Phone,
  Share2, Award, Shield, Check, DollarSign, Lock, ShieldCheck,
  Upload, Copy, X, QrCode
} from 'lucide-react';
import { useUser } from '../data/useUser';
import { 
  subscribeWorkshops, 
  registerForWorkshop, 
  getWorkshopById,
  DEFAULT_WORKSHOPS 
} from '../services/workshopService';
import { pageVariants } from '../animations/pageAnimations';
import { FEST_FEE } from '../config/paymentConfig';
import { uploadSecureUserFile } from '../services/storageService';
import { compressImageToDataUrl } from '../services/fileSecurityService';
import { isKlUniversityStudent } from '../services/gatePassService';
import PaymentQrCode from '../components/Payment/PaymentQrCode';

const COLLEGE_BRANCHES = [
  'Computer Science & Engineering (CSE)',
  'Artificial Intelligence & Data Science (AIDS)',
  'Electronics & Communication Engineering (ECE)',
  'Mechanical Engineering (MECH)',
  'Civil Engineering (CIVIL)',
  'Bio-Technology (BIOTECH)',
  'School of Business Management (MBA)',
  'Computer Applications & Software (BCA)',
  'Other Engineering / Sciences'
];

const ACADEMIC_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Postgraduate / Research Scholar'
];

export default function WorkshopDetailsPage() {
  const { id } = useParams();
  const { currentUser, userData, loginWithGoogle } = useUser();

  const [workshops, setWorkshops] = useState(DEFAULT_WORKSHOPS);
  const [loading, setLoading] = useState(true);

  // Registration & Payment state
  const [confirmedPass, setConfirmedPass] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Payment proof file upload state
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentPreview, setPaymentPreview] = useState(null);
  const paymentInputRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    phone: '',
    collegeChoice: 'kl_university',
    customCollegeName: '',
    universityId: '',
    branch: COLLEGE_BRANCHES[0],
    year: ACADEMIC_YEARS[2],
    utr: ''
  });
  const [directWorkshop, setDirectWorkshop] = useState(null);
  const [directResolved, setDirectResolved] = useState(false);

  // Accurately determine if attendee belongs to KL University
  const isKluUser = Boolean(
    isKlUniversityStudent(userData) ||
    userData?.category === 'INTERNAL' ||
    (userData?.university || userData?.college || '').toLowerCase().includes('kl') ||
    userData?.collegeChoice === 'kl_university' ||
    userData?.email?.endsWith('@kluniversity.in')
  );

  const effectiveIsKlu = Boolean(
    isKluUser ||
    formData.collegeChoice === 'kl_university' ||
    (formData.customCollegeName && formData.customCollegeName.toLowerCase().includes('kl'))
  );

  const isPaymentVerified = Boolean(userData?.paymentStatus === 'VERIFIED' || userData?.status === 'verified');
  const hasGatePass = Boolean(
    !isKluUser && (
      userData?.gatePassStatus === 'ISSUED' ||
      userData?.gatePassToken ||
      userData?.gatePass?.token
    )
  );

  // Gate Pass FREE registration is ONLY for external verified pass holders!
  // KL University students ALWAYS require paying the workshop fee.
  const isEligibleWithGatePass = Boolean(
    currentUser &&
    !effectiveIsKlu &&
    isPaymentVerified &&
    hasGatePass
  );

  // Attendees who must pay workshop fee: KL University students or attendees without verified Gate Pass
  const requiresWorkshopFee = Boolean(effectiveIsKlu || !isEligibleWithGatePass);

  // Direct fetch by ID (ensures newly created workshops resolve immediately)
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    getWorkshopById(id)
      .then((ws) => {
        if (isMounted) {
          if (ws) setDirectWorkshop(ws);
          setDirectResolved(true);
        }
      })
      .catch((err) => {
        console.warn('Notice resolving workshop by ID:', err);
        if (isMounted) setDirectResolved(true);
      });
    return () => { isMounted = false; };
  }, [id]);

  // Subscribe to workshops
  useEffect(() => {
    const unsub = subscribeWorkshops(
      (data) => {
        if (data && data.length > 0) {
          setWorkshops(data);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Locate the current workshop
  const workshop = useMemo(() => {
    if (directWorkshop) return directWorkshop;
    if (!id) return null;
    const cleanId = id.toLowerCase().trim();
    return workshops.find(
      (w) => (w.id && w.id.toLowerCase().trim() === cleanId) || 
        (w.title && w.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanId)
    );
  }, [directWorkshop, workshops, id]);

  // Check if all seats are filled for this workshop
  const isSeatsFilled = useMemo(() => {
    if (!workshop) return false;
    if (workshop.status === 'Seats Full' || workshop.status === 'Closed') return true;
    if (workshop.availableSeats !== undefined && Number(workshop.availableSeats) <= 0) return true;
    if (workshop.capacity && workshop.registeredCount && Number(workshop.registeredCount) >= Number(workshop.capacity)) return true;
    return false;
  }, [workshop]);

  // Check if user is already registered for this workshop
  const isAlreadyRegistered = useMemo(() => {
    if (!userData || !workshop) return false;
    const list = userData.registeredWorkshops || [];
    return list.some((item) => (typeof item === 'string' ? item === workshop.id : item.workshopId === workshop.id));
  }, [userData, workshop]);

  // Pre-fill profile details
  useEffect(() => {
    if (userData || currentUser) {
      setFormData((prev) => ({
        ...prev,
        studentName: userData?.name || currentUser?.displayName || prev.studentName,
        email: userData?.email || currentUser?.email || prev.email,
        phone: userData?.phone || userData?.mobile || prev.phone,
        universityId: userData?.studentId || userData?.rollNo || prev.universityId,
        branch: userData?.branch || prev.branch,
        collegeChoice: (userData?.college || '').toLowerCase().includes('kl') || currentUser?.email?.endsWith('@kluniversity.in') ? 'kl_university' : (userData?.college ? 'other' : prev.collegeChoice),
        customCollegeName: (userData?.college || '').toLowerCase().includes('kl') ? '' : (userData?.college || prev.customCollegeName)
      }));
    }
  }, [userData, currentUser]);

  const handlePaymentScreenshotChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file (JPEG, PNG, WEBP).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Payment screenshot should be less than 10MB.');
        return;
      }
      setPaymentFile(file);
      setPaymentPreview(URL.createObjectURL(file));
      setErrorMessage('');
    }
  };

  const handleRemoveScreenshot = () => {
    setPaymentFile(null);
    setPaymentPreview(null);
    if (paymentInputRef.current) {
      paymentInputRef.current.value = '';
    }
  };

  const handleCopyUpi = () => {
    const upiId = workshop?.merchantUpiId || 'klefsamyak2312@sbi';
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Submit Registration
  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (isSeatsFilled) {
      setErrorMessage('All seats are filled for this workshop. Please register for another event.');
      return;
    }

    if (!currentUser) {
      setErrorMessage('Please sign in to register for this workshop.');
      return;
    }

    if (!formData.studentName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!formData.phone || formData.phone.replace(/[^0-9]/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (formData.collegeChoice === 'other' && !formData.customCollegeName.trim()) {
      setErrorMessage('Please specify your college or university name.');
      return;
    }
    if (!formData.universityId.trim()) {
      setErrorMessage('Please enter your College ID or Roll Number.');
      return;
    }

    const cleanUtr = (formData.utr || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // For KL University students and paid registrations: enforce UTR and Payment Screenshot!
    if (requiresWorkshopFee) {
      if (!cleanUtr || cleanUtr.length < 10 || cleanUtr.length > 16) {
        setErrorMessage('Please enter a valid 10 to 16 alphanumeric UPI Transaction / UTR ID.');
        return;
      }
      if (!paymentFile && !paymentPreview) {
        setErrorMessage('Please upload your workshop payment confirmation screenshot.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setUploadStatus('Processing registration...');

      const effectiveCollegeName = formData.collegeChoice === 'kl_university'
        ? 'K L Deemed to be University'
        : formData.customCollegeName.trim();

      let finalPaymentScreenshotUrl = paymentPreview || '';

      if (requiresWorkshopFee && paymentFile) {
        setUploadStatus('Uploading workshop payment screenshot...');
        try {
          const uploadRes = await uploadSecureUserFile(
            paymentFile,
            'workshop_payment_proofs',
            currentUser.uid,
            workshop.id
          );
          finalPaymentScreenshotUrl = uploadRes.url;
        } catch (uploadErr) {
          console.warn('R2 upload notice, falling back to compressed data URL:', uploadErr);
          const fallbackDataUrl = await compressImageToDataUrl(paymentFile, 1000, 0.72);
          finalPaymentScreenshotUrl = fallbackDataUrl || paymentPreview;
        }
      }

      setUploadStatus('Recording workshop registration in live database...');

      const gatePassToken = (!effectiveIsKlu && isEligibleWithGatePass)
        ? (userData?.gatePassToken || userData?.gatePass?.token || 'ISSUED')
        : '';

      const result = await registerForWorkshop({
        workshopId: workshop.id,
        workshopTitle: workshop.title,
        workshopFee: requiresWorkshopFee ? (workshop.price || 0) : 0,
        studentName: formData.studentName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        collegeChoice: formData.collegeChoice,
        collegeName: effectiveCollegeName,
        universityId: formData.universityId.trim(),
        branch: formData.branch,
        year: formData.year,
        utr: requiresWorkshopFee ? cleanUtr : '',
        paymentScreenshotUrl: requiresWorkshopFee ? finalPaymentScreenshotUrl : 'GATE_PASS_VERIFIED',
        isGatePassVerified: !effectiveIsKlu && isEligibleWithGatePass,
        gatePassToken,
        uid: currentUser.uid || userData?.uid || ''
      });

      setConfirmedPass(result);
    } catch (err) {
      console.error('Registration failed:', err);
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  if ((loading || !directResolved) && !workshop) {
    return (
      <div className="min-h-screen bg-black text-white pt-32 pb-20 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        <span className="text-xs font-mono text-neutral-400">Loading workshop curriculum...</span>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_25px_rgba(223,37,49,0.4)]">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black font-heading tracking-wide mb-2">Workshop Not Found</h2>
        <p className="text-neutral-400 font-cyber text-sm max-w-md mb-6">
          The requested workshop could not be located or may have been updated.
        </p>
        <Link
          to="/workshops"
          className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(223,37,49,0.5)]"
        >
          Browse All Workshops
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 sm:pt-28 min-h-screen bg-black text-slate-100 pb-20 selection:bg-red-600 selection:text-white"
    >
      {/* Background ambient neon glow */}
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        
        {/* Top Breadcrumb & Share Bar */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/workshops"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-red-500 transition-transform group-hover:-translate-x-1" />
            <span>Back to Workshops</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${workshop.title} | SAMYAK 2026`,
                  text: workshop.shortDescription,
                  url: window.location.href
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Workshop link copied to clipboard!');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs font-mono transition-all cursor-pointer"
            title="Share Workshop"
          >
            <Share2 className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Hero Banner Card */}
        <div className="rounded-3xl border border-red-500/30 overflow-hidden bg-neutral-950/80 backdrop-blur-xl shadow-[0_0_40px_rgba(223,37,49,0.2)]">
          <div className="relative h-64 sm:h-96 w-full overflow-hidden bg-neutral-900">
            <img
              src={workshop.posterUrl || '/hero-bg.png'}
              alt={workshop.title}
              className="w-full h-full object-cover filter contrast-105 brightness-90"
              onError={(e) => { e.currentTarget.src = '/hero-bg.png'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono uppercase font-black tracking-wider bg-red-600 text-white shadow-[0_0_15px_rgba(223,37,49,0.6)]">
                {workshop.category}
              </span>
              {(workshop.branch || workshop.department || workshop.organizedBy) && (
                <span className="px-3 py-1 rounded-full text-xs font-mono uppercase font-bold tracking-wider bg-red-900/80 border border-red-400/60 text-red-200 backdrop-blur-md">
                  {workshop.branch || workshop.department || workshop.organizedBy}
                </span>
              )}
              {isSeatsFilled ? (
                <span className="px-3 py-1 rounded-full text-xs font-mono uppercase font-black tracking-wider bg-amber-500/20 border border-amber-500/80 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center gap-1.5 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  All seats filled · Register for another event
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-mono uppercase font-bold tracking-wider bg-black/80 border border-neutral-700 text-neutral-200">
                  {workshop.status || 'Seats Open'}
                </span>
              )}
            </div>

            {/* Distinct Workshop Fee Badge */}
            <div className="absolute top-4 right-4">
              <div className="px-4 py-2 rounded-2xl bg-emerald-950/95 border-2 border-emerald-500 text-emerald-400 font-heading font-black text-lg sm:text-xl shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                ₹{workshop.price}
              </div>
            </div>

            {/* Title Strip */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="text-[11px] font-mono text-red-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SAMYAK 2026 OFFICIAL TECHNICAL WORKSHOP</span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-heading text-white tracking-tight leading-tight">
                {workshop.title}
              </h1>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 p-6 bg-neutral-900/60 border-t border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-neutral-500">Date</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-white">{workshop.date}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-neutral-500">Timing</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-white">{workshop.time}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-neutral-500">Venue</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-white truncate max-w-[140px] block" title={workshop.venue}>
                  {workshop.venue}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-neutral-500">Workshop Fee</span>
                <span className="text-xs sm:text-sm font-heading font-black text-emerald-400">₹{workshop.price}</span>
              </div>
            </div>

            {(workshop.branch || workshop.department || workshop.organizedBy) && (
              <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-mono uppercase text-neutral-500">Department</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-red-300 truncate max-w-[140px] block" title={workshop.branch || workshop.department || workshop.organizedBy}>
                    {workshop.branch || workshop.department || workshop.organizedBy}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Layout: Left Overview & Curriculum, Right Payment & Registration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Workshop Information & Curriculum (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Separate Fee Notice */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/50 flex items-start gap-3 shadow-[0_0_25px_rgba(16,185,129,0.1)]">
              <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-mono">
                <span className="text-white font-bold block">Independent Technical Workshop:</span>
                <span className="text-emerald-300">
                  This workshop fee (₹{workshop.price}) covers hands-on laboratory access, industrial trainer mentorship, software licenses, and official certification. It is completely independent of the Samyak fest entry pass.
                </span>
              </div>
            </div>

            {/* Workshop Overview */}
            <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                <Sparkles className="w-4 h-4 text-red-500" />
                <span>Workshop Overview</span>
              </div>
              <p className="text-sm sm:text-base text-slate-300 font-cyber leading-relaxed">
                {workshop.fullDescription || workshop.shortDescription}
              </p>
            </div>

            {/* Curriculum Modules */}
            {workshop.topics && workshop.topics.length > 0 && (
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  <span>Hands-On Modules &amp; Syllabus</span>
                </div>
                <div className="space-y-3">
                  {workshop.topics.map((topic, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80">
                      <span className="w-6 h-6 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-mono text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-xs sm:text-sm text-neutral-200 font-mono font-medium">
                        {topic}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructor Spotlight */}
            {workshop.instructor && (
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                  <User className="w-4 h-4 text-red-500" />
                  <span>Lead Speaker &amp; Industry Trainer</span>
                </div>
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400 font-heading font-black text-xl flex-shrink-0">
                    {workshop.instructor.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-base font-heading font-black text-white">{workshop.instructor}</h4>
                    {workshop.instructorRole && (
                      <p className="text-xs font-mono text-red-400 mt-0.5">{workshop.instructorRole}</p>
                    )}
                    {workshop.instructorOrg && (
                      <p className="text-xs font-cyber text-neutral-400">{workshop.instructorOrg}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Benefits & Certification */}
            {workshop.benefits && workshop.benefits.length > 0 && (
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                  <Award className="w-4 h-4 text-red-500" />
                  <span>Certification &amp; Delegate Kit</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {workshop.benefits.map((b, i) => (
                    <div key={i} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coordinators Contact */}
            {workshop.coordinators && workshop.coordinators.length > 0 && (
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                  <Phone className="w-4 h-4 text-red-500" />
                  <span>Student Coordinators &amp; Helpdesk</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {workshop.coordinators.map((c, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                      <div>
                        <div className="font-heading font-bold text-sm text-white">{c.name}</div>
                        <div className="text-[11px] font-mono text-red-400">Workshop Lead</div>
                      </div>
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="p-2.5 rounded-xl bg-neutral-900 hover:bg-red-600 text-neutral-400 hover:text-white transition-colors"
                          title={`Call ${c.name}`}
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Workshop Payment QR & Registration Form (5 cols) */}
          <div className="lg:col-span-5 sticky top-28 space-y-6">
            
            {confirmedPass ? (
              /* CONFIRMED PASS CARD */
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-950 border-2 border-emerald-500/80 shadow-[0_0_50px_rgba(16,185,129,0.3)] space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/40">
                    {confirmedPass.workshop_fee > 0 || confirmedPass.status === 'PENDING_VERIFICATION' ? 'Payment Submitted · Under Review' : 'Pass Confirmed'}
                  </span>
                  <h3 className="text-2xl font-black font-heading text-white mt-2">
                    {confirmedPass.workshop_fee > 0 || confirmedPass.status === 'PENDING_VERIFICATION' ? 'REGISTRATION SUBMITTED!' : 'YOU\'RE REGISTERED!'}
                  </h3>
                  <p className="text-xs text-neutral-400 font-cyber mt-1">
                    {confirmedPass.workshop_fee > 0 || confirmedPass.status === 'PENDING_VERIFICATION'
                      ? 'Your workshop registration and payment proof are recorded. Present this slip or digital pass at the workshop venue.'
                      : 'Present your digital workshop credential at the lab gate for check-in.'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-black border border-neutral-800 text-left space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-neutral-800 pb-2">
                    <span className="text-neutral-500">Ticket Code:</span>
                    <code className="text-red-400 font-bold">{confirmedPass.ticketCode}</code>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-2">
                    <span className="text-neutral-500">Attendee:</span>
                    <span className="text-white font-bold">{confirmedPass.student_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-2">
                    <span className="text-neutral-500">College:</span>
                    <span className="text-neutral-300 truncate max-w-[170px]">{confirmedPass.college_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-2">
                    <span className="text-neutral-500">Workshop Fee:</span>
                    <span className="text-emerald-400 font-bold">
                      {confirmedPass.workshop_fee > 0 ? `₹${confirmedPass.workshop_fee}` : 'FREE (Gate Pass)'}
                    </span>
                  </div>
                  {confirmedPass.utr && (
                    <div className="flex justify-between border-b border-neutral-800 pb-2">
                      <span className="text-neutral-500">UTR / Ref:</span>
                      <span className="text-neutral-200 font-bold">{confirmedPass.utr}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Verification Status:</span>
                    <span className={`font-bold ${confirmedPass.status === 'CONFIRMED' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                      {confirmedPass.status || 'PENDING_VERIFICATION'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=SAMYAK_WORKSHOP_${confirmedPass.ticketCode}_${confirmedPass.university_id}`}
                    alt="Ticket QR"
                    className="w-24 h-24 object-contain"
                  />
                  <span className="text-[9px] font-mono font-bold text-black mt-1 uppercase">Gate Check-in Scan</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-red-400" />
                    <span>Print / Save Pass</span>
                  </button>
                </div>
              </div>
            ) : isSeatsFilled ? (
              /* ALL SEATS FILLED PROMPT */
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-950 border-2 border-amber-500/70 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                  <AlertCircle className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono text-[11px] uppercase tracking-wider font-bold">
                    Capacity Reached
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wide uppercase">
                    All Seats Filled
                  </h3>
                  <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-500/60 text-amber-300 font-heading font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    All seats filled · Register for another event
                  </div>
                  <p className="text-xs font-mono text-neutral-400 max-w-sm mx-auto pt-2 leading-relaxed">
                    All lab workstations for this masterclass are completely booked. Please explore our other official technical workshops or Samyak fest arenas.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2 text-left">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-neutral-500">Workshop:</span>
                    <span className="text-white font-bold truncate max-w-[200px]">{workshop.title}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-neutral-500">Available Slots:</span>
                    <span className="text-amber-400 font-bold">0 Remaining (Sold Out)</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-neutral-500">Scheduled Date:</span>
                    <span className="text-neutral-300 font-bold">{workshop.date}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Link
                    to="/workshops"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(223,37,49,0.5)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-102 active:scale-98"
                  >
                    <span>Browse Other Workshops</span>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </Link>

                  <Link
                    to="/events"
                    className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Register for Another Event &rarr;</span>
                  </Link>
                </div>
              </div>
            ) : isAlreadyRegistered ? (
              /* ALREADY REGISTERED CARD */
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-950 border-2 border-emerald-500/80 shadow-[0_0_40px_rgba(16,185,129,0.25)] space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/40">
                    Seat Allocated
                  </span>
                  <h3 className="text-2xl font-black font-heading text-white mt-2">
                    YOU ARE REGISTERED!
                  </h3>
                  <p className="text-xs text-neutral-400 font-cyber mt-1">
                    Your seat is reserved for this masterclass under your registered SAMYAK 2026 account.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2 text-left font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Workshop:</span>
                    <span className="text-white font-bold truncate max-w-[200px]">{workshop.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Date &amp; Time:</span>
                    <span className="text-neutral-300 font-bold">{workshop.date} · {workshop.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Venue:</span>
                    <span className="text-neutral-300">{workshop.venue}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    to="/profile"
                    className="py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-white text-center transition-all"
                  >
                    View in Profile
                  </Link>
                  <Link
                    to="/workshops"
                    className="py-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white text-center transition-all shadow-[0_0_15px_rgba(223,37,49,0.4)]"
                  >
                    Other Workshops
                  </Link>
                </div>
              </div>
            ) : !currentUser ? (
              /* SIGN IN REQUIRED CARD */
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-950 border-2 border-red-500/40 shadow-[0_0_40px_rgba(223,37,49,0.2)] space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500/50 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(223,37,49,0.4)]">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold bg-red-950/60 px-3 py-1 rounded-full border border-red-500/40">
                    Authentication Required
                  </span>
                  <h3 className="text-2xl font-black font-heading text-white mt-2">
                    SIGN IN TO REGISTER
                  </h3>
                  <p className="text-xs text-neutral-400 font-cyber mt-2 max-w-sm mx-auto leading-relaxed">
                    Please sign in with Google to register for this technical workshop. Individual workshop registration fee (₹{workshop.price}) applies.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-left space-y-2 text-xs font-mono text-neutral-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Individual Workshop Fee: ₹{workshop.price}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Hands-on lab workstation &amp; Hardware access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Official SAMYAK 2026 Workshop Certificate</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(223,37,49,0.5)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-101"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </button>
              </div>
            ) : (
              /* REGISTRATION & PAYMENT FORM */
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-950 border-2 border-emerald-500/60 shadow-[0_0_45px_rgba(16,185,129,0.2)] space-y-6">
                
                {/* Header: Verified Gate Pass vs Paid Registration */}
                <div className="border-b border-neutral-800 pb-4 space-y-2">
                  {effectiveIsKlu ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>🎓 KL University Student · Workshop Fee Required</span>
                    </div>
                  ) : isEligibleWithGatePass ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>✓ ₹{FEST_FEE} Fest Pass Verified · Gate Pass Active</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/70 border border-red-500/50 text-red-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                      <Shield className="w-3.5 h-3.5 text-red-400" />
                      <span>Workshop Direct Registration · Fee Payable</span>
                    </div>
                  )}

                  <h3 className="text-xl sm:text-2xl font-black font-heading text-white">
                    REGISTER FOR WORKSHOP
                  </h3>

                  <div className="flex items-center justify-between pt-1">
                    {effectiveIsKlu ? (
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        Fee: ₹{workshop.price} (KL University Student Fee)
                      </span>
                    ) : isEligibleWithGatePass ? (
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        FREE with your Verified Gate Pass
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        Fee: ₹{workshop.price} (Direct Workshop Pass)
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-neutral-400">
                      {workshop.availableSeats ?? 20} Seats Remaining
                    </span>
                  </div>

                  {effectiveIsKlu && (
                    <div className="p-3 rounded-xl bg-neutral-900/90 border border-emerald-500/30 text-xs font-mono text-neutral-300 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">Attendee Status:</span>
                        <span className="text-emerald-400 font-bold">KL UNIVERSITY (VERIFIED)</span>
                      </div>
                      <p className="text-[11px] text-emerald-400/90 pt-1 border-t border-neutral-800">
                        ℹ️ For workshops, KL University students also need to pay the individual workshop fee (₹{workshop.price}) for lab access, hands-on toolkits, and certification.
                      </p>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSubmitRegistration} className="space-y-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>

                  {/* Phone & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98480 12345"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="student@univ.in"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* College & Roll No */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold">
                        College / Institute <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.collegeChoice}
                        onChange={(e) => setFormData({ ...formData, collegeChoice: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="kl_university">KL University</option>
                        <option value="other">Other / External College</option>
                      </select>
                    </div>

                    {formData.collegeChoice === 'other' && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                          Enter College Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. SRM / VIT / IIT Hyderabad"
                          value={formData.customCollegeName}
                          onChange={(e) => setFormData({ ...formData, customCollegeName: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-black border border-amber-500/50 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                        College ID / Roll No <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 2400030380"
                        value={formData.universityId}
                        onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Branch & Academic Year */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                        Branch
                      </label>
                      <select
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                      >
                        {COLLEGE_BRANCHES.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                        Academic Year
                      </label>
                      <select
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                      >
                        {ACADEMIC_YEARS.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* WORKSHOP FEE PAYMENT SECTION (Rendered when fee is required) */}
                  {requiresWorkshopFee && (
                    <div className="pt-4 border-t border-neutral-800 space-y-4">
                      <div className="p-4 rounded-2xl bg-neutral-900/90 border border-emerald-500/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                              UPI Payment QR Code
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-400 font-heading font-black text-xs">
                            ₹{workshop.price}
                          </span>
                        </div>

                        {/* Interactive QR Code Component */}
                        <div className="flex justify-center p-2 rounded-xl bg-black/60 border border-neutral-800">
                          <PaymentQrCode
                            amount={workshop.price}
                            tierName={workshop.title}
                            merchantUpiId={workshop.merchantUpiId || 'klefsamyak2312@sbi'}
                            merchantName="SAMYAK 2026 WORKSHOPS"
                          />
                        </div>

                        {/* UPI ID with Copy Button */}
                        <div className="p-2.5 rounded-xl bg-black border border-neutral-800 flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-neutral-500 block uppercase">UPI ID</span>
                            <span className="text-emerald-400 font-bold">{workshop.merchantUpiId || 'klefsamyak2312@sbi'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white flex items-center gap-1.5 text-[11px] transition-colors cursor-pointer"
                          >
                            {copiedUpi ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-neutral-400" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* UTR / Transaction ID */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold flex items-center justify-between">
                          <span>UPI Transaction ID / UTR Number <span className="text-red-500">*</span></span>
                          <span className="text-[10px] text-neutral-500 font-normal">10-16 alphanumeric</span>
                        </label>
                        <input
                          type="text"
                          required={requiresWorkshopFee}
                          placeholder="e.g. 408512345678"
                          value={formData.utr}
                          onChange={(e) => setFormData({ ...formData, utr: e.target.value.toUpperCase() })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
                        />
                      </div>

                      {/* Payment Screenshot Upload */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold">
                          Workshop Payment Screenshot <span className="text-red-500">*</span>
                        </label>

                        <input
                          ref={paymentInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePaymentScreenshotChange}
                          className="hidden"
                          id="workshop-payment-proof"
                        />

                        {paymentPreview ? (
                          <div className="p-3 rounded-2xl bg-neutral-900/90 border border-emerald-500/50 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={paymentPreview}
                                alt="Payment Proof"
                                className="w-12 h-12 object-cover rounded-xl border border-neutral-700"
                              />
                              <div className="space-y-0.5">
                                <span className="text-xs font-mono font-bold text-white block">
                                  {paymentFile ? paymentFile.name : 'Screenshot Uploaded'}
                                </span>
                                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Ready for verification
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveScreenshot}
                              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/50 text-red-400 hover:text-white transition-colors cursor-pointer"
                              title="Remove image"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor="workshop-payment-proof"
                            className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-neutral-700 hover:border-emerald-500 bg-neutral-900/40 hover:bg-neutral-900/80 transition-all cursor-pointer text-center group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-neutral-800 group-hover:bg-emerald-600/20 text-neutral-400 group-hover:text-emerald-400 flex items-center justify-center mb-2 transition-colors">
                              <Upload className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-mono font-bold text-neutral-200 group-hover:text-white">
                              Upload Payment Confirmation
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500 mt-0.5">
                              JPEG, PNG, or WEBP up to 10MB
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full py-4 rounded-2xl ${
                        requiresWorkshopFee
                          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-500 shadow-[0_0_30px_rgba(223,37,49,0.5)]'
                          : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                      } hover:brightness-110 text-white font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 hover:scale-101 active:scale-99`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>{uploadStatus || 'Processing Registration...'}</span>
                        </>
                      ) : requiresWorkshopFee ? (
                        <>
                          <DollarSign className="w-5 h-5 text-white" />
                          <span>Pay Workshop Fee (₹{workshop.price}) &amp; Register</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5 text-white" />
                          <span>Register with Gate Pass (Free)</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-neutral-500 font-mono mt-2">
                      {requiresWorkshopFee
                        ? '🔒 Workshop pass & confirmation receipt issued upon payment proof submission.'
                        : '🔒 Official workshop pass is issued instantly to your verified Gate Pass.'}
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
