// Yöneticinin BAŞKA bir kullanıcının şifresini sıfırlaması.
//
// Neden Edge Function: başkasının şifresini değiştirmek Supabase'in admin
// API'sini, o da service_role anahtarını gerektiriyor. service_role anahtarı
// tarayıcıya İNEMEZ - inerse anahtarı gören herkes tüm veritabanına tam
// yetkiyle erişir. Bu yüzden işlem sunucu tarafında yapılıyor.
//
// Yetki: uygulamadaki kuralla aynı - başkasını ilgilendiren aksiyonu
// yalnızca yönetici (duty) veya admin (role) yapabilir. Çağıranın kimliği
// JWT'den doğrulanıyor; istekle gelen bilgiye güvenilmiyor.
//
// Deploy:
//   supabase functions deploy admin-reset-password
//   supabase secrets set SERVICE_ROLE_KEY=<Settings > API > service_role>
// (SUPABASE_URL Edge runtime tarafından otomatik sağlanır.)

import { createClient } from 'jsr:@supabase/supabase-js@2';

// supabase-js isteğe authorization dışında apikey ve x-client-info başlıklarını
// da ekliyor. Bunlar izin listesinde yoksa tarayıcı preflight'ı reddeder, istek
// fonksiyona hiç ulaşmaz ve loglarda yalnızca booted/shutdown görünür - hata
// satırı çalışmadığı için sebep hiçbir yere yazılmaz.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY');
  if (!serviceKey) return json({ error: 'service_role_not_configured' }, 500);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1) Çağıran gerçekten kim? Token'dan çözülüyor, istekten gelen id'ye güvenilmiyor.
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller?.user) return json({ error: 'unauthorized' }, 401);

  // 2) Yetkisi var mı? Yönetici/yardımcısı (duty) ya da admin (role).
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role, duty')
    .eq('id', caller.user.id)
    .single();

  const allowed =
    profile?.role === 'admin' ||
    profile?.duty === 'manager' ||
    profile?.duty === 'assistant';

  if (!allowed) return json({ error: 'forbidden' }, 403);

  // 3) Girdi kontrolü
  let body: { userId?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  const { userId, newPassword } = body;
  if (!userId || !newPassword) return json({ error: 'missing_fields' }, 400);
  if (newPassword.length < 6) return json({ error: 'password_too_short' }, 400);

  // 4) Sıfırla
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) {
    // Sebebi çağırana da döndürüyoruz: buraya ancak yetki kontrolünden geçmiş
    // bir yönetici gelebiliyor, dolayısıyla bilgi sızdırma riski yok. Sebebi
    // yutmak, sorunu yalnızca loglara bakabilen birinin çözebilmesi demekti.
    console.error('reset failed:', error.message, error.status);
    return json({ error: 'reset_failed', detail: error.message }, 500);
  }

  return json({ ok: true });
});
