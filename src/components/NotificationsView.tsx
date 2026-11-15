import React from 'react';
import { Bell, CheckCheck, Heart, MessageCircle, Send, UserPlus } from 'lucide-react';
import type { Language, NotificationItem } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Avatar, MediaWithFallback, formatRelativeTime } from './BrandMark';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  language: Language;
  onMarkRead: (notifId: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onOpenProfile: (uid: string) => void;
}

export function NotificationsView({
  notifications,
  language,
  onMarkRead,
  onMarkAllRead,
  onOpenProfile,
}: NotificationsViewProps) {
  const t = TRANSLATIONS[language];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getLabel = (n: NotificationItem) => {
    switch (n.type) {
      case 'like':
        return t.notifications.likedYourPost;
      case 'comment':
        return `${t.notifications.commentedOnPost} "${n.text}"`;
      case 'follow':
        return t.notifications.startedFollowing;
      case 'message':
        return `${t.notifications.sentYouMessage} "${n.text}"`;
      case 'share':
        return t.notifications.sharedYourPost;
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />;
      case 'comment':
        return <MessageCircle className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />;
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />;
      case 'message':
      case 'share':
        return <Send className="w-3.5 h-3.5 text-pink-500" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold tracking-tight">{t.notifications.title}</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="min-h-[38px] px-3.5 rounded-full text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-950/60 active:scale-[0.97] transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <CheckCheck className="w-4 h-4" />
            {t.notifications.markAllRead}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-16 px-6 rounded-[24px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 text-center space-y-2.5 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-[20px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="font-display text-base font-semibold tracking-tight">{t.notifications.emptyTitle}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
            {t.notifications.emptyHint}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 rounded-[24px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={async () => {
                if (!n.isRead) await onMarkRead(n.id);
                onOpenProfile(n.actorId);
              }}
              className={`w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                n.isRead
                  ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  : 'bg-violet-50/60 dark:bg-violet-950/25 hover:bg-violet-50 dark:hover:bg-violet-950/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Avatar
                    src={n.actorAvatar}
                    alt={n.actorUsername}
                    name={n.actorUsername}
                    size="md"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                    {getIcon(n.type)}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold mr-1.5">{n.actorUsername}</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{getLabel(n)}</span>
                  </p>
                  <span className="text-xs text-zinc-400 tabular-nums">
                    {formatRelativeTime(n.createdAtMs)}
                  </span>
                </div>
              </div>

              {n.postThumb && (
                <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800">
                  <MediaWithFallback
                    src={n.postThumb}
                    alt="Post preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
