import { Group, Image as KImage } from "react-konva";
import { useEffect, useState } from "react";
import type Konva from "konva";

type Fit = "cover" | "contain" | undefined;

export function CanvasImage(props: { src: string; width: number; height: number; objectFit?: Fit; radius?: number; preserveAspect?: boolean }) {
  const { src, width, height, objectFit, radius, preserveAspect } = props;
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.src = src;
    i.onload = () => {
      if (!cancelled) setImg(i);
    };
    return () => {
      cancelled = true;
    };
  }, [src]);
  // Compute scale for objectFit
  let scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0;
  const allowFit = preserveAspect !== false && objectFit;
  if (img && allowFit) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (iw > 0 && ih > 0) {
      const scale = objectFit === "cover"
        ? Math.max(width / iw, height / ih)
        : Math.min(width / iw, height / ih);
      const w2 = iw * scale;
      const h2 = ih * scale;
      offsetX = (width - w2) / 2;
      offsetY = (height - h2) / 2;
      scaleX = scaleY = scale;
    }
  }
  return (
    <Group clipFunc={radius && radius > 0 ? (ctx: Konva.Context) => {
      const r = radius!;
      const w = width, h = height;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.arcTo(w, 0, w, h, r);
      ctx.arcTo(w, h, 0, h, r);
      ctx.arcTo(0, h, 0, 0, r);
      ctx.arcTo(0, 0, w, 0, r);
      ctx.closePath();
    } : undefined}>
      <KImage
        image={(img as unknown as CanvasImageSource) ?? undefined}
        x={offsetX}
        y={offsetY}
        width={allowFit ? undefined : width}
        height={allowFit ? undefined : height}
        scaleX={allowFit ? scaleX : 1}
        scaleY={allowFit ? scaleY : 1}
      />
    </Group>
  );
}
