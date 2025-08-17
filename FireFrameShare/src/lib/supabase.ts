import { createClient } from "@supabase/supabase-js";

// Supabase configuration with fallback values for debugging
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug environment variables (remove after testing)
console.log("🔍 Environment Debug:");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log(
  "- URL from env:",
  process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Loaded" : "❌ Missing"
);
console.log(
  "- Anon Key from env:",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Loaded" : "❌ Missing"
);
console.log("- Final URL:", supabaseUrl);
console.log(
  "- Final Anon Key (first 20 chars):",
  supabaseAnonKey?.substring(0, 20) + "..."
);

// Validate final values
if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

// Create Supabase client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Create Supabase client with service role for server-side operations
// Only use this for server-side operations that require elevated permissions
export const supabaseAdmin =
  typeof window === "undefined" && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

// Database and Storage references for convenience
export const db = supabase;
export const storage = supabase.storage;

// Log configuration (without sensitive data)
export const logSupabaseConfig = () => {
  console.log("Supabase Configuration:");
  console.log("- URL:", supabaseUrl);
  console.log("- Environment:", process.env.NODE_ENV);
  console.log("- Client initialized:", !!supabase);
};

// Initialize Supabase debugging
export const initSupabase = () => {
  console.log("🚀 Supabase initialized");
  logSupabaseConfig();

  // Test connection on initialization
  if (typeof window !== "undefined") {
    console.log("Client-side Supabase ready");
  } else {
    console.log("Server-side Supabase ready");
  }
};

export default supabase;
