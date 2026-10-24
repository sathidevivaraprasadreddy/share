import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TransferDashboard from './components/TransferDashboard';
import ShareResult from './components/ShareResult';
import DownloadView from './components/DownloadView';
import QRCodeModal from './components/QRCodeModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import RevokeModal from './components/RevokeModal';
import InboxView from './components/InboxView';
import MyFilesView from './components/MyFilesView';
import GroupsView from './components/GroupsView';
import ActivityView from './components/ActivityView';
import { checkHealth, getMe, logoutUser, revokeSession } from './services/api';
import { AlertCircle, CheckCircle, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('transfer'); // 'transfer' | 'inbox' | 'my-files' | 'groups' | 'activity'
  const [currentUser, setCurrentUser] = useState(null);
  const [tokenParam, setTokenParam] = useState(null);
  const [shareResult, setShareResult] = useState(() => {
    try {
      const saved = localStorage.getItem('quickshare_active_share');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isViewingShareResult, setIsViewingShareResult] = useState(() => {
    try {
      return Boolean(localStorage.getItem('quickshare_active_share'));
    } catch {
      return false;
    }
  });
  const [qrModalUrl, setQrModalUrl] = useState(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);

  // Feedback notifications
  const [errorMessage, setErrorMessage] = useState(null);
  const [successNotification, setSuccessNotification] = useState(null);
  const [serverHealthy, setServerHealthy] = useState(null);

  // Check URL query parameters and verify user auth session
  useEffect(() => {
    // 1. Check for ?token=xyz or /share/xyz in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setTokenParam(token);
    } else {
      const match = window.location.pathname.match(/\/share\/([a-zA-Z0-9_-]+)/);
      if (match) {
        setTokenParam(match[1]);
      }
    }

    // 2. Health check
    async function verifyBackend() {
      try {
        const res = await checkHealth();
        if (res.status === 'ok') {
          setServerHealthy(true);
        } else {
          setServerHealthy(false);
        }
      } catch (err) {
        setServerHealthy(false);
      }
    }
    verifyBackend();

    // 3. User session check if token exists in localStorage
    async function loadCurrentUser() {
      const savedToken = localStorage.getItem('quickshare_token');
      if (savedToken) {
        try {
          const res = await getMe();
          if (res.success && res.user) {
            setCurrentUser(res.user);
          }
        } catch (err) {
          if (err.response?.status === 401) {
            localStorage.removeItem('quickshare_token');
            setCurrentUser(null);
          }
        }
      }
    }
    loadCurrentUser();
  }, []);

  // Clear notifications after timeout
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (successNotification) {
      const timer = setTimeout(() => setSuccessNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successNotification]);

  const handleShareCompleted = (result) => {
    setShareResult(result);
    if (result) {
      try {
        localStorage.setItem('quickshare_active_share', JSON.stringify(result));
      } catch {}
      setIsViewingShareResult(true);
    } else {
      localStorage.removeItem('quickshare_active_share');
      setIsViewingShareResult(false);
    }
  };

  const handleRevoke = async (shareToken, revokeToken) => {
    try {
      const res = await revokeSession(shareToken, revokeToken);
      if (res.success) {
        setSuccessNotification('Sharing session revoked and files removed permanently from storage.');
        if (shareResult && shareResult.shareToken === shareToken) {
          setShareResult(null);
          localStorage.removeItem('quickshare_active_share');
          setIsViewingShareResult(false);
        }
        try {
          const raw = localStorage.getItem('quickshare_recent_transfers');
          if (raw) {
            const list = JSON.parse(raw);
            const updated = list.filter((t) => t.shareToken !== shareToken);
            localStorage.setItem('quickshare_recent_transfers', JSON.stringify(updated));
          }
        } catch {}
        return true;
      }
      return false;
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to revoke session.');
      return false;
    }
  };

  const handleResetToUpload = () => {
    // Clear URL query param if present
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.pushState({}, '', url.pathname);

    setTokenParam(null);
    setErrorMessage(null);
    setIsViewingShareResult(false);
    setCurrentView('transfer');
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setProfileModalOpen(false);
    setSuccessNotification('Logged out successfully.');
    if (currentView !== 'transfer') {
      setCurrentView('transfer');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 font-sans text-slate-800 antialiased selection:bg-rose-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        onChangeView={(view) => {
          setTokenParam(null);
          setCurrentView(view);
        }}
        activeShare={shareResult}
        isViewingShareResult={Boolean(shareResult && !tokenParam && currentView === 'transfer' && isViewingShareResult)}
        onSelectActiveShare={() => {
          setTokenParam(null);
          setCurrentView('transfer');
          setIsViewingShareResult(true);
        }}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenRevoke={() => setRevokeModalOpen(true)}
        onReset={handleResetToUpload}
        onSelectShare={(token) => {
          setTokenParam(token);
          setCurrentView('transfer');
        }}
        serverHealthy={serverHealthy}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-10 flex flex-col">
        {/* Alerts / Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-700 flex items-start gap-3 shadow-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="text-xs sm:text-sm font-medium flex-1">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-700 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success Notification */}
        {successNotification && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 shadow-sm animate-fade-in">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <div className="text-xs sm:text-sm font-medium flex-1">{successNotification}</div>
          </div>
        )}

        {/* Dynamic View Router */}
        {tokenParam ? (
          <DownloadView
            token={tokenParam}
            onBackToUpload={handleResetToUpload}
          />
        ) : (
          <>
            {currentView === 'transfer' && (
              isViewingShareResult && shareResult ? (
                <ShareResult
                  result={shareResult}
                  onReset={() => setIsViewingShareResult(false)}
                  onShowQR={(url) => setQrModalUrl(url)}
                  onRevoke={handleRevoke}
                />
              ) : (
                <TransferDashboard
                  currentUser={currentUser}
                  activeShare={shareResult}
                  onShareCompleted={handleShareCompleted}
                  onViewActiveShare={() => setIsViewingShareResult(true)}
                  onReceiveToken={(token) => setTokenParam(token)}
                  onRequestAuth={() => setAuthModalOpen(true)}
                  onOpenRevoke={() => setRevokeModalOpen(true)}
                  onError={(err) => setErrorMessage(err)}
                  onSuccess={(msg) => setSuccessNotification(msg)}
                />
              )
            )}

            {currentView === 'inbox' && (
              <InboxView
                user={currentUser}
                onRequireAuth={() => setAuthModalOpen(true)}
              />
            )}

            {currentView === 'my-files' && (
              <MyFilesView
                user={currentUser}
                activeShare={shareResult}
                onRequireAuth={() => setAuthModalOpen(true)}
                onSelectShare={(token) => setTokenParam(token)}
                onShowQR={(url) => setQrModalUrl(url)}
                onRevoke={handleRevoke}
                onOpenActiveShare={(share) => {
                  handleShareCompleted(share);
                  setCurrentView('transfer');
                  setIsViewingShareResult(true);
                }}
              />
            )}

            {currentView === 'groups' && (
              <GroupsView
                user={currentUser}
                onRequireAuth={() => setAuthModalOpen(true)}
                onSelectShare={(token) => setTokenParam(token)}
              />
            )}

            {currentView === 'activity' && (
              <ActivityView
                user={currentUser}
                onRequireAuth={() => setAuthModalOpen(true)}
                onSelectShare={(token) => setTokenParam(token)}
              />
            )}
          </>
        )}
      </main>

      {/* Auth Modal (Login & Register) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setSuccessNotification(`Welcome, ${user.displayName || user.username}!`);
        }}
      />

      {/* Profile & Storage Quota Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={currentUser}
        onUpdateUser={(updated) => setCurrentUser(updated)}
        onLogout={handleLogout}
      />

      {/* QR Code Modal */}
      {qrModalUrl && (
        <QRCodeModal
          url={qrModalUrl}
          onClose={() => setQrModalUrl(null)}
        />
      )}

      {/* Emergency Revoke with Key Modal */}
      <RevokeModal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        onSuccess={() => {
          setSuccessNotification('Files shredded and transfer permanently revoked.');
          setRevokeModalOpen(false);
          handleResetToUpload();
        }}
      />

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200/80 bg-white/70 backdrop-blur-xs text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">QuickShare</span>
            <span>•</span>
            <span>100% Free & Open-Source Ephemeral File Sharing</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero-Log Storage Purge</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>Self-Hosted & Cloud Ready</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
