import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, LogOut, ExternalLink, Sparkles, Plus, Edit2, Trash2, 
  Upload, CheckCircle2, AlertCircle, Save, Eye, Users, Calendar, 
  Phone, Mail, MapPin, Trophy, DollarSign, Clock, FileText, Image as ImageIcon,
  ChevronRight, RefreshCw, X, Search, Filter, Layers, HelpCircle, Folder,
  UserCheck, CreditCard, Ticket, Cpu, Award, Star
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useSiteContent } from '../../context/SiteContentContext';
import { uploadImage } from '../../services/r2Storage';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { subscribeContent } from '../../services/contentStore';
import { compareEventsByOrderAndTime } from '../../data/events';
import SuperadminSuite from './SuperadminSuite';
import DepartmentsManager from './DepartmentsManager';
import SponsorsManager from './SponsorsManager';
import PaymentsManager from './PaymentsManager';
import EventRosterManager from './EventRosterManager';
import GatePassManager from './GatePassManager';
import TechnologyClubPanel from './TechnologyClubPanel';
import WorkshopsManager from './WorkshopsManager';
import TotalUsersManager from './TotalUsersManager';
import ScheduleManagerPage from './ScheduleManagerPage';
import { InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon, FacebookIcon } from '../../components/SocialIcons';

const EVENT_CATEGORIES = [
  'Technical',
  'Cultural',
  'Workshops',
  'Competitions',
  'Gaming',
  'Entertainment'
];

export default function AdminDashboard() {
  const {
    adminUser, isAdmin, isSuperAdmin, logoutAdmin, adminLoading,
    isFullAdmin, canVerifyPayments, isClubAdmin, isGateStaffOnly, canAccessTab,
  } = useAdminAuth();
  const { 
    aboutContent, 
    contactContent, 
    events, 
    departments,
    sponsors,
    updateAboutContent, 
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
    if (p.includes('/users') || p.includes('/totalusers') || p.includes('/allusers')) return 'users';
    if (p.includes('/techclub') || p.includes('/club')) return 'techclub';
    if (p.includes('/gatepasses') || p.includes('/gatepass')) return 'gatepasses';
    if (p.includes('/payments')) return 'payments';
    if (p.includes('/rosters') || p.includes('/roster')) return 'rosters';
    if (p.includes('/events')) return 'events';
    if (p.includes('/workshops')) return 'workshops';
    if (p.includes('/departments')) return 'departments';
    if (p.includes('/sponsors')) return 'sponsors';
    if (p.includes('/about')) return 'about';
    if (p.includes('/schedule')) return 'schedule';
    if (p.includes('/contact')) return 'contact';
    if (p.includes('/admins') || p.includes('/admin_management')) return 'admin_management';
    return 'overview';
  }, [location.pathname]);

  const handleNavigateTab = (tab) => {
    const tabToPath = {
      overview: '/samyakadmin/dashboard',
      users: '/samyakadmin/users',
      techclub: '/samyakadmin/techclub',
      gatepasses: '/samyakadmin/gatepasses',
      payments: '/samyakadmin/payments',
      rosters: '/samyakadmin/rosters',
      events: '/samyakadmin/events',
      workshops: '/samyakadmin/workshops',
      departments: '/samyakadmin/departments',
      sponsors: '/samyakadmin/sponsors',
      about: '/samyakadmin/about',
      schedule: '/samyakadmin/schedule',
      contact: '/samyakadmin/contact',
      admin_management: '/samyakadmin/admins',
    };
    navigate(tabToPath[tab] || '/samyakadmin/dashboard');
  };

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Total Registered Users state
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // Gate Passes count & Attendance state
  const [gatePassesCount, setGatePassesCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);

  // Payments & Workshops state
  const [paymentsList, setPaymentsList] = useState([]);
  const [workshopRegistrationsList, setWorkshopRegistrationsList] = useState([]);

  const pendingPassesCount = useMemo(() => {
    return paymentsList.filter(p => !p.status || p.status === 'pending' || p.paymentStatus === 'PENDING' || p.paymentStatus === 'PENDING_VERIFICATION').length;
  }, [paymentsList]);
  const verifiedPaymentsCount = useMemo(() => {
    return paymentsList.filter(p => p.status === 'Completed' || p.paymentStatus === 'Completed' || p.status === 'APPROVED' || p.paymentStatus === 'APPROVED' || p.status === 'VERIFIED').length;
  }, [paymentsList]);
  const pendingWorkshopPaymentsCount = useMemo(() => {
    return workshopRegistrationsList.filter(w => !w.status || w.status === 'PENDING_VERIFICATION' || w.status === 'PENDING').length;
  }, [workshopRegistrationsList]);
  const pendingPaymentsCount = pendingPassesCount + pendingWorkshopPaymentsCount;

  // Event Registrations & Rosters count
  const [eventRostersCount, setEventRostersCount] = useState(0);

  // Inquiries state
  const [inquiries, setInquiries] = useState([]);

  // Check if current logged in admin is a Technology Club Admin
  const isTechClubAdmin = isClubAdmin || Boolean(adminUser?.club);

  // Maintenance mode state & subscription
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);

  useEffect(() => {
    try {
      const settingsRef = doc(db, 'site_content', 'settings');
      const unsub = onSnapshot(settingsRef, (snap) => {
        if (snap.exists()) {
          setIsMaintenanceActive(Boolean(snap.data()?.maintenance_mode));
        }
      });
      return () => unsub();
    } catch {}
  }, []);

  const handleToggleMaintenanceMode = async () => {
    const newStatus = !isMaintenanceActive;
    if (newStatus) {
      const confirmLock = window.confirm(
        'Enable Platform Maintenance Mode & System Lockdown?\n\n' +
        '• Public visitors and delegates will see the Maintenance & Security Lock page.\n' +
        '• Regular sub-admins will be restricted.\n' +
        '• Super Admin retains full access to this console.\n\n' +
        'Proceed with lockdown?'
      );
      if (!confirmLock) return;
    }

    try {
      const settingsRef = doc(db, 'site_content', 'settings');
      await setDoc(settingsRef, {
        maintenance_mode: newStatus,
        maintenance_reason: 'Scheduled Platform Maintenance & Upgrades in Progress',
        updated_at: serverTimestamp(),
      }, { merge: true });

      setIsMaintenanceActive(newStatus);
      showToast(
        newStatus
          ? 'Platform Lockdown ACTIVE: Public visitors and sub-admins locked out. Open for Super Admin.'
          : 'Platform Lockdown DISABLED: Public site and admin access restored for everyone!',
        newStatus ? 'info' : 'success'
      );
    } catch (err) {
      showToast('Error updating maintenance mode: ' + err.message, 'error');
    }
  };

  // Redirect if not admin
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAdmin, adminLoading, navigate]);

  // Roles without access to the current tab go to their first permitted tab.
  useEffect(() => {
    if (adminLoading || !isAdmin || canAccessTab(activeTab)) return;
    if (isGateStaffOnly) {
      navigate('/gate', { replace: true });
      return;
    }
    const firstTab = ['payments', 'events', 'techclub'].find((t) => canAccessTab(t));
    navigate(firstTab ? `/samyakadmin/${firstTab}` : '/admin/login', { replace: true });
  }, [adminLoading, isAdmin, activeTab, isGateStaffOnly, canAccessTab, navigate]);

  // If a Technology Club Admin logs in to the generic dashboard, redirect them straight to their Tech Club Portal
  useEffect(() => {
    if (isTechClubAdmin && !isSuperAdmin && (location.pathname === '/samyakadmin' || location.pathname === '/samyakadmin/dashboard')) {
      navigate('/samyakadmin/techclub', { replace: true });
    }
  }, [isTechClubAdmin, isSuperAdmin, location.pathname, navigate]);

  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Fetch payments, event rosters & student registrations from Firestore
  // (only the collections this role is allowed to read; rules enforce it too)
  useEffect(() => {
    if (adminLoading || !isAdmin) return undefined;
    const noop = () => {};
    try {
      // Payments listener
      const payCol = collection(db, 'payments');
      const unsubPay = !canVerifyPayments ? noop : onSnapshot(payCol, (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setPaymentsList(list);
      }, (err) => {
        console.warn('Payments snapshot note:', err);
      });

      // Event Registrations roster count listener
      const evRegCol = collection(db, 'event_registrations');
      const unsubEvReg = !isFullAdmin ? noop : onSnapshot(evRegCol, (snap) => {
        setEventRostersCount(snap.size);
      }, () => {});

      // Gate Passes & Attendance live listener
      const gatePassesCol = collection(db, 'gate_passes');
      const unsubGatePasses = !canVerifyPayments ? noop : onSnapshot(gatePassesCol, (snap) => {
        setGatePassesCount(snap.size);
        let checkedInCount = 0;
        snap.forEach((d) => {
          const pass = d.data();
          if (pass.checkedIn || pass.gatePassStatus === 'USED') {
            checkedInCount++;
          }
        });
        setAttendanceCount(checkedInCount);
      }, () => {});

      // Total Users live listener
      const usersCol = collection(db, 'users');
      const unsubUsers = onSnapshot(usersCol, (snap) => {
        setTotalUsersCount(snap.size);
      }, () => {});

      // Workshop Registrations & Payments live listener
      const wsCol = collection(db, 'workshop_registrations');
      const unsubWs = onSnapshot(wsCol, (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setWorkshopRegistrationsList(list);
      }, (err) => {
        console.warn('Workshop registrations listener note:', err);
      });

      // Inquiries (Cloudflare D1; admin-only on the Worker)
      const unsubInq = !isFullAdmin ? noop : subscribeContent('inquiries', { limit: 500 }, setInquiries, () => {});

      return () => {
        unsubUsers();
        unsubPay();
        unsubWs();
        unsubEvReg();
        unsubGatePasses();
        unsubInq();
      };
    } catch (e) {
      console.warn(e);
      return undefined;
    }
  }, [adminLoading, isAdmin, isFullAdmin, canVerifyPayments]);

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
                ? 'bg-neutral-900/95 border-red-500/60 text-white shadow-[0_0_30px_rgba(223,37,49,0.3)]' 
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
              className="h-8 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(223,37,49,0.5)]" 
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
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-[10px] font-mono text-amber-300 uppercase tracking-wider font-bold shadow-[0_0_12px_rgba(223,37,49,0.25)]">
              <span>👑</span>
              <span>Superadmin</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-[10px] font-mono text-red-300 uppercase tracking-wider">
              <Shield className="w-3 h-3 text-red-400" />
              <span>Wing Admin</span>
            </div>
          )}

          {/* Super Admin Maintenance Lockdown Controller */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleToggleMaintenanceMode}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                isMaintenanceActive
                  ? 'bg-red-950/80 border-red-500 text-red-200 shadow-[0_0_15px_rgba(223,37,49,0.5)]'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600'
              }`}
              title={
                isMaintenanceActive
                  ? 'Lockdown is ON (Visitors & sub-admins restricted). Click to turn off.'
                  : 'Click to enable Lockdown (Locks site for visitors & sub-admins, open for Super Admin).'
              }
            >
              <span className={`w-2 h-2 rounded-full ${isMaintenanceActive ? 'bg-red-500 animate-ping' : 'bg-neutral-500'}`} />
              <span>Lockdown: {isMaintenanceActive ? 'ON' : 'OFF'}</span>
            </button>
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
                className="w-7 h-7 rounded-full border border-red-500/50 object-cover" 
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-red-600/30 border border-red-500 flex items-center justify-center text-xs font-bold text-red-300">
                <Shield className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left text-[11px] leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-200 truncate max-w-[120px] md:max-w-[180px]">
                  {adminUser?.displayName || adminUser?.fullName || 'Administrator'}
                </span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                  isSuperAdmin 
                    ? 'bg-red-950 text-red-400 border border-red-800' 
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {isSuperAdmin ? 'Super Admin' : (adminUser?.roleLabel || adminUser?.role || 'Sub-Admin')}
                </span>
              </div>
              <span className="text-[9px] font-mono text-neutral-400 truncate max-w-[140px] md:max-w-[200px]">{adminUser?.email}</span>
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
          {!isSuperAdmin && (
            <div className="hidden md:block mb-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-950/40 to-neutral-900 border border-amber-800/50 text-[10px] font-mono">
              <div className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>Sub-Admin Portal</span>
              </div>
              <div className="text-neutral-400 text-[9px] mt-0.5 truncate">
                Role: {adminUser?.roleLabel || adminUser?.role || 'Sub-Admin'}
              </div>
              {adminUser?.club && (
                <div className="text-amber-300/80 text-[9px] truncate">
                  Club: {adminUser.club}
                </div>
              )}
            </div>
          )}
          <div className="hidden md:block px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
            Navigation Controls
          </div>

          {canAccessTab('overview') && (
            <TabButton
              active={activeTab === 'overview'} 
              onClick={() => handleNavigateTab('overview')} 
              icon={Layers} 
              label="Dashboard" 
            />
          )}
          {canAccessTab('users') && (
            <TabButton 
              active={activeTab === 'users'} 
              onClick={() => handleNavigateTab('users')} 
              icon={Users} 
              label="Total Users & Verify" 
              badge={totalUsersCount || null}
            />
          )}
          {canAccessTab('payments') && (
            <TabButton 
              active={activeTab === 'payments'} 
              onClick={() => handleNavigateTab('payments')} 
              icon={CreditCard} 
              label="Payments & Passes" 
              badge={pendingPaymentsCount > 0 
                ? `${pendingPaymentsCount} PENDING` 
                : ((paymentsList.length + workshopRegistrationsList.length) || null)}
            />
          )}
          {canAccessTab('gatepasses') && (
            <TabButton
              active={activeTab === 'gatepasses'} 
              onClick={() => handleNavigateTab('gatepasses')} 
              icon={Ticket} 
              label="Gate Passes & QR" 
              badge={gatePassesCount || null}
            />
          )}
          {canAccessTab('events') && (
            <TabButton
              active={activeTab === 'events'} 
              onClick={() => handleNavigateTab('events')} 
              icon={Trophy} 
              label="Events & Posters" 
              badge={events.length}
            />
          )}
          {canAccessTab('workshops') && (
            <TabButton 
              active={activeTab === 'workshops'} 
              onClick={() => handleNavigateTab('workshops')} 
              icon={Sparkles} 
              label="Workshops & Fee" 
              badge="NEW"
            />
          )}
          {/* Technology Club Admin Portal: Direct access to attendance & reports */}
          {canAccessTab('techclub') && (
          <TabButton
            active={activeTab === 'techclub'} 
            onClick={() => handleNavigateTab('techclub')} 
            icon={Cpu} 
            label={adminUser?.club ? `${adminUser.club} Portal` : "Tech Club Portal"} 
            badge={isTechClubAdmin ? "PORTAL" : null}
          />
          )}
          {canAccessTab('rosters') && (
          <TabButton
            active={activeTab === 'rosters'} 
            onClick={() => handleNavigateTab('rosters')} 
            icon={UserCheck} 
            label="Event Rosters & Passes" 
            badge={eventRostersCount || null}
          />
          )}
          {canAccessTab('departments') && (
          <TabButton
            active={activeTab === 'departments'} 
            onClick={() => handleNavigateTab('departments')} 
            icon={Layers} 
            label="Departments & Clubs" 
            badge={departments?.length || null}
          />
          )}
          {canAccessTab('sponsors') && (
          <TabButton
            active={activeTab === 'sponsors'} 
            onClick={() => handleNavigateTab('sponsors')} 
            icon={Award} 
            label="Sponsors & Partners" 
            badge={sponsors?.length || null}
          />
          )}
          {canAccessTab('about') && (
          <TabButton
            active={activeTab === 'about'} 
            onClick={() => handleNavigateTab('about')} 
            icon={FileText} 
            label="About & Homepage" 
          />
          )}
          {canAccessTab('schedule') && (
          <TabButton
            active={activeTab === 'schedule'} 
            onClick={() => handleNavigateTab('schedule')} 
            icon={Calendar} 
            label="3-Day Schedule" 
          />
          )}
          {canAccessTab('contact') && (
          <TabButton
            active={activeTab === 'contact'} 
            onClick={() => handleNavigateTab('contact')} 
            icon={Phone} 
            label="Contact & Inquiries" 
            badge={inquiries.length ? inquiries.length : null}
          />
          )}

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
          {/* Superadmin Maintenance Lockdown Notification Strip */}
          {isMaintenanceActive && isSuperAdmin && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-950/70 via-neutral-900/90 to-red-950/70 border border-red-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-lg">
              <div className="flex items-center gap-3 text-red-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                <span>
                  <strong>PLATFORM LOCKDOWN ACTIVE:</strong> Public site &amp; regular sub-admins are restricted to the Maintenance page. Super Admin bypass is active for this console.
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleMaintenanceMode}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-heading font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer w-fit flex-shrink-0"
              >
                Turn Lockdown OFF
              </button>
            </div>
          )}

          {activeTab === 'overview' && canAccessTab('overview') && (
            <OverviewSection 
              totalUsersCount={totalUsersCount}
              eventsCount={events.length}
              inquiriesCount={inquiries.length}
              paymentsCount={paymentsList.length}
              pendingPaymentsCount={pendingPaymentsCount}
              verifiedPaymentsCount={verifiedPaymentsCount}
              eventRostersCount={eventRostersCount}
              attendanceCount={attendanceCount}
              gatePassesCount={gatePassesCount}
              onNavigate={handleNavigateTab}
              onSeedEvents={async () => {
                try {
                  await seedDefaultEvents();
                  showToast('Default events synced to Cloudflare.');
                } catch {
                  showToast('Failed to sync default events', 'error');
                }
              }}
            />
          )}

          {activeTab === 'users' && canAccessTab('users') && (
            <TotalUsersManager onToast={showToast} />
          )}

          {activeTab === 'payments' && canAccessTab('payments') && (
            <PaymentsManager onToast={showToast} />
          )}

          {activeTab === 'gatepasses' && canAccessTab('gatepasses') && (
            <GatePassManager onToast={showToast} />
          )}

          {activeTab === 'rosters' && canAccessTab('rosters') && (
            <EventRosterManager onToast={showToast} />
          )}

          {activeTab === 'events' && canAccessTab('events') && (
            <EventsManager 
              events={events}
              onAddEvent={async (e) => {
                try {
                  await addEvent(e);
                  showToast(`Event "${e.title}" published successfully!`);
                } catch (err) {
                  showToast('Could not publish event: ' + err.message, 'error');
                }
              }}
              onUpdateEvent={async (id, e) => {
                try {
                  await updateEvent(id, e);
                  showToast(`Event "${e.title}" updated successfully!`);
                } catch (err) {
                  showToast('Could not update event: ' + err.message, 'error');
                }
              }}
              onDeleteEvent={async (id) => {
                try {
                  await deleteEvent(id);
                  showToast('Event deleted from live database.');
                } catch (err) {
                  showToast('Could not delete event: ' + err.message, 'error');
                }
              }}
              departments={departments}
            />
          )}

          {activeTab === 'workshops' && canAccessTab('workshops') && (
            <WorkshopsManager onToast={showToast} />
          )}

          {activeTab === 'departments' && canAccessTab('departments') && (
            <DepartmentsManager onToast={showToast} />
          )}

          {activeTab === 'sponsors' && canAccessTab('sponsors') && (
            <SponsorsManager onToast={showToast} />
          )}

          {activeTab === 'techclub' && canAccessTab('techclub') && (
            <TechnologyClubPanel onToast={showToast} />
          )}

          {activeTab === 'about' && canAccessTab('about') && (
            <AboutManager 
              aboutContent={aboutContent}
              onSave={async (data) => {
                await updateAboutContent(data);
                showToast('About section & Homepage content published live!');
              }}
            />
          )}

          {activeTab === 'schedule' && canAccessTab('schedule') && (
            <ScheduleManagerPage onToast={showToast} />
          )}

          {activeTab === 'contact' && canAccessTab('contact') && (
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
          ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_20px_rgba(223,37,49,0.4)]' 
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
function OverviewSection({ 
  totalUsersCount = 0,
  eventsCount, 
  inquiriesCount, 
  paymentsCount, 
  pendingPaymentsCount, 
  verifiedPaymentsCount,
  eventRostersCount, 
  attendanceCount,
  gatePassesCount,
  onNavigate, 
  onSeedEvents 
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">
          SYSTEM <span className="text-red-500 text-glow-red">OVERVIEW</span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-neutral-400 font-cyber">
          Welcome to the SAMYAK 2026 Administrator Headquarters. Real-time telemetry, pass approval, gate attendance, and roster verification.
        </p>
      </div>

      {/* Metrics Cards Grid - High contrast and modern */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricCard 
          title="TOTAL USERS DIRECTORY" 
          value={totalUsersCount || 0} 
          icon={Users} 
          desc="All student profiles, Samyak IDs & registrations"
          action={() => onNavigate('users')}
          badgeText="VERIFY"
        />
        <MetricCard 
          title="PAYMENTS & PASSES" 
          value={paymentsCount || 0} 
          icon={CreditCard} 
          desc={pendingPaymentsCount > 0 ? `${pendingPaymentsCount} Pending Approval` : `${verifiedPaymentsCount || 0} Passes Verified`}
          action={() => onNavigate('payments')}
          highlight={pendingPaymentsCount > 0}
          badgeText={pendingPaymentsCount > 0 ? `${pendingPaymentsCount} PENDING` : 'VERIFIED'}
        />
        <MetricCard 
          title="ATTENDANCE LIVE" 
          value={attendanceCount || 0} 
          icon={CheckCircle2} 
          desc={`Checked in at campus gates (${gatePassesCount || 0} total passes)`}
          action={() => onNavigate('gatepasses')}
          liveIndicator={true}
        />
        <MetricCard 
          title="EVENT ROSTERS" 
          value={eventRostersCount || 0} 
          icon={UserCheck} 
          desc="Enrolled across all events"
          action={() => onNavigate('rosters')}
        />
        <MetricCard 
          title="ACTIVE EVENTS & ARENAS" 
          value={eventsCount} 
          icon={Trophy} 
          desc="Competitions & flagship showcases"
          action={() => onNavigate('events')}
        />
        <MetricCard 
          title="CONTACT INQUIRIES" 
          value={inquiriesCount} 
          icon={Mail} 
          desc="External visitor queries"
          action={() => onNavigate('contact')}
        />
        <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-neutral-800 hover:border-red-500/50 shadow-lg flex flex-col justify-between transition-all">
          <div>
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest flex items-center justify-between">
              <span>FIRESTORE LIVE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-2xl font-black font-heading text-emerald-400 mt-2 flex items-center gap-2">
              <span>CONNECTED</span>
            </div>
            <p className="text-[11px] font-mono text-neutral-400 mt-1">
              Cluster: <span className="text-white font-bold">kl--samyak</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onSeedEvents}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-white transition-colors flex items-center justify-center gap-1.5 border border-neutral-700 hover:border-red-500 cursor-pointer"
            title="Sync all initial events to Firestore"
          >
            <RefreshCw className="w-3.5 h-3.5 text-red-400" />
            <span>Sync Default Events</span>
          </button>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="p-6 rounded-3xl bg-[#0D0D0D] border border-neutral-800 shadow-xl">
        <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-red-500" />
          <span>Quick Control Actions</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('payments')}
            className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/40 hover:border-amber-400 flex items-center gap-3 text-left transition-all group cursor-pointer"
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
            className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-red-500/40 flex items-center gap-3 text-left transition-all group cursor-pointer"
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
            onClick={() => onNavigate('gatepasses')}
            className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-red-500/40 flex items-center gap-3 text-left transition-all group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-bold text-xs uppercase text-white">Gate Passes &amp; QR</div>
              <div className="text-[11px] text-neutral-400 font-cyber">Live gate check-in &amp; scanner</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('about')}
            className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-red-500/40 flex items-center gap-3 text-left transition-all group cursor-pointer"
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

function MetricCard({ title, value, icon: Icon, desc, action, highlight, badgeText, liveIndicator }) {
  return (
    <div 
      onClick={action}
      className={`p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between shadow-lg ${
        highlight 
          ? 'bg-[#150a0a] border-red-500/80 hover:border-red-400 shadow-[0_0_25px_rgba(223,37,49,0.25)]' 
          : 'bg-[#0D0D0D] border-neutral-800 hover:border-red-500/50 hover:shadow-[0_8px_30px_rgba(223,37,49,0.15)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-mono uppercase tracking-wider font-bold ${highlight ? 'text-red-400' : 'text-neutral-300'}`}>
          {title}
        </span>
        <div className={`p-2 rounded-xl transition-colors ${
          highlight 
            ? 'bg-red-500/20 text-red-300' 
            : 'bg-neutral-900 group-hover:bg-red-600/20 text-neutral-300 group-hover:text-red-400 border border-neutral-800 group-hover:border-red-500/30'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <div className="text-3xl sm:text-4xl font-black font-heading text-white tracking-tight leading-none">
            {value}
          </div>
          {liveIndicator && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Real-time listener active" />
          )}
        </div>
        <div className="text-xs font-mono mt-2 text-neutral-400 flex items-center justify-between">
          <span className="truncate">{desc}</span>
          {badgeText && (
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
              highlight ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {badgeText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// 2. EVENTS & POSTERS MANAGER
function EventsManager({ events, onUpdateEvent, onDeleteEvent, departments, onToast }) {
  const navigate = useNavigate();
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterClub, setFilterClub] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Active' | 'Cancelled'
  const [sortBy, setSortBy] = useState('order'); // 'order' | 'time' | 'title'
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique departments from events and departments list
  const departmentOptions = useMemo(() => {
    const set = new Set();
    if (Array.isArray(departments)) {
      departments.forEach((d) => {
        if (d?.name) set.add(d.name.trim());
        if (d?.code) set.add(d.code.trim());
      });
    }
    if (Array.isArray(events)) {
      events.forEach((e) => {
        if (e?.department && typeof e.department === 'string' && e.department.trim()) {
          set.add(e.department.trim());
        }
      });
    }
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [events, departments]);

  // Extract unique clubs from events
  const clubOptions = useMemo(() => {
    const set = new Set();
    if (Array.isArray(events)) {
      events.forEach((e) => {
        if (e?.club && typeof e.club === 'string' && e.club.trim()) {
          set.add(e.club.trim());
        }
      });
    }
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const filteredEvents = useMemo(() => {
    let list = events.filter((e) => {
      const matchCat = filterCategory === 'All' || e.category === filterCategory;
      const matchDept = filterDepartment === 'All' || (e.department && e.department.trim().toLowerCase() === filterDepartment.toLowerCase());
      const matchClub = filterClub === 'All' || (e.club && e.club.trim().toLowerCase() === filterClub.toLowerCase());
      const isCanc = Boolean(e.isCancelled || e.status === 'Cancelled' || e.registrationStatus === 'Cancelled');
      const matchStatus = 
        filterStatus === 'All' || 
        (filterStatus === 'Active' && !isCanc) || 
        (filterStatus === 'Cancelled' && isCanc);
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || [e.title, e.club, e.department].some((v) => String(v || '').toLowerCase().includes(q));
      return matchCat && matchDept && matchClub && matchStatus && matchSearch;
    });

    // Same order the public events page uses (0 = no explicit order, goes last).
    if (sortBy === 'order') {
      list.sort(compareEventsByOrderAndTime);
    } else if (sortBy === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return list;
  }, [events, filterCategory, filterDepartment, filterClub, filterStatus, sortBy, searchQuery]);

  const hasActiveFilters = filterCategory !== 'All' || filterDepartment !== 'All' || filterClub !== 'All' || filterStatus !== 'All' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setFilterCategory('All');
    setFilterDepartment('All');
    setFilterClub('All');
    setFilterStatus('All');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-heading text-white">
            EVENTS &amp; <span className="text-red-500">POSTERS</span>
          </h2>
          <p className="text-xs text-slate-400 font-cyber">
            Add new competitions, configure display order priority, mark cancelled events, upload posters, and filter by club or department.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/samyakeventsedit')}
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(223,37,49,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Event</span>
        </button>
      </div>

      {/* Filters & Search & Ordering Bar with Club and Department filters */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3 shadow-lg">
        {/* Top search & quick counts */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search posters by title, club or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
            <span className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400">
              Showing <strong className="text-white">{filteredEvents.length}</strong> of {events.length} posters
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-400 hover:text-white hover:bg-red-900/60 transition-colors flex items-center gap-1.5 cursor-pointer font-bold"
                title="Reset all filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* 5-Column Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-neutral-800/80">
          {/* 1. Department Filter */}
          <div>
            <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1 font-semibold flex items-center gap-1">
              <span>Department</span>
              {filterDepartment !== 'All' && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className={`w-full px-3 py-2 bg-neutral-950 border rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500 cursor-pointer ${
                filterDepartment !== 'All' ? 'border-red-500/60 bg-red-950/20' : 'border-neutral-800'
              }`}
            >
              <option value="All">All Departments ({departmentOptions.length})</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* 2. Club Filter */}
          <div>
            <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1 font-semibold flex items-center gap-1">
              <span>Club / Organizers</span>
              {filterClub !== 'All' && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
            </label>
            <select
              value={filterClub}
              onChange={(e) => setFilterClub(e.target.value)}
              className={`w-full px-3 py-2 bg-neutral-950 border rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500 cursor-pointer ${
                filterClub !== 'All' ? 'border-red-500/60 bg-red-950/20' : 'border-neutral-800'
              }`}
            >
              <option value="All">All Clubs ({clubOptions.length})</option>
              {clubOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 3. Category Filter */}
          <div>
            <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1 font-semibold">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`w-full px-3 py-2 bg-neutral-950 border rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500 cursor-pointer ${
                filterCategory !== 'All' ? 'border-red-500/60 bg-red-950/20' : 'border-neutral-800'
              }`}
            >
              <option value="All">All Categories</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 4. Status Filter */}
          <div>
            <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1 font-semibold">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`w-full px-3 py-2 bg-neutral-950 border rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500 cursor-pointer ${
                filterStatus !== 'All' ? 'border-red-500/60 bg-red-950/20' : 'border-neutral-800'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Cancelled">Cancelled Events</option>
            </select>
          </div>

          {/* 5. Sort By */}
          <div>
            <label className="block text-[10px] font-mono text-amber-300 uppercase tracking-wider mb-1 font-semibold">
              Sort Sequence
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="order">Order Priority (#)</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800">
          <AlertCircle className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
          <h3 className="text-base font-heading font-bold text-white mb-1">No Posters Found</h3>
          <p className="text-xs text-neutral-400 font-cyber mb-4">
            No events match the selected department, club, category, or status filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold transition-all cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((ev) => {
            const isCancelled = Boolean(ev.isCancelled || ev.status === 'Cancelled' || ev.registrationStatus === 'Cancelled');

            return (
              <div 
                key={ev.id}
                className={`p-4 rounded-2xl bg-neutral-900/60 border transition-all flex flex-col justify-between ${
                  isCancelled
                    ? 'border-red-500/80 bg-red-950/20 shadow-[0_0_20px_rgba(223,37,49,0.2)]'
                    : ev.featured 
                    ? 'border-amber-500/50 shadow-[0_0_20px_rgba(223,37,49,0.15)] bg-neutral-900/80' 
                    : 'border-neutral-800 hover:border-red-500/30'
                }`}
              >
                <div>
                  <div className="relative h-44 rounded-xl overflow-hidden bg-black mb-3 border border-neutral-800">
                    <img 
                      src={ev.image || '/hero-bg.png'} 
                      alt={ev.title} 
                      className="w-full h-full object-cover" 
                    />
                    
                    {/* Category Pill */}
                    <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-red-500/40 text-[10px] font-mono text-red-400">
                      {ev.category}
                    </div>

                    {/* Cancelled Pill Overlay */}
                    {isCancelled && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center pointer-events-none">
                        <span className="px-4 py-1.5 rounded-full bg-red-600 text-white font-mono font-black text-xs uppercase tracking-widest border border-white/40 shadow-[0_0_20px_rgba(223,37,49,0.9)]">
                          🚫 CANCELLED
                        </span>
                      </div>
                    )}

                    {/* Star / Feature on Home Button */}
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newFeatured = !ev.featured;
                        if (onUpdateEvent) {
                          await onUpdateEvent(ev.id, { ...ev, featured: newFeatured });
                        }
                        if (onToast) {
                          onToast(
                            newFeatured ? `⭐ "${ev.title}" featured on Home Page!` : `Removed "${ev.title}" from Home Page featured.`,
                            newFeatured ? 'success' : 'info'
                          );
                        }
                      }}
                      title={ev.featured ? 'Featured on Home Page (Click to unfeature)' : 'Star event to feature on Home Page'}
                      className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg backdrop-blur-md transition-all z-10 cursor-pointer flex items-center gap-1.5 shadow-lg ${
                        ev.featured
                          ? 'bg-amber-500 text-black font-black border border-amber-300 shadow-[0_0_15px_rgba(223,37,49,0.6)] scale-105'
                          : 'bg-black/75 text-neutral-300 border border-neutral-700 hover:text-amber-300 hover:border-amber-400/60'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${ev.featured ? 'fill-black' : ''}`} />
                      <span className="text-[10px] font-mono font-bold uppercase">
                        {ev.featured ? 'Featured' : 'Star'}
                      </span>
                    </button>

                    {ev.prize && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-red-600/90 text-[10px] font-mono text-white font-bold">
                        {ev.prize}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-[10px] font-mono text-red-400 font-bold">
                      {ev.department || 'KL'}
                    </span>
                    
                    {/* Display Order Badge */}
                    <span className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-[10px] font-mono text-amber-300 font-bold">
                      Order: #{ev.displayOrder ?? ev.order ?? '-'}
                    </span>

                    {ev.club && (
                      <span className="px-2 py-0.5 rounded-full bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-300 truncate max-w-[140px]">
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
                    <span>{ev.date} · {ev.time}</span>
                    <span className="text-red-400 font-bold">{ev.fee || 'Free'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => navigate(`/samyakeventsedit/${ev.id}`)}
                    className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Edit</span>
                  </button>

                  {/* Cancel / Restore Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      const nextCanc = !isCancelled;
                      if (onUpdateEvent) {
                        await onUpdateEvent(ev.id, {
                          ...ev,
                          isCancelled: nextCanc,
                          registrationStatus: nextCanc ? 'Cancelled' : 'Open'
                        });
                      }
                      if (onToast) onToast(nextCanc ? `"${ev.title}" marked as CANCELLED.` : `"${ev.title}" restored to ACTIVE.`);
                    }}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isCancelled
                        ? 'bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300'
                        : 'bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-400'
                    }`}
                    title={isCancelled ? "Restore this event to active" : "Cancel this event"}
                  >
                    <span>{isCancelled ? 'Restore' : 'Cancel'}</span>
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
            );
          })}
        </div>
      )}
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
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">Brand Logo (Cloudflare Direct Upload)</label>
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
            className="px-8 py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 font-heading font-black text-xs uppercase tracking-wider text-white shadow-[0_0_25px_rgba(223,37,49,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Publish Homepage Changes Live</span>
          </button>
        </div>
      </div>
    </div>
  );
}



// 6. CONTACT & INQUIRIES MANAGER
function ContactManager({ contactContent, inquiries, onSave }) {
  const [form, setForm] = useState({
    phone: '',
    email: '',
    address: '',
    ...contactContent,
    socials: {
      instagram: 'https://www.instagram.com/kluniversity/',
      youtube: 'https://www.youtube.com/@kl.samyak',
      linkedin: 'https://www.linkedin.com/school/kluniversity/',
      twitter: 'https://x.com/KLUniversity',
      facebook: 'https://www.facebook.com/KLUniversity',
      ...(contactContent?.socials || {})
    }
  });

  useEffect(() => {
    if (contactContent) {
      setForm((prev) => ({
        ...prev,
        ...contactContent,
        socials: {
          instagram: 'https://www.instagram.com/kluniversity/',
          youtube: 'https://www.youtube.com/@kl.samyak',
          linkedin: 'https://www.linkedin.com/school/kluniversity/',
          twitter: 'https://x.com/KLUniversity',
          facebook: 'https://www.facebook.com/KLUniversity',
          ...(contactContent?.socials || {})
        }
      }));
    }
  }, [contactContent]);

  const updateSocial = (key, val) => {
    setForm((prev) => ({
      ...prev,
      socials: {
        ...(prev.socials || {}),
        [key]: val,
      },
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black font-heading text-white">
          CONTACT INFO &amp; <span className="text-red-500">STUDENT INQUIRIES</span>
        </h2>
        <p className="text-xs text-slate-400 font-cyber">
          Update central committee telephone hotlines, email, campus venue address, official social media feeds, and view public inquiries.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800 space-y-6">
        <div>
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-red-400">
            Festival Official Contact Details
          </h3>
          <p className="text-[11px] text-neutral-400 font-cyber mt-0.5">
            These details appear live on the Contact Us page and footer helpline cards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">Helpline Phone Number</label>
            <input
              type="text"
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. +91 863 2399999 / +91 98480 12345"
              className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">Official Support Email</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="e.g. samyak2026@kluniversity.in"
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
            placeholder="e.g. KL Deemed to be University, Green Fields, Vaddeswaram..."
            className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
          />
        </div>

        {/* OFFICIAL SOCIAL FEEDS SECTION */}
        <div className="pt-6 border-t border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-red-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                OFFICIAL SOCIAL FEEDS
              </h3>
              <p className="text-[11px] text-neutral-400 font-cyber mt-0.5">
                Configure destination links for the 5 official social channels on the Contact page &amp; footer.
              </p>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-full">
              Live in Navigation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Instagram */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
              <label className="text-[11px] font-mono text-neutral-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <InstagramIcon className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold">Instagram URL</span>
              </label>
              <input
                type="url"
                placeholder="https://www.instagram.com/kluniversity/"
                value={form.socials?.instagram || ''}
                onChange={(e) => updateSocial('instagram', e.target.value)}
                className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
              />
            </div>

            {/* YouTube */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
              <label className="text-[11px] font-mono text-neutral-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <YoutubeIcon className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold">YouTube URL</span>
              </label>
              <input
                type="url"
                placeholder="https://www.youtube.com/@kl.samyak"
                value={form.socials?.youtube || ''}
                onChange={(e) => updateSocial('youtube', e.target.value)}
                className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
              />
            </div>

            {/* LinkedIn */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
              <label className="text-[11px] font-mono text-neutral-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <LinkedinIcon className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold">LinkedIn URL</span>
              </label>
              <input
                type="url"
                placeholder="https://www.linkedin.com/school/kluniversity/"
                value={form.socials?.linkedin || ''}
                onChange={(e) => updateSocial('linkedin', e.target.value)}
                className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
              />
            </div>

            {/* X / Twitter */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
              <label className="text-[11px] font-mono text-neutral-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200">
                  <TwitterIcon className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold">X (Twitter) URL</span>
              </label>
              <input
                type="url"
                placeholder="https://x.com/KLUniversity"
                value={form.socials?.twitter || ''}
                onChange={(e) => updateSocial('twitter', e.target.value)}
                className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Facebook */}
            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
              <label className="text-[11px] font-mono text-neutral-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600/10 border border-blue-600/30 flex items-center justify-center text-blue-500">
                  <FacebookIcon className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold">Facebook Page URL</span>
              </label>
              <input
                type="url"
                placeholder="https://www.facebook.com/KLUniversity"
                value={form.socials?.facebook || ''}
                onChange={(e) => updateSocial('facebook', e.target.value)}
                className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-neutral-800">
          <button
            type="button"
            onClick={() => onSave(form)}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-heading font-black text-xs uppercase tracking-wider text-white shadow-[0_0_20px_rgba(223,37,49,0.35)] flex items-center gap-2 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Update Contact &amp; Social Feeds</span>
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
