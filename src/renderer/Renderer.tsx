import { type GridNode, type NodeSpec, type RootSpec, type StackNode, type TextNode, type BoxNode, type IconNode, type ImageNode, type BadgeNode, type ProgressNode, cx } from "../dsl";

function Text({ node }: { node: TextNode }) {
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
  return <div className={cx(base, align, cls, node.className)}>{node.text}</div>;
}

function Stack({ node, onSelect, selectedId }: { node: StackNode; onSelect?: (id: string) => void; selectedId?: string }) {
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
  return (
    <div className={cx("flex", dir, gap, pad, align, justify, node.className)}>
      {node.children.map((child, i) => (
        <NodeViewWithActions key={("id" in child && child.id) ? child.id! : i} node={child} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </div>
  );
}

function Grid({ node, onSelect, selectedId }: { node: GridNode; onSelect?: (id: string) => void; selectedId?: string }) {
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
  return (
    <div className={cx("grid", cols, gap, pad, node.className)}>
      {node.children.map((child, i) => (
        <NodeViewWithActions key={("id" in child && child.id) ? child.id! : i} node={child} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </div>
  );
}

export function NodeView({ node }: { node: NodeSpec }) {
  switch (node.type) {
    case "text":
      return <Text node={node} />;
    case "stack":
      return <Stack node={node} />;
    case "grid":
      return <Grid node={node} />;
    case "box":
      return <Box node={node} />;
    case "icon":
      return <Icon node={node} />;
    case "image":
      return <Image node={node} />;
    case "badge":
      return <Badge node={node} />;
    case "progress":
      return <Progress node={node} />;
    default:
      return null;
  }
}

export function Renderer({ spec, onSelect, selectedId }: { spec: RootSpec; onSelect?: (id: string) => void; selectedId?: string }) {
  const bg = spec.background === "slate"
    ? "bg-slate-50 dark:bg-slate-900"
    : spec.background === "transparent"
    ? "bg-transparent"
    : "bg-white dark:bg-slate-950";
  const pad = spec.padding ? `p-${spec.padding}` : undefined;
  return (
    <div className={cx("w-full h-full", bg, pad, spec.className)}>
      <NodeViewWithActions node={spec.body} onSelect={onSelect} selectedId={selectedId} />
    </div>
  );
}

function NodeViewWithActions({ node, onSelect, selectedId }: { node: NodeSpec; onSelect?: (id: string) => void; selectedId?: string }) {
  switch (node.type) {
    case "box":
      return <Box node={node} onSelect={onSelect} selectedId={selectedId} />;
    case "stack":
      return <Stack node={node as StackNodeWithActions} onSelect={onSelect} selectedId={selectedId} />;
    case "grid":
      return <Grid node={node as GridNodeWithActions} onSelect={onSelect} selectedId={selectedId} />;
    default:
      return <NodeView node={node} />;
  }
}

type StackNodeWithActions = StackNode & { children: NodeSpec[] };
type GridNodeWithActions = GridNode & { children: NodeSpec[] };

function Box({ node, onSelect, selectedId }: { node: BoxNode; onSelect?: (id: string) => void; selectedId?: string }) {
  const pad = node.padding ? `p-${node.padding}` : "p-3";
  const gap = node.gap ? `gap-${node.gap}` : "gap-2";
  const base = node.variant === "plain" ? "border-transparent" : "border-slate-300/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/40 backdrop-blur";
  const isSelected = node.selected || (node.id && selectedId === node.id);
  const selected = isSelected ? "ring-2 ring-[--color-brand] border-[--color-brand]" : undefined;
  const clickable = node.selectable ? "cursor-pointer hover:border-[--color-brand]" : undefined;
  const content = (
    <div
      className={cx("relative rounded-xl border", pad, gap, base, selected, clickable, node.className)}
      data-testid={node.id}
      onClick={() => {
        if (node.selectable && node.id && onSelect) onSelect(node.id);
      }}
    >
      {/* Render children, allowing badges to position absolutely if present */}
      {node.children.map((child, i) => (
        <NodeViewWithActions key={("id" in child && child.id) ? child.id! : i} node={child} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </div>
  );
  return content;
}

function Icon({ node }: { node: IconNode }) {
  return (
    <span role={node.label ? "img" : undefined} aria-label={node.label} className={cx("inline-flex", node.className)}>
      {node.emoji}
    </span>
  );
}

function Image({ node }: { node: ImageNode }) {
  return <img src={node.src} alt={node.alt} className={cx("block", node.className)} />;
}

function Badge({ node }: { node: BadgeNode }) {
  const pos =
    node.position === "top-left" ? "top-1 left-1" :
    node.position === "bottom-left" ? "bottom-1 left-1" :
    node.position === "bottom-right" ? "bottom-1 right-1" :
    "top-1 right-1";
  return (
    <span className={cx("absolute text-xs px-1.5 py-0.5 rounded-md bg-[--color-brand] text-white", pos, node.className)}>
      {node.text}
    </span>
  );
}

function Progress({ node }: { node: ProgressNode }) {
  const value = Math.max(0, Math.min(100, node.value ?? 0));
  return (
    <div className={cx("w-full", node.className)} aria-label={node.label ?? "progress"}>
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
