/** Services the UI needs (game, camera, loop), provided through a Preact context. */
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Game } from '../core/Game';
import type { GameLoop } from '../core/GameLoop';
import type { ScrollCamera } from '../render/camera/ScrollCamera';

export type FrameHook = (now: number, dtMs: number) => void;

/** Save actions offered to the UI (settings and debug panel). */
export interface SaveControls {
  /** False when the browser does not keep data (private mode, blocked storage). */
  readonly persistent: boolean;
  /** Current progress as one copy-pasteable line. */
  exportText(): string;
  /** Loads an exported save; false when the text is not a valid save. */
  importText(text: string): boolean;
  /** Erases every save slot and starts over. */
  newGame(): void;
  /** Debug: credits `hours` of time away as if the game had been closed. */
  simulateAway(hours: number): void;
}

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
  save: SaveControls;
}

export const RuntimeContext = createContext<Runtime | null>(null);

export function useRuntime(): Runtime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('RuntimeContext missing');
  return runtime;
}
