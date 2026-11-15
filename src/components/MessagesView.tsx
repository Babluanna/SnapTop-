import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { ArrowLeft, Plus, Search, Send, SquarePen } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { ConversationItem, Language, MessageItem, NoteItem, PublicProfile } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Avatar, formatRelativeTime } from './BrandMark';

interface MessagesViewProps {
  currentProfile: PublicProfile;
  creators: PublicProfile[];
  followingIds: Set<string>;
  notes: NoteItem[];
  language: Language;
  activeConversationId: string | null;
  onSelectConversation: (convId: string | null) => void;
  onStartConversation: (otherUser: PublicProfile) => Promise<string>;
  onOpenProfile: (uid: string) => void;
  onOpenNoteModal: () => void;
}

export function MessagesView({
  currentProfile,
  creators,
  followingIds,
  notes,
  language,
  activeConversationId,
  onSelectConversation,
  onStartConversation,
  onOpenProfile,
  onOpenNoteModal,
}: MessagesViewProps) {
  const t = TRANSLATIONS[language];
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'following' | 'unread'>('all');
  const [showNewChat, setShowNewChat] = useState(false);
  const [startingUid, setStartingUid] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const path = 'conversations';
    const q = query(
      collection(db, path),
      where('participantIds', 'array-contains', currentProfile.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ConversationItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            participantIds: data.participantIds,
            participantA: data.participantA,
            participantB: data.participantB,
            participantAName: data.participantAName,
            participantAAvatar: data.participantAAvatar,
            participantBName: data.participantBName,
            participantBAvatar: data.participantBAvatar,
            lastMessage: data.lastMessage || '',
            lastSenderId: data.lastSenderId,
            updatedAtMs: data.updatedAt?.toMillis?.() || Date.now(),
          };
        });
        list.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
        setConversations(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, path);
        } catch (logged) {
          setErrorMsg(logged instanceof Error ? logged.message : 'Unable to load conversations.');
        }
      }
    );
    return unsub;
  }, [currentProfile.uid]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    const path = `conversations/${activeConversationId}/messages`;
    const q = query(
      collection(db, path),
      where('participantIds', 'array-contains', currentProfile.uid)
    );
    let scrollTimer: number | undefined;
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: MessageItem[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              conversationId: data.conversationId,
              senderId: data.senderId,
              participantIds: data.participantIds,
              text: data.text,
              sharedPostId: data.sharedPostId || '',
              createdAtMs: data.createdAt?.toMillis?.() || Date.now(),
            };
          })
          .sort((a, b) => a.createdAtMs - b.createdAtMs);
        setMessages(list);
        if (scrollTimer !== undefined) window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(
          () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
          60
        );
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, path);
        } catch (logged) {
          setErrorMsg(logged instanceof Error ? logged.message : 'Unable to load messages.');
        }
      }
    );
    return () => {
      if (scrollTimer !== undefined) window.clearTimeout(scrollTimer);
      unsub();
    };
  }, [activeConversationId, currentProfile.uid]);

  const activeConv = conversations.find((c) => c.id === activeConversationId) || null;

  const getOtherParty = (conv: ConversationItem) => {
    const isA = conv.participantA === currentProfile.uid;
    return {
      uid: isA ? conv.participantB : conv.participantA,
      name: isA ? conv.participantBName : conv.participantAName,
      avatar: isA ? conv.participantBAvatar : conv.participantAAvatar,
    };
  };

  const myNote = useMemo(
    () => notes.find((n) => n.userId === currentProfile.uid) || null,
    [notes, currentProfile.uid]
  );

  const notesByUid = useMemo(() => {
    const map = new Map<string, NoteItem>();
    notes.forEach((n) => map.set(n.userId, n));
    return map;
  }, [notes]);

  const noteStripCreators = useMemo(() => {
    const others = creators.filter((c) => c.uid !== currentProfile.uid);
    return others.sort((a, b) => {
      const aHasNote = notesByUid.has(a.uid) ? 1 : 0;
      const bHasNote = notesByUid.has(b.uid) ? 1 : 0;
      if (aHasNote !== bHasNote) return bHasNote - aHasNote;
      const aFollow = followingIds.has(a.uid) ? 1 : 0;
      const bFollow = followingIds.has(b.uid) ? 1 : 0;
      return bFollow - aFollow;
    });
  }, [creators, currentProfile.uid, notesByUid, followingIds]);

  const unreadInboxCount = useMemo(
    () =>
      conversations.filter(
        (c) => Boolean(c.lastMessage) && c.lastSenderId !== currentProfile.uid
      ).length,
    [conversations, currentProfile.uid]
  );

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((conv) => {
      const other = getOtherParty(conv);
      const matchesQuery =
        !q ||
        other.name.toLowerCase().includes(q) ||
        conv.lastMessage.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (filterMode === 'following') return followingIds.has(other.uid);
      if (filterMode === 'unread') {
        return Boolean(conv.lastMessage) && conv.lastSenderId !== currentProfile.uid;
      }
      return true;
    });
  }, [conversations, searchQuery, filterMode, followingIds, currentProfile.uid]);

  const peopleCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return creators
      .filter((c) => c.uid !== currentProfile.uid)
      .filter(
        (c) =>
          !q ||
          c.username.toLowerCase().includes(q) ||
          c.displayName.toLowerCase().includes(q)
      );
  }, [creators, currentProfile.uid, searchQuery]);

  const openChatWith = async (person: PublicProfile) => {
    if (startingUid) return;
    setStartingUid(person.uid);
    setErrorMsg(null);
    try {
      const id = await onStartConversation(person);
      onSelectConversation(id);
      setShowNewChat(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to start conversation.');
    } finally {
      setStartingUid(null);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !draft.trim() || sending) return;
    const text = draft.trim().slice(0, 1000);
    setSending(true);
    setErrorMsg(null);
    const other = getOtherParty(activeConv);
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, `conversations/${activeConv.id}/messages`, msgId), {
        id: msgId,
        conversationId: activeConv.id,
        senderId: currentProfile.uid,
        participantIds: activeConv.participantIds,
        text,
        sharedPostId: '',
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, 'conversations', activeConv.id), {
        lastMessage: text,
        lastSenderId: currentProfile.uid,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientId: other.uid,
        actorId: currentProfile.uid,
        actorUsername: currentProfile.username,
        actorAvatar: (currentProfile.avatarUrl || '').slice(0, 150000),
        type: 'message',
        postId: '',
        postThumb: '',
        text: text.slice(0, 140),
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setDraft('');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `conversations/${activeConv.id}/messages`);
      } catch (logged) {
        setErrorMsg(logged instanceof Error ? logged.message : 'Unable to send message.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100dvh-112px)] md:h-[calc(100dvh-24px)] md:py-4 px-0 md:px-4">
      <div className="h-full rounded-none md:rounded-[28px] border-0 md:border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 md:bg-white/95 md:dark:bg-zinc-900/95 backdrop-blur-xl shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12 relative">
        {/* Left Thread List (Screenshot 3 iOS Style) */}
        <aside
          className={`md:col-span-5 lg:col-span-4 border-r border-zinc-200/70 dark:border-zinc-800/70 flex flex-col min-h-0 relative ${
            activeConversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Inbox Header */}
          <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-tight truncate">
              {currentProfile.username}
            </h2>
            <button
              type="button"
              onClick={() => setShowNewChat((s) => !s)}
              aria-label={t.messages.newChat}
              className="min-h-[40px] min-w-[40px] rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 cursor-pointer"
            >
              <SquarePen className="w-5 h-5" />
            </button>
          </div>

          {/* Rounded iOS Search Bar */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.messages.searchConversations}
                className="w-full min-h-[40px] pl-10 pr-4 rounded-full bg-zinc-100 dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
              />
            </div>
          </div>

          {/* Horizontal Notes & Active Creators Strip */}
          {!showNewChat && (
            <div className="px-4 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/70 overflow-x-auto no-scrollbar">
              <div className="flex items-start gap-4">
                {/* Current User Note */}
                <button
                  type="button"
                  onClick={onOpenNoteModal}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] group cursor-pointer"
                >
                  <div className="relative">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 max-w-[78px] px-2.5 py-1 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-sm">
                      <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200 truncate">
                        {myNote ? myNote.text : t.notes.addNote}
                      </p>
                    </div>
                    <Avatar
                      src={currentProfile.avatarUrl}
                      alt={currentProfile.username}
                      name={currentProfile.displayName}
                      size="md"
                      className="!w-14 !h-14"
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-full">
                    {t.notes.yourNote}
                  </span>
                </button>

                {/* Other Creators & Their Notes */}
                {noteStripCreators.slice(0, 12).map((person) => {
                  const note = notesByUid.get(person.uid);
                  const isFollowing = followingIds.has(person.uid);
                  return (
                    <button
                      key={person.uid}
                      type="button"
                      onClick={() => void openChatWith(person)}
                      disabled={startingUid === person.uid}
                      className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] group cursor-pointer"
                    >
                      <div className="relative">
                        {note && (
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 max-w-[78px] px-2.5 py-1 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-sm">
                            <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-100 truncate">
                              {note.text}
                            </p>
                          </div>
                        )}
                        <Avatar
                          src={person.avatarUrl}
                          alt={person.username}
                          name={person.displayName}
                          size="md"
                          className="!w-14 !h-14 group-hover:scale-[1.03] transition-transform"
                        />
                        {isFollowing && (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate max-w-full">
                        {person.displayName.split(' ')[0] || person.username}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Pills Row (Screenshot 3 Style) */}
          {!showNewChat && (
            <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-zinc-100 dark:border-zinc-800/70">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`min-h-[34px] px-3.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
                }`}
              >
                {t.messages.filterAll}
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('following')}
                className={`min-h-[34px] px-3.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  filterMode === 'following'
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
                }`}
              >
                {t.messages.filterFollowing}
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unread')}
                className={`min-h-[34px] px-3.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  filterMode === 'unread'
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
                }`}
              >
                {unreadInboxCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                )}
                <span>{t.messages.filterUnread}</span>
                {unreadInboxCount > 0 && (
                  <span className="tabular-nums opacity-80">{unreadInboxCount}</span>
                )}
              </button>
            </div>
          )}

          {/* New Chat People Picker */}
          {showNewChat && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="flex items-center justify-between px-2 pb-1">
                <p className="text-xs font-semibold text-zinc-500">{t.messages.newChat}</p>
                <button
                  type="button"
                  onClick={() => setShowNewChat(false)}
                  className="text-xs font-semibold text-violet-600 dark:text-violet-400 cursor-pointer"
                >
                  {t.feed.cancel}
                </button>
              </div>
              {peopleCandidates.map((person) => (
                <button
                  key={person.uid}
                  type="button"
                  disabled={startingUid === person.uid}
                  onClick={() => void openChatWith(person)}
                  className="w-full p-2.5 rounded-2xl flex items-center gap-3 hover:bg-zinc-100/80 dark:hover:bg-zinc-900 text-left transition-colors cursor-pointer"
                >
                  <Avatar
                    src={person.avatarUrl}
                    alt={person.username}
                    name={person.displayName}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{person.displayName}</p>
                    <p className="text-xs text-zinc-500 truncate">@{person.username}</p>
                  </div>
                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                    {t.profile.message}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Conversation List */}
          {!showNewChat && (
            <div className="flex-1 overflow-y-auto">
              {errorMsg && !activeConv && (
                <p className="mx-4 mt-2 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30">
                  {errorMsg}
                </p>
              )}

              {filteredConversations.length === 0 ? (
                <div className="p-5 text-center space-y-3">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {t.messages.emptyInbox}
                  </p>
                  <div className="pt-1 space-y-1.5 text-left">
                    {peopleCandidates.slice(0, 4).map((person) => (
                      <button
                        key={person.uid}
                        type="button"
                        disabled={startingUid === person.uid}
                        onClick={() => void openChatWith(person)}
                        className="w-full p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800 flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                      >
                        <Avatar
                          src={person.avatarUrl}
                          alt={person.username}
                          name={person.displayName}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{person.displayName}</p>
                          <p className="text-xs text-zinc-500 truncate">@{person.username}</p>
                        </div>
                        <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                          {t.profile.message}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-1">
                  {filteredConversations.map((conv) => {
                    const other = getOtherParty(conv);
                    const selected = conv.id === activeConversationId;
                    const isUnread =
                      Boolean(conv.lastMessage) && conv.lastSenderId !== currentProfile.uid;
                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => onSelectConversation(conv.id)}
                        className={`w-full px-4 py-3 flex items-center gap-3.5 text-left transition-colors cursor-pointer ${
                          selected
                            ? 'bg-violet-50/70 dark:bg-violet-950/30'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <Avatar
                            src={other.avatar}
                            alt={other.name}
                            name={other.name}
                            size="md"
                            className="!w-13 !h-13"
                          />
                          {followingIds.has(other.uid) && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm truncate ${
                              isUnread ? 'font-bold text-zinc-900 dark:text-white' : 'font-semibold'
                            }`}
                          >
                            {other.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs mt-0.5">
                            <span
                              className={`truncate ${
                                isUnread
                                  ? 'font-semibold text-zinc-800 dark:text-zinc-200'
                                  : 'text-zinc-500 dark:text-zinc-400'
                              }`}
                            >
                              {conv.lastMessage || t.messages.tapToChat}
                            </span>
                            <span aria-hidden="true" className="text-zinc-400 shrink-0">
                              ·
                            </span>
                            <span className="text-zinc-400 shrink-0 tabular-nums">
                              {formatRelativeTime(conv.updatedAtMs)}
                            </span>
                          </div>
                        </div>
                        {isUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-violet-600 dark:bg-violet-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Mobile Floating Compose Button (Screenshot 3 Corner Action) */}
          {!showNewChat && (
            <button
              type="button"
              onClick={() => setShowNewChat(true)}
              aria-label={t.messages.newChat}
              className="md:hidden absolute bottom-4 right-4 w-13 h-13 rounded-2xl bg-zinc-100/95 dark:bg-zinc-800/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700 shadow-lg flex items-center justify-center text-zinc-900 dark:text-white active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </aside>

        {/* Right Active Chat */}
        <section
          className={`md:col-span-7 lg:col-span-8 flex flex-col min-h-0 ${
            activeConversationId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConv ? (
            <>
              {(() => {
                const other = getOtherParty(activeConv);
                const otherCreator = creators.find((c) => c.uid === other.uid);
                return (
                  <div className="px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectConversation(null)}
                      aria-label="Back to inbox"
                      className="md:hidden min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-transform cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenProfile(other.uid)}
                      className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                    >
                      <Avatar src={other.avatar} alt={other.name} name={other.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{other.name}</p>
                        {otherCreator && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            @{otherCreator.username}
                          </p>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })()}

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {messages.map((msg) => {
                  const isMine = msg.senderId === currentProfile.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[78%] px-4 py-2.5 rounded-[20px] text-sm leading-relaxed ${
                          isMine
                            ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white rounded-br-md shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md'
                        }`}
                      >
                        <p className="break-words">{msg.text}</p>
                        <span
                          className={`block text-[10px] mt-1 ${
                            isMine ? 'text-white/75 text-right' : 'text-zinc-400'
                          }`}
                        >
                          {formatRelativeTime(msg.createdAtMs)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {errorMsg && (
                <p className="px-4 py-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 border-t border-rose-200/70 dark:border-rose-800/60">
                  {errorMsg}
                </p>
              )}

              <form
                onSubmit={handleSend}
                className="p-3 border-t border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl flex items-center gap-2"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={1000}
                  placeholder={t.messages.typeMessage}
                  className="flex-1 min-h-[44px] px-4 rounded-full border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-100/80 dark:bg-zinc-900/80 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  aria-label={t.messages.send}
                  className="min-h-[44px] px-5 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.97] transition-transform shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.messages.send}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-violet-600/15 to-pink-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                <Send className="w-7 h-7" />
              </div>
              <h3 className="font-display text-lg font-bold tracking-tight">
                {t.messages.selectConversation}
              </h3>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
                {t.messages.selectConversationHint}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
