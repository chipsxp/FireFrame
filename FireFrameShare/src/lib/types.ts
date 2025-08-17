export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  contacts?: {
    website?: { value: string; isPublic: boolean };
    phone?: { value: string; isPublic: boolean };
    messaging?: { platform: string; username: string; isPublic: boolean };
  };
}

export interface Post {
  id: string;
  author: {
    username: string;
    avatarUrl: string;
  };
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  createdAt?: string;
}
