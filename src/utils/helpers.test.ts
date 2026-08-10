// Telefon normalizasyonu için hızlı kontrol - dallanan tek mantık burası.
// Çalıştırmak için:  node --experimental-strip-types src/utils/helpers.test.ts
import assert from 'node:assert/strict';
import { toE164, isEmail } from './helpers.ts';

const TR = '+905072318420';

// Aynı numaranın yazılabildiği tüm biçimler aynı sonuca çıkmalı
assert.equal(toE164('0507 231 84 20'), TR);
assert.equal(toE164('05072318420'), TR);
assert.equal(toE164('5072318420'), TR);
assert.equal(toE164('905072318420'), TR);
assert.equal(toE164('+90 507 231 84 20'), TR);
assert.equal(toE164('  0507-231-84-20  '), TR);

// Ülke kodu açıkça verilmişse korunmalı (yurt dışı numarası)
assert.equal(toE164('+49 151 23456789'), '+4915123456789');

// Geçersiz girdiler null dönmeli - sessizce yanlış numara üretmemeli
assert.equal(toE164(''), null);
assert.equal(toE164('123'), null);
assert.equal(toE164('507231842'), null);      // 9 hane, eksik
assert.equal(toE164('50723184201'), null);    // 11 hane ama 0 ile başlamıyor
assert.equal(toE164('+123'), null);

// Email / telefon ayrımı
assert.equal(isEmail('user@example.com'), true);
assert.equal(isEmail('05072318420'), false);

console.log('✓ toE164 / isEmail kontrolleri geçti');
