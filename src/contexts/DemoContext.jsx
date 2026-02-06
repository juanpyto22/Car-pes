import React, { createContext, useContext, useState } from 'react';

const DemoContext = createContext();

// Mock data for demo mode
const mockUser = {
  id: 'demo-user-123',
  email: 'demo@carpes.dev',
  user_metadata: {
    username: 'pescador_demo',
    nombre: 'Usuario Demo'
  }
};

const mockProfile = {
  id: 'demo-user-123',
  username: 'pescador_demo',
  nombre: 'Usuario Demo',
  email: 'demo@carpes.dev',
  foto_perfil: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  followers_count: 127,
  following_count: 89,
  created_at: '2024-01-15T10:00:00Z'
};

const mockPosts = [
  {
    id: '1',
    user_id: 'demo-user-123',
    profiles: mockProfile,
    content: '🎣 Gran día en el lago! Conseguí esta hermosa trucha de 2kg usando una cucharilla dorada. El agua estaba perfecta a 15°C.',
    image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
    location: 'Lago Nahuel Huapi, Bariloche',
    fish_species: 'Trucha Arcoíris',
    fish_weight: '2.1',
    created_at: '2024-12-10T08:30:00Z',
    likes_count: 23,
    comments_count: 7,
    has_liked: false
  },
  {
    id: '2',
    user_id: 'other-user',
    profiles: {
      username: 'maria_pesca',
      nombre: 'María González',
      foto_perfil: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
    },
    content: 'Increíble jornada de pesca nocturna 🌙 Los dorados estaban muy activos cerca de la costa.',
    image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
    location: 'Río Paraná, Corrientes',
    fish_species: 'Dorado',
    fish_weight: '3.8',
    created_at: '2024-12-09T22:15:00Z',
    likes_count: 31,
    comments_count: 12,
    has_liked: true
  }
];

const mockComments = [
  {
    id: '1',
    post_id: '1',
    user_id: 'other-user',
    profiles: {
      username: 'carlos_angler',
      nombre: 'Carlos Mendez',
      foto_perfil: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    },
    content: '¡Qué belleza de trucha! ¿Qué carnada usaste?',
    created_at: '2024-12-10T09:00:00Z'
  }
];

const mockStories = [
  {
    id: 'story-1',
    user_id: 'demo-user-123',
    profiles: mockProfile,
    content: 'Preparando todo para la jornada matutina 🎣',
    image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop',
    created_at: '2024-12-10T06:00:00Z',
    expires_at: '2024-12-11T06:00:00Z'
  }
];

export const DemoProvider = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoRealtime, setDemoRealtime] = useState(true);

  const enableDemoMode = () => {
    setIsDemoMode(true);
    localStorage.setItem('car-pes-demo-mode', 'true');
  };

  const disableDemoMode = () => {
    setIsDemoMode(false);
    localStorage.removeItem('car-pes-demo-mode');
  };

  // Mock functions that simulate Supabase operations
  const mockSupabase = {
    from: (table) => ({
      select: (query = '*') => Promise.resolve({
        data: table === 'posts' ? mockPosts : 
              table === 'profiles' ? [mockProfile] :
              table === 'comments' ? mockComments :
              table === 'stories' ? mockStories : [],
        error: null
      }),
      insert: (data) => Promise.resolve({
        data: Array.isArray(data) ? data : [{ ...data, id: Date.now().toString() }],
        error: null
      }),
      update: (data) => Promise.resolve({
        data: [data],
        error: null
      }),
      delete: () => Promise.resolve({
        data: [],
        error: null
      }),
      upsert: (data) => Promise.resolve({
        data: Array.isArray(data) ? data : [data],
        error: null
      }),
      eq: function() { return this; },
      order: function() { return this; },
      limit: function() { return this; },
      range: function() { return this; }
    }),
    
    auth: {
      getUser: () => Promise.resolve({
        data: { user: mockUser },
        error: null
      }),
      signUp: ({ email, password, options }) => Promise.resolve({
        data: { 
          user: { ...mockUser, email, user_metadata: options?.data || {} }
        },
        error: null
      }),
      signInWithPassword: () => Promise.resolve({
        data: { user: mockUser },
        error: null
      }),
      signOut: () => Promise.resolve({ error: null })
    },
    
    storage: {
      from: () => ({
        upload: () => Promise.resolve({
          data: { path: 'demo/image.jpg' },
          error: null
        }),
        getPublicUrl: () => ({
          data: { publicUrl: 'https://via.placeholder.com/800x600' }
        })
      })
    },

    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({}),
      unsubscribe: () => ({})
    })
  };

  const value = {
    isDemoMode,
    enableDemoMode,
    disableDemoMode,
    mockSupabase,
    mockUser,
    mockProfile,
    mockPosts,
    mockComments,
    mockStories,
    demoRealtime,
    setDemoRealtime
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};