import React, { useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Bookmark,
  Check,
  Clapperboard,
  Globe,
  Grid3X3,
  Heart,
  Link as LinkIcon,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  Sun,
  X,
} from 'lucide-react';
import type { Language, NoteItem, PostItem, PublicProfile, StoryItem, ThemeMode } from '../types';
import { LANGUAGE_LABELS, TRANSLATIONS } from '../i18n/translations';
import { Avatar, MediaWithFallback, ResolvedVideo, VerifiedBadge, formatCount, isUserVerified } from './BrandMark';

interface ProfileViewProps {
  profile: PublicProfile;
  currentUid: string;
  posts: PostItem[];
  stories: StoryItem[];
  savedPosts: PostItem[];
  profileNote: NoteItem | null;
  isFollowing: boolean;
  unreadNotifications: number;
  language: Language;
  theme: ThemeMode;
  onChangeLanguage: (lang: Language) => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onEditProfile: () => void;
  onCreatePost: () => void;
  onAddStory: () => void;
  onOpenStory: (authorId: string) => void;
  onOpenNoteModal: () => void;
  onOpenNotifications: () => void;
  onBack?: () => void;
  canManageVerification?: boolean;
  onToggleVerified?: (targetUid: string, nextVerified: boolean) => Promise<void>;
  onToggleFollow: (targetUid: string, targetUsername: string, targetAvatar: string) => Promise<void>;
  onMessageUser: (profile: PublicProfile) => Promise<void>;
  onOpenPost: (post: PostItem) => void;
}

export function ProfileView({
  profile,
  currentUid,
  posts,
  stories,
  savedPosts,
  profileNote,
  isFollowing,
  unreadNotifications,
  language,
  theme,
  onChangeLanguage,
  onToggleTheme,
  onSignOut,
  onEditProfile,
  onCreatePost,
  onAddStory,
  onOpenStory,
  onOpenNoteModal,
  onOpenNotifications,
  onBack,
  canManageVerification = false,
  onToggleVerified,
  onToggleFollow,
  onMessageUser,
  onOpenPost,
}: ProfileViewProps) {
  const t = TRANSLATIONS[language];
  const isOwn = profile.uid === currentUid;
  const isVerified = isUserVerified(profile);
  const [tab, setTab] = useState<'posts' | 'reels' | 'saved'>('posts');
  const [showSettings, setShowSettings] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);
  const [togglingVerified, setTogglingVerified] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const userPosts = posts.filter((p) => p.authorId === profile.uid);
  const reelPosts = userPosts.filter((p) => p.isReel);
  const userStories = stories.filter((s) => s.authorId === profile.uid);

  const totalInteractions = userPosts.reduce(
    (sum, item) => sum + (item.likesCount || 0) + (item.commentsCount || 0),
    0
  );

  const displayedItems =
    tab === 'posts' ? userPosts : tab === 'reels' ? reelPosts : savedPosts;

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/?user=${encodeURIComponent(profile.username)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard may be blocked in non-HTTPS contexts
    }
    setCopiedProfile(true);
    window.setTimeout(() => setCopiedProfile(false), 2000);
  };

  const handleMessageClick = async () => {
    setActionError(null);
    try {
      await onMessageUser(profile);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to open chat.');
    }
  };

  const handleToggleVerifiedClick = async () => {
    if (!onToggleVerified || togglingVerified) return;
    setTogglingVerified(true);
    setActionError(null);
    try {
      await onToggleVerified(profile.uid, !Boolean(profile.isVerified));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to update verified status.');
    } finally {
      setTogglingVerified(false);
    }
  };

  const bioLong = profile.bio.length > 95;

  return (
    <div className="max-w-3xl mx-auto px-0 sm:px-4 pb-8">
      {/* Top iOS Profile Bar (Screenshot 2 Style) */}
      <div className="px-3 sm:px-1 h-12 flex items-center justify-between gap-2">
        {isOwn ? (
          <button
            type="button"
            onClick={onCreatePost}
            aria-label={t.nav.create}
            className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
          >
            <Plus className="w-6 h-6" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 min-w-0">
          <h1 className="font-display text-base sm:text-lg font-bold tracking-tight truncate">
            {profile.username}
          </h1>
          {isVerified && <VerifiedBadge size="md" label={t.profile.verified} />}
        </div>

        <div className="flex items-center gap-0.5">
          {isOwn ? (
            <>
              <button
                type="button"
                onClick={onOpenNotifications}
                aria-label={t.nav.notifications}
                className="relative min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowSettings((s) => !s)}
                aria-label="Settings and preferences"
                className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                {showSettings ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : canManageVerification && onToggleVerified ? (
            <button
              type="button"
              disabled={togglingVerified}
              onClick={() => void handleToggleVerifiedClick()}
              aria-label={profile.isVerified ? t.profile.removeVerification : t.profile.verifyUser}
              title={profile.isVerified ? t.profile.removeVerification : t.profile.verifyUser}
              className={`min-h-[36px] px-2.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 ${
                profile.isVerified
                  ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <BadgeCheck className="w-4 h-4" />
              <span className="hidden sm:inline">
                {profile.isVerified ? t.profile.verified : t.profile.verifyUser}
              </span>
            </button>
          ) : (
            <div className="w-11" />
          )}
        </div>
      </div>

      {/* Expandable Settings Sheet */}
      {isOwn && showSettings && (
        <div className="mx-4 mb-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {t.nav.language}
            </span>
            <select
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as Language)}
              className="min-h-[36px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-medium cursor-pointer"
            >
              {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canManageVerification && onToggleVerified && (
              <button
                type="button"
                disabled={togglingVerified}
                onClick={() => void handleToggleVerifiedClick()}
                className={`min-h-[38px] px-3.5 rounded-full border text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  profile.isVerified
                    ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200'
                }`}
              >
                <BadgeCheck className="w-4 h-4" />
                <span>{profile.isVerified ? t.profile.removeVerification : t.profile.verifyUser}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleTheme}
              className="min-h-[38px] px-3.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-medium flex items-center gap-2 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{theme === 'dark' ? t.nav.lightMode : t.nav.darkMode}</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-[38px] px-3.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.nav.signOut}</span>
            </button>
          </div>
        </div>
      )}

      {/* Hero Section (Screenshot 2 Layout) */}
      <section className="px-4 pt-5 pb-4 space-y-3.5">
        <div className="flex items-center gap-5 sm:gap-8">
          {/* Avatar + Floating Note Bubble + Story Badge */}
          <div className="relative shrink-0 pt-3">
            {(profileNote || isOwn) && (
              <button
                type="button"
                onClick={isOwn ? onOpenNoteModal : undefined}
                className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 max-w-[106px] px-2.5 py-1.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-sm text-center ${
                  isOwn ? 'cursor-pointer hover:scale-[1.03] transition-transform' : 'cursor-default'
                }`}
              >
                <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200 line-clamp-2 leading-tight">
                  {profileNote ? profileNote.text : t.notes.addNote}
                </p>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                userStories.length > 0 ? onOpenStory(profile.uid) : isOwn && onAddStory()
              }
              className={`rounded-full block ${
                userStories.length > 0 || isOwn ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <Avatar
                src={profile.avatarUrl}
                alt={profile.username}
                name={profile.displayName}
                size="xl"
                hasStory={userStories.length > 0}
                className="!w-20 !h-20 sm:!w-24 sm:!h-24"
              />
            </button>

            {isOwn && (
              <button
                type="button"
                onClick={onAddStory}
                aria-label={t.feed.addStory}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Display Name + 3-Column Tabular Stats */}
          <div className="flex-1 min-w-0 space-y-2.5 pt-2">
            <h2 className="font-display text-base sm:text-lg font-bold tracking-tight truncate">
              {profile.displayName}
            </h2>

            <div className="grid grid-cols-3 gap-2 max-w-xs">
              <div>
                <p className="font-display text-base sm:text-lg font-bold tabular-nums leading-tight">
                  {userPosts.length}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.profile.posts}</p>
              </div>
              <div>
                <p className="font-display text-base sm:text-lg font-bold tabular-nums leading-tight">
                  {formatCount(profile.followersCount)}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.profile.followers}</p>
              </div>
              <div>
                <p className="font-display text-base sm:text-lg font-bold tabular-nums leading-tight">
                  {formatCount(profile.followingCount)}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.profile.following}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bio with Expandable More Toggle */}
        {profile.bio && (
          <div className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed max-w-lg">
            <p className={bioExpanded ? 'whitespace-pre-line' : 'line-clamp-3 whitespace-pre-line'}>
              {profile.bio}
            </p>
            {bioLong && (
              <button
                type="button"
                onClick={() => setBioExpanded((b) => !b)}
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 mt-0.5 cursor-pointer"
              >
                {bioExpanded ? t.feed.less : `... ${t.feed.more}`}
              </button>
            )}
          </div>
        )}

        {/* Compact Username & Website Link Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <span>@{profile.username}</span>
            {isVerified && <VerifiedBadge size="xs" label={t.profile.verified} />}
          </span>
          {profile.website && (
            <a
              href={
                profile.website.startsWith('http')
                  ? profile.website
                  : `https://${profile.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline max-w-full truncate"
            >
              <LinkIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{profile.website}</span>
            </a>
          )}
        </div>

        {/* Creator Dashboard Summary Card (Own Profile - Screenshot 2) */}
        {isOwn && (
          <div className="rounded-2xl bg-zinc-100/90 dark:bg-zinc-900 px-4 py-3 space-y-0.5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t.profile.yourDashboard}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {formatCount(totalInteractions)} {t.profile.dashboardSummary}
            </p>
          </div>
        )}

        {/* Dual Action Buttons Row */}
        <div className="grid grid-cols-2 gap-2">
          {isOwn ? (
            <>
              <button
                type="button"
                onClick={onEditProfile}
                className="min-h-[38px] px-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                {t.profile.editProfile}
              </button>
              <button
                type="button"
                onClick={() => void handleShareProfile()}
                className="min-h-[38px] px-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                {copiedProfile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.profile.profileCopied}</span>
                  </>
                ) : (
                  <span>{t.profile.shareProfile}</span>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  void onToggleFollow(profile.uid, profile.username, profile.avatarUrl)
                }
                className={`min-h-[38px] px-4 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] whitespace-nowrap cursor-pointer ${
                  isFollowing
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
                    : 'bg-gradient-to-r from-violet-600 to-pink-500 text-white hover:opacity-95'
                }`}
              >
                {isFollowing ? t.feed.following : t.feed.follow}
              </button>
              <button
                type="button"
                onClick={() => void handleMessageClick()}
                className="min-h-[38px] px-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                {t.profile.message}
              </button>
            </>
          )}
        </div>

        {actionError && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{actionError}</p>
        )}

        {/* Story Highlights / Active Stories Row (Screenshot 2 Style) */}
        {(isOwn || userStories.length > 0) && (
          <div className="pt-2 flex items-start gap-4 overflow-x-auto no-scrollbar">
            {isOwn && (
              <button
                type="button"
                onClick={onAddStory}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                <span className="w-16 h-16 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-900 transition-colors">
                  <Plus className="w-6 h-6 stroke-[1.75]" />
                </span>
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
                  {t.profile.newHighlight}
                </span>
              </button>
            )}

            {userStories.map((st, idx) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onOpenStory(profile.uid)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-16 cursor-pointer group"
              >
                <div className="p-[2px] rounded-full border border-zinc-300 dark:border-zinc-700">
                  <div className="w-[58px] h-[58px] rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                    {st.mediaType === 'video' ? (
                      <ResolvedVideo
                        src={st.mediaUrl}
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MediaWithFallback
                        src={st.mediaUrl}
                        alt={st.caption || `Story ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate max-w-full">
                  {st.caption || `${t.profile.highlights} ${idx + 1}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Full-Width Icon Tab Bar (Screenshot 2 Style) */}
      <div
        className={`grid ${
          isOwn ? 'grid-cols-3' : 'grid-cols-2'
        } border-b border-zinc-200/80 dark:border-zinc-800`}
      >
        <button
          type="button"
          onClick={() => setTab('posts')}
          aria-label={t.profile.tabPosts}
          className={`min-h-[46px] flex items-center justify-center border-b-2 transition-colors cursor-pointer ${
            tab === 'posts'
              ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
        >
          <Grid3X3 className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setTab('reels')}
          aria-label={t.profile.tabReels}
          className={`min-h-[46px] flex items-center justify-center border-b-2 transition-colors cursor-pointer ${
            tab === 'reels'
              ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
        >
          <Clapperboard className="w-5 h-5" />
        </button>

        {isOwn && (
          <button
            type="button"
            onClick={() => setTab('saved')}
            aria-label={t.profile.tabSaved}
            className={`min-h-[46px] flex items-center justify-center border-b-2 transition-colors cursor-pointer ${
              tab === 'saved'
                ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            <Bookmark className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tight 3-Column Grid */}
      {displayedItems.length === 0 ? (
        <div className="py-16 px-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {tab === 'posts'
            ? t.profile.emptyPosts
            : tab === 'reels'
              ? t.profile.emptyReels
              : t.profile.emptySaved}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[2px] sm:gap-1.5 pt-[2px] sm:pt-1.5">
          {displayedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenPost(item)}
              className="group relative aspect-[4/5] sm:aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-900 cursor-pointer"
            >
              {item.mediaType === 'video' ? (
                <ResolvedVideo
                  src={item.mediaUrl}
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <MediaWithFallback
                  src={item.mediaUrl}
                  alt={item.caption || item.authorUsername}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              )}

              {(item.isReel || item.mediaType === 'video') && (
                <span className="absolute top-2 right-2 text-white drop-shadow-md">
                  <Clapperboard className="w-4 h-4" />
                </span>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-semibold">
                <span className="flex items-center gap-1 tabular-nums">
                  <Heart className="w-4 h-4 fill-white" />
                  {formatCount(item.likesCount)}
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  <MessageCircle className="w-4 h-4 fill-white" />
                  {formatCount(item.commentsCount)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
