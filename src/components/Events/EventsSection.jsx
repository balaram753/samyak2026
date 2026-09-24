import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Sparkles, ArrowRight, LayoutGrid, Box, 
  ChevronRight, Filter, RefreshCw, ChevronDown, Check
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { EVENTS_DATA, EVENT_CATEGORIES } from '../../data/events';
import { useSiteContent } from '../../context/SiteContentContext';
import EventCard from '../EventCard/EventCard';
import Events3DArena from './Events3DArena';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'prize-desc', label: 'Prize: High to Low' },
  { value: 'prize-asc', label: 'Prize: Low to High' },
  { value: 'newest', label: 'Newest Arrivals' },
];

export default function EventsSection({ 
  limit = null, 
  showFilter = true, 
  showViewAll = true,
  isHomePage = false,
}) {
  const { events: siteEvents, departments } = useSiteContent();
  const allEvents = siteEvents && siteEvents.length > 0 ? siteEvents : EVENTS_DATA;
  const navigate = useNavigate();

  // Active Filter States
  const [activeDept, setActiveDept] = useState('All');
  const [activeClub, setActiveClub] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  // Amazon-Style Dropdown States (Reference Images 3 & 4)
  const [subFilterDropdownOpen, setSubFilterDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const subFilterRef = useRef(null);
  const sortRef = useRef(null);
  
  // 3D Arena is exclusively shown on the Home page.
  const [viewMode, setViewMode] = useState(isHomePage ? '3d' : 'grid');

  useEffect(() => {
    setViewMode(isHomePage ? '3d' : 'grid');
  }, [isHomePage]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (subFilterRef.current && !subFilterRef.current.contains(e.target)) {
        setSubFilterDropdownOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Find active department object to get its clubs
  const currentDeptObj = useMemo(() => {
    if (activeDept === 'All') return null;
    return departments?.find(
      (d) => d.code.toLowerCase() === activeDept.toLowerCase() || d.id === activeDept.toLowerCase()
    ) || null;
  }, [departments, activeDept]);

  // Handle department selection
  const handleSelectDepartment = (deptCode) => {
    setActiveDept(deptCode);
    setActiveClub('All'); // Reset sub-filter when switching department
    setSubFilterDropdownOpen(false);
  };

  // Helper to parse prize amount for sorting
  const parsePrize = (prizeStr) => {
    if (!prizeStr) return 0;
    const num = prizeStr.replace(/[^0-9]/g, '');
    return num ? parseInt(num, 10) : 0;
  };

  // Filter logic: Department + Sub-filter (Club) + Category + Search + Sort
  const filteredEvents = useMemo(() => {
    let result = [...allEvents];

    // 1. Filter by Department (CSE, ECE, AIDS, Mechanical, Civil, MBA, BCA, Biotech...)
    if (activeDept !== 'All') {
      const qDept = activeDept.trim().toLowerCase();
      result = result.filter((e) => {
        const d = (e.department || '').trim().toLowerCase();
        const tagMatch = e.tags && e.tags.some((t) => t.trim().toLowerCase() === qDept);
        return d === qDept || tagMatch;
      });

      // 2. Strict Filter by Sub-filter / Club (e.g. RPA Club under CSE)
      if (activeClub !== 'All') {
        const qClub = activeClub.trim().toLowerCase();
        result = result.filter((e) => {
          const c = (e.club || '').trim().toLowerCase();
          if (c) {
            return c === qClub || c.includes(qClub) || qClub.includes(c);
          }
          // Fallback only if e.club is undefined
          return (e.title || '').toLowerCase().includes(qClub);
        });
      }
    }

    // 3. Filter by Fest Category (Technical, Cultural, Workshops, Competitions, Gaming, Entertainment)
    if (activeCategory !== 'All') {
      const qCat = activeCategory.trim().toLowerCase();
      result = result.filter((e) => (e.category || '').trim().toLowerCase() === qCat);
    }

    // 4. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.category && e.category.toLowerCase().includes(q)) ||
          (e.department && e.department.toLowerCase().includes(q)) ||
          (e.club && e.club.toLowerCase().includes(q)) ||
          (e.shortDescription && e.shortDescription.toLowerCase().includes(q)) ||
          (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // 5. Amazon-style Sorting
    if (sortBy === 'prize-desc') {
      result.sort((a, b) => parsePrize(b.prize) - parsePrize(a.prize));
    } else if (sortBy === 'prize-asc') {
      result.sort((a, b) => parsePrize(a.prize) - parsePrize(b.prize));
    } else if (sortBy === 'newest') {
      result.reverse();
    } else {
      // featured
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    if (limit) {
      return result.slice(0, limit);
    }

    return result;
  }, [allEvents, activeDept, activeClub, activeCategory, searchQuery, sortBy, limit]);

  const activeSortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Featured';

  return (
    <section id="events" className="relative py-20 sm:py-28 bg-black overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5 text-red-400" />
              Compete &amp; Conquer
            </div>
            <h2 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
              FLAGSHIP <span className="text-red-500 text-glow-red">EVENTS &amp; ARENAS</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-400 font-cyber max-w-xl">
              Filter by academic department, specialized clubs, or festival categories across all 45+ arenas.
            </p>
          </div>

          {/* Search Box & View Mode Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* View Mode Switcher: Visible ONLY on Home page */}
            {isHomePage && (
              <div className="flex items-center p-1 rounded-xl bg-neutral-900/80 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    viewMode === '3d'
                      ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)] font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>3D ARENA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)] font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>GRID</span>
                </button>
              </div>
            )}

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search CSE, RPA, bots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 font-cyber focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>

          </div>
        </div>

        {/* Direct Filter Toolbar: Academic Departments & Sub-Filters */}
        {showFilter && (
          <div className="space-y-4 mb-8">
            
            {/* Filter Header & Reset Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-red-500" />
                  <span className="font-bold text-white">Filter by Department:</span>
                </span>
                {activeDept !== 'All' && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-[10px] font-mono text-red-400">
                    {activeDept} {activeClub !== 'All' ? `› ${activeClub}` : ''}
                  </span>
                )}
              </div>

              {/* Reset Filters & Active Counts */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-neutral-400">
                  Showing <strong className="text-red-400">{filteredEvents.length}</strong> {filteredEvents.length === 1 ? 'event' : 'events'}
                </span>

                {(activeDept !== 'All' || activeClub !== 'All' || activeCategory !== 'All' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDept('All');
                      setActiveClub('All');
                      setActiveCategory('All');
                      setSearchQuery('');
                    }}
                    className="text-[11px] font-mono text-red-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg bg-red-950/40 border border-red-500/30 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset All</span>
                  </button>
                )}
              </div>
            </div>

            {/* LEVEL 1: Academic Department Filter Pills (CSE, ECE, AIDS, Mechanical, Civil, MBA, BCA, Biotech...) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {/* ALL Departments Button */}
              <button
                type="button"
                onClick={() => handleSelectDepartment('All')}
                className={`px-4 py-2 rounded-full text-xs font-cyber tracking-wider uppercase font-medium whitespace-nowrap transition-all duration-300 cursor-pointer ${
                  activeDept === 'All'
                    ? 'bg-red-600 text-white font-bold shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-105'
                    : 'bg-neutral-900/80 text-neutral-400 border border-neutral-800 hover:text-white hover:border-neutral-700'
                }`}
              >
                All Departments
              </button>

              {/* Dynamic Departments from Admin Panel */}
              {departments?.map((dept) => {
                const isActive = activeDept.toLowerCase() === dept.code.toLowerCase();
                return (
                  <button
                    key={dept.id || dept.code}
                    type="button"
                    onClick={() => handleSelectDepartment(dept.code)}
                    className={`px-4 py-2 rounded-full text-xs font-cyber tracking-wider uppercase font-medium whitespace-nowrap transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-red-600 text-white font-bold shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-105'
                        : 'bg-neutral-900/80 text-neutral-400 border border-neutral-800 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    <span>{dept.code}</span>
                    {dept.clubs?.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-black/40 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                        {dept.clubs.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* LEVEL 2: Amazon-Style Sub-Filter & Sort Dropdown Bar (Reference Images 3 & 4) */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Sub-Filter Club Dropdown (Amazon-Style reference Image 3 & 4) */}
                {activeDept !== 'All' && currentDeptObj?.clubs?.length > 0 && (
                  <div className="relative" ref={subFilterRef}>
                    <button
                      type="button"
                      onClick={() => setSubFilterDropdownOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-900 text-white border border-neutral-700 hover:border-red-500/60 shadow-[0_2px_8px_rgba(0,0,0,0.5)] text-xs font-mono transition-all cursor-pointer"
                    >
                      <span className="text-neutral-400">Sub-filter:</span>
                      <span className="font-bold text-red-400">
                        {activeClub === 'All' ? `All ${currentDeptObj.code} Events` : activeClub}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${subFilterDropdownOpen ? 'rotate-180 text-red-500' : ''}`} />
                    </button>

                    {/* Floating Menu matching Image 4 */}
                    <AnimatePresence>
                      {subFilterDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 top-full mt-1.5 z-50 min-w-[260px] max-w-sm rounded-xl bg-neutral-950 border border-neutral-700/80 shadow-[0_12px_32px_rgba(0,0,0,0.9)] py-1.5 overflow-hidden text-left"
                        >
                          {/* Option: All Department Events */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveClub('All');
                              setSubFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-mono flex items-center justify-between transition-colors ${
                              activeClub === 'All'
                                ? 'bg-neutral-800/90 text-white font-bold border-l-2 border-red-500'
                                : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                            }`}
                          >
                            <span>All {currentDeptObj.code} Events</span>
                            {activeClub === 'All' && <Check className="w-3.5 h-3.5 text-red-500" />}
                          </button>

                          <div className="my-1 border-t border-neutral-800" />

                          {/* Department Clubs */}
                          {currentDeptObj.clubs.map((club) => {
                            const isClubActive = activeClub.trim().toLowerCase() === club.trim().toLowerCase();
                            return (
                              <button
                                key={club}
                                type="button"
                                onClick={() => {
                                  setActiveClub(club);
                                  setSubFilterDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs font-mono flex items-center justify-between transition-colors ${
                                  isClubActive
                                    ? 'bg-neutral-800/90 text-white font-bold border-l-2 border-red-500'
                                    : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                                }`}
                              >
                                <span>{club}</span>
                                {isClubActive && <Check className="w-3.5 h-3.5 text-red-500" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Amazon-Style Sort Dropdown (Image 3 & 4) */}
                <div className="relative" ref={sortRef}>
                  <button
                    type="button"
                    onClick={() => setSortDropdownOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-900 text-white border border-neutral-700 hover:border-red-500/60 shadow-[0_2px_8px_rgba(0,0,0,0.5)] text-xs font-mono transition-all cursor-pointer"
                  >
                    <span className="text-neutral-400">Sort by:</span>
                    <span className="font-bold text-white">{activeSortLabel}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${sortDropdownOpen ? 'rotate-180 text-red-500' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {sortDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] rounded-xl bg-neutral-950 border border-neutral-700/80 shadow-[0_12px_32px_rgba(0,0,0,0.9)] py-1.5 overflow-hidden text-left"
                      >
                        {SORT_OPTIONS.map((opt) => {
                          const isSelected = sortBy === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSortBy(opt.value);
                                setSortDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs font-mono flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-neutral-800/90 text-white font-bold border-l-2 border-red-500'
                                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-red-500" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

              {/* Quick Status Pill */}
              {activeDept !== 'All' && (
                <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>Showing {currentDeptObj ? currentDeptObj.name : activeDept} {activeClub !== 'All' ? `› ${activeClub}` : ''}</span>
                </div>
              )}
            </div>

            {/* LEVEL 3: Fest Category Pills (Technical, Cultural, Workshops, Competitions, Gaming, Entertainment) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider pr-1 flex-shrink-0">
                Category:
              </span>
              {EVENT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-neutral-800 text-white font-bold border border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                      : 'bg-neutral-950/70 text-neutral-500 hover:text-neutral-300 border border-neutral-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

          </div>
        )}

        {/* Events Content: 3D Holographic Arena (Home page only) OR Normal Grid View (Events page) */}
        {filteredEvents.length > 0 ? (
          isHomePage && viewMode === '3d' ? (
            <Events3DArena
              events={filteredEvents}
              onSelectEvent={(ev) => navigate(`/events/${ev.id}`)}
            />
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
            >
              <AnimatePresence>
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onSelect={(ev) => navigate(`/events/${ev.id}`)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )
        ) : (
          <div className="py-20 text-center cyber-card rounded-3xl border border-dashed border-neutral-800 space-y-3">
            <p className="text-neutral-300 font-cyber text-sm">
              No events found for {activeClub !== 'All' ? `"${activeClub}"` : activeDept !== 'All' ? `department "${activeDept}"` : 'the selected criteria'}.
            </p>
            <div className="flex justify-center gap-2">
              {activeClub !== 'All' && (
                <button
                  type="button"
                  onClick={() => setActiveClub('All')}
                  className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-mono font-bold"
                >
                  View All {activeDept} Events
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveDept('All');
                  setActiveClub('All');
                  setActiveCategory('All');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* View All Events CTA on Home page */}
        {showViewAll && limit && (
          <div className="mt-16 text-center">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-heading text-xs sm:text-sm font-bold tracking-wider uppercase text-white bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.7)] transition-all group"
            >
              <span>VIEW ALL 45+ SAMYAK EVENTS</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}
