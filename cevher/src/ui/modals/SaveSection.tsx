/** Settings › Save: autosave status, export / import of the save text, new game (GDD 13.6). */
import { useEffect, useState } from 'preact/hooks';
import { t } from '../../i18n/t';
import { useRuntime } from '../runtime';
import { settingsOpen } from '../store';

type Mode = 'none' | 'export' | 'import';

const CONFIRM_MS = 3000;

export function SaveSection() {
  const { save, camera } = useRuntime();
  const [mode, setMode] = useState<Mode>('none');
  const [exported, setExported] = useState('');
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  useEffect(() => {
    if (!confirmNew) return undefined;
    const id = window.setTimeout(() => setConfirmNew(false), CONFIRM_MS);
    return () => window.clearTimeout(id);
  }, [confirmNew]);

  const toggle = (next: Mode): void => {
    setMode(mode === next ? 'none' : next);
    setCopied(false);
    setImportError(false);
    if (next === 'export') setExported(save.exportText());
  };

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(exported);
      setCopied(true);
    } catch {
      // Clipboard blocked (permissions / sandbox): the text stays selected for a manual copy.
      document.querySelector<HTMLTextAreaElement>('[data-testid="save-export-text"]')?.select();
    }
  };

  const load = (): void => {
    if (save.importText(importText)) {
      setImportText('');
      setMode('none');
      settingsOpen.value = false;
      camera.scrollTo(0, false);
    } else {
      setImportError(true);
    }
  };

  const newGame = (): void => {
    if (!confirmNew) {
      setConfirmNew(true);
      return;
    }
    setConfirmNew(false);
    save.newGame();
    settingsOpen.value = false;
    camera.scrollTo(0, false);
  };

  return (
    <fieldset class="setting">
      <legend class="setting__label">{t('save.title')}</legend>
      <p
        class={`save-status ${save.persistent ? '' : 'save-status--warn'}`}
        data-testid="save-status"
      >
        {save.persistent ? t('save.auto') : t('save.unavailable')}
      </p>
      <div class="save-actions">
        <button
          type="button"
          class={`save-btn ${mode === 'export' ? 'is-active' : ''}`}
          aria-expanded={mode === 'export'}
          data-testid="save-export"
          onClick={() => toggle('export')}
        >
          {t('save.export')}
        </button>
        <button
          type="button"
          class={`save-btn ${mode === 'import' ? 'is-active' : ''}`}
          aria-expanded={mode === 'import'}
          data-testid="save-import"
          onClick={() => toggle('import')}
        >
          {t('save.import')}
        </button>
        <button
          type="button"
          class="save-btn save-btn--danger"
          data-testid="save-new-game"
          onClick={newGame}
        >
          {confirmNew ? t('save.newGameConfirm') : t('save.newGame')}
        </button>
      </div>

      {mode === 'export' && (
        <div class="save-box">
          <textarea
            class="save-text"
            readOnly
            rows={3}
            aria-label={t('save.exportLabel')}
            data-testid="save-export-text"
            value={exported}
            onFocus={(e) => e.currentTarget.select()}
          />
          <div class="save-box__row">
            <span class="save-hint">{t('save.exportHint')}</span>
            <button type="button" class="save-btn" onClick={() => void copy()}>
              {copied ? t('save.copied') : t('save.copy')}
            </button>
          </div>
        </div>
      )}

      {mode === 'import' && (
        <div class="save-box">
          <textarea
            class="save-text"
            rows={3}
            aria-label={t('save.importPlaceholder')}
            placeholder={t('save.importPlaceholder')}
            data-testid="save-import-text"
            value={importText}
            onInput={(e) => {
              setImportText(e.currentTarget.value);
              setImportError(false);
            }}
          />
          <div class="save-box__row">
            <span class="save-hint save-hint--error" role="alert">
              {importError ? t('save.importError') : ''}
            </span>
            <button
              type="button"
              class="save-btn save-btn--primary"
              data-testid="save-import-apply"
              disabled={importText.trim().length === 0}
              onClick={load}
            >
              {t('save.importApply')}
            </button>
          </div>
        </div>
      )}
    </fieldset>
  );
}
