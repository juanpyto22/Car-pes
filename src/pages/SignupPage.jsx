import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    const { error } = await signUp(
      formData.email,
      formData.password,
      formData.username,
      formData.nombre
    );

    setLoading(false);

    if (error) {
      let errorMessage = error.message;
      if (errorMessage.includes("User already registered") || errorMessage.includes("already taken")) {
        errorMessage = "Este email o usuario ya está registrado.";
      }
      
      toast({
        variant: "destructive",
        title: "Error en el registro",
        description: errorMessage,
      });
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      <Helmet>
        <title>Registrarse - FishHub</title>
        <meta name="description" content="Crea tu cuenta en FishHub y únete a la comunidad de pescadores" />
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
              <h1 className="text-3xl font-bold text-white mb-2">Únete a FishHub</h1>
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