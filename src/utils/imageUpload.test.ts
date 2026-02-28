import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadImageFile } from './imageUpload';

// Mock logger
vi.mock('./logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Save original fetch
const originalFetch = globalThis.fetch;

describe('uploadImageFile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('returns remote URL on successful upload', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://assets.vizail.io/images/abc.png' }),
    });

    const file = new File(['pixels'], 'test.png', { type: 'image/png' });
    const result = await uploadImageFile(file);

    expect(result.isRemote).toBe(true);
    expect(result.url).toBe('https://assets.vizail.io/images/abc.png');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to data URL when fetch rejects (offline)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const file = new File(['hello'], 'test.png', { type: 'image/png' });
    const result = await uploadImageFile(file);

    expect(result.isRemote).toBe(false);
    expect(result.url).toMatch(/^data:/);
  });

  it('falls back to data URL on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    });

    const file = new File(['data'], 'img.jpg', { type: 'image/jpeg' });
    const result = await uploadImageFile(file);

    expect(result.isRemote).toBe(false);
    expect(result.url).toMatch(/^data:/);
  });

  it('sends FormData with "file" field', async () => {
    let capturedBody: FormData | undefined;
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as FormData;
      return { ok: true, json: async () => ({ url: 'https://r2/img.png' }) };
    });

    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    await uploadImageFile(file);

    expect(capturedBody).toBeInstanceOf(FormData);
    expect(capturedBody!.get('file')).toBeInstanceOf(File);
  });
});
