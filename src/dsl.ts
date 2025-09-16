export type TextNode = {
  type: "text";
  id?: string;
  text: string;
  variant?: "h1" | "h2" | "h3" | "body" | "caption";
  align?: "start" | "center" | "end";
};

export type StackNode = {
  type: "stack";
  id?: string;
  direction?: "vertical" | "horizontal"; // default vertical
  gap?: number; // tailwind gap-x, gap-y in rem scale (use 1..8)
  padding?: number; // p-*
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  className?: string;
  children: NodeSpec[];
};

export type GridNode = {
  type: "grid";
  id?: string;
  columns: number; // grid-cols-*
  gap?: number;
  padding?: number;
  className?: string;
  children: NodeSpec[];
};

export type IconNode = {
  type: "icon";
  id?: string;
  emoji?: string; // simple emoji icon
  className?: string;
  label?: string; // accessible label
};

export type ImageNode = {
  type: "image";
  id?: string;
  src: string;
  alt: string;
  className?: string;
};

export type BadgeNode = {
  type: "badge";
  id?: string;
  text: string;
  className?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

export type BoxNode = {
  type: "box";
  id?: string; // strongly recommended when selectable
  variant?: "card" | "plain";
  padding?: number;
  gap?: number;
  className?: string;
  selectable?: boolean;
  selected?: boolean; // static default selection in uncontrolled mode
  children: NodeSpec[];
};

export type NodeSpec = TextNode | StackNode | GridNode | IconNode | ImageNode | BadgeNode | BoxNode;

export type RootSpec = {
  id?: string;
  background?: "white" | "slate" | "transparent";
  padding?: number;
  className?: string;
  body: NodeSpec;
};

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
