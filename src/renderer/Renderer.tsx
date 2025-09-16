import { type GridNode, type NodeSpec, type RootSpec, type StackNode, type TextNode, type BoxNode, type IconNode, type ImageNode, type BadgeNode, type ProgressNode, cx } from "../dsl";

type EditProps = { editing?: boolean; path?: string; onSelectNode?: (path: string, node: NodeSpec) => void; selectedPath?: string };

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

function Stack({ node, onSelect, selectedId, editing, path, onSelectNode, selectedPath }: { node: StackNode; onSelect?: (id: string) => void; selectedId?: string } & EditProps) {
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
      {node.children.map((child, i) => (
        <NodeViewWithActions key={("id" in child && child.id) ? child.id! : i} node={child} onSelect={onSelect} selectedId={selectedId} editing={editing} path={path != null ? (path === "" ? `${i}` : `${path}.${i}`) : undefined} onSelectNode={onSelectNode} selectedPath={selectedPath} />
      ))}
    </div>
  );
}

function Grid({ node, onSelect, selectedId, editing, path, onSelectNode, selectedPath }: { node: GridNode; onSelect?: (id: string) => void; selectedId?: string } & EditProps) {
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
      {node.children.map((child, i) => (
        <NodeViewWithActions key={("id" in child && child.id) ? child.id! : i} node={child} onSelect={onSelect} selectedId={selectedId} editing={editing} path={path != null ? (path === "" ? `${i}` : `${path}.${i}`) : undefined} onSelectNode={onSelectNode} selectedPath={selectedPath} />
      ))}
    </div>
  );
}

export function NodeView({ node, editing, path, onSelectNode, selectedPath }: { node: NodeSpec } & EditProps) {
  switch (node.type) {
    case "text":
      return <Text node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "stack":
      return <Stack node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "grid":
      return <Grid node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "box":
      return <Box node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "icon":
      return <Icon node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "image":
      return <Image node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "badge":
      return <Badge node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "progress":
      return <Progress node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    default:
      return null;
  }
}

export function Renderer({ spec, onSelect, selectedId, onSelectNode, selectedPath, editing }: { spec: RootSpec; onSelect?: (id: string) => void; selectedId?: string; onSelectNode?: (path: string, node: NodeSpec) => void; selectedPath?: string; editing?: boolean }) {
  const bg = spec.background === "slate"
    ? "bg-slate-50 dark:bg-slate-900"
    : spec.background === "transparent"
    ? "bg-transparent"
    : "bg-white dark:bg-slate-950";
  const pad = spec.padding ? `p-${spec.padding}` : undefined;
  return (
    <div className={cx("w-full h-full", bg, pad, spec.className)}>
      <NodeViewWithActions node={spec.body} onSelect={onSelect} selectedId={selectedId} editing={editing} path="" onSelectNode={onSelectNode} selectedPath={selectedPath} />
    </div>
  );
}

function NodeViewWithActions({ node, onSelect, selectedId, editing, path, onSelectNode, selectedPath }: { node: NodeSpec; onSelect?: (id: string) => void; selectedId?: string } & EditProps) {
  switch (node.type) {
    case "box":
      return <Box node={node} onSelect={onSelect} selectedId={selectedId} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "stack":
      return <Stack node={node as StackNodeWithActions} onSelect={onSelect} selectedId={selectedId} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    case "grid":
      return <Grid node={node as GridNodeWithActions} onSelect={onSelect} selectedId={selectedId} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
    default:
      return <NodeView node={node} editing={editing} path={path} onSelectNode={onSelectNode} selectedPath={selectedPath} />;
  }
}

type StackNodeWithActions = StackNode & { children: NodeSpec[] };
type GridNodeWithActions = GridNode & { children: NodeSpec[] };

function Box({ node, onSelect, selectedId, editing, path, onSelectNode, selectedPath }: { node: BoxNode; onSelect?: (id: string) => void; selectedId?: string } & EditProps) {
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
      {node.children.map((child, i) => (
        <NodeViewWithActions key={("id" in child && child.id) ? child.id! : i} node={child} onSelect={onSelect} selectedId={selectedId} editing={editing} path={path != null ? (path === "" ? `${i}` : `${path}.${i}`) : undefined} onSelectNode={onSelectNode} selectedPath={selectedPath} />
      ))}
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
