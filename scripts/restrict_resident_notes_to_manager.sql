-- Borç takip notlarını yalnızca YÖNETİCİYE aç.
--
-- add_resident_notes.sql notları görevli (yönetici + yardımcı) ve admin'e
-- açmıştı. Karar değişti: not, daire sahibine ne söyleneceğine dair yönetimin
-- kendi kaydı; bu sorumluluk devredilmiyor. Yardımcı tahsilatı yapar ama bu
-- kaydı görmez.
--
-- is_admin() yerinde kalıyor: teknik süper-kullanıcı, hatalı bir yöneticilik
-- devri sonrası sisteme girip düzeltebilecek tek hesap.
--
-- enable_rls.sql ve add_resident_notes.sql'den SONRA çalıştırın. Idempotent.

-- Yalnızca yönetici. has_duty()'nin yardımcıyı da kapsayan karşılığı.
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND duty = 'manager'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "resident_notes_select" ON resident_notes;
CREATE POLICY "resident_notes_select" ON resident_notes FOR SELECT TO authenticated
  USING (is_admin() OR is_manager());

DROP POLICY IF EXISTS "resident_notes_insert" ON resident_notes;
CREATE POLICY "resident_notes_insert" ON resident_notes FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_manager());

DROP POLICY IF EXISTS "resident_notes_delete" ON resident_notes;
CREATE POLICY "resident_notes_delete" ON resident_notes FOR DELETE TO authenticated
  USING (is_admin() OR is_manager());

-- ==========================================
-- Doğrulama
-- ==========================================
-- Üç satır da is_manager() içermeli, has_duty() içermemeli.
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'resident_notes'
ORDER BY policyname;

-- ==========================================
-- Geri alma (gerekirse)
-- ==========================================
-- add_resident_notes.sql'deki politika bloğunu yeniden çalıştırmak yeterli.
