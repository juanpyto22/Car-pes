import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xmhcbilwchwazrkuebmf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtaGNiaWx3Y2h3YXpya3VlYm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjcxNTYsImV4cCI6MjA4NDA0MzE1Nn0.MtKsdAauD8Tr3SSMVJ4R7BYddOhDof3diwUiO-h9jKE';

console.log('Supabase Config:', { url: supabaseUrl, hasKey: !!supabaseAnonKey });

// Create Supabase client with simplified configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 1, // Reducir aún más para evitar rate limiting
    },
    // Deshabilitar heartbeat para reducir conexiones
    heartbeatIntervalMs: 60000,
    reconnectAfterMs: function(tries) {
      return Math.min(tries * 1000, 30000); // Backoff más largo
    },
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
    },
  },
  // Configuración más tolerante a errores
  db: {
    schema: 'public',
  },
});

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};




