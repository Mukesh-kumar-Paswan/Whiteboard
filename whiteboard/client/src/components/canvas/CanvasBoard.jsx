import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Line,
  Arrow,
  Text,
  Transformer,
} from 'react-konva';
import TechNode from './TechNode';
import LiveCursors from './LiveCursors';

const CONNECTABLE_TYPES = new Set(['rect', 'circle', 'tech']);

const getElementBox = (el) => {
  if (!el) return null;
  if (el.type === 'circle') {
    const r = el.radius || 45;
    return {
      cx: el.x,
      cy: el.y,
      x: el.x - r,
      y: el.y - r,
      width: r * 2,
      height: r * 2,
      isCircle: true,
      radius: r,
    };
  }
  const width = el.width || (el.type === 'tech' ? 180 : 140);
  const height = el.height || (el.type === 'tech' ? 84 : 90);
  return {
    cx: el.x + width / 2,
    cy: el.y + height / 2,
    x: el.x,
    y: el.y,
    width,
    height,
    isCircle: false,
  };
};

const getBorderPoint = (box, targetX, targetY) => {
  const dx = targetX - box.cx;
  const dy = targetY - box.cy;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { x: box.cx, y: box.cy };

  if (box.isCircle) {
    return {
      x: box.cx + (dx / dist) * box.radius,
      y: box.cy + (dy / dist) * box.radius,
    };
  }

  const halfW = box.width / 2;
  const halfH = box.height / 2;
  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: box.cx + dx * scale,
    y: box.cy + dy * scale,
  };
};

const resolveArrowPoints = (arrow, elementsMap) => {
  const fallback = arrow.points || [0, 0, 0, 0];
  const fromEl = arrow.fromId ? elementsMap.get(arrow.fromId) : null;
  const toEl = arrow.toId ? elementsMap.get(arrow.toId) : null;

  const fromBox = getElementBox(fromEl);
  const toBox = getElementBox(toEl);

  if (fromBox && toBox) {
    const start = getBorderPoint(fromBox, toBox.cx, toBox.cy);
    const end = getBorderPoint(toBox, fromBox.cx, fromBox.cy);
    return [start.x, start.y, end.x, end.y];
  }

  if (fromBox) {
    const endX = fallback[2] ?? fromBox.cx + 120;
    const endY = fallback[3] ?? fromBox.cy;
    const start = getBorderPoint(fromBox, endX, endY);
    return [start.x, start.y, endX, endY];
  }

  if (toBox) {
    const startX = fallback[0] ?? toBox.cx - 120;
    const startY = fallback[1] ?? toBox.cy;
    const end = getBorderPoint(toBox, startX, startY);
    return [startX, startY, end.x, end.y];
  }

  return fallback;
};

const hitTestConnectable = (elements, x, y, excludeId = null) => {
  for (let i = elements.length - 1; i >= 0; i -= 1) {
    const el = elements[i];
    if (!CONNECTABLE_TYPES.has(el.type) || el.id === excludeId) continue;
    const box = getElementBox(el);
    if (!box) continue;

    if (box.isCircle) {
      if (Math.hypot(x - box.cx, y - box.cy) <= box.radius + 8) {
        return el;
      }
    } else if (
      x >= box.x - 8 &&
      x <= box.x + box.width + 8 &&
      y >= box.y - 8 &&
      y <= box.y + box.height + 8
    ) {
      return el;
    }
  }
  return null;
};

export default function CanvasBoard({
  stageRef,
  elements,
  onElementsChange,
  activeTool,
  setActiveTool,
  strokeColor,
  fillColor,
  strokeWidth,
  selectedId,
  setSelectedId,
  stageScale,
  setStageScale,
  stagePos,
  setStagePos,
  isFlowPlaying,
  isReadOnly,
  cursors,
  activePageId,
  onCursorMove,
}) {
  const containerRef = useRef(null);
  const trRef = useRef(null);
  const lastCursorEmitRef = useRef(0);

  const [dimensions, setDimensions] = useState({ width: 1000, height: 700 });
  const [draftElement, setDraftElement] = useState(null);
  const [editingElement, setEditingElement] = useState(null);
  const [editText, setEditText] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [flowProgress, setFlowProgress] = useState(0);

  const elementsMap = useMemo(() => {
    const map = new Map();
    elements.forEach((el) => map.set(el.id, el));
    return map;
  }, [elements]);

  // Keep stage dimensions synced with container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Attach Konva Transformer to selected shape
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (!selectedId || isReadOnly || activeTool !== 'select') {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const selectedEl = elementsMap.get(selectedId);
    if (!selectedEl || selectedEl.type === 'arrow' || selectedEl.type === 'pencil') {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const node = stage.findOne(`#${selectedId}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [selectedId, elements, isReadOnly, activeTool, elementsMap, stageRef]);

  // Animate glowing data packets along arrows when Play Flow is enabled
  useEffect(() => {
    if (!isFlowPlaying) {
      setFlowProgress(0);
      return;
    }

    let animationFrameId;
    let lastTime = performance.now();

    const tick = (now) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setFlowProgress((prev) => (prev + delta * 0.45) % 1);
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isFlowPlaying]);

  const getPointerWorldPos = (stage) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    return {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.08;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const rawScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const newScale = Math.min(3, Math.max(0.25, Number(rawScale.toFixed(3))));

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePos(newPos);
  };

  const handleStageMouseDown = (e) => {
    const stage = e.target.getStage();
    const clickedOnEmpty = e.target === stage;

    if (editingElement) {
      commitTextEdit();
    }

    if (clickedOnEmpty) {
      setSelectedId(null);
    }

    if (isReadOnly || activeTool === 'pan' || activeTool === 'select') {
      return;
    }

    const pos = getPointerWorldPos(stage);
    const id = `el-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;

    if (activeTool === 'text') {
      const newTextEl = {
        id,
        type: 'text',
        x: pos.x,
        y: pos.y,
        text: 'Double-click to edit',
        fontSize: 18,
        fill: strokeColor || '#F8FAFC',
        width: 220,
      };
      onElementsChange([...elements, newTextEl], true);
      setSelectedId(id);
      setActiveTool('select');
      openTextEditor(newTextEl);
      return;
    }

    if (activeTool === 'pencil') {
      setDraftElement({
        id,
        type: 'pencil',
        points: [pos.x, pos.y],
        stroke: strokeColor,
        strokeWidth: Math.max(2, strokeWidth),
      });
      return;
    }

    if (activeTool === 'rect') {
      setDraftElement({
        id,
        type: 'rect',
        x: pos.x,
        y: pos.y,
        width: 1,
        height: 1,
        stroke: strokeColor,
        fill: fillColor,
        strokeWidth,
      });
      return;
    }

    if (activeTool === 'circle') {
      setDraftElement({
        id,
        type: 'circle',
        x: pos.x,
        y: pos.y,
        radius: 1,
        stroke: strokeColor,
        fill: fillColor,
        strokeWidth,
      });
      return;
    }

    if (activeTool === 'arrow') {
      const startTarget = hitTestConnectable(elements, pos.x, pos.y);
      const startBox = getElementBox(startTarget);
      const startX = startBox ? startBox.cx : pos.x;
      const startY = startBox ? startBox.cy : pos.y;

      setDraftElement({
        id,
        type: 'arrow',
        fromId: startTarget ? startTarget.id : null,
        toId: null,
        points: [startX, startY, pos.x, pos.y],
        stroke: strokeColor,
        strokeWidth: Math.max(2, strokeWidth),
      });
    }
  };

  const handleStageMouseMove = (e) => {
    const stage = e.target.getStage();
    const pos = getPointerWorldPos(stage);

    const now = Date.now();
    if (onCursorMove && now - lastCursorEmitRef.current > 40) {
      lastCursorEmitRef.current = now;
      onCursorMove({ x: pos.x, y: pos.y });
    }

    if (!draftElement || isReadOnly) return;

    if (draftElement.type === 'pencil') {
      setDraftElement((prev) => ({
        ...prev,
        points: [...prev.points, pos.x, pos.y],
      }));
      return;
    }

    if (draftElement.type === 'rect') {
      setDraftElement((prev) => ({
        ...prev,
        width: pos.x - prev.x,
        height: pos.y - prev.y,
      }));
      return;
    }

    if (draftElement.type === 'circle') {
      setDraftElement((prev) => ({
        ...prev,
        radius: Math.max(4, Math.hypot(pos.x - prev.x, pos.y - prev.y)),
      }));
      return;
    }

    if (draftElement.type === 'arrow') {
      setDraftElement((prev) => ({
        ...prev,
        points: [prev.points[0], prev.points[1], pos.x, pos.y],
      }));
    }
  };

  const handleStageMouseUp = (e) => {
    if (!draftElement || isReadOnly) return;

    const stage = e.target.getStage();
    const pos = getPointerWorldPos(stage);
    let finalEl = { ...draftElement };

    if (finalEl.type === 'rect') {
      const normalizedX = finalEl.width < 0 ? finalEl.x + finalEl.width : finalEl.x;
      const normalizedY = finalEl.height < 0 ? finalEl.y + finalEl.height : finalEl.y;
      const absW = Math.abs(finalEl.width);
      const absH = Math.abs(finalEl.height);

      if (absW < 6 && absH < 6) {
        finalEl.width = 140;
        finalEl.height = 90;
      } else {
        finalEl.x = normalizedX;
        finalEl.y = normalizedY;
        finalEl.width = Math.max(20, absW);
        finalEl.height = Math.max(20, absH);
      }
    } else if (finalEl.type === 'circle') {
      if (finalEl.radius < 8) {
        finalEl.radius = 45;
      }
    } else if (finalEl.type === 'arrow') {
      const endTarget = hitTestConnectable(elements, pos.x, pos.y, finalEl.fromId);
      if (endTarget) {
        finalEl.toId = endTarget.id;
      }
      const dx = finalEl.points[2] - finalEl.points[0];
      const dy = finalEl.points[3] - finalEl.points[1];
      if (!finalEl.toId && Math.hypot(dx, dy) < 12) {
        setDraftElement(null);
        return;
      }
    } else if (finalEl.type === 'pencil') {
      if (finalEl.points.length < 4) {
        setDraftElement(null);
        return;
      }
    }

    onElementsChange([...elements, finalEl], true);
    setDraftElement(null);

    if (finalEl.type !== 'pencil') {
      setSelectedId(finalEl.id);
      setActiveTool('select');
    }
  };

  const handleElementSelect = (e, el) => {
    if (activeTool !== 'select') return;
    e.cancelBubble = true;
    setSelectedId(el.id);
  };

  const handleElementDragMove = (e, el) => {
    if (isReadOnly) return;
    const { x, y } = e.target.position();
    const updated = elements.map((item) =>
      item.id === el.id ? { ...item, x, y } : item
    );
    onElementsChange(updated, false);
  };

  const handleElementDragEnd = (e, el) => {
    if (isReadOnly) return;
    const { x, y } = e.target.position();
    const updated = elements.map((item) =>
      item.id === el.id ? { ...item, x, y } : item
    );
    onElementsChange(updated, true);
  };

  const handleTransformEnd = (e, el) => {
    if (isReadOnly) return;
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const updated = elements.map((item) => {
      if (item.id !== el.id) return item;

      if (item.type === 'circle') {
        const nextRadius = Math.max(15, (item.radius || 45) * Math.max(scaleX, scaleY));
        return { ...item, x: node.x(), y: node.y(), radius: nextRadius };
      }

      if (item.type === 'text') {
        return {
          ...item,
          x: node.x(),
          y: node.y(),
          width: Math.max(60, (item.width || 200) * scaleX),
          fontSize: Math.max(10, Math.round((item.fontSize || 18) * scaleY)),
        };
      }

      return {
        ...item,
        x: node.x(),
        y: node.y(),
        width: Math.max(60, (item.width || 140) * scaleX),
        height: Math.max(40, (item.height || 84) * scaleY),
      };
    });

    onElementsChange(updated, true);
  };

  const openTextEditor = (el) => {
    if (isReadOnly) return;
    setEditingElement(el);
    if (el.type === 'tech') {
      setEditText(el.label || '');
      setEditSubtitle(el.subtitle || '');
    } else {
      setEditText(el.text || '');
      setEditSubtitle('');
    }
  };

  const commitTextEdit = () => {
    if (!editingElement) return;

    const updated = elements.map((item) => {
      if (item.id !== editingElement.id) return item;
      if (item.type === 'tech') {
        return {
          ...item,
          label: editText.trim() || item.label,
          subtitle: editSubtitle.trim(),
        };
      }
      return {
        ...item,
        text: editText.trim() || 'Text',
      };
    });

    onElementsChange(updated, true);
    setEditingElement(null);
  };

  const canDragStage = isReadOnly || activeTool === 'pan';
  const canDragShapes = !isReadOnly && activeTool === 'select';
  const showPorts = !isReadOnly && activeTool === 'arrow';

  const allRenderElements = draftElement ? [...elements, draftElement] : elements;

  const arrows = allRenderElements.filter((el) => el.type === 'arrow');
  const nonArrows = allRenderElements.filter((el) => el.type !== 'arrow');

  const gridSpacing = Math.max(12, 24 * stageScale);
  const cursorClass =
    activeTool === 'pan' || isReadOnly
      ? 'cursor-grab active:cursor-grabbing'
      : activeTool === 'select'
      ? 'cursor-default'
      : 'cursor-crosshair';

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-slate-950 ${cursorClass}`}
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(148, 163, 184, 0.22) 1px, transparent 1px)',
        backgroundSize: `${gridSpacing}px ${gridSpacing}px`,
        backgroundPosition: `${stagePos.x}px ${stagePos.y}px`,
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable={canDragStage}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        <Layer>
          {/* Render Shapes, Freehand, Text, and Tech Nodes */}
          {nonArrows.map((el) => {
            const isSelected = el.id === selectedId;

            if (el.type === 'tech') {
              return (
                <TechNode
                  key={el.id}
                  element={el}
                  isSelected={isSelected}
                  isDraggable={canDragShapes}
                  showPorts={showPorts}
                  onSelect={handleElementSelect}
                  onDragMove={handleElementDragMove}
                  onDragEnd={handleElementDragEnd}
                  onDblClick={(_, item) => openTextEditor(item)}
                  onTransformEnd={handleTransformEnd}
                />
              );
            }

            if (el.type === 'rect') {
              return (
                <Rect
                  key={el.id}
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  fill={el.fill === 'transparent' ? 'rgba(0,0,0,0.01)' : el.fill}
                  stroke={isSelected ? '#60A5FA' : el.stroke}
                  strokeWidth={isSelected ? Math.max(2.5, el.strokeWidth) : el.strokeWidth}
                  cornerRadius={6}
                  draggable={canDragShapes}
                  onClick={(e) => handleElementSelect(e, el)}
                  onTap={(e) => handleElementSelect(e, el)}
                  onDragMove={(e) => handleElementDragMove(e, el)}
                  onDragEnd={(e) => handleElementDragEnd(e, el)}
                  onTransformEnd={(e) => handleTransformEnd(e, el)}
                />
              );
            }

            if (el.type === 'circle') {
              return (
                <Circle
                  key={el.id}
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  radius={el.radius}
                  fill={el.fill === 'transparent' ? 'rgba(0,0,0,0.01)' : el.fill}
                  stroke={isSelected ? '#60A5FA' : el.stroke}
                  strokeWidth={isSelected ? Math.max(2.5, el.strokeWidth) : el.strokeWidth}
                  draggable={canDragShapes}
                  onClick={(e) => handleElementSelect(e, el)}
                  onTap={(e) => handleElementSelect(e, el)}
                  onDragMove={(e) => handleElementDragMove(e, el)}
                  onDragEnd={(e) => handleElementDragEnd(e, el)}
                  onTransformEnd={(e) => handleTransformEnd(e, el)}
                />
              );
            }

            if (el.type === 'pencil') {
              return (
                <Line
                  key={el.id}
                  id={el.id}
                  points={el.points}
                  stroke={isSelected ? '#60A5FA' : el.stroke}
                  strokeWidth={el.strokeWidth || 2.5}
                  tension={0.4}
                  lineCap="round"
                  lineJoin="round"
                  hitStrokeWidth={12}
                  onClick={(e) => handleElementSelect(e, el)}
                  onTap={(e) => handleElementSelect(e, el)}
                />
              );
            }

            if (el.type === 'text') {
              return (
                <Text
                  key={el.id}
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width || 220}
                  text={el.text}
                  fontSize={el.fontSize || 18}
                  fill={el.fill || '#F8FAFC'}
                  draggable={canDragShapes}
                  onClick={(e) => handleElementSelect(e, el)}
                  onTap={(e) => handleElementSelect(e, el)}
                  onDblClick={() => openTextEditor(el)}
                  onDblTap={() => openTextEditor(el)}
                  onDragMove={(e) => handleElementDragMove(e, el)}
                  onDragEnd={(e) => handleElementDragEnd(e, el)}
                  onTransformEnd={(e) => handleTransformEnd(e, el)}
                />
              );
            }

            return null;
          })}

          {/* Render Smart Connector Arrows */}
          {arrows.map((arrow) => {
            const pts = resolveArrowPoints(arrow, elementsMap);
            const isSelected = arrow.id === selectedId;

            return (
              <Arrow
                key={arrow.id}
                id={arrow.id}
                points={pts}
                stroke={isSelected ? '#60A5FA' : arrow.stroke || '#94A3B8'}
                fill={isSelected ? '#60A5FA' : arrow.stroke || '#94A3B8'}
                strokeWidth={isSelected ? Math.max(3, arrow.strokeWidth || 2) : arrow.strokeWidth || 2}
                pointerLength={10}
                pointerWidth={9}
                hitStrokeWidth={14}
                onClick={(e) => handleElementSelect(e, arrow)}
                onTap={(e) => handleElementSelect(e, arrow)}
              />
            );
          })}

          {/* Animated Data Flow Packets */}
          {isFlowPlaying &&
            arrows.map((arrow) => {
              const pts = resolveArrowPoints(arrow, elementsMap);
              if (pts.length < 4) return null;
              const [x1, y1, x2, y2] = pts;
              const t1 = flowProgress;
              const t2 = (flowProgress + 0.5) % 1;

              return (
                <React.Fragment key={`flow-${arrow.id}`}>
                  <Circle
                    x={x1 + (x2 - x1) * t1}
                    y={y1 + (y2 - y1) * t1}
                    radius={5}
                    fill="#38BDF8"
                    shadowColor="#38BDF8"
                    shadowBlur={12}
                    listening={false}
                  />
                  <Circle
                    x={x1 + (x2 - x1) * t2}
                    y={y1 + (y2 - y1) * t2}
                    radius={4}
                    fill="#A855F7"
                    shadowColor="#A855F7"
                    shadowBlur={10}
                    listening={false}
                  />
                </React.Fragment>
              );
            })}

          <Transformer
            ref={trRef}
            rotateEnabled={false}
            borderStroke="#60A5FA"
            anchorStroke="#60A5FA"
            anchorFill="#0F172A"
            anchorSize={8}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 30 || newBox.height < 24) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>

        {/* Collaborator Live Cursors Layer */}
        <Layer listening={false}>
          <LiveCursors
            cursors={cursors}
            activePageId={activePageId}
            stageScale={stageScale}
          />
        </Layer>
      </Stage>

      {/* Inline Floating Text / Tech Node Editor */}
      {editingElement && !isReadOnly && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/50 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <h3 className="mb-3 text-sm font-semibold text-white">
              {editingElement.type === 'tech' ? 'Edit System Node' : 'Edit Text Label'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  {editingElement.type === 'tech' ? 'Title' : 'Text'}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitTextEdit();
                    if (e.key === 'Escape') setEditingElement(null);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              {editingElement.type === 'tech' && (
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Subtitle / Notes
                  </label>
                  <input
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitTextEdit();
                      if (e.key === 'Escape') setEditingElement(null);
                    }}
                    placeholder="e.g., Port 5432, Read Replicas"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingElement(null)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitTextEdit}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}