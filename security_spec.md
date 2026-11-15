# SnapTop Security Specification

## 1. Data Invariants
1. **PII Isolation**: Private user emails and preferences live in `/users/{userId}` and are strictly unreadable and unlistable by any user other than `userId == request.auth.uid`. Public profiles in `/publicProfiles/{userId}` never store emails, phones, or addresses.
2. **Author Integrity**: Posts, reels, stories, comments, likes, saves, follows, notifications, and messages MUST bind their creator/sender/actor field strictly to `request.auth.uid`.
3. **Master Gate & Existence Checks**: Comments under `/posts/{postId}/comments/{commentId}` require the parent post to exist. Messages under `/conversations/{conversationId}/messages/{messageId}` require the parent conversation to exist and the sender to be one of the two bounded participants.
4. **Atomic Counter Synchronization**: Incrementing/decrementing `likesCount` on `/posts/{postId}` requires the corresponding `/postLikes/{postId}_{uid}` record to existAfter/not-existAfter in the same atomic batch. Follow/unfollow counter updates on `/publicProfiles/{userId}` require corresponding `/follows/{follower}_{following}` state via `existsAfter`.
5. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must match `request.time`; `createdAt` and creator IDs are immutable after creation.
6. **Bounded Arrays & String Limits**: Every string field enforces strict `.size()` bounds; `participantIds` in conversations/messages is strictly bounded to size 2.
7. **Query Enforcer**: Every `allow list` rule evaluates `resource.data` directly against `request.auth.uid` or `visibility == 'public'` without `get()` or `exists()` calls.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Ghost Field Injection (Shadow Update)**: `{ "uid": "u1", "username": "alice", "isAdmin": true }` on `/publicProfiles/u1`. Expected: `PERMISSION_DENIED`.
2. **Identity Spoofing on Post**: `{ "authorId": "victim_uid", ... }` by attacker `attacker_uid` on `/posts/p1`. Expected: `PERMISSION_DENIED`.
3. **Unverified Email Write**: Creating `/posts/p1` with `request.auth.token.email_verified == false`. Expected: `PERMISSION_DENIED`.
4. **PII Leak (Read Other User)**: `get(/users/victim_uid)` by `attacker_uid`. Expected: `PERMISSION_DENIED`.
5. **Client-Delegated List Scrape**: `list(/users)` or `list(/notifications)` without filtering by `recipientId == request.auth.uid`. Expected: `PERMISSION_DENIED`.
6. **ID Poisoning**: Creating `/posts/<1500-char-invalid-id!@#>` violating `isValidId()`. Expected: `PERMISSION_DENIED`.
7. **Client Timestamp Forgery**: Creating `/posts/p1` with `createdAt: Timestamp(2020-01-01)` instead of `request.time`. Expected: `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: Updating `authorId` or `createdAt` on an existing `/posts/p1`. Expected: `PERMISSION_DENIED`.
9. **Counter Manipulation Without Like Doc**: Updating `likesCount: 9999` on `/posts/p1` without a batched `/postLikes/{postId}_{uid}` write. Expected: `PERMISSION_DENIED`.
10. **Self-Follow Bypass**: Creating `/follows/u1_u1` where `followerId == followingId`. Expected: `PERMISSION_DENIED`.
11. **Message Injection into Foreign Conversation**: Creating `/conversations/c1/messages/m1` where `request.auth.uid` is not in parent `participantIds`. Expected: `PERMISSION_DENIED`.
12. **Oversized String / Denial of Wallet**: Creating a comment with 5,000 characters or `participantIds` with 50 items. Expected: `PERMISSION_DENIED`.
