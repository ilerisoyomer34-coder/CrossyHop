/// <reference types="node" />
/**
 * Balance simulator (Phase 0 subset of GDD 13.10).
 *
 * Runs the real simulation headless with the greedy bot and prints the time each shaft opens,
 * compared with the GDD 5.5 target curve.
 *
 *   npm run sim                      # greedy bot, manual tapping, up to shaft 10
 *   npm run sim -- --until=10 --mode=auto
 *   npm run sim -- --until=36 --mode=auto --barriers=0   # whole mine, blast waits skipped
 *
 * Phase 2 adds the balanced / casual strategies, multi-day runs with offline time and CSV output.
 */
import targets from '../src/data/progressionTargets.json';
import { formatNumber } from '../src/i18n/formatNumber';
import { economyConfig } from '../src/data/config';
import { createGameConfig, defaultConfig } from '../src/sim/GameConfig';
import { runGreedyBot } from '../src/sim/bots/runBot';

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function fmtTime(sec: number): string {
  if (sec < 60) return `${sec.toFixed(0)} sn`;
  if (sec < 3600) return `${(sec / 60).toFixed(1)} dk`;
  if (sec < 86400) return `${(sec / 3600).toFixed(2)} sa`;
  return `${(sec / 86400).toFixed(2)} gün`;
}

const until = Number(arg('until', '10'));
const mode = arg('mode', 'tap') === 'auto' ? 'auto' : 'tap';
const maxSeconds = Number(arg('max-hours', '6')) * 3600;
// --barriers=0 skips the blast waits (the targets exclude them; blasts also run while closed).
const withBarriers = arg('barriers', '1') !== '0';
const cfg = withBarriers
  ? defaultConfig
  : createGameConfig({
      ...economyConfig,
      barriers: economyConfig.barriers.map((b) => ({ ...b, durationSec: 0.05 })),
    });
// Long runs step coarser (the simulation is exact for any step size; the bot reacts per step).
const fast = until > 12;

const started = Date.now();
const result = runGreedyBot(cfg, {
  untilShafts: until,
  maxSeconds,
  mode,
  ...(fast ? { stepMs: 250, botEverySteps: 1 } : {}),
});
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

console.log(`\nCEVHER denge simülatörü — strateji: açgözlü (geri ödeme), mod: ${mode}`);
console.log(`Simüle edilen süre: ${fmtTime(result.seconds)} · gerçek süre: ${elapsed} sn`);
console.log(`Kaya engeli bekleme süresi (dahil): ${fmtTime(result.barrierSeconds)}\n`);
console.log('Kat | Simülasyon      | Gelir/sn  | GDD hedefi | Sapma');
console.log('----+-----------------+-----------+------------+-------');
for (const u of result.unlocks) {
  const target = targets.targets.find((t) => t.shaft === u.shaft);
  const dev = target
    ? `${(((u.seconds - target.seconds) / target.seconds) * 100).toFixed(0)}%`
    : '';
  console.log(
    `${String(u.shaft).padStart(3)} | ${fmtTime(u.seconds).padEnd(15)} | ${formatNumber(u.income).padEnd(9)} | ${(target ? fmtTime(target.seconds) : '').padEnd(10)} | ${dev}`,
  );
}
