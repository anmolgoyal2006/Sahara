import { Router } from 'express';
import {
  getChatsHandler,
  getConversationHandler,
  sendMessageHandler,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', getChatsHandler);
router.get('/:otherUserId', getConversationHandler);
router.post('/', sendMessageHandler);

export default router;
