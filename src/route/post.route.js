import { Router } from 'express';
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from '../controller/post.controller.js';

const router = Router({ mergeParams: true });

// /api/posts
router.get('/', getPosts);
router.post('/', createPost);

// /api/posts/:postId
router.get('/:postId', getPost);
router.put('/:postId', updatePost);
router.delete('/:postId', deletePost);

export default router;