import React from 'react';
import { BadgeCheck, Star, TrendingUp, Headphones, Link2, Zap, Calendar, DollarSign, Fish, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const iconMap = {
  '✓': <BadgeCheck className="w-5 h-5 text-emerald-400" />,
  '⭐': <Star className="w-5 h-5 text-yellow-400" />,
  '📊': <TrendingUp className="w-5 h-5 text-cyan-400" />,
  '🎯': <Headphones className="w-5 h-5 text-blue-400" />,
  '🔗': <Link2 className="w-5 h-5 text-purple-400" />,
  '🚀': <Zap className="w-5 h-5 text-orange-400" />,
  '📅': <Calendar className="w-5 h-5 text-pink-400" />,
  '💰': <DollarSign className="w-5 h-5 text-green-400" />,
  '🎣': <Fish className="w-5 h-5 text-blue-300" />,
  '📍': <MapPin className="w-5 h-5 text-red-400" />,
};

/**
 * Componente: Insignia PRO en perfil
 */
export const ProBadgeDisplay = ({ proStatus, businessType }) => {
  if (!proStatus) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
      <BadgeCheck className="w-4 h-4" />
      <span className="text-sm font-semibold">Perfil Pro</span>
      {businessType && (
        <Badge variant="outline" className="ml-1 bg-emerald-500/20 border-emerald-500/50 text-emerald-200 text-xs">
          {businessType}
        </Badge>
      )}
    </div>
  );
};

/**
 * Componente: Lista de beneficios PRO
 */
export const ProBenefitsList = ({ benefits, className = '' }) => {
  return (
    <Card className={`bg-slate-900/50 border border-emerald-500/20 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-bold text-emerald-300 flex items-center gap-2">
          <Star className="w-5 h-5" /> Beneficios PRO
        </CardTitle>
        <CardDescription>Características exclusivas de tu perfil verificado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {benefits.map(benefit => (
            <div key={benefit.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:border-emerald-500/30 transition-colors">
              <div className="pt-0.5">
                {iconMap[benefit.icon] || <span className="text-lg">{benefit.icon}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{benefit.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Componente: Modal / Card de información PRO
 */
export const ProInfoCard = ({ userProfile }) => {
  if (!userProfile?.isPro) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="pt-1">
          <BadgeCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-emerald-300 mb-1">Perfil Verificado</h3>
          <p className="text-sm text-gray-300 mb-3">
            Este usuario es un profesional verificado con experiencia en {userProfile.businessType || 'su área'}.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-emerald-500/20 border-emerald-500/50 text-emerald-200">
              ✓ Verificado
            </Badge>
            <Badge variant="outline" className="bg-emerald-500/20 border-emerald-500/50 text-emerald-200">
              ⭐ Profesional
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProBenefitsList;
