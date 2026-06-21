import {
  getNotifications,
  markNotificationRead,
  insertRow,
} from '../services/databaseService.js';

/**
 * GET /api/notifications
 */
export const getNotificationsHandler = async (req, res, next) => {
  try {
    const notifications = await getNotifications(req.user.id);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
export const markReadHandler = async (req, res, next) => {
  try {
    const updated = await markNotificationRead(req.params.id);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notifications  (admin / server-to-server use)
 */
export const createNotificationHandler = async (req, res, next) => {
  try {
    const { user_id, title, message, type } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({ message: 'user_id, title, and message are required' });
    }

    const notification = await insertRow('notifications', {
      user_id,
      title,
      message,
      type: type || 'info',
      is_read: false,
    });

    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
};
