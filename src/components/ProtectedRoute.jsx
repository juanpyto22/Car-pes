import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { user, loading, authError } = useAuth();

  // Wait for auth bootstrap on refresh so route is preserved.
  if (loading) {
    return <LoadingSpinner />;
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