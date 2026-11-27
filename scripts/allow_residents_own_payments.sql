-- Sakin, KENDİ dairesinin aidat tahsilatlarını tarih tarih görebilsin.
--
-- add_transactions.sql aidat satırlarını (source='dues') yalnızca
-- görevli/admin'e açıyordu, çünkü kimin ne ödediği kişisel bilgi. Ama kişinin
-- kendi ödemesi kendisinden gizlenecek bir bilgi değil: "hangi gün ne kadar
-- göndermiştim" sorusunu sakin de soruyor. Başka dairelerin satırları
-- kapalı kalıyor.
--
-- Bağ user_profiles.resident_id üzerinden (my_resident_id(), enable_rls.sql).
-- İsimle eşleşen ama bağlanmamış hesaplar hiçbir satır görmez.
--
-- Arayüz tarafı: FinanceView sakin için 'dues' satırlarını listeden atıp
-- yalnızca dues_income_total() toplamını gösteriyor; yoksa sakinin kendi
-- ödemesi toplamla birlikte iki kez sayılırdı.
--
-- enable_rls.sql ve add_transactions.sql'den SONRA çalıştırın. Idempotent.

DROP POLICY IF EXISTS "transactions_select" ON transactions;
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated
  USING (
    is_admin() OR has_duty() OR source <> 'dues'
    OR resident_id = my_resident_id()
  );

-- Geri alma (add_transactions.sql'deki hali):
--   DROP POLICY IF EXISTS "transactions_select" ON transactions;
--   CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated
--     USING (is_admin() OR has_duty() OR source <> 'dues');
