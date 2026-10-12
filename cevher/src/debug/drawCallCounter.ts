/**
 * Counts WebGL draw calls per frame by wrapping the context's draw functions (debug only).
 * Returns a function that reads and resets the counter.
 */
export function instrumentDrawCalls(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
): () => number {
  let count = 0;
  const target = gl as unknown as Record<string, unknown>;
  for (const name of [
    'drawElements',
    'drawArrays',
    'drawElementsInstanced',
    'drawArraysInstanced',
  ]) {
    const original = target[name];
    if (typeof original !== 'function') continue;
    // Wrapping a native method needs the untyped call signature; arguments are forwarded untouched.
    const fn = original as (...args: unknown[]) => unknown;
    target[name] = function (this: unknown, ...args: unknown[]) {
      count++;
      return fn.apply(this, args);
    };
  }
  return () => {
    const value = count;
    count = 0;
    return value;
  };
}
