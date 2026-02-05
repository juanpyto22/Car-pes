import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión válida de recuperación
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setValidSession(true);
      } else {
        // Intentar obtener la sesión del hash de la URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        if (accessToken && type === 'recovery') {
          setValidSession(true);
        }
      }
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "¡Contraseña actualizada!",
        description: "Ya puedes iniciar sesión con tu nueva contraseña.",
      });

      // Redirigir después de 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Error:', err);
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-800">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!validSession && !checkingSession) {
    return (
      <>
        <Helmet>
          <title>Enlace Inválido - Car-Pes</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-800 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-950/40 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Enlace inválido o expirado</h1>
            <p className="text-blue-200 mb-6">
              El enlace de recuperación no es válido o ha expirado. 
              Por favor, solicita uno nuevo.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-4 rounded-xl font-bold">
                Solicitar Nuevo Enlace
              </Button>
            </Link>
          </motion.div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Helmet>
          <title>Contraseña Actualizada - Car-Pes</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-800 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-950/40 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">¡Contraseña actualizada!</h1>
            <p className="text-blue-200 mb-6">
              Tu contraseña ha sido cambiada exitosamente. 
              Serás redirigido al login en unos segundos...
            </p>
            <Link to="/login">
              <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-4 rounded-xl font-bold">
                Ir a Iniciar Sesión
              </Button>
            </Link>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Nueva Contraseña - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-800 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-slate-950/40 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Crear nueva contraseña</h1>
              <p className="text-blue-200 text-sm">
                Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-200 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="password" className="text-blue-100 mb-2 block">Nueva Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-10 pr-12 py-3 bg-blue-950/50 border border-blue-800 rounded-xl text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-cyan-400"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-blue-100 mb-2 block">Confirmar Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-blue-950/50 border border-blue-800 rounded-xl text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                    placeholder="Repite tu contraseña"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-6 text-lg rounded-xl font-bold shadow-lg shadow-cyan-900/20"
              >
                {loading ? <LoadingSpinner size="sm" className="border-white" /> : 'Actualizar Contraseña'}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ResetPasswordPage;
