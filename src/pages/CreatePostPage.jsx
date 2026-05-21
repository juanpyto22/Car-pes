import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Fish, Weight, Ruler, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { usePosts } from '@/hooks/usePosts';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import LocationAutocomplete from '@/components/LocationAutocomplete';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { uploadImage } = useImageUpload();
  const { createPost } = usePosts();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]); // Array de archivos
  const [previews, setPreviews] = useState([]); // Array de previews
  const [currentIndex, setCurrentIndex] = useState(0); // Índice actual del carrusel
  
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
    addImage(selectedFile);
  };

  const addImage = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.size > 15 * 1024 * 1024) { 
        toast({
          variant: "destructive",
          title: "Archivo muy grande",
          description: "Por favor selecciona una imagen menor a 15MB",
        });
        return;
      }

      if (files.length >= 10) {
        toast({
          variant: "destructive",
          title: "Máximo de imágenes",
          description: "Puedes subir máximo 10 imágenes",
        });
        return;
      }

      const url = URL.createObjectURL(selectedFile);
      setFiles([...files, selectedFile]);
      setPreviews([...previews, url]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      addImage(e.dataTransfer.files[0]);
    }
  };

  const removeImage = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    if (currentIndex >= newFiles.length && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? previews.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === previews.length - 1 ? 0 : prev + 1));
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

    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "Falta imagen",
        description: "Debes subir al menos una foto",
      });
      return;
    }

    setLoading(true);

    try {
      // Subir todas las imágenes
      const uploadPromises = files.map(file => uploadImage(file, 'posts', user.id));
      const uploadResults = await Promise.all(uploadPromises);
      
      // Verificar que todas las subidas fueron exitosas
      const failedUploads = uploadResults.filter(r => !r.success);
      if (failedUploads.length > 0) {
        throw new Error('Error subiendo algunas imágenes');
      }

      // Extraer las URLs
      const imageUrls = uploadResults.map(r => r.url);

      // Crear el post con array de imágenes como JSON string
      const result = await createPost({
        descripcion: formData.descripcion,
        foto_url: imageUrls[0], // Mantener la primera para compatibilidad
        image_urls: JSON.stringify(imageUrls), // Guardar todas como JSON
        ubicacion: formData.ubicacion,
        tipo_pez: formData.tipo_pez !== 'Otro' ? formData.tipo_pez : null,
        peso: formData.peso || null,
        tamano: formData.tamano || null
      });

      if (!result.success) {
        throw new Error(result.error || 'Error creando post');
      }

      toast({
        title: "✅ ¡Post publicado!",
        description: `Tu captura con ${files.length} foto${files.length > 1 ? 's' : ''} ha sido compartida`,
      });

      navigate('/feed');
    } catch (error) {
      console.error('Error creando post:', error);
      toast({
        variant: "destructive",
        title: "Error al publicar",
        description: error.message || "No se pudo publicar tu post. Intenta de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Nueva Publicación - Car-Pes</title></Helmet>
      <div className="min-h-screen bg-slate-950 pb-20 pt-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="text-cyan-400">📸</span> Crear Publicación
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Upload Area - Carrusel */}
            <div 
              className={`relative border-2 border-dashed rounded-3xl p-10 transition-all ${
                previews.length > 0 ? 'border-cyan-500/50 bg-slate-900' : 'border-blue-800/50 hover:border-cyan-400/50 bg-slate-900/50 hover:bg-slate-900'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {previews.length > 0 ? (
                <div className="space-y-4">
                  {/* Carrusel */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50 shadow-2xl group">
                    <img 
                      src={previews[currentIndex]} 
                      alt={`Preview ${currentIndex + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                    
                    {/* Overlay con contador */}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur rounded-lg px-3 py-1.5 text-sm font-bold text-white">
                      {currentIndex + 1}/{previews.length}
                    </div>

                    {/* Flechas de navegación */}
                    {previews.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={goToPrevious}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 backdrop-blur rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          type="button"
                          onClick={goToNext}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 backdrop-blur rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}

                    {/* Botón eliminar imagen actual */}
                    <button
                      type="button"
                      onClick={() => removeImage(currentIndex)}
                      className="absolute top-3 right-16 p-2 bg-red-500/80 backdrop-blur rounded-full text-white hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Miniaturas */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {previews.map((preview, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentIndex 
                            ? 'border-cyan-400 shadow-lg shadow-cyan-500/50' 
                            : 'border-slate-600 hover:border-cyan-400'
                        }`}
                      >
                        <img src={preview} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}

                    {/* Botón agregar más fotos */}
                    {previews.length < 10 && (
                      <label
                        className="flex-shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-cyan-500/50 bg-slate-800/50 hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-all hover:border-cyan-400"
                      >
                        <Upload className="w-6 h-6 text-cyan-400" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload className="w-10 h-10 text-cyan-400" />
                  </div>
                  <h3 className="text-xl text-white font-bold mb-2">Sube tus capturas</h3>
                  <p className="text-blue-300 text-sm mb-2">Puedes subir hasta 10 fotos</p>
                  <p className="text-blue-400 text-xs mb-8 opacity-75">Arrastra y suelta o selecciona desde tu dispositivo</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-lg shadow-cyan-900/20"
                  >
                    Seleccionar Fotos
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