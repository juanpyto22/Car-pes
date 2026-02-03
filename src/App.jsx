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
import FeedPage from '@/pages/FeedPage';
import CreatePostPage from '@/pages/CreatePostPage';
import ProfilePage from '@/pages/ProfilePage';
import ExplorePage from '@/pages/ExplorePage';
import PostDetailPage from '@/pages/PostDetailPage';
import MessagesPage from '@/pages/MessagesPage';
import NotificationsPage from '@/pages/NotificationsPage';
import EditProfilePage from '@/pages/EditProfilePage';

// Components
import Header from '@/components/Header';

const AppRoutes = () => {
  const { user, loading } = useAuth();

  // Wait for auth check to complete before rendering anything to prevent flashes
  if (loading) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
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
        
        <Route path="/explore" element={<ExplorePage />} />
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
              <title>FishHub - Angler Community</title>
              <meta name="description" content="Social network for fishing enthusiasts" />
            </Helmet>
            <AppRoutes />
            <Toaster />
          </AuthProvider>
        </Router>
    );
}

export default App;