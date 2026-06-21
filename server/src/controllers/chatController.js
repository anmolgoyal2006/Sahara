import { getChats, insertRow } from '../services/databaseService.js';
import supabase from '../config/supabase.js';

/**
 * GET /api/chats
 */
export const getChatsHandler = async (req, res, next) => {
  try {
    const chats = await getChats(req.user.id);
    res.json(chats);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/chats/:otherUserId  — conversation between current user and another user
 */
export const getConversationHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/chats
 */
export const sendMessageHandler = async (req, res, next) => {
  try {
    const { receiver_id, content } = req.body;

    if (!receiver_id || !content) {
      return res.status(400).json({ message: 'receiver_id and content are required' });
    }

    const message = await insertRow('chats', {
      sender_id: req.user.id,
      receiver_id,
      content,
      is_read: false,
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};
