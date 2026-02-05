import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Users, UserPlus, UserCheck, Edit3, Grid, ImageOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';

const MessageButton = ({ profile }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const handleMessage = (e) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    navigate('/messages', { state: { openUser: profile } });
  };

  return (
    <Button onClick={handleMessage} className="min-w-[120px] bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
      Mensaje
    </Button>
  );
};

const ProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const targetUserId = userId || currentUser?.id;

  useEffect(() => {
    if (targetUserId) fetchProfileData();
  }, [targetUserId]);

  useEffect(() => {
    if (currentUser && targetUserId && currentUser.id !== targetUserId) {
      checkFollowStatus();
    }
  }, [currentUser, targetUserId]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();
      
      if (userError) throw userError;
      
      if (!userData) {
        setProfile(null);
        setLoading(false);
        return;
      }
      
      setProfile(userData);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

    } catch (error) {
      console.error('Error en fetchProfileData:', error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el perfil" });
      setProfile(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    const { data } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetUserId)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  const handleFollowToggle = async () => {
    if (!currentUser) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
        setIsFollowing(false);
        setProfile(prev => ({...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1)}));
      } else {
        await supabase.from('follows').insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
        setIsFollowing(true);
        setProfile(prev => ({...prev, followers_count: (prev.followers_count || 0) + 1}));

        await supabase.from('notifications').insert([{
            user_id: targetUserId,
            type: 'follow',
            related_user_id: currentUser.id,
            read: false
        }]);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Falló la acción de seguir" });
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pt-20 flex justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-4">Usuario no encontrado</h2>
        <Link to="/feed"><Button variant="outline">Volver al inicio</Button></Link>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === targetUserId;

  return (
    <>
      <Helmet><title>{profile.nombre} (@{profile.username}) - FishHub</title></Helmet>
      <div className="min-h-screen bg-slate-950 pb-20">
        
        {/* Cover Image Placeholder - could be dynamic later */}
        <div className="h-64 bg-gradient-to-r from-blue-900 to-cyan-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544551763-46a013bb70d5')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative -mt-24 z-10">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
            
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center md:items-start shrink-0 w-full md:w-auto">
                <div className="relative p-1 bg-slate-950 rounded-full">
                    <Avatar className="w-40 h-40 border-4 border-cyan-500/50 shadow-2xl">
                        <AvatarImage src={profile.foto_perfil} className="object-cover" />
                        <AvatarFallback className="text-5xl bg-blue-900 text-cyan-200">
                        {profile.nombre?.[0]}
                        </AvatarFallback>
                    </Avatar>
                </div>
                
                <div className="mt-4 text-center md:text-left w-full">
                    <h1 className="text-3xl font-bold text-white mb-1">{profile.nombre}</h1>
                    <p className="text-cyan-400 font-medium text-lg mb-4">@{profile.username}</p>
                    
                    {/* Stats for Mobile */}
                    <div className="flex md:hidden justify-center gap-8 mb-6 py-4 border-y border-white/10 bg-white/5 rounded-xl">
                        <div className="text-center">
                            <span className="block text-xl font-bold text-white">{posts.length}</span>
                            <span className="text-xs text-blue-300 uppercase tracking-wide">Posts</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-xl font-bold text-white">{profile.followers_count || 0}</span>
                            <span className="text-xs text-blue-300 uppercase tracking-wide">Fans</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-xl font-bold text-white">{profile.following_count || 0}</span>
                            <span className="text-xs text-blue-300 uppercase tracking-wide">Siguiendo</span>
                        </div>
                    </div>

                    <div className="flex justify-center md:justify-start gap-3 w-full">
                      {isOwnProfile ? (
                        <Link to="/edit-profile" className="w-full md:w-auto">
                          <Button variant="outline" className="w-full md:w-auto border-blue-700 text-blue-200 hover:bg-blue-900 hover:text-white rounded-xl">
                            <Edit3 className="w-4 h-4 mr-2" /> Editar Perfil
                          </Button>
                        </Link>
                      ) : (
                        <div className="w-full md:w-auto flex gap-3">
                          <MessageButton profile={profile} />
                          <Button 
                            onClick={handleFollowToggle} 
                            disabled={followLoading}
                            className={`min-w-[120px] rounded-xl font-bold shadow-lg ${isFollowing ? 'bg-slate-800 hover:bg-red-900/80 hover:text-red-200 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
                          >
                            {isFollowing ? (
                              <span className="flex items-center"><UserCheck className="w-4 h-4 mr-2" /> Siguiendo</span>
                            ) : (
                              <span className="flex items-center"><UserPlus className="w-4 h-4 mr-2" /> Seguir</span>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                </div>
            </div>

            {/* Bio & Desktop Stats */}
            <div className="flex-1 w-full pt-0 md:pt-20">
                {/* Desktop Stats */}
                <div className="hidden md:flex items-center gap-10 mb-6 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg"><Grid className="w-5 h-5 text-cyan-400"/></div>
                        <div>
                            <span className="block text-xl font-bold text-white leading-none">{posts.length}</span>
                            <span className="text-xs text-blue-300 uppercase font-bold">Posts</span>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg"><Users className="w-5 h-5 text-cyan-400"/></div>
                        <div>
                            <span className="block text-xl font-bold text-white leading-none">{profile.followers_count || 0}</span>
                            <span className="text-xs text-blue-300 uppercase font-bold">Seguidores</span>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div className="flex items-center gap-3">
                         <div className="bg-blue-500/20 p-2 rounded-lg"><Users className="w-5 h-5 text-cyan-400"/></div>
                         <div>
                            <span className="block text-xl font-bold text-white leading-none">{profile.following_count || 0}</span>
                            <span className="text-xs text-blue-300 uppercase font-bold">Siguiendo</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
                    <h3 className="text-sm font-bold text-blue-400 uppercase mb-2">Biografía</h3>
                    <p className="text-blue-100 leading-relaxed">
                        {profile.bio || "Este usuario no ha añadido una biografía aún."}
                    </p>
                    {profile.ubicacion && (
                        <div className="flex items-center gap-2 mt-4 text-blue-300">
                            <MapPin className="w-4 h-4 text-cyan-500" />
                            <span>{profile.ubicacion}</span>
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Posts Grid */}
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                <Grid className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Publicaciones</h2>
            </div>
            
            {posts.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <ImageOff className="w-12 h-12 text-blue-500/50 mx-auto mb-4" />
                <p className="text-blue-300 font-medium">Aún no hay publicaciones</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <Link key={post.id} to={`/post/${post.id}`}>
                    <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="aspect-square bg-slate-900 rounded-xl overflow-hidden border border-white/10 relative group shadow-lg"
                    >
                      {post.video_url ? (
                        <video src={post.video_url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={post.foto_url} alt="" className="w-full h-full object-cover" />
                      )}
                      
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white">
                         <div className="flex items-center gap-6 text-lg font-bold">
                             <span className="flex items-center gap-2">❤️ {post.likes_count || 0}</span>
                             <span className="flex items-center gap-2">💬 {post.comments_count || 0}</span>
                         </div>
                         <span className="text-xs text-cyan-400 uppercase font-bold tracking-wider mt-2">Ver Detalles</span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;