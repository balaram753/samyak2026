import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, MapPin, Save, Plus, Trash2, Edit2,
  Star, ArrowUp, ArrowDown, CheckCircle2,
  Sparkles, RefreshCw, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { useSiteContent } from '../../context/SiteContentContext';
import { SCHEDULE_DAYS } from '../../data/schedule';

const CATEGORY_OPTIONS = [
  'Ceremony', 'Technical', 'Workshops', 'Gaming',
  'Competitions', 'Cultural', 'Keynote', 'Entertainment'
];

const CAT_COLORS = {
  ceremony:     'text-amber-400 bg-amber-500/15 border-amber-500/30',
  technical:    'text-blue-400 bg-blue-500/15 border-blue-500/30',
  workshops:    'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  gaming:       'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  competitions: 'text-violet-400 bg-violet-500/15 border-violet-500/30',
  cultural:     'text-rose-400 bg-rose-500/15 border-rose-500/30',
  keynote:      'text-orange-400 bg-orange-500/15 border-orange-500/30',
  entertainment:'text-pink-400 bg-pink-500/15 border-pink-500/30',
};
function getCatColor(cat) {
  return CAT_COLORS[(cat || '').toLowerCase()] || 'text-neutral-400 bg-neutral-800/50 border-neutral-700';
}

const BLANK_EVENT = {
  time: '09:00 AM – 10:00 AM',
  title: '',
  venue: '',
  category: 'Technical',
  speaker: '',
  highlight: false,
};

export default function ScheduleManagerPage({ onToast }) {
  const { scheduleDays, updateScheduleContent } = useSiteContent();
  const source = scheduleDays?.length > 0 ? scheduleDays : SCHEDULE_DAYS;

  const [days, setDays] = useState(() => JSON.parse(JSON.stringify(source)));
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newEvent, setNewEvent] = useState({ ...BLANK_EVENT });
  const [editingDayInfo, setEditingDayInfo] = useState(false);
  const [dayDraft, setDayDraft] = useState(null);

  useEffect(() => {
    if (scheduleDays?.length > 0) {
      setDays(JSON.parse(JSON.stringify(scheduleDays)));
    }
  }, [scheduleDays]);

  const activeDay = days[activeDayIdx];

  const patchEvent = (evIdx, field, val) => {
    setDays(prev => prev.map((d, i) => i !== activeDayIdx ? d : {
      ...d,
      events: d.events.map((ev, j) => j !== evIdx ? ev : { ...ev, [field]: val })
    }));
  };

  const moveEvent = (evIdx, dir) => {
    const to = evIdx + dir;
    if (to < 0 || to >= activeDay.events.length) return;
    setDays(prev => prev.map((d, i) => {
      if (i !== activeDayIdx) return d;
      const evs = [...d.events];
      [evs[evIdx], evs[to]] = [evs[to], evs[evIdx]];
      return { ...d, events: evs };
    }));
    setExpandedIdx(to);
  };

  const deleteEvent = (evIdx) => {
    if (!window.confirm('Remove this schedule item?')) return;
    setDays(prev => prev.map((d, i) => i !== activeDayIdx ? d : {
      ...d, events: d.events.filter((_, j) => j !== evIdx)
    }));
    setExpandedIdx(null);
  };

  const addEvent = () => {
    if (!newEvent.title.trim()) {
      onToast?.('Please enter a session title.', 'error');
      return;
    }
    setDays(prev => prev.map((d, i) => i !== activeDayIdx ? d : {
      ...d, events: [...d.events, { ...newEvent }]
    }));
    setNewEvent({ ...BLANK_EVENT });
    setAddingNew(false);
    setExpandedIdx(activeDay.events.length);
    onToast?.('Session added!', 'success');
  };

  const saveDayInfo = () => {
    if (!dayDraft) return;
    setDays(prev => prev.map((d, i) => i !== activeDayIdx ? d : { ...d, ...dayDraft }));
    setEditingDayInfo(false);
    setDayDraft(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateScheduleContent(days);
      setSavedOk(true);
      onToast?.('Festival Schedule saved and published live!', 'success');
      setTimeout(() => setSavedOk(false), 3000);
    } catch (err) {
      onToast?.('Failed to save: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalEvents = days.reduce((s, d) => s + (d.events?.length || 0), 0);
  const totalHighlights = days.reduce((s, d) => s + (d.events?.filter(e => e.highlight).length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-heading text-white">
            3-DAY <span className="text-red-500">SCHEDULE ROADMAP</span>
          </h2>
          <p className="text-xs text-slate-400 font-cyber mt-1">
            Edit timelines, keynote sessions, speakers, venues, and flag highlights for each day.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500">
            <span className="text-white font-bold">{totalEvents}</span> sessions
            <span className="mx-1">·</span>
            <span className="text-amber-400 font-bold">{totalHighlights}</span> flagship
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 font-heading font-black text-xs uppercase tracking-wider text-white shadow-[0_0_20px_rgba(223,37,49,0.5)] flex items-center gap-2 disabled:opacity-60 hover:brightness-110 cursor-pointer"
          >
            {saving ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /><span>Saving</span></>
            ) : savedOk ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-300" /><span>Saved!</span></>
            ) : (
              <><Save className="w-4 h-4" /><span>Save Schedule</span></>
            )}
          </button>
        </div>
      </div>

      {/* Live Ticker Preview */}
      <div className="relative overflow-hidden py-3 rounded-2xl bg-neutral-950/90 border border-red-500/30 shadow-[0_0_25px_rgba(223,37,49,0.12)] flex items-center">
        <div className="flex-shrink-0 px-3 py-1 ml-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(223,37,49,0.5)] z-20 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>LIVE TICKER PREVIEW</span>
        </div>
        <div className="flex overflow-hidden no-scrollbar w-full ml-4 select-none">
          <div className="flex gap-8 w-max shrink-0 animate-marquee-left text-xs font-mono text-neutral-300">
            {days.flatMap(d => (d.events || []).map((ev, i) => (
              <span key={"ta-" + d.day + i} className="inline-flex items-center gap-2">
                <span className="text-red-400 font-bold">[{d.day} · {ev.time}]</span>
                <span className="text-white font-heading font-bold">{ev.title}</span>
                <span className="text-neutral-500">@{ev.venue}</span>
                <span className="text-amber-500">•</span>
              </span>
            )))}
          </div>
          <div className="flex gap-8 w-max shrink-0 animate-marquee-left text-xs font-mono text-neutral-300" aria-hidden="true">
            {days.flatMap(d => (d.events || []).map((ev, i) => (
              <span key={"tb-" + d.day + i} className="inline-flex items-center gap-2">
                <span className="text-red-400 font-bold">[{d.day} · {ev.time}]</span>
                <span className="text-white font-heading font-bold">{ev.title}</span>
                <span className="text-neutral-500">@{ev.venue}</span>
                <span className="text-amber-500">•</span>
              </span>
            )))}
          </div>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 flex-wrap">
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setActiveDayIdx(i); setExpandedIdx(null); setAddingNew(false); }}
            className={"px-5 py-2.5 rounded-xl font-heading text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 " + (
              activeDayIdx === i
                ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(223,37,49,0.5)]'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-red-500/50'
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            {d.day}
            <span className={"text-[10px] font-mono font-normal " + (activeDayIdx === i ? 'text-white/70' : 'text-neutral-600')}>
              ({d.events?.length || 0})
            </span>
          </button>
        ))}
      </div>

      {/* Active Day Info */}
      <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
        {editingDayInfo ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Day Label</label>
                <input value={dayDraft?.day ?? activeDay.day} onChange={e => setDayDraft(p => ({ ...p, day: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-neutral-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Date</label>
                <input value={dayDraft?.date ?? activeDay.date} onChange={e => setDayDraft(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-neutral-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-neutral-500 mb-1">Day Title / Theme</label>
              <input value={dayDraft?.title ?? activeDay.title} onChange={e => setDayDraft(p => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-neutral-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500" />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-neutral-500 mb-1">Day Description</label>
              <textarea rows={2} value={dayDraft?.description ?? activeDay.description} onChange={e => setDayDraft(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-neutral-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500 resize-none" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={saveDayInfo} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer">
                <CheckCircle2 className="w-3.5 h-3.5" /> Save Day Info
              </button>
              <button type="button" onClick={() => { setEditingDayInfo(false); setDayDraft(null); }} className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono cursor-pointer">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest font-bold">{activeDay.day}</span>
                <span className="text-neutral-700">·</span>
                <span className="text-[10px] font-mono text-neutral-500">{activeDay.date}</span>
              </div>
              <h3 className="text-base font-black font-heading text-white">{activeDay.title}</h3>
              <p className="text-xs text-neutral-400 font-cyber mt-0.5">{activeDay.description}</p>
            </div>
            <button type="button" onClick={() => { setEditingDayInfo(true); setDayDraft({ day: activeDay.day, date: activeDay.date, title: activeDay.title, description: activeDay.description }); }}
              className="flex-shrink-0 p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer" title="Edit day info">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">{activeDay.day} — {activeDay.events?.length || 0} Sessions</span>
        </div>

        <AnimatePresence>
          {(activeDay.events || []).map((ev, evIdx) => (
            <motion.div key={evIdx} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className={"rounded-2xl border overflow-hidden transition-all " + (
                ev.highlight
                  ? 'border-red-500/50 bg-gradient-to-br from-[#0a0505] via-neutral-950 to-black shadow-[0_0_20px_rgba(223,37,49,0.12)]'
                  : 'border-neutral-800 bg-neutral-950/80'
              )}>
              <div className={"h-[2px] w-full " + (ev.highlight ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500' : 'bg-neutral-800')} />
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer group" onClick={() => setExpandedIdx(expandedIdx === evIdx ? null : evIdx)}>
                <span className="w-6 h-6 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 font-mono text-[10px] flex items-center justify-center flex-shrink-0">{evIdx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-red-400 font-bold">{ev.time}</span>
                    {ev.highlight && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-950/60 border border-red-500/30 text-red-400 text-[9px] font-mono font-bold uppercase">
                        <Star className="w-2.5 h-2.5" /> Flagship
                      </span>
                    )}
                    <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border " + getCatColor(ev.category)}>{ev.category}</span>
                  </div>
                  <p className="text-xs font-heading font-bold text-white mt-0.5 truncate">{ev.title || <span className="text-neutral-600">Untitled Session</span>}</p>
                  {ev.venue && <p className="text-[10px] font-mono text-neutral-500 mt-0.5 truncate">📍 {ev.venue}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button" onClick={e => { e.stopPropagation(); moveEvent(evIdx, -1); }} disabled={evIdx === 0}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-600 hover:text-white disabled:opacity-30 cursor-pointer" title="Move up">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={e => { e.stopPropagation(); moveEvent(evIdx, 1); }} disabled={evIdx === (activeDay.events?.length ?? 0) - 1}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-600 hover:text-white disabled:opacity-30 cursor-pointer" title="Move down">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={e => { e.stopPropagation(); deleteEvent(evIdx); }}
                    className="p-1 rounded hover:bg-red-950 text-neutral-600 hover:text-red-400 cursor-pointer" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expandedIdx === evIdx ? <ChevronUp className="w-4 h-4 text-red-400" /> : <ChevronDown className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300" />}
                </div>
              </div>
              <AnimatePresence>
                {expandedIdx === evIdx && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-neutral-800/60">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-500 mb-1"><Clock className="w-3 h-3 inline mr-1 text-red-500" />Time Range</label>
                          <input type="text" value={ev.time} onChange={e => patchEvent(evIdx, 'time', e.target.value)}
                            placeholder="e.g. 09:00 AM – 11:00 AM"
                            className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-mono text-neutral-500 mb-1"><Sparkles className="w-3 h-3 inline mr-1 text-red-500" />Session Title *</label>
                          <input type="text" value={ev.title} onChange={e => patchEvent(evIdx, 'title', e.target.value)}
                            placeholder="e.g. Grand Opening Ceremony"
                            className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-500 mb-1"><MapPin className="w-3 h-3 inline mr-1 text-red-500" />Venue</label>
                          <input type="text" value={ev.venue} onChange={e => patchEvent(evIdx, 'venue', e.target.value)}
                            placeholder="e.g. Main Auditorium"
                            className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-500 mb-1">Category</label>
                          <select value={ev.category} onChange={e => patchEvent(evIdx, 'category', e.target.value)}
                            className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500">
                            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-500 mb-1">Speaker / Details</label>
                          <input type="text" value={ev.speaker || ''} onChange={e => patchEvent(evIdx, 'speaker', e.target.value)}
                            placeholder="e.g. Dr. Kumar"
                            className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <button type="button" onClick={() => patchEvent(evIdx, 'highlight', !ev.highlight)}
                          className={"relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0 cursor-pointer " + (ev.highlight ? 'bg-red-600 shadow-[0_0_10px_rgba(223,37,49,0.5)]' : 'bg-neutral-700')}>
                          <span className={"absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 " + (ev.highlight ? 'left-5' : 'left-0.5')} />
                        </button>
                        <span className="text-xs font-mono">
                          {ev.highlight
                            ? <span className="text-red-400 font-bold flex items-center gap-1"><Star className="w-3 h-3" /> Marked as Flagship Event</span>
                            : <span className="text-neutral-500">Mark as Flagship / Highlight</span>}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add New Session */}
        {addingNew ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-dashed border-red-500/50 bg-neutral-950/90 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> New Session — {activeDay.day}
              </span>
              <button type="button" onClick={() => setAddingNew(false)} className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Time Range</label>
                <input type="text" value={newEvent.time} onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))}
                  placeholder="09:00 AM – 10:00 AM"
                  className="w-full px-3 py-2 bg-black border border-neutral-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Session Title *</label>
                <input type="text" value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Keynote: The AI Sovereign"
                  autoFocus
                  className="w-full px-3 py-2 bg-black border border-neutral-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Venue</label>
                <input type="text" value={newEvent.venue} onChange={e => setNewEvent(p => ({ ...p, venue: e.target.value }))}
                  placeholder="Main Auditorium"
                  className="w-full px-3 py-2 bg-black border border-neutral-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Category</label>
                <select value={newEvent.category} onChange={e => setNewEvent(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-neutral-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500">
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Speaker / Details</label>
                <input type="text" value={newEvent.speaker} onChange={e => setNewEvent(p => ({ ...p, speaker: e.target.value }))}
                  placeholder="e.g. Dr. Kumar"
                  className="w-full px-3 py-2 bg-black border border-neutral-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setNewEvent(p => ({ ...p, highlight: !p.highlight }))}
                className={"relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0 cursor-pointer " + (newEvent.highlight ? 'bg-red-600' : 'bg-neutral-700')}>
                <span className={"absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 " + (newEvent.highlight ? 'left-5' : 'left-0.5')} />
              </button>
              <span className="text-xs font-mono text-neutral-400">Mark as Flagship / Highlight</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={addEvent}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-4 h-4" /> Add to {activeDay.day}
              </button>
              <button type="button" onClick={() => setAddingNew(false)}
                className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs cursor-pointer">Cancel</button>
            </div>
          </motion.div>
        ) : (
          <button type="button" onClick={() => setAddingNew(true)}
            className="w-full py-3.5 rounded-2xl bg-neutral-900 border border-dashed border-neutral-700 hover:border-red-500/60 text-neutral-400 hover:text-white text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer group">
            <Plus className="w-4 h-4 text-red-500 group-hover:scale-125 transition-transform" />
            <span>Add Session to {activeDay.day}</span>
          </button>
        )}
      </div>

      {/* Save Footer */}
      <div className="pt-2 flex items-center justify-between">
        <p className="text-[11px] font-mono text-neutral-600">Changes saved to Firestore and reflected live on the public schedule page.</p>
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 font-heading font-black text-xs uppercase tracking-wider text-white shadow-[0_0_20px_rgba(223,37,49,0.4)] flex items-center gap-2 disabled:opacity-60 hover:brightness-110 cursor-pointer">
          {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save &amp; Publish</>}
        </button>
      </div>
    </div>
  );
}
