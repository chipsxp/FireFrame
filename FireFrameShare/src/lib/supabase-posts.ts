import { supabase, storage } from "./supabase";
import type { Post } from "./types";

// Upload image to Supabase Storage
export const uploadImage = async (
  file: File,
  path: string
): Promise<string> => {
  try {
    console.log("Uploading image to Supabase Storage...");

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${path}/${fileName}`;

    const { data, error } = await storage
      .from("post-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = storage.from("post-images").getPublicUrl(data.path);

    console.log("✅ Image uploaded successfully:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("❌ Error uploading image to Supabase Storage:", error);
    throw new Error(`Failed to upload image: ${error}`);
  }
};

// Upload base64 image to Supabase Storage
export const uploadBase64Image = async (
  base64Data: string,
  path: string
): Promise<string> => {
  try {
    console.log("Converting and uploading base64 image to Supabase Storage...");
    console.log("- Path:", path);
    console.log("- Base64 data length:", base64Data.length);

    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();
    console.log("- Blob size:", blob.size, "bytes");
    console.log("- Blob type:", blob.type);

    const fileName = `${Date.now()}.png`;
    const filePath = `${path}/${fileName}`;
    console.log("- Upload path:", filePath);

    const { data, error } = await storage
      .from("post-images")
      .upload(filePath, blob, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("❌ Storage upload error:", {
        message: error.message,
        error: error,
      });
      throw error;
    }

    console.log("✅ Storage upload successful:", data);

    // Get public URL
    const {
      data: { publicUrl },
    } = storage.from("post-images").getPublicUrl(data.path);

    console.log("✅ Base64 image uploaded successfully:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error(
      "❌ Error uploading base64 image to Supabase Storage:",
      error
    );
    throw new Error(`Failed to upload base64 image: ${error}`);
  }
};

// Add a new post
export const addPost = async (post: Omit<Post, "id">): Promise<string> => {
  try {
    console.log("🚀 Starting post creation process...");
    console.log("- Author:", post.author.username);
    console.log("- Caption:", post.caption);
    console.log(
      "- Image type:",
      post.imageUrl.startsWith("data:") ? "base64" : "url"
    );

    // If imageUrl is base64, upload it to storage
    let imageUrl = post.imageUrl;
    if (post.imageUrl.startsWith("data:")) {
      console.log("📤 Uploading base64 image to storage...");
      imageUrl = await uploadBase64Image(
        post.imageUrl,
        `posts/${post.author.username}`
      );
      console.log("✅ Image uploaded, URL:", imageUrl);
    }

    const postData = {
      author_username: post.author.username,
      author_avatar_url: post.author.avatarUrl,
      image_url: imageUrl,
      caption: post.caption,
      likes: post.likes || 0,
      comments: post.comments || 0,
      created_at: new Date().toISOString(),
    };

    console.log("💾 Inserting post data into database...");
    console.log("- Post data:", postData);

    const { data, error } = await supabase
      .from("posts")
      .insert([postData])
      .select()
      .single();

    if (error) {
      console.error("❌ Database insert error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error: error,
      });
      throw error;
    }

    console.log("✅ Post created successfully with ID:", data.id);
    return data.id;
  } catch (error) {
    console.error("💥 Error adding post:", error);
    throw error;
  }
};

// Get all posts
export const getAllPosts = async (): Promise<Post[]> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data.map(convertSupabaseToPost);
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
};

// Get posts by user
export const getPostsByUser = async (username: string): Promise<Post[]> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("author_username", username)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data.map(convertSupabaseToPost);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    throw error;
  }
};

// Update a post
export const updatePost = async (updatedPost: Post): Promise<void> => {
  try {
    const { error } = await supabase
      .from("posts")
      .update({
        caption: updatedPost.caption,
        likes: updatedPost.likes,
        comments: updatedPost.comments,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updatedPost.id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error updating post:", error);
    throw error;
  }
};

// Delete a post
export const deletePost = async (postId: string): Promise<void> => {
  try {
    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
};

// Subscribe to all posts with real-time updates
export const subscribeToAllPosts = (callback: (payload: any) => void) => {
  console.log("Setting up real-time subscription for all posts...");

  // Initial fetch
  getAllPosts()
    .then((posts) => callback({ type: "INITIAL_LOAD", posts }))
    .catch(console.error);

  // Set up real-time subscription
  const subscription = supabase
    .channel("posts")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "posts" },
      (payload) => {
        callback({ type: "REALTIME_UPDATE", payload });
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    console.log("Unsubscribing from posts real-time updates");
    subscription.unsubscribe();
  };
};

// Subscribe to user posts with real-time updates
export const subscribeToUserPosts = (
  username: string,
  callback: (posts: Post[]) => void
) => {
  console.log(`Setting up real-time subscription for ${username} posts...`);

  // Initial fetch
  getPostsByUser(username).then(callback).catch(console.error);

  // Set up real-time subscription
  const subscription = supabase
    .channel(`user-posts-${username}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "posts",
        filter: `author_username=eq.${username}`,
      },
      () => {
        // Refetch user posts when any change occurs
        getPostsByUser(username).then(callback).catch(console.error);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    console.log(`Unsubscribing from ${username} posts real-time updates`);
    subscription.unsubscribe();
  };
};

// Convert Supabase row to Post type
export const convertSupabaseToPost = (row: any): Post => ({
  id: row.id,
  author: {
    username: row.author_username,
    avatarUrl: row.author_avatar_url,
  },
  imageUrl: row.image_url,
  caption: row.caption,
  likes: row.likes,
  comments: row.comments,
  createdAt: row.created_at,
});
