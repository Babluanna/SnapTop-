import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  User,
} from 'firebase/auth';
import { Moon, Sun, Globe, MailCheck, RefreshCw, AlertCircle, ShieldCheck, MessageCircle, Clapperboard } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { LANGUAGE_LABELS, TRANSLATIONS } from '../i18n/translations';
import type { Language, ThemeMode } from '../types';
import { SnapTopLogo } from './BrandMark';

interface AuthScreenProps {
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  pendingUser: User | null;
  onProfileSeedHint?: (displayName: string, username: string) => void;
}

export function AuthScreen({
  language,
  onChangeLanguage,
  theme,
  onToggleTheme,
  pendingUser,
  onProfileSeedHint,
}: AuthScreenProps) {
  const t = TRANSLATIONS[language];
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
        if (cleanUser.length < 2) {
          setErrorMsg('Username must be at least 2 characters (letters, numbers, . or _).');
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        onProfileSeedHint?.(displayName.trim() || cleanUser, cleanUser);
        await sendEmailVerification(cred.user);
        setInfoMsg(t.auth.verifyNoticeBody);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setErrorMsg(t.auth.emailAuthDisabledHint);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingUser) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await sendEmailVerification(pendingUser);
      setInfoMsg('Verification email sent again.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!pendingUser) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await reload(pendingUser);
      if (auth.currentUser?.emailVerified) {
        window.location.reload();
      } else {
        setErrorMsg('Email is not verified yet. Please check your inbox.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification check failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* iOS-style translucent header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200/70 dark:border-zinc-800/80">
        <div className="w-full max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <SnapTopLogo size={32} />
            <span className="font-display text-xl font-bold tracking-[-0.02em] whitespace-nowrap">
              {t.appName}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 border border-zinc-200/70 dark:border-zinc-800">
              <Globe className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <select
                aria-label={t.nav.language}
                value={language}
                onChange={(e) => onChangeLanguage(e.target.value as Language)}
                className="bg-transparent text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
                  <option key={lang} value={lang} className="bg-white dark:bg-zinc-900">
                    {LANGUAGE_LABELS[lang]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? t.nav.lightMode : t.nav.darkMode}
              className="min-h-[38px] min-w-[38px] rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-5 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left: Clean Apple-inspired product overview (zero fake photos) */}
        <section className="hidden lg:block lg:col-span-6 space-y-6">
          <div className="w-14 h-14 rounded-2xl shadow-lg shadow-violet-500/20 flex items-center justify-center">
            <SnapTopLogo size={56} />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-[-0.03em] leading-[1.12] text-zinc-900 dark:text-white [text-wrap:balance]">
            {t.auth.welcomeTitle}
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
            {t.auth.welcomeSubtitle}
          </p>

          <div className="pt-2 space-y-3.5 max-w-md">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800/80">
              <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                <Clapperboard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Photos, Stories & Vertical Reels</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Upload your own moments directly to Firebase Storage and share instantly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800/80">
              <div className="w-9 h-9 rounded-xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Real-Time Direct Messaging</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Instant 1-on-1 conversations, story replies, and live notifications.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800/80">
              <div className="w-9 h-9 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Private & Trilingual</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Verified accounts with English, हिन्दी, and తెలుగు support.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right: iOS-polished Auth Card */}
        <section className="lg:col-span-6 w-full max-w-[420px] mx-auto">
          <div className="rounded-[28px] border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-6 sm:p-8 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-none">
            <div className="lg:hidden mb-6 text-center space-y-2">
              <div className="inline-flex">
                <SnapTopLogo size={44} />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-[-0.02em] [text-wrap:balance]">
                {t.auth.welcomeTitle}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.tagline}</p>
            </div>

            {pendingUser && !pendingUser.emailVerified ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800">
                  <MailCheck className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-display text-sm font-semibold">
                      {t.auth.verifyNoticeTitle}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {t.auth.verifyNoticeBody}
                    </p>
                    <p className="mt-1.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                      {pendingUser.email}
                    </p>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </p>
                )}

                {infoMsg && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">{infoMsg}</p>
                )}

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleCheckVerified}
                    disabled={loading}
                    className="w-full min-h-[46px] rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t.auth.checkVerified}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="w-full min-h-[44px] rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm font-medium hover:bg-zinc-200/70 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    {t.auth.resendVerification}
                  </button>
                  <button
                    type="button"
                    onClick={() => auth.signOut()}
                    className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-2 cursor-pointer"
                  >
                    {t.nav.signOut}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full min-h-[48px] px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white text-sm font-semibold flex items-center justify-center gap-2.5 shadow-sm shadow-violet-500/20 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                    />
                  </svg>
                  <span className="whitespace-nowrap">{t.auth.continueGoogle}</span>
                </button>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-800" />
                  <span className="text-xs font-medium text-zinc-400">{t.auth.orDivider}</span>
                  <div className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-800" />
                </div>

                {/* iOS Segmented Control */}
                <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg(null);
                    }}
                    className={`min-h-[38px] rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      mode === 'login'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {t.auth.loginTab}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMsg(null);
                    }}
                    className={`min-h-[38px] rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      mode === 'register'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {t.auth.registerTab}
                  </button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {mode === 'register' && (
                    <>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={t.auth.displayNameLabel}
                        aria-label={t.auth.displayNameLabel}
                        className="w-full min-h-[44px] px-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                      />
                      <input
                        type="text"
                        required
                        maxLength={30}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t.auth.usernameLabel}
                        aria-label={t.auth.usernameLabel}
                        className="w-full min-h-[44px] px-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                      />
                    </>
                  )}

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailLabel}
                    aria-label={t.auth.emailLabel}
                    className="w-full min-h-[44px] px-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                  />

                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.auth.passwordLabel}
                    aria-label={t.auth.passwordLabel}
                    className="w-full min-h-[44px] px-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                  />

                  {errorMsg && (
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {infoMsg && (
                    <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800 text-xs text-violet-700 dark:text-violet-300">
                      {infoMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[46px] mt-1 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {mode === 'login' ? t.auth.signInBtn : t.auth.createAccountBtn}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
