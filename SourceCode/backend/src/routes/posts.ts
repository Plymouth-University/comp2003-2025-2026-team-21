import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { 
  createPost, 
  getAllPosts, 
  getUserPosts, 
  deletePost 
} from "../controllers/postsController";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create a new post
router.post("/", createPost);

// Get all posts
router.get("/", getAllPosts);

// Get posts by specific user
router.get("/user/:userId", getUserPosts);

// Delete a post
router.delete("/:postId", deletePost);

export default router;
