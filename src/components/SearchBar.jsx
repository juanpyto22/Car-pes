import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, User, Fish } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useDebounce } from '@/hooks/useDebounce';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 500);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults({ users: [], posts: [] });
        return;
      }

      setLoading(true);
      try {
        const [usersRes, postsRes] = await Promise.all([
          supabase
            .from('users')
            .select('id, username, foto_perfil, bio')
            .ilike('username', `%${debouncedQuery}%`)
            .limit(4),
          supabase
            .from('posts')
            .select('id, tipo_pez, foto_url, user:users(username)')
            .ilike('tipo_pez', `%${debouncedQuery}%`)
            .limit(4)
        ]);

        setResults({
          users: usersRes.data || [],
          posts: postsRes.data || []
        });
        setIsOpen(true);
      } catch (error) {
        console.error('Error búsqueda:', error);
        setResults({ users: [], posts: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 group-focus-within:text-cyan-400 transition-colors" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(true)}
          placeholder="Buscar usuarios, peces..."
          className="w-full pl-10 pr-10 py-2.5 bg-slate-900/50 border border-blue-800/30 rounded-full text-white placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:bg-slate-900 transition-all text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white bg-white/5 rounded-full p-0.5 hover:bg-white/10"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (query.trim().length > 0) && (
        <div className="absolute top-full mt-2 w-full bg-slate-900 border border-blue-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <>
              {results.users.length > 0 && (
                <div className="p-2">
                  <div className="text-[10px] font-bold text-blue-400 px-3 mb-2 uppercase tracking-wider">Usuarios</div>
                  {results.users.map(user => (
                    <div
                      key={user.id}
                      onClick={() => {
                        navigate(`/profile/${user.id}`);
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group"
                    >
                      <Avatar className="w-9 h-9 border border-blue-800 group-hover:border-cyan-500 transition-colors">
                        <AvatarImage src={user.foto_perfil} />
                        <AvatarFallback>{user.username[0]}</AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{user.username}</p>
                        <p className="text-xs text-blue-400 truncate">{user.bio || 'Sin biografía'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.posts.length > 0 && (
                <div className="p-2 border-t border-white/5 bg-white/[0.02]">
                  <div className="text-[10px] font-bold text-blue-400 px-3 mb-2 uppercase tracking-wider">Publicaciones</div>
                  {results.posts.map(post => (
                    <div
                      key={post.id}
                      onClick={() => {
                        navigate(`/post/${post.id}`);
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-white/5">
                        {post.foto_url && (
                            <img src={post.foto_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate flex items-center gap-1">
                          <Fish className="w-3 h-3 text-cyan-400" /> {post.tipo_pez || 'Captura'}
                        </p>
                        <p className="text-xs text-blue-400 truncate">por {post.user?.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.users.length === 0 && results.posts.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-blue-300 font-medium">No se encontraron resultados</p>
                  <p className="text-xs text-blue-500 mt-1">Intenta con otro término</p>
                </div>
              )}
              
              {/* Ver todos los resultados */}
              {(results.users.length > 0 || results.posts.length > 0) && (
                <div 
                  className="p-3 border-t border-white/5 text-center hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(query)}`);
                    setIsOpen(false);
                  }}
                >
                  <span className="text-sm text-cyan-400 font-bold">Ver todos los resultados →</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;