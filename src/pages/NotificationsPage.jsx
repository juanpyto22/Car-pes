import React from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationItem from '@/components/NotificationItem';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';

const NotificationsPage = () => {
  const { user } = useAuth();
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    acceptFollowRequest,
    rejectFollowRequest 
  } = useNotifications(user);

  return (
    <>
      <Helmet><title>Notificaciones - Car-Pes</title></Helmet>
      <div className="min-h-screen bg-slate-950 pb-20 pt-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              Notificaciones
            </h1>
            {notifications.length > 0 && (
              <Button 
                  variant="outline" 
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-xl"
              >
                <CheckCheck className="w-4 h-4 mr-2" /> Marcar leídas
              </Button>
            )}
          </div>

          {loading ? (
             <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-slate-900/50 rounded-xl animate-pulse border border-white/5" />
                ))}
             </div>
          ) : notifications.length === 0 ? (
             <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-white/5 border-dashed">
                <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-blue-500/50" />
                </div>
                <h3 className="text-white font-bold mb-2">Sin notificaciones</h3>
                <p className="text-blue-400 text-sm">Te avisaremos cuando haya actividad.</p>
             </div>
          ) : (
             <div className="space-y-3">
               <AnimatePresence>
                 {notifications.map(notification => (
                   <NotificationItem
                     key={notification.id}
                     notification={notification}
                     onRead={markAsRead}
                     onDelete={deleteNotification}
                     onAcceptFollow={acceptFollowRequest}
                     onRejectFollow={rejectFollowRequest}
                   />
                 ))}
               </AnimatePresence>
             </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsPage;