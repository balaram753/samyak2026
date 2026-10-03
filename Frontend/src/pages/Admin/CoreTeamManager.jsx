import { useEffect, useMemo, useState } from 'react';
import { Link2, Copy, Plus, Printer, Trash2, Search, Lock, Unlock, Users, Eye, EyeOff, Download, UserPlus, X, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  createCoreInvite,
  setCoreInviteActive,
  subscribeCoreInvites,
  subscribeCoreMembers,
  deleteCoreMember,
  coreRegisterUrl,
  publishCoreMember,
  unpublishCoreMember,
  subscribePublicTeam,
  directAddCoreMember,
  BLOOD_GROUPS,
} from '../../services/coreTeamService';
import { exportCoreTeamToExcel } from '../../services/excelExportService';
import { printIdCards, safePhotoUrl } from './printIdCards';

export default function CoreTeamManager({ onToast }) {
  const { adminUser, adminRole } = useAdminAuth();
  const [invites, setInvites] = useState([]);
  const [members, setMembers] = useState([]);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loadError, setLoadError] = useState('');
  const [publishedIds, setPublishedIds] = useState(() => new Set());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    role: '',
    team: 'Platform Architecture',
    studentId: '',
    branch: '',
    phone: '',
    bloodGroup: 'O+',
    photoUrl: '',
    bio: '',
    instagram: '',
    linkedin: '',
    github: '',
    website: '',
    showOnPublicTeam: true,
  });

  useEffect(() => {
    const onError = (err) => setLoadError(err?.message || 'Could not load core team data.');
    const unsubInvites = subscribeCoreInvites(setInvites, onError);
    const unsubMembers = subscribeCoreMembers(setMembers, onError);
    const unsubPublic = subscribePublicTeam((list) => setPublishedIds(new Set(list.map((m) => m.id))), onError);
    return () => { unsubInvites(); unsubMembers(); unsubPublic(); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.name, m.role, m.team, m.studentId, m.branch, m.memberCode].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [members, search]);

  const toast = (msg, type = 'success') => onToast?.(msg, type);

  const createLink = async () => {
    setCreating(true);
    try {
      const token = await createCoreInvite(label, adminUser?.email);
      setLabel('');
      await navigator.clipboard?.writeText(coreRegisterUrl(token)).catch(() => {});
      toast('Registration link created and copied.');
    } catch (err) {
      toast('Could not create link: ' + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (token) => {
    try {
      await navigator.clipboard.writeText(coreRegisterUrl(token));
      toast('Link copied. Share it only with your core team.');
    } catch {
      toast('Copy failed — select the link and copy it manually.', 'error');
    }
  };

  const toggleInvite = async (invite) => {
    try {
      await setCoreInviteActive(invite.token, !invite.active);
      toast(invite.active ? 'Link closed. It no longer accepts registrations.' : 'Link reopened.');
    } catch (err) {
      toast('Could not update link: ' + err.message, 'error');
    }
  };

  const toggleSelected = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id));
  const toggleAll = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    filtered.forEach((m) => (allFilteredSelected ? next.delete(m.id) : next.add(m.id)));
    return next;
  });

  const print = (list) => {
    if (!list.length) return toast('Nothing to print.', 'error');
    if (!printIdCards(list)) toast('Allow pop-ups for this site to print ID cards.', 'error');
  };

  const removeMember = async (m) => {
    if (!window.confirm(`Delete ${m.name}'s core registration? This cannot be undone.`)) return;
    try {
      await deleteCoreMember(m.id);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(m.id); return next; });
      toast('Registration deleted.');
    } catch (err) {
      toast('Could not delete: ' + err.message, 'error');
    }
  };

  const togglePublished = async (m) => {
    try {
      if (publishedIds.has(m.id)) {
        setPublishedIds((prev) => { const next = new Set(prev); next.delete(m.id); return next; });
        await unpublishCoreMember(m.id);
        toast(`${m.name} removed from the public Team page.`);
      } else {
        setPublishedIds((prev) => new Set([...prev, m.id]));
        await publishCoreMember(m);
        toast(`${m.name} is now on the public Team page.`);
      }
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (msg.includes('BLOCKED_BY_CLIENT') || msg.includes('unavailable') || err?.code === 'unavailable') {
        toast('Connection blocked by an ad-blocker or privacy extension. Please whitelist this site.', 'error');
      } else {
        toast('Could not update Team page: ' + msg, 'error');
      }
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      toast('Please enter member name.', 'error');
      return;
    }
    if (!addForm.role.trim()) {
      toast('Please enter member role.', 'error');
      return;
    }
    setAddSaving(true);
    try {
      const created = await directAddCoreMember(addForm);
      if (addForm.showOnPublicTeam) {
        setPublishedIds((prev) => new Set([...prev, created.id]));
      }
      toast(`${addForm.name} added to Core Team${addForm.showOnPublicTeam ? ' and published to /team' : ''}!`);
      setAddModalOpen(false);
      setAddForm({
        name: '',
        role: '',
        team: 'Platform Architecture',
        studentId: '',
        branch: '',
        phone: '',
        bloodGroup: 'O+',
        photoUrl: '',
        bio: '',
        instagram: '',
        linkedin: '',
        github: '',
        website: '',
        showOnPublicTeam: true,
      });
    } catch (err) {
      toast('Failed to add team member: ' + err.message, 'error');
    } finally {
      setAddSaving(false);
    }
  };

  const publishSelected = async () => {
    try {
      await Promise.all(selectedMembers.filter((m) => !publishedIds.has(m.id)).map(publishCoreMember));
      toast('Selected members are now on the public Team page.');
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (msg.includes('BLOCKED_BY_CLIENT') || msg.includes('unavailable') || err?.code === 'unavailable') {
        toast('Connection blocked by an ad-blocker or privacy extension. Please whitelist this site.', 'error');
      } else {
        toast('Could not publish: ' + msg, 'error');
      }
    }
  };

  const handleExportExcel = async () => {
    if (!filtered.length) {
      toast('No core team records to export.', 'error');
      return;
    }
    try {
      setExporting(true);
      const res = await exportCoreTeamToExcel({
        members: filtered,
        adminUser,
        adminRole: adminRole || 'admin',
        publishedIds
      });
      toast(`Exported ${res.count} members to ${res.filename}!`);
    } catch (err) {
      toast('Export failed: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const selectedMembers = members.filter((m) => selectedIds.has(m.id));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="!text-2xl font-heading font-black text-white">Core Team</h2>
        <p className="mt-1 text-sm text-white/45">Private registration for the internal team, and printable ID cards. Links are visible only here.</p>
      </div>

      {loadError && (
        <p role="alert" className="rounded-xl border border-red-600/45 bg-red-600/5 p-4 text-sm text-white/70">
          {loadError} Make sure the latest Firestore rules are deployed.
        </p>
      )}

      {/* Registration links */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#080808] p-5 space-y-4">
        <h3 className="!text-sm !tracking-[0.15em] font-mono text-white/70 flex items-center gap-2"><Link2 className="w-4 h-4 text-red-500" /> Registration links</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            placeholder="Label (optional), e.g. Core team 2026"
            className="flex-1 min-h-[44px] px-4 rounded-xl bg-black border border-white/[0.12] text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-red-600"
          />
          <button
            type="button"
            onClick={createLink}
            disabled={creating}
            className="min-h-[44px] px-5 rounded-xl bg-red-600 hover:bg-red-400 disabled:bg-white/[0.08] text-white text-sm font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create link
          </button>
        </div>

        {invites.length === 0 ? (
          <p className="text-sm text-white/45">No links yet. Create one and share it with your core team.</p>
        ) : (
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li key={invite.token} className="flex flex-col lg:flex-row lg:items-center gap-2 rounded-xl border border-white/[0.08] p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm text-white">
                    {invite.label || 'Core team'}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${invite.active ? 'bg-red-600/15 text-red-400' : 'bg-white/[0.06] text-white/45'}`}>
                      {invite.active ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <code className="block mt-1 text-xs text-white/45 truncate">{coreRegisterUrl(invite.token)}</code>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => copyLink(invite.token)} className="min-h-[40px] px-3 rounded-lg border border-white/20 hover:border-red-600 text-xs text-white inline-flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                  <button type="button" onClick={() => toggleInvite(invite)} className="min-h-[40px] px-3 rounded-lg border border-white/20 hover:border-red-600 text-xs text-white inline-flex items-center gap-1.5">
                    {invite.active ? <><Lock className="w-3.5 h-3.5" /> Close</> : <><Unlock className="w-3.5 h-3.5" /> Reopen</>}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Members + ID cards */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#080808] p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <h3 className="!text-sm !tracking-[0.15em] font-mono text-white/70 flex items-center gap-2">
            <Users className="w-4 h-4 text-red-500" /> Registrations <span className="text-white">{members.length}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_20px_rgba(223,37,49,0.35)]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
            <button type="button" onClick={handleExportExcel} disabled={!filtered.length || exporting}
              className="min-h-[44px] px-4 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-red-500 hover:text-white disabled:opacity-40 text-neutral-200 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm">
              <Download className="w-4 h-4 text-red-500" />
              <span>{exporting ? 'Exporting...' : 'Export Core Team (.xlsx)'}</span>
            </button>
            <button type="button" onClick={publishSelected} disabled={!selectedMembers.length}
              className="min-h-[44px] px-4 rounded-xl border border-white/20 hover:border-red-600 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2">
              <Eye className="w-4 h-4" /> Show selected on /team
            </button>
            <button type="button" onClick={() => print(selectedMembers)} disabled={!selectedMembers.length}
              className="min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-400 disabled:bg-white/[0.08] disabled:text-white/35 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print selected ({selectedMembers.length})
            </button>
            <button type="button" onClick={() => print(filtered)} disabled={!filtered.length}
              className="min-h-[44px] px-4 rounded-xl border border-white/20 hover:border-red-600 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print all{search ? ' shown' : ''}
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, role, team, student ID, branch or card ID"
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-black border border-white/[0.12] text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-red-600"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-white/45">{members.length ? 'No matches.' : 'No registrations yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-white/40">
                  <th className="py-2 pr-3 w-8">
                    <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} aria-label="Select all shown" className="accent-red-600 w-4 h-4" />
                  </th>
                  <th className="py-2 pr-3">Member</th>
                  <th className="py-2 pr-3">Student ID</th>
                  <th className="py-2 pr-3">Branch</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Blood</th>
                  <th className="py-2 pr-3">Card ID</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className={`border-t border-white/[0.06] hover:bg-red-600/5 ${selectedIds.has(m.id) ? 'shadow-[inset_2px_0_0_#DF2531]' : ''}`}>
                    <td className="py-3 pr-3">
                      <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelected(m.id)} aria-label={`Select ${m.name}`} className="accent-red-600 w-4 h-4" />
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        {safePhotoUrl(m.photoUrl) ? (
                          <img src={m.photoUrl} alt="" loading="lazy" className="w-10 h-12 rounded-md object-cover border border-white/10" />
                        ) : (
                          <div className="w-10 h-12 rounded-md bg-white/[0.06]" />
                        )}
                        <div>
                          <div className="text-white">{m.name}</div>
                          <div className="text-xs text-red-400">{m.role}</div>
                          <div className="text-[11px] text-white/45 uppercase tracking-wider">{m.team}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-white/70 font-mono text-xs">{m.studentId}</td>
                    <td className="py-3 pr-3 text-white/70">{m.branch}</td>
                    <td className="py-3 pr-3 text-white/70 font-mono text-xs">{m.phone}</td>
                    <td className="py-3 pr-3 text-white">{m.bloodGroup}</td>
                    <td className="py-3 pr-3 text-white/70 font-mono text-xs">{m.memberCode}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => togglePublished(m)}
                        aria-label={publishedIds.has(m.id) ? `Hide ${m.name} from the Team page` : `Show ${m.name} on the Team page`}
                        title={publishedIds.has(m.id) ? 'Shown on /team — click to hide' : 'Hidden from /team — click to show'}
                        className={`p-2 rounded-lg hover:bg-white/[0.06] ${publishedIds.has(m.id) ? 'text-red-400' : 'text-white/40 hover:text-white'}`}>
                        {publishedIds.has(m.id) ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button type="button" onClick={() => print([m])} aria-label={`Print ${m.name}'s ID card`} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.06]">
                        <Printer className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => removeMember(m)} aria-label={`Delete ${m.name}`} className="p-2 rounded-lg text-white/70 hover:text-red-400 hover:bg-white/[0.06]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Member Manually Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 relative shadow-[0_0_50px_rgba(223,37,49,0.3)] my-8">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-neutral-900 hover:bg-red-600/30 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-heading font-black text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-red-500" />
              Add Core Team Member
            </h3>
            <p className="text-xs text-neutral-400 mt-1 font-cyber">
              Directly add a core team lead into the database.
            </p>

            <form onSubmit={handleAddMember} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-300 block mb-1">Full Name *</label>
                  <input
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Rahul Verma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-300 block mb-1">Role / Designation *</label>
                  <input
                    required
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    placeholder="e.g. Lead Coordinator / Tech Head"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-300 block mb-1">Wing / Team</label>
                  <input
                    value={addForm.team}
                    onChange={(e) => setAddForm({ ...addForm, team: e.target.value })}
                    placeholder="e.g. Platform Architecture / Technical"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-300 block mb-1">Photo URL</label>
                  <input
                    value={addForm.photoUrl}
                    onChange={(e) => setAddForm({ ...addForm, photoUrl: e.target.value })}
                    placeholder="https://... or /team/photo.jpg"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-300 block mb-1">Student ID</label>
                  <input
                    value={addForm.studentId}
                    onChange={(e) => setAddForm({ ...addForm, studentId: e.target.value })}
                    placeholder="e.g. 2300030198"
                    className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-800 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-300 block mb-1">Branch</label>
                  <input
                    value={addForm.branch}
                    onChange={(e) => setAddForm({ ...addForm, branch: e.target.value })}
                    placeholder="e.g. CSE / ECE"
                    className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-800 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-300 block mb-1">Blood Group</label>
                  <select
                    value={addForm.bloodGroup}
                    onChange={(e) => setAddForm({ ...addForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-800 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-neutral-300 block mb-1">About / Bio</label>
                <textarea
                  rows={2}
                  value={addForm.bio}
                  onChange={(e) => setAddForm({ ...addForm, bio: e.target.value })}
                  placeholder="Short bio or responsibility area..."
                  className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-800 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-300 block mb-1">Instagram Link</label>
                  <input
                    value={addForm.instagram}
                    onChange={(e) => setAddForm({ ...addForm, instagram: e.target.value })}
                    placeholder="https://instagram.com/..."
                    className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-800 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-300 block mb-1">LinkedIn Link</label>
                  <input
                    value={addForm.linkedin}
                    onChange={(e) => setAddForm({ ...addForm, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-800 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.showOnPublicTeam}
                  onChange={(e) => setAddForm({ ...addForm, showOnPublicTeam: e.target.checked })}
                  className="accent-red-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-mono text-white">Publish immediately to the public Team page (/team)</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white hover:bg-neutral-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-heading font-black uppercase text-white shadow-[0_0_20px_rgba(223,37,49,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {addSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
