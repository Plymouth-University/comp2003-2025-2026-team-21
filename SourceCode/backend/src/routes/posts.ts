import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireAnyRole } from "../middleware/roleMiddleware";
import { 
  createPost, 
  getAllPosts, 
  getUserPosts, 
  deletePost,
  getPostById
} from "../controllers/postsController";
import { updatePostLikes } from "../controllers/postsController";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create a new post
router.post("/", requireAnyRole(["STUDENT", "ORGANISATION"]), createPost);

// Get all posts
router.get("/", getAllPosts);

// Get posts by specific user
router.get("/user/:userId", getUserPosts);

// Get a single post
router.get("/:postId", getPostById);

// Delete a post
router.delete("/:postId", requireAnyRole(["STUDENT", "ORGANISATION"]), deletePost);

// Update like count for a post
router.post("/:postId/like", updatePostLikes);

export default router;
