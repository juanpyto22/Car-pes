import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TestTube2, Database, Wifi, User, AlertCircle, CheckCircle2, Clock, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const DevTestPage = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { isDemoMode, enableDemoMode, disableDemoMode, mockUser, mockProfile } = useDemo();
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runTest = async (testName, testFn) => {
    setLoading(true);
    setTestResults(prev => ({ ...prev, [testName]: 'running' }));
    
    try {
      const result = await testFn();
      setTestResults(prev => ({ ...prev, [testName]: result ? 'success' : 'failed' }));
      return result;
    } catch (error) {
      console.error(`Test ${testName} failed:`, error);
      setTestResults(prev => ({ ...prev, [testName]: 'error' }));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testSupabaseConnection = async () => {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) throw error;
    return true;
  };

  const testUserAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  };

  const testProfilesTable = async () => {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  };

  const testStorageAccess = async () => {
    const { data, error } = await supabase.storage.listBuckets();
    return !error && data;
  };

  const createTestUser = async () => {
    const testEmail = `test${Date.now()}@carpes.dev`;
    const testPassword = 'testpassword123';
    const testUsername = `testuser${Date.now().toString().slice(-4)}`;
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: testUsername,
          nombre: 'Usuario de Prueba',
        }
      }
    });

    if (error) throw error;

    toast({
      title: "Usuario de prueba creado",
      description: `Email: ${testEmail}`,
    });

    return !!data.user;
  };

  const TestStatus = ({ status, testName }) => {
    const getIcon = () => {
      switch (status) {
        case 'running':
          return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
        case 'success':
          return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        case 'failed':
        case 'error':
          return <AlertCircle className="w-5 h-5 text-red-500" />;
        default:
          return <TestTube2 className="w-5 h-5 text-blue-500" />;
      }
    };

    const getStatusText = () => {
      switch (status) {
        case 'running':
          return 'Ejecutando...';
        case 'success':
          return 'Exitoso';
        case 'failed':
          return 'Falló';
        case 'error':
          return 'Error';
        default:
          return 'No ejecutado';
      }
    };

    return (
      <div className="flex items-center gap-3">
        {getIcon()}
        <span className="text-white font-medium">{testName}</span>
        <span className={`text-sm px-2 py-1 rounded ${
          status === 'success' ? 'bg-green-900/50 text-green-300' :
          status === 'running' ? 'bg-yellow-900/50 text-yellow-300' :
          status === 'failed' || status === 'error' ? 'bg-red-900/50 text-red-300' :
          'bg-blue-900/50 text-blue-300'
        }`}>
          {getStatusText()}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 mb-4"
            >
              <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl">
                <TestTube2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Pruebas de Desarrollo</h1>
            </motion.div>
            <p className="text-blue-400 max-w-2xl mx-auto">
              Esta página te permite probar la conectividad y funcionalidades básicas de Car-Pes
              para diagnosticar problemas comunes.
            </p>
          </div>

          {/* Current Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <User className="w-6 h-6 text-cyan-400" />
              Estado Actual
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-blue-400 text-sm mb-2">Auth Status</p>
                <p className="text-white font-medium">
                  {isDemoMode ? `🎭 Modo Demo: ${mockUser.email}` :
                   user ? `✅ Autenticado: ${user.email}` : '❌ No autenticado'}
                </p>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-blue-400 text-sm mb-2">Perfil</p>
                <p className="text-white font-medium">
                  {isDemoMode ? `🎭 Demo: ${mockProfile.nombre}` :
                   profile ? `✅ Cargado: ${profile.nombre}` : '❌ No disponible'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tests Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <Database className="w-6 h-6 text-cyan-400" />
              Pruebas de Conectividad
            </h2>

            <div className="space-y-4 mb-6">
              <TestStatus status={testResults.connection} testName="Conexión a Supabase" />
              <TestStatus status={testResults.profiles} testName="Tabla Profiles" />
              <TestStatus status={testResults.auth} testName="Autenticación" />
              <TestStatus status={testResults.storage} testName="Almacenamiento" />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => runTest('connection', testSupabaseConnection)}
                disabled={loading}
                variant="outline"
                className="bg-transparent border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Probar Conexión
              </Button>

              <Button
                onClick={() => runTest('profiles', testProfilesTable)}
                disabled={loading}
                variant="outline"
                className="bg-transparent border-green-500/50 text-green-400 hover:bg-green-500/10"
              >
                <Database className="w-4 h-4 mr-2" />
                Probar Tabla Profiles
              </Button>

              <Button
                onClick={() => runTest('auth', testUserAuth)}
                disabled={loading}
                variant="outline"
                className="bg-transparent border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              >
                <User className="w-4 h-4 mr-2" />
                Probar Auth
              </Button>

              <Button
                onClick={() => runTest('storage', testStorageAccess)}
                disabled={loading}
                variant="outline"
                className="bg-transparent border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                <Database className="w-4 h-4 mr-2" />
                Probar Storage
              </Button>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-white mb-6">Acciones Rápidas</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-cyan-400">Para Desarrollo</h3>
                
                <Button
                  onClick={() => runTest('createUser', createTestUser)}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                >
                  Crear Usuario de Prueba
                </Button>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-200 text-sm">
                    <strong>Nota:</strong> Si el registro normal falla por rate limiting, 
                    puedes usar esta función para crear un usuario de prueba.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-400">SQL Helper</h3>
                
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-green-200 text-sm mb-2">
                    <strong>Si "Tabla Profiles" falla:</strong>
                  </p>
                  <code className="text-green-300 text-xs block">
                    CREATE TABLE profiles (<br/>
                    &nbsp;&nbsp;id UUID REFERENCES auth.users(id) PRIMARY KEY,<br/>
                    &nbsp;&nbsp;email TEXT, username TEXT UNIQUE,<br/>
                    &nbsp;&nbsp;nombre TEXT, created_at TIMESTAMP DEFAULT NOW()<br/>
                    );
                  </code>
                </div>

                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(`
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE,
  nombre TEXT,
  foto_perfil TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" 
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
                    `.trim());
                    toast({ title: "SQL copiado al portapapeles" });
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent border-green-500/50 text-green-400 hover:bg-green-500/10"
                >
                  Copiar SQL Completo
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Demo Mode Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-white mb-6">Modo Demo</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-400">Control de Demo</h3>
                
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-purple-200 text-sm mb-2">
                    <strong>Estado:</strong> {isDemoMode ? '🎭 Activo' : '❌ Desactivado'}
                  </p>
                  <p className="text-purple-200 text-sm">
                    El modo demo te permite usar Car-Pes con datos simulados mientras 
                    se configuran los servicios reales.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={enableDemoMode}
                    disabled={isDemoMode}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Activar Demo
                  </Button>

                  <Button
                    onClick={disableDemoMode}
                    disabled={!isDemoMode}
                    variant="outline"
                    className="bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10 flex-1"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Desactivar
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-cyan-400">Características Demo</h3>
                
                <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-slate-200 text-sm">Usuario autenticado simulado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-slate-200 text-sm">Posts y comentarios de ejemplo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-slate-200 text-sm">Stories temporales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-slate-200 text-sm">Navegación completa</span>
                  </div>
                </div>

                {isDemoMode && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-200 text-xs">
                      <strong>Nota:</strong> Los datos están simulados y no se guardan permanentemente.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
  );
};

export default DevTestPage;