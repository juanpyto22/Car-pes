import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { searchFishingLocations, getLocationIcon, getLocationColor } from '@/data/fishingLocations';
import { useDebounce } from '@/hooks/useDebounce';

const LocationAutocomplete = ({ value, onChange, placeholder = "¿Dónde pescaste?", className = "" }) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Sincronizar valor externo
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar sugerencias
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setLoading(true);
      // Simular pequeño delay para UX
      const timer = setTimeout(() => {
        const results = searchFishingLocations(debouncedQuery);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setLoading(false);
        setHighlightedIndex(-1);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
  };

  const handleSelect = (location) => {
    const fullName = `${location.name}, ${location.region}`;
    setQuery(fullName);
    onChange(fullName);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-slate-950 border border-blue-900 rounded-xl pl-10 pr-10 py-3 text-white placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-blue-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[300px] overflow-y-auto">
            {suggestions.map((location, index) => (
              <button
                key={`${location.name}-${location.region}-${index}`}
                type="button"
                onClick={() => handleSelect(location)}
                className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
                  highlightedIndex === index 
                    ? 'bg-cyan-500/20 border-l-2 border-cyan-500' 
                    : 'hover:bg-white/5 border-l-2 border-transparent'
                }`}
              >
                <span className="text-lg mt-0.5">{getLocationIcon(location.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {location.name}
                  </p>
                  <p className="text-xs text-blue-400 truncate">
                    {location.region}, {location.country}
                  </p>
                  <span className={`text-[10px] uppercase font-bold ${getLocationColor(location.type)}`}>
                    {location.type}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="px-3 py-2 bg-slate-800/50 border-t border-white/5">
            <p className="text-[10px] text-blue-400">
              💡 Escribe para buscar ríos, lagos, embalses, mares o parques
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
