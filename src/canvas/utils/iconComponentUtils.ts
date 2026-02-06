import type { LayoutNode, ImageNode, LayoutSpec } from "../../layout-schema";
import { ICON_LIBRARY, COMPONENT_LIBRARY } from "../../library";
import { makeId } from "./canvasUtils";

/**
 * Update root children with a function
 */
export function updateRootChildren(
  spec: LayoutSpec,
  updater: (children: LayoutNode[]) => LayoutNode[]
): LayoutSpec {
  const root = spec.root;
  return {
    ...spec,
    root: {
      ...root,
      children: updater(root.children),
    },
  };
}

/**
 * Append nodes to the root of a spec
 */
export function appendNodesToRoot(spec: LayoutSpec, nodes: LayoutNode[]): LayoutSpec {
  if (!nodes.length) return spec;
  return updateRootChildren(spec, (children) => [...children, ...nodes]);
}

/**
 * Create an icon node at the specified world position
 */
export function createIcon(
  worldPos: { x: number; y: number },
  selectedIconId?: string
): ImageNode | null {
  const icon = ICON_LIBRARY.find(i => i.id === selectedIconId) ?? ICON_LIBRARY[0];
  if (!icon) return null;
  
  const id = makeId('icon');
  const [w, h, , , d] = icon.icon.icon;
  const path = Array.isArray(d) ? d.join(' ') : d;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="#111827"><path d="${path}"/></svg>`;
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  
  const iconNode: ImageNode = {
    id,
    type: 'image',
    position: worldPos,
    size: { width: 32, height: 32 },
    src,
    alt: icon.label,
    objectFit: 'contain',
  };
  
  return iconNode;
}

/**
 * Create a component at the specified world position
 */
export function createComponent(
  worldPos: { x: number; y: number },
  rootNode: LayoutNode,
  selectedComponentId?: string
): LayoutNode | null {
  const template = COMPONENT_LIBRARY.find(c => c.id === selectedComponentId) ?? COMPONENT_LIBRARY[0];
  if (!template) return null;
  
  const groupNode = template.build(worldPos, makeId);
  
  // Generate unique name for the component
  const baseName = template.name;
  const existingNames = new Set<string>();
  const collectNames = (node: LayoutNode) => {
    if (node.name) existingNames.add(node.name as string);
    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach(collectNames);
    }
  };
  collectNames(rootNode);
  
  let finalName = baseName;
  let counter = 2;
  while (existingNames.has(finalName)) {
    finalName = `${baseName} ${String(counter).padStart(2, '0')}`;
    counter++;
  }
  
  groupNode.name = finalName;
  return groupNode;
}

/**
 * Create an image node at the specified world position
 */
export function createImageNode(
  worldPos: { x: number; y: number },
  src: string,
  width: number,
  height: number
): ImageNode {
  const id = makeId('image');
  const imageNode: ImageNode = {
    id,
    type: 'image',
    position: worldPos,
    size: { width, height },
    src,
    alt: 'Image',
    objectFit: 'contain',
  };
  return imageNode;
}
