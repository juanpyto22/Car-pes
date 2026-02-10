import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, MessageCircle, Bell, User, LogOut, Plus, Edit3, LogIn, Bookmark, Map, Trophy, Users, Calendar, ShoppingBag, BarChart3, Settings, Gift, DollarSign, Radio } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SearchBar from '@/components/SearchBar';
import { useNotifications } from '@/hooks/useNotifications';
import { useMessages } from '@/hooks/useMessages';
import logoImg from '/img/Car-Pes.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const Header = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { unreadCount: notifCount } = useNotifications(user ? profile : null);
  const { unreadCount: msgCount } = useMessages(user || null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-3 md:px-4">
        <div className="flex items-center justify-between gap-3 h-14 md:h-16">
          {/* Logo */}
          <Link to={user ? "/feed" : "/"} className="flex items-center gap-2 group shrink-0">
            <div className="relative">
              <div className="absolute -inset-2 bg-cyan-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-80 transition-opacity duration-300" />
              <img
                src={logoImg}
                alt="Car-Pes"
                className="h-14 md:h-16 w-auto object-contain relative z-10"
              />
            </div>
            <span className="hidden sm:block text-lg md:text-xl font-black bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent tracking-tight">
              Car-Pes
            </span>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-sm mx-3">
            <SearchBar />
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-0.5 sm:gap-1">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-0.5">
                  <NavLink to="/feed" icon={Home} active={location.pathname === '/feed'} />
                  <NavLink to="/explore" icon={Compass} active={location.pathname === '/explore'} />
                  <NavLink to="/messages" icon={MessageCircle} badge={msgCount} active={location.pathname === '/messages'} />
                  <NavLink to="/notifications" icon={Bell} badge={notifCount} active={location.pathname === '/notifications'} />
                  <NavLink to="/live" icon={Radio} active={location.pathname === '/live'} />
                </div>
                
                <Link to="/create-post" className="hidden md:block">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full hover:shadow-lg shadow-cyan-900/30 transition-all ml-1"
                    title="Crear Publicación"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </motion.button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none ml-1.5">
                      <Avatar className="w-8 h-8 md:w-9 md:h-9 border-2 border-cyan-500/30 cursor-pointer hover:border-cyan-400 transition-colors">
                        <AvatarImage src={profile?.foto_perfil} alt={profile?.nombre} className="object-cover" />
                        <AvatarFallback className="bg-blue-900 text-cyan-200 font-bold text-sm">
                          {profile?.nombre?.[0] || user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-slate-900/95 border-white/10 text-white backdrop-blur-xl">
                    <DropdownMenuItem onClick={() => navigate(`/profile`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <User className="mr-2 h-4 w-4 text-cyan-400" /> Mi Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/edit-profile`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <Edit3 className="mr-2 h-4 w-4 text-cyan-400" /> Editar Perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={() => navigate(`/saved`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <Bookmark className="mr-2 h-4 w-4 text-blue-400" /> Guardados
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/maps`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <Map className="mr-2 h-4 w-4 text-blue-400" /> Mapas
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/achievements`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <Trophy className="mr-2 h-4 w-4 text-yellow-400" /> Logros
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/rewards`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <Gift className="mr-2 h-4 w-4 text-purple-400" /> Recompensas
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={() => navigate(`/groups`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <Users className="mr-2 h-4 w-4 text-blue-400" /> Grupos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/events`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <Calendar className="mr-2 h-4 w-4 text-blue-400" /> Eventos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/marketplace`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <ShoppingBag className="mr-2 h-4 w-4 text-blue-400" /> Marketplace
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/live`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <Radio className="mr-2 h-4 w-4 text-red-400" /> Directos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/analytics`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <BarChart3 className="mr-2 h-4 w-4 text-blue-400" /> Estadísticas
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/settings`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white py-2.5">
                      <Settings className="mr-2 h-4 w-4 text-blue-400" /> Configuración
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer hover:bg-red-900/30 focus:bg-red-900/30 text-red-400 focus:text-red-300 py-2.5">
                      <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <div className="hidden sm:flex gap-0.5">
                  <NavLink to="/" icon={Home} active={location.pathname === '/'} />
                  <NavLink to="/explore" icon={Compass} active={location.pathname === '/explore'} />
                </div>
                <Link to="/login">
                  <Button variant="ghost" className="text-blue-200 hover:text-white hover:bg-white/10 ml-1 rounded-xl text-sm h-9">
                    <LogIn className="w-4 h-4 mr-1.5" /> Entrar
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white ml-1 rounded-xl text-sm h-9 shadow-lg shadow-blue-900/20">
                    Registrarse
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

const NavLink = ({ to, icon: Icon, badge, active }) => (
  <Link to={to}>
    <div className={`relative p-2.5 rounded-xl transition-all ${active ? 'text-cyan-400 bg-cyan-500/10' : 'text-blue-300 hover:text-cyan-400 hover:bg-white/5'}`}>
      <Icon className="w-5 h-5" />
      {badge > 0 && (
        <span className="absolute top-1 right-0.5 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold border border-slate-950">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </div>
  </Link>
);

export default Header;