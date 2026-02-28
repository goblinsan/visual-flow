import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadImage, deleteImage } from './images';
import type { Env, User } from '../types';

const testUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  created_at: 0,
  updated_at: 0,
};

function makeMockR2(): {
  bucket: R2Bucket;
  stored: Map<string, { body: ReadableStream; contentType: string; customMetadata: Record<string, string> }>;
} {
  const stored = new Map<string, { body: ReadableStream; contentType: string; customMetadata: Record<string, string> }>();
  const bucket = {
    put: vi.fn(async (key: string, body: ReadableStream, opts?: { httpMetadata?: { contentType: string }; customMetadata?: Record<string, string> }) => {
      stored.set(key, {
        body,
        contentType: opts?.httpMetadata?.contentType ?? 'application/octet-stream',
        customMetadata: opts?.customMetadata ?? {},
      });
    }),
    head: vi.fn(async (key: string) => {
      const entry = stored.get(key);
      if (!entry) return null;
      return { customMetadata: entry.customMetadata };
    }),
    delete: vi.fn(async (key: string) => {
      stored.delete(key);
    }),
  } as unknown as R2Bucket;
  return { bucket, stored };
}

function makeEnv(r2: R2Bucket): Env {
  return {
    DB: {} as D1Database,
    IMAGES: r2,
    ENVIRONMENT: 'test',
  } as Env;
}

/**
 * Build a Request whose .formData() returns a FormData containing the given File.
 * We override formData() directly because Node/jsdom doesn't round-trip
 * File objects through the multipart body correctly.
 */
function makeFileRequest(file: File): Request {
  const form = new FormData();
  form.append('file', file);
  const request = new Request('http://localhost/api/images', {
    method: 'POST',
    body: 'placeholder',
  });
  // Override formData to always resolve with our FormData
  vi.spyOn(request, 'formData').mockResolvedValue(form);
  return request;
}

describe('uploadImage', () => {
  let r2: ReturnType<typeof makeMockR2>;
  let env: Env;

  beforeEach(() => {
    r2 = makeMockR2();
    env = makeEnv(r2.bucket);
  });

  it('uploads a valid image and returns a URL', async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'photo.png', { type: 'image/png' });
    const request = makeFileRequest(file);

    const response = await uploadImage(testUser, env, request);
    const body = await response.json() as { url: string };

    expect(response.status).toBe(201);
    expect(body.url).toMatch(/\/r2\/[a-f0-9-]+\.png$/);
    expect(r2.stored.size).toBe(1);

    // Verify metadata
    const entry = [...r2.stored.values()][0];
    expect(entry.customMetadata.uploadedBy).toBe('user-1');
  });

  it('rejects non-image MIME types', async () => {
    const file = new File(['alert("xss")'], 'script.js', { type: 'application/javascript' });
    const request = makeFileRequest(file);

    const response = await uploadImage(testUser, env, request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(415);
    expect(body.error).toContain('Unsupported image type');
  });

  it('rejects files over 5 MB', async () => {
    // Create a ~6 MB buffer
    const bigBuffer = new Uint8Array(6 * 1024 * 1024);
    const file = new File([bigBuffer], 'huge.png', { type: 'image/png' });
    const request = makeFileRequest(file);

    const response = await uploadImage(testUser, env, request);
    expect(response.status).toBe(413);
  });

  it('rejects missing file field', async () => {
    const form = new FormData();
    const request = new Request('http://localhost/api/images', {
      method: 'POST',
      body: form,
    });

    const response = await uploadImage(testUser, env, request);
    expect(response.status).toBe(400);
  });
});

describe('deleteImage', () => {
  let r2: ReturnType<typeof makeMockR2>;
  let env: Env;

  beforeEach(() => {
    r2 = makeMockR2();
    env = makeEnv(r2.bucket);
  });

  it('deletes an image uploaded by the same user', async () => {
    const key = 'test-uuid.png';
    r2.stored.set(key, {
      body: new ReadableStream(),
      contentType: 'image/png',
      customMetadata: { uploadedBy: 'user-1' },
    });

    const response = await deleteImage(testUser, env, key);
    expect(response.status).toBe(200);
    expect(r2.stored.has(key)).toBe(false);
  });

  it('rejects deletion by a different user', async () => {
    const key = 'test-uuid.png';
    r2.stored.set(key, {
      body: new ReadableStream(),
      contentType: 'image/png',
      customMetadata: { uploadedBy: 'other-user' },
    });

    const response = await deleteImage(testUser, env, key);
    expect(response.status).toBe(403);
  });

  it('returns 404 for non-existent image', async () => {
    const response = await deleteImage(testUser, env, 'does-not-exist.png');
    expect(response.status).toBe(404);
  });

  it('rejects key with path traversal', async () => {
    const response = await deleteImage(testUser, env, '../secrets');
    expect(response.status).toBe(400);
  });

  it('rejects key with slashes', async () => {
    const response = await deleteImage(testUser, env, 'malicious/key');
    expect(response.status).toBe(400);
  });
});
