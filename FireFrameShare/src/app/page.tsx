"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/auth/protected-route";
import Header from "@/components/header";
import PostCard from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  getSuggestedUsers,
  SuggestedUser,
} from "@/ai/flows/get-suggested-users-flow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Post } from "@/lib/types";
import { usePostStore } from "@/hooks/use-post-store";
import { initSupabaseDebug } from "@/lib/supabase-debug";

type Filter = "Trending" | "New" | "Following";

const initialPosts: Post[] = Array.from({ length: 5 }).map((_, i) => ({
  id: `${i}`,
  author: {
    username: `user_${i + 1}`,
    avatarUrl: `https://placehold.co/40x40.png`,
  },
  imageUrl: `https://placehold.co/600x400.png`,
  caption:
    "This is a beautiful placeholder image. A wonderful serenity has taken possession of my entire soul.",
  likes: Math.floor(Math.random() * 1000),
  comments: Math.floor(Math.random() * 100),
}));

export default function Home() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("Trending");
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const { posts, initializePosts, isLoading: postsLoading } = usePostStore();

  useEffect(() => {
    // Initialize Firebase debugging and posts when component mounts
    const initializeApp = async () => {
      if (isAuthenticated) {
        // Test Supabase connection first
        await initSupabaseDebug();

        // Then initialize posts
        initializePosts();
      }
    };

    initializeApp();
  }, [isAuthenticated, initializePosts]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (user) {
      setLoadingSuggestions(true);
      getSuggestedUsers({
        user: {
          username: user.username,
          interests: "photography, travel, nature",
        },
      })
        .then(setSuggestedUsers)
        .finally(() => setLoadingSuggestions(false));
    }
  }, [user]);

  const displayedPosts = [...posts].reverse();

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 w-full max-w-5xl mx-auto py-8 px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <div className="flex justify-start">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      {filter}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setFilter("Trending")}>
                      Trending
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setFilter("New")}>
                      New
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setFilter("Following")}>
                      Following
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {displayedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  data-ai-hint="social media post"
                />
              ))}
            </div>
            <aside className="hidden md:block md:col-span-1">
              <div className="sticky top-24 space-y-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Suggestions For You
                </h3>
                <div className="space-y-4">
                  {loadingSuggestions
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      ))
                    : suggestedUsers.map((suggestedUser) => (
                        <div
                          key={suggestedUser.username}
                          className="flex items-center space-x-4"
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={suggestedUser.avatarUrl} />
                            <AvatarFallback>
                              {suggestedUser.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <Link
                              href={`/profile/${suggestedUser.username}`}
                              className="font-semibold hover:underline"
                            >
                              {suggestedUser.username}
                            </Link>
                            <p className="text-sm text-muted-foreground truncate">
                              {suggestedUser.reason}
                            </p>
                          </div>
                          <Button variant="secondary" size="sm">
                            Follow
                          </Button>
                        </div>
                      ))}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
