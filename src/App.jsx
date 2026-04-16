import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';
import { useCheckUserBan } from '@/hooks/useCheckUserBan';

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
import StoryViewerPage from '@/pages/StoryViewerPage';
import CreateStoryPage from '@/pages/CreateStoryPage';
import FishingMapsPage from '@/pages/FishingMapsPage';
import PronosticosPage from '@/pages/PronosticosPage';
import CashoutPage from '@/pages/CashoutPage';
import GroupsPage from '@/pages/GroupsPage';
import EventsCalendarPage from '@/pages/EventsCalendarPage';
import MarketplacePage from '@/pages/MarketplacePage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import LiveStreamPage from '@/pages/LiveStreamPage';
import CameraPage from '@/pages/CameraPage';
import SettingsPage from '@/pages/SettingsPage';
import AdminPanel from '@/pages/AdminPanel';
import BannedUserPage from '@/pages/BannedUserPage';

// Components
import Header from '@/components/Header';
import MobileBottomNav from '@/components/MobileBottomNav';

const AppRoutes = () => {
  const { user } = useAuth();
  const { isBanned, banType, reason, remainingHours } = useCheckUserBan();
  const location = useLocation();

  const adminPathRegex = /^\/(admin|admin-panel|panel-admin|feed\/admin)\/?$/i;
  const isAdminPath = adminPathRegex.test(location.pathname || '');

  useEffect(() => {
    document.body.classList.remove('admin-theme', 'user-theme');
    document.body.classList.add(isAdminPath ? 'admin-theme' : 'user-theme');

    return () => {
      document.body.classList.remove('admin-theme', 'user-theme');
    };
  }, [isAdminPath]);

  // Si el usuario está autenticado y baneado, mostrar página de baneado
  if (user && isBanned) {
    return <BannedUserPage banType={banType} reason={reason} remainingHours={remainingHours} />;
  }

  // Hard guard: evita que rutas admin caigan al wildcard y redirijan a /feed.
  if (isAdminPath) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500/30">
        <Header />
        <AdminRoute><AdminPanel /></AdminRoute>
        <MobileBottomNav />
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
        <Route path="/story/:userId" element={<StoryViewerPage />} />
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
        <Route path="/create-story" element={<ProtectedRoute><CreateStoryPage /></ProtectedRoute>} />
        <Route path="/camera" element={<ProtectedRoute><CameraPage /></ProtectedRoute>} />
        <Route path="/maps" element={<ProtectedRoute><FishingMapsPage /></ProtectedRoute>} />
        <Route path="/pronosticos" element={<ProtectedRoute><PronosticosPage /></ProtectedRoute>} />
        <Route path="/cashout" element={<ProtectedRoute><CashoutPage /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><EventsCalendarPage /></ProtectedRoute>} />
        <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/live" element={<ProtectedRoute><LiveStreamPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="/admin-panel" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="/panel-admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="/feed/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
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