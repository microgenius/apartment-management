-- Tahsilatı tek bir veritabanı işleminde yapan fonksiyon.
--
-- SORUN: Tahsilat client'ta adım adım yürüyordu - ledger satırları tek tek
-- yazılıyor, kasa kaydı en sonda ekleniyordu. Arada kopan her şey (oturum
-- düşmesi, ağ hatası, sekmenin kapanması) yarım durum bırakıyordu:
-- dairenin borcu kapanmış ama kasaya para girmemiş görünüyordu. Yönetici
-- tekrar denediğinde ödeme ikinci kez uygulanıp ledger'da mükerrer kayıt
-- oluşuyordu.
--
-- ÇÖZÜM: Hepsi tek fonksiyonda. Postgres fonksiyon gövdesini tek işlem
-- olarak çalıştırır: ya tüm ledger satırları VE kasa kaydı yazılır, ya da
-- hiçbiri yazılmaz. Yarım durum kalmaz.
--
-- created_by da burada auth.uid() ile alınıyor; client'ın ayrıca
-- supabase.auth.getUser() çağırmasına gerek kalmıyor (o çağrı ağ üzerinden
-- token doğruluyor ve süresi dolmuş oturumda kullanıcıyı sistemden atıyordu).
--
-- p_ops: client'ın hesapladığı ledger işlemleri
--   {"op":"update","id":"<uuid>","status":"paid","paid_amount":300}
--   {"op":"insert","date":"2026-09-01","description":"Eylül Aidatı",
--    "amount":300,"status":"paid","paid_amount":300}
--
-- enable_rls.sql'den SONRA çalıştırın (is_admin/has_duty burada kullanılıyor).

CREATE OR REPLACE FUNCTION record_dues_payment(
  p_resident_id BIGINT,
  p_amount NUMERIC,
  p_payer TEXT,
  p_ops JSONB
) RETURNS VOID AS $$
DECLARE
  op JSONB;
BEGIN
  -- SECURITY DEFINER RLS'i baypas ettiği için yetki kontrolü burada
  -- açıkça yapılmak zorunda.
  IF NOT (is_admin() OR has_duty()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  FOR op IN SELECT * FROM jsonb_array_elements(p_ops)
  LOOP
    IF op->>'op' = 'update' THEN
      UPDATE ledgers
      SET status = op->>'status',
          paid_amount = COALESCE((op->>'paid_amount')::NUMERIC, 0)
      WHERE id = (op->>'id')::UUID
        AND resident_id = p_resident_id;   -- başka dairenin satırı güncellenemesin
    ELSE
      INSERT INTO ledgers (resident_id, date, description, amount, status, paid_amount)
      VALUES (
        p_resident_id,
        (op->>'date')::DATE,
        op->>'description',
        (op->>'amount')::NUMERIC,
        op->>'status',
        COALESCE((op->>'paid_amount')::NUMERIC, 0)
      );
    END IF;
  END LOOP;

  -- Kasa kaydı. Açıklamada daire numarası yok: kasa defteri sakinlere de
  -- açık ve kimin ne ödediği kişisel bilgi (bkz. add_transactions.sql).
  INSERT INTO transactions (type, amount, description, date, source, resident_id, created_by)
  VALUES ('income', p_amount, 'Aidat tahsilatı - ' || p_payer,
          CURRENT_DATE, 'dues', p_resident_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_dues_payment(BIGINT, NUMERIC, TEXT, JSONB) TO authenticated;

-- Doğrulama: fonksiyon oluştu mu?
SELECT proname, pg_get_function_identity_arguments(oid) AS parametreler
FROM pg_proc WHERE proname = 'record_dues_payment';
