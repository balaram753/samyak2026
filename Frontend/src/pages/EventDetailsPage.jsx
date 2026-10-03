import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, MapPin, Trophy, ArrowLeft, 
  Sparkles, ShieldCheck, Users, Phone, ExternalLink, CheckCircle2,
  Share2, Tag, Image as ImageIcon, Folder, Eye, X, ChevronRight,
  Info, QrCode, AlertTriangle, Ban, ArrowRight
} from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';
import { useUser } from '../data/useUser';
import { EVENTS_DATA } from '../data/events';
import { pageVariants } from '../animations/pageAnimations';
import EventRegistrationModal from '../components/Events/EventRegistrationModal';
import { 
  listenToEventStats, 
  checkStudentAlreadyRegistered,
  listenToUserRegistrations,
  checkUserTimeSlotConflictSync 
} from '../services/eventRegistrationService';

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { events: siteEvents } = useSiteContent();

  const allEvents = siteEvents && siteEvents.length > 0 ? siteEvents : EVENTS_DATA;

  // Locate the event by ID or title slug
  const event = useMemo(() => {
    if (!id) return null;
    return allEvents.find(
      (e) => e.id === id || e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === id.toLowerCase()
    );
  }, [allEvents, id]);

  const [lightboxImage, setLightboxImage] = useState(null);
  const { userData } = useUser();

  // New Event Registration modal and real-time stats state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [existingTicket, setExistingTicket] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [regFeedback, setRegFeedback] = useState(null);
  const [userRegistrations, setUserRegistrations] = useState([]);

  // 1. Live seat stats listener
  useEffect(() => {
    if (!event?.id) return;
    const unsub = listenToEventStats(event.id, (stats) => {
      if (stats) setLiveStats(stats);
    });
    return () => unsub();
  }, [event?.id]);

  // 2. Real-time listener for current user's event registrations
  useEffect(() => {
    const uid = userData?.uid;
    if (!uid) {
      setUserRegistrations([]);
      return;
    }
    const unsub = listenToUserRegistrations(uid, (regs) => {
      setUserRegistrations(regs);
    });
    return () => unsub();
  }, [userData?.uid]);

  // 3. Check if student already has a digital ticket registration in Firestore
  useEffect(() => {
    if (!event?.id) return;
    let isMounted = true;
    const checkUser = async () => {
      if (userData?.email || userData?.rollNo || userData?.uid) {
        const ticket = await checkStudentAlreadyRegistered(event.id);
        if (isMounted && ticket) {
          setExistingTicket(ticket);
        }
      }
    };
    checkUser();
    return () => { isMounted = false; };
  }, [event?.id, userData?.email, userData?.rollNo, userData?.uid]);

  // Real-time capacity & enrollment metrics
  const capacity = Number(liveStats?.capacity ?? event?.capacity ?? 100);
  const regCount = Number(liveStats?.registration_count ?? event?.registration_count ?? 0);
  const availableSeats = Math.max(0, Number(liveStats?.available_seats ?? (capacity - regCount)));
  const isRegOpen = liveStats?.is_registration_open !== false && event?.is_registration_open !== false;
  
  const deadline = liveStats?.registration_deadline || event?.registration_deadline;
  const isPastDeadline = deadline ? (new Date() > new Date(deadline)) : false;

  const isCancelled = Boolean(
    event?.isCancelled || 
    (event?.status || '').toLowerCase() === 'cancelled' || 
    (event?.registrationStatus || '').toLowerCase() === 'cancelled'
  );

  const isFull = availableSeats <= 0;
  const isClosed = isCancelled || !isRegOpen || isPastDeadline;

  // Find other active events scheduled at the same time
  const sameTimeEvents = useMemo(() => {
    if (!event) return [];
    const eventDate = (event.date || '').trim().toLowerCase();
    const eventTime = (event.time || '').trim().toLowerCase();

    return allEvents.filter((ev) => {
      if (ev.id === event.id) return false;
      const isEvCancelled = ev.isCancelled || (ev.status || '').toLowerCase() === 'cancelled' || (ev.registrationStatus || '').toLowerCase() === 'cancelled';
      if (isEvCancelled) return false;

      const evDate = (ev.date || '').trim().toLowerCase();
      const evTime = (ev.time || '').trim().toLowerCase();

      // Check if time matches or both date and time match
      const dateMatch = eventDate && evDate && (evDate === eventDate || evDate.includes(eventDate) || eventDate.includes(evDate));
      const timeMatch = eventTime && evTime && (evTime === eventTime || evTime.includes(eventTime) || eventTime.includes(evTime));

      if (dateMatch && timeMatch) return true;
      if (timeMatch && !dateMatch && eventDate === 'tba') return true;
      if (timeMatch) return true;
      return false;
    });
  }, [allEvents, event]);

  // Fallback to active events on same date or department if none at exact time
  const alternativeEvents = useMemo(() => {
    if (sameTimeEvents.length > 0) return sameTimeEvents;
    if (!event) return [];
    const eventDate = (event.date || '').trim().toLowerCase();
    const eventDept = (event.department || event.dept || '').trim().toLowerCase();

    return allEvents.filter((ev) => {
      if (ev.id === event.id) return false;
      const isEvCancelled = ev.isCancelled || (ev.status || '').toLowerCase() === 'cancelled' || (ev.registrationStatus || '').toLowerCase() === 'cancelled';
      if (isEvCancelled) return false;
      const evDate = (ev.date || '').trim().toLowerCase();
      const evDept = (ev.department || ev.dept || '').trim().toLowerCase();
      return (eventDate && evDate === eventDate) || (eventDept && evDept === eventDept);
    }).slice(0, 6);
  }, [sameTimeEvents, allEvents, event]);

  // Current user's registration for THIS event
  const myRegDoc = useMemo(() => {
    if (!event?.id) return existingTicket || null;
    const found = userRegistrations.find((r) => r.event_id === event.id);
    return found || existingTicket || null;
  }, [event?.id, userRegistrations, existingTicket]);

  const isRegistrationCancelled = Boolean(
    myRegDoc && (
      (myRegDoc.status || '').toLowerCase() === 'cancelled' || 
      myRegDoc.isCancelled === true
    )
  );

  const activeTicket = myRegDoc && !isRegistrationCancelled ? myRegDoc : null;

  // Real-time time slot conflict check with OTHER active registered events
  const timeConflict = useMemo(() => {
    if (!event || activeTicket) return { hasConflict: false, conflictingEvent: null };
    return checkUserTimeSlotConflictSync(event, userRegistrations, allEvents);
  }, [event, activeTicket, userRegistrations, allEvents]);

  const isAlreadyRegistered = Boolean(activeTicket);

  if (!event) {
    return (
      <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_25px_rgba(223,37,49,0.4)]">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black font-heading tracking-wide mb-2">Event Not Found</h2>
        <p className="text-neutral-400 font-cyber text-sm max-w-md mb-6">
          The requested event could not be found or may have been updated.
        </p>
        <Link
          to="/events"
          className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(223,37,49,0.5)]"
        >
          Browse All Events
        </Link>
      </div>
    );
  }

  const handleShare = () => {
    const shareUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'))
      ? window.location.href
      : `https://kl--samyak.web.app/events/${event.id}`;

    if (navigator.share) {
      navigator.share({
        title: `${event.title} | SAMYAK 2026`,
        text: event.shortDescription,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Event link copied to clipboard!');
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 sm:pt-28 min-h-screen bg-black text-slate-100 pb-20 select-none"
    >
      {/* Background Ambience */}
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Navigation Bar / Back button */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-red-500 transition-transform group-hover:-translate-x-1" />
            <span>Back to Events</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs font-mono transition-all cursor-pointer"
            title="Share this event"
          >
            <Share2 className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* CANCELLATION NOTICE BANNER */}
        {isCancelled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-red-950/90 via-black to-red-950/80 border-2 border-red-500 shadow-[0_0_50px_rgba(223,37,49,0.4)]"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-500/60 flex items-center justify-center text-red-400 flex-shrink-0 shadow-[0_0_20px_rgba(223,37,49,0.5)]">
                  <AlertTriangle className="w-6 h-6 animate-pulse text-red-400" />
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-950 border border-red-500 text-[10px] font-mono uppercase tracking-widest text-red-300 font-bold">
                    <span>Official Fest Notice</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black font-heading text-white uppercase tracking-tight">
                    THIS EVENT HAS BEEN CANCELLED
                  </h3>
                  <p className="text-sm font-cyber text-red-200 font-bold">
                    Please register for another because this event was cancelled.
                  </p>
                  {event.cancellationReason && (
                    <p className="text-xs font-mono text-neutral-400 pt-1">
                      <span className="text-neutral-300 font-bold">Reason:</span> {event.cancellationReason}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0">
                <Link
                  to="/events"
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(223,37,49,0.6)] flex items-center gap-2 transition-all cursor-pointer inline-flex"
                >
                  <span>Explore Alternatives</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Hero Banner Card */}
        <div className="rounded-3xl border border-red-500/30 overflow-hidden bg-neutral-950/80 backdrop-blur-xl shadow-[0_0_40px_rgba(223,37,49,0.2)] mb-10">
          <div className="relative h-64 sm:h-96 w-full overflow-hidden bg-neutral-900">
            {event.video || event.image?.toLowerCase().endsWith('.mp4') ? (
              <video
                src={event.video || event.image}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover filter contrast-105 brightness-95"
              />
            ) : (
              <img
                src={event.image || '/hero-bg.png'}
                alt={event.title}
                className="w-full h-full object-cover filter contrast-105 brightness-90"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Badges on Banner */}
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono uppercase font-black tracking-wider bg-red-600 text-white shadow-[0_0_15px_rgba(223,37,49,0.6)]">
                {event.department || event.branch || event.dept || 'KL University'}
              </span>
              {event.club && (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider bg-neutral-950/90 border border-red-500/50 text-red-300 shadow-md">
                  {event.club}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-black/70 border border-neutral-700 text-neutral-300">
                {event.category}
              </span>
            </div>

            <div className="absolute top-4 right-4">
              {isCancelled ? (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-mono uppercase font-black tracking-wider bg-red-600 border border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span>EVENT CANCELLED</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-mono uppercase font-bold tracking-wider bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  {event.registrationStatus || 'Registration Open'}
                </span>
              )}
            </div>

            {/* Banner Title & Quick Info */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="text-[11px] font-mono text-red-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SAMYAK 2026 OFFICIAL EVENT</span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-heading text-white tracking-tight leading-tight">
                {event.title}
              </h1>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-neutral-900/60 border-t border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-neutral-500">Date</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-white">{event.date}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-neutral-500">Time</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-white">{event.time}</span>
              </div>
            </div>

            {event.prize && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-neutral-500">Prize Pool</span>
                <span className="text-xs sm:text-sm font-heading font-black text-red-400">{event.prize}</span>
              </div>
            </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-neutral-500">Venue</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-white truncate max-w-[140px] block" title={event.venue}>
                  {event.venue}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout: Left Details + Right Registration Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Event Description */}
            <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                <ShieldCheck className="w-4 h-4 text-red-500" />
                <span>Event Overview</span>
              </div>
              <p className="text-sm sm:text-base text-slate-300 font-cyber leading-relaxed">
                {event.fullDescription || event.shortDescription}
              </p>
              {event.eligibility && (
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 mt-4">
                  <span className="text-[11px] font-mono uppercase text-red-400 font-bold block mb-1">
                    Eligibility:
                  </span>
                  <span className="text-xs sm:text-sm text-neutral-300 font-cyber">
                    {event.eligibility}
                  </span>
                </div>
              )}
            </div>

            {/* Rules & Guidelines */}
            {event.rules && event.rules.length > 0 && (
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  <span>Competition Rules &amp; Regulations</span>
                </div>
                <ul className="space-y-2.5">
                  {event.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300 font-cyber">
                      <span className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-mono text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="flex-1 leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Coordinators Contact Section */}
            {event.coordinators && event.coordinators.length > 0 && (
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                  <Users className="w-4 h-4 text-red-500" />
                  <span>Event Coordinators &amp; Leads</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {event.coordinators.map((coord, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                      <div>
                        <div className="font-heading font-bold text-sm text-white">{coord.name}</div>
                        <div className="text-[11px] font-mono text-red-400">{coord.role}</div>
                      </div>
                      {coord.phone && (
                        <a
                          href={`tel:${coord.phone}`}
                          className="p-2.5 rounded-xl bg-neutral-900 hover:bg-red-600 text-neutral-400 hover:text-white transition-colors"
                          title={`Call ${coord.name}`}
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event Media & Visual Showcase */}
            {event.gallery && event.gallery.length > 0 && (
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-6">
                <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider border-b border-neutral-800 pb-3">
                  <ImageIcon className="w-4 h-4 text-red-500" />
                  <span>Visual Showcase &amp; Photo Archives</span>
                </div>

                {/* Showcase Gallery Photos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {event.gallery.map((imgUrl, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setLightboxImage(imgUrl)}
                      className="group relative aspect-video rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden cursor-pointer shadow-md"
                    >
                      <img
                        src={imgUrl}
                        alt={`${event.title} Showcase ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="p-2 rounded-full bg-red-600/90 text-white">
                          <Eye className="w-4 h-4" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Tag className="w-4 h-4 text-neutral-500" />
                {event.tags.map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-400">
                    #{t}
                  </span>
                ))}
              </div>
            )}

          </div>

          {/* Right Action / Registration Card */}
          <div className="space-y-6">
            <div className="sticky top-28 p-6 sm:p-8 rounded-3xl bg-neutral-950/95 border-2 border-red-500/50 shadow-[0_0_40px_rgba(223,37,49,0.25)] space-y-6">
              
              <div className="border-b border-neutral-800 pb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">
                  Registration Pass Fee
                </span>
                <div className="text-3xl sm:text-4xl font-black font-heading text-white">
                  {event.fee || 'Free'}
                </div>
                <span className="text-[11px] font-mono text-red-400 mt-1 block">
                  Includes digital delegate pass &amp; certificate
                </span>
              </div>

              {/* Feedback Alert */}
              <AnimatePresence>
                {regFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                      regFeedback.type === 'success' 
                        ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                        : regFeedback.type === 'info'
                        ? 'bg-blue-950/80 border-blue-500/50 text-blue-300'
                        : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                    }`}
                  >
                    {regFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    )}
                    <span>{regFeedback.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Real-time Seat Capacity Tracker */}
              <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-red-400" />
                    Seat Availability
                  </span>
                  {isFull ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950 border border-red-500/60 text-red-400 font-bold uppercase">
                      Seats Full
                    </span>
                  ) : isClosed ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/60 text-amber-300 font-bold uppercase">
                      Registration Closed
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-400 font-bold uppercase">
                      Seats Open
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="text-xl font-heading font-black text-white">
                    {availableSeats} <span className="text-xs font-mono font-normal text-neutral-400">/ {capacity} left</span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {regCount} enrolled
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      isFull 
                        ? 'bg-red-500' 
                        : availableSeats < 15 
                        ? 'bg-amber-500' 
                        : 'bg-gradient-to-r from-red-600 to-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((regCount / capacity) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Action Button Section */}
              {isCancelled ? (
                <div className="space-y-3">
                  <div className="w-full py-3.5 px-4 rounded-2xl bg-red-950/80 border-2 border-red-500/80 text-red-300 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                    <Ban className="w-4 h-4 text-red-400" />
                    <span>Event Cancelled</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
                    <p className="text-xs font-cyber font-bold text-red-300">
                      Please register for another because this event was cancelled.
                    </p>
                    <p className="text-[11px] font-mono text-neutral-400">
                      Check the alternative events happening at the same time below.
                    </p>
                    <a
                      href="#same-time-events"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 text-xs font-mono font-bold transition-colors cursor-pointer"
                    >
                      <span>View Same-Time Events</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : activeTicket ? (
                <div className="space-y-2.5">
                  <div className="w-full py-3 px-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Slot Confirmed ({activeTicket.ticket_code})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-red-400" />
                    <span>View Digital Ticket Pass</span>
                  </button>
                </div>
              ) : timeConflict.hasConflict ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-amber-950/60 border-2 border-amber-500/80 text-amber-200 space-y-2 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="font-heading font-black text-xs uppercase tracking-wider text-amber-300">
                        Time Slot Conflict
                      </span>
                    </div>
                    <p className="text-xs font-cyber leading-relaxed text-amber-100 font-bold">
                      You are already registered for &quot;{timeConflict.conflictingEvent?.title || timeConflict.conflictingEvent?.event_title}&quot; at this time ({timeConflict.conflictingEvent?.time || timeConflict.conflictingEvent?.event_time}).
                    </p>
                    <p className="text-[11px] font-mono text-neutral-400 leading-normal">
                      Per fest regulations, overlapping event enrollments are restricted. If that event is cancelled or deregistered by administrators, this slot will automatically open.
                    </p>
                    {timeConflict.conflictingEvent?.event_id && (
                      <div className="pt-1">
                        <Link
                          to={`/events/${timeConflict.conflictingEvent.event_id}`}
                          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-400 hover:underline"
                        >
                          <span>View Enrolled Event &rarr;</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500 font-heading font-black text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4 text-neutral-600" />
                    <span>Slot Blocked (Time Conflict)</span>
                  </button>
                </div>
              ) : isFull ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500 font-heading font-black text-xs uppercase tracking-wider cursor-not-allowed"
                  >
                    Seats Full / Capacity Reached
                  </button>
                  <p className="text-[11px] text-center font-mono text-neutral-500">
                    All {capacity} slots for this arena have been reserved.
                  </p>
                </div>
              ) : isClosed ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500 font-heading font-black text-xs uppercase tracking-wider cursor-not-allowed"
                  >
                    Enrollment Closed
                  </button>
                  <p className="text-[11px] text-center font-mono text-neutral-500">
                    Registration deadline has passed or enrollment is closed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {isRegistrationCancelled && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 text-[11px] font-mono text-amber-300">
                      ℹ️ Your previous registration for this event was cancelled. You may re-register below.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(223,37,49,0.6)] flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Register Now ({availableSeats} Seats Left)</span>
                  </button>

                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 px-1">
                    <Link to="/profile" className="text-red-400 hover:underline">
                      Delegate Profile &rarr;
                    </Link>
                    <Link to="/payment" className="text-red-400 hover:text-red-300 font-bold">
                      PAY EVENT FEE &amp; PASS &rarr;
                    </Link>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2 text-xs font-mono text-neutral-400">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
                  <span>Host Department:</span>
                  <span className="font-bold text-white">{event.department || 'KL University'}</span>
                </div>
                {event.club && (
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
                    <span>Organizing Club:</span>
                    <span className="font-bold text-red-400">{event.club}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
                  <span>Category:</span>
                  <span className="font-bold text-white">{event.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold">{event.registrationStatus || 'Open'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-[11px] font-cyber text-neutral-400 leading-relaxed text-center">
                Need team accommodation or travel assistance? Reach out via our <Link to="/contact" className="text-red-400 hover:underline">Contact Desk</Link>.
              </div>

            </div>
          </div>

        </div>

        {/* If Cancelled: Alternative Events Happening At The Same Time Section */}
        {isCancelled && (
          <div id="same-time-events" className="mt-12 p-6 sm:p-8 rounded-3xl bg-neutral-950/90 border-2 border-red-500/50 shadow-[0_0_50px_rgba(223,37,49,0.2)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Alternative Options · Same Slot ({event.time || 'Schedule'})</span>
                </div>
                <h3 className="text-xl sm:text-3xl font-black font-heading text-white tracking-tight uppercase">
                  Events Happening At The Same Time
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 font-cyber mt-1">
                  Because this event was cancelled, you can register for any of these open events happening at the same time:
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono text-red-300 font-bold">
                  {alternativeEvents.length} Alternative{alternativeEvents.length === 1 ? '' : 's'} Available
                </span>
              </div>
            </div>

            {alternativeEvents.length === 0 ? (
              <div className="p-8 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center space-y-3">
                <Clock className="w-8 h-8 text-neutral-500 mx-auto" />
                <p className="text-sm font-cyber text-neutral-400">
                  No other competitions found directly matching this time slot.
                </p>
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <span>Explore All Events</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {alternativeEvents.map((altEv) => (
                  <div
                    key={altEv.id}
                    onClick={() => {
                      navigate(`/events/${altEv.id}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-red-500/80 p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between space-y-3 shadow-lg"
                  >
                    <div className="space-y-3">
                      {/* 16:10 Aspect Poster */}
                      <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-neutral-950">
                        <img
                          src={altEv.image || '/hero-bg.png'}
                          alt={altEv.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { e.currentTarget.src = '/hero-bg.png'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold bg-black/85 border border-red-500/40 text-red-300">
                            {altEv.category}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950 border border-emerald-500 text-emerald-400">
                            Open
                          </span>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-neutral-300">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-red-400" />
                            <span>{altEv.time}</span>
                          </span>
                          <span className="text-neutral-400 truncate max-w-[120px]">{altEv.venue}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-heading font-black text-white text-base leading-snug line-clamp-1 group-hover:text-red-400 transition-colors">
                          {altEv.title}
                        </h4>
                        <p className="text-xs text-neutral-400 font-cyber line-clamp-2 mt-1">
                          {altEv.shortDescription || altEv.fullDescription || `Hosted by ${altEv.department || 'KL University'}`}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                      <span className="text-xs font-heading font-black text-amber-400">
                        {altEv.prize ? `Prize: ${altEv.prize}` : (altEv.fee ? `Fee: ${altEv.fee}` : 'Free Entry')}
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-heading font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 group-hover:shadow-[0_0_15px_rgba(223,37,49,0.5)] transition-all cursor-pointer"
                      >
                        <span>Register</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Event Registration & Digital Pass Modal */}
      <EventRegistrationModal
        event={event}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        existingTicket={activeTicket}
        allEvents={allEvents}
        onRegistered={(newTicket) => {
          setExistingTicket(newTicket);
          setRegFeedback({
            type: 'success',
            message: 'Successfully registered for this event! Your digital pass is ready below.'
          });
        }}
      />

      {/* Showcase Image Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-neutral-900/90 text-white hover:bg-red-600 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
              <img
                src={lightboxImage}
                alt="Event Showcase"
                className="max-h-[85vh] w-auto object-contain"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

