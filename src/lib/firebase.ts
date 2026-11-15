import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
storage.maxUploadRetryTime = 5000;
storage.maxOperationRetryTime = 5000;
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Probe Storage availability once per session (fast 1s timeout so missing buckets never stall)
let storageAvailablePromise: Promise<boolean> | null = null;
function checkStorageAvailable(): Promise<boolean> {
  if (storageAvailablePromise) return storageAvailablePromise;
  storageAvailablePromise = (async () => {
    if (!firebaseConfig.storageBucket) return false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 1100);
    try {
      const res = await fetch(
        `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o?maxResults=1`,
        { method: 'GET', signal: controller.signal }
      );
      return res.status !== 404;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timer);
    }
  })();
  return storageAvailablePromise;
}
// Warm up probe quietly at startup
void checkStorageAvailable();

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}

function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mimeMatch = /data:([^;]+);/.exec(header || '');
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  return new Blob([base64ToUint8(b64 || '')], { type: mime });
}

export async function compressImageFile(
  file: File,
  options?: { maxDimension?: number; maxChars?: number }
): Promise<string> {
  const maxDimension = options?.maxDimension ?? 1080;
  const maxChars = options?.maxChars ?? 450000;

  if (file.type === 'image/svg+xml') {
    const raw = await readFileAsDataUrl(file);
    if (raw.length <= maxChars) return raw;
  }

  let width = 0;
  let height = 0;
  let source: CanvasImageSource;
  let cleanup: (() => void) | null = null;

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    source = bitmap;
    cleanup = () => bitmap.close();
  } else {
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not load selected image.'));
      el.src = objectUrl;
    });
    width = img.naturalWidth || img.width;
    height = img.naturalHeight || img.height;
    source = img;
    cleanup = () => URL.revokeObjectURL(objectUrl);
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(width || 1, height || 1));
    let targetW = Math.max(1, Math.round(width * scale));
    let targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return await readFileAsDataUrl(file);

    const mimeCandidates = ['image/webp', 'image/jpeg'];
    for (let shrink = 0; shrink < 3; shrink++) {
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(source, 0, 0, targetW, targetH);

      for (const mime of mimeCandidates) {
        for (const quality of [0.82, 0.68, 0.54, 0.42]) {
          const out = canvas.toDataURL(mime, quality);
          if (out.startsWith(`data:${mime}`) && out.length <= maxChars) {
            return out;
          }
        }
      }
      targetW = Math.max(240, Math.round(targetW * 0.72));
      targetH = Math.max(240, Math.round(targetH * 0.72));
    }

    return canvas.toDataURL('image/jpeg', 0.42).slice(0, maxChars);
  } finally {
    cleanup?.();
  }
}

// In-memory cache for resolved snaptop-media:// URLs
const resolvedMediaCache = new Map<string, string>();
const pendingMediaLoads = new Map<string, Promise<string>>();

const CHUNK_RAW_BYTES = 480 * 1024; // ~655KB base64 per chunk, well below 1MB Firestore doc limit
const MAX_CHUNKS = 120;
const MAX_VIDEO_BYTES = 55 * 1024 * 1024; // 55 MB ceiling when storing chunked in Firestore
const VIDEO_COMPRESS_THRESHOLD_BYTES = 12 * 1024 * 1024; // Auto-optimize videos above 12 MB

export type UploadStage = 'optimizing' | 'uploading';

async function compressVideoFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<File | null> {
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.playsInline = true;
  video.src = objectUrl;

  let audioCtx: AudioContext | null = null;
  let combinedStream: MediaStream | null = null;
  let rafId = 0;
  let pumpTimer = 0;

  const cleanup = () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (pumpTimer) window.clearInterval(pumpTimer);
    try {
      video.pause();
    } catch {
      // ignore
    }
    video.removeAttribute('src');
    video.load();
    if (combinedStream) {
      combinedStream.getTracks().forEach((track) => track.stop());
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      void audioCtx.close().catch(() => {});
    }
    URL.revokeObjectURL(objectUrl);
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Video metadata timeout')), 10000);
      video.onloadedmetadata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('Unsupported video format'));
      };
    });

    const duration = video.duration;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!Number.isFinite(duration) || duration <= 0 || !vw || !vh) {
      cleanup();
      return null;
    }

    // If already within Firestore ceiling and long (> 55s), upload directly in chunks instead of real-time re-encode wait
    if (file.size <= MAX_VIDEO_BYTES && duration > 55) {
      cleanup();
      return null;
    }

    // If too long to re-encode smoothly in real time while still exceeding ceiling
    if (duration > 240 && file.size > MAX_VIDEO_BYTES) {
      cleanup();
      return null;
    }

    const maxSide = duration > 60 || file.size > 60 * 1024 * 1024 ? 640 : 720;
    const scale = Math.min(1, maxSide / Math.max(vw, vh));
    const outW = Math.max(2, Math.floor((vw * scale) / 2) * 2);
    const outH = Math.max(2, Math.floor((vh * scale) / 2) * 2);

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof canvas.captureStream !== 'function') {
      cleanup();
      return null;
    }

    const canvasStream = canvas.captureStream(30);
    combinedStream = canvasStream;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        const audioTracks = dest.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
        }
      } else {
        video.muted = true;
      }
    } catch {
      video.muted = true;
    }

    const mimeCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ];
    const chosenMime =
      mimeCandidates.find((m) => {
        try {
          return MediaRecorder.isTypeSupported(m);
        } catch {
          return false;
        }
      }) || '';

    const targetBytes = Math.min(28 * 1024 * 1024, MAX_VIDEO_BYTES * 0.65);
    const audioBitsPerSecond = 96_000;
    const totalBps = Math.floor((targetBytes * 8) / Math.max(duration, 1));
    const videoBitsPerSecond = Math.max(380_000, Math.min(1_500_000, totalBps - audioBitsPerSecond));

    const recorderOptions: MediaRecorderOptions = chosenMime
      ? { mimeType: chosenMime, videoBitsPerSecond, audioBitsPerSecond }
      : { videoBitsPerSecond, audioBitsPerSecond };

    const recorder = new MediaRecorder(combinedStream, recorderOptions);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunks.push(ev.data);
      }
    };

    const stoppedPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const outType = chosenMime || recorder.mimeType || 'video/webm';
        resolve(new Blob(chunks, { type: outType }));
      };
      recorder.onerror = () => reject(new Error('Video compression failed'));
    });

    const drawFrame = () => {
      if (video.ended || video.paused) return;
      ctx.drawImage(video, 0, 0, outW, outH);
      onProgress?.(Math.min(99, Math.max(1, Math.round((video.currentTime / duration) * 100))));
      rafId = requestAnimationFrame(drawFrame);
    };

    recorder.start(250);
    video.currentTime = 0;
    await video.play();
    drawFrame();
    pumpTimer = window.setInterval(() => {
      if (!video.ended && !video.paused) {
        ctx.drawImage(video, 0, 0, outW, outH);
      }
    }, 66);

    await new Promise<void>((resolve, reject) => {
      const hardTimeout = window.setTimeout(
        () => reject(new Error('Video optimization timed out')),
        Math.max(45000, Math.ceil(duration * 1800) + 15000)
      );
      video.onended = () => {
        window.clearTimeout(hardTimeout);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(hardTimeout);
        reject(new Error('Video playback interrupted during optimization'));
      };
    });

    ctx.drawImage(video, 0, 0, outW, outH);
    onProgress?.(100);
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }

    const compressedBlob = await stoppedPromise;
    cleanup();

    if (compressedBlob.size === 0) return null;
    const ext = compressedBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'video';
    return new File([compressedBlob], `${baseName}_optimized.${ext}`, {
      type: compressedBlob.type || 'video/webm',
    });
  } catch {
    cleanup();
    return null;
  }
}

async function uploadVideoToFirestore(
  originalFile: File,
  uid: string,
  onProgress?: (percent: number, stage?: UploadStage) => void
): Promise<string> {
  let fileToUpload = originalFile;

  if (originalFile.size > VIDEO_COMPRESS_THRESHOLD_BYTES) {
    onProgress?.(4, 'optimizing');
    const compressed = await compressVideoFile(originalFile, (pct) => {
      onProgress?.(Math.max(4, Math.min(50, Math.round(pct * 0.5))), 'optimizing');
    });
    if (compressed && compressed.size < originalFile.size) {
      fileToUpload = compressed;
    }
  }

  if (fileToUpload.size > MAX_VIDEO_BYTES) {
    const mb = (fileToUpload.size / (1024 * 1024)).toFixed(1);
    const maxMb = Math.floor(MAX_VIDEO_BYTES / (1024 * 1024));
    throw new Error(
      `Video is ${mb} MB after optimization. Please choose a shorter clip under ${maxMb} MB.`
    );
  }

  // Tiny video clips fit cleanly in a single inline data URL
  if (fileToUpload.size <= 350 * 1024) {
    onProgress?.(70, 'uploading');
    const dataUrl = await readFileAsDataUrl(fileToUpload);
    if (dataUrl.length <= 520000) {
      onProgress?.(100, 'uploading');
      return dataUrl;
    }
  }

  const basePct = originalFile.size > VIDEO_COMPRESS_THRESHOLD_BYTES ? 52 : 10;
  onProgress?.(basePct, 'uploading');
  const buffer = await fileToUpload.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const totalChunks = Math.max(1, Math.ceil(bytes.length / CHUNK_RAW_BYTES));
  if (totalChunks > MAX_CHUNKS) {
    const mb = (fileToUpload.size / (1024 * 1024)).toFixed(1);
    const maxMb = Math.floor(MAX_VIDEO_BYTES / (1024 * 1024));
    throw new Error(`Video is ${mb} MB. Please choose a clip under ${maxMb} MB.`);
  }
  const mediaId = `med_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    await setDoc(doc(db, 'mediaFiles', mediaId), {
      id: mediaId,
      ownerId: uid,
      mimeType: (fileToUpload.type || 'video/mp4').slice(0, 100),
      totalChunks,
      visibility: 'public',
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `mediaFiles/${mediaId}`);
  }

  let completed = 0;
  const indices = Array.from({ length: totalChunks }, (_, i) => i);
  const CONCURRENCY = 6;

  for (let offset = 0; offset < indices.length; offset += CONCURRENCY) {
    const batchIndices = indices.slice(offset, offset + CONCURRENCY);
    await Promise.all(
      batchIndices.map(async (idx) => {
        const start = idx * CHUNK_RAW_BYTES;
        const end = Math.min(bytes.length, start + CHUNK_RAW_BYTES);
        const encoded = uint8ToBase64(bytes.subarray(start, end));
        const chunkId = `chunk_${idx}`;
        try {
          await setDoc(doc(db, `mediaFiles/${mediaId}/chunks`, chunkId), {
            mediaId,
            ownerId: uid,
            index: idx,
            data: encoded,
            visibility: 'public',
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `mediaFiles/${mediaId}/chunks/${chunkId}`);
        }
        completed += 1;
        const pct = Math.min(
          98,
          basePct + Math.round((completed / totalChunks) * (98 - basePct))
        );
        onProgress?.(pct, 'uploading');
      })
    );
  }

  const uri = `snaptop-media://${mediaId}`;
  resolvedMediaCache.set(uri, URL.createObjectURL(fileToUpload));
  onProgress?.(100, 'uploading');
  return uri;
}

export async function resolveMediaUrl(src: string): Promise<string> {
  if (!src || !src.startsWith('snaptop-media://')) return src;
  const cached = resolvedMediaCache.get(src);
  if (cached) return cached;

  const existingLoad = pendingMediaLoads.get(src);
  if (existingLoad) return existingLoad;

  const loadPromise = (async () => {
    const mediaId = src.slice('snaptop-media://'.length);
    try {
      const metaSnap = await getDoc(doc(db, 'mediaFiles', mediaId));
      const mimeType = metaSnap.exists() ? (metaSnap.data().mimeType as string) || 'video/mp4' : 'video/mp4';

      const chunksSnap = await getDocs(
        query(collection(db, `mediaFiles/${mediaId}/chunks`), where('visibility', '==', 'public'))
      );
      const sorted = chunksSnap.docs
        .map((d) => ({
          index: Number(d.data().index ?? 0),
          data: String(d.data().data ?? ''),
        }))
        .sort((a, b) => a.index - b.index);

      if (sorted.length === 0) {
        return '';
      }

      const byteParts = sorted.map((c) => base64ToUint8(c.data));
      const blob = new Blob(byteParts, { type: mimeType });
      if (blob.size === 0) {
        return '';
      }
      const blobUrl = URL.createObjectURL(blob);
      resolvedMediaCache.set(src, blobUrl);
      return blobUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
        try {
          handleFirestoreError(err, OperationType.LIST, `mediaFiles/${mediaId}/chunks`);
        } catch {
          // Logged via handleFirestoreError; return empty URL so UI falls back gracefully
        }
      }
      return '';
    } finally {
      pendingMediaLoads.delete(src);
    }
  })();

  pendingMediaLoads.set(src, loadPromise);
  return loadPromise;
}

export function useResolvedMediaState(src: string): {
  url: string;
  loading: boolean;
  error: boolean;
} {
  const [state, setState] = useState<{ url: string; loading: boolean; error: boolean }>(() => {
    if (!src) return { url: '', loading: false, error: true };
    if (!src.startsWith('snaptop-media://')) return { url: src, loading: false, error: false };
    const cached = resolvedMediaCache.get(src);
    return cached ? { url: cached, loading: false, error: false } : { url: '', loading: true, error: false };
  });

  useEffect(() => {
    if (!src) {
      setState({ url: '', loading: false, error: true });
      return;
    }
    if (!src.startsWith('snaptop-media://')) {
      setState({ url: src, loading: false, error: false });
      return;
    }
    const cached = resolvedMediaCache.get(src);
    if (cached) {
      setState({ url: cached, loading: false, error: false });
      return;
    }
    let cancelled = false;
    setState({ url: '', loading: true, error: false });
    void resolveMediaUrl(src)
      .then((url) => {
        if (!cancelled) {
          setState({ url, loading: false, error: !url });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ url: '', loading: false, error: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return state;
}

export function useResolvedMediaUrl(src: string): string {
  return useResolvedMediaState(src).url;
}

export async function uploadMediaFile(
  file: File,
  folder: string,
  uid: string,
  onProgress?: (percent: number, stage?: UploadStage) => void,
  options?: { precompressedDataUrl?: string; isAvatar?: boolean }
): Promise<string> {
  const isVideo = file.type.startsWith('video/');
  const isAvatar = Boolean(options?.isAvatar || folder === 'avatars');

  if (!isVideo) {
    onProgress?.(20, 'uploading');
    const dataUrl =
      options?.precompressedDataUrl ||
      (await compressImageFile(file, {
        maxDimension: isAvatar ? 320 : 1080,
        maxChars: isAvatar ? 120000 : 450000,
      }));
    onProgress?.(55, 'uploading');

    const hasStorage = await checkStorageAvailable();
    if (hasStorage) {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageRef = ref(storage, `${folder}/${uid}/${Date.now()}_${safeName}`);
        const blob = dataUrlToBlob(dataUrl);
        await uploadBytes(storageRef, blob, { contentType: blob.type });
        const url = await getDownloadURL(storageRef);
        onProgress?.(100, 'uploading');
        return url;
      } catch {
        // Fast fallback to compressed data URL so user publish never fails or hangs
      }
    }

    onProgress?.(100, 'uploading');
    return dataUrl;
  }

  const hasStorage = await checkStorageAvailable();
  if (hasStorage) {
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageRef = ref(storage, `${folder}/${uid}/${Date.now()}_${safeName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0 && onProgress) {
              onProgress(
                Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                'uploading'
              );
            }
          },
          (error) => reject(error),
          async () => {
            try {
              resolve(await getDownloadURL(uploadTask.snapshot.ref));
            } catch (err) {
              reject(err);
            }
          }
        );
      });
      return url;
    } catch {
      // Fall back to fast chunked Firestore upload with automatic compression
    }
  }

  return uploadVideoToFirestore(file, uid, onProgress);
}
