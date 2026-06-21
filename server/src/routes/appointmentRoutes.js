import { Router } from 'express';
import {
  getAppointmentsHandler,
  createAppointmentHandler,
  updateAppointmentHandler,
  deleteAppointmentHandler,
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', getAppointmentsHandler);
router.post('/', createAppointmentHandler);
router.patch('/:id', updateAppointmentHandler);
router.delete('/:id', deleteAppointmentHandler);

export default router;
