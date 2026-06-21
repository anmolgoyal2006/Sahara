import {
  getAppointments,
  insertRow,
  updateRow,
  deleteRow,
  getRowById,
} from '../services/databaseService.js';

/**
 * GET /api/appointments
 */
export const getAppointmentsHandler = async (req, res, next) => {
  try {
    const role = req.user?.user_metadata?.role;
    const appointments = await getAppointments(req.user.id, role);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/appointments
 */
export const createAppointmentHandler = async (req, res, next) => {
  try {
    const { doctor_id, scheduled_at, notes } = req.body;

    if (!doctor_id || !scheduled_at) {
      return res.status(400).json({ message: 'doctor_id and scheduled_at are required' });
    }

    const appointment = await insertRow('appointments', {
      patient_id: req.user.id,
      doctor_id,
      scheduled_at,
      notes: notes || null,
      status: 'pending',
    });

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/appointments/:id
 */
export const updateAppointmentHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await getRowById('appointments', id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const userId = req.user.id;
    const role = req.user?.user_metadata?.role;

    const isOwner = appointment.patient_id === userId || appointment.doctor_id === userId;
    if (!isOwner && role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await updateRow('appointments', { id }, req.body);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/appointments/:id
 */
export const deleteAppointmentHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await getRowById('appointments', id);

    if (!appointment || appointment.patient_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await deleteRow('appointments', { id });
    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    next(err);
  }
};
