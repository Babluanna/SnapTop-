import React, { forwardRef, useEffect, useState } from 'react';
import { useResolvedMediaUrl } from '../lib/firebase';
import type { PublicProfile } from '../types';

/**
 * Unique minimalist SnapTop brand icon:
 * Clean geometric overlapping dual-lens / upward snap-ribbon mark in violet-to-pink gradient.
 */
export function SnapTopLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="snaptopPrism" x1="3" y1="33" x2="33" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="52%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="32" height="32" rx="9.5" fill="url(#snaptopPrism)" />
      {/* Simple stylized upward S-ribbon / snap crest */}
      <path
        d="M23.5 11.5H15.5C13.2909 11.5 11.5 13.2909 11.5 15.5C11.5 17.7091 13.2909 19.5 15.5 19.5H20.5C22.7091 19.5 24.5 21.2909 24.5 23.5C24.5 25.7091 22.7091 27.5 20.5 27.5H12.5"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 8.5L18 6L20.5 8.5"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface AvatarProps {
  src?: string;
  alt: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  hasStory?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-7 h-7 text-[11px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

export function Avatar({ src, alt, name, size = 'md', hasStory = false, className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = useResolvedMediaUrl(src || '');
  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);
  const initials = (name || alt || 'S').trim().slice(0, 2).toUpperCase();

  const inner = (
    <div
      className={`${SIZE_MAP[size]} rounded-full overflow-hidden bg-gradient-to-br from-violet-100 to-pink-100 dark:from-violet-950 dark:to-pink-950 flex items-center justify-center font-display font-semibold text-violet-700 dark:text-violet-200 shrink-0 ring-1 ring-black/5 dark:ring-white/10 ${className}`}
    >
      {resolvedSrc && !failed ? (
        <img
          src={resolvedSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );

  if (!hasStory) return inner;

  return (
    <div className="p-[2px] rounded-full bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-pink-500 shrink-0">
      <div className="p-[2px] rounded-full bg-white dark:bg-zinc-950">
        {inner}
      </div>
    </div>
  );
}

export function MediaWithFallback({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = useResolvedMediaUrl(src);
  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || failed) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200/70 dark:from-zinc-900 dark:to-zinc-800 text-zinc-500 dark:text-zinc-400 p-6 text-center ${className}`}>
        <SnapTopLogo size={36} />
        <p className="mt-2.5 text-xs font-medium truncate max-w-[200px]">{alt}</p>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export interface ResolvedVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
}

export const ResolvedVideo = forwardRef<HTMLVideoElement, ResolvedVideoProps>(
  function ResolvedVideo({ src, className = '', ...rest }, ref) {
    const resolvedSrc = useResolvedMediaUrl(src);

    if (!resolvedSrc) {
      return (
        <div className={`flex items-center justify-center bg-zinc-900 text-zinc-400 ${className}`}>
          <div className="w-6 h-6 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />
        </div>
      );
    }

    return <video ref={ref} src={resolvedSrc} className={className} {...rest} />;
  }
);

export function formatRelativeTime(ms: number): string {
  const diff = Math.max(0, Date.now() - ms);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(count);
}

export const VERIFIED_FOLLOWER_THRESHOLD = 1000;

export function isUserVerified(
  profile?: Pick<PublicProfile, 'followersCount' | 'isVerified'> | null
): boolean {
  if (!profile) return false;
  return Boolean(profile.isVerified) || (profile.followersCount ?? 0) >= VERIFIED_FOLLOWER_THRESHOLD;
}

export function VerifiedBadge({
  size = 'sm',
  label = 'Verified',
  className = '',
}: {
  size?: 'xs' | 'sm' | 'md';
  label?: string;
  className?: string;
}) {
  const px = size === 'xs' ? 14 : size === 'md' ? 18 : 16;
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 1.75L14.62 3.38L17.68 3.09L18.92 5.91L21.58 7.45L20.98 10.47L22.5 13.15L20.47 15.47L20.44 18.54L17.5 19.47L15.69 21.96L12.74 21.03L9.79 21.96L7.98 19.47L5.04 18.54L5.01 15.47L2.98 13.15L4.5 10.47L3.9 7.45L6.56 5.91L7.8 3.09L10.86 3.38L12 1.75Z"
          fill="#0095F6"
        />
        <path
          d="M9 12.2L11.1 14.3L15.5 9.8"
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
