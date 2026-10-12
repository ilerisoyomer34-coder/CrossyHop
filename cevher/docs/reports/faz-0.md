# Faz 0 Raporu — Gri Kutu Prototip

Tarih: 2026-10-12 · Dal: `claude/cevher-faz-0` · Kaynak: [`docs/GDD.md`](../GDD.md) Bölüm 17 / 19

## 1. Teknoloji seçimleri

GDD 13.1'deki yığın **onaylandı**. Sürümler, birbiriyle uyumlu en güncel kararlı sürümler olarak seçildi;
iki noktada gerekçeli sapma var:

| Katman        | Seçim                                                    | Not                                                                                 |
| ------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Dil           | TypeScript **6.0** (strict + `noUncheckedIndexedAccess`) | TS 7 (yerel derleyici) çıktı ama typescript-eslint henüz `< 6.1` destekliyor.       |
| Derleme       | Vite 8.3                                                 |                                                                                     |
| Oyun dünyası  | PixiJS 8.22 (WebGL tercihli)                             |                                                                                     |
| Arayüz        | **Preact 10.29** + @preact/signals 2.11                  | Preact 11 iki hafta önce çıktı; araç zinciri (prefresh) olgunlaşınca yükseltilmeli. |
| Büyük sayılar | break_infinity.js 2.2                                    |                                                                                     |
| Test          | Vitest 4.1 + Playwright **1.56.1**                       | Playwright sürümü, ortamdaki Chromium 1194 ile eşleşecek şekilde sabitlendi.        |
| Kod kalitesi  | ESLint 10 (type-checked kurallar) + Prettier 3           |                                                                                     |
| Araç          | tsx                                                      | `npm run sim` için.                                                                 |

Faz 0'da kullanılmayan bağımlılıklar **eklenmedi**: Howler.js (ses), lz-string (kayıt), vite-plugin-pwa —
hepsi Faz 1 teslimatıdır.

## 2. Klasör yapısı ve dosyalar

```
cevher/
├─ index.html · package.json · package-lock.json · tsconfig.json · vite.config.ts
├─ playwright.config.ts · eslint.config.js · .prettierrc.json · README.md
├─ docs/  GDD.md · reports/faz-0.md
├─ src/
│  ├─ main.ts · env.d.ts
│  ├─ core/      BigNum · Clock · EventBus · Game · GameLoop · Rng
│  ├─ data/      economy.json · mines.json · regions.json · feel.json · engine.json
│  │             progressionTargets.json · config.ts (tipler + doğrulama) · i18n/{tr,en}.json
│  ├─ state/     GameState · actions · selectors · events · factory · update
│  ├─ sim/       Economy · GameConfig · Multipliers · automation · SimContext · Simulation
│  │             ShaftSystem · ElevatorSystem · LogisticsSystem · BarrierSystem
│  │             OfflineCalculator (arayüz, Faz 1) · bots/{GreedyBot, runBot}
│  ├─ render/    MineScene · SurfaceView · ShaftView · ElevatorView · LogisticsView · BottomView
│  │             CharacterView · PhaseTracker · layout · colors · camera/ScrollCamera
│  │             placeholders/PlaceholderArt
│  ├─ ui/        App · store · runtime · format · navigation · styles.css
│  │             hud/{TopBar, CashCounter, BottleneckChain} · world/{WorldOverlay, ShaftRow,
│  │             SurfaceWidgets, BottomRow, TapArea, FloatingTexts, px}
│  │             panels/{UpgradePanel, unitStats} · modals/SettingsModal
│  │             components/{Icon, UpgradeButton, BuyModeToggle, ProgressBar, Toasts}
│  │             hooks/useHoldRepeat
│  ├─ i18n/      t · formatNumber
│  ├─ platform/  haptics · types (reklam/IAP/analitik arayüzleri)
│  └─ debug/     DebugPanel · drawCallCounter
├─ tools/        balance-sim.ts
└─ tests/        economy · bulk · format · sim · bottleneck · actions · greedy · loop · misc
                 helpers · e2e/{smoke, perf}.spec.ts
```

## 3. Uygulama planı (uygulandığı sırayla)

1. İskelet: Vite + TS strict + Pixi + Preact, ESLint/Prettier, Vitest/Playwright yapılandırması.
2. Veri: `economy.json` (GDD 13.5 + döngü/sefer ayrıntıları), maden/bölge/his/motor yapılandırmaları,
   tip denetimi + çalışma zamanı doğrulaması.
3. Çekirdek: Decimal sarmalayıcı, tipli EventBus, enjekte edilebilir saat, tohumlu RNG, 20 Hz sabit adımlı
   döngü (enterpolasyon, kare başına adım sınırı, zaman ölçeği, yetişme penceresi).
4. Ekonomi: GDD 5.2 formülleri, geometrik seri toplu alım ve `k_max`, dönüm noktaları, çarpan yığını
   arayüzü.
5. Simülasyon: değişmez durum, mutlak zamanlı birim fazları; kat/asansör/lojistik/kaya engeli sistemleri;
   saf eylemler; darboğaz seçicileri.
6. Açgözlü bot + başsız sürücü + `npm run sim`.
7. Çizim: yer tutucu sanat üreticisi, karakter teçhizatları (`CharacterView`), yüzey/kat/asansör/
   lojistik/engel görünümleri, ataletli kaydırma kamerası, culling.
8. Arayüz: üst bar (tween'li nakit), darboğaz zinciri, dünya katmanı (dokunma alanları, yükselt düğmeleri,
   kasa/depo etiketleri), yükseltme paneli (alt sayfa / yan panel), basılı tutarak alım, ayarlar,
   yüzen sayılar, bildirimler, hata ayıklama paneli.
9. Doğrulama: birim + e2e testleri, ekran görüntüleriyle görsel kontrol, performans ölçümü.

## 4. Verilen kararlar ve varsayımlar

- **Asansör rotası (GDD 4.2 ile 5.2 arasındaki çelişki):** GDD'deki "yukarıdan aşağı yükle, dolunca dön"
  davranışı ölçümde, asansör darboğazken gerçek akışı formülün **%14–118 üstüne** çıkarıyordu (darboğaz
  göstergesi yanıltıcı olurdu). Asansör bu yüzden en derin kata iner, yukarı çıkarken kasaları boşaltır,
  dolunca doğrudan yüzeye çıkar; yükleme süresi yük miktarıyla orantılıdır. Böylece dolu bir sefer
  **tam olarak 4 sn + 0,6 sn × açık kat** sürer ve ölçülen akış formülle **±%0,6** içinde örtüşür.
- **Sefer süresinin ayrıştırılması:** 4 sn = 1 sn boşaltma + 1 sn tam kafes yükleme + 2 × 1 sn yüzey
  yolculuğu; kat başına 0,6 sn = 0,3 sn iniş + 0,3 sn çıkış. "Her 50 seviyede +%10 hız" toplamsal ve
  yalnızca yolculuğa uygulanır.
- **Kat döngüsü 4,2 sn** (yürü 1,2 + kaz 1,5 + dön 1,2 + boşalt 0,3); madenci başına yük, üretim
  formülünden türetilir, böylece ilk kazı 8,4 ₵ verir ve ilk yükseltmeyi (8 ₵) karşılar.
- **Lojistik döngüsü 4,7 sn**; taşıyıcı eşikleri 1/10/25/50/100/250/500/1000. seviye (GDD eşik vermiyordu).
- **Başlangıç nakdi 0** (yapılandırılabilir).
- **Kaya engeli bedeli:** ilk engel bedava; sonrakiler arkadaki katın açma maliyetinin %25'i.
- **Cevher bantları (10 katlık Faz 0 madeni):** Kömür 1–3, Bakır 4–6, Demir 7–10 — Faz 1'de 30 kata
  göre `mines.json`'dan yeniden ayarlanacak.
- **Açgözlü bot** "gelir artışı / maliyet" ölçütünü geri ödeme süresi olarak kullanır
  (`bekleme + maliyet / Δüretim`, en düşüğü seçilir) ve önce taşıma halkalarını üretime yetiştirir;
  analitik modelde GDD 5.5 eğrisini neredeyse birebir üretir (Kat 8: 9,9 dk, Kat 14: 11,1 sa,
  Kat 17: 6,5 gün).
- **Durum değişmezdir; para bellekte Decimal nesnesi olarak tutulur** (GDD 13.4'teki string biçimi Faz 1
  kayıt katmanında uygulanacak).
- **Birimler mutlak zaman saklar** (döngü başlangıcı, faz başı/sonu): durum yalnızca bir olay olduğunda
  değişir, çizim bir adım geriden enterpolasyonla akıcı kalır.
- **Otomasyon:** yöneticiler Faz 1'de; o zamana kadar hata ayıklama panelindeki "Otomatik çalıştır"
  bayrağı yönetici etkisini taklit eder.
- **Sekme gizlenince:** 5 sn'ye kadar olan boşluk yetişilerek simüle edilir; daha uzun boşlukta Faz 0
  geliri sıfırdır (yönetici yok). `OfflineCalculator` arayüzü tanımlandı, Faz 1'de uygulanacak.
- **Yuvarlama:** nakit aşağı, maliyetler yukarı yuvarlanır (ekranda "yetiyor" görünüp alınamama olmaz).
- **İngilizce çeviri** şimdiden eklendi (anahtar eşliği testle korunuyor); ayarlardan değiştirilebilir.
- **MSAA** yalnızca DPR < 2 ekranlarda açık (yüksek DPR'de gereksiz, yazılım rasterde %65 hız kazancı).

## 5. Çalıştırma ve test

```bash
cd cevher
npm install            # kilit dosyasından kurulur
npm run dev            # http://localhost:5173  (telefonda: npm run dev -- --host)
npm test               # 112 birim testi
npx playwright install chromium   # yalnızca ilk sefer
npm run test:e2e       # 6 uçtan uca test (mobil + masaüstü)
npm run sim            # açgözlü bot ↔ GDD 5.5 karşılaştırması
npm run check          # typecheck + lint + test
```

Tarayıcıda kabul kontrolü: `http://localhost:5173/?debug=1&bot=1&speed=100` → hata ayıklama panelinde
"Kat açılış süreleri" Kat 8'i ~11 dk gösterir; "FPS" sayacı kare hızını gösterir.

## 6. Kabul kriterleri

| #   | Kriter                                                    | Sonuç                                             | Kanıt                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `npm install && npm run dev` hatasız, `npm test` yeşil    | ✅                                                | Temiz `node_modules` ile `npm install` (npm 10) → dev sunucusu açılır, tarayıcı konsolunda hata yok; `npm test`: 9 dosya, **112/112**; lint/typecheck/prettier temiz; `npm run build` başarılı (ilk yük ≈ 200 KB gzip).                                                                                                                                                                                                                    |
| 2   | 5.4 tablosu testlerle doğrulanır                          | ✅                                                | `tests/economy.test.ts`: Kat 1–10 için B, C0, U, Sv.25 ve Sv.100 üretimi kesin değerlerle (1e-9) ve tablodaki biçimiyle ("4,15M", "2,58B"…).                                                                                                                                                                                                                                                                                               |
| 3   | Toplu alım = tek tek alımların döngüsel toplamı           | ✅                                                | `tests/bulk.test.ts`: 4 maliyet eğrisi × 60 rastgele (L, k); `k_max` döngüyle eşleşir; tam eşit nakit, 1e308 ötesi ve sınırlar.                                                                                                                                                                                                                                                                                                            |
| 4   | ×100'de açgözlü oyunla Kat 8, 5.5 süresinin ±%30'u içinde | ✅                                                | Gerçek simülasyon, kaya engeli dahil: dokunarak oynayan bot **11,0 dk (+%10)**, otomatik modda **10,4 dk (+%4)** (`tests/greedy.test.ts`). Tarayıcıda ×100 hızla bot: **10,96 dk**.                                                                                                                                                                                                                                                        |
| 5   | Darboğaz zinciri doğru halkayı gösterir                   | ✅                                                | Birim: `bottleneckOf`, eşitlik kuralı, gerçek oyun durumları; simülasyonda ölçülen gelir 5 darboğaz senaryosunda formülle ±%1,5 (`tests/sim.test.ts`). E2E: yükseltme sonrası işaret doğru halkaya geçer, tek halka işaretlidir, dokununca panel açılır.                                                                                                                                                                                   |
| 6   | Masaüstü tarayıcıda 60 fps                                | ⚠️ Bütçe doğrulandı, gerçek cihazda teyit gerekli | Bu konteynerde GPU yok; Chromium WebGL'i CPU'da (SwiftShader) çiziyor, bu yüzden buradaki FPS anlamsız (boş sayfa 60 fps, sahne yazılım rasterde ~25 fps). Ortamdan bağımsız ölçümler: kare başına simülasyon **0,2–0,3 ms**, çizim JS'i **~1,6–2,4 ms**, **12–15 draw call** (bütçe 150), JS yığını 31–57 MB. Bu, 16,7 ms'lik kare bütçesinin ~%15'i. Kendi masaüstünüzde `?debug=1` ile FPS sayacına bakarak teyit etmenizi rica ederim. |

Ek e2e testleri: ilk döngü (kaz → asansör → taşıyıcı → ilk satış → ilk yükseltme → panel) mobilde ve
masaüstünde geçer. GDD 13.11'deki "sayfa yenilenir → ilerleme korunur" adımı kayıt sistemiyle (Faz 1)
eklenecek.

İlerleme eğrisinin tamamı (`npm run sim`, dokunarak oynayan bot, kaya engeli dahil):

| Kat | Simülasyon | GDD 5.5 | Sapma |
| --- | ---------- | ------- | ----- |
| 2   | 40 sn      | ~40 sn  | −%1   |
| 5   | 3,9 dk     | ~3 dk   | +%30  |
| 8   | 11,0 dk    | ~10 dk  | +%10  |
| 10  | 38,8 dk    | ~40 dk  | −%3   |

## 7. Faz 1 öncesi riskler ve öneriler

1. **Asansör rotası kararı onayınızı bekliyor.** GDD'nin yazımından saptım ama formülü (ve dolayısıyla
   darboğaz göstergesi, offline gelir ve denge simülatörünü) birebir doğru tutuyor. Klasik "yukarıdan aşağı"
   davranışı isterseniz formülün de buna göre değişmesi gerekir.
2. **Erken oyun temposu:** Kat 5, ayrık gecikmeler (ilk döngüler, seferler) yüzünden hedefin +%30 sınırında.
   Faz 1 öğreticisi ve bedava yöneticiler bunu hızlandıracak; gerekirse başlangıç nakdi veya kat döngüsü
   `economy.json`'dan ayarlanabilir.
3. **30 kata geçiş:** 30 katta tam sefer 22 sn sürer, asansör akışı nominalin %45'ine iner. Bu GDD'nin
   niyeti ("derinleştikçe asansör önem kazanır") ama Kat 12–17 temposu Faz 1'de simülatörle yeniden
   kontrol edilmeli.
4. **Kayıt sistemi:** Durum mutlak simülasyon zamanları içeriyor; yüklemede duvar saati ile simülasyon
   saati eşlemesi (offline süre) ve saat geri alma koruması dikkatle tasarlanmalı. Kafes/vagon içindeki
   cevher durumda tutulduğu için kayıpsız saklanabilir.
5. **Offline gelir** ±%1 kriteri için `chainFlows` ile aynı formülleri kullanmalı; asansör rotası kararı bu
   yüzden önemli.
6. **Gerçek cihaz performansı:** Orta segment Android'de erken test (Faz 1 sonunda) ve düşük güç modu
   seçeneği önerilir; dünya katmanındaki DOM öğe sayısı 30 katta artacağı için görünmeyen satırların DOM'dan
   da çıkarılması (sanallaştırma) planlanmalı.
7. **Bağımlılıklar:** npm 10'un bağımlılık çözücüsünde (peer dependency) bir hata var; kilit dosyası
   commit'lendi, temiz kurulum çalışıyor. Preact 11 ve TypeScript 7'ye geçiş araç zinciri hazır olunca.
8. **GDD 5.5 gelir sütunu:** Süreler eşleşiyor ama aynı anlardaki gelir değerleri GDD'dekinden yüksek
   (örn. Kat 10'da 223M'e karşı 124M). Tablodaki gelirin nasıl ölçüldüğünü netleştirmekte fayda var.
9. **Erişilebilirlik:** Tüm düğmeler klavye ve `aria-label` ile erişilebilir; ekran okuyucu ile gerçek
   cihaz testi henüz yapılmadı.
