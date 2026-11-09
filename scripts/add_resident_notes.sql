-- Daire başına borç takip notları.
--
-- Neden gerekli: borcun hikâyesi tutarın kendisinden okunmuyor. "Şubat ayı
-- borcu unutuldu ama marttan itibaren tekrar yatırılmaya başlandı" gibi bir
-- bilgi yönetim değiştiğinde ya da daire sahibi arayıp sorduğunda kayboluyor
-- ve aynı konuşma baştan yapılıyor. Not daireye bağlanıyor, aya değil:
-- takip genelde birkaç ayı birlikte anlatıyor.
--
-- Neden ayrı tablo: residents tablosunu her oturum açmış kullanıcı okuyabiliyor
-- (residents_select USING (true)). Notu oraya bir kolon olarak koymak, yönetimin
-- kendi takip notunu sakinlere açardı. Burada okuma da yazma da görevli/admin
-- ile sınırlı.
--
-- has_duty() ve is_admin() enable_rls.sql'de tanımlanıyor; bu betiği ondan
-- SONRA çalıştırın.
--
-- GÜNCEL DEĞİL: aşağıdaki politikalar yardımcıyı da kapsıyor. Yürürlükteki
-- sınır restrict_resident_notes_to_manager.sql ile yalnızca yöneticidir;
-- bu betiği yeniden çalıştırırsanız onu da arkasından çalıştırın.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS resident_notes (
  id BIGSERIAL PRIMARY KEY,
  resident_id BIGINT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  -- Yazanın adı, kimliği değil: not bir takip kaydı, bir yıl sonra okunduğunda
  -- önemli olan o gün görevde olan kişinin adı. İsim sonradan değişse bile
  -- kaydın üstündeki yazı değişmemeli.
  author_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resident_notes_resident_id ON resident_notes(resident_id);

-- ==========================================
-- RLS
-- ==========================================
ALTER TABLE resident_notes ENABLE ROW LEVEL SECURITY;

-- Okuma: yalnızca görevli/admin. Sakinler kendi dairesinin notunu DA görmemeli;
-- "daire sahibi sorarsa söylenmeli" kararı yöneticinin.
DROP POLICY IF EXISTS "resident_notes_select" ON resident_notes;
CREATE POLICY "resident_notes_select" ON resident_notes FOR SELECT TO authenticated
  USING (is_admin() OR has_duty());

DROP POLICY IF EXISTS "resident_notes_insert" ON resident_notes;
CREATE POLICY "resident_notes_insert" ON resident_notes FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR has_duty());

DROP POLICY IF EXISTS "resident_notes_delete" ON resident_notes;
CREATE POLICY "resident_notes_delete" ON resident_notes FOR DELETE TO authenticated
  USING (is_admin() OR has_duty());

-- UPDATE politikası bilinçli olarak yok: not bir takip kaydı, düzeltilmesi
-- gerekirse silinip yeniden yazılır. Böylece geçmişe dönük sessiz değişiklik
-- olmuyor.

-- ==========================================
-- Doğrulama
-- ==========================================
SELECT r.door, r.name AS daire, n.note, n.author_name, n.created_at
FROM resident_notes n
JOIN residents r ON r.id = n.resident_id
ORDER BY n.created_at DESC;

-- ==========================================
-- Geri alma (gerekirse)
-- ==========================================
-- DROP TABLE IF EXISTS resident_notes;
