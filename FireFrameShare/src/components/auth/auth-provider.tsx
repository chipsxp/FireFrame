"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '@/lib/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
});

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Helper function to fetch user profile from database
const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', supabaseUser.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    email: data.email,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    contacts: {
      website: { 
        value: data.website_url || '', 
        isPublic: data.website_public || false 
      },
      phone: { 
        value: data.phone || '', 
        isPublic: data.phone_public || false 
      },
      messaging: { 
        platform: data.messaging_platform || '', 
        username: data.messaging_username || '', 
        isPublic: data.messaging_public || false 
      },
    },
  };
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user);
        setSession(session);
        setUser(userProfile);
      }
      
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user);
          setSession(session);
          setUser(userProfile);
        } else {
          setSession(null);
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsLoading(false);
  };

  const value = {
    session,
    user,
    isLoading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
