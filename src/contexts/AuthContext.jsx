import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;
    
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
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      // Skip auth if Supabase is not configured
      const isConfigured = isSupabaseConfigured();
      
      if (!isConfigured) {
        console.warn('Supabase no está configurado. Por favor, configura las variables de entorno.');
        if (isMounted) {
          setAuthError('Supabase no está configurado');
          setLoading(false);
        }
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error obteniendo sesión:', error);
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setAuthError(error.message);
            setLoading(false);
          }
          return;
        }
        
        if (session?.user) {
          if (isMounted) {
            setUser(session.user);
            setAuthError(null);
            await fetchProfile(session.user.id);
          }
        } else {
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setAuthError(null);
          }
        }
      } catch (error) {
        console.error('Error al verificar sesión:', error);
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setAuthError(error.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Skip auth listener if Supabase is not configured
    if (!isSupabaseConfigured()) {
      return () => { isMounted = false; };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setAuthError(null);
        await fetchProfile(session.user.id);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setAuthError(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      } else if (session?.user) {
        setUser(session.user);
        setAuthError(null);
        if (!profile || profile.id !== session.user.id) {
          await fetchProfile(session.user.id);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

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

      // Crear usuario de Auth con confirmación de email
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            nombre,
          },
          emailRedirectTo: `${window.location.origin}/login`
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
        
        // Verificar si el email necesita confirmación
        if (data.user && !data.session) {
          toast({
            title: "¡Cuenta creada exitosamente!",
            description: "Revisa tu email para confirmar tu cuenta antes de iniciar sesión.",
          });
        } else {
          toast({
            title: "¡Cuenta creada exitosamente!",
            description: "Ya puedes iniciar sesión con tus credenciales.",
          });
        }
      }

      return { data, error: null, needsEmailConfirmation: data.user && !data.session };
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

      if (error) {
        // Mensaje más claro para email no confirmado
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Por favor, confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
        }
        throw error;
      }

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
    authError,
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