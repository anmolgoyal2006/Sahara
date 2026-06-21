import { Router } from 'express';
import { registerUser, listUsers, deleteUser } from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

// Admin-only: create a user directly (bypasses email verification flow)
router.post('/register', protect, restrictTo('admin'), registerUser);

// Admin-only: list all users
router.get('/users', protect, restrictTo('admin'), listUsers);

// Admin-only: delete a user
router.delete('/users/:id', protect, restrictTo('admin'), deleteUser);

export default router;
