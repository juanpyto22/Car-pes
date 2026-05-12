import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook: Obtener estado PRO de un usuario y sus beneficios
 */
export const useProStatus = (userId) => {
  const [proStatus, setProStatus] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProStatus = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('pro_verification_requests')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setProStatus(data);
          setIsPro(true);
          setBenefits(getProBenefits(data.business_type));
        } else {
          setProStatus(null);
          setIsPro(false);
          setBenefits([]);
        }
      } catch (err) {
        console.error('Error fetching PRO status:', err);
        setProStatus(null);
        setIsPro(false);
      } finally {
        setLoading(false);
      }
    };

    fetchProStatus();
  }, [userId]);

  return { proStatus, isPro, benefits, loading };
};

/**
 * Obtener lista de beneficios según tipo de negocio PRO
 */
export const getProBenefits = (businessType = 'empresa') => {
  const baseBenefits = [
    {
      id: 'badge',
      name: 'Badge Pro Verificado',
      description: 'Insígnia especial en tu perfil',
      icon: '✓'
    },
    {
      id: 'featured_posts',
      name: 'Posts Destacados',
      description: 'Destaca hasta 3 posts en tu perfil',
      icon: '⭐'
    },
    {
      id: 'advanced_analytics',
      name: 'Analíticas Avanzadas',
      description: 'Estadísticas detalladas de interacciones',
      icon: '📊'
    },
    {
      id: 'priority_support',
      name: 'Soporte Prioritario',
      description: 'Atención rápida a consultas',
      icon: '🎯'
    }
  ];

  const typeBenefits = {
    empresa: [
      {
        id: 'custom_links',
        name: 'Links Personalizados',
        description: 'Añade URL de redes y sitio web',
        icon: '🔗'
      },
      {
        id: 'pro_profile_boost',
        name: 'Perfil Destacado',
        description: '+1000% más visibilidad',
        icon: '🚀'
      }
    ],
    pescador: [
      {
        id: 'catch_tracking',
        name: 'Registro de Capturas',
        description: 'Estadísticas de pesca personal',
        icon: '🎣'
      },
      {
        id: 'location_insights',
        name: 'Insights de Ubicaciones',
        description: 'Datos avanzados de spots de pesca',
        icon: '📍'
      }
    ],
    guia: [
      {
        id: 'appointment_system',
        name: 'Sistema de Reservas',
        description: 'Calendario y bookings de tours',
        icon: '📅'
      },
      {
        id: 'pricing_tools',
        name: 'Gestor de Precios',
        description: 'Administra tarifas de servicios',
        icon: '💰'
      }
    ]
  };

  return [...baseBenefits, ...(typeBenefits[businessType] || typeBenefits.empresa)];
};

/**
 * Hook: Verificar si el usuario actual es PRO
 */
export const useCurrentUserProStatus = (currentUser) => {
  const { proStatus, isPro, benefits, loading } = useProStatus(currentUser?.id);
  return { proStatus, isPro, benefits, loading };
};
