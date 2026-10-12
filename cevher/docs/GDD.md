# BÖLÜM 1 — ANA PROMPT

## 0. Rolün ve Çalışma Kuralların

Sen; idle/tycoon türünde milyonlarca indirme almış mobil oyunlar geliştirmiş kıdemli bir **oyun geliştiricisi**, **oyun ekonomisi tasarımcısı** ve **teknik direktörsün**. TypeScript, PixiJS, performans optimizasyonu, oyun ekonomisi dengelemesi, kayıt sistemleri ve mobil web (PWA) konularında uzmansın. Benimle birlikte **CEVHER: Maden Baronu** adlı özgün bir idle madencilik oyununu geliştireceksin. Bu belge oyunun tam tasarım dokümanıdır (GDD) ve tek doğruluk kaynağıdır.

**Çalışma kuralların:**

1. **Faz faz ilerle.** Bölüm 17'deki fazları sırayla uygula. Bir fazı bitirmeden sonrakine geçme. Her fazın sonunda kabul kriterlerini tek tek kontrol et ve sonucu bana raporla.
2. **Her teslimat çalışır olmalı.** Yazdığın kod `npm install && npm run dev` ile hatasız açılmalı. Yarım fonksiyon, "TODO: buraya mantık gelecek" gibi boş gövdeler bırakma. Bir şeyi o fazda yapmayacaksan açıkça belirt ve arayüzünü (interface) yine de tanımla.
3. **Önce plan, sonra kod.** Her fazın başında 5–10 maddelik kısa bir uygulama planı ve etkilenecek dosya listesini göster, sonra kodu yaz.
4. **Tam dosya ver.** Yeni ya da değişen dosyaları eksiksiz ver; "geri kalanı aynı" gibi kısaltmalar kullanma (ben açıkça diff istemedikçe).
5. **Veri odaklı tasarım.** Tüm denge sayıları (maliyetler, çarpanlar, süreler, olasılıklar) `src/data/` altındaki yapılandırma dosyalarında durmalı. Kodun içine sihirli sayı gömme.
6. **TypeScript strict modu** açık olsun. `any` kullanma; zorunlu kalırsan nedenini yorumla açıkla.
7. **Test et.** Ekonomi formülleri, kayıt/yükleme, offline gelir ve prestij hesapları birim testleriyle (Vitest) korunmalı.
8. **Varsayım yaparsan söyle.** Belgede net olmayan bir noktada en makul kararı ver, kodu yaz ve kararını raporunda tek cümleyle belirt. Kapsamı büyüten bir değişiklik önereceksen önce bana sor.
9. **Özgünlük.** Hiçbir mevcut oyunun adını, karakterini, logosunu, arayüz görselini, metnini veya sesini kopyalama. Tür mekanikleri serbesttir; ifade ve sanat özgün olmalıdır.
10. **Türkçe arayüz, İngilizce kod.** Oyun metinleri Türkçe (sonra İngilizce eklenecek), kod içi isimler ve yorumlar İngilizce olsun. Tüm metinler çeviri dosyalarından gelsin.

## 1. Proje Özeti

| Alan | Tanım |
|---|---|
| Çalışma adı | **CEVHER: Maden Baronu** (İngilizce: *CEVHER: Ore Baron*) |
| Tür | Idle / Tycoon / Kaynak Yönetimi |
| Platform | Tarayıcı (masaüstü + mobil web), PWA olarak yüklenebilir; sonraki aşamada Capacitor ile iOS ve Android |
| Yönelim | Dikey (9:16) öncelikli; tablet ve masaüstünde yatay düzene uyum |
| Hedef kitle | 13+ yaş, kısa ve sık oturum oynayan geniş kitle; tycoon ve idle oyun sevenler |
| Oturum yapısı | Günde 4–8 kısa oturum (2–10 dk) + arada boşta (offline) ilerleme |
| Tek cümlelik özet | Dedesinden kalan terk edilmiş madeni devralan genç mühendis Defne, katları kazıp asansör ve taşıma zincirini optimize ederek Anadolu dağlarından Ay'a uzanan bir maden imparatorluğu kurar. |

**Türdeki rakiplerden farklılaştığımız noktalar (USP):**

- **Darboğaz Göstergesi:** Üretim zincirindeki en yavaş halka (katlar, asansör, lojistik) her an görsel olarak gösterilir ve "şimdi neyi yükseltmeliyim?" sorusu oyuncuya net yanıt bulur.
- **Rafineri katmanı:** Orta oyunda açılan dördüncü halka; cevherin bir kısmını külçeye çevirip daha değerli satar. Oyuncuya yeni bir optimizasyon kararı verir.
- **Fosil Müzesi:** Kazı sırasında nadiren bulunan fosil ve eser parçalarıyla koleksiyon setleri tamamlanır, kalıcı bonuslar kazanılır.
- **Bölgeye özgü tek kural:** Her bölgenin, oyunu karmaşıklaştırmadan çeşitlendiren tek bir özel mekaniği vardır (donma, ısı, düşük yerçekimi vb.).
- **Jeoloji Ağacı:** Prestij para birimiyle açılan, oyuncunun kendi oyun stilini seçtiği dallı araştırma ağacı.
- **Yerel ve sıcak dünya:** Karadeniz yaylaları, Kapadokya peribacaları gibi Anadolu esintili bölgelerle başlayıp dünyaya ve Ay'a açılan özgün bir atmosfer.
- **Etik para kazanma:** Zorunlu reklam yok, enerji sistemi yok, şansa dayalı ödüllerde olasılıklar açıkça gösterilir.

## 2. Hikâye, Karakterler ve Dünya

Hikâye hafiftir; oyuncuyu yormaz, motivasyon ve kişilik katar. Kısa diyalog balonları, mektuplar ve bölge geçiş kartlarıyla anlatılır.

**Ana karakterler (tamamen özgün):**

- **Defne Usta** — 20'li yaşlarının sonunda, kıvırcık koyu saçlı, alnında pirinç çerçeveli yuvarlak gözlük, turuncu reflektör şeritli turkuaz iş ceketi giyen maden mühendisi. Kararlı, esprili, iyimser. Oyuncunun kendisidir; ekranda yüzey alanında ve hikâye kartlarında görünür.
- **Rıza Dede** — Defne'nin dedesi. Madeni yıllar önce kapatmak zorunda kalmıştır. Oyunda "Dede'nin Defteri" adlı not sayfaları aracılığıyla ipuçları verir. Sonradan efsanevi bir kat yöneticisi olarak kazanılabilir.
- **Kösti** — Küçük, tombul bir köstebek maskot. Kafasında yan tarafa monte edilmiş minik fenerli bir kask, burnunun üstünde büyük yuvarlak gözlük, koltuğunun altında not defteri. Öğretici rehberdir, başarımları kutlar, ipucu verir.
- **Granitaş Holding** — Komik, hafif kibirli rakip maden şirketi. Etkinliklerde ve sıralama yarışlarında "rakip" olarak görünür. Kötü değil, şımarık rakiptir.

**Çalışan tipleri ve renk kodları (okunabilirlik için sabit):**

| Rol | Görünüm | Renk kodu |
|---|---|---|
| Kat madencileri | 2,5 kafa boyunda tombul figürler; turkuaz tulum, yanında fener bulunan yuvarlak kask, iri eldiven | Turkuaz `#2A9D8F` |
| Asansör operatörü | Lacivert üniforma, düz kasket, pirinç kollu kontrol paneli | Lacivert `#264653` |
| Taşıyıcılar | Zeytin yeşili yelek, bandana, küçük raylı vagon | Zeytin `#6A7F3A` |
| Rafineri işçileri | Deri önlük, koruyucu maske, ateş turuncusu detaylar | Turuncu `#E76F51` |

**Dünya:** Oyun "kesit görünüm" (cross-section) kullanır: Yüzeyde ambar, satış iskelesi ve rafineri; yüzeyin altında dikey bir kuyu ve yan yana dizilmiş maden katları. Derinlere indikçe kaya rengi koyulaşır, cevherler daha parlak ve değerli görünür.

## 3. Çekirdek Oyun Döngüsü

Oyunun kalbi, üç halkalı bir **üretim zinciridir**. Gelir, zincirin en yavaş halkasıyla sınırlıdır:

```
 [KAT 1..N]  →  kasalar  →  [ASANSÖR]  →  kuyu ağzı deposu  →  [LOJİSTİK]  →  AMBAR  →  SATIŞ (₵)
   üretir        biriktirir     toplar          biriktirir         taşır                   nakde döner

 Gelir/sn = min( Σ Kat üretimi , Asansör akışı , Lojistik akışı ) × çarpanlar
```

1. **Kat (Maden Katı):** Madenciler kaya yüzeyine yürür, kazar, cevheri katın kasasına taşır. Kasa sınırsızdır ama içindeki cevher ancak asansör aldığında değer kazanır.
2. **Asansör:** Kafes asansör kuyu boyunca yukarıdan aşağıya iner, sırayla her katın kasasından kapasitesi dolana kadar cevher alır, yüzeye çıkar ve **kuyu ağzı deposuna** boşaltır.
3. **Lojistik:** Taşıyıcılar raylı vagonlarla kuyu ağzı deposundan ambara cevher taşır. Ambara ulaşan cevher anında satılır ve nakde dönüşür.

**Elle çalıştırma ve otomasyon:** Bir birimin yöneticisi yoksa oyuncu o birime dokunarak bir çalışma döngüsü başlatır (bir kazı turu, bir asansör seferi, bir taşıma turu). Yönetici atanan birim sürekli kendiliğinden çalışır ve oyun kapalıyken de üretime katkı verir.

**Oyun döngüleri:**

| Döngü | Süre | Oyuncunun yaptığı |
|---|---|---|
| Mikro | 10–30 sn | Dokunarak birim çalıştırma, yükseltme satın alma, beceri kullanma |
| Kısa | 2–10 dk | Yeni kat açma, darboğazı çözme, yönetici işe alma, takviye başlatma |
| Orta | Günlük | Offline geliri toplama, günlük sözleşmeleri bitirme, kaya engellerini aşma |
| Uzun | Haftalık | Prestij (Derinleştirme), Jeoloji Ağacı, yeni maden/bölge, etkinlikler, fosil setleri |

## 4. Birimler: Ayrıntılı Davranış

### 4.1 Kat (Maden Katı)

- Her madende **30 kat** bulunur. Kat 1 açık başlar; diğerleri nakitle açılır.
- Kat istatistikleri: **Madenci sayısı**, **Kazı hızı**, **Yürüme hızı**, **Taşıma kapasitesi**. Arayüzde bunlar tek bir okunabilir değere, **Üretim/sn**'ye indirgenir; ayrıntılar yükseltme panelinde görünür.
- Madenci sayısı belirli seviyelerde artar (Seviye 1: 1, Seviye 10: 2, Seviye 25: 3, Seviye 50: 4, Seviye 100: 5, Seviye 200: 6, Seviye 300: 7, Seviye 400: 8). Görsel olarak katta daha çok madenci görünür.
- Madenci animasyon döngüsü: kaya yüzeyine yürü → kazma vur (3 vuruş) → cevher çuvalını al → kasaya yürü → boşalt. Bir döngünün süresi istatistiklerden türetilir; animasyon hızı buna uyar.
- Kasa üstünde birikmiş cevher miktarı kısaltılmış sayıyla gösterilir.
- Her kat bir **cevher türüne** sahiptir (bölgeye göre; örneğin Yeşil Yamaç'ta Kömür → Bakır → Demir). Cevher görünümü kat derinleştikçe değişir.
- Maksimum seviye: 400 (yapılandırmadan değiştirilebilir).

### 4.2 Asansör

- İstatistikler: **Kapasite** (sefer başına taşınan cevher), **Hız** (kat/sn), **Yükleme hızı**.
- Davranış: Yüzeyde bekler → aşağı iner → her açık katta durur, o katın kasasından kalan kapasitesi kadar cevher alır → kapasite dolunca ya da son kata gelince yukarı çıkar → kuyu ağzı deposuna boşaltır.
- Tur süresi = 4 sn sabit + açık kat başına 0,6 sn (iniş + çıkış + yükleme). Gerçek akış = Kapasite / Tur süresi. Bu nedenle derinleştikçe asansör yatırımı önem kazanır.
- Hız, her 50 seviyede %10 artar; kapasite her seviyede artar (Bölüm 5 formülleri).
- Maksimum seviye: 2000.

### 4.3 Lojistik (Taşıyıcılar ve Ambar)

- İstatistikler: **Taşıyıcı sayısı**, **Vagon kapasitesi**, **Yürüme hızı**.
- Taşıyıcı sayısı belirli seviyelerde artar (1, 2, 3 … en fazla 8). Her taşıyıcı bağımsız yürür; ekranda vagon trafiği oluşur.
- Davranış: Kuyu ağzı deposundan vagonu doldur → raylar boyunca ambara it → boşalt (satış anında gerçekleşir, nakit sayacı yükselir) → geri dön.
- Maksimum seviye: 2000.

### 4.4 Rafineri (Faz 2'de açılır, Kat 10'dan sonra)

- Ambar ile satış arasına eklenen isteğe bağlı dördüncü halka.
- Rafineri, kendi işleme kapasitesi kadar cevheri külçeye çevirir ve **×2** değerle satar (seviyeyle ×3'e kadar çıkar). Kapasiteyi aşan cevher ham olarak ×1 değerle satılır.
- Gelir = ham_kısım × 1 + işlenen_kısım × rafineri_çarpanı. Böylece rafineri hiçbir zaman zinciri yavaşlatmaz, yalnızca değer katar.
- Oyuncuya yeni bir karar verir: "Nakdi zinciri hızlandırmaya mı, yoksa rafineriye mi yatırmalıyım?"

### 4.5 Kaya Engelleri

- Her 5 katta bir (5→6, 10→11, 15→16 …) bir **kaya engeli** vardır. Aşmak için nakit ödenir ve bir patlatma süresi beklenir.
- Süreler: Kat 5 engeli 1 dk, Kat 10: 15 dk, Kat 15: 1 sa, Kat 20: 4 sa, Kat 25: 8 sa.
- Süre beklenebilir, reklamla %50 kısaltılabilir (günde sınırlı) veya kristalle anında bitirilebilir. İlk engel her zaman bedava ve kısadır (öğretici).
- Engel süresi boyunca oyun normal devam eder; engel, oyuncuya "geri gelme nedeni" sunar.

## 5. Ekonomi ve Formüller

### 5.1 Para Birimleri

| Para birimi | Kapsam | Nasıl kazanılır | Nerede harcanır |
|---|---|---|---|
| **Nakit (₵)** | Maden başına ayrı | Cevher satışı | Yükseltmeler, kat açma, nakitle yönetici alımı |
| **Kristal** | Global (premium) | Başarımlar, sözleşmeler, etkinlikler, fosil setleri, satın alma | Süre atlama, yönetici alımı, kozmetik, kalıcı takviye |
| **Jeoloji Puanı (JP)** | Global (prestij) | Derinleştirme (prestij) | Jeoloji Ağacı |
| **Etkinlik Jetonu** | Etkinliğe özel | Etkinlik madeni | Etkinlik ödülleri |
| **Fosil Parçası** | Global | Kazı sırasında nadir düşüş | Müze setleri |

### 5.2 Temel Formüller (Maden 1, Yeşil Yamaç)

Aşağıdaki formüller başlangıç değerleridir; tamamı `src/data/economy.json` içinde parametre olarak durmalıdır. `n` = kat numarası (1'den başlar), `L` = birimin seviyesi.

```
Kat taban üretimi       B(n)    = 2 × 6^(n-1)                   ₵/sn, seviye başına
Kat üretimi             P(n,L)  = B(n) × L × 2^floor(L/25)      ₵/sn
Kat ilk yükseltme       C0(n)   = 8 × 7.5^(n-1)                 ₵
Kat yükseltme L→L+1     Ck(n,L) = C0(n) × 1.12^(L-1)            ₵
Kat açma (n ≥ 2)        U(n)    = 60 × 9^(n-2)                  ₵

Asansör nominal akış    A(L)    = 6 × L × 3^floor(L/25)         ₵/sn  (10 katlık referans derinlikte)
Asansör yükseltme       Ca(L)   = 25 × 1.07^(L-1)               ₵
Asansör kapasitesi      Kap(L)  = A(L) × 10 sn                  (sefer başına)

Lojistik nominal akış   T(L)    = 6 × L × 3^floor(L/25)         ₵/sn
Lojistik yükseltme      Ct(L)   = 25 × 1.07^(L-1)               ₵

Gelir/sn  = min( Σ P(n,L_n) , Asansör gerçek akışı , T(L) ) × Toplam Çarpan
```

**Toplu satın alma (geometrik seri):** Seviye L'den k seviye birden almanın maliyeti:

```
Maliyet(L, k) = C × g^(L-1) × (g^k − 1) / (g − 1)
Alınabilecek en fazla seviye: k_max = floor( log( 1 + nakit × (g − 1) / (C × g^(L-1)) ) / log(g) )
```

Satın alma modları: **×1, ×10, ×50, MAKS** ve **"Sonraki dönüm noktası"** (bir sonraki 25'in katına kadar).

### 5.3 Dönüm Noktaları (Milestone)

- **Kat:** Her 25 seviyede üretim ×2. Ayrıca madenci sayısı belirli seviyelerde artar (Bölüm 4.1).
- **Asansör ve Lojistik:** Her 25 seviyede akış ×3. Asansör hızı her 50 seviyede +%10.
- Dönüm noktasına ulaşıldığında: kısa bir parlama efekti, "×2!" yazısı, tatmin edici bir ses, birimin üzerinde rozet. Yükseltme panelinde "Sonraki dönüm noktası: 12 seviye kaldı" ilerleme çubuğu bulunur.

### 5.4 Referans Değerler

| Kat | B(n) ₵/sn | İlk yükseltme C0(n) | Açma maliyeti U(n) | Üretim (Sv. 25) | Üretim (Sv. 100) |
|---|---|---|---|---|---|
| 1 | 2 | 8 | — | 100 | 3.200 |
| 2 | 12 | 60 | 60 | 600 | 19.200 |
| 3 | 72 | 450 | 540 | 3.600 | 115.200 |
| 4 | 432 | 3.375 | 4.860 | 21.600 | 691.200 |
| 5 | 2.592 | 25.313 | 43.740 | 129.600 | 4,15 Mn |
| 6 | 15.552 | 189.844 | 393.660 | 777.600 | 24,9 Mn |
| 7 | 93.312 | 1,42 Mn | 3,54 Mn | 4,67 Mn | 149 Mn |
| 8 | 559.872 | 10,7 Mn | 31,9 Mn | 28,0 Mn | 896 Mn |
| 9 | 3,36 Mn | 80,1 Mn | 287 Mn | 168 Mn | 5,37 Mr |
| 10 | 20,2 Mn | 601 Mn | 2,58 Mr | 1,01 Mr | 32,2 Mr |

*(Mn = milyon, Mr = milyar.)*

### 5.5 Hedef İlerleme Eğrisi

Aşağıdaki süreler, yukarıdaki formüllerle yalnızca **verimlilik odaklı satın alma yapan, yönetici becerisi, takviye ve prestij kullanmayan sürekli aktif bir oyuncunun** basit simülasyonundan elde edilmiştir. Asansör nominal akışıyla modellenmiş, kaya engeli süreleri dahil edilmemiştir. Gerçek oyuncu yöneticiler ve takviyelerle daha hızlı, offline aralarla daha yavaş ilerler. Denge simülatörün (Faz 2) bu eğriyi yeniden üretmeli ve ayarlamaya yardım etmelidir.

| Hedef | Süre (aktif) | Bu andaki gelir |
|---|---|---|
| Kat 2 açılır | ~40 sn | 30 ₵/sn |
| Kat 5 açılır | ~3 dk | 8.330 ₵/sn |
| Kat 8 açılır | ~10 dk | 2,2 Mn ₵/sn |
| Kat 10 açılır | ~40 dk | 124 Mn ₵/sn |
| Kat 12 açılır | ~2,5 sa | 4,6 Mr ₵/sn |
| Kat 14 açılır | ~11 sa | 184 Mr ₵/sn |
| Kat 15 açılır | ~31 sa | 2 Tn ₵/sn |
| Kat 17 açılır | ~6,5 gün | 87 Tn ₵/sn |

**Tasarım niyeti:** Başlangıç çok hızlı ve ödüllendirici (ilk 10 dakikada 8 kat). Kat 12–14 civarında yavaşlama başlar; bu nokta **ilk prestij** için doğal duvardır. Prestij çarpanları sonraki turları belirgin şekilde hızlandırır.

### 5.6 Çarpan Yığını (Stacking) Kuralı

Bonuslar **kategori içinde toplanır, kategoriler arasında çarpılır.** Bu kural ekonominin kontrolden çıkmasını önler ve dengelemeyi öngörülebilir kılar.

```
Toplam Çarpan = (1 + Σ araştırma bonusları)
              × (1 + Σ fosil seti bonusları)
              × (1 + Σ başarım bonusları)
              × Derinleştirme rütbe çarpanı
              × Aktif yönetici becerisi çarpanı
              × Takviye çarpanı (Demlik vb.)
              × Etkinlik çarpanı
```

Her çarpan kaynağı arayüzde "Gelir ayrıntısı" panelinde tek tek listelenmelidir. Oyuncu gelirinin nereden geldiğini görebilmelidir.

### 5.7 Offline (Boşta) Gelir

- Yalnızca **yöneticisi olan birimler** offline çalışır. Zincirin bir halkasında yönetici yoksa o halkanın offline akışı 0 sayılır, dolayısıyla offline gelir 0 olur. Öğretici bunu açıkça öğretir.
- Offline gelir = min(otomatik kat üretimi, otomatik asansör akışı, otomatik lojistik akışı) × kalıcı çarpanlar × offline verimi × min(geçen süre, offline sınır).
- Başlangıç offline verimi: %50 (Jeoloji Ağacı ile %100'e çıkar). Başlangıç offline sınırı: 2 saat (Jeoloji Ağacı ile 12 saate çıkar).
- Aktif yönetici becerileri ve süreli takviyeler offline hesapta, offline süreyle kesiştikleri dakikalar kadar orantılı olarak sayılır.
- Dönüşte "Siz yokken…" penceresi: kazanılan nakit, geçen süre, sınıra ulaşıldıysa uyarı. Seçenekler: "Topla" ve "Reklam izle, ×2 topla" (isteğe bağlı).
- Hesap **analitik** yapılır (kare kare simülasyon değil). Oyun sekmesi 5 saniyeden uzun gizli kaldığında da aynı hesap kullanılır.
- Saat hilesi koruması: Cihaz saati son kayıttan geriye gittiyse offline gelir verilmez ve durum kayda işaretlenir. Sınır her koşulda uygulanır.

### 5.8 Büyük Sayılar ve Biçimlendirme

- Değerler 1e308'i aşabileceği için tüm para hesapları `break_infinity.js` (Decimal) ile yapılır. Seviyeler ve sayaçlar normal `number` kalabilir.
- Kısaltmalar: 1.000 → 1K, 1 Mn → 1M, 1 Mr → 1B, 1 Tn → 1T, sonrası aa, ab, ac … az, ba … zz.
- Ayarlardan **bilimsel gösterim** (1,23e45) seçilebilir.
- Her zaman 3 anlamlı basamak gösterilir (12,3K, 456M). Yerel ayara göre ondalık ayırıcı (TR: virgül, EN: nokta).
- Nakit sayacı değişirken sayılar yumuşak bir şekilde artarak (tweening) güncellenir.


## 6. Yöneticiler

Yöneticiler oyunun ikinci kalbidir: **otomasyon** sağlarlar, **aktif beceri** ile kısa süreli güçlü artışlar verirler ve **pasif özellik** ile kalıcı küçük bonus eklerler.

### 6.1 Temel Kurallar

- Her birime (her kat, asansör, lojistik, rafineri) en fazla **1 yönetici** atanır. Yönetici atanan birim otomatik çalışır.
- Yöneticiler madene özgüdür (her madenin kendi yönetici havuzu) ve prestijde **sıfırlanmaz**.
- Her yöneticinin bir **aktif becerisi** vardır: Düğmeye basılınca belirli bir süre etkili olur, sonra bekleme (cooldown) süresine girer. Beceri düğmesinin etrafındaki halka kalan süreyi gösterir.
- Birim türüne uygun olmayan yönetici atanamaz (kat yöneticisi asansöre atanamaz).

### 6.2 Nadirlik Seviyeleri

| Nadirlik | Beceri gücü | Süre | Bekleme | Pasif özellik | Çerçeve rengi |
|---|---|---|---|---|---|
| Sıradan | ×2 / −%20 | 3 dk | 30 dk | Yok | Gri `#9AA0A6` |
| Nadir | ×3 / −%35 | 5 dk | 30 dk | Birim verimi +%5 | Mavi `#3A86FF` |
| Epik | ×4 / −%50 | 8 dk | 25 dk | Birim verimi +%10 + küçük özel etki | Mor `#8338EC` |
| Efsanevi | ×5 / −%60 | 10 dk | 20 dk | Birim verimi +%15 + benzersiz özellik | Altın `#F4B400` |

### 6.3 Beceri Türleri

| Birim | Beceri | Etki |
|---|---|---|
| Kat | Kazı Hamlesi | Kat üretimi × beceri gücü |
| Kat | Usta Pazarlığı | O katın yükseltme maliyeti − indirim oranı |
| Kat | Derin Damar | O katın cevher değeri × (beceri gücü / 2 + 0,5) |
| Asansör | Turbo Halat | Asansör hızı × beceri gücü |
| Asansör | Geniş Kafes | Asansör kapasitesi × beceri gücü |
| Asansör | Hızlı Yükleme | Yükleme süresi ÷ beceri gücü |
| Lojistik | Ekspres Vagon | Taşıyıcı hızı × beceri gücü |
| Lojistik | Ağır Yük | Vagon kapasitesi × beceri gücü |
| Lojistik | Pazar Günü | Satış değeri × (beceri gücü / 2 + 0,5) |

### 6.4 İşe Alım

- **Nakitle işe alım:** Maliyet = o madende açılmış en derin katın açma maliyetinin %20'si × 1,5^(o madendeki nakitle alım sayısı). Yalnızca Sıradan, Nadir ve Epik çıkar.
- **Kristalle işe alım:** Tekli 100 kristal, 10'lu paket 900 kristal (10'lu pakette en az 1 Epik garantili). Efsanevi çıkabilir.
- **Olasılıklar (kristalle alım):** Sıradan %62 · Nadir %28 · Epik %8,5 · Efsanevi %1,5. Olasılıklar işe alım ekranında her zaman görünür.
- **Garanti sayacı (pity):** 40 kristal alımı boyunca Efsanevi çıkmazsa 40. alım Efsanevi olur. Sayaç ekranda gösterilir.
- **Tekrar gelen yönetici:** Kopya yönetici "Kimlik Kartı"na dönüşür. Kartlarla yönetici 1'den 5 yıldıza yükselir; her yıldız beceri süresini +%10 ve pasif bonusu +%2 artırır.
- Öğreticide ilk Sıradan kat yöneticisi ve ilk asansör yöneticisi **bedava** verilir.

### 6.5 Örnek İsimli Yöneticiler (Özgün)

| Yönetici | Birim | Nadirlik | Benzersiz özellik |
|---|---|---|---|
| Rıza Dede | Kat | Efsanevi | Becerisi aktifken fosil bulma şansı ×3 |
| Bora "Dinamit" Aksoy | Kat | Efsanevi | Becerisi bittiğinde 60 sn boyunca yarı gücüyle devam eder |
| Mira Kazar | Kat | Epik | Dönüm noktası seviyelerinde o katın üretimi ek +%20 |
| Hamdi Usta | Kat | Epik | Usta Pazarlığı kullanıldığında 1 seviye bedava verir |
| Leyla Vinç | Asansör | Efsanevi | Akıllı rota: Asansör boş kasaları atlar, en dolu kattan başlar |
| Oskar Halatçı | Asansör | Epik | Kapasite becerisi aktifken hız da +%25 |
| Yuki Tanaka | Asansör | Epik | Ay Ocağı bölgesinde pasif bonusu ×2 |
| Kerem Rayçı | Lojistik | Efsanevi | Her 10. vagon seferi çift değerle satılır |
| Nazlı Pazar | Lojistik | Epik | Pazar Günü becerisi rafineri çarpanını da etkiler |

Lansman hedefi: toplam 40 yönetici şablonu (12 Sıradan, 12 Nadir, 10 Epik, 6 Efsanevi). Tüm yöneticiler `src/data/managers.json` içinde tanımlanır.

### 6.6 Takım Sinerjileri

Aynı madende belirli yöneticiler birlikte görev yaparsa küçük set bonusu açılır. Örnek: **Halat Kardeşleri** (Leyla Vinç + Oskar Halatçı) → asansör kapasitesi +%10. **Eski Tüfekler** (Rıza Dede + Hamdi Usta) → tüm katların yükseltme maliyeti −%5. Sinerjiler yönetici ekranında soluk ikonlarla "keşfedilmeyi bekleyen" olarak ipucu verir.

## 7. Prestij: Derinleştirme

### 7.1 Mantık

Oyuncu bir madende ilerlemesi yavaşladığında **Derinleştirme** yapar: Madenin seviyeleri sıfırlanır, karşılığında kalıcı bir **rütbe çarpanı** ve **Jeoloji Puanı (JP)** kazanır. Her Derinleştirme o madenin rütbesini 1 artırır.

```
Derinleştirme eşiği (bu turdaki toplam kazanç)   E_esik(k) = 1e13 × 40^k        k = mevcut rütbe (0'dan başlar)
Rütbe çarpanı (o maden için)                    R(k)      = 2^k                (en fazla rütbe 10 → ×1024)
Kazanılan JP                                    JP        = floor( 4 × (E_tur / 1e12)^0.45 ) × bölge JP çarpanı
```

Örnek: İlk Derinleştirme yaklaşık Kat 12 civarında açılır (≈2,5 saat aktif oyun). Bu turda 1e13 ₵ kazanan oyuncu 11 JP alır; 2e15 ₵ kazanırsa 122 JP alır. Eşiği aşmak zorunludur; ama daha fazla kazanmak için beklemek oyuncuya kalmıştır. Ekranda "Şimdi Derinleştirirsen: +X JP, ×2 rütbe" önizlemesi ve "bir sonraki %10 JP için gereken kazanç" bilgisi gösterilir.

### 7.2 Ne Sıfırlanır, Ne Kalır?

| Sıfırlanır | Kalır |
|---|---|
| O madenin nakdi | Rütbe çarpanı |
| Tüm kat, asansör, lojistik, rafineri seviyeleri | Yöneticiler ve yıldızları |
| Açılmış katlar (Kat 1'e dönülür) | Jeoloji Puanı ve Jeoloji Ağacı |
| Kaya engelleri | Kristal, fosiller, başarımlar, kozmetikler |
| Aktif yönetici becerileri ve bekleme süreleri | Diğer madenlerin tüm ilerlemesi |

### 7.3 Bölge Ustalığı

Her madenin ulaştığı en yüksek rütbe, **tüm madenlerin** gelirine kalıcı +%10 ekler (Bölüm 5.6'daki "başarım bonusları" kategorisine değil, ayrı bir "ustalık" kategorisine toplanır). Böylece yeni bölgeye geçmek eski madenleri değersizleştirmez; tüm madenler birbirini besler.

### 7.4 Jeoloji Ağacı

JP ile açılan dört dallı kalıcı araştırma ağacı. Her düğümün birden fazla seviyesi olabilir. Düğüm maliyeti: `taban × 1,6^(mevcut seviye)` JP. Örnek düğümler:

| Dal | Düğüm | Etki (seviye başına) | En fazla seviye | Taban maliyet |
|---|---|---|---|---|
| Kazı | Sağlam Kazma | Tüm kat üretimi +%10 | 20 | 5 JP |
| Kazı | Dönüm Ustası | Kat dönüm noktası çarpanı ×2 → ×2,2 | 1 | 150 JP |
| Kazı | Hazır Başlangıç | Derinleştirme sonrası ilk 3 kat seviye 25'ten başlar | 1 | 80 JP |
| Kazı | Fosil Gözü | Fosil bulma şansı +%25 | 4 | 40 JP |
| Taşıma | Çelik Halat | Asansör kapasitesi +%10 | 20 | 5 JP |
| Taşıma | Rayları Yağla | Taşıyıcı hızı +%10 | 20 | 5 JP |
| Taşıma | Akıllı Rota | Asansör boş katlarda durmaz | 1 | 120 JP |
| Taşıma | Çift Vardiya | Asansör ve lojistik dönüm noktası ×3 → ×3,3 | 1 | 200 JP |
| Ticaret | Pazar Ağı | Satış değeri +%5 | 30 | 8 JP |
| Ticaret | Gece Vardiyası | Offline verimi +%10 (en fazla %100) | 5 | 20 JP |
| Ticaret | Uzun Mesai | Offline sınırı +2 saat (en fazla 12 saat) | 5 | 25 JP |
| Ticaret | Toptan Alım | Tüm yükseltme maliyetleri −%2 | 10 | 15 JP |
| Yönetim | Koçluk | Beceri süresi +%10 | 10 | 10 JP |
| Yönetim | Dinlenme Odası | Beceri bekleme süresi −%5 | 8 | 12 JP |
| Yönetim | İnsan Kaynakları | Nakitle işe alım maliyeti −%10 | 5 | 10 JP |
| Yönetim | Otomatik Beceri | Hazır olan beceriler kendiliğinden kullanılır | 1 | 300 JP |

Ağaç arayüzü: Kaydırılabilir, yakınlaştırılabilir düğüm haritası. Düğümler arasında bağlantı çizgileri. Açılabilir düğümler parlar, kilitli düğümler soluk ve önkoşulunu gösterir. "Sıfırla" seçeneği (kristalle, JP tam iade) oyuncuya deneme özgürlüğü verir.

## 8. Bölgeler ve Madenler

Harita ekranı, bölgeleri yolculuk hissi veren bir rota üzerinde gösterir. Her bölgede birden fazla maden bulunur. Bir madende **Kat 15'e ulaşmak veya 1. rütbeyi almak** sonraki madeni açar; bir bölgenin son madeninde 1. rütbe sonraki bölgeyi açar.

| # | Bölge | Görsel tema | Cevherler | Özel mekanik | Maden | JP çarpanı |
|---|---|---|---|---|---|---|
| 1 | **Yeşil Yamaç** | Karadeniz esintili sisli dağ, tepede çay terasları, ahşap destekler | Kömür, Bakır, Demir | Yok (öğretici bölge) | 3 | ×1 |
| 2 | **Peribacası Vadisi** | Kapadokya esintili tüf kayalar, sıcak balon silüetleri | Gümüş, Opal, Tüf kristali | **Yumuşak Kaya:** Katlar +%25 hızlı kazılır, ama dar tüneller asansör kapasitesini −%20 düşürür | 3 | ×1,5 |
| 3 | **Kızıl Kanyon** | Çöl kanyonu, kızıl katmanlar, kaktüsler | Altın, Topaz | **Gün Döngüsü:** 10 dk'lık oyun içi döngü; gündüz taşıyıcılar −%25 yavaş, gece +%25 hızlı | 3 | ×2,25 |
| 4 | **Buzul Kırığı** | Kutup buzulu, mavi buz damarları, kuzey ışıkları | Platin, Buz safiri | **Donma:** Kasası 60 sn'den uzun boşaltılmayan kat donar ve −%30 üretir; asansör yatırımını ödüllendirir | 3 | ×3,4 |
| 5 | **Lav Çekirdeği** | Volkan içi, akan lav, obsidyen duvarlar | Obsidyen, Yakut, Ateş taşı | **Isı Basıncı:** Aktif beceriler ısı barını doldurur; bar dolarsa 30 sn soğuma molası. Soğutma pompası yükseltmesi eklenir | 3 | ×5 |
| 6 | **Ay Ocağı** | Ay yüzeyi, kraterler, Dünya manzarası | Helyum-3, Ay elması | **Düşük Yerçekimi:** Asansör ×2 hızlı, kapasite −%40 | 2 | ×7,5 |

- Her madenin nakdi ayrıdır. Madenler arası geçiş, harita ekranından veya üst bardaki maden adına dokunarak yapılır.
- Her madenin kendi ölçek sabiti (`mineScale`) vardır; formüllerdeki taban üretim ve maliyetler bu sabitle çarpılır. Sonraki madenler daha büyük sayılarla oynanır ve ilerleme hissi verir.
- Bölge özel mekanikleri `regions.json` içinde parametreli "kural modülleri" olarak tanımlanır; kod tarafında her biri ayrı bir sistem dosyasıdır ve aç/kapa yapılabilir.
- Her bölgenin kendi müzik teması, renk paleti, cevher görselleri ve fosil setleri vardır.

## 9. Meta Sistemler

### 9.1 Fosil Müzesi

- Kazı döngüsü tamamlandığında küçük bir olasılıkla **fosil parçası** düşer. Olasılık: `p = 0,0005 × (1 + n/10)` (n = kat numarası; derin katlar daha şanslı). Aynı kattan 10 dakikada en fazla 1 parça düşer.
- Offline sürede beklenen düşüş sayısı analitik hesaplanır, oturum başına en fazla 3 parça verilir.
- Her bölgede 3 set × 5 parça = 15 parça; toplam 90 parça. Örnek setler: "Karadeniz Ammonitleri", "Kapadokya Kehribarı", "Buzul Mamutu", "Lav Kristalleri", "Ay Göktaşları".
- Set tamamlama ödülleri kalıcıdır: Tüm gelir +%5, offline verimi +%5, beceri süresi +%5 gibi.
- Kopya parçalar **Fosil Tozu**'na dönüşür; 100 tozla istenen eksik parça üretilir (oyuncu kötü şansa mahkûm kalmaz).
- Yüzeyde, set tamamlandıkça büyüyen ve süslenen bir müze binası görünür.

### 9.2 Günlük Sözleşmeler

- Her gün 3 sözleşme: Kolay, Orta, Zor. Örnekler: "Kat 5'i seviye 100'e çıkar", "Asansör becerisini 3 kez kullan", "Bu madende 1 Mr ₵ kazan".
- Ödüller: Kristal, Demlik takviyesi, fosil tozu. Günde 1 bedava yenileme hakkı.
- Haftalık sandık: 15 sözleşme tamamlanınca açılır.
- Sözleşmeler oyuncunun mevcut ilerlemesine göre ölçeklenir; asla imkânsız hedef verilmez.

### 9.3 Başarımlar

Kademeli başarımlar (Bronz/Gümüş/Altın): "100 kat açtın", "10 Derinleştirme", "Tüm Yeşil Yamaç fosilleri" vb. Her kademe kristal ve küçük kalıcı gelir bonusu verir.

### 9.4 Demlik Takviyesi (Gelir Artışı)

- **Taze Demlik:** İsteğe bağlı ödüllü reklam izleyerek 30 dk boyunca tüm gelir ×2. Süre birikebilir, en fazla 4 saat. Takviye offline gelire de uygulanır.
- **Altın Demlik:** Kristalle 1 saat ×3.
- İlk Taze Demlik öğreticide bedava ve reklamsız verilir.
- Ekranın sağında, kalan süreyi gösteren buharı tüten bir çaydanlık ikonu bulunur.

### 9.5 Günlük Giriş Ödülü

7 günlük döngü. Bir gün kaçırılırsa seri **sıfırlanmaz**, kaldığı yerden devam eder. Oyuncuyu cezalandırmayan, ödüllendiren tasarım.

### 9.6 Etkinlik Madenleri (Faz 3)

- 5–7 gün süren, 10 katlık özel madenler; kendi nakdi ve etkinliğe özel yöneticileri vardır.
- Etkinlik ilerleme ödülleri: kristal, kozmetik, fosil tozu, etkinlik yöneticisi.
- İlk sürümde sıralama, Granitaş temalı **simüle rakiplere** karşıdır (sunucu gerektirmez). Gerçek çevrimiçi sıralama sonraki aşamadır.
- Etkinlikler tamamen yapılandırma dosyasından tanımlanır; yeni etkinlik eklemek kod değişikliği gerektirmemelidir.

### 9.7 Sezon Kartı (Faz 3)

30 günlük ilerleme şeridi; ücretsiz ve premium iki hat. Ödüller ağırlıklı olarak kozmetik, kristal ve takviyedir. Premium hat oyunun ilerlemesini kilitleyen bir güç vermez.

## 10. Arayüz ve Kullanıcı Deneyimi (UI/UX)

### 10.1 Ana Ekran Düzeni (Dikey)

```
+----------------------------------------------------+
| [Maden v]  ₵ 12,4M  +1,2M/sn  Kristal 340  [Ayar]  |
| [Katlar 1,4M] > [Asansör 1,2M (!)] > [Lojistik 2M] |
+----------------------------------------------------+
| YÜZEY: gökyüzü, kuyu kulesi, ambar, rafineri       |
| Defne + Kösti                         [Demlik]     |
| |#| Kat 1 [Yönetici] Sv.42 [^ 1,2K]  [Sözleşme]    |
| | | Kat 2 [Yönetici] Sv.30 [^ 9,8K]  [Etkinlik]    |
| | | Kat 3 [ + ]      Sv.12 [^ 45K]                 |
| | |  ...  (dikey kaydırma)                         |
| | | [ Yeni Kat Aç - 2,58B ]                        |
+----------------------------------------------------+
| Maden | Yöneticiler | Ağaç | Harita | Mağaza       |
+----------------------------------------------------+
```

Üstten alta: sabit üst bar, darboğaz zinciri, yüzey sahnesi, kaydırılabilir kat listesi, alt menü. Sağ kenarda yüzen düğmeler (Demlik, Sözleşme, Etkinlik).

- **Kat satırı anatomisi:** Solda yönetici yuvası (portre + beceri düğmesi + bekleme halkası; boşsa "+" ile işe alım), kat numarası ve cevher ikonu, seviye rozeti, yükselt düğmesi (maliyet yazılı; alınabiliyorsa parlak ve hafif nabız animasyonlu, alınamıyorsa soluk), kasa ve içindeki miktar, madenciler.
- **Darboğaz zinciri:** Üç halkanın akışı her an görünür. En yavaş halka kehribar renkli çerçeve, "Darboğaz" etiketi ve uyarı ikonuyla işaretlenir (yalnızca renge güvenilmez). Dokunulunca ilgili birime kaydırır ve yükseltme panelini açar.
- **Kaydırma:** Ataletli dikey kaydırma, en üste çift dokunuş, "darboğaza git" otomatik kaydırması. Görünmeyen katlar çizilmez (culling).

### 10.2 Yükseltme Paneli

- Alttan açılan panel (bottom sheet). Mevcut → sonraki istatistikler, artışlar yeşil yazılır ("Üretim: 1,2K → 1,5K/sn (+25%)").
- Satın alma modu düğmesi: ×1 / ×10 / ×50 / MAKS / Sonraki dönüm noktası.
- Dönüm noktası ilerleme çubuğu.
- **Basılı tutarak alım:** Düğme basılı tutulursa alım hızlanarak tekrarlanır (ilk 0,4 sn bekleme, sonra saniyede 5'ten 20'ye çıkan hız).

### 10.3 Diğer Ekranlar

Yöneticiler (filtre: birim türü, nadirlik; atama sürükle-bırak veya dokun-seç), İşe Alım (olasılık tablosu görünür), Jeoloji Ağacı, Harita, Fosil Müzesi, Sözleşmeler, Başarımlar, Mağaza, Gelir Ayrıntısı (tüm çarpanların listesi), Derinleştirme ekranı (önizleme ile), "Siz yokken…" penceresi, Ayarlar (ses, müzik, titreşim, sayı formatı, dil, erişilebilirlik, kayıt dışa/içe aktar, kayıt sıfırla).

### 10.4 Geri Bildirim ve "Juice"

- Satışta ambardan yükselen "+12,3K" yüzen sayılar ve küçük madeni para parçacık patlaması.
- Dönüm noktalarında parlama, "×2!" rozeti, kısa kamera sarsıntısı (hareketi azalt modunda kapalı).
- Düğmeye basışta %95 ölçek küçülme ve geri yaylanma; her alımda tatmin edici, perdesi hafifçe değişen "çın" sesi (art arda alımlarda perde yükselir).
- Kaya engeli patladığında toz bulutu ve taş parçacıkları.
- Mobilde isteğe bağlı titreşim (Vibration API destekleniyorsa).
- Tüm animasyonlar kolay ayarlanabilir sabitlerle (`src/data/feel.json`) yönetilir.

### 10.5 Duyarlı Tasarım ve Erişilebilirlik

- Temel tasarım genişliği 390 px (360–430 arası test edilir). Tablet ve masaüstünde yatay düzen: maden görünümü solda %60, panel sağda sabit %40.
- Çentik ve güvenli alanlar için `env(safe-area-inset-*)` kullanılır.
- Dokunma hedefleri en az 44×44 px; en küçük yazı boyutu 14 px.
- Ayarlar: renk körü dostu mod (darboğaz ve nadirlik ikonlarla da ayrışır), metin boyutu %100/%125/%150, hareketi azalt, titreşim kapalı.
- Arayüz DOM tabanlı olduğu için düğmeler klavye ve ekran okuyucu ile erişilebilir olmalı (`aria-label`).

## 11. Sanat Yönü

### 11.1 Stil

**"Sıcak el boyaması kesit dioraması."** Yandan, ortografik kesit görünüm. Yuvarlak, tombul ve okunaklı silüetler. Hafif kâğıt dokusu, yumuşak gölgeler, sol üstten gelen tutarlı ışık. Konturlar siyah değil, koyu kahve (`#3B2A20`), 2–3 px. Fotogerçekçilik yok; sıcak ve iyimser bir masal havası.

**Arayüz dili:** Kâğıt dokulu krem paneller, pirinç kenarlıklar, turkuaz vurgular, yuvarlatılmış köşeler. Rozet ve damga motifleri (eski maden ruhsatı ve harita estetiği).

### 11.2 Renk Paleti

| Rol | Renk | Hex |
|---|---|---|
| Ana koyu (metin, kontur) | Kömür kahvesi | `#3B2A20` |
| Panel zemini | Krem kâğıt | `#F6EBD9` |
| Vurgu 1 (birincil düğme) | Turkuaz | `#2A9D8F` |
| Vurgu 2 (para, ödül) | Fener altını | `#E9B949` |
| Uyarı / darboğaz | Kehribar | `#F4A261` |
| Tehlike / iptal | Pas kırmızısı | `#C8553D` |
| Derin kaya (zemin) | Arduvaz | `#4A4E69` |
| Gökyüzü (Bölge 1) | Sisli mavi | `#A8C5D6` |

Her bölge kendi alt paletini tanımlar; derinlik arttıkça kaya rengine bölgenin koyu tonu doğru bir gradyan uygulanır (`regions.json` içinde `depthGradient`).

### 11.3 Animasyon Listesi

| Varlık | Animasyonlar | Kare sayısı (öneri) |
|---|---|---|
| Kat madencisi | Bekleme, yürüme, kazma, taşıma, boşaltma | 8 / 8 / 6 / 8 / 6 |
| Asansör | İniş-çıkış (kod ile), kafes sallanması, makara dönüşü | Kodla + 4 |
| Taşıyıcı | Vagon itme, boşaltma, geri dönüş | 8 / 6 / 8 |
| Kösti | Bekleme, sevinç, işaret etme, düşünme | 8 / 10 / 6 / 8 |
| Efektler | Parıltı, toz, para patlaması, dönüm noktası ışıması, kaya patlaması | Parçacık sistemi |

### 11.4 Varlık Listesi ve Boyutları (@2x)

| Varlık | Boyut | Not |
|---|---|---|
| Karakter karesi (sprite) | 128×128 | Atlas içinde, şeffaf arka plan |
| Kat arka planı | 1080×300 | Bölge başına 3 varyasyon, yatay döşenebilir |
| Yüzey sahnesi | 1080×900 | Bölge başına 1, katmanlı (paralaks için 3 katman) |
| Kuyu kulesi ve asansör kafesi | 300×600 / 160×200 | Ayrı parçalar |
| Yönetici portresi | 256×256 | Nadirlik çerçevesi kodla eklenir |
| Arayüz ikonları | 128×128 | Tek atlas, tutarlı çizgi kalınlığı |
| Uygulama ikonu | 1024×1024 | Kenar boşluklu, yuvarlatma platformda |
| Anahtar görsel | 2732×2048 ve 1920×1080 | Mağaza ve yükleme ekranı |

**Teknik yaklaşım:**
- Oyun, hiç sanat dosyası olmadan **otomatik yer tutucu** grafiklerle (renkli şekiller + etiket) çalışmalıdır. `assets/manifest.json` dosyası anahtar → dosya eşlemesi tutar; dosya yoksa yer tutucu çizilir.
- Kareler `free-tex-packer` veya benzeri bir araçla atlasa paketlenir.
- İleride iskelet animasyonu (Spine veya DragonBones) eklenebilecek şekilde karakter görünümü bir arayüzün (`CharacterView`) arkasına soyutlanır.

## 12. Ses ve Müzik

- **Müzik:** Her bölgeye 1 ana tema (2–3 dk, kesintisiz döngü) + etkinlik teması + menü teması. Bölge değişiminde 1,5 sn çapraz geçiş.
- **Ses efektleri:** Kazma vuruşu (3 varyasyon), cevher dökülmesi, asansör halatı ve zil, vagon tekerleği, satış "çın"ı (perdesi artan seri), yükseltme, dönüm noktası fanfarı, kaya patlaması, beceri aktifleşmesi, beceri hazır bildirimi, yönetici işe alım (nadirliğe göre 4 farklı açılış), fosil bulma, başarım, düğme tıkı, panel aç/kapa, Kösti'nin sevimli sesleri.
- **Karışım:** Müzik %60, efektler %100, arayüz %70 temel seviye; ayarlardan ayrı ayrı. Aynı efektin aynı anda en fazla 4 örneği çalar (ses yığılmasını önler). Reklam sırasında oyun sesi tamamen kısılır.
- **Format:** Howler.js; `webm/ogg` + Safari için `m4a` yedeği. Ses ilk kullanıcı dokunuşundan sonra başlatılır (tarayıcı otomatik oynatma kuralları).


## 13. Teknik Mimari

### 13.1 Teknoloji Seçimleri

| Katman | Seçim | Gerekçe |
|---|---|---|
| Dil | TypeScript (strict) | Tip güvenliği, büyük kod tabanında sürdürülebilirlik |
| Derleme | Vite | Hızlı geliştirme sunucusu, kolay PWA eklentisi |
| Oyun dünyası çizimi | PixiJS v8 (güncel kararlı sürüm) | WebGL/WebGPU tabanlı yüksek performanslı 2D |
| Arayüz katmanı | Preact + @preact/signals (DOM, Pixi tuvalinin üstünde) | Keskin metin, erişilebilirlik, hafiflik |
| Büyük sayılar | break_infinity.js | 1e308 üstü değerler, idle oyunlar için hızlı |
| Ses | Howler.js | Tarayıcılar arası tutarlı ses, ses gruplama |
| Kayıt sıkıştırma | lz-string | Küçük ve hızlı sıkıştırma |
| Test | Vitest + Playwright | Birim testleri + uçtan uca duman testi |
| PWA | vite-plugin-pwa | Yüklenebilir uygulama, çevrimdışı oynanış |
| Mobil paketleme (Faz 5) | Capacitor | Aynı kod tabanıyla iOS ve Android |
| Kod kalitesi | ESLint + Prettier | Tutarlı kod stili |

### 13.2 Klasör Yapısı

```
cevher/
├─ index.html
├─ vite.config.ts
├─ package.json
├─ docs/GDD.md                      ← bu belge
├─ public/assets/                   ← atlaslar, sesler, fontlar, manifest.json
├─ src/
│  ├─ main.ts                       ← giriş noktası
│  ├─ core/        GameLoop.ts, EventBus.ts, BigNum.ts, Rng.ts, Clock.ts
│  ├─ data/        economy.json, mines.json, regions.json, managers.json,
│  │               research.json, fossils.json, contracts.json, events.json,
│  │               feel.json, i18n/tr.json, i18n/en.json
│  ├─ state/       GameState.ts, actions.ts, selectors.ts
│  │  └─ save/     SaveManager.ts, migrations.ts, checksum.ts
│  ├─ sim/         Economy.ts, ShaftSystem.ts, ElevatorSystem.ts,
│  │               LogisticsSystem.ts, RefinerySystem.ts, ManagerSystem.ts,
│  │               BoostSystem.ts, OfflineCalculator.ts, regionRules/
│  ├─ meta/        Prestige.ts, Research.ts, Fossils.ts, Contracts.ts,
│  │               Achievements.ts, Events.ts, DailyLogin.ts
│  ├─ render/      MineScene.ts, SurfaceView.ts, ShaftView.ts,
│  │               ElevatorView.ts, LogisticsView.ts, CharacterView.ts,
│  │               fx/, camera/, placeholders/
│  ├─ ui/          App.tsx, hud/, panels/, modals/, screens/, components/
│  ├─ audio/       AudioManager.ts
│  ├─ platform/    ads.ts, iap.ts, analytics.ts, storage.ts, haptics.ts
│  ├─ i18n/        t.ts, formatNumber.ts
│  └─ debug/       DebugPanel.tsx
├─ tools/          balance-sim.ts
└─ tests/          economy.test.ts, offline.test.ts, prestige.test.ts,
                   save.test.ts, format.test.ts, e2e/smoke.spec.ts
```

### 13.3 Mimari İlkeler

- **Simülasyon ile çizim tamamen ayrıdır.** `sim/`, `meta/` ve `state/` klasörleri PixiJS veya DOM'a hiçbir şekilde bağımlı olmamalıdır. Bu sayede aynı kod hem oyunda, hem testlerde, hem de denge simülatöründe (Node.js) çalışır.
- **Sabit adımlı oyun döngüsü:** Simülasyon 20 Hz'de (50 ms) sabit adımla ilerler; çizim ekran yenileme hızında, iki simülasyon adımı arasında enterpolasyonla yapılır. Kare başına en fazla 10 simülasyon adımı işlenir (aşırı yük koruması).
- **Sekme gizlenince:** Çizim durur. Sekme 5 sn'den uzun gizli kaldıysa dönüşte aradaki süre `OfflineCalculator` ile analitik olarak hesaplanır (yalnızca otomatik birimler, Bölüm 5.7).
- **Tick sırası:** Takviyeler → Yönetici beceri zamanlayıcıları → Bölge kuralları → Katlar → Asansör → Lojistik → Rafineri → Satış → Sözleşme/başarım kontrolleri (saniyede 1 kez, kısıtlanmış).
- **Olay veri yolu (EventBus):** Simülasyon, efekt ve ses için olay yayar (`saleCompleted`, `milestoneReached`, `shaftUnlocked`, `fossilFound` …). Çizim ve ses katmanları bu olayları dinler; simülasyon onları bilmez.
- **Arayüz güncellemesi:** Sayı göstergeleri saniyede en fazla 10 kez güncellenir (sinyaller + kısıtlama). Sayıların kendisi araya geçişli (tween) animasyonla akar.
- **Durum değişiklikleri** yalnızca `state/actions.ts` içindeki saf fonksiyonlarla yapılır (ör. `buyShaftLevels(state, mineId, shaftIndex, count)`). Bu, test edilebilirliği ve ileride geri alma/kayıt tekrarını kolaylaştırır.

### 13.4 Durum Modeli (Örnek)

```ts
interface GameState {
  version: number;                        // kayıt şeması sürümü
  createdAt: number;
  lastSavedAt: number;                    // epoch ms
  activeMineId: string;
  crystals: number;
  geologyPoints: number;
  research: Record<string, number>;       // nodeId -> seviye
  fossils: Record<string, number>;        // partId -> adet
  fossilDust: number;
  achievements: Record<string, number>;   // achievementId -> kademe
  boosts: ActiveBoost[];
  contracts: ContractState;
  mines: Record<string, MineState>;
  settings: Settings;
  stats: LifetimeStats;
  flags: Record<string, boolean>;         // tutorial adımları, saat uyarısı vb.
}

interface MineState {
  id: string;
  cash: string;                           // Decimal, string olarak serileştirilir
  earnedThisRun: string;
  rank: number;                           // Derinleştirme rütbesi
  shafts: { level: number; stored: string; managerId?: string }[];
  elevator: UnitState;
  logistics: UnitState;
  refinery?: UnitState;
  surfaceStock: string;                   // kuyu ağzı deposu
  barrier?: { afterShaft: number; endsAt: number };
  ownedManagers: { templateId: string; stars: number; skillReadyAt: number; activeUntil: number }[];
}
```

### 13.5 Yapılandırma Örneği

```json
{
  "shaft":     { "baseProd": 2, "prodGrowth": 6, "baseCost": 8, "costGrowthPerShaft": 7.5,
                 "costGrowthPerLevel": 1.12, "unlockBase": 60, "unlockGrowth": 9,
                 "milestoneEvery": 25, "milestoneMult": 2, "maxLevel": 400 },
  "elevator":  { "baseFlow": 6, "baseCost": 25, "costGrowthPerLevel": 1.07,
                 "milestoneEvery": 25, "milestoneMult": 3, "speedBonusEvery": 50,
                 "speedBonus": 0.10, "tripBaseSec": 4, "tripPerShaftSec": 0.6, "maxLevel": 2000 },
  "logistics": { "baseFlow": 6, "baseCost": 25, "costGrowthPerLevel": 1.07,
                 "milestoneEvery": 25, "milestoneMult": 3, "maxLevel": 2000 },
  "offline":   { "baseEfficiency": 0.5, "baseCapHours": 2 },
  "prestige":  { "thresholdBase": 1e13, "thresholdGrowth": 40, "rankMult": 2,
                 "maxRank": 10, "jpCoef": 4, "jpDivisor": 1e12, "jpExponent": 0.45 }
}
```

### 13.6 Kayıt Sistemi

- **Otomatik kayıt:** 30 sn'de bir, sekme gizlendiğinde (`visibilitychange`), sayfa kapanırken (`pagehide`) ve önemli işlemlerden 2 sn sonra (debounce).
- **Format:** `{ v: sürüm, t: zaman, d: sıkıştırılmış veri, c: sağlama toplamı }`. Sağlama toplamı (FNV-1a) bozulmayı tespit etmek içindir, hile önleme amacı taşımaz.
- **Yedekler:** Ana kayıt + 2 dönüşümlü yedek. Ana kayıt bozuksa en yeni sağlam yedek yüklenir ve oyuncuya bilgi verilir.
- **Göçler (migration):** `migrations.ts` içinde sürüm sürüm (`v1→v2`, `v2→v3`) çalışan saf fonksiyonlar. Her göç testle korunur. Eski bir kaydı açmak asla oyunu çökertmemelidir.
- **Dışa/içe aktarma:** Ayarlardan kayıt metni kopyalanabilir ve geri yüklenebilir (cihaz değiştirme ve hata ayıklama için).
- **Depolama:** `localStorage` birincil; `platform/storage.ts` soyutlamasıyla ileride Capacitor Preferences veya bulut kayda geçilebilir.

### 13.7 Platform Soyutlamaları

Gerçek SDK'lar Faz 5'te eklenecek. Şimdiden arayüzleri tanımla ve geliştirme için sahte (mock) uygulamalar yaz:

```ts
interface AdsProvider       { isRewardedReady(placement: AdPlacement): boolean;
                              showRewarded(placement: AdPlacement): Promise<'completed' | 'skipped' | 'failed'>; }
interface IapProvider       { getProducts(): Promise<Product[]>; purchase(id: string): Promise<PurchaseResult>;
                              restore(): Promise<PurchaseResult[]>; }
interface AnalyticsProvider { track(event: string, params?: Record<string, string | number | boolean>): void; }
```

Mock reklam sağlayıcısı 2 sn'lik sahte bir "reklam" katmanı gösterip `completed` döndürmelidir.

### 13.8 Performans Bütçesi

- Orta segment bir Android telefonda (yaklaşık 4 yıllık) **60 fps**; düşük güç modunda sabit 30 fps.
- Kare başına en fazla ~150 çizim çağrısı (draw call); tüm karakter ve ikonlar atlaslardan.
- İlk etkileşime kadar indirilen veri < 3 MB; diğer bölgelerin varlıkları ihtiyaç anında yüklenir.
- Parçacıklar ve yüzen sayılar nesne havuzundan (object pooling) gelir; aynı anda en fazla 20 yüzen sayı.
- Ekran dışındaki katlar çizilmez ve animasyonları güncellenmez.
- Bellek: JS yığını 150 MB'ın altında kalmalı; 30 dk oynanışta bellek sızıntısı olmamalı.

### 13.9 Hata Ayıklama Paneli

Yalnızca geliştirme modunda veya URL'de `?debug=1` varken açılır: zaman hızı (×1, ×10, ×100, ×1000), nakit/kristal/JP ekleme, tüm katları açma, X saat offline simülasyonu, kaydı sıfırlama, fps ve çizim çağrısı sayacı, darboğaz değerlerini ham olarak gösterme, öğreticiyi atlama/yeniden başlatma.

### 13.10 Denge Simülatörü

`tools/balance-sim.ts`, oyunun simülasyon kodunu Node.js'te başsız (headless) çalıştırır. Bot stratejileri:
- **Açgözlü (greedy):** Her an en yüksek "gelir artışı / maliyet" oranlı alımı yapar.
- **Dengeli:** Darboğazı her zaman önce çözer.
- **Gündelik oyuncu:** Günde 4 oturum (10 dk aktif), arada offline gelir.

Çıktı: `npm run sim -- --strategy=greedy --days=7` komutuyla CSV (zaman, nakit, gelir, açık kat, darboğaz payı, prestij anları) ve Bölüm 5.5 formatında özet tablo. Ekonomi değişikliklerinin tamamı bu simülatörle doğrulanır.

### 13.11 Test Stratejisi

- **Birim testleri:** Ekonomi formülleri (Bölüm 5.4 değerleriyle), toplu alım formülü (döngüyle toplama karşı), offline hesap (sınır, verim, yöneticisiz halka), prestij eşiği ve JP, çarpan yığını, sayı biçimlendirme (K, M, B, T, aa… ve TR/EN ayırıcılar), kayıt gidiş-dönüş ve göçler.
- **Uçtan uca duman testi (Playwright):** Oyun açılır → Kat 1'e dokunulur → ilk satış gerçekleşir → ilk yükseltme alınır → sayfa yenilenir → ilerleme korunur.

## 14. Para Kazanma (Etik Model)

**İlkeler:** Oyuncuya saygı. Zorunlu reklam yok; geçiş reklamı (interstitial) yok; enerji/can sistemi yok; ödeme yapmayan oyuncu tüm içeriği oynayabilir; şansa dayalı her alımda olasılıklar görünür; sahte indirim veya sahte geri sayım yok.

**Ödüllü reklam yerleşimleri (tamamı isteğe bağlı, günlük sınırlı):**

| Yerleşim | Ödül | Günlük sınır |
|---|---|---|
| Taze Demlik | 30 dk ×2 gelir (en fazla 4 sa birikim) | 8 |
| Offline gelir ×2 | Dönüşteki offline gelir ikiye katlanır | 4 |
| Kaya engeli hızlandırma | Kalan süre −%50 | 3 |
| Bedava kristal | 5 kristal | 5 |
| Sözleşme yenileme | Ek 1 yenileme | 2 |

**Uygulama içi satın alımlar:** Başlangıç Paketi (tek seferlik, düşük fiyat, kristal + Epik yönetici + Altın Demlik), kristal paketleri (5 kademe), Reklamsız Paket (ödüllü reklam ödüllerini reklam izlemeden verir), Kalıcı ×2 Gelir (tek seferlik), Sezon Kartı Premium, kozmetik paketler (asansör kafesi temaları, madenci kıyafetleri, yüzey dekorasyonları).

**Uyumluluk:** Kişisel veriler ve kişiselleştirilmiş reklam için KVKK/GDPR uyumlu izin ekranı; App Store ve Google Play'in rastgele ödül olasılıklarını açıklama kurallarına uyum; bölgesel fiyatlandırma; satın alma öncesi net fiyat ve içerik gösterimi.

## 15. İlk 10 Dakika (Öğretici / FTUE)

| Zaman | Adım | Oyuncunun öğrendiği |
|---|---|---|
| 0:00 | 3 karelik açılış (atlanabilir): Defne, dedesinin mektubunu okur ve madene gelir | Hikâye, motivasyon |
| 0:20 | Kösti, Kat 1'e dokunmayı gösterir; madenciler kazar | Kazı |
| 0:35 | Asansöre dokun; cevher yukarı çıkar | Asansör |
| 0:50 | Taşıyıcıya dokun; ilk satış, nakit sayacı canlanır | Satış ve nakit |
| 1:00 | İlk yükseltme (Kat 1) | Yükseltme |
| 1:30 | Kat 2 açılır | Derinleşme |
| 2:00 | İlk bedava kat yöneticisi; Kat 1 otomatikleşir | Otomasyon |
| 2:30 | Asansör yetişemez; darboğaz zinciri yanıp söner | Darboğaz kavramı |
| 3:00 | Bedava asansör yöneticisi + becerisini kullanma | Aktif beceriler |
| 4:00 | Bedava Taze Demlik (reklamsız) | Takviyeler |
| 5:00 | Kat 5 kaya engeli (1 dk, bedava) | Engeller ve bekleme |
| 7:00 | Lojistik yöneticisi işe alımı (nakitle) | İşe alım |
| 8:00 | Günlük sözleşmeler açılır | Günlük hedefler |
| 10:00 | Kösti: "Oyunu kapatsan da yöneticilerin çalışır!" | Offline gelir |

**Kurallar:** Ekranda aynı anda tek talimat; ilk 10 dakikada hiçbir reklam önerisi yok; her adım atlanabilir; geri dönen oyuncuya öğretici tekrar gösterilmez; öğretici adımları analitik olayı olarak kaydedilir.

## 16. Analitik ve Hedef Metrikler

**Takip edilecek olaylar:** `tutorial_step`, `shaft_unlocked`, `barrier_started`, `barrier_finished`, `manager_hired`, `skill_used`, `prestige`, `research_bought`, `boost_started`, `ad_offer_shown`, `ad_completed`, `iap_viewed`, `iap_purchased`, `session_start`, `session_end`, `offline_collected`, `contract_completed`, `fossil_found`, `region_unlocked`.

**Hedef metrikler (türde iyi kabul edilen yaklaşık değerler):** 1. gün geri dönüş ≥ %40, 7. gün ≥ %15, 30. gün ≥ %5; öğretici tamamlama ≥ %85; ortalama oturum 5–10 dk; günde 4+ oturum; ilk 3 günde ilk prestijini yapan oyuncu oranı ≥ %30.

## 17. Geliştirme Fazları ve Kabul Kriterleri

### Faz 0 — Gri Kutu Prototip

**Teslimatlar:** Proje iskeleti (Vite + TypeScript + PixiJS + Preact); sabit adımlı oyun döngüsü; 1 maden, 10 kat (Kat 5 engeli basit sürümüyle); asansör ve lojistiğin basit şekillerle hareketli gösterimi; dokunarak elle çalıştırma; yükseltme ve toplu alım; darboğaz zinciri; Decimal entegrasyonu ve sayı biçimlendirme; `economy.json`; hata ayıklama paneli (zaman hızlandırma); birim testleri.

**Kabul kriterleri:**
- [ ] `npm install && npm run dev` hatasız çalışır, `npm test` yeşildir.
- [ ] Bölüm 5.4 tablosundaki değerler testlerle doğrulanır.
- [ ] Toplu alım formülü, tek tek alımların döngüyle toplamıyla eşleşir.
- [ ] Zaman ×100'de açgözlü oynanışla Kat 8'e Bölüm 5.5'teki süre ±%30 içinde ulaşılır.
- [ ] Darboğaz zinciri doğru halkayı gösterir.
- [ ] Masaüstü tarayıcıda 60 fps.

### Faz 1 — Dikey Dilim (Oynanabilir İlk 30 Dakika)

**Teslimatlar:** Yöneticiler (atama, otomasyon, aktif beceriler, nakitle işe alım); kayıt sistemi (otomatik kayıt, sürüm, göç, yedek, dışa/içe aktarma); offline gelir ve "Siz yokken…" penceresi; 30 kat ve tüm kaya engelleri; tam yükseltme paneli; alt menü ve ekran iskeletleri; yer tutucu sanat sistemi ve manifest; ses yöneticisi; öğretici (Bölüm 15); PWA; mobil dokunmatik ve güvenli alan desteği.

**Kabul kriterleri:**
- [ ] Sayfa yenilendiğinde ilerleme kaybolmaz; bozuk kayıtta yedek yüklenir.
- [ ] 2 saatlik offline simülasyonunda kazanç formülle ±%1 tutar.
- [ ] Yöneticisi olmayan bir halka offline geliri 0 yapar ve oyuncuya bu açıklanır.
- [ ] Öğretici baştan sona akar ve atlanabilir.
- [ ] iPhone ve Android tarayıcıda, iPad'de dikey ve yatay düzen bozulmaz.

### Faz 2 — Meta Sistemler ve İçerik

**Teslimatlar:** Derinleştirme ve Jeoloji Ağacı; rafineri; Bölge 1'in 3 madeni ve Bölge 2 (Yumuşak Kaya kuralı); harita ekranı; fosil müzesi; günlük sözleşmeler; başarımlar; Demlik takviyesi (mock reklamla); gelir ayrıntısı paneli ve çarpan yığını; kristalle işe alım, olasılık ekranı, garanti sayacı; denge simülatörü ve CSV raporu.

**Kabul kriterleri:**
- [ ] Simülatör Bölüm 5.5 eğrisini ±%30 içinde üretir.
- [ ] İlk Derinleştirmeden sonraki tur, Kat 12'ye ilk turdan en az %40 daha hızlı ulaşır.
- [ ] Gelir ayrıntısındaki tüm çarpanların çarpımı gösterilen gelire eşittir.
- [ ] Prestijde Bölüm 7.2 tablosuna uygun olarak doğru şeyler sıfırlanır.

### Faz 3 — Canlı Operasyon Altyapısı

**Teslimatlar:** Bölge 3–6 kuralları ve içerik iskeleti; yapılandırma tabanlı etkinlik madeni çerçevesi; simüle rakipli sıralama; sezon kartı; mağaza ekranı (mock IAP); reklam, IAP ve analitik soyutlamaları; günlük giriş ödülü; PWA bildirim altyapısı; yapılandırmayı uzak bir URL'den çekebilecek yapı.

**Kabul kriterleri:**
- [ ] Yeni bir etkinlik yalnızca JSON ekleyerek açılabilir.
- [ ] Mock reklam ve IAP akışları uçtan uca çalışır, ödüller doğru verilir.
- [ ] Analitik olayları tanımlı şemayla konsola düşer.

### Faz 4 — Cila, Performans ve Yerelleştirme

**Teslimatlar:** Bölüm 10.4'teki tüm geri bildirim efektleri; parçacık sistemleri; ses karışımı; gerçek sanatın atlaslarla entegrasyonu; İngilizce dil; erişilebilirlik ayarları; düşük güç modu; performans optimizasyonu; global hata yakalama.

**Kabul kriterleri:**
- [ ] Orta segment Android telefonda 60 fps, düşük güç modunda sabit 30 fps.
- [ ] İlk etkileşime kadar indirilen veri < 3 MB.
- [ ] Lighthouse PWA denetimi geçer.
- [ ] Kod içinde sabit yazılmış (çeviri dosyası dışında) kullanıcı metni yoktur.

### Faz 5 — Yayın

**Teslimatlar:** Capacitor ile iOS ve Android paketleri; gerçek reklam ve IAP SDK'ları; isteğe bağlı bulut kayıt; KVKK/GDPR izin ekranı; gizlilik politikası sayfası; mağaza görselleri; çökme raporlama.

**Kabul kriterleri:**
- [ ] Bölüm 5'teki (Yayın Kontrol Listesi) tüm maddeler işaretlenmiştir.

## 18. Tamamlanma Tanımı (Her Görev İçin)

Bir görev ancak şu koşulların hepsi sağlandığında "bitti" sayılır: Kod derlenir ve lint uyarısı yoktur; tüm testler geçer; tarayıcı konsolunda hata yoktur; mobil düzende denenmiştir; yeni kullanıcı metinleri çeviri dosyasındadır; yeni denge sayıları yapılandırmadadır; kayıt şeması değiştiyse göç ve testi yazılmıştır; performans bütçesi aşılmamıştır; değişiklikler kısa bir raporla özetlenmiştir.

## 19. İlk Görevin

Şimdi **Faz 0**'ı başlat. Sırasıyla:

1. Teknoloji seçimlerini onaylayan veya gerekçeli olarak düzelten kısa bir özet ver.
2. Faz 0 için klasör yapısını ve oluşturacağın dosyaların listesini göster.
3. 5–10 maddelik uygulama planını yaz.
4. Tüm dosyaları eksiksiz olarak yaz (`package.json` dahil).
5. Projeyi nasıl çalıştıracağımı ve test edeceğimi adım adım anlat.
6. Faz 0 kabul kriterlerini tek tek kontrol et ve sonucu raporla.
7. Faz 1'e geçmeden önce dikkat etmemiz gereken riskleri ve önerilerini listele.
