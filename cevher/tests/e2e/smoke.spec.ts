/**
 * Uçtan uca duman testi (GDD 13.11): oyun açılır → Kat 1'e dokunulur → ilk satış gerçekleşir →
 * ilk yükseltme alınır. "Sayfa yenilenir → ilerleme korunur" adımı kayıt sistemiyle (Faz 1) eklenir.
 */
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

/** Parses a formatted number like "8,4", "1,23K" or "12M" (Turkish locale). */
function parseShort(text: string | null): number {
  const raw = (text ?? '').replace(/[^0-9,.\-KMBT]/g, '');
  const match = /^(-?[0-9.,]+)([KMBT]?)$/.exec(raw);
  if (!match) return Number.NaN;
  const value = Number((match[1] ?? '').replace(',', '.'));
  const exp = { '': 0, K: 3, M: 6, B: 9, T: 12 }[match[2] as '' | 'K' | 'M' | 'B' | 'T'] ?? 0;
  return value * 10 ** exp;
}

test('first loop: dig → elevator → carriers → first sale → first upgrade', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('canvas.mine-canvas')).toBeVisible();
  await expect(page.getByTestId('cash-value')).toHaveText('0');

  await page.getByTestId('tap-shaft-0').click();
  await expect
    .poll(async () => parseShort(await page.getByTestId('crate-0').textContent()), {
      timeout: 8000,
    })
    .toBeGreaterThan(0);

  await page.getByTestId('tap-elevator').click();
  await expect
    .poll(async () => parseShort(await page.getByTestId('crate-0').textContent()), {
      timeout: 8000,
    })
    .toBe(0);
  await expect
    .poll(
      async () =>
        parseShort(
          (await page.getByTestId('depot-label').textContent())?.replace('Depo', '') ?? '',
        ),
      {
        timeout: 10_000,
      },
    )
    .toBeGreaterThan(0);

  await page.getByTestId('tap-logistics').click();
  await expect
    .poll(async () => parseShort(await page.getByTestId('cash-value').textContent()), {
      timeout: 10_000,
    })
    .toBeGreaterThanOrEqual(8);

  await expect(page.getByTestId('shaft-level-0')).toHaveText('Sv. 1');
  await page.getByTestId('upgrade-shaft-0').click();
  await expect(page.getByTestId('shaft-level-0')).toHaveText('Sv. 2');

  // The upgrade panel opens from the row and shows the new level.
  await page.getByTestId('shaft-info-0').click();
  await expect(page.getByTestId('panel-level')).toContainText('2');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('bottleneck chain marks the slowest link and follows upgrades', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?debug=1');
  await expect(page.getByTestId('chain-shafts')).toHaveAttribute('data-bottleneck', 'true');

  // Give money through the debug panel and max out shaft 1 → a transport link becomes the bottleneck.
  await page.getByTestId('debug-toggle').click();
  await page.getByRole('button', { name: '+1M' }).click();
  await page.getByTestId('debug-toggle').click();
  for (let i = 0; i < 3; i++) await page.getByTestId('buy-mode-chip').click(); // ×1 → ×10 → ×50 → MAKS
  await page.getByTestId('upgrade-shaft-0').click();

  const expected = await page.evaluate(() => {
    const { game, selectors } = (window as unknown as { __cevher: DebugApi }).__cevher;
    const f = selectors.chainFlows(game.state, game.state.activeMineId, game.cfg);
    const links = ['shafts', 'elevator', 'logistics'] as const;
    // Independent argmin over the raw numbers.
    let best: (typeof links)[number] = 'shafts';
    for (const l of links) if (f[l].lt(f[best])) best = l;
    return best;
  });
  expect(expected).not.toBe('shafts');
  await expect(page.getByTestId(`chain-${expected}`)).toHaveAttribute('data-bottleneck', 'true');
  await expect(page.locator('[data-bottleneck="true"]')).toHaveCount(1);

  // Tapping the bottleneck link opens its upgrade panel.
  await page.getByTestId(`chain-${expected}`).click();
  await expect(page.getByTestId('upgrade-panel')).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});
