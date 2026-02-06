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
      // Primero intentar la tabla 'profiles'
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Si no existe en profiles, crear un perfil básico
      if (error || !data) {
        console.log('Profile not found, creating basic profile');
        const user = await supabase.auth.getUser();
        if (user.data?.user) {
          const basicProfile = {
            id: userId,
            nombre: user.data.user.user_metadata?.nombre || user.data.user.email?.split('@')[0] || 'Usuario',
            username: user.data.user.user_metadata?.username || user.data.user.email?.split('@')[0] || `user${userId.slice(-4)}`,
            email: user.data.user.email,
            followers_count: 0,
            following_count: 0,
            created_at: new Date().toISOString()
          };
          
          // Intentar crear el perfil
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert(basicProfile, { onConflict: 'id' })
            .select()
            .single();
            
          if (!createError && newProfile) {
            data = newProfile;
          } else {
            data = basicProfile;
          }
        }
      }
      
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      // Crear perfil temporal para evitar crashes
      const tempProfile = {
        id: userId,
        nombre: 'Usuario',
        username: `user${userId.slice(-4)}`,
        email: 'email@ejemplo.com'
      };
      setProfile(tempProfile);
      return tempProfile;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Skip auth if Supabase is not configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase no está configurado.');
      setAuthError('Supabase no está configurado');
      setLoading(false);
      return;
    }

    // Manejar eventos de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email);
      
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        setAuthError(null);
        // Usar setTimeout para evitar deadlock con Supabase
        setTimeout(async () => {
          if (isMounted) {
            await fetchProfile(session.user.id);
            setLoading(false);
          }
        }, 0);
      } else {
        setUser(null);
        setProfile(null);
        setAuthError(null);
        setLoading(false);
      }
    });

    // Verificar sesión existente manualmente
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      
      if (error) {
        console.error('Error obteniendo sesión:', error);
        setAuthError(error.message);
        setLoading(false);
        return;
      }

      // Si no hay sesión, terminar loading
      // Si hay sesión, onAuthStateChange ya lo manejará
      if (!session) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email, password, username, nombre) => {
    try {
      console.log('Attempting signup...', { email, username, nombre });
      
      // Delay más largo para evitar rate limiting aggressivo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Configuración para evitar confirmación de email y rate limiting
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            nombre: nombre,
          },
          emailRedirectTo: undefined, // Evitar confirmación
          captchaToken: undefined,
          // Deshabilitar email confirmation en desarrollo
        }
      });

      if (error) {
        console.error('Auth signup error:', error);
        
        // Rate limit handling - mejorado
        if (error.message?.includes('rate limit') || 
            error.message?.includes('Too Many Requests') || 
            error.message?.includes('429') ||
            error.message?.includes('signup_disabled')) {
          
          // Sugerir usar timestamp en el email para evitar duplicados
          const timestamp = Date.now().toString().slice(-4);
          return { 
            error: { 
              message: `⏰ Rate limiting activo. Intenta con:\n• Esperar 2-3 minutos\n• Usar email único: ejemplo${timestamp}@gmail.com\n• O usar modo DEMO mientras tanto` 
            } 
          };
        }
        
        // Email ya existe
        if (error.message?.includes('already') || error.message?.includes('exists')) {
          return { 
            error: { 
              message: 'Este email ya está registrado. Intenta iniciar sesión o usa otro email.' 
            } 
          };
        }
        
        throw error;
      }

      console.log('Auth signup successful:', data);

      if (data.user) {
        // Crear perfil en la tabla profiles
        const profileData = {
          id: data.user.id,
          email: email,
          username: username,
          nombre: nombre,
          followers_count: 0,
          following_count: 0,
          created_at: new Date().toISOString()
        };

        console.log('Creating profile...', profileData);
        
        // Delay más largo para evitar conflictos de BD
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // No fallar completamente si el perfil no se puede crear
          toast({
            title: '⚠️ Cuenta creada con advertencia',
            description: 'Tu cuenta fue creada pero puede necesitar configuración adicional.',
          });
        } else {
          toast({
            title: '✅ ¡Cuenta creada exitosamente!',
            description: data.session ? 
              '¡Perfecto! Ya puedes empezar a pescar virtualmente.' : 
              'Cuenta creada. Ya puedes iniciar sesión inmediatamente.',
          });
        }
      }

      return { data, error: null, needsEmailConfirmation: data.user && !data.session };
    } catch (error) {
      console.error('Signup process error:', error);
      
      // Manejo específico de errores comunes
      let errorMessage = error.message;
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        const timestamp = Date.now().toString().slice(-4);
        errorMessage = `⏰ Límite alcanzado. Soluciones:\n• Espera 2-3 minutos\n• Prueba: ejemplo${timestamp}@gmail.com\n• O usa el modo DEMO`;
      } else if (errorMessage.includes('Invalid email')) {
        errorMessage = '📧 Email inválido. Usa formato: usuario@dominio.com';
      } else if (errorMessage.includes('Password')) {
        errorMessage = '🔒 La contraseña necesita al menos 6 caracteres.';
      }
      
      return { error: { message: errorMessage } };
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