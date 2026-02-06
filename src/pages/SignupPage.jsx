import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserCircle, AlertCircle, Clock, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { EMAIL_SUGGESTIONS } from '@/utils/rateLimitingHelpers';
import { useDemo } from '@/contexts/DemoContext';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const { activateDemo } = useDemo();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    nombre: '',
    termsAccepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [rateLimited, setRateLimited] = useState(false);

  // Funciones helper para rate limiting
  const generateUniqueEmails = () => EMAIL_SUGGESTIONS();
  
  const handleEmailSuggestion = (email) => {
    setFormData(prev => ({ ...prev, email }));
    setRateLimited(false);
    setErrors(prev => ({ ...prev, email: undefined }));
  };
  
  const handleDemoMode = () => {
    activateDemo();
    toast({
      title: "🎮 Modo DEMO Activado",
      description: "Ahora puedes probar todas las funciones sin registro",
    });
    navigate('/feed');
  };

  const validateForm = () => {
    const newErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Por favor ingresa un email válido';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El usuario debe tener al menos 3 caracteres';
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre completo es requerido';
    }

    if (!formData.termsAccepted) {
      newErrors.terms = 'Debes aceptar los términos y condiciones';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({}); // Limpiar errores anteriores

    // Verificar rate limiting local
    const lastAttempt = localStorage.getItem('lastSignupAttempt');
    const now = Date.now();
    const cooldownTime = 2 * 60 * 1000; // 2 minutos
    
    if (lastAttempt && (now - parseInt(lastAttempt)) < cooldownTime) {
      const remainingTime = Math.ceil((cooldownTime - (now - parseInt(lastAttempt))) / 1000 / 60);
      toast({
        variant: "destructive",
        title: "Espera un momento",
        description: `Puedes intentar de nuevo en ${remainingTime} minuto(s).`,
      });
      setLoading(false);
      return;
    }

    // Guardar timestamp del intento
    localStorage.setItem('lastSignupAttempt', now.toString());

    const { error, needsEmailConfirmation } = await signUp(
      formData.email,
      formData.password,
      formData.username,
      formData.nombre
    );

    setLoading(false);

    if (error) {
      let errorMessage = error.message || 'Error desconocido';
      
      // Detectar rate limiting y ofrecer soluciones
      if (errorMessage.includes('rate limit') || 
          errorMessage.includes('Too Many Requests') ||
          errorMessage.includes('L\u00edmite alcanzado') ||
          errorMessage.includes('429')) {
        
        setRateLimited(true);
        setErrors({ 
          email: 'Rate limit - prueba emails sugeridos abajo',
          general: 'Demasiados intentos desde tu ubicaci\u00f3n' 
        });
        
        toast({
          variant: "destructive",
          title: "\u23f0 Rate Limiting Activo",
          description: "Ve las sugerencias abajo o prueba el modo DEMO",
          duration: 8000,
        });
        
      } else if (errorMessage.includes('already registered') || errorMessage.includes('already taken')) {
        errorMessage = "Este email ya está registrado. Intenta iniciar sesión.";
        setErrors({ email: 'Email ya registrado' });
      } else if (errorMessage.includes('Invalid email')) {
        errorMessage = "Email inválido. Usa un email real como gmail.com";
        setErrors({ email: 'Email inválido' });
      } else if (errorMessage.includes('Password')) {
        errorMessage = "La contraseña es muy débil. Usa al menos 8 caracteres.";
        setErrors({ password: 'Contraseña muy débil' });
      }
      
      toast({
        variant: "destructive",
        title: "Error en el registro",
        description: errorMessage,
      });
    } else if (needsEmailConfirmation) {
      setShowEmailConfirmation(true);
    } else {
      // Éxito - limpiar localStorage y redirigir
      localStorage.removeItem('lastSignupAttempt');
      toast({
        title: "✅ ¡Cuenta creada!",
        description: "Ya puedes iniciar sesión",
      });
      setTimeout(() => navigate('/login'), 1500);
    }
  };

  if (showEmailConfirmation) {
    return (
      <>
        <Helmet>
          <title>Confirma tu email - Car-Pes</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-800 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-950/40 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">¡Revisa tu email!</h1>
            <p className="text-blue-200 mb-6">
              Hemos enviado un enlace de confirmación a <span className="font-bold text-cyan-400">{formData.email}</span>.
              Por favor, haz clic en el enlace para activar tu cuenta.
            </p>
            <div className="bg-blue-900/30 rounded-xl p-4 mb-6 border border-blue-800/50">
              <p className="text-sm text-blue-300">
                💡 Si no ves el email, revisa tu carpeta de spam o correo no deseado.
              </p>
            </div>
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
        <title>Registrarse - Car-Pes</title>
        <meta name="description" content="Crea tu cuenta en Car-Pes y únete a la comunidad de pescadores" />
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
              <h1 className="text-3xl font-bold text-white mb-2">Únete a Car-Pes</h1>
              <p className="text-blue-200">Crea tu cuenta y empieza a compartir</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre" className="text-blue-100 mb-1.5 block">Nombre Completo</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    id="nombre"
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 bg-blue-950/50 border ${errors.nombre ? 'border-red-400' : 'border-blue-800'} rounded-xl text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all`}
                    placeholder="Juan Pérez"
                  />
                </div>
                {errors.nombre && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.nombre}</p>}
              </div>

              <div>
                <Label htmlFor="username" className="text-blue-100 mb-1.5 block">Nombre de Usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 bg-blue-950/50 border ${errors.username ? 'border-red-400' : 'border-blue-800'} rounded-xl text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all`}
                    placeholder="juanpescador"
                  />
                </div>
                {errors.username && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.username}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="text-blue-100 mb-1.5 block">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 bg-blue-950/50 border ${errors.email ? 'border-red-400' : 'border-blue-800'} rounded-xl text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all`}
                    placeholder="tu@email.com"
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.email}</p>}
              </div>

              {/* Rate Limiting Helper */}
              {rateLimited && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-orange-900/30 backdrop-blur-sm rounded-xl p-4 border border-orange-700/50"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-semibold text-orange-300">Rate Limiting Detectado</h3>
                  </div>
                  
                  <p className="text-xs text-orange-200 mb-3">
                    📧 Prueba uno de estos emails únicos (se auto-generan):
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2 mb-3">
                    {generateUniqueEmails().map((email, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleEmailSuggestion(email)}
                        className="text-left p-2 bg-blue-900/30 hover:bg-blue-800/40 rounded-lg text-xs text-cyan-300 hover:text-cyan-200 transition-colors border border-blue-800/30 hover:border-cyan-500/50"
                      >
                        📧 {email}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleDemoMode}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs py-2"
                    >
                      <Lightbulb className="w-3 h-3 mr-1" />
                      Probar DEMO
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setRateLimited(false)}
                      variant="outline"
                      className="px-3 py-2 text-xs border-blue-700 text-blue-300 hover:bg-blue-900/30"
                    >
                      ✕
                    </Button>
                  </div>
                </motion.div>
              )}

              <div>
                <Label htmlFor="password" className="text-blue-100 mb-1.5 block">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 bg-blue-950/50 border ${errors.password ? 'border-red-400' : 'border-blue-800'} rounded-xl text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all`}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.password}</p>}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-blue-100 mb-1.5 block">Confirmar Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 bg-blue-950/50 border ${errors.confirmPassword ? 'border-red-400' : 'border-blue-800'} rounded-xl text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all`}
                    placeholder="Repite tu contraseña"
                  />
                </div>
                {errors.confirmPassword && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.confirmPassword}</p>}
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => setFormData({ ...formData, termsAccepted: checked })}
                  className="border-cyan-500 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-white mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="terms" className="text-sm font-medium text-blue-200 cursor-pointer hover:text-white transition-colors">
                    Acepto los términos y condiciones
                  </label>
                  {errors.terms && <p className="text-red-400 text-xs">{errors.terms}</p>}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-6 text-lg rounded-xl font-bold shadow-lg shadow-cyan-900/20 mt-6"
              >
                {loading ? <LoadingSpinner size="sm" className="border-white" /> : 'Crear Cuenta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-blue-200">
                ¿Ya tienes cuenta?{' '}
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

export default SignupPage;