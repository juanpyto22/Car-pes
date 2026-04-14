import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Search, CloudSun, Wind, Gauge, Droplets, Waves, Fish, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { fishingLocations } from '@/data/fishingLocations';

const SPECIES = [
  { id: 'carpa', label: 'Carpa' },
  { id: 'bass', label: 'Black bass' },
  { id: 'lucio', label: 'Lucio' },
  { id: 'trucha', label: 'Trucha' },
  { id: 'siluro', label: 'Siluro' },
  { id: 'dorada', label: 'Dorada' },
  { id: 'lubina', label: 'Lubina' },
];

const GEAR_OPTIONS = [
  { id: 'cebo-natural', label: 'Cebo natural' },
  { id: 'boilie-maiz', label: 'Boilie / maiz' },
  { id: 'cucharilla', label: 'Cucharilla / spinner' },
  { id: 'vinilo-jig', label: 'Vinilo / jig' },
  { id: 'paseante-popper', label: 'Paseante / popper' },
  { id: 'currican', label: 'Currican / vivo' },
];

const SPECIES_RULES = {
  carpa: {
    tempMin: 14,
    tempMax: 24,
    water: ['pantano', 'lago', 'rio'],
    activeHours: [6, 7, 8, 19, 20, 21],
    gears: ['boilie-maiz', 'cebo-natural'],
  },
  bass: {
    tempMin: 12,
    tempMax: 23,
    water: ['pantano', 'lago'],
    activeHours: [7, 8, 9, 18, 19, 20],
    gears: ['vinilo-jig', 'paseante-popper'],
  },
  lucio: {
    tempMin: 8,
    tempMax: 18,
    water: ['pantano', 'rio', 'lago'],
    activeHours: [8, 9, 10, 17, 18],
    gears: ['vinilo-jig', 'currican'],
  },
  trucha: {
    tempMin: 7,
    tempMax: 17,
    water: ['rio', 'lago'],
    activeHours: [6, 7, 8, 9, 18, 19],
    gears: ['cucharilla', 'cebo-natural'],
  },
  siluro: {
    tempMin: 16,
    tempMax: 28,
    water: ['rio', 'pantano'],
    activeHours: [20, 21, 22, 23, 0, 1],
    gears: ['currican', 'cebo-natural'],
  },
  dorada: {
    tempMin: 13,
    tempMax: 28,
    water: ['mar'],
    activeHours: [7, 8, 9, 18, 19, 20],
    gears: ['cebo-natural', 'currican'],
  },
  lubina: {
    tempMin: 11,
    tempMax: 23,
    water: ['mar', 'rio'],
    activeHours: [6, 7, 8, 20, 21, 22],
    gears: ['vinilo-jig', 'paseante-popper'],
  },
};

const SPECIES_SEASONS = {
  carpa: { prime: [4, 5, 6, 9, 10], ok: [3, 7, 8, 11] },
  bass: { prime: [4, 5, 6, 9, 10], ok: [3, 7, 8] },
  lucio: { prime: [10, 11, 12, 1, 2, 3], ok: [4, 9] },
  trucha: { prime: [3, 4, 5, 9, 10], ok: [6, 11] },
  siluro: { prime: [6, 7, 8, 9], ok: [5, 10] },
  dorada: { prime: [5, 6, 7, 8, 9, 10], ok: [4, 11] },
  lubina: { prime: [10, 11, 12, 1, 2, 3], ok: [4, 9] },
};

const HARD_INCOMPATIBLE_GEAR = {
  // Regla fuerte pedida: carpa no se pesca con señuelos de depredador.
  carpa: ['cucharilla', 'vinilo-jig', 'paseante-popper', 'currican'],
};

const HARD_INCOMPATIBLE_WATER = {
  // Marinas estrictas
  dorada: ['rio', 'pantano', 'lago', 'agua'],
  // Dulceacuicolas estrictas
  carpa: ['mar'],
  bass: ['mar'],
  lucio: ['mar'],
  trucha: ['mar'],
  siluro: ['mar'],
};

const typeFromResult = (place) => {
  const text = `${place?.display_name || ''} ${place?.type || ''}`.toLowerCase();
  if (text.includes('reservoir') || text.includes('embalse') || text.includes('pantano')) return 'pantano';
  if (text.includes('river') || text.includes('rio') || text.includes('río')) return 'rio';
  if (text.includes('sea') || text.includes('mar') || text.includes('coast') || text.includes('bahía')) return 'mar';
  if (text.includes('lake') || text.includes('laguna')) return 'lago';
  return 'agua';
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const weatherCodeToText = (code) => {
  const map = {
    0: 'Despejado',
    1: 'Poco nuboso',
    2: 'Parcialmente nuboso',
    3: 'Cubierto',
    45: 'Niebla',
    48: 'Niebla con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna moderada',
    55: 'Llovizna intensa',
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia fuerte',
    71: 'Nieve ligera',
    73: 'Nieve moderada',
    75: 'Nieve fuerte',
    80: 'Chubascos ligeros',
    81: 'Chubascos moderados',
    82: 'Chubascos fuertes',
    95: 'Tormenta',
  };
  return map[code] || 'Tiempo variable';
};

const toHour = (isoDate) => {
  const d = new Date(isoDate);
  return Number.isNaN(d.getTime()) ? 0 : d.getHours();
};

const buildHourlyRows = (weather) => {
  const time = weather?.hourly?.time || [];
  const temp = weather?.hourly?.temperature_2m || [];
  const pressure = weather?.hourly?.pressure_msl || [];
  const wind = weather?.hourly?.wind_speed_10m || [];
  const windDir = weather?.hourly?.wind_direction_10m || [];
  const humidity = weather?.hourly?.relative_humidity_2m || [];
  const cloud = weather?.hourly?.cloud_cover || [];
  const precip = weather?.hourly?.precipitation || [];
  const precipProb = weather?.hourly?.precipitation_probability || [];

  return time.map((t, i) => ({
    time: t,
    temperature_2m: temp[i] ?? null,
    pressure_msl: pressure[i] ?? null,
    wind_speed_10m: wind[i] ?? null,
    wind_direction_10m: windDir[i] ?? null,
    relative_humidity_2m: humidity[i] ?? null,
    cloud_cover: cloud[i] ?? null,
    precipitation: precip[i] ?? null,
    precipitation_probability: precipProb[i] ?? null,
  }));
};

const scoreHour = ({ species, gear, waterType, hourData, month }) => {
  const rules = SPECIES_RULES[species] || SPECIES_RULES.carpa;
  const hardIncompatible = (HARD_INCOMPATIBLE_GEAR[species] || []).includes(gear);
  const hardIncompatibleWater = (HARD_INCOMPATIBLE_WATER[species] || []).includes(waterType);

  if (hardIncompatible) {
    return {
      chance: 0,
      notes: ['Tecnica incompatible con la especie objetivo.'],
      gearMatch: false,
      hour: toHour(hourData.time),
      hardIncompatible: true,
      blockingReason: 'La tecnica seleccionada no corresponde con la especie objetivo.',
    };
  }

  if (hardIncompatibleWater) {
    return {
      chance: 0,
      notes: ['Tipo de agua incompatible con la especie objetivo.'],
      gearMatch: false,
      hour: toHour(hourData.time),
      hardIncompatible: true,
      blockingReason: 'La especie seleccionada no se pesca en este tipo de agua.',
    };
  }

  const temp = hourData.temperature_2m ?? 18;
  const pressure = hourData.pressure_msl ?? 1013;
  const wind = hourData.wind_speed_10m ?? 10;
  const rain = hourData.precipitation ?? 0;
  const rainProb = hourData.precipitation_probability ?? 20;
  const humidity = hourData.relative_humidity_2m ?? 60;
  const cloud = hourData.cloud_cover ?? 45;
  const hour = toHour(hourData.time);

  let score = 40;
  const notes = [];

  if (temp >= rules.tempMin && temp <= rules.tempMax) {
    score += 14;
    notes.push('Temperatura optima para la especie');
  } else if (temp >= rules.tempMin - 3 && temp <= rules.tempMax + 3) {
    score += 6;
    notes.push('Temperatura aceptable');
  } else {
    score -= 10;
    notes.push('Temperatura alejada del rango ideal');
  }

  if (pressure >= 1008 && pressure <= 1022) {
    score += 10;
    notes.push('Presion estable favorable');
  } else if (pressure < 996 || pressure > 1032) {
    score -= 12;
    notes.push('Presion muy desfavorable');
  } else {
    score -= 4;
  }

  if (wind <= 15) {
    score += 8;
  } else if (wind <= 25) {
    score += 2;
  } else if (wind > 35) {
    score -= 15;
    notes.push('Viento fuerte, baja actividad');
  }

  if (rain <= 1 && rainProb <= 35) {
    score += 6;
  } else if (rainProb >= 70) {
    score -= 10;
    notes.push('Alta probabilidad de lluvia');
  }

  if (cloud >= 30 && cloud <= 80) score += 5;
  if (humidity >= 45 && humidity <= 85) score += 3;

  const season = SPECIES_SEASONS[species];
  if (season) {
    if (season.prime.includes(month)) {
      score += 10;
      notes.push('Mes muy favorable para la especie');
    } else if (season.ok.includes(month)) {
      score += 3;
      notes.push('Mes aceptable para actividad');
    } else {
      score -= 12;
      notes.push('Mes poco favorable para esta especie');
    }
  }

  if (rules.water.includes(waterType)) {
    score += 10;
    notes.push('Tipo de agua compatible con la especie');
  } else {
    score -= 9;
    notes.push('Tipo de agua poco compatible');
  }

  const inPrimeHour = rules.activeHours.includes(hour);
  if (inPrimeHour) {
    score += 12;
    notes.push('Franja horaria muy activa');
  } else if (rules.activeHours.some((h) => Math.abs(h - hour) <= 1)) {
    score += 6;
    notes.push('Franja cercana a la mejor hora');
  }

  const gearMatch = rules.gears.includes(gear);
  if (gearMatch) {
    score += 12;
    notes.push('Equipo/tecnica recomendada para la especie');
  } else {
    score -= 8;
    notes.push('El equipo no es el mas recomendable');
  }

  const chance = clamp(Math.round(score), 5, 99);
  return { chance, notes, gearMatch, hour, hardIncompatible: false, blockingReason: null };
};

const calculateFishingChance = ({ species, gear, weather, waterType, selectedDate }) => {
  if (!weather || !selectedDate) {
    return {
      chance: 0,
      expectedCatch: 0,
      notes: [],
      bestHour: null,
      allHours: [],
      gearMatch: false,
      hardIncompatible: false,
      blockingReason: null,
    };
  }

  const rows = buildHourlyRows(weather).filter((row) => (row.time || '').startsWith(selectedDate));
  if (rows.length === 0) {
    return {
      chance: 0,
      expectedCatch: 0,
      notes: ['No hay datos horarios para la fecha seleccionada (max 16 dias).'],
      bestHour: null,
      allHours: [],
      gearMatch: false,
      hardIncompatible: false,
      blockingReason: null,
    };
  }

  const month = Number((selectedDate || '').split('-')[1]) || new Date().getMonth() + 1;

  const scored = rows.map((row) => {
    const result = scoreHour({ species, gear, waterType, hourData: row, month });
    return {
      ...row,
      ...result,
      hourLabel: format(new Date(row.time), 'HH:mm', { locale: es }),
    };
  });

  const anyHardIncompatible = scored.some((s) => s.hardIncompatible);
  if (anyHardIncompatible) {
    const firstBlocked = scored.find((s) => s.hardIncompatible) || scored[0] || null;
    return {
      chance: 0,
      expectedCatch: 0,
      notes: ['Combinacion especie/tecnica no valida para pesca efectiva.'],
      bestHour: null,
      allHours: scored,
      gearMatch: false,
      hardIncompatible: true,
      blockingReason: firstBlocked?.blockingReason || 'Combinacion incompatible para pesca efectiva.',
    };
  }

  const bestHour = [...scored].sort((a, b) => b.chance - a.chance)[0];
  const avgChance = Math.round(scored.reduce((acc, item) => acc + item.chance, 0) / scored.length);
  const expectedCatch = clamp(Math.round((avgChance / 100) * 5), 0, 5);

  return {
    chance: avgChance,
    expectedCatch,
    notes: bestHour?.notes || [],
    bestHour,
    allHours: scored,
    gearMatch: Boolean(bestHour?.gearMatch),
    hardIncompatible: false,
    blockingReason: null,
  };
};

const PronosticosPage = () => {
  const routerLocation = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weather, setWeather] = useState(null);
  const [species, setSpecies] = useState('carpa');
  const [gear, setGear] = useState('cebo-natural');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [error, setError] = useState(null);
  const [queryFocused, setQueryFocused] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const minDate = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 15), 'yyyy-MM-dd');

  const spanishWaters = useMemo(() => {
    return fishingLocations.filter((location) => {
      const country = normalizeText(location.country || '');
      const type = normalizeText(location.type || '');
      return country === 'espana' && ['rio', 'lago', 'embalse', 'mar', 'parque'].includes(type);
    });
  }, []);

  const localSuggestions = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return [];

    return spanishWaters
      .filter((spot) => {
        const haystack = normalizeText(`${spot.name} ${spot.region} ${spot.type} ${spot.description || ''}`);
        return haystack.includes(q);
      })
      .slice(0, 10)
      .map((spot, idx) => ({
        place_id: `local-suggest-${idx}-${spot.name}`,
        lat: String(spot.latitude),
        lon: String(spot.longitude),
        display_name: `${spot.name}, ${spot.region}, España`,
        type: spot.type,
      }));
  }, [query, spanishWaters]);

  const selectedType = useMemo(() => typeFromResult(selectedSpot), [selectedSpot]);

  const forecast = useMemo(() => {
    return calculateFishingChance({
      species,
      gear,
      weather,
      waterType: selectedType,
      selectedDate,
    });
  }, [species, gear, weather, selectedType, selectedDate]);

  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const lat = Number(params.get('lat'));
    const lon = Number(params.get('lng'));
    const spot = params.get('spot');

    if (!Number.isNaN(lat) && !Number.isNaN(lon) && spot) {
      const quickSpot = {
        place_id: `map-${lat}-${lon}`,
        lat: String(lat),
        lon: String(lon),
        display_name: decodeURIComponent(spot),
        type: 'water',
      };
      setSelectedSpot(quickSpot);
      setQuery(decodeURIComponent(spot));
      loadForecast(quickSpot);
    }
  }, [routerLocation.search]);

  const searchWaters = async () => {
    if (!query.trim() || query.trim().length < 1) return;

    setLoadingSearch(true);
    setError(null);

    try {
      const qNorm = normalizeText(query.trim());

      const localResults = spanishWaters
        .filter((spot) => {
          const haystack = normalizeText(`${spot.name} ${spot.region} ${spot.type} ${spot.description || ''}`);
          return haystack.includes(qNorm);
        })
        .slice(0, 25)
        .map((spot, idx) => ({
          place_id: `local-${idx}-${spot.name}`,
          lat: String(spot.latitude),
          lon: String(spot.longitude),
          display_name: `${spot.name}, ${spot.region}, España`,
          type: spot.type,
        }));

      const q = encodeURIComponent(`${query.trim()} embalse rio mar lago costa Espana`);
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=es&limit=40&q=${q}`;

      let remoteFiltered = [];
      try {
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          remoteFiltered = (data || []).filter((item) => {
            const text = `${item.display_name || ''} ${item.type || ''}`.toLowerCase();
            return [
              'river', 'rio', 'río', 'reservoir', 'embalse', 'pantano', 'sea', 'mar', 'lake', 'laguna', 'coast', 'bay', 'bahia', 'bahía'
            ].some((k) => text.includes(k));
          });
        }
      } catch (remoteErr) {
        console.warn('Busqueda remota no disponible, usando base local:', remoteErr);
      }

      const merged = [...localResults];
      remoteFiltered.forEach((item) => {
        const already = merged.some((m) => {
          const mName = normalizeText((m.display_name || '').split(',')[0]);
          const rName = normalizeText((item.display_name || '').split(',')[0]);
          const closeCoord = Math.abs(Number(m.lat) - Number(item.lat)) < 0.03 && Math.abs(Number(m.lon) - Number(item.lon)) < 0.03;
          return mName === rName || closeCoord;
        });
        if (!already) merged.push(item);
      });

      setResults(merged);

      const preferred = selectedSuggestion || merged[0] || null;
      if (preferred) {
        await loadForecast(preferred);
      } else {
        setError('No se encontraron masas de agua para esa busqueda.');
      }
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

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,relative_humidity_2m,cloud_cover,precipitation&hourly=temperature_2m,pressure_msl,wind_speed_10m,wind_direction_10m,relative_humidity_2m,cloud_cover,precipitation,precipitation_probability&forecast_days=16&timezone=auto`;
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
            <p className="text-blue-300 mt-1">Asistente IA de pesca: lugar + fecha + especie + tecnica para recomendar clima, equipo y mejor hora de captura.</p>
          </div>

          <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 md:p-5 mb-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedSuggestion(null);
                  }}
                  onFocus={() => setQueryFocused(true)}
                  onBlur={() => setTimeout(() => setQueryFocused(false), 120)}
                  onKeyDown={(e) => e.key === 'Enter' && searchWaters()}
                  placeholder="Ejemplo: Orellana, Ebro, Delta del Ebro, Guadalquivir, Cantabrico..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-blue-500"
                />

                {queryFocused && localSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 shadow-xl">
                    {localSuggestions.map((spot) => (
                      <button
                        key={spot.place_id}
                        type="button"
                        onMouseDown={() => {
                          setQuery((spot.display_name || '').split(',').slice(0, 2).join(',').trim());
                          setSelectedSuggestion(spot);
                        }}
                        className="w-full border-b border-white/5 px-3 py-2 text-left text-sm text-blue-100 hover:bg-slate-800"
                      >
                        {spot.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={searchWaters} disabled={loadingSearch} className="h-12 px-5 bg-cyan-600 hover:bg-cyan-500">
                {loadingSearch ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
            <p className="text-xs text-blue-400 mt-2">Usa nombres de masas de agua en Espana. La busqueda consulta OpenStreetMap en tiempo real.</p>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 md:p-5 mb-5">
            <h2 className="text-white font-bold mb-3">Datos clave del dia de pesca</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-blue-300">Dia y mes</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1 w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-blue-300">Pez objetivo</label>
                <select
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  className="mt-1 w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {SPECIES.map((sp) => <option key={sp.id} value={sp.id}>{sp.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-blue-300">Con que vas a pescar</label>
                <select
                  value={gear}
                  onChange={(e) => setGear(e.target.value)}
                  className="mt-1 w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {GEAR_OPTIONS.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                </select>
              </div>
            </div>
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

                  {loadingWeather ? (
                    <p className="text-sm text-blue-400">Cargando condiciones meteorologicas...</p>
                  ) : weather?.current ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                        <Metric icon={CloudSun} label="Temperatura" value={`${weather.current.temperature_2m} °C`} />
                        <Metric icon={CloudSun} label="Sensacion" value={`${weather.current.apparent_temperature} °C`} />
                        <Metric icon={CloudSun} label="Tiempo ahora" value={weatherCodeToText(weather.current.weather_code)} />
                        <Metric icon={Gauge} label="Presion" value={`${weather.current.pressure_msl} hPa`} />
                        <Metric icon={Wind} label="Viento" value={`${weather.current.wind_speed_10m} km/h`} />
                        <Metric icon={Wind} label="Direccion" value={`${weather.current.wind_direction_10m}°`} />
                        <Metric icon={Droplets} label="Humedad" value={`${weather.current.relative_humidity_2m}%`} />
                        <Metric icon={Waves} label="Tipo de agua" value={selectedType.toUpperCase()} />
                        <Metric icon={Fish} label="Especie" value={SPECIES.find(s => s.id === species)?.label || species} />
                        <Metric icon={CloudSun} label="Fecha" value={format(new Date(`${selectedDate}T12:00:00`), "d 'de' MMMM", { locale: es })} />
                        <Metric icon={Fish} label="Tecnica" value={GEAR_OPTIONS.find(g => g.id === gear)?.label || gear} />
                      </div>

                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-cyan-500/30 bg-cyan-900/20 p-4"
                      >
                        <p className="text-sm text-cyan-200 font-semibold mb-1">Pronostico de captura</p>
                        <p className="text-3xl font-black text-white">{forecast.chance}%</p>
                        <p className="text-xs text-blue-200 mt-1">
                          {SPECIES.find(s => s.id === species)?.label} en {selectedSpot.display_name?.split(',')[0]}: {forecast.chance}% de probabilidad media en la fecha elegida.
                        </p>
                        <p className="text-xs text-blue-300 mt-1">Estimacion: {forecast.expectedCatch} capturas probables.</p>

                        {forecast.bestHour && !forecast.hardIncompatible && (
                          <div className="mt-3 rounded-lg border border-cyan-400/30 bg-slate-950/40 p-3">
                            <p className="text-cyan-200 text-xs font-semibold">Mejor hora recomendada</p>
                            <p className="text-white text-xl font-black">{forecast.bestHour.hourLabel} ({forecast.bestHour.chance}%)</p>
                            <p className="text-xs text-blue-300 mt-1">
                              Temp {forecast.bestHour.temperature_2m}°C · Viento {forecast.bestHour.wind_speed_10m} km/h · Presion {forecast.bestHour.pressure_msl} hPa
                            </p>
                          </div>
                        )}

                        {forecast.hardIncompatible && (
                          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-900/20 p-3">
                            <p className="text-red-200 text-xs font-semibold">Combinacion no valida</p>
                            <p className="text-red-100 text-sm mt-1">{forecast.blockingReason || 'La tecnica seleccionada no es valida para la especie.'}</p>
                            <p className="text-red-200/90 text-xs mt-2">Ajusta la tecnica para obtener una recomendacion horaria real.</p>
                          </div>
                        )}

                        <p className={`text-xs mt-3 ${forecast.hardIncompatible ? 'text-red-300' : forecast.gearMatch ? 'text-emerald-300' : 'text-yellow-300'}`}>
                          {forecast.hardIncompatible
                            ? 'Probabilidad bloqueada por incompatibilidad especie/tecnica (0%).'
                            : forecast.gearMatch
                              ? 'Equipo recomendado para la especie: vas bien preparado.'
                              : 'Tu tecnica no es la mas adecuada para esta especie. Considera cambiar de equipo.'}
                        </p>

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
