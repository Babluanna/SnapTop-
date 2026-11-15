import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bookmark,
  Check,
  Edit3,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Language, PostItem } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Avatar, MediaWithFallback, ResolvedVideo, VerifiedBadge, formatCount, formatRelativeTime } from './BrandMark';

interface PostCardProps {
  post: PostItem;
  currentUid: string;
  language: Language;
  authorVerified?: boolean;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  onToggleLike: (post: PostItem) => Promise<void>;
  onToggleSave: (post: PostItem) => Promise<void>;
  onToggleFollow: (targetUid: string, targetUsername: string, targetAvatar: string) => Promise<void>;
  onOpenComments: (post: PostItem) => void;
  onOpenShare: (post: PostItem) => void;
  onOpenProfile: (uid: string) => void;
  onAddInlineComment: (post: PostItem, text: string) => Promise<void>;
  onEditCaption?: (postId: string, caption: string) => Promise<void>;
  onDeletePost?: (postId: string) => Promise<void>;
  onSelectHashtag?: (tagKey: string) => void;
}

export function PostCard({
  post,
  currentUid,
  language,
  authorVerified = false,
  isLiked,
  isSaved,
  isFollowing,
  onToggleLike,
  onToggleSave,
  onToggleFollow,
  onOpenComments,
  onOpenShare,
  onOpenProfile,
  onAddInlineComment,
  onEditCaption,
  onDeletePost,
  onSelectHashtag,
}: PostCardProps) {
  const t = TRANSLATIONS[language];
  const [burstHeart, setBurstHeart] = useState(false);
  const [muted, setMuted] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState(post.caption);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const tapTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraftCaption(post.caption);
    }
  }, [post.caption, editing]);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current !== null) {
        window.clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  const isOwn = post.authorId === currentUid;

  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 260) {
      if (tapTimerRef.current !== null) {
        window.clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      if (!isLiked) {
        void onToggleLike(post);
      }
      setBurstHeart(true);
      window.setTimeout(() => setBurstHeart(false), 750);
    } else if (post.mediaType === 'video') {
      tapTimerRef.current = window.setTimeout(() => {
        if (videoRef.current) {
          if (videoRef.current.paused) {
            void videoRef.current.play().catch(() => {});
          } else {
            videoRef.current.pause();
          }
        }
        tapTimerRef.current = null;
      }, 240);
    }
    lastTapRef.current = now;
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || submittingComment) return;
    setSubmittingComment(true);
    setActionError(null);
    try {
      await onAddInlineComment(post, commentInput.trim());
      setCommentInput('');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveCaption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onEditCaption) return;
    setActionError(null);
    try {
      await onEditCaption(post.id, draftCaption.trim());
      setEditing(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to update caption.');
    }
  };

  return (
    <article className="rounded-[24px] border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] dark:shadow-none overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onOpenProfile(post.authorId)}
            className="shrink-0 cursor-pointer"
          >
            <Avatar
              src={post.authorAvatar}
              alt={post.authorUsername}
              name={post.authorDisplayName}
              size="sm"
            />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm min-w-0">
              <button
                type="button"
                onClick={() => onOpenProfile(post.authorId)}
                className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline truncate cursor-pointer"
              >
                {post.authorUsername}
              </button>
              {authorVerified && <VerifiedBadge size="sm" label={t.profile.verified} />}
              <span className="text-zinc-400 shrink-0" aria-hidden="true">·</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 tabular-nums">
                {formatRelativeTime(post.createdAtMs)}
              </span>
            </div>
            {post.location && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {post.location}
              </p>
            )}
          </div>
        </div>

        <div ref={menuRef} className="flex items-center gap-2 shrink-0 relative">
          {!isOwn && (
            <button
              type="button"
              onClick={() => onToggleFollow(post.authorId, post.authorUsername, post.authorAvatar)}
              className={`min-h-[34px] px-3.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer ${
                isFollowing
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200'
                  : 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400'
              }`}
            >
              {isFollowing ? t.feed.following : t.feed.follow}
            </button>
          )}

          {isOwn && (
            <>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Post options"
                className="min-h-[38px] min-w-[38px] rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 z-20 w-44 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-xl py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftCaption(post.caption);
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 hover:bg-zinc-100/70 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{t.feed.editCaption}</span>
                  </button>
                  {onDeletePost && (
                    <button
                      type="button"
                      onClick={async () => {
                        setMenuOpen(false);
                        await onDeletePost(post.id);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t.feed.deletePost}</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Media Canvas */}
      <div
        onClick={handleMediaTap}
        className={`relative w-full ${
          post.mediaType === 'video' ? 'aspect-[4/5] max-h-[540px]' : 'aspect-square'
        } bg-zinc-100 dark:bg-zinc-950 select-none cursor-pointer`}
      >
        {post.mediaType === 'video' ? (
          <>
            <ResolvedVideo
              ref={videoRef}
              src={post.mediaUrl}
              loop
              playsInline
              muted={muted}
              autoPlay
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMuted((m) => !m);
              }}
              aria-label={muted ? t.reels.soundOn : t.reels.muted}
              className="absolute bottom-3 right-3 min-h-[36px] min-w-[36px] rounded-full bg-black/55 backdrop-blur-md text-white flex items-center justify-center cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </>
        ) : (
          <MediaWithFallback
            src={post.mediaUrl}
            alt={post.caption || `Post by ${post.authorUsername}`}
            className="w-full h-full object-cover"
          />
        )}

        <AnimatePresence>
          {burstHeart && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 fill-pink-500 text-pink-500 drop-shadow-xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Row */}
      <div className="px-3 pt-2 pb-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onToggleLike(post)}
              aria-label={t.feed.like}
              className="min-h-[42px] min-w-[42px] rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800/70 active:scale-90 transition-transform cursor-pointer"
            >
              <Heart
                className={`w-6 h-6 transition-colors ${
                  isLiked
                    ? 'fill-pink-500 text-pink-500'
                    : 'text-zinc-800 dark:text-zinc-200'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => onOpenComments(post)}
              aria-label={t.feed.viewComments}
              className="min-h-[42px] min-w-[42px] rounded-full flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() => onOpenShare(post)}
              aria-label={t.feed.shareToDm}
              className="min-h-[42px] min-w-[42px] rounded-full flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onToggleSave(post)}
            aria-label="Save post"
            className="min-h-[42px] min-w-[42px] rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
          >
            <Bookmark
              className={`w-6 h-6 transition-colors ${
                isSaved
                  ? 'fill-violet-600 text-violet-600 dark:fill-violet-400 dark:text-violet-400'
                  : 'text-zinc-800 dark:text-zinc-200'
              }`}
            />
          </button>
        </div>

        <div className="px-1.5 space-y-1.5">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatCount(post.likesCount)} {post.likesCount === 1 ? t.feed.like : t.feed.likes}
          </p>

          {editing ? (
            <form onSubmit={handleSaveCaption} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={draftCaption}
                onChange={(e) => setDraftCaption(e.target.value)}
                maxLength={2200}
                className="flex-1 min-h-[38px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="submit"
                className="min-h-[38px] px-3.5 rounded-xl bg-violet-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {t.feed.saveChanges}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="min-h-[38px] px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium cursor-pointer"
              >
                {t.feed.cancel}
              </button>
            </form>
          ) : (
            post.caption && (
              <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                <button
                  type="button"
                  onClick={() => onOpenProfile(post.authorId)}
                  className="font-semibold mr-1.5 hover:underline cursor-pointer"
                >
                  {post.authorUsername}
                </button>
                <span>
                  {post.caption.split(/(#[\p{L}\p{N}_]{1,40})/gu).map((part, idx) =>
                    part.startsWith('#') && part.length > 1 && onSelectHashtag ? (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onSelectHashtag(part.slice(1).toLowerCase())}
                        className="text-violet-600 dark:text-violet-400 font-medium hover:underline cursor-pointer"
                      >
                        {part}
                      </button>
                    ) : (
                      <React.Fragment key={idx}>{part}</React.Fragment>
                    )
                  )}
                </span>
              </p>
            )
          )}

          {post.commentsCount > 0 && (
            <button
              type="button"
              onClick={() => onOpenComments(post)}
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
            >
              {t.feed.viewComments} ({post.commentsCount})
            </button>
          )}

          {actionError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{actionError}</p>
          )}

          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              maxLength={500}
              placeholder={t.feed.addComment}
              className="flex-1 text-sm bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 py-2 focus:outline-none"
            />
            {commentInput.trim() && (
              <button
                type="submit"
                disabled={submittingComment}
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-pink-500 px-2 py-1 whitespace-nowrap cursor-pointer"
              >
                {t.feed.postComment}
              </button>
            )}
          </form>
        </div>
      </div>
    </article>
  );
}
