-- Gecikme faizi ayarları.
--
-- Oran ve tolerans süreleri genel kurul kararıyla belirleniyor ve her yıl
-- değişebiliyor; kodda sabit tutmak her değişiklikte deploy gerektirirdi.
-- Bu yüzden settings tablosunda, Ayarlar ekranından düzenlenebilir.
--
--   late_fee_rate         : aylık faiz oranı, YÜZDE olarak ("5" = %5)
--   late_fee_grace_months : faizsiz ay sayısı. Vade ayı 1. ay sayılır;
--                           "3" ise Ocak aidatı Ocak/Şubat/Mart faizsiz,
--                           Nisan'da ilk faizini alır.
--   late_fee_grace_days   : ayın başına eklenen ek tolerans (gün).
--                           Borcunu 3 ayda bir ödeyenlerin (maaşını üç ayda
--                           bir alanlar) birkaç günlük gecikmeyle faize
--                           girmemesi için. "10" ise faiz 11. günde başlar.
--
-- Idempotent.

INSERT INTO settings (key, value) VALUES
  ('late_fee_rate', '5'),
  ('late_fee_grace_months', '3'),
  ('late_fee_grace_days', '10')
ON CONFLICT (key) DO NOTHING;

-- Doğrulama
SELECT key, value FROM settings WHERE key LIKE 'late_fee%' ORDER BY key;
