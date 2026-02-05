import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Fish, Weight, Ruler } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import LocationAutocomplete from '@/components/LocationAutocomplete';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  
  const [formData, setFormData] = useState({
    descripcion: '',
    peso: '',
    tamano: '',
    tipo_pez: 'Otro',
    ubicacion: ''
  });

  const fishTypes = ['Trucha', 'Salmón', 'Bagre', 'Carpa', 'Perca', 'Robalo', 'Dorado', 'Otro'];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.size > 15 * 1024 * 1024) { 
        toast({
          variant: "destructive",
          title: "Archivo muy grande",
          description: "Por favor selecciona una imagen o video menor a 15MB",
        });
        return;
      }
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user || !user.id) {
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: "Debes estar autenticado para publicar",
      });
      return;
    }

    if (!file) {
      toast({
        variant: "destructive",
        title: "Falta imagen",
        description: "Debes subir una foto o video de tu captura",
      });
      return;
    }

    setLoading(true);

    try {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const isVideo = file.type.startsWith('video/');
      
      let publicUrl = null;

      // Intentar subir al storage de Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Post')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        
        // Si el bucket no existe o hay error de permisos, mostrar mensaje específico
        if (uploadError.message?.includes('Bucket not found') || uploadError.statusCode === '404') {
          throw new Error('El almacenamiento no está configurado. Contacta al administrador.');
        }
        if (uploadError.message?.includes('row-level security') || uploadError.statusCode === '403') {
          throw new Error('No tienes permisos para subir archivos. Verifica tu sesión.');
        }
        throw uploadError;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('Post')
        .getPublicUrl(fileName);
      
      publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        throw new Error('No se pudo obtener la URL del archivo');
      }

      // Crear el post en la base de datos
      const { error: insertError } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          descripcion: formData.descripcion,
          foto_url: isVideo ? null : publicUrl,
          video_url: isVideo ? publicUrl : null,
          peso: formData.peso ? parseFloat(formData.peso) : null,
          tamano: formData.tamano ? parseFloat(formData.tamano) : null,
          tipo_pez: formData.tipo_pez,
          ubicacion: formData.ubicacion,
          likes_count: 0,
          comments_count: 0
        }]);

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error('Error al guardar en la base de datos: ' + insertError.message);
      }

      toast({
        title: "¡Publicado!",
        description: "Tu captura se ha compartido exitosamente.",
      });
      navigate('/feed');

    } catch (error) {
      console.error('Error completo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo crear la publicación.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Nueva Publicación - FishHub</title></Helmet>
      <div className="min-h-screen bg-slate-950 pb-20 pt-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="text-cyan-400">📸</span> Crear Publicación
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Upload Area */}
            <div 
              className={`relative border-2 border-dashed rounded-3xl p-10 transition-all ${
                preview ? 'border-cyan-500/50 bg-slate-900' : 'border-blue-800/50 hover:border-cyan-400/50 bg-slate-900/50 hover:bg-slate-900'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {preview ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50 shadow-2xl">
                  {file?.type.startsWith('video/') ? (
                      <video src={preview} className="w-full h-full object-contain" controls />
                  ) : (
                      <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                  )}
                  <button
                    type="button"
                    onClick={() => { setPreview(null); setFile(null); }}
                    className="absolute top-3 right-3 p-2 bg-red-500/80 backdrop-blur rounded-full text-white hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload className="w-10 h-10 text-cyan-400" />
                  </div>
                  <h3 className="text-xl text-white font-bold mb-2">Sube tu captura</h3>
                  <p className="text-blue-300 text-sm mb-8">Arrastra y suelta o selecciona desde tu dispositivo</p>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-lg shadow-cyan-900/20"
                  >
                    Seleccionar Archivo
                  </label>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-blue-200 mb-2">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full bg-slate-950 border border-blue-900 rounded-xl p-4 text-white placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none h-32"
                  placeholder="Cuenta la historia de tu captura..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-blue-200 mb-2 flex items-center gap-2">
                    <Fish className="w-4 h-4 text-cyan-400" /> Especie
                  </label>
                  <select
                    value={formData.tipo_pez}
                    onChange={e => setFormData({ ...formData, tipo_pez: e.target.value })}
                    className="w-full bg-slate-950 border border-blue-900 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {fishTypes.map(type => (
                      <option key={type} value={type} className="bg-slate-900">{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-blue-200 mb-2">
                    Ubicación
                  </label>
                  <LocationAutocomplete
                    value={formData.ubicacion}
                    onChange={(val) => setFormData({ ...formData, ubicacion: val })}
                    placeholder="Buscar río, lago, embalse..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-blue-200 mb-2 flex items-center gap-2">
                    <Weight className="w-4 h-4 text-cyan-400" /> Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.peso}
                    onChange={e => setFormData({ ...formData, peso: e.target.value })}
                    className="w-full bg-slate-950 border border-blue-900 rounded-xl p-3 text-white placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-blue-200 mb-2 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-cyan-400" /> Tamaño (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tamano}
                    onChange={e => setFormData({ ...formData, tamano: e.target.value })}
                    className="w-full bg-slate-950 border border-blue-900 rounded-xl p-3 text-white placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
                 <Button
                    type="button"
                    onClick={() => navigate('/feed')}
                    variant="outline"
                    className="flex-1 border-blue-800 text-blue-300 hover:bg-blue-900/50 hover:text-white py-6 rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-6 text-lg font-bold rounded-xl shadow-lg shadow-cyan-900/20"
                  >
                    {loading ? 'Publicando...' : 'Publicar Captura'}
                  </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreatePostPage;