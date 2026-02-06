import { useCallback, useState } from 'react';
import type Konva from 'konva';
import type { LayoutSpec, LayoutNode, FrameNode, TextNode, Size } from '../../layout-schema';
import { mapNode } from '../../commands/types';
import { applyPosition, applyPositionAndSize } from '../stage-internal';

interface TransformSession {
  nodes: Record<string, { topLeft: {x:number;y:number}; size:{width:number;height:number}; center:{x:number;y:number} }>;
  selectionBox?: { x:number; y:number; width:number; height:number; center:{x:number;y:number} };
}

const nodeHasSize = (node: LayoutNode): node is LayoutNode & { size: Size } =>
  'size' in node && Boolean((node as { size?: Size }).size);

export function useTransformManager(
  trRef: React.RefObject<Konva.Transformer | null>,
  spec: LayoutSpec,
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void,
  selected: string[],
  findNode: (root: LayoutNode, id: string) => LayoutNode | null
) {
  const [transformSession, setTransformSession] = useState<TransformSession | null>(null);

  const onTransform = useCallback(() => {
    if (transformSession) return;
    const tr = trRef.current; if (!tr) return;
    const stage = tr.getStage(); if (!stage) return;
    const nodes = tr.nodes(); if (!nodes.length) return;

    const snapshot: TransformSession = { nodes: {} };

    let minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;

    nodes.forEach(n => {
      const id = n.id(); if (!id) return;
      const specNode = findNode(spec.root, id);
      let width = 0, height = 0;
      if (specNode && nodeHasSize(specNode)) { width = specNode.size.width; height = specNode.size.height; }
      else {
        const bb = n.getClientRect({ relativeTo: stage });
        width = bb.width; height = bb.height;
      }
      const topLeft = { x: n.x(), y: n.y() };
      const center = { x: topLeft.x + width / 2, y: topLeft.y + height / 2 };
      snapshot.nodes[id] = { topLeft, size: { width, height }, center };
      minX = Math.min(minX, center.x); minY = Math.min(minY, center.y);
      maxX = Math.max(maxX, center.x); maxY = Math.max(maxY, center.y);
    });

    if (nodes.length > 1 && isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
      const selW = maxX - minX;
      const selH = maxY - minY;
      snapshot.selectionBox = { x: minX, y: minY, width: selW, height: selH, center: { x: minX + selW/2, y: minY + selH/2 } };
    }

    setTransformSession(snapshot);
  }, [transformSession, spec.root, findNode, trRef]);

  const onTransformEnd = useCallback(() => {
    const nodes = trRef.current?.nodes() ?? [];
    if (nodes.length === 0) return;

    if (nodes.length > 1) {
      const firstNode = nodes[0];
      const scaleX = firstNode.scaleX();
      const scaleY = firstNode.scaleY();
      const rotationDeg = firstNode.rotation();
      nodes.forEach(node => {
        const nodeId = node.id(); if (!nodeId) return;
        const currentNode = findNode(spec.root, nodeId); if (!currentNode) return;
        const newPos = { x: node.x(), y: node.y() };
        setSpec(prev => applyPosition(prev, nodeId, newPos));
        setSpec(prev => ({
          ...prev,
          root: mapNode<FrameNode>(prev.root, nodeId, (n) => ({
            ...n,
            rotation: rotationDeg
          }))
        }));
        if (scaleX !== 1 || scaleY !== 1) {
          if (currentNode.type === 'text') {
            const textNode = currentNode as TextNode;
            const baseFontSize = textNode.fontSize ?? (textNode.variant === 'h1' ? 28 : textNode.variant === 'h2' ? 22 : textNode.variant === 'h3' ? 18 : 14);
            const scaleFactor = Math.max(0.1, scaleY);
            const newFontSize = Math.round(Math.max(8, baseFontSize * scaleFactor));
            
            setSpec(prev => ({
              ...prev,
              root: mapNode<FrameNode>(prev.root, nodeId, (n) => {
                if (n.type !== 'text') return n;
                const textN = n as TextNode;
                const result: TextNode = {
                  ...textN,
                  fontSize: newFontSize,
                  position: { x: newPos.x, y: newPos.y },
                };
                if (textN.spans && textN.spans.length > 0) {
                  result.spans = textN.spans.map(span => {
                    if (span.fontSize) {
                      return { ...span, fontSize: Math.round(Math.max(8, span.fontSize * scaleFactor)) };
                    }
                    return span;
                  });
                }
                return result;
              })
            }));
          } else if (nodeHasSize(currentNode)) {
            const newSize = {
              width: Math.round(currentNode.size.width * scaleX),
              height: Math.round(currentNode.size.height * scaleY)
            };
            if (currentNode.type === 'image') {
              const nonUniform = Math.abs(scaleX - scaleY) > 0.0001;
              setSpec(prev => ({
                ...prev,
                root: mapNode<FrameNode>(prev.root, nodeId, (n) => {
                  if (n.type !== 'image') return n;
                  return {
                    ...n,
                    position: { x: newPos.x, y: newPos.y },
                    size: newSize,
                    preserveAspect: nonUniform ? false : (n.preserveAspect !== undefined ? n.preserveAspect : true),
                    objectFit: nonUniform ? undefined : n.objectFit
                  };
                })
              }));
            } else {
              setSpec(prev => applyPositionAndSize(prev, nodeId, newPos, newSize));
            }
          }
        }
        node.scaleX(1); node.scaleY(1); node.rotation(0);
      });
    } else {
      const node = nodes[0];
      const nodeId = node.id();
      if (!nodeId) return;

      const newPos = { x: node.x(), y: node.y() };
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const rotationDeg = node.rotation();

      const currentNode = findNode(spec.root, nodeId);
      if (!currentNode) return;
      
      const isGroup = currentNode?.type === 'group';

      setSpec(prev => applyPosition(prev, nodeId, newPos));
      setSpec(prev => ({
        ...prev,
        root: mapNode<FrameNode>(prev.root, nodeId, (n) => ({
          ...n,
          rotation: rotationDeg
        }))
      }));
      
      if (scaleX !== 1 || scaleY !== 1) {
        if (isGroup && currentNode.children) {
          setSpec(prev => ({
            ...prev,
            root: mapNode<FrameNode>(prev.root, nodeId, (groupNode) => {
              if (groupNode.type !== 'group') return groupNode;
            
              let newGroupSize = groupNode.size;
              if (groupNode.size) {
                newGroupSize = {
                  width: Math.round(groupNode.size.width * scaleX),
                  height: Math.round(groupNode.size.height * scaleY)
                };
              }
            
              const scaledChildren = groupNode.children.map((child) => {
                const scaledChild = { ...child };
              
                if (child.position) {
                  scaledChild.position = {
                    x: Math.round(child.position.x * scaleX),
                    y: Math.round(child.position.y * scaleY)
                  };
                }
                
                if (nodeHasSize(child)) {
                  scaledChild.size = {
                    width: Math.round(child.size.width * scaleX),
                    height: Math.round(child.size.height * scaleY)
                  };
                }
              
                return scaledChild;
              });
            
              return {
                ...groupNode,
                size: newGroupSize,
                children: scaledChildren
              };
            })
          }));
        } else if (currentNode.type === 'text') {
          const textNode = currentNode as TextNode;
          const baseFontSize = textNode.fontSize ?? (textNode.variant === 'h1' ? 28 : textNode.variant === 'h2' ? 22 : textNode.variant === 'h3' ? 18 : 14);
          const scaleFactor = Math.max(0.1, scaleY);
          const newFontSize = Math.round(Math.max(8, baseFontSize * scaleFactor));
          
          setSpec(prev => ({
            ...prev,
            root: mapNode<FrameNode>(prev.root, nodeId, (n) => {
              if (n.type !== 'text') return n;
              const textN = n as TextNode;
              const result: TextNode = {
                ...textN,
                fontSize: newFontSize,
              };
              if (textN.spans && textN.spans.length > 0) {
                result.spans = textN.spans.map(span => {
                  if (span.fontSize) {
                    return { ...span, fontSize: Math.round(Math.max(8, span.fontSize * scaleFactor)) };
                  }
                  return span;
                });
              }
              return result;
            })
          }));
        } else {
          if (currentNode && nodeHasSize(currentNode)) {
            const newSize = {
              width: Math.round(currentNode.size.width * scaleX),
              height: Math.round(currentNode.size.height * scaleY)
            };
            if (currentNode.type === 'image') {
              const nonUniform = Math.abs(scaleX - scaleY) > 0.0001;
              setSpec(prev => ({
                ...prev,
                root: mapNode<FrameNode>(prev.root, nodeId, (n) => {
                  if (n.type !== 'image') return n;
                  return {
                    ...n,
                    position: { x: newPos.x, y: newPos.y },
                    size: newSize,
                    preserveAspect: nonUniform ? false : (n.preserveAspect !== undefined ? n.preserveAspect : true),
                    objectFit: nonUniform ? undefined : n.objectFit
                  };
                })
              }));
            } else {
              setSpec(prev => applyPositionAndSize(prev, nodeId, newPos, newSize));
            }
          }
        }
      }

      node.scaleX(1);
      node.scaleY(1);
      node.rotation(0);
    }

    setTransformSession(null);

    setTimeout(() => {
      const tr = trRef.current;
      if (!tr) return;
      const stage = tr.getStage();
      if (!stage) return;
      
      const targets = selected.map(id => stage.findOne(`#${CSS.escape(id)}`)).filter(Boolean) as Konva.Node[];
      tr.nodes(targets);
      tr.forceUpdate();
      tr.getLayer()?.batchDraw();
    }, 0);
  }, [setSpec, spec.root, selected, findNode, trRef]);

  return {
    transformSession,
    onTransform,
    onTransformEnd,
  };
}
