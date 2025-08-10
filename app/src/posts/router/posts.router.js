import express from "express";
import commentsRouter from "../comments/router/comments.router.js";
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from "../controllers/posts.controller.js"; 

const router = express.Router({ mergeParams: true });

router.use("/:postId/comments", commentsRouter);

// 라우터는 컨트롤러의 함수만 호출
router.get("/", getPosts);
router.post("/", createPost);
router.get("/:postId", getPost);
router.put("/:postId", updatePost);
router.delete("/:postId", deletePost);

export default router;
