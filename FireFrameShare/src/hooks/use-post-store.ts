"use client";

import { create } from "zustand";
import type { Post } from "@/lib/types";
import {
  addPost as supabaseAddPost,
  updatePost as supabaseUpdatePost,
  subscribeToAllPosts,
  getAllPosts,
} from "@/lib/supabase-posts";

interface PostState {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  addPost: (post: Omit<Post, "id">) => Promise<void>;
  updatePost: (updatedPost: Post) => Promise<void>;
  setPosts: (posts: Post[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initializePosts: () => Promise<void>;
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,

  addPost: async (post) => {
    try {
      set({ isLoading: true, error: null });
      const postId = await supabaseAddPost(post);
      // The real-time listener will update the posts automatically
      console.log("Post added successfully with ID:", postId);
    } catch (error) {
      console.error("Error adding post:", error);
      set({ error: "Failed to add post" });
    } finally {
      set({ isLoading: false });
    }
  },

  updatePost: async (updatedPost) => {
    try {
      set({ isLoading: true, error: null });
      await supabaseUpdatePost(updatedPost);
      // The real-time listener will update the posts automatically
      console.log("Post updated successfully");
    } catch (error) {
      console.error("Error updating post:", error);
      set({ error: "Failed to update post" });
    } finally {
      set({ isLoading: false });
    }
  },

  setPosts: (posts) => set({ posts }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  initializePosts: async () => {
    try {
      set({ isLoading: true, error: null });

      // Set up real-time listener
      const unsubscribe = subscribeToAllPosts((posts) => {
        set({ posts, isLoading: false });
      });

      // Store unsubscribe function for cleanup
      (get() as any).unsubscribe = unsubscribe;
    } catch (error) {
      console.error("Error initializing posts:", error);
      set({ error: "Failed to load posts", isLoading: false });

      // Fallback to one-time fetch
      try {
        const posts = await getAllPosts();
        set({ posts });
      } catch (fallbackError) {
        console.error("Fallback fetch also failed:", fallbackError);
      }
    }
  },
}));
