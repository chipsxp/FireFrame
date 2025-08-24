import Image from "next/image";
import { Heart, MessageCircle, Send, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { Post } from "@/lib/types";

interface PostCardProps extends React.HTMLAttributes<HTMLDivElement> {
  post: Post;
  priority?: boolean;
}

export default function PostCard({
  post,
  priority = false,
  ...props
}: PostCardProps) {
  const authorInitial = post.author.username.charAt(0).toUpperCase();

  return (
    <Card
      className="w-full max-w-xl mx-auto rounded-xl shadow-lg overflow-hidden"
      {...props}
    >
      <CardHeader className="flex flex-row items-center gap-4 p-4">
        <Avatar>
          <AvatarImage src={post.author.avatarUrl} alt={post.author.username} />
          <AvatarFallback>{authorInitial}</AvatarFallback>
        </Avatar>
        <div className="font-semibold text-foreground">
          {post.author.username}
        </div>
        <Button variant="ghost" size="icon" className="ml-auto">
          <MoreHorizontal />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-square w-full">
          <Image
            src={post.imageUrl}
            alt={`Post by ${post.author.username}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            priority={priority}
            data-ai-hint="social media photo"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start p-4 gap-2">
        <div className="flex flex-row gap-2">
          <Button variant="ghost" size="icon">
            <Heart className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon">
            <MessageCircle className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon">
            <Send className="h-6 w-6" />
          </Button>
        </div>
        <div className="text-sm font-semibold">
          {post.likes.toLocaleString()} likes
        </div>
        <div className="text-sm">
          <span className="font-semibold mr-2">{post.author.username}</span>
          <span>{post.caption}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          View all {post.comments.toLocaleString()} comments
        </div>
      </CardFooter>
    </Card>
  );
}
