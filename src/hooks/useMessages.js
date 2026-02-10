import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useMessages = (currentUser) => {
  const [conversations, setConversations] = useState([]);
  const [groupConversations, setGroupConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // ─── Direct Messages ───────────────────────────────────────
  const getConversations = useCallback(async () => {
    if (!currentUser) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(id, username, nombre, foto_perfil), receiver:profiles!receiver_id(id, username, nombre, foto_perfil)')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback: try with users table
        const { data: fallback, error: fallbackErr } = await supabase
          .from('messages')
          .select('*, sender:users!sender_id(*), receiver:users!receiver_id(*)')
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: false });
        if (fallbackErr) throw fallbackErr;
        processConversations(fallback || []);
        return;
      }
      processConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const processConversations = (data) => {
    const convMap = new Map();
    let unread = 0;
    data.forEach(msg => {
      if (msg.group_id) return; // Skip group messages
      const isSender = msg.sender_id === currentUser.id;
      const partnerId = isSender ? msg.receiver_id : msg.sender_id;
      const partner = isSender ? msg.receiver : msg.sender;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, { partnerId, partner, lastMessage: msg, unreadCount: 0 });
      }
      if (!isSender && !msg.read) {
        unread++;
        convMap.get(partnerId).unreadCount += 1;
      }
    });
    setConversations(Array.from(convMap.values()));
    setUnreadCount(unread);
  };

  const getMessages = async (otherUserId) => {
    if (!currentUser || !otherUserId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      const unreadIds = (data || [])
        .filter(m => m.receiver_id === currentUser.id && !m.read)
        .map(m => m.id);
      if (unreadIds.length > 0) markAsRead(unreadIds);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (receiverId, content, imageUrl = null) => {
    try {
      const payload = { 
        sender_id: currentUser.id, 
        receiver_id: receiverId, 
        contenido: content || '',
        read: false
      };
      // Try adding image_url if supported
      if (imageUrl) payload.image_url = imageUrl;

      const { error } = await supabase.from('messages').insert([payload]);
      if (error) {
        // If image_url column doesn't exist, send URL in contenido
        if (error.message?.includes('image_url') && imageUrl) {
          const { error: err2 } = await supabase.from('messages').insert([{
            sender_id: currentUser.id,
            receiver_id: receiverId,
            contenido: imageUrl,
            read: false
          }]);
          if (err2) throw err2;
          return true;
        }
        throw error;
      }
      return true;
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo enviar el mensaje" });
      return false;
    }
  };

  const markAsRead = async (messageIds) => {
    if (!messageIds.length) return;
    try {
      await supabase.from('messages').update({ read: true }).in('id', messageIds);
      getConversations();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // ─── Group Chats ───────────────────────────────────────────
  const getGroupConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data: memberships, error: memErr } = await supabase
        .from('chat_group_members')
        .select('group_id')
        .eq('user_id', currentUser.id);

      if (memErr) {
        console.warn('chat_group_members table may not exist, using localStorage:', memErr.message);
        const stored = JSON.parse(localStorage.getItem('carpes_groups') || '[]');
        const myGroups = stored.filter(g => g.creator_id === currentUser.id || (g.members || []).some(m => m.id === currentUser.id));
        setGroupConversations(myGroups);
        return;
      }
      if (!memberships?.length) { setGroupConversations([]); return; }

      const groupIds = memberships.map(m => m.group_id);
      
      const { data: groups, error: grpErr } = await supabase
        .from('chat_groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      if (grpErr) throw grpErr;

      // Get last message for each group
      const groupsWithLastMsg = await Promise.all((groups || []).map(async (group) => {
        const { data: lastMsg } = await supabase
          .from('group_messages')
          .select('*, sender:profiles!sender_id(username)')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get member count
        const { count } = await supabase
          .from('chat_group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        return { ...group, lastMessage: lastMsg, memberCount: count || 0 };
      }));

      setGroupConversations(groupsWithLastMsg);
    } catch (error) {
      console.error('Error fetching group conversations:', error);
      // Fallback to localStorage
      const stored = JSON.parse(localStorage.getItem('carpes_groups') || '[]');
      setGroupConversations(stored);
    }
  }, [currentUser]);

  const getGroupMessages = async (groupId) => {
    if (!currentUser || !groupId) return;
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*, sender:profiles!sender_id(id, username, foto_perfil)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('group_messages table not available, using localStorage');
        const stored = JSON.parse(localStorage.getItem(`carpes_groupmsgs_${groupId}`) || '[]');
        setMessages(stored);
        return;
      }
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching group messages:', error);
      const stored = JSON.parse(localStorage.getItem(`carpes_groupmsgs_${groupId}`) || '[]');
      setMessages(stored);
    }
  };

  const sendGroupMessage = async (groupId, content, imageUrl = null) => {
    try {
      const { error } = await supabase.from('group_messages').insert([{
        group_id: groupId,
        sender_id: currentUser.id,
        contenido: content || '',
        image_url: imageUrl || null
      }]);
      if (error) {
        console.warn('group_messages table not available, saving locally');
        const key = `carpes_groupmsgs_${groupId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        const newMsg = {
          id: crypto.randomUUID(),
          group_id: groupId,
          sender_id: currentUser.id,
          sender: { id: currentUser.id, username: currentUser.user_metadata?.username || 'Tú', foto_perfil: currentUser.user_metadata?.foto_perfil },
          contenido: content || '',
          image_url: imageUrl || null,
          created_at: new Date().toISOString(),
        };
        stored.push(newMsg);
        localStorage.setItem(key, JSON.stringify(stored));
        setMessages([...stored]);
        return true;
      }
      return true;
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo enviar el mensaje" });
      return false;
    }
  };

  const createGroup = async (name, memberIds, avatarUrl = null) => {
    if (!currentUser) return null;
    try {
      const { data: group, error: grpErr } = await supabase
        .from('chat_groups')
        .insert({ name, avatar_url: avatarUrl, creator_id: currentUser.id })
        .select()
        .single();

      if (grpErr) {
        // Fallback: save group locally
        console.warn('chat_groups table not available, saving locally:', grpErr.message);
        const localGroup = {
          id: crypto.randomUUID(),
          name,
          avatar_url: avatarUrl,
          creator_id: currentUser.id,
          created_at: new Date().toISOString(),
          memberCount: memberIds.length + 1,
          members: memberIds.map(id => ({ id })),
          lastMessage: null,
          _local: true,
        };
        const stored = JSON.parse(localStorage.getItem('carpes_groups') || '[]');
        stored.unshift(localGroup);
        localStorage.setItem('carpes_groups', JSON.stringify(stored));
        setGroupConversations(stored);
        toast({ title: "Grupo creado (local)" });
        return localGroup;
      }

      // Add creator + members
      const allMembers = [currentUser.id, ...memberIds].map(uid => ({
        group_id: group.id,
        user_id: uid
      }));

      const { error: memErr } = await supabase
        .from('chat_group_members')
        .insert(allMembers);

      if (memErr) console.warn('Error adding members:', memErr.message);

      toast({ title: "Grupo creado" });
      await getGroupConversations();
      return group;
    } catch (error) {
      console.error('Error creating group:', error);
      toast({ variant: "destructive", title: "Error al crear grupo", description: error.message });
      return null;
    }
  };

  // ─── Group Management ──────────────────────────────────────
  const getGroupMembers = async (groupId) => {
    if (!currentUser || !groupId) return [];
    try {
      const { data, error } = await supabase
        .from('chat_group_members')
        .select('user_id, profiles!chat_group_members_user_id_fkey(id, username, nombre, foto_perfil)')
        .eq('group_id', groupId);

      if (error) {
        // Fallback: check localStorage groups and resolve profiles
        const stored = JSON.parse(localStorage.getItem('carpes_groups') || '[]');
        const group = stored.find(g => g.id === groupId);
        const memberList = group?.members || [];
        // If members only have ids, try to fetch profiles
        const needsResolve = memberList.some(m => !m.username);
        if (needsResolve && memberList.length > 0) {
          const ids = memberList.map(m => m.id).filter(Boolean);
          // Include creator
          if (group?.creator_id && !ids.includes(group.creator_id)) ids.push(group.creator_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, nombre, foto_perfil')
            .in('id', ids);
          if (profiles) return profiles;
        }
        return memberList;
      }
      return (data || []).map(m => m.profiles || { id: m.user_id });
    } catch (err) {
      console.error('Error fetching group members:', err);
      return [];
    }
  };

  const addMembersToGroup = async (groupId, newMemberIds) => {
    if (!currentUser || !groupId || !newMemberIds.length) return false;
    try {
      const rows = newMemberIds.map(uid => ({ group_id: groupId, user_id: uid }));
      const { error } = await supabase.from('chat_group_members').insert(rows);

      if (error) {
        // Fallback: update localStorage
        console.warn('chat_group_members not available, updating locally');
        const stored = JSON.parse(localStorage.getItem('carpes_groups') || '[]');
        const idx = stored.findIndex(g => g.id === groupId);
        if (idx !== -1) {
          const existing = stored[idx].members || [];
          const newMembers = newMemberIds.map(id => ({ id }));
          stored[idx].members = [...existing, ...newMembers];
          stored[idx].memberCount = (stored[idx].memberCount || 0) + newMemberIds.length;
          localStorage.setItem('carpes_groups', JSON.stringify(stored));
          setGroupConversations([...stored]);
        }
        toast({ title: `${newMemberIds.length} miembro(s) añadido(s)` });
        return true;
      }

      toast({ title: `${newMemberIds.length} miembro(s) añadido(s)` });
      await getGroupConversations();
      return true;
    } catch (err) {
      console.error('Error adding members:', err);
      toast({ variant: 'destructive', title: 'Error al añadir miembros' });
      return false;
    }
  };

  // ─── Image Upload ──────────────────────────────────────────
  const uploadMessageImage = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('message-images')
        .upload(fileName, file, { contentType: file.type });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('message-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      // Fallback: try general storage bucket
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `messages/${currentUser.id}/${Date.now()}.${fileExt}`;
        const { error: err2 } = await supabase.storage
          .from('posts')
          .upload(fileName, file, { contentType: file.type });
        if (err2) throw err2;
        const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(fileName);
        return publicUrl;
      } catch (fallbackErr) {
        toast({ variant: "destructive", title: "Error al subir imagen" });
        return null;
      }
    }
  };

  // ─── Realtime subscriptions ────────────────────────────────
  useEffect(() => {
    if (currentUser) {
      getConversations();
      getGroupConversations();

      const subscription = supabase
        .channel('messages_global')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}` 
        }, () => { getConversations(); })
        .subscribe();

      return () => { subscription.unsubscribe(); };
    }
  }, [currentUser]);

  return { 
    conversations, 
    groupConversations,
    messages, 
    loading, 
    unreadCount, 
    getConversations,
    getGroupConversations,
    getMessages, 
    getGroupMessages,
    sendMessage,
    sendGroupMessage,
    createGroup,
    addMembersToGroup,
    getGroupMembers,
    uploadMessageImage,
  };
};
