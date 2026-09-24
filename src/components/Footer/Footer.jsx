import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, ArrowUp } from 'lucide-react';
import { InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from '../SocialIcons';


export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-black border-t border-red-950/40 text-slate-400 overflow-hidden">
      {/* Background Cyber Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-red-600/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative z-10">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12 pb-16 border-b border-neutral-800">
          
          {/* Brand Col (2 cols wide) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group focus:outline-none">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-red-500/40 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                <img
                  src="/samyak-emblem.png"
                  alt="Samyak Emblem"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-widest text-white font-heading">
                  SAMYAK <span className="text-red-500 text-glow-red">2026</span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-red-400 font-cyber font-medium -mt-1">
                  KL UNIVERSITY
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 font-cyber leading-relaxed max-w-sm">
              India&apos;s premier National Level Techno-Management Fest organized by KL Deemed to be University. Bringing together 25,000+ engineers, innovators, and creators across the nation.
            </p>

            <div className="text-[11px] font-mono text-red-400/80 tracking-wider">
              WHERE INNOVATION MEETS CELEBRATION
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 text-xs font-cyber">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-sm">
              Navigation
            </h4>
            <ul className="space-y-2">
              {[
                { name: 'Home Arena', path: '/' },
                { name: 'About SAMYAK', path: '/about' },
                { name: 'Flagship Events', path: '/events' },
                { name: 'Festival Schedule', path: '/schedule' },
                { name: 'Gallery & Highlights', path: '/gallery' },
                { name: 'Delegate Profile', path: '/profile' },
                { name: 'Pay Event Fee', path: '/payment' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="hover:text-red-300 transition-colors flex items-center gap-1.5"
                  >
                    <span className="text-neutral-600">›</span>
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Event Arenas */}
          <div className="space-y-3 text-xs font-cyber">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-sm">
              Categories
            </h4>
            <ul className="space-y-2">
              {[
                'Code Storm Hackathon',
                'RoboWars Cyber Arena',
                'Step Up Dance Battle',
                'Autonomous Drone Nexus',
                'Generative AI Masterclass',
                'Valorant Esports Clash',
                'ProNite Celebrity Concert',
              ].map((c) => (
                <li key={c} className="text-neutral-400 hover:text-white transition-colors cursor-pointer">
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Campus Location & Help */}
          <div className="space-y-3 text-xs font-cyber">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-sm">
              KL Campus
            </h4>
            <div className="space-y-2.5 text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>Green Fields, Vaddeswaram, Andhra Pradesh, 522502</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="truncate">samyak2026@kluniversity.in</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>+91 863 2399999</span>
              </div>
            </div>

            {/* Back to top button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-red-300 hover:text-white hover:border-red-500/50 hover:bg-red-600/20 transition-all"
              >
                <span>BACK TO TOP</span>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-cyber border-t border-neutral-900/60 mt-8">
          <div className="text-neutral-500 text-center md:text-left">
            © 2026 SAMYAK • KL Deemed to be University. All Rights Reserved.
          </div>

          {/* Developer Credit - Protected by Integrity Guard */}
          <div id="samyak-lead-architect-credit" className="flex flex-wrap items-center gap-2 text-neutral-400 text-xs">
            <span>Engineered by</span>
            <a
              id="samyak-author-link"
              href="https://github.com/balaram753"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-mono font-bold text-red-400 hover:text-red-300 transition-colors bg-red-950/40 px-2 py-0.5 rounded-full border border-red-500/30 hover:border-red-500"
            >
              <span>Balaram</span>
              <span className="text-[10px] text-red-400/80 font-normal">@balaram753</span>
            </a>
            <span className="text-neutral-600">•</span>
            <span className="text-neutral-400">UI by <span className="text-slate-200 font-semibold font-mono">Uday</span></span>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-3">
            {[
              { icon: InstagramIcon, href: 'https://instagram.com', label: 'Instagram' },
              { icon: LinkedinIcon, href: 'https://linkedin.com', label: 'LinkedIn' },
              { icon: TwitterIcon, href: 'https://x.com', label: 'X' },
              { icon: YoutubeIcon, href: 'https://youtube.com', label: 'YouTube' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              );
            })}
          </div>
        </div>

      </div>
    </footer>
  );
}
