import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { Post } from "./types";

const POSTS_COLLECTION = "posts";

// Convert Firebase timestamp to ISO string
const convertTimestamp = (timestamp: any): string => {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString();
  }
  return timestamp || new Date().toISOString();
};

// Convert Post to Firestore document
const postToFirestore = (post: Post) => ({
  ...post,
  createdAt: post.createdAt
    ? Timestamp.fromDate(new Date(post.createdAt))
    : Timestamp.now(),
});

// Convert Firestore document to Post
const firestoreToPost = (doc: any): Post => ({
  id: doc.id,
  ...doc.data(),
  createdAt: convertTimestamp(doc.data().createdAt),
});

// Upload image to Firebase Storage
export const uploadImage = async (
  file: File,
  path: string
): Promise<string> => {
  try {
    console.log("Uploading image to Firebase Storage...");
    const storageRef = ref(
      storage,
      `images/${path}/${Date.now()}_${file.name}`
    );
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("✅ Image uploaded successfully:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("❌ Error uploading image to Firebase Storage:", error);
    throw new Error(`Failed to upload image: ${error}`);
  }
};

// Upload base64 image to Firebase Storage
export const uploadBase64Image = async (
  base64Data: string,
  path: string
): Promise<string> => {
  try {
    console.log("Converting and uploading base64 image to Firebase Storage...");

    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();

    const storageRef = ref(storage, `images/${path}/${Date.now()}.png`);
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("✅ Base64 image uploaded successfully:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error(
      "❌ Error uploading base64 image to Firebase Storage:",
      error
    );
    throw new Error(`Failed to upload base64 image: ${error}`);
  }
};

// Add a new post
export const addPost = async (post: Omit<Post, "id">): Promise<string> => {
  try {
    // If imageUrl is base64, upload it to storage
    let imageUrl = post.imageUrl;
    if (post.imageUrl.startsWith("data:")) {
      imageUrl = await uploadBase64Image(
        post.imageUrl,
        `posts/${post.author.username}`
      );
    }

    const postData = postToFirestore({ ...post, imageUrl });
    const docRef = await addDoc(collection(db, POSTS_COLLECTION), postData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding post:", error);
    throw error;
  }
};

// Get all posts
export const getAllPosts = async (): Promise<Post[]> => {
  try {
    const q = query(
      collection(db, POSTS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(firestoreToPost);
  } catch (error) {
    console.error("Error getting posts:", error);
    return [];
  }
};

// Get posts by user
export const getPostsByUser = async (username: string): Promise<Post[]> => {
  try {
    const q = query(
      collection(db, POSTS_COLLECTION),
      where("author.username", "==", username),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(firestoreToPost);
  } catch (error) {
    console.error("Error getting user posts:", error);
    return [];
  }
};

// Update a post
export const updatePost = async (
  postId: string,
  updates: Partial<Post>
): Promise<void> => {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    const updateData = { ...updates };

    // Handle image upload if needed
    if (updates.imageUrl && updates.imageUrl.startsWith("data:")) {
      updateData.imageUrl = await uploadBase64Image(
        updates.imageUrl,
        `posts/updated`
      );
    }

    await updateDoc(postRef, updateData);
  } catch (error) {
    console.error("Error updating post:", error);
    throw error;
  }
};

// Delete a post
export const deletePost = async (postId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, POSTS_COLLECTION, postId));
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
};

// Subscribe to posts changes (real-time)
export const subscribeToAllPosts = (callback: (posts: Post[]) => void) => {
  const q = query(
    collection(db, POSTS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      const posts = querySnapshot.docs.map(firestoreToPost);
      callback(posts);
    },
    (error) => {
      console.error("Error in posts subscription:", error);
    }
  );
};

// Subscribe to user posts changes (real-time)
export const subscribeToUserPosts = (
  username: string,
  callback: (posts: Post[]) => void
) => {
  const q = query(
    collection(db, POSTS_COLLECTION),
    where("author.username", "==", username),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      const posts = querySnapshot.docs.map(firestoreToPost);
      callback(posts);
    },
    (error) => {
      console.error("Error in user posts subscription:", error);
    }
  );
};
