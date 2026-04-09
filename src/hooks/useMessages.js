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

  const getStoredGroups = () => JSON.parse(localStorage.getItem('carpes_groups') || '[]');
  const getRoleOverrides = () => JSON.parse(localStorage.getItem('carpes_group_role_overrides') || '{}');
  const setRoleOverrides = (value) => localStorage.setItem('carpes_group_role_overrides', JSON.stringify(value));
  const getLocalDmKey = (a, b) => `carpes_dm_${[a, b].sort().join('_')}`;
  const getLocalDmMessages = (a, b) => JSON.parse(localStorage.getItem(getLocalDmKey(a, b)) || '[]');
  const getLocalDmConversations = useCallback(async () => {
    if (!currentUser?.id) return [];

    const dmKeys = Object.keys(localStorage).filter((key) => key.startsWith('carpes_dm_'));
    const localConversations = [];
    const partnerIds = new Set();

    for (const key of dmKeys) {
      const rawPair = key.replace('carpes_dm_', '');
      const [firstId, secondId] = rawPair.split('_');
      if (!firstId || !secondId) continue;
      if (firstId !== currentUser.id && secondId !== currentUser.id) continue;

      const partnerId = firstId === currentUser.id ? secondId : firstId;
      const storedMessages = JSON.parse(localStorage.getItem(key) || '[]');
      if (!storedMessages.length) continue;

      partnerIds.add(partnerId);
      const lastMessage = storedMessages
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      localConversations.push({
        partnerId,
        lastMessage,
        unreadCount: 0,
        _local: true,
      });
    }

    if (localConversations.length === 0) return [];

    let profilesMap = {};
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, nombre, foto_perfil')
        .in('id', [...partnerIds]);

      profilesMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
    } catch (error) {
      console.warn('Could not resolve local DM profiles:', error);
    }

    return localConversations.map((conversation) => ({
      ...conversation,
      partner: profilesMap[conversation.partnerId] || { id: conversation.partnerId, username: 'usuario' },
    }));
  }, [currentUser?.id]);

  const isCurrentUserGroupAdmin = useCallback(async (groupId) => {
    if (!currentUser || !groupId) return false;

    try {
      const { data: group } = await supabase
        .from('chat_groups')
        .select('creator_id')
        .eq('id', groupId)
        .maybeSingle();

      if (group?.creator_id === currentUser.id) return true;

      const { data: membership, error: membershipErr } = await supabase
        .from('chat_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!membershipErr && membership?.role === 'admin') return true;
    } catch (err) {
      console.warn('Could not verify admin role from DB, using local fallback');
    }

    const stored = getStoredGroups();
    const localGroup = stored.find(g => g.id === groupId);
    if (!localGroup) return false;
    if (localGroup.creator_id === currentUser.id) return true;

    const roleOverrides = getRoleOverrides();
    const overrideRole = roleOverrides?.[groupId]?.[currentUser.id];
    if (overrideRole === 'admin') return true;

    const myMember = (localGroup.members || []).find(m => m.id === currentUser.id);
    return myMember?.role === 'admin';
  }, [currentUser]);

  // ─── Direct Messages ───────────────────────────────────────
  const getConversations = useCallback(async () => {
    if (!currentUser) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(id, username, nombre, foto_perfil), receiver:profiles!receiver_id(id, username, nombre, foto_perfil)')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      let serverConversations = [];
      let unread = 0;

      if (error) {
        // Fallback: try with users table
        const { data: fallback, error: fallbackErr } = await supabase
          .from('messages')
          .select('*, sender:users!sender_id(*), receiver:users!receiver_id(*)')
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: false });
        if (fallbackErr) throw fallbackErr;
        ({ conversations: serverConversations, unread } = buildConversations(fallback || []));
      } else {
        ({ conversations: serverConversations, unread } = buildConversations(data || []));
      }

      const localConversations = await getLocalDmConversations();
      const mergedMap = new Map();

      [...serverConversations, ...localConversations].forEach((conversation) => {
        const existing = mergedMap.get(conversation.partnerId);
        if (!existing) {
          mergedMap.set(conversation.partnerId, conversation);
          return;
        }

        const existingTime = new Date(existing.lastMessage?.created_at || 0).getTime();
        const incomingTime = new Date(conversation.lastMessage?.created_at || 0).getTime();
        if (incomingTime >= existingTime) {
          mergedMap.set(conversation.partnerId, {
            ...existing,
            ...conversation,
            unreadCount: Math.max(existing.unreadCount || 0, conversation.unreadCount || 0),
          });
        }
      });

      setConversations(Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = new Date(a.lastMessage?.created_at || 0).getTime();
        const timeB = new Date(b.lastMessage?.created_at || 0).getTime();
        return timeB - timeA;
      }));
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      try {
        const localConversations = await getLocalDmConversations();
        setConversations(localConversations);
      } catch (fallbackError) {
        console.error('Error loading local conversations:', fallbackError);
        setConversations([]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, getLocalDmConversations]);

  const buildConversations = (data) => {
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
    return { conversations: Array.from(convMap.values()), unread };
  };

  const getMessages = useCallback(async (otherUserId) => {
    if (!currentUser || !otherUserId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      const localMessages = getLocalDmMessages(currentUser.id, otherUserId);

      if (error) {
        setMessages(localMessages);
        return;
      }

      const serverMessages = data || [];
      const merged = [...serverMessages, ...localMessages]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      const deduped = [];
      const seen = new Set();
      for (const msg of merged) {
        const key = msg.id || `${msg.sender_id}-${msg.receiver_id}-${msg.created_at}-${msg.contenido || msg.content || msg.message || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(msg);
        }
      }

      setMessages(deduped);
      
      const unreadIds = (serverMessages || [])
        .filter(m => m.receiver_id === currentUser.id && !m.read)
        .map(m => m.id);
      if (unreadIds.length > 0) markAsRead(unreadIds);
    } catch (error) {
      console.error('Error fetching messages:', error);
      const localMessages = getLocalDmMessages(currentUser.id, otherUserId);
      setMessages(localMessages);
    }
  }, [currentUser]);

  const sendMessage = async (receiverId, content, imageUrl = null) => {
    try {
      if (!currentUser?.id || !receiverId) return false;

      const base = {
        sender_id: currentUser.id,
        receiver_id: receiverId,
        group_id: null,
      };

      const textToSend = content || '';
      const textOrImage = imageUrl || textToSend;

      // Try multiple payload shapes to support legacy schemas and avoid first-message failures.
      const payloadCandidates = [
        { ...base, contenido: textToSend, image_url: imageUrl || null, read: false },
        { ...base, contenido: textOrImage, read: false },
        { ...base, contenido: textOrImage },
        { ...base, content: textToSend, image_url: imageUrl || null, read: false },
        { ...base, content: textOrImage, read: false },
        { ...base, content: textOrImage },
        { ...base, message: textOrImage, read: false },
        { ...base, message: textOrImage },
      ];

      let lastError = null;
      for (const payload of payloadCandidates) {
        const { error } = await supabase.from('messages').insert([payload]);
        if (!error) {
          return true;
        }
        lastError = error;
      }

      // Local fallback to avoid blocking UX if DB policy/schema is restrictive.
      const key = getLocalDmKey(currentUser.id, receiverId);
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      const localMessage = {
        id: crypto.randomUUID(),
        sender_id: currentUser.id,
        receiver_id: receiverId,
        contenido: imageUrl || textToSend,
        image_url: imageUrl || null,
        read: false,
        created_at: new Date().toISOString(),
        _local: true,
      };
      stored.push(localMessage);
      localStorage.setItem(key, JSON.stringify(stored));

      setMessages((prev) => [...prev, localMessage]);
      await getConversations();

      return true;
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error?.message || "No se pudo enviar el mensaje" });
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

  const getGroupMessages = useCallback(async (groupId) => {
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
  }, [currentUser]);

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
      const allMembersWithRole = [
        { group_id: group.id, user_id: currentUser.id, role: 'admin' },
        ...memberIds.map(uid => ({ group_id: group.id, user_id: uid, role: 'member' }))
      ];

      const { error: memErrWithRole } = await supabase
        .from('chat_group_members')
        .insert(allMembersWithRole);

      if (memErrWithRole) {
        // Compatibility fallback for old schema without role column
        const allMembers = [currentUser.id, ...memberIds].map(uid => ({
          group_id: group.id,
          user_id: uid
        }));

        const { error: memErr } = await supabase
          .from('chat_group_members')
          .insert(allMembers);

        if (memErr) console.warn('Error adding members:', memErr.message);
      }

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
      const { data: groupData } = await supabase
        .from('chat_groups')
        .select('creator_id')
        .eq('id', groupId)
        .maybeSingle();

      const creatorId = groupData?.creator_id;

      const { data, error } = await supabase
        .from('chat_group_members')
        .select('user_id, role, profiles!chat_group_members_user_id_fkey(id, username, nombre, foto_perfil)')
        .eq('group_id', groupId);

      if (error) {
        // Fallback: check localStorage groups and resolve profiles
        const stored = JSON.parse(localStorage.getItem('carpes_groups') || '[]');
        const group = stored.find(g => g.id === groupId);
        const memberList = group?.members || [];
        const roleOverrides = getRoleOverrides();
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
          if (profiles) {
            return profiles.map(p => {
              const localMember = memberList.find(m => m.id === p.id);
              const overrideRole = roleOverrides?.[groupId]?.[p.id];
              const role = overrideRole || (p.id === group?.creator_id ? 'admin' : (localMember?.role || 'member'));
              return { ...p, role };
            });
          }
        }
        return memberList.map(m => {
          const overrideRole = roleOverrides?.[groupId]?.[m.id];
          return { ...m, role: overrideRole || m.role || (m.id === group?.creator_id ? 'admin' : 'member') };
        });
      }
      const roleOverrides = getRoleOverrides();
      return (data || []).map(m => {
        const profile = m.profiles || { id: m.user_id };
        const overrideRole = roleOverrides?.[groupId]?.[m.user_id];
        return {
          ...profile,
          role: overrideRole || m.role || (m.user_id === creatorId ? 'admin' : 'member')
        };
      });
    } catch (err) {
      console.error('Error fetching group members:', err);
      return [];
    }
  };

  const addMembersToGroup = async (groupId, newMemberIds) => {
    if (!currentUser || !groupId || !newMemberIds.length) return false;
    try {
      const canManage = await isCurrentUserGroupAdmin(groupId);
      if (!canManage) {
        toast({ variant: 'destructive', title: 'Solo administradores', description: 'No tienes permisos para añadir miembros.' });
        return false;
      }

      const rowsWithRole = newMemberIds.map(uid => ({ group_id: groupId, user_id: uid, role: 'member' }));
      const { error: insertWithRoleError } = await supabase.from('chat_group_members').insert(rowsWithRole);

      let error = insertWithRoleError;
      if (insertWithRoleError) {
        const rows = newMemberIds.map(uid => ({ group_id: groupId, user_id: uid }));
        const fallbackInsert = await supabase.from('chat_group_members').insert(rows);
        error = fallbackInsert.error;
      }

      if (error) {
        // Fallback: update localStorage
        console.warn('chat_group_members not available, updating locally');
        const stored = getStoredGroups();
        const idx = stored.findIndex(g => g.id === groupId);
        if (idx !== -1) {
          if (stored[idx].creator_id !== currentUser.id && !(stored[idx].members || []).some(m => m.id === currentUser.id && m.role === 'admin')) {
            toast({ variant: 'destructive', title: 'Solo administradores', description: 'No tienes permisos para añadir miembros.' });
            return false;
          }

          const existing = stored[idx].members || [];
          const newMembers = newMemberIds.map(id => ({ id, role: 'member' }));
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

  const promoteMemberToAdmin = async (groupId, targetUserId) => {
    if (!currentUser || !groupId || !targetUserId) return false;

    try {
      const canManage = await isCurrentUserGroupAdmin(groupId);
      if (!canManage) {
        toast({ variant: 'destructive', title: 'Solo administradores', description: 'No tienes permisos para promover miembros.' });
        return false;
      }

      const { error } = await supabase
        .from('chat_group_members')
        .update({ role: 'admin' })
        .eq('group_id', groupId)
        .eq('user_id', targetUserId);

      if (error) {
        const roleOverrides = getRoleOverrides();
        roleOverrides[groupId] = roleOverrides[groupId] || {};
        roleOverrides[groupId][targetUserId] = 'admin';
        setRoleOverrides(roleOverrides);

        const stored = getStoredGroups();
        const idx = stored.findIndex(g => g.id === groupId);
        if (idx !== -1) {
          stored[idx].members = (stored[idx].members || []).map(m => (
            m.id === targetUserId ? { ...m, role: 'admin' } : m
          ));
          localStorage.setItem('carpes_groups', JSON.stringify(stored));
          setGroupConversations([...stored]);
          toast({ title: 'Miembro promovido a admin' });
          return true;
        }

        toast({ title: 'Miembro promovido a admin' });
        return true;
      }

      toast({ title: 'Miembro promovido a admin' });
      await getGroupConversations();
      return true;
    } catch (err) {
      console.error('Error promoting member:', err);
      toast({ variant: 'destructive', title: 'Error al promover miembro' });
      return false;
    }
  };

  const demoteAdminToMember = async (groupId, targetUserId) => {
    if (!currentUser || !groupId || !targetUserId) return false;

    try {
      const canManage = await isCurrentUserGroupAdmin(groupId);
      if (!canManage) {
        toast({ variant: 'destructive', title: 'Solo administradores', description: 'No tienes permisos para quitar el rol de admin.' });
        return false;
      }

      const { data: groupData } = await supabase
        .from('chat_groups')
        .select('creator_id')
        .eq('id', groupId)
        .maybeSingle();

      if (groupData?.creator_id === targetUserId) {
        toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No puedes quitar admin al creador del grupo.' });
        return false;
      }

      const { error } = await supabase
        .from('chat_group_members')
        .update({ role: 'member' })
        .eq('group_id', groupId)
        .eq('user_id', targetUserId);

      if (error) {
        const roleOverrides = getRoleOverrides();
        roleOverrides[groupId] = roleOverrides[groupId] || {};
        roleOverrides[groupId][targetUserId] = 'member';
        setRoleOverrides(roleOverrides);

        const stored = getStoredGroups();
        const idx = stored.findIndex(g => g.id === groupId);
        if (idx !== -1) {
          stored[idx].members = (stored[idx].members || []).map(m => (
            m.id === targetUserId ? { ...m, role: 'member' } : m
          ));
          localStorage.setItem('carpes_groups', JSON.stringify(stored));
          setGroupConversations([...stored]);
        }
      }

      toast({ title: 'Admin cambiado a miembro' });
      await getGroupConversations();
      return true;
    } catch (err) {
      console.error('Error demoting admin:', err);
      toast({ variant: 'destructive', title: 'Error al quitar admin' });
      return false;
    }
  };

  const removeMemberFromGroup = async (groupId, targetUserId) => {
    if (!currentUser || !groupId || !targetUserId) return false;

    try {
      const canManage = await isCurrentUserGroupAdmin(groupId);
      if (!canManage) {
        toast({ variant: 'destructive', title: 'Solo administradores', description: 'No tienes permisos para expulsar miembros.' });
        return false;
      }

      const { data: groupData } = await supabase
        .from('chat_groups')
        .select('creator_id')
        .eq('id', groupId)
        .maybeSingle();

      if (groupData?.creator_id === targetUserId) {
        toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No puedes expulsar al creador del grupo.' });
        return false;
      }

      const { error } = await supabase
        .from('chat_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', targetUserId);

      if (error) {
        const roleOverrides = getRoleOverrides();
        if (roleOverrides[groupId]) {
          delete roleOverrides[groupId][targetUserId];
          setRoleOverrides(roleOverrides);
        }

        const stored = getStoredGroups();
        const idx = stored.findIndex(g => g.id === groupId);
        if (idx !== -1) {
          if (stored[idx].creator_id === targetUserId) {
            toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No puedes expulsar al creador del grupo.' });
            return false;
          }

          if (stored[idx].creator_id !== currentUser.id && !(stored[idx].members || []).some(m => m.id === currentUser.id && m.role === 'admin')) {
            toast({ variant: 'destructive', title: 'Solo administradores', description: 'No tienes permisos para expulsar miembros.' });
            return false;
          }

          stored[idx].members = (stored[idx].members || []).filter(m => m.id !== targetUserId);
          stored[idx].memberCount = Math.max(1, (stored[idx].memberCount || 1) - 1);
          localStorage.setItem('carpes_groups', JSON.stringify(stored));
          setGroupConversations([...stored]);
          toast({ title: 'Miembro expulsado del grupo' });
          return true;
        }
        throw error;
      }

      toast({ title: 'Miembro expulsado del grupo' });
      await getGroupConversations();
      return true;
    } catch (err) {
      console.error('Error removing member:', err);
      toast({ variant: 'destructive', title: 'Error al expulsar miembro' });
      return false;
    }
  };

  const deleteGroupForEveryone = async (groupId) => {
    if (!currentUser || !groupId) return false;

    try {
      const { data: groupData } = await supabase
        .from('chat_groups')
        .select('creator_id')
        .eq('id', groupId)
        .maybeSingle();

      if (groupData?.creator_id && groupData.creator_id !== currentUser.id) {
        toast({ variant: 'destructive', title: 'Solo el creador', description: 'Solo el creador puede eliminar el grupo.' });
        return false;
      }

      // Try best-effort cascade manually (in case FK cascade is missing)
      await supabase.from('group_messages').delete().eq('group_id', groupId);
      await supabase.from('chat_group_members').delete().eq('group_id', groupId);

      const { error } = await supabase
        .from('chat_groups')
        .delete()
        .eq('id', groupId)
        .eq('creator_id', currentUser.id);

      if (error) {
        // Local fallback
        const stored = getStoredGroups();
        const target = stored.find(g => g.id === groupId);
        if (target && target.creator_id !== currentUser.id) {
          toast({ variant: 'destructive', title: 'Solo el creador', description: 'Solo el creador puede eliminar el grupo.' });
          return false;
        }

        const filtered = stored.filter(g => g.id !== groupId);
        localStorage.setItem('carpes_groups', JSON.stringify(filtered));

        const roleOverrides = getRoleOverrides();
        if (roleOverrides[groupId]) {
          delete roleOverrides[groupId];
          setRoleOverrides(roleOverrides);
        }

        localStorage.removeItem(`carpes_groupmsgs_${groupId}`);
        setGroupConversations(filtered);
        toast({ title: 'Grupo eliminado para todos' });
        return true;
      }

      const roleOverrides = getRoleOverrides();
      if (roleOverrides[groupId]) {
        delete roleOverrides[groupId];
        setRoleOverrides(roleOverrides);
      }

      localStorage.removeItem(`carpes_groupmsgs_${groupId}`);
      await getGroupConversations();
      toast({ title: 'Grupo eliminado para todos' });
      return true;
    } catch (err) {
      console.error('Error deleting group:', err);
      toast({ variant: 'destructive', title: 'Error al eliminar grupo' });
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
    promoteMemberToAdmin,
    demoteAdminToMember,
    removeMemberFromGroup,
    deleteGroupForEveryone,
    getGroupMembers,
    uploadMessageImage,
  };
};
