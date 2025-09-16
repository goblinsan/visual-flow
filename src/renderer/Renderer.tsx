import { type GridNode, type NodeSpec, type RootSpec, type StackNode, type TextNode, cx } from "../dsl";

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
  return <div className={cx(base, align, cls)}>{node.text}</div>;
}

function Stack({ node }: { node: StackNode }) {
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
        <NodeView key={("id" in child && child.id) ? child.id! : i} node={child} />
      ))}
    </div>
  );
}

function Grid({ node }: { node: GridNode }) {
  const cols = `grid-cols-${node.columns}`;
  const gap = node.gap ? `gap-${node.gap}` : undefined;
  const pad = node.padding ? `p-${node.padding}` : undefined;
  return (
    <div className={cx("grid", cols, gap, pad, node.className)}>
      {node.children.map((child, i) => (
        <NodeView key={("id" in child && child.id) ? child.id! : i} node={child} />
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
    default:
      return null;
  }
}

export function Renderer({ spec }: { spec: RootSpec }) {
  const bg = spec.background === "slate"
    ? "bg-slate-50 dark:bg-slate-900"
    : spec.background === "transparent"
    ? "bg-transparent"
    : "bg-white dark:bg-slate-950";
  const pad = spec.padding ? `p-${spec.padding}` : undefined;
  return (
    <div className={cx("w-full h-full", bg, pad, spec.className)}>
      <NodeView node={spec.body} />
    </div>
  );
}
