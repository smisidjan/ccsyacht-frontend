"use client";

import { useCallback, useReducer } from "react";
import type { AreaPolygonPoint } from "@/lib/api/types";

/** A point-in-time snapshot of the polygon-being-drawn. The history stack
 *  stores these; `set` accepts a new snapshot and the user can step back
 *  through every prior shape they had. */
export interface PolygonSnapshot {
  polygon: AreaPolygonPoint[];
  isClosed: boolean;
}

interface HistoryState {
  past: PolygonSnapshot[];
  present: PolygonSnapshot;
  future: PolygonSnapshot[];
}

type Action =
  | { type: "set"; snapshot: PolygonSnapshot }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; snapshot: PolygonSnapshot };

function snapshotsEqual(a: PolygonSnapshot, b: PolygonSnapshot): boolean {
  if (a.isClosed !== b.isClosed) return false;
  if (a.polygon.length !== b.polygon.length) return false;
  for (let i = 0; i < a.polygon.length; i++) {
    if (a.polygon[i].x !== b.polygon[i].x || a.polygon[i].y !== b.polygon[i].y) {
      return false;
    }
  }
  return true;
}

function reducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case "set": {
      if (snapshotsEqual(state.present, action.snapshot)) return state;
      return {
        past: [...state.past, state.present],
        present: action.snapshot,
        future: [],
      };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    case "reset": {
      return { past: [], present: action.snapshot, future: [] };
    }
  }
}

const EMPTY: PolygonSnapshot = { polygon: [], isClosed: false };

/** Undo/redo wrapper around a polygon snapshot. Wires `set` to be a drop-in
 *  replacement for the previous `onChange(polygon, isClosed)` callback used
 *  by `AreaPolygonDrawer`, but every mutation gets pushed onto a history
 *  stack so the user can step back (and forward). */
export function usePolygonHistory(): {
  polygon: AreaPolygonPoint[];
  isClosed: boolean;
  set: (polygon: AreaPolygonPoint[], isClosed: boolean) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  canUndo: boolean;
  canRedo: boolean;
} {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: EMPTY,
    future: [],
  });

  const set = useCallback(
    (polygon: AreaPolygonPoint[], isClosed: boolean) => {
      dispatch({ type: "set", snapshot: { polygon, isClosed } });
    },
    []
  );
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback(
    () => dispatch({ type: "reset", snapshot: EMPTY }),
    []
  );

  return {
    polygon: state.present.polygon,
    isClosed: state.present.isClosed,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
