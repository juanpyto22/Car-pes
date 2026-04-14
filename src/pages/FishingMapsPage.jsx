import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Map as MapIcon,
  Search,
  X,
  Filter,
  Layers,
  LocateFixed,
  Navigation,
  Heart,
  HelpCircle,
  Sparkles,
  Globe2,
  Compass,
  Clock,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fishingLocations, getLocationIcon } from '@/data/fishingLocations';
import '@/styles/leaflet-custom.css';

const SPAIN_CENTER = [40.4168, -3.7038];
const DEFAULT_ZOOM = 6;

const MAP_THEMES = {
  terrain: {
    id: 'terrain',
    label: 'Relieve',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  topo: {
    id: 'topo',
    label: 'Topografico',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap contributors',
  },
  dark: {
    id: 'dark',
    label: 'Noche',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '&copy; Stadia Maps, OpenMapTiles, OpenStreetMap',
  },
};

const TYPE_ALIASES = {
  rio: 'rivers',
  embalse: 'reservoirs',
  lago: 'lakes',
  mar: 'sea',
  parque: 'parks',
};

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const toTypeClass = (type) => {
  const normalized = normalizeText(type);
  return TYPE_ALIASES[normalized] || 'default';
};

const createSpotIcon = (type, isSelected = false) => {
  const typeClass = toTypeClass(type);

  return L.divIcon({
    className: 'fishing-pin-wrapper',
    html: `<span class="fishing-pin fishing-pin--${typeClass} ${isSelected ? 'is-selected' : ''}"></span>`,
    iconSize: isSelected ? [28, 28] : [24, 24],
    iconAnchor: isSelected ? [14, 14] : [12, 12],
    popupAnchor: [0, -14],
  });
};

const userIcon = L.divIcon({
  className: 'fishing-pin-wrapper',
  html: '<span class="fishing-pin fishing-pin--user is-selected"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14],
});

const MapViewportController = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.5 });
  }, [center, zoom, map]);

  return null;
};

const MapFitBounds = ({ locations, trigger }) => {
  const map = useMap();

  useEffect(() => {
    if (!locations.length) {
      return;
    }

    if (locations.length === 1) {
      map.flyTo([locations[0].latitude, locations[0].longitude], 10, {
        duration: 0.7,
      });
      return;
    }

    const bounds = L.latLngBounds(
      locations.map((location) => [location.latitude, location.longitude]),
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 8,
      animate: true,
      duration: 0.7,
    });
  }, [locations, trigger, map]);

  return null;
};

const RouteViewportController = ({ enabled, userLocation, selectedLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !userLocation || !selectedLocation) {
      return;
    }

    const bounds = L.latLngBounds([
      [userLocation[0], userLocation[1]],
      [selectedLocation.latitude, selectedLocation.longitude],
    ]);

    map.fitBounds(bounds, {
      padding: [70, 70],
      maxZoom: 10,
      animate: true,
      duration: 0.6,
    });
  }, [enabled, userLocation, selectedLocation, map]);

  return null;
};

const FishingMapsPage = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [communitySpots, setCommunitySpots] = useState([]);

  const [mapCenter, setMapCenter] = useState(SPAIN_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [mapTheme, setMapTheme] = useState('terrain');
  const [showRoute, setShowRoute] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const [showFilters, setShowFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const [filters, setFilters] = useState({
    country: 'España',
    type: 'all',
  });

  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('fishingSearchHistoryV2');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('fishingFavoritesV2');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchCommunitySpots = async () => {
      try {
        const { data, error } = await supabase
          .from('fishing_spots')
          .select('id, name, latitude, longitude, created_at')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          throw error;
        }

        setCommunitySpots(data || []);
      } catch (error) {
        console.error('Error fetching community spots:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunitySpots();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('fishingFavoritesV2', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem('fishingSearchHistoryV2', JSON.stringify(searchHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }, [searchHistory]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key === 'Escape') {
        setSearchFocused(false);
        setShowFilters(false);
        setShowHelp(false);
      }

      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const tag = (event.target?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          event.preventDefault();
          setShowHelp((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const closeSearchMenuOnScroll = () => {
      setSearchFocused(false);
    };

    window.addEventListener('scroll', closeSearchMenuOnScroll, { passive: true });
    return () => window.removeEventListener('scroll', closeSearchMenuOnScroll);
  }, []);

  const countries = useMemo(
    () => ['all', ...new Set(fishingLocations.map((item) => item.country))].sort(),
    [],
  );

  const types = useMemo(
    () => ['all', ...new Set(fishingLocations.map((item) => item.type))].sort(),
    [],
  );

  const filteredLocations = useMemo(() => {
    const query = normalizeText(searchQuery.trim());

    return fishingLocations.filter((location) => {
      if (filters.country !== 'all' && location.country !== filters.country) {
        return false;
      }

      if (filters.type !== 'all' && location.type !== filters.type) {
        return false;
      }

      if (query) {
        const haystack = normalizeText(
          `${location.name} ${location.region} ${location.country} ${location.type}`,
        );

        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (showFavoritesOnly && !favorites.some((fav) => fav.name === location.name)) {
        return false;
      }

      return true;
    });
  }, [filters, searchQuery, showFavoritesOnly, favorites]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    return filteredLocations.slice(0, 8);
  }, [filteredLocations, searchQuery]);

  const isFavorite = (location) => favorites.some((fav) => fav.name === location.name);

  const addToHistory = (locationName) => {
    if (!locationName) {
      return;
    }

    setSearchHistory((prev) => [locationName, ...prev.filter((item) => item !== locationName)].slice(0, 8));
  };

  const selectLocation = (location, options = {}) => {
    const { zoom = 10, shouldAddToHistory = true } = options;

    setSelectedLocation(location);
    setMapCenter([location.latitude, location.longitude]);
    setMapZoom(zoom);
    setSearchFocused(false);
    setShowMobileSidebar(false);
    setShowRoute(false);

    if (shouldAddToHistory) {
      addToHistory(location.name);
    }
  };

  const toggleFavorite = (location) => {
    setFavorites((prev) => {
      const exists = prev.some((item) => item.name === location.name);

      if (exists) {
        toast({
          title: 'Eliminado de favoritos',
          description: location.name,
        });
        return prev.filter((item) => item.name !== location.name);
      }

      toast({
        title: 'Anadido a favoritos',
        description: location.name,
      });
      return [location, ...prev];
    });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocalizacion no disponible',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = [coords.latitude, coords.longitude];
        setUserLocation(location);
        setMapCenter(location);
        setMapZoom(11);
      },
      () => {
        toast({
          variant: 'destructive',
          title: 'No se pudo obtener tu ubicacion',
          description: 'Revisa los permisos del navegador e intentalo de nuevo.',
        });
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleNavigate = (location) => {
    if (!location) {
      return;
    }

    setSelectedLocation(location);
    setMapCenter([location.latitude, location.longitude]);

    if (userLocation) {
      const sameLocation = selectedLocation?.name === location.name;
      setShowRoute(!(sameLocation && showRoute));
      return;
    }

    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocalizacion no disponible',
        description: 'Activa tu ubicacion para calcular la ruta en el mapa.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const currentUserLocation = [coords.latitude, coords.longitude];
        setUserLocation(currentUserLocation);
        setShowRoute(true);
      },
      () => {
        toast({
          variant: 'destructive',
          title: 'No se pudo obtener tu ubicacion',
          description: 'Permite acceso a ubicacion para ver la ruta.',
        });
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const resetAll = () => {
    setFilters({ country: 'España', type: 'all' });
    setSearchQuery('');
    setShowFavoritesOnly(false);
    setSelectedLocation(null);
    setMapCenter(SPAIN_CENTER);
    setMapZoom(DEFAULT_ZOOM);
    setFitTrigger((prev) => prev + 1);
  };

  const currentTheme = MAP_THEMES[mapTheme] || MAP_THEMES.terrain;

  const showSearchMenu =
    !showFilters &&
    searchFocused &&
    (searchQuery.trim().length > 0 || searchHistory.length > 0 || favorites.length > 0);

  const stats = useMemo(
    () => ({
      shown: filteredLocations.length,
      total: fishingLocations.length,
      community: communitySpots.length,
    }),
    [filteredLocations.length, communitySpots.length],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#031d2f] to-[#102742] flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mapa de Spots - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#04192b] to-[#102742] text-white">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-7xl px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                  <MapIcon className="h-6 w-6 text-cyan-300" />
                  Mapa Inteligente de Pesca
                </h1>
                <p className="mt-1 text-xs text-cyan-100/80">
                  Navegacion fluida, filtros precisos y spots listos para explorar.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHelp(true)}
                  className="text-cyan-200 hover:bg-cyan-900/30 hover:text-white"
                >
                  <HelpCircle className="mr-1 h-4 w-4" />
                  Ayuda
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUseMyLocation}
                  className="border-cyan-400/40 text-cyan-200 hover:bg-cyan-900/20"
                >
                  <LocateFixed className="mr-1 h-4 w-4" />
                  Mi ubicacion
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2">
                <p className="text-xs text-cyan-100/80">Mostrando</p>
                <p className="text-lg font-semibold text-cyan-100">{stats.shown} spots</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2">
                <p className="text-xs text-emerald-100/80">Base total</p>
                <p className="text-lg font-semibold text-emerald-100">{stats.total} ubicaciones</p>
              </div>
              <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2">
                <p className="text-xs text-violet-100/80">Spots comunidad</p>
                <p className="text-lg font-semibold text-violet-100">{stats.community}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[260px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-cyan-300" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
                  placeholder="Busca por nombre, region o tipo... (Ctrl+K)"
                  className="w-full rounded-xl border border-white/20 bg-slate-900/80 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-cyan-200/60 outline-none ring-cyan-400/60 transition focus:border-cyan-300 focus:ring-2"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-cyan-200/70 hover:text-white"
                    aria-label="Limpiar busqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                <AnimatePresence>
                  {showSearchMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute left-0 right-0 top-full z-[45] mt-2 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-2xl"
                    >
                      <div className="max-h-80 overflow-y-auto">
                        {searchQuery.trim() && searchSuggestions.length > 0 && (
                          <div>
                            {searchSuggestions.map((location) => (
                              <button
                                key={`${location.name}-${location.latitude}`}
                                onMouseDown={() => selectLocation(location)}
                                className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-2.5 text-left hover:bg-cyan-900/20"
                              >
                                <span className="text-lg">{getLocationIcon(location.type)}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-white">{location.name}</p>
                                  <p className="truncate text-xs text-cyan-200/80">{location.region}, {location.country}</p>
                                </div>
                                {isFavorite(location) && <Heart className="h-4 w-4 fill-current text-rose-400" />}
                              </button>
                            ))}
                          </div>
                        )}

                        {!searchQuery.trim() && searchHistory.length > 0 && (
                          <div className="border-b border-white/5 p-2">
                            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">Historial</p>
                            {searchHistory.slice(0, 5).map((item) => {
                              const location = fishingLocations.find((loc) => loc.name === item);
                              if (!location) return null;

                              return (
                                <button
                                  key={`history-${item}`}
                                  onMouseDown={() => selectLocation(location, { shouldAddToHistory: false })}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white/90 hover:bg-amber-900/25"
                                >
                                  <Clock className="h-3.5 w-3.5 text-amber-300" />
                                  <span className="truncate">{item}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {!searchQuery.trim() && favorites.length > 0 && (
                          <div className="p-2">
                            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-300">Favoritos</p>
                            {favorites.slice(0, 5).map((item) => (
                              <button
                                key={`favorite-${item.name}`}
                                onMouseDown={() => selectLocation(item, { shouldAddToHistory: false })}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white/90 hover:bg-rose-900/25"
                              >
                                <Heart className="h-3.5 w-3.5 fill-current text-rose-400" />
                                <span className="truncate">{item.name}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchQuery.trim() && searchSuggestions.length === 0 && (
                          <p className="px-4 py-4 text-sm text-cyan-100/70">No hay resultados para esa busqueda.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setShowFilters((prev) => {
                    const next = !prev;
                    if (next) {
                      setSearchFocused(false);
                    }
                    return next;
                  })
                }
                className="border-white/20 bg-slate-900/60 text-cyan-100 hover:bg-cyan-900/20"
              >
                <Filter className="mr-1 h-4 w-4" />
                Filtros
              </Button>
              <Button
                variant={showFavoritesOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFavoritesOnly((prev) => !prev)}
                className={showFavoritesOnly ? 'bg-rose-600 hover:bg-rose-500' : 'border-white/20 bg-slate-900/60 text-cyan-100 hover:bg-rose-900/20'}
              >
                <Heart className={`mr-1 h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                Favoritos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetAll}
                className="border-white/20 bg-slate-900/60 text-cyan-100 hover:bg-cyan-900/20"
              >
                Reset
              </Button>
            </div>

            {/* Filtros Modal Flotante */}
            <AnimatePresence>
              {showFilters && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowFilters(false)}
                    className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-sm"
                  />
                  {/* Modal Flotante */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="fixed left-1/2 top-1/2 z-[95] w-[min(560px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-cyan-400/35 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md md:p-5"
                  >
                    <button
                      onClick={() => setShowFilters(false)}
                      className="absolute right-3 top-3 text-white/60 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                    <h3 className="mb-4 text-sm font-semibold text-cyan-300">Filtros avanzados</h3>
                    <div className="grid gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-cyan-100/80 font-medium">Pais</label>
                        <select
                          value={filters.country}
                          onChange={(event) => setFilters((prev) => ({ ...prev, country: event.target.value }))}
                          className="w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                        >
                          {countries.map((country) => (
                            <option key={country} value={country}>
                              {country === 'all' ? 'Todos los paises' : country}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-cyan-100/80 font-medium">Tipo</label>
                        <select
                          value={filters.type}
                          onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
                          className="w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                        >
                          {types.map((type) => (
                            <option key={type} value={type}>
                              {type === 'all' ? 'Todos los tipos' : type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-cyan-100/80 font-medium">Tema del mapa</label>
                        <select
                          value={mapTheme}
                          onChange={(event) => setMapTheme(event.target.value)}
                          className="w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                        >
                          {Object.values(MAP_THEMES).map((theme) => (
                            <option key={theme.id} value={theme.id}>
                              {theme.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-3 p-4 md:gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between p-3">
              <div className="rounded-full border border-cyan-300/30 bg-slate-900/80 px-3 py-1 text-xs text-cyan-100/90 shadow-lg backdrop-blur">
                <span className="inline-flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5" />
                  {filteredLocations.length} resultados
                </span>
              </div>
              <div className="rounded-full border border-cyan-300/30 bg-slate-900/80 px-3 py-1 text-xs text-cyan-100/90 shadow-lg backdrop-blur">
                <span className="inline-flex items-center gap-1">
                  <Globe2 className="h-3.5 w-3.5" />
                  {currentTheme.label}
                </span>
              </div>
            </div>

            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              zoomControl
              className="fishing-map h-[45vh] min-h-[380px] w-full md:h-[55vh] lg:h-[calc(100vh-280px)]"
            >
              <TileLayer url={currentTheme.url} attribution={currentTheme.attribution} />

              <MapViewportController center={mapCenter} zoom={mapZoom} />
              <MapFitBounds locations={filteredLocations} trigger={fitTrigger} />
              <RouteViewportController
                enabled={showRoute}
                userLocation={userLocation}
                selectedLocation={selectedLocation}
              />

              {filteredLocations.map((location) => (
                <Marker
                  key={`${location.name}-${location.latitude}-${location.longitude}`}
                  position={[location.latitude, location.longitude]}
                  icon={createSpotIcon(location.type, selectedLocation?.name === location.name)}
                  eventHandlers={{ click: () => selectLocation(location) }}
                >
                  <Popup>
                    <div className="space-y-2 p-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getLocationIcon(location.type)}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">{location.name}</p>
                          <p className="text-xs text-cyan-200">{location.region}, {location.country}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-200">{location.description || 'Spot de pesca recomendado.'}</p>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => selectLocation(location)}
                          className="rounded-md bg-cyan-600 px-2 py-1 text-xs font-medium text-white hover:bg-cyan-500"
                        >
                          Ver detalle
                        </button>
                        <button
                          onClick={() => handleNavigate(location)}
                          className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                            showRoute && selectedLocation?.name === location.name
                              ? 'bg-cyan-500 text-white'
                              : 'border border-white/20 text-white hover:bg-white/10'
                          }`}
                        >
                          {showRoute && selectedLocation?.name === location.name ? '✓ Ruta activada' : 'Como llegar'}
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {userLocation && (
                <Marker position={userLocation} icon={userIcon}>
                  <Popup>
                    <p className="text-sm text-white">Estas aqui</p>
                  </Popup>
                </Marker>
              )}

              {/* Ruta entre usuario y spot */}
              {showRoute && userLocation && selectedLocation && (
                <Polyline
                  positions={[
                    [userLocation[0], userLocation[1]],
                    [selectedLocation.latitude, selectedLocation.longitude],
                  ]}
                  color="#06b6d4"
                  weight={3}
                  opacity={0.8}
                  dashArray="5, 10"
                />
              )}
            </MapContainer>

            <div className="absolute bottom-3 right-3 z-30 flex gap-2">
              <Button
                size="sm"
                onClick={() => setFitTrigger((prev) => prev + 1)}
                className="border border-white/20 bg-slate-900/90 text-cyan-100 hover:bg-cyan-900/40"
              >
                <Maximize2 className="mr-1 h-4 w-4" />
                Ajustar
              </Button>
              <Button
                size="sm"
                onClick={() => setShowMobileSidebar(true)}
                className="lg:hidden border border-white/20 bg-slate-900/90 text-cyan-100 hover:bg-cyan-900/40"
              >
                <Layers className="mr-1 h-4 w-4" />
                Ver ({filteredLocations.length})
              </Button>
            </div>
          </section>

          <aside className={`fixed lg:static inset-y-0 right-0 z-[55] w-96 lg:w-auto lg:min-h-[420px] flex flex-col overflow-hidden rounded-none lg:rounded-2xl border-l lg:border border-white/10 bg-slate-950/70 transition-transform duration-300 ${showMobileSidebar ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
            <div className="border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-200">
                <Layers className="h-4 w-4" />
                Resultados
              </h2>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="lg:hidden text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="hidden lg:block px-4 pt-2 text-xs text-cyan-100/70">
              Selecciona un spot para centrar mapa y abrir acciones.
            </p>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {filteredLocations.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-center text-sm text-cyan-100/70">
                  No hay resultados con el filtro actual.
                </div>
              )}

              {filteredLocations.map((location) => {
                const active = selectedLocation?.name === location.name;
                const favorite = isFavorite(location);

                return (
                  <motion.div
                    key={`list-${location.name}-${location.latitude}`}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-3 transition ${
                      active
                        ? 'border-cyan-300/60 bg-cyan-700/20'
                        : 'border-white/10 bg-slate-900/55 hover:border-cyan-400/40 hover:bg-slate-800/70'
                    }`}
                  >
                    <button className="w-full text-left" onClick={() => selectLocation(location)}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{getLocationIcon(location.type)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{location.name}</p>
                          <p className="truncate text-xs text-cyan-100/80">{location.region}, {location.country}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-cyan-200/70">{location.type}</p>
                        </div>
                      </div>
                    </button>

                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleNavigate(location)}
                        className={`h-8 flex-1 text-xs transition ${
                          showRoute && selectedLocation?.name === location.name
                            ? 'bg-cyan-500 hover:bg-cyan-400'
                            : 'bg-cyan-600 hover:bg-cyan-500'
                        }`}
                      >
                        <Navigation className="mr-1 h-3.5 w-3.5" />
                        {showRoute && selectedLocation?.name === location.name ? 'Ruta ON' : 'Llegar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleFavorite(location)}
                        className={`h-8 flex-1 text-xs ${
                          favorite
                            ? 'border-rose-400/60 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                            : 'border-white/20 text-cyan-100 hover:bg-rose-900/20'
                        }`}
                      >
                        <Heart className={`mr-1 h-3.5 w-3.5 ${favorite ? 'fill-current' : ''}`} />
                        {favorite ? 'Guardado' : 'Guardar'}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </aside>
        </main>

        <AnimatePresence>
          {selectedLocation && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="fixed bottom-3 left-1/2 z-40 w-[96%] max-w-2xl -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-950/95 p-3 shadow-2xl backdrop-blur md:bottom-4 md:p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none">{getLocationIcon(selectedLocation.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-white">{selectedLocation.name}</p>
                  <p className="text-sm text-cyan-200/85">{selectedLocation.region}, {selectedLocation.country}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-200">{selectedLocation.description}</p>
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="rounded-md p-1 text-cyan-100/70 hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar detalle"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button 
                  onClick={() => handleNavigate(selectedLocation)} 
                  className={`transition ${
                    showRoute
                      ? 'bg-cyan-500 hover:bg-cyan-400'
                      : 'bg-cyan-600 hover:bg-cyan-500'
                  }`}
                >
                  <Navigation className="mr-1 h-4 w-4" />
                  {showRoute ? '✓ Ruta activada' : 'Ver ruta'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggleFavorite(selectedLocation)}
                  className="border-white/20 text-cyan-100 hover:bg-rose-900/25"
                >
                  <Heart className={`mr-1 h-4 w-4 ${isFavorite(selectedLocation) ? 'fill-current text-rose-400' : ''}`} />
                  {isFavorite(selectedLocation) ? 'En favoritos' : 'Guardar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setFitTrigger((prev) => prev + 1)}
                  className="border-white/20 text-cyan-100 hover:bg-cyan-900/25"
                >
                  <Sparkles className="mr-1 h-4 w-4" />
                  Ver contexto
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/65 p-4 backdrop-blur-sm"
              onClick={() => setShowHelp(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 p-6"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <HelpCircle className="h-5 w-5 text-cyan-300" />
                    Guia rapida del mapa
                  </h3>
                  <button onClick={() => setShowHelp(false)} className="text-cyan-100/70 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100/90">
                    <p className="mb-1 font-semibold">Busqueda inteligente</p>
                    <p>Escribe nombre, region o tipo. Enter selecciona el primer resultado visible.</p>
                  </div>
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100/90">
                    <p className="mb-1 font-semibold">Atajos</p>
                    <p>Ctrl+K para buscar. Escape para cerrar paneles. ? abre esta ayuda.</p>
                  </div>
                  <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-sm text-violet-100/90">
                    <p className="mb-1 font-semibold">Marcadores</p>
                    <p>Click en un pin para detalle rapido. Boton Ajustar mapa encuadra todos los resultados.</p>
                  </div>
                  <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100/90">
                    <p className="mb-1 font-semibold">Favoritos</p>
                    <p>Guarda spots y luego usa el filtro Favoritos para planificar salidas rapido.</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default FishingMapsPage;
