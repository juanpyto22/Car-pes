import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useMessages = (currentUser) => {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getConversations = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:users!sender_id(*), receiver:users!receiver_id(*)')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const convMap = new Map();
      let unread = 0;

      data.forEach(msg => {
        const isSender = msg.sender_id === currentUser.id;
        const partnerId = isSender ? msg.receiver_id : msg.sender_id;
        const partner = isSender ? msg.receiver : msg.sender;
        
        if (!convMap.has(partnerId)) {
          convMap.set(partnerId, {
            partnerId,
            partner,
            lastMessage: msg,
            unreadCount: 0
          });
        }
        
        // Count unread messages received by current user
        if (!isSender && !msg.read) {
          unread++;
          const conv = convMap.get(partnerId);
          conv.unreadCount += 1;
        }
      });

      setConversations(Array.from(convMap.values()));
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const getMessages = async (otherUserId) => {
    if (!currentUser || !otherUserId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:users!sender_id(*), receiver:users!receiver_id(*)')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data);
      
      // Mark as read
      const unreadIds = data
        .filter(m => m.receiver_id === currentUser.id && !m.read)
        .map(m => m.id);
        
      if (unreadIds.length > 0) {
        await markAsRead(unreadIds);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (receiverId, content) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{ 
          sender_id: currentUser.id, 
          receiver_id: receiverId, 
          contenido: content,
          read: false
        }]);

      if (error) throw error;
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
      return false;
    }
  };

  const markAsRead = async (messageIds) => {
    if (!messageIds.length) return;
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .in('id', messageIds);
      
      getConversations(); // Update badges
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      getConversations();

      const subscription = supabase
        .channel('messages_global')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}` 
        }, (payload) => {
          getConversations();
          // If we are currently viewing this conversation, update messages list
          // Ideally we check current route/state, but simpler here to rely on specific subscription in component
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [currentUser, getConversations]);

  return { 
    conversations, 
    messages, 
    loading, 
    unreadCount, 
    getConversations, 
    getMessages, 
    sendMessage 
  };
};