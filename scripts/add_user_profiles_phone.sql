-- Kullanıcının gerçek telefon numarası.
--
-- Neden gerekli: Supabase telefonla kaydı ("Phone signups are disabled")
-- yalnızca bir SMS sağlayıcısı bağlıysa açıyor. Bizim akışımızda OTP yok,
-- şifreyi yönetici belirliyor ve SMS göndermek istemiyoruz (ücretli +
-- Türkiye A2P mevzuatı). Bu yüzden numaradan teknik bir e-posta üretilip
-- Supabase'in e-posta+şifre akışı kullanılıyor:
--
--   0532 123 45 67  ->  905321234567@phone.aksoysitesi.com
--
-- O adres okunabilir değil ve kullanıcı onu hiç görmüyor; gerçek numara
-- burada, insan tarafından okunabilir halde tutuluyor.
--
-- Idempotent.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'phone'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN phone TEXT;
        RAISE NOTICE 'Column phone added to user_profiles';
    ELSE
        RAISE NOTICE 'Column phone already exists on user_profiles';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);

-- Daha önce teknik e-postayla açılmış kullanıcılar varsa numarayı geri üret
UPDATE user_profiles p
SET phone = '+' || split_part(u.email, '@', 1)
FROM auth.users u
WHERE u.id = p.id
  AND p.phone IS NULL
  AND u.email LIKE '%@phone.aksoysitesi.com'
  AND split_part(u.email, '@', 1) ~ '^[0-9]+$';

-- Doğrulama
SELECT p.full_name, p.phone, u.email AS giris_adresi
FROM user_profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY p.full_name;

-- Geri alma:
--   ALTER TABLE user_profiles DROP COLUMN IF EXISTS phone;
