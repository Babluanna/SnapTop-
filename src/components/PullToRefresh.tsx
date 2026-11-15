import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

export interface PullToRefreshLabels {
  pull: string;
  release: string;
  refreshing: string;
  updated: string;
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  labels: PullToRefreshLabels;
  externalRefreshSignal?: number;
  children: React.ReactNode;
}

type RefreshPhase = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'done';

const THRESHOLD = 68;
const HOLD_HEIGHT = 56;
const MAX_PULL = 112;
const MIN_REFRESH_MS = 450;
const DONE_HOLD_MS = 550;

export function PullToRefresh({
  onRefresh,
  labels,
  externalRefreshSignal = 0,
  children,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pullOffset, setPullOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<RefreshPhase>('idle');

  const phaseRef = useRef<RefreshPhase>('idle');
  const pullOffsetRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const updatePhase = useCallback((next: RefreshPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const updatePullOffset = useCallback((next: number) => {
    pullOffsetRef.current = next;
    setPullOffset(next);
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (phaseRef.current === 'refreshing') return;
    updatePhase('refreshing');
    setIsDragging(false);
    updatePullOffset(HOLD_HEIGHT);

    try {
      await Promise.all([
        onRefreshRef.current(),
        new Promise((resolve) => window.setTimeout(resolve, MIN_REFRESH_MS)),
      ]);
      updatePhase('done');
      window.setTimeout(() => {
        updatePullOffset(0);
        window.setTimeout(() => {
          updatePhase('idle');
        }, 260);
      }, DONE_HOLD_MS);
    } catch {
      updatePullOffset(0);
      updatePhase('idle');
    }
  }, [updatePhase, updatePullOffset]);

  // Allow programmatic refresh trigger (e.g., tapping Home while already on Home)
  const lastSignalRef = useRef(externalRefreshSignal);
  useEffect(() => {
    if (externalRefreshSignal > 0 && externalRefreshSignal !== lastSignalRef.current) {
      lastSignalRef.current = externalRefreshSignal;
      void triggerRefresh();
    }
  }, [externalRefreshSignal, triggerRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let touchActive = false;
    let aborted = false;
    let startX = 0;
    let startY = 0;

    let mouseActive = false;
    let mouseStartX = 0;
    let mouseStartY = 0;

    const isAtScrollTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 2;

    const applyDampedPull = (rawDy: number) => {
      const clamped = Math.max(0, rawDy);
      const damped = MAX_PULL * (1 - Math.exp(-clamped / 150));
      updatePullOffset(damped);
      updatePhase(damped >= THRESHOLD ? 'ready' : 'pulling');
    };

    const finishGesture = () => {
      setIsDragging(false);
      if (phaseRef.current === 'ready' || pullOffsetRef.current >= THRESHOLD) {
        void triggerRefresh();
      } else {
        updatePullOffset(0);
        updatePhase('idle');
      }
    };

    // Touch events (mobile / tablet)
    const handleTouchStart = (e: TouchEvent) => {
      if (phaseRef.current === 'refreshing' || phaseRef.current === 'done') return;
      if (e.touches.length !== 1) return;
      if (!isAtScrollTop()) return;
      touchActive = true;
      aborted = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchActive || aborted) return;
      if (e.touches.length !== 1) {
        touchActive = false;
        return;
      }
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (pullOffsetRef.current === 0) {
        // Ignore upward scrolls or horizontal swipes (e.g. StoryBar scrolling)
        if (dy < 0 || !isAtScrollTop()) {
          aborted = true;
          return;
        }
        if (Math.abs(dx) > 8 && Math.abs(dx) > dy) {
          aborted = true;
          return;
        }
        if (dy < 8) return;
      }

      if (e.cancelable) {
        e.preventDefault();
      }
      setIsDragging(true);
      applyDampedPull(dy - 8);
    };

    const handleTouchEnd = () => {
      if (!touchActive) return;
      touchActive = false;
      if (!aborted && pullOffsetRef.current > 0) {
        finishGesture();
      }
    };

    // Pointer/Mouse drag support for desktop
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (phaseRef.current === 'refreshing' || phaseRef.current === 'done') return;
      if (!isAtScrollTop()) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('button, a, input, textarea, select, video, [role="button"], [contenteditable="true"]')
      ) {
        return;
      }
      mouseActive = true;
      aborted = false;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!mouseActive || aborted) return;
      const dx = e.clientX - mouseStartX;
      const dy = e.clientY - mouseStartY;

      if (pullOffsetRef.current === 0) {
        if (dy < 0 || !isAtScrollTop()) {
          aborted = true;
          mouseActive = false;
          return;
        }
        if (Math.abs(dx) > 10 && Math.abs(dx) > dy) {
          aborted = true;
          mouseActive = false;
          return;
        }
        if (dy < 10) return;
      }

      setIsDragging(true);
      applyDampedPull(dy - 10);
    };

    const handleWindowMouseUp = () => {
      if (!mouseActive) return;
      mouseActive = false;
      if (!aborted && pullOffsetRef.current > 0) {
        finishGesture();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [triggerRefresh, updatePhase, updatePullOffset]);

  const progress = Math.min(1, pullOffset / THRESHOLD);
  const showIndicator = pullOffset > 2 || phase === 'refreshing' || phase === 'done';
  const radius = 8.5;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const statusText =
    phase === 'refreshing'
      ? labels.refreshing
      : phase === 'done'
        ? labels.updated
        : phase === 'ready'
          ? labels.release
          : labels.pull;

  return (
    <div ref={containerRef} className="relative">
      {/* iOS Pull-to-Refresh Indicator */}
      <div
        aria-live="polite"
        aria-hidden={!showIndicator}
        className="pointer-events-none absolute top-0 inset-x-0 z-10 flex items-center justify-center"
        style={{
          height: `${HOLD_HEIGHT}px`,
          opacity: showIndicator ? Math.min(1, pullOffset / 28) : 0,
          transform: `translate3d(0, ${Math.max(0, (pullOffset - HOLD_HEIGHT) / 2)}px, 0)`,
          transition: isDragging
            ? 'none'
            : 'opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border shadow-xs flex items-center justify-center transition-transform duration-150 ${
              phase === 'ready' || phase === 'refreshing'
                ? 'border-violet-300/80 dark:border-violet-700/70 scale-105'
                : phase === 'done'
                  ? 'border-emerald-300/80 dark:border-emerald-700/70'
                  : 'border-zinc-200/80 dark:border-zinc-800'
            }`}
          >
            {phase === 'refreshing' ? (
              <Loader2 className="w-4 h-4 text-violet-600 dark:text-violet-400 animate-spin" />
            ) : phase === 'done' ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 22 22"
                className={`transition-colors ${
                  phase === 'ready'
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
                style={{
                  transform: `rotate(${Math.round(progress * 270 - 90)}deg)`,
                }}
              >
                <circle
                  cx="11"
                  cy="11"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.2"
                  strokeWidth="2.2"
                />
                <circle
                  cx="11"
                  cy="11"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
            )}
          </div>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 tracking-tight whitespace-nowrap">
            {statusText}
          </span>
        </div>
      </div>

      {/* Feed Content Layer */}
      <div
        className="space-y-5"
        style={{
          transform: pullOffset > 0 ? `translate3d(0, ${pullOffset}px, 0)` : undefined,
          transition: isDragging
            ? 'none'
            : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
