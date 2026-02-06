import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useDebounce } from './useDebounce';

export const useSearch = (initialQuery = '', searchType = 'all') => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState({
    users: [],
    posts: [],
    hashtags: [],
    locations: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Debounce la búsqueda para evitar muchas requests
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.trim().length > 0) {
      search(debouncedQuery);
    } else {
      clearResults();
    }
  }, [debouncedQuery, searchType]);

  const clearResults = () => {
    setResults({
      users: [],
      posts: [],
      hashtags: [],
      locations: []
    });
    setError(null);
  };

  const search = async (searchQuery) => {
    if (!searchQuery.trim()) {
      clearResults();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searches = [];

      // Búsqueda de usuarios
      if (searchType === 'all' || searchType === 'users') {
        searches.push(searchUsers(searchQuery));
      }

      // Búsqueda de posts
      if (searchType === 'all' || searchType === 'posts') {
        searches.push(searchPosts(searchQuery));
      }

      // Búsqueda de hashtags
      if (searchType === 'all' || searchType === 'hashtags') {
        searches.push(searchHashtags(searchQuery));
      }

      // Búsqueda de ubicaciones
      if (searchType === 'all' || searchType === 'locations') {
        searches.push(searchLocations(searchQuery));
      }

      const searchResults = await Promise.allSettled(searches);
      
      const newResults = {
        users: [],
        posts: [],
        hashtags: [],
        locations: []
      };

      let index = 0;
      if (searchType === 'all' || searchType === 'users') {
        newResults.users = searchResults[index]?.value || [];
        index++;
      }
      if (searchType === 'all' || searchType === 'posts') {
        newResults.posts = searchResults[index]?.value || [];
        index++;
      }
      if (searchType === 'all' || searchType === 'hashtags') {
        newResults.hashtags = searchResults[index]?.value || [];
        index++;
      }
      if (searchType === 'all' || searchType === 'locations') {
        newResults.locations = searchResults[index]?.value || [];
        index++;
      }

      setResults(newResults);
    } catch (err) {
      console.error('Search error:', err);
      setError('Error en la búsqueda. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (searchQuery) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        nombre,
        biografia,
        foto_perfil,
        followers_count,
        verified
      `)
      .or(`username.ilike.%${searchQuery}%,nombre.ilike.%${searchQuery}%`)
      .limit(20);

    if (error) throw error;
    return data || [];
  };

  const searchPosts = async (searchQuery) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(
          id,
          username,
          nombre,
          foto_perfil
        ),
        likes_count,
        comments_count
      `)
      .or(`content.ilike.%${searchQuery}%,fish_species.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  };

  const searchHashtags = async (searchQuery) => {
    // Para hashtags, buscamos en el contenido de los posts
    const { data, error } = await supabase
      .from('posts')
      .select('content')
      .ilike('content', `%#${searchQuery}%`)
      .limit(100);

    if (error) throw error;

    // Extraer hashtags únicos de los contenidos
    const hashtags = new Set();
    data?.forEach(post => {
      const matches = post.content.match(/#\w+/g);
      matches?.forEach(hashtag => {
        if (hashtag.toLowerCase().includes(searchQuery.toLowerCase())) {
          hashtags.add(hashtag);
        }
      });
    });

    return Array.from(hashtags).slice(0, 20);
  };

  const searchLocations = async (searchQuery) => {
    const { data, error } = await supabase
      .from('posts')
      .select('location')
      .not('location', 'is', null)
      .ilike('location', `%${searchQuery}%`)
      .limit(100);

    if (error) throw error;

    // Obtener ubicaciones únicas
    const locations = [...new Set(data?.map(post => post.location).filter(Boolean))];
    return locations.slice(0, 20);
  };

  // Búsquedas específicas para autocompletar
  const searchUsersForMention = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, nombre, foto_perfil')
        .ilike('username', `${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching users for mention:', error);
      return [];
    }
  };

  const searchFishSpecies = async (searchQuery) => {
    // Lista de especies de peces comunes
    const fishSpecies = [
      'Dorado', 'Trucha Arcoíris', 'Trucha Marrón', 'Salmón', 'Pejerrey',
      'Bagre', 'Surubí', 'Pacú', 'Boga', 'Tararira', 'Carpa', 'Dientudo',
      'Róbalo', 'Corvina', 'Besugo', 'Merluza', 'Lenguado', 'Congrio',
      'Atún', 'Pargo', 'Mero', 'Cherna', 'Abadejo', 'Bacalao', 'Lubina'
    ];

    return fishSpecies.filter(species => 
      species.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10);
  };

  // Estadísticas de búsqueda
  const searchStats = useMemo(() => ({
    totalUsers: results.users.length,
    totalPosts: results.posts.length,
    totalHashtags: results.hashtags.length,
    totalLocations: results.locations.length,
    totalResults: results.users.length + results.posts.length + results.hashtags.length + results.locations.length
  }), [results]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    searchStats,
    clearResults,
    searchUsersForMention,
    searchFishSpecies,
    hasResults: searchStats.totalResults > 0
  };
};