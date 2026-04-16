import React, { useMemo, useState } from 'react';
import { Shield, Search, Ban, CheckCircle2, XCircle, Clock3, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import {
  useAdminBanUser,
  useAdminProRequests,
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
  const [reviewNotes, setReviewNotes] = useState({});

  const { users: searchResults, loading: searchLoading } = useSearchUsers(searchTerm);
  const { banUser, loading: banUserLoading } = useAdminBanUser();

  const {
    requests: proRequests,
    loading: proLoading,
    refetch: refetchProRequests,
  } = useAdminProRequests(statusFilter);

  const { reviewRequest, loading: reviewLoading } = useAdminReviewProRequest();

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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950">
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            Panel Admin (Simple)
          </h1>
          <p className="text-white/60 mt-2">Ban manual y revision de solicitudes Pro.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 border-b border-white/10 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ban')}
            className={`px-4 py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ban'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Ban className="w-4 h-4" /> Banear usuarios
          </button>
          <button
            onClick={() => setActiveTab('pro')}
            className={`px-4 py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pro'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" /> Solicitudes Pro
          </button>
        </div>

        {activeTab === 'ban' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <p className="text-white/70">Busca cualquier usuario y aplica el tipo de ban con su motivo.</p>

            <div className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-lg border border-white/10">
              <Search className="w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Buscar por username o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none"
              />
            </div>

            {searchLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => openBanModal(user.id, user.username)}
                    className="w-full text-left p-4 bg-slate-800/30 border border-white/10 hover:border-cyan-500/50 rounded-lg transition"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">@{user.username}</p>
                        <p className="text-sm text-white/60">{user.email || 'sin email visible'}</p>
                      </div>
                      <span className="text-red-300 text-sm">Banear</span>
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
                      ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-200'
                      : 'bg-slate-800/40 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {proLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
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
                  <div key={req.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-semibold">@{req.user?.username || 'usuario'}</p>
                        <p className="text-white/60 text-sm">{req.user?.email || 'email no disponible'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${statusBadge(req.status)}`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <p className="text-white/80"><span className="text-white/50">Negocio:</span> {req.business_name}</p>
                      <p className="text-white/80"><span className="text-white/50">Tipo:</span> {req.business_type}</p>
                      <p className="text-white/80"><span className="text-white/50">Razon social:</span> {req.legal_name}</p>
                      <p className="text-white/80"><span className="text-white/50">CIF/NIF:</span> {req.tax_id}</p>
                      <p className="text-white/80"><span className="text-white/50">Telefono:</span> {req.contact_phone}</p>
                      <p className="text-white/80"><span className="text-white/50">Web:</span> {req.website}</p>
                      <p className="text-white/80 md:col-span-2"><span className="text-white/50">Direccion:</span> {req.business_address}</p>
                      {req.docs_url && (
                        <p className="text-cyan-300 md:col-span-2">
                          <a href={req.docs_url} target="_blank" rel="noreferrer" className="hover:underline">Ver documento</a>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-white/60">Motivo para el usuario (aprobacion o rechazo)</label>
                      <textarea
                        rows={3}
                        value={reviewNotes[req.id] ?? req.validation_notes ?? ''}
                        onChange={(e) => setReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Ej: Documentacion validada correctamente / Falta documentacion fiscal"
                        className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/30"
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
