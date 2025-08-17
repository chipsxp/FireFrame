"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Image as ImageIcon, Upload, X } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import type { User, Post } from "@/lib/types";
import { usePostStore } from "@/hooks/use-post-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NewPostDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: User;
}

export default function NewPostDialog({
  isOpen,
  onOpenChange,
  user,
}: NewPostDialogProps) {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { addPost } = usePostStore();

  const cleanupCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (isCameraActive) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error("Error accessing camera:", error);
          setHasCameraPermission(false);
          toast({
            variant: "destructive",
            title: "Camera Access Denied",
            description:
              "Please enable camera permissions in your browser settings.",
          });
          setIsCameraActive(false);
        }
      };
      getCameraPermission();
    } else {
      cleanupCamera();
    }

    return () => {
      cleanupCamera();
    };
  }, [isCameraActive, toast, cleanupCamera]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(event.target.files[0]);
      setIsCameraActive(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);
      setIsCameraActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL("image/png");
      setImage(dataUrl);
      setIsCameraActive(false);
    }
  };

  const resetDialog = () => {
    setImage(null);
    setCaption("");
    setIsCameraActive(false);
    cleanupCamera();
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  const handleSubmit = async () => {
    if (!image) {
      toast({
        variant: "destructive",
        title: "No Image",
        description: "Please select an image or take a photo.",
      });
      return;
    }

    try {
      const newPost = {
        author: {
          username: user.username,
          avatarUrl: user.avatarUrl || "",
        },
        imageUrl: image,
        caption: caption,
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
      };

      await addPost(newPost);

      toast({
        title: "Post Created",
        description: "Your new post has been added to the feed.",
      });

      handleClose(false);
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create post. Please try again.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl lg:max-w-5xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
          <DialogDescription>
            Upload a photo or use your camera, write a caption, and share it
            with your followers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          <div
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 min-h-[28rem] lg:min-h-[32rem] w-full transition-all duration-200 ${
              isDragOver
                ? "border-primary bg-primary/10 scale-[1.02]"
                : "border-muted-foreground/25 bg-muted/50 hover:border-muted-foreground/40 hover:bg-muted/70"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!image && !isCameraActive && (
              <div className="text-center space-y-6 w-full max-w-sm">
                <ImageIcon className="mx-auto h-16 w-16 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">
                    {isDragOver ? "Drop your image here" : "Upload your photo"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isDragOver
                      ? "Release to upload"
                      : "Drag and drop or click to select"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-11"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Upload Image
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsCameraActive(true)}
                    className="flex-1 h-11"
                  >
                    <Camera className="mr-2 h-4 w-4" /> Use Camera
                  </Button>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            )}

            {image && !isCameraActive && (
              <div className="relative w-full h-full">
                <Image
                  src={image}
                  alt="Selected preview"
                  layout="fill"
                  objectFit="contain"
                  className="rounded-md"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 rounded-full h-8 w-8"
                  onClick={() => setImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {isCameraActive && (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4 p-4">
                <video
                  ref={videoRef}
                  className="w-full h-auto max-h-[20rem] rounded-lg shadow-lg"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />
                {hasCameraPermission === false && (
                  <Alert variant="destructive" className="max-w-sm">
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                      Please enable camera permissions in your browser settings
                      to use this feature.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                  <Button
                    onClick={handleCapture}
                    disabled={!hasCameraPermission}
                    className="flex-1 h-11"
                  >
                    Capture Photo
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsCameraActive(false)}
                    className="flex-1 h-11"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold">{user.username}</span>
            </div>
            <div>
              <Label htmlFor="caption" className="sr-only">
                Caption
              </Label>
              <Textarea
                id="caption"
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={10}
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
          <Button type="button" onClick={handleSubmit}>
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
