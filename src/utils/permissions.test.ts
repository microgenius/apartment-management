// Yetki kuralı kontrolü: "kendini ilgilendiriyorsa sen, başkasını
// ilgilendiriyorsa yönetici/yardımcısı".
// Çalıştırmak için:  node --experimental-strip-types src/utils/permissions.test.ts
import assert from 'node:assert/strict';
import { canEditResident, canManageOthers, canDeleteContent, hasDuty, isAdmin } from './permissions.ts';
import type { UserProfile } from '../services/userProfilesService.ts';

const profile = (over: Partial<UserProfile>): UserProfile => ({
  id: 'u1',
  full_name: 'Test',
  role: 'resident',
  resident_id: null,
  duty: null,
  duty_since: null,
  created_at: '',
  updated_at: '',
  ...over
});

const sakin = profile({ resident_id: 5 });
const yonetici = profile({ id: 'u2', resident_id: 7, duty: 'manager', duty_since: '2026-01-01' });
const yardimci = profile({ id: 'u3', resident_id: 8, duty: 'assistant', duty_since: '2026-01-01' });
const admin = profile({ id: 'u4', role: 'admin' });
const daireSiz = profile({ id: 'u5' });

// --- Kendi dairesi ---
assert.equal(canEditResident(sakin, 5), true, 'sakin kendi dairesini düzenleyebilmeli');

// --- Başkasının dairesi ---
assert.equal(canEditResident(sakin, 6), false, 'sakin başkasının dairesine dokunamamalı');

// --- Görevliler her daireyi düzenleyebilir ---
assert.equal(canEditResident(yonetici, 6), true, 'yönetici her daireyi düzenleyebilmeli');
assert.equal(canEditResident(yardimci, 6), true, 'yardımcı her daireyi düzenleyebilmeli');
assert.equal(canEditResident(admin, 6), true, 'admin her daireyi düzenleyebilmeli');

// --- Görev bırakılınca yetki de gider (görev el değiştirme senaryosu) ---
const eskiYonetici = { ...yonetici, duty: null, duty_since: null };
assert.equal(canEditResident(eskiYonetici, 6), false, 'görevi biten yetkisini kaybetmeli');
assert.equal(canEditResident(eskiYonetici, 7), true, 'ama kendi dairesini düzenlemeye devam etmeli');

// --- Daireye bağlı olmayan hesap kimseyi düzenleyemez ---
assert.equal(canEditResident(daireSiz, 5), false);
assert.equal(canEditResident(daireSiz, null), false);

// --- null resident_id'ler birbirine eşit sayılmamalı ---
assert.equal(canEditResident(daireSiz, undefined), false, 'null == null tuzağına düşmemeli');

// --- Oturum yoksa ---
assert.equal(canEditResident(null, 5), false);
assert.equal(canManageOthers(null), false);

// --- Yardımcı fonksiyonlar ---
assert.equal(hasDuty(yonetici), true);
assert.equal(hasDuty(sakin), false);
assert.equal(isAdmin(admin), true);
assert.equal(isAdmin(yonetici), false, 'görev admin rolü vermiyor, ayrı kavramlar');
assert.equal(canManageOthers(yonetici), true);
assert.equal(canManageOthers(sakin), false);

console.log('✓ yetki kuralı kontrolleri geçti');

// --- İçerik silme: yazarı silebilir, başkası silemez ---
assert.equal(canDeleteContent(sakin, 'u1'), true, 'yazar kendi içeriğini silebilmeli');
assert.equal(canDeleteContent(sakin, 'baskasi'), false, 'başkasının içeriğini silememeli');
assert.equal(canDeleteContent(yonetici, 'baskasi'), true, 'yönetici her içeriği silebilmeli');
assert.equal(canDeleteContent(yardimci, 'baskasi'), true, 'yardımcı da silebilmeli');

// Yazarı bilinmeyen eski kayıtlar: kimse "sahibiyim" diyememeli
assert.equal(canDeleteContent(sakin, null), false, 'yazarı bilinmeyeni sakin silememeli');
assert.equal(canDeleteContent(daireSiz, null), false, 'null == null tuzağı');
assert.equal(canDeleteContent(yonetici, null), true, 'ama yönetici silebilmeli');
assert.equal(canDeleteContent(null, 'u1'), false, 'oturum yoksa silemez');

console.log('✓ içerik silme yetkisi kontrolleri geçti');
