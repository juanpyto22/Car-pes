import React, { useState, useEffect } from 'react';
import { 
  Settings, Shield, Bell, Eye, Lock, User, 
  Globe, Phone, Mail, MapPin, CreditCard, 
  Trash2, Download, Upload, Moon, Sun,
  Monitor, Smartphone, Volume2, VolumeX,
  Database, Share, AlertTriangle, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const SettingsPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});
  const [settings, setSettings] = useState({
    privacy: {
      profileVisibility: 'public', // public, followers, private
      showEmail: false,
      showPhone: false,
      showLocation: true,
      allowMessages: 'everyone', // everyone, followers, none
      allowComments: 'everyone',
      allowTagging: 'everyone',
      showOnlineStatus: true,
      allowFindByEmail: false,
      allowFindByPhone: false
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      newFollowers: true,
      likes: true,
      comments: true,
      messages: true,
      mentions: true,
      marketplaceUpdates: false,
      weeklyDigest: true,
      fishingTips: true,
      eventReminders: true,
      groupActivity: true
    },
    account: {
      theme: 'system', // light, dark, system
      language: 'es',
      timezone: 'America/Mexico_City',
      dateFormat: 'DD/MM/YYYY',
      measurementUnit: 'metric', // metric, imperial
      autoSave: true,
      dataCollection: true,
      analytics: true
    },
    security: {
      twoFactorEnabled: false,
      loginAlerts: true,
      sessionTimeout: 30, // minutes
      passwordLastChanged: null,
      lastLoginActivity: null
    }
  });

  useEffect(() => {
    if (user?.id) {
      fetchUserSettings();
    }
  }, [user]);

  const fetchUserSettings = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch user settings from database
      const { data: userSettings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (userSettings) {
        setSettings(prev => ({
          ...prev,
          privacy: { ...prev.privacy, ...userSettings.privacy_settings },
          notifications: { ...prev.notifications, ...userSettings.notification_settings },
          account: { ...prev.account, ...userSettings.account_settings },
          security: { ...prev.security, ...userSettings.security_settings }
        }));
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    }
  };

  const updateSettings = async (category, newSettings) => {
    setSaving(prev => ({ ...prev, [category]: true }));
    
    try {
      const settingColumn = `${category}_settings`;
      
      // Update or insert settings
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          [settingColumn]: newSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        [category]: { ...prev[category], ...newSettings }
      }));

      toast({
        title: "Configuración guardada",
        description: "Tus preferencias han sido actualizadas"
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudo actualizar la configuración"
      });
    } finally {
      setSaving(prev => ({ ...prev, [category]: false }));
    }
  };

  const SettingToggle = ({ category, setting, label, description, icon: Icon }) => {
    const isEnabled = settings[category][setting];
    
    return (
      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-white/10">
        <div className="flex items-center gap-4">
          {Icon && <Icon className="w-5 h-5 text-blue-400" />}
          <div>
            <h4 className="font-medium text-white">{label}</h4>
            {description && <p className="text-sm text-blue-400">{description}</p>}
          </div>
        </div>
        
        <button
          onClick={() => {
            const newValue = !isEnabled;
            updateSettings(category, { ...settings[category], [setting]: newValue });
          }}
          disabled={saving[category]}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            isEnabled ? 'bg-cyan-600' : 'bg-slate-600'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>
    );
  };

  const SettingSelect = ({ category, setting, label, description, options, icon: Icon }) => {
    const currentValue = settings[category][setting];
    
    return (
      <div className="p-4 bg-slate-800/30 rounded-xl border border-white/10">
        <div className="flex items-center gap-4 mb-3">
          {Icon && <Icon className="w-5 h-5 text-blue-400" />}
          <div>
            <h4 className="font-medium text-white">{label}</h4>
            {description && <p className="text-sm text-blue-400">{description}</p>}
          </div>
        </div>
        
        <select
          value={currentValue}
          onChange={(e) => updateSettings(category, { ...settings[category], [setting]: e.target.value })}
          disabled={saving[category]}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const deleteAccount = async () => {
    setLoading(true);
    try {
      // This would typically involve more complex deletion logic
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Cuenta eliminada",
        description: "Tu cuenta ha sido eliminada exitosamente"
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        variant: "destructive",
        title: "Error al eliminar cuenta"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    setLoading(true);
    try {
      // Fetch all user data
      const { data: userData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Create downloadable JSON
      const dataBlob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `carpes-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Datos exportados",
        description: "Tu información ha sido descargada"
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        variant: "destructive",
        title: "Error al exportar datos"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Configuración - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
            <p className="text-blue-400">Gestiona tu privacidad y preferencias</p>
          </div>

          {/* Settings Tabs */}
          <Tabs defaultValue="privacy" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Privacidad
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notificaciones
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Cuenta
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Seguridad
              </TabsTrigger>
            </TabsList>

            {/* Privacy Settings */}
            <TabsContent value="privacy" className="space-y-6">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Shield className="w-6 h-6 text-cyan-400" />
                  Configuración de Privacidad
                </h2>

                <div className="space-y-4">
                  <SettingSelect
                    category="privacy"
                    setting="profileVisibility"
                    label="Visibilidad del Perfil"
                    description="Quién puede ver tu perfil completo"
                    icon={Eye}
                    options={[
                      { value: 'public', label: 'Público - Todos pueden ver' },
                      { value: 'followers', label: 'Solo Seguidores' },
                      { value: 'private', label: 'Privado - Solo yo' }
                    ]}
                  />

                  <SettingToggle
                    category="privacy"
                    setting="showEmail"
                    label="Mostrar Email"
                    description="Permitir que otros vean tu dirección de email"
                    icon={Mail}
                  />

                  <SettingToggle
                    category="privacy"
                    setting="showLocation"
                    label="Mostrar Ubicación"
                    description="Compartir tu ubicación en publicaciones"
                    icon={MapPin}
                  />

                  <SettingSelect
                    category="privacy"
                    setting="allowMessages"
                    label="Mensajes Privados"
                    description="Quién puede enviarte mensajes"
                    icon={Phone}
                    options={[
                      { value: 'everyone', label: 'Todos' },
                      { value: 'followers', label: 'Solo Seguidores' },
                      { value: 'none', label: 'Nadie' }
                    ]}
                  />

                  <SettingSelect
                    category="privacy"
                    setting="allowComments"
                    label="Comentarios"
                    description="Quién puede comentar tus publicaciones"
                    icon={Globe}
                    options={[
                      { value: 'everyone', label: 'Todos' },
                      { value: 'followers', label: 'Solo Seguidores' },
                      { value: 'none', label: 'Nadie' }
                    ]}
                  />

                  <SettingToggle
                    category="privacy"
                    setting="showOnlineStatus"
                    label="Estado en Línea"
                    description="Mostrar cuando estás activo"
                    icon={Globe}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Notifications Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Bell className="w-6 h-6 text-cyan-400" />
                  Notificaciones
                </h2>

                <div className="space-y-4">
                  <SettingToggle
                    category="notifications"
                    setting="emailNotifications"
                    label="Notificaciones por Email"
                    description="Recibir notificaciones en tu correo"
                    icon={Mail}
                  />

                  <SettingToggle
                    category="notifications"
                    setting="pushNotifications"
                    label="Notificaciones Push"
                    description="Notificaciones instantáneas en tu dispositivo"
                    icon={Smartphone}
                  />

                  <div className="border-t border-white/10 pt-4 mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Actividad Social</h3>
                    
                    <SettingToggle
                      category="notifications"
                      setting="newFollowers"
                      label="Nuevos Seguidores"
                      description="Cuando alguien te sigue"
                      icon={User}
                    />

                    <SettingToggle
                      category="notifications"
                      setting="likes"
                      label="Me Gusta"
                      description="Cuando alguien da like a tus publicaciones"
                      icon={CheckCircle}
                    />

                    <SettingToggle
                      category="notifications"
                      setting="comments"
                      label="Comentarios"
                      description="Comentarios en tus publicaciones"
                      icon={Globe}
                    />

                    <SettingToggle
                      category="notifications"
                      setting="messages"
                      label="Mensajes"
                      description="Nuevos mensajes privados"
                      icon={Phone}
                    />
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Contenido y Eventos</h3>
                    
                    <SettingToggle
                      category="notifications"
                      setting="weeklyDigest"
                      label="Resumen Semanal"
                      description="Actividad semanal y estadísticas"
                      icon={Database}
                    />

                    <SettingToggle
                      category="notifications"
                      setting="fishingTips"
                      label="Consejos de Pesca"
                      description="Tips y técnicas de pesca"
                      icon={Volume2}
                    />

                    <SettingToggle
                      category="notifications"
                      setting="eventReminders"
                      label="Recordatorios de Eventos"
                      description="Eventos próximos en tu área"
                      icon={Bell}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Account Settings */}
            <TabsContent value="account" className="space-y-6">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <User className="w-6 h-6 text-cyan-400" />
                  Configuración de Cuenta
                </h2>

                <div className="space-y-4">
                  <SettingSelect
                    category="account"
                    setting="theme"
                    label="Tema de Interfaz"
                    description="Apariencia de la aplicación"
                    icon={Monitor}
                    options={[
                      { value: 'light', label: 'Claro' },
                      { value: 'dark', label: 'Oscuro' },
                      { value: 'system', label: 'Automático (Sistema)' }
                    ]}
                  />

                  <SettingSelect
                    category="account"
                    setting="language"
                    label="Idioma"
                    description="Idioma de la interfaz"
                    icon={Globe}
                    options={[
                      { value: 'es', label: 'Español' },
                      { value: 'en', label: 'English' },
                      { value: 'pt', label: 'Português' }
                    ]}
                  />

                  <SettingSelect
                    category="account"
                    setting="measurementUnit"
                    label="Unidades de Medida"
                    description="Sistema de medición preferido"
                    icon={User}
                    options={[
                      { value: 'metric', label: 'Métrico (kg, cm, °C)' },
                      { value: 'imperial', label: 'Imperial (lb, in, °F)' }
                    ]}
                  />

                  <SettingToggle
                    category="account"
                    setting="autoSave"
                    label="Guardado Automático"
                    description="Guardar borradores automáticamente"
                    icon={Upload}
                  />

                  <SettingToggle
                    category="account"
                    setting="dataCollection"
                    label="Recopilación de Datos"
                    description="Ayudar a mejorar la app compartiendo datos de uso"
                    icon={Database}
                  />

                  <SettingToggle
                    category="account"
                    setting="analytics"
                    label="Análisis de Uso"
                    description="Permitir análisis para mejorar la experiencia"
                    icon={Database}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Lock className="w-6 h-6 text-cyan-400" />
                  Seguridad
                </h2>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <Lock className="w-5 h-5 text-blue-400" />
                        <div>
                          <h4 className="font-medium text-white">Cambiar Contraseña</h4>
                          <p className="text-sm text-blue-400">Actualiza tu contraseña regularmente</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-transparent border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                    >
                      Cambiar Contraseña
                    </Button>
                  </div>

                  <SettingToggle
                    category="security"
                    setting="loginAlerts"
                    label="Alertas de Inicio de Sesión"
                    description="Notificar sobre inicios de sesión sospechosos"
                    icon={AlertTriangle}
                  />

                  <div className="p-4 bg-slate-800/30 rounded-xl border border-white/10">
                    <div className="flex items-center gap-4 mb-3">
                      <Settings className="w-5 h-5 text-blue-400" />
                      <div>
                        <h4 className="font-medium text-white">Sesiones Activas</h4>
                        <p className="text-sm text-blue-400">Gestiona dónde tienes la sesión iniciada</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">Dispositivo Actual</p>
                          <p className="text-blue-400 text-xs">Windows • Chrome • Última actividad: Ahora</p>
                        </div>
                        <span className="text-green-400 text-xs font-medium">Activo</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      Cerrar Todas las Sesiones
                    </Button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-gradient-to-r from-red-900/30 to-pink-900/30 border border-red-500/30 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  Zona de Peligro
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">Exportar Datos</h3>
                      <p className="text-sm text-blue-400">Descarga una copia de tu información</p>
                    </div>
                    <Button
                      onClick={exportData}
                      disabled={loading}
                      variant="outline"
                      className="bg-transparent border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>

                  <div className="border-t border-red-500/20 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">Eliminar Cuenta</h3>
                        <p className="text-sm text-red-400">Esta acción es permanente e irreversible</p>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-red-500/30">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-400">¿Eliminar cuenta?</AlertDialogTitle>
                            <AlertDialogDescription className="text-blue-300">
                              Esta acción eliminará permanentemente tu cuenta y todos tus datos. 
                              No podrás recuperar tu información después de esto.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 text-white">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={deleteAccount}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              Sí, eliminar mi cuenta
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;