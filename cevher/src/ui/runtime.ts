/** Services the UI needs (game, camera, loop), provided through a Preact context. */
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Game } from '../core/Game';
import type { GameLoop } from '../core/GameLoop';
import type { ScrollCamera } from '../render/camera/ScrollCamera';

export type FrameHook = (now: number, dtMs: number) => void;

export interface Runtime {
  game: Game;
  camera: ScrollCamera;
  loop: GameLoop;
  debugEnabled: boolean;
  version: string;
  /** Callbacks run every display frame after the scene renders (cash tween etc.). */
  frameHooks: Set<FrameHook>;
  /** Live draw-call counter (debug builds only). */
  drawCalls: () => number;
}

export const RuntimeContext = createContext<Runtime | null>(null);

export function useRuntime(): Runtime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('RuntimeContext missing');
  return runtime;
}
