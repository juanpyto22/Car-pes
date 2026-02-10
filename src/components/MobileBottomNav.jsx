import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, Heart, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotifications } from '@/hooks/useNotifications';
import { motion } from 'framer-motion';

const MobileBottomNav = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { unreadCount } = useNotifications(user ? profile : null);

  if (!user) return null;

  // Hide on story viewer and create story pages
  if (location.pathname.startsWith('/story/') || location.pathname === '/create-story') return null;

  const navItems = [
    { to: '/feed', icon: Home, label: 'Inicio' },
    { to: '/explore', icon: Search, label: 'Buscar' },
    { to: '/create-post', icon: PlusSquare, label: 'Crear' },
    { to: '/notifications', icon: Heart, label: 'Actividad', badge: unreadCount },
    { to: '/profile', icon: User, label: 'Perfil', isProfile: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to === '/profile' && location.pathname.startsWith('/profile'));
          
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center flex-1 h-full"
            >
              {item.isProfile ? (
                <div className={`rounded-full ${isActive ? 'ring-2 ring-white' : ''}`}>
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={profile?.foto_perfil} className="object-cover" />
                    <AvatarFallback className="bg-blue-900 text-cyan-200 text-xs">
                      {profile?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : item.to === '/create-post' ? (
                <div className="p-1 border-2 border-white/80 rounded-lg">
                  <item.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>
              ) : (
                <>
                  <item.icon
                    className={`w-6 h-6 transition-colors ${
                      isActive ? 'text-white' : 'text-gray-400'
                    }`}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    fill={isActive && item.to !== '/explore' ? 'currentColor' : 'none'}
                  />
                  {item.badge > 0 && (
                    <span className="absolute top-1 right-1/4 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
