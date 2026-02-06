import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hash, Search, TrendingUp, Calendar, MapPin } from 'lucide-react';
import { useAdvancedSocial } from '@/hooks/useAdvancedSocial';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TrendingHashtags = ({ 
  onHashtagClick, 
  compact = false, 
  limit = 10,
  className = ""
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getTrendingHashtags } = useAdvancedSocial(user);
  
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHashtags, setFilteredHashtags] = useState([]);
  const [timeframe, setTimeframe] = useState('week'); // week, month, all

  useEffect(() => {
    loadTrendingHashtags();
  }, [timeframe]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = trending.filter(tag =>
        tag.hashtag.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredHashtags(filtered);
    } else {
      setFilteredHashtags(trending);
    }
  }, [searchQuery, trending]);

  const loadTrendingHashtags = async () => {
    setLoading(true);
    try {
      const hashtags = await getTrendingHashtags(limit);
      setTrending(hashtags);
      setFilteredHashtags(hashtags);
    } catch (error) {
      console.error('Error loading trending hashtags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHashtagClick = (hashtag) => {
    if (onHashtagClick) {
      onHashtagClick(hashtag);
    } else {
      // Navigate to search page with hashtag
      navigate(`/search?q=%23${hashtag}`);
    }
  };

  const getFishingRelatedIcon = (hashtag) => {
    const fishingKeywords = {
      'pesca': '🎣',
      'fishing': '🎣',
      'bass': '🐟',
      'trucha': '🐟',
      'salmon': '🐟',
      'mar': '🌊',
      'lago': '🏞️',
      'rio': '💧',
      'señuelo': '🎪',
      'carnada': '🪱',
      'motor': '⛵',
      'lanchas': '🚤'
    };
    
    for (const [keyword, icon] of Object.entries(fishingKeywords)) {
      if (hashtag.toLowerCase().includes(keyword)) {
        return icon;
      }
    }
    return '🏷️';
  };

  if (loading && !compact) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-3/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`${className}`}>
        <div className="flex flex-wrap gap-2">
          {filteredHashtags.slice(0, 6).map((tag, index) => (
            <motion.button
              key={tag.hashtag}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleHashtagClick(tag.hashtag)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-full text-sm text-blue-300 hover:text-blue-200 transition-colors"
            >
              <span className="text-xs">{getFishingRelatedIcon(tag.hashtag)}</span>
              <span>#{tag.hashtag}</span>
              <span className="text-xs text-blue-500">({tag.count})</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          Hashtags Trending
        </h3>
        
        {/* Timeframe selector */}
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
          {[
            { key: 'week', label: '7d' },
            { key: 'month', label: '30d' },
            { key: 'all', label: 'Todo' }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setTimeframe(option.key)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeframe === option.key
                  ? 'bg-cyan-600 text-white'
                  : 'text-blue-400 hover:bg-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar hashtags..."
          className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-blue-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      {/* Trending List */}
      <div className="space-y-2">
        {filteredHashtags.length === 0 ? (
          <div className="text-center py-8">
            <Hash className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              {searchQuery ? 'No se encontraron hashtags' : 'No hay hashtags trending'}
            </p>
          </div>
        ) : (
          filteredHashtags.map((tag, index) => (
            <motion.div
              key={tag.hashtag}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <button
                onClick={() => handleHashtagClick(tag.hashtag)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl border border-blue-500/30">
                    <span className="text-lg">{getFishingRelatedIcon(tag.hashtag)}</span>
                  </div>
                  
                  <div>
                    <p className="text-white font-medium group-hover:text-cyan-400 transition-colors">
                      #{tag.hashtag}
                    </p>
                    <p className="text-sm text-blue-400">
                      {tag.count} {tag.count === 1 ? 'publicación' : 'publicaciones'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-bold text-cyan-400">#{index + 1}</div>
                    <div className="text-xs text-blue-500">
                      {timeframe === 'week' ? 'Esta semana' : 
                       timeframe === 'month' ? 'Este mes' : 'Histórico'}
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex gap-3">
          <Button
            onClick={loadTrendingHashtags}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex-1 bg-transparent border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
          
          <Button
            onClick={() => navigate('/search')}
            variant="outline"
            size="sm"
            className="flex-1 bg-transparent border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
          >
            Ver Todas
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-cyan-400">{trending.length}</div>
          <div className="text-xs text-blue-500">Hashtags</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-400">
            {trending.reduce((sum, tag) => sum + tag.count, 0)}
          </div>
          <div className="text-xs text-blue-500">Posts Total</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-400">
            {Math.round(trending.reduce((sum, tag) => sum + tag.count, 0) / Math.max(trending.length, 1))}
          </div>
          <div class="text-xs text-blue-500">Promedio</div>
        </div>
      </div>
    </div>
  );
};

export default TrendingHashtags;