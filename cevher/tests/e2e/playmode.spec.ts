/** Oynanış modu: Ayarlar › Oynanış › Otomatik ile hiç dokunmadan üretim; ayar kayıtla korunur. */
import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

/** Parses a formatted number like "8,4", "1,23K" (Turkish locale). */
function parseShort(text: string | null): number {
  const raw = (text ?? '').replace(/[^0-9,.\-KMBT]/g, '');
  const match = /^(-?[0-9.,]+)([KMBT]?)$/.exec(raw);
  if (!match) return Number.NaN;
  const value = Number((match[1] ?? '').replace(',', '.'));
  const exp = { '': 0, K: 3, M: 6, B: 9, T: 12 }[match[2] as '' | 'K' | 'M' | 'B' | 'T'] ?? 0;
  return value * 10 ** exp;
}

test('automatic play mode earns without taps and survives a reload', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('cash-value')).toHaveText('0');

  await page.getByTestId('settings-open').click();
  await expect(page.getByTestId('play-mode-tap')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('play-mode-hint')).toContainText('dokununca');
  await page.getByTestId('play-mode-auto').click();
  await expect(page.getByTestId('play-mode-auto')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('play-mode-hint')).toContainText('kendi kendine');
  await page.keyboard.press('Escape');

  // Not a single tap: shaft → elevator → carriers → first sale on their own.
  await expect
    .poll(async () => parseShort(await page.getByTestId('cash-value').textContent()), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);
  await expect(page.getByTestId('auto-badge').first()).toBeVisible();

  await page.reload();
  await page.getByTestId('settings-open').click();
  await expect(page.getByTestId('play-mode-auto')).toHaveAttribute('aria-checked', 'true');

  // Back to tapping.
  await page.getByTestId('play-mode-tap').click();
  await expect(page.getByTestId('play-mode-hint')).toContainText('dokununca');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('auto-badge')).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});
