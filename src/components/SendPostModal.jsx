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
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-slate-900 border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Enviar publicación</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors text-blue-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Post Preview */}
                <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-blue-300 font-bold mb-2">Publicación a enviar:</p>
                  <div className="flex gap-3">
                    {post.foto_url && (
                      <img
                        src={post.foto_url}
                        alt="post"
                        className="w-16 h-16 rounded-lg object-cover bg-slate-700"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate font-medium">
                        {post.tipo_pez ? `Captura de ${post.tipo_pez}` : 'Publicación'}
                      </p>
                      <p className="text-xs text-blue-300 truncate">
                        {post.contenido || post.descripcion || 'Sin descripción'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div>
                  <label className="text-sm font-bold text-white mb-2 block">Buscar usuario</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Busca entre tus seguidos..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-blue-400/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                {/* Following List */}
                {loadingFollowing ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
                  </div>
                ) : following.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-blue-300">Aún no sigues a nadie</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-white/5 rounded-lg p-2">
                    {filteredFollowing.length > 0 ? (
                      filteredFollowing.map(u => (
                        <button
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                            selectedUser?.id === u.id
                              ? 'bg-cyan-500/20 border border-cyan-500/50'
                              : 'hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={u.foto_perfil} className="object-cover" />
                            <AvatarFallback className="bg-blue-900 text-cyan-200">
                              {u.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-bold text-white truncate">{u.nombre || u.username}</p>
                            <p className="text-xs text-blue-300 truncate">@{u.username}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-blue-300 text-center py-4">No se encontraron usuarios</p>
                    )}
                  </div>
                )}

                {/* Message Input */}
                {selectedUser && (
                  <div>
                    <label className="text-sm font-bold text-white mb-2 block">
                      Mensaje (opcional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Agrega un comentario personal..."
                      maxLength={200}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-blue-400/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none h-20"
                    />
                    <p className="text-xs text-blue-400 mt-1">{message.length}/200</p>
                  </div>
                )}

                {/* Info */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-300">
                    El post se enviará como un mensaje privado. El usuario verá tu nombre y podrá abrir el post.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 bg-slate-800/50 flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-slate-600 text-blue-300 hover:bg-slate-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendPost}
                  disabled={!selectedUser || sending}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span> Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Enviar
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
