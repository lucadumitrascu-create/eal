/**
 * Thin React wrapper around the pure specHistory module (for STEP 3 wiring).
 * The core logic + tests live in src/lib/specHistory.ts; this only adapts it to
 * React state. No network, no persistence here.
 */
import { useCallback, useRef, useState } from 'react';
import type { DesignSpec } from '../data/templates';
import type { EditOp, ApplyResult } from '../lib/editOps';
import {
  createHistory,
  commit as commitHistory,
  undo as undoHistory,
  redo as redoHistory,
  canUndo,
  canRedo,
  type SpecHistory,
} from '../lib/specHistory';

export interface UseSpecHistory {
  spec: DesignSpec;
  canUndo: boolean;
  canRedo: boolean;
  /** Apply ops, record a history step, and return what was applied/skipped. */
  commit: (ops: readonly EditOp[]) => ApplyResult;
  undo: () => void;
  redo: () => void;
  /** Replace the whole session (e.g. on template switch) — resets history. */
  reset: (spec: DesignSpec) => void;
}

export function useSpecHistory(initial: DesignSpec): UseSpecHistory {
  const [history, setHistory] = useState<SpecHistory>(() => createHistory(initial));
  // mirror so commit can run synchronously and return its result
  const ref = useRef(history);
  ref.current = history;

  const commit = useCallback((ops: readonly EditOp[]): ApplyResult => {
    const { history: nextHistory, result } = commitHistory(ref.current, ops);
    ref.current = nextHistory;
    setHistory(nextHistory);
    return result;
  }, []);

  const undo = useCallback(() => setHistory((h) => undoHistory(h)), []);
  const redo = useCallback(() => setHistory((h) => redoHistory(h)), []);
  const reset = useCallback((spec: DesignSpec) => setHistory(createHistory(spec)), []);

  return {
    spec: history.present,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    commit,
    undo,
    redo,
    reset,
  };
}
