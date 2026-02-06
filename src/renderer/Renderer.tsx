import type { JSX } from "react";
import { type GridNode, type NodeSpec, type RootSpec, type StackNode, type TextNode, type BoxNode, type IconNode, type ImageNode, type BadgeNode, type ProgressNode, type AccordionNode, type CarouselNode, cx } from "../dsl";
import { useState } from "react";

type EditProps = { editing?: boolean; path?: string; onSelectNode?: (path: string, node: NodeSpec) => void; selectedPath?: string; wrapChild?: (path: string, element: JSX.Element) => JSX.Element };

function Text({ node, editing, path, onSelectNode, selectedPath }: { node: TextNode } & EditProps) {
  const base = "text-slate-900 dark:text-slate-100";
  const align = node.align === "center" ? "text-center" : node.align === "end" ? "text-right" : "text-left";
  const cls =
    node.variant === "h1"
      ? "text-3xl font-bold"
      : node.variant === "h2"
      ? "text-2xl font-semibold"
      : node.variant === "h3"
      ? "text-xl font-semibold"
      : node.variant === "caption"
      ? "text-xs opacity-70"
      : "text-base";
  const sel = editing ? (selectedPath === path ? "outline outline-2 outline-[--color-brand]" : "outline outline-1 outline-transparent hover:outline-[--color-brand]/60") : undefined;
  return <div className={cx(base, align, cls, sel, node.className)} onClick={editing && onSelectNode && path != null ? (e) => { e.stopPropagation(); onSelectNode(path, node); } : undefined}>{node.text}</div>;
}

function Stack({ node, onSelect, selectedId, editing, path, onSelectNode, selectedPath, wrapChild }: { node: StackNode; onSelect?: (id: string) => void; selectedId?: string } & EditProps) {
  const dir = node.direction === "horizontal" ? "flex-row" : "flex-col";
  const gap = node.gap ? `gap-${node.gap}` : "gap-2";
  const pad = node.padding ? `p-${node.padding}` : undefined;
  const align =
    node.align === "center"
      ? "items-center"
      : node.align === "end"
      ? "items-end"
      : node.align === "stretch"
      ? "items-stretch"
      : "items-start";
  const justify =
    node.justify === "center"
      ? "justify-center"
      : node.justify === "end"
      ? "justify-end"
      : node.justify === "between"
      ? "justify-between"
      : "justify-start";
  const sel = editing ? (selectedPath === path ? "outline outline-2 outline-[--color-brand]" : "outline outline-1 outline-transparent hover:outline-[--color-brand]/60") : undefined;
  return (
    <div className={cx("flex", dir, gap, pad, align, justify, sel, node.className)} onClick={editing && onSelectNode && path != null ? (e) => { e.stopPropagation(); onSelectNode(path, node); } : undefined}>
      {node.children.map((child, i) => {
        const childPath = path != null ? (path === "" ? `${i}` : `${path}.${i}`) : `${i}`;
        const el = <NodeViewWithActions key={("id" in child && child.id) ? child.id! : i} node={child} onSelect={onSelect} selectedId={selectedId} editing={editing} path={childPath} onSelectNode={onSelectNode} selectedPath={selectedPath} wrapChild={wrapChild} />;
        return wrapChild ? wrapChild(childPath, el) : el;
      })}
    </div>
  );
}

function Grid({ node, onSelect, selectedId, editing, path, onSelectNode, selectedPath, wrapChild }: { node: GridNode; onSelect?: (id: string) => void; selectedId?: string } & EditProps) {
  // Use a static mapping so Tailwind includes these classes at build time
  const cols =
    node.columns === 1 ? "grid-cols-1" :
    node.columns === 2 ? "grid-cols-2" :
    node.columns === 3 ? "grid-cols-3" :
    node.columns === 4 ? "grid-cols-4" :
    node.columns === 5 ? "grid-cols-5" :
    node.columns === 6 ? "grid-cols-6" :
    node.columns === 7 ? "grid-cols-7" :
    node.columns === 8 ? "grid-cols-8" :
    node.columns === 9 ? "grid-cols-9" :
    node.columns === 10 ? "grid-cols-10" :
    node.columns === 11 ? "grid-cols-11" :
    node.columns === 12 ? "grid-cols-12" : undefined;
  const gap = node.gap ? `gap-${node.gap}` : undefined;
  const pad = node.padding ? `p-${node.padding}` : undefined;
  const sel = editing ? (selectedPath === path ? "outline outline-2 outline-[--color-brand]" : "outline outline-1 outline-transparent hover:outline-[--color-brand]/60") : undefined;
  return (
    <div className={cx("grid", cols, gap, pad, sel, node.className)} onClick={editing && onSelectNode && path != null ? (e) => { e.stopPropagation(); onSelectNode(path, node); } : undefined}>
      {node.children.map((child, i) => {
        const childPath = path != null ? (path === "" ? `${i}` : `${path}.${i}`) : `${i}`;
        const el = <NodeViewWithActions key={("id" in child && child.id) ? child.id! : i} node={child} onSelect={onSelect} selectedId={selectedId} editing={editing} path={childPath} onSelectNode={onSelectNode} selectedPath={selectedPath} wrapChild={wrapChild} />;
        return wrapChild ? wrapChild(childPath, el) : el;
      })}
    </div>
  );
}

export function NodeView({ node, editing, path, onSelectNode, selectedPath, wrapChild }: { node: NodeSpec } & EditProps) {
  switch (node.type) {
    case "text":
      return <Text node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "stack":
      return <Stack node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} wrapChild={wrapChild} />;
    case "grid":
      return <Grid node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} wrapChild={wrapChild} />;
    case "box":
      return <Box node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} wrapChild={wrapChild} />;
    case "icon":
      return <Icon node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "image":
      return <Image node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "badge":
      return <Badge node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "progress":
      return <Progress node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "accordion":
      return <Accordion node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "carousel":
      return <Carousel node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    default:
      return null;
  }
}

export function Renderer({ spec, onSelect, selectedId, onSelectNode, selectedPath, editing, wrapChild }: { spec: RootSpec; onSelect?: (id: string) => void; selectedId?: string; onSelectNode?: (path: string, node: NodeSpec) => void; selectedPath?: string; editing?: boolean; wrapChild?: (path: string, element: JSX.Element) => JSX.Element }) {
  const bg = spec.background === "slate"
    ? "bg-slate-50 dark:bg-slate-900"
    : spec.background === "transparent"
    ? "bg-transparent"
    : "bg-white dark:bg-slate-950";
  const pad = spec.padding ? `p-${spec.padding}` : undefined;
  return (
    <div className={cx("w-full h-full", bg, pad, spec.className)}>
      <NodeViewWithActions node={spec.body} onSelect={onSelect} selectedId={selectedId} editing={editing} path="" onSelectNode={onSelectNode} selectedPath={selectedPath} wrapChild={wrapChild} />
    </div>
  );
}

function NodeViewWithActions({ node, onSelect, selectedId, editing, path, onSelectNode, selectedPath, wrapChild }: { node: NodeSpec; onSelect?: (id: string) => void; selectedId?: string } & EditProps) {
  switch (node.type) {
    case "box":
      return <Box node={node} onSelect={onSelect} selectedId={selectedId} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} wrapChild={wrapChild} />;
    case "stack":
      return <Stack node={node as StackNodeWithActions} onSelect={onSelect} selectedId={selectedId} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} wrapChild={wrapChild} />;
    case "grid":
      return <Grid node={node as GridNodeWithActions} onSelect={onSelect} selectedId={selectedId} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} wrapChild={wrapChild} />;
    default:
      return <NodeView node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} wrapChild={wrapChild} />;
  }
}

type StackNodeWithActions = StackNode & { children: NodeSpec[] };
type GridNodeWithActions = GridNode & { children: NodeSpec[] };

function Box({ node, onSelect, selectedId, editing, path, onSelectNode, selectedPath, wrapChild }: { node: BoxNode; onSelect?: (id: string) => void; selectedId?: string } & EditProps) {
  const pad = node.padding ? `p-${node.padding}` : "p-3";
  const gap = node.gap ? `gap-${node.gap}` : "gap-2";
  const base = node.variant === "plain" ? "border-transparent" : "border-slate-300/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/40 backdrop-blur";
  const isSelected = node.selected || (node.id && selectedId === node.id);
  const selected = isSelected ? "ring-2 ring-[--color-brand] border-[--color-brand]" : undefined;
  const clickable = node.selectable ? "cursor-pointer hover:border-[--color-brand]" : undefined;
  const sel = editing ? (selectedPath === path ? "outline outline-2 outline-[--color-brand]" : "outline outline-1 outline-transparent hover:outline-[--color-brand]/60") : undefined;
  const content = (
    <div
      className={cx("relative rounded-xl border", pad, gap, base, selected, clickable, sel, node.className)}
      data-testid={node.id}
      onClick={(e) => {
        if (editing && onSelectNode && path != null) { e.stopPropagation(); onSelectNode(path, node); return; }
        if (node.selectable && node.id && onSelect) onSelect(node.id);
      }}
    >
      {/* Render children, allowing badges to position absolutely if present */}
      {node.children.map((child, i) => {
        const childPath = path != null ? (path === "" ? `${i}` : `${path}.${i}`) : `${i}`;
        const el = <NodeViewWithActions key={("id" in child && child.id) ? child.id! : i} node={child} onSelect={onSelect} selectedId={selectedId} editing={editing} path={childPath} onSelectNode={onSelectNode} selectedPath={selectedPath} wrapChild={wrapChild} />;
        return wrapChild ? wrapChild(childPath, el) : el;
      })}
    </div>
  );
  return content;
}

function Icon({ node, editing, path, onSelectNode, selectedPath }: { node: IconNode } & EditProps) {
  const sel = editing ? (selectedPath === path ? "outline outline-2 outline-[--color-brand]" : "outline outline-1 outline-transparent hover:outline-[--color-brand]/60") : undefined;
  return (
    <span role={node.label ? "img" : undefined} aria-label={node.label} className={cx("inline-flex", sel, node.className)} onClick={editing && onSelectNode && path != null ? (e) => { e.stopPropagation(); onSelectNode(path, node); } : undefined}>
      {node.emoji}
    </span>
  );
}

function Image({ node, editing, path, onSelectNode, selectedPath }: { node: ImageNode } & EditProps) {
  const sel = editing ? (selectedPath === path ? "outline outline-2 outline-[--color-brand]" : "outline outline-1 outline-transparent hover:outline-[--color-brand]/60") : undefined;
  return <img src={node.src} alt={node.alt} className={cx("block", sel, node.className)} onClick={editing && onSelectNode && path != null ? (e) => { e.stopPropagation(); onSelectNode(path, node); } : undefined} />;
}

function Badge({ node, editing, path, onSelectNode, selectedPath }: { node: BadgeNode } & EditProps) {
  const pos =
    node.position === "top-left" ? "top-1 left-1" :
    node.position === "bottom-left" ? "bottom-1 left-1" :
    node.position === "bottom-right" ? "bottom-1 right-1" :
    "top-1 right-1";
  return (
    <span className={cx("absolute text-xs px-1.5 py-0.5 rounded-md bg-[--color-brand] text-white", pos, node.className, editing ? (selectedPath === path ? "outline outline-2 outline-[--color-brand]" : undefined) : undefined)} onClick={editing && onSelectNode && path != null ? (e) => { e.stopPropagation(); onSelectNode(path, node); } : undefined}>
      {node.text}
    </span>
  );
}

function Progress({ node, editing, path, onSelectNode, selectedPath }: { node: ProgressNode } & EditProps) {
  const value = Math.max(0, Math.min(100, node.value ?? 0));
  return (
    <div className={cx("w-full", node.className, editing ? (selectedPath === path ? "outline outline-2 outline-[--color-brand]" : "outline outline-1 outline-transparent hover:outline-[--color-brand]/60") : undefined)} aria-label={node.label ?? "progress"} onClick={editing && onSelectNode && path != null ? (e) => { e.stopPropagation(); onSelectNode(path, node); } : undefined}>
      {node.label ? (
        <div className="text-xs mb-1 opacity-80">{node.label}</div>
      ) : null}
      <div className="h-2 w-full rounded bg-slate-700/60 overflow-hidden">
        <div
          className={cx("h-full bg-[--color-brand] rounded", node.barClassName)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Accordion({ node, editing, path, onSelectNode, selectedPath }: { node: AccordionNode } & EditProps) {
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    node.items.forEach((item, idx) => {
      if (item.defaultExpanded) initial.add(idx);
    });
    return initial;
  });

  const toggleItem = (index: number) => {
    setExpandedIndexes(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (!node.allowMultiple) {
          next.clear();
        }
        next.add(index);
      }
      return next;
    });
  };

  const sel = editing ? (selectedPath === path ? "outline outline-2 outline-[--color-brand]" : "outline outline-1 outline-transparent hover:outline-[--color-brand]/60") : undefined;

  return (
    <div className={cx("border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden", sel, node.className)} onClick={editing && onSelectNode && path != null ? (e) => { e.stopPropagation(); onSelectNode(path, node); } : undefined}>
      {node.items.map((item, idx) => {
        const isExpanded = expandedIndexes.has(idx);
        return (
          <div key={idx} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
            <button
              className="w-full px-4 py-3 text-left font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between items-center transition-colors"
              onClick={(e) => { e.stopPropagation(); toggleItem(idx); }}
            >
              <span>{item.title}</span>
              <span className={cx("transition-transform", isExpanded ? "rotate-180" : "")}>▼</span>
            </button>
            {isExpanded && (
              <div className="px-4 py-3 bg-white dark:bg-slate-900">
                <NodeView node={item.content} editing={editing} path={path ? `${path}.${idx}` : `${idx}`} onSelectNode={onSelectNode} selectedPath={selectedPath} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Carousel({ node, editing, path, onSelectNode, selectedPath }: { node: CarouselNode } & EditProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => setCurrentIndex((prev) => (prev + 1) % node.items.length);
  const prev = () => setCurrentIndex((p) => (p - 1 + node.items.length) % node.items.length);
  const goTo = (index: number) => setCurrentIndex(index);

  const sel = editing ? (selectedPath === path ? "outline outline-2 outline-[--color-brand]" : "outline outline-1 outline-transparent hover:outline-[--color-brand]/60") : undefined;

  return (
    <div className={cx("relative", sel, node.className)} onClick={editing && onSelectNode && path != null ? (e) => { e.stopPropagation(); onSelectNode(path, node); } : undefined}>
      <div className="relative overflow-hidden rounded-lg">
        <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {node.items.map((item, idx) => (
            <div key={idx} className="min-w-full">
              <NodeView node={item} editing={editing} path={path ? `${path}.${idx}` : `${idx}`} onSelectNode={onSelectNode} selectedPath={selectedPath} />
            </div>
          ))}
        </div>
      </div>
      
      {node.showArrows !== false && node.items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-slate-800/80 p-2 rounded-full shadow-md hover:bg-white dark:hover:bg-slate-700"
          >
            ◀
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-slate-800/80 p-2 rounded-full shadow-md hover:bg-white dark:hover:bg-slate-700"
          >
            ▶
          </button>
        </>
      )}
      
      {node.showDots !== false && node.items.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {node.items.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); goTo(idx); }}
              className={cx(
                "w-2 h-2 rounded-full transition-all",
                idx === currentIndex
                  ? "bg-blue-500 w-6"
                  : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
