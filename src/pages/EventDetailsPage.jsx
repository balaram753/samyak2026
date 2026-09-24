import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, MapPin, Trophy, ArrowLeft, 
  Sparkles, ShieldCheck, Users, Phone, ExternalLink, CheckCircle2,
  Share2, Tag, Image as ImageIcon, Folder, Eye, X, ChevronRight,
  Info, QrCode
} from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';
import { useUser } from '../data/useUser';
import { EVENTS_DATA } from '../data/events';
import { pageVariants } from '../animations/pageAnimations';
import EventRegistrationModal from '../components/Events/EventRegistrationModal';
import { listenToEventStats, checkStudentAlreadyRegistered } from '../services/eventRegistrationService';

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

  // 1. Live seat stats listener
  useEffect(() => {
    if (!event?.id) return;
    const unsub = listenToEventStats(event.id, (stats) => {
      if (stats) setLiveStats(stats);
    });
    return () => unsub();
  }, [event?.id]);

  // 2. Check if student already has a digital ticket registration in Firestore
  useEffect(() => {
    if (!event?.id) return;
    let isMounted = true;
    const checkUser = async () => {
      if (userData?.email || userData?.rollNo) {
        const ticket = await checkStudentAlreadyRegistered(
          event.id, 
          userData.email, 
          userData.rollNo
        );
        if (isMounted && ticket) {
          setExistingTicket(ticket);
        }
      }
    };
    checkUser();
    return () => { isMounted = false; };
  }, [event?.id, userData?.email, userData?.rollNo]);

  // Real-time capacity & enrollment metrics
  const capacity = Number(liveStats?.capacity ?? event?.capacity ?? 100);
  const regCount = Number(liveStats?.registration_count ?? event?.registration_count ?? 0);
  const availableSeats = Math.max(0, Number(liveStats?.available_seats ?? (capacity - regCount)));
  const isRegOpen = liveStats?.is_registration_open !== false && event?.is_registration_open !== false;
  
  const deadline = liveStats?.registration_deadline || event?.registration_deadline;
  const isPastDeadline = deadline ? (new Date() > new Date(deadline)) : false;

  const isFull = availableSeats <= 0;
  const isClosed = !isRegOpen || isPastDeadline;

  const isAlreadyRegistered = useMemo(() => {
    if (existingTicket) return true;
    if (!event) return false;
    return Boolean(
      userData?.registeredEvents?.some(
        (e) => e.id === event.id || e.title?.toLowerCase() === event.title?.toLowerCase()
      )
    );
  }, [existingTicket, userData?.registeredEvents, event]);

  if (!event) {
    return (
      <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_25px_rgba(239,68,68,0.4)]">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black font-heading tracking-wide mb-2">Event Not Found</h2>
        <p className="text-neutral-400 font-cyber text-sm max-w-md mb-6">
          The requested event could not be found or may have been updated.
        </p>
        <Link
          to="/events"
          className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(239,68,68,0.5)]"
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

        {/* Hero Banner Card */}
        <div className="rounded-3xl border border-red-500/30 overflow-hidden bg-neutral-950/80 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.2)] mb-10">
          <div className="relative h-64 sm:h-96 w-full overflow-hidden bg-neutral-900">
            <img
              src={event.image || '/hero-bg.png'}
              alt={event.title}
              className="w-full h-full object-cover filter contrast-105 brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Badges on Banner */}
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono uppercase font-black tracking-wider bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)]">
                {event.department || 'KL University'}
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
              <span className="px-3 py-1 rounded-full text-xs font-mono uppercase font-bold tracking-wider bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                {event.registrationStatus || 'Registration Open'}
              </span>
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

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-neutral-500">Prize Pool</span>
                <span className="text-xs sm:text-sm font-heading font-black text-red-400">{event.prize}</span>
              </div>
            </div>

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
            <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
                  <ImageIcon className="w-4 h-4 text-red-500" />
                  <span>Visual Showcase &amp; Media Archives</span>
                </div>

                <Link
                  to={`/media?event=${event.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-red-500/40 hover:border-red-500 text-xs font-mono text-red-400 hover:text-white transition-all cursor-pointer w-fit"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Open Media Library</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Showcase Gallery Photos */}
              {event.gallery && event.gallery.length > 0 ? (
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
              ) : (
                <p className="text-xs text-neutral-400 font-cyber">
                  Tournaments, arena photos, and stage captures are preserved in the hierarchical media repository.
                </p>
              )}

              {/* Direct Media Explorer Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-heading font-bold text-white flex items-center gap-2">
                    <Folder className="w-4 h-4 text-red-500" />
                    <span>Per-Event Scoped Media Repository</span>
                  </h4>
                  <p className="text-xs text-neutral-400 font-cyber mt-1">
                    Path: <code className="text-red-400 font-mono text-[11px]">{event.id}/root/</code>
                  </p>
                </div>
                <Link
                  to={`/media?event=${event.id}`}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md flex-shrink-0"
                >
                  <span>Explore Assets</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

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
            <div className="sticky top-28 p-6 sm:p-8 rounded-3xl bg-neutral-950/95 border-2 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.25)] space-y-6">
              
              <div className="border-b border-neutral-800 pb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">
                  Registration Pass Fee
                </span>
                <div className="text-3xl sm:text-4xl font-black font-heading text-white">
                  {event.fee}
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
              {existingTicket ? (
                <div className="space-y-2.5">
                  <div className="w-full py-3 px-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Slot Confirmed ({existingTicket.ticket_code})</span>
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
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(239,68,68,0.6)] flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98 cursor-pointer"
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

      </div>

      {/* Event Registration & Digital Pass Modal */}
      <EventRegistrationModal
        event={event}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        existingTicket={existingTicket}
        onRegistered={(newTicket) => {
          setExistingTicket(newTicket);
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

