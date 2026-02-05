import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { Send, Search, ArrowLeft, MessageCircle, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';

const MessagesPage = () => {
  const { user } = useAuth();
  const { conversations, messages, loading, getMessages, sendMessage, getConversations } = useMessages(user);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();

  const filteredConversations = conversations.filter(c => 
    c.partner?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Poll for new messages when a conversation is open
  useEffect(() => {
    let interval;
    if (selectedUser) {
      getMessages(selectedUser.id);
      interval = setInterval(() => {
        getMessages(selectedUser.id);
      }, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [selectedUser]);

  // If navigated here with a user in location.state, open that conversation
  useEffect(() => {
    if (location?.state?.openUser) {
      setSelectedUser(location.state.openUser);
      // Clear the state to prevent re-opening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when selecting a user
  useEffect(() => {
    if (selectedUser) {
      inputRef.current?.focus();
    }
  }, [selectedUser]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;
    
    setSending(true);
    const messageContent = newMessage;
    setNewMessage(''); // Clear immediately for better UX
    
    const success = await sendMessage(selectedUser.id, messageContent);
    if (success) {
      // Refresh messages and conversations
      getMessages(selectedUser.id);
      getConversations();
    } else {
      setNewMessage(messageContent); // Restore on failure
    }
    setSending(false);
  };

  return (
    <>
      <Helmet><title>Mensajes - Car-Pes</title></Helmet>
      <div className="h-[calc(100vh-65px)] bg-gradient-to-b from-slate-950 to-slate-900 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-white/5 bg-slate-900/80 backdrop-blur-xl flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
           <div className="p-4 border-b border-white/10 bg-slate-900/50">
               <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <MessageCircle className="w-5 h-5 text-cyan-400" />
                   Mensajes
                 </h2>
               </div>
               <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                   <input
                      type="text"
                      placeholder="Buscar conversación..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-blue-500 transition-all"
                   />
               </div>
           </div>

           <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-blue-500/30 mx-auto mb-3" />
                  <p className="text-blue-300 text-sm">No hay conversaciones</p>
                  <p className="text-blue-500 text-xs mt-1">Visita un perfil para iniciar un chat</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                   <motion.div
                      key={conv.partnerId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedUser(conv.partner)}
                      className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                        selectedUser?.id === conv.partnerId 
                          ? 'bg-gradient-to-r from-cyan-900/30 to-blue-900/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/5' 
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                   >
                      <div className="relative">
                          <Avatar className="w-12 h-12 border-2 border-white/10">
                              <AvatarImage src={conv.partner?.foto_perfil} className="object-cover" />
                              <AvatarFallback className="bg-gradient-to-br from-blue-800 to-slate-900 text-cyan-200 font-bold">
                                {conv.partner?.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                          </Avatar>
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                              <h3 className="font-bold text-white truncate text-sm">{conv.partner?.username}</h3>
                              {conv.lastMessage && (
                                 <span className="text-[10px] text-blue-400 shrink-0 ml-2">
                                   {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false, locale: es })}
                                 </span>
                              )}
                          </div>
                          <div className="flex justify-between items-center gap-2">
                              <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-white font-medium' : 'text-blue-400'}`}>
                                  {conv.lastMessage?.contenido || 'Sin mensajes'}
                              </p>
                              {conv.unreadCount > 0 && (
                                  <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-lg shadow-cyan-500/30 shrink-0">
                                      {conv.unreadCount}
                                  </span>
                              )}
                          </div>
                      </div>
                   </motion.div>
                ))
              )}
           </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
           {selectedUser ? (
               <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="md:hidden text-blue-300 hover:text-white hover:bg-white/10 rounded-xl" 
                        onClick={() => setSelectedUser(null)}
                      >
                          <ArrowLeft className="w-5 h-5" />
                      </Button>
                      <Link to={`/profile/${selectedUser.id}`} className="flex items-center gap-3 flex-1">
                        <div className="relative">
                          <Avatar className="w-11 h-11 border-2 border-cyan-500/30">
                              <AvatarImage src={selectedUser.foto_perfil} className="object-cover" />
                              <AvatarFallback className="bg-gradient-to-br from-blue-800 to-slate-900 text-cyan-200 font-bold">
                                {selectedUser.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                          </Avatar>
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white hover:text-cyan-400 transition-colors">{selectedUser.username}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-green-400">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> En línea
                            </div>
                        </div>
                      </Link>
                  </div>

                  {/* Messages Area */}
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
                          {messages.map((msg, index) => {
                              const isMe = msg.sender_id === user?.id;
                              const showAvatar = !isMe && (index === 0 || messages[index - 1]?.sender_id !== msg.sender_id);
                              
                              return (
                                  <motion.div
                                      key={msg.id}
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      transition={{ duration: 0.2 }}
                                      className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                                  >
                                      {!isMe && (
                                        <div className="w-8 shrink-0">
                                          {showAvatar && (
                                            <Avatar className="w-8 h-8 border border-white/10">
                                              <AvatarImage src={selectedUser.foto_perfil} className="object-cover" />
                                              <AvatarFallback className="bg-blue-900 text-cyan-200 text-xs">
                                                {selectedUser.username?.[0]}
                                              </AvatarFallback>
                                            </Avatar>
                                          )}
                                        </div>
                                      )}
                                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-lg ${
                                          isMe 
                                            ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-md' 
                                            : 'bg-slate-800/80 backdrop-blur-sm text-white rounded-bl-md border border-white/5'
                                      }`}>
                                          <p className="text-sm leading-relaxed break-words">{msg.contenido}</p>
                                          <p className={`text-[10px] mt-1 ${isMe ? 'text-cyan-100/60 text-right' : 'text-blue-400'}`}>
                                              {formatDistanceToNow(new Date(msg.created_at), { locale: es, addSuffix: true })}
                                          </p>
                                      </div>
                                  </motion.div>
                              );
                          })}
                        </AnimatePresence>
                      )}
                      <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-xl">
                      <form onSubmit={handleSend} className="flex gap-3 items-center">
                          <input
                              ref={inputRef}
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Escribe un mensaje..."
                              disabled={sending}
                              className="flex-1 bg-slate-950/80 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-blue-500 transition-all disabled:opacity-50"
                          />
                          <Button 
                            type="submit" 
                            size="icon" 
                            disabled={!newMessage.trim() || sending}
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl w-12 h-12 shadow-lg shadow-cyan-900/30 transition-all"
                          >
                              {sending ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Send className="w-5 h-5" />
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
                     Selecciona una conversación de la lista o visita el perfil de alguien para iniciar un chat privado
                   </p>
               </div>
           )}
        </div>
      </div>
    </>
  );
};

export default MessagesPage;