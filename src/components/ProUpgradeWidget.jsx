import React from 'react';
import { Link } from 'react-router-dom';
import { Star, TrendingUp, Zap, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProBenefits } from '@/hooks/useProStatus';

/**
 * Componente: Call-to-action para convertirse en PRO
 */
export const UpgradeProCTA = ({ isOwnProfile }) => {
  if (!isOwnProfile) return null;

  const benefits = getProBenefits().slice(0, 4);

  return (
    <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 hover:border-purple-500/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-yellow-400" />
              Conviértete en Pro
            </CardTitle>
            <CardDescription className="text-gray-300">
              Desbloquea beneficios exclusivos y aumenta tu visibilidad
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {benefits.map(benefit => (
            <div key={benefit.id} className="flex gap-2 text-sm">
              <span className="text-purple-400 font-semibold">✓</span>
              <span className="text-gray-300">{benefit.name}</span>
            </div>
          ))}
        </div>
        
        <div className="flex gap-3 pt-4 border-t border-purple-500/20">
          <Link to="/edit-profile" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold">
              <TrendingUp className="w-4 h-4 mr-2" />
              Solicitar PRO
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <p className="text-xs text-gray-400 text-center">
          La solicitud se revisa en 24-48 horas
        </p>
      </CardContent>
    </Card>
  );
};

/**
 * Componente: Búsqueda de perfiles PRO
 */
export const ProSearchWidget = () => {
  return (
    <Card className="bg-slate-900/50 border border-emerald-500/20">
      <CardHeader>
        <CardTitle className="text-base font-bold text-emerald-300 flex items-center gap-2">
          <Star className="w-4 h-4" />
          Perfiles Verificados
        </CardTitle>
        <CardDescription>Conecta con profesionales verificados</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-400 mb-3">
          Filtra por tipo de profesional para encontrar expertos en tu área de interés.
        </p>
        <Link to="/search?filter=pro">
          <Button variant="outline" className="w-full border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
            Ver Perfiles PRO
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default UpgradeProCTA;
