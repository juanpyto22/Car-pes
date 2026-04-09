import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Search, CloudSun, Wind, Gauge, Droplets, Waves, Fish, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const SPECIES = [
  { id: 'carpa', label: 'Carpa' },
  { id: 'bass', label: 'Black bass' },
  { id: 'lucio', label: 'Lucio' },
  { id: 'trucha', label: 'Trucha' },
  { id: 'siluro', label: 'Siluro' },
  { id: 'dorada', label: 'Dorada' },
  { id: 'lubina', label: 'Lubina' },
];

const typeFromResult = (place) => {
  const text = `${place?.display_name || ''} ${place?.type || ''}`.toLowerCase();
  if (text.includes('reservoir') || text.includes('embalse') || text.includes('pantano')) return 'pantano';
  if (text.includes('river') || text.includes('rio') || text.includes('río')) return 'rio';
  if (text.includes('sea') || text.includes('mar') || text.includes('coast') || text.includes('bahía')) return 'mar';
  if (text.includes('lake') || text.includes('laguna')) return 'lago';
  return 'agua';
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const calculateFishingChance = ({ species, weather, waterType }) => {
  if (!weather) return { chance: 0, expectedCatch: 0, notes: [] };

  const pressure = weather.current?.pressure_msl ?? 1013;
  const wind = weather.current?.wind_speed_10m ?? 0;
  const temp = weather.current?.temperature_2m ?? 18;
  const rain = weather.current?.precipitation ?? 0;
  const cloud = weather.current?.cloud_cover ?? 35;

  let score = 50;
  const notes = [];

  if (pressure >= 1008 && pressure <= 1022) {
    score += 10;
    notes.push('Presion estable favorable');
  } else {
    score -= 8;
    notes.push('Presion poco favorable');
  }

  if (wind <= 18) {
    score += 8;
    notes.push('Viento moderado');
  } else if (wind > 30) {
    score -= 15;
    notes.push('Viento fuerte');
  }

  if (rain > 2) {
    score -= 10;
    notes.push('Precipitacion alta');
  }

  if (cloud >= 35 && cloud <= 75) {
    score += 6;
  }

  if (species === 'carpa') {
    if (temp >= 14 && temp <= 24) score += 10;
    if (waterType === 'pantano' || waterType === 'lago') score += 8;
  }

  if (species === 'trucha') {
    if (temp >= 7 && temp <= 17) score += 12;
    if (waterType === 'rio') score += 10;
  }

  if (species === 'bass' || species === 'lucio') {
    if (temp >= 12 && temp <= 22) score += 8;
    if (waterType === 'pantano') score += 6;
  }

  if (species === 'dorada' || species === 'lubina') {
    if (waterType === 'mar') score += 12;
    if (temp >= 13 && temp <= 28) score += 8;
  }

  if (species === 'siluro') {
    if (temp >= 16 && temp <= 28) score += 12;
    if (waterType === 'rio' || waterType === 'pantano') score += 7;
  }

  const chance = clamp(Math.round(score), 5, 95);
  const expectedCatch = clamp(Math.round((chance / 100) * 4), 0, 4);

  return { chance, expectedCatch, notes };
};

const PronosticosPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weather, setWeather] = useState(null);
  const [species, setSpecies] = useState('carpa');
  const [error, setError] = useState(null);

  const selectedType = useMemo(() => typeFromResult(selectedSpot), [selectedSpot]);

  const forecast = useMemo(() => {
    return calculateFishingChance({
      species,
      weather,
      waterType: selectedType,
    });
  }, [species, weather, selectedType]);

  const searchWaters = async () => {
    if (!query.trim() || query.trim().length < 2) return;

    setLoadingSearch(true);
    setError(null);

    try {
      const q = encodeURIComponent(`${query.trim()} embalse rio mar lago costa Espana`);
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=es&limit=40&q=${q}`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) throw new Error('No se pudo buscar ubicaciones');

      const data = await res.json();
      const filtered = (data || []).filter((item) => {
        const text = `${item.display_name || ''} ${item.type || ''}`.toLowerCase();
        return [
          'river', 'rio', 'río', 'reservoir', 'embalse', 'pantano', 'sea', 'mar', 'lake', 'laguna', 'coast', 'bay', 'bahia', 'bahía'
        ].some((k) => text.includes(k));
      });

      setResults(filtered);
    } catch (err) {
      console.error(err);
      setError('No se pudo completar la busqueda. Intenta de nuevo.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const loadForecast = async (spot) => {
    setSelectedSpot(spot);
    setLoadingWeather(true);
    setError(null);

    try {
      const lat = Number(spot.lat);
      const lon = Number(spot.lon);

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,pressure_msl,wind_speed_10m,wind_direction_10m,relative_humidity_2m,cloud_cover,precipitation&hourly=temperature_2m,pressure_msl,wind_speed_10m,precipitation_probability&forecast_days=2&timezone=auto`;
      const res = await fetch(weatherUrl);
      if (!res.ok) throw new Error('No se pudo cargar el tiempo');
      const data = await res.json();
      setWeather(data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el pronostico meteorologico.');
      setWeather(null);
    } finally {
      setLoadingWeather(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Pronosticos - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/20 to-slate-950 pb-24">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Pronosticos de Pesca</h1>
            <p className="text-blue-300 mt-1">Busca pantanos, rios y mares de Espana para ver condiciones y probabilidad de captura.</p>
          </div>

          <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 md:p-5 mb-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchWaters()}
                  placeholder="Ejemplo: Orellana, Ebro, Delta del Ebro, Guadalquivir, Cantabrico..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-blue-500"
                />
              </div>
              <Button onClick={searchWaters} disabled={loadingSearch} className="h-12 px-5 bg-cyan-600 hover:bg-cyan-500">
                {loadingSearch ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
            <p className="text-xs text-blue-400 mt-2">Usa nombres de masas de agua en Espana. La busqueda consulta OpenStreetMap en tiempo real.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-red-200 text-sm">{error}</div>
          )}

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-cyan-400" /> Resultados</h2>
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {results.length === 0 ? (
                  <p className="text-sm text-blue-400">No hay resultados todavia. Busca un pantano, rio o mar.</p>
                ) : results.map((spot) => {
                  const isActive = selectedSpot?.place_id === spot.place_id;
                  const type = typeFromResult(spot);
                  return (
                    <button
                      key={spot.place_id}
                      onClick={() => loadForecast(spot)}
                      className={`w-full text-left rounded-xl border p-3 transition-all ${isActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 bg-slate-950/50 hover:bg-white/5'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white truncate">{spot.display_name?.split(',')[0]}</p>
                        <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-slate-800 text-cyan-300 border border-cyan-500/20">{type}</span>
                      </div>
                      <p className="text-xs text-blue-400 mt-1 line-clamp-2">{spot.display_name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><CloudSun className="w-4 h-4 text-cyan-400" /> Pronostico</h2>

              {!selectedSpot ? (
                <p className="text-sm text-blue-400">Selecciona una ubicacion para ver el pronostico detallado.</p>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-white font-semibold">{selectedSpot.display_name?.split(',')[0]}</p>
                    <p className="text-xs text-blue-400">{selectedSpot.display_name}</p>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-blue-300">Especie objetivo</label>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {SPECIES.map((sp) => (
                        <button
                          key={sp.id}
                          onClick={() => setSpecies(sp.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs border ${species === sp.id ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200' : 'bg-slate-800 border-white/10 text-blue-300'}`}
                        >
                          {sp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingWeather ? (
                    <p className="text-sm text-blue-400">Cargando condiciones meteorologicas...</p>
                  ) : weather?.current ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                        <Metric icon={CloudSun} label="Temperatura" value={`${weather.current.temperature_2m} °C`} />
                        <Metric icon={Gauge} label="Presion" value={`${weather.current.pressure_msl} hPa`} />
                        <Metric icon={Wind} label="Viento" value={`${weather.current.wind_speed_10m} km/h`} />
                        <Metric icon={Droplets} label="Humedad" value={`${weather.current.relative_humidity_2m}%`} />
                        <Metric icon={Waves} label="Tipo de agua" value={selectedType.toUpperCase()} />
                        <Metric icon={Fish} label="Especie" value={SPECIES.find(s => s.id === species)?.label || species} />
                      </div>

                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-cyan-500/30 bg-cyan-900/20 p-4"
                      >
                        <p className="text-sm text-cyan-200 font-semibold mb-1">Pronostico de captura</p>
                        <p className="text-3xl font-black text-white">{forecast.chance}%</p>
                        <p className="text-xs text-blue-200 mt-1">
                          {SPECIES.find(s => s.id === species)?.label} en {selectedSpot.display_name?.split(',')[0]}: {forecast.chance}% de probabilidad.
                        </p>
                        <p className="text-xs text-blue-300 mt-1">Estimacion: {forecast.expectedCatch} capturas probables.</p>
                        {forecast.notes.length > 0 && (
                          <ul className="text-xs text-blue-300 mt-2 space-y-0.5">
                            {forecast.notes.map((note) => <li key={note}>- {note}</li>)}
                          </ul>
                        )}
                      </motion.div>
                    </>
                  ) : (
                    <p className="text-sm text-blue-400">No se pudieron cargar datos meteorologicos.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Metric = ({ icon: Icon, label, value }) => (
  <div className="rounded-lg bg-slate-950/50 border border-white/10 px-3 py-2">
    <p className="text-[11px] text-blue-400 flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</p>
    <p className="text-white font-semibold mt-0.5">{value}</p>
  </div>
);

export default PronosticosPage;
