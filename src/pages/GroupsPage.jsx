import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Search, X, Camera, ArrowLeft, MessageCircle, Crown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useMessages } from '@/hooks/useMessages';

const GroupsPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { groupConversations, getGroupConversations, createGroup, uploadMessageImage } = useMessages(user);
  
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getGroupConversations().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Grupos - Car-Pes</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-24">
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Grupos de Chat</h1>
              <p className="text-blue-400 text-sm">Crea grupos y chatea con tus amigos</p>
            </div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => setShowCreate(true)}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl shadow-lg shadow-cyan-900/30"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Crear Grupo</span>
                <span className="sm:hidden">Crear</span>
              </Button>
            </motion.div>
          </motion.div>

          {/* Group List */}
          {groupConversations.length > 0 ? (
            <div className="space-y-3">
              {groupConversations.map((group, i) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/messages', { state: { openGroup: group } })}
                  className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-cyan-500/30 hover:bg-slate-800/50 transition-all group"
                >
                  <Avatar className="w-14 h-14 border-2 border-white/10 shrink-0 group-hover:border-cyan-500/40 transition-colors">
                    {group.avatar_url ? <AvatarImage src={group.avatar_url} className="object-cover" /> : null}
                    <AvatarFallback className="bg-gradient-to-br from-cyan-700 to-blue-800 text-white">
                      <Users className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-base truncate">{group.name}</h3>
                    <p className="text-xs text-cyan-400 mb-1">{group.memberCount || 0} miembros</p>
                    <p className="text-xs text-blue-400 truncate">
                      {group.lastMessage 
                        ? `${group.lastMessage.sender?.username}: ${group.lastMessage.contenido || '📷 Imagen'}`
                        : 'Sin mensajes aún'
                      }
                    </p>
                  </div>
                  
                  <MessageCircle className="w-5 h-5 text-blue-500 group-hover:text-cyan-400 transition-colors shrink-0" />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 bg-slate-900/30 rounded-3xl border border-white/10"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-500/20">
                <Users className="w-12 h-12 text-cyan-500/40" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No tienes grupos</h3>
              <p className="text-blue-400 mb-6 max-w-xs mx-auto text-sm">
                Crea un grupo de chat, añade a tus amigos por nombre de usuario y empieza a chatear
              </p>
              <Button 
                onClick={() => setShowCreate(true)}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" /> Crear mi primer grupo
              </Button>
            </motion.div>
          )}
        </div>

        {/* Create Group Modal */}
        <AnimatePresence>
          {showCreate && (
            <CreateGroupModal
              user={user}
              profile={profile}
              onClose={() => setShowCreate(false)}
              onCreated={async (group) => {
                setShowCreate(false);
                await getGroupConversations();
                navigate('/messages', { state: { openGroup: group } });
              }}
              createGroup={createGroup}
              uploadImage={uploadMessageImage}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

// ─── Create Group Modal ─────────────────────────────────────
const CreateGroupModal = ({ user, profile, onClose, onCreated, createGroup, uploadImage }) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1: name+photo, 2: add members
  const [groupName, setGroupName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "La imagen no debe superar 5MB" });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const searchUsers = async (term) => {
    if (!term.trim() || term.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      // Try profiles table first, then users
      let results = null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, nombre, foto_perfil')
        .or(`username.ilike.%${term}%,nombre.ilike.%${term}%`)
        .neq('id', user.id)
        .limit(10);

      if (!error && data) {
        results = data;
      } else {
        // Fallback to users table
        const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('id, username, nombre, foto_perfil')
          .or(`username.ilike.%${term}%,nombre.ilike.%${term}%`)
          .neq('id', user.id)
          .limit(10);
        if (!userErr) results = userData;
      }

      // Filter out already selected members
      const filtered = (results || []).filter(
        u => !selectedMembers.some(m => m.id === u.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchUsers(value), 300);
  };

  const addMember = (userObj) => {
    setSelectedMembers(prev => [...prev, userObj]);
    setSearchResults(prev => prev.filter(u => u.id !== userObj.id));
    setSearchTerm('');
  };

  const removeMember = (userId) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== userId));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast({ variant: "destructive", title: "Escribe un nombre para el grupo" });
      return;
    }
    if (selectedMembers.length === 0) {
      toast({ variant: "destructive", title: "Añade al menos un miembro" });
      return;
    }

    setCreating(true);
    try {
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile);
      }

      const memberIds = selectedMembers.map(m => m.id);
      const group = await createGroup(groupName.trim(), memberIds, avatarUrl);
      
      if (group) {
        onCreated(group);
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast({ variant: "destructive", title: "Error al crear grupo" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-slate-900 border border-white/10 rounded-t-3xl md:rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="text-blue-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : null}
          <h2 className="text-lg font-bold text-white flex-1">
            {step === 1 ? 'Nuevo Grupo' : 'Añadir Miembros'}
          </h2>
          <button onClick={onClose} className="text-blue-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 1 ? (
            /* ─── Step 1: Name + Photo ───────────────── */
            <div className="p-6 space-y-6">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full bg-gradient-to-br from-cyan-700 to-blue-800 flex items-center justify-center border-2 border-dashed border-cyan-500/50 hover:border-cyan-400/80 transition-colors overflow-hidden group"
                >
                  {avatarPreview ? (
                    <>
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-cyan-300">
                      <Camera className="w-8 h-8 mb-1" />
                      <span className="text-[10px]">Foto</span>
                    </div>
                  )}
                </motion.button>
                <p className="text-xs text-blue-400 mt-2">Foto del grupo (opcional)</p>
              </div>

              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Nombre del grupo *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej: Los Pescadores"
                  maxLength={50}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3.5 text-white placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-blue-500 mt-1 text-right">{groupName.length}/50</p>
              </div>
            </div>
          ) : (
            /* ─── Step 2: Add Members ───────────────── */
            <div className="p-4 space-y-4">
              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <div>
                  <p className="text-xs text-blue-400 font-semibold mb-2">
                    Miembros ({selectedMembers.length + 1})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {/* Creator (you) */}
                    <div className="flex items-center gap-2 bg-cyan-900/30 border border-cyan-500/30 rounded-full pl-1 pr-3 py-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={profile?.foto_perfil} className="object-cover" />
                        <AvatarFallback className="text-[10px] bg-cyan-800">{profile?.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-cyan-300 font-medium">Tú</span>
                      <Crown className="w-3 h-3 text-yellow-400" />
                    </div>

                    {selectedMembers.map(member => (
                      <motion.div
                        key={member.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="flex items-center gap-2 bg-slate-800 border border-white/10 rounded-full pl-1 pr-1 py-1"
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={member.foto_perfil} className="object-cover" />
                          <AvatarFallback className="text-[10px] bg-blue-900">{member.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white font-medium">{member.username}</span>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                        >
                          <X className="w-3 h-3 text-red-400" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Users */}
              <div>
                <label className="block text-xs text-blue-400 font-semibold mb-2">
                  Buscar por nombre de usuario
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="@username..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Search Results */}
              <div className="space-y-1">
                {searchResults.map(result => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => addMember(result)}
                  >
                    <Avatar className="w-10 h-10 border border-white/10">
                      <AvatarImage src={result.foto_perfil} className="object-cover" />
                      <AvatarFallback className="bg-blue-900 text-cyan-200 text-sm">
                        {result.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{result.username}</p>
                      {result.nombre && <p className="text-blue-400 text-xs truncate">{result.nombre}</p>}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-cyan-400" />
                    </div>
                  </motion.div>
                ))}

                {searchTerm.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-center text-blue-500 text-sm py-4">
                    No se encontraron usuarios
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/80">
          {step === 1 ? (
            <Button
              onClick={() => {
                if (!groupName.trim()) {
                  toast({ variant: "destructive", title: "Escribe un nombre para el grupo" });
                  return;
                }
                setStep(2);
              }}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl h-12 text-base font-semibold"
            >
              Siguiente
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={creating || selectedMembers.length === 0}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl h-12 text-base font-semibold disabled:opacity-50"
            >
              {creating ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando...
                </div>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Crear Grupo ({selectedMembers.length + 1} miembros)
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GroupsPage;
