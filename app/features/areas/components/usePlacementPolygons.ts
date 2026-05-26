"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { AreaPolygonPoint } from "@/lib/api/types";

export interface PolygonSnapshot {
  polygon: AreaPolygonPoint[];
  isClosed: boolean;
}

interface PlacementHistory {
  past: PolygonSnapshot[];
  present: PolygonSnapshot;
  future: PolygonSnapshot[];
}

interface State {
  /** Which placement the drawer is currently editing. `null` while we
   *  haven't been pointed at one (modal opening, deck switching). */
  activeId: string | null;
  byPlacement: Record<string, PlacementHistory>;
}

type Action =
  | { type: "setActive"; id: string }
  | { type: "set"; snapshot: PolygonSnapshot }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "resetActive" }
  | { type: "resetAll" }
  | { type: "seed"; id: string; snapshot: PolygonSnapshot };

const EMPTY: PolygonSnapshot = { polygon: [], isClosed: false };
const emptyHistory = (): PlacementHistory => ({
  past: [],
  present: EMPTY,
  future: [],
});

const snapshotsEqual = (a: PolygonSnapshot, b: PolygonSnapshot): boolean => {
  if (a.isClosed !== b.isClosed) return false;
  if (a.polygon.length !== b.polygon.length) return false;
  for (let i = 0; i < a.polygon.length; i++) {
    if (a.polygon[i].x !== b.polygon[i].x || a.polygon[i].y !== b.polygon[i].y) {
      return false;
    }
  }
  return true;
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setActive": {
      if (state.activeId === action.id) return state;
      // Ensure an empty history exists for the new active placement so
      // consumers always read a real present snapshot.
      const next = state.byPlacement[action.id]
        ? state.byPlacement
        : { ...state.byPlacement, [action.id]: emptyHistory() };
      return { activeId: action.id, byPlacement: next };
    }
    case "set": {
      if (!state.activeId) return state;
      const history = state.byPlacement[state.activeId] ?? emptyHistory();
      if (snapshotsEqual(history.present, action.snapshot)) return state;
      return {
        ...state,
        byPlacement: {
          ...state.byPlacement,
          [state.activeId]: {
            past: [...history.past, history.present],
            present: action.snapshot,
            future: [],
          },
        },
      };
    }
    case "undo": {
      if (!state.activeId) return state;
      const history = state.byPlacement[state.activeId];
      if (!history || history.past.length === 0) return state;
      const previous = history.past[history.past.length - 1];
      return {
        ...state,
        byPlacement: {
          ...state.byPlacement,
          [state.activeId]: {
            past: history.past.slice(0, -1),
            present: previous,
            future: [history.present, ...history.future],
          },
        },
      };
    }
    case "redo": {
      if (!state.activeId) return state;
      const history = state.byPlacement[state.activeId];
      if (!history || history.future.length === 0) return state;
      const next = history.future[0];
      return {
        ...state,
        byPlacement: {
          ...state.byPlacement,
          [state.activeId]: {
            past: [...history.past, history.present],
            present: next,
            future: history.future.slice(1),
          },
        },
      };
    }
    case "resetActive": {
      if (!state.activeId) return state;
      return {
        ...state,
        byPlacement: {
          ...state.byPlacement,
          [state.activeId]: emptyHistory(),
        },
      };
    }
    case "resetAll":
      return { activeId: null, byPlacement: {} };
    case "seed":
      return {
        ...state,
        byPlacement: {
          ...state.byPlacement,
          [action.id]: { past: [], present: action.snapshot, future: [] },
        },
      };
  }
}

/** Multi-placement polygon-state hook with per-placement undo/redo. The
 *  same area gets drawn separately on each placement (primary deck + side
 *  profiles); switching the active placement swaps which history stack
 *  the rest of the hook acts on, so an Undo on the top view doesn't
 *  unwind a side-profile vertex. */
export function usePlacementPolygons(): {
  /** Active-placement view onto the underlying state. Mirrors the
   *  single-placement `usePolygonHistory` API so the drawer stays
   *  ignorant of placements. */
  polygon: AreaPolygonPoint[];
  isClosed: boolean;
  set: (polygon: AreaPolygonPoint[], isClosed: boolean) => void;
  undo: () => void;
  redo: () => void;
  /** Clear only the active placement's history. */
  reset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Cross-placement controls. */
  activeId: string | null;
  setActive: (id: string) => void;
  /** Seed (or replace) a placement's polygon — used to hydrate from a
   *  loaded `Area.polygons` in edit mode. */
  seed: (id: string, polygon: AreaPolygonPoint[], isClosed: boolean) => void;
  /** Wipe every placement's state — used when the modal opens or the
   *  user switches deck and all prior drawings become irrelevant. */
  resetAll: () => void;
  /** Read-only snapshot of every placement's current polygon, used to
   *  build the save payload and tab "drawn?" indicators. */
  all: Record<string, PolygonSnapshot>;
} {
  const [state, dispatch] = useReducer(reducer, {
    activeId: null,
    byPlacement: {},
  });

  const activeHistory =
    (state.activeId && state.byPlacement[state.activeId]) || emptyHistory();

  const set = useCallback(
    (polygon: AreaPolygonPoint[], isClosed: boolean) =>
      dispatch({ type: "set", snapshot: { polygon, isClosed } }),
    []
  );
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback(() => dispatch({ type: "resetActive" }), []);
  const setActive = useCallback(
    (id: string) => dispatch({ type: "setActive", id }),
    []
  );
  const seed = useCallback(
    (id: string, polygon: AreaPolygonPoint[], isClosed: boolean) =>
      dispatch({ type: "seed", id, snapshot: { polygon, isClosed } }),
    []
  );
  const resetAll = useCallback(() => dispatch({ type: "resetAll" }), []);

  const all = useMemo(() => {
    const out: Record<string, PolygonSnapshot> = {};
    for (const [id, hist] of Object.entries(state.byPlacement)) {
      out[id] = hist.present;
    }
    return out;
  }, [state.byPlacement]);

  return {
    polygon: activeHistory.present.polygon,
    isClosed: activeHistory.present.isClosed,
    set,
    undo,
    redo,
    reset,
    canUndo: activeHistory.past.length > 0,
    canRedo: activeHistory.future.length > 0,
    activeId: state.activeId,
    setActive,
    seed,
    resetAll,
    all,
  };
}
