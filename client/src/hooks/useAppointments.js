import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const role = user?.user_metadata?.role || 'patient';

  useEffect(() => {
    if (!user) return;

    const fetchAppointments = async () => {
      setLoading(true);
      const filterCol = role === 'doctor' ? 'doctor_id' : 'patient_id';

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq(filterCol, user.id)
        .order('scheduled_at', { ascending: true });

      if (error) setError(error.message);
      else setAppointments(data);
      setLoading(false);
    };

    fetchAppointments();
  }, [user, role]);

  const createAppointment = async ({ doctor_id, scheduled_at, notes }) => {
    const { data, error } = await supabase
      .from('appointments')
      .insert({ patient_id: user.id, doctor_id, scheduled_at, notes, status: 'pending' })
      .select()
      .single();

    if (error) throw error;
    setAppointments((prev) => [...prev, data]);
    return data;
  };

  const cancelAppointment = async (id) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  return { appointments, loading, error, createAppointment, cancelAppointment };
}
