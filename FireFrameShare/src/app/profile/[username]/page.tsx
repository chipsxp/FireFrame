"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/auth/protected-route";
import Header from "@/components/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Grid3x3,
  Edit,
  Mail,
  Link as LinkIcon,
  Phone,
  MessageSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Post, User } from "@/lib/types";
import { usePostStore } from "@/hooks/use-post-store";
import { getPostsByUser, subscribeToUserPosts } from "@/lib/supabase-posts";

// Mock posts for the profile page
const initialUserPosts: Post[] = Array.from({ length: 15 }).map((_, i) => ({
  id: `post${i + 1}`,
  author: {
    username: "testuser",
    avatarUrl: "https://placehold.co/100x100.png",
  },
  imageUrl: `https://placehold.co/300x300.png?i=${i}`,
  caption: `This is post number ${i + 1}. A beautiful placeholder image.`,
  likes: Math.floor(Math.random() * 200),
  comments: Math.floor(Math.random() * 50),
  createdAt: new Date(
    Date.now() - i * 1000 * 60 * 60 * 24 * (Math.random() * 2 + 1)
  ).toISOString(),
}));

export default function ProfilePage({
  params: paramsPromise,
}: {
  params: Promise<{ username: string }>;
}) {
  const params = use(paramsPromise);
  const { isAuthenticated, user, isLoading, updateProfile, uploadAvatar } =
    useAuth();
  const router = useRouter();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editedCaption, setEditedCaption] = useState("");
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);

  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<User>>({});

  const { posts: allPosts, updatePost: updateStorePost } = usePostStore();
  const [userPosts, setUserPosts] = useState<Post[]>([]);

  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [titleFilter, setTitleFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Move these state declarations to the top to avoid reference errors
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    // Fetch user posts from Firebase
    const fetchUserPosts = async () => {
      try {
        if (params.username === "testuser") {
          // Keep mock posts for testuser
          const postsWithUsername = initialUserPosts.map((p) => ({
            ...p,
            author: { ...p.author, username: params.username },
          }));
          setUserPosts(postsWithUsername);
        } else {
          // Fetch real posts from Firebase
          const posts = await getPostsByUser(params.username);
          setUserPosts(posts);

          // Set up real-time listener for user posts
          const unsubscribe = subscribeToUserPosts(params.username, (posts) => {
            setUserPosts(posts);
          });

          // Cleanup function
          return () => unsubscribe();
        }
      } catch (error) {
        console.error("Error fetching user posts:", error);
        setUserPosts([]);
      }
    };

    fetchUserPosts();
  }, [params.username]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    let result = userPosts;
    if (titleFilter) {
      result = result.filter((post) =>
        post.caption.toLowerCase().includes(titleFilter.toLowerCase())
      );
    }
    if (dateFilter) {
      result = result.filter((post) => post.createdAt?.startsWith(dateFilter));
    }
    setFilteredPosts(result);
  }, [titleFilter, dateFilter, userPosts]);

  const isOwnProfile = user?.username === params.username;

  // Load profile data - MOVED BEFORE EARLY RETURN TO FIX HOOKS ERROR
  useEffect(() => {
    const loadProfile = async () => {
      // If this is the user's own profile and we have user data
      if (isOwnProfile && user) {
        // Only update if we don't already have the profile data or if the user data changed
        if (!profileUser || profileUser.id !== user.id) {
          console.log("👤 Loading own profile:", user);
          setProfileUser(user);
        }
        setProfileLoading(false);
        return;
      }

      // Don't clear profileUser if we're waiting for user data to load
      if (isOwnProfile && !user && isLoading) {
        console.log("⏳ Waiting for user data to load...");
        return;
      }

      // If this is someone else's profile, load from database
      if (!isOwnProfile) {
        // Only load if we don't already have the profile data for this username
        if (!profileUser || profileUser.username !== params.username) {
          setProfileLoading(true);
          try {
            const { data, error } = await supabase
              .from("users")
              .select("*")
              .eq("username", params.username)
              .single();

            if (error) {
              console.error("Error loading profile:", error);
              // Create a fallback profile
              setProfileUser({
                id: "unknown",
                username: params.username,
                email: "user@example.com",
                avatarUrl: "https://placehold.co/150x150.png",
                bio: `This is the profile of ${params.username}.`,
                contacts: {
                  website: { value: "", isPublic: false },
                  phone: { value: "", isPublic: false },
                  messaging: { platform: "", username: "", isPublic: false },
                },
              });
            } else {
              setProfileUser({
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
              });
            }
          } catch (error) {
            console.error("Error loading profile:", error);
          } finally {
            setProfileLoading(false);
          }
        }
      }
    };

    // Only load profile when we have the necessary data
    if (!isLoading && (user || !isOwnProfile)) {
      console.log(
        "🔄 Loading profile - isOwnProfile:",
        isOwnProfile,
        "user:",
        !!user,
        "isLoading:",
        isLoading
      );
      loadProfile();
    } else {
      console.log(
        "⏸️ Skipping profile load - isOwnProfile:",
        isOwnProfile,
        "user:",
        !!user,
        "isLoading:",
        isLoading
      );
    }
  }, [user, params.username, isOwnProfile, isLoading]);

  // Debug useEffect to track profileUser changes
  useEffect(() => {
    console.log(
      "🔍 ProfileUser state changed:",
      profileUser ? "has data" : "null/undefined"
    );
    if (profileUser) {
      console.log("📊 ProfileUser data:", {
        username: profileUser.username,
        avatarUrl: !!profileUser.avatarUrl,
        bio: !!profileUser.bio,
      });
    }
  }, [profileUser]);

  const handleEditClick = (post: Post) => {
    if (user?.username === params.username) {
      setSelectedPost(post);
      setEditedCaption(post.caption);
      setEditedImageUrl(post.imageUrl);
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveChanges = async () => {
    if (selectedPost) {
      try {
        const updatedPost = {
          ...selectedPost,
          caption: editedCaption,
          imageUrl: editedImageUrl || selectedPost.imageUrl,
        };

        // Update in Firebase (this will trigger the real-time listener)
        await updateStorePost(updatedPost);

        setIsEditDialogOpen(false);
        setSelectedPost(null);
        setEditedImageUrl(null);
      } catch (error) {
        console.error("Error updating post:", error);
        // You could show an error toast here
      }
    }
  };

  const handleEditProfileOpen = () => {
    if (user) {
      setEditedProfile(user);
      setIsEditProfileDialogOpen(true);
    }
  };

  const handleProfileChangesSave = async () => {
    try {
      console.log("🔄 Saving profile changes:", editedProfile);

      // Store current profileUser before update to prevent loss
      const currentProfileUser = profileUser;

      const { error } = await updateProfile(editedProfile);
      if (error) {
        console.error("❌ Error updating profile:", error);
        // You could show an error toast here
        return;
      }

      console.log("✅ Profile updated successfully");

      // Update the local profileUser state immediately after successful update
      // Use currentProfileUser as base to ensure we don't lose data
      if (isOwnProfile && currentProfileUser) {
        const updatedProfile = { ...currentProfileUser, ...editedProfile };
        console.log("🔄 Updating local profileUser state:", updatedProfile);
        setProfileUser(updatedProfile);
      }

      setIsEditProfileDialogOpen(false);
    } catch (error) {
      console.error("❌ Exception updating profile:", error);
    }
  };

  const handleProfileInputChange = (field: keyof User, value: any) => {
    setEditedProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (
    contact: keyof NonNullable<User["contacts"]>,
    field: string,
    value: any
  ) => {
    setEditedProfile((prev) => ({
      ...prev,
      contacts: {
        ...prev.contacts,
        [contact]: {
          // @ts-ignore
          ...prev.contacts?.[contact],
          [field]: value,
        },
      },
    }));
  };

  if (isLoading || !isAuthenticated || profileLoading) {
    return (
      <div className="flex flex-col h-screen w-full bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-8">
              <Skeleton className="h-36 w-36 rounded-full" />
              <div className="space-y-4 flex-1">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-8">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const stats = [
    { label: "posts", value: userPosts.length },
    { label: "followers", value: "1.2k" },
    { label: "following", value: "342" },
  ];

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 w-full max-w-4xl mx-auto py-8 px-4">
          {(() => {
            if (!profileUser) {
              console.log("⚠️ ProfileUser is null/undefined, showing skeleton");
            }
            return null;
          })()}
          {!profileUser ? (
            // Show loading skeleton if profileUser is not loaded yet
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 mb-12">
              <Skeleton className="h-36 w-36 rounded-full" />
              <div className="space-y-4 flex-1">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-8">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 mb-12">
                <Avatar className="h-36 w-36 border-4 border-background ring-2 ring-primary">
                  <AvatarImage src={profileUser?.avatarUrl} />
                  <AvatarFallback>
                    {params.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-light">{params.username}</h1>
                    {isOwnProfile && (
                      <Button
                        variant="secondary"
                        onClick={handleEditProfileOpen}
                      >
                        Edit Profile
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-8">
                    {stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="text-center md:text-left"
                      >
                        <span className="font-semibold">{stat.value}</span>
                        <span className="text-muted-foreground ml-1">
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold">{profileUser?.username}</p>
                    <p className="text-muted-foreground text-sm">
                      {profileUser?.bio}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-muted-foreground" />
                      <a
                        href={`mailto:${profileUser?.email}`}
                        className="hover:underline"
                      >
                        {profileUser?.email}
                      </a>
                    </div>
                    {profileUser?.contacts?.website?.isPublic && (
                      <div className="flex items-center gap-2">
                        <LinkIcon size={16} className="text-muted-foreground" />
                        <a
                          href={profileUser.contacts.website.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {profileUser.contacts.website.value}
                        </a>
                      </div>
                    )}
                    {profileUser?.contacts?.phone?.isPublic && (
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-muted-foreground" />
                        <span>{profileUser.contacts.phone.value}</span>
                      </div>
                    )}
                    {profileUser?.contacts?.messaging?.isPublic && (
                      <div className="flex items-center gap-2">
                        <MessageSquare
                          size={16}
                          className="text-muted-foreground"
                        />
                        <span>
                          {profileUser.contacts.messaging.platform}:{" "}
                          {profileUser.contacts.messaging.username}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="border-t w-full justify-center rounded-none bg-transparent pt-2">
                  <TabsTrigger
                    value="posts"
                    className="gap-2 data-[state=active]:border-t-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none"
                  >
                    <Grid3x3 size={16} /> POSTS
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="posts">
                  {isOwnProfile && (
                    <div className="flex items-center gap-4 my-4 p-4 border rounded-lg bg-card">
                      <div className="flex flex-col gap-1">
                        <Label
                          htmlFor="caption-filter"
                          className="text-xs text-muted-foreground"
                        >
                          Filter by caption
                        </Label>
                        <Input
                          id="caption-filter"
                          name="caption-filter"
                          type="text"
                          placeholder="Filter by caption..."
                          className="max-w-sm"
                          value={titleFilter}
                          onChange={(e) => setTitleFilter(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label
                          htmlFor="date-filter"
                          className="text-xs text-muted-foreground"
                        >
                          Filter by date
                        </Label>
                        <Input
                          id="date-filter"
                          name="date-filter"
                          type="date"
                          className="max-w-sm"
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTitleFilter("");
                          setDateFilter("");
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-1 md:gap-4">
                    {filteredPosts.map((post) => (
                      <div
                        key={post.id}
                        className="relative aspect-square group"
                      >
                        <Image
                          src={post.imageUrl}
                          alt={`Post by ${post.author.username}`}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover rounded-md"
                          data-ai-hint="travel landscape"
                        />
                        {isOwnProfile && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                            <Button
                              variant="ghost"
                              className="text-white hover:bg-white/20"
                              onClick={() => handleEditClick(post)}
                            >
                              <Edit size={24} />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>

        {/* Edit Post Dialog */}
        {selectedPost && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Post</DialogTitle>
                <DialogDescription>
                  Make changes to your post here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Image</Label>
                  <div className="relative aspect-square">
                    <Image
                      src={editedImageUrl || selectedPost.imageUrl}
                      alt="Current post image"
                      fill
                      className="object-cover rounded-md"
                    />
                  </div>
                  <Input
                    type="file"
                    id="image"
                    className="mt-2"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEditedImageUrl(event.target?.result as string);
                        };
                        reader.readAsDataURL(e.target.files[0]);
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caption">Caption</Label>
                  <Textarea
                    id="caption"
                    value={editedCaption}
                    onChange={(e) => setEditedCaption(e.target.value)}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>User ID: {selectedPost.author.username} (not editable)</p>
                  <p>
                    Date:{" "}
                    {new Date(selectedPost.createdAt!).toLocaleDateString()}{" "}
                    (not editable)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="button" onClick={handleSaveChanges}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Profile Dialog */}
        <Dialog
          open={isEditProfileDialogOpen}
          onOpenChange={setIsEditProfileDialogOpen}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Make changes to your profile here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={editedProfile.avatarUrl} />
                    <AvatarFallback>
                      {editedProfile.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    id="avatar"
                    accept="image/*"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];

                        // Show preview immediately
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          handleProfileInputChange(
                            "avatarUrl",
                            event.target?.result as string
                          );
                        };
                        reader.readAsDataURL(file);

                        // Upload to Supabase storage
                        try {
                          console.log("📤 Uploading avatar...");
                          const { url, error } = await uploadAvatar(file);
                          if (error) {
                            console.error("❌ Error uploading avatar:", error);
                            // You could show an error toast here
                          } else if (url) {
                            console.log(
                              "✅ Avatar uploaded successfully:",
                              url
                            );
                            handleProfileInputChange("avatarUrl", url);
                            // Update profileUser state immediately since uploadAvatar already updated the database
                            if (isOwnProfile) {
                              console.log(
                                "🔄 Updating profileUser with new avatar"
                              );
                              setProfileUser((prev) =>
                                prev ? { ...prev, avatarUrl: url } : null
                              );
                            }
                          }
                        } catch (error) {
                          console.error(
                            "❌ Exception uploading avatar:",
                            error
                          );
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  autoComplete="off"
                  value={editedProfile.bio || ""}
                  onChange={(e) =>
                    handleProfileInputChange("bio", e.target.value)
                  }
                />
              </div>

              <h4 className="font-semibold text-lg border-t pt-4">
                Contact Information
              </h4>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={editedProfile.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email is always public and cannot be changed here.
                </p>
              </div>

              <div className="space-y-4 p-4 border rounded-md">
                <div className="flex justify-between items-center">
                  <Label htmlFor="website">Website</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="website-public"
                      checked={editedProfile.contacts?.website?.isPublic}
                      onCheckedChange={(checked) =>
                        handleContactChange("website", "isPublic", checked)
                      }
                    />
                    <Label htmlFor="website-public" className="text-xs">
                      {editedProfile.contacts?.website?.isPublic
                        ? "Public"
                        : "Private"}
                    </Label>
                  </div>
                </div>
                <Input
                  id="website"
                  type="url"
                  autoComplete="url"
                  value={editedProfile.contacts?.website?.value || ""}
                  onChange={(e) =>
                    handleContactChange("website", "value", e.target.value)
                  }
                  placeholder="https://your-website.com"
                />
              </div>

              <div className="space-y-4 p-4 border rounded-md">
                <div className="flex justify-between items-center">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="phone-public"
                      checked={editedProfile.contacts?.phone?.isPublic}
                      onCheckedChange={(checked) =>
                        handleContactChange("phone", "isPublic", checked)
                      }
                    />
                    <Label htmlFor="phone-public" className="text-xs">
                      {editedProfile.contacts?.phone?.isPublic
                        ? "Public"
                        : "Private"}
                    </Label>
                  </div>
                </div>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={editedProfile.contacts?.phone?.value || ""}
                  onChange={(e) =>
                    handleContactChange("phone", "value", e.target.value)
                  }
                  placeholder="123-456-7890"
                />
              </div>

              <div className="space-y-4 p-4 border rounded-md">
                <div className="flex justify-between items-center">
                  <Label htmlFor="messaging">Messaging</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="messaging-public"
                      checked={editedProfile.contacts?.messaging?.isPublic}
                      onCheckedChange={(checked) =>
                        handleContactChange("messaging", "isPublic", checked)
                      }
                    />
                    <Label htmlFor="messaging-public" className="text-xs">
                      {editedProfile.contacts?.messaging?.isPublic
                        ? "Public"
                        : "Private"}
                    </Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="messaging-platform"
                    type="text"
                    autoComplete="off"
                    value={editedProfile.contacts?.messaging?.platform || ""}
                    onChange={(e) =>
                      handleContactChange(
                        "messaging",
                        "platform",
                        e.target.value
                      )
                    }
                    placeholder="Platform (e.g., Telegram)"
                  />
                  <Input
                    id="messaging-username"
                    type="text"
                    autoComplete="off"
                    value={editedProfile.contacts?.messaging?.username || ""}
                    onChange={(e) =>
                      handleContactChange(
                        "messaging",
                        "username",
                        e.target.value
                      )
                    }
                    placeholder="@username"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleProfileChangesSave}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
