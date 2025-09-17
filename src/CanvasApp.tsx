import { useState } from "react";
import CanvasStage from "./canvas/CanvasStage.tsx";
import type { LayoutSpec } from "./layout-schema.ts";

export default function CanvasApp() {
  const initial: LayoutSpec = {
    root: {
      id: "root",
      type: "frame",
      size: { width: 960, height: 600 },
      background: "#0f172a",
      children: [
        { id: "title", type: "text", text: "Visual Flow Canvas", variant: "h1", position: { x: 24, y: 24 }, size: { width: 300, height: 40 }, color: "#f8fafc" },
        { id: "hero", type: "image", src: "/vite.svg", position: { x: 24, y: 90 }, size: { width: 140, height: 140 }, radius: 12, objectFit: "contain" },
        { id: "box1", type: "box", position: { x: 190, y: 90 }, size: { width: 300, height: 140 }, background: "#1f2937", border: "1px solid #334155", radius: 10, children: [
          { id: "b1t", type: "text", text: "Drag, resize, marquee select", variant: "body", position: { x: 12, y: 12 }, size: { width: 260, height: 20 }, color: "#e2e8f0" },
        ] },
        { id: "grid1", type: "grid", position: { x: 24, y: 260 }, size: { width: 912, height: 300 }, columns: 6, gap: 8, padding: 8, children: [
          { id: "g1a", type: "box", position: { x: 0, y: 0 }, size: { width: 140, height: 90 }, background: "#0ea5e9" },
          { id: "g1b", type: "box", position: { x: 0, y: 0 }, size: { width: 140, height: 120 }, background: "#22c55e" },
          { id: "g1c", type: "box", position: { x: 0, y: 0 }, size: { width: 140, height: 70 }, background: "#eab308" },
          { id: "g1d", type: "box", position: { x: 0, y: 0 }, size: { width: 140, height: 100 }, background: "#ef4444" },
          { id: "g1e", type: "box", position: { x: 0, y: 0 }, size: { width: 140, height: 80 }, background: "#8b5cf6" },
          { id: "g1f", type: "box", position: { x: 0, y: 0 }, size: { width: 140, height: 110 }, background: "#ec4899" },
        ] },
      ],
    },
  };
  const [spec, setSpec] = useState<LayoutSpec>(initial);

  return (
    <div className="min-h-screen grid place-items-center bg-slate-900 text-slate-100">
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl">
        <CanvasStage spec={spec} setSpec={setSpec} width={980} height={620} />
      </div>
    </div>
  );
}
