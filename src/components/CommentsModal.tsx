import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { Bookmark, Heart, Send, Trash2, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { CommentItem, Language, PostItem } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Avatar, MediaWithFallback, ResolvedVideo, VerifiedBadge, formatCount, formatRelativeTime } from './BrandMark';

interface CommentsModalProps {
  post: PostItem;
  currentUid: string;
  language: Language;
  authorVerified?: boolean;
  isLiked?: boolean;
  isSaved?: boolean;
  onToggleLike?: (post: PostItem) => Promise<void>;
  onToggleSave?: (post: PostItem) => Promise<void>;
  onOpenShare?: (post: PostItem) => void;
  onClose: () => void;
  onAddComment: (post: PostItem, text: string) => Promise<void>;
  onOpenProfile: (uid: string) => void;
}

export function CommentsModal({
  post,
  currentUid,
  language,
  authorVerified = false,
  isLiked = false,
  isSaved = false,
  onToggleLike,
  onToggleSave,
  onOpenShare,
  onClose,
  onAddComment,
  onOpenProfile,
}: CommentsModalProps) {
  const t = TRANSLATIONS[language];
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const path = `posts/${post.id}/comments`;
    const q = query(collection(db, path), where('visibility', '==', 'public'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(
          snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                postId: data.postId,
                authorId: data.authorId,
                authorUsername: data.authorUsername,
                authorAvatar: data.authorAvatar,
                text: data.text,
                createdAtMs: data.createdAt?.toMillis?.() || Date.now(),
              } as CommentItem;
            })
            .sort((a, b) => a.createdAtMs - b.createdAtMs)
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
    return unsub;
  }, [post.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onAddComment(post, text.trim());
      setText('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const path = `posts/${post.id}/comments/${commentId}`;
    setErrorMsg(null);
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not delete comment.');
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-3xl h-[88vh] sm:h-[600px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-t-[28px] sm:rounded-[28px] overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-2xl flex flex-col md:grid md:grid-cols-12"
      >
        {/* Media Preview (visible on mobile top + desktop left split) */}
        <div className="h-56 sm:h-64 md:h-full md:col-span-6 bg-black relative shrink-0">
          {post.mediaType === 'video' ? (
            <ResolvedVideo src={post.mediaUrl} controls playsInline className="w-full h-full object-contain md:object-cover" />
          ) : (
            <MediaWithFallback
              src={post.mediaUrl}
              alt={post.caption || post.authorUsername}
              className="w-full h-full object-cover"
            />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close post view"
            className="md:hidden absolute top-3 right-3 min-h-[36px] min-w-[36px] rounded-full bg-black/55 backdrop-blur-md text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comments & Actions Panel */}
        <div className="md:col-span-6 flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProfile(post.authorId);
              }}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
            >
              <Avatar
                src={post.authorAvatar}
                alt={post.authorUsername}
                name={post.authorDisplayName}
                size="sm"
              />
              <span className="font-semibold text-sm truncate">{post.authorUsername}</span>
              {authorVerified && <VerifiedBadge size="sm" label={t.profile.verified} />}
            </button>

            <div className="flex items-center gap-1">
              {onToggleLike && (
                <button
                  type="button"
                  onClick={() => void onToggleLike(post)}
                  aria-label={t.feed.like}
                  className="min-h-[36px] px-2.5 rounded-full flex items-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold tabular-nums cursor-pointer"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
                  <span>{formatCount(post.likesCount)}</span>
                </button>
              )}
              {onOpenShare && (
                <button
                  type="button"
                  onClick={() => onOpenShare(post)}
                  aria-label={t.feed.shareToDm}
                  className="min-h-[36px] min-w-[36px] rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
              {onToggleSave && (
                <button
                  type="button"
                  onClick={() => void onToggleSave(post)}
                  aria-label="Save post"
                  className="min-h-[36px] min-w-[36px] rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Bookmark
                    className={`w-4 h-4 ${
                      isSaved ? 'fill-violet-600 text-violet-600 dark:fill-violet-400 dark:text-violet-400' : ''
                    }`}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close comments"
                className="hidden md:flex min-h-[36px] min-w-[36px] rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {post.caption && (
              <div className="flex items-start gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/70">
                <Avatar
                  src={post.authorAvatar}
                  alt={post.authorUsername}
                  name={post.authorDisplayName}
                  size="sm"
                />
                <div className="text-sm">
                  <span className="font-semibold mr-1.5">{post.authorUsername}</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{post.caption}</span>
                </div>
              </div>
            )}

            {comments.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2.5 group">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenProfile(c.authorId);
                      }}
                      className="shrink-0 cursor-pointer"
                    >
                      <Avatar
                        src={c.authorAvatar}
                        alt={c.authorUsername}
                        name={c.authorUsername}
                        size="sm"
                      />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm leading-snug break-words">
                        <span className="font-semibold mr-1.5">{c.authorUsername}</span>
                        <span className="text-zinc-800 dark:text-zinc-200">{c.text}</span>
                      </p>
                      <span className="text-[11px] text-zinc-400">
                        {formatRelativeTime(c.createdAtMs)}
                      </span>
                    </div>
                  </div>
                  {c.authorId === currentUid && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteComment(c.id)}
                      aria-label="Delete comment"
                      className="min-h-[32px] min-w-[32px] rounded-full text-zinc-400 hover:text-rose-500 flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {errorMsg && (
            <p className="px-4 py-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 border-t border-rose-200/70 dark:border-rose-800/60">
              {errorMsg}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-zinc-200/70 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50/70 dark:bg-zinc-950/60"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder={t.feed.addComment}
              className="flex-1 min-h-[42px] px-4 rounded-full border border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70"
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              aria-label={t.feed.postComment}
              className="min-h-[42px] px-4 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t.feed.postComment}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
