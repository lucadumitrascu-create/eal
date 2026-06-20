/**
 * In-memory undo/redo history for a DesignSpec edit session — STEP 1.
 *
 * Pure, framework-agnostic (no React, no network, no persistence). A `commit`
 * runs the edit-ops reducer on `present`, pushes the previous `present` onto
 * `past`, and clears `future`. `undo`/`redo` are standard stack moves. History
 * is capped to avoid unbounded memory.
 *
 * This intentionally does NOT touch any existing serialization (the `?d=`
 * preview links etc.) — it only wraps the live in-session spec.
 */
import type { DesignSpec } from '../data/templates';
import { applyOps, type EditOp, type ApplyResult } from './editOps';

export const HISTORY_CAP = 50;

export interface SpecHistory {
  past: DesignSpec[];
  present: DesignSpec;
  future: DesignSpec[];
}

export interface CommitResult {
  history: SpecHistory;
  result: ApplyResult;
}

export function createHistory(initial: DesignSpec): SpecHistory {
  return { past: [], present: initial, future: [] };
}

export function canUndo(h: SpecHistory): boolean {
  return h.past.length > 0;
}

export function canRedo(h: SpecHistory): boolean {
  return h.future.length > 0;
}

/**
 * Apply ops to the present spec and record a history step. If no op actually
 * applied (all skipped / no-op), the history is returned unchanged so undo
 * doesn't get cluttered with empty steps — the apply result is still returned
 * so the UI can report what was skipped and why.
 */
export function commit(h: SpecHistory, ops: readonly EditOp[]): CommitResult {
  const result = applyOps(h.present, ops);
  if (result.applied.length === 0) {
    return { history: h, result };
  }
  const past = [...h.past, h.present];
  const capped = past.length > HISTORY_CAP ? past.slice(past.length - HISTORY_CAP) : past;
  return { history: { past: capped, present: result.next, future: [] }, result };
}

export function undo(h: SpecHistory): SpecHistory {
  if (h.past.length === 0) return h;
  const present = h.past[h.past.length - 1];
  return { past: h.past.slice(0, -1), present, future: [h.present, ...h.future] };
}

export function redo(h: SpecHistory): SpecHistory {
  if (h.future.length === 0) return h;
  const present = h.future[0];
  return { past: [...h.past, h.present], present, future: h.future.slice(1) };
}
