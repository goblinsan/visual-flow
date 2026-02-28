/**
 * Migrate data-URL images in a LayoutSpec to R2 URLs.
 *
 * Walks the spec tree looking for ImageNode.src values that start with
 * "data:" (excluding small SVG data-URLs used for icons). For each
 * match it uploads the decoded blob to the API and replaces the src
 * with the permanent R2 URL.
 *
 * This can be called lazily on loadDesign or as a one-time batch.
 */

import type { LayoutSpec, LayoutNode } from '../layout-schema';
import { uploadImageFile } from './imageUpload';
import { logger } from './logger';

/** Decode a data-URL string into a File object */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new File([arr], filename, { type: mime });
}

/** Small SVG data-URLs (icons) are intentionally kept inline */
function shouldMigrate(src: string): boolean {
  if (!src.startsWith('data:')) return false;
  // Keep small SVG icons inline (< 4 KB)
  if (src.startsWith('data:image/svg+xml') && src.length < 4096) return false;
  return true;
}

/**
 * Walk the spec tree and upload all data-URL images to R2.
 * Returns a new spec with updated src values.
 *
 * Images that fail to upload are left as-is.
 */
export async function migrateDataUrlImages(spec: LayoutSpec): Promise<{ spec: LayoutSpec; migratedCount: number }> {
  let migratedCount = 0;

  async function processNode(node: LayoutNode): Promise<LayoutNode> {
    let patched: LayoutNode = node;

    // Migrate image src
    if (node.type === 'image') {
      const imgNode = node as LayoutNode & { src?: string };
      if (imgNode.src && shouldMigrate(imgNode.src)) {
        try {
          const file = dataUrlToFile(imgNode.src, `migrated-${node.id ?? 'img'}.png`);
          const { url, isRemote } = await uploadImageFile(file);
          if (isRemote) {
            patched = { ...patched, src: url } as LayoutNode;
            migratedCount++;
          }
        } catch (err) {
          logger.warn(`Failed to migrate image ${node.id}`, err);
        }
      }
    }

    // Recurse children
    if ('children' in patched && Array.isArray((patched as { children?: LayoutNode[] }).children)) {
      const children = await Promise.all(
        ((patched as { children: LayoutNode[] }).children).map(processNode),
      );
      patched = { ...patched, children } as LayoutNode;
    }

    return patched;
  }

  const migratedChildren = await Promise.all(spec.root.children.map(processNode));
  const migratedSpec: LayoutSpec = {
    ...spec,
    root: { ...spec.root, children: migratedChildren },
  };

  if (migratedCount > 0) {
    logger.info(`Migrated ${migratedCount} data-URL image(s) to R2`);
  }

  return { spec: migratedSpec, migratedCount };
}

/**
 * Quick check: does this spec contain any data-URL images that should be migrated?
 */
export function hasDataUrlImages(spec: LayoutSpec): boolean {
  function check(node: LayoutNode): boolean {
    if (node.type === 'image') {
      const src = (node as LayoutNode & { src?: string }).src;
      if (src && shouldMigrate(src)) return true;
    }
    if ('children' in node && Array.isArray((node as { children?: LayoutNode[] }).children)) {
      return ((node as { children: LayoutNode[] }).children).some(check);
    }
    return false;
  }
  return spec.root.children.some(check);
}
