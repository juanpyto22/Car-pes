import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Badge, BadgeCheck, Fish, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * Componente: Mostrar perfiles PRO destacados
 */
export const ProProfilesShowcase = ({ limit = 6 }) => {
  const [proProfiles, setProProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProProfiles = async () => {
      try {
        setLoading(true);

        // Obtener solicitudes PRO aprobadas con información del perfil
        const { data, error } = await supabase
          .from('pro_verification_requests')
          .select(`
            id,
            user_id,
            business_name,
            business_type,
            user:profiles!user_id(
              id,
              username,
              nombre,
              foto_perfil,
              bio,
              followers_count
            )
          `)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        // Formatear datos
        const profiles = (data || [])
          .filter(item => item.user)
          .map(item => ({
            ...item.user,
            businessName: item.business_name,
            businessType: item.business_type,
            proId: item.id
          }));

        setProProfiles(profiles);
      } catch (err) {
        console.error('Error fetching PRO profiles:', err);
        setProProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProProfiles();
  }, [limit]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-800/50 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (proProfiles.length === 0) {
    return <p className="text-blue-300 text-sm">No hay perfiles Pro disponibles.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {proProfiles.map(profile => (
        <Link key={profile.id} to={`/profile/${profile.id}`}>
          <Card className="h-full bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 hover:border-emerald-500/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-14 h-14 border-2 border-emerald-500/30">
                  <AvatarImage src={profile.foto_perfil} />
                  <AvatarFallback className="bg-emerald-900 text-emerald-200">
                    {profile.nombre?.[0] || profile.username?.[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <h3 className="font-bold text-white truncate text-sm">{profile.nombre || profile.username}</h3>
                    <BadgeCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  </div>
                  
                  <p className="text-xs text-cyan-300 truncate">@{profile.username}</p>
                  
                  {profile.businessType && (
                    <Badge variant="outline" className="mt-1 text-[10px] bg-emerald-500/20 border-emerald-500/50 text-emerald-200 h-5">
                      {profile.businessType}
                    </Badge>
                  )}
                  
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Users className="w-3 h-3" />
                    <span>{profile.followers_count || 0} seguidores</span>
                  </div>
                </div>
              </div>
              
              {profile.bio && (
                <p className="text-xs text-gray-300 mt-3 line-clamp-2">{profile.bio}</p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

/**
 * Hook: Filtrar y obtener únicamente perfiles PRO
 */
export const useProProfiles = (searchQuery = '', limit = 20) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProProfiles = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('pro_verification_requests')
          .select(`
            id,
            user_id,
            business_name,
            business_type,
            user:profiles!user_id(
              id,
              username,
              nombre,
              email,
              foto_perfil,
              bio,
              followers_count,
              ubicacion
            )
          `)
          .eq('status', 'approved');

        if (searchQuery.trim()) {
          // Buscar por nombre de negocio, usuario o ubicación
          query = query.or(`business_name.ilike.%${searchQuery}%,user.username.ilike.%${searchQuery}%,user.nombre.ilike.%${searchQuery}%`);
        }

        const { data, error: err } = await query.limit(limit);

        if (err) throw err;

        const formatted = (data || [])
          .filter(item => item.user)
          .map(item => ({
            ...item.user,
            businessName: item.business_name,
            businessType: item.business_type,
            proVerificationId: item.id
          }));

        setProfiles(formatted);
        setError(null);
      } catch (err) {
        console.error('Error fetching PRO profiles:', err);
        setProfiles([]);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProProfiles();
  }, [searchQuery, limit]);

  return { profiles, loading, error };
};

export default ProProfilesShowcase;
