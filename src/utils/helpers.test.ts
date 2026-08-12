// Telefon normalizasyonu için hızlı kontrol - dallanan tek mantık burası.
// Üç pazar da kapsanıyor: Türkiye, Almanya, İrlanda.
// Çalıştırmak için:  node --experimental-strip-types src/utils/helpers.test.ts
import assert from 'node:assert/strict';
import { toE164, isEmail, DIAL_CODES } from './helpers.ts';

// --- Türkiye (+90) ---
const TR = '+905072318420';
assert.equal(toE164('0507 231 84 20', DIAL_CODES.tr), TR);
assert.equal(toE164('05072318420', DIAL_CODES.tr), TR);
assert.equal(toE164('5072318420', DIAL_CODES.tr), TR);
assert.equal(toE164('905072318420', DIAL_CODES.tr), TR);
assert.equal(toE164('+90 507 231 84 20', DIAL_CODES.tr), TR);
assert.equal(toE164('  0507-231-84-20  ', DIAL_CODES.tr), TR);

// --- Almanya (+49) - milli numara TR'den uzun, sabit hane sayısı varsayılamaz
const DE = '+4915123456789';
assert.equal(toE164('0151 23456789', DIAL_CODES.de), DE);
assert.equal(toE164('015123456789', DIAL_CODES.de), DE);
assert.equal(toE164('4915123456789', DIAL_CODES.de), DE);
assert.equal(toE164('+49 151 23456789', DIAL_CODES.de), DE);

// --- İrlanda (+353) - milli numara TR'den kısa
const IE = '+353851234567';
assert.equal(toE164('085 123 4567', DIAL_CODES.en), IE);
assert.equal(toE164('0851234567', DIAL_CODES.en), IE);
assert.equal(toE164('+353 85 123 4567', DIAL_CODES.en), IE);

// --- Ülke kodu açıkça yazılmışsa seçili ülke onu ezmemeli ---
// (Almanya'da yaşayan bir sakin arayüzü Türkçe kullanıyor olabilir)
assert.equal(toE164('+49 151 23456789', DIAL_CODES.tr), DE);
assert.equal(toE164('+90 507 231 84 20', DIAL_CODES.de), TR);

// --- "00" uluslararası öneki de kabul edilmeli (Avrupa'da yaygın yazım) ---
assert.equal(toE164('0049 151 23456789', DIAL_CODES.tr), DE);
assert.equal(toE164('0090 507 231 84 20', DIAL_CODES.de), TR);
assert.equal(toE164('00353 85 123 4567', DIAL_CODES.tr), IE);

// --- Seçilen ülke koduyla diğer Avrupa ülkeleri ---
assert.equal(toE164('06 12345678', '31'), '+31612345678');    // Hollanda
assert.equal(toE164('07911 123456', '44'), '+447911123456');  // Birleşik Krallık
assert.equal(toE164('06 12 34 56 78', '33'), '+33612345678'); // Fransa
assert.equal(toE164('333 1234567', '39'), '+393331234567');   // İtalya (0 yok)

// Milli numaranın kendisi ülke koduyla başlayabilir - kırpılmamalı
assert.equal(toE164('391 234 5678', '39'), '+393912345678');  // İtalyan cep, 39 ile başlıyor
assert.equal(toE164('634 123 456', '34'), '+34634123456');    // İspanya, 34 ile başlıyor
// ...ama gerçekten ülke kodu yazılmışsa kırpılmalı
assert.equal(toE164('905072318420', '90'), TR);
assert.equal(toE164('4915123456789', '49'), DE);
assert.equal(toE164('353851234567', '353'), IE);

// --- Geçersiz girdiler null dönmeli - sessizce yanlış numara üretmemeli ---
assert.equal(toE164('', DIAL_CODES.tr), null);
assert.equal(toE164('123', DIAL_CODES.tr), null);
assert.equal(toE164('+123', DIAL_CODES.tr), null);
assert.equal(toE164('abc', DIAL_CODES.de), null);
assert.equal(toE164('+9051234567890123456', DIAL_CODES.tr), null); // E.164 15 haneyi aşıyor

// --- Email / telefon ayrımı ---
assert.equal(isEmail('user@example.com'), true);
assert.equal(isEmail('05072318420'), false);

console.log('✓ toE164 / isEmail kontrolleri geçti (TR, DE, IE)');
