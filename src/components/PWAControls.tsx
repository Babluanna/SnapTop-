import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="Install SnapTop App"
        className={
          compact
            ? 'min-h-[34px] px-3 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs active:scale-95 transition-transform cursor-pointer whitespace-nowrap'
            : 'w-full min-h-[40px] px-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap'
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install SnapTop on iOS"
          className={
            compact
              ? 'min-h-[34px] px-3 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap'
              : 'w-full min-h-[40px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900 text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap'
          }
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold">Install SnapTop on iPhone</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install guide"
                  className="min-h-[32px] min-w-[32px] rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 leading-relaxed">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Tap the <Share className="w-3.5 h-3.5 inline mx-0.5" /> <strong>Share</strong> button in Safari.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[40px] rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>Offline Mode — Cached view</span>
    </div>
  );
};
