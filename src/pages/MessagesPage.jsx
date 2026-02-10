import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { Send, Search, ArrowLeft, MessageCircle, Image, X, Smile, Users, Camera, Settings, UserPlus, Plus, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';

// Helper: detect if content is an image URL
const isImageUrl = (text) => {
  if (!text) return false;
  const t = text.trim();
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(t) ||
    t.includes('supabase.co/storage') ||
    t.includes('giphy.com') ||
    t.includes('tenor.com') ||
    t.includes('imgur.com');
};

// Curated GIF reactions (fishing & fun themed)
const GIF_CATEGORIES = [
  { label: '🎣 Pesca', gifs: [
    'https://media.giphy.com/media/3o7btQ1TLpmbNGTbMY/giphy.gif',
    'https://media.giphy.com/media/l0HlNaQ6gWfllcjDO/giphy.gif',
    'https://media.giphy.com/media/xUPGcEw56dJj3fJFJe/giphy.gif',
    'https://media.giphy.com/media/3oKIPnAiaMCJ8dR7HG/giphy.gif',
  ]},
  { label: '😂 Risas', gifs: [
    'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
    'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif',
    'https://media.giphy.com/media/Q7ozWVYCR0nyW2rvPW/giphy.gif',
    'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif',
  ]},
  { label: '👍 Reacciones', gifs: [
    'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',
    'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif',
    'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
  ]},
  { label: '🎉 Celebrar', gifs: [
    'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
    'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif',
  ]},
];

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    conversations, groupConversations, messages, loading,
    getMessages, getGroupMessages, sendMessage, sendGroupMessage,
    getConversations, getGroupConversations, uploadMessageImage,
    addMembersToGroup, getGroupMembers
  } = useMessages(user);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [activeTab, setActiveTab] = useState('direct'); // direct | groups
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const location = useLocation();

  const isGroupChat = !!selectedGroup;
  const chatTarget = selectedGroup || selectedUser;

  const filteredConversations = conversations.filter(c => 
    c.partner?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.partner?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groupConversations.filter(g =>
    g.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Poll for new messages
  useEffect(() => {
    let interval;
    if (selectedUser) {
      getMessages(selectedUser.id);
      interval = setInterval(() => getMessages(selectedUser.id), 3000);
    } else if (selectedGroup) {
      getGroupMessages(selectedGroup.id);
      interval = setInterval(() => getGroupMessages(selectedGroup.id), 3000);
    }
    return () => clearInterval(interval);
  }, [selectedUser, selectedGroup]);

  // Open from navigation state
  useEffect(() => {
    if (location?.state?.openUser) {
      setSelectedUser(location.state.openUser);
      setSelectedGroup(null);
      setActiveTab('direct');
      window.history.replaceState({}, document.title);
    }
    if (location?.state?.openGroup) {
      setSelectedGroup(location.state.openGroup);
      setSelectedUser(null);
      setActiveTab('groups');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (chatTarget) inputRef.current?.focus();
  }, [chatTarget]);

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imageFile && !imagePreview) || !chatTarget || sending) return;
    
    setSending(true);
    const messageContent = newMessage;
    setNewMessage('');
    
    let imageUrl = null;

    // Upload image if present
    if (imageFile) {
      imageUrl = await uploadMessageImage(imageFile);
      setImageFile(null);
      setImagePreview(null);
    }

    let success;
    if (isGroupChat) {
      success = await sendGroupMessage(selectedGroup.id, messageContent, imageUrl);
      if (success) getGroupMessages(selectedGroup.id);
    } else {
      success = await sendMessage(selectedUser.id, messageContent, imageUrl);
      if (success) { getMessages(selectedUser.id); getConversations(); }
    }
    
    if (!success) setNewMessage(messageContent);
    setSending(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no debe superar 10MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setShowGifPicker(false);
  };

  const handleGifSelect = async (gifUrl) => {
    setShowGifPicker(false);
    setSending(true);
    
    let success;
    if (isGroupChat) {
      success = await sendGroupMessage(selectedGroup.id, gifUrl, null);
      if (success) getGroupMessages(selectedGroup.id);
    } else {
      success = await sendMessage(selectedUser.id, gifUrl, null);
      if (success) { getMessages(selectedUser.id); getConversations(); }
    }
    setSending(false);
  };

  const selectDMConversation = (conv) => {
    setSelectedUser(conv.partner);
    setSelectedGroup(null);
    setShowGifPicker(false);
    setImagePreview(null);
    setImageFile(null);
  };

  const selectGroupConversation = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setShowGifPicker(false);
    setImagePreview(null);
    setImageFile(null);
  };

  const goBack = () => {
    setSelectedUser(null);
    setSelectedGroup(null);
    setShowGifPicker(false);
    setImagePreview(null);
    setImageFile(null);
  };

  // ─── Message bubble ────────────────────────────────────────
  const MessageBubble = ({ msg, index }) => {
    const isMe = msg.sender_id === user?.id;
    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.sender_id !== msg.sender_id);
    const msgImageUrl = msg.image_url || (isImageUrl(msg.contenido) ? msg.contenido : null);
    const textContent = msgImageUrl && msgImageUrl === msg.contenido ? null : msg.contenido;
    const senderInfo = isGroupChat ? msg.sender : (isMe ? null : selectedUser);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
      >
        {!isMe && (
          <div className="w-7 shrink-0">
            {showAvatar && senderInfo && (
              <Avatar className="w-7 h-7 border border-white/10">
                <AvatarImage src={senderInfo.foto_perfil} className="object-cover" />
                <AvatarFallback className="bg-blue-900 text-cyan-200 text-[10px]">
                  {senderInfo.username?.[0]}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
        <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
          {/* Show sender name in groups */}
          {isGroupChat && !isMe && showAvatar && (
            <span className="text-[10px] text-cyan-400 font-medium ml-1 mb-0.5">
              {senderInfo?.username || 'Usuario'}
            </span>
          )}
          <div className={`rounded-2xl overflow-hidden shadow-lg ${
            isMe 
              ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-md' 
              : 'bg-slate-800/80 backdrop-blur-sm text-white rounded-bl-md border border-white/5'
          }`}>
            {/* Image */}
            {msgImageUrl && (
              <div className="max-w-xs">
                <img 
                  src={msgImageUrl} 
                  alt="Imagen" 
                  className="w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                  onClick={() => window.open(msgImageUrl, '_blank')}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
            {/* Text */}
            {textContent && (
              <p className="text-sm leading-relaxed break-words px-4 py-2.5">{textContent}</p>
            )}
            {!textContent && msgImageUrl && <div className="h-1" />}
          </div>
          <p className={`text-[10px] mt-0.5 mx-1 ${isMe ? 'text-blue-400/60 text-right' : 'text-blue-500/60'}`}>
            {formatDistanceToNow(new Date(msg.created_at), { locale: es, addSuffix: true })}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <Helmet><title>Mensajes - Car-Pes</title></Helmet>
      <div className="h-[calc(100vh-65px)] md:h-[calc(100vh-80px)] bg-gradient-to-b from-slate-950 to-slate-900 flex overflow-hidden">
        {/* ─── Sidebar ─────────────────────────────────────── */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-white/5 bg-slate-900/80 backdrop-blur-xl flex flex-col ${chatTarget ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-slate-900/50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
                Mensajes
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/groups')}
                className="text-cyan-400 hover:text-white hover:bg-white/10 rounded-xl text-xs"
              >
                <Users className="w-4 h-4 mr-1" /> Nuevo Grupo
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-blue-500"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-950/50 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('direct')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'direct' 
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' 
                    : 'text-blue-400 hover:text-white'
                }`}
              >
                Directos
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'groups' 
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' 
                    : 'text-blue-400 hover:text-white'
                }`}
              >
                Grupos {filteredGroups.length > 0 && `(${filteredGroups.length})`}
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeTab === 'direct' ? (
              filteredConversations.length === 0 ? (
                <EmptyState icon={MessageCircle} text="No hay conversaciones" sub="Visita un perfil para iniciar un chat" />
              ) : (
                filteredConversations.map(conv => (
                  <ConversationItem
                    key={conv.partnerId}
                    name={conv.partner?.username}
                    avatar={conv.partner?.foto_perfil}
                    lastMsg={conv.lastMessage?.contenido}
                    time={conv.lastMessage?.created_at}
                    unread={conv.unreadCount}
                    isActive={selectedUser?.id === conv.partnerId}
                    onClick={() => selectDMConversation(conv)}
                  />
                ))
              )
            ) : (
              filteredGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-blue-500/30 mx-auto mb-3" />
                  <p className="text-blue-300 text-sm">No hay grupos</p>
                  <Button 
                    size="sm" 
                    className="mt-3 bg-cyan-600 hover:bg-cyan-500"
                    onClick={() => navigate('/groups')}
                  >
                    Crear Grupo
                  </Button>
                </div>
              ) : (
                filteredGroups.map(group => (
                  <ConversationItem
                    key={group.id}
                    name={group.name}
                    avatar={group.avatar_url}
                    avatarFallback={<Users className="w-4 h-4" />}
                    lastMsg={group.lastMessage ? `${group.lastMessage.sender?.username}: ${group.lastMessage.contenido || '📷 Imagen'}` : 'Sin mensajes'}
                    time={group.lastMessage?.created_at}
                    unread={0}
                    isActive={selectedGroup?.id === group.id}
                    onClick={() => selectGroupConversation(group)}
                    subtitle={`${group.memberCount || 0} miembros`}
                  />
                ))
              )
            )}
          </div>
        </div>

        {/* ─── Chat Area ───────────────────────────────────── */}
        <div className={`flex-1 flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 ${!chatTarget ? 'hidden md:flex' : 'flex'}`}>
          {chatTarget ? (
            <>
              {/* Chat Header */}
              <div className="p-3 md:p-4 border-b border-white/10 flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden text-blue-300 hover:text-white hover:bg-white/10 rounded-xl" 
                  onClick={goBack}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                {isGroupChat ? (
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="w-10 h-10 border-2 border-cyan-500/30">
                      {selectedGroup.avatar_url ? (
                        <AvatarImage src={selectedGroup.avatar_url} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-cyan-700 to-blue-800 text-white">
                        <Users className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{selectedGroup.name}</h3>
                      <p className="text-xs text-blue-400">{selectedGroup.memberCount || 0} miembros</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowGroupSettings(true)}
                      className="text-blue-300 hover:text-cyan-400 hover:bg-white/10 rounded-xl"
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <Link to={`/profile/${selectedUser.id}`} className="flex items-center gap-3 flex-1">
                    <Avatar className="w-10 h-10 border-2 border-cyan-500/30">
                      <AvatarImage src={selectedUser.foto_perfil} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-800 to-slate-900 text-cyan-200 font-bold">
                        {selectedUser.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-white hover:text-cyan-400 transition-colors">{selectedUser.username}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-green-400">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> En línea
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              {/* Messages Area */}

              {/* Group Settings Panel */}
              <AnimatePresence>
                {showGroupSettings && selectedGroup && (
                  <GroupSettingsPanel
                    group={selectedGroup}
                    currentUser={user}
                    getGroupMembers={getGroupMembers}
                    addMembersToGroup={addMembersToGroup}
                    onClose={() => setShowGroupSettings(false)}
                    onMembersAdded={async (count) => {
                      setSelectedGroup(prev => ({ ...prev, memberCount: (prev.memberCount || 0) + count }));
                      await getGroupConversations();
                    }}
                  />
                )}
              </AnimatePresence>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-slate-950 to-slate-950">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4">
                      <MessageCircle className="w-10 h-10 text-cyan-500/50" />
                    </div>
                    <p className="text-blue-300 font-medium">No hay mensajes aún</p>
                    <p className="text-blue-500 text-sm mt-1">¡Envía el primer mensaje!</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {messages.map((msg, index) => (
                      <MessageBubble key={msg.id} msg={msg} index={index} />
                    ))}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* GIF Picker */}
              <AnimatePresence>
                {showGifPicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 280, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/10 bg-slate-900/95 overflow-hidden"
                  >
                    <div className="p-3 h-full overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white">GIFs</span>
                        <button onClick={() => setShowGifPicker(false)} className="text-blue-400 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {GIF_CATEGORIES.map((cat) => (
                        <div key={cat.label} className="mb-3">
                          <p className="text-xs text-blue-400 font-semibold mb-1.5">{cat.label}</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {cat.gifs.map((gif, i) => (
                              <motion.button
                                key={i}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleGifSelect(gif)}
                                className="rounded-lg overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-colors"
                              >
                                <img src={gif} alt="GIF" className="w-full h-16 object-cover" loading="lazy" />
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Image Preview */}
              {imagePreview && (
                <div className="px-4 pt-3 border-t border-white/10 bg-slate-900/80">
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="h-20 rounded-lg border border-white/20" />
                    <button
                      onClick={() => { setImagePreview(null); setImageFile(null); }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 md:p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-xl">
                <form onSubmit={handleSend} className="flex gap-2 items-center">
                  {/* Image upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl text-blue-400 hover:text-cyan-400 hover:bg-white/5 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                  </motion.button>

                  {/* GIF button */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowGifPicker(!showGifPicker)}
                    className={`p-2.5 rounded-xl transition-colors ${
                      showGifPicker ? 'text-cyan-400 bg-white/10' : 'text-blue-400 hover:text-cyan-400 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-sm font-bold">GIF</span>
                  </motion.button>

                  {/* Text input */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    disabled={sending}
                    className="flex-1 bg-slate-950/80 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-blue-500 transition-all disabled:opacity-50"
                  />

                  {/* Send */}
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={(!newMessage.trim() && !imageFile) || sending}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-30 rounded-xl w-11 h-11 shadow-lg shadow-cyan-900/30"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-blue-300 p-8">
              <div className="w-28 h-28 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-cyan-500/20">
                <MessageCircle className="w-14 h-14 text-cyan-500/40" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">Tus mensajes</h3>
              <p className="text-center text-blue-400 max-w-sm">
                Selecciona una conversación o visita un perfil para iniciar un chat
              </p>
              <Button 
                className="mt-6 bg-gradient-to-r from-cyan-600 to-blue-600"
                onClick={() => navigate('/groups')}
              >
                <Users className="w-4 h-4 mr-2" /> Crear Grupo
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Shared Components ─────────────────────────────────────
const ConversationItem = ({ name, avatar, avatarFallback, lastMsg, time, unread, isActive, onClick, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
      isActive 
        ? 'bg-gradient-to-r from-cyan-900/30 to-blue-900/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/5' 
        : 'hover:bg-white/5 border border-transparent'
    }`}
  >
    <Avatar className="w-12 h-12 border-2 border-white/10 shrink-0">
      {avatar ? <AvatarImage src={avatar} className="object-cover" /> : null}
      <AvatarFallback className="bg-gradient-to-br from-blue-800 to-slate-900 text-cyan-200 font-bold">
        {avatarFallback || name?.[0]?.toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline mb-0.5">
        <h3 className="font-bold text-white truncate text-sm">{name}</h3>
        {time && (
          <span className="text-[10px] text-blue-400 shrink-0 ml-2">
            {formatDistanceToNow(new Date(time), { addSuffix: false, locale: es })}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[10px] text-cyan-400 mb-0.5">{subtitle}</p>}
      <div className="flex justify-between items-center gap-2">
        <p className={`text-xs truncate ${unread > 0 ? 'text-white font-medium' : 'text-blue-400'}`}>
          {isImageUrl(lastMsg) ? '📷 Imagen' : (lastMsg || 'Sin mensajes')}
        </p>
        {unread > 0 && (
          <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center shrink-0">
            {unread}
          </span>
        )}
      </div>
    </div>
  </motion.div>
);

const EmptyState = ({ icon: Icon, text, sub }) => (
  <div className="text-center py-12">
    <Icon className="w-12 h-12 text-blue-500/30 mx-auto mb-3" />
    <p className="text-blue-300 text-sm">{text}</p>
    {sub && <p className="text-blue-500 text-xs mt-1">{sub}</p>}
  </div>
);

// ─── Group Settings Panel ──────────────────────────────────────
const GroupSettingsPanel = ({ group, currentUser, getGroupMembers, addMembersToGroup, onClose, onMembersAdded }) => {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const searchTimeout = useRef(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoadingMembers(true);
    const m = await getGroupMembers(group.id);
    setMembers(m);
    setLoadingMembers(false);
  };

  const searchUsers = async (term) => {
    if (!term.trim() || term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, nombre, foto_perfil')
        .or(`username.ilike.%${term}%,nombre.ilike.%${term}%`)
        .neq('id', currentUser.id)
        .limit(10);

      let results = !error && data ? data : [];
      if (error) {
        const { data: fallback } = await supabase
          .from('users')
          .select('id, username, nombre, foto_perfil')
          .or(`username.ilike.%${term}%,nombre.ilike.%${term}%`)
          .neq('id', currentUser.id)
          .limit(10);
        results = fallback || [];
      }

      const existingIds = members.map(m => m.id);
      const selectedIds = selectedToAdd.map(s => s.id);
      setSearchResults(results.filter(u => !existingIds.includes(u.id) && !selectedIds.includes(u.id)));
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchUsers(val), 300);
  };

  const addToSelection = (userObj) => {
    setSelectedToAdd(prev => [...prev, userObj]);
    setSearchResults(prev => prev.filter(u => u.id !== userObj.id));
    setSearchTerm('');
  };

  const removeFromSelection = (userId) => {
    setSelectedToAdd(prev => prev.filter(u => u.id !== userId));
  };

  const handleAddMembers = async () => {
    if (selectedToAdd.length === 0) return;
    setAdding(true);
    const ids = selectedToAdd.map(u => u.id);
    const success = await addMembersToGroup(group.id, ids);
    if (success) {
      setMembers(prev => [...prev, ...selectedToAdd]);
      onMembersAdded(selectedToAdd.length);
      setSelectedToAdd([]);
    }
    setAdding(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="w-10 h-10 border-2 border-cyan-500/30 shrink-0">
              {group.avatar_url ? <AvatarImage src={group.avatar_url} className="object-cover" /> : null}
              <AvatarFallback className="bg-gradient-to-br from-cyan-700 to-blue-800 text-white">
                <Users className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-bold text-white truncate">{group.name}</h3>
              <p className="text-xs text-blue-400">Configuración del grupo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-400 hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current Members */}
          <div>
            <h4 className="text-sm font-semibold text-blue-200 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-500" />
              Miembros ({members.length})
            </h4>
            {loadingMembers ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => { onClose(); window.location.href = `/profile/${member.id}`; }}
                    className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.foto_perfil} className="object-cover" />
                      <AvatarFallback className="text-xs bg-blue-900 text-cyan-200">
                        {member.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-white flex-1 truncate">{member.username || member.nombre || 'Usuario'}</span>
                    {member.id === group.creator_id && (
                      <Crown className="w-4 h-4 text-yellow-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Members */}
          <div>
            <h4 className="text-sm font-semibold text-blue-200 mb-2 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-500" />
              Añadir miembros
            </h4>

            {/* Selected to add */}
            {selectedToAdd.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedToAdd.map(u => (
                  <motion.div
                    key={u.id}
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="flex items-center gap-1.5 bg-cyan-900/30 border border-cyan-500/30 rounded-full pl-1 pr-1.5 py-0.5"
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={u.foto_perfil} className="object-cover" />
                      <AvatarFallback className="text-[8px] bg-blue-900">{u.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-cyan-300">{u.username}</span>
                    <button onClick={() => removeFromSelection(u.id)} className="w-4 h-4 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center">
                      <X className="w-2.5 h-2.5 text-red-400" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Buscar @username..."
                className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Search results */}
            <div className="mt-2 space-y-1">
              {searchResults.map(result => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => addToSelection(result)}
                >
                  <Avatar className="w-8 h-8 border border-white/10">
                    <AvatarImage src={result.foto_perfil} className="object-cover" />
                    <AvatarFallback className="text-xs bg-blue-900">{result.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{result.username}</p>
                    {result.nombre && <p className="text-[11px] text-blue-400 truncate">{result.nombre}</p>}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </motion.div>
              ))}
              {searchTerm.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-center text-blue-500 text-xs py-3">No se encontraron usuarios</p>
              )}
            </div>
          </div>
        </div>

        {/* Add button */}
        {selectedToAdd.length > 0 && (
          <div className="p-4 border-t border-white/10">
            <Button
              onClick={handleAddMembers}
              disabled={adding}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl h-10 font-semibold"
            >
              {adding ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Añadiendo...
                </div>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> Añadir {selectedToAdd.length} miembro{selectedToAdd.length > 1 ? 's' : ''}</>
              )}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default MessagesPage;
