import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, ArrowUpRight, Trophy,
  Layers, MousePointerClick
} from 'lucide-react';
import { CardHandGallery } from '@/components/ui/card-hand-gallery';
import { useTheme } from '../../context/ThemeContext';

// Verified, high-resolution festival images existing locally in /public/gallery
const FEST_GALLERY_IMAGES = [
  '/gallery/samyak-01.jpg',
  '/gallery/samyak-02.jpg',
  '/gallery/samyak-03.jpg',
  '/gallery/samyak-04.jpg',
  '/gallery/samyak-05.jpg',
  '/gallery/samyak-06.jpg',
  '/gallery/samyak-07.jpg',
  '/gallery/samyak-08.jpg',
];

/**
 * Accurately maps event titles to their true official graphics or festival photos.
 * Prevents graphic/title mismatches (e.g. Digital Circuit Relay vs 3 Clues).
 */
function resolveEventGraphic(title = '', imagePath = '', index = 0) {
  const normTitle = String(title).toLowerCase();

  // Official named poster matches
  if (normTitle.includes('digital circuit')) {
    return '/events/photo_1_2026-09-28_17-54-19.jpg';
  }
  if (normTitle.includes('logic lockdown')) {
    return '/events/photo_2_2026-09-28_17-54-19.jpg';
  }
  if (normTitle.includes('tech heist')) {
    return '/events/photo_3_2026-09-28_17-54-19.jpg';
  }

  // If the event has a valid remote or gallery image
  if (
    imagePath &&
    (imagePath.startsWith('http://') ||
     imagePath.startsWith('https://') ||
     imagePath.includes('gallery/') ||
     imagePath.startsWith('data:'))
  ) {
    return imagePath;
  }

  // Assign high-resolution SAMYAK festival concert/stage artwork (clean, no conflicting text)
  return FEST_GALLERY_IMAGES[index % FEST_GALLERY_IMAGES.length];
}

export default function EventsHandDeck({ events = [], onSelectEvent }) {
  const navigate = useNavigate();
  const { isLight } = useTheme();

  // 6 flagship events creates the optimal deck (1 active + 5 fanned in the hand)
  const displayEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    if (events.length <= 6) return events;

    // Prioritize official poster arenas and top tech competitions for maximum visual impact
    const priorityKeywords = [
      'digital circuit relay',
      'logic lockdown',
      'tech heist',
      'ai agents unleashed',
      'automation arena',
      'automation driven cyber security',
    ];

    const matched = [];
    const rest = [];

    priorityKeywords.forEach((kw) => {
      const found = events.find(
        (e) => (e.title || '').toLowerCase().includes(kw) && !matched.includes(e)
      );
      if (found) matched.push(found);
    });

    events.forEach((e) => {
      if (!matched.includes(e)) rest.push(e);
    });

    return [...matched, ...rest].slice(0, 6);
  }, [events]);

  const cards = useMemo(() => {
    return displayEvents.map((e, index) => {
      const resolvedImage = resolveEventGraphic(e.title, e.image, index);
      const fallbackImage = FEST_GALLERY_IMAGES[(index + 1) % FEST_GALLERY_IMAGES.length];

      return {
        id: e.id,
        title: e.title,
        src: resolvedImage,
        fallbackSrc: fallbackImage,
        description: e.shortDescription || `${e.category || 'Flagship'} Arena at SAMYAK 2026. Register now to experience high-octane engineering competition.`,
        category: e.category,
        department: e.department,
        prize: e.prize,
        date: e.date,
        fee: e.fee,
        club: e.club,
      };
    });
  }, [displayEvents]);

  const [activeCardId, setActiveCardId] = useState(cards[0]?.id);

  // Sync active id if cards change
  const currentActiveId = cards.some((c) => c.id === activeCardId)
    ? activeCardId
    : cards[0]?.id;

  const handleCardSelected = (card) => {
    setActiveCardId(card.id);
  };

  const handleNavigateToEvent = (card) => {
    if (onSelectEvent) {
      const ev = displayEvents.find((e) => e.id === card.id);
      if (ev) {
        onSelectEvent(ev);
        return;
      }
    }
    navigate(`/events/${card.id}`);
  };

  if (cards.length === 0) return null;

  return (
    <div className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden py-8 sm:py-14 px-3 sm:px-8 select-none transition-colors duration-300 border ${
      isLight
        ? 'bg-gradient-to-b from-slate-50 to-white border-slate-200/90 shadow-[0_12px_45px_rgba(139,21,27,0.07)]'
        : 'bg-neutral-950/95 border-red-500/30 shadow-[0_0_60px_rgba(223,37,49,0.18)]'
    }`}>
      {/* ── Volumetric Ambient Glows ── */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] rounded-full blur-[170px] pointer-events-none ${
        isLight ? 'bg-red-600/[0.04]' : 'bg-red-600/[0.14]'
      }`} />
      <div className="absolute inset-0 bg-[radial-gradient(#DF253108_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Cyber HUD Corner Brackets */}
      <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 z-20 pointer-events-none ${isLight ? 'border-red-600' : 'border-red-500'}`} />
      <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 z-20 pointer-events-none ${isLight ? 'border-red-600' : 'border-red-500'}`} />
      <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 z-20 pointer-events-none ${isLight ? 'border-red-600' : 'border-red-500'}`} />
      <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 z-20 pointer-events-none ${isLight ? 'border-red-600' : 'border-red-500'}`} />

      {/* ── HEADER: Cyber Telemetry & Interactive Hints ── */}
      <div className="relative z-20 mb-6 sm:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4 border-red-500/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full cyber-glass border border-red-500/40 text-xs font-mono text-red-500 uppercase tracking-widest mb-1.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>// INTERACTIVE FAN SHOWCASE</span>
          </div>
          <h3 className={`text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight uppercase ${
            isLight ? '!text-slate-900' : '!text-white'
          }`}>
            INTERACTIVE <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-red-400 text-glow-red">EVENT DECK</span>
          </h3>
        </div>

        {/* Live Interaction Hint */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-mono border backdrop-blur-md ${
            isLight 
              ? 'bg-white/80 border-slate-300 text-slate-700 shadow-xs' 
              : 'bg-neutral-900/80 border-neutral-800 text-neutral-300'
          }`}>
            <MousePointerClick className="w-3.5 h-3.5 text-red-500 animate-bounce" />
            <span className="hidden sm:inline">Tap, swipe or drag cards to inspect</span>
            <span className="sm:hidden">Swipe or tap cards</span>
          </div>

          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border ${
            isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-black/80 border-neutral-800 text-neutral-300'
          }`}>
            <Layers className="w-3.5 h-3.5 text-red-500" />
            <span><strong>{cards.length}</strong> in Hand</span>
          </div>
        </div>
      </div>

      {/* ── CARD HAND GALLERY ANIMATION CONTAINER ── */}
      <div className="relative z-10 w-full flex items-center justify-center my-2 sm:my-4">
        <CardHandGallery
          cards={cards}
          activeId={currentActiveId}
          cardWidth={320}
          className="w-full max-w-7xl"
          onSelect={handleCardSelected}
          onActiveCardClick={handleNavigateToEvent}
          renderAction={(activeCard) => {
            const ev = displayEvents.find((e) => e.id === activeCard.id);
            return (
              <div className="space-y-3 pt-2">
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center gap-2 justify-center lg:justify-start">
                  {activeCard.category && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-black bg-red-600/20 text-red-400 border border-red-500/40">
                      {activeCard.category}
                    </span>
                  )}
                  {activeCard.department && (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {activeCard.department}
                    </span>
                  )}
                  {ev?.prize && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>{ev.prize}</span>
                    </span>
                  )}
                </div>

                {/* Explore Button */}
                <button
                  type="button"
                  onClick={() => handleNavigateToEvent(activeCard)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-heading text-xs sm:text-sm font-black tracking-wider uppercase text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-500 shadow-[0_0_25px_rgba(223,37,49,0.55)] hover:shadow-[0_0_35px_rgba(223,37,49,0.85)] border border-red-400/50 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                >
                  <span>Explore Arena Details</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </div>
            );
          }}
        />
      </div>

      {/* ── QUICK SELECTOR TABS STRIP ── */}
      <div className="relative z-20 mt-6 pt-4 border-t border-white/10 flex items-center justify-center">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 max-w-full">
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest hidden md:inline shrink-0 mr-1">
            QUICK PICK:
          </span>
          {cards.map((c, idx) => {
            const isSelected = c.id === currentActiveId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCardId(c.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-red-600 text-white font-bold shadow-[0_0_15px_rgba(223,37,49,0.6)] border border-red-400 scale-105'
                    : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      : 'bg-neutral-900/70 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                <span className="text-[10px] opacity-75">#{idx + 1}</span>
                <span className="max-w-[120px] sm:max-w-[150px] truncate">{c.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
