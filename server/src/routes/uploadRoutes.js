import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { uploadGenericFile, deleteFile, BUCKETS } from '../services/storageService.js';

const router = Router();

router.use(protect);

/**
 * POST /api/uploads
 * Generic file upload — returns public URL.
 */
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const url = await uploadGenericFile(
      req.user.id,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype
    );

    res.status(201).json({ url });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/uploads
 * Accepts { bucket, filePath } in body.
 */
router.delete('/', async (req, res, next) => {
  try {
    const { bucket, filePath } = req.body;

    if (!bucket || !filePath) {
      return res.status(400).json({ message: 'bucket and filePath are required' });
    }

    if (!Object.values(BUCKETS).includes(bucket)) {
      return res.status(400).json({ message: 'Invalid bucket' });
    }

    await deleteFile(bucket, filePath);
    res.json({ message: 'File deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
