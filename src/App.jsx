import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';
import { useCheckUserBan } from '@/hooks/useCheckUserBan';
import LoadingSpinner from '@/components/LoadingSpinner';
import logoImg from '/img/Car-Pes.png';

// Pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const FeedPage = lazy(() => import('@/pages/FeedPage'));
const CreatePostPage = lazy(() => import('@/pages/CreatePostPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const ExplorePage = lazy(() => import('@/pages/ExplorePage'));
const PostDetailPage = lazy(() => import('@/pages/PostDetailPage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const EditProfilePage = lazy(() => import('@/pages/EditProfilePage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const SavedPostsPage = lazy(() => import('@/pages/SavedPostsPage'));
const StoryViewerPage = lazy(() => import('@/pages/StoryViewerPage'));
const CreateStoryPage = lazy(() => import('@/pages/CreateStoryPage'));
const FishingMapsPage = lazy(() => import('@/pages/FishingMapsPage'));
const PronosticosPage = lazy(() => import('@/pages/PronosticosPage'));
const CashoutPage = lazy(() => import('@/pages/CashoutPage'));
const GroupsPage = lazy(() => import('@/pages/GroupsPage'));
const EventsCalendarPage = lazy(() => import('@/pages/EventsCalendarPage'));
const MarketplacePage = lazy(() => import('@/pages/MarketplacePage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const LiveStreamPage = lazy(() => import('@/pages/LiveStreamPage'));
const CameraPage = lazy(() => import('@/pages/CameraPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
const BannedUserPage = lazy(() => import('@/pages/BannedUserPage'));

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
  return (
    <Suspense
      fallback={
        <div className="min-h-screen overflow-hidden bg-slate-950 text-white flex items-center justify-center px-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,#020617_0%,#020815_100%)]" />
          <div className="relative z-10 flex flex-col items-center gap-5 text-center">
            <div className="relative">
              <div className="absolute -inset-6 rounded-full bg-sky-400/10 blur-3xl animate-pulse" />
              <img src={logoImg} alt="Car-Pes" className="relative h-24 w-24 rounded-full object-cover shadow-2xl shadow-sky-900/30 ring-1 ring-sky-300/25" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-white">Car-Pes</h2>
              <p className="text-sm text-slate-300 max-w-sm">Cargando experiencia de pesca, mapas y comunidad.</p>
            </div>
            <LoadingSpinner size="lg" />
            <p className="text-xs uppercase tracking-[0.22em] text-sky-200/70">Preparando panel y rutas</p>
          </div>
        </div>
      }
    >
      {user && isBanned ? (
        <BannedUserPage banType={banType} reason={reason} remainingHours={remainingHours} />
      ) : isAdminPath ? (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500/30">
          <Header />
          <AdminRoute><AdminPanel /></AdminRoute>
          <MobileBottomNav />
        </div>
      ) : (
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
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />
        </div>
      )}
    </Suspense>
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