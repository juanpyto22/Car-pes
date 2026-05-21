import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useFollowing } from '@/hooks/useFollowing';
import { useAuth } from '@/contexts/AuthContext';

const SendPostModal = ({ isOpen, onClose, post }) => {
  const { user } = useAuth();
  const { following, loading: loadingFollowing } = useFollowing();
  const { toast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFollowing = following.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleSendPost = async () => {
    if (selectedUsers.length === 0 || !user?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Selecciona al menos un usuario para enviar el post'
      });
      return;
    }

    setSending(true);
    try {
      // Crear un mensaje con el post compartido
      const messageText = message.trim() 
        ? `${message}\n\n📌 Post compartido: ${post.contenido || 'Captura de ' + post.tipo_pez || 'Pesca'}` 
        : `📌 Post compartido: ${post.contenido || 'Captura de ' + post.tipo_pez || 'Pesca'}`;

      // Enviar a todos los usuarios seleccionados en paralelo
      const promises = selectedUsers.map(async (selectedUser) => {
        // Enviar mensaje privado con referencia al post
        const { error: msgError } = await supabase.from('direct_messages').insert({
          sender_id: user.id,
          receiver_id: selectedUser.id,
          content: messageText,
          shared_post_id: post.id,
          created_at: new Date().toISOString()
        });

        if (msgError) throw msgError;

        // Crear notificación
        await supabase.from('notifications').insert({
          user_id: selectedUser.id,
          type: 'post_shared',
          related_user_id: user.id,
          related_post_id: post.id,
          read: false
        });
      });

      await Promise.all(promises);

      toast({
        title: '✅ Post compartido',
        description: `Se envió a ${selectedUsers.length} ${selectedUsers.length === 1 ? 'usuario' : 'usuarios'}`
      });

      setSelectedUsers([]);
      setMessage('');
      setSearchTerm('');
      onClose();
    } catch (error) {
      console.error('Error enviando post:', error);
      toast({
        variant: 'destructive',
        title: 'Error al enviar',
        description: error.message
      });
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-3xl z-40"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex flex-col"
          >
            {/* Fullscreen Modal */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 h-full flex flex-col border-t border-cyan-500/30">
              
              {/* Header */}
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between px-8 py-6 border-b border-cyan-500/20 bg-gradient-to-r from-slate-800/50 via-slate-900/30 to-transparent sticky top-0 backdrop-blur-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl">
                    <Send className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white">Compartir Publicación</h1>
                    <p className="text-sm text-cyan-300 mt-1">Selecciona con quién deseas compartir este post</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 rounded-xl hover:bg-white/10 transition-all text-blue-300 hover:text-white hover:scale-110"
                >
                  <X className="w-7 h-7" />
                </button>
              </motion.div>

              {/* Content Grid */}
              <div className="flex-1 overflow-hidden flex gap-6 px-8 py-6">
                
                {/* Left Side - Post Preview */}
                <motion.div 
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-80 flex flex-col gap-4"
                >
                  {/* Post Preview Card */}
                  <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-6 border border-cyan-500/30 backdrop-blur-sm flex-1 flex flex-col">
                    <p className="text-xs text-cyan-300 font-bold mb-3 uppercase tracking-wider">📌 Publicación a compartir</p>
                    
                    {post.foto_url && (
                      <img
                        src={post.foto_url}
                        alt="post"
                        className="w-full h-48 rounded-xl object-cover bg-slate-700 border border-cyan-500/30 mb-4"
                      />
                    )}
                    
                    <p className="text-lg font-bold text-white mb-2">
                      {post.tipo_pez ? `🎣 Captura de ${post.tipo_pez}` : '📸 Publicación'}
                    </p>
                    <p className="text-sm text-blue-300 mb-4 flex-1">
                      {post.contenido || post.descripcion || 'Sin descripción'}
                    </p>
                    
                    {(post.peso || post.tamano) && (
                      <div className="flex gap-2 text-sm text-cyan-300 bg-slate-800/50 p-3 rounded-lg">
                        {post.peso && <span>⚖️ {post.peso} kg</span>}
                        {post.tamano && <span>📏 {post.tamano} cm</span>}
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="bg-slate-800/30 border border-cyan-500/20 rounded-2xl p-4">
                    <label className="text-sm font-bold text-white mb-3 block">💬 Mensaje (Opcional)</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Agrega una nota personal..."
                      maxLength={200}
                      className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-blue-400/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none h-24 transition-all"
                    />
                    <p className="text-xs text-cyan-300 mt-2">{message.length}/200</p>
                  </div>
                </motion.div>

                {/* Right Side - Users List */}
                <motion.div 
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex-1 flex flex-col gap-4"
                >
                  {/* Search */}
                  <div>
                    <label className="text-sm font-bold text-white mb-3 block">🔍 Buscar usuarios</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Busca entre tus seguidos..."
                      className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-blue-400/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                    />
                  </div>

                  {/* Users Grid */}
                  <div className="flex-1 overflow-y-auto">
                    {loadingFollowing ? (
                      <div className="flex items-center justify-center h-full">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full"
                        />
                      </div>
                    ) : following.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <MessageCircle className="w-20 h-20 text-slate-600 mb-4" />
                        <p className="text-lg text-blue-300">Aún no sigues a nadie</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {filteredFollowing.length > 0 ? (
                          filteredFollowing.map((u, idx) => {
                            const isSelected = selectedUsers.some(sel => sel.id === u.id);
                            return (
                              <motion.button
                                key={u.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => toggleUserSelection(u)}
                                className={`relative p-4 rounded-2xl transition-all border-2 group ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-cyan-600 to-blue-600 border-cyan-400 shadow-lg shadow-cyan-500/30'
                                    : 'bg-slate-800/30 border-cyan-500/20 hover:border-cyan-500/50 hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-14 h-14 border-2 border-cyan-400/50 group-hover:border-cyan-400 transition-all">
                                    <AvatarImage src={u.foto_perfil} className="object-cover" />
                                    <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-blue-600 text-white font-bold text-lg">
                                      {u.username[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  
                                  <div className="flex-1 text-left min-w-0">
                                    <p className="font-bold text-white">{u.nombre || u.username}</p>
                                    <p className="text-xs text-cyan-300">@{u.username}</p>
                                  </div>

                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="p-2 bg-white rounded-full flex-shrink-0"
                                    >
                                      <svg className="w-5 h-5 text-cyan-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </motion.div>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })
                        ) : (
                          <div className="col-span-2 text-center py-12 text-blue-300">
                            No se encontraron usuarios
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Count */}
                  {selectedUsers.length > 0 && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/50 rounded-xl p-4 text-center"
                    >
                      <p className="text-white font-bold">
                        {selectedUsers.length} {selectedUsers.length === 1 ? 'usuario seleccionado' : 'usuarios seleccionados'}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* Footer */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="px-8 py-6 border-t border-cyan-500/20 bg-gradient-to-r from-slate-800/50 via-slate-900/30 to-transparent flex gap-4 sticky bottom-0 backdrop-blur-xl"
              >
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-cyan-500/30 text-blue-300 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all rounded-xl py-3 font-bold text-lg"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendPost}
                  disabled={selectedUsers.length === 0 || sending}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 transition-all shadow-lg shadow-cyan-600/30 text-lg"
                >
                  {sending ? (
                    <>
                      <motion.span 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="inline-block mr-2"
                      >
                        ⏳
                      </motion.span>
                      Enviando a {selectedUsers.length} usuarios...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2 inline" /> Compartir con {selectedUsers.length} {selectedUsers.length === 1 ? 'usuario' : 'usuarios'}
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    , document.body
  );
};

export default SendPostModal;
