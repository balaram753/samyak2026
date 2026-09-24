import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building, Plus, Trash2, X, Sparkles, CheckCircle2, 
  Layers, RefreshCw, AlertCircle, ChevronRight, Filter 
} from 'lucide-react';
import { useSiteContent } from '../../context/SiteContentContext';

export default function DepartmentsManager({ onToast }) {
  const { 
    departments, 
    addDepartment, 
    deleteDepartment, 
    addClubToDepartment, 
    deleteClubFromDepartment, 
    resetDefaultDepartments 
  } = useSiteContent();

  const [showAddDeptForm, setShowAddDeptForm] = useState(false);
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptClubs, setNewDeptClubs] = useState('');

  // Per-department club input tracker
  const [clubInputs, setClubInputs] = useState({});

  const handleAddDeptSubmit = async (e) => {
    e.preventDefault();
    if (!newDeptCode.trim()) {
      onToast('Department code is required (e.g. CSE, ECE).', 'error');
      return;
    }

    try {
      const clubsArray = newDeptClubs
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await addDepartment(newDeptCode, newDeptName, clubsArray);
      onToast(`Department ${newDeptCode.toUpperCase()} added with ${clubsArray.length} clubs!`, 'success');
      setNewDeptCode('');
      setNewDeptName('');
      setNewDeptClubs('');
      setShowAddDeptForm(false);
    } catch (err) {
      onToast('Failed to add department: ' + err.message, 'error');
    }
  };

  const handleAddClub = async (deptCode) => {
    const clubName = (clubInputs[deptCode] || '').trim();
    if (!clubName) return;

    try {
      await addClubToDepartment(deptCode, clubName);
      onToast(`Club "${clubName}" added under ${deptCode}!`, 'success');
      setClubInputs((prev) => ({ ...prev, [deptCode]: '' }));
    } catch (err) {
      onToast('Failed to add club: ' + err.message, 'error');
    }
  };

  const handleDeleteClub = async (deptCode, clubName) => {
    try {
      await deleteClubFromDepartment(deptCode, clubName);
      onToast(`Club "${clubName}" removed from ${deptCode}.`, 'success');
    } catch (err) {
      onToast('Failed to remove club: ' + err.message, 'error');
    }
  };

  const handleDeleteDepartment = async (dept) => {
    const confirm = window.confirm(`Are you sure you want to delete department "${dept.code} - ${dept.name}" and all its sub-filter clubs?`);
    if (!confirm) return;

    try {
      await deleteDepartment(dept.id || dept.code);
      onToast(`Department ${dept.code} deleted.`, 'success');
    } catch (err) {
      onToast('Failed to delete department: ' + err.message, 'error');
    }
  };

  const handleResetDefaults = async () => {
    const confirm = window.confirm('Reset all department filters and club sub-filters to standard university academic departments (CSE, ECE, AIDS, Mechanical, Civil, MBA, BCA, Biotech)?');
    if (!confirm) return;

    try {
      await resetDefaultDepartments();
      onToast('Department and club filters reset to defaults successfully!', 'success');
    } catch (err) {
      onToast('Failed to reset: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-red-500" />
            <span>PUBLIC FILTER ENGINE CONTROL</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">
            DEPARTMENTS &amp; <span className="text-red-500 text-glow-red">CLUB SUB-FILTERS</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400 font-cyber max-w-2xl">
            Control the public department filter pills (CSE, ECE, AIDS, Mechanical, Civil, MBA, BCA) and manage the sub-filter clubs (e.g. RPA Club under CSE). Any club added here will appear on the public festival events page.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
            title="Reset to default academic departments & clubs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-red-400" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddDeptForm((prev) => !prev)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-heading font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddDeptForm ? 'Close Form' : 'Add Department'}</span>
          </button>
        </div>
      </div>

      {/* Add Department Form (Collapsible) */}
      <AnimatePresence>
        {showAddDeptForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 rounded-3xl bg-neutral-900/90 border border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.2)] overflow-hidden space-y-4"
          >
            <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase font-bold tracking-wider">
              <Building className="w-4 h-4" />
              <span>Create New Department Filter</span>
            </div>

            <form onSubmit={handleAddDeptSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                    Department Code * (e.g. CSE, ECE, AIML)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                    Full Department Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science & Engineering"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-600 font-cyber focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Initial Sub-Filter Clubs (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. RPA Club, Cyber Security Club, Cloud Computing Club"
                  value={newDeptClubs}
                  onChange={(e) => setNewDeptClubs(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-600 font-cyber focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeptForm(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-heading font-bold text-xs uppercase tracking-wider shadow-lg"
                >
                  Save Department
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {departments?.map((dept) => {
          const currentClubInput = clubInputs[dept.code] || '';

          return (
            <div
              key={dept.id || dept.code}
              className="p-6 rounded-3xl cyber-card border border-neutral-800 bg-neutral-900/50 hover:border-red-500/30 transition-all flex flex-col justify-between space-y-5"
            >
              {/* Department Header */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-neutral-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-black text-white bg-red-600 shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                      {dept.code}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {dept.clubs?.length || 0} Sub-Filter Clubs
                    </span>
                  </div>
                  <h3 className="text-base font-black font-heading text-white pt-1">
                    {dept.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteDepartment(dept)}
                  className="p-2 rounded-xl bg-neutral-900 hover:bg-red-950/60 text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-500/40 transition-colors"
                  title={`Delete department ${dept.code}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-Filter Clubs List */}
              <div className="space-y-3 flex-1">
                <div className="text-[11px] font-mono text-red-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3 h-3" />
                  <span>Sub-Filter Clubs under {dept.code}:</span>
                </div>

                {dept.clubs?.length === 0 ? (
                  <div className="p-4 rounded-xl bg-neutral-950/60 border border-dashed border-neutral-800 text-center text-xs font-mono text-neutral-500">
                    No clubs added yet. Add a club below so users can filter by it on the events page!
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dept.clubs?.map((club) => (
                      <div
                        key={club}
                        className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-red-500/40 text-xs font-cyber text-slate-200 transition-colors group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="font-medium">{club}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteClub(dept.code, club)}
                          className="p-1 rounded-lg hover:bg-red-950/80 text-neutral-500 hover:text-red-400 transition-colors"
                          title={`Remove ${club}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Club under this Department */}
              <div className="pt-4 border-t border-neutral-800/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddClub(dept.code);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={`Add club under ${dept.code} (e.g. RPA Club)...`}
                    value={currentClubInput}
                    onChange={(e) => setClubInputs({ ...clubInputs, [dept.code]: e.target.value })}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-600 font-cyber focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-red-600 text-neutral-300 hover:text-white border border-neutral-800 hover:border-red-500 text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Club</span>
                  </button>
                </form>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
