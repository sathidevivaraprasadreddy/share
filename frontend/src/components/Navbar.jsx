import React, { useState } from 'react';
import {
  Send,
  Inbox,
  FolderLock,
  Users,
  Activity,
  Shield,
  ShieldAlert,
  User,
  LogIn,
  Menu,
  X,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';

export default function Navbar({
  currentView,
  onChangeView,
  activeShare,
  isViewingShareResult,
  onSelectActiveShare,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenRevoke,
  onReset,
  onSelectShare,
  serverHealthy,
  darkMode,
  onToggleDarkMode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'transfer', label: 'Transfer', icon: Send },
    { id: 'my-files', label: 'My Files', icon: FolderLock, requireAuth: false },
    { id: 'inbox', label: 'Inbox', icon: Inbox, requireAuth: true },
    { id: 'groups', label: 'Groups', icon: Users, requireAuth: true },
    { id: 'activity', label: 'Activity', icon: Activity, requireAuth: true }
  ];

  const handleNavClick = (item) => {
    if (item.requireAuth && !currentUser) {
      onOpenAuth();
    } else {
      onChangeView(item.id);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              onChangeView('transfer');
              if (onReset) onReset();
            }}
            className="flex items-center gap-2.5 text-left group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                  QuickShare
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Fast & Simple File Sharing
              </p>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {activeShare && (
              <button
                type="button"
                onClick={() => {
                  onSelectActiveShare();
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isViewingShareResult
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 shadow-xs'
                }`}
                title="View active share code, QR, and secret delete key"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Active Share ({activeShare.sixCode || 'Link'})</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Night / Day Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              darkMode
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/60 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 shadow-2xs'
            }`}
            title={darkMode ? "Currently Night Mode. Click for Day Mode" : "Currently Day Mode. Click for Night Mode"}
            aria-label="Toggle Night Mode"
          >
            {darkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Night</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Day</span>
              </>
            )}
          </button>

          {/* Health indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                serverHealthy === true
                  ? 'bg-emerald-500 animate-pulse'
                  : serverHealthy === false
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
            <span className="font-medium text-[11px]">
              {serverHealthy === true ? 'Ready' : serverHealthy === false ? 'Connecting...' : 'Checking'}
            </span>
          </div>

          {/* Emergency Delete Key Button */}
          <button
            onClick={onOpenRevoke}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-semibold transition-all"
            title="Delete files early using your secret key"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Delete with Key</span>
          </button>

          {/* Notifications (if logged in) */}
          {currentUser && (
            <NotificationsDropdown
              user={currentUser}
              onSelectShare={onSelectShare}
            />
          )}

          {/* User Auth / Profile */}
          {currentUser ? (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition-all text-left"
              title="Profile & Storage Quota"
            >
              <div
                className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center uppercase shadow-xs"
                style={{ backgroundColor: currentUser.avatarColor || '#e11d48' }}
              >
                {currentUser.username ? currentUser.username[0] : 'U'}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block leading-tight">
                  {currentUser.displayName || currentUser.username}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-400 block leading-none">
                  @{currentUser.username}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-2 animate-fade-in shadow-lg">
          {activeShare && (
            <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectActiveShare();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-600 animate-pulse" />
                  <span>Active Share: Code {activeShare.sixCode || 'Ready'}</span>
                </div>
                <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold">
                  View Key & QR →
                </span>
              </button>
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.requireAuth && !currentUser && (
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                    Login
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenRevoke();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 transition-all border border-amber-200 dark:border-amber-800"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Delete with Key</span>
            </button>

            <button
              onClick={onToggleDarkMode}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              <span>{darkMode ? 'Day' : 'Night'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
