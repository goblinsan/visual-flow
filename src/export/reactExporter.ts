/**
 * React + Tailwind Exporter
 * 
 * Exports a LayoutSpec to React components using Tailwind CSS classes.
 * Generates runnable, typed React components.
 */

import type { LayoutNode, LayoutSpec, TextNode, RectNode, EllipseNode, FrameNode, StackNode, GridNode, GroupNode, ImageNode, LineNode, CurveNode, PolygonNode } from '../layout-schema';

export interface ReactExportOptions {
  /**
   * Component name for the root
   * @default "DesignComponent"
   */
  componentName?: string;
  
  /**
   * Include TypeScript types
   * @default true
   */
  typescript?: boolean;
  
  /**
   * Use functional component style
   * @default true
   */
  functional?: boolean;
  
  /**
   * Add comments in generated code
   * @default true
   */
  comments?: boolean;
}

/**
 * Export a LayoutSpec to React + Tailwind code
 */
export function exportToReact(
  spec: LayoutSpec,
  options: ReactExportOptions = {}
): string {
  const {
    componentName = 'DesignComponent',
    typescript = true,
    functional = true,
    comments = true,
  } = options;

  const imports = generateImports(typescript);
  const component = generateComponent(spec.root, componentName, typescript, functional, comments);
  
  return `${imports}\n\n${component}`;
}

function generateImports(typescript: boolean): string {
  const typeImport = typescript ? ', type FC' : '';
  return `import React${typeImport} from 'react';`;
}

function generateComponent(
  root: LayoutNode,
  name: string,
  typescript: boolean,
  functional: boolean,
  comments: boolean
): string {
  const typeAnnotation = typescript && functional ? ': FC' : '';
  const exportKeyword = 'export ';
  
  if (!functional) {
    // Class component (less common, but supported)
    return generateClassComponent(root, name, typescript, comments);
  }
  
  const jsx = nodeToJSX(root, 0, comments);
  
  return `${exportKeyword}const ${name}${typeAnnotation} = () => {
  return (
${indentLines(jsx, 2)}
  );
};`;
}

function generateClassComponent(
  root: LayoutNode,
  name: string,
  _typescript: boolean,
  comments: boolean
): string {
  const jsx = nodeToJSX(root, 0, comments);
  
  return `export class ${name} extends React.Component {
  render() {
    return (
${indentLines(jsx, 3)}
    );
  }
}`;
}

function nodeToJSX(node: LayoutNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  
  switch (node.type) {
    case 'frame':
      return frameToJSX(node, depth, comments);
    case 'stack':
      return stackToJSX(node, depth, comments);
    case 'grid':
      return gridToJSX(node, depth, comments);
    case 'group':
      return groupToJSX(node, depth, comments);
    case 'rect':
      return rectToJSX(node, depth, comments);
    case 'ellipse':
      return ellipseToJSX(node, depth, comments);
    case 'text':
      return textToJSX(node, depth, comments);
    case 'image':
      return imageToJSX(node, depth, comments);
    case 'line':
      return lineToJSX(node, depth, comments);
    case 'curve':
      return curveToJSX(node, depth, comments);
    case 'polygon':
      return polygonToJSX(node, depth, comments);
    default:
      return `${indent}<div>/* Unsupported node type: ${(node as LayoutNode).type} */</div>`;
  }
}

function frameToJSX(node: FrameNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  const classes = getFrameClasses(node);
  const styles = getFrameStyles(node);
  const comment = comments && node.name ? `${indent}{/* Frame: ${node.name} */}\n` : '';
  
  const children = node.children?.map(child => nodeToJSX(child, depth + 1, comments)).join('\n') || '';
  
  return `${comment}${indent}<div className="${classes}"${styles ? ` style={${styles}}` : ''}>
${children}
${indent}</div>`;
}

function stackToJSX(node: StackNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  const classes = getStackClasses(node);
  const styles = getStackStyles(node);
  const comment = comments && node.name ? `${indent}{/* Stack: ${node.name} */}\n` : '';
  
  const children = node.children?.map(child => nodeToJSX(child, depth + 1, comments)).join('\n') || '';
  
  return `${comment}${indent}<div className="${classes}"${styles ? ` style={${styles}}` : ''}>
${children}
${indent}</div>`;
}

function gridToJSX(node: GridNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  const classes = getGridClasses(node);
  const styles = getGridStyles(node);
  const comment = comments && node.name ? `${indent}{/* Grid: ${node.name} */}\n` : '';
  
  const children = node.children?.map(child => nodeToJSX(child, depth + 1, comments)).join('\n') || '';
  
  return `${comment}${indent}<div className="${classes}"${styles ? ` style={${styles}}` : ''}>
${children}
${indent}</div>`;
}

function groupToJSX(node: GroupNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  const classes = getGroupClasses(node);
  const styles = getGroupStyles(node);
  const comment = comments && node.name ? `${indent}{/* Group: ${node.name} */}\n` : '';
  
  const children = node.children?.map(child => nodeToJSX(child, depth + 1, comments)).join('\n') || '';
  
  return `${comment}${indent}<div className="${classes}"${styles ? ` style={${styles}}` : ''}>
${children}
${indent}</div>`;
}

function rectToJSX(node: RectNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  const classes = getRectClasses(node);
  const styles = getRectStyles(node);
  const comment = comments && node.name ? `${indent}{/* Rect: ${node.name} */}\n` : '';
  
  return `${comment}${indent}<div className="${classes}"${styles ? ` style={${styles}}` : ''}></div>`;
}

function ellipseToJSX(node: EllipseNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  const classes = getEllipseClasses(node);
  const styles = getEllipseStyles(node);
  const comment = comments && node.name ? `${indent}{/* Ellipse: ${node.name} */}\n` : '';
  
  return `${comment}${indent}<div className="${classes}"${styles ? ` style={${styles}}` : ''}></div>`;
}

function textToJSX(node: TextNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  const classes = getTextClasses(node);
  const styles = getTextStyles(node);
  const comment = comments && node.name ? `${indent}{/* Text: ${node.name} */}\n` : '';
  const text = escapeJSXText(node.text || '');
  
  return `${comment}${indent}<div className="${classes}"${styles ? ` style={${styles}}` : ''}>${text}</div>`;
}

function imageToJSX(node: ImageNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  const classes = getImageClasses(node);
  const styles = getImageStyles(node);
  const comment = comments && node.name ? `${indent}{/* Image: ${node.name} */}\n` : '';
  
  return `${comment}${indent}<img src="${node.src}" alt="${node.alt || ''}" className="${classes}"${styles ? ` style={${styles}}` : ''} />`;
}

function lineToJSX(node: LineNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  const comment = comments && node.name ? `${indent}{/* Line: ${node.name} */}\n` : '';
  
  // Lines are rendered as SVG
  const [x1, y1, x2, y2] = node.points;
  const styles = getLineStyles(node);
  
  return `${comment}${indent}<svg className="absolute" style={${styles}}>
${indent}  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${node.stroke || '#000'}" strokeWidth="${node.strokeWidth || 1}" />
${indent}</svg>`;
}

function curveToJSX(node: CurveNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  const comment = comments && node.name ? `${indent}{/* Curve: ${node.name} */}\n` : '';
  
  // Curves are rendered as SVG paths
  const pathData = curveToPath(node);
  const styles = getCurveStyles(node);
  
  return `${comment}${indent}<svg className="absolute" style={${styles}}>
${indent}  <path d="${pathData}" stroke="${node.stroke || '#000'}" strokeWidth="${node.strokeWidth || 1}" fill="${node.fill || 'none'}" />
${indent}</svg>`;
}

function polygonToJSX(node: PolygonNode, depth: number, comments: boolean): string {
  const indent = '  '.repeat(depth);
  const comment = comments && node.name ? `${indent}{/* Polygon: ${node.name} */}\n` : '';
  
  // Polygons are rendered as SVG
  const points = polygonPointsToString(node.points);
  const styles = getPolygonStyles(node);
  
  return `${comment}${indent}<svg className="absolute" style={${styles}}>
${indent}  <polygon points="${points}" fill="${node.fill || 'none'}" stroke="${node.stroke || '#000'}" strokeWidth="${node.strokeWidth || 1}" />
${indent}</svg>`;
}

// Helper functions for Tailwind classes
function getFrameClasses(node: FrameNode): string {
  const classes = ['relative'];
  
  if (node.size) {
    // Use inline styles for exact sizes
  }
  
  return classes.join(' ');
}

function getStackClasses(node: StackNode): string {
  const classes = ['flex'];
  
  if (node.direction === 'column') {
    classes.push('flex-col');
  } else {
    classes.push('flex-row');
  }
  
  if (node.align) {
    const alignMap = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    };
    classes.push(alignMap[node.align]);
  }
  
  if (node.justify) {
    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      'space-between': 'justify-between',
    };
    classes.push(justifyMap[node.justify]);
  }
  
  return classes.join(' ');
}

function getGridClasses(node: GridNode): string {
  const classes = ['grid'];
  
  if (node.columns) {
    classes.push(`grid-cols-${node.columns}`);
  }
  
  return classes.join(' ');
}

function getGroupClasses(_node: GroupNode): string {
  return 'relative';
}

function getRectClasses(node: RectNode): string {
  const classes = [];
  
  if (node.radius) {
    classes.push('rounded');
  }
  
  return classes.join(' ');
}

function getEllipseClasses(_node: EllipseNode): string {
  return 'rounded-full';
}

function getTextClasses(node: TextNode): string {
  const classes = [];
  
  if (node.fontWeight === 'bold') {
    classes.push('font-bold');
  }
  
  if (node.fontStyle === 'italic') {
    classes.push('italic');
  }
  
  if (node.align) {
    const alignMap = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };
    classes.push(alignMap[node.align]);
  }
  
  if (node.variant) {
    const variantMap = {
      h1: 'text-4xl font-bold',
      h2: 'text-3xl font-bold',
      h3: 'text-2xl font-bold',
      body: 'text-base',
      caption: 'text-sm',
    };
    classes.push(variantMap[node.variant]);
  }
  
  return classes.join(' ');
}

function getImageClasses(node: ImageNode): string {
  const classes = [];
  
  if (node.radius) {
    classes.push('rounded');
  }
  
  if (node.objectFit) {
    const fitMap = {
      cover: 'object-cover',
      contain: 'object-contain',
    };
    classes.push(fitMap[node.objectFit]);
  }
  
  return classes.join(' ');
}

// Helper functions for inline styles
function getFrameStyles(node: FrameNode): string {
  const styles: string[] = [];
  
  if (node.size) {
    styles.push(`width: '${node.size.width}px'`);
    styles.push(`height: '${node.size.height}px'`);
  }
  
  if (node.background) {
    styles.push(`backgroundColor: '${node.background}'`);
  }
  
  if (node.padding) {
    const p = typeof node.padding === 'number' ? node.padding : 
              `${node.padding.t}px ${node.padding.r}px ${node.padding.b}px ${node.padding.l}px`;
    styles.push(`padding: '${p}'`);
  }
  
  if (node.position) {
    styles.push(`position: 'absolute'`);
    styles.push(`left: '${node.position.x}px'`);
    styles.push(`top: '${node.position.y}px'`);
  }
  
  return styles.length > 0 ? `{ ${styles.join(', ')} }` : '';
}

function getStackStyles(node: StackNode): string {
  const styles: string[] = [];
  
  if (node.gap) {
    styles.push(`gap: '${node.gap}px'`);
  }
  
  if (node.padding) {
    styles.push(`padding: '${node.padding}px'`);
  }
  
  if (node.position) {
    styles.push(`position: 'absolute'`);
    styles.push(`left: '${node.position.x}px'`);
    styles.push(`top: '${node.position.y}px'`);
  }
  
  if (node.size) {
    styles.push(`width: '${node.size.width}px'`);
    styles.push(`height: '${node.size.height}px'`);
  }
  
  return styles.length > 0 ? `{ ${styles.join(', ')} }` : '';
}

function getGridStyles(node: GridNode): string {
  const styles: string[] = [];
  
  if (node.gap) {
    styles.push(`gap: '${node.gap}px'`);
  }
  
  if (node.padding) {
    styles.push(`padding: '${node.padding}px'`);
  }
  
  if (node.position) {
    styles.push(`position: 'absolute'`);
    styles.push(`left: '${node.position.x}px'`);
    styles.push(`top: '${node.position.y}px'`);
  }
  
  if (node.size) {
    styles.push(`width: '${node.size.width}px'`);
    styles.push(`height: '${node.size.height}px'`);
  }
  
  return styles.length > 0 ? `{ ${styles.join(', ')} }` : '';
}

function getGroupStyles(node: GroupNode): string {
  const styles: string[] = [];
  
  if (node.position) {
    styles.push(`position: 'absolute'`);
    styles.push(`left: '${node.position.x}px'`);
    styles.push(`top: '${node.position.y}px'`);
  }
  
  if (node.size) {
    styles.push(`width: '${node.size.width}px'`);
    styles.push(`height: '${node.size.height}px'`);
  }
  
  return styles.length > 0 ? `{ ${styles.join(', ')} }` : '';
}

function getRectStyles(node: RectNode): string {
  const styles: string[] = [];
  
  if (node.position) {
    styles.push(`position: 'absolute'`);
    styles.push(`left: '${node.position.x}px'`);
    styles.push(`top: '${node.position.y}px'`);
  }
  
  if (node.size) {
    styles.push(`width: '${node.size.width}px'`);
    styles.push(`height: '${node.size.height}px'`);
  }
  
  if (node.fill) {
    styles.push(`backgroundColor: '${node.fill}'`);
  }
  
  if (node.stroke) {
    styles.push(`border: '${node.strokeWidth || 1}px solid ${node.stroke}'`);
  }
  
  if (node.radius) {
    styles.push(`borderRadius: '${node.radius}px'`);
  }
  
  if (node.opacity !== undefined) {
    styles.push(`opacity: ${node.opacity}`);
  }
  
  return styles.length > 0 ? `{ ${styles.join(', ')} }` : '';
}

function getEllipseStyles(node: EllipseNode): string {
  const styles: string[] = [];
  
  if (node.position) {
    styles.push(`position: 'absolute'`);
    styles.push(`left: '${node.position.x}px'`);
    styles.push(`top: '${node.position.y}px'`);
  }
  
  if (node.size) {
    styles.push(`width: '${node.size.width}px'`);
    styles.push(`height: '${node.size.height}px'`);
  }
  
  if (node.fill) {
    styles.push(`backgroundColor: '${node.fill}'`);
  }
  
  if (node.stroke) {
    styles.push(`border: '${node.strokeWidth || 1}px solid ${node.stroke}'`);
  }
  
  if (node.opacity !== undefined) {
    styles.push(`opacity: ${node.opacity}`);
  }
  
  return styles.length > 0 ? `{ ${styles.join(', ')} }` : '';
}

function getTextStyles(node: TextNode): string {
  const styles: string[] = [];
  
  if (node.position) {
    styles.push(`position: 'absolute'`);
    styles.push(`left: '${node.position.x}px'`);
    styles.push(`top: '${node.position.y}px'`);
  }
  
  if (node.size) {
    styles.push(`width: '${node.size.width}px'`);
    styles.push(`height: '${node.size.height}px'`);
  }
  
  if (node.color) {
    styles.push(`color: '${node.color}'`);
  }
  
  if (node.fontSize) {
    styles.push(`fontSize: '${node.fontSize}px'`);
  }
  
  if (node.fontFamily) {
    styles.push(`fontFamily: '${node.fontFamily}'`);
  }
  
  if (node.opacity !== undefined) {
    styles.push(`opacity: ${node.opacity}`);
  }
  
  return styles.length > 0 ? `{ ${styles.join(', ')} }` : '';
}

function getImageStyles(node: ImageNode): string {
  const styles: string[] = [];
  
  if (node.position) {
    styles.push(`position: 'absolute'`);
    styles.push(`left: '${node.position.x}px'`);
    styles.push(`top: '${node.position.y}px'`);
  }
  
  if (node.size) {
    styles.push(`width: '${node.size.width}px'`);
    styles.push(`height: '${node.size.height}px'`);
  }
  
  if (node.radius) {
    styles.push(`borderRadius: '${node.radius}px'`);
  }
  
  if (node.opacity !== undefined) {
    styles.push(`opacity: ${node.opacity}`);
  }
  
  return styles.length > 0 ? `{ ${styles.join(', ')} }` : '';
}

function getLineStyles(_node: LineNode): string {
  const styles: string[] = [];
  
  if (_node.position) {
    styles.push(`left: '${_node.position.x}px'`);
    styles.push(`top: '${_node.position.y}px'`);
  }
  
  return styles.length > 0 ? `{ ${styles.join(', ')} }` : '{}';
}

function getCurveStyles(_node: CurveNode): string {
  const styles: string[] = [];
  
  if (_node.position) {
    styles.push(`left: '${_node.position.x}px'`);
    styles.push(`top: '${_node.position.y}px'`);
  }
  
  return styles.length > 0 ? `{ ${styles.join(', ')} }` : '{}';
}

function getPolygonStyles(_node: PolygonNode): string {
  const styles: string[] = [];
  
  if (_node.position) {
    styles.push(`left: '${_node.position.x}px'`);
    styles.push(`top: '${_node.position.y}px'`);
  }
  
  return styles.length > 0 ? `{ ${styles.join(', ')} }` : '{}';
}

// Utility functions
function indentLines(text: string, levels: number): string {
  const indent = '  '.repeat(levels);
  return text.split('\n').map(line => indent + line).join('\n');
}

function escapeJSXText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function curveToPath(_node: CurveNode): string {
  // Simple conversion - just use the points as a path
  if (!_node.points || _node.points.length < 2) return '';
  
  let path = `M ${_node.points[0]} ${_node.points[1]}`;
  
  for (let i = 2; i < _node.points.length; i += 2) {
    path += ` L ${_node.points[i]} ${_node.points[i + 1]}`;
  }
  
  if (_node.closed) {
    path += ' Z';
  }
  
  return path;
}

function polygonPointsToString(points: number[]): string {
  const pairs: string[] = [];
  for (let i = 0; i < points.length; i += 2) {
    pairs.push(`${points[i]},${points[i + 1]}`);
  }
  return pairs.join(' ');
}
