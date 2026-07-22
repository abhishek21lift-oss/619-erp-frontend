// Shared types for the MY PT STUDIO pull-to-refresh system.

import type { ReactNode } from 'react';

export type PullToRefreshPhase =
  | 'idle'        // resting, no gesture
  | 'pulling'     // dragging below the trigger threshold
  | 'ready'       // dragged past threshold — release will refresh
  | 'refreshing'  // onRefresh in flight
  | 'success';    // onRefresh resolved — brief checkmark before retract

export interface UsePullToRefreshOptions {
  /** Invoked once per completed gesture that crosses `threshold`. Awaited —
   *  the indicator stays pinned until it resolves, then shows success. */
  onRefresh: (() => Promise<unknown> | unknown) | null | undefined;
  /** Called if `onRefresh` throws/rejects. Retraction happens either way. */
  onError?: (err: unknown) => void;
  /** Raw drag distance (px) required before release triggers a refresh. */
  threshold?: number;
  /** Hard cap on visual pull distance. Defaults to threshold * 1.8. */
  maxPull?: number;
  /** Disable the gesture entirely. */
  disabled?: boolean;
}

export interface UsePullToRefreshResult {
  phase: PullToRefreshPhase;
  /** Eased visual pull distance in px, 0..maxPull. */
  pullDistance: number;
  /** pullDistance / threshold, clamped to [0, 1]. */
  progress: number;
  isRefreshing: boolean;
}

export interface PullIndicatorProps {
  phase: PullToRefreshPhase;
  /** 0..1 arm progress. */
  progress: number;
  /** Raw eased pull distance in px. */
  pullDistance: number;
  /** Honour prefers-reduced-motion — collapse motion to opacity fades. */
  reducedMotion: boolean;
}

export interface PullToRefreshProps {
  onRefresh: (() => Promise<unknown> | unknown) | null | undefined;
  children: ReactNode;
  /** Raw drag distance (px) required to arm a refresh. Default 80. */
  threshold?: number;
  className?: string;
  /** Override the default "toast on failure" error handling. */
  onError?: (err: unknown) => void;
  /** The single app-wide instance mounted in AppShell. It steps aside on
   *  any route whose page mounts its own (local) PullToRefresh. */
  global?: boolean;
}
