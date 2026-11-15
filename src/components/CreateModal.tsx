import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Film, ImagePlus, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { compressImageFile, uploadMediaFile, type UploadStage } from '../lib/firebase';
import type { Language } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

export type CreateMode = 'post' | 'reel' | 'story';

export interface UploadProgressState {
  active: boolean;
  progress: number;
  mode: CreateMode;
  stage?: UploadStage;
  done?: boolean;
}

interface CreateModalProps {
  currentUid: string;
  initialMode?: CreateMode;
  language: Language;
  onClose: () => void;
  onUploadStateChange?: (state: UploadProgressState) => void;
  onPublish: (payload: {
    mode: CreateMode;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    caption: string;
    location: string;
    audioTitle: string;
  }) => Promise<void>;
}

const FILTER_STYLES: Record<string, string> = {
  Original: '',
  Vivid: 'saturate-125 contrast-105',
  Warm: 'sepia-[.18] saturate-110',
  Mono: 'grayscale contrast-110',
};

export function CreateModal({
  currentUid,
  initialMode = 'post',
  language,
  onClose,
  onUploadStateChange,
  onPublish,
}: CreateModalProps) {
  const t = TRANSLATIONS[language];
  const [mode, setMode] = useState<CreateMode>(initialMode);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [audioTitle, setAudioTitle] = useState('');
  const [filter, setFilter] = useState<string>('Original');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<UploadStage>('uploading');
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const compressedPromiseRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setUploadProgress(0);
    setUploadStage('uploading');
    setSelectedFile(file);
    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(file));

    if (!isVideo) {
      compressedPromiseRef.current = compressImageFile(file, {
        maxDimension: 1080,
        maxChars: 450000,
      }).catch(() => '');
    } else {
      compressedPromiseRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !previewUrl) {
      setErrorMsg('Please choose a photo or video to upload.');
      return;
    }

    setErrorMsg(null);
    setPublishing(true);
    const initialStage: UploadStage =
      mediaType === 'video' && selectedFile.size > 12 * 1024 * 1024 ? 'optimizing' : 'uploading';
    setUploadStage(initialStage);
    setUploadProgress(initialStage === 'optimizing' ? 4 : 12);
    onUploadStateChange?.({
      active: true,
      progress: initialStage === 'optimizing' ? 4 : 12,
      mode,
      stage: initialStage,
    });

    try {
      const precompressedDataUrl = compressedPromiseRef.current
        ? (await compressedPromiseRef.current) || undefined
        : undefined;

      const finalUrl = await uploadMediaFile(
        selectedFile,
        mode === 'story' ? 'stories' : 'posts',
        currentUid,
        (pct, stage) => {
          const nextStage = stage || 'uploading';
          setUploadStage(nextStage);
          setUploadProgress(pct);
          onUploadStateChange?.({ active: true, progress: pct, mode, stage: nextStage });
        },
        { precompressedDataUrl }
      );

      setUploadStage('uploading');
      setUploadProgress(96);
      onUploadStateChange?.({ active: true, progress: 96, mode, stage: 'uploading' });

      await onPublish({
        mode,
        mediaUrl: finalUrl,
        mediaType,
        caption: caption.trim(),
        location: location.trim(),
        audioTitle: audioTitle.trim() || (mode === 'reel' ? t.reels.originalAudio : ''),
      });
      setUploadProgress(100);
      onUploadStateChange?.({ active: false, progress: 100, mode, stage: 'uploading', done: true });
      onClose();
    } catch (err: unknown) {
      setUploadProgress(0);
      setUploadStage('uploading');
      onUploadStateChange?.({ active: false, progress: 0, mode, done: false });
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Upload failed. Please try a smaller photo or video.'
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={publishing ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] rounded-t-[28px] sm:rounded-[28px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* iOS Sheet Drag Handle (mobile) */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200/70 dark:border-zinc-800">
          <h3 className="font-display text-base font-semibold tracking-[-0.01em]">
            {t.create.modalTitle}
          </h3>
          <button
            type="button"
            disabled={publishing}
            onClick={onClose}
            aria-label="Close creator"
            className="min-h-[36px] min-w-[36px] rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* iOS Segmented Control */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80">
            {(['post', 'reel', 'story'] as CreateMode[]).map((tab) => (
              <button
                key={tab}
                type="button"
                disabled={publishing}
                onClick={() => setMode(tab)}
                className={`min-h-[36px] rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
                  mode === tab
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {tab === 'post' ? t.create.postTab : tab === 'reel' ? t.create.reelTab : t.create.storyTab}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800">
              <div className={mode === 'reel' || mode === 'story' ? 'aspect-[9/14] max-h-72 mx-auto' : 'aspect-square max-h-72 mx-auto'}>
                {mediaType === 'video' ? (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    className={`w-full h-full object-cover ${FILTER_STYLES[filter]}`}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Upload preview"
                    className={`w-full h-full object-cover ${FILTER_STYLES[filter]}`}
                  />
                )}
              </div>
              {!publishing && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewUrl('');
                    setSelectedFile(null);
                  }}
                  aria-label="Remove selected media"
                  className="absolute top-3 right-3 min-h-[34px] min-w-[34px] rounded-full bg-black/65 backdrop-blur-md text-white flex items-center justify-center hover:bg-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 p-9 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-violet-500 dark:hover:border-violet-400 bg-zinc-50/80 dark:bg-zinc-950/60 transition-colors cursor-pointer text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600/15 to-pink-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                {mode === 'reel' ? <Film className="w-6 h-6" /> : <ImagePlus className="w-6 h-6" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{t.create.uploadLabel}</p>
                <p className="text-xs text-zinc-500">{t.create.uploadHint}</p>
              </div>
              <span className="mt-1 px-4 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Browse device
              </span>
              <input
                type="file"
                accept={mode === 'reel' ? 'video/*,image/*' : 'image/*,video/*'}
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          {previewUrl && mediaType === 'image' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs font-medium text-zinc-500 shrink-0 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {t.create.filterLabel}
              </span>
              {Object.keys(FILTER_STYLES).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setFilter(name)}
                  className={`min-h-[32px] px-3.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    filter === name
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          <textarea
            rows={3}
            maxLength={mode === 'story' ? 200 : 2200}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t.create.captionPlaceholder}
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70 resize-none"
          />

          {mode !== 'story' && (
            <input
              type="text"
              maxLength={100}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t.create.locationPlaceholder}
              className="w-full min-h-[44px] px-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70"
            />
          )}

          {mode === 'reel' && (
            <input
              type="text"
              maxLength={120}
              value={audioTitle}
              onChange={(e) => setAudioTitle(e.target.value)}
              placeholder={t.create.audioPlaceholder}
              className="w-full min-h-[44px] px-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/70"
            />
          )}

          {publishing && (
            <div
              role="progressbar"
              aria-label={uploadStage === 'optimizing' ? t.create.optimizing : t.create.publishing}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(uploadProgress)}
              className="p-3 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/70 border border-zinc-200/70 dark:border-zinc-700/70 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                  <Loader2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 animate-spin" />
                  <span>{uploadStage === 'optimizing' ? t.create.optimizing : t.create.publishing}</span>
                </span>
                <span className="tabular-nums font-semibold text-violet-600 dark:text-violet-400">
                  {Math.max(4, Math.round(uploadProgress))}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-900 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 transition-all duration-150"
                  style={{ width: `${Math.max(4, uploadProgress)}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={publishing || !selectedFile}
            className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {publishing
              ? uploadProgress > 0 && uploadProgress < 100
                ? `${uploadStage === 'optimizing' ? t.create.optimizing : t.create.publishing} ${uploadProgress}%`
                : uploadStage === 'optimizing'
                  ? t.create.optimizing
                  : t.create.publishing
              : t.create.publishBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
