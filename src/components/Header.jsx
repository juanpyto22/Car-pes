import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Compass, MessageCircle, Bell, User, LogOut, Plus, Edit3, LogIn, Menu, Bookmark, Map, Trophy, Users, Calendar, ShoppingBag, BarChart3, Settings, Gift, DollarSign } from 'lucide-react';
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
  
  const { unreadCount: notifCount } = useNotifications(user ? profile : null);
  const { unreadCount: msgCount } = useMessages(user ? profile : null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 bg-gradient-to-r from-blue-950/95 to-slate-950/95 backdrop-blur-xl border-b border-white/5 shadow-xl"
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to={user ? "/feed" : "/"} className="flex items-center gap-3 group shrink-0">
            <motion.img
              whileHover={{ scale: 1.05 }}
              src={logoImg}
              alt="Car-Pes"
              className="h-12 w-auto object-contain"
            />
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="text-3xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text text-transparent hidden sm:block"
            >
              Car-Pes
            </motion.div>
          </Link>

          {/* Search Bar - Flex grow to fill space */}
          <div className="hidden md:block flex-1 max-w-md mx-4">
            <SearchBar />
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            
            {user ? (
              // Authenticated Navigation
              <>
                <div className="hidden md:flex items-center gap-2">
                  <NavLink to="/feed" icon={Home} label="Feed" />
                  <NavLink to="/explore" icon={Compass} label="Explorar" />
                  <NavLink to="/messages" icon={MessageCircle} label="Mensajes" badge={msgCount} />
                  <NavLink to="/notifications" icon={Bell} label="Notificaciones" badge={notifCount} />
                </div>
                
                <Link to="/create-post" className="hidden sm:block">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full hover:shadow-lg shadow-cyan-900/20 transition-all mx-2"
                    title="Crear Publicación"
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </motion.button>
                </Link>

                {/* Mobile Menu Trigger could go here, but using bottom nav or dropdown usually better for mobile web apps. Let's stick to dropdown for profile */}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      className="focus:outline-none ml-2"
                    >
                      <Avatar className="w-10 h-10 border-2 border-cyan-500/30 cursor-pointer hover:border-cyan-400 transition-colors">
                        <AvatarImage src={profile?.foto_perfil} alt={profile?.nombre} className="object-cover" />
                        <AvatarFallback className="bg-blue-900 text-cyan-200 font-bold">
                          {profile?.nombre?.[0] || user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-slate-900/95 border-blue-800 text-white backdrop-blur-xl">
                    <div className="md:hidden block px-2 py-2 border-b border-white/10 mb-2">
                       <p className="text-xs text-blue-400 font-bold uppercase mb-2">Menú</p>
                       <div className="grid grid-cols-4 gap-2">
                          <Link to="/feed" className="flex justify-center p-2 rounded hover:bg-white/5"><Home className="w-5 h-5"/></Link>
                          <Link to="/explore" className="flex justify-center p-2 rounded hover:bg-white/5"><Compass className="w-5 h-5"/></Link>
                          <Link to="/messages" className="flex justify-center p-2 rounded hover:bg-white/5 relative">
                             <MessageCircle className="w-5 h-5"/>
                             {msgCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"/>}
                          </Link>
                          <Link to="/notifications" className="flex justify-center p-2 rounded hover:bg-white/5 relative">
                             <Bell className="w-5 h-5"/>
                             {notifCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"/>}
                          </Link>
                       </div>
                    </div>
                    <DropdownMenuItem onClick={() => navigate(`/profile`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <User className="mr-2 h-4 w-4" />
                      <span>Mi Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/edit-profile`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <Edit3 className="mr-2 h-4 w-4" />
                      <span>Editar Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/saved`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <Bookmark className="mr-2 h-4 w-4" />
                      <span>Posts Guardados</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/maps`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <Map className="mr-2 h-4 w-4" />
                      <span>Mapas de Pesca</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/achievements`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <Trophy className="mr-2 h-4 w-4" />
                      <span>Logros</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/rewards`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <Gift className="mr-2 h-4 w-4" />
                      <span>Recompensas</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/cashout`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <DollarSign className="mr-2 h-4 w-4" />
                      <span>Retirar Dinero</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/groups`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Grupos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/events`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Eventos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/marketplace`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      <span>Marketplace</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/analytics`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>Estadísticas</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/settings`)} className="cursor-pointer hover:bg-blue-800 focus:bg-blue-800 focus:text-white py-3">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configuración</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer hover:bg-red-900/50 focus:bg-red-900/50 text-red-400 focus:text-red-300 py-3">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              // Public Navigation
              <>
                <div className="hidden sm:flex">
                   <NavLink to="/" icon={Home} label="Inicio" />
                   <NavLink to="/explore" icon={Compass} label="Explorar" />
                </div>
                <Link to="/login">
                  <Button variant="ghost" className="text-blue-200 hover:text-white hover:bg-white/10 ml-2 rounded-xl">
                    <LogIn className="w-4 h-4 mr-2" /> Entrar
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white ml-2 rounded-xl shadow-lg shadow-blue-900/20">
                    Registrarse
                  </Button>
                </Link>
              </>
            )}

          </nav>
        </div>
        
        {/* Mobile Search Bar - Visible only on mobile */}
        <div className="md:hidden mt-3 pb-1">
            <SearchBar />
        </div>
      </div>
    </motion.header>
  );
};

const NavLink = ({ to, icon: Icon, badge }) => (
  <Link to={to}>
    <motion.div
      whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      whileTap={{ scale: 0.95 }}
      className="relative p-3 rounded-xl transition-all text-blue-300 hover:text-cyan-400"
    >
      <Icon className="w-6 h-6" />
      {badge > 0 && (
        <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-sm border border-slate-900">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </motion.div>
  </Link>
);

export default Header;