import React, { useMemo, useState } from 'react';
import {
  Shield,
  Search,
  Ban,
  CheckCircle2,
  XCircle,
  Clock3,
  Building2,
  TerminalSquare,
  Siren,
  MessageSquareWarning,
  User,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import {
  useAdminBanUser,
  useAdminActiveBans,
  useAdminBanAppeals,
  useAdminProRequests,
  useAdminReviewBanAppeal,
  useAdminReviewProRequest,
  useSearchUsers,
} from '@/hooks/useAdminPanel';
import { ManualBanModal, EmptyState } from '@/components/AdminPanelComponents';

export default function AdminPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('ban');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [showManualBanModal, setShowManualBanModal] = useState(false);

  const [statusFilter, setStatusFilter] = useState('pending');
  const [appealStatusFilter, setAppealStatusFilter] = useState('pending');
  const [reviewNotes, setReviewNotes] = useState({});
  const [appealNotes, setAppealNotes] = useState({});

  const { users: searchResults, loading: searchLoading } = useSearchUsers(searchTerm);
  const { banUser, loading: banUserLoading } = useAdminBanUser();
  const { bans: activeBans, loading: activeBansLoading, liftBan, fetchBans } = useAdminActiveBans();

  const {
    requests: proRequests,
    loading: proLoading,
    refetch: refetchProRequests,
  } = useAdminProRequests(statusFilter);

  const {
    appeals: banAppeals,
    loading: appealsLoading,
    refetch: refetchBanAppeals,
  } = useAdminBanAppeals(appealStatusFilter);

  const { reviewRequest, loading: reviewLoading } = useAdminReviewProRequest();
  const { reviewAppeal, loading: reviewAppealLoading } = useAdminReviewBanAppeal();

  const filteredUsers = useMemo(() => searchResults || [], [searchResults]);

  const openBanModal = (userId, username) => {
    setSelectedUserId(userId);
    setSelectedUserName(username);
    setShowManualBanModal(true);
  };

  const handleManualBan = async (userId, banType, reason) => {
    const result = await banUser(userId, banType, reason);

    if (result?.success) {
      toast({
        title: 'Usuario baneado',
        description: `Se aplico un ban a @${selectedUserName}.`,
      });
      setShowManualBanModal(false);
      setSelectedUserId(null);
      setSelectedUserName('');
      return;
    }

    toast({
      title: 'Error al banear',
      description: result?.error || 'No se pudo aplicar el ban.',
      variant: 'destructive',
    });
  };

  const handleReview = async (requestId, status) => {
    const reason = reviewNotes[requestId] || '';

    if (!reason.trim()) {
      toast({
        title: 'Motivo requerido',
        description: 'Escribe el motivo para notificar al usuario.',
        variant: 'destructive',
      });
      return;
    }

    const result = await reviewRequest({ requestId, status, reason });

    if (result.success) {
      toast({
        title: status === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada',
        description: 'La decision y el motivo se guardaron y se notifico al usuario.',
      });
      refetchProRequests();
      return;
    }

    toast({
      title: 'Error al revisar solicitud',
      description: result.error || 'No se pudo guardar la decision.',
      variant: 'destructive',
    });
  };

  const handleAppealReview = async (appealId, status) => {
    const response = appealNotes[appealId] || '';

    if (!response.trim()) {
      toast({
        title: 'Respuesta requerida',
        description: 'Debes indicar el motivo que recibira el usuario.',
        variant: 'destructive',
      });
      return;
    }

    const result = await reviewAppeal({
      appealId,
      status,
      adminResponse: response,
    });

    if (result.success) {
      toast({
        title: status === 'approved' ? 'Apelacion aprobada' : 'Apelacion rechazada',
        description: 'Se guardo la decision y se notifico al usuario.',
      });
      refetchBanAppeals();
      return;
    }

    toast({
      title: 'Error al revisar apelacion',
      description: result.error || 'No se pudo guardar la decision.',
      variant: 'destructive',
    });
  };

  const statusBadge = (status) => {
    if (status === 'approved') {
      return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
    }
    if (status === 'rejected') {
      return 'text-red-300 border-red-500/30 bg-red-500/10';
    }
    return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030b07] text-[#d8ffe7] font-mono">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,#10b98122_1px,transparent_1px),linear-gradient(to_bottom,#10b98122_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background:repeating-linear-gradient(180deg,#86efac33_0px,#86efac33_1px,transparent_2px,transparent_4px)]" />

      <div className="sticky top-0 z-40 border-b border-emerald-500/20 bg-[#04110a]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] tracking-widest uppercase text-emerald-300">
            <TerminalSquare className="w-3.5 h-3.5" />
            root access
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-[0.15em] text-emerald-300 flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            ADMIN CONTROL NODE
          </h1>
          <p className="text-emerald-100/70 mt-2">Ban manual, revision Pro y respuesta a apelaciones de baneo.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex gap-2 overflow-x-auto rounded-xl border border-emerald-500/20 bg-[#07160e] p-2">
          <button
            onClick={() => setActiveTab('ban')}
            className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 whitespace-nowrap text-sm ${
              activeTab === 'ban'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-emerald-100/60 hover:text-emerald-100 border border-transparent'
            }`}
          >
            <Siren className="w-4 h-4" /> Banear usuarios
          </button>
          <button
            onClick={() => setActiveTab('pro')}
            className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 whitespace-nowrap text-sm ${
              activeTab === 'pro'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-emerald-100/60 hover:text-emerald-100 border border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4" /> Solicitudes Pro
          </button>
          <button
            onClick={() => setActiveTab('appeals')}
            className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 whitespace-nowrap text-sm ${
              activeTab === 'appeals'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-emerald-100/60 hover:text-emerald-100 border border-transparent'
            }`}
          >
            <MessageSquareWarning className="w-4 h-4" /> Apelaciones de ban
          </button>
          <button
            onClick={() => setActiveTab('banned-users')}
            className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 whitespace-nowrap text-sm ${
              activeTab === 'banned-users'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-emerald-100/60 hover:text-emerald-100 border border-transparent'
            }`}
          >
            <Ban className="w-4 h-4" /> Usuarios baneados
          </button>
        </div>

        {activeTab === 'ban' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <p className="text-emerald-100/80">Busca cualquier usuario y aplica el tipo de ban con su motivo.</p>

            <div className="flex items-center gap-3 p-4 bg-[#07160e] rounded-lg border border-emerald-500/20">
              <Search className="w-5 h-5 text-emerald-300/60" />
              <input
                type="text"
                placeholder="Buscar por username o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-emerald-100 placeholder-emerald-200/30 focus:outline-none"
              />
            </div>

            {searchLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => openBanModal(user.id, user.username)}
                    className="w-full text-left p-4 bg-[#07160e] border border-emerald-500/20 hover:border-emerald-400/50 rounded-lg transition"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-emerald-200 inline-flex items-center gap-2">
                          <User className="w-4 h-4" /> @{user.username}
                        </p>
                        <p className="text-sm text-emerald-100/60">{user.email || 'sin email visible'}</p>
                      </div>
                      <span className="text-red-300 text-sm">Bloquear</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchTerm ? (
              <EmptyState
                icon={Search}
                title="Usuario no encontrado"
                description="No hay usuarios que coincidan con la busqueda."
              />
            ) : (
              <EmptyState
                icon={Ban}
                title="Busqueda vacia"
                description="Escribe un usuario para aplicar ban manual."
              />
            )}
          </motion.div>
        )}

        {activeTab === 'pro' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'pending', label: 'Pendientes', icon: Clock3 },
                { id: 'approved', label: 'Aprobadas', icon: CheckCircle2 },
                { id: 'rejected', label: 'Rechazadas', icon: XCircle },
                { id: 'all', label: 'Todas', icon: Building2 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setStatusFilter(id)}
                  className={`px-3 py-2 rounded-lg text-sm border transition inline-flex items-center gap-1.5 ${
                    statusFilter === id
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                      : 'bg-[#07160e] border-emerald-500/20 text-emerald-100/70 hover:text-emerald-100'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {proLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              </div>
            ) : proRequests.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="Sin solicitudes"
                description="No hay solicitudes Pro para este filtro."
              />
            ) : (
              <div className="space-y-4">
                {proRequests.map((req) => (
                  <div key={req.id} className="rounded-xl border border-emerald-500/20 bg-[#07160e] p-4 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-emerald-200 font-semibold">@{req.user?.username || 'usuario'}</p>
                        <p className="text-emerald-100/60 text-sm">{req.user?.email || 'email no disponible'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${statusBadge(req.status)}`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <p className="text-emerald-100/80"><span className="text-emerald-300/60">Negocio:</span> {req.business_name}</p>
                      <p className="text-emerald-100/80"><span className="text-emerald-300/60">Tipo:</span> {req.business_type}</p>
                      <p className="text-emerald-100/80"><span className="text-emerald-300/60">Razon social:</span> {req.legal_name}</p>
                      <p className="text-emerald-100/80"><span className="text-emerald-300/60">CIF/NIF:</span> {req.tax_id}</p>
                      <p className="text-emerald-100/80"><span className="text-emerald-300/60">Telefono:</span> {req.contact_phone}</p>
                      <p className="text-emerald-100/80"><span className="text-emerald-300/60">Web:</span> {req.website}</p>
                      <p className="text-emerald-100/80 md:col-span-2"><span className="text-emerald-300/60">Direccion:</span> {req.business_address}</p>
                      {req.docs_url && (
                        <p className="text-emerald-300 md:col-span-2">
                          <a href={req.docs_url} target="_blank" rel="noreferrer" className="hover:underline">Ver documento</a>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-emerald-100/60">Motivo para el usuario (aprobacion o rechazo)</label>
                      <textarea
                        rows={3}
                        value={reviewNotes[req.id] ?? req.validation_notes ?? ''}
                        onChange={(e) => setReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Ej: Documentacion validada correctamente / Falta documentacion fiscal"
                        className="w-full bg-[#030b07] border border-emerald-500/20 rounded-lg p-3 text-sm text-emerald-100 placeholder-emerald-100/30"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleReview(req.id, 'approved')}
                        disabled={reviewLoading}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleReview(req.id, 'rejected')}
                        disabled={reviewLoading}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-medium"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'appeals' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'pending', label: 'Pendientes', icon: Clock3 },
                { id: 'approved', label: 'Aprobadas', icon: CheckCircle2 },
                { id: 'rejected', label: 'Rechazadas', icon: XCircle },
                { id: 'all', label: 'Todas', icon: MessageSquareWarning },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setAppealStatusFilter(id)}
                  className={`px-3 py-2 rounded-lg text-sm border transition inline-flex items-center gap-1.5 ${
                    appealStatusFilter === id
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                      : 'bg-[#07160e] border-emerald-500/20 text-emerald-100/70 hover:text-emerald-100'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {appealsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              </div>
            ) : banAppeals.length === 0 ? (
              <EmptyState
                icon={MessageSquareWarning}
                title="Sin apelaciones"
                description="No hay apelaciones para este filtro."
              />
            ) : (
              <div className="space-y-4">
                {banAppeals.map((appeal) => (
                  <div key={appeal.id} className="rounded-xl border border-emerald-500/20 bg-[#07160e] p-4 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-emerald-200 font-semibold">@{appeal.user?.username || 'usuario'}</p>
                        <p className="text-emerald-100/60 text-sm">{appeal.user?.email || 'email no disponible'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${statusBadge(appeal.status)}`}>
                        {appeal.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="text-emerald-100/80"><span className="text-emerald-300/60">Tipo de ban:</span> {appeal.ban_type || 'no informado'}</p>
                      <p className="text-emerald-100/80"><span className="text-emerald-300/60">Motivo original:</span> {appeal.ban_reason || 'sin motivo registrado'}</p>
                      <p className="text-emerald-100/80"><span className="text-emerald-300/60">Texto del usuario:</span> {appeal.appeal_text}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-emerald-100/60">Respuesta para el usuario</label>
                      <textarea
                        rows={3}
                        value={appealNotes[appeal.id] ?? appeal.admin_response ?? ''}
                        onChange={(e) => setAppealNotes((prev) => ({ ...prev, [appeal.id]: e.target.value }))}
                        placeholder="Ej: Se levanta el ban tras revisar contexto / Se mantiene por incumplimiento reiterado"
                        className="w-full bg-[#030b07] border border-emerald-500/20 rounded-lg p-3 text-sm text-emerald-100 placeholder-emerald-100/30"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleAppealReview(appeal.id, 'approved')}
                        disabled={reviewAppealLoading}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium"
                      >
                        Aprobar apelacion
                      </button>
                      <button
                        onClick={() => handleAppealReview(appeal.id, 'rejected')}
                        disabled={reviewAppealLoading}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-medium"
                      >
                        Rechazar apelacion
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'banned-users' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {activeBansLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              </div>
            ) : (activeBans || []).length === 0 ? (
              <EmptyState
                icon={Ban}
                title="Sin baneos activos"
                description="No hay usuarios baneados en este momento."
              />
            ) : (
              <div className="space-y-3">
                {(activeBans || []).map((ban) => (
                  <div key={ban.id} className="rounded-xl border border-emerald-500/20 bg-[#07160e] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-emerald-200 font-semibold">@{ban.username || 'usuario'}</p>
                        <p className="text-emerald-100/60 text-sm">{ban.email || 'email no disponible'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${statusBadge(ban.ban_type === 'permanent' ? 'rejected' : 'pending')}`}>
                        {ban.ban_type || 'ban'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-emerald-100/80">
                      <p><span className="text-emerald-300/60">Motivo:</span> {ban.reason || 'sin motivo'}</p>
                      <p><span className="text-emerald-300/60">Infracciones:</span> {ban.infraction_count ?? '-'}</p>
                      <p><span className="text-emerald-300/60">Restante:</span> {ban.time_remaining_text || 'permanente'}</p>
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={async () => {
                          const result = await liftBan(ban.id);
                          if (result?.success) {
                            toast({ title: 'Ban levantado', description: 'El usuario ya puede volver a iniciar sesión.' });
                            fetchBans();
                          } else {
                            toast({ title: 'Error', description: result?.error || 'No se pudo levantar el ban.', variant: 'destructive' });
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
                      >
                        Levantar ban
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

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
