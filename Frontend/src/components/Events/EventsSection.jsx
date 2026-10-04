import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Sparkles, ArrowRight, LayoutGrid, Box, 
  Filter, RefreshCw, ChevronDown, Check, X, Radio
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EVENTS_DATA, EVENT_CATEGORIES, compareEventsByOrderAndTime } from '../../data/events';
import { useSiteContent } from '../../context/SiteContentContext';
import EventCard from '../EventCard/EventCard';
import Events3DArena from './Events3DArena';
import EventsHandDeck from './EventsHandDeck';


import { useTheme } from '../../context/ThemeContext';

// "AI & DS" -> "aids", "ECE / IoT" -> ["ece", "iot"]: tolerant matching for hand-typed labels.
const normalizeKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const splitKeys = (value) => String(value || '').split('/').map(normalizeKey).filter(Boolean);

export default function EventsSection({ 
  limit = null, 
  showFilter = true, 
  showViewAll = true,
  isHomePage = false,
}) {
  const { isLight } = useTheme();
  const { events: siteEvents, departments } = useSiteContent();
  const navigate = useNavigate();
  const allEvents = useMemo(() => {
    const raw = siteEvents && siteEvents.length > 0 ? siteEvents : EVENTS_DATA;
    return raw.filter((e) => {
      if (!e) return false;
      if (e.id === 'poster-samyak-the-technical-odyssey') return false;
      const title = (e.title || '').toLowerCase();
      if (title.includes('the technical odyssey')) return false;
      const vid = (e.video || '').toLowerCase();
      if (vid.includes('tech-vid.mp4')) return false;
      return true;
    });
  }, [siteEvents]);

  // Active Filter States
  const [activeDept, setActiveDept] = useState('All');
  const [activeClub, setActiveClub] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  // Dropdown States
  const [subFilterDropdownOpen, setSubFilterDropdownOpen] = useState(false);
  const subFilterRef = useRef(null);
  
  // View mode (deck on home page for rich interactive card animation; grid for events page)
  const [viewMode, setViewMode] = useState(isHomePage ? 'deck' : 'grid');

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (subFilterRef.current && !subFilterRef.current.contains(e.target)) {
        setSubFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync category and dept filter with URL parameters
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      const match = EVENT_CATEGORIES.find((c) => c.toLowerCase() === cat.toLowerCase());
      if (match) setActiveCategory(match);
    }
    const dept = searchParams.get('dept');
    if (dept) {
      setActiveDept(dept);
    }
  }, [searchParams]);

  // Find active department object
  const currentDeptObj = useMemo(() => {
    if (activeDept === 'All') return null;
    return departments?.find(
      (d) => d.code.toLowerCase() === activeDept.toLowerCase() || d.id === activeDept.toLowerCase()
    ) || null;
  }, [departments, activeDept]);

  // Events of the active department (by department text, tag, or a club the department owns).
  const deptEvents = useMemo(() => {
    if (activeDept === 'All') return allEvents;
    const keys = new Set([activeDept, currentDeptObj?.code, currentDeptObj?.id, currentDeptObj?.name].map(normalizeKey).filter(Boolean));
    const deptClubKeys = new Set((currentDeptObj?.clubs || []).map(normalizeKey).filter(Boolean));
    return allEvents.filter((e) =>
      splitKeys(e.department).some((k) => keys.has(k)) ||
      // Tags only count when the event has no department (older events had a stale 'CSE' tag).
      (!splitKeys(e.department).length && (e.tags || []).some((t) => keys.has(normalizeKey(t)))) ||
      splitKeys(e.club).some((k) => deptClubKeys.has(k))
    );
  }, [allEvents, activeDept, currentDeptObj]);

  // Configured clubs first, then clubs that only appear on this department's events.
  const deptClubs = useMemo(() => {
    if (!currentDeptObj) return [];
    const list = [...(currentDeptObj.clubs || [])];
    const seen = new Set(list.map(normalizeKey));
    deptEvents.forEach((e) => {
      String(e.club || '').split('/').map((c) => c.trim()).filter(Boolean).forEach((c) => {
        if (!seen.has(normalizeKey(c))) { seen.add(normalizeKey(c)); list.push(c); }
      });
    });
    return list;
  }, [currentDeptObj, deptEvents]);

  // Handle department selection
  const handleSelectDepartment = (deptCode) => {
    setActiveDept(deptCode);
    setActiveClub('All');
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
    let result = [...deptEvents];

    // 1-2. Department is applied in deptEvents; Sub-filter / Club
    if (activeDept !== 'All' && activeClub !== 'All') {
      const qClub = normalizeKey(activeClub);
      result = result.filter((e) => {
        const clubKeys = splitKeys(e.club);
        if (clubKeys.length) {
          return clubKeys.some((c) => c === qClub || (c.length >= 3 && qClub.length >= 3 && (c.includes(qClub) || qClub.includes(c))));
        }
        return normalizeKey(e.title).includes(qClub);
      });
    }

    // 3. Category Filter
    if (activeCategory !== 'All') {
      const qCat = activeCategory.trim().toLowerCase();
      result = result.filter((e) => (e.category || '').trim().toLowerCase() === qCat);
    }

    // 4. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          (e.title || '').toLowerCase().includes(q) ||
          (e.category && e.category.toLowerCase().includes(q)) ||
          (e.department && e.department.toLowerCase().includes(q)) ||
          (e.club && e.club.toLowerCase().includes(q)) ||
          (e.shortDescription && e.shortDescription.toLowerCase().includes(q)) ||
          (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // 5. Sorting
    if (sortBy === 'prize-desc') {
      result.sort((a, b) => parsePrize(b.prize) - parsePrize(a.prize));
    } else if (sortBy === 'prize-asc') {
      result.sort((a, b) => parsePrize(a.prize) - parsePrize(b.prize));
    } else if (sortBy === 'newest') {
      result.reverse();
    } else {
      result.sort(compareEventsByOrderAndTime);
    }

    if (limit) {
      return result.slice(0, limit);
    }

    return result;
  }, [deptEvents, activeDept, activeClub, activeCategory, searchQuery, sortBy, limit]);

  const hasActiveFilters = activeDept !== 'All' || activeClub !== 'All' || activeCategory !== 'All' || searchQuery !== '';

  const handleResetFilters = () => {
    setActiveDept('All');
    setActiveClub('All');
    setActiveCategory('All');
    setSearchQuery('');
    setSortBy('featured');
  };

  return (
    <section id="events" className={`relative ${isHomePage ? 'py-20 sm:py-28' : 'py-4 sm:py-8'} overflow-hidden select-none transition-colors duration-300 ${
      isLight ? 'bg-white text-slate-900' : 'bg-black text-white'
    }`}>
      {/* Background Volumetric Glows */}
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[160px] pointer-events-none ${
        isLight ? 'bg-red-600/[0.04]' : 'bg-red-600/[0.07]'
      }`} />
      <div className={`absolute bottom-10 right-0 w-96 h-96 rounded-full blur-[140px] pointer-events-none ${
        isLight ? 'bg-rose-600/[0.04]' : 'bg-red-600/[0.08]'
      }`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* =====================================================================
            SECTION HEADER & COMMAND TOOLBAR
            ===================================================================== */}
        <div className={`flex flex-col lg:flex-row lg:items-end justify-between ${isHomePage ? 'mb-8 sm:mb-10' : 'mb-4 sm:mb-6'} gap-4 sm:gap-6`}>
          {isHomePage ? (
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest mb-3 ${
                isLight
                  ? 'border border-red-600/30 text-red-700 bg-red-50/80 shadow-xs'
                  : 'cyber-glass border border-red-500/30 text-red-400 shadow-[0_0_12px_rgba(223,37,49,0.2)]'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span>// SAMYAK ARENAS 2026</span>
              </div>
              
              <h2 className={`text-3xl sm:text-5xl lg:text-6xl font-black font-heading tracking-tight uppercase ${
                isLight ? '!text-slate-900' : '!text-white'
              }`}>
                FLAGSHIP <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-glow-red">EVENTS &amp; ARENAS</span>
              </h2>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Catalog &amp; Interactive Filtering</span>
            </div>
          )}

          {/* Quick Controls: Telemetry Pill, View Switcher & Cyber Search */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Live Count Chip */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono border ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-700 shadow-xs' : 'bg-neutral-900/80 border-neutral-800 text-neutral-300'
            }`}>
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>
                <strong className={isLight ? "text-slate-900 font-bold" : "text-white font-bold"}>{filteredEvents.length}</strong> Arenas Active
              </span>
            </div>

            {/* View Mode Switcher (Visible on Home Page) */}
            {isHomePage && (
              <div className={`flex items-center p-1 rounded-xl border ${
                isLight ? 'bg-slate-100 border-slate-300 shadow-xs' : 'bg-neutral-900/80 border-neutral-800 shadow-inner'
              }`}>
                <button
                  type="button"
                  onClick={() => setViewMode('deck')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    viewMode === 'deck'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md font-bold'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>CARD DECK</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    viewMode === '3d'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md font-bold'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>SIDE SCROLLER</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md font-bold'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>GRID</span>
                </button>
              </div>
            )}

            {/* Cyber Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
              <input
                type="text"
                placeholder="Search CSE, RPA, bots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-9 py-2 rounded-xl text-xs font-cyber border transition-all ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:ring-1 focus:ring-red-600/30 shadow-xs'
                    : 'bg-neutral-900/80 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 shadow-inner'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer ${
                    isLight ? 'text-slate-400 hover:text-slate-800' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        </div>

        {/* =====================================================================
            UNIFIED FILTER COMMAND DECK
            ===================================================================== */}
        {showFilter && (
          <div className="relative z-30 space-y-3 mb-8">
            
            {/* ROW 1: Academic Departments Filter Strip */}
            <div className="relative">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                {/* All Departments Button */}
                <button
                  type="button"
                  onClick={() => handleSelectDepartment('All')}
                  className={`px-4 py-2 rounded-xl text-xs font-heading font-black tracking-wider uppercase whitespace-nowrap transition-all duration-300 cursor-pointer flex items-center gap-2 flex-shrink-0 ${
                    activeDept === 'All'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md border border-red-500 scale-[1.02]'
                      : isLight
                        ? 'bg-white text-slate-700 border border-slate-300 hover:text-red-700 hover:border-red-300 shadow-xs'
                        : 'bg-neutral-950/80 text-neutral-400 border border-neutral-800/90 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <span>All Departments</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeDept === 'All' 
                      ? 'bg-black/30 text-white' 
                      : isLight ? 'bg-slate-100 text-slate-600' : 'bg-neutral-900 text-neutral-400'
                  }`}>
                    45+
                  </span>
                </button>

                {/* Dynamic Department Pills */}
                {departments?.map((dept) => {
                  const isActive = activeDept.toLowerCase() === dept.code.toLowerCase();
                  return (
                    <button
                      key={dept.id || dept.code}
                      type="button"
                      onClick={() => handleSelectDepartment(dept.code)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-heading font-black tracking-wider uppercase whitespace-nowrap transition-all duration-300 cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md border border-red-500 scale-[1.02]'
                          : isLight
                            ? 'bg-white text-slate-700 border border-slate-300 hover:text-red-700 hover:border-red-300 shadow-xs'
                            : 'bg-neutral-950/80 text-neutral-400 border border-neutral-800/90 hover:text-white hover:border-neutral-700'
                      }`}
                    >
                      <span>{dept.code}</span>
                      {dept.clubs?.length > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive 
                            ? 'bg-black/30 text-white' 
                            : isLight ? 'bg-slate-100 text-slate-600' : 'bg-neutral-900 text-neutral-400'
                        }`}>
                          {dept.clubs.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ROW 2: Balanced Command Deck (Categories + Sub-Filter + Sort + Reset) */}
            <div className={`relative z-30 flex flex-wrap items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl backdrop-blur-md transition-colors ${
              isLight 
                ? 'bg-slate-100/90 border border-slate-300/80 shadow-xs' 
                : 'bg-neutral-950/70 border border-neutral-800/80 shadow-lg'
            }`}>
              
              {/* Left: Fest Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
                <span className={`text-[10px] font-mono uppercase tracking-wider pl-1 pr-1 flex-shrink-0 ${
                  isLight ? 'text-slate-500' : 'text-neutral-500'
                }`}>
                  CATEGORY:
                </span>
                {EVENT_CATEGORIES.map((cat) => {
                  const isCatActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                        isCatActive
                          ? isLight
                            ? 'bg-red-600 text-white font-bold border border-red-600 shadow-xs'
                            : 'bg-neutral-800 text-white font-bold border border-red-500/60 shadow-[0_0_10px_rgba(223,37,49,0.3)]'
                          : isLight
                            ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:border-slate-300 shadow-2xs'
                            : 'bg-neutral-900/50 text-neutral-400 hover:text-neutral-200 border border-transparent hover:border-neutral-800'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Right: Sub-Filter + Reset Action */}
              <div className="flex items-center gap-2 ml-auto">
                
                {/* Department Club Sub-Filter */}
                {activeDept !== 'All' && deptClubs.length > 0 && (
                  <div className="relative z-50" ref={subFilterRef}>
                    <button
                      type="button"
                      onClick={() => setSubFilterDropdownOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono shadow-xs transition-all cursor-pointer border ${
                        isLight
                          ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                          : 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700/80 hover:border-red-500/60'
                      }`}
                    >
                      <span className={isLight ? 'text-slate-500' : 'text-neutral-400'}>Club:</span>
                      <span className="font-bold text-red-600 max-w-[130px] truncate">
                        {activeClub === 'All' ? `All ${currentDeptObj.code}` : activeClub}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isLight ? 'text-slate-500' : 'text-neutral-400'
                      } ${subFilterDropdownOpen ? 'rotate-180 text-red-500' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {subFilterDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute right-0 top-full mt-1.5 z-[100] min-w-[240px] max-w-sm rounded-xl py-1.5 overflow-hidden text-left border ${
                            isLight
                              ? 'bg-white border-slate-200 shadow-xl'
                              : 'bg-neutral-950 border-neutral-700/80 shadow-[0_16px_40px_rgba(0,0,0,0.95)]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveClub('All');
                              setSubFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-mono flex items-center justify-between transition-colors ${
                              activeClub === 'All'
                                ? isLight
                                  ? 'bg-red-50 text-red-700 font-bold border-l-2 border-red-600'
                                  : 'bg-neutral-800/90 text-white font-bold border-l-2 border-red-500'
                                : isLight
                                  ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                            }`}
                          >
                            <span>All {currentDeptObj.code} Arenas</span>
                            {activeClub === 'All' && <Check className="w-3.5 h-3.5 text-red-500" />}
                          </button>

                          <div className={`my-1 border-t ${isLight ? 'border-slate-100' : 'border-neutral-800'}`} />

                          {deptClubs.map((club) => {
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
                                    ? isLight
                                      ? 'bg-red-50 text-red-700 font-bold border-l-2 border-red-600'
                                      : 'bg-neutral-800/90 text-white font-bold border-l-2 border-red-500'
                                    : isLight
                                      ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                                }`}
                              >
                                <span className="truncate pr-2">{club}</span>
                                {isClubActive && <Check className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Reset Filters Button */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    title="Reset all filters"
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono transition-colors cursor-pointer shadow-xs border ${
                      isLight
                        ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                        : 'bg-red-950/50 hover:bg-red-900/60 text-red-300 border-red-500/40'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}

              </div>

            </div>

          </div>
        )}

        {/* =====================================================================
            ARENA VIEWPORT: INTERACTIVE CARD DECK, 3D SCROLLER OR RESPONSIVE GRID
            ===================================================================== */}
        {filteredEvents.length > 0 ? (
          isHomePage && viewMode === 'deck' ? (
            <div className="relative z-10">
              <EventsHandDeck
                events={filteredEvents}
                onSelectEvent={(ev) => navigate(`/events/${ev.id}`)}
              />
            </div>
          ) : isHomePage && viewMode === '3d' ? (
            <div className="relative z-10">
              <Events3DArena
                events={filteredEvents}
                onSelectEvent={(ev) => navigate(`/events/${ev.id}`)}
              />
            </div>
          ) : (
            <motion.div
              layout
              className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
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
          /* High-Tech Empty State */
          <div className={`py-20 text-center rounded-3xl border border-dashed max-w-2xl mx-auto space-y-4 ${
            isLight
              ? 'bg-slate-50/80 border-red-300 shadow-sm'
              : 'cyber-card border-red-500/30'
          }`}>
            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
              isLight ? 'bg-red-50 border border-red-300' : 'bg-red-600/20 border border-red-500/40'
            }`}>
              <Filter className="w-6 h-6 text-red-500" />
            </div>
            
            <h3 className={`text-xl font-heading font-black uppercase tracking-wide ${
              isLight ? '!text-slate-900' : '!text-white'
            }`}>
              No Arenas Match Active Telemetry
            </h3>

            <p className={`font-cyber text-xs sm:text-sm px-6 ${
              isLight ? 'text-slate-600' : 'text-neutral-400'
            }`}>
              No matching events found for {activeClub !== 'All' ? `club "${activeClub}"` : activeDept !== 'All' ? `department "${activeDept}"` : 'the selected criteria'}.
            </p>

            <div className="flex justify-center gap-3 pt-2">
              {activeClub !== 'All' && (
                <button
                  type="button"
                  onClick={() => setActiveClub('All')}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold shadow-[0_0_15px_rgba(223,37,49,0.5)] transition-all cursor-pointer"
                >
                  View All {activeDept} Arenas
                </button>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className={`px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                }`}
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            FLAGSHIP VIEW ALL CTA
            ===================================================================== */}
        {showViewAll && limit && (
          <div className="mt-14 sm:mt-18 text-center">
            <Link
              to="/events"
              className="inline-flex items-center gap-3 px-8 sm:px-10 py-4 rounded-full font-heading text-xs sm:text-sm font-black tracking-widest uppercase text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-500 shadow-[0_0_25px_rgba(223,37,49,0.5)] hover:shadow-[0_0_40px_rgba(223,37,49,0.8)] border border-red-400/50 hover:scale-105 transition-all group"
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
