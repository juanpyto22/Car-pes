import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Clock, Users, Plus, X, ChevronLeft, ChevronRight, Fish, Trophy, Anchor, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const EVENT_CATEGORIES = [
  { id: 'tournament', label: 'Torneo', icon: Trophy, color: 'yellow' },
  { id: 'meetup', label: 'Quedada', icon: Users, color: 'cyan' },
  { id: 'fishing', label: 'Jornada pesca', icon: Fish, color: 'blue' },
  { id: 'workshop', label: 'Taller', icon: Star, color: 'purple' },
  { id: 'other', label: 'Otro', icon: Anchor, color: 'green' },
];

const categoryColors = {
  tournament: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  meetup: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  fishing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  workshop: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  other: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const EventsCalendarPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [dbAvailable, setDbAvailable] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fishing_events')
        .select(`
          *,
          creator:profiles!fishing_events_creator_id_fkey(id, username, foto_perfil),
          participants:event_participants(
            user:profiles!event_participants_user_id_fkey(id, username, foto_perfil)
          )
        `)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.warn('fishing_events table not available, using local state:', err.message);
      setDbAvailable(false);
      // Load from localStorage fallback
      const stored = localStorage.getItem('carpes_events');
      if (stored) setEvents(JSON.parse(stored));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (eventData) => {
    try {
      if (dbAvailable) {
        const { data, error } = await supabase
          .from('fishing_events')
          .insert({
            title: eventData.title,
            description: eventData.description,
            event_date: eventData.date,
            location: eventData.location,
            category: eventData.category,
            max_participants: eventData.maxParticipants || null,
            creator_id: user.id,
          })
          .select(`
            *,
            creator:profiles!fishing_events_creator_id_fkey(id, username, foto_perfil)
          `)
          .single();

        if (error) throw error;

        // Auto-join
        await supabase.from('event_participants').insert({
          event_id: data.id,
          user_id: user.id,
        });

        data.participants = [{ user: { id: user.id, username: profile?.username, foto_perfil: profile?.foto_perfil }}];
        setEvents(prev => [...prev, data].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)));
      } else {
        // Local fallback
        const newEvent = {
          id: crypto.randomUUID(),
          ...eventData,
          event_date: eventData.date,
          creator_id: user?.id,
          creator: { id: user?.id, username: profile?.username || 'Tú', foto_perfil: profile?.foto_perfil },
          participants: [{ user: { id: user?.id, username: profile?.username || 'Tú', foto_perfil: profile?.foto_perfil }}],
          created_at: new Date().toISOString(),
        };
        const updated = [...events, newEvent].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
        setEvents(updated);
        localStorage.setItem('carpes_events', JSON.stringify(updated));
      }

      toast({ title: '¡Evento creado!' });
      setShowCreate(false);
    } catch (err) {
      console.error('Error creating event:', err);
      toast({ variant: 'destructive', title: 'Error al crear evento' });
    }
  };

  const handleJoinEvent = async (eventId) => {
    if (!user) return;
    try {
      if (dbAvailable) {
        const { error } = await supabase.from('event_participants').insert({
          event_id: eventId,
          user_id: user.id,
        });
        if (error) throw error;
      }
      setEvents(prev => prev.map(e => {
        if (e.id === eventId) {
          return {
            ...e,
            participants: [...(e.participants || []), { user: { id: user.id, username: profile?.username, foto_perfil: profile?.foto_perfil }}],
          };
        }
        return e;
      }));
      toast({ title: '¡Te has unido al evento!' });
    } catch (err) {
      console.error('Error joining event:', err);
    }
  };

  const handleLeaveEvent = async (eventId) => {
    if (!user) return;
    try {
      if (dbAvailable) {
        await supabase.from('event_participants').delete().eq('event_id', eventId).eq('user_id', user.id);
      }
      setEvents(prev => prev.map(e => {
        if (e.id === eventId) {
          return {
            ...e,
            participants: (e.participants || []).filter(p => p.user?.id !== user.id),
          };
        }
        return e;
      }));
    } catch (err) {
      console.error('Error leaving event:', err);
    }
  };

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startDow = getDay(start);
    // Pad with empty days for alignment
    const padded = Array(startDow === 0 ? 6 : startDow - 1).fill(null).concat(days);
    return padded;
  }, [currentMonth]);

  const eventsOnDate = (date) => {
    if (!date) return [];
    return events.filter(e => {
      try { return isSameDay(parseISO(e.event_date), date); } catch { return false; }
    });
  };

  const selectedDateEvents = selectedDate ? eventsOnDate(selectedDate) : [];

  const upcomingEvents = events.filter(e => {
    try { return new Date(e.event_date) >= new Date(); } catch { return false; }
  }).slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Eventos - Car-Pes</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-24">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Eventos</h1>
              <p className="text-blue-400 text-sm">Torneos, quedadas y jornadas de pesca</p>
            </div>
            <Button 
              onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" /> Crear
            </Button>
          </motion.div>

          {!dbAvailable && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 text-sm text-yellow-300">
              ⚠️ Base de datos no configurada. Los eventos se guardan localmente. Ejecuta <span className="font-mono bg-black/20 px-1 rounded">setup-chat-groups.sql</span> para persistir datos.
            </motion.div>
          )}

          <div className="grid md:grid-cols-[1fr_300px] gap-6">
            {/* Calendar */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-lg text-blue-400">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-white capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h3>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-lg text-blue-400">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                  <div key={d} className="text-center text-xs text-blue-500 font-semibold py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const dayEvents = eventsOnDate(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrent = isToday(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);

                  return (
                    <motion.button
                      key={day.toISOString()}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedDate(isSelected ? null : day)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all
                        ${isSelected 
                          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40' 
                          : isCurrent 
                            ? 'bg-blue-500/20 text-cyan-300 ring-1 ring-cyan-500/50' 
                            : isCurrentMonth 
                              ? 'text-white hover:bg-white/5' 
                              : 'text-blue-700 hover:bg-white/5'
                        }`}
                    >
                      {format(day, 'd')}
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((e, j) => (
                            <div key={j} className={`w-1.5 h-1.5 rounded-full ${
                              e.category === 'tournament' ? 'bg-yellow-400' :
                              e.category === 'meetup' ? 'bg-cyan-400' :
                              e.category === 'fishing' ? 'bg-blue-400' :
                              e.category === 'workshop' ? 'bg-purple-400' : 'bg-green-400'
                            }`} />
                          ))}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Selected Date Events */}
              <AnimatePresence>
                {selectedDate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-sm font-semibold text-cyan-400 mb-3 capitalize">
                        {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                      </p>
                      {selectedDateEvents.length > 0 ? (
                        <div className="space-y-2">
                          {selectedDateEvents.map(event => (
                            <EventCard key={event.id} event={event} user={user} onJoin={handleJoinEvent} onLeave={handleLeaveEvent} compact />
                          ))}
                        </div>
                      ) : (
                        <p className="text-blue-500 text-sm text-center py-3">No hay eventos este día</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Upcoming Events Sidebar */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <h3 className="text-lg font-bold text-white mb-3">Próximos Eventos</h3>
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <EventCard event={event} user={user} onJoin={handleJoinEvent} onLeave={handleLeaveEvent} />
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 bg-slate-900/30 rounded-2xl border border-white/10">
                  <Calendar className="w-10 h-10 text-cyan-500/30 mx-auto mb-3" />
                  <p className="text-sm text-blue-400">No hay eventos próximos</p>
                  <p className="text-xs text-blue-600 mt-1">¡Crea el primero!</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreate && (
            <CreateEventModal
              onClose={() => setShowCreate(false)}
              onCreate={handleCreateEvent}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

// ─── Event Card ────────────────────────────────────────────
const EventCard = ({ event, user, onJoin, onLeave, compact = false }) => {
  const isJoined = user && (event.participants || []).some(p => p.user?.id === user.id);
  const isCreator = user && event.creator_id === user.id;
  const cat = EVENT_CATEGORIES.find(c => c.id === event.category) || EVENT_CATEGORIES[4];
  const CatIcon = cat.icon;
  const participantCount = (event.participants || []).length;

  let dateStr = '';
  try { dateStr = format(parseISO(event.event_date), "d MMM · HH:mm", { locale: es }); } catch { dateStr = event.event_date; }

  return (
    <div className={`bg-slate-900/50 border border-white/10 rounded-xl ${compact ? 'p-3' : 'p-4'} hover:border-cyan-500/20 transition-all`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${compact ? 'w-8 h-8' : ''} rounded-xl flex items-center justify-center border ${categoryColors[event.category] || categoryColors.other} shrink-0`}>
          <CatIcon className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-white truncate ${compact ? 'text-sm' : ''}`}>{event.title}</h4>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="flex items-center gap-1 text-xs text-blue-400">
              <Clock className="w-3 h-3" /> {dateStr}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 text-xs text-blue-400">
                <MapPin className="w-3 h-3" /> {event.location}
              </span>
            )}
          </div>
          {!compact && event.description && (
            <p className="text-xs text-blue-400 mt-1.5 line-clamp-2">{event.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-500" />
              <span className="text-xs text-cyan-400">{participantCount}</span>
              {event.max_participants && (
                <span className="text-xs text-blue-600">/ {event.max_participants}</span>
              )}
            </div>
            {!isCreator && (
              <Button
                size="sm"
                onClick={() => isJoined ? onLeave(event.id) : onJoin(event.id)}
                className={`h-7 text-xs rounded-lg ${
                  isJoined 
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                    : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30'
                }`}
                variant="ghost"
              >
                {isJoined ? 'Salir' : 'Unirme'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Create Event Modal ────────────────────────────────────
const CreateEventModal = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('fishing');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !date) return;
    setCreating(true);
    await onCreate({ title, description, date, location, category, maxParticipants: maxParticipants ? parseInt(maxParticipants) : null });
    setCreating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-slate-900 border border-white/10 rounded-t-3xl md:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Nuevo Evento</h2>
          <button onClick={onClose} className="text-blue-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-blue-200 mb-1 block">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Torneo de Black Bass..." maxLength={80}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white placeholder-blue-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-blue-200 mb-1 block">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles del evento..." rows={3} maxLength={500}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white placeholder-blue-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-blue-200 mb-1 block">Fecha y hora *</label>
              <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-blue-200 mb-1 block">Ubicación</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Embalse de..."
                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white placeholder-blue-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-blue-200 mb-2 block">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      category === cat.id
                        ? categoryColors[cat.id]
                        : 'border-white/10 text-blue-400 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {cat.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm text-blue-200 mb-1 block">Máx. participantes (opcional)</label>
            <input type="number" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} placeholder="Sin límite" min={2}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white placeholder-blue-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="p-5 border-t border-white/10">
          <Button
            onClick={handleSubmit}
            disabled={creating || !title.trim() || !date}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl h-12 font-semibold disabled:opacity-50"
          >
            {creating ? 'Creando...' : '🎣 Crear Evento'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EventsCalendarPage;
