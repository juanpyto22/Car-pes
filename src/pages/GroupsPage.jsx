import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Lock, Globe, MapPin, 
  Calendar, MessageCircle, Settings, UserPlus, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const GroupsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [myGroups, setMyGroups] = useState([]);
  const [featuredGroups, setFeaturedGroups] = useState([]);
  const [nearbyGroups, setNearbyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    if (!user?.id) return;

    try {
      // Fetch user's groups
      const { data: userGroups, error: userGroupsError } = await supabase
        .from('group_members')
        .select(`
          *,
          community:communities!group_id(
            *,
            member_count,
            recent_activity:group_posts(count),
            creator:users!creator_id(username, foto_perfil)
          )
        `)
        .eq('user_id', user.id);

      if (userGroupsError) throw userGroupsError;

      // Fetch featured groups (public groups with most activity)
      const { data: featured, error: featuredError } = await supabase
        .from('communities')
        .select(`
          *,
          member_count,
          recent_posts:group_posts(count),
          creator:users!creator_id(username, foto_perfil)
        `)
        .eq('is_public', true)
        .order('member_count', { ascending: false })
        .limit(6);

      if (featuredError) throw featuredError;

      // Fetch nearby groups (would use geolocation in real app)
      const { data: nearby, error: nearbyError } = await supabase
        .from('communities')
        .select(`
          *,
          member_count,
          creator:users!creator_id(username, foto_perfil)
        `)
        .eq('is_public', true)
        .not('id', 'in', `(${userGroups?.map(g => g.group_id).join(',') || 'null'})`)
        .order('created_at', { ascending: false })
        .limit(8);

      if (nearbyError) throw nearbyError;

      setMyGroups(userGroups?.map(ug => ug.community) || []);
      setFeaturedGroups(featured || []);
      setNearbyGroups(nearby || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        variant: "destructive",
        title: "Error al cargar grupos"
      });
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (groupId) => {
    if (!user?.id) return;

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        toast({ title: "Ya eres miembro de este grupo" });
        return;
      }

      // Add user to group
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      // Update member count
      await supabase.rpc('increment_group_members', { group_id: groupId });

      toast({ title: "¡Te has unido al grupo!" });
      fetchGroups(); // Refresh
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        variant: "destructive",
        title: "Error al unirse al grupo"
      });
    }
  };

  const GroupCard = ({ group, showJoinButton = false, size = "default" }) => {
    const isSmall = size === "small";
    
    return (
      <motion.div
        whileHover={{ y: -4 }}
        className={`bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-lg hover:shadow-cyan-500/10 transition-all ${
          isSmall ? 'p-4' : 'p-6'
        }`}
      >
        {/* Group Cover */}
        <div className={`relative rounded-xl overflow-hidden mb-4 ${
          isSmall ? 'h-24' : 'h-32'  
        }`}>
          <img
            src={group.cover_image || '/api/placeholder/400/200'}
            alt={group.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Group Type Badge */}
          <div className="absolute top-2 right-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              group.is_public 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            }`}>
              {group.is_public ? (
                <><Globe className="w-3 h-3 inline mr-1" />Público</>
              ) : (
                <><Lock className="w-3 h-3 inline mr-1" />Privado</>
              )}
            </div>
          </div>

          {/* Member Count */}
          <div className="absolute bottom-2 left-2 text-white">
            <p className={`font-bold ${isSmall ? 'text-lg' : 'text-xl'}`}>{group.name}</p>
            <div className="flex items-center gap-1 text-xs text-white/80">
              <Users className="w-3 h-3" />
              {group.member_count || 0} miembros
            </div>
          </div>
        </div>

        {/* Group Info */}
        <div className="space-y-3">
          <p className={`text-blue-200 leading-relaxed ${
            isSmall ? 'text-sm line-clamp-2' : 'text-sm line-clamp-3'
          }`}>
            {group.description || 'Sin descripción disponible'}
          </p>

          {/* Creator */}
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={group.creator?.foto_perfil} />
              <AvatarFallback className="text-xs">{group.creator?.username?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-blue-400">
              por @{group.creator?.username}
            </span>
          </div>

          {/* Location & Category */}
          <div className="flex items-center justify-between text-xs text-blue-300">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {group.location || 'Ubicación no especificada'}
            </div>
            <span className="px-2 py-1 bg-cyan-900/30 rounded-full">
              {group.category || 'General'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {showJoinButton ? (
              <Button 
                size="sm" 
                className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                onClick={() => joinGroup(group.id)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Unirse
              </Button>
            ) : (
              <Link to={`/groups/${group.id}`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  Ver Grupo
                </Button>
              </Link>
            )}
            
            <Button size="sm" variant="ghost">
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const CreateGroupModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      location: '',
      category: 'general',
      is_public: true
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!user?.id) return;

      setSubmitting(true);
      try {
        const { data, error } = await supabase
          .from('communities')
          .insert({
            ...formData,
            creator_id: user.id,
            member_count: 1
          })
          .select()
          .single();

        if (error) throw error;

        // Add creator as admin
        await supabase
          .from('group_members')
          .insert({
            group_id: data.id,
            user_id: user.id,
            role: 'admin'
          });

        toast({ title: "¡Grupo creado exitosamente!" });
        onClose();
        fetchGroups();
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          location: '',
          category: 'general',
          is_public: true
        });
      } catch (error) {
        console.error('Error creating group:', error);
        toast({
          variant: "destructive",
          title: "Error al crear grupo"
        });
      } finally {
        setSubmitting(false);
      }
    };

    if (!isOpen) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Crear Grupo</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <Plus className="w-5 h-5 rotate-45" />
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                  placeholder="Ej: Pescadores de Madrid"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white resize-none"
                  rows={3}
                  placeholder="Describe tu grupo..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                  placeholder="Ej: Madrid, España"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                >
                  <option value="general">General</option>
                  <option value="freshwater">Agua Dulce</option>
                  <option value="saltwater">Agua Salada</option>
                  <option value="fly_fishing">Pesca con Mosca</option>
                  <option value="tournament">Torneos</option>
                  <option value="regional">Regional</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({...formData, is_public: e.target.checked})}
                  className="w-4 h-4 accent-cyan-500"
                />
                <label htmlFor="is_public" className="text-blue-200">
                  Grupo público (cualquiera puede unirse)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                >
                  {submitting ? 'Creando...' : 'Crear Grupo'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Grupos - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Comunidades</h1>
              <p className="text-blue-400">Conecta con pescadores de tu zona</p>
            </div>
            
            <Button 
              onClick={() => setShowCreateGroup(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Grupo
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar grupos por nombre, ubicación o categoría..."
              className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-blue-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="my-groups" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="my-groups">Mis Grupos ({myGroups.length})</TabsTrigger>
              <TabsTrigger value="featured">Destacados</TabsTrigger>
              <TabsTrigger value="discover">Descubrir</TabsTrigger>
            </TabsList>

            {/* My Groups Tab */}
            <TabsContent value="my-groups">
              {myGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myGroups.map(group => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12 bg-slate-900/30 rounded-2xl border border-white/10"
                >
                  <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No tienes grupos</h3>
                  <p className="text-blue-400 mb-6">
                    Únete a una comunidad o crea la tuya propia
                  </p>
                  <Button 
                    onClick={() => setShowCreateGroup(true)}
                    className="bg-cyan-600 hover:bg-cyan-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear mi primer grupo
                  </Button>
                </motion.div>
              )}
            </TabsContent>

            {/* Featured Groups Tab */}
            <TabsContent value="featured">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Grupos Destacados</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredGroups.map(group => (
                    <GroupCard 
                      key={group.id} 
                      group={group} 
                      showJoinButton={!myGroups.some(mg => mg.id === group.id)}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Discover Tab */}
            <TabsContent value="discover">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Descubre Nuevos Grupos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {nearbyGroups.map(group => (
                    <GroupCard 
                      key={group.id} 
                      group={group} 
                      size="small"
                      showJoinButton={!myGroups.some(mg => mg.id === group.id)}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Create Group Modal */}
        <CreateGroupModal 
          isOpen={showCreateGroup} 
          onClose={() => setShowCreateGroup(false)} 
        />
      </div>
    </>
  );
};

export default GroupsPage;