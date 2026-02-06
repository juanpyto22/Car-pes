import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Fish, Eye, Star, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';

const FishingMapsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const mapRef = useRef();
  
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [spots, setSpots] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSpot, setShowAddSpot] = useState(false);
  const [filters, setFilters] = useState({
    fishTypes: [],
    difficulty: 'all',
    rating: 0
  });

  // Simulated map data - in real app would use Google Maps/Mapbox
  const [mapCenter, setMapCenter] = useState({ lat: 40.4168, lng: -3.7038 }); // Madrid

  useEffect(() => {
    fetchFishingSpots();
    getUserLocation();
  }, []);

  const fetchFishingSpots = async () => {
    try {
      const { data, error } = await supabase
        .from('fishing_spots')
        .select(`
          *,
          creator:users!creator_id(id, username, foto_perfil),
          reviews:spot_reviews(count),
          avg_rating,
          recent_catches:catches(
            id,
            user:users(username, foto_perfil),
            fish_species,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpots(data || []);
    } catch (error) {
      console.error('Error fetching fishing spots:', error);
      toast({
        variant: "destructive",
        title: "Error al cargar spots"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setMapCenter(location);
        },
        (error) => {
          console.log('Location access denied');
        }
      );
    }
  };

  const SpotMarker = ({ spot, isSelected, onClick }) => (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-full ${
        isSelected ? 'z-20' : 'z-10'
      }`}
      style={{
        left: `${((spot.longitude + 180) / 360) * 100}%`,
        top: `${((90 - spot.latitude) / 180) * 100}%`
      }}
      onClick={() => onClick(spot)}
    >
      <div className={`relative ${isSelected ? 'animate-bounce' : ''}`}>
        <div className={`w-10 h-10 rounded-full border-3 flex items-center justify-center shadow-lg ${
          isSelected 
            ? 'bg-cyan-500 border-white' 
            : spot.avg_rating >= 4 
              ? 'bg-green-500 border-green-300'
              : 'bg-blue-500 border-blue-300'
        }`}>
          <Fish className="w-5 h-5 text-white" />
        </div>
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
        )}
      </div>
    </motion.div>
  );

  const SpotDetailsModal = ({ spot, onClose }) => (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Image */}
          {spot.image_url && (
            <div className="relative h-48 overflow-hidden">
              <img 
                src={spot.image_url} 
                alt={spot.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-xl font-bold">{spot.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < spot.avg_rating ? 'fill-current' : ''}`} 
                      />
                    ))}
                  </div>
                  <span className="text-sm">({spot.reviews[0]?.count || 0} reseñas)</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 space-y-4">
            {/* Creator */}
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={spot.creator?.foto_perfil} />
                <AvatarFallback>{spot.creator?.username?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium">@{spot.creator?.username}</p>
                <p className="text-blue-400 text-sm">Creador del spot</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-white font-semibold mb-2">Descripción</h4>
              <p className="text-blue-200 text-sm leading-relaxed">
                {spot.description || 'Sin descripción disponible'}
              </p>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-white font-semibold mb-2">Especies</h4>
                <div className="flex flex-wrap gap-1">
                  {spot.fish_species?.map(fish => (
                    <span 
                      key={fish} 
                      className="px-2 py-1 bg-cyan-900/30 text-cyan-300 text-xs rounded-full"
                    >
                      {fish}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-2">Dificultad</h4>
                <div className="flex items-center gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < spot.difficulty_level ? 'bg-orange-500' : 'bg-gray-600'
                      }`} 
                    />
                  ))}
                  <span className="text-sm text-blue-300 ml-2">
                    {spot.difficulty_level === 1 ? 'Fácil' : 
                     spot.difficulty_level === 2 ? 'Medio' : 'Difícil'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Catches */}
            {spot.recent_catches?.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-2">Capturas Recientes</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {spot.recent_catches.slice(0, 3).map(catch_ => (
                    <div key={catch_.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={catch_.user?.foto_perfil} />
                        <AvatarFallback className="text-xs">{catch_.user?.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-white text-sm">{catch_.fish_species}</p>
                        <p className="text-blue-400 text-xs">por @{catch_.user?.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-white/10">
              <Button 
                className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                onClick={() => {
                  // Navigate to spot or open directions
                  if (userLocation) {
                    const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${spot.latitude},${spot.longitude}`;
                    window.open(url, '_blank');
                  }
                }}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Ir al Spot
              </Button>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Ver Posts
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mapa de Spots - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Mapa de Spots</h1>
                <p className="text-blue-400 text-sm">Descubre los mejores lugares de pesca</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
                <Button 
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-500"
                  onClick={() => setShowAddSpot(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Spot
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative h-[calc(100vh-140px)]">
          {/* Simulated Map Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-green-900/20 overflow-hidden">
            {/* Map Grid Pattern */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }}
            />
            
            {/* Water areas */}
            <div className="absolute top-1/4 left-1/3 w-32 h-20 bg-blue-500/30 rounded-full blur-sm" />
            <div className="absolute top-1/2 right-1/4 w-24 h-16 bg-blue-400/20 rounded-full blur-sm" />
            <div className="absolute bottom-1/3 left-1/4 w-40 h-24 bg-cyan-500/20 rounded-full blur-sm" />
          </div>

          {/* User Location */}
          {userLocation && (
            <div 
              className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg z-30 transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
              style={{
                left: `${((userLocation.lng + 180) / 360) * 100}%`,
                top: `${((90 - userLocation.lat) / 180) * 100}%`
              }}
            />
          )}

          {/* Fishing Spots */}
          {spots.map(spot => (
            <SpotMarker
              key={spot.id}
              spot={spot}
              isSelected={selectedSpot?.id === spot.id}
              onClick={setSelectedSpot}
            />
          ))}

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
            <Button
              size="icon"
              variant="outline"
              className="bg-white/90 hover:bg-white"
              onClick={getUserLocation}
            >
              <Navigation className="w-4 h-4" />
            </Button>
          </div>

          {/* Spots List (Mobile) */}
          <div className="absolute bottom-4 left-4 right-4 md:hidden z-30">
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl p-4 max-h-40 overflow-y-auto">
              <h3 className="text-white font-semibold mb-3">Spots Cercanos</h3>
              <div className="space-y-2">
                {spots.slice(0, 3).map(spot => (
                  <div 
                    key={spot.id}
                    onClick={() => setSelectedSpot(spot)}
                    className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800"
                  >
                    <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Fish className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{spot.name}</p>
                      <p className="text-blue-400 text-xs">{spot.distance || '2.5km'} de distancia</p>
                    </div>
                    <div className="flex text-yellow-400">
                      {[...Array(Math.floor(spot.avg_rating || 0))].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Spot Detail Modal */}
        {selectedSpot && (
          <SpotDetailsModal 
            spot={selectedSpot} 
            onClose={() => setSelectedSpot(null)} 
          />
        )}

        {/* Add Spot Modal - TODO: Implement */}
        {showAddSpot && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Agregar Nuevo Spot</h3>
              <p className="text-blue-300 mb-4">Funcionalidad en desarrollo...</p>
              <Button onClick={() => setShowAddSpot(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FishingMapsPage;