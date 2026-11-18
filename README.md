# Sinyal Studio · TikTok LIVE Halay

TikTok LIVE sohbeti ve hediyeleriyle çalışan, bilgisayarda yerel olarak açılan 3B **Blok Karakterler Düğünü** ve **Sahil Rallisi**. Yönetim paneli, yayın görüntüsü, MP3 çalma listesi ve Euler Stream bağlantısı birlikte gelir.

**[Adım adım kurulum ve yayın rehberi →](docs/KURULUM.md)**

## Hızlı başlangıç

Node.js 22.9 veya üstünü kurun. Bu depoyu indirin veya klonlayın:

```sh
git clone https://github.com/muhammedmed/tiklive.git
cd tiklive
npm ci
```

`.env.example` dosyasını `.env` adıyla kopyalayın. Kendi Euler Stream anahtarınızı ve yayın açacağınız TikTok kullanıcı adını `.env` dosyasına yazın:

```dotenv
EULER_API_KEY=KENDI_ANAHTARINIZ
TIKTOK_LIVE_HANDLE=kendi_kullanici_adiniz
PORT=4317
```

```sh
npm start
```

- Yönetim paneli: <http://127.0.0.1:4317/>
- MP3 listesiyle sesli yayın görüntüsü: <http://127.0.0.1:4317/overlay>
- Sesi ayrı OBS kaynağından verenler için sessiz görüntü: <http://127.0.0.1:4317/overlay?music=obs>

Her yayıncı kendi bilgisayarında kendi hesabı ve API anahtarıyla çalışır. GitHub Pages üzerinde çalışmaz; Node.js sunucusu gerekir. Uygulama TikTok'ta yayını başlatmaz veya LIVE erişimi vermez. Yayını OBS/LIVE Studio'dan başlatırsınız; uygulama olayları Euler Stream üzerinden alır.

## Neler var?

- Bloklu, piksel yüzlü karakterler (Steve, Alex, zombi, creeper, iskelet, köylü, enderman tarzı). `katıl` → kadın, `Katıl` → erkek görünümüyle katılım; isim ve varsa profil fotoğrafı baloncuğu.
- İki sırada 56 dansçı, dört özel rol; yoğunlukta bekleme sırası.
- Gelin, damat, halaybaşı, davulcu, zurnacı; altın, konfeti ve para efektleri.
- Giriş yürüyüşü, dönen yakın çekimler, genel plan ve hediye öncelikli kamera sırası.
- Yedi halay figürü, mendilli halaybaşı, şarkı bölümleri ve yayıncı kumandası.
- Birden fazla MP3 yükleme, sıralama, önceki/sonraki, duraklatma ve döngülü çalma listesi.
- İsteğe bağlı sessiz, döngülü webcam görünümlü video kutusu.

## TikTok hediye eşleştirmeleri

Yeni kurulumda hediye eylemleri boş başlar. Panelde **TikTok hediye eşleştirmeleri → TikTok hediyelerini getir** seçin; her eyleme istediğiniz hediyeyi atayıp kaydedin. Aynı hediye iki eyleme atanamaz; boş bırakılan eylem kapalıdır.

İzleyici TikTok'un kendi hediye menüsünü kullanır. Fiyatı TikTok belirler; oyun gönderilen **hediye kimliğini** eşleştirir. Sabit bir jeton tablosu dayatılmaz. Oyun üstündeki ek hediye rehberi varsayılan olarak kapalıdır ve panelden isteğe bağlı açılır. Bu panel TikTok'un yerel hediye menüsünü veya LIVE Studio'daki etkileşimli paneli otomatik yapılandırmaz.

## Gizlilik ve paylaşım

**Gerçek Euler anahtarı bu depoda yoktur.** `.env`, MP3'ler, webcam videosu, yayın kayıtları ve kişisel ayar dosyaları Git tarafından dışlanır. `.env.example` boş bir şablondur. Anahtarı ekran görüntülerine, issue'lara veya sohbetlere yapıştırmayın.

Depoda müzik ve kişisel webcam videosu bulunmaz. Yayıncı kendi kullanım izni olan medyasını ekler. Fotoğraflar TikTok olayında gelirse gösterilir; gelmezse baş harf görünür. Eski oturumdaki fotoğrafsız kişiler için geriye dönük fotoğraf sorgusu yapılmaz.

## Geliştirme

```sh
npm test
npm run check:release
```

`src/live.js`: Euler paketleri. `src/game.js`: oyun kuralları. `src/playlist.js`: yerel müzik sırası. `public/halay.js` ve `public/dancers.js`: sahne ve hareketler. `server.js`: yerel HTTP ve SSE sunucusu. Socket.IO gerekmez; ekranlar SSE ile güncellenir.

[Kurulum ve sorun giderme](docs/KURULUM.md) · [Üçüncü taraf varlıklar](docs/ASSETS.md)
