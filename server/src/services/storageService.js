import supabase from '../config/supabase.js';

const BUCKETS = {
  PROFILE_IMAGES: 'profile-images',
  REPORTS: 'reports',
  UPLOADS: 'uploads',
};

/**
 * Upload a file buffer to a Supabase Storage bucket.
 * @param {string} bucket - Bucket name (use BUCKETS constants)
 * @param {string} filePath - Path inside the bucket, e.g. "userId/avatar.png"
 * @param {Buffer|Blob} fileBuffer - File data
 * @param {string} contentType - MIME type, e.g. "image/png"
 * @returns {string} Public URL of the uploaded file
 */
export const uploadFile = async (bucket, filePath, fileBuffer, contentType) => {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) throw error;

  return getPublicUrl(bucket, filePath);
};

/**
 * Get the public URL of a file (bucket must have public access enabled).
 */
export const getPublicUrl = (bucket, filePath) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};

/**
 * Delete a file from a bucket.
 */
export const deleteFile = async (bucket, filePath) => {
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) throw error;
  return true;
};

/**
 * Upload a profile image for a user.
 */
export const uploadProfileImage = (userId, fileBuffer, contentType) =>
  uploadFile(BUCKETS.PROFILE_IMAGES, `${userId}/avatar`, fileBuffer, contentType);

/**
 * Upload a medical report PDF.
 */
export const uploadReport = (userId, fileName, fileBuffer) =>
  uploadFile(BUCKETS.REPORTS, `${userId}/${Date.now()}_${fileName}`, fileBuffer, 'application/pdf');

/**
 * Upload a generic file.
 */
export const uploadGenericFile = (userId, fileName, fileBuffer, contentType) =>
  uploadFile(BUCKETS.UPLOADS, `${userId}/${Date.now()}_${fileName}`, fileBuffer, contentType);

export { BUCKETS };
