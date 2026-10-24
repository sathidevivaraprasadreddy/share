import React, { useState, useEffect, useRef } from 'react';
import {
  registerUser,
  loginUser,
  loginWithGoogle
} from '../services/api';
import {
  X,
  Lock,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Info,
  ExternalLink
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  // Password mode: false = Sign In, true = Register
  const [isRegister, setIsRegister] = useState(false);

  // Form fields
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Google Sign-In state
  const [customGoogleClientId, setCustomGoogleClientId] = useState('');
  const [showGoogleConfig, setShowGoogleConfig] = useState(false);
  const googleBtnContainerRef = useRef(null);

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Load Google Client ID from storage or env
  useEffect(() => {
    const saved = localStorage.getItem('quickshare_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    if (saved) {
      setCustomGoogleClientId(saved);
    }
  }, []);

  // Initialize official Google Identity Services (GIS)
  useEffect(() => {
    if (!isOpen) return;

    const activeClientId = customGoogleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!activeClientId) return;

    const checkGsi = setInterval(() => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        clearInterval(checkGsi);
        try {
          window.google.accounts.id.initialize({
            client_id: activeClientId,
            callback: async (response) => {
              if (response.credential) {
                setLoading(true);
                setError(null);
                try {
                  const res = await loginWithGoogle(response.credential);
                  if (res.success) {
                    onAuthSuccess(res.user);
                    onClose();
                  } else {
                    setError(res.error || 'Google authentication failed.');
                  }
                } catch (err) {
                  setError(err.response?.data?.error || 'Failed to authenticate with Google.');
                } finally {
                  setLoading(false);
                }
              }
            },
            auto_select: false
          });

          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'pill'
          });
        } catch (e) {
          console.error('Error initializing Google GIS:', e);
        }
      }
    }, 200);

    return () => clearInterval(checkGsi);
  }, [isOpen, customGoogleClientId]);

  if (!isOpen) return null;

  // Handle standard Email & Password submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await registerUser(username, email, password, displayName);
        if (res.success) {
          onAuthSuccess(res.user);
          onClose();
        } else {
          setError(res.error || 'Registration failed.');
        }
      } else {
        const res = await loginUser(identifier, password);
        if (res.success) {
          onAuthSuccess(res.user);
          onClose();
        } else {
          setError(res.error || 'Login failed.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isRegister ? 'Create Free Account' : 'Welcome to QuickShare'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access your saved files, recipient inboxes, and collaboration groups for ₹0.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Notice */}
        {successInfo && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* 1. OFFICIAL GOOGLE SIGN-IN */}
        {/* ======================================================== */}
        <div className="mb-5">
          <div className="flex flex-col items-center justify-center min-h-[46px]">
            <div ref={googleBtnContainerRef} id="googleSignInButton" className="w-full flex justify-center">
              {/* Fallback button if Google Client ID is not configured */}
              {(!customGoogleClientId && !import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
                <button
                  type="button"
                  onClick={() => setError('Google Sign-In requires VITE_GOOGLE_CLIENT_ID in frontend/.env. Please use the Email & Password form below for instant free access.')}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl shadow-sm text-xs font-semibold text-slate-700 flex items-center justify-center gap-2.5 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              )}
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                <span>Verifying with Google...</span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-slate-400 text-xs uppercase font-medium tracking-wider">
            or with email
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* ======================================================== */}
        {/* 2. EMAIL & PASSWORD REGISTRATION / SIGN IN */}
        {/* ======================================================== */}
        <div>
          {/* Sign In vs Register Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                !isRegister
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                isRegister
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. S D Vara Prasad Reddy"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      required={isRegister}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 absolute left-3.5 top-2.5 text-xs font-bold">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="varaprasad"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      required={isRegister}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      placeholder="varaprasad@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      required={isRegister}
                    />
                  </div>
                </div>
              </>
            )}

            {!isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. varaprasad or varaprasad@gmail.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    required={!isRegister}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Create Free Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
