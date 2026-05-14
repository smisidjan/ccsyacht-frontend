"use client";

import { useCallback, useReducer } from "react";

/** Generic undo/redo state wrapper. Mirrors `useState` semantics (including
 *  functional updaters) but pushes every committed value onto a `past` stack
 *  so the caller can step backward (and forward via `redo`). Already used
 *  for the area polygon drawer (via `usePolygonHistory` which is a thin
 *  named wrapper) and the Define Decks modal. */
interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

type Updater<T> = T | ((prev: T) => T);

type Action<T> =
  | { type: "set"; value: Updater<T> }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; value: T };

function applyUpdater<T>(current: T, value: Updater<T>): T {
  return typeof value === "function"
    ? (value as (prev: T) => T)(current)
    : value;
}

function reducer<T>(state: HistoryState<T>, action: Action<T>): HistoryState<T> {
  switch (action.type) {
    case "set": {
      const next = applyUpdater(state.present, action.value);
      // Skip pushing duplicate snapshots — keeps the history compact for
      // callers that re-set the same reference (e.g. memoized arrays).
      if (Object.is(next, state.present)) return state;
      return {
        past: [...state.past, state.present],
        present: next,
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
      return { past: [], present: action.value, future: [] };
    }
  }
}

export function useUndoRedoState<T>(initial: T): {
  state: T;
  set: (value: Updater<T>) => void;
  undo: () => void;
  redo: () => void;
  /** Replaces the present value AND clears both history stacks. Use this
   *  for "establishing a new baseline" loads (e.g. fetching existing data
   *  on modal open) so the load itself isn't undoable. */
  reset: (value: T) => void;
  canUndo: boolean;
  canRedo: boolean;
} {
  const [state, dispatch] = useReducer(
    (s: HistoryState<T>, a: Action<T>) => reducer(s, a),
    { past: [], present: initial, future: [] } as HistoryState<T>
  );
  const set = useCallback((value: Updater<T>) => dispatch({ type: "set", value }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback((value: T) => dispatch({ type: "reset", value }), []);
  return {
    state: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
