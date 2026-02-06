import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Share, MessageCircle, MoreHorizontal, Flag } from 'lucide-react';
import { useAdvancedSocial } from '@/hooks/useAdvancedSocial';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

const AdvancedReactionBar = ({ 
  post, 
  reactions = [], 
  onReactionUpdate, 
  onShare, 
  onComment,
  className = "" 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    REACTION_TYPES, 
    addReaction, 
    sharePost, 
    reportContent,
    loading 
  } = useAdvancedSocial(user);

  const [showReactions, setShowReactions] = useState(false);
  const [shareText, setShareText] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // Get user's reaction to this post
  const userReaction = reactions?.find(r => r.user_id === user?.id);
  
  // Count reactions by type
  const reactionCounts = reactions?.reduce((counts, reaction) => {
    counts[reaction.reaction_type] = (counts[reaction.reaction_type] || 0) + 1;
    return counts;
  }, {}) || {};

  // Get most popular reaction types (top 3)
  const popularReactions = Object.entries(reactionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));

  const handleReaction = async (reactionType) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Inicia sesión para reaccionar"
      });
      return;
    }

    const success = await addReaction(post.id, reactionType);
    if (success && onReactionUpdate) {
      onReactionUpdate();
    }
    setShowReactions(false);
  };

  const handleShare = async () => {
    if (!user?.id) {
      toast({
        variant: "destructive", 
        title: "Inicia sesión para compartir"
      });
      return;
    }

    const success = await sharePost(post.id, shareText);
    if (success) {
      setShareText('');
      if (onShare) onShare();
    }
  };

  const handleReport = async (reason) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Inicia sesión para reportar"
      });
      return;
    }

    const success = await reportContent(post.id, reason, reportDescription);
    if (success) {
      setReportReason('');
      setReportDescription('');
    }
  };

  return (
    <div className={`flex items-center justify-between pt-3 border-t border-white/10 ${className}`}>
      {/* Reactions */}
      <div className="flex items-center gap-2">
        {/* Like Button with Reaction Picker */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setTimeout(() => setShowReactions(false), 300)}
            onClick={() => handleReaction(userReaction?.reaction_type || 'like')}
            disabled={loading}
            className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
              userReaction 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                : 'text-blue-300 hover:bg-white/5 hover:text-red-400'
            }`}
          >
            {userReaction ? (
              <span className="text-lg">{REACTION_TYPES[userReaction.reaction_type]?.emoji}</span>
            ) : (
              <Heart className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">
              {Object.values(reactionCounts).reduce((sum, count) => sum + count, 0) || 0}
            </span>
          </motion.button>

          {/* Reaction Selector */}
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute bottom-full left-0 mb-2 bg-slate-800/95 backdrop-blur-sm border border-white/20 rounded-2xl p-2 flex gap-1 shadow-xl z-50"
                onMouseEnter={() => setShowReactions(true)}
                onMouseLeave={() => setShowReactions(false)}
              >
                {Object.entries(REACTION_TYPES).map(([type, { emoji, label }]) => (
                  <motion.button
                    key={type}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReaction(type)}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                    title={label}
                  >
                    <span className="text-2xl">{emoji}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Popular Reactions Display */}
        {popularReactions.length > 0 && (
          <div className="flex items-center gap-1">
            {popularReactions.map(({ type, count }) => (
              <div key={type} className="flex items-center gap-1 text-xs text-blue-400">
                <span>{REACTION_TYPES[type]?.emoji}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Comment Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onComment}
          className="flex items-center gap-2 px-3 py-2 rounded-full text-blue-300 hover:bg-white/5 hover:text-blue-400 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Comentar</span>
        </motion.button>

        {/* Share Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-blue-300 hover:bg-white/5 hover:text-green-400 transition-colors"
            >
              <Share className="w-5 h-5" />
              <span className="text-sm font-medium">Compartir</span>
            </motion.button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-slate-900 border-blue-500/30 max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Compartir Publicación</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-3 mt-4">
                  <textarea
                    value={shareText}
                    onChange={(e) => setShareText(e.target.value)}
                    placeholder="Agrega un comentario... (opcional)"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white resize-none h-20 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  
                  {/* Post Preview */}
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {post.profiles?.nombre?.[0] || 'U'}
                        </span>
                      </div>
                      <span className="text-white text-sm font-medium">
                        {post.profiles?.nombre || 'Usuario'}
                      </span>
                    </div>
                    <p className="text-blue-200 text-sm line-clamp-2">
                      {post.contenido || 'Publicación'}
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleShare}
                disabled={loading}
                className="bg-cyan-600 text-white hover:bg-cyan-700"
              >
                {loading ? 'Compartiendo...' : 'Compartir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* More Options */}
        {user?.id !== post.user_id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-full text-blue-300 hover:bg-white/5 hover:text-blue-400 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-blue-800 text-white">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem 
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer hover:bg-red-900/30 text-red-400"
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    Reportar
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-red-500/30 max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Reportar Contenido</AlertDialogTitle>
                    <AlertDialogDescription>
                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="text-white text-sm font-medium mb-2 block">
                            Motivo del reporte
                          </label>
                          <select
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                          >
                            <option value="">Seleccionar motivo</option>
                            <option value="spam">Spam o contenido no deseado</option>
                            <option value="harassment">Acoso o bullying</option>
                            <option value="inappropriate">Contenido inapropiado</option>
                            <option value="fake">Información falsa</option>
                            <option value="copyright">Violación de derechos de autor</option>
                            <option value="other">Otro</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-white text-sm font-medium mb-2 block">
                            Descripción (opcional)
                          </label>
                          <textarea
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            placeholder="Proporciona más detalles..."
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white resize-none h-20"
                          />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-slate-700 text-white">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleReport(reportReason)}
                      disabled={!reportReason || loading}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      {loading ? 'Reportando...' : 'Reportar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default AdvancedReactionBar;