import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, Zap, Users, BadgeCheck, Crown } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet';

const LeaderboardPage = () => {
  const { users, loading } = useLeaderboard(100);

  const getMedalColor = (rank) => {
    switch (rank) {
      case 1:
        return 'text-yellow-400';
      case 2:
        return 'text-gray-300';
      case 3:
        return 'text-orange-400';
      default:
        return 'text-gray-500';
    }
  };

  const getMedalIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <>
      <Helmet>
        <title>Leaderboard - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/10 to-slate-950">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-b border-orange-500/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white">Leaderboard</h1>
                <p className="text-orange-300 mt-1">Ranking de usuarios por seguidores</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-slate-900/50 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-gray-400 text-sm">Total de Usuarios</p>
                  <p className="text-2xl font-bold text-white">{users.length}</p>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/50 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-gray-400 text-sm">Top Usuario</p>
                  <p className="text-xl font-bold text-white">
                    {users[0]?.followers_count?.toLocaleString() || 0} seguidores
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/50 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <BadgeCheck className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-gray-400 text-sm">Usuarios PRO</p>
                  <p className="text-xl font-bold text-white">
                    {users.filter(u => u.isPro).length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Leaderboard Table */}
          <Card className="bg-slate-900/50 border border-white/10 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin inline-block">
                  <Trophy className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-400 mt-4">Cargando ranking...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No hay usuarios para mostrar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  {/* Header */}
                  <thead className="border-b border-white/10 bg-slate-800/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-gray-300 font-semibold text-sm">Posición</th>
                      <th className="text-left px-6 py-4 text-gray-300 font-semibold text-sm">Usuario</th>
                      <th className="text-center px-6 py-4 text-gray-300 font-semibold text-sm">Seguidores</th>
                      <th className="text-center px-6 py-4 text-gray-300 font-semibold text-sm">Estado</th>
                      <th className="text-center px-6 py-4 text-gray-300 font-semibold text-sm"></th>
                    </tr>
                  </thead>

                  {/* Body */}
                  <tbody>
                    {users.map((user, idx) => (
                      <tr
                        key={user.id}
                        className={`border-b border-white/5 hover:bg-slate-800/30 transition-colors ${
                          [1, 2, 3].includes(user.rank) ? 'bg-slate-800/20' : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-2 text-xl font-black ${getMedalColor(user.rank)}`}>
                            <span>{getMedalIcon(user.rank)}</span>
                          </div>
                        </td>

                        {/* User Info */}
                        <td className="px-6 py-4">
                          <Link to={`/profile/${user.id}`}>
                            <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                              <Avatar className="w-12 h-12 border border-cyan-500/30">
                                <AvatarImage src={user.foto_perfil} />
                                <AvatarFallback className="bg-cyan-900 text-cyan-200">
                                  {user.nombre?.[0] || user.username?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-bold text-white truncate">{user.nombre || user.username}</p>
                                <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Followers Count */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Users className="w-4 h-4 text-cyan-400" />
                            <span className="font-semibold text-white">
                              {(user.followers_count || 0).toLocaleString()}
                            </span>
                          </div>
                        </td>

                        {/* PRO Badge */}
                        <td className="px-6 py-4 text-center">
                          {user.isPro ? (
                            <div className="flex items-center justify-center">
                              <Badge className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center gap-1">
                                <BadgeCheck className="w-3 h-3" />
                                {user.businessType}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">Usuario</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-center">
                          <Link to={`/profile/${user.id}`}>
                            <Button
                              size="sm"
                              className="bg-slate-800 hover:bg-slate-700 text-white border border-white/10 text-xs"
                            >
                              Ver Perfil
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Footer Info */}
          <div className="mt-8 p-6 bg-slate-900/50 border border-white/10 rounded-xl">
            <div className="flex gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-xl">🥇</span>
                <span>1er lugar</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🥈</span>
                <span>2do lugar</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🥉</span>
                <span>3er lugar</span>
              </div>
              <div className="flex-1"></div>
              <p className="text-gray-400">
                El ranking se actualiza cada hora basado en el número de seguidores.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeaderboardPage;
