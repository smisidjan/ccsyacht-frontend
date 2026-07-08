"use client";

import { useRef, useCallback } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ShapeType =
  | "rectangle"
  | "rounded-rectangle"
  | "circle"
  | "triangle"
  | "triangle-down"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "parallelogram"
  | "arrow-right"
  | "arrow-left"
  | "arrow-up"
  | "arrow-down"
  | "star-5"
  | "star-4"
  | "heart"
  | "callout";

export interface ShapeAttrs {
  shapeType: ShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
  noStroke: boolean;
  width: number;
  height: number;
}

export const SHAPE_DEFAULTS: ShapeAttrs = {
  shapeType: "rectangle",
  fill: "#dbeafe",
  stroke: "#3b82f6",
  strokeWidth: 2,
  noStroke: false,
  width: 200,
  height: 140,
};

export const INSERTABLE_SHAPES: { type: ShapeType; label: string }[] = [
  { type: "rectangle",         label: "Rectangle" },
  { type: "rounded-rectangle", label: "Rounded" },
  { type: "circle",            label: "Circle" },
  { type: "triangle",          label: "Triangle" },
  { type: "triangle-down",     label: "Tri Down" },
  { type: "diamond",           label: "Diamond" },
  { type: "pentagon",          label: "Pentagon" },
  { type: "hexagon",           label: "Hexagon" },
  { type: "parallelogram",     label: "Parallel." },
  { type: "arrow-right",       label: "Arrow →" },
  { type: "arrow-left",        label: "Arrow ←" },
  { type: "arrow-up",          label: "Arrow ↑" },
  { type: "arrow-down",        label: "Arrow ↓" },
  { type: "star-5",            label: "Star 5pt" },
  { type: "star-4",            label: "Star 4pt" },
  { type: "heart",             label: "Heart" },
  { type: "callout",           label: "Callout" },
];

// ─── SVG path helpers ──────────────────────────────────────────────────────────

function polyPoints(w: number, h: number, sides: number, startAngle: number): string {
  return Array.from({ length: sides }, (_, i) => {
    const a = startAngle + (i * 2 * Math.PI) / sides;
    return `${(w / 2 + (w / 2) * Math.cos(a)).toFixed(2)},${(h / 2 + (h / 2) * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

function starPoints(w: number, h: number, points: number, innerRatio: number): string {
  return Array.from({ length: points * 2 }, (_, i) => {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? 1 : innerRatio;
    return `${(w / 2 + (w / 2) * r * Math.cos(a)).toFixed(2)},${(h / 2 + (h / 2) * r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

function heartPath(w: number, h: number): string {
  const cx = w / 2;
  return [
    `M ${cx} ${(h * 0.88).toFixed(1)}`,
    `C ${(-w * 0.05).toFixed(1)} ${(h * 0.5).toFixed(1)} ${(-w * 0.05).toFixed(1)} ${(h * 0.06).toFixed(1)} ${(cx * 0.5).toFixed(1)} ${(h * 0.06).toFixed(1)}`,
    `C ${(cx * 0.8).toFixed(1)} ${(h * 0.06).toFixed(1)} ${cx} ${(h * 0.22).toFixed(1)} ${cx} ${(h * 0.32).toFixed(1)}`,
    `C ${cx} ${(h * 0.22).toFixed(1)} ${(cx * 1.2).toFixed(1)} ${(h * 0.06).toFixed(1)} ${(cx * 1.5).toFixed(1)} ${(h * 0.06).toFixed(1)}`,
    `C ${(w * 1.05).toFixed(1)} ${(h * 0.06).toFixed(1)} ${(w * 1.05).toFixed(1)} ${(h * 0.5).toFixed(1)} ${cx} ${(h * 0.88).toFixed(1)}`,
    "Z",
  ].join(" ");
}

/** Returns the SVG children (path/polygon/etc.) for a given shape type. */
export function getShapeContent(type: ShapeType, w: number, h: number): React.ReactNode {
  switch (type) {
    case "rectangle":
      return <rect x={0} y={0} width={w} height={h} />;
    case "rounded-rectangle":
      return <rect x={0} y={0} width={w} height={h} rx={Math.min(18, h * 0.22)} />;
    case "circle":
      return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} />;
    case "triangle":
      return <polygon points={`${w / 2},0 ${w},${h} 0,${h}`} />;
    case "triangle-down":
      return <polygon points={`0,0 ${w},0 ${w / 2},${h}`} />;
    case "diamond":
      return <polygon points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`} />;
    case "pentagon":
      return <polygon points={polyPoints(w, h, 5, -Math.PI / 2)} />;
    case "hexagon":
      return <polygon points={polyPoints(w, h, 6, 0)} />;
    case "parallelogram": {
      const off = (w * 0.2).toFixed(2);
      return <polygon points={`${off},0 ${w},0 ${(w - parseFloat(off)).toFixed(2)},${h} 0,${h}`} />;
    }
    case "arrow-right": {
      const sy = h * 0.3, p = w * 0.65;
      return <polygon points={`0,${sy.toFixed(1)} ${p.toFixed(1)},${sy.toFixed(1)} ${p.toFixed(1)},0 ${w},${(h/2).toFixed(1)} ${p.toFixed(1)},${h} ${p.toFixed(1)},${(h-sy).toFixed(1)} 0,${(h-sy).toFixed(1)}`} />;
    }
    case "arrow-left": {
      const sy = h * 0.3, p = w * 0.35;
      return <polygon points={`${w},${sy.toFixed(1)} ${p.toFixed(1)},${sy.toFixed(1)} ${p.toFixed(1)},0 0,${(h/2).toFixed(1)} ${p.toFixed(1)},${h} ${p.toFixed(1)},${(h-sy).toFixed(1)} ${w},${(h-sy).toFixed(1)}`} />;
    }
    case "arrow-up": {
      const sx = w * 0.3, p = h * 0.48;
      return <polygon points={`${sx.toFixed(1)},${h} ${sx.toFixed(1)},${p.toFixed(1)} 0,${p.toFixed(1)} ${(w/2).toFixed(1)},0 ${w},${p.toFixed(1)} ${(w-sx).toFixed(1)},${p.toFixed(1)} ${(w-sx).toFixed(1)},${h}`} />;
    }
    case "arrow-down": {
      const sx = w * 0.3, p = h * 0.52;
      return <polygon points={`${sx.toFixed(1)},0 ${sx.toFixed(1)},${p.toFixed(1)} 0,${p.toFixed(1)} ${(w/2).toFixed(1)},${h} ${w},${p.toFixed(1)} ${(w-sx).toFixed(1)},${p.toFixed(1)} ${(w-sx).toFixed(1)},0`} />;
    }
    case "star-5":
      return <polygon points={starPoints(w, h, 5, 0.4)} />;
    case "star-4":
      return <polygon points={starPoints(w, h, 4, 0.35)} />;
    case "heart":
      return <path d={heartPath(w, h)} />;
    case "callout":
      return (
        <g>
          <rect x={0} y={0} width={w} height={(h * 0.78).toFixed(1)} rx={8} />
          <polygon points={`${(w * 0.08).toFixed(1)},${(h * 0.78).toFixed(1)} ${(w * 0.22).toFixed(1)},${(h * 0.78).toFixed(1)} ${(w * 0.08).toFixed(1)},${h}`} />
        </g>
      );
    default:
      return <rect x={0} y={0} width={w} height={h} />;
  }
}

// ─── Resize handle definitions ─────────────────────────────────────────────────

const HANDLES = [
  { xf: 0,   yf: 0,   cursor: "nw-resize", dx: -1, dy: -1 },
  { xf: 0.5, yf: 0,   cursor: "n-resize",  dx:  0, dy: -1 },
  { xf: 1,   yf: 0,   cursor: "ne-resize", dx:  1, dy: -1 },
  { xf: 1,   yf: 0.5, cursor: "e-resize",  dx:  1, dy:  0 },
  { xf: 1,   yf: 1,   cursor: "se-resize", dx:  1, dy:  1 },
  { xf: 0.5, yf: 1,   cursor: "s-resize",  dx:  0, dy:  1 },
  { xf: 0,   yf: 1,   cursor: "sw-resize", dx: -1, dy:  1 },
  { xf: 0,   yf: 0.5, cursor: "w-resize",  dx: -1, dy:  0 },
] as const;

// ─── NodeView (React component) ────────────────────────────────────────────────

function ShapeNodeView({ node, selected, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as ShapeAttrs;
  const { shapeType, fill, stroke, strokeWidth, noStroke, width, height } = attrs;

  const dragRef = useRef<{
    startX: number; startY: number; startW: number; startH: number;
    dx: -1 | 0 | 1; dy: -1 | 0 | 1;
  } | null>(null);

  const startResize = useCallback(
    (e: React.MouseEvent, dx: -1 | 0 | 1, dy: -1 | 0 | 1) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { startX: e.clientX, startY: e.clientY, startW: width, startH: height, dx, dy };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const { startX, startY, startW, startH, dx: dxDir, dy: dyDir } = dragRef.current;
        const update: Partial<ShapeAttrs> = {};
        if (dxDir !== 0) update.width  = Math.max(40,  Math.round(startW + (ev.clientX - startX) * dxDir));
        if (dyDir !== 0) update.height = Math.max(30,  Math.round(startH + (ev.clientY - startY) * dyDir));
        updateAttributes(update);
      };

      const onUp = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [width, height, updateAttributes]
  );

  const effectiveStroke = noStroke ? "none" : stroke;
  const effectiveSW     = noStroke ? 0 : strokeWidth;

  return (
    <NodeViewWrapper>
      <div
        className="relative inline-block my-2 select-none"
        style={{ width, height }}
        contentEditable={false}
        data-shape-node="true"
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
          <g fill={fill} stroke={effectiveStroke} strokeWidth={effectiveSW}>
            {getShapeContent(shapeType, width, height)}
          </g>
        </svg>

        {selected && (
          <>
            <div className="absolute inset-0 ring-2 ring-blue-500 pointer-events-none" />
            {HANDLES.map(({ xf, yf, cursor, dx, dy }, i) => (
              <div
                key={i}
                onMouseDown={(e) => startResize(e, dx, dy)}
                className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-sm z-10 hover:bg-blue-100"
                style={{
                  left: `${xf * 100}%`,
                  top: `${yf * 100}%`,
                  transform: "translate(-50%, -50%)",
                  cursor,
                }}
              />
            ))}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ─── TipTap Extension ─────────────────────────────────────────────────────────

export const ShapeExtension = Node.create({
  name: "shape",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      shapeType:   { default: SHAPE_DEFAULTS.shapeType },
      fill:        { default: SHAPE_DEFAULTS.fill },
      stroke:      { default: SHAPE_DEFAULTS.stroke },
      strokeWidth: { default: SHAPE_DEFAULTS.strokeWidth },
      noStroke:    { default: SHAPE_DEFAULTS.noStroke },
      width:       { default: SHAPE_DEFAULTS.width },
      height:      { default: SHAPE_DEFAULTS.height },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="shape"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "shape" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ShapeNodeView);
  },
});
