"use client";

import { useRef, useState } from "react";
import { cn } from "@corvus/ui";

type Tool = "select" | "hand" | "pen" | "rect" | "circle" | "arrow" | "text" | "sticky" | "eraser";

const TOOLS: { id: Tool; glyph: string; label: string }[] = [
  { id: "select", glyph: "↖", label: "Select" },
  { id: "hand", glyph: "✥", label: "Hand" },
  { id: "pen", glyph: "✒", label: "Pen" },
  { id: "rect", glyph: "▭", label: "Rectangle" },
  { id: "circle", glyph: "◯", label: "Circle" },
  { id: "arrow", glyph: "→", label: "Arrow" },
  { id: "text", glyph: "T", label: "Text" },
  { id: "sticky", glyph: "▦", label: "Sticky note" },
  { id: "eraser", glyph: "◻", label: "Eraser" },
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
}

/**
 * Collaborative canvas (brief §Canvas) — an Excalidraw-level whiteboard.
 * Dot-grid base surface, vertical overlay toolbar on the left edge. Sticky
 * notes are raised surfaces — no yellow, no pastels.
 */
export function CanvasView({
  channelName,
  bare,
}: {
  channelName: string;
  /** Skip the channel header — used when embedded as a call whiteboard. */
  bare?: boolean;
}) {
  const [tool, setTool] = useState<Tool>("pen");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [lightBoard, setLightBoard] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const panStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const erasing = useRef(false);

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
    if (tool === "select") return;
    const { x, y } = toCanvas(e);
    const shape: Shape = {
      id: `sh${Date.now()}`,
      tool,
      x1: x,
      y1: y,
      x2: x,
      y2: y,
      points: tool === "pen" ? [[x, y]] : undefined,
      text: tool === "text" ? "Text" : tool === "sticky" ? "Note" : undefined,
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
      points: draft.tool === "pen" ? [...(draft.points ?? []), [x, y]] : draft.points,
    });
  };

  const onUp = () => {
    panStart.current = null;
    erasing.current = false;
    if (draft) {
      setShapes((s) => [...s, draft]);
      setDraft(null);
    }
  };

  const all = draft ? [...shapes, draft] : shapes;

  return (
    <section
      data-theme={lightBoard ? "light" : undefined}
      className="relative flex h-full min-w-0 flex-1 flex-col bg-background"
    >
      {!bare && (
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
          <span aria-hidden className="font-mono text-[14px] leading-none text-text-muted">◈</span>
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
            {all.map((sh) => (
              <ShapeEl key={sh.id} shape={sh} />
            ))}
          </g>
        </svg>

        {/* Vertical toolbar — left edge */}
        <div className="absolute left-3 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 rounded-[10px] border border-border bg-surface-overlay p-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={t.label}
              title={t.label}
              data-active={tool === t.id}
              onClick={() => setTool(t.id)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-sm font-mono text-[15px] transition-colors",
                tool === t.id
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
              )}
            >
              {t.glyph}
            </button>
          ))}
          <div className="mx-1 my-1 h-px bg-border" />
          <button
            type="button"
            aria-label={lightBoard ? "Dark board" : "White board"}
            title={lightBoard ? "Dark board" : "White board"}
            aria-pressed={lightBoard}
            onClick={() => setLightBoard((v) => !v)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-sm font-mono text-[15px] transition-colors",
              lightBoard
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
            )}
          >
            ◐
          </button>
        </div>
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
  if (sh.tool === "pen" && sh.points) {
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

function ShapeEl({ shape }: { shape: Shape }) {
  const stroke = "rgb(var(--c-text-secondary))";
  const common = {
    style: { pointerEvents: "none" as const },
  };

  if (shape.tool === "pen" && shape.points) {
    return (
      <polyline
        {...common}
        points={shape.points.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
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
    return <rect {...common} x={x} y={y} width={w} height={h} rx={4} fill="none" stroke={stroke} strokeWidth={1.5} />;
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
        stroke={stroke}
        strokeWidth={1.5}
      />
    );
  }
  if (shape.tool === "arrow") {
    const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
    const head = 9;
    return (
      <g {...common} stroke={stroke} strokeWidth={1.5} strokeLinecap="round">
        <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />
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
      <g {...common}>
        <rect
          x={shape.x1}
          y={shape.y1}
          width={Math.max(w, 120)}
          height={Math.max(h, 90)}
          rx={6}
          fill="rgb(var(--c-surface-raised))"
          stroke="rgb(var(--c-border))"
        />
        <text
          x={shape.x1 + 12}
          y={shape.y1 + 26}
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
        {...common}
        x={shape.x1}
        y={shape.y1}
        fill="rgb(var(--c-text-primary))"
        fontSize={15}
        fontFamily="var(--font-body, Inter)"
      >
        {shape.text}
      </text>
    );
  }
  return null;
}
