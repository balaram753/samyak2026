import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Global Components
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import CustomCursor from './components/Cursor/CustomCursor';
import ScrollProgress from './components/ScrollProgress/ScrollProgress';
import ParticleBackground from './components/ParticleBackground/ParticleBackground';
import ScrollToTop from './components/ScrollToTop';
import SmoothScroll from './components/SmoothScroll';
import ErrorBoundary from './components/ErrorBoundary';

// Critical Pages (Eagerly Loaded for Instant First Paint)
import Home from './pages/Home';
import AboutPage from './pages/AboutPage';

// Code-Split Routes (Lazy loaded with auto-retry and chunk-recovery)
import { lazyWithRetry } from './utils/lazyWithRetry';

const EventsPage = lazyWithRetry(() => import('./pages/EventsPage'), 'EventsPage');
const EventDetailsPage = lazyWithRetry(() => import('./pages/EventDetailsPage'), 'EventDetailsPage');
const EventRegistrationPage = lazyWithRetry(() => import('./pages/EventRegistrationPage'), 'EventRegistrationPage');
const WorkshopsPage = lazyWithRetry(() => import('./pages/WorkshopsPage'), 'WorkshopsPage');
const WorkshopDetailsPage = lazyWithRetry(() => import('./pages/WorkshopDetailsPage'), 'WorkshopDetailsPage');
const SchedulePage = lazyWithRetry(() => import('./pages/SchedulePage'), 'SchedulePage');
const GalleryPage = lazyWithRetry(() => import('./pages/GalleryPage'), 'GalleryPage');
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage'), 'ProfilePage');
const PaymentPage = lazyWithRetry(() => import('./pages/PaymentPage'), 'PaymentPage');
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage'), 'ContactPage');
const CoreRegisterPage = lazyWithRetry(() => import('./pages/CoreRegisterPage'), 'CoreRegisterPage');
const AdminDashboard = lazyWithRetry(() => import('./pages/Admin/AdminDashboard'), 'AdminDashboard');
const AdminLoginPage = lazyWithRetry(() => import('./pages/Admin/AdminLoginPage'), 'AdminLoginPage');
const EventEditorPage = lazyWithRetry(() => import('./pages/Admin/EventEditorPage'), 'EventEditorPage');
const GateScannerPage = lazyWithRetry(() => import('./pages/GateScannerPage'), 'GateScannerPage');
const GateVerifyPage = lazyWithRetry(() => import('./pages/GateVerifyPage'), 'GateVerifyPage');
const MaintenancePage = lazyWithRetry(() => import('./pages/MaintenancePage'), 'MaintenancePage');
import { IS_MAINTENANCE_MODE, fetchEdgeStatus } from './config/maintenanceConfig';
import { initIntegrityGuard } from './services/integrityGuard';

import { db, doc, onSnapshot } from './services/firebase';
import { useAdminAuth } from './context/AdminAuthContext';

import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import PreloaderDemo from './components/ui/demo';

export default function App() {
  const location = useLocation();
  const { isSuperAdmin } = useAdminAuth();
  const [isLocked, setIsLocked] = useState(IS_MAINTENANCE_MODE);
  const [lockReason, setLockReason] = useState(null);
  const [tamperBreach, setTamperBreach] = useState(false);

  // Initial Preloader Gate (runs for 3-4 seconds on entry, bypassable on click or dedicated staff routes)
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    if (
      path.startsWith('/admin') ||
      path.startsWith('/samyakadmin') ||
      path.startsWith('/samyakeventsedit') ||
      path.startsWith('/gate') ||
      path === '/demo' ||
      path === '/loading' ||
      path === '/preloader'
    ) {
      return false;
    }
    return true;
  });

  // Author Master Bypass mechanism: Visiting ?bypass=balaram753 allows developer preview
  // Visiting ?bypass=off or ?bypass=clear resets it to verify maintenance mode as a visitor
  const searchParams = new URLSearchParams(location.search);
  const queryBypass = searchParams.get('bypass');

  if (typeof window !== 'undefined') {
    if (queryBypass === 'balaram753') {
      localStorage.setItem('samyak_dev_bypass', 'balaram753');
    } else if (queryBypass === 'off' || queryBypass === 'clear' || queryBypass === 'false') {
      localStorage.removeItem('samyak_dev_bypass');
    }
  }

  const isMasterBypass = 
    queryBypass === 'balaram753' || 
    (typeof window !== 'undefined' && 
     localStorage.getItem('samyak_dev_bypass') === 'balaram753' && 
     queryBypass !== 'off' && 
     queryBypass !== 'clear' && 
     queryBypass !== 'false');

  // 1. Live Maintenance status check: Build-time env var + Edge status + Real-time Firestore sync
  useEffect(() => {
    let isMounted = true;

    async function checkEdge() {
      const status = await fetchEdgeStatus();
      if (isMounted) {
        setIsLocked((prev) => status.isLocked || prev);
        if (status.reason) setLockReason(status.reason);
      }
    }
    checkEdge();

    // Real-time Firestore sync for instant zero-rebuild maintenance toggle
    let unsubFirestore = () => {};
    try {
      const settingsRef = doc(db, 'site_content', 'settings');
      unsubFirestore = onSnapshot(settingsRef, (snap) => {
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (data.maintenance_mode === true) {
            setIsLocked(true);
            setLockReason(data.maintenance_reason || "Scheduled Platform Maintenance");
          } else if (data.maintenance_mode === false && !IS_MAINTENANCE_MODE) {
            setIsLocked(false);
          }
        }
      }, () => {});
    } catch {}

    const interval = setInterval(checkEdge, 15000); // 15-second heartbeat
    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubFirestore();
    };
  }, []);

  // 2. Continuous Anti-Tamper & Attribution Guard
  useEffect(() => {
    const unguard = initIntegrityGuard((reason) => {
      console.warn("INTEGRITY SECURITY GUARD TRIGGERED:", reason);
      setTamperBreach(true);
      setIsLocked(true);
      setLockReason(reason);
    });
    return unguard;
  }, []);

  useEffect(() => {
    if (!isLocked || isMasterBypass) {
      ScrollTrigger.refresh();
    }
  }, [location.pathname, isLocked, isMasterBypass]);

  // Check if current session is an authorized Super Admin
  const isSuperAdminSession = Boolean(
    isMasterBypass || 
    isSuperAdmin ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('samyak_dev_bypass') === 'balaram753'
    ))
  );

  const isAuthLoginRoute = location.pathname.includes('/login');

  // Display locked screen if maintenance active (unless Super Admin session or login page)
  if ((isLocked && !isSuperAdminSession && !isAuthLoginRoute) || (tamperBreach && !isMasterBypass)) {
    return <MaintenancePage customReason={lockReason} isTampered={tamperBreach} />;
  }

  const isAdminRoute = 
    location.pathname.startsWith('/admin') || 
    location.pathname.startsWith('/samyakadmin') || 
    location.pathname.startsWith('/samyakeventsedit');
  const isScannerRoute = location.pathname.startsWith('/gate');
  const isDedicatedAppRoute = isAdminRoute || isScannerRoute;

  return (
    <div className="relative min-h-screen bg-black text-slate-100 selection:bg-red-600 selection:text-white">
      {/* Cinematic Onyx Glyph Preloader (Runs for 3-4s on initial entry, click/enter to rush) */}
      {isLoading && !isDedicatedAppRoute && (
        <LoadingScreen onComplete={() => setIsLoading(false)} />
      )}

      {/* Global Polish Effects */}
      <ScrollToTop />
      {!isDedicatedAppRoute && <SmoothScroll />}
      {!isDedicatedAppRoute && <ScrollProgress />}
      <CustomCursor />
      <ParticleBackground />

      {/* Persistent Cyber Navigation (Public Site) */}
      {!isDedicatedAppRoute && <Navbar />}

      {/* Main Page Routing with Smooth Transitions & Error Containment */}
      <main className="relative z-10">
        <ErrorBoundary>
          <Suspense fallback={
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
              <span className="text-[11px] font-mono tracking-widest text-neutral-400 uppercase">Loading Experience...</span>
            </div>
          }>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:id" element={<EventDetailsPage />} />
                <Route path="/events/:id/register" element={<EventRegistrationPage />} />
                <Route path="/events/:id/pass" element={<EventRegistrationPage />} />
                <Route path="/workshops" element={<WorkshopsPage />} />
                <Route path="/workshops/:id" element={<WorkshopDetailsPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/media/*" element={<Navigate to="/" replace />} />
                <Route path="/media" element={<Navigate to="/" replace />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/register" element={<PaymentPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/team/*" element={<Navigate to="/" replace />} />
                <Route path="/team" element={<Navigate to="/" replace />} />
                <Route path="/core-register/:token" element={<CoreRegisterPage />} />

                {/* Preloader & Loading Page Dedicated Routes */}
                <Route path="/loading" element={<LoadingScreen loop={true} />} />
                <Route path="/preloader" element={<LoadingScreen loop={true} />} />
                <Route path="/demo" element={<PreloaderDemo />} />

                {/* Gate Staff & Security Scanner Routes */}
                <Route path="/gate" element={<GateScannerPage />} />
                <Route path="/gate/scanner" element={<GateScannerPage />} />
                <Route path="/gate/verify/:token" element={<GateVerifyPage />} />
                
                {/* Dedicated Admin Portal Routes & Pages */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/samyakadmin/login" element={<AdminLoginPage />} />
                <Route path="/samyakadmin" element={<Navigate to="/samyakadmin/dashboard" replace />} />
                <Route path="/samyakadmin/*" element={<AdminDashboard />} />
                <Route path="/samyakeventsedit" element={<EventEditorPage />} />
                <Route path="/samyakeventsedit/:id" element={<EventEditorPage />} />
                <Route path="/admin" element={<Navigate to="/samyakadmin/dashboard" replace />} />
                <Route path="/admin/*" element={<AdminDashboard />} />

                <Route path="*" element={<Home />} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Cyber Footer: Public full footer or Dedicated Admin Attribution Footer */}
      {!isDedicatedAppRoute ? (
        <Footer />
      ) : (
        <footer className="relative z-20 w-full py-3 px-6 border-t border-neutral-900 bg-black/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-500 text-[11px]">
            <span>© 2026 SAMYAK Admin Console</span>
            <span>·</span>
            <span>KL Deemed to be University</span>
          </div>

          <div
            id="samyak-lead-architect-credit"
            className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-400 font-mono"
          >
            <span className="text-neutral-500 text-[10px] uppercase tracking-wider">Designed &amp; Developed by</span>
            <a
              href="https://udaykiranportfolio.web.app/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-neutral-300 hover:text-red-400 hover:underline transition-colors"
            >
              Uday Kiran Vempati
            </a>
            <span className="text-neutral-600">&amp;</span>
            <a
              id="samyak-author-link"
              href="https://github.com/balaram753"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-neutral-300 hover:text-red-400 hover:underline transition-colors"
            >
              Balaram (@balaram753)
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
