import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useImageUpload } from './useImageUpload';
import { useToast } from '@/components/ui/use-toast';

export const useProfile = (initialProfile = null) => {
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { uploadImage, deleteImage } = useImageUpload();
  const { toast } = useToast();

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          followers:follows!following_id(count),
          following:follows!follower_id(count),
          posts:posts(count),
          _count:follows!following_id(count)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      // Processar contadores
      const processedProfile = {
        ...data,
        followers_count: data.followers?.[0]?.count || 0,
        following_count: data.following?.[0]?.count || 0,
        posts_count: data.posts?.[0]?.count || 0,
      };

      setProfile(processedProfile);
      return processedProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        variant: "destructive",
        title: "Error al cargar perfil",
        description: error.message
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateProfile = useCallback(async (updates) => {
    if (!profile?.id) {
      toast({
        variant: "destructive", 
        title: "Error",
        description: "No hay perfil para actualizar"
      });
      return false;
    }

    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(prev => ({ ...prev, ...data }));
      
      toast({
        title: "✅ Perfil actualizado",
        description: "Los cambios se han guardado correctamente"
      });
      
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: error.message
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [profile?.id, toast]);

  const updateProfilePicture = useCallback(async (file) => {
    if (!profile?.id || !file) return false;

    setUpdating(true);
    try {
      // Eliminar foto anterior si existe
      if (profile.foto_perfil_path) {
        await deleteImage(profile.foto_perfil_path, 'avatars');
      }

      // Subir nueva imagen
      const uploadResult = await uploadImage(file, 'avatars', `user-${profile.id}`);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Error subiendo imagen');
      }

      // Actualizar perfil con nueva URL
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          foto_perfil: uploadResult.url,
          foto_perfil_path: uploadResult.path
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(prev => ({ ...prev, ...data }));
      
      toast({
        title: "📸 Foto actualizada",
        description: "Tu nueva foto de perfil se ha guardado"
      });
      
      return true;
    } catch (error) {
      console.error('Error updating profile picture:', error);
      toast({
        variant: "destructive",
        title: "Error al actualizar foto",
        description: error.message
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [profile, uploadImage, deleteImage, toast]);

  const checkUsernameAvailability = useCallback(async (username) => {
    if (!username || username === profile?.username) return true;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .limit(1);

      if (error) throw error;
      
      return data.length === 0;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  }, [profile?.username]);

  const generateUsername = useCallback(async (baseUsername) => {
    let username = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
    let counter = 1;
    
    while (!(await checkUsernameAvailability(username))) {
      username = `${baseUsername}${counter}`;
      counter++;
      if (counter > 100) break; // prevenir loop infinito
    }
    
    return username;
  }, [checkUsernameAvailability]);

  const getProfileStats = useCallback(async (userId) => {
    if (!userId) return null;

    try {
      const [
        { count: followersCount },
        { count: followingCount },
        { count: postsCount }
      ] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId),
        supabase
          .from('follows') 
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId),
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
      ]);

      return {
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        posts_count: postsCount || 0
      };
    } catch (error) {
      console.error('Error fetching profile stats:', error);
      return {
        followers_count: 0,
        following_count: 0,
        posts_count: 0
      };
    }
  }, []);

  return {
    profile,
    loading,
    updating,
    fetchProfile,
    updateProfile,
    updateProfilePicture,
    checkUsernameAvailability,
    generateUsername,
    getProfileStats,
    setProfile
  };
};