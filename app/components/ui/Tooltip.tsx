"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  maxWidth?: string;
  multiline?: boolean;
  triggerClassName?: string;
}

export default function Tooltip({
  children,
  content,
  position = "bottom",
  maxWidth = "200px",
  multiline = false,
  triggerClassName = "relative inline-block",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      const tooltipWidth = tooltipRect?.width || 0;
      const tooltipHeight = tooltipRect?.height || 0;

      let top = 0;
      let left = 0;

      switch (position) {
        case "top":
          top = rect.top - tooltipHeight - 8;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "bottom":
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - 8;
          break;
        case "right":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + 8;
          break;
      }

      setCoords({ top, left });
    }
  }, [isVisible, position]);

  const arrowPositionClasses = {
    top: "top-full left-1/2 -translate-x-1/2",
    bottom: "bottom-full left-1/2 -translate-x-1/2",
    left: "left-full top-1/2 -translate-y-1/2",
    right: "right-full top-1/2 -translate-y-1/2",
  };

  const arrowBorderClasses = {
    top: "border-l-transparent border-r-transparent border-b-transparent border-t-gray-900 dark:border-t-gray-700",
    bottom: "border-l-transparent border-r-transparent border-t-transparent border-b-gray-900 dark:border-b-gray-700",
    left: "border-t-transparent border-b-transparent border-r-transparent border-l-gray-900 dark:border-l-gray-700",
    right: "border-t-transparent border-b-transparent border-l-transparent border-r-gray-900 dark:border-r-gray-700",
  };

  return (
    <div
      ref={triggerRef}
      className={triggerClassName}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible &&
        content &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] pointer-events-none"
            style={{ top: coords.top, left: coords.left }}
          >
            <div
              className={`bg-gray-900 dark:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg ${
                multiline ? "whitespace-pre-line" : "whitespace-nowrap"
              }`}
              style={multiline ? undefined : { maxWidth }}
            >
              {content}
            </div>
            <div
              className={`absolute w-0 h-0 border-4 ${arrowPositionClasses[position]} ${arrowBorderClasses[position]}`}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
