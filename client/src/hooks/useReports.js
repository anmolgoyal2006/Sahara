import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchReports = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) setError(error.message);
      else setReports(data);
      setLoading(false);
    };

    fetchReports();
  }, [user]);

  const uploadReport = async (file, { title, description } = {}) => {
    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('reports').getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('reports')
      .insert({
        patient_id: user.id,
        title: title || file.name,
        description: description || null,
        file_url: urlData.publicUrl,
      })
      .select()
      .single();

    if (error) throw error;
    setReports((prev) => [data, ...prev]);
    return data;
  };

  const deleteReport = async (id, fileUrl) => {
    // Extract file path from URL
    const match = fileUrl.match(/\/reports\/(.+)$/);
    if (match) {
      await supabase.storage.from('reports').remove([match[1]]);
    }

    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  return { reports, loading, error, uploadReport, deleteReport };
}
