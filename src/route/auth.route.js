import { Router } from 'express';
import {
  me,
  login,
  logout,
  register,
  checkDuplication,
} from '../controller/auth.controller.js';

const router = Router();
router.get('/me', me);
router.post('/login', login);
router.post('/logout', logout);
router.post('/register', register);
router.post('/checkDuplication', checkDuplication);

export default router;