import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, CheckCircle2, Clock, Download, 
  Copy, Check, UserCheck, RefreshCw, Calendar, 
  School, Award, Trash2
} from 'lucide-react';
import { useSiteContent } from '../../context/SiteContentContext';
import { 
  listenToEventRoster, 
  toggleAttendance, 
  exportRosterToCSV 
} from '../../services/eventRegistrationService';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const BRANCH_LIST = [
  'All Branches',
  'Computer Science & Engineering (CSE)',
  'Artificial Intelligence & Data Science (AIDS)',
  'Electronics & Communication Engineering (ECE)',
  'Mechanical Engineering (MECH)',
  'Civil Engineering (CIVIL)',
  'Bio-Technology (BIOTECH)',
  'School of Business Management (MBA)',
  'Computer Applications & Software (BCA)',
  'Other / External University'
];

const YEAR_LIST = [
  'All Years',
  '1st Year (B.Tech / Degree)',
  '2nd Year (B.Tech / Degree)',
  '3rd Year (B.Tech / Degree)',
  '4th Year (B.Tech / Degree)',
  'Postgraduate (M.Tech / MBA / MCA / PhD)'
];

export default function EventRosterManager({ onToast }) {
  const { events } = useSiteContent();
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [yearFilter, setYearFilter] = useState('All Years');
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'attended' | 'pending'
  const [togglingId, setTogglingId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Live listener on registrations for selected event
  useEffect(() => {
    setLoading(true);
    const unsub = listenToEventRoster(selectedEventId, (list) => {
      setRoster(list);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedEventId]);

  const handleCopy = (code, id) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleAttendance = async (reg) => {
    try {
      setTogglingId(reg.id);
      const newStatus = !reg.attendance;
      await toggleAttendance(reg.id, newStatus);
      if (onToast) {
        onToast(
          newStatus 
            ? `${reg.student_name} marked as Checked In!` 
            : `${reg.student_name} check-in reverted to pending.`,
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

  const handleDeleteRegistration = async (regId) => {
    if (!window.confirm('Are you sure you want to delete this event registration record?')) return;
    try {
      await deleteDoc(doc(db, 'event_registrations', regId));
      if (onToast) onToast('Registration record deleted.');
    } catch (err) {
      if (onToast) onToast('Failed to delete: ' + err.message, 'error');
    }
  };

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return roster.filter((r) => {
      // Event filter is handled by Firestore query, but double-check
      if (selectedEventId !== 'all' && r.event_id !== selectedEventId) return false;

      // Branch filter
      if (branchFilter !== 'All Branches' && r.branch !== branchFilter) return false;

      // Year filter
      if (yearFilter !== 'All Years' && r.year !== yearFilter) return false;

      // Attendance filter
      if (attendanceFilter === 'attended' && !r.attendance) return false;
      if (attendanceFilter === 'pending' && r.attendance) return false;

      // Search query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        (r.student_name && r.student_name.toLowerCase().includes(q)) ||
        (r.university_id && r.university_id.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.phone && r.phone.toLowerCase().includes(q)) ||
        (r.ticket_code && r.ticket_code.toLowerCase().includes(q)) ||
        (r.event_title && r.event_title.toLowerCase().includes(q))
      );
    });
  }, [roster, selectedEventId, branchFilter, yearFilter, attendanceFilter, searchQuery]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = roster.length;
    const attended = roster.filter((r) => r.attendance).length;
    const pending = total - attended;
    const checkInRate = total > 0 ? Math.round((attended / total) * 100) : 0;

    return { total, attended, pending, checkInRate };
  }, [roster]);

  const handleExport = () => {
    try {
      const selectedEvent = events?.find((e) => e.id === selectedEventId);
      const title = selectedEvent ? selectedEvent.title : 'All_Events_Roster';
      exportRosterToCSV(filteredRoster, title);
      if (onToast) onToast('Roster exported to CSV successfully!');
    } catch (err) {
      if (onToast) onToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-[11px] font-mono text-red-400 uppercase tracking-widest mb-1 font-bold">
            <Users className="w-3.5 h-3.5 text-red-400" />
            Arena Gate &amp; Registration Roster
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
            EVENT ENROLLMENTS &amp; <span className="text-red-500">ATTENDEE ROSTER</span>
          </h2>
          <p className="text-xs text-neutral-400 font-cyber">
            Real-time participant rosters, pass codes, gate attendance check-ins, and department breakdown.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredRoster.length === 0}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Download CSV of current attendee roster"
          >
            <Download className="w-4 h-4 text-red-400" />
            <span>Export Roster CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-neutral-400">Total Enrolled</span>
          <div className="text-2xl font-black font-heading text-white mt-1">{stats.total}</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-emerald-400 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" /> Checked In
          </span>
          <div className="text-2xl font-black font-heading text-emerald-400 mt-1">{stats.attended}</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-amber-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending Check-in
          </span>
          <div className="text-2xl font-black font-heading text-amber-300 mt-1">{stats.pending}</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-red-400">Check-In Rate</span>
          <div className="text-2xl font-black font-heading text-red-400 mt-1">{stats.checkInRate}%</div>
        </div>
      </div>

      {/* Toolbar: Event Selector, Search & Filters */}
      <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
        
        {/* Top Row: Event Filter Dropdown & Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Event Dropdown */}
          <div className="md:col-span-5">
            <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
              Select Fest Event / Arena:
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500 font-bold"
            >
              <option value="all">🌟 All Events Combined ({roster.length} participants)</option>
              {events?.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.department || 'Fest'})
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="md:col-span-7">
            <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
              Search Participants:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search by Name, Roll No, Email, Pass Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {/* Second Row: Filters for Branch, Year, and Attendance Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800/80">
          
          {/* Attendance Status Tabs */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All', count: stats.total },
              { id: 'attended', label: 'Checked In', count: stats.attended },
              { id: 'pending', label: 'Pending', count: stats.pending },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAttendanceFilter(tab.id)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  attendanceFilter === tab.id
                    ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Branch & Year Dropdowns */}
          <div className="flex items-center gap-2">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-black border border-neutral-800 text-[11px] font-mono text-neutral-300 focus:outline-none focus:border-red-500 max-w-[160px] truncate"
            >
              {BRANCH_LIST.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-black border border-neutral-800 text-[11px] font-mono text-neutral-300 focus:outline-none focus:border-red-500 max-w-[140px] truncate"
            >
              {YEAR_LIST.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Roster Table Content */}
      {loading ? (
        <div className="p-16 text-center text-xs font-mono text-neutral-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
          <span>Loading event participant rosters from Firestore...</span>
        </div>
      ) : filteredRoster.length === 0 ? (
        <div className="p-16 rounded-3xl bg-neutral-900/30 border border-neutral-800 text-center space-y-2">
          <Users className="w-8 h-8 text-neutral-600 mx-auto" />
          <h4 className="text-base font-bold font-heading text-neutral-300">No Participants Found</h4>
          <p className="text-xs font-mono text-neutral-500">
            {searchQuery || branchFilter !== 'All Branches' || attendanceFilter !== 'all'
              ? 'Try adjusting your search criteria or filter options.'
              : 'As students enroll in this event, their names and digital pass codes will appear here in real time.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/40">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 bg-black/80 text-neutral-400 text-[10px] uppercase tracking-wider">
                <th className="p-3.5">Ticket Pass Code</th>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">University ID</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">Branch &amp; Year</th>
                <th className="p-3.5">Enrolled Event</th>
                <th className="p-3.5 text-center">Gate Attendance</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredRoster.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-800/40 transition-colors">
                  
                  {/* Ticket Pass Code */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <code className="px-2 py-0.5 rounded-lg bg-black border border-red-500/40 text-red-300 font-bold tracking-widest text-[11px]">
                        {r.ticket_code || 'SMYK-PASS'}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(r.ticket_code, r.id)}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy Ticket Code"
                      >
                        {copiedCode === r.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Student Name */}
                  <td className="p-3.5">
                    <div className="font-bold text-white text-sm">{r.student_name}</div>
                    {r.section && (
                      <span className="text-[10px] font-mono text-neutral-500">Sec: {r.section}</span>
                    )}
                  </td>

                  {/* University ID / Roll */}
                  <td className="p-3.5 font-bold text-slate-200">
                    {r.university_id}
                  </td>

                  {/* Contact Details */}
                  <td className="p-3.5 space-y-0.5">
                    <div className="text-neutral-300 text-[11px] truncate max-w-[170px]" title={r.email}>
                      {r.email}
                    </div>
                    <div className="text-red-400 text-[11px]">{r.phone}</div>
                  </td>

                  {/* Branch & Year */}
                  <td className="p-3.5">
                    <div className="text-neutral-300 truncate max-w-[150px]" title={r.branch}>
                      {r.branch?.replace(/ \(.*\)/, '') || 'General'}
                    </div>
                    <div className="text-[10px] text-neutral-500">{r.year}</div>
                  </td>

                  {/* Event Title */}
                  <td className="p-3.5">
                    <span className="font-bold text-white truncate block max-w-[140px]" title={r.event_title}>
                      {r.event_title || 'SAMYAK Event'}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {r.registered_at ? new Date(r.registered_at).toLocaleDateString('en-IN') : 'Recent'}
                    </span>
                  </td>

                  {/* Gate Attendance Toggle Switch */}
                  <td className="p-3.5 text-center">
                    <button
                      type="button"
                      disabled={togglingId === r.id}
                      onClick={() => handleToggleAttendance(r)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        r.attendance
                          ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:bg-emerald-900'
                          : 'bg-amber-950/60 border border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                      }`}
                      title={r.attendance ? 'Click to mark Absent / Revert' : 'Click to Check In at gate'}
                    >
                      {togglingId === r.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : r.attendance ? (
                        <UserCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      <span>{r.attendance ? 'Checked In' : 'Pending Check-in'}</span>
                    </button>
                  </td>

                  {/* Action */}
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteRegistration(r.id)}
                      className="p-1.5 rounded-lg hover:bg-red-950/50 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
