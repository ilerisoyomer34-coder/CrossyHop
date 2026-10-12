/**
 * Haptic feedback (GDD 10.4: optional vibration where the Vibration API exists).
 * Browsers reject vibration before the first user gesture, so we only vibrate after sticky user
 * activation. Capacitor (Phase 5) can swap this for native haptics behind the same function.
 */
let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function vibrate(pattern: number | number[]): void {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function')
    return;
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation;
  if (activation && !activation.hasBeenActive) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some embedded browsers throw instead of returning false; haptics are best-effort.
  }
}
