import { Router } from 'express';
import {
  getProfileHandler,
  updateProfileHandler,
  uploadAvatarHandler,
} from '../controllers/profileController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/:userId', getProfileHandler);
router.put('/:userId', updateProfileHandler);
router.post('/:userId/avatar', upload.single('avatar'), uploadAvatarHandler);

export default router;
