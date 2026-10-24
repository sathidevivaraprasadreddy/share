import React, { useState, useEffect, useRef } from 'react';
import {
  getGroups,
  createGroup,
  getGroupDetails,
  addGroupMember,
  removeGroupMember,
  getZipDownloadUrl,
  deleteGroup,
  getGroupByInvite,
  joinGroupByInvite,
  getGroupMessages,
  sendGroupMessage,
  deleteGroupMessage
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
  Trash2,
  Share2,
  Link,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Send,
  QrCode,
  Smile,
  CheckCheck,
  Paperclip
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatBytes } from '../utils/format';

export default function GroupsView({
  user,
  onRequireAuth,
  initialInviteCode = null,
  onClearInitialInviteCode
}) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shareModalGroup, setShareModalGroup] = useState(null);
  const [qrModalGroup, setQrModalGroup] = useState(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState(initialInviteCode || '');
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // WhatsApp-style Group Chat State
  const [groupTab, setGroupTab] = useState('chat'); // 'chat' | 'files' | 'members'
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  const EMOJIS = [
    '😀', '😂', '🤣', '😍', '🥰', '😎', '👍', '🔥', '❤️', '🎉', 
    '🚀', '📁', '📄', '📎', '🙏', '👏', '💯', '🤝', '🎂', '🎓', 
    '🤔', '🥳', '💡', '⚡', '✨', '🙌', '🤩', '💻'
  ];

  const loadGroupMessages = async (groupId, silent = false) => {
    if (!groupId) return;
    try {
      const res = await getGroupMessages(groupId);
      if (res.success) {
        setMessages(res.messages || []);
      }
    } catch (err) {
      if (!silent) console.warn('Could not load group messages:', err);
    }
  };

  // Auto-poll messages every 2.5 seconds when group is open
  useEffect(() => {
    if (!selectedGroup) return;
    loadGroupMessages(selectedGroup.id);
    const interval = setInterval(() => {
      loadGroupMessages(selectedGroup.id, true);
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedGroup?.id]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (groupTab === 'chat' && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, groupTab]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !selectedGroup) return;
    const msgText = chatInput.trim();
    setChatInput('');
    setShowEmojiPicker(false);

    // Optimistic UI display
    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      id: tempId,
      groupId: selectedGroup.id,
      userId: user?.id || 0,
      message: msgText,
      createdAt: new Date().toISOString(),
      senderUsername: user?.username || 'me',
      senderDisplayName: user?.displayName || user?.username || 'Me',
      avatarColor: user?.avatarColor || '#10b981',
      isMe: true,
      canDelete: true
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await sendGroupMessage(selectedGroup.id, msgText);
      if (res.success && res.message) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? res.message : m)));
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError(err.response?.data?.error || 'Failed to send message.');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!selectedGroup) return;
    try {
      const res = await deleteGroupMessage(selectedGroup.id, messageId);
      if (res.success) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete message.');
    }
  };

  useEffect(() => {
    if (initialInviteCode) {
      setJoinCodeInput(initialInviteCode);
    }
  }, [initialInviteCode]);

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

  const handleJoinByCode = async (e) => {
    if (e) e.preventDefault();
    let code = joinCodeInput.trim();
    if (!code) return;

    // If user entered a link like http://.../?groupInvite=abc or #/groups?groupInvite=abc
    if (code.includes('groupInvite=')) {
      try {
        const url = new URL(code.startsWith('http') ? code : `https://${code}`);
        code = url.searchParams.get('groupInvite') || code;
      } catch {}
    }

    setJoining(true);
    setError(null);
    try {
      const res = await joinGroupByInvite(code);
      if (res.success) {
        setSuccess(res.message || 'Joined group successfully!');
        setJoinCodeInput('');
        if (onClearInitialInviteCode) onClearInitialInviteCode();
        await loadGroups();
        if (res.group) {
          handleSelectGroup(res.group);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join group with this invite code.');
    } finally {
      setJoining(false);
    }
  };

  const getInviteUrl = (code) => {
    return `${window.location.origin}/?groupInvite=${code}`;
  };

  const handleCopyInviteLink = (code) => {
    const url = getInviteUrl(code);
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
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
    setGroupTab('chat');
    setError(null);
    setSuccess(null);
    loadGroupMessages(group.id);
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

      {/* Join Group via Invite Link or Code */}
      {!selectedGroup && (
        <form
          onSubmit={handleJoinByCode}
          className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
            <Link className="w-4 h-4 text-rose-500" />
            <span>Join with Invite:</span>
          </div>
          <input
            type="text"
            placeholder="Paste invite link or enter 16-char invite code (e.g. 7f3a8b2c...)"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value)}
            className="flex-1 w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          <button
            type="submit"
            disabled={!joinCodeInput.trim() || joining}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {joining ? 'Joining...' : 'Join Group'}
          </button>
        </form>
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
              Create your first group or join an existing one using an invite link or code.
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
                  <div className="flex items-center gap-1.5">
                    {g.inviteCode && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareModalGroup(g);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title="Share WhatsApp invite link"
                        >
                          <Share2 className="w-3 h-3" />
                          Invite Link
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrModalGroup(g);
                          }}
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Show QR Code to join this group"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <span>{g.activeSharesCount} share(s)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Selected Group Detail View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedGroup(null);
                  setGroupDetails(null);
                }}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                title="Back to all groups"
              >
                ← Back
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{groupDetails?.name}</span>
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {groupDetails?.members?.length || 0} member(s)
                  </span>
                </h2>
                {groupDetails?.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{groupDetails.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {groupDetails?.inviteCode && (
                <>
                  <button
                    onClick={() => handleCopyInviteLink(groupDetails.inviteCode)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedInvite ? 'Copied' : 'Invite Link'}</span>
                  </button>
                  <button
                    onClick={() => setQrModalGroup(groupDetails)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    <span>QR</span>
                  </button>
                </>
              )}

              {groupDetails?.isOwner ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-1.5 px-3 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-800 shadow-xs"
                  title="Delete group permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              ) : (
                <button
                  onClick={() => handleRemoveMember(user.id)}
                  className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Leave</span>
                </button>
              )}
            </div>
          </div>

          {/* Group Tabs Selector: Chat | Files | Members */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-md">
            <button
              type="button"
              onClick={() => setGroupTab('chat')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                groupTab === 'chat'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Group Chat</span>
              {messages.length > 0 && (
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                  {messages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setGroupTab('files')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                groupTab === 'files'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-rose-500" />
              <span>Files ({groupDetails?.shares?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setGroupTab('members')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                groupTab === 'members'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Members ({groupDetails?.members?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: WHATSAPP-STYLE GROUP CHAT */}
          {groupTab === 'chat' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[520px] bg-[#efeae2] dark:bg-[#0b141a] shadow-inner relative animate-fade-in">
              {/* WhatsApp Chat Wallpaper Header */}
              <div className="px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                    {groupDetails?.name ? groupDetails.name[0] : 'G'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                      {groupDetails?.name}
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {groupDetails?.members?.length || 1} member(s) • Live sync
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {groupDetails?.inviteCode && (
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join our "${groupDetails.name}" group on QuickShare:\n🔗 ${getInviteUrl(groupDetails.inviteCode)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                      title="Share to WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  <button
                    onClick={() => setQrModalGroup(groupDetails)}
                    className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 rounded-lg text-xs"
                    title="Scan QR to join"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Message Bubbles */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Date Header Pill */}
                <div className="flex justify-center">
                  <span className="px-3 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 shadow-2xs backdrop-blur-xs">
                    Today
                  </span>
                </div>

                {/* Empty State Banner */}
                {messages.length === 0 && (
                  <div className="max-w-xs mx-auto p-3.5 bg-amber-50/90 dark:bg-slate-800/90 border border-amber-200/80 dark:border-slate-700 rounded-xl text-center text-xs text-slate-600 dark:text-slate-300 space-y-1 shadow-2xs">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">No messages yet</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Send a message, tap emojis below, or share files with the group to start chatting!
                    </p>
                  </div>
                )}

                {/* Messages List */}
                {messages.map((m) => {
                  const isMe = m.isMe || (user && m.userId === user.id);
                  const timeFormatted = m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Sender initial avatar for incoming messages */}
                      {!isMe && (
                        <div
                          className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 mb-1"
                          style={{ backgroundColor: m.avatarColor || '#10b981' }}
                          title={m.senderDisplayName}
                        >
                          {(m.senderDisplayName || m.senderUsername || '?')[0].toUpperCase()}
                        </div>
                      )}

                      <div
                        className={`group relative max-w-[82%] sm:max-w-[70%] px-3.5 py-2 rounded-2xl shadow-2xs ${
                          isMe
                            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-br-xs'
                            : 'bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 rounded-bl-xs'
                        }`}
                      >
                        {/* Sender Display Name on incoming bubbles */}
                        {!isMe && (
                          <div
                            className="text-[11px] font-bold leading-tight mb-1"
                            style={{ color: m.avatarColor || '#00a884' }}
                          >
                            {m.senderDisplayName || m.senderUsername}
                          </div>
                        )}

                        {/* Message content */}
                        <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
                          {m.message}
                        </p>

                        {/* Bubble Timestamp and Status checkmarks */}
                        <div className="flex items-center justify-end gap-1.5 mt-1 -mb-0.5 text-[10px] text-slate-400 dark:text-slate-300">
                          <span>{timeFormatted}</span>
                          {isMe && (
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] dark:text-[#53bdeb]" />
                          )}
                          {m.canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(m.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-slate-400 hover:text-rose-600"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Emoji Picker Tray (WhatsApp-Style) */}
              {showEmojiPicker && (
                <div className="p-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800 animate-fade-in shrink-0">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1 px-1">
                    <span>Quick Emojis</span>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 max-h-24 overflow-y-auto">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleAddEmoji(emoji)}
                        className="text-lg p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 active:scale-110 transition-all text-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Bar (WhatsApp-Style) */}
              <form
                onSubmit={handleSendMessage}
                className="p-2 sm:p-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200/90 dark:border-slate-800 flex items-center gap-2 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-full transition-colors"
                  title="Insert emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-white dark:bg-[#2a3942] text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00a884]/30"
                />

                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
                  title="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: FILES SHARED WITH GROUP */}
          {groupTab === 'files' && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Files Shared with Group ({groupDetails?.shares?.length || 0})
              </h3>

              {groupDetails?.shares?.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs text-slate-400">
                  No files have been shared with this group yet. You can share files directly from the Transfer Send dashboard.
                </div>
              ) : (
                <div className="space-y-2">
                  {groupDetails?.shares?.map((share) => (
                    <div
                      key={share.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Folder className="w-5 h-5 text-rose-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {share.fileCount} file(s) ({formatBytes(share.totalSizeBytes)})
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Shared by {share.sharedBy} • Expires {new Date(share.expiresAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <a
                        href={getZipDownloadUrl(share.shareToken)}
                        className="py-1.5 px-3 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download ZIP
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MEMBERS & INVITE BANNER */}
          {groupTab === 'members' && (
            <div className="space-y-4 animate-fade-in">
              {/* WhatsApp & Public Invite Link Banner */}
              {groupDetails?.inviteCode && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span>WhatsApp & Public Invite Link</span>
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold px-1.5 py-0.5 rounded-full">Active</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Anyone with this link or code can join this group instantly without manual approval.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hey! Join our "${groupDetails.name}" group on QuickShare to share files instantly:\n🔗 ${getInviteUrl(groupDetails.inviteCode)}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(getInviteUrl(groupDetails.inviteCode))}&text=${encodeURIComponent(`Join our "${groupDetails.name}" group on QuickShare!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-[#229ED9] hover:bg-[#1e8ec3] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Telegram
                      </a>
                      <button
                        onClick={() => handleCopyInviteLink(groupDetails.inviteCode)}
                        className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                        {copiedInvite ? 'Copied Link!' : 'Copy Link'}
                      </button>
                      <button
                        onClick={() => setQrModalGroup(groupDetails)}
                        className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                        <span>Scan QR</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono bg-white/90 dark:bg-slate-900/90 px-3 py-2 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2 overflow-hidden">
                    <span className="truncate">{getInviteUrl(groupDetails.inviteCode)}</span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-400 shrink-0 ml-2">Code: {groupDetails.inviteCode}</span>
                  </div>
                </div>
              )}

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
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                    <button
                      type="submit"
                      disabled={!inviteUsername.trim()}
                      className="py-2 px-4 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1 disabled:opacity-50"
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
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: m.avatarColor || '#e11d48' }}
                        >
                          {m.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {m.displayName || m.username}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">@{m.username}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
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
            </div>
          )}
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

      {/* Group Invite Link & WhatsApp Modal */}
      {shareModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
            <button
              onClick={() => setShareModalGroup(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Invite to "{shareModalGroup.name}"
                </h3>
                <p className="text-xs text-slate-500">
                  Share this invite link directly via WhatsApp or copy the code.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Public Invite Link
                </div>
                <div className="text-xs font-mono text-slate-700 break-all select-all">
                  {getInviteUrl(shareModalGroup.inviteCode)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hey! Join our "${shareModalGroup.name}" group on QuickShare to share files instantly:\n🔗 ${getInviteUrl(shareModalGroup.inviteCode)}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(getInviteUrl(shareModalGroup.inviteCode))}&text=${encodeURIComponent(`Join our "${shareModalGroup.name}" group on QuickShare!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-[#229ED9] hover:bg-[#1e8ec3] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Telegram
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopyInviteLink(shareModalGroup.inviteCode)}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {copiedInvite ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedInvite ? 'Copied Link' : 'Copy Link'}
                </button>
                <button
                  onClick={() => {
                    setQrModalGroup(shareModalGroup);
                  }}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <QrCode className="w-4 h-4 text-slate-600" />
                  Scan QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group QR Code Modal */}
      {qrModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative text-center space-y-4">
            <button
              onClick={() => setQrModalGroup(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Join "{qrModalGroup.name}"
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Scan with any phone camera to join this group instantly.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 inline-block shadow-inner">
              <QRCodeSVG
                value={getInviteUrl(qrModalGroup.inviteCode)}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="text-xs font-mono font-bold text-slate-600 bg-slate-100 py-1.5 px-3 rounded-xl inline-block">
              Code: {qrModalGroup.inviteCode}
            </div>

            <button
              onClick={() => setQrModalGroup(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
