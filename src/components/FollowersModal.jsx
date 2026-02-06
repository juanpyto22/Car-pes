import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Users, UserPlus, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const FollowersModal = ({ isOpen, onClose, userId, type = 'followers', username }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [loadingFollow, setLoadingFollow] = useState(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUsers();
      if (currentUser) {
        fetchMyFollowing();
      }
    }
  }, [isOpen, userId, type]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query;
      if (type === 'followers') {
        // Usuarios que siguen a userId
        query = supabase
          .from('follows')
          .select('follower:profiles!follower_id(*)')
          .eq('following_id', userId);
      } else {
        // Usuarios a los que sigue userId
        query = supabase
          .from('follows')
          .select('following:profiles!following_id(*)')
          .eq('follower_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const userList = data.map(item => type === 'followers' ? item.follower : item.following).filter(Boolean);
      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyFollowing = async () => {
    try {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id);
      
      setFollowingIds(new Set(data?.map(f => f.following_id) || []));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleFollowToggle = async (targetUserId) => {
    if (!currentUser || targetUserId === currentUser.id) return;
    
    setLoadingFollow(targetUserId);
    const isFollowing = followingIds.has(targetUserId);

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId);
        
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
        
        setFollowingIds(prev => new Set([...prev, targetUserId]));

        // Enviar notificación
        await supabase.from('notifications').insert([{
          user_id: targetUserId,
          type: 'follow',
          related_user_id: currentUser.id,
          read: false
        }]);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoadingFollow(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">
                {type === 'followers' ? 'Seguidores' : 'Siguiendo'}
              </h2>
              {username && (
                <span className="text-blue-400 text-sm">@{username}</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-blue-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Users List */}
          <div className="overflow-y-auto max-h-[calc(70vh-80px)] p-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-blue-500/30 mx-auto mb-3" />
                <p className="text-blue-300">
                  {type === 'followers' 
                    ? 'Aún no tiene seguidores' 
                    : 'Aún no sigue a nadie'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <Link 
                      to={`/profile/${user.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <Avatar className="w-12 h-12 border-2 border-cyan-500/30">
                        <AvatarImage src={user.foto_perfil} className="object-cover" />
                        <AvatarFallback className="bg-blue-900 text-cyan-200">
                          {user.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{user.nombre || user.username}</p>
                        <p className="text-sm text-blue-400 truncate">@{user.username}</p>
                      </div>
                    </Link>

                    {currentUser && currentUser.id !== user.id && (
                      <Button
                        size="sm"
                        disabled={loadingFollow === user.id}
                        onClick={() => handleFollowToggle(user.id)}
                        className={`ml-2 rounded-xl text-xs font-bold ${
                          followingIds.has(user.id)
                            ? 'bg-slate-700 hover:bg-red-900/50 hover:text-red-300 text-white'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        }`}
                      >
                        {loadingFollow === user.id ? (
                          '...'
                        ) : followingIds.has(user.id) ? (
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Siguiendo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <UserPlus className="w-3 h-3" /> Seguir
                          </span>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FollowersModal;
