import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useChat(otherUserId) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!user || !otherUserId) return;

    setLoading(true);
    const { data } = await supabase
      .from('chats')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    setMessages(data || []);
    setLoading(false);
  }, [user, otherUserId]);

  useEffect(() => {
    fetchMessages();

    if (!user || !otherUserId) return;

    // Real-time subscription for this conversation
    const channel = supabase
      .channel(`chat:${[user.id, otherUserId].sort().join('-')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats' },
        (payload) => {
          const msg = payload.new;
          const isRelevant =
            (msg.sender_id === user.id && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === user.id);
          if (isRelevant) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchMessages, user, otherUserId]);

  const sendMessage = async (content) => {
    const { data, error } = await supabase
      .from('chats')
      .insert({ sender_id: user.id, receiver_id: otherUserId, content, is_read: false })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return { messages, loading, sendMessage, refetch: fetchMessages };
}
