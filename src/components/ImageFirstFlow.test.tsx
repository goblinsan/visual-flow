/**
 * Tests for ImageFirstFlow
 * Phase 6 (#197)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageFirstFlow } from './ImageFirstFlow';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate uploading a file via the hidden file input element. */
function uploadFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', {
    value: [file],
    writable: false,
    configurable: true,
  });
  fireEvent.change(input);
}

// ---------------------------------------------------------------------------
// Browser API stubs
// ---------------------------------------------------------------------------

/**
 * Create a minimal HTMLImageElement stub that fires onload synchronously
 * and exposes predictable naturalWidth/naturalHeight.
 */
function makeImageStub() {
  const stub: {
    naturalWidth: number;
    naturalHeight: number;
    onload: (() => void) | null;
    src: string;
  } = {
    naturalWidth: 100,
    naturalHeight: 100,
    onload: null,
    get src() { return ''; },
    set src(_val: string) {
      // Fire onload synchronously when src is set
      stub.onload?.();
    },
  };
  return stub;
}

/**
 * Create a CanvasRenderingContext2D stub that returns known pixel data.
 * We return a 1×1 image with a single red pixel for simplicity.
 */
function makeCtxStub() {
  return {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray([200, 50, 50, 255]), // one red pixel
      width: 1,
      height: 1,
    })),
  };
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let origCreateElement: typeof document.createElement;
let ctxStub: ReturnType<typeof makeCtxStub>;

beforeEach(() => {
  ctxStub = makeCtxStub();
  const canvasStub = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctxStub),
  };

  origCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') return canvasStub as unknown as HTMLCanvasElement;
    return origCreateElement(tag);
  });

  const imageStub = makeImageStub();
  vi.spyOn(global, 'Image').mockImplementation(
    () => imageStub as unknown as HTMLImageElement,
  );

  // FileReader stub: immediately delivers a data URL via onload
  const fileReaderProto = {
    result: null as string | null,
    onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
    readAsDataURL(this: typeof fileReaderProto, _file: Blob) {
      this.result = 'data:image/png;base64,fake';
      if (this.onload) {
        this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
      }
    },
  };

  vi.spyOn(global, 'FileReader').mockImplementation(
    () => Object.create(fileReaderProto) as unknown as FileReader,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ImageFirstFlow', () => {
  it('renders the drop zone with instructional text', () => {
    render(<ImageFirstFlow onExtractedColors={vi.fn()} />);
    expect(screen.getByText(/Click or drop an image/i)).toBeInTheDocument();
  });

  it('renders a file input element', () => {
    render(<ImageFirstFlow onExtractedColors={vi.fn()} />);
    const input = screen.getByLabelText('Image file input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'file');
  });

  it('shows an error when a non-image file is uploaded', () => {
    render(<ImageFirstFlow onExtractedColors={vi.fn()} />);
    const input = screen.getByLabelText('Image file input') as HTMLInputElement;

    const textFile = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    act(() => { uploadFile(input, textFile); });

    expect(screen.getByText(/Please upload an image file/i)).toBeInTheDocument();
  });

  it('displays extracted colours after a valid image is uploaded', () => {
    render(<ImageFirstFlow onExtractedColors={vi.fn()} />);
    const input = screen.getByLabelText('Image file input') as HTMLInputElement;

    const imgFile = new File(['img'], 'photo.png', { type: 'image/png' });
    act(() => { uploadFile(input, imgFile); });

    expect(screen.getByText('Extracted palette')).toBeInTheDocument();
    expect(screen.getByText('Use this palette')).toBeInTheDocument();
  });

  it('calls onExtractedColors when "Use this palette" is clicked', async () => {
    const onExtractedColors = vi.fn();
    render(<ImageFirstFlow onExtractedColors={onExtractedColors} />);
    const input = screen.getByLabelText('Image file input') as HTMLInputElement;

    const imgFile = new File(['img'], 'photo.png', { type: 'image/png' });
    act(() => { uploadFile(input, imgFile); });

    await userEvent.click(screen.getByText('Use this palette'));
    expect(onExtractedColors).toHaveBeenCalledOnce();

    const [colors, moods] = onExtractedColors.mock.calls[0];
    expect(Array.isArray(colors)).toBe(true);
    expect(colors.length).toBeGreaterThan(0);
    expect(Array.isArray(moods)).toBe(true);
    // moods should be valid StyleMood strings
    const validMoods = ['minimal', 'bold', 'playful', 'elegant', 'technical'];
    for (const m of moods) {
      expect(validMoods).toContain(m);
    }
  });

  it('shows a drag-over state when files are dragged over the drop zone', () => {
    render(<ImageFirstFlow onExtractedColors={vi.fn()} />);
    const dropZone = screen.getByRole('button', { name: 'Upload image' });

    fireEvent.dragOver(dropZone, { preventDefault: () => {} });
    expect(screen.getByText(/Drop your image here/i)).toBeInTheDocument();
  });

  it('resets drag state when drag leaves the drop zone', () => {
    render(<ImageFirstFlow onExtractedColors={vi.fn()} />);
    const dropZone = screen.getByRole('button', { name: 'Upload image' });

    fireEvent.dragOver(dropZone, { preventDefault: () => {} });
    fireEvent.dragLeave(dropZone);
    expect(screen.getByText(/Click or drop an image/i)).toBeInTheDocument();
  });

  it('processes a dropped image file', () => {
    render(<ImageFirstFlow onExtractedColors={vi.fn()} />);
    const dropZone = screen.getByRole('button', { name: 'Upload image' });

    const imgFile = new File(['img'], 'dropped.png', { type: 'image/png' });
    act(() => {
      fireEvent.drop(dropZone, {
        preventDefault: () => {},
        dataTransfer: { files: [imgFile] },
      });
    });

    expect(screen.getByText('Extracted palette')).toBeInTheDocument();
  });
});

