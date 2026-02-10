import { Request, Response } from "express";
import prisma from "../utils/prisma";

/**
 * CREATE POST
 * Creates a new post with image and caption
 */
export const createPost = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - user is set by authMiddleware
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { caption, image, imageMimeType } = req.body;

    if (!caption || !image || !imageMimeType) {
      return res.status(400).json({ 
        message: "Missing required fields: caption, image, imageMimeType" 
      });
    }

    // Convert base64 image to Buffer for storage
    const imageBuffer = Buffer.from(image, "base64");

    // Create post in database
    const post = await prisma.posts.create({
      data: {
        caption,
        image: imageBuffer,
        imageMimeType,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true,
            profileImageMimeType: true,
          },
        },
      },
    });

    // Convert image buffer back to base64 for response
    const postWithBase64 = {
      ...post,
      image: post.image.toString("base64"),
      User: {
        ...post.author,
        profileImage: post.author.profileImage
          ? post.author.profileImage.toString("base64")
          : null,
      },
    };

    return res.status(201).json({ 
      message: "Post created successfully", 
      post: postWithBase64 
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * GET ALL POSTS
 * Retrieves all posts with author information
 */
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.posts.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true,
            profileImageMimeType: true,
          },
        },
      },
    });

    // Convert image buffers to base64
    const postsWithBase64 = posts.map((post) => ({
      ...post,
      image: post.image.toString("base64"),
      User: {
        ...post.author,
        profileImage: post.author.profileImage
          ? post.author.profileImage.toString("base64")
          : null,
      },
    }));

    return res.json({ posts: postsWithBase64 });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * GET USER'S POSTS
 * Retrieves all posts by a specific user
 */
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const posts = await prisma.posts.findMany({
      where: {
        authorId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true,
            profileImageMimeType: true,
          },
        },
      },
    });

    // Convert image buffers to base64
    const postsWithBase64 = posts.map((post) => ({
      ...post,
      image: post.image.toString("base64"),
      User: {
        ...post.author,
        profileImage: post.author.profileImage
          ? post.author.profileImage.toString("base64")
          : null,
      },
    }));

    return res.json({ posts: postsWithBase64 });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * GET POST BY ID
 * Retrieves a single post with author information
 */
export const getPostById = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await prisma.posts.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true,
            profileImageMimeType: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const postWithBase64 = {
      ...post,
      image: post.image.toString("base64"),
      User: {
        ...post.author,
        profileImage: post.author.profileImage
          ? post.author.profileImage.toString("base64")
          : null,
      },
    };

    return res.json({ post: postWithBase64 });
  } catch (error) {
    console.error("Error fetching post:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * DELETE POST
 * Deletes a post (only by the author)
 */
export const deletePost = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - user is set by authMiddleware
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if post exists and belongs to user
    const post = await prisma.posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.authorId !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    // Delete the post
    await prisma.posts.delete({
      where: { id: postId },
    });

    return res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * UPDATE POST LIKES
 * Increments or decrements a post's like count
 */
export const updatePostLikes = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { delta } = req.body;

    if (!postId || typeof delta !== "number") {
      return res.status(400).json({ message: "Missing postId or delta" });
    }

    const post = await prisma.posts.findUnique({ where: { id: postId } });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const nextLikes = Math.max(0, post.likes + delta);

    const updatedPost = await prisma.posts.update({
      where: { id: postId },
      data: { likes: nextLikes },
      select: { id: true, likes: true },
    });

    return res.json({ post: updatedPost });
  } catch (error) {
    console.error("Error updating post likes:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
