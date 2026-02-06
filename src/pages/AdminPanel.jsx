import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, Ban, BarChart3, Search, Plus } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import {
  useAdminInfractions,
  useAdminActiveBans,
  useAdminBanUser,
  useAdminStatistics,
} from '../hooks/useAdminPanel';
import {
  StatCard,
  InfractionRow,
  BanRow,
  AdminTableFilters,
  ManualBanModal,
  EmptyState,
} from '../components/AdminPanelComponents';

export default function AdminPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [showManualBanModal, setShowManualBanModal] = useState(false);

  // Parar hooks según lo que necesitemos
  const { stats, loading: statsLoading, refetch: refetchStats } = useAdminStatistics();
  const { infractions, loading: infraLoading, deleteInfraction } = useAdminInfractions();
  const { bans, loading: bansLoading, liftBan } = useAdminActiveBans();
  const { banUser, loading: banUserLoading } = useAdminBanUser();

  // Filtrar y buscar infractions
  const filteredInfractions = useMemo(() => {
    return infractions?.filter((infr) => {
      const searchLower = searchTerm.toLowerCase();
      const matches =
        infr.username?.toLowerCase().includes(searchLower) ||
        infr.email?.toLowerCase().includes(searchLower) ||
        infr.violation_type?.toLowerCase().includes(searchLower);
      return matches;
    }) || [];
  }, [infractions, searchTerm]);

  // Filtrar y buscar bans
  const filteredBans = useMemo(() => {
    let filtered = bans || [];

    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter((ban) => ban.ban_type === filterType);
    }

    // Buscar
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (ban) =>
        ban.username?.toLowerCase().includes(searchLower) ||
        ban.email?.toLowerCase().includes(searchLower)
    );

    return filtered;
  }, [bans, searchTerm, filterType]);

  // Handlers
  const handleDeleteInfraction = async (infractionId) => {
    if (window.confirm('¿Eliminar esta infracción?')) {
      try {
        await deleteInfraction(infractionId);
        toast({
          title: 'Infracción eliminada',
          description: 'La infracción ha sido removida del registro.',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleLiftBan = async (banId) => {
    if (window.confirm('¿Estás seguro de que deseas levantar este ban?')) {
      try {
        await liftBan(banId);
        toast({
          title: 'Ban levantado',
          description: 'El usuario ya puede publicar nuevamente.',
        });
        refetchStats();
      } catch (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleManualBan = async (userId, banType, reason) => {
    try {
      await banUser(userId, banType, reason);
      toast({
        title: 'Usuario baneado',
        description: `@${selectedUserName} ha sido baneado exitosamente.`,
      });
      setShowManualBanModal(false);
      setSelectedUserId(null);
      setSelectedUserName('');
      refetchStats();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Navegar a formulario de ban manual
  const openBanModal = (userId, username) => {
    setSelectedUserId(userId);
    setSelectedUserName(username);
    setShowManualBanModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-blue-400" />
            Panel de Administración
          </h1>
          <p className="text-white/60 mt-2">Gestiona infracciones, bans y estadísticas de la plataforma</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Estadísticas */}
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Estadísticas Generales</h2>

            {statsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Users}
                  label="Total de Usuarios"
                  value={stats?.total_users || 0}
                  color="cyan"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Total Infracciones"
                  value={stats?.total_infractions || 0}
                  color="orange"
                />
                <StatCard
                  icon={Ban}
                  label="Bans Activos"
                  value={stats?.active_bans || 0}
                  color="red"
                />
                <StatCard
                  icon={Ban}
                  label="Bans Permanentes"
                  value={stats?.permanent_bans || 0}
                  color="red"
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Pestañas */}
        <div className="mb-8 border-b border-white/10 flex gap-2 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'bans', label: 'Bans Activos', icon: Ban },
            { id: 'infractions', label: 'Infracciones', icon: AlertTriangle },
            { id: 'manual-ban', label: 'Banear Manual', icon: Plus },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Contenido de Pestañas */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Tab: Bans Activos */}
          {activeTab === 'bans' && (
            <div>
              <AdminTableFilters
                search={searchTerm}
                setSearch={setSearchTerm}
                filterType={filterType}
                setFilterType={setFilterType}
              />

              {bansLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              ) : filteredBans.length > 0 ? (
                <div className="space-y-4">
                  {filteredBans.map((ban) => (
                    <BanRow
                      key={ban.id}
                      ban={ban}
                      onLift={handleLiftBan}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Ban}
                  title="Sin bans activos"
                  description="No hay usuarios baneados en este momento"
                />
              )}
            </div>
          )}

          {/* Tab: Infracciones */}
          {activeTab === 'infractions' && (
            <div>
              <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg border border-white/10 mb-4">
                <Search className="w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar usuario, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none"
                />
              </div>

              {infraLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              ) : filteredInfractions.length > 0 ? (
                <div className="space-y-4">
                  {filteredInfractions.map((infraction) => (
                    <InfractionRow
                      key={infraction.id}
                      infraction={infraction}
                      onDelete={handleDeleteInfraction}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={AlertTriangle}
                  title="Sin infracciones"
                  description="No hay infracciones registradas"
                />
              )}
            </div>
          )}

          {/* Tab: Banear Manual */}
          {activeTab === 'manual-ban' && (
            <div className="space-y-6">
              <p className="text-white/60">
                Busca un usuario y selecciona su cuenta para aplicarle un ban manual.
              </p>

              <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg border border-white/10 mb-6">
                <Search className="w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none"
                />
              </div>

              {infraLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Mostrar usuarios únicos con infracciones */}
                  {infractions
                    ?.filter((infr) => {
                      const searchLower = searchTerm.toLowerCase();
                      return (
                        infr.username?.toLowerCase().includes(searchLower) ||
                        infr.email?.toLowerCase().includes(searchLower)
                      );
                    })
                    .reduce((unique, infr) => {
                      if (!unique.find((u) => u.user_id === infr.user_id)) {
                        unique.push(infr);
                      }
                      return unique;
                    }, [])
                    .map((infr) => (
                      <motion.button
                        key={infr.user_id}
                        onClick={() => openBanModal(infr.user_id, infr.username)}
                        className="w-full text-left p-4 bg-slate-800/30 border border-white/10 hover:border-cyan-500/50 rounded-lg transition group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-white group-hover:text-cyan-400 transition">
                              @{infr.username}
                            </p>
                            <p className="text-sm text-white/60">{infr.email}</p>
                            <p className="text-xs text-white/40 mt-1">
                              {infr.infraction_count || 1} infracción(es)
                            </p>
                          </div>
                          <Plus className="w-5 h-5 text-white/40 group-hover:text-cyan-400 transition" />
                        </div>
                      </motion.button>
                    ))}

                  {searchTerm &&
                    infractions?.filter((infr) => {
                      const searchLower = searchTerm.toLowerCase();
                      return (
                        infr.username?.toLowerCase().includes(searchLower) ||
                        infr.email?.toLowerCase().includes(searchLower)
                      );
                    }).length === 0 && (
                      <EmptyState
                        icon={Search}
                        title="Usuario no encontrado"
                        description="No hay usuarios con infracciones que coincidan con la búsqueda"
                      />
                    )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal de Ban Manual */}
      <ManualBanModal
        isOpen={showManualBanModal}
        onClose={() => setShowManualBanModal(false)}
        userId={selectedUserId}
        username={selectedUserName}
        onBan={handleManualBan}
        loading={banUserLoading}
      />
    </div>
  );
}
