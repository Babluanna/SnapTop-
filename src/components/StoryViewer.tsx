import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Send, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import type { Language, StoryItem } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Avatar, MediaWithFallback, ResolvedVideo, formatRelativeTime } from './BrandMark';

interface StoryViewerProps {
  stories: StoryItem[];
  initialAuthorId: string;
  currentUid: string;
  language: Language;
  onClose: () => void;
  onMarkViewed: (storyId: string) => void;
  onReplyStory: (authorId: string, authorUsername: string, authorAvatar: string, text: string) => Promise<void>;
  onDeleteStory?: (storyId: string) => Promise<void>;
  onOpenProfile: (uid: string) => void;
}

export function StoryViewer({
  stories,
  initialAuthorId,
  currentUid,
  language,
  onClose,
  onMarkViewed,
  onReplyStory,
  onDeleteStory,
  onOpenProfile,
}: StoryViewerProps) {
  const t = TRANSLATIONS[language];

  const authorIds = Array.from(new Set(stories.map((s) => s.authorId)));
  const startAuthorIdx = Math.max(0, authorIds.indexOf(initialAuthorId));
  const [authorIdx, setAuthorIdx] = useState(startAuthorIdx);
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoDurationMs, setVideoDurationMs] = useState<number>(12000);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [sentConfirm, setSentConfirm] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentAuthorId = authorIds[authorIdx];
  const authorStories = stories.filter((s) => s.authorId === currentAuthorId);
  const activeStory = authorStories[slideIdx] || authorStories[0];

  useEffect(() => {
    if (activeStory) {
      onMarkViewed(activeStory.id);
      setVideoDurationMs(activeStory.mediaType === 'video' ? 12000 : 5500);
    }
  }, [activeStory?.id]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || activeStory?.mediaType !== 'video') return;
    if (paused) {
      vid.pause();
    } else {
      vid.play().catch(() => {
        // Browser blocked unmuted autoplay: fall back to muted playback cleanly
        setMuted(true);
        vid.muted = true;
        void vid.play().catch(() => {});
      });
    }
  }, [paused, activeStory?.id, activeStory?.mediaType]);

  useEffect(() => {
    if (!activeStory || paused) return;
    setProgress(0);
    const start = Date.now();
    const duration = activeStory.mediaType === 'video' ? videoDurationMs : 5500;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        goNext();
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, [authorIdx, slideIdx, paused, activeStory?.id, videoDurationMs]);

  if (!activeStory) return null;

  const goNext = () => {
    if (slideIdx + 1 < authorStories.length) {
      setSlideIdx(slideIdx + 1);
    } else if (authorIdx + 1 < authorIds.length) {
      setAuthorIdx(authorIdx + 1);
      setSlideIdx(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (slideIdx > 0) {
      setSlideIdx(slideIdx - 1);
    } else if (authorIdx > 0) {
      const prevAuthorId = authorIds[authorIdx - 1];
      const prevGroup = stories.filter((s) => s.authorId === prevAuthorId);
      setAuthorIdx(authorIdx - 1);
      setSlideIdx(Math.max(0, prevGroup.length - 1));
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendingReply) return;
    setSendingReply(true);
    setReplyError(null);
    try {
      await onReplyStory(
        activeStory.authorId,
        activeStory.authorUsername,
        activeStory.authorAvatar,
        `Replied to story: "${replyText.trim()}"`
      );
      setReplyText('');
      setSentConfirm(true);
      setTimeout(() => setSentConfirm(false), 2000);
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Could not send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close stories"
        className="absolute top-4 right-4 z-50 min-h-[40px] min-w-[40px] rounded-full bg-white/15 backdrop-blur-md text-white hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={goPrev}
        aria-label="Previous story"
        className="hidden sm:flex min-h-[44px] min-w-[44px] rounded-full bg-white/15 backdrop-blur-md text-white hover:bg-white/25 items-center justify-center mr-4 transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="relative w-full h-full sm:h-[88vh] sm:max-w-[420px] sm:rounded-[28px] overflow-hidden bg-black shadow-2xl flex flex-col">
        <div className="absolute top-0 inset-x-0 z-20 p-3.5 pt-4 bg-gradient-to-b from-black/75 via-black/30 to-transparent">
          <div className="flex gap-1.5 mb-3">
            {authorStories.map((st, idx) => (
              <div key={st.id} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width:
                      idx < slideIdx ? '100%' : idx === slideIdx ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProfile(activeStory.authorId);
              }}
              className="flex items-center gap-2.5 text-left cursor-pointer"
            >
              <Avatar
                src={activeStory.authorAvatar}
                alt={activeStory.authorUsername}
                name={activeStory.authorUsername}
                size="sm"
              />
              <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                <span>{activeStory.authorUsername}</span>
                <span className="text-white/70 font-normal text-xs">
                  · {formatRelativeTime(activeStory.createdAtMs)}
                </span>
              </div>
            </button>

            <div className="flex items-center gap-1">
              {activeStory.mediaType === 'video' && (
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? t.reels.soundOn : t.reels.muted}
                  className="min-h-[38px] min-w-[38px] rounded-full text-white hover:bg-white/15 flex items-center justify-center cursor-pointer"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? 'Play story' : 'Pause story'}
                className="min-h-[38px] min-w-[38px] rounded-full text-white hover:bg-white/15 flex items-center justify-center cursor-pointer"
              >
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              {activeStory.authorId === currentUid && onDeleteStory && (
                <button
                  type="button"
                  onClick={async () => {
                    await onDeleteStory(activeStory.id);
                    onClose();
                  }}
                  aria-label="Delete story"
                  className="min-h-[38px] min-w-[38px] rounded-full text-white hover:bg-rose-500/40 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="absolute inset-0 z-10 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={goPrev} />
          <div className="w-2/3 h-full cursor-pointer" onClick={goNext} />
        </div>

        <div className="flex-1 relative bg-zinc-900">
          {activeStory.mediaType === 'video' ? (
            <ResolvedVideo
              ref={videoRef}
              src={activeStory.mediaUrl}
              autoPlay
              loop
              playsInline
              muted={muted}
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (Number.isFinite(dur) && dur > 0) {
                  setVideoDurationMs(Math.min(30000, Math.max(4000, Math.round(dur * 1000))));
                }
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <MediaWithFallback
              src={activeStory.mediaUrl}
              alt={activeStory.caption || activeStory.authorUsername}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="absolute bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-black/85 via-black/45 to-transparent space-y-3">
          {activeStory.caption && (
            <p className="text-sm text-white leading-snug">{activeStory.caption}</p>
          )}
          {replyError && (
            <p className="text-xs text-rose-300">{replyError}</p>
          )}

          {activeStory.authorId !== currentUid && (
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                placeholder={sentConfirm ? 'Sent!' : t.messages.typeMessage}
                className="flex-1 min-h-[42px] px-4 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white placeholder-white/70 text-sm focus:outline-none focus:border-white"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sendingReply}
                aria-label={t.messages.send}
                className="min-h-[42px] min-w-[42px] rounded-full bg-gradient-to-tr from-violet-600 to-pink-500 text-white flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={goNext}
        aria-label="Next story"
        className="hidden sm:flex min-h-[44px] min-w-[44px] rounded-full bg-white/15 backdrop-blur-md text-white hover:bg-white/25 items-center justify-center ml-4 transition-colors cursor-pointer"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
