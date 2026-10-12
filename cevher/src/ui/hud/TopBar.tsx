import { useRef } from 'preact/hooks';
import { t } from '../../i18n/t';
import type { GameState } from '../../state/GameState';
import { chainFlows } from '../../state/selectors';
import { Icon } from '../components/Icon';
import { formatter } from '../format';
import { useRuntime } from '../runtime';
import { reducedMotion, settingsOpen } from '../store';
import { CashCounter } from './CashCounter';

export function TopBar({ state }: { state: GameState }) {
  const runtime = useRuntime();
  const fmt = formatter(state.settings);
  const mineId = state.activeMineId;
  const flows = chainFlows(state, mineId, runtime.game.cfg);
  const mineName = t('mine.yesil-yamac-1.name');
  const cash = state.mines[mineId]?.cash;
  const lastTap = useRef(0);

  // Double tap on the bar scrolls the mine back to the surface (GDD 10.1).
  const onPointerUp = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest('button')) return;
    const now = performance.now();
    if (now - lastTap.current < 320) runtime.camera.scrollTo(0, !reducedMotion.peek());
    lastTap.current = now;
  };

  return (
    <div class="topbar" onPointerUp={onPointerUp}>
      <button
        type="button"
        class="mine-pill"
        aria-label={t('hud.mine', { name: mineName })}
        title={t('region.yesil-yamac.name')}
      >
        <Icon name="mountain" size={18} />
        <span class="mine-pill__name">{mineName}</span>
      </button>
      <div
        class="cash"
        aria-label={`${t('hud.cash')}: ${cash ? fmt.cash(cash) : '0'}`}
        role="group"
      >
        <Icon name="coin" size={26} class="cash__icon" />
        <div class="cash__text">
          <CashCounter />
          <span class="cash__rate" data-testid="income-rate">
            +{fmt.rate(flows.income)}
          </span>
        </div>
      </div>
      <div class="crystals" aria-label={`${t('hud.crystals')}: ${state.crystals}`} role="group">
        <Icon name="crystal" size={20} />
        <span>{fmt.num(state.crystals)}</span>
      </div>
      <button
        type="button"
        class="icon-btn"
        aria-label={t('hud.settings')}
        onClick={() => (settingsOpen.value = true)}
      >
        <Icon name="gear" size={22} />
      </button>
    </div>
  );
}
