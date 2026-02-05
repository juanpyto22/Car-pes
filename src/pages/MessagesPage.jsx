import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { Send, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';

const MessagesPage = () => {
  const { user } = useAuth();
  const { conversations, messages, loading, getMessages, sendMessage } = useMessages(user);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
    const location = useLocation();

  const filteredConversations = conversations.filter(c => 
    c.partner.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser.id);
    }
  }, [selectedUser]);

    // If navigated here with a user in location.state, open that conversation
    useEffect(() => {
        if (location?.state?.openUser) {
            setSelectedUser(location.state.openUser);
        }
    }, [location]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    
    const success = await sendMessage(selectedUser.id, newMessage);
    if (success) {
      setNewMessage('');
    }
  };

  return (
    <>
      <Helmet><title>Mensajes - FishHub</title></Helmet>
      <div className="h-[calc(100vh-65px)] bg-slate-950 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-white/5 bg-slate-900/50 flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
           <div className="p-4 border-b border-white/5">
               <h2 className="text-xl font-bold text-white mb-4">Mensajes</h2>
               <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                   <input
                      type="text"
                      placeholder="Buscar chat..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-blue-900 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-blue-500"
                   />
               </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredConversations.map(conv => (
                 <div
                    key={conv.partnerId}
                    onClick={() => setSelectedUser(conv.partner)}
                    className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${selectedUser?.id === conv.partnerId ? 'bg-cyan-900/20 border border-cyan-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                 >
                    <div className="relative">
                        <Avatar className="w-12 h-12 border border-white/10">
                            <AvatarImage src={conv.partner.foto_perfil} />
                            <AvatarFallback className="bg-blue-900 text-cyan-200">{conv.partner.username[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-bold text-white truncate text-sm">{conv.partner.username}</h3>
                            {conv.lastMessage && (
                               <span className="text-[10px] text-blue-400">{formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false, locale: es })}</span>
                            )}
                        </div>
                        <div className="flex justify-between items-center">
                            <p className={`text-xs truncate max-w-[140px] ${conv.unreadCount > 0 ? 'text-white font-medium' : 'text-blue-400'}`}>
                                {conv.lastMessage?.contenido}
                            </p>
                            {conv.unreadCount > 0 && (
                                <span className="bg-cyan-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-lg shadow-cyan-500/30">
                                    {conv.unreadCount}
                                </span>
                            )}
                        </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-slate-950 ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
           {selectedUser ? (
               <>
                  <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-slate-900/30 backdrop-blur-sm">
                      <Button variant="ghost" size="icon" className="md:hidden text-blue-300 hover:text-white" onClick={() => setSelectedUser(null)}>
                          ←
                      </Button>
                      <Avatar className="w-10 h-10 border border-cyan-500/30">
                          <AvatarImage src={selectedUser.foto_perfil} />
                          <AvatarFallback className="bg-blue-900">{selectedUser.username[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                          <h3 className="font-bold text-white">{selectedUser.username}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-blue-400">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> En línea
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/50">
                      {messages.map((msg) => {
                          const isMe = msg.sender_id === user.id;
                          return (
                              <motion.div
                                  key={msg.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                              >
                                  <div className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                                      isMe 
                                        ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-sm' 
                                        : 'bg-slate-800 text-white rounded-tl-sm border border-white/5'
                                  }`}>
                                      <p className="text-sm">{msg.contenido}</p>
                                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100/70' : 'text-blue-400'}`}>
                                          {formatDistanceToNow(new Date(msg.created_at), { locale: es })}
                                      </p>
                                  </div>
                              </motion.div>
                          );
                      })}
                      <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-white/5 bg-slate-900/30">
                      <form onSubmit={handleSend} className="flex gap-3">
                          <input
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Escribe un mensaje..."
                              className="flex-1 bg-slate-950 border border-blue-900 rounded-full px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-blue-500"
                          />
                          <Button type="submit" size="icon" className="bg-cyan-600 hover:bg-cyan-500 rounded-full w-12 h-12 shadow-lg shadow-cyan-900/20">
                              <Send className="w-5 h-5" />
                          </Button>
                      </form>
                  </div>
               </>
           ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-blue-300">
                   <div className="w-24 h-24 bg-blue-900/10 rounded-full flex items-center justify-center mb-6">
                       <Search className="w-10 h-10 opacity-30" />
                   </div>
                   <h3 className="text-xl font-bold mb-2 text-white">Tus mensajes</h3>
                   <p className="text-sm opacity-60">Selecciona una conversación para comenzar a chatear</p>
               </div>
           )}
        </div>
      </div>
    </>
  );
};

export default MessagesPage;