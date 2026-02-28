import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateDataUrlImages, hasDataUrlImages } from './migrateImages';
import type { LayoutSpec } from '../layout-schema';

// Mock the upload utility
vi.mock('./imageUpload', () => ({
  uploadImageFile: vi.fn(),
}));

vi.mock('./logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { uploadImageFile } from './imageUpload';
const mockUpload = vi.mocked(uploadImageFile);

// A minimal PNG data-URL (>4KB to pass the SVG-small filter)
const FAKE_DATA_URL = 'data:image/png;base64,' + 'A'.repeat(5000);
const SMALL_SVG_DATA_URL = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='; // tiny SVG

function makeSpec(children: LayoutSpec['root']['children']): LayoutSpec {
  return {
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'frame' as const,
      size: { width: 800, height: 600 },
      children,
    },
  };
}

describe('hasDataUrlImages', () => {
  it('returns true when spec has a data-URL image', () => {
    const spec = makeSpec([
      { id: 'img1', type: 'image', src: FAKE_DATA_URL },
    ] as LayoutSpec['root']['children']);

    expect(hasDataUrlImages(spec)).toBe(true);
  });

  it('returns false when no data-URL images', () => {
    const spec = makeSpec([
      { id: 'img1', type: 'image', src: 'https://assets.vizail.io/images/abc.png' },
    ] as LayoutSpec['root']['children']);

    expect(hasDataUrlImages(spec)).toBe(false);
  });

  it('ignores small SVG data-URLs', () => {
    const spec = makeSpec([
      { id: 'icon1', type: 'image', src: SMALL_SVG_DATA_URL },
    ] as LayoutSpec['root']['children']);

    expect(hasDataUrlImages(spec)).toBe(false);
  });

  it('detects data-URL in nested children', () => {
    const spec = makeSpec([
      {
        id: 'group1',
        type: 'group',
        children: [
          { id: 'img-nested', type: 'image', src: FAKE_DATA_URL },
        ],
      },
    ] as LayoutSpec['root']['children']);

    expect(hasDataUrlImages(spec)).toBe(true);
  });

  it('returns false for empty spec', () => {
    const spec = makeSpec([]);
    expect(hasDataUrlImages(spec)).toBe(false);
  });
});

describe('migrateDataUrlImages', () => {
  beforeEach(() => {
    mockUpload.mockReset();
  });

  it('migrates data-URL images to R2 URLs', async () => {
    mockUpload.mockResolvedValue({ url: 'https://assets.vizail.io/images/migrated.png', isRemote: true });

    const spec = makeSpec([
      { id: 'img1', type: 'image', src: FAKE_DATA_URL, alt: 'test' },
    ] as LayoutSpec['root']['children']);

    const result = await migrateDataUrlImages(spec);

    expect(result.migratedCount).toBe(1);
    expect((result.spec.root.children[0] as { src: string }).src).toBe('https://assets.vizail.io/images/migrated.png');
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it('skips non-data-URL images', async () => {
    const spec = makeSpec([
      { id: 'img1', type: 'image', src: 'https://already-remote.com/img.png' },
    ] as LayoutSpec['root']['children']);

    const result = await migrateDataUrlImages(spec);

    expect(result.migratedCount).toBe(0);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('skips small SVG data-URLs', async () => {
    const spec = makeSpec([
      { id: 'icon1', type: 'image', src: SMALL_SVG_DATA_URL },
    ] as LayoutSpec['root']['children']);

    const result = await migrateDataUrlImages(spec);
    expect(result.migratedCount).toBe(0);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('keeps original src when upload fails to be remote', async () => {
    mockUpload.mockResolvedValue({ url: 'data:image/png;base64,fallback', isRemote: false });

    const spec = makeSpec([
      { id: 'img1', type: 'image', src: FAKE_DATA_URL },
    ] as LayoutSpec['root']['children']);

    const result = await migrateDataUrlImages(spec);

    expect(result.migratedCount).toBe(0);
    // src unchanged since isRemote was false
    expect((result.spec.root.children[0] as { src: string }).src).toBe(FAKE_DATA_URL);
  });

  it('handles upload errors gracefully', async () => {
    mockUpload.mockRejectedValue(new Error('Upload failed'));

    const spec = makeSpec([
      { id: 'img1', type: 'image', src: FAKE_DATA_URL },
    ] as LayoutSpec['root']['children']);

    const result = await migrateDataUrlImages(spec);

    expect(result.migratedCount).toBe(0);
    // Original data URL kept on error
    expect((result.spec.root.children[0] as { src: string }).src).toBe(FAKE_DATA_URL);
  });

  it('migrates multiple images in nested structure', async () => {
    let callCount = 0;
    mockUpload.mockImplementation(async () => {
      callCount++;
      return { url: `https://r2/img-${callCount}.png`, isRemote: true };
    });

    const spec = makeSpec([
      { id: 'img1', type: 'image', src: FAKE_DATA_URL },
      {
        id: 'group1',
        type: 'group',
        children: [
          { id: 'img2', type: 'image', src: FAKE_DATA_URL },
          { id: 'text1', type: 'text', text: 'hello' },
        ],
      },
    ] as LayoutSpec['root']['children']);

    const result = await migrateDataUrlImages(spec);

    expect(result.migratedCount).toBe(2);
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });
});
