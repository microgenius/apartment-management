import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { userProfilesService, type UserProfile } from '../services/userProfilesService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  userRole: 'resident' | 'admin' | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  createUser: (email: string, password: string, fullName: string, role: 'resident' | 'admin', apartmentInfo?: string) => Promise<{ error: Error | null }>;
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
      console.log('✨ Using cached profile for:', userId);
      setUserProfile(profileCache.current[userId]);
      return;
    }

    // Prevent concurrent fetches for same user
    if (fetchingProfile.current[userId]) {
      console.log('⏳ Already fetching profile for:', userId);
      return;
    }

    console.log('🔄 loadUserProfile called for:', userId, force ? '(FORCE REFRESH)' : '');
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
      console.log('📦 Profile result from server:', profile);
      
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
    console.log('🔐 AuthContext: Starting auth initialization...');
    
    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('✅ Session fetched:', session ? 'User logged in' : 'No active session');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('👤 Loading user profile for:', session.user.email);
        await loadUserProfile(session.user.id);
      }
      console.log('✅ Setting loading to false');
      setLoading(false);
    }).catch((error) => {
      console.error('❌ Error getting session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔄 Auth state changed:', _event);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('👤 Loading profile after auth change...');
        await loadUserProfile(session.user.id);
        console.log('✅ Profile loaded after auth change');
      } else {
        setUserProfile(null);
      }
      console.log('✅ Setting loading to FALSE after auth change');
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const createUser = async (email: string, password: string, fullName: string, role: 'resident' | 'admin', apartmentInfo?: string) => {
    try {
      // Admin tarafından yeni kullanıcı oluşturma
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: undefined, // Email confirmation linkini devre dışı bırak
        },
      });

      if (error) return { error };

      // Profile'ı manuel oluştur (trigger çalışmayabilir)
      if (data.user) {
        await userProfilesService.createProfile(data.user.id, fullName, role, apartmentInfo);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 Refreshing profile - clearing state and cache');
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
