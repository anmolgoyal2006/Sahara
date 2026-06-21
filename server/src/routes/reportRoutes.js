import { Router } from 'express';
import {
  getReportsHandler,
  uploadReportHandler,
  deleteReportHandler,
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/', getReportsHandler);
router.post('/', upload.single('report'), uploadReportHandler);
router.delete('/:id', deleteReportHandler);

export default router;
