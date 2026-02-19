"use client";

import { useState, useEffect, useCallback } from "react";

const COLLAPSED_WIDTH = 72;
const DEFAULT_WIDTH = 256;
const MAX_WIDTH = 320;
const COLLAPSE_THRESHOLD = 100;
const MIN_EXPANDED_WIDTH = 160;

interface UseSidebarResizeOptions {
  storageKeyCollapsed?: string;
  storageKeyWidth?: string;
}

interface UseSidebarResizeReturn {
  isCollapsed: boolean;
  width: number;
  currentWidth: number;
  isResizing: boolean;
  toggleCollapse: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export function useSidebarResize(
  options: UseSidebarResizeOptions = {}
): UseSidebarResizeReturn {
  const {
    storageKeyCollapsed = "sidebar-collapsed",
    storageKeyWidth = "sidebar-width",
  } = options;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // Load saved state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem(storageKeyCollapsed);
    const savedWidth = localStorage.getItem(storageKeyWidth);

    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === "true");
    }
    if (savedWidth !== null) {
      const parsedWidth = parseInt(savedWidth, 10);
      if (parsedWidth >= MIN_EXPANDED_WIDTH && parsedWidth <= MAX_WIDTH) {
        setWidth(parsedWidth);
      }
    }
  }, [storageKeyCollapsed, storageKeyWidth]);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(storageKeyCollapsed, String(isCollapsed));
  }, [isCollapsed, storageKeyCollapsed]);

  // Save width to localStorage (only when not collapsed)
  useEffect(() => {
    if (!isCollapsed) {
      localStorage.setItem(storageKeyWidth, String(width));
    }
  }, [width, isCollapsed, storageKeyWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;

      // Snap to collapsed if dragged below threshold
      if (newWidth < COLLAPSE_THRESHOLD) {
        setIsCollapsed(true);
      } else if (newWidth >= MIN_EXPANDED_WIDTH && newWidth <= MAX_WIDTH) {
        setIsCollapsed(false);
        setWidth(newWidth);
      } else if (newWidth > MAX_WIDTH) {
        setWidth(MAX_WIDTH);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove global mouse listeners during resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const currentWidth = isCollapsed ? COLLAPSED_WIDTH : width;

  return {
    isCollapsed,
    width,
    currentWidth,
    isResizing,
    toggleCollapse,
    handleMouseDown,
  };
}

// Export constants for use in components
export const SIDEBAR_COLLAPSED_WIDTH = COLLAPSED_WIDTH;
export const SIDEBAR_DEFAULT_WIDTH = DEFAULT_WIDTH;
export const SIDEBAR_MAX_WIDTH = MAX_WIDTH;
