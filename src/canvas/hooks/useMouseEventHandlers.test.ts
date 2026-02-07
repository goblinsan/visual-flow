import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMouseEventHandlers } from './useMouseEventHandlers';
import type Konva from 'konva';

describe('useMouseEventHandlers', () => {
  let mockProps: any;
  let mockStage: any;
  let mockEvent: any;

  beforeEach(() => {
    mockStage = {
      getPointerPosition: vi.fn(() => ({ x: 100, y: 100 })),
      getIntersection: vi.fn(() => null),
      x: vi.fn(() => 0),
      y: vi.fn(() => 0),
      scaleX: vi.fn(() => 1),
      scaleY: vi.fn(() => 1),
      findOne: vi.fn(() => null),
      find: vi.fn(() => []),
    };

    mockEvent = {
      target: {
        getStage: vi.fn(() => mockStage),
      },
      evt: {
        button: 0,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        preventDefault: vi.fn(),
      },
      cancelBubble: false,
    };

    mockProps = {
      tool: 'select',
      blockCanvasClicksRef: { current: false },
      spec: {
        root: {
          id: 'root',
          type: 'box' as const,
          children: [],
          size: { width: 800, height: 600 },
        },
      },
      setSpec: vi.fn(),
      selection: [],
      setSelection: vi.fn(),
      scale: 1,
      setScale: vi.fn(),
      setPos: vi.fn(),
      rectDraft: null,
      setRectDraft: vi.fn(),
      ellipseDraft: null,
      setEllipseDraft: vi.fn(),
      lineDraft: null,
      setLineDraft: vi.fn(),
      curveDraft: null,
      setCurveDraft: vi.fn(),
      dragSession: null,
      setDragSession: vi.fn(),
      marqueeSession: null,
      setMarqueeSession: vi.fn(),
      panning: false,
      setPanning: vi.fn(),
      panLastPosRef: { current: null },
      spacePan: false,
      trRef: { current: null },
      marqueeRectRef: { current: null },
      toWorld: vi.fn((stage, p) => p),
      getTopContainerAncestor: vi.fn((stage, id) => id),
      normalizeSelection: vi.fn((ids) => ids),
      isTransformerTarget: vi.fn(() => false),
      createImage: vi.fn(),
      createIcon: vi.fn(),
      createComponent: vi.fn(),
      finalizeRect: vi.fn(),
      finalizeEllipse: vi.fn(),
      finalizeLine: vi.fn(),
      startTextEdit: vi.fn(),
      justStartedTextEditRef: { current: false },
      onToolChange: vi.fn(),
      setMenu: vi.fn(),
      snapToGrid: false,
      snapToObjects: false,
      snapToSpacing: false,
      gridSize: 20,
      snapAnchor: 'both' as const,
      setSnapGuides: vi.fn(),
      setSpacingGuides: vi.fn(),
    };
  });

  describe('onMouseDown', () => {
    it('should block interactions if blockCanvasClicksRef is true', () => {
      mockProps.blockCanvasClicksRef.current = true;
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setRectDraft).not.toHaveBeenCalled();
      expect(mockProps.setSelection).not.toHaveBeenCalled();
    });

    it('should start rectangle draft in rect mode', () => {
      mockProps.tool = 'rect';
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setRectDraft).toHaveBeenCalledWith({
        start: { x: 100, y: 100 },
        current: { x: 100, y: 100 },
      });
    });

    it('should start ellipse draft in ellipse mode', () => {
      mockProps.tool = 'ellipse';
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setEllipseDraft).toHaveBeenCalledWith({
        start: { x: 100, y: 100 },
        current: { x: 100, y: 100 },
      });
    });

    it('should start line draft in line mode', () => {
      mockProps.tool = 'line';
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setLineDraft).toHaveBeenCalledWith({
        start: { x: 100, y: 100 },
        current: { x: 100, y: 100 },
      });
    });

    it('should start curve draft in curve mode', () => {
      mockProps.tool = 'curve';
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setCurveDraft).toHaveBeenCalledWith({
        points: [{ x: 100, y: 100 }],
        current: { x: 100, y: 100 },
      });
    });

    it('should add point to existing curve draft', () => {
      mockProps.tool = 'curve';
      mockProps.curveDraft = {
        points: [{ x: 50, y: 50 }],
        current: { x: 50, y: 50 },
      };
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setCurveDraft).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should create text node in text mode', () => {
      mockProps.tool = 'text';
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setSpec).toHaveBeenCalled();
      expect(mockProps.setSelection).toHaveBeenCalled();
      expect(mockProps.onToolChange).toHaveBeenCalledWith('select');
      expect(mockProps.startTextEdit).toHaveBeenCalled();
    });

    it('should create image in image mode', () => {
      mockProps.tool = 'image';
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.createImage).toHaveBeenCalledWith({ x: 100, y: 100 });
    });

    it('should zoom in on click in zoom mode', () => {
      mockProps.tool = 'zoom';
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setScale).toHaveBeenCalled();
      expect(mockProps.setPos).toHaveBeenCalled();
    });

    it('should zoom out on alt-click in zoom mode', () => {
      mockProps.tool = 'zoom';
      mockEvent.evt.altKey = true;
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setScale).toHaveBeenCalled();
      expect(mockProps.setPos).toHaveBeenCalled();
    });

    it('should start panning in pan mode', () => {
      mockProps.tool = 'pan';
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setPanning).toHaveBeenCalledWith(true);
      expect(mockProps.panLastPosRef.current).toEqual({ x: 100, y: 100 });
    });

    it('should create icon in icon mode', () => {
      mockProps.tool = 'icon';
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.createIcon).toHaveBeenCalledWith({ x: 100, y: 100 });
    });

    it('should create component in component mode', () => {
      mockProps.tool = 'component';
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.createComponent).toHaveBeenCalledWith({ x: 100, y: 100 });
    });

    it('should ignore clicks on transformer', () => {
      mockProps.isTransformerTarget.mockReturnValue(true);
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setSelection).not.toHaveBeenCalled();
      expect(mockProps.setDragSession).not.toHaveBeenCalled();
    });

    it('should start panning on middle button', () => {
      mockEvent.evt.button = 1;
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setPanning).toHaveBeenCalledWith(true);
    });

    it('should start panning with alt key in select mode', () => {
      mockEvent.evt.altKey = true;
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setPanning).toHaveBeenCalledWith(true);
    });

    it('should start marquee on empty space', () => {
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setMarqueeSession).toHaveBeenCalled();
      expect(mockProps.setSelection).toHaveBeenCalledWith([]);
    });

    it('should not clear selection on shift-click empty space', () => {
      mockEvent.evt.shiftKey = true;
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setMarqueeSession).toHaveBeenCalled();
      expect(mockProps.setSelection).not.toHaveBeenCalledWith([]);
    });

    it('should select node on click', () => {
      const mockNode = {
        id: () => 'node1',
        findAncestor: vi.fn(),
      };
      mockStage.getIntersection.mockReturnValue(mockNode);
      mockNode.findAncestor.mockReturnValue(mockNode);
      
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setSelection).toHaveBeenCalled();
    });

    it('should not start drag for locked nodes', () => {
      const mockNode = {
        id: () => 'node1',
        findAncestor: vi.fn(),
      };
      mockStage.getIntersection.mockReturnValue(mockNode);
      mockNode.findAncestor.mockReturnValue(mockNode);
      
      mockProps.spec.root.children = [{
        id: 'node1',
        type: 'box' as const,
        locked: true,
        children: [],
        size: { width: 100, height: 100 },
      }];

      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setDragSession).not.toHaveBeenCalled();
    });

    it('should clear context menu on interaction', () => {
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setMenu).toHaveBeenCalledWith(null);
    });
  });

  describe('onMouseMove', () => {
    it('should update rect draft position', () => {
      mockProps.tool = 'rect';
      mockProps.rectDraft = {
        start: { x: 50, y: 50 },
        current: { x: 50, y: 50 },
      };
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseMove(mockEvent);
      });

      expect(mockProps.setRectDraft).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should update ellipse draft position', () => {
      mockProps.tool = 'ellipse';
      mockProps.ellipseDraft = {
        start: { x: 50, y: 50 },
        current: { x: 50, y: 50 },
      };
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseMove(mockEvent);
      });

      expect(mockProps.setEllipseDraft).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should update line draft position', () => {
      mockProps.tool = 'line';
      mockProps.lineDraft = {
        start: { x: 50, y: 50 },
        current: { x: 50, y: 50 },
      };
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseMove(mockEvent);
      });

      expect(mockProps.setLineDraft).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should update curve draft position', () => {
      mockProps.tool = 'curve';
      mockProps.curveDraft = {
        points: [{ x: 50, y: 50 }],
        current: { x: 50, y: 50 },
      };
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseMove(mockEvent);
      });

      expect(mockProps.setCurveDraft).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle panning movement', () => {
      mockProps.panning = true;
      mockProps.panLastPosRef.current = { x: 50, y: 50 };
      mockStage.getPointerPosition.mockReturnValue({ x: 100, y: 100 });
      
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseMove(mockEvent);
      });

      expect(mockProps.setPos).toHaveBeenCalledWith(expect.any(Function));
      expect(mockProps.panLastPosRef.current).toEqual({ x: 100, y: 100 });
    });

    it('should initialize panLastPosRef if null during panning', () => {
      mockProps.panning = true;
      mockProps.panLastPosRef.current = null;
      mockStage.getPointerPosition.mockReturnValue({ x: 100, y: 100 });
      
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseMove(mockEvent);
      });

      expect(mockProps.panLastPosRef.current).toEqual({ x: 100, y: 100 });
      expect(mockProps.setPos).not.toHaveBeenCalled();
    });

    it('should update drag session', () => {
      mockProps.dragSession = {
        nodeIds: ['node1'],
        start: { x: 50, y: 50 },
        last: { x: 50, y: 50 },
        originPositions: { node1: { x: 0, y: 0 } },
        passedThreshold: false,
      };
      
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseMove(mockEvent);
      });

      expect(mockProps.setDragSession).toHaveBeenCalled();
    });

    it('should update marquee session', () => {
      const mockRect = {
        position: vi.fn(),
        size: vi.fn(),
        visible: vi.fn(),
        getLayer: vi.fn(() => ({ batchDraw: vi.fn() })),
      };
      mockProps.marqueeRectRef.current = mockRect;
      mockProps.marqueeSession = {
        start: { x: 50, y: 50 },
        last: { x: 50, y: 50 },
        baseSelection: [],
        isToggle: false,
      };
      
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseMove(mockEvent);
      });

      expect(mockRect.position).toHaveBeenCalled();
      expect(mockRect.size).toHaveBeenCalled();
      expect(mockRect.visible).toHaveBeenCalled();
      expect(mockProps.setMarqueeSession).toHaveBeenCalled();
    });
  });

  describe('onMouseUp', () => {
    it('should finalize rectangle draft', () => {
      mockProps.tool = 'rect';
      mockProps.rectDraft = {
        start: { x: 50, y: 50 },
        current: { x: 150, y: 150 },
      };
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseUp(mockEvent);
      });

      expect(mockProps.finalizeRect).toHaveBeenCalled();
    });

    it('should finalize ellipse draft', () => {
      mockProps.tool = 'ellipse';
      mockProps.ellipseDraft = {
        start: { x: 50, y: 50 },
        current: { x: 150, y: 150 },
      };
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseUp(mockEvent);
      });

      expect(mockProps.finalizeEllipse).toHaveBeenCalled();
    });

    it('should finalize line draft', () => {
      mockProps.tool = 'line';
      mockProps.lineDraft = {
        start: { x: 50, y: 50 },
        current: { x: 150, y: 150 },
      };
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseUp(mockEvent);
      });

      expect(mockProps.finalizeLine).toHaveBeenCalled();
    });

    it('should stop panning', () => {
      mockProps.panning = true;
      mockProps.panLastPosRef.current = { x: 100, y: 100 };
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseUp(mockEvent);
      });

      expect(mockProps.setPanning).toHaveBeenCalledWith(false);
      expect(mockProps.panLastPosRef.current).toBeNull();
    });

    it('should finalize drag session', () => {
      mockProps.dragSession = {
        nodeIds: ['node1'],
        start: { x: 0, y: 0 },
        last: { x: 100, y: 100 },
        originPositions: { node1: { x: 50, y: 50 } },
        passedThreshold: true,
      };
      
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseUp(mockEvent);
      });

      expect(mockProps.setSpec).toHaveBeenCalled();
      expect(mockProps.setDragSession).toHaveBeenCalledWith(null);
    });

    it('should finalize marquee session', () => {
      const mockRect = {
        visible: vi.fn(),
        getLayer: vi.fn(() => ({ batchDraw: vi.fn() })),
      };
      mockProps.marqueeRectRef.current = mockRect;
      mockProps.marqueeSession = {
        start: { x: 50, y: 50 },
        last: { x: 150, y: 150 },
        baseSelection: [],
        isToggle: false,
      };
      
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseUp(mockEvent);
      });

      expect(mockRect.visible).toHaveBeenCalledWith(false);
      expect(mockProps.setMarqueeSession).toHaveBeenCalledWith(null);
    });
  });

  describe('tool dispatch pattern', () => {
    it('should ignore non-left clicks for shape tools', () => {
      mockEvent.evt.button = 2; // right click
      mockProps.tool = 'rect';
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      expect(mockProps.setRectDraft).not.toHaveBeenCalled();
    });

    it('should return early for unsupported tools in select mode handlers', () => {
      mockProps.tool = 'unknown' as any;
      const { result } = renderHook(() => useMouseEventHandlers(mockProps));

      act(() => {
        result.current.onMouseDown(mockEvent);
      });

      // Should not crash and not call any handlers
      expect(mockProps.setRectDraft).not.toHaveBeenCalled();
      expect(mockProps.setSelection).not.toHaveBeenCalled();
    });
  });
});
