/** Compact "runs on its own" marker for a unit (icon only, so it fits narrow phone cards). */
import { t } from '../../i18n/t';
import { Icon } from './Icon';

export function AutoBadge() {
  const label = t('tap.auto');
  return (
    <span class="auto-badge" role="img" aria-label={label} title={label} data-testid="auto-badge">
      <Icon name="auto" size={14} />
    </span>
  );
}
