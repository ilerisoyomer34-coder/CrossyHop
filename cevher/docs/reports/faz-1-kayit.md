# Kayıt sistemi ve çevrimdışı ilerleme (Faz 1'den öne alındı)

**Sorun:** Oyun kapatılıp açıldığında her seferinde baştan başlıyordu. Faz 0'da kayıt sistemi
yoktu; `main.ts` her açılışta yeni bir durum oluşturuyordu.

**Çözüm:** GDD 13.6'daki kayıt sistemi ve GDD 5.7'deki çevrimdışı hesap eksiksiz yazıldı.

## Ne değişti

| Parça                       | Açıklama                                                                                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform/storage.ts`       | `localStorage` soyutlaması. Her çağrı korumalı; depolama kapalıysa (gizli sekme, engelli site verisi) bellekte çalışır ve oyuncu uyarılır.                                                         |
| `state/save/serialize.ts`   | Durum ⇄ JSON. `Decimal` → metin (1e308 üstü korunur), açık uçlu faz sonu `Infinity` → `null`. Okurken her alan ve oyun kuralları (seviye aralığı, kat sayısı…) doğrulanır.                         |
| `state/save/SaveManager.ts` | Zarf `{ v, t, d, c }`: `d` lz-string ile sıkıştırılmış, `c` FNV-1a. Ana kayıt + 2 dönüşümlü yedek (en çok 5 dk'da bir döner). Bozuk ana kayıt → en yeni sağlam yedek.                              |
| `state/save/migrations.ts`  | Sürüm sürüm saf göç fonksiyonları (şimdilik v1; zincir ve hata yolları testli).                                                                                                                    |
| `state/save/AutoSave.ts`    | 30 sn'de bir, işlemden 2 sn sonra (debounce), sekme gizlenince ve `pagehide`'da hemen kayıt.                                                                                                       |
| `sim/OfflineCalculator.ts`  | Analitik çevrimdışı gelir: min(otomatik halkalar) × çarpan × verim (%50) × min(süre, 2 sa). Yöneticisiz halka → 0. Saat geri alınırsa gelir yok + işaret. Kaya engeli süresi gerçek zamanda işler. |
| `ui/modals/SaveSection.tsx` | Ayarlar › Kayıt: otomatik kayıt durumu, dışa aktar (kopyala), içe aktar, yeni oyun (iki dokunuşla onay).                                                                                           |
| `main.ts`                   | Açılışta kayıt yüklenir, aradaki süre hesaplanır, "Tekrar hoş geldin" / "yedekten yüklendi" bildirimi gösterilir. 5 sn'den uzun gizlenen sekmede de aynı hesap.                                    |
| Hata ayıklama paneli        | 1/2/8 saat yokluk simülasyonu; "Oyunu sıfırla" artık kayıtları da siler.                                                                                                                           |

Yeni denge/ayar sayıları `data/engine.json` (`save`, `debug.offlineHours`) ve
`data/economy.json` (`offline`) içinde; yeni metinler `data/i18n/{tr,en}.json` içinde.

## Doğrulama

- `npm run check`: tip denetimi, lint ve **158 birim testi** geçiyor (46'sı yeni: kayıt gidiş-dönüş,
  yüklenen durumdan simülasyonun birebir aynı devam etmesi, bozuk/kesik/değiştirilmiş kayıt, şema
  ihlalleri, yedek dönüşü, göçler, dışa/içe aktarma, depolama hataları, autosave zamanlaması,
  çevrimdışı gelir/sınır/yöneticisiz halka/saat geri alma, kaya engeli).
- GDD Faz 1 kabul ölçütü "2 saatlik offline simülasyonunda kazanç formülle ±%1 tutar": kare kare
  simülasyonla analitik hesap arasındaki fark **%0,006**.
- Playwright (mobil 390×844 + masaüstü): ilk döngü → **sayfa yenileme → ilerleme korunur**; bozuk
  ana kayıt → yedekten yükleme + bildirim; dışa aktar → yeni oyun → içe aktar. 10/10 geçiyor.

## Varsayımlar ve notlar

- Faz 0'da yönetici yok; bu yüzden oyuncu kapalıyken **nakit kazanmaz** (GDD 5.7: yalnızca
  otomatik birimler çalışır). Yöneticiler Faz 1'de gelince çevrimdışı gelir kendiliğinden çalışır.
  Açık kalan manuel döngüler (yarım kalan kazı, yoldaki asansör) oyun açılınca kaldığı yerden sürer.
- "Siz yokken…" penceresi yerine şimdilik bildirim (toast) kullanılıyor; pencere Faz 1 arayüzüyle
  gelecek.
- Aynı oyun iki sekmede açılırsa son kaydeden kazanır (sekmeler arası kilit Faz 1 sonrasına).
