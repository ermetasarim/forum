# Meydan Forum

Calisan arayuz prototipi. Kayit kapali. Tek admin:

- Ad: Erdem
- E-posta: ermetasarim@gmail.com
- Rol: admin

Uyeler, kategoriler ve konular bostan baslar.

## Acilis

login.html dosyasini tarayicida ac. Giristen sonra sayfalar ve admin paneli calisir.

Yerel veri localStorage icindedir (anahtar: meydan.v3). Eski demo icerik kullanilmaz.

## Ne calisir?

- Admin girisi / cikis
- Admin olmayan veya kayit denemesi reddedilir
- Kategori ekleme / silme
- Konu acma, yanit, sabitle, kilitle, sil
- Arama
- Ayar kaydi
- Veriyi sifirla (admin haric her sey)

## Supabase

js/config.js icindeki supabaseUrl ve supabaseAnonKey bos.

Veri veya proje anahtarlarini verdiginde schema.sql calistirilacak ve baglanti kurulacak.
