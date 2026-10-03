import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, Search, Calendar, MapPin, 
  ArrowRight, RefreshCw, X, AlertCircle, ShieldCheck
} from 'lucide-react';
import { useUser } from '../data/useUser';
import { 
  subscribeWorkshops, 
  WORKSHOP_CATEGORIES, 
  DEFAULT_WORKSHOPS 
} from '../services/workshopService';
import { pageVariants } from '../animations/pageAnimations';
import { FEST_FEE } from '../config/paymentConfig';

export default function WorkshopsPage() {
  const { currentUser, userData } = useUser();
  const isKluUser = Boolean(
    userData?.category === 'INTERNAL' ||
    (userData?.university || userData?.college || '').toLowerCase().includes('kl') ||
    userData?.collegeChoice === 'kl_university' ||
    userData?.email?.endsWith('@kluniversity.in')
  );
  const isPaymentVerified = Boolean(userData?.paymentStatus === 'VERIFIED' || userData?.status === 'verified');
  const hasGatePass = Boolean(
    userData?.gatePassStatus === 'ISSUED' ||
    userData?.gatePassToken ||
    userData?.gatePass?.token ||
    isKluUser
  );
  const isEligibleWithGatePass = Boolean(currentUser && isPaymentVerified && hasGatePass);

  const [workshops, setWorkshops] = useState(DEFAULT_WORKSHOPS);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to live workshops
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

  // Filtered workshops
  const filteredWorkshops = useMemo(() => {
    return workshops
      .filter((ws) => {
        const matchCat = activeCategory === 'All' || ws.category === activeCategory;
        const q = searchQuery.toLowerCase().trim();
        const matchSearch = !q || 
          ws.title.toLowerCase().includes(q) ||
          (ws.instructor && ws.instructor.toLowerCase().includes(q)) ||
          (ws.category && ws.category.toLowerCase().includes(q)) ||
          (ws.venue && ws.venue.toLowerCase().includes(q)) ||
          (ws.shortDescription && ws.shortDescription.toLowerCase().includes(q));

        return matchCat && matchSearch;
      })
      .sort((a, b) => {
        const orderA = a.displayOrder !== undefined && a.displayOrder !== '' && a.displayOrder !== null ? Number(a.displayOrder) : (a.order !== undefined ? Number(a.order) : 9999);
        const orderB = b.displayOrder !== undefined && b.displayOrder !== '' && b.displayOrder !== null ? Number(b.displayOrder) : (b.order !== undefined ? Number(b.order) : 9999);
        if (orderA !== orderB) return orderA - orderB;
        return (a.title || '').localeCompare(b.title || '');
      });
  }, [workshops, activeCategory, searchQuery]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 sm:pt-28 min-h-screen bg-black text-slate-100 pb-20 selection:bg-red-600 selection:text-white"
    >
      {/* Background ambient lighting */}
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
        
        {/* Page Hero Header */}
        <div className="text-center max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/60 border border-red-500/40 text-xs font-mono uppercase tracking-widest text-red-400 font-bold shadow-[0_0_20px_rgba(223,37,49,0.3)]">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            <span>Technical Mastery &amp; Industrial Bootcamps</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-heading text-white tracking-tight uppercase leading-none">
            SAMYAK <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-glow-red">WORKSHOPS</span>
          </h1>

          <p className="text-xs sm:text-base text-neutral-400 font-cyber max-w-2xl mx-auto leading-relaxed">
            Hands-on deep-tech masterclasses led by principal engineers. Master LLM agents, cloud penetration testing, micro-ROS robotics, and smart contract security with industry certification.
          </p>

          {/* Workshop Registration Eligibility Callout Pill */}
          {isEligibleWithGatePass ? (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 max-w-2xl mx-auto flex items-start sm:items-center gap-3 text-left shadow-[0_0_25px_rgba(16,185,129,0.2)]">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-xs font-mono">
                <span className="text-white font-bold block sm:inline">✓ ₹{FEST_FEE} Fest Pass Verified · Gate Pass Active: </span>
                <span className="text-emerald-300">You are eligible to register for workshops with your verified Gate Pass at no additional cost!</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-neutral-900/90 border border-red-500/40 max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left shadow-[0_0_25px_rgba(223,37,49,0.15)]">
              <div className="flex items-start sm:items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs font-mono">
                  <span className="text-white font-bold block sm:inline">Workshop Registration Policy: </span>
                  <span className="text-neutral-300">Register with the ₹{FEST_FEE}/- Fest Entry Pass. Once verified and your Gate Pass is generated, you unlock workshop registration!</span>
                </div>
              </div>
              <Link
                to="/payment"
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-[11px] font-bold uppercase whitespace-nowrap self-start sm:self-auto transition-colors shadow-md"
              >
                Get Pass ₹{FEST_FEE} &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Search & Category Filter Navigation */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
              {WORKSHOP_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(223,37,49,0.5)] border border-red-500'
                      : 'bg-neutral-900/90 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72 flex-shrink-0">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search workshops, speakers, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Workshops Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
            <span className="text-xs font-mono text-neutral-400">Loading technical bootcamps...</span>
          </div>
        ) : filteredWorkshops.length === 0 ? (
          <div className="py-20 text-center space-y-3 p-8 rounded-3xl bg-neutral-950/60 border border-neutral-900">
            <Sparkles className="w-12 h-12 text-neutral-600 mx-auto" />
            <h3 className="text-xl font-heading font-black text-white uppercase">No Workshops Match Your Filter</h3>
            <p className="text-xs text-neutral-500 font-cyber">Try selecting another domain or clearing your search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredWorkshops.map((ws) => {
              const isSeatsFilled = (ws.availableSeats !== undefined && Number(ws.availableSeats) <= 0) ||
                                    ws.status === 'Seats Full' || 
                                    ws.status === 'Closed' ||
                                    (ws.capacity && ws.registeredCount && Number(ws.registeredCount) >= Number(ws.capacity));

              return (
                <div
                  key={ws.id}
                  className="rounded-3xl bg-neutral-950/80 border border-neutral-800/90 hover:border-red-500/60 transition-all duration-300 overflow-hidden flex flex-col justify-between group shadow-[0_4px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_0_35px_rgba(223,37,49,0.25)]"
                >
                  <div>
                    {/* Poster Image Box - 1080x1350 Aspect Ratio (4:5) with crystal clear visibility */}
                    <Link to={`/workshops/${ws.id}`} className="relative aspect-[1080/1350] w-full bg-neutral-950 overflow-hidden flex items-center justify-center block group/poster">
                      {/* Ambient backdrop glow */}
                      <img
                        src={ws.posterUrl || '/hero-bg.png'}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-lg opacity-25 scale-105 pointer-events-none"
                      />

                      {/* Main 1080x1350 poster rendered with crisp clarity */}
                      <img
                        src={ws.posterUrl || '/hero-bg.png'}
                        alt={ws.title}
                        className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.src = '/hero-bg.png'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none z-10" />

                      {/* Price / Gate Pass Badge */}
                      <div className="absolute top-4 right-4 z-20">
                        {isEligibleWithGatePass ? (
                          <div className="px-3 py-1.5 rounded-2xl bg-emerald-950/95 border-2 border-emerald-500 text-emerald-300 font-mono font-bold text-xs shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Gate Pass Verified</span>
                          </div>
                        ) : (
                          <div className="px-4 py-1.5 rounded-2xl bg-emerald-950/95 border-2 border-emerald-500 text-emerald-400 font-heading font-black text-base sm:text-lg shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                            ₹{ws.price}
                          </div>
                        )}
                      </div>

                      {/* Branch / Department Badge — bottom-left of poster */}
                      {(ws.branch || ws.department || ws.organizedBy) && (
                        <div className="absolute bottom-16 left-4 z-20">
                          <span className="px-2.5 py-1 rounded-lg bg-red-900/80 border border-red-500/60 text-red-200 font-mono text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow">
                            {ws.branch || ws.department || ws.organizedBy}
                          </span>
                        </div>
                      )}

                      {/* Title in Poster Overlay */}
                      <div className="absolute bottom-4 left-4 right-4 z-20">
                        <h3 className="font-heading font-black text-white text-lg sm:text-xl leading-snug line-clamp-2 group-hover:text-red-400 transition-colors drop-shadow-lg">
                          {ws.title}
                        </h3>
                      </div>
                    </Link>

                    {/* Workshop Details Strip */}
                    <div className="p-6 space-y-4">
                      {/* Date, Time, Venue */}
                      <div className="space-y-2 text-xs font-mono text-neutral-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span className="text-white font-bold">{ws.date}</span>
                          <span>•</span>
                          <span>{ws.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span className="truncate">{ws.venue}</span>
                        </div>
                      </div>

                      {/* Branch / Department Tag */}
                      {(ws.branch || ws.department || ws.organizedBy) && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Dept:</span>
                          <span className="px-2.5 py-1 rounded-lg bg-red-950/70 border border-red-500/50 text-red-300 font-mono text-[10px] font-bold uppercase tracking-wider">
                            {ws.branch || ws.department || ws.organizedBy}
                          </span>
                        </div>
                      )}

                      {/* Instructor */}
                      {ws.instructor && (
                        <div className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 font-heading font-bold text-sm flex-shrink-0">
                            {ws.instructor.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono uppercase text-neutral-500 block leading-tight">Lead Instructor</span>
                            <span className="text-xs font-heading font-bold text-white truncate block">{ws.instructor}</span>
                            {ws.instructorOrg && (
                              <span className="text-[10px] font-mono text-red-400 truncate block">{ws.instructorOrg}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Short Description */}
                      <p className="text-xs text-neutral-300 font-cyber line-clamp-2 leading-relaxed">
                        {ws.shortDescription || ws.fullDescription}
                      </p>

                      {/* Capacity Indicator */}
                      <div className="space-y-1 pt-2">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-neutral-500">Available Seats:</span>
                          <span className={`font-bold ${isSeatsFilled ? 'text-amber-400 font-black' : 'text-emerald-400'}`}>
                            {isSeatsFilled ? '0 slots left · Sold Out' : `${ws.availableSeats ?? 20} slots left`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isSeatsFilled ? 'bg-amber-500' : 'bg-gradient-to-r from-red-600 to-rose-500'}`}
                            style={{
                              width: `${isSeatsFilled ? 100 : Math.min(100, Math.round(((ws.registeredCount || 0) / (ws.capacity || 60)) * 100))}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom CTA Button / Seats Full Action */}
                  <div className="p-6 pt-0">
                    {isSeatsFilled ? (
                      <div className="space-y-2">
                        <div className="w-full py-3 px-3 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-300 font-heading font-black text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>All seats filled · Register for another event</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            to={`/workshops/${ws.id}`}
                            className="py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-mono text-xs text-center block transition-colors border border-neutral-800"
                          >
                            Details
                          </Link>
                          <Link
                            to="/events"
                            className="py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/70 text-red-300 hover:text-white font-mono text-xs font-bold text-center block transition-colors border border-red-500/40"
                          >
                            Other Events &rarr;
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <Link
                        to={`/workshops/${ws.id}`}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(223,37,49,0.5)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-102 active:scale-98"
                      >
                        {isEligibleWithGatePass ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-300" />
                            <span>Register with Gate Pass</span>
                          </>
                        ) : (
                          <>
                            <span>View Details &amp; Register</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
