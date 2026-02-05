import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Save, X, Lock, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Helmet } from 'react-helmet';

const EditProfilePage = () => {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    nombre: '',
    bio: '',
    ubicacion: '',
    is_private: false,
  });
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        nombre: profile.nombre || '',
        bio: profile.bio || '',
        ubicacion: profile.ubicacion || '',
        is_private: profile.is_private || false,
      });
      setPreviewUrl(profile.foto_perfil || '');
    }
  }, [profile]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
             toast({
                variant: "destructive",
                title: "Archivo muy grande",
                description: "Máximo 5MB"
             });
             return;
        }
        setPhotoFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let photoUrl = profile.foto_perfil;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop().toLowerCase();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        // Intentar subir a avatars, si falla intentar con posts bucket
        let uploadError = null;
        let usedBucket = 'avatars';
        
        const { error: avatarError } = await supabase.storage
          .from('avatars')
          .upload(fileName, photoFile, { cacheControl: '3600', upsert: false });

        if (avatarError) {
          // Si el bucket avatars no existe, usar el bucket posts
          console.warn('Bucket avatars no disponible, intentando con posts:', avatarError);
          usedBucket = 'posts';
          
          const { error: postsError } = await supabase.storage
            .from('posts')
            .upload(`avatars/${fileName}`, photoFile, { cacheControl: '3600', upsert: false });
          
          if (postsError) {
            throw new Error('No se pudo subir la imagen. Verifica que el almacenamiento esté configurado.');
          }
        }

        // Obtener URL pública del bucket correcto
        const { data: urlData } = supabase.storage
          .from(usedBucket)
          .getPublicUrl(usedBucket === 'avatars' ? fileName : `avatars/${fileName}`);
          
        photoUrl = urlData?.publicUrl;
        
        if (!photoUrl) {
          throw new Error('No se pudo obtener la URL de la imagen');
        }
      }

      await updateProfile({
        nombre: formData.nombre,
        bio: formData.bio,
        ubicacion: formData.ubicacion,
        foto_perfil: photoUrl,
        is_private: formData.is_private
      });
      
      navigate('/profile');
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron guardar los cambios"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Editar Perfil - Car-Pes</title></Helmet>
      <div className="min-h-screen bg-slate-950 pb-20 pt-8 px-4">
        <div className="max-w-xl mx-auto bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/5 p-6 md:p-10 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold text-white">Editar Perfil</h1>
              <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="text-blue-400 hover:text-white hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
              </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                      <Avatar className="w-32 h-32 border-4 border-slate-800 shadow-xl">
                          <AvatarImage src={previewUrl} className="object-cover" />
                          <AvatarFallback className="text-4xl bg-blue-900 text-cyan-200 font-bold">{formData.nombre[0]}</AvatarFallback>
                      </Avatar>
                      <label 
                          htmlFor="photo-upload" 
                          className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                      >
                          <Camera className="w-8 h-8 text-white" />
                      </label>
                      <input 
                          id="photo-upload" 
                          type="file" 
                          accept="image/*" 
                          onChange={handlePhotoChange} 
                          className="hidden" 
                      />
                  </div>
                  <p className="text-sm text-cyan-400 font-medium">Cambiar foto de perfil</p>
              </div>

              {/* Fields */}
              <div className="space-y-5">
                  <div>
                      <label className="block text-sm font-bold text-blue-200 mb-2">Nombre para mostrar</label>
                      <input
                          type="text"
                          value={formData.nombre}
                          onChange={e => setFormData({...formData, nombre: e.target.value})}
                          className="w-full bg-slate-950 border border-blue-900 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                          placeholder="Tu nombre"
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-blue-200 mb-2">Biografía</label>
                      <textarea
                          value={formData.bio}
                          onChange={e => setFormData({...formData, bio: e.target.value})}
                          maxLength={160}
                          rows={3}
                          className="w-full bg-slate-950 border border-blue-900 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none transition-all"
                          placeholder="Cuéntanos sobre ti..."
                      />
                      <div className="text-right text-xs text-blue-500 mt-1">
                          {formData.bio.length}/160
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-blue-200 mb-2">Ubicación</label>
                      <input
                          type="text"
                          value={formData.ubicacion}
                          onChange={e => setFormData({...formData, ubicacion: e.target.value})}
                          className="w-full bg-slate-950 border border-blue-900 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                          placeholder="¿Dónde pescas?"
                      />
                  </div>

                  {/* Privacidad de cuenta */}
                  <div className="pt-4 border-t border-blue-900/50">
                      <label className="block text-sm font-bold text-blue-200 mb-4">Privacidad de la cuenta</label>
                      <div className="space-y-3">
                          <button
                              type="button"
                              onClick={() => setFormData({...formData, is_private: false})}
                              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                  !formData.is_private 
                                      ? 'bg-cyan-600/20 border-cyan-500 text-white' 
                                      : 'bg-slate-950 border-blue-900 text-blue-300 hover:border-blue-700'
                              }`}
                          >
                              <Globe className={`w-5 h-5 ${!formData.is_private ? 'text-cyan-400' : 'text-blue-500'}`} />
                              <div className="text-left">
                                  <p className="font-bold">Cuenta Pública</p>
                                  <p className="text-sm opacity-70">Cualquiera puede ver tus publicaciones y seguirte</p>
                              </div>
                          </button>
                          <button
                              type="button"
                              onClick={() => setFormData({...formData, is_private: true})}
                              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                  formData.is_private 
                                      ? 'bg-cyan-600/20 border-cyan-500 text-white' 
                                      : 'bg-slate-950 border-blue-900 text-blue-300 hover:border-blue-700'
                              }`}
                          >
                              <Lock className={`w-5 h-5 ${formData.is_private ? 'text-cyan-400' : 'text-blue-500'}`} />
                              <div className="text-left">
                                  <p className="font-bold">Cuenta Privada</p>
                                  <p className="text-sm opacity-70">Aprueba quién puede seguirte y ver tus publicaciones</p>
                              </div>
                          </button>
                      </div>
                  </div>
              </div>

              <div className="flex gap-4 pt-4">
                  <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate('/profile')}
                      className="flex-1 border-blue-800 text-blue-300 hover:bg-blue-900/50 hover:text-white rounded-xl py-6"
                  >
                      Cancelar
                  </Button>
                  <Button 
                      type="submit" 
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 rounded-xl py-6 font-bold shadow-lg shadow-cyan-900/20"
                  >
                      {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar</>}
                  </Button>
              </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditProfilePage;