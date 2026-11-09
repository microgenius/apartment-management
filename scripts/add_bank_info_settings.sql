-- Aidat ödemesi için site banka hesabı.
--
--   bank_iban           : IBAN. Boşluklu da girilebilir, uygulama
--                         ekranda 4'erli gruplar, panoya boşluksuz kopyalar.
--   bank_account_holder : hesap sahibi / alıcı adı
--
-- Bilgi ekranında "Ödeme Bilgileri" kartı olarak, tıklayınca kopyalanan
-- satırlar halinde görünür. İki değer de boşsa kart hiç çıkmaz.
--
-- DİKKAT: Gerçek IBAN'ı bu dosyaya yazıp commit'lemeyin. Bu script yalnızca
-- boş satırları oluşturur; değerler **Ayarlar → Banka Bilgileri** formundan
-- girilir. (Formu kullanamıyorsanız aşağıdaki UPDATE'i SQL Editor'e
-- yapıştırıp kendi değerlerinizle çalıştırın, dosyayı değiştirmeden.)
--
-- Idempotent: mevcut değerleri ezmez.

INSERT INTO settings (key, value) VALUES
  ('bank_iban', ''),
  ('bank_account_holder', '')
ON CONFLICT (key) DO NOTHING;

-- Değerleri SQL'den girmek isterseniz (dosyaya kaydetmeyin):
-- UPDATE settings SET value = 'TR00 0000 0000 0000 0000 0000 00' WHERE key = 'bank_iban';
-- UPDATE settings SET value = 'SITE YONETICILIGI'                WHERE key = 'bank_account_holder';

-- Doğrulama
SELECT key, value FROM settings WHERE key LIKE 'bank_%' ORDER BY key;
