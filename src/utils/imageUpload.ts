/**
 * Image upload client — sends files to the /api/images endpoint
 * and returns a permanent R2 URL.
 *
 * Falls back to a data-URL when the API is unreachable (offline / local dev
 * without a worker running), so the canvas still works in fully local mode.
 */

import { logger } from './logger';

/** Resolve the API base the same way api/client.ts does */
function resolveApiBase(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname === 'vizail.com') {
    return '/api';
  }
  return 'http://localhost:62587/api';
}

export interface UploadResult {
  /** The permanent URL to use in ImageNode.src */
  url: string;
  /** Whether the URL is an R2 URL (true) or a data-URL fallback (false) */
  isRemote: boolean;
}

/**
 * Upload a File to R2 via the API worker.
 *
 * If the upload fails (e.g. offline, no worker), falls back to
 * readAsDataURL so the user can still work locally.
 */
export async function uploadImageFile(file: File): Promise<UploadResult> {
  const apiBase = resolveApiBase();

  try {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${apiBase}/images`, {
      method: 'POST',
      body: form,
      // Let browser set Content-Type with boundary automatically
      headers: import.meta.env.DEV ? { 'X-User-Email': 'dev@localhost' } : {},
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }

    const { url } = (await res.json()) as { url: string };
    return { url, isRemote: true };
  } catch (err) {
    logger.warn('Image upload failed, falling back to data URL', err);
    return new Promise<UploadResult>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, isRemote: false });
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
