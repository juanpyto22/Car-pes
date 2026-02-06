import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Users, UserPlus, UserCheck, Edit3, Grid, ImageOff, MessageCircle, Heart, Calendar, Lock, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import FollowersModal from '@/components/FollowersModal';

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPendingFollow, setIsPendingFollow] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [modalType, setModalType] = useState('followers');

  const targetUserId = userId || currentUser?.id;
  const isOwnProfile = currentUser?.id === targetUserId;

  useEffect(() => {
    if (targetUserId) {
      fetchProfileData();
    }
  }, [targetUserId]);

  useEffect(() => {
    if (currentUser && targetUserId && currentUser.id !== targetUserId) {
      checkFollowStatus();
    }
  }, [currentUser, targetUserId]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Usar solo * para evitar errores si alguna columna no existe
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();
      
      if (userError) {
        console.error('Error cargando perfil:', userError);
        // Si falla la query, intentar con campos mínimos
        const { data: fallbackData } = await supabase
          .from('profiles')
          .select('id, username, nombre, email, foto_perfil, bio, ubicacion, followers_count, following_count, created_at')
          .eq('id', targetUserId)
          .maybeSingle();
        
        if (fallbackData) {
          setProfile(fallbackData);
        } else {
          setProfile(null);
          setLoading(false);
          return;
        }
      } else if (!userData) {
        setProfile(null);
        setLoading(false);
        return;
      } else {
        setProfile(userData);
      }

      // Cargar posts del usuario
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (!postsError) {
        setPosts(postsData || []);
      } else {
        console.error('Error cargando posts del perfil:', postsError);
        setPosts([]);
      }

    } catch (error) {
      console.error('Error en fetchProfileData:', error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el perfil" });
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    console.log('Verificando estado de seguimiento:', {
      currentUser: currentUser.id,
      targetUser: targetUserId,
      isPrivate: profile?.is_private
    });
    
    // Verificar si ya sigue
    const { data: followData, error: followError } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetUserId)
      .maybeSingle();
      
    if (followError) {
      console.error('Error verificando seguimiento:', followError);
      return;
    }
    
    setIsFollowing(!!followData);
    console.log('Ya sigue al usuario:', !!followData);

    // Verificar si hay solicitud pendiente
    const { data: pendingData, error: pendingError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('related_user_id', currentUser.id)
      .eq('type', 'follow_request')
      .maybeSingle();
      
    if (pendingError) {
      console.error('Error verificando solicitudes pendientes:', pendingError);
      return;
    }
    
    setIsPendingFollow(!!pendingData);
    console.log('Solicitud pendiente encontrada:', !!pendingData, pendingData);
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Dejar de seguir
        const { error } = await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
        if (error) throw error;
        setIsFollowing(false);
        setProfile(prev => ({...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1)}));
      } else if (isPendingFollow) {
        // Cancelar solicitud pendiente
        const { error } = await supabase.from('notifications')
          .delete()
          .eq('user_id', targetUserId)
          .eq('related_user_id', currentUser.id)
          .eq('type', 'follow_request');
        if (error) throw error;
        setIsPendingFollow(false);
        toast({ title: "Solicitud cancelada" });
      } else if (profile?.is_private === true) {
        // Enviar solicitud de seguimiento para cuenta privada
        console.log('Enviando solicitud de seguimiento para cuenta privada:', {
          targetUserId,
          currentUserId: currentUser.id
        });
        
        const { data, error: notifError } = await supabase.from('notifications').insert([{
          user_id: targetUserId,
          type: 'follow_request',
          related_user_id: currentUser.id,
          read: false
        }]).select();
        
        if (notifError) {
          console.error('Error completo de notificación:', notifError);
          toast({ 
            variant: "destructive", 
            title: "Error al enviar solicitud", 
            description: `Error de base de datos: ${notifError.message}. Código: ${notifError.code || 'N/A'}` 
          });
          
          // Si el error es de RLS, dar instrucciones específicas
          if (notifError.message?.includes('row-level security policy') || notifError.code === '42501') {
            toast({
              variant: "destructive",
              title: "Problema de permisos",
              description: "Las políticas de la base de datos no están configuradas correctamente. Por favor ejecuta el script SQL proporcionado."
            });
          }
          throw notifError;
        }
        
        if (!data || data.length === 0) {
          console.error('No se creó ninguna notificación');
          toast({ 
            variant: "destructive", 
            title: "Error", 
            description: "No se pudo crear la solicitud. Verifica la configuración de la base de datos." 
          });
          return;
        }
        
        console.log('Solicitud creada exitosamente:', data);
        setIsPendingFollow(true);
        toast({ title: "Solicitud enviada", description: "Esperando aprobación" });
      } else {
        // Seguir directamente (cuenta pública)
        const { error: followError } = await supabase.from('follows').insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
        if (followError) throw followError;
        
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
      console.error('Error en follow:', error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Falló la acción de seguir" });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    navigate('/messages', { state: { openUser: profile } });
  };

  const openFollowersModal = (type) => {
    setModalType(type);
    setShowFollowersModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/20 to-slate-950 pt-20 flex justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/20 to-slate-950 flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <div className="w-24 h-24 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-12 h-12 text-blue-500/50" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Usuario no encontrado</h2>
          <p className="text-blue-300 mb-6">Este perfil no existe o ha sido eliminado</p>
          <Link to="/feed">
            <Button className="bg-cyan-600 hover:bg-cyan-500">Volver al inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{profile.nombre || profile.username} (@{profile.username}) - Car-Pes</title></Helmet>
      
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/10 to-slate-950 pb-20">
        
        {/* Cover Image with Gradient */}
        <div className="h-48 sm:h-64 md:h-72 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/80 via-blue-900/60 to-slate-950"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200')] bg-cover bg-center opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
          
          {/* Decorative elements */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative -mt-20 sm:-mt-24 z-10">
          
          {/* Profile Header Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl mb-8">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
              
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="p-1.5 bg-gradient-to-br from-cyan-500 via-blue-500 to-cyan-600 rounded-full shadow-xl shadow-cyan-500/20">
                  <Avatar className="w-32 h-32 md:w-36 md:h-36 border-4 border-slate-900">
                    <AvatarImage src={profile.foto_perfil} className="object-cover" />
                    <AvatarFallback className="text-4xl md:text-5xl bg-gradient-to-br from-blue-800 to-slate-900 text-cyan-200 font-bold">
                      {profile.nombre?.[0] || profile.username?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {/* Online indicator */}
                <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-slate-900 rounded-full"></div>
              </div>
              
              {/* Info */}
              <div className="flex-1 text-center md:text-left w-full">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
                      {profile.nombre || profile.username}
                      {profile.is_private && <Lock className="w-5 h-5 text-amber-400" />}
                    </h1>
                    <p className="text-cyan-400 font-medium">@{profile.username}</p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-center md:justify-end gap-3">
                    {isOwnProfile ? (
                      <Link to="/edit-profile">
                        <Button className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-white/10">
                          <Edit3 className="w-4 h-4 mr-2" /> Editar Perfil
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <Button 
                          onClick={handleMessage}
                          className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-white/10"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" /> Mensaje
                        </Button>
                        <Button 
                          onClick={handleFollowToggle} 
                          disabled={followLoading}
                          className={`min-w-[130px] rounded-xl font-bold transition-all ${
                            isFollowing 
                              ? 'bg-slate-800 hover:bg-red-900/80 hover:text-red-200 text-white border border-white/10' 
                              : isPendingFollow
                              ? 'bg-amber-600/20 hover:bg-red-900/50 text-amber-300 border border-amber-500/30'
                              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                          }`}
                        >
                          {followLoading ? (
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </span>
                          ) : isFollowing ? (
                            <span className="flex items-center"><UserCheck className="w-4 h-4 mr-2" /> Siguiendo</span>
                          ) : isPendingFollow ? (
                            <span className="flex items-center"><Clock className="w-4 h-4 mr-2" /> Solicitado</span>
                          ) : (
                            <span className="flex items-center"><UserPlus className="w-4 h-4 mr-2" /> Seguir</span>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Stats */}
                <div className="flex justify-center md:justify-start gap-6 md:gap-8 py-4 mb-4">
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-white">{posts.length}</span>
                    <span className="text-sm text-blue-300">Posts</span>
                  </div>
                  <button 
                    onClick={() => openFollowersModal('followers')}
                    className="text-center hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <span className="block text-2xl font-bold text-white">{profile.followers_count || 0}</span>
                    <span className="text-sm text-blue-300">Seguidores</span>
                  </button>
                  <button 
                    onClick={() => openFollowersModal('following')}
                    className="text-center hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <span className="block text-2xl font-bold text-white">{profile.following_count || 0}</span>
                    <span className="text-sm text-blue-300">Siguiendo</span>
                  </button>
                </div>
                
                {/* Bio */}
                {profile.bio && (
                  <p className="text-blue-100 leading-relaxed mb-4 max-w-xl">
                    {profile.bio}
                  </p>
                )}
                
                {/* Meta Info */}
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-blue-300">
                  {profile.ubicacion && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-cyan-500" />
                      <span>{profile.ubicacion}</span>
                    </div>
                  )}
                  {profile.created_at && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-cyan-500" />
                      <span>Se unió {formatDistanceToNow(new Date(profile.created_at), { locale: es, addSuffix: true })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Posts Grid */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <Grid className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-white">Publicaciones</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>
            
            {posts.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-white/5 border-dashed">
                <ImageOff className="w-16 h-16 text-blue-500/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Sin publicaciones</h3>
                <p className="text-blue-300">
                  {isOwnProfile 
                    ? '¡Comparte tu primera captura!' 
                    : 'Este usuario aún no ha publicado nada'}
                </p>
                {isOwnProfile && (
                  <Link to="/create-post">
                    <Button className="mt-6 bg-cyan-600 hover:bg-cyan-500">
                      Crear publicación
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {posts.map((post, index) => (
                  <Link key={post.id} to={`/post/${post.id}`}>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      className="aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-white/10 relative group shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-500/30 transition-all"
                    >
                      {post.video_url ? (
                        <video src={post.video_url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={post.foto_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-6 text-white font-bold">
                          <span className="flex items-center gap-2">
                            <Heart className="w-5 h-5 fill-current text-red-500" />
                            {post.likes_count || 0}
                          </span>
                          <span className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5" />
                            {post.comments_count || 0}
                          </span>
                        </div>
                      </div>
                      
                      {/* Video indicator */}
                      {post.video_url && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
                          <span className="text-xs text-white font-bold">VIDEO</span>
                        </div>
                      )}
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Followers/Following Modal */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userId={targetUserId}
        type={modalType}
        username={profile?.username}
      />
    </>
  );
};

export default ProfilePage;
