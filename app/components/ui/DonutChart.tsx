"use client";

import { type ReactNode } from "react";

interface DonutSegment {
  value: number;
  /** Tailwind colour token, e.g. "text-emerald-500". The stroke
   *  inherits via `currentColor`, so each segment is a span with the
   *  right text-* class wrapped around the SVG <circle>. */
  colorClass: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  /** Rendered inside the donut hole. Pass a stacked label + caption,
   *  or any small JSX. */
  centerSlot?: ReactNode;
  /** Light track colour shown behind the segments — visible when the
   *  segments don't cover the full circle (empty / partial data). */
  trackClass?: string;
  ariaLabel?: string;
}

/**
 * SVG-based donut chart. No external chart lib — we draw each
 * segment as a rotated <circle> with stroke-dasharray, which keeps
 * the bundle tiny and the markup themable via Tailwind.
 */
export default function DonutChart({
  segments,
  size = 180,
  strokeWidth = 18,
  centerSlot,
  trackClass = "text-gray-100 dark:text-gray-700",
  ariaLabel,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // Pre-compute the offset for each segment so they butt up against
  // each other instead of stacking from zero.
  let runningOffset = 0;
  const renderedSegments = segments.map((seg, index) => {
    const length = total > 0 ? (seg.value / total) * circumference : 0;
    const offset = runningOffset;
    runningOffset += length;
    return { ...seg, length, offset, index };
  });

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel}
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className={trackClass}
            stroke="currentColor"
          />
          {/* Segments */}
          {renderedSegments.map((seg) => (
            <circle
              key={seg.index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.length} ${circumference - seg.length}`}
              strokeDashoffset={-seg.offset}
              className={seg.colorClass}
              stroke="currentColor"
              strokeLinecap="butt"
            />
          ))}
        </g>
      </svg>
      {centerSlot && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {centerSlot}
        </div>
      )}
    </div>
  );
}
