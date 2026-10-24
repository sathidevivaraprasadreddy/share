import React, { useState } from 'react';
import {
  Send,
  Inbox,
  FolderLock,
  Users,
  Activity,
  Shield,
  User,
  LogIn,
  Menu,
  X,
  Sparkles,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';

export default function Navbar({
  currentView,
  onChangeView,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onReset,
  onSelectShare,
  serverHealthy
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'transfer', label: 'Transfer', icon: Send },
    { id: 'inbox', label: 'Inbox', icon: Inbox, requireAuth: true },
    { id: 'my-files', label: 'My Files', icon: FolderLock, requireAuth: true },
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
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
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
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  QuickShare
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200/60">
                  ₹0 Free
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Secure & Ephemeral Transfer
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
                      ? 'bg-rose-50 text-rose-600 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2.5">
          {/* Health indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border bg-slate-50 border-slate-200 text-slate-600">
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
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-100 border border-slate-200/80 transition-all text-left"
              title="Profile & Storage Quota"
            >
              <div
                className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center uppercase shadow-xs"
                style={{ backgroundColor: currentUser.avatarColor || '#e11d48' }}
              >
                {currentUser.username ? currentUser.username[0] : 'U'}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {currentUser.displayName || currentUser.username}
                </span>
                <span className="text-[10px] text-slate-400 block leading-none">
                  @{currentUser.username}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white px-4 py-3 space-y-1 animate-fade-in shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-rose-50 text-rose-600 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.requireAuth && !currentUser && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                    Login
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
