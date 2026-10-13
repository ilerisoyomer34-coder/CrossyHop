/**
 * Kayıt sistemi (GDD 13.6) uçtan uca: bozuk ana kayıtta yedekten yükleme, ayarlardan dışa/içe
 * aktarma ve yeni oyun.
 */
import { expect, test, type Page } from '@playwright/test';

const MAIN = 'cevher.save.main';
const BACKUP = 'cevher.save.backup1';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

/** Debug money + one shaft upgrade, so the state differs from a fresh game. */
async function makeProgress(page: Page): Promise<void> {
  await page.goto('/?debug=1');
  await page.getByTestId('debug-toggle').click();
  await page.getByRole('button', { name: '+1M' }).click();
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('upgrade-shaft-0').click();
  await expect(page.getByTestId('shaft-level-0')).toHaveText('Sv. 2');
}

test('a corrupt main save falls back to the backup and tells the player', async ({ page }) => {
  const errors = collectErrors(page);
  await makeProgress(page);
  // Runs at the start of the next document, after the old page flushed its save on `pagehide`.
  await page.addInitScript(
    ({ main, backup }) => {
      const good = localStorage.getItem(main);
      if (good && !sessionStorage.getItem('corrupted')) {
        sessionStorage.setItem('corrupted', '1');
        localStorage.setItem(backup, good);
        localStorage.setItem(main, good.slice(0, good.length / 2));
      }
    },
    { main: MAIN, backup: BACKUP },
  );
  await page.reload();
  await expect(page.getByTestId('shaft-level-0')).toHaveText('Sv. 2');
  await expect(page.locator('.toasts')).toContainText('yedek yüklendi');
  expect(
    errors.filter((e) => !e.includes('[CEVHER]')),
    errors.join('\n'),
  ).toEqual([]);
});

test('export → new game → import restores the progress', async ({ page }) => {
  const errors = collectErrors(page);
  await makeProgress(page);

  await page.getByTestId('settings-open').click();
  await expect(page.getByTestId('save-status')).toContainText('otomatik kaydedilir');
  await page.getByTestId('save-export').click();
  const text = await page.getByTestId('save-export-text').inputValue();
  expect(text.length).toBeGreaterThan(100);

  // New game needs a second tap to confirm.
  await page.getByTestId('save-new-game').click();
  await expect(page.getByTestId('save-new-game')).toContainText('tekrar dokun');
  await page.getByTestId('save-new-game').click();
  await expect(page.getByTestId('shaft-level-0')).toHaveText('Sv. 1');
  await expect(page.getByTestId('cash-value')).toHaveText('0');

  // A new game survives a reload too (the old save is really gone).
  await page.reload();
  await expect(page.getByTestId('shaft-level-0')).toHaveText('Sv. 1');

  await page.getByTestId('settings-open').click();
  await page.getByTestId('save-import').click();
  await page.getByTestId('save-import-text').fill('not a save');
  await page.getByTestId('save-import-apply').click();
  await expect(page.getByRole('alert')).toContainText('geçerli bir kayıt değil');

  await page.getByTestId('save-import-text').fill(text);
  await page.getByTestId('save-import-apply').click();
  await expect(page.getByTestId('shaft-level-0')).toHaveText('Sv. 2');
  await expect(page.locator('.toasts')).toContainText('Kayıt yüklendi');

  await page.reload();
  await expect(page.getByTestId('shaft-level-0')).toHaveText('Sv. 2');
  expect(
    errors.filter((e) => !e.includes('[CEVHER]')),
    errors.join('\n'),
  ).toEqual([]);
});
