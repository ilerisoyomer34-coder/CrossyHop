/** Player-facing messages about saves and time away (toasts). */
import type { OfflineReport } from '../sim/OfflineCalculator';
import { t } from '../i18n/t';
import type { LoadResult } from '../state/save/SaveManager';
import type { Settings } from '../state/GameState';
import { formatAway, formatter } from './format';
import { showToast } from './store';

const NOTICE_MS = 5000;

/** Tells the player what happened while they were away. Returns true when a toast was shown. */
export function showOfflineNotice(
  report: OfflineReport,
  settings: Settings,
  always = false,
): boolean {
  if (report.clockRewound) {
    showToast(t('offline.clockRewound'), 'info', NOTICE_MS);
    return true;
  }
  if (report.totalEarned.lte(0) && !always) return false;
  let text = t('offline.earned', {
    amount: formatter(settings).cash(report.totalEarned),
    time: formatAway(report.elapsedMs),
  });
  if (report.capped) text += ` ${t('offline.capped', { time: formatAway(report.creditedMs) })}`;
  showToast(text, 'success', NOTICE_MS);
  return true;
}

/** Explains how the game started: recovered from a backup, unreadable save, or welcome back. */
export function showLoadNotice(result: LoadResult, quietWelcome: boolean): void {
  if (result.recovered) showToast(t('save.recovered'), 'info', NOTICE_MS);
  else if (result.lost) showToast(t('save.lost'), 'info', NOTICE_MS);
  else if (result.state && !quietWelcome) showToast(t('save.welcomeBack'), 'success');
}
