import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  getDocsFromServer,
  increment,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Bell,
  Camera,
  Check,
  Clapperboard,
  Globe,
  Home,
  Loader2,
  LogOut,
  MessageCircle,
  Moon,
  Plus,
  Send,
  Sun,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType, type UploadStage } from './lib/firebase';
import { getTopTrendingTopics, postHasHashtag } from './lib/hashtags';
import { LANGUAGE_LABELS, TRANSLATIONS } from './i18n/translations';
import type {
  AppTab,
  Language,
  NoteItem,
  NotificationItem,
  PostItem,
  PublicProfile,
  StoryItem,
  ThemeMode,
} from './types';
import { Avatar, SnapTopLogo, VerifiedBadge, isUserVerified } from './components/BrandMark';
import { AuthScreen } from './components/AuthScreen';
import { StoryBar } from './components/StoryBar';
import { StoryViewer } from './components/StoryViewer';
import { PostCard } from './components/PostCard';
import { CommentsModal } from './components/CommentsModal';
import { ShareModal } from './components/ShareModal';
import { CreateModal, type CreateMode, type UploadProgressState } from './components/CreateModal';
import { ReelsView } from './components/ReelsView';
import { MessagesView } from './components/MessagesView';
import { NotificationsView } from './components/NotificationsView';
import { ProfileView } from './components/ProfileView';
import { EditProfileModal } from './components/EditProfileModal';
import { NoteModal } from './components/NoteModal';
import { PullToRefresh } from './components/PullToRefresh';
import { TrendingTopicsCard } from './components/TrendingTopicsCard';

function mapPostDoc(d: QueryDocumentSnapshot<DocumentData>): PostItem {
  const data = d.data();
  return {
    id: d.id,
    authorId: data.authorId,
    authorUsername: data.authorUsername,
    authorDisplayName: data.authorDisplayName,
    authorAvatar: data.authorAvatar || '',
    mediaUrl: data.mediaUrl,
    mediaType: data.mediaType,
    isReel: Boolean(data.isReel),
    caption: data.caption || '',
    location: data.location || '',
    audioTitle: data.audioTitle || '',
    likesCount: data.likesCount || 0,
    commentsCount: data.commentsCount || 0,
    sharesCount: data.sharesCount || 0,
    createdAtMs: data.createdAt?.toMillis?.() || Date.now(),
  };
}

function mapStoryDoc(d: QueryDocumentSnapshot<DocumentData>): StoryItem {
  const data = d.data();
  return {
    id: d.id,
    authorId: data.authorId,
    authorUsername: data.authorUsername,
    authorAvatar: data.authorAvatar || '',
    mediaUrl: data.mediaUrl,
    mediaType: data.mediaType,
    caption: data.caption || '',
    createdAtMs: data.createdAt?.toMillis?.() || Date.now(),
  };
}

function makeSafeUsername(raw: string, uid: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/@.*/, '')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 22);
  if (cleaned.length >= 2) return cleaned;
  return `snap_${uid.slice(0, 6)}`;
}

function safeStorageGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [profileRetryNonce, setProfileRetryNonce] = useState(0);
  const [currentProfile, setCurrentProfile] = useState<PublicProfile | null>(null);

  const [language, setLanguage] = useState<Language>(() => {
    const saved = safeStorageGet('snaptop_lang');
    return saved === 'hi' || saved === 'te' ? saved : 'en';
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = safeStorageGet('snaptop_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [viewedProfileUid, setViewedProfileUid] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [seedHint, setSeedHint] = useState<{ displayName: string; username: string } | null>(null);

  // Live Firestore state (100% real user data)
  const [allCreators, setAllCreators] = useState<PublicProfile[]>([]);
  const [allPosts, setAllPosts] = useState<PostItem[]>([]);
  const [allStories, setAllStories] = useState<StoryItem[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedPostMap, setSavedPostMap] = useState<Map<string, PostItem>>(new Map());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());

  // Modals
  const [createModalMode, setCreateModalMode] = useState<CreateMode | null>(null);
  const [storyAuthorId, setStoryAuthorId] = useState<string | null>(null);
  const [commentsPost, setCommentsPost] = useState<PostItem | null>(null);
  const [sharePost, setSharePost] = useState<PostItem | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [homeRefreshSignal, setHomeRefreshSignal] = useState(0);
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const [appError, setAppError] = useState<string | null>(null);
  const [uploadToast, setUploadToast] = useState<{
    status: 'uploading' | 'done';
    progress: number;
    mode: CreateMode;
    stage?: UploadStage;
  } | null>(null);

  const t = TRANSLATIONS[language];

  const notifyError = useCallback((err: unknown, fallback: string) => {
    const raw = err instanceof Error ? err.message : String(err || fallback);
    let friendly = fallback;
    try {
      const parsed = JSON.parse(raw) as { error?: string };
      if (parsed?.error) friendly = parsed.error;
    } catch {
      if (raw && raw.length < 180) friendly = raw;
    }
    setAppError(friendly);
  }, []);

  useEffect(() => {
    if (!appError) return;
    const timer = window.setTimeout(() => setAppError(null), 4000);
    return () => window.clearTimeout(timer);
  }, [appError]);

  const handleUploadStateChange = useCallback((state: UploadProgressState) => {
    if (state.active) {
      setUploadToast({
        status: 'uploading',
        progress: state.progress,
        mode: state.mode,
        stage: state.stage,
      });
    } else if (state.done) {
      setUploadToast({
        status: 'done',
        progress: 100,
        mode: state.mode,
        stage: state.stage,
      });
    } else {
      setUploadToast(null);
    }
  }, []);

  useEffect(() => {
    if (uploadToast?.status !== 'done') return;
    const timer = window.setTimeout(() => {
      setUploadToast(null);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [uploadToast?.status]);

  type ViewTransitionHandle = {
    ready?: Promise<void>;
    updateCallbackDone?: Promise<void>;
    finished?: Promise<void>;
    skipTransition?: () => void;
  };

  const hasMountedThemeRef = useRef(false);
  const themeTransitionTimerRef = useRef<number | null>(null);
  const activeViewTransitionRef = useRef<ViewTransitionHandle | null>(null);

  const applyThemeFallbackCrossFade = useCallback((isDark: boolean) => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    void root.offsetWidth;
    root.classList.toggle('dark', isDark);
    if (themeTransitionTimerRef.current !== null) {
      window.clearTimeout(themeTransitionTimerRef.current);
    }
    themeTransitionTimerRef.current = window.setTimeout(() => {
      root.classList.remove('theme-transitioning');
      themeTransitionTimerRef.current = null;
    }, 360);
  }, []);

  const runThemeViewTransition = useCallback(
    (isDark: boolean, updateReactState?: () => void) => {
      const root = document.documentElement;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        root.classList.toggle('dark', isDark);
        updateReactState?.();
        return;
      }

      const docWithTransition = document as Document & {
        startViewTransition?: (cb: () => void) => ViewTransitionHandle;
      };

      if (typeof docWithTransition.startViewTransition === 'function') {
        try {
          if (activeViewTransitionRef.current) {
            try {
              activeViewTransitionRef.current.skipTransition?.();
            } catch {
              // Ignore skip errors on stale transitions
            }
            activeViewTransitionRef.current = null;
          }

          const transition = docWithTransition.startViewTransition(() => {
            root.classList.toggle('dark', isDark);
            updateReactState?.();
          });

          activeViewTransitionRef.current = transition;
          transition?.updateCallbackDone?.catch(() => {});
          transition?.ready?.catch(() => {});
          transition?.finished
            ?.catch(() => {})
            .finally(() => {
              if (activeViewTransitionRef.current === transition) {
                activeViewTransitionRef.current = null;
              }
            });
          return;
        } catch {
          activeViewTransitionRef.current = null;
        }
      }

      applyThemeFallbackCrossFade(isDark);
      updateReactState?.();
    },
    [applyThemeFallbackCrossFade]
  );

  useEffect(() => {
    return () => {
      if (themeTransitionTimerRef.current !== null) {
        window.clearTimeout(themeTransitionTimerRef.current);
      }
      if (activeViewTransitionRef.current) {
        try {
          activeViewTransitionRef.current.skipTransition?.();
        } catch {
          // Ignore
        }
        activeViewTransitionRef.current = null;
      }
      document.documentElement.classList.remove('theme-transitioning');
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';
    safeStorageSet('snaptop_theme', theme);

    if (!hasMountedThemeRef.current) {
      hasMountedThemeRef.current = true;
      root.classList.toggle('dark', isDark);
      return;
    }

    if (root.classList.contains('dark') === isDark) {
      return;
    }

    runThemeViewTransition(isDark);
  }, [theme, runThemeViewTransition]);

  useEffect(() => {
    safeStorageSet('snaptop_lang', language);
  }, [language]);

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        setFirebaseUser(user);
        setAuthReady(true);
        if (!user) {
          setCurrentProfile(null);
          setProfileReady(false);
          setProfileLoadError(null);
        }
      },
      (err) => {
        setAuthReady(true);
        notifyError(err, 'Unable to check authentication session. Please reload.');
      }
    );
    return unsub;
  }, [notifyError]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) return;

    let cancelled = false;
    async function ensureUserDocs(user: User) {
      const pubRef = doc(db, 'publicProfiles', user.uid);
      const privRef = doc(db, 'users', user.uid);

      try {
        const pubSnap = await getDoc(pubRef);
        if (!pubSnap.exists()) {
          const fallbackName =
            seedHint?.displayName ||
            user.displayName ||
            user.email?.split('@')[0] ||
            'SnapTop User';
          const fallbackUsername =
            seedHint?.username ||
            makeSafeUsername(user.displayName || user.email || 'user', user.uid);

          await setDoc(pubRef, {
            uid: user.uid,
            username: fallbackUsername.slice(0, 30),
            displayName: fallbackName.slice(0, 60),
            bio: '',
            avatarUrl: (user.photoURL || '').slice(0, 2048),
            website: '',
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            isPublic: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const privSnap = await getDoc(privRef);
        if (!privSnap.exists()) {
          await setDoc(privRef, {
            uid: user.uid,
            email: (user.email || 'user@snaptop.app').slice(0, 254),
            language,
            theme,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          const privData = privSnap.data();
          if (privData.language === 'en' || privData.language === 'hi' || privData.language === 'te') {
            setLanguage(privData.language);
          }
          if (privData.theme === 'light' || privData.theme === 'dark') {
            setTheme(privData.theme);
          }
        }

        const freshPub = await getDoc(pubRef);
        if (!cancelled && freshPub.exists()) {
          const d = freshPub.data();
          setCurrentProfile({
            uid: d.uid,
            username: d.username,
            displayName: d.displayName,
            bio: d.bio || '',
            avatarUrl: d.avatarUrl || '',
            website: d.website || '',
            followersCount: d.followersCount || 0,
            followingCount: d.followingCount || 0,
            postsCount: d.postsCount || 0,
            isPublic: true,
            isVerified: Boolean(d.isVerified),
            createdAtMs: d.createdAt?.toMillis?.() || Date.now(),
          });
          setProfileLoadError(null);
          setProfileReady(true);
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, `publicProfiles/${user.uid}`);
        } catch (logged) {
          if (!cancelled) {
            const msg = logged instanceof Error ? logged.message : String(logged);
            try {
              const parsed = JSON.parse(msg) as { error?: string };
              setProfileLoadError(parsed.error || 'Could not load your profile from Firestore.');
            } catch {
              setProfileLoadError(msg || 'Could not load your profile from Firestore.');
            }
          }
        }
      }
    }

    setProfileLoadError(null);
    void ensureUserDocs(firebaseUser);
    return () => {
      cancelled = true;
    };
  }, [authReady, firebaseUser?.uid, firebaseUser?.emailVerified, profileRetryNonce]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified || !profileReady) return;
    const uid = firebaseUser.uid;

    const unsubProfiles = onSnapshot(
      query(collection(db, 'publicProfiles'), where('isPublic', '==', true)),
      (snap) => {
        const list: PublicProfile[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: data.uid,
            username: data.username,
            displayName: data.displayName,
            bio: data.bio || '',
            avatarUrl: data.avatarUrl || '',
            website: data.website || '',
            followersCount: data.followersCount || 0,
            followingCount: data.followingCount || 0,
            postsCount: data.postsCount || 0,
            isPublic: true,
            isVerified: Boolean(data.isVerified),
            createdAtMs: data.createdAt?.toMillis?.() || Date.now(),
          };
        });
        setAllCreators(list);
        const me = list.find((p) => p.uid === uid);
        if (me) setCurrentProfile(me);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'publicProfiles');
        } catch (logged) {
          notifyError(logged, 'Unable to load profiles.');
        }
      }
    );

    const unsubPosts = onSnapshot(
      query(collection(db, 'posts'), where('visibility', '==', 'public')),
      (snap) => {
        const list = snap.docs
          .map(mapPostDoc)
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        setAllPosts(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'posts');
        } catch (logged) {
          notifyError(logged, 'Unable to load posts.');
        }
      }
    );

    const unsubStories = onSnapshot(
      query(collection(db, 'stories'), where('visibility', '==', 'public')),
      (snap) => {
        const list = snap.docs
          .map(mapStoryDoc)
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        setAllStories(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'stories');
        } catch (logged) {
          notifyError(logged, 'Unable to load stories.');
        }
      }
    );

    const unsubLikes = onSnapshot(
      query(collection(db, 'postLikes'), where('userId', '==', uid)),
      (snap) => {
        setLikedPostIds(new Set(snap.docs.map((d) => d.data().postId as string)));
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'postLikes');
        } catch (logged) {
          notifyError(logged, 'Unable to sync likes.');
        }
      }
    );

    const unsubSaved = onSnapshot(
      query(collection(db, 'savedPosts'), where('userId', '==', uid)),
      (snap) => {
        const map = new Map<string, PostItem>();
        snap.docs.forEach((d) => {
          const data = d.data();
          map.set(data.postId, {
            id: data.postId,
            authorId: '',
            authorUsername: data.authorUsername,
            authorDisplayName: data.authorUsername,
            authorAvatar: '',
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            isReel: false,
            caption: data.caption || '',
            location: '',
            audioTitle: '',
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            createdAtMs: data.createdAt?.toMillis?.() || Date.now(),
          });
        });
        setSavedPostMap(map);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'savedPosts');
        } catch (logged) {
          notifyError(logged, 'Unable to sync saved posts.');
        }
      }
    );

    const unsubFollows = onSnapshot(
      query(collection(db, 'follows'), where('followerId', '==', uid)),
      (snap) => {
        setFollowingIds(new Set(snap.docs.map((d) => d.data().followingId as string)));
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'follows');
        } catch (logged) {
          notifyError(logged, 'Unable to sync following.');
        }
      }
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('recipientId', '==', uid)),
      (snap) => {
        const list: NotificationItem[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              recipientId: data.recipientId,
              actorId: data.actorId,
              actorUsername: data.actorUsername,
              actorAvatar: data.actorAvatar || '',
              type: data.type,
              postId: data.postId || '',
              postThumb: data.postThumb || '',
              text: data.text,
              isRead: Boolean(data.isRead),
              createdAtMs: data.createdAt?.toMillis?.() || Date.now(),
            } as NotificationItem;
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        setNotifications(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'notifications');
        } catch (logged) {
          notifyError(logged, 'Unable to load notifications.');
        }
      }
    );

    const unsubNotes = onSnapshot(
      query(collection(db, 'notes'), where('visibility', '==', 'public')),
      (snap) => {
        const list: NoteItem[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              userId: data.userId,
              username: data.username,
              displayName: data.displayName,
              avatarUrl: data.avatarUrl || '',
              text: data.text || '',
              createdAtMs: data.createdAt?.toMillis?.() || Date.now(),
              updatedAtMs: data.updatedAt?.toMillis?.() || Date.now(),
            };
          })
          .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
        setNotes(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'notes');
        } catch (logged) {
          notifyError(logged, 'Unable to load status notes.');
        }
      }
    );

    return () => {
      unsubProfiles();
      unsubPosts();
      unsubStories();
      unsubLikes();
      unsubSaved();
      unsubFollows();
      unsubNotifs();
      unsubNotes();
    };
  }, [authReady, firebaseUser?.uid, firebaseUser?.emailVerified, profileReady]);

  const handleRefreshFeed = useCallback(async () => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified || !profileReady) return;
    const postsQuery = query(collection(db, 'posts'), where('visibility', '==', 'public'));
    const storiesQuery = query(collection(db, 'stories'), where('visibility', '==', 'public'));

    try {
      const postsSnap = await getDocsFromServer(postsQuery);
      setAllPosts(postsSnap.docs.map(mapPostDoc).sort((a, b) => b.createdAtMs - a.createdAtMs));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
        try {
          handleFirestoreError(err, OperationType.LIST, 'posts');
        } catch (logged) {
          notifyError(logged, 'Could not refresh posts.');
        }
        return;
      }
      try {
        const fallbackPosts = await getDocs(postsQuery);
        setAllPosts(fallbackPosts.docs.map(mapPostDoc).sort((a, b) => b.createdAtMs - a.createdAtMs));
      } catch (fallbackErr) {
        try {
          handleFirestoreError(fallbackErr, OperationType.LIST, 'posts');
        } catch (logged) {
          notifyError(logged, 'Could not refresh posts.');
        }
      }
    }

    try {
      const storiesSnap = await getDocsFromServer(storiesQuery);
      setAllStories(storiesSnap.docs.map(mapStoryDoc).sort((a, b) => b.createdAtMs - a.createdAtMs));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
        try {
          handleFirestoreError(err, OperationType.LIST, 'stories');
        } catch (logged) {
          notifyError(logged, 'Could not refresh stories.');
        }
      }
    }
  }, [authReady, firebaseUser, profileReady, notifyError]);

  const handleHomeNavClick = useCallback(() => {
    if (activeTab === 'home') {
      setActiveHashtag(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setHomeRefreshSignal((prev) => prev + 1);
    } else {
      setActiveTab('home');
    }
  }, [activeTab]);

  const trendingTopics = useMemo(() => getTopTrendingTopics(allPosts, 5), [allPosts]);

  const feedPosts = useMemo(() => {
    if (!activeHashtag) return allPosts;
    return allPosts.filter((p) => postHasHashtag(p.caption, activeHashtag));
  }, [allPosts, activeHashtag]);

  const activeTopicLabel = useMemo(() => {
    if (!activeHashtag) return null;
    const match = trendingTopics.find((topic) => topic.key === activeHashtag);
    return match ? match.tag : activeHashtag;
  }, [activeHashtag, trendingTopics]);

  const allReels = useMemo(() => allPosts.filter((p) => p.isReel), [allPosts]);

  const savedPostsList = useMemo(() => {
    const result: PostItem[] = [];
    savedPostMap.forEach((stub, postId) => {
      const live = allPosts.find((p) => p.id === postId);
      result.push(live || stub);
    });
    return result;
  }, [savedPostMap, allPosts]);

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const isAppAdmin = Boolean(
    firebaseUser?.emailVerified && firebaseUser.email === 'nagamaniguguloth0@gmail.com'
  );

  const verifiedUserIds = useMemo(() => {
    const set = new Set<string>();
    allCreators.forEach((creator) => {
      if (isUserVerified(creator)) set.add(creator.uid);
    });
    if (currentProfile && isUserVerified(currentProfile)) {
      set.add(currentProfile.uid);
    }
    return set;
  }, [allCreators, currentProfile]);

  const handleChangeLanguage = async (lang: Language) => {
    setLanguage(lang);
    if (firebaseUser?.emailVerified && profileReady) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          language: lang,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        } catch (logged) {
          notifyError(logged, 'Could not save language preference.');
        }
      }
    }
  };

  const handleToggleTheme = async () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    const isDark = next === 'dark';
    safeStorageSet('snaptop_theme', next);
    runThemeViewTransition(isDark, () => {
      flushSync(() => {
        setTheme(next);
      });
    });

    if (firebaseUser?.emailVerified && profileReady) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          theme: next,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        } catch (logged) {
          notifyError(logged, 'Could not save theme preference.');
        }
      }
    }
  };

  const handleToggleLike = async (post: PostItem) => {
    if (!currentProfile) return;
    const likeId = `${post.id}_${currentProfile.uid}`;
    const alreadyLiked = likedPostIds.has(post.id);
    const batch = writeBatch(db);

    if (alreadyLiked) {
      batch.delete(doc(db, 'postLikes', likeId));
      batch.update(doc(db, 'posts', post.id), {
        likesCount: post.likesCount > 0 ? increment(-1) : 0,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(db, 'postLikes', likeId), {
        postId: post.id,
        userId: currentProfile.uid,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, 'posts', post.id), {
        likesCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      if (post.authorId !== currentProfile.uid) {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        batch.set(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientId: post.authorId,
          actorId: currentProfile.uid,
          actorUsername: currentProfile.username,
          actorAvatar: (currentProfile.avatarUrl || '').slice(0, 150000),
          type: 'like',
          postId: post.id,
          postThumb: post.mediaType === 'image' && post.mediaUrl.length <= 550000 ? post.mediaUrl : '',
          text: 'liked your post',
          isRead: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    try {
      await batch.commit();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `postLikes/${likeId}`);
      } catch (logged) {
        notifyError(logged, 'Could not update like.');
      }
    }
  };

  const handleToggleSave = async (post: PostItem) => {
    if (!currentProfile) return;
    const saveId = `${currentProfile.uid}_${post.id}`;
    const isSaved = savedPostMap.has(post.id);
    try {
      if (isSaved) {
        await deleteDoc(doc(db, 'savedPosts', saveId));
      } else {
        await setDoc(doc(db, 'savedPosts', saveId), {
          userId: currentProfile.uid,
          postId: post.id,
          mediaUrl: post.mediaUrl.slice(0, 550000),
          mediaType: post.mediaType,
          caption: post.caption.slice(0, 2200),
          authorUsername: post.authorUsername.slice(0, 30),
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `savedPosts/${saveId}`);
      } catch (logged) {
        notifyError(logged, 'Could not update saved post.');
      }
    }
  };

  const handleToggleFollow = async (
    targetUid: string,
    targetUsername: string,
    targetAvatar: string
  ) => {
    if (!currentProfile || targetUid === currentProfile.uid) return;
    const followId = `${currentProfile.uid}_${targetUid}`;
    const alreadyFollowing = followingIds.has(targetUid);
    const batch = writeBatch(db);

    if (alreadyFollowing) {
      const targetProfile = allCreators.find((c) => c.uid === targetUid);
      batch.delete(doc(db, 'follows', followId));
      batch.update(doc(db, 'publicProfiles', currentProfile.uid), {
        followingCount: Math.max(0, currentProfile.followingCount - 1),
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'publicProfiles', targetUid), {
        followersCount:
          targetProfile && targetProfile.followersCount === 0 ? 0 : increment(-1),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(db, 'follows', followId), {
        followerId: currentProfile.uid,
        followingId: targetUid,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, 'publicProfiles', currentProfile.uid), {
        followingCount: currentProfile.followingCount + 1,
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'publicProfiles', targetUid), {
        followersCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientId: targetUid,
        actorId: currentProfile.uid,
        actorUsername: currentProfile.username,
        actorAvatar: (currentProfile.avatarUrl || '').slice(0, 150000),
        type: 'follow',
        postId: '',
        postThumb: targetAvatar.slice(0, 2048),
        text: `started following @${targetUsername}`,
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `follows/${followId}`);
      } catch (logged) {
        notifyError(logged, 'Could not update follow status.');
      }
    }
  };

  const handleAddComment = async (post: PostItem, text: string) => {
    if (!currentProfile) return;
    const cleanText = text.trim().slice(0, 500);
    if (!cleanText) return;
    const commentId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const batch = writeBatch(db);
    batch.set(doc(db, `posts/${post.id}/comments`, commentId), {
      id: commentId,
      postId: post.id,
      authorId: currentProfile.uid,
      authorUsername: currentProfile.username,
      authorAvatar: (currentProfile.avatarUrl || '').slice(0, 150000),
      text: cleanText,
      visibility: 'public',
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'posts', post.id), {
      commentsCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    if (post.authorId !== currentProfile.uid) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientId: post.authorId,
        actorId: currentProfile.uid,
        actorUsername: currentProfile.username,
        actorAvatar: (currentProfile.avatarUrl || '').slice(0, 150000),
        type: 'comment',
        postId: post.id,
        postThumb: post.mediaType === 'image' && post.mediaUrl.length <= 550000 ? post.mediaUrl : '',
        text: cleanText.slice(0, 140),
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `posts/${post.id}/comments/${commentId}`);
    }
  };

  const handleEditCaption = async (postId: string, caption: string) => {
    try {
      await updateDoc(doc(db, 'posts', postId), {
        caption: caption.slice(0, 2200),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentProfile) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      if (commentsPost?.id === postId) setCommentsPost(null);
      await updateDoc(doc(db, 'publicProfiles', currentProfile.uid), {
        postsCount: Math.max(0, currentProfile.postsCount - 1),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
      } catch (logged) {
        notifyError(logged, 'Could not delete post.');
      }
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await deleteDoc(doc(db, 'stories', storyId));
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `stories/${storyId}`);
      } catch (logged) {
        notifyError(logged, 'Could not delete story.');
      }
    }
  };

  const handlePublish = async (payload: {
    mode: CreateMode;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    caption: string;
    location: string;
    audioTitle: string;
  }) => {
    if (!currentProfile) return;

    if (payload.mode === 'story') {
      const storyId = `story_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      try {
        await setDoc(doc(db, 'stories', storyId), {
          id: storyId,
          authorId: currentProfile.uid,
          authorUsername: currentProfile.username,
          authorAvatar: (currentProfile.avatarUrl || '').slice(0, 150000),
          mediaUrl: payload.mediaUrl.slice(0, 550000),
          mediaType: payload.mediaType,
          caption: payload.caption.slice(0, 200),
          visibility: 'public',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `stories/${storyId}`);
      }
      return;
    }

    const postId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const batch = writeBatch(db);
    batch.set(doc(db, 'posts', postId), {
      id: postId,
      authorId: currentProfile.uid,
      authorUsername: currentProfile.username,
      authorDisplayName: currentProfile.displayName,
      authorAvatar: (currentProfile.avatarUrl || '').slice(0, 150000),
      mediaUrl: payload.mediaUrl.slice(0, 550000),
      mediaType: payload.mediaType,
      isReel: payload.mode === 'reel',
      caption: payload.caption.slice(0, 2200),
      location: payload.location.slice(0, 100),
      audioTitle: payload.audioTitle.slice(0, 120),
      visibility: 'public',
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'publicProfiles', currentProfile.uid), {
      postsCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      if (payload.mode === 'reel') setActiveTab('reels');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `posts/${postId}`);
    }
  };

  const ensureConversation = async (otherUser: PublicProfile): Promise<string> => {
    if (!currentProfile) throw new Error('Not signed in');
    const sorted = [currentProfile.uid, otherUser.uid].sort();
    const convId = `conv_${sorted[0]}_${sorted[1]}`;
    const convRef = doc(db, 'conversations', convId);
    let existsFlag = false;
    try {
      const snap = await getDoc(convRef);
      existsFlag = snap.exists();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `conversations/${convId}`);
    }
    if (!existsFlag) {
      const isMeA = sorted[0] === currentProfile.uid;
      const myName = (currentProfile.displayName || currentProfile.username || 'User').slice(0, 60);
      const otherName = (otherUser.displayName || otherUser.username || 'User').slice(0, 60);
      const myAvatar = (currentProfile.avatarUrl || '').slice(0, 150000);
      const otherAvatar = (otherUser.avatarUrl || '').slice(0, 150000);
      try {
        await setDoc(convRef, {
          id: convId,
          participantIds: sorted,
          participantA: sorted[0],
          participantB: sorted[1],
          participantAName: isMeA ? myName : otherName,
          participantAAvatar: isMeA ? myAvatar : otherAvatar,
          participantBName: isMeA ? otherName : myName,
          participantBAvatar: isMeA ? otherAvatar : myAvatar,
          lastMessage: '',
          lastSenderId: currentProfile.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `conversations/${convId}`);
      }
    }
    return convId;
  };

  const handleSendPostToUser = async (recipient: PublicProfile, post: PostItem) => {
    if (!currentProfile) return;
    const convId = await ensureConversation(recipient);
    const sorted = [currentProfile.uid, recipient.uid].sort();
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const text = `Shared post by @${post.authorUsername}: ${post.caption.slice(0, 120)}`;
    const batch = writeBatch(db);

    batch.set(doc(db, `conversations/${convId}/messages`, msgId), {
      id: msgId,
      conversationId: convId,
      senderId: currentProfile.uid,
      participantIds: sorted,
      text,
      sharedPostId: post.id,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'conversations', convId), {
      lastMessage: text,
      lastSenderId: currentProfile.uid,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'posts', post.id), {
      sharesCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      recipientId: recipient.uid,
      actorId: currentProfile.uid,
      actorUsername: currentProfile.username,
      actorAvatar: (currentProfile.avatarUrl || '').slice(0, 150000),
      type: 'share',
      postId: post.id,
      postThumb: post.mediaType === 'image' && post.mediaUrl.length <= 550000 ? post.mediaUrl : '',
      text: 'shared a post',
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}/messages`);
    }
  };

  const handleReplyStory = async (
    authorId: string,
    authorUsername: string,
    authorAvatar: string,
    text: string
  ) => {
    if (!currentProfile) return;
    const clean = text.trim().slice(0, 1000);
    if (!clean) return;
    const recipient = allCreators.find((c) => c.uid === authorId) || {
      uid: authorId,
      username: authorUsername,
      displayName: authorUsername,
      bio: '',
      avatarUrl: authorAvatar,
      website: '',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isPublic: true,
      createdAtMs: Date.now(),
    };
    const convId = await ensureConversation(recipient);
    const sorted = [currentProfile.uid, recipient.uid].sort();
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const batch = writeBatch(db);
    batch.set(doc(db, `conversations/${convId}/messages`, msgId), {
      id: msgId,
      conversationId: convId,
      senderId: currentProfile.uid,
      participantIds: sorted,
      text: clean,
      sharedPostId: '',
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'conversations', convId), {
      lastMessage: clean,
      lastSenderId: currentProfile.uid,
      updatedAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}/messages`);
    }
  };

  const handleMarkNotifRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), {
        isRead: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
      } catch (logged) {
        notifyError(logged, 'Could not mark notification as read.');
      }
    }
  };

  const handleMarkAllNotifsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), {
        isRead: true,
        updatedAt: serverTimestamp(),
      });
    });
    try {
      await batch.commit();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, 'notifications');
      } catch (logged) {
        notifyError(logged, 'Could not mark notifications as read.');
      }
    }
  };

  const handleSaveProfile = async (updates: {
    displayName: string;
    username: string;
    bio: string;
    website: string;
    avatarUrl: string;
  }) => {
    if (!currentProfile) return;
    try {
      await updateDoc(doc(db, 'publicProfiles', currentProfile.uid), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `publicProfiles/${currentProfile.uid}`);
    }
  };

  const handleToggleVerified = async (targetUid: string, nextVerified: boolean) => {
    if (!isAppAdmin) return;
    try {
      await updateDoc(doc(db, 'publicProfiles', targetUid), {
        isVerified: nextVerified,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `publicProfiles/${targetUid}`);
      } catch (logged) {
        notifyError(logged, 'Could not update verified status.');
        throw logged;
      }
    }
  };

  const handleSaveNote = async (text: string) => {
    if (!currentProfile) return;
    const clean = text.trim().slice(0, 60);
    if (!clean) return;
    const noteRef = doc(db, 'notes', currentProfile.uid);
    const existing = notes.find((n) => n.userId === currentProfile.uid);
    try {
      if (existing) {
        await updateDoc(noteRef, {
          username: currentProfile.username.slice(0, 30),
          displayName: currentProfile.displayName.slice(0, 60),
          avatarUrl: (currentProfile.avatarUrl || '').slice(0, 150000),
          text: clean,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(noteRef, {
          userId: currentProfile.uid,
          username: currentProfile.username.slice(0, 30),
          displayName: currentProfile.displayName.slice(0, 60),
          avatarUrl: (currentProfile.avatarUrl || '').slice(0, 150000),
          text: clean,
          visibility: 'public',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `notes/${currentProfile.uid}`);
    }
  };

  const handleDeleteNote = async () => {
    if (!currentProfile) return;
    try {
      await deleteDoc(doc(db, 'notes', currentProfile.uid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notes/${currentProfile.uid}`);
    }
  };

  const openProfile = (uid: string) => {
    setViewedProfileUid(uid);
    setActiveTab('profile');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <SnapTopLogo size={42} />
          <span className="font-display text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            SnapTop
          </span>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !firebaseUser.emailVerified) {
    return (
      <AuthScreen
        language={language}
        onChangeLanguage={handleChangeLanguage}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        pendingUser={firebaseUser}
        onProfileSeedHint={(displayName, username) => setSeedHint({ displayName, username })}
      />
    );
  }

  if (!currentProfile) {
    if (profileLoadError) {
      return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-sm w-full rounded-[28px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-6 text-center space-y-4">
            <div className="flex justify-center">
              <SnapTopLogo size={38} />
            </div>
            <h1 className="font-display text-base font-bold">Could not load your profile</h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 break-words leading-relaxed">
              {profileLoadError}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setProfileLoadError(null);
                  setProfileRetryNonce((n) => n + 1);
                }}
                className="min-h-[40px] px-4 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-semibold cursor-pointer"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => void signOut(auth)}
                className="min-h-[40px] px-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold cursor-pointer"
              >
                {t.nav.signOut}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <SnapTopLogo size={42} />
          <Loader2 className="w-5 h-5 animate-spin text-violet-600 dark:text-violet-400" />
        </div>
      </div>
    );
  }

  const displayedProfile =
    allCreators.find((c) => c.uid === (viewedProfileUid || currentProfile.uid)) ||
    currentProfile;

  const otherCreators = allCreators.filter((c) => c.uid !== currentProfile.uid).slice(0, 5);

  const navItems: {
    key: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { key: 'home', label: t.nav.home, icon: Home },
    { key: 'reels', label: t.nav.reels, icon: Clapperboard },
    { key: 'messages', label: t.nav.messages, icon: MessageCircle },
    { key: 'notifications', label: t.nav.notifications, icon: Bell, badge: unreadNotifications },
  ];

  const showMobileTopHeader = activeTab === 'home' || activeTab === 'notifications';
  const isFullBleedMobileTab = activeTab === 'reels' || activeTab === 'messages';

  return (
    <div
      className={`min-h-screen ${
        activeTab === 'reels'
          ? 'bg-black md:bg-zinc-50/40 md:dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100'
          : 'bg-zinc-50/40 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100'
      } flex flex-col md:flex-row`}
    >
      {/* Desktop Frosted Sidebar */}
      <aside className="hidden md:flex md:w-20 xl:w-64 shrink-0 flex-col justify-between border-r border-zinc-200/70 dark:border-zinc-800/80 sticky top-0 h-screen px-3 xl:px-4 py-6 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl z-30">
        <div className="space-y-6">
          <button
            type="button"
            onClick={handleHomeNavClick}
            className="flex items-center gap-3 px-2.5 py-1.5 w-full text-left cursor-pointer"
          >
            <SnapTopLogo size={32} />
            <span className="hidden xl:inline font-display text-xl font-bold tracking-[-0.02em]">
              {t.appName}
            </span>
          </button>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => (item.key === 'home' ? handleHomeNavClick() : setActiveTab(item.key))}
                  className={`w-full min-h-[46px] px-3 rounded-2xl flex items-center justify-center xl:justify-start gap-3.5 transition-all active:scale-[0.98] cursor-pointer ${
                    isActive
                      ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Icon className="w-[22px] h-[22px]" />
                    {item.badge && item.badge > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className="hidden xl:inline text-sm whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCreateModalMode('post')}
              className="w-full min-h-[46px] px-3 rounded-2xl flex items-center justify-center xl:justify-start gap-3.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-900 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-violet-600 to-pink-500 text-white flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </span>
              <span className="hidden xl:inline text-sm whitespace-nowrap">{t.nav.create}</span>
            </button>

            <button
              type="button"
              onClick={() => openProfile(currentProfile.uid)}
              className={`w-full min-h-[46px] px-3 rounded-2xl flex items-center justify-center xl:justify-start gap-3.5 transition-all active:scale-[0.98] cursor-pointer ${
                activeTab === 'profile' && displayedProfile.uid === currentProfile.uid
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-900'
              }`}
            >
              <Avatar
                src={currentProfile.avatarUrl}
                alt={currentProfile.username}
                name={currentProfile.displayName}
                size="xs"
              />
              <span className="hidden xl:inline text-sm whitespace-nowrap">{t.nav.profile}</span>
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar Utilities */}
        <div className="space-y-1.5 pt-4 border-t border-zinc-200/70 dark:border-zinc-800/80">
          <div className="px-2 py-1.5 flex items-center justify-center xl:justify-between gap-2">
            <div className="hidden xl:flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Globe className="w-4 h-4" />
              <span>{t.nav.language}</span>
            </div>
            <select
              aria-label={t.nav.language}
              value={language}
              onChange={(e) => handleChangeLanguage(e.target.value as Language)}
              className="px-2.5 py-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900 text-xs font-medium cursor-pointer"
            >
              {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleToggleTheme}
            className="w-full min-h-[42px] px-3 rounded-2xl flex items-center justify-center xl:justify-start gap-3 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            <span className="hidden xl:inline text-sm whitespace-nowrap">
              {theme === 'dark' ? t.nav.lightMode : t.nav.darkMode}
            </span>
          </button>

          <button
            type="button"
            onClick={() => signOut(auth)}
            className="w-full min-h-[42px] px-3 rounded-2xl flex items-center justify-center xl:justify-start gap-3 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="hidden xl:inline text-sm whitespace-nowrap">{t.nav.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Compact Translucent iOS Top Bar (Home & Notifications) */}
      {showMobileTopHeader && (
        <header className="md:hidden sticky top-0 z-30 h-[54px] px-4 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl backdrop-saturate-150 border-b border-zinc-200/70 dark:border-zinc-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleHomeNavClick}
            className="flex items-center gap-2 cursor-pointer"
          >
            <SnapTopLogo size={26} />
            <span className="font-display text-lg font-bold tracking-[-0.02em]">{t.appName}</span>
          </button>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              aria-label={t.nav.notifications}
              className="relative min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 min-w-0 ${isFullBleedMobileTab ? 'pb-[58px] md:pb-0' : 'pb-20 md:pb-6'}`}>
        {activeTab === 'home' && (
          <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 max-w-[600px] w-full mx-auto">
              <PullToRefresh
                onRefresh={handleRefreshFeed}
                externalRefreshSignal={homeRefreshSignal}
                labels={{
                  pull: t.feed.pullToRefresh,
                  release: t.feed.releaseToRefresh,
                  refreshing: t.feed.refreshingFeed,
                  updated: t.feed.feedUpdated,
                }}
              >
                <StoryBar
                  currentProfile={currentProfile}
                  stories={allStories}
                  language={language}
                  viewedStoryIds={viewedStoryIds}
                  onAddStory={() => setCreateModalMode('story')}
                  onOpenStory={(authorId) => setStoryAuthorId(authorId)}
                />

                {activeHashtag && activeTopicLabel && (
                  <div className="rounded-2xl border border-violet-200/80 dark:border-violet-800/60 bg-violet-50/70 dark:bg-violet-950/30 px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs min-w-0">
                      <span className="text-zinc-500 dark:text-zinc-400">{t.feed.filteringBy}</span>
                      <span className="font-semibold text-violet-700 dark:text-violet-300 truncate">
                        #{activeTopicLabel}
                      </span>
                      <span aria-hidden="true" className="text-zinc-400">·</span>
                      <span className="text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                        {feedPosts.length} {feedPosts.length === 1 ? t.feed.postSingular : t.feed.postPlural}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveHashtag(null)}
                      className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t.feed.clearFilter}</span>
                    </button>
                  </div>
                )}

                {feedPosts.length === 0 ? (
                  <div className="rounded-[26px] border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-10 text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-violet-600/15 to-pink-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                      {t.feed.noPostsYet}
                    </p>
                    <button
                      type="button"
                      onClick={() => (activeHashtag ? setActiveHashtag(null) : setCreateModalMode('post'))}
                      className="min-h-[44px] px-6 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm active:scale-[0.97] transition-all cursor-pointer"
                    >
                      {activeHashtag ? (
                        <span>{t.feed.clearFilter}</span>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>{t.feed.createFirstPost}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div>
                    {feedPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUid={currentProfile.uid}
                        language={language}
                        authorVerified={verifiedUserIds.has(post.authorId)}
                        isLiked={likedPostIds.has(post.id)}
                        isSaved={savedPostMap.has(post.id)}
                        isFollowing={followingIds.has(post.authorId)}
                        onToggleLike={handleToggleLike}
                        onToggleSave={handleToggleSave}
                        onToggleFollow={handleToggleFollow}
                        onOpenComments={(p) => setCommentsPost(p)}
                        onOpenShare={(p) => setSharePost(p)}
                        onOpenProfile={openProfile}
                        onAddInlineComment={handleAddComment}
                        onEditCaption={handleEditCaption}
                        onDeletePost={handleDeletePost}
                        onSelectHashtag={(tagKey) =>
                          setActiveHashtag((prev) => (prev === tagKey ? null : tagKey))
                        }
                      />
                    ))}
                  </div>
                )}
              </PullToRefresh>
            </div>

            {/* Desktop Right Panel */}
            <aside className="hidden lg:block lg:col-span-4 pt-2">
              <div className="sticky top-6 space-y-5">
                <div className="rounded-[24px] border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4 flex items-center justify-between gap-3 shadow-[0_2px_16px_-6px_rgba(0,0,0,0.04)]">
                  <button
                    type="button"
                    onClick={() => openProfile(currentProfile.uid)}
                    className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
                  >
                    <Avatar
                      src={currentProfile.avatarUrl}
                      alt={currentProfile.username}
                      name={currentProfile.displayName}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{currentProfile.username}</p>
                        {verifiedUserIds.has(currentProfile.uid) && (
                          <VerifiedBadge size="xs" label={t.profile.verified} />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {currentProfile.displayName}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateModalMode('post')}
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-semibold hover:opacity-95 active:scale-[0.97] transition-all whitespace-nowrap cursor-pointer"
                  >
                    {t.nav.create}
                  </button>
                </div>

                <TrendingTopicsCard
                  topics={trendingTopics}
                  activeHashtag={activeHashtag}
                  title={t.feed.trendingTopics}
                  postSingular={t.feed.postSingular}
                  postPlural={t.feed.postPlural}
                  emptyHint={t.feed.trendingEmpty}
                  clearLabel={t.feed.clearFilter}
                  onSelectHashtag={setActiveHashtag}
                />

                {otherCreators.length > 0 && (
                  <div className="rounded-[24px] border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4 space-y-3.5 shadow-[0_2px_16px_-6px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {t.feed.suggestedForYou}
                      </h2>
                    </div>

                    <div className="space-y-3">
                      {otherCreators.map((creator) => {
                        const isFollowing = followingIds.has(creator.uid);
                        return (
                          <div key={creator.uid} className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => openProfile(creator.uid)}
                              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                            >
                              <Avatar
                                src={creator.avatarUrl}
                                alt={creator.username}
                                name={creator.displayName}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 min-w-0">
                                  <p className="text-xs font-semibold truncate">{creator.username}</p>
                                  {verifiedUserIds.has(creator.uid) && (
                                    <VerifiedBadge size="xs" label={t.profile.verified} />
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                  {creator.displayName}
                                </p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleToggleFollow(
                                  creator.uid,
                                  creator.username,
                                  creator.avatarUrl
                                )
                              }
                              className={`text-xs font-semibold whitespace-nowrap cursor-pointer ${
                                isFollowing
                                  ? 'text-zinc-500 dark:text-zinc-400'
                                  : 'text-violet-600 dark:text-violet-400 hover:text-pink-500'
                              }`}
                            >
                              {isFollowing ? t.feed.following : t.feed.follow}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'reels' && (
          <ReelsView
            reels={allReels}
            currentUid={currentProfile.uid}
            language={language}
            verifiedUserIds={verifiedUserIds}
            likedPostIds={likedPostIds}
            savedPostIds={new Set(savedPostMap.keys())}
            followingIds={followingIds}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onToggleFollow={handleToggleFollow}
            onOpenComments={(p) => setCommentsPost(p)}
            onOpenShare={(p) => setSharePost(p)}
            onOpenProfile={openProfile}
            onUploadReel={() => setCreateModalMode('reel')}
            onSelectHashtag={(tagKey) => {
              setActiveHashtag(tagKey);
              setActiveTab('home');
            }}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesView
            currentProfile={currentProfile}
            creators={allCreators}
            followingIds={followingIds}
            notes={notes}
            language={language}
            activeConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
            onStartConversation={ensureConversation}
            onOpenProfile={openProfile}
            onOpenNoteModal={() => setNoteModalOpen(true)}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            language={language}
            onMarkRead={handleMarkNotifRead}
            onMarkAllRead={handleMarkAllNotifsRead}
            onOpenProfile={openProfile}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={displayedProfile}
            currentUid={currentProfile.uid}
            posts={allPosts}
            stories={allStories}
            savedPosts={savedPostsList}
            profileNote={notes.find((n) => n.userId === displayedProfile.uid) || null}
            isFollowing={followingIds.has(displayedProfile.uid)}
            unreadNotifications={unreadNotifications}
            language={language}
            theme={theme}
            onChangeLanguage={handleChangeLanguage}
            onToggleTheme={handleToggleTheme}
            onSignOut={() => signOut(auth)}
            onEditProfile={() => setEditingProfile(true)}
            onCreatePost={() => setCreateModalMode('post')}
            onAddStory={() => setCreateModalMode('story')}
            onOpenStory={(authorId) => setStoryAuthorId(authorId)}
            onOpenNoteModal={() => setNoteModalOpen(true)}
            onOpenNotifications={() => setActiveTab('notifications')}
            onBack={() => {
              setViewedProfileUid(null);
              setActiveTab('home');
            }}
            canManageVerification={isAppAdmin}
            onToggleVerified={handleToggleVerified}
            onToggleFollow={handleToggleFollow}
            onMessageUser={async (target) => {
              const id = await ensureConversation(target);
              setActiveConversationId(id);
              setActiveTab('messages');
            }}
            onOpenPost={(p) => setCommentsPost(p)}
          />
        )}
      </main>

      {/* Mobile iOS Frosted Bottom Tab Bar (58px, no Explore) */}
      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 z-30 h-[58px] backdrop-blur-xl backdrop-saturate-150 border-t grid grid-cols-5 items-center px-2 ${
          activeTab === 'reels'
            ? 'bg-black/90 border-zinc-800/80 text-white'
            : 'bg-white/90 dark:bg-zinc-950/90 border-zinc-200/70 dark:border-zinc-800/80'
        }`}
      >
        <button
          type="button"
          onClick={handleHomeNavClick}
          aria-label={t.nav.home}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'home'
              ? 'text-violet-600 dark:text-violet-400'
              : activeTab === 'reels'
                ? 'text-zinc-400'
                : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium truncate max-w-[60px]">{t.nav.home}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reels')}
          aria-label={t.nav.reels}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'reels'
              ? 'text-white'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Clapperboard className="w-5 h-5" />
          <span className="text-[10px] font-medium truncate max-w-[60px]">{t.nav.reels}</span>
        </button>

        <button
          type="button"
          onClick={() => setCreateModalMode('post')}
          aria-label={t.nav.create}
          className="min-h-[44px] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-violet-500/25">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          aria-label={t.nav.messages}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'messages'
              ? 'text-violet-600 dark:text-violet-400'
              : activeTab === 'reels'
                ? 'text-zinc-400'
                : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Send className="w-5 h-5" />
          <span className="text-[10px] font-medium truncate max-w-[60px]">{t.nav.messages}</span>
        </button>

        <button
          type="button"
          onClick={() => openProfile(currentProfile.uid)}
          aria-label={t.nav.profile}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'profile'
              ? 'text-violet-600 dark:text-violet-400'
              : activeTab === 'reels'
                ? 'text-zinc-400'
                : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Avatar
            src={currentProfile.avatarUrl}
            alt={currentProfile.username}
            name={currentProfile.displayName}
            size="xs"
          />
          <span className="text-[10px] font-medium truncate max-w-[60px]">{t.nav.profile}</span>
        </button>
      </nav>

      {/* App-Wide Uploading Toast Indicator */}
      <AnimatePresence>
        {uploadToast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            aria-live="polite"
            className="fixed top-[62px] md:top-5 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-[60] w-[calc(100%-2rem)] max-w-xs rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xl overflow-hidden pointer-events-none"
          >
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {uploadToast.status === 'done' ? (
                  <span className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </span>
                ) : (
                  <span className="w-7 h-7 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {uploadToast.status === 'done'
                      ? t.create.uploadComplete
                      : uploadToast.stage === 'optimizing'
                        ? t.create.optimizing
                        : t.create.publishing}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {uploadToast.mode === 'story'
                      ? t.create.storyTab
                      : uploadToast.mode === 'reel'
                        ? t.create.reelTab
                        : t.create.postTab}
                  </p>
                </div>
              </div>
              {uploadToast.status === 'uploading' && (
                <span className="text-xs font-semibold tabular-nums text-violet-600 dark:text-violet-400 shrink-0">
                  {Math.max(4, Math.round(uploadToast.progress))}%
                </span>
              )}
            </div>
            <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full transition-all duration-150 ${
                  uploadToast.status === 'done'
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500'
                }`}
                style={{ width: `${Math.max(4, uploadToast.progress)}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App-Wide Error Toast */}
      <AnimatePresence>
        {appError && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            role="alert"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] max-w-sm w-[calc(100%-2rem)] rounded-2xl bg-rose-600 text-white px-4 py-3 text-xs font-medium shadow-xl flex items-center justify-between gap-3"
          >
            <span className="truncate">{appError}</span>
            <button
              type="button"
              onClick={() => setAppError(null)}
              aria-label="Dismiss error"
              className="shrink-0 p-1 rounded-full hover:bg-white/20 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {createModalMode && (
        <CreateModal
          currentUid={currentProfile.uid}
          initialMode={createModalMode}
          language={language}
          onClose={() => setCreateModalMode(null)}
          onUploadStateChange={handleUploadStateChange}
          onPublish={handlePublish}
        />
      )}

      {storyAuthorId && (
        <StoryViewer
          stories={allStories}
          initialAuthorId={storyAuthorId}
          currentUid={currentProfile.uid}
          language={language}
          onClose={() => setStoryAuthorId(null)}
          onMarkViewed={(id) =>
            setViewedStoryIds((prev) => new Set(prev).add(id))
          }
          onReplyStory={handleReplyStory}
          onDeleteStory={handleDeleteStory}
          onOpenProfile={openProfile}
        />
      )}

      {commentsPost && (() => {
        const livePost = allPosts.find((p) => p.id === commentsPost.id) || commentsPost;
        return (
          <CommentsModal
            post={livePost}
            currentUid={currentProfile.uid}
            language={language}
            authorVerified={verifiedUserIds.has(livePost.authorId)}
            isLiked={likedPostIds.has(livePost.id)}
            isSaved={savedPostMap.has(livePost.id)}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onOpenShare={(p) => setSharePost(p)}
            onClose={() => setCommentsPost(null)}
            onAddComment={handleAddComment}
            onOpenProfile={openProfile}
          />
        );
      })()}

      {sharePost && (() => {
        const liveSharePost = allPosts.find((p) => p.id === sharePost.id) || sharePost;
        return (
          <ShareModal
            post={liveSharePost}
            creators={allCreators}
            currentUid={currentProfile.uid}
            language={language}
            onClose={() => setSharePost(null)}
            onSendPostToUser={handleSendPostToUser}
          />
        );
      })()}

      {editingProfile && (
        <EditProfileModal
          profile={currentProfile}
          language={language}
          onClose={() => setEditingProfile(false)}
          onSave={handleSaveProfile}
        />
      )}

      {noteModalOpen && (
        <NoteModal
          profile={currentProfile}
          existingNote={notes.find((n) => n.userId === currentProfile.uid)?.text || ''}
          language={language}
          onClose={() => setNoteModalOpen(false)}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
        />
      )}
    </div>
  );
}
