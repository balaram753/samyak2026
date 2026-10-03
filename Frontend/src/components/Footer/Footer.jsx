import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, ArrowUp, ExternalLink } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Footer() {
  const { isLight } = useTheme();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={`relative border-t overflow-hidden transition-colors ${
      isLight ? 'bg-white border-neutral-200 text-neutral-600' : 'bg-black border-red-950/40 text-slate-400'
    }`}>
      {/* Background Cyber Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-red-600/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative z-10">
        
        {/* Main Footer Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12 pb-16 border-b ${
          isLight ? 'border-neutral-200' : 'border-neutral-800'
        }`}>
          
          {/* Brand Col (2 cols wide) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group focus:outline-none">
              <div className={`w-10 h-10 rounded-xl p-1 flex items-center justify-center transition-all ${
                isLight ? 'bg-white border border-red-500/30 shadow-[0_2px_8px_rgba(139,21,27,0.12)]' : 'bg-neutral-900 border border-red-500/40 shadow-[0_0_15px_rgba(223,37,49,0.4)]'
              }`}>
                <img
                  src={isLight ? "/samyak-emblem-black.png" : "/samyak-emblem.png"}
                  alt="Samyak Emblem"
                  className="w-full h-full object-contain filter"
                />
              </div>
              <div className="flex flex-col">
                <span className={`text-2xl font-black tracking-widest font-heading ${
                  isLight ? '!text-slate-900' : '!text-white'
                }`}>
                  SAMYAK <span className="text-red-600 dark:text-red-500 text-glow-red">2026</span>
                </span>
                <span className={`text-[10px] uppercase tracking-[0.3em] font-cyber font-semibold -mt-1 ${
                  isLight ? 'text-red-700' : 'text-red-400'
                }`}>
                  KL UNIVERSITY
                </span>
              </div>
            </Link>


            <div className={`text-[11px] font-mono tracking-wider font-bold ${
              isLight ? 'text-red-700' : 'text-red-400/80'
            }`}>
              WHERE INNOVATION MEETS CELEBRATION
            </div>
          </div>

          {/* Quick Links / Main Navigation */}
          <div className="space-y-3 text-xs font-cyber">
            <h4 className={`font-heading font-bold uppercase tracking-wider text-sm ${
              isLight ? '!text-slate-900 font-extrabold' : '!text-white'
            }`}>
              Navigation
            </h4>
            <ul className="space-y-2">
              {[
                { name: 'Home Arena', path: '/' },
                { name: 'About SAMYAK', path: '/about' },
                { name: 'Flagship Events', path: '/events' },
                { name: 'Workshops & Labs', path: '/workshops' },
                { name: 'Festival Schedule', path: '/schedule' },
                { name: 'Highlights Gallery', path: '/gallery' },
                { name: 'Contact & Helpdesk', path: '/contact' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className={`transition-colors flex items-center gap-1.5 ${
                      isLight ? 'text-neutral-600 hover:text-red-700 font-medium' : 'text-slate-400 hover:text-red-300'
                    }`}
                  >
                    <span className={isLight ? "text-red-600" : "text-neutral-600"}>›</span>
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Fest Arenas & Quick Access (Based on actual application) */}
          <div className="space-y-3 text-xs font-cyber">
            <h4 className={`font-heading font-bold uppercase tracking-wider text-sm ${
              isLight ? '!text-slate-900 font-extrabold' : '!text-white'
            }`}>
              Fest Arenas
            </h4>
            <ul className="space-y-2">
              {[
                { name: 'Technical Competitions', path: '/events?category=Technical' },
                { name: 'Hands-on Workshops', path: '/workshops' },
                { name: 'Cultural Showcases', path: '/events?category=Cultural' },
                { name: 'Gaming & Esports', path: '/events?category=Gaming' },
                { name: 'Competitions & Hackathons', path: '/events?category=Competitions' },
                { name: 'Delegate Profile', path: '/profile' },
                { name: 'Pay Event Fee & Pass', path: '/payment' },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`transition-colors flex items-center gap-1.5 ${
                      isLight ? 'text-neutral-600 hover:text-red-700 font-medium' : 'text-slate-400 hover:text-red-300'
                    }`}
                  >
                    <span className={isLight ? "text-red-600" : "text-neutral-600"}>›</span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Campus Location & Help */}
          <div className="space-y-3 text-xs font-cyber">
            <h4 className={`font-heading font-bold uppercase tracking-wider text-sm ${
              isLight ? '!text-slate-900 font-extrabold' : '!text-white'
            }`}>
              KL Campus
            </h4>
            <div className={`space-y-2.5 ${isLight ? 'text-neutral-600 font-medium' : 'text-slate-400'}`}>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>Green Fields, Vaddeswaram, Andhra Pradesh, 522502</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="truncate">samyak2026@kluniversity.in</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>+91 863 2399999</span>
              </div>
            </div>

            {/* Back to top button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={scrollToTop}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-mono transition-all cursor-pointer ${
                  isLight
                    ? 'bg-neutral-100 border border-neutral-300 text-red-800 hover:bg-neutral-200 hover:border-red-500 font-bold shadow-sm'
                    : 'bg-neutral-900 border border-neutral-800 text-red-300 hover:text-white hover:border-red-500/50 hover:bg-red-600/20'
                }`}
              >
                <span>BACK TO TOP</span>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* ── BOTTOM CREDIT STRIP ─────────────────────────────────── */}
        <div className={`mt-10 pt-6 border-t ${isLight ? 'border-neutral-200' : 'border-neutral-900/60'}`}>

          {/* Glassmorphic credit card */}
          <div className={`relative flex flex-col md:flex-row items-center justify-between gap-5 px-5 py-4 rounded-2xl backdrop-blur-md overflow-hidden ${
            isLight
              ? 'bg-neutral-50/90 border border-neutral-200/90 shadow-sm'
              : 'bg-neutral-950/80 border border-neutral-800/70'
          }`}>

            {/* Subtle top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

            {/* Left: Copyright */}
            <p className={`text-[11px] font-mono text-center md:text-left tracking-wide ${
              isLight ? 'text-neutral-600' : 'text-neutral-500'
            }`}>
              © 2026 <span className={`${isLight ? 'text-slate-900' : 'text-neutral-300'} font-semibold`}>SAMYAK</span> · KL Deemed to be University · All Rights Reserved.
            </p>

            {/* Right: Developer Credits (Mixed seamlessly into footer typography) */}
            <div
              id="samyak-lead-architect-credit"
              className={`flex flex-wrap items-center justify-center md:justify-end gap-1.5 text-[11px] font-mono ${
                isLight ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              <span>Designed &amp; Developed by</span>
              <a
                href="https://udaykiranportfolio.web.app/"
                target="_blank"
                rel="noreferrer"
                className={`font-semibold hover:underline transition-colors inline-flex items-center gap-1 ${
                  isLight ? 'text-neutral-800 hover:text-red-700' : 'text-neutral-200 hover:text-red-400'
                }`}
              >
                <span>Uday Kiran Vempati</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
              <span className={isLight ? 'text-neutral-400' : 'text-neutral-600'}>&amp;</span>
              <a
                id="samyak-author-link"
                href="https://github.com/balaram753"
                target="_blank"
                rel="noreferrer"
                className={`font-semibold hover:underline transition-colors ${
                  isLight ? 'text-neutral-800 hover:text-red-700' : 'text-neutral-200 hover:text-red-400'
                }`}
              >
                Balaram (@balaram753)
              </a>
            </div>

          </div>{/* end glassmorphic card */}
        </div>{/* end bottom credit strip */}

      </div>
    </footer>
  );
}
