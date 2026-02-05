import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { user, loading, authError } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If there's an auth error and no user, redirect to login
  if (authError && !user) {
    console.warn('Auth error:', authError);
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;