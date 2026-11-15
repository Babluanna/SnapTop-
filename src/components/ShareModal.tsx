import React, { useState } from 'react';
import { Check, Copy, Send, X } from 'lucide-react';
import type { Language, PostItem, PublicProfile } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Avatar } from './BrandMark';

interface ShareModalProps {
  post: PostItem;
  creators: PublicProfile[];
  currentUid: string;
  language: Language;
  onClose: () => void;
  onSendPostToUser: (recipient: PublicProfile, post: PostItem) => Promise<void>;
}

export function ShareModal({
  post,
  creators,
  currentUid,
  language,
  onClose,
  onSendPostToUser,
}: ShareModalProps) {
  const t = TRANSLATIONS[language];
  const [copied, setCopied] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendingUid, setSendingUid] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const shareUrl = `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(post.id)}`;
  const candidates = creators.filter((c) => c.uid !== currentUid);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
    }
  };

  const handleSend = async (creator: PublicProfile) => {
    if (sendingUid) return;
    setSendingUid(creator.uid);
    setErrorMsg(null);
    try {
      await onSendPostToUser(creator, post);
      setSentIds((prev) => new Set(prev).add(creator.uid));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send post.');
    } finally {
      setSendingUid(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden"
      >
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200/70 dark:border-zinc-800">
          <h3 className="font-display text-base font-semibold">{t.feed.shareToDm}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="min-h-[36px] min-w-[36px] rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full min-h-[46px] px-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-700 bg-zinc-100/70 dark:bg-zinc-800/60 flex items-center justify-between text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <span className="truncate mr-3">{copied ? t.feed.copiedLink : shareUrl}</span>
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-zinc-500 shrink-0" />
            )}
          </button>

          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{errorMsg}</p>
          )}

          {candidates.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                {t.feed.sendViaDm}
              </p>
              <div className="space-y-2">
                {candidates.map((creator) => {
                  const isSent = sentIds.has(creator.uid);
                  const isSending = sendingUid === creator.uid;
                  return (
                    <div
                      key={creator.uid}
                      className="flex items-center justify-between gap-3 py-1.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={creator.avatarUrl}
                          alt={creator.username}
                          name={creator.displayName}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{creator.displayName}</p>
                          <p className="text-xs text-zinc-500 truncate">@{creator.username}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isSent || isSending}
                        onClick={() => handleSend(creator)}
                        className={`min-h-[36px] px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-70 ${
                          isSent
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                            : 'bg-gradient-to-r from-violet-600 to-pink-500 text-white hover:opacity-95'
                        }`}
                      >
                        {isSent ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{isSent ? 'Sent' : t.messages.send}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
