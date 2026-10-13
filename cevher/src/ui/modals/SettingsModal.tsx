import { useEffect, useRef } from 'preact/hooks';
import { setLocale, t, type Locale } from '../../i18n/t';
import type { Notation } from '../../i18n/formatNumber';
import { updateSettings } from '../../state/actions';
import type { GameState } from '../../state/GameState';
import { Icon } from '../components/Icon';
import { useRuntime } from '../runtime';
import { settingsOpen } from '../store';
import { SaveSection } from './SaveSection';

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset class="setting">
      <legend class="setting__label">{label}</legend>
      <div class="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            role="radio"
            aria-checked={o.value === value}
            class={`segmented__item ${o.value === value ? 'is-active' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SettingsModal({ state }: { state: GameState }) {
  const runtime = useRuntime();
  const open = settingsOpen.value;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') settingsOpen.value = false;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  const close = (): void => {
    settingsOpen.value = false;
  };
  const setNotation = (notation: Notation): void => {
    runtime.game.dispatch((s) => updateSettings(s, { notation }));
  };
  const setLanguage = (locale: Locale): void => {
    setLocale(locale);
    runtime.game.dispatch((s) => updateSettings(s, { locale }));
  };

  return (
    <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        ref={dialogRef}
      >
        <header class="modal__header">
          <h2 id="settings-title">{t('settings.title')}</h2>
          <button
            type="button"
            class="icon-btn icon-btn--ghost"
            aria-label={t('panel.close')}
            onClick={close}
          >
            <Icon name="close" size={20} />
          </button>
        </header>
        <Choice<Notation>
          label={t('settings.notation')}
          value={state.settings.notation}
          options={[
            { value: 'short', label: `${t('settings.notationShort')} · 1,23K` },
            { value: 'scientific', label: `${t('settings.notationScientific')} · 1,23e3` },
          ]}
          onChange={setNotation}
        />
        <Choice<Locale>
          label={t('settings.language')}
          value={state.settings.locale}
          options={[
            { value: 'tr', label: t('settings.languageTr') },
            { value: 'en', label: t('settings.languageEn') },
          ]}
          onChange={setLanguage}
        />
        <SaveSection />
        <p class="modal__foot">{t('settings.version', { version: runtime.version })}</p>
      </div>
    </div>
  );
}
