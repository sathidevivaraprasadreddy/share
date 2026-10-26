import React, { useState } from 'react';
import { updateUserProfile, changeUserPassword, deleteAccount } from '../services/api';
import { X, User, HardDrive, KeyRound, Check, LogOut, Trash2, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';

const AVATAR_COLORS = [
  '#e11d48', '#2563eb', '#7c3aed', '#059669', '#d97706', '#0891b2', '#db2777', '#4f46e5'
];

export default function ProfileModal({ isOpen, onClose, user, onUpdateUser, onLogout, onOpenAdmin }) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || '#e11d48');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPw, setLoadingPw] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  if (!isOpen || !user) return null;

  const quotaMB = ((user.storageQuotaBytes || 1073741824) / (1024 * 1024)).toFixed(0);
  const usedMB = ((user.storageUsedBytes || 0) / (1024 * 1024)).toFixed(1);
  const percentUsed = Math.min(100, Math.round(((user.storageUsedBytes || 0) / (user.storageQuotaBytes || 1073741824)) * 100));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setErrorMsg(null);
    setLoadingProfile(true);

    try {
      const res = await updateUserProfile(displayName, avatarColor);
      if (res.success) {
        setProfileMsg('Profile updated successfully.');
        onUpdateUser({ ...user, displayName, avatarColor });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    setErrorMsg(null);
    setLoadingPw(true);

    try {
      const res = await changeUserPassword(currentPassword, newPassword);
      if (res.success) {
        setPwMsg('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoadingPw(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') return;
    setDeletingAccount(true);
    setErrorMsg(null);
    try {
      const res = await deleteAccount('DELETE');
      if (res.success) {
        setShowDeleteModal(false);
        onLogout();
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to delete account.');
      setDeletingAccount(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Badge */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md"
            style={{ backgroundColor: avatarColor }}
          >
            {(displayName || user.username || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{displayName || user.username}</h2>
              {(user.isAdmin || user.is_admin) && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">@{user.username}</p>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            {(user.isAdmin || user.is_admin) && onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="mt-2 py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Open Admin Control Center</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Alert Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs sm:text-sm">
            {errorMsg}
          </div>
        )}
        {profileMsg && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs sm:text-sm">
            {profileMsg}
          </div>
        )}
        {pwMsg && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs sm:text-sm">
            {pwMsg}
          </div>
        )}

        {/* Storage Quota Card */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-rose-600" />
              Cloud Storage Quota
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {usedMB} MB / {quotaMB} MB ({percentUsed}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-rose-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${percentUsed}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            100% Free Forever tier. Expired or deleted files automatically free up space.
          </p>
        </div>

        {/* Profile Settings Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Profile Settings
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Avatar Color
            </label>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setAvatarColor(color)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center text-white ${
                    avatarColor === color ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {avatarColor === color && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingProfile}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all"
          >
            {loadingProfile ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="space-y-4 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Change Password
          </h3>
          <div>
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="New Password (min 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loadingPw || !currentPassword || !newPassword}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            {loadingPw ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {/* Logout & Danger Zone */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>

          {/* Danger Zone: Delete Account */}
          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 space-y-2">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wide">Danger Zone</h4>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Permanently delete your account, saved files, active share links, and group memberships.
            </p>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmationText('');
                setShowDeleteModal(true);
              }}
              className="py-2 px-3 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal Dialog */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Account Permanently?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This action <strong>cannot be undone</strong>. All your uploaded files will be physically shredded from storage.
              </p>
            </div>

            <div className="text-left space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Type <strong>DELETE</strong> below to confirm:
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full text-center font-mono font-bold text-sm py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-rose-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmationText !== 'DELETE'}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {deletingAccount ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Delete My Account</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs rounded-xl transition-colors"
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
