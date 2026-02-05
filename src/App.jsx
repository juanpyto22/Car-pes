import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import FeedPage from '@/pages/FeedPage';
import CreatePostPage from '@/pages/CreatePostPage';
import ProfilePage from '@/pages/ProfilePage';
import ExplorePage from '@/pages/ExplorePage';
import PostDetailPage from '@/pages/PostDetailPage';
import MessagesPage from '@/pages/MessagesPage';
import NotificationsPage from '@/pages/NotificationsPage';
import EditProfilePage from '@/pages/EditProfilePage';
import SearchPage from '@/pages/SearchPage';
import SavedPostsPage from '@/pages/SavedPostsPage';

// Components
import Header from '@/components/Header';

const AppRoutes = () => {
  const { user, loading } = useAuth();

  // Mostrar loading solo durante la verificación inicial de sesión
  if (loading) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
              <p className="text-cyan-400 text-sm">Cargando...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500/30">
      <Header />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={user ? <Navigate to="/feed" /> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/feed" /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to="/feed" /> : <SignupPage />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/feed" /> : <ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/post/:postId" element={<PostDetailPage />} />
        {/* Profile is accessible to public, but functionality might differ if logged out */}
        <Route path="/profile/:userId" element={<ProfilePage />} />
        
        {/* Protected Routes */}
        <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/create-post" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} /> {/* Self profile */}
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute><SavedPostsPage /></ProtectedRoute>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

function App() {
    return (
        <Router>
          <AuthProvider>
            <Helmet>
              <title>Car-Pes - La Comunidad de Pesca</title>
              <meta name="description" content="Red social para amantes de la pesca" />
            </Helmet>
            <AppRoutes />
            <Toaster />
          </AuthProvider>
        </Router>
    );
}

export default App;