import React, { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { Language, PublicProfile } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Avatar } from './BrandMark';

interface NoteModalProps {
  profile: PublicProfile;
  existingNote: string;
  language: Language;
  onClose: () => void;
  onSaveNote: (text: string) => Promise<void>;
  onDeleteNote: () => Promise<void>;
}

export function NoteModal({
  profile,
  existingNote,
  language,
  onClose,
  onSaveNote,
  onDeleteNote,
}: NoteModalProps) {
  const t = TRANSLATIONS[language];
  const [text, setText] = useState(existingNote);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setText(existingNote);
  }, [existingNote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || saving) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSaveNote(clean.slice(0, 60));
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save note.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (saving) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onDeleteNote();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to clear note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={saving ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[28px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden"
      >
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200/70 dark:border-zinc-800">
          <h3 className="font-display text-base font-semibold">{t.notes.modalTitle}</h3>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Close note dialog"
            className="min-h-[36px] min-w-[36px] rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="flex flex-col items-center pt-6">
            <div className="relative">
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 min-w-[140px] max-w-[220px] px-3.5 py-2 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-md text-center">
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100 break-words leading-snug">
                  {text.trim() || t.notes.placeholder}
                </p>
              </div>
              <Avatar
                src={profile.avatarUrl}
                alt={profile.username}
                name={profile.displayName}
                size="xl"
              />
            </div>
            <p className="mt-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              @{profile.username}
            </p>
          </div>

          <div className="space-y-1.5">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={60}
              autoFocus
              placeholder={t.notes.placeholder}
              className="w-full min-h-[46px] px-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-950 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/70"
            />
            <p className="text-[11px] text-zinc-400 text-right tabular-nums">{text.length}/60</p>
          </div>

          {errorMsg && <p className="text-xs text-rose-600 dark:text-rose-400 text-center">{errorMsg}</p>}

          <div className="flex items-center gap-2">
            {existingNote && (
              <button
                type="button"
                disabled={saving}
                onClick={handleClear}
                className="min-h-[46px] px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.notes.clearNote}</span>
              </button>
            )}
            <button
              type="submit"
              disabled={!text.trim() || saving}
              className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? '...' : t.notes.saveNote}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
