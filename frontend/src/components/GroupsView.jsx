import React, { useState, useEffect } from 'react';
import {
  getGroups,
  createGroup,
  getGroupDetails,
  addGroupMember,
  removeGroupMember,
  getZipDownloadUrl,
  deleteGroup
} from '../services/api';
import {
  Users,
  Plus,
  UserPlus,
  LogOut,
  Folder,
  Download,
  Clock,
  Shield,
  X,
  AlertCircle,
  CheckCircle,
  Trash2
} from 'lucide-react';
import { formatBytes } from '../utils/format';

export default function GroupsView({ user, onRequireAuth }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadGroups();
  }, [user]);

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getGroups();
      if (res.success) {
        setGroups(res.groups || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load groups.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    setError(null);
    try {
      const res = await deleteGroup(selectedGroup.id);
      if (res.success) {
        setSuccess(`Group "${groupDetails?.name || ''}" has been permanently deleted.`);
        setGroups((prev) => prev.filter((g) => g.id !== selectedGroup.id));
        setSelectedGroup(null);
        setGroupDetails(null);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete group.');
    }
  };

  const handleSelectGroup = async (group) => {
    setSelectedGroup(group);
    setError(null);
    setSuccess(null);
    try {
      const res = await getGroupDetails(group.id);
      if (res.success) {
        setGroupDetails(res.group);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load group details.');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const res = await createGroup(newGroupName.trim(), newGroupDesc.trim());
      if (res.success) {
        setNewGroupName('');
        setNewGroupDesc('');
        setShowCreateModal(false);
        loadGroups();
        setSuccess('Group created successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group.');
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !selectedGroup) return;
    try {
      const res = await addGroupMember(selectedGroup.id, inviteUsername.trim());
      if (res.success) {
        setInviteUsername('');
        setSuccess(res.message);
        handleSelectGroup(selectedGroup);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member.');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedGroup) return;
    try {
      const res = await removeGroupMember(selectedGroup.id, userId);
      if (res.success) {
        if (userId === user.id) {
          // Left group
          setSelectedGroup(null);
          setGroupDetails(null);
          loadGroups();
        } else {
          handleSelectGroup(selectedGroup);
        }
        setSuccess(res.message);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member.');
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 max-w-lg mx-auto text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Users className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Collaboration Groups</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Create groups with friends, family, or teammates to share file packages securely.
        </p>
        <button
          onClick={onRequireAuth}
          className="py-2.5 px-6 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
        >
          Sign In or Register (100% Free)
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-600" />
            Collaboration Groups
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Share collections with groups of friends or project teams.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Groups View or Group Details */}
      {!selectedGroup ? (
        loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading groups...
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100 space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Groups Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first group to share files with multiple recipients at once.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g) => (
              <div
                key={g.id}
                onClick={() => handleSelectGroup(g)}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:border-rose-200 hover:shadow-md cursor-pointer transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    {g.name[0].toUpperCase()}
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                    {g.role}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{g.name}</h3>
                  {g.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{g.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-50">
                  <span>{g.memberCount} member(s)</span>
                  <span>{g.activeSharesCount} active share(s)</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Selected Group Detail View */
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <button
                onClick={() => {
                  setSelectedGroup(null);
                  setGroupDetails(null);
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 mb-1 inline-block"
              >
                ← Back to All Groups
              </button>
              <h2 className="text-xl font-bold text-slate-900">{groupDetails?.name}</h2>
              {groupDetails?.description && (
                <p className="text-xs text-slate-500 mt-0.5">{groupDetails.description}</p>
              )}
            </div>

            {groupDetails?.isOwner ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-rose-200 shadow-xs"
                title="Delete group permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Group</span>
              </button>
            ) : (
              <button
                onClick={() => handleRemoveMember(user.id)}
                className="py-1.5 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave Group
              </button>
            )}
          </div>

          {/* Members Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Members ({groupDetails?.members?.length || 0})
            </h3>

            {/* Invite Form (Owner Only) */}
            {groupDetails?.isOwner && (
              <form onSubmit={handleInviteMember} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Invite username (e.g. shaik_arif)"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                <button
                  type="submit"
                  disabled={!inviteUsername.trim()}
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1 disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Invite
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {groupDetails?.members?.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: m.avatarColor || '#e11d48' }}
                    >
                      {m.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {m.displayName || m.username}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">@{m.username}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 capitalize">
                      {m.role}
                    </span>
                    {groupDetails.isOwner && m.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove member"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group Shared Files */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Files Shared with Group ({groupDetails?.shares?.length || 0})
            </h3>

            {groupDetails?.shares?.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-400">
                No files have been shared with this group yet. You can share files directly from the Send dashboard.
              </div>
            ) : (
              <div className="space-y-2">
                {groupDetails?.shares?.map((share) => (
                  <div
                    key={share.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Folder className="w-5 h-5 text-rose-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800">
                          {share.fileCount} file(s) ({formatBytes(share.totalSizeBytes)})
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Shared by {share.sharedBy} • Expires {new Date(share.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <a
                      href={getZipDownloadUrl(share.shareToken)}
                      className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 shadow-sm shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download ZIP
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Create Group</h2>
            <p className="text-xs text-slate-500 mb-4">
              Collaborate and distribute files to multiple users at once.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Design Team or College Batch"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What is this group for?"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete this group?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete <strong>"{groupDetails?.name}"</strong>? All shared group files and member connections will be removed.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleDeleteGroup}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                Yes, Delete Group
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
