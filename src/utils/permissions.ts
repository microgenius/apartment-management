// ==========================================
// YETKİ KURALLARI (PERMISSIONS)
// ==========================================
// Sistemin tek kuralı:
//   Aksiyon kendini ilgilendiriyorsa kendin yapabilirsin.
//   Başkasını ilgilendiriyorsa yönetici veya yardımcısı yapar.
//
// Yetki GÖREVDEN türer (user_profiles.duty), roldan değil. Görev el
// değiştirdiğinde eski görevli yetkisini kendiliğinden kaybeder - ayrıca
// bir rol güncellemesi gerekmez.
//
// role = 'admin' bunun dışında kalan teknik süper-kullanıcıdır (kullanıcı
// oluşturma, ayarlar, yöneticilik devri). Görevden bağımsız tutuluyor ki
// hatalı bir devir sonrası sisteme girip düzeltebilecek biri kalsın.

import type { UserProfile } from '../services/userProfilesService';

/** Yönetici veya yardımcısı mı? Başkasını ilgilendiren aksiyonlar bunlara açık. */
export const hasDuty = (profile: UserProfile | null): boolean =>
  profile?.duty === 'manager' || profile?.duty === 'assistant';

/** Teknik süper-kullanıcı (sistem sahibi). */
export const isAdmin = (profile: UserProfile | null): boolean =>
  profile?.role === 'admin';

/** Başkalarının kayıtlarını değiştirebilir mi? */
export const canManageOthers = (profile: UserProfile | null): boolean =>
  hasDuty(profile) || isAdmin(profile);

/**
 * Belirli bir dairenin bilgilerini (iletişim kişileri vb.) değiştirebilir mi?
 * Kendi dairesiyse evet; başkasının dairesiyse yalnızca görevli/admin.
 */
export const canEditResident = (
  profile: UserProfile | null,
  residentId: number | null | undefined
): boolean => {
  if (canManageOthers(profile)) return true;
  return (
    residentId != null &&
    profile?.resident_id != null &&
    profile.resident_id === residentId
  );
};
