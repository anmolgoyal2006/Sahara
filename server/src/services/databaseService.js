import supabase from '../config/supabase.js';

// ─── Generic helpers ──────────────────────────────────────────────────────────

/**
 * Insert a single row into any table.
 */
export const insertRow = async (table, data) => {
  const { data: result, error } = await supabase.from(table).insert(data).select().single();
  if (error) throw error;
  return result;
};

/**
 * Update rows in a table matching a filter.
 * filter: { column: value }
 */
export const updateRow = async (table, filter, updates) => {
  let query = supabase.from(table).update(updates).select();
  Object.entries(filter).forEach(([col, val]) => {
    query = query.eq(col, val);
  });
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

/**
 * Delete rows in a table matching a filter.
 */
export const deleteRow = async (table, filter) => {
  let query = supabase.from(table).delete();
  Object.entries(filter).forEach(([col, val]) => {
    query = query.eq(col, val);
  });
  const { error } = await query;
  if (error) throw error;
  return true;
};

/**
 * Fetch a single row by id.
 */
export const getRowById = async (table, id) => {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

/**
 * Fetch all rows with optional filters.
 */
export const getRows = async (table, filters = {}, options = {}) => {
  let query = supabase.from(table).select(options.select || '*');

  Object.entries(filters).forEach(([col, val]) => {
    query = query.eq(col, val);
  });

  if (options.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// ─── Domain-specific helpers ──────────────────────────────────────────────────

export const getProfile = (userId) =>
  getRowById('profiles', userId);

export const upsertProfile = async (userId, profileData) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profileData, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getAppointments = (userId, role = 'patient') => {
  const filterCol = role === 'doctor' ? 'doctor_id' : 'patient_id';
  return getRows('appointments', { [filterCol]: userId }, {
    order: { column: 'scheduled_at', ascending: true },
  });
};

export const getReports = (userId) =>
  getRows('reports', { patient_id: userId }, {
    order: { column: 'created_at', ascending: false },
  });

export const getNotifications = (userId) =>
  getRows('notifications', { user_id: userId }, {
    order: { column: 'created_at', ascending: false },
  });

export const markNotificationRead = (notificationId) =>
  updateRow('notifications', { id: notificationId }, { is_read: true });

export const getChats = async (userId) => {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};
