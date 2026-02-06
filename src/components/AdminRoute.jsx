import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useIsAdmin } from '../hooks/useAdminPanel';
import LoadingSpinner from './LoadingSpinner';

/**
 * Componente: Ruta Protegida para Administradores
 * Verifica que el usuario esté autenticado y sea administrador
 */
export const AdminRoute = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    // Si completó la verificación de admin y no es admin
    if (!adminLoading && !isAdmin && user?.id) {
      setAccessDenied(true);
    }
  }, [adminLoading, isAdmin, user?.id]);

  // Cargando autenticación
  if (authLoading || adminLoading) {
    return <LoadingSpinner />;
  }

  // No autenticado → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Autenticado pero no admin → acceso denegado
  if (accessDenied || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto border border-red-500/30 bg-red-900/10 rounded-2xl p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-3">Acceso Denegado</h1>
          <p className="text-white/60 mb-6">
            No tienes permisos para acceder a esta área. Solo los administradores pueden ver el panel de control.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition"
          >
            Volver al Inicio
          </a>
        </div>
      </div>
    );
  }

  // Autenticado y es admin → mostrar contenido
  return children;
};
