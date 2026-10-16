/** Derin maden: Kat 11 ile Asansör 2 ve aktarma istasyonu kurulur; derin asansörler çalıştırılabilir. */
import { expect, test, type Page } from '@playwright/test';
import type { DebugApi } from '../../src/main';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test('opening floor 11 builds elevator 2 with a transfer station', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?debug=1');
  await expect(page.getByTestId('station-row-0')).toHaveCount(0);

  // Ten floors open (all barriers up to 10 cleared), plenty of cash.
  await page.evaluate(() => {
    const { game, actions, D } = (window as unknown as { __cevher: DebugApi }).__cevher;
    const id = game.state.activeMineId;
    game.dispatch((s) => actions.debugAddCash(s, id, D('1e40')));
    const open = () => game.state.mines[id]?.shafts.length ?? 0;
    for (let guard = 0; guard < 40 && open() < 10; guard++) {
      game.dispatch((s) => actions.debugFinishBarrier(s, id, game.cfg));
      game.step(50); // the barrier clears on the next simulation step
      game.dispatch((s) => actions.unlockNextShaft(s, id, game.cfg));
    }
    // Also clear the barrier below floor 10.
    game.dispatch((s) => actions.debugFinishBarrier(s, id, game.cfg));
    game.step(50);
  });
  await expect(page.getByTestId('shaft-row-9')).toBeAttached();
  await expect(page.getByTestId('unlock-shaft')).toContainText('Asansör 2');

  await page.getByTestId('unlock-shaft').click();
  await expect(page.getByTestId('station-row-0')).toBeAttached();
  await expect(page.locator('.toasts')).toContainText('Asansör 2 kuruldu');
  await expect(page.getByTestId('elevator-card-1')).toContainText('Asansör 2');
  await expect(page.getByTestId('elevator-card')).toContainText('Asansör 1');

  // Tap mode: elevator 2 is sent down from its station.
  await page.getByTestId('tap-shaft-10').click({ force: true });
  await page.waitForTimeout(4600);
  await page.getByTestId('tap-elevator-1').click({ force: true });
  const busy = await page.evaluate(() => {
    const { game } = (window as unknown as { __cevher: DebugApi }).__cevher;
    return game.state.mines[game.state.activeMineId]?.elevators[1]?.phase.kind;
  });
  expect(busy).not.toBe('idle');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the full mine reaches the magma core with four elevators', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?debug=1');
  await page.evaluate(() => {
    const { game, actions } = (window as unknown as { __cevher: DebugApi }).__cevher;
    const id = game.state.activeMineId;
    game.dispatch((s) => actions.debugUnlockAllShafts(s, id, game.cfg));
  });
  await expect(page.locator('[data-testid^="station-row-"]')).toHaveCount(3);
  await expect(page.getByTestId('shaft-row-35')).toContainText('Magma');
  await expect(page.getByTestId('bottom-row')).toContainText('Magma Çekirdeği');
  expect(errors, errors.join('\n')).toEqual([]);
});
