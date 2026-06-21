import { getReports, insertRow, deleteRow } from '../services/databaseService.js';
import { uploadReport, deleteFile, BUCKETS } from '../services/storageService.js';

/**
 * GET /api/reports
 */
export const getReportsHandler = async (req, res, next) => {
  try {
    const reports = await getReports(req.user.id);
    res.json(reports);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reports  (multipart/form-data with field "report")
 */
export const uploadReportHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, description } = req.body;
    const userId = req.user.id;

    const fileUrl = await uploadReport(userId, req.file.originalname, req.file.buffer);

    const report = await insertRow('reports', {
      patient_id: userId,
      title: title || req.file.originalname,
      description: description || null,
      file_url: fileUrl,
    });

    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/reports/:id
 */
export const deleteReportHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership via RLS-safe check
    const { getRowById } = await import('../services/databaseService.js');
    const report = await getRowById('reports', id);

    if (!report || report.patient_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Extract file path from URL
    const urlParts = report.file_url.split(`${BUCKETS.REPORTS}/`);
    if (urlParts[1]) {
      await deleteFile(BUCKETS.REPORTS, urlParts[1]);
    }

    await deleteRow('reports', { id });
    res.json({ message: 'Report deleted' });
  } catch (err) {
    next(err);
  }
};
