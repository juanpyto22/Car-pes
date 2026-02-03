import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Trash2, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useComments } from '@/hooks/useComments';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const CommentSection = ({ postId, postOwnerId }) => {
  const { user, profile } = useAuth();
  const { comments, loading, addComment, deleteComment } = useComments(postId);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting || !user) return;

    setSubmitting(true);
    const success = await addComment(user.id, newComment, postOwnerId);
    if (success) {
      setNewComment('');
    }
    setSubmitting(false);
  };

  return (
    <div className="mt-8 bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-white/5">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          Comentarios <span className="text-cyan-400 text-sm font-normal px-2 py-0.5 bg-cyan-900/30 rounded-full">{comments.length}</span>
        </h3>
      </div>

      <div className="max-h-[400px] overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="text-center py-8 text-blue-400 text-sm">Cargando comentarios...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-blue-300 mb-2">No hay comentarios aún.</p>
            <p className="text-sm text-blue-500">¡Sé el primero en opinar!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-3 group"
              >
                <Link to={`/profile/${comment.user_id}`}>
                  <Avatar className="w-8 h-8 mt-1 border border-cyan-500/30">
                    <AvatarImage src={comment.user?.foto_perfil} />
                    <AvatarFallback className="bg-blue-900 text-xs">{comment.user?.username?.[0]}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <div className="bg-slate-800/50 rounded-2xl rounded-tl-none p-3 border border-white/5">
                    <div className="flex justify-between items-start mb-1">
                      <Link 
                        to={`/profile/${comment.user_id}`}
                        className="font-bold text-sm text-white hover:text-cyan-400 transition-colors"
                      >
                        {comment.user?.username}
                      </Link>
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] text-blue-400 flex items-center gap-1">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                        </span>
                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="text-blue-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar comentario"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-blue-100 text-sm whitespace-pre-wrap">{comment.contenido}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="p-4 bg-slate-800/30 border-t border-white/5">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <Avatar className="w-8 h-8 hidden sm:block mb-1">
                <AvatarImage src={profile?.foto_perfil} />
                <AvatarFallback className="bg-blue-900">{profile?.username?.[0] || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={user ? "Escribe un comentario..." : "Inicia sesión para comentar"}
                    disabled={!user}
                    maxLength={500}
                    className="w-full bg-slate-950 border border-blue-900 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none h-[50px] custom-scrollbar focus:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="absolute right-2 bottom-2 text-[10px] text-blue-500">
                    {newComment.length}/500
                </div>
            </div>
            <Button 
                type="submit" 
                size="icon"
                disabled={!newComment.trim() || submitting || !user}
                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-[50px] w-[50px] shrink-0 shadow-lg shadow-cyan-900/20"
            >
                {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Send className="w-5 h-5" />}
            </Button>
        </form>
      </div>
    </div>
  );
};

export default CommentSection;