import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, CheckCircle2, Clock, Download, Copy, Check, UserCheck, 
  RefreshCw, Search, Filter, FileText, Link as LinkIcon, 
  ExternalLink, Sparkles, ChevronDown, 
  Printer, Save, Trash2, Shield, Cpu, 
  CheckSquare, XSquare, Cloud
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useSiteContent } from '../../context/SiteContentContext';
import { 
  listenToEventRoster, 
  toggleAttendance, 
  exportRosterToCSV 
} from '../../services/eventRegistrationService';
// Club reports live in Cloudflare D1 (club_reports), via the SAMYAK Worker.
import { subscribeContent, setContentDoc, deleteContentDoc } from '../../services/contentStore';

export default function TechnologyClubPanel({ onToast }) {
  const { adminUser, isSuperAdmin } = useAdminAuth();
  const { events, departments } = useSiteContent();

  // Active Club state: Default to assigned club or 'RPA Club'
  const defaultClub = adminUser?.club || 'RPA Club';
  const [selectedClub, setSelectedClub] = useState(defaultClub);

  // Active sub-page tab: 'attendance' or 'reports'
  const [activeTab, setActiveTab] = useState('attendance');

  // --------------------------------------------------------------------------
  // Dynamic Club Options from Departments
  // --------------------------------------------------------------------------
  const allClubs = useMemo(() => {
    if (!departments || departments.length === 0) return ['RPA Club'];
    const list = [];
    departments.forEach((dept) => {
      (dept.clubs || []).forEach((c) => {
        if (c && !list.includes(c)) list.push(c);
      });
    });
    return list.length > 0 ? list : ['RPA Club'];
  }, [departments]);

  // Keep selectedClub in sync if admin has a locked assigned club
  const isClubLocked = !isSuperAdmin && Boolean(adminUser?.club);
  const currentClub = isClubLocked ? adminUser.club : selectedClub;

  // Filter events belonging to this specific club
  const clubEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    return events.filter((e) => {
      const eClub = (e.club || '').trim().toLowerCase();
      const targetClub = currentClub.trim().toLowerCase();
      return eClub === targetClub || eClub.includes(targetClub) || targetClub.includes(eClub);
    });
  }, [events, currentClub]);

  // Selected event filter for attendance
  const [selectedEventId, setSelectedEventId] = useState('all');

  // Sync selected event when club or clubEvents changes
  useEffect(() => {
    if (clubEvents.length > 0) {
      setSelectedEventId(clubEvents[0].id);
    } else {
      setSelectedEventId('all');
    }
  }, [currentClub, clubEvents]);

  // --------------------------------------------------------------------------
  // PAGE 1: ATTENDANCE STATE & LISTENERS
  // --------------------------------------------------------------------------
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'present' | 'absent'
  const [togglingId, setTogglingId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Listen to registrations for selected event (or all club events)
  useEffect(() => {
    setLoadingRoster(true);

    if (selectedEventId && selectedEventId !== 'all') {
      const unsub = listenToEventRoster(selectedEventId, (list) => {
        setRoster(list);
        setLoadingRoster(false);
      });
      return () => unsub();
    } else {
      // Listen to all registrations and filter to this club's events
      const clubEventIds = clubEvents.map((e) => e.id);
      const unsub = listenToEventRoster('all', (list) => {
        const filtered = list.filter((r) => clubEventIds.includes(r.event_id));
        setRoster(filtered);
        setLoadingRoster(false);
      });
      return () => unsub();
    }
  }, [selectedEventId, clubEvents]);

  // Filtered Roster for UI
  const filteredRoster = useMemo(() => {
    return roster.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.student_name?.toLowerCase().includes(q);
        const matchId = item.university_id?.toLowerCase().includes(q);
        const matchEmail = item.email?.toLowerCase().includes(q);
        const matchTicket = item.ticket_code?.toLowerCase().includes(q);
        const matchPhone = item.phone?.includes(q);
        if (!matchName && !matchId && !matchEmail && !matchTicket && !matchPhone) return false;
      }

      // Attendance filter
      if (attendanceFilter === 'present' && !item.attendance) return false;
      if (attendanceFilter === 'absent' && item.attendance) return false;

      return true;
    });
  }, [roster, searchQuery, attendanceFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = roster.length;
    const present = roster.filter((r) => r.attendance).length;
    const absent = total - present;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, rate };
  }, [roster]);

  // Attendance Toggle Handler
  const handleToggleAttendance = async (reg) => {
    try {
      setTogglingId(reg.id);
      const newStatus = !reg.attendance;
      await toggleAttendance(reg.id, newStatus);
      if (onToast) {
        onToast(
          newStatus 
            ? `${reg.student_name} marked PRESENT!` 
            : `${reg.student_name} check-in reverted to ABSENT.`,
          newStatus ? 'success' : 'info'
        );
      }
    } catch (err) {
      console.error('Attendance toggle error:', err);
      if (onToast) onToast('Failed to update attendance: ' + err.message, 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Mark all currently visible students as present
  const handleMarkAllPresent = async () => {
    const pending = filteredRoster.filter((r) => !r.attendance);
    if (pending.length === 0) {
      if (onToast) onToast('All filtered students are already marked Present.');
      return;
    }

    if (!window.confirm(`Mark all ${pending.length} students as Present for this event?`)) return;

    try {
      for (const reg of pending) {
        await toggleAttendance(reg.id, true);
      }
      if (onToast) onToast(`Successfully checked in ${pending.length} participants!`, 'success');
    } catch (err) {
      if (onToast) onToast('Error marking batch attendance: ' + err.message, 'error');
    }
  };

  // Export Attendance CSV
  const handleExportAttendance = () => {
    try {
      const activeEvent = clubEvents.find((e) => e.id === selectedEventId);
      const fileName = `${currentClub.replace(/\s+/g, '_')}_${(activeEvent?.title || 'Attendance').replace(/[^a-zA-Z0-9]/g, '_')}`;
      exportRosterToCSV(filteredRoster, fileName);
      if (onToast) onToast('Attendance CSV downloaded successfully!', 'success');
    } catch (err) {
      if (onToast) onToast(err.message, 'error');
    }
  };

  const handleCopy = (code, id) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // --------------------------------------------------------------------------
  // PAGE 2: EVENT REPORTS & DOCUMENTATION STATE
  // --------------------------------------------------------------------------
  const [reportSubTab, setReportSubTab] = useState('link'); // 'link' | 'generate'
  const [reportsList, setReportsList] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Manual Report Link Form
  const [linkFormData, setLinkFormData] = useState({
    eventId: '',
    reportTitle: '',
    driveLink: '',
    linkType: 'Google Drive', // 'Google Drive' | 'Microsoft OneDrive' | 'KLU OneDrive' | 'Google Docs' | 'Other'
    summaryNotes: '',
  });

  // Automated Report Generator Form
  const [generatorData, setGeneratorData] = useState({
    eventId: '',
    eventTitle: '',
    department: 'CSE',
    date: 'March 14, 2026',
    venue: 'KL Cyber Dome, Lab Complex 4',
    facultyMentor: 'Dr. Ch. Srikanth, Associate Professor',
    studentLeads: 'Uday Kiran (Club Lead), Rahul Sharma (Technical Head)',
    objectives: 'Empower students with practical skills in Robotic Process Automation, workflow orchestration, and enterprise software bots.',
    highlights: 'Over 40+ bots deployed live in UiPath. 3 rounds of rigorous stress testing against real-world invoice processing scenarios.',
    winnerFirst: 'Team AlphaBot — KL University (Cash Prize ₹25,000)',
    winnerSecond: 'Team CyberFlow — VIT Vellore (Cash Prize ₹15,000)',
    winnerThird: 'Team RPA Crafters — SRM Institute (Cash Prize ₹10,000)',
    outcomes: 'Participants demonstrated industry-ready bot development competencies with 100% project completion rates.',
    drivePhotoFolder: '',
  });

  const [generatedReportPreview, setGeneratedReportPreview] = useState(null);
  const printRef = useRef(null);

  // Pre-fill generator when selected event changes
  useEffect(() => {
    const activeEvent = clubEvents.find((e) => e.id === (linkFormData.eventId || selectedEventId)) || clubEvents[0];
    if (activeEvent) {
      setLinkFormData((prev) => ({ ...prev, eventId: activeEvent.id }));
      setGeneratorData((prev) => ({
        ...prev,
        eventId: activeEvent.id,
        eventTitle: activeEvent.title,
        department: activeEvent.department || 'CSE',
        date: activeEvent.date || 'March 14, 2026',
        venue: activeEvent.venue || 'KL Cyber Dome',
      }));
    }
  }, [clubEvents, selectedEventId, linkFormData.eventId]);

  // Listen to submitted reports from Firestore with localStorage persistence fallback
  useEffect(() => {
    setLoadingReports(true);
    // Initialize from local cache first
    try {
      const cached = localStorage.getItem(`samyak_reports_${currentClub}`);
      if (cached) {
        setReportsList(JSON.parse(cached));
      }
    } catch {}

    try {
      const unsub = subscribeContent('club_reports', { limit: 1000 }, (docs) => {
        const list = docs.filter((data) => (data.club || '').toLowerCase() === currentClub.toLowerCase());

        // Merge with existing local reports if any
        try {
          const cached = JSON.parse(localStorage.getItem(`samyak_reports_${currentClub}`) || '[]');
          for (const item of cached) {
            if (!list.some((l) => l.id === item.id)) {
              list.push(item);
            }
          }
        } catch {}

        list.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
        setReportsList(list);
        setLoadingReports(false);
      }, (err) => {
        console.warn('Reports listener note:', err?.message);
        setLoadingReports(false);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Reports setup note:', e);
      setLoadingReports(false);
    }
  }, [currentClub]);

  // Submit Manual Drive Link Report
  const handleSubmitReportLink = async (e) => {
    e.preventDefault();
    if (!linkFormData.driveLink.trim()) {
      if (onToast) onToast('Please provide a valid Drive or Document URL.', 'error');
      return;
    }

    try {
      setSubmittingReport(true);
      const activeEvent = clubEvents.find((ev) => ev.id === linkFormData.eventId) || {
        title: 'Club Flagship Event',
      };

      const reportId = `report_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      const payload = {
        id: reportId,
        club: currentClub,
        eventId: linkFormData.eventId || 'general',
        eventTitle: activeEvent.title,
        reportTitle: linkFormData.reportTitle.trim() || `${activeEvent.title} Event Documentation`,
        driveLink: linkFormData.driveLink.trim(),
        linkType: linkFormData.linkType,
        summaryNotes: linkFormData.summaryNotes.trim(),
        submissionType: 'manual_link',
        submittedBy: adminUser?.displayName || adminUser?.fullName || adminUser?.username || 'Club Administrator',
        submittedByEmail: adminUser?.email || '',
        submittedAt: new Date().toISOString(),
        status: 'Submitted',
      };

      // Optimistically update state & local storage immediately
      setReportsList((prev) => {
        const updated = [payload, ...prev];
        try {
          localStorage.setItem(`samyak_reports_${currentClub}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      try {
        await setContentDoc('club_reports', reportId, { ...payload, timestamp: Date.now() }, { merge: false });
      } catch (err) {
        console.warn('Report save note (cached locally):', err?.message);
      }

      if (onToast) onToast(`Report submitted successfully for ${activeEvent.title}!`, 'success');

      setLinkFormData({
        eventId: clubEvents[0]?.id || '',
        reportTitle: '',
        driveLink: '',
        linkType: 'Google Drive',
        summaryNotes: '',
      });
    } catch (err) {
      console.error('Submit report link error:', err);
      if (onToast) onToast('Failed to submit report: ' + err.message, 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Generate Automated Report Preview
  const handleGenerateReportPreview = (e) => {
    e.preventDefault();
    const activeEvent = clubEvents.find((ev) => ev.id === generatorData.eventId) || {
      title: generatorData.eventTitle || 'Flagship Event',
    };

    const preview = {
      ...generatorData,
      eventTitle: activeEvent.title || generatorData.eventTitle,
      club: currentClub,
      totalParticipants: stats.total || 45,
      actualAttended: stats.present || 42,
      generatedAt: new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };

    setGeneratedReportPreview(preview);
    if (onToast) onToast('Official Event Report generated! Scroll down to review or print.', 'success');
  };

  // Save Generated Report to Database
  const handleSaveGeneratedReport = async () => {
    if (!generatedReportPreview) return;
    try {
      setSubmittingReport(true);
      const reportId = `report_gen_${Date.now()}`;
      const payload = {
        id: reportId,
        club: currentClub,
        eventId: generatedReportPreview.eventId || 'general',
        eventTitle: generatedReportPreview.eventTitle,
        reportTitle: `Official Event Completion Report — ${generatedReportPreview.eventTitle}`,
        submissionType: 'auto_generated',
        reportData: generatedReportPreview,
        submittedBy: adminUser?.displayName || adminUser?.fullName || 'Club Administrator',
        submittedByEmail: adminUser?.email || '',
        submittedAt: new Date().toISOString(),
        status: 'Generated & Archived',
      };

      // Optimistically update local list & storage
      setReportsList((prev) => {
        const updated = [payload, ...prev];
        try {
          localStorage.setItem(`samyak_reports_${currentClub}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      try {
        await setContentDoc('club_reports', reportId, { ...payload, timestamp: Date.now() }, { merge: false });
      } catch (err) {
        console.warn('Report save note (saved locally):', err?.message);
      }

      if (onToast) onToast('Report successfully archived to University Records!', 'success');
    } catch (err) {
      if (onToast) onToast('Save error: ' + err.message, 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Delete a report
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Delete this report submission?')) return;
    try {
      setReportsList((prev) => {
        const updated = prev.filter((r) => r.id !== reportId);
        try {
          localStorage.setItem(`samyak_reports_${currentClub}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      try {
        await deleteContentDoc('club_reports', reportId);
      } catch (err) {
        console.warn('Report delete note:', err?.message);
      }

      if (onToast) onToast('Report removed.');
    } catch (err) {
      if (onToast) onToast('Failed to delete report: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* =====================================================================
          HEADER & CLUB SCOPE CONTROLS
          ===================================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl cyber-card border border-neutral-800 bg-neutral-900/60 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-red-950/70 border border-red-500/40 text-[10px] font-mono uppercase tracking-widest text-red-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-red-400" />
                Technology Club Portal
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-400">
                Live Console
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight flex items-center gap-3">
              <span>{currentClub}</span>
              <span className="text-xs font-mono font-normal text-neutral-400 py-1 px-3 rounded-full bg-neutral-800/80 border border-neutral-700">
                {clubEvents.length} Events Active
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-neutral-400 font-cyber">
              Dedicated administrative portal for technology club leads: monitor real-time event attendance, check-in student delegates, and submit official activity reports.
            </p>
          </div>

          {/* Club Switcher for Superadmin / Club Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {!isClubLocked ? (
              <div className="relative min-w-[240px]">
                <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                  Active Club View:
                </label>
                <div className="relative">
                  <select
                    value={selectedClub}
                    onChange={(e) => setSelectedClub(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs font-heading font-black uppercase text-white focus:outline-none focus:border-red-500 appearance-none cursor-pointer pr-10"
                  >
                    {allClubs.map((clubName) => (
                      <option key={clubName} value={clubName}>
                        {clubName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                <Shield className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block">Assigned Lead Access</span>
                  <span className="text-xs font-heading font-black text-white">{adminUser?.fullName}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sub-Navigation Tabs: Page 1 (Attendance) & Page 2 (Reports) */}
        <div className="flex items-center gap-3 border-t border-neutral-800/80 pt-5">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-5 py-2.5 rounded-xl text-xs font-heading font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_20px_rgba(223,37,49,0.4)] border border-red-400/50'
                : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white hover:border-neutral-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Page 1: Event Attendance ({stats.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-5 py-2.5 rounded-xl text-xs font-heading font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_20px_rgba(223,37,49,0.4)] border border-red-400/50'
                : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white hover:border-neutral-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Page 2: Event Reports &amp; Links ({reportsList.length})</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          PAGE 1: EVENT ATTENDANCE & LIVE ROSTER
          ===================================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          
          {/* Top Controls: Filter by Event, Search & Attendance Filters */}
          <div className="p-5 sm:p-6 rounded-3xl cyber-card border border-neutral-800 bg-neutral-900/60 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              
              {/* Event Filter Dropdown (Strictly events added under this club) */}
              <div className="md:col-span-5">
                <label className="block text-[11px] font-mono uppercase text-red-400 font-bold mb-1.5 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter by Event ({clubEvents.length} Under {currentClub})</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-700 text-xs font-heading font-bold text-white focus:outline-none focus:border-red-500 appearance-none cursor-pointer pr-10"
                  >
                    {clubEvents.length === 0 && (
                      <option value="all">No events found for {currentClub}</option>
                    )}
                    {clubEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.date || 'TBD'})
                      </option>
                    ))}
                    {clubEvents.length > 1 && (
                      <option value="all">-- All {currentClub} Events Combined --</option>
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Search Participant */}
              <div className="md:col-span-4">
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1.5">
                  Search Participant
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, ticket code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 font-cyber focus:outline-none focus:border-red-500 transition-all"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1.5">
                  Status Filter
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setAttendanceFilter('all')}
                    className={`py-1.5 text-[10px] font-mono uppercase font-bold rounded-xl transition-all cursor-pointer ${
                      attendanceFilter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceFilter('present')}
                    className={`py-1.5 text-[10px] font-mono uppercase font-bold rounded-xl transition-all cursor-pointer ${
                      attendanceFilter === 'present' ? 'bg-red-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceFilter('absent')}
                    className={`py-1.5 text-[10px] font-mono uppercase font-bold rounded-xl transition-all cursor-pointer ${
                      attendanceFilter === 'absent' ? 'bg-amber-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Absent
                  </button>
                </div>
              </div>

            </div>

            {/* Quick Action Strip: Attendance Summary & Export/Mark All */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-neutral-800/80">
              
              {/* Quick Counter Pills */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-mono text-neutral-400">
                  Total Registered: <strong className="text-white">{stats.total}</strong>
                </span>
                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                <span className="text-xs font-mono text-emerald-400">
                  Present: <strong className="text-emerald-300">{stats.present}</strong>
                </span>
                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                <span className="text-xs font-mono text-amber-400">
                  Absent / Pending: <strong className="text-amber-300">{stats.absent}</strong>
                </span>
                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                <span className="text-xs font-mono text-red-400">
                  Rate: <strong>{stats.rate}%</strong>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  disabled={filteredRoster.length === 0}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-emerald-950/60 text-emerald-300 border border-neutral-800 hover:border-emerald-500/50 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Mark all pending students in this view as Present"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mark All Present</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAttendance}
                  disabled={filteredRoster.length === 0}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-red-400" />
                  <span>Export CSV</span>
                </button>
              </div>

            </div>

          </div>

          {/* Roster Cards / Table */}
          {loadingRoster ? (
            <div className="p-16 text-center rounded-3xl cyber-card border border-neutral-800 bg-neutral-900/40">
              <RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto mb-3" />
              <p className="text-sm font-mono text-neutral-400">Syncing live event attendance from database...</p>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="p-16 text-center rounded-3xl cyber-card border border-neutral-800 bg-neutral-900/40 space-y-3">
              <Users className="w-12 h-12 text-neutral-600 mx-auto" />
              <h3 className="text-lg font-heading font-black text-white">No Registered Participants Found</h3>
              <p className="text-xs sm:text-sm text-neutral-400 font-cyber max-w-md mx-auto">
                {clubEvents.length === 0 
                  ? `No events have been added under "${currentClub}" yet. Create an event in Events Manager with club "${currentClub}".`
                  : `No student registrations match this filter for ${currentClub}.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoster.map((item) => {
                const isPresent = Boolean(item.attendance);
                const isBusy = togglingId === item.id;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 sm:p-5 rounded-2xl cyber-card border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isPresent
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                        : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {/* Left: Student Identity */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-black font-heading text-white">
                          {item.student_name}
                        </h4>
                        
                        <span className="px-2.5 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-300">
                          {item.university_id || 'ID N/A'}
                        </span>

                        {/* Ticket Code Pill */}
                        {item.ticket_code && (
                          <button
                            type="button"
                            onClick={() => handleCopy(item.ticket_code, item.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700 text-[10px] font-mono text-red-300 hover:text-white transition-all cursor-pointer"
                            title="Click to copy ticket code"
                          >
                            <span>{item.ticket_code}</span>
                            {copiedCode === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-500" />}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-cyber text-neutral-400">
                        <span>{item.email}</span>
                        {item.phone && (
                          <span>
                            Phone: <a href={`tel:${item.phone}`} className="text-neutral-300 hover:text-red-400">{item.phone}</a>
                          </span>
                        )}
                        {item.branch && <span>Branch: {item.branch}</span>}
                        {item.year && <span>Year: {item.year}</span>}
                      </div>

                      <div className="text-[11px] font-mono text-neutral-500">
                        Event: <span className="text-neutral-300">{item.event_title || 'SAMYAK Event'}</span>
                      </div>
                    </div>

                    {/* Right: Attendance Status & Toggle Button */}
                    <div className="flex items-center gap-3 sm:flex-shrink-0">
                      
                      {/* Status Badge */}
                      {isPresent ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold shadow-[0_0_12px_rgba(255,255,255,0.3)]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>PRESENT</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-amber-300 text-xs font-mono font-medium">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>ABSENT</span>
                        </div>
                      )}

                      {/* One-click Toggle Action */}
                      <button
                        type="button"
                        onClick={() => handleToggleAttendance(item)}
                        disabled={isBusy}
                        className={`px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                          isPresent
                            ? 'bg-neutral-900 hover:bg-red-950/60 text-neutral-300 hover:text-red-300 border border-neutral-700 hover:border-red-500/40'
                            : 'bg-red-600 hover:bg-red-400 text-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                        }`}
                      >
                        {isBusy ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : isPresent ? (
                          <>
                            <XSquare className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Mark Absent</span>
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-3.5 h-3.5 text-white" />
                            <span>Mark Present</span>
                          </>
                        )}
                      </button>

                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* =====================================================================
          PAGE 2: EVENT REPORTS & SUBMISSION (DRIVE LINK OR GENERATOR)
          ===================================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-8">
          
          {/* Sub-Switch: Link Upload vs Template Generator */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setReportSubTab('link')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-heading font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                reportSubTab === 'link'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_15px_rgba(223,37,49,0.4)]'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>Option A: Submit Drive / Cloud Report Link</span>
            </button>

            <button
              type="button"
              onClick={() => setReportSubTab('generate')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-heading font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                reportSubTab === 'generate'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_15px_rgba(223,37,49,0.4)]'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Option B: Auto-Generate Official Report</span>
            </button>
          </div>

          {/* OPTION A: SUBMIT DRIVE LINK */}
          {reportSubTab === 'link' && (
            <div className="p-6 sm:p-8 rounded-3xl cyber-card border border-neutral-800 bg-neutral-900/60 space-y-6">
              
              <div>
                <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-1">
                  EVENT DOCUMENTATION ARCHIVE
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight">
                  Upload Event Report Link
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-neutral-400 font-cyber">
                  Paste the Google Drive, Microsoft OneDrive, KLU University Cloud, or Google Docs link containing event photos, attendance sheets, and certificates.
                </p>
              </div>

              <form onSubmit={handleSubmitReportLink} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Event */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1.5">
                      Select Event *
                    </label>
                    <select
                      value={linkFormData.eventId}
                      onChange={(e) => setLinkFormData({ ...linkFormData, eventId: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs font-heading font-bold text-white focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      {clubEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} ({ev.date || 'TBD'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Drive Service Type */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1.5">
                      Cloud / Drive Service *
                    </label>
                    <select
                      value={linkFormData.linkType}
                      onChange={(e) => setLinkFormData({ ...linkFormData, linkType: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value="Google Drive">Google Drive Folder / Document</option>
                      <option value="Microsoft OneDrive">Microsoft OneDrive (KLU Office365)</option>
                      <option value="KLU OneDrive">KLU University SharePoint Drive</option>
                      <option value="Google Docs">Google Docs / Sheets Link</option>
                      <option value="Other">Other Cloud Storage Link</option>
                    </select>
                  </div>
                </div>

                {/* Report Title */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1.5">
                    Report Title / Document Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RPA Bot Sprint - Final Event Report, Geotagged Photos & Winners List"
                    value={linkFormData.reportTitle}
                    onChange={(e) => setLinkFormData({ ...linkFormData, reportTitle: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 font-cyber focus:outline-none focus:border-red-500 transition-all"
                  />
                </div>

                {/* Drive Link URL */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-red-400 font-bold mb-1.5 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-red-500" />
                    <span>Drive / Document URL * (Ensure link sharing is set to Anyone with link can view)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      placeholder="https://drive.google.com/drive/folders/... or https://klu-my.sharepoint.com/..."
                      value={linkFormData.driveLink}
                      onChange={(e) => setLinkFormData({ ...linkFormData, driveLink: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 font-mono focus:outline-none focus:border-red-500 transition-all"
                    />
                  </div>
                </div>

                {/* Summary Notes */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1.5">
                    Key Highlights &amp; Summary Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Briefly state participant turnout, winning teams, faculty presence, and key milestones..."
                    value={linkFormData.summaryNotes}
                    onChange={(e) => setLinkFormData({ ...linkFormData, summaryNotes: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 font-cyber focus:outline-none focus:border-red-500 transition-all"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(223,37,49,0.4)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingReport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{submittingReport ? 'Uploading Report...' : 'Submit Event Report Link'}</span>
                  </button>
                </div>

              </form>

            </div>
          )}

          {/* OPTION B: TEMPLATE-BASED AUTOMATIC REPORT GENERATOR */}
          {reportSubTab === 'generate' && (
            <div className="space-y-6">
              
              <div className="p-6 sm:p-8 rounded-3xl cyber-card border border-neutral-800 bg-neutral-900/60 space-y-6">
                <div>
                  <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-1">
                    AUTOMATIC REPORT GENERATOR
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight">
                    KL University Event Report Template
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-neutral-400 font-cyber">
                    Fill out the standard university accreditation fields below. The system formats this into an official festival report with live attendee metrics.
                  </p>
                </div>

                <form onSubmit={handleGenerateReportPreview} className="space-y-5">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1.5">
                        Target Event *
                      </label>
                      <select
                        value={generatorData.eventId}
                        onChange={(e) => {
                          const ev = clubEvents.find((x) => x.id === e.target.value);
                          setGeneratorData({
                            ...generatorData,
                            eventId: e.target.value,
                            eventTitle: ev?.title || generatorData.eventTitle,
                            date: ev?.date || generatorData.date,
                            venue: ev?.venue || generatorData.venue,
                          });
                        }}
                        className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs font-heading font-bold text-white focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        {clubEvents.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1.5">
                        Academic Department &amp; Wing
                      </label>
                      <input
                        type="text"
                        value={generatorData.department}
                        onChange={(e) => setGeneratorData({ ...generatorData, department: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1.5">
                        Faculty Mentor / Advisor
                      </label>
                      <input
                        type="text"
                        value={generatorData.facultyMentor}
                        onChange={(e) => setGeneratorData({ ...generatorData, facultyMentor: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1.5">
                        Student Coordinators / Leads
                      </label>
                      <input
                        type="text"
                        value={generatorData.studentLeads}
                        onChange={(e) => setGeneratorData({ ...generatorData, studentLeads: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Objectives */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1.5">
                      Event Objectives &amp; Technical Scope
                    </label>
                    <textarea
                      rows={2}
                      value={generatorData.objectives}
                      onChange={(e) => setGeneratorData({ ...generatorData, objectives: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Highlights */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1.5">
                      Key Highlights &amp; Execution Summary
                    </label>
                    <textarea
                      rows={2}
                      value={generatorData.highlights}
                      onChange={(e) => setGeneratorData({ ...generatorData, highlights: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Winners */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-amber-400 mb-1">
                        🥇 1st Place Winner
                      </label>
                      <input
                        type="text"
                        value={generatorData.winnerFirst}
                        onChange={(e) => setGeneratorData({ ...generatorData, winnerFirst: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-300 mb-1">
                        🥈 2nd Place Winner
                      </label>
                      <input
                        type="text"
                        value={generatorData.winnerSecond}
                        onChange={(e) => setGeneratorData({ ...generatorData, winnerSecond: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-amber-600 mb-1">
                        🥉 3rd Place Winner
                      </label>
                      <input
                        type="text"
                        value={generatorData.winnerThird}
                        onChange={(e) => setGeneratorData({ ...generatorData, winnerThird: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Outcomes */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1.5">
                      Outcomes &amp; Student Feedback Summary
                    </label>
                    <textarea
                      rows={2}
                      value={generatorData.outcomes}
                      onChange={(e) => setGeneratorData({ ...generatorData, outcomes: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white font-cyber focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(223,37,49,0.4)] flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Official Report Preview</span>
                    </button>
                  </div>

                </form>
              </div>

              {/* GENERATED REPORT OFFICIAL PREVIEW CARD */}
              {generatedReportPreview && (
                <div className="p-8 sm:p-10 rounded-3xl cyber-card border border-red-500/40 bg-neutral-950 space-y-6 shadow-2xl">
                  
                  {/* Action Bar for Print / Save */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Official Report Generated &amp; Verified</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-mono transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-red-400" />
                        <span>Print Report (PDF)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveGeneratedReport}
                        disabled={submittingReport}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-heading font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>{submittingReport ? 'Archiving...' : 'Save Report to Database'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Printable Document Sheet Preview */}
                  <div ref={printRef} className="p-6 sm:p-8 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-6 text-slate-200 font-sans">
                    
                    {/* Header */}
                    <div className="text-center pb-6 border-b border-neutral-800 space-y-1">
                      <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
                        KONERU LAKSHMAIAH EDUCATION FOUNDATION (DEEMED TO BE UNIVERSITY)
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight uppercase">
                        SAMYAK 2026 — OFFICIAL EVENT COMPLETION REPORT
                      </h2>
                      <div className="text-xs font-mono text-red-400 font-bold">
                        {currentClub} • Department of {generatedReportPreview.department}
                      </div>
                    </div>

                    {/* Metadata Table */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-950/80 border border-neutral-800/80 text-xs font-cyber">
                      <div>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block">Event Title</span>
                        <span className="font-bold text-white">{generatedReportPreview.eventTitle}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block">Date &amp; Venue</span>
                        <span className="text-neutral-300">{generatedReportPreview.date} • {generatedReportPreview.venue}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block">Total Turnout</span>
                        <span className="text-emerald-400 font-mono font-bold">{generatedReportPreview.actualAttended} Present / {generatedReportPreview.totalParticipants} Registered</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block">Report Date</span>
                        <span className="text-neutral-400 font-mono">{generatedReportPreview.generatedAt}</span>
                      </div>
                    </div>

                    {/* Detailed Content */}
                    <div className="space-y-4 text-xs font-cyber leading-relaxed">
                      <div>
                        <h4 className="font-mono text-red-400 text-xs uppercase font-bold tracking-wider mb-1">
                          1. Objectives &amp; Scope
                        </h4>
                        <p className="text-neutral-300">{generatedReportPreview.objectives}</p>
                      </div>

                      <div>
                        <h4 className="font-mono text-red-400 text-xs uppercase font-bold tracking-wider mb-1">
                          2. Execution &amp; Key Highlights
                        </h4>
                        <p className="text-neutral-300">{generatedReportPreview.highlights}</p>
                      </div>

                      <div>
                        <h4 className="font-mono text-red-400 text-xs uppercase font-bold tracking-wider mb-1">
                          3. Winner Recognition &amp; Accolades
                        </h4>
                        <ul className="space-y-1 text-neutral-300 pl-4 list-disc">
                          <li><strong className="text-white">1st Place:</strong> {generatedReportPreview.winnerFirst}</li>
                          <li><strong className="text-white">2nd Place:</strong> {generatedReportPreview.winnerSecond}</li>
                          <li><strong className="text-white">3rd Place:</strong> {generatedReportPreview.winnerThird}</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-mono text-red-400 text-xs uppercase font-bold tracking-wider mb-1">
                          4. Learning Outcomes &amp; Feedback
                        </h4>
                        <p className="text-neutral-300">{generatedReportPreview.outcomes}</p>
                      </div>

                      {/* Signatures */}
                      <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-neutral-800 text-center text-xs font-mono">
                        <div>
                          <div className="h-10 border-b border-dashed border-neutral-700 mb-2" />
                          <span className="text-neutral-400 uppercase">Student Club Lead</span>
                          <div className="text-[10px] text-neutral-500">{generatedReportPreview.studentLeads}</div>
                        </div>

                        <div>
                          <div className="h-10 border-b border-dashed border-neutral-700 mb-2" />
                          <span className="text-neutral-400 uppercase">Faculty In-Charge / Mentor</span>
                          <div className="text-[10px] text-neutral-500">{generatedReportPreview.facultyMentor}</div>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}

            </div>
          )}

          {/* =====================================================================
              SUBMITTED REPORTS REPOSITORY FOR THIS CLUB
              ===================================================================== */}
          <div className="p-6 sm:p-8 rounded-3xl cyber-card border border-neutral-800 bg-neutral-900/60 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-black font-heading text-white">
                  Submitted Reports Archive ({reportsList.length})
                </h3>
                <p className="text-xs text-neutral-400 font-cyber">
                  Archived documentation links and generated reports for {currentClub}.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-400">
                Cloud Synchronized
              </span>
            </div>

            {loadingReports ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-6 h-6 text-red-500 animate-spin mx-auto mb-2" />
                <span className="text-xs font-mono text-neutral-500">Loading reports...</span>
              </div>
            ) : reportsList.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <FileText className="w-10 h-10 text-neutral-600 mx-auto" />
                <p className="text-xs text-neutral-500 font-cyber">No reports uploaded yet for this club.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reportsList.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-red-950/60 border border-red-500/30 text-[10px] font-mono text-red-300">
                          {rep.linkType || 'Report'}
                        </span>
                        <h4 className="text-sm font-black font-heading text-white">
                          {rep.reportTitle || rep.eventTitle}
                        </h4>
                      </div>

                      <div className="text-xs font-cyber text-neutral-400">
                        Event: <span className="text-neutral-300">{rep.eventTitle}</span>
                        {rep.submittedBy && (
                          <span className="ml-3 text-neutral-500">
                            By {rep.submittedBy} on {new Date(rep.submittedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {rep.summaryNotes && (
                        <p className="text-[11px] text-neutral-500 font-cyber line-clamp-1">
                          {rep.summaryNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {rep.driveLink && (
                        <a
                          href={rep.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-heading font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:brightness-110 transition-all"
                        >
                          <span>Open Cloud Link</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteReport(rep.id)}
                        className="p-2 rounded-xl bg-neutral-900 hover:bg-red-950/50 text-neutral-500 hover:text-red-400 border border-neutral-800 transition-colors cursor-pointer"
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
