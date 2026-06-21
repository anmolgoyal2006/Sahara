import * as authService from '../services/authService.js';

/**
 * POST /api/auth/register
 * Admin-side user creation. Regular signup is handled client-side via Supabase Auth.
 */
export const registerUser = async (req, res, next) => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'email, password, and fullName are required' });
    }

    const user = await authService.createUser({ email, password, fullName, role });
    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/users  (admin only)
 */
export const listUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 50;
    const users = await authService.listUsers(page, perPage);
    res.json(users);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/auth/users/:id  (admin only)
 */
export const deleteUser = async (req, res, next) => {
  try {
    await authService.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};
