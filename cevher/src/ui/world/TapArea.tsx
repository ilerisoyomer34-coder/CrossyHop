/** Transparent hit area over a unit's work zone with a "tap me" hint when it is idle. */
import type { ComponentChildren } from 'preact';
import { t } from '../../i18n/t';
import { Icon } from '../components/Icon';

export function TapArea({
  label,
  style,
  idle,
  automated,
  emphasize,
  onTap,
  testId,
  hintClass,
  children,
}: {
  label: string;
  style: Record<string, string>;
  idle: boolean;
  automated: boolean;
  emphasize: boolean;
  onTap: () => void;
  testId?: string;
  hintClass?: string;
  children?: ComponentChildren;
}) {
  return (
    <button
      type="button"
      class={`tap-area ${automated ? 'is-auto' : ''}`}
      style={style}
      aria-label={label}
      data-testid={testId}
      disabled={automated}
      onClick={onTap}
    >
      {!automated && idle && (
        <span
          class={`tap-hint ${emphasize ? 'is-emphasized' : ''} ${hintClass ?? ''}`}
          aria-hidden="true"
        >
          <Icon name="tap" size={22} />
          <span>{t('tap.hint')}</span>
        </span>
      )}
      {children}
    </button>
  );
}
