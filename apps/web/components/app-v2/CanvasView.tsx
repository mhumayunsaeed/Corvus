"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import {
  MousePointer2,
  Hand,
  PenLine,
  Highlighter,
  Square,
  Circle,
  MoveUpRight,
  Type,
  StickyNote,
  Eraser,
  Contrast,
  type LucideIcon,
} from "lucide-react";
import { ChannelGlyph } from "@/components/ui";

type Tool = "select" | "hand" | "pen" | "highlighter" | "rect" | "circle" | "arrow" | "text" | "sticky" | "eraser";

const TOOLS: { id: Tool; icon: LucideIcon; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "hand", icon: Hand, label: "Hand" },
  { id: "pen", icon: PenLine, label: "Pen" },
  { id: "highlighter", icon: Highlighter, label: "Highlighter" },
  { id: "rect", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "arrow", icon: MoveUpRight, label: "Arrow" },
  { id: "text", icon: Type, label: "Text" },
  { id: "sticky", icon: StickyNote, label: "Sticky note" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
];

interface Shape {
  id: string;
  tool: Tool;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Pen path points / text content. */
  points?: [number, number][];
  text?: string;
  color?: string;
  width?: number;
  style?: "solid" | "dashed" | "dotted";
}

const COLORS = [
  { id: "default", value: "currentColor", label: "Default" },
  { id: "red", value: "#ef4444", label: "Red" },
  { id: "orange", value: "#f97316", label: "Orange" },
  { id: "yellow", value: "#eab308", label: "Yellow" },
  { id: "green", value: "#22c55e", label: "Green" },
  { id: "blue", value: "#3b82f6", label: "Blue" },
  { id: "purple", value: "#a855f7", label: "Purple" },
  { id: "pink", value: "#ec4899", label: "Pink" },
];

const WIDTHS = [
  { value: 1.5, label: "Thin" },
  { value: 3.5, label: "Medium" },
  { value: 6.5, label: "Thick" },
];

const STYLES = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
] as const;

/**
 * Collaborative canvas (brief §Canvas) — an Excalidraw-level whiteboard.
 * Dot-grid base surface, vertical overlay toolbar on the left edge. Sticky
 * notes are raised surfaces — no yellow, no pastels.
 */
export function CanvasView({
  channelName,
  bare,
  storageKey,
}: {
  channelName: string;
  /** Skip the channel header — used when embedded as a call whiteboard. */
  bare?: boolean;
  /** Persist drawings under this key (e.g. the channel id). */
  storageKey?: string;
}) {
  const [tool, setTool] = useState<Tool>("pen");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [lightBoard, setLightBoard] = useState(false);
  const [strokeColor, setStrokeColor] = useState<string>("default");
  const [strokeWidth, setStrokeWidth] = useState<number>(1.5);
  const [strokeStyle, setStyle] = useState<"solid" | "dashed" | "dotted">("solid");
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [editingPos, setEditingPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const draggedShapeStart = useRef<{
    id: string;
    startX: number;
    startY: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    points?: [number, number][];
  } | null>(null);
  
  useEffect(() => {
    if (tool !== "select") {
      setSelectedShapeId(null);
    }
  }, [tool]);
  const svgRef = useRef<SVGSVGElement>(null);
  const panStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const erasing = useRef(false);
  const loaded = useRef(false);

  const finishEditing = () => {
    if (!editingShapeId) return;
    setShapes((prev) =>
      prev
        .map((sh) => {
          if (sh.id === editingShapeId) {
            const trimmed = editingText.trim();
            if (!trimmed) return null; // delete shape if text is cleared
            return { ...sh, text: trimmed };
          }
          return sh;
        })
        .filter(Boolean) as Shape[]
    );
    setEditingShapeId(null);
    setEditingText("");
  };

  // Persisted drawings — load once, then write through.
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(`corvus-canvas-${storageKey}`);
      if (raw) setShapes(JSON.parse(raw) as Shape[]);
    } catch {
      /* corrupt cache — start clean */
    }
    loaded.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !loaded.current) return;
    try {
      localStorage.setItem(`corvus-canvas-${storageKey}`, JSON.stringify(shapes));
    } catch {
      /* storage full — keep drawing in memory */
    }
  }, [shapes, storageKey]);

  const toCanvas = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left - pan.x, y: e.clientY - rect.top - pan.y };
  };

  // Drag-erase: anything within reach of the pointer goes, no precise
  // clicking on 1.5px strokes required.
  const eraseAt = (x: number, y: number) =>
    setShapes((s) => s.filter((sh) => !hitTest(sh, x, y, 12)));

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (tool === "hand") {
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      return;
    }
    if (tool === "eraser") {
      erasing.current = true;
      const { x, y } = toCanvas(e);
      eraseAt(x, y);
      return;
    }
    if (tool === "select") {
      const { x, y } = toCanvas(e);
      const clicked = shapes.find((sh) => hitTest(sh, x, y, 12));
      if (clicked) {
        setSelectedShapeId(clicked.id);
        draggedShapeStart.current = {
          id: clicked.id,
          startX: x,
          startY: y,
          x1: clicked.x1,
          y1: clicked.y1,
          x2: clicked.x2,
          y2: clicked.y2,
          points: clicked.points ? clicked.points.map((p) => [...p] as [number, number]) : undefined,
        };
      } else {
        setSelectedShapeId(null);
      }
      return;
    }
    const { x, y } = toCanvas(e);
    const shape: Shape = {
      id: `sh${Date.now()}`,
      tool,
      x1: x,
      y1: y,
      x2: x,
      y2: y,
      points: ["pen", "highlighter"].includes(tool) ? [[x, y]] : undefined,
      text: tool === "text" ? "Text" : tool === "sticky" ? "Note" : undefined,
      color: strokeColor,
      width: strokeWidth,
      style: strokeStyle,
    };
    setDraft(shape);
  };

  const onMove = (e: React.PointerEvent) => {
    if (panStart.current) {
      setPan({
        x: panStart.current.px + e.clientX - panStart.current.x,
        y: panStart.current.py + e.clientY - panStart.current.y,
      });
      return;
    }
    if (draggedShapeStart.current) {
      const { x, y } = toCanvas(e);
      const dx = x - draggedShapeStart.current.startX;
      const dy = y - draggedShapeStart.current.startY;
      const targetId = draggedShapeStart.current.id;
      
      setShapes((prev) =>
        prev.map((sh) => {
          if (sh.id === targetId) {
            const start = draggedShapeStart.current!;
            if (sh.points && start.points) {
              return {
                ...sh,
                x1: start.x1 + dx,
                y1: start.y1 + dy,
                x2: start.x2 + dx,
                y2: start.y2 + dy,
                points: start.points.map(([px, py]) => [px + dx, py + dy] as [number, number]),
              };
            }
            return {
              ...sh,
              x1: start.x1 + dx,
              y1: start.y1 + dy,
              x2: start.x2 + dx,
              y2: start.y2 + dy,
            };
          }
          return sh;
        })
      );
      return;
    }
    if (erasing.current) {
      const { x, y } = toCanvas(e);
      eraseAt(x, y);
      return;
    }
    if (!draft) return;
    const { x, y } = toCanvas(e);
    setDraft({
      ...draft,
      x2: x,
      y2: y,
      points: ["pen", "highlighter"].includes(draft.tool) ? [...(draft.points ?? []), [x, y]] : draft.points,
    });
  };

  const onUp = (e: React.PointerEvent) => {
    panStart.current = null;
    erasing.current = false;
    
    if (draggedShapeStart.current) {
      const { x, y } = toCanvas(e);
      const dist = Math.hypot(x - draggedShapeStart.current.startX, y - draggedShapeStart.current.startY);
      if (dist < 4) {
        const clickedShape = shapes.find((sh) => sh.id === draggedShapeStart.current!.id);
        if (clickedShape && (clickedShape.tool === "text" || clickedShape.tool === "sticky")) {
          setEditingShapeId(clickedShape.id);
          setEditingText(clickedShape.text ?? "");
          setEditingPos({ x: clickedShape.x1, y: clickedShape.y1 });
        }
      }
      draggedShapeStart.current = null;
    }
    
    if (draft) {
      setShapes((s) => [...s, draft]);
      if (draft.tool === "text" || draft.tool === "sticky") {
        setEditingShapeId(draft.id);
        setEditingText("");
        setEditingPos({ x: draft.x1, y: draft.y1 });
      }
      setDraft(null);
    }
  };

  const all = draft ? [...shapes, draft] : shapes;
  const sortedAll = [...all].sort((a, b) => {
    if (a.tool === "highlighter" && b.tool !== "highlighter") return -1;
    if (a.tool !== "highlighter" && b.tool === "highlighter") return 1;
    return 0;
  });

  return (
    <section
      data-theme={lightBoard ? "light" : undefined}
      className="relative flex h-full min-w-0 flex-1 flex-col bg-background"
    >
      {!bare && (
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
          <ChannelGlyph type="canvas" size={16} />
          <h1 className="text-[15px] font-semibold text-text-primary">{channelName}</h1>
          <span className="ml-auto font-mono text-[11px] text-text-muted">{shapes.length} objects</span>
        </header>
      )}

      <div className="relative min-h-0 flex-1">
        {/* Dot grid base */}
        <svg
          ref={svgRef}
          className={cn(
            "h-full w-full touch-none",
            tool === "hand"
              ? "cursor-grab active:cursor-grabbing"
              : tool === "eraser"
                ? "cursor-cell"
                : "cursor-crosshair"
          )}
          style={{
            backgroundImage:
              "radial-gradient(circle, rgb(var(--c-border)) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          <g transform={`translate(${pan.x} ${pan.y})`}>
            {sortedAll.map((sh) => (
              <ShapeEl key={sh.id} shape={sh} selected={sh.id === selectedShapeId} />
            ))}
          </g>
        </svg>

        {/* Toolbar — vertical on the left edge; horizontal and compact when
            embedded as a call whiteboard so it never outgrows the stage. */}
        <div
          className={cn(
            "absolute flex rounded-[10px] border border-border bg-surface-overlay p-1",
            bare
              ? "left-1/2 top-2 -translate-x-1/2 flex-row items-center gap-0.5"
              : "left-3 top-1/2 -translate-y-1/2 flex-col gap-0.5"
          )}
        >
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={t.label}
              title={t.label}
              data-active={tool === t.id}
              onClick={() => setTool(t.id)}
              className={cn(
                "flex items-center justify-center rounded-sm transition-colors",
                bare ? "h-8 w-8" : "h-9 w-9",
                tool === t.id
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
              )}
            >
              <t.icon size={16} />
            </button>
          ))}
          <div className={cn("bg-border", bare ? "mx-1 my-1 w-px self-stretch" : "mx-1 my-1 h-px")} />
          <button
            type="button"
            aria-label={lightBoard ? "Dark board" : "White board"}
            title={lightBoard ? "Dark board" : "White board"}
            aria-pressed={lightBoard}
            onClick={() => setLightBoard((v) => !v)}
            className={cn(
              "flex items-center justify-center rounded-sm transition-colors",
              bare ? "h-8 w-8" : "h-9 w-9",
              lightBoard
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
            )}
          >
            <Contrast size={16} />
          </button>
        </div>

        {/* Inline Text Editor */}
        {editingShapeId && (() => {
          const editingShape = shapes.find((s) => s.id === editingShapeId);
          if (!editingShape) return null;
          const isSticky = editingShape.tool === "sticky";
          const stroke = editingShape.color && editingShape.color !== "default"
            ? COLORS.find((c) => c.id === editingShape.color)?.value || "rgb(var(--c-text-primary))"
            : "rgb(var(--c-text-primary))";
          
          return (
            <textarea
              autoFocus
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={(e) => {
                if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
                  e.preventDefault();
                  finishEditing();
                }
              }}
              className={cn(
                "absolute z-20 m-0 p-1 border border-accent bg-background rounded-md outline-none resize-none shadow-lg font-sans",
                isSticky ? "text-[13px] leading-tight" : "text-[15px] leading-normal"
              )}
              style={{
                left: (isSticky ? editingPos.x + 12 : editingPos.x) + pan.x,
                top: (isSticky ? editingPos.y + 28 : editingPos.y - 12) + pan.y,
                width: isSticky ? Math.max(Math.abs(editingShape.x2 - editingShape.x1) - 24, 96) : 200,
                height: isSticky ? Math.max(Math.abs(editingShape.y2 - editingShape.y1) - 36, 50) : 36,
                color: isSticky ? "rgb(var(--c-text-primary))" : stroke,
              }}
            />
          );
        })()}

        {/* Floating Settings Inspector Panel */}
        {["pen", "highlighter", "rect", "circle", "arrow", "text", "sticky"].includes(tool) && (
          <div
            className={cn(
              "absolute z-10 flex border border-border bg-surface-overlay p-2.5 shadow-xl transition-all duration-200",
              bare
                ? "left-1/2 top-14 -translate-x-1/2 flex-row items-center gap-4 rounded-xl"
                : "left-16 top-1/2 -translate-y-1/2 flex-col gap-3.5 rounded-xl min-w-[130px]"
            )}
          >
            {/* Colors */}
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[9px] font-medium uppercase tracking-wider text-text-muted">Color</span>
              <div className="grid grid-cols-4 gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => setStrokeColor(c.id)}
                    className="group relative flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
                  >
                    <span
                      className={cn(
                        "h-5 w-5 rounded-full border border-border/20 shadow-sm",
                        c.id === "default" ? "bg-text-primary" : ""
                      )}
                      style={{
                        backgroundColor: c.id !== "default" ? c.value : undefined,
                      }}
                    />
                    {strokeColor === c.id && (
                      <span className="absolute inset-0 rounded-full border-2 border-accent" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Separator */}
            {["pen", "highlighter", "rect", "circle", "arrow"].includes(tool) && (
              <>
                <div className={cn("bg-border", bare ? "h-6 w-px" : "h-px w-full")} />

                {/* Width */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] font-medium uppercase tracking-wider text-text-muted">Size</span>
                  <div className="flex gap-1">
                    {WIDTHS.map((w) => (
                      <button
                        key={w.value}
                        type="button"
                        onClick={() => setStrokeWidth(w.value)}
                        className={cn(
                          "flex h-6.5 flex-1 items-center justify-center rounded-md text-[10px] font-medium transition-colors border",
                          strokeWidth === w.value
                            ? "bg-accent/10 text-accent border-accent/20"
                            : "text-text-secondary border-transparent hover:bg-hover-row hover:text-text-primary"
                        )}
                      >
                        {w.label.substring(0, 1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cn("bg-border", bare ? "h-6 w-px" : "h-px w-full")} />

                {/* Style */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] font-medium uppercase tracking-wider text-text-muted">Style</span>
                  <div className="flex gap-1">
                    {STYLES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStyle(s.value)}
                        className={cn(
                          "flex h-6.5 flex-1 items-center justify-center rounded-md text-[10px] font-medium transition-colors border",
                          strokeStyle === s.value
                            ? "bg-accent/10 text-accent border-accent/20"
                            : "text-text-secondary border-transparent hover:bg-hover-row hover:text-text-primary"
                        )}
                      >
                        {s.label.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* Pointer-radius hit testing so the eraser works on thin strokes. */
function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function hitTest(sh: Shape, x: number, y: number, r: number): boolean {
  if (["pen", "highlighter"].includes(sh.tool) && sh.points) {
    for (let i = 0; i < sh.points.length; i++) {
      const [px, py] = sh.points[i];
      if (Math.hypot(px - x, py - y) <= r) return true;
      if (i > 0) {
        const [qx, qy] = sh.points[i - 1];
        if (distToSeg(x, y, qx, qy, px, py) <= r) return true;
      }
    }
    return false;
  }

  const minX = Math.min(sh.x1, sh.x2);
  const maxX = Math.max(sh.x1, sh.x2);
  const minY = Math.min(sh.y1, sh.y2);
  const maxY = Math.max(sh.y1, sh.y2);

  switch (sh.tool) {
    case "arrow":
      return distToSeg(x, y, sh.x1, sh.y1, sh.x2, sh.y2) <= r;
    case "rect":
    case "circle":
      return x >= minX - r && x <= maxX + r && y >= minY - r && y <= maxY + r;
    case "sticky": {
      const w = Math.max(maxX - minX, 120);
      const h = Math.max(maxY - minY, 90);
      return x >= sh.x1 - r && x <= sh.x1 + w + r && y >= sh.y1 - r && y <= sh.y1 + h + r;
    }
    case "text": {
      const w = (sh.text?.length ?? 4) * 9;
      return x >= sh.x1 - r && x <= sh.x1 + w + r && y >= sh.y1 - 16 - r && y <= sh.y1 + 6 + r;
    }
    default:
      return false;
  }
}

function ShapeEl({ shape, selected }: { shape: Shape; selected?: boolean }) {
  const defaultStroke = "rgb(var(--c-text-secondary))";
  
  // Resolve stroke color
  const stroke = shape.color && shape.color !== "default" ? COLORS.find(c => c.id === shape.color)?.value || defaultStroke : defaultStroke;
  
  // Resolve stroke width
  const strokeWidth = shape.width ?? 1.5;

  // Resolve style / dash
  let strokeDasharray: string | undefined = undefined;
  if (shape.style === "dashed") {
    strokeDasharray = `${strokeWidth * 3} ${strokeWidth * 3}`;
  } else if (shape.style === "dotted") {
    strokeDasharray = `${strokeWidth} ${strokeWidth * 2}`;
  }

  const common = {
    style: { pointerEvents: "none" as const },
    stroke,
    strokeWidth,
    strokeDasharray,
  };

  const renderShape = () => {
    if (shape.tool === "highlighter" && shape.points) {
      return (
        <polyline
          {...common}
          points={shape.points.map((p) => p.join(",")).join(" ")}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.35}
          strokeWidth={strokeWidth * 6}
        />
      );
    }

    if (shape.tool === "pen" && shape.points) {
      return (
        <polyline
          {...common}
          points={shape.points.map((p) => p.join(",")).join(" ")}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    const x = Math.min(shape.x1, shape.x2);
    const y = Math.min(shape.y1, shape.y2);
    const w = Math.abs(shape.x2 - shape.x1);
    const h = Math.abs(shape.y2 - shape.y1);

    if (shape.tool === "rect") {
      return <rect {...common} x={x} y={y} width={w} height={h} rx={4} fill="none" />;
    }
    if (shape.tool === "circle") {
      return (
        <ellipse
          {...common}
          cx={x + w / 2}
          cy={y + h / 2}
          rx={w / 2}
          ry={h / 2}
          fill="none"
        />
      );
    }
    if (shape.tool === "arrow") {
      const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
      const head = 9 + strokeWidth;
      return (
        <g style={{ pointerEvents: "none" as const }} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round">
          <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} strokeDasharray={strokeDasharray} />
          <line
            x1={shape.x2}
            y1={shape.y2}
            x2={shape.x2 - head * Math.cos(angle - 0.5)}
            y2={shape.y2 - head * Math.sin(angle - 0.5)}
          />
          <line
            x1={shape.x2}
            y1={shape.y2}
            x2={shape.x2 - head * Math.cos(angle + 0.5)}
            y2={shape.y2 - head * Math.sin(angle + 0.5)}
          />
        </g>
      );
    }
    if (shape.tool === "sticky") {
      return (
        <g style={{ pointerEvents: "none" as const }}>
          <rect
            x={shape.x1}
            y={shape.y1}
            width={Math.max(w, 120)}
            height={Math.max(h, 90)}
            rx={6}
            fill="rgb(var(--c-surface-raised))"
            stroke={stroke === defaultStroke ? "rgb(var(--c-border))" : stroke}
            strokeWidth={stroke === defaultStroke ? 1 : 1.5}
          />
          {/* Accent line at the top */}
          <line
            x1={shape.x1 + 1}
            y1={shape.y1 + 8}
            x2={shape.x1 + Math.max(w, 120) - 1}
            y2={shape.y1 + 8}
            stroke={stroke}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <text
            x={shape.x1 + 12}
            y={shape.y1 + 28}
            fill="rgb(var(--c-text-primary))"
            fontSize={13}
            fontFamily="var(--font-body, Inter)"
          >
            {shape.text}
          </text>
        </g>
      );
    }
    if (shape.tool === "text") {
      return (
        <text
          style={{ pointerEvents: "none" as const }}
          x={shape.x1}
          y={shape.y1}
          fill={stroke}
          fontSize={15}
          fontFamily="var(--font-body, Inter)"
        >
          {shape.text}
        </text>
      );
    }
    return null;
  };

  const element = renderShape();
  if (!element) return null;

  const minX = shape.points ? Math.min(...shape.points.map(p => p[0])) : Math.min(shape.x1, shape.x2);
  const maxX = shape.points ? Math.max(...shape.points.map(p => p[0])) : Math.max(shape.x1, shape.x2);
  const minY = shape.points ? Math.min(...shape.points.map(p => p[1])) : Math.min(shape.y1, shape.y2);
  const maxY = shape.points ? Math.max(...shape.points.map(p => p[1])) : Math.max(shape.y1, shape.y2);
  
  const width = shape.tool === "sticky" ? Math.max(maxX - minX, 120) : (maxX - minX);
  const height = shape.tool === "sticky" ? Math.max(maxY - minY, 90) : (maxY - minY);
  const textWidth = shape.tool === "text" ? (shape.text?.length ?? 4) * 9.5 : width;

  return (
    <>
      {element}
      {selected && (
        <rect
          x={minX - 6}
          y={shape.tool === "text" ? minY - 16 : minY - 6}
          width={(shape.tool === "text" ? textWidth : width) + 12}
          height={(shape.tool === "text" ? 22 : height) + 12}
          fill="none"
          stroke="rgb(var(--c-accent))"
          strokeWidth={1}
          strokeDasharray="4 3"
          rx={4}
          style={{ pointerEvents: "none" }}
        />
      )}
    </>
  );
}
