import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error al cargar perfil:', error);
        return null;
      }
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error inesperado al cargar perfil:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // Skip auth if Supabase is not configured
      const isConfigured = isSupabaseConfigured();
      console.log('isSupabaseConfigured:', isConfigured);
      
      if (!isConfigured) {
        console.warn('Supabase no está configurado. Por favor, configura las variables de entorno.');
        setLoading(false);
        return;
      }

      try {
        console.log('Intentando obtener sesión...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error obteniendo sesión:', error);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        console.log('Session obtenida:', session?.user?.id);
        
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          console.log('No hay sesión activa');
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error al verificar sesión:', error);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Skip auth listener if Supabase is not configured
    if (!isSupabaseConfigured()) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      if (session?.user) {
        setUser(session.user);
        if (!profile || profile.id !== session.user.id) {
           await fetchProfile(session.user.id);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signUp = async (email, password, username, nombre) => {
    try {
      // Verificar si el username ya existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (existingUser) {
        return { error: { message: 'El nombre de usuario ya está en uso' } };
      }

      // Crear usuario de Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            nombre,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Crear perfil público en tabla users
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: email,
            username: username,
            nombre: nombre,
            followers_count: 0,
            following_count: 0
          }]);

        if (profileError) {
          console.error("Error creando perfil:", profileError);
          return { data, error: { message: "Cuenta creada, pero falló la configuración del perfil." } };
        }
        
        toast({
          title: "¡Cuenta creada exitosamente!",
          description: "Ya puedes iniciar sesión con tus credenciales.",
        });
      }

      return { data, error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "¡Bienvenido de nuevo!",
        description: "Has iniciado sesión exitosamente.",
      });

      return { data, error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      
      toast({
        title: "Sesión cerrada",
        description: "¡Hasta pronto!",
      });

      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cerrar sesión",
        description: error.message,
      });
      return { error };
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return { error: { message: "No hay usuario autenticado" } };

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile(user.id);

      toast({
        title: "Perfil actualizado",
        description: "Tus cambios han sido guardados.",
      });

      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: error.message,
      });
      return { error };
    }
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile: () => user && fetchProfile(user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};