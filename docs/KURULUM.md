# Kurulum ve yayın rehberi

## 1. Gerekenler

- Windows, macOS veya Linux bilgisayar; güncel, WebGL destekli tarayıcı.
- [Node.js](https://nodejs.org/en/download) 22.9 veya üzeri ve beraberindeki npm.
- TikTok hesabınızda LIVE ve seçtiğiniz yayın yöntemine erişim.
- Kendi [Euler Stream](https://www.eulerstream.com/) hesabınız ve WebSocket erişimli API anahtarınız. Plan/kota gereksinimleri sağlayıcıya bağlıdır.
- Yayın görüntüsünü göndermek için hesabınızda kullanılabilen LIVE Studio veya [OBS Studio](https://obsproject.com/).

## 2. Projeyi indirme

GitHub'da **Code → Download ZIP** ile indirin ve ZIP'i çıkarın. Terminal/PowerShell'i içinde `package.json` bulunan klasörde açın. Git kullanıyorsanız:

```sh
git clone https://github.com/muhammedmed/tiklive.git
cd tiklive
```

Bağımlılıkları kurun:

```sh
npm ci
```

## 3. Euler anahtarı ve TikTok hesabı

Euler Stream hesabınızda API anahtarları bölümünden kendi anahtarınızı oluşturun. [Euler WebSocket belgeleri](https://www.eulerstream.com/docs/api/websockets).

macOS/Linux:

```sh
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

`.env` dosyasını düz metin editörüyle düzenleyin. Dosya adı `.env.txt` olmamalı:

```dotenv
EULER_API_KEY=KENDI_EULER_ANAHTARINIZ
TIKTOK_LIVE_HANDLE=kendi_tiktok_kullanici_adiniz
PORT=4317
```

Kullanıcı adı, **yayını açacak hesaptır**; görünen takma ad değil, `@` sonrasındaki kullanıcı adıdır. Anahtar yalnızca bu bilgisayardaki `.env` içinde kalır. Kalıcı kayıt istemiyorsanız `.env` değerlerini boş bırakıp paneldeki **TikTok LIVE’a bağlan** penceresinden oturumluk girebilirsiniz.

`.env` dosyası Git'e dahil edilmez. `git add -f .env` kullanmayın. Anahtar yanlışlıkla paylaşılırsa Euler'dan iptal edip yenileyin; dosyayı sonradan silmek eski Git geçmişinden kaldırmaz.

## 4. Stüdyoyu açma

```sh
npm start
```

Terminal açık kalsın. Tarayıcıda <http://127.0.0.1:4317/> adresini açın. Mac'te ilk kurulumdan sonra `Stüdyoyu Aç.command` dosyası da kullanılabilir.

Hesap ve anahtar `.env` içinde varsa uygulama yayını otomatik bekler. **YAYIN BEKLENİYOR**, canlı yayın açılana kadar normaldir. Yayın başladığında bağlantı durumunu kontrol edin. Sunucuyu normal şekilde kapatıp açmak oyun oturumunu yeniden başlatır; müzik dosyaları ve ayarlar bilgisayarda kalır.

## 5. MP3 çalma listesi

1. Panelde **MP3 çalma listesi → MP3’leri ekle** ile bir veya daha fazla dosya seçin.
2. Yükleme tamamlanınca parçalar listede görünür. En fazla 100 parça; dosya başına 128 MB.
3. `↑` / `↓` ile sırayı düzenleyin. Yüklemek ve sıralamak çalan parçayı kesmez.
4. **Listeden çal** veya bir parçanın **Çal** düğmesine basın. Parçalar sırayla gider; son parça bitince ilk parçaya dönülür.
5. **Önceki**, **Sonraki**, **Duraklat** ile kontrol edin. Duraklatılmış parçayı **Listeden çal** ile sürdürün.
6. Panelden dinlemek için **Önizlemede dinle** düğmesini açın. Yayın görüntüsünün sesi zaten yakalanıyorsa panel önizlemesini sessiz tutun.

Listeli müzik **`/overlay`** adresindeki tarayıcı oynatıcısından çıkar. Yayın ekranında müzik düğmeleri veya video oynatıcısı yoktur. Tarayıcı otomatik sesi engellerse oyun penceresine bir kez tıklayın. Panelde “Çalıyor” seçili olması tek başına OBS'nin sesi aldığını kanıtlamaz; yayın yazılımının ses göstergesini kontrol edin.

**`?music=obs` adresi bilerek sessizdir.** Listeyi kullanmak için OBS kaynak adresinden bu eki kaldırın ve ayrı MP3 medya kaynağını susturun. Birden fazla sesli oyun penceresi açmayın. Sunucu yeniden başlarsa liste kaydı korunur fakat çalma duraklatılmış açılır; tekrar **Listeden çal** seçin.

Eski tek parça düzeni de vardır: **Yayın müziği → MP3 seç** ile bir dosya ekleyin; **Tek MP3’e dön** ile listeyi kapatın. Dosya `muzik/dugun.mp3` olarak saklanır. Liste MP3'leri `muzik/` içinde benzersiz adlarla, sıraları `calma-listesi.json` içinde tutulur. Bunlar GitHub'a yüklenmez.

Şarkı koreografisi panelinde işaretler seçili parçanın sürümüne bağlıdır. Şu an tek parça için bir koreografi kaydı tutulur; her şarkı için ayrı koreografi arşivi yoktur. Müzik dışarıdaki OBS medya kaynağında çalıyorsa web sahnesi parça zamanını analiz edemez.

## 6. OBS ile görüntü ve ses

1. OBS'de boş sahne oluşturun.
2. **Ayarlar → Video** bölümünde tuval/çıkışı 1080 × 1920, FPS'yi 30 yapın.
3. Kaynaklara **Tarayıcı** ekleyin. URL: `http://127.0.0.1:4317/overlay`; genişlik 1080, yükseklik 1920.
4. Tarayıcı kaynağında **Sesi OBS üzerinden kontrol et** seçeneğini etkinleştirin. Ses karıştırıcısında bu kaynağı açın; MP3 listesi buradan duyulur. Otomatik oynatma engellenirse kaynağın **Etkileşim** penceresinden oyun alanına tıklayın.
5. Aynı müziği alan masaüstü sesi veya eski “Düğün müziği” kaynağını kapatın; çift ses oluşmasın. Kaynak etkinleştiğinde yenileme/kapatma seçeneklerini kapalı tutun; yenilemek müziği yeniden başlatabilir.
6. Hesabınız TikTok yayın sunucusu ve yayın anahtarı sağlıyorsa bunları OBS'nin yayın ayarlarına girip yayını başlatın. Bu proje yayın anahtarı sağlamaz.

[OBS tarayıcı kaynağı belgeleri](https://obsproject.com/kb/browser-source). OBS sanal kamera görüntü taşır; müziği otomatik taşıdığını varsaymayın. Hedef uygulamada ses yakalamasını ayrıca ayarlayın.

## 7. LIVE Studio ile yayın

1. Desteklenen işletim sistemi/hesapta LIVE Studio'yu açın.
2. Yerel panelde **LIVE Studio için oyun penceresini aç** düğmesine basın.
3. LIVE Studio'da **Pencere yakalama** kaynağı ekleyip **Düğün yayını** penceresini seçin.
4. Oyun penceresinin açık olduğu tarayıcının uygulama/sistem sesini yakalayın. İşletim sistemi izinleri ve kaynak adları sürüme göre farklı olabilir.
5. Stüdyo panelini değil oyun penceresini yakalayın. API anahtarının girildiği panel yayına çıkmasın.
6. Ses göstergesinin hareket ettiğini kontrol edin ve LIVE Studio'dan yayını başlatın.

Oyun penceresinde webcam görünümlü video sessizdir; ses MP3'ten gelir. Ekran veya sanal kamera yakalamanın sesi de taşıdığı varsayılmamalıdır.

## 8. Webcam görünümlü video (isteğe bağlı)

Depoda kişisel video yoktur. Kendi videonuzu WebM biçiminde `public/dugun-kamerasi.webm` adıyla koyun. Yeni açılan oyun penceresinde sol üstte sessiz ve döngülü görünür; dosya yoksa kutu gizlenir. Bu alan gerçek kameraya bağlanmaz, video dosyası oynatır. Videoyu değiştirdikten sonra yenileme gerektiğini unutmayın; yayın sırasında yenilemek müziği kesebilir.

## 9. Sohbet ve hediyeleri deneme

- Farklı bir izleyici hesabından `katıl` yazın: kadın karakter; `Katıl` yazın: erkek karakter.
- Aynı kişi yeniden yazdığında ikinci karakter oluşmaz.
- Profil fotoğrafı olay paketinde gelirse baloncukta görünür; yoksa baş harfler gösterilir. Fotoğraflar için eski oturum isimlerinden otomatik sorgu yapılmaz.
- Normal yorumlar kısa konuşma balonu olarak görünür; yoğunlukta tüm mesajlar gösterilmeyebilir.
- Hediye tablosunu hesabınızın TikTok seçicisindeki fiyatlarla karşılaştırın. Rol/efekt, tanımlı hediye kimliği ve birim fiyatla eşleştirilir. Seri adedi birim fiyat değildir.
- Panelde **Hediye ve jeton ayarları** ile alternatif eşik modunu, **Halay ve kamera ayarları** ile sıra biçimi ve kamera gezintilerini değiştirin.

## 10. Sorun giderme

| Sorun | Kontrol |
| --- | --- |
| `node` / `npm` bulunamadı | Node.js'i kurup terminali yeniden açın. `node --version` en az 22.9 olmalı. |
| Adres açılmıyor | `npm start` açık mı? Başka port seçtiyseniz tüm kaynak adreslerini güncelleyin. |
| `EADDRINUSE` | Aynı portta stüdyo zaten açık olabilir; önce panel adresini kontrol edin. |
| Yayın bekleniyor | `.env` hesabı gerçekten yayında mı? Uygulama kendi kendine TikTok yayını başlatmaz. |
| Anahtar / kota hatası | Euler anahtarının geçerliliğini, hesabın planını ve bağlantı limitlerini kontrol edin. |
| Katılım görünmüyor | Panel canlı bağlantıda mı? Doğru hesaba mı bağlı? Farklı izleyici hesabından tam `katıl` / `Katıl` yazın. |
| PP yok | Yeni bir TikTok olayı gelmeli; fotoğraf URL'si eksik veya yüklenemiyorsa baş harfler kalır. |
| Liste var, ses yok | `/overlay` kullanın; `?music=obs` sessizdir. Listeden çalın, sahneye tıklayın, yayın yazılımının ses kaynağını kontrol edin. |
| Çift / yankılı ses | Panel önizlemesini ve fazladan tarayıcı/OBS medya kaynaklarını kapatın; tek müzik kaynağı yakalayın. |
| Pil / işlemci kullanımı yüksek | 30 FPS kullanın; gereksiz oyun önizlemelerini kapatın, çözünürlüğü azaltın. 3B sahne ve yayın kodlama birlikte kaynak tüketir. |

Telefon paylaşımı aynı Wi-Fi'da isteğe bağlı görüntü içindir; liste bitiş kontrolü yerel bilgisayar yayın penceresi için tasarlanmıştır. İnternete port açmayın. Yönetim panelini yalnızca yerel bilgisayarda kullanın; herkese açık sunucu barındırma için tasarlanmamıştır.

## 11. Güncelleme ve paylaşım

Yayını kapattıktan sonra Git ile `git pull`, ardından `npm ci` çalıştırın. Kendi `.env`, `muzik/`, webcam ve ayar dosyalarınızı koruyun. Başka birine yalnızca GitHub bağlantısını gönderin; herkes kendi Euler anahtarını girmeli.

Geliştirici kontrolleri:

```sh
npm test
npm run check:release
```

Sürüm denetimi, Git'e eklenmiş dosyalarda yerel anahtarın yanlışlıkla bulunmasını ve özel dosyaların eklenmesini kontrol eder. Hiçbir tarayıcı tüm olası sırları garantiyle yakalayamaz; commit içeriğini de gözden geçirin.
