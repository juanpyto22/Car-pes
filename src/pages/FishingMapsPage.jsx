import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapPin, Navigation, Fish, Eye, Star, Filter, Plus, Search, X, Map as MapIcon, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'leaflet.markercluster';
import { fishingLocations, getLocationIcon } from '@/data/fishingLocations';
import '@/styles/leaflet-custom.css';

// Custom icon para los marcadores
const createCustomIcon = (type, isSelected = false) => {
  const defaultIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const typeIcons = {
    'río': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    'embalse': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    'lago': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    'mar': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    'parque': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  };

  return L.icon({
    iconUrl: typeIcons[type] || defaultIcon.options.iconUrl,
    iconSize: isSelected ? [35, 56] : [25, 41],
    iconAnchor: isSelected ? [17, 56] : [12, 41],
    popupAnchor: [1, -34],
  });
};

// Componente para controlar el mapa desde fuera
const MapController = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && map) {
      map.setView(center, zoom || 6);
    }
  }, [center, zoom, map]);

  return null;
};

const FishingMapsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [spots, setSpots] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSpot, setShowAddSpot] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Madrid
  const [mapZoom, setMapZoom] = useState(6);
  
  // Filtros
  const [filters, setFilters] = useState({
    type: 'all', // 'all', 'río', 'embalse', 'lago', 'mar', 'parque'
    country: 'España',
    rating: 0
  });

  // Fetch fishing spots desde Supabase
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
          creator:profiles!creator_id(id, username, foto_perfil),
          reviews:spot_reviews(count),
          avg_rating:spot_reviews(count),
          recent_catches:catches(
            id,
            user:profiles(username, foto_perfil),
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
          const location = [position.coords.latitude, position.coords.longitude];
          setUserLocation(location);
          setMapCenter(location);
          setMapZoom(12);
        },
        (error) => {
          console.log('Location access denied, using default');
        }
      );
    }
  };

  // Filtrar ubicaciones según búsqueda y filtros
  const filteredLocations = useMemo(() => {
    let result = [...fishingLocations];

    // Filtrar por país
    if (filters.country !== 'all') {
      result = result.filter(loc => loc.country === filters.country);
    }

    // Filtrar por tipo
    if (filters.type !== 'all') {
      result = result.filter(loc => loc.type === filters.type);
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(loc =>
        loc.name.toLowerCase().includes(query) ||
        loc.region.toLowerCase().includes(query) ||
        loc.type.toLowerCase().includes(query)
      );
    }

    return result;
  }, [searchQuery, filters]);

  // Obtener países únicos
  const countries = useMemo(() => {
    return ['all', ...new Set(fishingLocations.map(loc => loc.country))].sort();
  }, []);

  // Obtener tipos únicos
  const types = useMemo(() => {
    return ['all', ...new Set(fishingLocations.map(loc => loc.type))].sort();
  }, []);

  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    setMapCenter([location.latitude, location.longitude]);
    setMapZoom(10);
  };

  const handleGoToLocation = (location) => {
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/${userLocation[0]},${userLocation[1]}/${location.latitude},${location.longitude}`;
      window.open(url, '_blank');
    } else {
      toast({
        variant: "destructive",
        title: "Ubicación no disponible",
        description: "Permite el acceso a tu ubicación para usar esta función"
      });
    }
  };

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
          className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header con imagen */}
          {spot.image_url ? (
            <div className="relative h-48 overflow-hidden">
              <img 
                src={spot.image_url} 
                alt={spot.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-xl font-bold">{spot.name}</h3>
              </div>
            </div>
          ) : (
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">{spot.name}</h3>
            </div>
          )}

          <div className="p-6 space-y-4">
            {/* Creator */}
            {spot.creator && (
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
            )}

            {/* Description */}
            {spot.description && (
              <div>
                <h4 className="text-white font-semibold mb-2">Descripción</h4>
                <p className="text-blue-200 text-sm leading-relaxed">
                  {spot.description}
                </p>
              </div>
            )}

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              {spot.fish_species && spot.fish_species.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-2">Especies</h4>
                  <div className="flex flex-wrap gap-1">
                    {spot.fish_species.map(fish => (
                      <span 
                        key={fish} 
                        className="px-2 py-1 bg-cyan-900/30 text-cyan-300 text-xs rounded-full"
                      >
                        {fish}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {spot.difficulty_level !== undefined && (
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
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-white/10">
              <Button 
                className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                onClick={() => {
                  if (userLocation) {
                    const url = `https://www.google.com/maps/dir/${userLocation[0]},${userLocation[1]}/${spot.latitude || 40},${spot.longitude || -3}`;
                    window.open(url, '_blank');
                  }
                }}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Ir al Spot
              </Button>
              <Button 
                variant="outline"
                onClick={onClose}
              >
                <X className="w-4 h-4 mr-2" />
                Cerrar
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  const LocationDetailsModal = ({ location, onClose }) => (
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
          className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 to-blue-900/50 border-b border-white/10 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getLocationIcon(location.type)}</span>
                  <span className="px-2 py-1 bg-cyan-900/30 text-cyan-300 text-xs rounded-full capitalize">
                    {location.type}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">{location.name}</h2>
                <p className="text-blue-400 text-sm mt-1">{location.region}, {location.country}</p>
              </div>
              <button 
                onClick={onClose}
                className="text-white/60 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Descripción */}
            {location.description && (
              <div>
                <h3 className="text-white font-semibold mb-2">Descripción</h3>
                <p className="text-blue-200 text-sm leading-relaxed">
                  {location.description}
                </p>
              </div>
            )}

            {/* Información del Lugar */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-blue-400 text-xs mb-1">Tipo</p>
                <p className="text-white font-medium capitalize">{location.type}</p>
              </div>
              <div>
                <p className="text-blue-400 text-xs mb-1">Región</p>
                <p className="text-white font-medium">{location.region}</p>
              </div>
              <div>
                <p className="text-blue-400 text-xs mb-1">País</p>
                <p className="text-white font-medium">{location.country}</p>
              </div>
              <div>
                <p className="text-blue-400 text-xs mb-1">Coordenadas</p>
                <p className="text-white font-medium text-sm">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-4">
              <Button 
                className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                onClick={() => handleGoToLocation(location)}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Ir al Lugar
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                <X className="w-4 h-4 mr-2" />
                Cerrar
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

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 w-full">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <MapIcon className="w-6 h-6 text-cyan-400" />
                  Mapa de Spots
                </h1>
                <p className="text-blue-400 text-sm">Descubre los mejores lugares de pesca en España y Latinoamérica</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="hidden md:flex"
                >
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

            {/* Search Bar */}
            <div className="mt-4 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-blue-400" />
                <input
                  type="text"
                  placeholder="Busca lugares de pesca..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-blue-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
              {searchQuery && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/10 bg-slate-900/50 p-4"
            >
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* País */}
                <div>
                  <label className="text-blue-400 text-sm font-semibold mb-2 block">País</label>
                  <select
                    value={filters.country}
                    onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded text-white text-sm"
                  >
                    <option value="all">Todos los países</option>
                    {countries.filter(c => c !== 'all').map(country => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo */}
                <div>
                  <label className="text-blue-400 text-sm font-semibold mb-2 block">Tipo de Lugar</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded text-white text-sm"
                  >
                    <option value="all">Todos los tipos</option>
                    {types.map(type => (
                      <option key={type} value={type}>
                        {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resultados */}
                <div className="flex items-end">
                  <p className="text-blue-300 text-sm">
                    <span className="font-semibold text-cyan-400">{filteredLocations.length}</span> lugares encontrados
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 overflow-hidden p-4">
          {/* Map */}
          <div className="flex-1 rounded-lg overflow-hidden border border-white/10">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              <MapController center={mapCenter} zoom={mapZoom} />

              {/* Marcadores de ubicaciones de pesca */}
              {filteredLocations.map((location) => (
                <Marker
                  key={`${location.name}-${location.latitude}`}
                  position={[location.latitude, location.longitude]}
                  icon={createCustomIcon(location.type, selectedLocation?.name === location.name)}
                  eventHandlers={{
                    click: () => handleSelectLocation(location),
                  }}
                >
                  <Popup maxWidth={300}>
                    <div className="bg-slate-800 rounded p-3 text-white">
                      <h3 className="font-bold text-lg mb-1">{location.name}</h3>
                      <p className="text-blue-300 text-sm mb-2">{location.region}, {location.country}</p>
                      <p className="text-blue-200 text-xs mb-3">{getLocationIcon(location.type)} {location.type}</p>
                      {location.description && (
                        <p className="text-blue-100 text-xs mb-3">{location.description}</p>
                      )}
                      <button
                        onClick={() => handleSelectLocation(location)}
                        className="w-full px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-sm text-white"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Usuario actual */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                  })}
                >
                  <Popup>
                    <div className="bg-slate-800 text-white p-2 rounded">
                      Tu ubicación
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          {/* Sidebar con lista */}
          <div className="w-full md:w-96 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-lg flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Lugares Encontrados ({filteredLocations.length})
              </h3>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto space-y-2 p-4">
              {filteredLocations.length > 0 ? (
                filteredLocations.map((location) => (
                  <motion.div
                    key={`${location.name}-${location.latitude}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      selectedLocation?.name === location.name
                        ? 'bg-cyan-600/30 border border-cyan-500'
                        : 'bg-slate-800/50 border border-white/5 hover:bg-slate-800/70'
                    }`}
                    onClick={() => handleSelectLocation(location)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{getLocationIcon(location.type)}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold truncate">{location.name}</h4>
                        <p className="text-blue-400 text-xs">{location.region}</p>
                        <p className="text-blue-300 text-xs mt-1 capitalize">{location.type}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex items-center justify-center h-32 text-blue-400">
                  <p className="text-center text-sm">
                    No se encontraron lugares que coincidan con tu búsqueda
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Location Modal */}
        {selectedLocation && (
          <LocationDetailsModal 
            location={selectedLocation} 
            onClose={() => setSelectedLocation(null)} 
          />
        )}

        {/* Add Spot Modal */}
        {showAddSpot && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Agregar Nuevo Spot</h3>
                <button 
                  onClick={() => setShowAddSpot(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-blue-300 mb-6">
                Comparte un lugar de pesca que conozcas. Los spots serán validados por la comunidad.
              </p>
              <div className="space-y-3">
                <input 
                  type="text"
                  placeholder="Nombre del spot"
                  className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded text-white placeholder-blue-400"
                />
                <textarea
                  placeholder="Descripción..."
                  rows="3"
                  className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded text-white placeholder-blue-400"
                />
                <Button className="w-full bg-cyan-600 hover:bg-cyan-500">
                  Crear Spot
                </Button>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => setShowAddSpot(false)}
              >
                Cancelar
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
};

export default FishingMapsPage;