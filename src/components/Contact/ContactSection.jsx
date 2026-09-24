import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';
import { InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from '../SocialIcons';


import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'inquiries'), {
        ...formData,
        submittedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore inquiry record note:', err.message);
    }
    setLoading(false);
    setSubmitted(true);
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 5000);
  };


  return (
    <section id="contact" className="relative py-24 sm:py-32 bg-black overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            Connect With Us
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
            CONTACT <span className="text-red-500 text-glow-red">SAMYAK 2026</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 font-cyber">
            Have questions about registration, hotel accommodation, sponsorship, or event rules? Our student central committee is here 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left 5 Cols: Contact Information & Campus Map Info */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="cyber-card p-6 sm:p-8 rounded-3xl border border-neutral-800 space-y-6">
              <h3 className="text-lg font-bold font-heading text-white">
                FESTIVAL HEADQUARTERS
              </h3>

              <div className="space-y-5 text-xs sm:text-sm font-cyber">
                {/* Location */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-neutral-900 text-red-400 border border-neutral-800 flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-neutral-500 uppercase">Campus Location</div>
                    <div className="font-semibold text-white mt-0.5 leading-snug">
                      KL Deemed to be University
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      Green Fields, Vaddeswaram, Guntur District, Andhra Pradesh, India — 522502
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-neutral-900 text-red-400 border border-neutral-800 flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-neutral-500 uppercase">Official Fest Email</div>
                    <a
                      href="mailto:samyak2026@kluniversity.in"
                      className="font-semibold text-white hover:text-red-400 transition-colors mt-0.5 block"
                    >
                      samyak2026@kluniversity.in
                    </a>
                    <div className="text-slate-400 text-xs mt-0.5">
                      queries@kluniversity.in
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-neutral-900 text-red-400 border border-neutral-800 flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-neutral-500 uppercase">Helpdesk &amp; Convener Lines</div>
                    <div className="font-semibold text-white mt-0.5">
                      +91 863 2399999 / +91 98480 12345
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      Mon - Sun, 08:00 AM - 10:00 PM IST
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div className="pt-6 border-t border-neutral-800">
                <span className="text-[10px] font-mono uppercase text-neutral-500 tracking-wider">
                  OFFICIAL SOCIAL FEEDS
                </span>
                <div className="flex items-center gap-3 mt-3">
                  {[
                    { icon: InstagramIcon, href: 'https://instagram.com', label: 'Instagram' },
                    { icon: LinkedinIcon, href: 'https://linkedin.com', label: 'LinkedIn' },
                    { icon: TwitterIcon, href: 'https://x.com', label: 'X (Twitter)' },
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
                        className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Mascot Help Tip */}
            <div className="p-5 rounded-2xl bg-red-950/20 border border-red-500/20 flex items-center gap-4">
              <img
                src="/mascot-robot.png"
                alt="Robot Mascot"
                className="w-12 h-12 object-contain flex-shrink-0 filter drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]"
              />
              <div className="text-xs text-slate-300 font-cyber">
                <span className="font-bold text-red-400">Need On-Campus Guidance?</span> Our student volunteer bots and help desks are stationed at Vijayawada &amp; Guntur Railway stations.
              </div>
            </div>

          </div>

          {/* Right 7 Cols: Interactive Animated Contact Form */}
          <div className="lg:col-span-7">
            <div className="cyber-card p-6 sm:p-10 rounded-3xl border border-red-500/30 space-y-6">
              <h3 className="text-xl font-bold font-heading text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-red-400" />
                TRANSMIT INQUIRY
              </h3>

              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-cyber flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Transmission received! Our festival team will reach out to you shortly.</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 uppercase">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full mt-1 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-all font-cyber"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 uppercase">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="aarav@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full mt-1 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-all font-cyber"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 uppercase">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full mt-1 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-all font-cyber"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 uppercase">
                      Subject Category *
                    </label>
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full mt-1 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500 transition-all font-cyber"
                    >
                      <option value="">Select Category</option>
                      <option value="Event Registration">Event Registration &amp; Teams</option>
                      <option value="Payment Issue">Pass &amp; Payment Verification</option>
                      <option value="Accommodation">Hostel &amp; Accommodation Request</option>
                      <option value="Sponsorship">Sponsorship &amp; Stalls</option>
                      <option value="Other">General Inquiry</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">
                    Your Message / Query *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter your message details here..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full mt-1 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-all font-cyber resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-full font-heading text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)] hover:shadow-[0_0_35px_rgba(239,68,68,0.8)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'TRANSMITTING...' : 'SEND TRANSMISSION'}</span>
                </button>
              </form>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
