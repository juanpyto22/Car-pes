import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';

// Hook que combina autenticación real con datos demo
export const useAuthWithDemo = () => {
  const authContext = useContext(AuthContext);
  const { isDemoMode, mockUser, mockProfile } = useDemo();

  if (isDemoMode) {
    return {
      user: mockUser,
      profile: mockProfile,
      signOut: async () => {
        console.log('Demo mode: signOut simulation');
        // En modo demo, simplemente recargar la página
        window.location.reload();
      },
      signIn: async (email, password) => {
        console.log('Demo mode: signIn simulation');
        return { data: { user: mockUser }, error: null };
      },
      signUp: async (email, password, options) => {
        console.log('Demo mode: signUp simulation');
        return { 
          data: { 
            user: { 
              ...mockUser, 
              email, 
              user_metadata: options?.data || {} 
            } 
          }, 
          error: null 
        };
      },
      loading: false,
      isAuthenticated: true
    };
  }

  // Si no está en modo demo, usar la autenticación real
  return authContext;
};