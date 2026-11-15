import React, { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { compressImageFile, uploadMediaFile } from '../lib/firebase';
import type { Language, PublicProfile } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Avatar } from './BrandMark';

interface EditProfileModalProps {
  profile: PublicProfile;
  language: Language;
  onClose: () => void;
  onSave: (updates: {
    displayName: string;
    username: string;
    bio: string;
    website: string;
    avatarUrl: string;
  }) => Promise<void>;
}

export function EditProfileModal({
  profile,
  language,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const t = TRANSLATIONS[language];
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [website, setWebsite] = useState(profile.website);
  const [avatarUrl] = useState(profile.avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState(profile.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const compressedAvatarRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    return () => {
      if (previewAvatar.startsWith('blob:')) {
        URL.revokeObjectURL(previewAvatar);
      }
    };
  }, [previewAvatar]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setAvatarFile(file);
    setPreviewAvatar(URL.createObjectURL(file));
    compressedAvatarRef.current = compressImageFile(file, {
      maxDimension: 320,
      maxChars: 120000,
    }).catch(() => '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (cleanUser.length < 2) {
      setErrorMsg('Username must be at least 2 characters (letters, numbers, . or _).');
      return;
    }
    if (!displayName.trim()) {
      setErrorMsg('Display name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      let nextAvatar = avatarUrl;
      if (avatarFile) {
        try {
          const precompressedDataUrl = compressedAvatarRef.current
            ? (await compressedAvatarRef.current) || undefined
            : undefined;
          nextAvatar = await uploadMediaFile(avatarFile, 'avatars', profile.uid, undefined, {
            precompressedDataUrl,
            isAvatar: true,
          });
        } catch (avatarErr: unknown) {
          setErrorMsg(
            avatarErr instanceof Error
              ? avatarErr.message
              : 'Could not process avatar image. Please choose a smaller photo.'
          );
          setSaving(false);
          return;
        }
      }
      await onSave({
        displayName: displayName.trim().slice(0, 60),
        username: cleanUser.slice(0, 30),
        bio: bio.trim().slice(0, 240),
        website: website.trim().slice(0, 200),
        avatarUrl: nextAvatar,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden"
      >
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200/70 dark:border-zinc-800">
          <h3 className="font-display text-base font-semibold">{t.profile.editProfile}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit profile"
            className="min-h-[36px] min-w-[36px] rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={previewAvatar} alt={username} name={displayName} size="lg" />
            <label className="min-h-[38px] px-4 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer hover:opacity-90">
              <Camera className="w-4 h-4" />
              <span>{t.profile.changeAvatar}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              {t.profile.displayName}
            </label>
            <input
              type="text"
              required
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full min-h-[44px] px-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              {t.profile.username}
            </label>
            <input
              type="text"
              required
              maxLength={30}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full min-h-[44px] px-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              {t.profile.bio}
            </label>
            <textarea
              rows={3}
              maxLength={240}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              {t.profile.website}
            </label>
            <input
              type="text"
              maxLength={200}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="yourportfolio.com"
              className="w-full min-h-[44px] px-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70"
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-600 dark:text-rose-400">{errorMsg}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[46px] rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          >
            {saving ? '...' : t.profile.saveProfile}
          </button>
        </form>
      </div>
    </div>
  );
}
