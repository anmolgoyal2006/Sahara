import supabase from '../config/supabase.js';

/**
 * Create a new user via Supabase Auth Admin API.
 * Automatically creates a matching row in the `users` table via DB trigger.
 */
export const createUser = async ({ email, password, fullName, role = 'patient' }) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (error) throw error;
  return data.user;
};

/**
 * Fetch a user's auth record by ID.
 */
export const getUserById = async (userId) => {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) throw error;
  return data.user;
};

/**
 * Delete a user from Supabase Auth (cascades to DB via trigger).
 */
export const deleteUser = async (userId) => {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
  return true;
};

/**
 * List all users (paginated).
 */
export const listUsers = async (page = 1, perPage = 50) => {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) throw error;
  return data;
};

/**
 * Update a user's email or metadata.
 */
export const updateUser = async (userId, updates) => {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, updates);
  if (error) throw error;
  return data.user;
};
