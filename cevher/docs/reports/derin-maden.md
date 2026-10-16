# Derin maden: 36 kat, bölge asansörleri ve aktarma istasyonları (0.4.0)

**İstek:** "Daha fazla kat ekle: 3 kat altın, 4 kat elmas, 3 kat yakut, 3 kat zümrüt, safir, opal,
sonra siyah opal… yerin dibine, magmaya doğru kazacağız; birkaç asansör daha eklemek lazım."

**Oyuncunun verdiği kararlar:**

| Soru                      | Karar                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| Ek asansörler nasıl?      | Bölge asansörleri, aktarmalı: her 10 katta yeni asansör + istasyon |
| Safir / opal / siyah opal | Her birinden 3 kat                                                 |
| Magmaya varınca           | 3 kat ateş taşı + en dipte Magma Çekirdeği                         |
| Kaya engelleri            | Kat 5: 1 dk, Kat 10: 15 dk, Kat 15: 1 sa, Kat 20 ve sonrası: 2 sa  |
| Dibe ulaşma süresi        | Yaklaşık 3 saat açık oyun (otomatik mod, engel beklemeleri hariç)  |

## Ne değişti

- **36 kat:** Kömür 3 · Bakır 3 · Demir 4 · Altın 3 · Elmas 4 · Yakut 3 · Zümrüt 3 · Safir 3 · Opal 3 ·
  Siyah opal 3 · Ateş taşı 3 · Magma Çekirdeği 1 (`mines.json`). Her cevherin kendi rengi ve parıltısı,
  kaya rengi derine indikçe mordan kızıla döner (`regions.json`). Dibe ulaşınca özel bildirim.
- **Bölge asansörleri (relay):** Maden 10 katlık bölgelere ayrılır (`elevator.zoneSize`). Kat 11, 21
  ve 31 açılınca Asansör 2, 3 ve 4 seviye 1'de kurulur. Bölge z'nin asansörü önce altındaki aktarma
  istasyonuna iner, yukarı çıkarken kendi katlarını boşaltır ve yükü üstteki istasyona (bölge 0 için
  kuyu ağzı deposuna) bırakır. Sefer süresi yalnızca kendi bölgesine bağlıdır
  (4 sn + 0,6 sn × durak), bu yüzden derin maden seferleri uzatmaz.
- **Ekonomi:** Bölge asansörünün akışı ve fiyatı 6^10 ile ölçeklenir (10 kat derinlikteki cevher
  değeri). Zincirin teslim ettiği akış `D_z = min(E_z, P_z + D_{z+1})` ile hesaplanır; darboğaz
  zinciri ve yükseltme paneli **yavaşlatan en sığ asansörü** ("Asansör 2") gösterir. Çevrimdışı hesap
  da aynı zinciri kullanır: yöneticisi olmayan bir asansör yalnızca kendi bölgesini ve altını keser.
- **Derin denge:** İlk 10 kat tasarım belgesiyle aynı (~35 dk). Kat 10'dan sonra kat açma maliyeti
  kat başına ×9 yerine ×5,6 artar (`shaft.deepUnlock`); asansör/lojistikte seviye 250'den sonraki
  dönüm noktaları ×3 yerine ×7,5 (`deepMilestone`). Açgözlü bot (otomatik mod, engel beklemesi
  hariç) Kat 36'ya **2,9 saatte** iniyor; Kat 10'dan sonra kat başına ~5 dakikalık düzenli tempo.
  Yeni hedef eğrisi `progressionTargets.json` içinde; `npm run sim -- --until=36 --mode=auto
--barriers=0` ile yeniden üretilebilir.
- **Arayüz:** Bölgeler arasında aktarma istasyonu satırı (istasyon stoku, Asansör N kartı, dokunma
  alanı). Asansörler birden fazlaysa "Asansör 1, 2…" diye numaralanır; yeni kat düğmesi
  "Kat 11 · Altın · + Asansör 2" gösterir. Uzun cevher adları satırda alt satıra geçer.
- **Kayıt şeması v3:** Tek `elevator` yerine `elevators[]` ve `stations[]`; v2→v3 göçü eski kaydın
  asansörünü Asansör 1 yapar. 0.3.0 ile yazılmış gerçek bir kayıt (`tests/fixtures/save-v2.txt`,
  asansör yolda yüklüyken) testte yüklenip oynatılıyor.

## Doğrulama

- Birim testleri: 194 (19'u yeni: cevher sırası ve sayıları, engel süreleri, maliyet eğrileri, bölge
  hesapları, Kat 11 ile Asansör 2'nin kurulması, bölge fiyatları, relay akış formülü, cevherin
  istasyonlardan geçerek satılması, doymuş derin asansörün akış formülünü ±%3 tutması, darboğaz
  asansörü, çevrimdışı relay, v2 kayıt göçü, 4 asansörlü kayıt gidiş-dönüş, ~3 saatlik denge testi).
- Playwright (mobil + masaüstü): Kat 11 açılınca istasyon ve Asansör 2 geliyor, dokunmalı modda derin
  asansör çalıştırılıyor; tam maden 3 istasyon ve Magma Çekirdeği ile açılıyor. 16/16 geçiyor.

## Notlar

- Kaya engeli beklemeleri (toplam ~9,3 saat) gerçek zamanda işler ve oyun kapalıyken de sürer; bu
  yüzden "3 saat" açık oyun süresidir. Engeller beklenirken açık kalan oyunda nakit birikir.
- Tasarım belgesinde tek asansör ve bölge başına farklı madenler öngörülüyordu; derin tek maden ve
  bölge asansörleri oyuncunun isteğiyle eklendi.
- 360 px telefonlarda kat satırının dönüm noktası çubuğu yükseltme düğmesinin altında kısmen kalıyor
  (önceden de vardı).
