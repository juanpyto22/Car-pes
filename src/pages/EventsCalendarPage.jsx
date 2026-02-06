import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, MapPin, Clock, Users, 
  Trophy, Fish, CloudRain, Sun, Wind, Eye, Star, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const EventsCalendarPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'week', 'month', 'list'

  useEffect(() => {
    fetchEvents();
  }, [user, currentWeek]);

  const fetchEvents = async () => {
    if (!user?.id) return;

    try {
      // Fetch public events and events where user is participating
      const weekEnd = addDays(currentWeek, 6);
      
      const { data: eventsData, error } = await supabase
        .from('fishing_events')
        .select(`
          *,
          creator:users!creator_id(id, username, foto_perfil),
          participants:event_participants(
            user_id,
            status,
            user:users(username, foto_perfil)
          ),
          participant_count:event_participants(count)
        `)
        .gte('date', currentWeek.toISOString())
        .lte('date', weekEnd.toISOString())
        .order('date', { ascending: true });

      if (error) throw error;

      // Separate user's events from other events
      const userEvents = eventsData?.filter(event => 
        event.creator_id === user.id || 
        event.participants?.some(p => p.user_id === user.id)
      ) || [];
      
      const otherEvents = eventsData?.filter(event => 
        event.creator_id !== user.id && 
        !event.participants?.some(p => p.user_id === user.id)
      ) || [];

      setMyEvents(userEvents);
      setEvents([...userEvents, ...otherEvents]);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        variant: "destructive",
        title: "Error al cargar eventos"
      });
    } finally {
      setLoading(false);
    }
  };

  const joinEvent = async (eventId) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'attending'
        });

      if (error) throw error;

      toast({ title: "¡Te has apuntado al evento!" });
      fetchEvents();
    } catch (error) {
      console.error('Error joining event:', error);
      toast({
        variant: "destructive",
        title: "Error al apuntarse al evento"
      });
    }
  };

  const WeekView = () => {
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dayEvents = events.filter(event => 
            isSameDay(parseISO(event.date), day)
          );

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-slate-900/30 rounded-2xl p-4 min-h-40 ${
                isSameDay(day, selectedDate) 
                  ? 'border-2 border-cyan-500 bg-cyan-900/20' 
                  : 'border border-white/10'
              }`}
              onClick={() => setSelectedDate(day)}
            >
              <div className="text-center mb-3">
                <p className="text-xs text-blue-400 font-medium">
                  {format(day, 'EEE', { locale: es }).toUpperCase()}
                </p>
                <p className={`text-lg font-bold ${
                  isSameDay(day, new Date()) ? 'text-cyan-400' : 'text-white'
                }`}>
                  {format(day, 'd')}
                </p>
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div 
                    key={event.id}
                    className={`p-2 rounded-lg text-xs cursor-pointer transition-all hover:scale-102 ${
                      myEvents.some(me => me.id === event.id)
                        ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/30'
                        : 'bg-slate-800/50 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-300">
                        {format(parseISO(event.date), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-white font-medium line-clamp-2">
                      {event.title}
                    </p>
                  </div>
                ))}
                
                {dayEvents.length > 3 && (
                  <div className="text-xs text-blue-400 text-center pt-1">
                    +{dayEvents.length - 3} más
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const EventCard = ({ event, showJoinButton = false }) => {
    const isParticipating = event.participants?.some(p => p.user_id === user?.id);
    const isCreator = event.creator_id === user?.id;

    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-cyan-500/10 transition-all"
      >
        {/* Event Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-2 rounded-lg ${
                event.type === 'tournament' ? 'bg-yellow-500/20' :
                event.type === 'meetup' ? 'bg-green-500/20' :
                event.type === 'trip' ? 'bg-blue-500/20' :
                'bg-purple-500/20'
              }`}>
                {event.type === 'tournament' ? 
                  <Trophy className="w-5 h-5 text-yellow-400" /> :
                  event.type === 'meetup' ?
                  <Users className="w-5 h-5 text-green-400" /> :
                  <Fish className="w-5 h-5 text-blue-400" />
                }
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{event.title}</h3>
                <p className="text-blue-400 text-sm">{event.type === 'tournament' ? 'Torneo' : event.type === 'meetup' ? 'Encuentro' : 'Viaje'}</p>
              </div>
            </div>
          </div>

          {(isCreator || isParticipating) && (
            <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm">
                {isCreator ? 'Organizador' : 'Apuntado'}
              </span>
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 text-blue-200">
            <CalendarIcon className="w-4 h-4 text-cyan-400" />
            <span className="font-medium">
              {format(parseISO(event.date), 'EEEE, d MMMM yyyy', { locale: es })}
            </span>
          </div>

          <div className="flex items-center gap-3 text-blue-200">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{format(parseISO(event.date), 'HH:mm')} - {event.duration || '4 horas'}</span>
          </div>

          <div className="flex items-center gap-3 text-blue-200">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>{event.location || 'Ubicación por confirmar'}</span>
          </div>

          <div className="flex items-center gap-3 text-blue-200">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>{event.participant_count?.[0]?.count || 0}/{event.max_participants || '∞'} participantes</span>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-blue-200 text-sm leading-relaxed mb-4 line-clamp-3">
            {event.description}
          </p>
        )}

        {/* Creator */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-8 h-8">
            <AvatarImage src={event.creator?.foto_perfil} />
            <AvatarFallback className="text-xs">{event.creator?.username?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white text-sm font-medium">@{event.creator?.username}</p>
            <p className="text-blue-400 text-xs">Organizador</p>
          </div>
        </div>

        {/* Weather Info (mockup) */}
        <div className="bg-slate-800/30 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-sm">Soleado, 22°C</span>
            </div>
            <div className="flex items-center gap-2 text-blue-300 text-xs">
              <Wind className="w-3 h-3" />
              10 km/h
            </div>
          </div>
        </div>

        {/* Participants Preview */}
        {event.participants && event.participants.length > 0 && (
          <div className="mb-4">
            <p className="text-blue-300 text-sm mb-2">Participantes confirmados:</p>
            <div className="flex -space-x-2">
              {event.participants.slice(0, 5).map((participant, idx) => (
                <Avatar key={idx} className="w-8 h-8 border-2 border-slate-900">
                  <AvatarImage src={participant.user?.foto_perfil} />
                  <AvatarFallback className="text-xs">{participant.user?.username?.[0]}</AvatarFallback>
                </Avatar>
              ))}
              {event.participants.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center">
                  <span className="text-xs text-white">+{event.participants.length - 5}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {showJoinButton && !isParticipating && !isCreator && (
            <Button 
              className="flex-1 bg-cyan-600 hover:bg-cyan-500"
              onClick={() => joinEvent(event.id)}
            >
              <Users className="w-4 h-4 mr-2" />
              Apuntarse
            </Button>
          )}
          
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Ver Detalles
          </Button>
        </div>
      </motion.div>
    );
  };

  const CreateEventModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: '08:00',
      location: '',
      type: 'meetup',
      max_participants: '',
      duration: '4 horas'
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!user?.id) return;

      setSubmitting(true);
      try {
        const eventDate = new Date(`${formData.date}T${formData.time}`);
        
        const { error } = await supabase
          .from('fishing_events')
          .insert({
            ...formData,
            date: eventDate.toISOString(),
            creator_id: user.id,
            max_participants: formData.max_participants ? parseInt(formData.max_participants) : null
          });

        if (error) throw error;

        toast({ title: "¡Evento creado exitosamente!" });
        onClose();
        fetchEvents();
      } catch (error) {
        console.error('Error creating event:', error);
        toast({
          variant: "destructive",
          title: "Error al crear evento"
        });
      } finally {
        setSubmitting(false);
      }
    };

    if (!isOpen) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Crear Evento</h2>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Título del Evento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                  placeholder="Ej: Torneo de Carpfishing"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    Hora *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Tipo de Evento
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                >
                  <option value="meetup">Encuentro</option>
                  <option value="tournament">Torneo</option>
                  <option value="trip">Viaje de Pesca</option>
                  <option value="workshop">Taller</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Ubicación *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                  placeholder="Ej: Embalse de Santillana"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    Max Participantes
                  </label>
                  <input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({...formData, max_participants: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                    placeholder="Sin límite"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    Duración
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                    placeholder="Ej: 4 horas"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white resize-none"
                  rows={3}
                  placeholder="Describe tu evento..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                >
                  {submitting ? 'Creando...' : 'Crear Evento'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Eventos - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Calendario de Eventos</h1>
              <p className="text-blue-400">Organiza y únete a eventos de pesca</p>
            </div>
            
            <Button 
              onClick={() => setShowCreateEvent(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Evento
            </Button>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-6 bg-slate-900/30 rounded-2xl p-4">
            <Button 
              variant="outline" 
              onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
            >
              ← Semana Anterior
            </Button>
            
            <h2 className="text-xl font-bold text-white">
              {format(currentWeek, 'MMMM yyyy', { locale: es })}
            </h2>
            
            <Button 
              variant="outline"
              onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
            >
              Semana Siguiente →
            </Button>
          </div>

          {/* Calendar */}
          <div className="mb-8">
            <WeekView />
          </div>

          {/* Events for Selected Date */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              Eventos para {format(selectedDate, 'd MMMM', { locale: es })}
            </h2>
            
            {events.filter(event => isSameDay(parseISO(event.date), selectedDate)).length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {events
                  .filter(event => isSameDay(parseISO(event.date), selectedDate))
                  .map(event => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      showJoinButton={!myEvents.some(me => me.id === event.id)}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-white/10">
                <CalendarIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No hay eventos para este día</h3>
                <p className="text-blue-400 mb-6">
                  ¡Organiza el primer evento de pesca!
                </p>
                <Button 
                  onClick={() => setShowCreateEvent(true)}
                  className="bg-cyan-600 hover:bg-cyan-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Evento
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Create Event Modal */}
        <CreateEventModal 
          isOpen={showCreateEvent} 
          onClose={() => setShowCreateEvent(false)} 
        />
      </div>
    </>
  );
};

export default EventsCalendarPage;