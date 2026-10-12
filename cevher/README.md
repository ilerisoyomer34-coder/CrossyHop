# CEVHER: Maden Baronu

Dedesinden kalan terk edilmiş madeni devralan maden mühendisi **Defne**'nin, katları kazıp asansör ve
taşıma zincirini optimize ederek Anadolu dağlarından Ay'a uzanan bir maden imparatorluğu kurduğu
özgün bir idle/tycoon oyunu.

> **Durum: Faz 0 — Gri kutu prototip.** Tasarım dokümanı: [`docs/GDD.md`](docs/GDD.md) ·
> Faz raporu: [`docs/reports/faz-0.md`](docs/reports/faz-0.md)

## Hemen oyna

- **GitHub Pages:** https://ilerisoyomer34-coder.github.io/CrossyHop/cevher/play/ (`main` dalına
  birleştirildikten sonra yayında olur)
- Hata ayıklama paneli ve bot için adresin sonuna `#debug` ekleyin.

Bu sürüm `npm run build:pages` ile `play/` klasörüne derlenir; oyunu değiştirdikten sonra bu komutu
çalıştırıp `play/` klasörünü de commit'leyin.

## Hızlı başlangıç

Gerekenler: **Node.js 22.12+** (npm 10 veya 11).

```bash
cd cevher
npm install
npm run dev          # http://localhost:5173 — telefonda denemek için: npm run dev -- --host
```

Telefonda denemek için bilgisayar ile telefon aynı ağdayken `npm run dev -- --host` komutunun
yazdığı `Network:` adresini telefon tarayıcısında açın.

## Nasıl oynanır (Faz 0)

1. **Kat 1**'deki tünele dokun → madenciler kazar, cevher kasaya dolar.
2. Sol üstteki **kuyu kulesine** dokun → asansör en derin kata iner, yukarı çıkarken kasaları boşaltır,
   cevheri kuyu ağzı deposuna döker.
3. **Rayların** altındaki "Dokun"a bas → taşıyıcılar vagonu ambara iter, cevher anında satılır.
4. Nakitle katları, asansörü ve lojistiği **yükselt**, yeni katlar aç. Kat 5'ten sonra **kaya engelini**
   patlat (1 dk, bedava).
5. Üstteki **üretim zinciri** en yavaş halkayı (Darboğaz) gösterir; ona dokununca ilgili birime gidip
   yükseltme panelini açar.

İpuçları: Yükselt düğmesini **basılı tutarak** hızlı alım yapılır; sağ alttaki çip satın alma
miktarını değiştirir (×1 → ×10 → ×50 → MAKS → Dönüm); üst bara çift dokunmak en üste kaydırır.

## Komutlar

| Komut                                                   | Ne yapar                                                                                                               |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                           | Geliştirme sunucusu (hata ayıklama paneli açık)                                                                        |
| `npm run build`                                         | Tip denetimi + üretim derlemesi (`dist/`)                                                                              |
| `npm run preview`                                       | Üretim derlemesini yerelde sunar                                                                                       |
| `npm test`                                              | Vitest birim testleri (ekonomi, toplu alım, biçimlendirme, simülasyon, bot, döngü)                                     |
| `npm run test:e2e`                                      | Playwright uçtan uca testler (mobil 390×844 + masaüstü 1440×900)                                                       |
| `npm run lint` · `npm run typecheck` · `npm run format` | Kod kalitesi                                                                                                           |
| `npm run check`                                         | typecheck + lint + test                                                                                                |
| `npm run sim`                                           | Denge simülatörü: açgözlü bot Kat 10'a kadar oynar, GDD 5.5 eğrisiyle karşılaştırır (`-- --mode=auto`, `-- --until=8`) |

İlk kez e2e çalıştırıyorsanız tarayıcıyı indirin: `npx playwright install chromium`.

## Hata ayıklama paneli

Geliştirme modunda her zaman, üretim derlemesinde `?debug=1` (veya `#debug`) ile açılır (sol alttaki böcek düğmesi):
zaman hızı ×1/×10/×100/×1000, duraklat, ileri sar (1/10/60 dk), nakit/kristal/JP ekleme, tüm katları
açma, engeli bitirme, **otomatik çalıştırma** (yönetici simülasyonu), **açgözlü bot**, oyunu sıfırlama,
FPS / kare süresi / draw call / kare başına JS süresi, ham akış değerleri, ölçülen satış ve kat açılış
süreleri.

URL parametreleri (yalnızca debug modunda): `speed=100`, `auto=1`, `bot=1`, `aa=0|1` (MSAA).
Örnek: `http://localhost:5173/?debug=1&bot=1&speed=100` — bot ×100 hızda oynar.

## Mimari özeti

```
src/
  core/      GameLoop (20 Hz sabit adım + enterpolasyon), Game (orkestratör), EventBus, BigNum, Rng, Clock
  data/      economy.json · mines.json · regions.json · feel.json · engine.json · i18n/{tr,en}.json
  state/     GameState (değişmez model), actions (saf eylemler), selectors, events, factory
  sim/       Economy (formüller), Shaft/Elevator/Logistics/Barrier sistemleri, Simulation, bots/
  render/    Pixi sahnesi: MineScene, Surface/Shaft/Elevator/Logistics/Bottom view, kamera, yer tutucu sanat
  ui/        Preact arayüzü: HUD, darboğaz zinciri, dünya katmanı, yükseltme paneli, ayarlar
  debug/     Hata ayıklama paneli, draw call sayacı
  platform/  haptics + platform sağlayıcı arayüzleri
tools/       balance-sim.ts
tests/       Vitest birim testleri + e2e/ (Playwright)
```

- `sim/`, `state/` ve `data/` PixiJS'e ve DOM'a bağımlı değildir; aynı kod oyunda, testlerde ve
  Node.js'teki denge simülatöründe çalışır.
- Tüm denge sayıları `src/data/*.json` içindedir; kodda sihirli sayı yoktur.
- Tüm kullanıcı metinleri `src/data/i18n/*.json` dosyalarından gelir (Türkçe + İngilizce).
