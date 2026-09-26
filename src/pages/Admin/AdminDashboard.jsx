import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, LogOut, ExternalLink, Sparkles, Plus, Edit2, Trash2, 
  Upload, CheckCircle2, AlertCircle, Save, Eye, Users, Calendar, 
  Phone, Mail, MapPin, Trophy, DollarSign, Clock, FileText, Image as ImageIcon,
  ChevronRight, RefreshCw, ZoomIn, X, Search, Filter, Layers, HelpCircle, Folder,
  UserCheck, UserX, Download, Cloud, CreditCard, Ticket
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useSiteContent } from '../../context/SiteContentContext';
import { uploadImage, uploadReportToR2, isR2Configured } from '../../services/r2Storage';
import { collection, onSnapshot, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { listenToEventStats } from '../../services/registrationService';
import SuperadminSuite from './SuperadminSuite';
import DepartmentsManager from './DepartmentsManager';
import PaymentsManager from './PaymentsManager';
import EventRosterManager from './EventRosterManager';
import GatePassManager from './GatePassManager';
import ParticipantsManager from './ParticipantsManager';
import AttendanceManager from './AttendanceManager';

const EVENT_CATEGORIES = [
  'Technical',
  'Cultural',
  'Workshops',
  'Competitions',
  'Gaming',
  'Entertainment'
];

export default function AdminDashboard() {
  const { adminUser, isAdmin, isSuperAdmin, logoutAdmin, adminRole } = useAdminAuth();
  const { 
    aboutContent, 
    scheduleDays, 
    contactContent, 
    events, 
    departments,
    updateAboutContent, 
    updateScheduleContent, 
    updateContactContent, 
    addEvent, 
    updateEvent, 
    deleteEvent,
    seedDefaultEvents
  } = useSiteContent();

  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tab from current URL pathname
  const activeTab = useMemo(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('/gatepasses') || p.includes('/gatepass')) return 'gatepasses';
    if (p.includes('/payments')) return 'payments';
    if (p.includes('/participants')) return 'participants';
    if (p.includes('/attendance')) return 'attendance';
    if (p.includes('/rosters') || p.includes('/roster')) return 'rosters';
    if (p.includes('/events')) return 'events';
    if (p.includes('/departments')) return 'departments';
    if (p.includes('/about')) return 'about';
    if (p.includes('/schedule')) return 'schedule';
    if (p.includes('/registrations')) return 'registrations';
    if (p.includes('/contact')) return 'contact';
    if (p.includes('/admins') || p.includes('/admin_management')) return 'admin_management';
    return 'overview';
  }, [location.pathname]);

  const handleNavigateTab = (tab) => {
    const tabToPath = {
      overview: '/samyakadmin/dashboard',
      gatepasses: '/samyakadmin/gatepasses',
      payments: '/samyakadmin/payments',
      participants: '/samyakadmin/participants',
      attendance: '/samyakadmin/attendance',
      rosters: '/samyakadmin/rosters',
      events: '/samyakadmin/events',
      departments: '/samyakadmin/departments',
      about: '/samyakadmin/about',
      schedule: '/samyakadmin/schedule',
      registrations: '/samyakadmin/registrations',
      contact: '/samyakadmin/contact',
      admin_management: '/samyakadmin/admins',
    };
    navigate(tabToPath[tab] || '/samyakadmin/dashboard');
  };

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Live eventStats from Firestore (real-time aggregate counters)
  const [eventStats, setEventStats] = useState(null);

  // Gate Passes count state
  const [gatePassesCount, setGatePassesCount] = useState(0);

  // Payments state
  const [paymentsList, setPaymentsList] = useState([]);
  const pendingPaymentsCount = useMemo(() => {
    return paymentsList.filter(p => !p.status || p.status === 'pending').length;
  }, [paymentsList]);

  // Event Registrations & Rosters count
  const [eventRostersCount, setEventRostersCount] = useState(0);

  // Student Registrations state
  const [studentRegistrations, setStudentRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [selectedIdCardModal, setSelectedIdCardModal] = useState(null);

  // Inquiries state
  const [inquiries, setInquiries] = useState([]);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAdmin, navigate]);

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch payments, event rosters & student registrations from Firestore
  useEffect(() => {
    // Live eventStats counters
    const unsubStats = listenToEventStats((data) => setEventStats(data));

    try {
      // Payments listener
      const payCol = collection(db, 'payments');
      const unsubPay = onSnapshot(payCol, (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setPaymentsList(list);
      }, (err) => {
        console.warn('Payments snapshot note:', err);
      });

      // Event Registrations roster count listener
      const evRegCol = collection(db, 'event_registrations');
      const unsubEvReg = onSnapshot(evRegCol, (snap) => {
        setEventRostersCount(snap.size);
      }, () => {});

      // Gate Passes count listener
      const gatePassesCol = collection(db, 'gate_passes');
      const unsubGatePasses = onSnapshot(gatePassesCol, (snap) => {
        setGatePassesCount(snap.size);
      }, () => {});

      // Registrations listener
      setLoadingRegistrations(true);
      const regCol = collection(db, 'student_registrations');
      const unsubReg = onSnapshot(regCol, (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setStudentRegistrations(list);
        setLoadingRegistrations(false);
      }, (err) => {
        console.warn('Student registrations listener note:', err);
        setLoadingRegistrations(false);
      });

      // Inquiries
      const inqCol = collection(db, 'inquiries');
      const unsubInq = onSnapshot(inqCol, (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setInquiries(list);
      }, () => {});

      return () => {
        if (typeof unsubStats === 'function') unsubStats();
        unsubPay();
        unsubEvReg();
        unsubGatePasses();
        unsubReg();
        unsubInq();
      };
    } catch (e) {
      console.warn(e);
      setLoadingRegistrations(false);
      return () => { if (typeof unsubStats === 'function') unsubStats(); };
    }
  }, []);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-xl ${
              toastType === 'success' 
                ? 'bg-neutral-900/95 border-red-500/60 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
                : 'bg-red-950/95 border-red-500 text-red-200'
            }`}
          >
            {toastType === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-red-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="text-xs sm:text-sm font-mono">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-black/90 border-b border-red-500/20 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/samyak-logo-white.png" 
              alt="SAMYAK 2026" 
              className="h-8 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]" 
            />
            <span className="hidden sm:inline-block font-heading font-black text-xs uppercase tracking-widest text-red-500 bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-500/30">
              Admin Command Console
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Firestore Live Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Firestore Live</span>
          </div>

          {/* Role Pill */}
          {isSuperAdmin ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-[10px] font-mono text-amber-300 uppercase tracking-wider font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <span>👑</span>
              <span>Superadmin</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-[10px] font-mono text-red-300 uppercase tracking-wider">
              <Shield className="w-3 h-3 text-red-400" />
              <span>Wing Admin</span>
            </div>
          )}

          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-mono transition-all"
            title="Open live public website in new tab"
          >
            <span>Live Site</span>
            <ExternalLink className="w-3 h-3 text-red-400" />
          </Link>

          {/* Admin User Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
            {adminUser?.photoURL ? (
              <img 
                src={adminUser.photoURL} 
                alt="Admin" 
                className="w-7 h-7 rounded-full border border-red-500/50" 
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-red-600/30 border border-red-500 flex items-center justify-center text-xs font-bold text-red-300">
                <Shield className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="hidden md:flex flex-col text-left text-[11px] leading-tight">
              <span className="font-bold text-slate-200">{adminUser?.displayName || adminUser?.fullName || 'Administrator'}</span>
              <span className="text-[9px] font-mono text-red-400">{adminUser?.email}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={logoutAdmin}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-red-950/50 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-500/40 transition-colors cursor-pointer"
            title="Sign out of Admin Console"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout: Sub-navigation & Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 bg-neutral-950 border-r border-neutral-800/80 p-4 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible flex-shrink-0">
          <div className="hidden md:block px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
            Navigation Controls
          </div>

          <TabButton 
            active={activeTab === 'overview'} 
            onClick={() => handleNavigateTab('overview')} 
            icon={Layers} 
            label="Dashboard" 
          />
          <TabButton 
            active={activeTab === 'payments'} 
            onClick={() => handleNavigateTab('payments')} 
            icon={CreditCard} 
            label="Payments & Passes" 
            badge={pendingPaymentsCount > 0 ? `${pendingPaymentsCount} PENDING` : (paymentsList.length || null)}
          />
          <TabButton 
            active={activeTab === 'gatepasses'} 
            onClick={() => handleNavigateTab('gatepasses')} 
            icon={Ticket} 
            label="Gate Passes & QR" 
            badge={gatePassesCount || null}
          />
          <TabButton 
            active={activeTab === 'participants'} 
            onClick={() => handleNavigateTab('participants')} 
            icon={Users} 
            label="Participants" 
            badge={eventStats?.totalEnrolled || null}
          />
          <TabButton 
            active={activeTab === 'attendance'} 
            onClick={() => handleNavigateTab('attendance')} 
            icon={UserCheck} 
            label="Attendance" 
            badge={eventStats?.presentCount ? `${eventStats.presentCount} PRESENT` : null}
          />
          <TabButton 
            active={activeTab === 'events'} 
            onClick={() => handleNavigateTab('events')} 
            icon={Trophy} 
            label="Events & Posters" 
            badge={events.length}
          />
          <TabButton 
            active={activeTab === 'rosters'} 
            onClick={() => handleNavigateTab('rosters')} 
            icon={UserCheck} 
            label="Event Rosters & Passes" 
            badge={eventRostersCount || null}
          />
          <TabButton 
            active={activeTab === 'departments'} 
            onClick={() => handleNavigateTab('departments')} 
            icon={Layers} 
            label="Departments & Clubs" 
            badge={departments?.length || null}
          />
          <TabButton 
            active={activeTab === 'about'} 
            onClick={() => handleNavigateTab('about')} 
            icon={FileText} 
            label="About & Homepage" 
          />
          <TabButton 
            active={activeTab === 'schedule'} 
            onClick={() => handleNavigateTab('schedule')} 
            icon={Calendar} 
            label="3-Day Schedule" 
          />
          <TabButton 
            active={activeTab === 'registrations'} 
            onClick={() => handleNavigateTab('registrations')} 
            icon={Users} 
            label="Student ID Cards" 
            badge={studentRegistrations.length}
          />
          <TabButton 
            active={activeTab === 'contact'} 
            onClick={() => handleNavigateTab('contact')} 
            icon={Phone} 
            label="Contact & Inquiries" 
            badge={inquiries.length ? inquiries.length : null}
          />

          {/* Superadmin Suite Tab: ONLY visible to Super Admin udaykiranvempati123@gmail.com */}
          {isSuperAdmin && (
            <TabButton 
              active={activeTab === 'admin_management'} 
              onClick={() => handleNavigateTab('admin_management')} 
              icon={Shield} 
              label="Admin Management" 
              superadminBadge={true}
            />
          )}
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && (
            <OverviewSection 
              eventsCount={events.length}
              studentsCount={eventStats?.totalEnrolled ?? studentRegistrations.length}
              inquiriesCount={inquiries.length}
              paymentsCount={eventStats?.paymentVerified ?? paymentsList.length}
              pendingPaymentsCount={eventStats?.paymentPending ?? pendingPaymentsCount}
              eventRostersCount={eventRostersCount}
              internalCount={eventStats?.internalCount ?? null}
              externalCount={eventStats?.externalCount ?? null}
              gatePassIssuedCount={eventStats?.gatePassIssued ?? gatePassesCount}
              presentCount={eventStats?.presentCount ?? null}
              onNavigate={handleNavigateTab}
              onSeedEvents={async () => {
                try {
                  await seedDefaultEvents();
                  showToast('Default 45+ flagship events successfully synced to Firestore!');
                } catch {
                  showToast('Failed to sync default events', 'error');
                }
              }}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsManager onToast={showToast} />
          )}

          {activeTab === 'gatepasses' && (
            <GatePassManager onToast={showToast} />
          )}

          {activeTab === 'participants' && (
            <ParticipantsManager onToast={showToast} />
          )}

          {activeTab === 'attendance' && (
            <AttendanceManager onToast={showToast} />
          )}

          {activeTab === 'rosters' && (
            <EventRosterManager onToast={showToast} />
          )}

          {activeTab === 'events' && (
            <EventsManager 
              events={events}
              onAddEvent={async (e) => {
                await addEvent(e);
                showToast(`Event "${e.title}" published successfully!`);
              }}
              onUpdateEvent={async (id, e) => {
                await updateEvent(id, e);
                showToast(`Event "${e.title}" updated successfully!`);
              }}
              onDeleteEvent={async (id) => {
                await deleteEvent(id);
                showToast('Event deleted from live database.');
              }}
              departments={departments}
            />
          )}

          {activeTab === 'departments' && (
            <DepartmentsManager onToast={showToast} />
          )}

          {activeTab === 'about' && (
            <AboutManager 
              aboutContent={aboutContent}
              onSave={async (data) => {
                await updateAboutContent(data);
                showToast('About section & Homepage content published live!');
              }}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleManager 
              scheduleDays={scheduleDays}
              onSave={async (days) => {
                await updateScheduleContent(days);
                showToast('Festival Schedule updated live!');
              }}
            />
          )}

          {activeTab === 'registrations' && (
            <StudentRegistrationsManager 
              registrations={studentRegistrations}
              loading={loadingRegistrations}
              onViewIdCard={(reg) => setSelectedIdCardModal(reg)}
              onToast={showToast}
            />
          )}

          {activeTab === 'contact' && (
            <ContactManager 
              contactContent={contactContent}
              inquiries={inquiries}
              onSave={async (data) => {
                await updateContactContent(data);
                showToast('Contact info updated live!');
              }}
            />
          )}

          {/* Superadmin Suite: Administrator Management & Access Control */}
          {activeTab === 'admin_management' && isSuperAdmin && (
            <SuperadminSuite onToast={showToast} />
          )}
        </main>
      </div>

      {/* Student ID Card Modal Viewer */}
      <AnimatePresence>
        {selectedIdCardModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-neutral-900 border border-red-500/40 rounded-3xl max-w-lg w-full p-6 relative overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.4)]"
            >
              <button
                type="button"
                onClick={() => setSelectedIdCardModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-red-600/30 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg text-white">
                    {selectedIdCardModal.name}
                  </h3>
                  <p className="text-xs font-mono text-red-400">
                    ID: {selectedIdCardModal.rollNo} • {selectedIdCardModal.university || 'KL University'}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-mono text-neutral-400 mb-2">Uploaded College ID Card:</div>
                {selectedIdCardModal.collegeIdCardUrl ? (
                  <div className="rounded-2xl border-2 border-red-500/50 overflow-hidden bg-black max-h-80 flex items-center justify-center">
                    <img 
                      src={selectedIdCardModal.collegeIdCardUrl} 
                      alt="Student College ID Card" 
                      className="w-full h-auto max-h-80 object-contain"
                    />
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-neutral-950 border border-dashed border-neutral-700 text-center text-xs font-mono text-neutral-500">
                    No physical ID card image uploaded by this student yet.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <div>
                  <span className="text-neutral-500">Phone:</span>
                  <div className="text-slate-200 font-bold">{selectedIdCardModal.phone || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-neutral-500">Registration ID:</span>
                  <div className="text-red-400 font-bold">{selectedIdCardModal.registrationId || selectedIdCardModal.id}</div>
                </div>
                <div>
                  <span className="text-neutral-500">Pass Tier:</span>
                  <div className="text-slate-200">{selectedIdCardModal.passTier || 'Standard'}</div>
                </div>
                <div>
                  <span className="text-neutral-500">Payment Status:</span>
                  <div className={selectedIdCardModal.paymentStatus === 'Completed' ? 'text-green-400 font-bold' : 'text-amber-400'}>
                    {selectedIdCardModal.paymentStatus || 'Pending'}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedIdCardModal(null)}
                  className="px-5 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono"
                >
                  Close Viewer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponent: Tab Button
function TabButton({ active, onClick, icon: Icon, label, badge, superadminBadge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl font-heading text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap md:whitespace-normal cursor-pointer ${
        active 
          ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
          : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      {superadminBadge && (
        <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-widest animate-pulse">
          SUPERADMIN
        </span>
      )}
      {badge !== undefined && badge !== null && !superadminBadge && (
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-300'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// 1. OVERVIEW SECTION
function OverviewSection({ eventsCount, studentsCount, inquiriesCount, paymentsCount, pendingPaymentsCount, eventRostersCount, onNavigate, onSeedEvents }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">
          SYSTEM <span className="text-red-500 text-glow-red">OVERVIEW</span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400 font-cyber">
          Welcome to the SAMYAK 2026 Administrator Headquarters. Verify payments, inspect student ID cards, track event rosters, and monitor live fest registrations.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard 
          title="Payments & Passes" 
          value={paymentsCount || 0} 
          icon={CreditCard} 
          desc={pendingPaymentsCount > 0 ? `${pendingPaymentsCount} Pending Approval` : 'All passes processed'}
          action={() => onNavigate('payments')}
          highlight={pendingPaymentsCount > 0}
        />
        <MetricCard 
          title="Event Rosters" 
          value={eventRostersCount || 0} 
          icon={UserCheck} 
          desc="Participants enrolled"
          action={() => onNavigate('rosters')}
        />
        <MetricCard 
          title="Active Events & Arenas" 
          value={eventsCount} 
          icon={Trophy} 
          desc="Published across arenas"
          action={() => onNavigate('events')}
        />
        <MetricCard 
          title="Student Registrations" 
          value={studentsCount} 
          icon={Users} 
          desc="College ID Cards Submitted"
          action={() => onNavigate('registrations')}
        />
        <MetricCard 
          title="Contact Inquiries" 
          value={inquiriesCount} 
          icon={Mail} 
          desc="Submitted from contact form"
          action={() => onNavigate('contact')}
        />
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Firestore Database</div>
            <div className="text-2xl font-black font-heading text-green-400 mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
              Connected
            </div>
            <p className="text-[11px] font-mono text-neutral-400 mt-1">
              Project: <span className="text-slate-200">kl--samyak</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onSeedEvents}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-slate-200 transition-colors flex items-center justify-center gap-1.5"
            title="Sync all initial events to Firestore"
          >
            <RefreshCw className="w-3.5 h-3.5 text-red-400" />
            <span>Sync Default Events</span>
          </button>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="p-6 rounded-3xl bg-neutral-900/40 border border-red-500/20">
        <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white mb-4">
          Quick Control Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('payments')}
            className="p-4 rounded-2xl bg-neutral-900 border border-amber-500/40 hover:border-amber-400 flex items-center gap-3 text-left transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-bold text-xs uppercase text-white">Verify Payments</div>
              <div className="text-[11px] text-amber-400/80 font-cyber">Check UTR &amp; approve passes</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('events')}
            className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-red-500/40 flex items-center gap-3 text-left transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-bold text-xs uppercase text-white">Add New Event</div>
              <div className="text-[11px] text-neutral-400 font-cyber">Upload poster, set prize &amp; rules</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('registrations')}
            className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-red-500/40 flex items-center gap-3 text-left transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-bold text-xs uppercase text-white">Inspect ID Cards</div>
              <div className="text-[11px] text-neutral-400 font-cyber">Verify uploaded university IDs</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('about')}
            className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-red-500/40 flex items-center gap-3 text-left transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-bold text-xs uppercase text-white">Edit Homepage Text</div>
              <div className="text-[11px] text-neutral-400 font-cyber">Update logo, stats, and pillars</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, desc, action, highlight }) {
  return (
    <div 
      onClick={action}
      className={`p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
        highlight 
          ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]' 
          : 'bg-neutral-900/60 border-neutral-800 hover:border-red-500/40'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-widest ${highlight ? 'text-amber-400 font-bold' : 'text-neutral-400'}`}>{title}</span>
        <div className={`p-2 rounded-xl transition-colors ${
          highlight 
            ? 'bg-amber-500/20 text-amber-300' 
            : 'bg-neutral-800 group-hover:bg-red-600/20 text-neutral-300 group-hover:text-red-400'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <div className={`text-3xl font-black font-heading ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</div>
        <div className={`text-[11px] font-mono mt-1 ${highlight ? 'text-amber-400/90 font-bold' : 'text-red-400/80'}`}>{desc}</div>
      </div>
    </div>
  );
}

// 2. EVENTS & POSTERS MANAGER
function EventsManager({ events, onDeleteEvent, departments }) {
  const navigate = useNavigate();
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter((e) => {
    const matchCat = filterCategory === 'All' || e.category === filterCategory;
    const matchSearch = !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-heading text-white">
            EVENTS &amp; <span className="text-red-500">POSTERS</span>
          </h2>
          <p className="text-xs text-slate-400 font-cyber">
            Add new competitions, upload event posters via ImgBB, edit fees, rules, prizes, and venue details.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/samyakeventsedit')}
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Event</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search events by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500 cursor-pointer"
        >
          <option value="All">All Categories</option>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvents.map((ev) => (
          <div 
            key={ev.id}
            className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-red-500/30 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="relative h-36 rounded-xl overflow-hidden bg-black mb-3 border border-neutral-800">
                <img 
                  src={ev.image || '/hero-bg.png'} 
                  alt={ev.title} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-red-500/40 text-[10px] font-mono text-red-400">
                  {ev.category}
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-red-600/90 text-[10px] font-mono text-white font-bold">
                  {ev.prize}
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-[10px] font-mono text-red-400 font-bold">
                  {ev.department || 'KL'}
                </span>
                {ev.club && (
                  <span className="px-2 py-0.5 rounded-full bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-300 truncate max-w-[160px]">
                    {ev.club}
                  </span>
                )}
              </div>

              <h3 className="font-heading font-black text-sm text-white line-clamp-1">
                {ev.title}
              </h3>
              <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 font-cyber">
                {ev.shortDescription}
              </p>

              <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                <span>{ev.date}</span>
                <span className="text-red-400 font-bold">{ev.fee}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => navigate(`/samyakeventsedit/${ev.id}`)}
                className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-red-400" />
                <span>Edit Page</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/media?event=${ev.id}`)}
                className="py-1.5 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-red-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                title="Open Per-Event Media Library"
              >
                <Folder className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Media</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${ev.title}"?`)) {
                    onDeleteEvent(ev.id);
                  }
                }}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Delete event"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. ABOUT & HOMEPAGE MANAGER
function AboutManager({ aboutContent, onSave }) {
  const [form, setForm] = useState({ ...aboutContent });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const res = await uploadImage(file, 'logos');
      setForm((prev) => ({ ...prev, logoUrl: res.url }));
    } catch (err) {
      alert('Failed to upload logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleStatChange = (idx, field, val) => {
    setForm((prev) => {
      const nextStats = [...prev.stats];
      nextStats[idx] = { ...nextStats[idx], [field]: val };
      return { ...prev, stats: nextStats };
    });
  };

  const handlePillarChange = (idx, field, val) => {
    setForm((prev) => {
      const nextPillars = [...prev.pillars];
      nextPillars[idx] = { ...nextPillars[idx], [field]: val };
      return { ...prev, pillars: nextPillars };
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black font-heading text-white">
          ABOUT &amp; <span className="text-red-500">HOMEPAGE CONTENT</span>
        </h2>
        <p className="text-xs text-slate-400 font-cyber">
          Update the brand logo, introductory narrative, 4 festival statistics, and 3 pillar cards displayed to all visitors.
        </p>
      </div>

      <div className="space-y-6">
        {/* Brand Logo & Badge */}
        <div className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800 space-y-4">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-red-400">
            Brand Identity &amp; Logo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-neutral-400 mb-1">Badge Text</label>
              <input
                type="text"
                value={form.badge || ''}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-neutral-400 mb-1">Main Heading</label>
              <input
                type="text"
                value={form.title || ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">Brand Logo (ImgBB Direct Upload)</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={form.logoUrl || ''}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                className="flex-1 px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
              />
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-white flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-red-400" />
                <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
              </button>
            </div>
            {form.logoUrl && (
              <div className="mt-3 p-3 bg-black rounded-xl inline-block border border-neutral-800">
                <img src={form.logoUrl} alt="Logo preview" className="h-10 w-auto object-contain" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">About Narrative / Story</label>
            <textarea
              rows={4}
              value={form.subtitle || ''}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* 4 Statistics */}
        <div className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800 space-y-4">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-red-400">
            4 National Festival Key Statistics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {form.stats?.map((st, idx) => (
              <div key={idx} className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500">Value (e.g. 25,000+)</label>
                  <input
                    type="text"
                    value={st.value}
                    onChange={(e) => handleStatChange(idx, 'value', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500">Label</label>
                  <input
                    type="text"
                    value={st.label}
                    onChange={(e) => handleStatChange(idx, 'label', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Core Pillars */}
        <div className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800 space-y-4">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-red-400">
            3 Core Pillars / Feature Cards
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {form.pillars?.map((pil, idx) => (
              <div key={idx} className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500">Pillar Title</label>
                  <input
                    type="text"
                    value={pil.title}
                    onChange={(e) => handlePillarChange(idx, 'title', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500">Description</label>
                  <textarea
                    rows={3}
                    value={pil.desc}
                    onChange={(e) => handlePillarChange(idx, 'desc', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onSave(form)}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 font-heading font-black text-xs uppercase tracking-wider text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Publish Homepage Changes Live</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// 4. SCHEDULE MANAGER
function ScheduleManager({ scheduleDays, onSave }) {
  const [days, setDays] = useState([...scheduleDays]);
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  const handleEventChange = (evIdx, field, val) => {
    setDays((prev) => {
      const next = [...prev];
      const curEvents = [...next[activeDayIdx].events];
      curEvents[evIdx] = { ...curEvents[evIdx], [field]: val };
      next[activeDayIdx] = { ...next[activeDayIdx], events: curEvents };
      return next;
    });
  };

  const handleAddScheduleItem = () => {
    setDays((prev) => {
      const next = [...prev];
      const curEvents = [...next[activeDayIdx].events];
      curEvents.push({
        time: '12:00 PM - 01:30 PM',
        title: 'New Keynote / Workshop Arena',
        venue: 'Main Campus Auditorium',
        category: 'Technical',
        speaker: 'Lead Guest Speaker',
        highlight: false,
      });
      next[activeDayIdx] = { ...next[activeDayIdx], events: curEvents };
      return next;
    });
  };

  const handleDeleteScheduleItem = (evIdx) => {
    setDays((prev) => {
      const next = [...prev];
      const curEvents = next[activeDayIdx].events.filter((_, i) => i !== evIdx);
      next[activeDayIdx] = { ...next[activeDayIdx], events: curEvents };
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-heading text-white">
            3-DAY <span className="text-red-500">SCHEDULE ROADMAP</span>
          </h2>
          <p className="text-xs text-slate-400 font-cyber">
            Edit the timelines, keynote sessions, speaker names, and venues for each day of the festival.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSave(days)}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 font-heading font-black text-xs uppercase tracking-wider text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Schedule</span>
        </button>
      </div>

      {/* Day Selectors */}
      <div className="flex gap-2">
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveDayIdx(i)}
            className={`px-5 py-2.5 rounded-2xl font-heading text-xs font-bold uppercase tracking-wider transition-all ${
              activeDayIdx === i 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            {d.day} ({d.date})
          </button>
        ))}
      </div>

      {/* Schedule Items for Active Day */}
      <div className="space-y-3">
        {days[activeDayIdx]?.events.map((ev, evIdx) => (
          <div key={evIdx} className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-red-400">Item #{evIdx + 1}</span>
              <button
                type="button"
                onClick={() => handleDeleteScheduleItem(evIdx)}
                className="p-1 rounded-lg hover:bg-red-950 text-neutral-500 hover:text-red-400"
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Time Range</label>
                <input
                  type="text"
                  value={ev.time}
                  onChange={(e) => handleEventChange(evIdx, 'time', e.target.value)}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Session / Event Title</label>
                <input
                  type="text"
                  value={ev.title}
                  onChange={(e) => handleEventChange(evIdx, 'title', e.target.value)}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Venue</label>
                <input
                  type="text"
                  value={ev.venue}
                  onChange={(e) => handleEventChange(evIdx, 'venue', e.target.value)}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Category</label>
                <input
                  type="text"
                  value={ev.category}
                  onChange={(e) => handleEventChange(evIdx, 'category', e.target.value)}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Speaker / Details</label>
                <input
                  type="text"
                  value={ev.speaker || ''}
                  onChange={(e) => handleEventChange(evIdx, 'speaker', e.target.value)}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddScheduleItem}
          className="w-full py-3 rounded-2xl bg-neutral-900 border border-dashed border-neutral-800 hover:border-red-500/50 text-neutral-400 hover:text-white text-xs font-mono flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4 text-red-500" />
          <span>Add Session to {days[activeDayIdx]?.day}</span>
        </button>
      </div>
    </div>
  );
}

// 5. STUDENT REGISTRATIONS & ID CARDS MANAGER (WITH ATTENDANCE TOGGLE)
function StudentRegistrationsManager({ registrations, loading, onViewIdCard, onToast }) {
  const [search, setSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'attended' | 'pending'
  const [updatingId, setUpdatingId] = useState(null);

  const toggleAttendance = async (st) => {
    try {
      setUpdatingId(st.id);
      const newStatus = !st.attended;
      const regRef = doc(db, 'student_registrations', st.id);
      await updateDoc(regRef, {
        attended: newStatus,
        checkedInAt: newStatus ? serverTimestamp() : null,
      });
      if (onToast) {
        onToast(newStatus ? `Checked in: ${st.name || st.rollNo}` : `Attendance undone for: ${st.name || st.rollNo}`, 'success');
      }
    } catch (err) {
      console.error('Failed to toggle attendance:', err);
      if (onToast) {
        onToast('Failed to update attendance: ' + err.message, 'error');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const totalCount = registrations.length;
  const attendedCount = registrations.filter((r) => r.attended).length;
  const pendingCount = totalCount - attendedCount;

  const filtered = registrations.filter((r) => {
    if (attendanceFilter === 'attended' && !r.attended) return false;
    if (attendanceFilter === 'pending' && r.attended) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.rollNo?.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q) ||
      r.university?.toLowerCase().includes(q)
    );
  });

  const [exportingReport, setExportingReport] = useState(false);

  const handleExportReport = async () => {
    try {
      setExportingReport(true);
      const headers = ['Student Name', 'Roll / ID', 'Phone', 'University', 'Payment Status', 'Attendance Status', 'Checked In At'];
      const rows = registrations.map((st) => [
        `"${st.name || ''}"`,
        `"${st.rollNo || st.id || ''}"`,
        `"${st.phone || ''}"`,
        `"${st.university || ''}"`,
        `"${st.paymentStatus || 'Pending'}"`,
        `"${st.attended ? 'Checked In' : 'Not Checked In'}"`,
        `"${st.checkedInAt ? new Date(st.checkedInAt.seconds ? st.checkedInAt.seconds * 1000 : st.checkedInAt).toLocaleString() : 'N/A'}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const res = await uploadReportToR2(csvContent, 'samyak_attendee_report', 'csv');

      // Trigger instant browser download
      const link = document.createElement('a');
      link.href = res.url;
      link.download = res.fileName || 'samyak_attendee_report.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onToast) {
        onToast(
          res.provider === 'cloudflare_r2'
            ? 'Report uploaded to Cloudflare R2 & downloaded!'
            : 'Report downloaded successfully!',
          'success'
        );
      }
    } catch (err) {
      console.error('Export report error:', err);
      if (onToast) onToast('Failed to export report: ' + err.message, 'error');
    } finally {
      setExportingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-heading text-white">
            ATTENDEE LIST &amp; <span className="text-red-500">COLLEGE ID CARDS</span>
          </h2>
          <p className="text-xs text-slate-400 font-cyber">
            Review registered students, verify university IDs, and track on-site event attendance check-ins in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search attendee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <button
            type="button"
            disabled={exportingReport || registrations.length === 0}
            onClick={handleExportReport}
            className="px-3.5 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900/80 border border-amber-500/50 text-amber-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer whitespace-nowrap disabled:opacity-50"
            title="Export CSV and upload report to Cloudflare R2"
          >
            {exportingReport ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Attendance Stats & Quick Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setAttendanceFilter('all')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            attendanceFilter === 'all'
              ? 'bg-red-500/15 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Total Registered</div>
          <div className="text-xl font-black text-white mt-0.5">{totalCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setAttendanceFilter('attended')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            attendanceFilter === 'attended'
              ? 'bg-green-500/15 border-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.2)]'
              : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-green-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Checked In
          </div>
          <div className="text-xl font-black text-green-400 mt-0.5">{attendedCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setAttendanceFilter('pending')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            attendanceFilter === 'pending'
              ? 'bg-amber-500/15 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
              : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending Check-in
          </div>
          <div className="text-xl font-black text-amber-400 mt-0.5">{pendingCount}</div>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-neutral-400">
          Loading student verification records from Firestore...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-neutral-900/40 border border-neutral-800 text-center text-xs font-mono text-neutral-400">
          No attendee records found matching your current search or filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/40">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 bg-black/60 text-neutral-400 text-[10px] uppercase tracking-wider">
                <th className="p-3.5">Attendee Name</th>
                <th className="p-3.5">Roll / ID</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">University</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5 text-center">College ID Card</th>
                <th className="p-3.5 text-center">Attendance Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filtered.map((st) => (
                <tr key={st.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-[10px] font-black">
                      {st.name?.slice(0, 1) || 'S'}
                    </div>
                    <span>{st.name}</span>
                  </td>
                  <td className="p-3.5 text-red-400 font-bold">{st.rollNo || st.id}</td>
                  <td className="p-3.5 text-neutral-300">{st.phone || 'N/A'}</td>
                  <td className="p-3.5 text-neutral-400 truncate max-w-[160px]">{st.university || 'KL University'}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      st.paymentStatus === 'Completed' 
                        ? 'bg-green-950 text-green-400 border border-green-800' 
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {st.paymentStatus || 'Pending'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    {st.collegeIdCardUrl ? (
                      <button
                        type="button"
                        onClick={() => onViewIdCard(st)}
                        className="px-3 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-300 text-[11px] inline-flex items-center gap-1.5 transition-colors"
                      >
                        <ZoomIn className="w-3 h-3" />
                        <span>View ID Card</span>
                      </button>
                    ) : (
                      <span className="text-neutral-500 text-[10px]">No Card Uploaded</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    {st.attended ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-950/80 text-green-400 border border-green-700/80 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                        <CheckCircle2 className="w-3 h-3" /> Checked In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                        <Clock className="w-3 h-3" /> Not Checked In
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      disabled={updatingId === st.id}
                      onClick={() => toggleAttendance(st)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition-all ${
                        updatingId === st.id
                          ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                          : st.attended
                            ? 'bg-neutral-800 hover:bg-red-950/80 text-neutral-300 hover:text-red-300 border border-neutral-700 hover:border-red-600'
                            : 'bg-green-600 hover:bg-green-500 text-black font-black border border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                      }`}
                    >
                      {updatingId === st.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : st.attended ? (
                        <>
                          <UserX className="w-3 h-3 text-red-400" />
                          <span>Undo Check-In</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3 h-3" />
                          <span>Check In</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 6. CONTACT & INQUIRIES MANAGER
function ContactManager({ contactContent, inquiries, onSave }) {
  const [form, setForm] = useState({ ...contactContent });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black font-heading text-white">
          CONTACT INFO &amp; <span className="text-red-500">STUDENT INQUIRIES</span>
        </h2>
        <p className="text-xs text-slate-400 font-cyber">
          Update central committee telephone hotlines, email, campus venue address, and view public inquiries.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800 space-y-4">
        <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-red-400">
          Festival Official Contact Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">Helpline Phone Number</label>
            <input
              type="text"
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">Official Support Email</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-neutral-400 mb-1">Campus Physical Address</label>
          <input
            type="text"
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => onSave(form)}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 font-heading font-black text-xs uppercase tracking-wider text-white shadow-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Update Contact Info</span>
          </button>
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="space-y-4">
        <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-red-400">
          Messages from Contact Us Form ({inquiries.length})
        </h3>

        {inquiries.length === 0 ? (
          <div className="p-8 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center text-xs font-mono text-neutral-500">
            No inquiries received yet.
          </div>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inq) => (
              <div key={inq.id} className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-heading font-bold text-white text-xs">{inq.name} ({inq.email})</div>
                  <span className="text-[10px] font-mono text-neutral-500">{inq.phone}</span>
                </div>
                <div className="text-xs font-mono text-red-400 font-bold">{inq.subject}</div>
                <p className="text-xs text-neutral-300 font-cyber bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  {inq.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
