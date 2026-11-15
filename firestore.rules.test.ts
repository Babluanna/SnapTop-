/**
 * SnapTop Firestore Security Rules Verification Suite (Dirty Dozen Adversarial Payloads)
 * Designed for execution against the Firebase Emulator Suite (`@firebase/rules-unit-testing`).
 */

export interface DirtyDozenCase {
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    name: '1. Ghost Field Injection (Shadow Update)',
    collectionPath: 'publicProfiles/u1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'u1', username: 'alice', isAdmin: true },
  },
  {
    name: '2. Identity Spoofing on Post',
    collectionPath: 'posts/p1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'p1', authorId: 'victim_uid', visibility: 'public' },
  },
  {
    name: '3. Unverified Email Write',
    collectionPath: 'posts/p2',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'p2', authorId: 'unverified_uid', visibility: 'public' },
  },
  {
    name: '4. PII Leak (Read Other Private User)',
    collectionPath: 'users/victim_uid',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Client-Delegated List Scrape on Private Users',
    collectionPath: 'users',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. ID Poisoning (Invalid Chars / Oversized Doc ID)',
    collectionPath: `posts/${'x'.repeat(300)}`,
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Client Timestamp Forgery',
    collectionPath: 'posts/p3',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'p3', authorId: 'u1', createdAt: '2020-01-01T00:00:00Z' },
  },
  {
    name: '8. Immutable Field Mutation (authorId)',
    collectionPath: 'posts/p1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { authorId: 'attacker_uid' },
  },
  {
    name: '9. Counter Manipulation Without Like Doc',
    collectionPath: 'posts/p1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { likesCount: 9999 },
  },
  {
    name: '10. Self-Follow Bypass',
    collectionPath: 'follows/u1_u1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { followerId: 'u1', followingId: 'u1' },
  },
  {
    name: '11. Message Injection into Foreign Conversation',
    collectionPath: 'conversations/c1/messages/m1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'm1', conversationId: 'c1', senderId: 'outsider', text: 'hijack' },
  },
  {
    name: '12. Oversized String / Resource Exhaustion',
    collectionPath: 'posts/p1/comments/c1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'c1', postId: 'p1', authorId: 'u1', text: 'a'.repeat(5000) },
  },
];
