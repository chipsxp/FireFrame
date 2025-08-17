"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import {
  AuthError,
  Session,
  User as SupabaseUser,
} from "@supabase/supabase-js";
import { useEffect } from "react";

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // Auth methods
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (
    provider: "google" | "azure" | "discord" | "facebook"
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: Error | null }>;
  uploadAvatar: (
    file: File
  ) => Promise<{ url: string | null; error: Error | null }>;
  // Internal methods
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      signUp: async (email: string, password: string, username: string) => {
        console.log("🚀 Starting signup process...");
        console.log("- Email:", email);
        console.log("- Username:", username);
        console.log("- Supabase client:", !!supabase);

        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username,
              },
            },
          });

          console.log("📝 Signup response:", { data, error });

          if (error) {
            console.error("❌ Signup error:", error);
            set({ error: error.message, isLoading: false });
            return { error };
          }

          console.log("✅ Signup successful!");
          // User will be created in the database via trigger
          set({ isLoading: false });
          return { error: null };
        } catch (err) {
          console.error("💥 Signup exception:", err);
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          set({ error: errorMessage, isLoading: false });
          return { error: { message: errorMessage } as any };
        }
      },

      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          set({ error: error.message, isLoading: false });
          return { error };
        }

        // Session will be handled by the auth state change listener
        return { error: null };
      },

      signInWithOAuth: async (
        provider: "google" | "azure" | "discord" | "facebook"
      ) => {
        set({ isLoading: true, error: null });

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          set({ error: error.message, isLoading: false });
          return { error };
        }

        return { error: null };
      },

      signOut: async () => {
        set({ isLoading: true });
        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });

        if (error) {
          set({ error: error.message });
          return { error };
        }

        return { error: null };
      },

      updateProfile: async (updates: Partial<User>) => {
        const { user } = get();
        if (!user) {
          const error = new Error("No user logged in");
          set({ error: error.message });
          return { error };
        }

        set({ isLoading: true, error: null });

        const { error } = await supabase
          .from("users")
          .update(updates)
          .eq("id", user.id);

        if (error) {
          set({ error: error.message, isLoading: false });
          return { error: new Error(error.message) };
        }

        // Update local user state
        set({
          user: { ...user, ...updates },
          isLoading: false,
        });

        return { error: null };
      },

      uploadAvatar: async (file: File) => {
        const { user } = get();
        if (!user) {
          const error = new Error("No user logged in");
          return { url: null, error };
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, file, { upsert: true });

        if (uploadError) {
          return { url: null, error: new Error(uploadError.message) };
        }

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        const avatarUrl = data.publicUrl;

        // Update user profile with new avatar URL
        const { error: updateError } = await get().updateProfile({ avatarUrl });

        if (updateError) {
          return { url: null, error: updateError };
        }

        return { url: avatarUrl, error: null };
      },

      setSession: (session: Session | null) => {
        set({ session, isAuthenticated: !!session });
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user, isLoading: false });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user data, not session (Supabase handles session persistence)
        user: state.user,
      }),
    }
  )
);

// Helper function to fetch user profile from database
const fetchUserProfile = async (
  supabaseUser: SupabaseUser
): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", supabaseUser.id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);

      // If user doesn't exist in users table, try to create one
      if (error.code === "PGRST116") {
        console.log(
          "🔄 User not found in users table, attempting to create..."
        );
        return await createUserProfile(supabaseUser);
      }

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
          value: data.website_url || "",
          isPublic: data.website_public || false,
        },
        phone: {
          value: data.phone || "",
          isPublic: data.phone_public || false,
        },
        messaging: {
          platform: data.messaging_platform || "",
          username: data.messaging_username || "",
          isPublic: data.messaging_public || false,
        },
      },
    };
  } catch (err) {
    console.error("Exception in fetchUserProfile:", err);
    return null;
  }
};

// Helper function to create a user profile when one doesn't exist
const createUserProfile = async (
  supabaseUser: SupabaseUser
): Promise<User | null> => {
  try {
    const username =
      supabaseUser.user_metadata?.username ||
      supabaseUser.email?.split("@")[0] ||
      "user";

    console.log("📝 Creating user profile for:", {
      id: supabaseUser.id,
      email: supabaseUser.email,
      username: username,
    });

    const { data, error } = await supabase
      .from("users")
      .insert({
        id: supabaseUser.id,
        username: username,
        email: supabaseUser.email,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Failed to create user profile:", error);

      // Return a minimal user object to prevent app crashes
      return {
        id: supabaseUser.id,
        username: username,
        email: supabaseUser.email || "",
        contacts: {
          website: { value: "", isPublic: false },
          phone: { value: "", isPublic: false },
          messaging: { platform: "", username: "", isPublic: false },
        },
      };
    }

    console.log("✅ User profile created successfully:", data);

    return {
      id: data.id,
      username: data.username,
      email: data.email,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      contacts: {
        website: {
          value: data.website_url || "",
          isPublic: data.website_public || false,
        },
        phone: {
          value: data.phone || "",
          isPublic: data.phone_public || false,
        },
        messaging: {
          platform: data.messaging_platform || "",
          username: data.messaging_username || "",
          isPublic: data.messaging_public || false,
        },
      },
    };
  } catch (err) {
    console.error("💥 Exception in createUserProfile:", err);

    // Return a minimal user object as last resort
    return {
      id: supabaseUser.id,
      username:
        supabaseUser.user_metadata?.username ||
        supabaseUser.email?.split("@")[0] ||
        "user",
      email: supabaseUser.email || "",
      contacts: {
        website: { value: "", isPublic: false },
        phone: { value: "", isPublic: false },
        messaging: { platform: "", username: "", isPublic: false },
      },
    };
  }
};

// Custom hook to initialize and use the store
export const useAuth = () => {
  const state = useAuthStore();

  useEffect(() => {
    // Initialize auth state
    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user);
        useAuthStore.getState().setSession(session);
        useAuthStore.getState().setUser(userProfile);
      } else {
        useAuthStore.getState().setLoading(false);
      }
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session);

      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user);
        useAuthStore.getState().setSession(session);
        useAuthStore.getState().setUser(userProfile);
      } else {
        useAuthStore.getState().setSession(null);
        useAuthStore.getState().setUser(null);
      }
    });

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return state;
};
