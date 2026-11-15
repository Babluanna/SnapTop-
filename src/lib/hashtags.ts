import type { PostItem } from '../types';

export interface TrendingTopic {
  key: string;
  tag: string;
  count: number;
  latestMs: number;
}

const HASHTAG_MATCH_RE = /(?:^|[\s(["'])#([\p{L}\p{N}_]{1,40})/gu;

export function extractHashtagsFromCaption(caption: string): string[] {
  if (!caption) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  HASHTAG_MATCH_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HASHTAG_MATCH_RE.exec(caption)) !== null) {
    const raw = match[1];
    const key = raw.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      tags.push(raw);
    }
  }
  return tags;
}

export function getTopTrendingTopics(posts: PostItem[], limit = 5): TrendingTopic[] {
  const map = new Map<
    string,
    { key: string; countsByCase: Map<string, number>; count: number; latestMs: number }
  >();

  for (const post of posts) {
    const tags = extractHashtagsFromCaption(post.caption);
    for (const rawTag of tags) {
      const key = rawTag.toLowerCase();
      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          countsByCase: new Map(),
          count: 0,
          latestMs: post.createdAtMs,
        };
        map.set(key, entry);
      }
      entry.count += 1;
      if (post.createdAtMs > entry.latestMs) {
        entry.latestMs = post.createdAtMs;
      }
      entry.countsByCase.set(rawTag, (entry.countsByCase.get(rawTag) || 0) + 1);
    }
  }

  const topics: TrendingTopic[] = [];
  map.forEach((entry) => {
    let bestTag = entry.key;
    let bestTagCount = -1;
    entry.countsByCase.forEach((c, variant) => {
      if (c > bestTagCount) {
        bestTagCount = c;
        bestTag = variant;
      }
    });
    topics.push({
      key: entry.key,
      tag: bestTag,
      count: entry.count,
      latestMs: entry.latestMs,
    });
  });

  topics.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.latestMs !== a.latestMs) return b.latestMs - a.latestMs;
    return a.key.localeCompare(b.key);
  });

  return topics.slice(0, limit);
}

export function postHasHashtag(caption: string, tagKey: string): boolean {
  if (!caption || !tagKey) return false;
  const normalized = tagKey.replace(/^#/, '').toLowerCase();
  return extractHashtagsFromCaption(caption).some((t) => t.toLowerCase() === normalized);
}
