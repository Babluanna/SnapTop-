export type Language = 'en' | 'hi' | 'te';
export type ThemeMode = 'light' | 'dark';
export type AppTab = 'home' | 'reels' | 'messages' | 'notifications' | 'profile';

export interface PublicProfile {
  uid: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  website: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isPublic: boolean;
  isVerified?: boolean;
  createdAtMs: number;
}

export interface PrivateUser {
  uid: string;
  email: string;
  language: Language;
  theme: ThemeMode;
}

export interface PostItem {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isReel: boolean;
  caption: string;
  location: string;
  audioTitle: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAtMs: number;
}

export interface CommentItem {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  text: string;
  createdAtMs: number;
}

export interface StoryItem {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  createdAtMs: number;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  actorId: string;
  actorUsername: string;
  actorAvatar: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'share';
  postId: string;
  postThumb: string;
  text: string;
  isRead: boolean;
  createdAtMs: number;
}

export interface ConversationItem {
  id: string;
  participantIds: [string, string];
  participantA: string;
  participantB: string;
  participantAName: string;
  participantAAvatar: string;
  participantBName: string;
  participantBAvatar: string;
  lastMessage: string;
  lastSenderId: string;
  updatedAtMs: number;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  participantIds: [string, string];
  text: string;
  sharedPostId: string;
  createdAtMs: number;
}

export interface NoteItem {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  text: string;
  createdAtMs: number;
  updatedAtMs: number;
}
