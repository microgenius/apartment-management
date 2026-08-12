import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { userProfilesService, type UserProfile } from '../services/userProfilesService';
import { isEmail, toE164, phoneToLoginEmail } from '../utils/helpers';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  userRole: 'resident' | 'admin' | null;
  loading: boolean;
  /**
   * identifier: email veya telefon numarası (hangisi olduğu otomatik ayırt edilir).
   * dialCode: ülke kodu yazılmamış telefonlar için varsayılan (bkz. DIAL_CODES).
   * Kullanıcı kitlesi TR/DE/IE olduğu için sabit +90 varsaymak yanlış numara üretir.
   */
  signIn: (identifier: string, password: string, dialCode?: string) => Promise<{ error: Error | null }>;
  createUser: (
    email: string, password: string, fullName: string, role: 'resident' | 'admin',
    apartmentInfo?: string, phone?: string, dialCode?: string,
    extra?: { residentId: number; contactType: 'owner' | 'tenant' | 'emergency' | 'other'; contactPhone: string; isPrimary: boolean }
  ) => Promise<{ error: Error | null; userId: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Cache to prevent multiple fetches
  const profileCache = useRef<{ [userId: string]: UserProfile | null }>({});
  const fetchingProfile = useRef<{ [userId: string]: boolean }>({});

  const loadUserProfile = async (userId: string, force = false) => {
    // Check cache first (only if not forced)
    if (!force && profileCache.current[userId] !== undefined) {
      setUserProfile(profileCache.current[userId]);
      return;
    }

    // Prevent concurrent fetches for same user
    if (fetchingProfile.current[userId]) {
      return;
    }

    fetchingProfile.current[userId] = true;

    try {
      // Add timeout to prevent hanging
      const profilePromise = userProfilesService.getProfile(userId);
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn('⏱️ Profile fetch timeout after 5 seconds - user_profiles table may not exist');
          resolve(null);
        }, 5000)
      );

      const profile = await Promise.race([profilePromise, timeoutPromise]);

      // Only cache and set state if we got data from server
      if (profile !== null || force) {
        profileCache.current[userId] = profile;
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      console.warn('⚠️ User profile not found. Please run supabase-user-profiles.sql to create the user_profiles table.');
      if (force) {
        // Only clear state if this was a forced refresh
        profileCache.current[userId] = null;
        setUserProfile(null);
      }
    } finally {
      fetchingProfile.current[userId] = false;
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
      setLoading(false);
    }).catch((error) => {
      console.error('❌ Error getting session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Email ve telefon Supabase'de ayrı alanlar; girdiye göre doğru olanı gönderiyoruz
  const signIn = async (identifier: string, password: string, dialCode?: string) => {
    try {
      // Telefonla giriş de e-posta akışından gidiyor: Supabase telefon
      // sağlayıcısı SMS olmadan açılamıyor. Numara, kayıtta üretilenle
      // aynı teknik adrese çözülüyor.
      let credentials;
      if (isEmail(identifier)) {
        credentials = { email: identifier.trim(), password };
      } else {
        const loginEmail = phoneToLoginEmail(identifier, dialCode);
        if (!loginEmail) return { error: new Error('INVALID_PHONE') };
        credentials = { email: loginEmail, password };
      }

      const { error } = await supabase.auth.signInWithPassword(credentials);
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const createUser = async (
    email: string, password: string, fullName: string, role: 'resident' | 'admin',
    apartmentInfo?: string, phone?: string, dialCode?: string,
    extra?: { residentId: number; contactType: 'owner' | 'tenant' | 'emergency' | 'other'; contactPhone: string; isPrimary: boolean }
  ) => {
    try {
      // Admin tarafından yeni kullanıcı oluşturma.
      // Supabase signUp tek bir kimlik alıyor: email verilmişse email, yoksa telefon.
      const normalizedPhone = phone ? toE164(phone, dialCode) : null;
      if (!email && !normalizedPhone) {
        return { error: new Error('NO_IDENTIFIER'), userId: null };
      }
      if (phone && !normalizedPhone) {
        return { error: new Error('INVALID_PHONE'), userId: null };
      }

      // E-posta verilmemişse numaradan teknik bir adres üretiliyor.
      const loginEmail = email || phoneToLoginEmail(phone!, dialCode)!;

      // Kullanıcı SUNUCU TARAFINDA oluşturuluyor. Client'tan signUp()
      // çağrılırsa tarayıcının oturumu yeni kullanıcıya geçiyor; sonraki
      // profil/iletişim yazmaları o kimlikle çalışıp RLS'e takılıyor ve
      // sessizce yarım kayıt bırakıyordu. Ayrıca yönetici kendi oturumunu
      // kaybediyordu.
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          loginEmail,
          email: email || null,
          phone: normalizedPhone,
          password,
          fullName,
          role,
          apartmentInfo: apartmentInfo ?? null,
          residentId: extra?.residentId,
          contactType: extra?.contactType ?? 'owner',
          contactPhone: extra?.contactPhone ?? normalizedPhone ?? '',
          isPrimary: extra?.isPrimary ?? false
        }
      });

      if (error) {
        const status: number | undefined = (error as { context?: { status?: number } }).context?.status;
        let serverError: string | undefined;
        let detail: string | undefined;
        try {
          const b = await (error as { context?: Response }).context?.json();
          serverError = b?.error;
          detail = b?.detail;
        } catch { /* gövde okunamadı */ }

        console.error('createUser failed:', { status, serverError, detail });
        if (status === 404) return { error: new Error('NOT_DEPLOYED'), userId: null };
        return { error: new Error(detail || serverError || 'CREATE_FAILED'), userId: null };
      }

      if (data?.contactWarning) {
        console.warn('İletişim kişisi eklenemedi:', data.contactWarning);
      }

      return { error: null, userId: data?.userId ?? null };
    } catch (error) {
      return { error: error as Error, userId: null };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      // Clear state first to ensure we don't use stale data
      setUserProfile(null);
      // Clear cache and force refresh from server
      delete profileCache.current[user.id];
      await loadUserProfile(user.id, true);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    userProfile,
    userRole: userProfile?.role || null,
    loading,
    signIn,
    createUser,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
