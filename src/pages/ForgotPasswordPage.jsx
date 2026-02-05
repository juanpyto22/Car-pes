import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/LoadingSpinner';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      setSent(true);
    } catch (err) {
      console.error('Error:', err);
      setError('No se pudo enviar el correo. Verifica que el email sea correcto.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <>
        <Helmet>
          <title>Revisa tu Email - Car-Pes</title>
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
            <h1 className="text-2xl font-bold text-white mb-3">¡Correo enviado!</h1>
            <p className="text-blue-200 mb-6">
              Hemos enviado un enlace de recuperación a <span className="font-bold text-cyan-400">{email}</span>.
              Por favor, revisa tu bandeja de entrada y sigue las instrucciones.
            </p>
            <div className="bg-blue-900/30 rounded-xl p-4 mb-6 border border-blue-800/50">
              <p className="text-sm text-blue-300">
                💡 Si no ves el email, revisa tu carpeta de spam o correo no deseado.
              </p>
            </div>
            <Link to="/login">
              <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-4 rounded-xl font-bold">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Iniciar Sesión
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
        <title>Recuperar Contraseña - Car-Pes</title>
        <meta name="description" content="Recupera tu contraseña de Car-Pes" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-800 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-slate-950/40 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 text-blue-300 hover:text-cyan-400 transition-colors mb-6 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al login
            </Link>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">¿Olvidaste tu contraseña?</h1>
              <p className="text-blue-200 text-sm">
                No te preocupes, te enviaremos instrucciones para restablecerla.
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
                <Label htmlFor="email" className="text-blue-100 mb-2 block">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-blue-950/50 border border-blue-800 rounded-xl text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-6 text-lg rounded-xl font-bold shadow-lg shadow-cyan-900/20"
              >
                {loading ? <LoadingSpinner size="sm" className="border-white" /> : 'Enviar Instrucciones'}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-blue-200 text-sm">
                ¿Recordaste tu contraseña?{' '}
                <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ForgotPasswordPage;
