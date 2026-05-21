import React, { useState } from 'react';
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFollowing = following.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendPost = async () => {
    if (!selectedUser || !user?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Selecciona un usuario para enviar el post'
      });
      return;
    }

    setSending(true);
    try {
      // Crear un mensaje con el post compartido
      const messageText = message.trim() 
        ? `${message}\n\n📌 Post compartido: ${post.contenido || 'Captura de ' + post.tipo_pez || 'Pesca'}` 
        : `📌 Post compartido: ${post.contenido || 'Captura de ' + post.tipo_pez || 'Pesca'}`;

      // Enviar mensaje privado con referencia al post
      const { error } = await supabase.from('direct_messages').insert({
        sender_id: user.id,
        receiver_id: selectedUser.id,
        contenido: messageText,
        shared_post_id: post.id,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      // Crear notificación
      await supabase.from('notifications').insert({
        user_id: selectedUser.id,
        type: 'post_shared',
        related_user_id: user.id,
        related_post_id: post.id,
        read: false
      });

      toast({
        title: '✅ Post enviado',
        description: `Se envió a ${selectedUser.username}`
      });

      setSelectedUser(null);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-40"
          />
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl mx-auto px-4"
          >
            <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-cyan-500/20 bg-gradient-to-r from-slate-800/50 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/20 rounded-xl">
                    <Send className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Compartir Publicación</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all text-blue-300 hover:text-white hover:scale-110"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Post Preview - Mejorado */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-4 border border-cyan-500/30 backdrop-blur-sm"
                >
                  <p className="text-xs text-cyan-300 font-bold mb-3 uppercase tracking-wider">📌 Publicación a compartir</p>
                  <div className="flex gap-4">
                    {post.foto_url && (
                      <motion.img
                        whileHover={{ scale: 1.05 }}
                        src={post.foto_url}
                        alt="post"
                        className="w-24 h-24 rounded-xl object-cover bg-slate-700 border border-cyan-500/30 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white mb-1">
                        {post.tipo_pez ? `🎣 Captura de ${post.tipo_pez}` : '📸 Publicación'}
                      </p>
                      <p className="text-xs text-blue-300 line-clamp-2 mb-2">
                        {post.contenido || post.descripcion || 'Sin descripción'}
                      </p>
                      {post.peso && (
                        <div className="flex gap-2 text-xs text-cyan-300">
                          <span>⚖️ {post.peso} kg</span>
                          {post.tamano && <span>📏 {post.tamano} cm</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Search */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <label className="text-sm font-bold text-white mb-3 block">🔍 Buscar usuario</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Escribe nombre o usuario..."
                    className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-blue-400/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:bg-slate-800 transition-all"
                  />
                </motion.div>

                {/* Following List */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <p className="text-sm font-bold text-white mb-3">👥 Elige un usuario</p>
                  {loadingFollowing ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-3 border-cyan-500 border-t-transparent" />
                    </div>
                  ) : following.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-cyan-500/20">
                      <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-blue-300">Aún no sigues a nadie</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto">
                      {filteredFollowing.length > 0 ? (
                        filteredFollowing.map((u, idx) => (
                          <motion.button
                            key={u.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setSelectedUser(u)}
                            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all border ${
                              selectedUser?.id === u.id
                                ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/20 border-cyan-500/60 shadow-lg shadow-cyan-500/20'
                                : 'bg-slate-800/30 border-cyan-500/10 hover:border-cyan-500/30 hover:bg-slate-800/50'
                            }`}
                          >
                            <Avatar className="w-12 h-12 border-2 border-cyan-500/30 flex-shrink-0">
                              <AvatarImage src={u.foto_perfil} className="object-cover" />
                              <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-blue-600 text-white font-bold">
                                {u.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-bold text-white">{u.nombre || u.username}</p>
                              <p className="text-xs text-cyan-300">@{u.username}</p>
                            </div>
                            {selectedUser?.id === u.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="p-1 bg-cyan-500 rounded-full"
                              >
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </motion.div>
                            )}
                          </motion.button>
                        ))
                      ) : (
                        <p className="text-sm text-blue-300 text-center py-8">No se encontraron usuarios</p>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Message Input */}
                {selectedUser && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className="text-sm font-bold text-white mb-3 block">💬 Mensaje personalizado (opcional)</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Agrega un comentario o nota..."
                      maxLength={200}
                      className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-blue-400/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:bg-slate-800 resize-none h-24 transition-all"
                    />
                    <p className="text-xs text-cyan-300 mt-2">{message.length}/200 caracteres</p>
                  </motion.div>
                )}

                {/* Info Box */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4 flex gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-cyan-200/90">
                    El post se compartirá como <span className="font-bold">mensaje privado</span> con el usuario. Podrá verlo en sus mensajes.
                  </p>
                </motion.div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-cyan-500/20 bg-gradient-to-r from-slate-800/50 to-transparent flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-cyan-500/30 text-blue-300 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all rounded-xl py-2.5"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendPost}
                  disabled={!selectedUser || sending}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl py-2.5 transition-all shadow-lg shadow-cyan-600/30"
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
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2 inline" /> Enviar Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SendPostModal;
