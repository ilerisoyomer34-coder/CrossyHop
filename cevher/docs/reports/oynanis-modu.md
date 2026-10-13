# Oynanış modu: Dokunmalı / Otomatik (0.3.0)

**İstek:** "Dokunmamız gerekmese, onlar işi yapsınlar; ayarlardan hem dokunmalı hem otomatik
seçilebilsin."

**Oyuncunun verdiği kararlar:**

| Soru                         | Karar                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| Otomatik mod nasıl çalışsın? | Ayarlarda tek anahtar; Otomatik seçilince **tüm** birimler |
| Kapalıyken para kazansın mı? | **Hayır**, yalnızca oyun açıkken üretir                    |
| Dokunmanın avantajı?         | **Yok**; iki mod aynı hızda üretir                         |
| Yeni oyun hangi modda?       | **Dokunmalı** başlar                                       |

## Ne değişti

- `Settings.playMode: 'tap' | 'auto'` (varsayılan `'tap'`). Kayıt şeması **v2**; `migrations.ts`
  içindeki v1→v2 adımı eski kayıtlara `playMode: 'tap'` ekler. 0.2.0 ile yazılmış gerçek bir kayıt
  (`tests/fixtures/save-v1.txt`) testte yüklenip oynatılıyor.
- `sim/automation.ts`: `isAutomated` (oyun açıkken kendi çalışır: yönetici, otomatik mod ya da hata
  ayıklama simülasyonu) ve `worksOffline` (kapalıyken de çalışır: yalnızca yönetici ve hata
  ayıklama "yönetici simülasyonu") ayrıldı. `OfflineCalculator` artık `worksOffline` kullanıyor;
  böylece otomatik mod kapalıyken para kazandırmıyor, kaya engeli süresi ise gerçek zamanda işlemeye
  devam ediyor.
- Mod değişince simülasyon sorunsuz geçiş yapıyor: Otomatiğe geçerken yarım kalan elle başlatılmış
  kazı bitip ardından döngü başlıyor; Dokunmalıya dönerken **her madenci o anki kazısını bitirip
  cevheri kasaya bırakıyor** (kat kaydında yeni `autoUntil` alanı), yoldaki asansör ve vagonlar da
  turlarını tamamlayıp duruyor. Bu sırada o kata dokunmak "meşgul" sayılıyor.
- Ayarlar › **Oynanış** (Dokunmalı / Otomatik) ve seçili moda göre açıklama metni.
- Otomatik birimlerde metin etiketi yerine küçük, dönen bir **ok simgesi** (`AutoBadge`): kat
  satırında yönetici yuvasının köşesinde, asansör/lojistik kartında kartın köşesinde durur. Böylece
  hiçbir ekran genişliğinde ya da uzun seviye/fiyat metninde yükseltme düğmesinin altında kalmaz ve
  dönüm noktası çubuğunu kaydırmaz. Ekran okuyucular için "Otomatik" düğme adına eklendi; azaltılmış
  hareket tercihinde dönmez.
- `state/save/compress.ts`: lz-string, Node'un yerel ESM yükleyicisinde de (tsx araçları) çalışsın
  diye tek yerden yükleniyor.

## Gözden geçirme

Değişiklik dört bağımsız açıdan incelendi (simülasyon, kayıt/çevrimdışı, arayüz, gereksinim
uyumu); her bulguyu iki ayrı denetçi çürütmeye çalıştı. 9 bulgudan 3'ü doğrulandı ve düzeltildi:
Dokunmalıya geçişte madencilerin yarım kazısının kaybolması, kat satırında simgenin dönüm noktası
çubuğunu yükseltme düğmesinin altına itmesi ve 424–470 px telefonlarda 3 haneli seviyede kart
simgesinin gizlenmesi. Diğer 6'sı gereksinimle çelişen ya da yeniden üretilemeyen bulgulardı.

## Doğrulama

- Birim testleri: 174 (16 yeni: varsayılan mod, otomatik modda hiç dokunmadan satış, yönetici
  otomasyonuyla birebir aynı üretim, elle/otomatik döngü süresi ve verimi eşit, iki yönde mod
  geçişi (Dokunmalıya dönüşte madenci başına tam bir yük daha gelmesi dahil), otomatik modda çevrimdışı gelir 0 ama kaya engeli işliyor, gerçek v1 kaydının göçü,
  bilinmeyen modun reddi).
- Playwright: Ayarlardan Otomatik → hiç dokunmadan ilk satış → yenileme sonrası mod korunuyor →
  Dokunmalıya dönüş.
