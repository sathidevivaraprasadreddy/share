import React, { useState, useEffect, useRef } from 'react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications
} from '../services/api';
import { Bell, CheckCheck, FileDown, ShieldAlert, Users, Clock, Trash2 } from 'lucide-react';

export default function NotificationsDropdown({ user, onSelectShare }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    async function loadNotifications() {
      try {
        const res = await getNotifications();
        if (res.success) {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        }
      } catch {}
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [user]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleDeleteOne = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => {
        const item = prev.find((n) => n.id === id);
        if (item && !item.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch {}
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  };

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      await markNotificationRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    if (notif.linkUrl && onSelectShare) {
      const match = notif.linkUrl.match(/\/share\/([a-zA-Z0-9]+)/);
      if (match) {
        onSelectShare(match[1]);
        setOpen(false);
      }
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-800 dark:text-white">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Read all
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-0.5 ml-1 transition-colors"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`group p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start gap-3 relative ${
                    !n.isRead ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                    {n.type === 'file_downloaded' ? (
                      <FileDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : n.type === 'transfer_revoked' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    ) : n.type === 'group_invited' ? (
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="text-xs font-bold text-slate-800 dark:text-white truncate">{n.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {n.message}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-500 shrink-0"></span>
                    )}
                    <button
                      onClick={(e) => handleDeleteOne(n.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-all"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
