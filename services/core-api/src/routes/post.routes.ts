import { Router } from "express";
import { PostController } from "../controllers/post.controller.js";
import { CommentController } from "../controllers/comment.controller.js";
import { ReactionController } from "../controllers/reaction.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const postRouter = Router();

// --- Posts (Bảng tin) ---
postRouter.post("/classes/:classId/posts", requireAuth, asyncHandler(PostController.createPost));
postRouter.get("/classes/:classId/posts", requireAuth, asyncHandler(PostController.listPosts));
postRouter.patch("/classes/:classId/posts/:postId", requireAuth, asyncHandler(PostController.updatePost));
postRouter.delete("/classes/:classId/posts/:postId", requireAuth, asyncHandler(PostController.deletePost));

// --- Comments (Bình luận bài đăng) ---
postRouter.post("/classes/:classId/posts/:postId/comments", requireAuth, asyncHandler(CommentController.createComment));
postRouter.get("/classes/:classId/posts/:postId/comments", requireAuth, asyncHandler(CommentController.listComments));
postRouter.patch("/classes/:classId/posts/:postId/comments/:commentId", requireAuth, asyncHandler(CommentController.updateComment));
postRouter.delete("/classes/:classId/posts/:postId/comments/:commentId", requireAuth, asyncHandler(CommentController.deleteComment));

// --- Reactions (Thả biểu cảm trên bài đăng) ---
postRouter.post("/classes/:classId/posts/:postId/reactions", requireAuth, asyncHandler(ReactionController.toggleReaction));
postRouter.get("/classes/:classId/posts/:postId/reactions", requireAuth, asyncHandler(ReactionController.getReactions));
