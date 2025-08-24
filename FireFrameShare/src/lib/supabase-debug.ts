import { supabase, logSupabaseConfig } from "./supabase";

// Test Supabase connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log("Testing Supabase connection...");

    // Test database connection by querying a simple table
    const { data, error } = await supabase
      .from("posts")
      .select("count")
      .limit(1);

    if (error) {
      // If posts table doesn't exist yet, that's okay - connection is still working
      if (
        error.code === "PGRST116" ||
        error.message.includes("does not exist")
      ) {
        console.log(
          "✅ Supabase connection successful! (Posts table not yet created)"
        );
        return true;
      }
      throw error;
    }

    console.log("✅ Supabase connection successful!");
    console.log("Database query result:", data);
    return true;
  } catch (error) {
    console.error("❌ Supabase connection error:", error);
    return false;
  }
};

// Test Supabase Storage connection
export const testSupabaseStorage = async (): Promise<boolean> => {
  try {
    console.log("Testing Supabase Storage connection...");

    // List buckets to test storage connection
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      throw error;
    }

    console.log("✅ Supabase Storage connection successful!");
    console.log(
      "Available buckets:",
      data.map((bucket) => bucket.name)
    );
    return true;
  } catch (error) {
    console.error("❌ Supabase Storage connection error:", error);
    return false;
  }
};

// Test Supabase Auth connection
export const testSupabaseAuth = async (): Promise<boolean> => {
  try {
    console.log("Testing Supabase Auth connection...");

    // Get current session to test auth connection
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    console.log("✅ Supabase Auth connection successful!");
    console.log(
      "Current session:",
      session ? "Authenticated" : "Not authenticated"
    );
    return true;
  } catch (error) {
    console.error("❌ Supabase Auth connection error:", error);
    return false;
  }
};

// Comprehensive Supabase connection test
export const testAllSupabaseServices = async (): Promise<{
  database: boolean;
  storage: boolean;
  auth: boolean;
  overall: boolean;
}> => {
  console.log("🧪 Running comprehensive Supabase service tests...");

  const results = {
    database: await testSupabaseConnection(),
    storage: await testSupabaseStorage(),
    auth: await testSupabaseAuth(),
    overall: false,
  };

  results.overall = results.database && results.storage && results.auth;

  if (results.overall) {
    console.log("🎉 All Supabase services are working correctly!");
  } else {
    console.log("⚠️ Some Supabase services may need attention:");
    console.log("- Database:", results.database ? "✅" : "❌");
    console.log("- Storage:", results.storage ? "✅" : "❌");
    console.log("- Auth:", results.auth ? "✅" : "❌");
  }

  return results;
};

// Initialize Supabase debugging
export const initSupabaseDebug = async (): Promise<boolean> => {
  console.log("🚀 Supabase Debug Mode");
  logSupabaseConfig();

  const isConnected = await testSupabaseConnection();

  if (!isConnected) {
    console.log("🚨 Supabase connection failed. Posts will not persist.");
    console.log("💡 Make sure Supabase is properly configured and accessible.");
    console.log("📋 Check your environment variables:");
    console.log("   - NEXT_PUBLIC_SUPABASE_URL");
    console.log("   - NEXT_PUBLIC_SUPABASE_ANON_KEY");
    console.log("   - SUPABASE_SERVICE_ROLE_KEY (for server-side operations)");
  }

  return isConnected;
};

// Database schema validation
export const validateDatabaseSchema = async (): Promise<{
  postsTable: boolean;
  usersTable: boolean;
  requiredColumns: boolean;
}> => {
  try {
    console.log("🔍 Validating database schema...");

    // Check if posts table exists and has required columns
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select(
        "id, author_username, author_avatar_url, image_url, caption, likes, comments, created_at"
      )
      .limit(1);

    // Check if users table exists and has required columns
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select(
        "id, username, email, avatar_url, bio, website_url, website_public, phone, phone_public, messaging_platform, messaging_username, messaging_public"
      )
      .limit(1);

    const results = {
      postsTable: !postsError,
      usersTable: !usersError,
      requiredColumns:
        !postsError && postsData !== null && !usersError && usersData !== null,
    };

    console.log("Schema validation results:");
    console.log("- Posts table:", results.postsTable ? "✅" : "❌");
    console.log("- Users table:", results.usersTable ? "✅" : "❌");
    console.log("- Required columns:", results.requiredColumns ? "✅" : "❌");

    if (!results.postsTable || !results.usersTable) {
      console.log(
        "💡 Run the database schema SQL from the migration guide to create missing tables."
      );
    }

    return results;
  } catch (error) {
    console.error("❌ Schema validation error:", error);
    return {
      postsTable: false,
      usersTable: false,
      requiredColumns: false,
    };
  }
};
