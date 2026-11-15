import React from 'react';
import { TrendingUp, X } from 'lucide-react';
import type { TrendingTopic } from '../lib/hashtags';

interface TrendingTopicsCardProps {
  topics: TrendingTopic[];
  activeHashtag: string | null;
  title: string;
  postSingular: string;
  postPlural: string;
  emptyHint: string;
  clearLabel: string;
  onSelectHashtag: (tagKey: string | null) => void;
}

export function TrendingTopicsCard({
  topics,
  activeHashtag,
  title,
  postSingular,
  postPlural,
  emptyHint,
  clearLabel,
  onSelectHashtag,
}: TrendingTopicsCardProps) {
  return (
    <div className="rounded-[24px] border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4 space-y-3 shadow-[0_2px_16px_-6px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
          <h2 className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">
            {title}
          </h2>
        </div>

        {activeHashtag && (
          <button
            type="button"
            onClick={() => onSelectHashtag(null)}
            className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5 whitespace-nowrap cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>{clearLabel}</span>
          </button>
        )}
      </div>

      {topics.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {emptyHint}
        </p>
      ) : (
        <div className="space-y-1">
          {topics.map((topic, index) => {
            const isSelected = activeHashtag === topic.key;
            return (
              <button
                key={topic.key}
                type="button"
                onClick={() => onSelectHashtag(isSelected ? null : topic.key)}
                className={`w-full px-2.5 py-2 rounded-2xl flex items-center justify-between gap-3 text-left transition-all active:scale-[0.98] cursor-pointer ${
                  isSelected
                    ? 'bg-violet-500/12 dark:bg-violet-500/18 text-violet-700 dark:text-violet-300'
                    : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-5 text-[11px] font-semibold tabular-nums shrink-0 ${
                      isSelected
                        ? 'text-violet-600 dark:text-violet-400'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-semibold truncate">#{topic.tag}</span>
                </div>

                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                  {topic.count} {topic.count === 1 ? postSingular : postPlural}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
