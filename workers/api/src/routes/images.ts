/**
 * Image upload route — stores images in R2 and returns a public URL.
 */

import type { Env, User } from '../types';
import { errorResponse, jsonResponse } from '../utils';

/** Maximum upload size: 5 MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Allowed MIME types */
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
]);

/** Map MIME → extension */
function extForMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };
  return map[mime] ?? 'bin';
}

/**
 * POST /api/images
 * Accepts multipart/form-data with a single `file` field.
 * Stores the file in R2 and returns `{ url }`.
 */
export async function uploadImage(
  user: User,
  env: Env,
  request: Request,
): Promise<Response> {
  // Parse multipart body
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('Invalid multipart body', 400, env);
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return errorResponse('Missing "file" field', 400, env);
  }

  // Validate MIME type
  if (!ALLOWED_TYPES.has(file.type)) {
    return errorResponse(
      `Unsupported image type: ${file.type}. Allowed: ${[...ALLOWED_TYPES].join(', ')}`,
      415,
      env,
    );
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return errorResponse('File too large (5 MB max)', 413, env);
  }

  const ext = extForMime(file.type);
  const key = `${crypto.randomUUID()}.${ext}`;

  await env.IMAGES.put(key, file, {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedBy: user.id },
  });

  // Build public URL
  const publicBase =
    env.R2_PUBLIC_URL ??
    (env.ENVIRONMENT === 'production'
      ? 'https://assets.vizail.io'
      : `${new URL(request.url).origin}/r2`);
  const url = `${publicBase}/${key}`;

  return jsonResponse({ url }, 201, env);
}

/**
 * DELETE /api/images/:key
 * Removes an image from R2. Only the uploader can delete.
 */
export async function deleteImage(
  user: User,
  env: Env,
  key: string,
): Promise<Response> {
  // Validate the key is a simple filename (uuid.ext)
  if (!key || key.includes('/') || key.includes('..')) {
    return errorResponse('Invalid image key', 400, env);
  }

  const obj = await env.IMAGES.head(key);
  if (!obj) {
    return errorResponse('Image not found', 404, env);
  }

  // Authorization: only uploader or allow if no metadata (legacy)
  if (obj.customMetadata?.uploadedBy && obj.customMetadata.uploadedBy !== user.id) {
    return errorResponse('Forbidden', 403, env);
  }

  await env.IMAGES.delete(key);
  return jsonResponse({ ok: true }, 200, env);
}
