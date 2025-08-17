"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, PlusSquare, Search, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from './ui/input';
import NewPostDialog from './new-post-dialog';
import React from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isNewPostOpen, setIsNewPostOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between max-w-5xl mx-auto px-4">
          <Link href="/" className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            FireFrame
          </Link>
          <div className="hidden sm:flex flex-1 max-w-xs items-center relative">
             <Input placeholder="Search..." className="pl-10"/>
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <Home className="h-6 w-6" />
                <span className="sr-only">Home</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsNewPostOpen(true)}>
              <PlusSquare className="h-6 w-6" />
              <span className="sr-only">New Post</span>
            </Button>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatarUrl} alt={user.username} />
                      <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user.username}`}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
      </header>
      {user && <NewPostDialog isOpen={isNewPostOpen} onOpenChange={setIsNewPostOpen} user={user} />}
    </>
  );
}
