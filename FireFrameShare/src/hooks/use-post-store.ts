"use client";

import { create } from "zustand";
import type { Post } from "@/lib/types";
import {
  addPost as supabaseAddPost,
  updatePost as supabaseUpdatePost,
  subscribeToAllPosts,
  convertSupabaseToPost,
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
  initializePosts: () => () => void; // Return unsubscribe function
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,

  addPost: async (post) => {
    try {
      set({ isLoading: true, error: null });
      await supabaseAddPost(post);
      // Real-time listener will handle the update
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
      // Real-time listener will handle the update
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

  initializePosts: () => {
    set({ isLoading: true, error: null });

    const handleRealtimeUpdate = (payload: any) => {
      if (payload.type === "INITIAL_LOAD") {
        set({ posts: payload.posts, isLoading: false });
        return;
      }

      if (payload.type === "REALTIME_UPDATE") {
        const { eventType, new: newRecord, old: oldRecord } = payload.payload;
        const currentPosts = get().posts;

        switch (eventType) {
          case "INSERT":
            set({ posts: [convertSupabaseToPost(newRecord), ...currentPosts] });
            break;
          case "UPDATE":
            set({
              posts: currentPosts.map((post) =>
                post.id === newRecord.id
                  ? convertSupabaseToPost(newRecord)
                  : post
              ),
            });
            break;
          case "DELETE":
            set({
              posts: currentPosts.filter((post) => post.id !== oldRecord.id),
            });
            break;
          default:
            break;
        }
      }
    };

    const unsubscribe = subscribeToAllPosts(handleRealtimeUpdate);

    return unsubscribe;
  },
}));
