import React from 'react';
import { Plus } from 'lucide-react';
import type { Language, PublicProfile, StoryItem } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Avatar } from './BrandMark';

interface StoryBarProps {
  currentProfile: PublicProfile;
  stories: StoryItem[];
  language: Language;
  viewedStoryIds: Set<string>;
  onAddStory: () => void;
  onOpenStory: (authorId: string) => void;
}

export function StoryBar({
  currentProfile,
  stories,
  language,
  viewedStoryIds,
  onAddStory,
  onOpenStory,
}: StoryBarProps) {
  const t = TRANSLATIONS[language];

  // Group stories by author
  const authorsMap = new Map<string, StoryItem[]>();
  for (const s of stories) {
    const existing = authorsMap.get(s.authorId) || [];
    existing.push(s);
    authorsMap.set(s.authorId, existing);
  }

  const myStories = authorsMap.get(currentProfile.uid) || [];
  const otherAuthorGroups = Array.from(authorsMap.entries()).filter(
    ([authorId]) => authorId !== currentProfile.uid
  );

  return (
    <div className="w-full border-b border-zinc-100 dark:border-zinc-800/80 pb-4 pt-2">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar px-1">
        {/* Current user story slot */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => (myStories.length > 0 ? onOpenStory(currentProfile.uid) : onAddStory())}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
              aria-label={myStories.length > 0 ? t.feed.yourStory : t.feed.addStory}
            >
              <Avatar
                src={currentProfile.avatarUrl}
                alt={currentProfile.username}
                name={currentProfile.displayName}
                size="lg"
                hasStory={myStories.length > 0}
              />
            </button>
            <button
              type="button"
              onClick={onAddStory}
              aria-label={t.feed.addStory}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-gradient-to-tr from-violet-600 to-pink-500 text-white border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
          <span className="text-xs text-zinc-700 dark:text-zinc-300 max-w-[72px] truncate">
            {t.feed.yourStory}
          </span>
        </div>

        {/* Other creators' stories */}
        {otherAuthorGroups.map(([authorId, group]) => {
          const lead = group[0];
          const allViewed = group.every((g) => viewedStoryIds.has(g.id));
          return (
            <button
              key={authorId}
              type="button"
              onClick={() => onOpenStory(authorId)}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus-visible:outline-none cursor-pointer"
            >
              <div
                className={`p-[2.5px] rounded-full transition-transform duration-150 group-hover:scale-[1.03] ${
                  allViewed
                    ? 'bg-zinc-300 dark:bg-zinc-700'
                    : 'bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-pink-500'
                }`}
              >
                <div className="p-[2px] rounded-full bg-white dark:bg-zinc-950">
                  <Avatar
                    src={lead.authorAvatar}
                    alt={lead.authorUsername}
                    name={lead.authorUsername}
                    size="lg"
                  />
                </div>
              </div>
              <span className="text-xs text-zinc-800 dark:text-zinc-200 max-w-[74px] truncate">
                {lead.authorUsername}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
