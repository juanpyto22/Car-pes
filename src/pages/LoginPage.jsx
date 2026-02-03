import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!formData.email || !formData.password) {
        setErrorMsg('Por favor completa todos los campos');
        return;
    }

    setLoading(true);

    const { error } = await signIn(formData.email, formData.password);

    setLoading(false);

    if (error) {
        console.error("Error de login:", error);
        if (error.message.includes("Invalid login credentials")) {
            setErrorMsg("Email o contraseña incorrectos.");
        } else {
            setErrorMsg("Error al iniciar sesión. Intenta de nuevo.");
        }
        
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo iniciar sesión. Verifica tus credenciales.",
        });
    } else {
        navigate('/feed');
    }
  };

  return (
    <>
      <Helmet>
        <title>Iniciar Sesión - FishHub</title>
        <meta name="description" content="Inicia sesión en FishHub y conéctate con la comunidad de pescadores" />
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
              <h1 className="text-3xl font-bold text-white mb-2">¡Bienvenido!</h1>
              <p className="text-blue-200">Inicia sesión para continuar en FishHub</p>
            </div>

            {errorMsg && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-200 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {errorMsg}
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
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-blue-950/50 border border-blue-800 rounded-xl text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-blue-100 mb-2 block">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-blue-950/50 border border-blue-800 rounded-xl text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors opacity-80 hover:opacity-100 font-medium"
                  onClick={() => toast({ description: "¡Próximamente recuperación de contraseña!" })}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-6 text-lg rounded-xl font-bold shadow-lg shadow-cyan-900/20"
              >
                {loading ? <LoadingSpinner size="sm" className="border-white" /> : 'Iniciar Sesión'}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-blue-200">
                ¿No tienes una cuenta?{' '}
                <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
                  Regístrate
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default LoginPage;