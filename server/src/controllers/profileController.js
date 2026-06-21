import { getProfile, upsertProfile } from '../services/databaseService.js';
import { uploadProfileImage } from '../services/storageService.js';

/**
 * GET /api/profiles/:userId
 */
export const getProfileHandler = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Users can only read their own profile (unless admin)
    const role = req.user?.user_metadata?.role;
    if (req.user.id !== userId && role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const profile = await getProfile(userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/profiles/:userId
 */
export const updateProfileHandler = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await upsertProfile(userId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/profiles/:userId/avatar
 * multipart/form-data with field "avatar"
 */
export const uploadAvatarHandler = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const publicUrl = await uploadProfileImage(userId, req.file.buffer, req.file.mimetype);
    await upsertProfile(userId, { avatar_url: publicUrl });

    res.json({ avatar_url: publicUrl });
  } catch (err) {
    next(err);
  }
};
