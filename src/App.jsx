import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Global Components
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import GlobalAudioPlayer from './components/Audio/GlobalAudioPlayer';
import CustomCursor from './components/Cursor/CustomCursor';
import ScrollProgress from './components/ScrollProgress/ScrollProgress';
import ParticleBackground from './components/ParticleBackground/ParticleBackground';
import ScrollToTop from './components/ScrollToTop';
import SmoothScroll from './components/SmoothScroll';

// Pages
import Home from './pages/Home';
import AboutPage from './pages/AboutPage';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import SchedulePage from './pages/SchedulePage';
import GalleryPage from './pages/GalleryPage';
import MediaExplorerPage from './pages/MediaExplorerPage';
import ProfilePage from './pages/ProfilePage';
import PaymentPage from './pages/PaymentPage';
import ContactPage from './pages/ContactPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminLoginPage from './pages/Admin/AdminLoginPage';
import EventEditorPage from './pages/Admin/EventEditorPage';
import GateScannerPage from './pages/GateScannerPage';
import GateVerifyPage from './pages/GateVerifyPage';
import EnrollPage from './pages/EnrollPage';
import MaintenancePage from './pages/MaintenancePage';
import { IS_MAINTENANCE_MODE, fetchEdgeStatus } from './config/maintenanceConfig';
import { initIntegrityGuard } from './services/integrityGuard';

import { db, doc, onSnapshot } from './services/firebase';

export default function App() {
  const location = useLocation();
  const [isLocked, setIsLocked] = useState(IS_MAINTENANCE_MODE);
  const [lockReason, setLockReason] = useState(null);
  const [tamperBreach, setTamperBreach] = useState(false);

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

  // Display locked screen if tampered or maintenance active (unless master bypass key used)
  if ((isLocked && !isMasterBypass) || tamperBreach) {
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
      {/* Global Polish Effects */}
      <ScrollToTop />
      <SmoothScroll />
      {!isDedicatedAppRoute && <ScrollProgress />}
      <CustomCursor />
      <ParticleBackground />

      {/* Persistent Cyber Navigation (Public Site) */}
      {!isDedicatedAppRoute && <Navbar />}

      {/* Main Page Routing with Smooth Transitions */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/media" element={<MediaExplorerPage />} />
            <Route path="/media/:eventId" element={<MediaExplorerPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* /enroll — new registration wizard (primary enrollment entry point) */}
            <Route path="/enroll" element={<EnrollPage />} />
            {/* /payment — redirect to /enroll for backward compatibility */}
            <Route path="/payment" element={<Navigate to="/enroll" replace />} />
            <Route path="/contact" element={<ContactPage />} />

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
      </main>

      {/* Cyber Footer */}
      {!isDedicatedAppRoute && <Footer />}

      {/* Global Background Audio Player */}
      {!isDedicatedAppRoute && <GlobalAudioPlayer />}
    </div>
  );
}
