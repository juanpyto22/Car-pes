import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, Heart, User, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotifications } from '@/hooks/useNotifications';
import { useMessages } from '@/hooks/useMessages';
import { motion } from 'framer-motion';

const MobileBottomNav = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { unreadCount } = useNotifications(user ? profile : null);
  const { unreadCount: msgCount } = useMessages(user ? profile : null);

  if (!user) return null;
  if (location.pathname.startsWith('/story/') || location.pathname === '/create-story') return null;

  const navItems = [
    { to: '/feed', icon: Home, label: 'Inicio' },
    { to: '/explore', icon: Search, label: 'Buscar' },
    { to: '/create-post', icon: PlusSquare, label: 'Crear', isCreate: true },
    { to: '/messages', icon: MessageCircle, label: 'Mensajes', badge: msgCount },
    { to: '/notifications', icon: Heart, label: 'Actividad', badge: unreadCount },
    { to: '/profile', icon: User, label: 'Perfil', isProfile: true },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl border-t border-white/[0.08]" />
      
      <div className="relative flex items-center justify-around h-16 px-1 safe-area-bottom">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to === '/profile' && location.pathname.startsWith('/profile'));
          
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center flex-1 h-full group"
            >
              {/* Active indicator dot */}
              {isActive && !item.isCreate && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-[1px] w-6 h-[3px] bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              {item.isProfile ? (
                <motion.div 
                  whileTap={{ scale: 0.85 }}
                  className={`rounded-full transition-all duration-200 ${isActive ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : ''}`}
                >
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={profile?.foto_perfil} className="object-cover" />
                    <AvatarFallback className="bg-blue-900 text-cyan-200 text-xs font-bold">
                      {profile?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
              ) : item.isCreate ? (
                <motion.div 
                  whileTap={{ scale: 0.8, rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  className="p-1.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/25"
                >
                  <item.icon className="w-5 h-5 text-white" strokeWidth={2} />
                </motion.div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  className="relative flex flex-col items-center"
                >
                  <item.icon
                    className={`w-6 h-6 transition-all duration-200 ${
                      isActive ? 'text-white scale-110' : 'text-gray-500'
                    }`}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    fill={isActive && (item.to === '/feed' || item.to === '/notifications') ? 'currentColor' : 'none'}
                  />
                  
                  {/* Badge */}
                  {item.badge > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center px-1"
                    >
                      <span className="text-[9px] font-bold text-white leading-none">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    </motion.span>
                  )}
                  
                  {/* Label */}
                  <span className={`text-[10px] mt-0.5 transition-colors duration-200 ${
                    isActive ? 'text-white font-semibold' : 'text-gray-600'
                  }`}>
                    {item.label}
                  </span>
                </motion.div>
              )}
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default MobileBottomNav;
