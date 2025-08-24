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

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ error: error.message, isLoading: false });
            return { error };
          }

          // Session will be handled by the auth state change listener
          // But we'll add a timeout to ensure loading doesn't get stuck
          setTimeout(() => {
            const currentState = get();
            if (currentState.isLoading && !currentState.session) {
              console.warn("Sign-in timeout, forcing loading to false");
              set({ isLoading: false });
            }
          }, 5000);

          return { error: null };
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Sign-in failed";
          set({ error: errorMessage, isLoading: false });
          return { error: { message: errorMessage } as any };
        }
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

        // Map camelCase properties to snake_case database columns
        const dbUpdates: any = {};

        if (updates.avatarUrl !== undefined) {
          dbUpdates.avatar_url = updates.avatarUrl;
        }
        if (updates.bio !== undefined) {
          dbUpdates.bio = updates.bio;
        }
        if (updates.username !== undefined) {
          dbUpdates.username = updates.username;
        }
        if (updates.email !== undefined) {
          dbUpdates.email = updates.email;
        }
        if (updates.contacts?.website !== undefined) {
          dbUpdates.website_url = updates.contacts.website.value;
          dbUpdates.website_public = updates.contacts.website.isPublic;
        }
        if (updates.contacts?.phone !== undefined) {
          dbUpdates.phone = updates.contacts.phone.value;
          dbUpdates.phone_public = updates.contacts.phone.isPublic;
        }
        if (updates.contacts?.messaging !== undefined) {
          dbUpdates.messaging_platform = updates.contacts.messaging.platform;
          dbUpdates.messaging_username = updates.contacts.messaging.username;
          dbUpdates.messaging_public = updates.contacts.messaging.isPublic;
        }

        const { error } = await supabase
          .from("users")
          .update(dbUpdates)
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
        // Don't persist loading states to avoid stuck states
      }),
      // Reset loading state on hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = true; // Will be set to false by auth initialization
          state.isAuthenticated = !!state.user;
        }
      },
    }
  )
);

// Helper function to fetch user profile from database
const fetchUserProfile = async (
  supabaseUser: SupabaseUser
): Promise<User | null> => {
  console.log("🔍 Fetching user profile for:", supabaseUser.id);
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", supabaseUser.id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error,
      });

      // If user doesn't exist in users table, try to create one
      if (error.code === "PGRST116") {
        console.log(
          "🔄 User not found in users table, attempting to create..."
        );
        return await createUserProfile(supabaseUser);
      }

      // For other errors, still try to create the user profile as a fallback
      console.log(
        "🔄 Database error occurred, attempting to create user profile as fallback..."
      );
      return await createUserProfile(supabaseUser);
    }

    console.log("✅ User profile fetched successfully:", data.username);

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

    // Create user profile with all required fields
    const { data, error } = await supabase
      .from("users")
      .insert({
        id: supabaseUser.id,
        username: username,
        email: supabaseUser.email,
        avatar_url: null,
        bio: null,
        website_url: null,
        website_public: false,
        phone: null,
        phone_public: false,
        messaging_platform: null,
        messaging_username: null,
        messaging_public: false,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Failed to create user profile:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error,
      });

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
    let isInitialized = false;
    let timeoutId: NodeJS.Timeout;

    // Add timeout to prevent infinite loading (only if not already authenticated)
    if (!useAuthStore.getState().isAuthenticated) {
      timeoutId = setTimeout(() => {
        console.warn(
          "⏰ Auth initialization timeout, forcing loading to false"
        );
        useAuthStore.getState().setLoading(false);
      }, 10000); // Increased to 10 seconds and only runs if not authenticated
    }

    // Listen for auth changes (handles sign in/out events after initialization)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session);

      // Skip INITIAL_SESSION event to avoid duplicate processing
      if (event === "INITIAL_SESSION") {
        console.log(
          "⏭️ Skipping INITIAL_SESSION event (handled by initializeAuth)"
        );
        return;
      }

      if (timeoutId) clearTimeout(timeoutId); // Clear timeout when auth state changes

      if (session?.user) {
        console.log("👤 Session found, fetching user profile...");
        try {
          const userProfile = await fetchUserProfile(session.user);
          useAuthStore.getState().setSession(session);
          useAuthStore.getState().setUser(userProfile);
          useAuthStore.getState().setLoading(false);
        } catch (profileError) {
          console.error("💥 Failed to fetch user profile:", profileError);
          // Still set the session but with a minimal user object
          useAuthStore.getState().setSession(session);
          useAuthStore.getState().setUser({
            id: session.user.id,
            username: session.user.email?.split("@")[0] || "user",
            email: session.user.email || "",
            contacts: {
              website: { value: "", isPublic: false },
              phone: { value: "", isPublic: false },
              messaging: { platform: "", username: "", isPublic: false },
            },
          });
          useAuthStore.getState().setLoading(false);
        }
      } else {
        console.log("❌ No session found");
        useAuthStore.getState().setSession(null);
        useAuthStore.getState().setUser(null);
        useAuthStore.getState().setLoading(false);
      }
    });

    // Initialize auth state
    const initializeAuth = async () => {
      console.log("🚀 Initializing auth...");
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          console.log("👤 Initial session found, fetching user profile...");
          try {
            const userProfile = await fetchUserProfile(session.user);
            useAuthStore.getState().setSession(session);
            useAuthStore.getState().setUser(userProfile);
            useAuthStore.getState().setLoading(false);
          } catch (profileError) {
            console.error(
              "💥 Failed to fetch initial user profile:",
              profileError
            );
            // Still set the session but with a minimal user object
            useAuthStore.getState().setSession(session);
            useAuthStore.getState().setUser({
              id: session.user.id,
              username: session.user.email?.split("@")[0] || "user",
              email: session.user.email || "",
              contacts: {
                website: { value: "", isPublic: false },
                phone: { value: "", isPublic: false },
                messaging: { platform: "", username: "", isPublic: false },
              },
            });
            useAuthStore.getState().setLoading(false);
          }
        } else {
          console.log("❌ No initial session found");
          useAuthStore.getState().setSession(null);
          useAuthStore.getState().setUser(null);
          useAuthStore.getState().setLoading(false);
        }

        isInitialized = true;
        console.log("✅ Auth initialization complete");
        if (timeoutId) clearTimeout(timeoutId);
      } catch (error) {
        console.error("💥 Error initializing auth:", error);
        useAuthStore.getState().setLoading(false);
        isInitialized = true;
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    initializeAuth();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return state;
};
