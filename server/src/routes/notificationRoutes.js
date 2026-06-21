import { Router } from 'express';
import {
  getNotificationsHandler,
  markReadHandler,
  createNotificationHandler,
} from '../controllers/notificationController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', getNotificationsHandler);
router.patch('/:id/read', markReadHandler);
router.post('/', restrictTo('admin', 'doctor'), createNotificationHandler);

export default router;
