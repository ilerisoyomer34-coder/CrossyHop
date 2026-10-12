/**
 * Performance probe (GDD 13.8). Measures, with every unit automated and all 10 shafts open:
 *  - JS work per frame (simulation + scene building + UI hooks) — must stay far below 16.7 ms,
 *  - draw calls per frame — budget ≤ 150,
 *  - frames per second — logged only: in GPU-less CI containers Chromium rasterises WebGL on the
 *    CPU (SwiftShader), so FPS there says nothing about real devices. On a real desktop browser
 *    open `?debug=1` and read the FPS counter in the debug panel.
 */
import { expect, test } from '@playwright/test';
import type { DebugApi } from '../../src/main';

test('frame budget with a full mine', async ({ page }, info) => {
  await page.goto('/?debug=1&auto=1');
  await page.evaluate(() => {
    const { game, actions, D } = (window as unknown as { __cevher: DebugApi }).__cevher;
    const id = game.state.activeMineId;
    game.dispatch((s) => actions.debugUnlockAllShafts(s, id, game.cfg));
    game.dispatch((s) => actions.debugAddCash(s, id, D('1e40')));
    for (let i = 0; i < 10; i++)
      game.dispatch((s) => actions.buyShaftLevels(s, id, i, 99, game.cfg));
    game.dispatch((s) => actions.buyElevatorLevels(s, id, 999, game.cfg));
    game.dispatch((s) => actions.buyLogisticsLevels(s, id, 999, game.cfg));
  });
  await page.waitForTimeout(2500);

  const fps = await page.evaluate(async () => {
    const deltas: number[] = [];
    let last = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (t: number): void => {
        deltas.push(t - last);
        last = t;
        if (deltas.length < 60) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    deltas.shift();
    return 1000 / (deltas.reduce((a, b) => a + b, 0) / deltas.length);
  });

  await page.getByTestId('debug-toggle').click();
  await page.waitForTimeout(1200);
  const read = async (id: string): Promise<number> =>
    Number.parseFloat((await page.getByTestId(id).textContent()) ?? 'NaN');
  const drawCalls = await read('debug-draw-calls');
  const updateMs = await read('debug-update-ms');
  const renderMs = await read('debug-render-ms');
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  });

  const summary = {
    project: info.project.name,
    renderer,
    fps: Math.round(fps),
    drawCalls,
    updateMs,
    renderMs,
  };
  console.info('[perf]', JSON.stringify(summary));
  await info.attach('perf.json', {
    body: JSON.stringify(summary, null, 2),
    contentType: 'application/json',
  });

  expect(drawCalls).toBeGreaterThan(0);
  expect(drawCalls).toBeLessThanOrEqual(150);
  expect(updateMs + renderMs).toBeLessThan(8);
});
