// Yönetici tarafından yeni kullanıcı oluşturma.
//
// Neden sunucu tarafında: client'tan supabase.auth.signUp() çağrıldığında
// tarayıcıdaki OTURUM YENİ KULLANICIYA GEÇİYOR. Sonrasında yapılan
// user_profiles ve resident_contacts yazmaları artık yeni kullanıcının
// kimliğiyle çalıştığı için RLS tarafından reddediliyor (o kişi admin
// değil) - sonuç: auth.users'da kayıt var ama profil ve iletişim kaydı yok.
// Üstelik yöneticinin kendi oturumu da kayboluyor.
//
// admin.createUser bunların hiçbirini yapmaz: çağıranın oturumuna dokunmaz.
//
// Deploy:
//   supabase functions deploy admin-create-user
//   (SERVICE_ROLE_KEY secret'ı admin-reset-password ile ortak)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });

interface Body {
  email?: string;
  phone?: string | null;
  loginEmail: string;
  password: string;
  fullName: string;
  role: 'resident' | 'admin';
  residentId: number;
  contactType: 'owner' | 'tenant' | 'emergency' | 'other';
  contactPhone: string;
  isPrimary: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY');
  if (!serviceKey) return json({ error: 'service_role_not_configured' }, 500);

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Çağıran kim? Token'dan çözülüyor, istek gövdesine güvenilmiyor.
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller?.user) return json({ error: 'unauthorized' }, 401);

  const { data: callerProfile } = await admin
    .from('user_profiles')
    .select('role, duty')
    .eq('id', caller.user.id)
    .single();

  const allowed =
    callerProfile?.role === 'admin' ||
    callerProfile?.duty === 'manager' ||
    callerProfile?.duty === 'assistant';
  if (!allowed) return json({ error: 'forbidden' }, 403);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  if (!body.loginEmail || !body.password || !body.fullName || !body.residentId) {
    return json({ error: 'missing_fields' }, 400);
  }
  if (body.password.length < 6) return json({ error: 'password_too_short' }, 400);

  // 1) Auth kullanıcısı. email_confirm: doğrulama beklenmesin - telefondan
  // üretilen teknik adresler zaten posta alamaz.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: body.loginEmail,
    password: body.password,
    email_confirm: true,
    phone: body.phone ?? undefined,
    phone_confirm: body.phone ? true : undefined,
    user_metadata: { full_name: body.fullName, display_name: body.fullName }
  });

  if (createError || !created?.user) {
    return json({ error: 'create_failed', detail: createError?.message }, 400);
  }

  const userId = created.user.id;

  // 2) Profil. Başarısız olursa auth kullanıcısını geri alıyoruz: profilsiz
  // hesap giriş yapabilir ama hiçbir yetkisi/dairesi olmaz, sessizce yarım
  // kalmış kayıt bırakmaktansa hiç bırakmamak daha temiz.
  const { error: profileError } = await admin.from('user_profiles').insert({
    id: userId,
    full_name: body.fullName,
    role: body.role,
    resident_id: body.residentId,
    phone: body.phone ?? null
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return json({ error: 'profile_failed', detail: profileError.message }, 500);
  }

  // 3) Dairenin iletişim listesi. Burada hata olursa kullanıcı geri
  // alınmıyor: hesap çalışır durumda, kişi sonradan daire penceresinden
  // eklenebilir. Yine de çağırana bildiriliyor.
  let contactWarning: string | undefined;
  if (body.isPrimary) {
    await admin
      .from('resident_contacts')
      .update({ is_primary: false })
      .eq('resident_id', body.residentId)
      .eq('is_primary', true);
  }

  const { error: contactError } = await admin.from('resident_contacts').insert({
    resident_id: body.residentId,
    type: body.contactType,
    name: body.fullName,
    phone: body.contactPhone,
    email: body.email || null,
    is_primary: body.isPrimary
  });

  if (contactError) contactWarning = contactError.message;

  return json({ ok: true, userId, contactWarning });
});
