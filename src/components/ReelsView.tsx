import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bookmark,
  Clapperboard,
  Heart,
  MessageCircle,
  Music2,
  Play,
  Plus,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Language, PostItem } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Avatar, MediaWithFallback, ResolvedVideo, VerifiedBadge, formatCount } from './BrandMark';

interface ReelsViewProps {
  reels: PostItem[];
  currentUid: string;
  language: Language;
  verifiedUserIds?: Set<string>;
  likedPostIds: Set<string>;
  savedPostIds: Set<string>;
  followingIds: Set<string>;
  onToggleLike: (post: PostItem) => Promise<void>;
  onToggleSave: (post: PostItem) => Promise<void>;
  onToggleFollow: (targetUid: string, targetUsername: string, targetAvatar: string) => Promise<void>;
  onOpenComments: (post: PostItem) => void;
  onOpenShare: (post: PostItem) => void;
  onOpenProfile: (uid: string) => void;
  onUploadReel: () => void;
  onSelectHashtag?: (tagKey: string) => void;
}

function ReelCard({
  reel,
  currentUid,
  language,
  isAuthorVerified = false,
  isLiked,
  isSaved,
  isFollowing,
  muted,
  onToggleMute,
  onToggleLike,
  onToggleSave,
  onToggleFollow,
  onOpenComments,
  onOpenShare,
  onOpenProfile,
  onUploadReel,
  onSelectHashtag,
}: {
  reel: PostItem;
  currentUid: string;
  language: Language;
  isAuthorVerified?: boolean;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (post: PostItem) => Promise<void>;
  onToggleSave: (post: PostItem) => Promise<void>;
  onToggleFollow: (targetUid: string, targetUsername: string, targetAvatar: string) => Promise<void>;
  onOpenComments: (post: PostItem) => void;
  onOpenShare: (post: PostItem) => void;
  onOpenProfile: (uid: string) => void;
  onUploadReel: () => void;
  onSelectHashtag?: (tagKey: string) => void;
}) {
  const t = TRANSLATIONS[language];
  const [paused, setPaused] = useState(false);
  const [burstHeart, setBurstHeart] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tapTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);

  // Only play the currently visible reel in the vertical snap viewport
  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const vid = videoRef.current;
        if (!vid) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          if (!paused) {
            vid.play().catch(() => {});
          }
        } else {
          vid.pause();
        }
      },
      { threshold: [0.25, 0.65] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [paused]);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current !== null) {
        window.clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  const togglePlayback = () => {
    if (reel.mediaType === 'video' && videoRef.current) {
      if (videoRef.current.paused) {
        void videoRef.current.play().catch(() => {});
        setPaused(false);
      } else {
        videoRef.current.pause();
        setPaused(true);
      }
    } else {
      setPaused((p) => !p);
    }
  };

  const handleSurfaceTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 260) {
      if (tapTimerRef.current !== null) {
        window.clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      if (!isLiked) {
        void onToggleLike(reel);
      }
      setBurstHeart(true);
      window.setTimeout(() => setBurstHeart(false), 750);
    } else {
      tapTimerRef.current = window.setTimeout(() => {
        togglePlayback();
        tapTimerRef.current = null;
      }, 240);
    }
    lastTapRef.current = now;
  };

  const captionNeedsExpand = reel.caption.length > 72;

  return (
    <div
      ref={cardRef}
      className="snap-start snap-always h-[calc(100dvh-58px)] md:h-[calc(100dvh-32px)] w-full flex items-center justify-center md:py-2 bg-black md:bg-transparent"
    >
      <div className="relative h-full w-full md:max-w-[420px] md:rounded-[28px] overflow-hidden bg-black md:shadow-2xl md:border md:border-zinc-800/80">
        {/* Video / Media Canvas */}
        <div onClick={handleSurfaceTap} className="absolute inset-0 cursor-pointer select-none">
          {reel.mediaType === 'video' ? (
            <ResolvedVideo
              ref={videoRef}
              src={reel.mediaUrl}
              autoPlay
              loop
              playsInline
              muted={muted}
              onTimeUpdate={(e) => {
                const dur = e.currentTarget.duration;
                if (Number.isFinite(dur) && dur > 0) {
                  setVideoProgress((e.currentTarget.currentTime / dur) * 100);
                }
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full ${paused ? '' : 'animate-reel-motion'}`}>
              <MediaWithFallback
                src={reel.mediaUrl}
                alt={reel.caption || reel.authorUsername}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Center Pause Badge */}
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center">
              <Play className="w-7 h-7 fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Double-Tap Like Heart Burst */}
        <AnimatePresence>
          {burstHeart && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1.25, opacity: 1 }}
              exit={{ scale: 1.45, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <Heart className="w-24 h-24 fill-pink-500 text-pink-500 drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top iOS Reels Overlay Header */}
        <div className="absolute top-0 inset-x-0 z-20 px-4 pt-3.5 pb-8 bg-gradient-to-b from-black/60 via-black/20 to-transparent flex items-center justify-between pointer-events-none">
          <h2 className="font-display text-lg font-bold text-white tracking-tight drop-shadow-sm">
            {t.reels.title}
          </h2>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={onUploadReel}
              aria-label={t.reels.uploadReel}
              className="min-h-[38px] min-w-[38px] rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/55 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? t.reels.soundOn : t.reels.muted}
              className="min-h-[38px] min-w-[38px] rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/55 active:scale-95 transition-all cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom-Left Creator, Follow & Caption Overlay */}
        <div className="absolute bottom-2 inset-x-0 z-10 p-4 pr-[72px] bg-gradient-to-t from-black/85 via-black/45 to-transparent text-white space-y-2.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenProfile(reel.authorId)}
              className="flex items-center gap-2 min-w-0 cursor-pointer"
            >
              <Avatar
                src={reel.authorAvatar}
                alt={reel.authorUsername}
                name={reel.authorDisplayName}
                size="sm"
              />
              <span className="font-semibold text-sm truncate drop-shadow-xs">
                {reel.authorUsername}
              </span>
              {isAuthorVerified && <VerifiedBadge size="sm" label={t.profile.verified} />}
            </button>
            {reel.authorId !== currentUid && (
              <button
                type="button"
                onClick={() =>
                  void onToggleFollow(reel.authorId, reel.authorUsername, reel.authorAvatar)
                }
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isFollowing
                    ? 'border-white/40 bg-white/15 text-white'
                    : 'border-white/85 text-white hover:bg-white hover:text-zinc-900'
                }`}
              >
                {isFollowing ? t.feed.following : t.feed.follow}
              </button>
            )}
          </div>

          {reel.caption && (
            <div className="text-sm text-white/95 leading-snug">
              <p className={captionExpanded ? '' : 'line-clamp-2'}>
                {reel.caption.split(/(#[\p{L}\p{N}_]{1,40})/gu).map((part, idx) =>
                  part.startsWith('#') && part.length > 1 && onSelectHashtag ? (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectHashtag(part.slice(1).toLowerCase());
                      }}
                      className="text-violet-300 font-medium hover:underline cursor-pointer"
                    >
                      {part}
                    </button>
                  ) : (
                    <React.Fragment key={idx}>{part}</React.Fragment>
                  )
                )}
              </p>
              {captionNeedsExpand && (
                <button
                  type="button"
                  onClick={() => setCaptionExpanded((ex) => !ex)}
                  className="text-xs font-semibold text-white/75 hover:text-white mt-0.5 cursor-pointer"
                >
                  {captionExpanded ? t.feed.less : `... ${t.feed.more}`}
                </button>
              )}
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] text-white/90 max-w-full">
            <Music2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{reel.audioTitle || t.reels.originalAudio}</span>
          </div>
        </div>

        {/* Right-Side Vertical Action Rail (Screenshot 1 Style) */}
        <div className="absolute bottom-5 right-2.5 z-20 flex flex-col items-center gap-4 text-white">
          <button
            type="button"
            onClick={() => void onToggleLike(reel)}
            aria-label={t.feed.like}
            className="flex flex-col items-center gap-0.5 min-w-[44px] cursor-pointer active:scale-90 transition-transform"
          >
            <Heart
              className={`w-7 h-7 drop-shadow-md ${
                isLiked ? 'fill-pink-500 text-pink-500' : 'text-white'
              }`}
            />
            <span className="text-[11px] font-semibold tabular-nums drop-shadow-sm">
              {reel.likesCount > 0 ? formatCount(reel.likesCount) : t.feed.likes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenComments(reel)}
            aria-label={t.feed.viewComments}
            className="flex flex-col items-center gap-0.5 min-w-[44px] cursor-pointer active:scale-90 transition-transform"
          >
            <MessageCircle className="w-7 h-7 drop-shadow-md" />
            <span className="text-[11px] font-semibold tabular-nums drop-shadow-sm">
              {formatCount(reel.commentsCount)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenShare(reel)}
            aria-label={t.feed.shareToDm}
            className="flex flex-col items-center gap-0.5 min-w-[44px] cursor-pointer active:scale-90 transition-transform"
          >
            <Send className="w-6 h-6 drop-shadow-md" />
            <span className="text-[11px] font-semibold tabular-nums drop-shadow-sm">
              {formatCount(reel.sharesCount)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void onToggleSave(reel)}
            aria-label={isSaved ? t.reels.saved : t.reels.save}
            className="flex flex-col items-center gap-0.5 min-w-[44px] cursor-pointer active:scale-90 transition-transform"
          >
            <Bookmark
              className={`w-6 h-6 drop-shadow-md ${
                isSaved ? 'fill-violet-400 text-violet-400' : 'text-white'
              }`}
            />
            <span className="text-[11px] font-semibold drop-shadow-sm">
              {isSaved ? t.reels.saved : t.reels.save}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenProfile(reel.authorId)}
            aria-label={reel.authorUsername}
            className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white/80 shadow-md mt-1 cursor-pointer"
          >
            <Avatar
              src={reel.authorAvatar}
              alt={reel.authorUsername}
              name={reel.authorDisplayName}
              size="xs"
              className="!w-full !h-full !rounded-none"
            />
          </button>
        </div>

        {/* Live Video Playback Progress Scrubber */}
        {reel.mediaType === 'video' && (
          <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-white/20 z-20 pointer-events-none">
            <div
              className="h-full bg-white transition-[width] duration-100"
              style={{ width: `${Math.min(100, Math.max(0, videoProgress))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function ReelsView(props: ReelsViewProps) {
  const t = TRANSLATIONS[props.language];
  const [muted, setMuted] = useState(true);

  if (props.reels.length === 0) {
    return (
      <div className="min-h-[68vh] flex flex-col items-center justify-center px-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600/15 to-pink-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center">
          <Clapperboard className="w-7 h-7" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
          {t.reels.noReels}
        </p>
        <button
          type="button"
          onClick={props.onUploadReel}
          className="min-h-[44px] px-5 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm active:scale-[0.97] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.reels.uploadReel}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-58px)] md:h-[calc(100dvh-20px)] overflow-y-scroll snap-y snap-mandatory no-scrollbar">
      {props.reels.map((reel) => (
        <ReelCard
          key={reel.id}
          reel={reel}
          currentUid={props.currentUid}
          language={props.language}
          isAuthorVerified={props.verifiedUserIds?.has(reel.authorId) ?? false}
          isLiked={props.likedPostIds.has(reel.id)}
          isSaved={props.savedPostIds.has(reel.id)}
          isFollowing={props.followingIds.has(reel.authorId)}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onToggleLike={props.onToggleLike}
          onToggleSave={props.onToggleSave}
          onToggleFollow={props.onToggleFollow}
          onOpenComments={props.onOpenComments}
          onOpenShare={props.onOpenShare}
          onOpenProfile={props.onOpenProfile}
          onUploadReel={props.onUploadReel}
          onSelectHashtag={props.onSelectHashtag}
        />
      ))}
    </div>
  );
}
