import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationItem = ({ notification, onDelete, onRead }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'like': return <Heart className="w-3.5 h-3.5 text-red-400 fill-current" />;
      case 'comment': return <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />;
      case 'follow': return <UserPlus className="w-3.5 h-3.5 text-green-400" />;
      default: return <div className="w-3.5 h-3.5 bg-gray-400 rounded-full" />;
    }
  };

  const getLink = () => {
    if (notification.type === 'follow') return `/profile/${notification.related_user_id}`;
    if (notification.post_id) return `/post/${notification.post_id}`;
    return '#';
  };

  const getContent = () => {
    switch (notification.type) {
      case 'like': return 'le gustó tu publicación';
      case 'comment': return 'comentó en tu publicación';
      case 'follow': return 'comenzó a seguirte';
      default: return 'interactuó contigo';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`relative group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
        notification.read 
          ? 'bg-slate-900/40 border-transparent hover:bg-slate-900/60' 
          : 'bg-blue-900/10 border-cyan-500/20 hover:bg-blue-900/20'
      }`}
      onClick={() => !notification.read && onRead(notification.id)}
    >
      <div className="absolute top-1/2 -translate-y-1/2 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
          className="h-8 w-8 text-blue-400 hover:text-red-400 hover:bg-red-950/30 rounded-full"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative shrink-0">
        <Link to={`/profile/${notification.related_user_id}`}>
          <Avatar className="w-12 h-12 border border-blue-800">
            <AvatarImage src={notification.related_user?.foto_perfil} />
            <AvatarFallback className="bg-blue-900 text-cyan-200 font-bold">{notification.related_user?.username?.[0]}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1.5 border border-blue-800 flex items-center justify-center">
          {getIcon()}
        </div>
      </div>

      <Link to={getLink()} className="flex-1 min-w-0 pr-8">
        <div className="flex flex-col">
          <p className="text-sm text-blue-100">
            <span className="font-bold text-white mr-1 hover:underline">
                {notification.related_user?.username}
            </span>
            {getContent()}
          </p>
          <span className="text-xs text-blue-400 mt-1 font-medium">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
          </span>
        </div>
      </Link>

      {!notification.read && (
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/50 shrink-0" />
      )}
    </motion.div>
  );
};

export default NotificationItem;