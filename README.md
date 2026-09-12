# Meydan Forum — UI prototipi

Admin panelli, Türkçe arayüzlü modern forum tasarımı.

## Sayfalar

### Kullanıcı tarafı
- `index.html` — Ana sayfa, kategoriler, çevrimiçi üyeler
- `category.html` — Konu listesi
- `thread.html` — Konu + yanıtlar
- `login.html` / `register.html` — Kimlik
- `profile.html` — Profil

### Admin paneli (`/admin`)
- `dashboard.html` — KPI, son kayıtlar, hızlı işlemler
- `users.html` — Rol, ban, onay
- `moderation.html` — Rapor kuyruğu
- `categories.html` — Bölüm yönetimi
- `settings.html` — Site ayarları
- `reports.html` — İstatistikler

## Çalıştırma

Tarayıcıda `index.html` dosyasını açman yeterli. Backend yoktur; bu bir arayüz tasarımı / ön yüz prototipidir.

Sonraki adım önerisi: Node/Express veya Laravel ile auth, konu/yanıt CRUD ve rol tabanlı yetki eklemek.
