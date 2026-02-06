import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Upload, Type, Palette, Bold, Italic, 
  Circle, Square, Heart, Fish, Camera, Video 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';

const CreateStoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef();
  const textAreaRef = useRef();

  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [textBold, setTextBold] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [loading, setLoading] = useState(false);

  const colors = [
    '#ffffff', '#000000', '#ff4444', '#44ff44', '#4444ff',
    '#ffff44', '#ff44ff', '#44ffff', '#ff8844', '#8844ff'
  ];

  const backgrounds = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          variant: "destructive",
          title: "Archivo muy grande",
          description: "El archivo debe ser menor a 50MB"
        });
        return;
      }

      const type = file.type.startsWith('video/') ? 'video' : 'image';
      setMediaType(type);
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleTextStory = (background) => {
    setMediaType('text');
    setMediaPreview(background);
    setShowTextEditor(true);
    // Focus on text area after animation
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 300);
  };

  const publishStory = async () => {
    if (!user?.id) return;
    
    if (!mediaFile && !textContent.trim()) {
      toast({
        variant: "destructive",
        title: "Contenido faltante",
        description: "Debes agregar contenido a tu historia"
      });
      return;
    }

    setLoading(true);

    try {
      let mediaUrl = null;

      // Upload media if exists
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop().toLowerCase();
        const fileName = `stories/${user.id}/${Date.now()}.${fileExt}`;

        console.log('Uploading story media...');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, mediaFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          // Continue without media if upload fails
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('stories')
            .getPublicUrl(fileName);

          mediaUrl = publicUrl;
        }
      }

      // Create story record con nombres correctos de columnas
      const storyData = {
        user_id: user.id,
        image_url: mediaUrl,
        content: textContent || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      console.log('Creating story...', storyData);

      const { error: insertError } = await supabase
        .from('stories')
        .insert(storyData);

      if (insertError) {
        console.error('Database error:', insertError);
        
        toast({
          variant: "destructive",
          title: "Error al crear historia",
          description: insertError.message || "No se pudo guardar la historia"
        });
        
        setLoading(false);
        return;
      }

      toast({
        title: "¡Historia publicada!",
        description: "Tu historia estará visible por 24 horas"
      });

      navigate('/feed');
    } catch (error) {
      console.error('Error publishing story:', error);
      toast({
        variant: "destructive",
        title: "Error", 
        description: error.message || "No se pudo publicar la historia"
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const StoryPreview = () => (
    <div className="relative aspect-[9/16] max-h-[70vh] bg-black rounded-2xl overflow-hidden shadow-2xl">
      {mediaType === 'text' ? (
        <div 
          className="w-full h-full flex items-center justify-center p-6"
          style={{ background: mediaPreview }}
        >
          <div className="text-center">
            <textarea
              ref={textAreaRef}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Escribe algo..."
              className="w-full bg-transparent border-none outline-none resize-none text-center"
              style={{
                color: textColor,
                fontSize: `${textSize}px`,
                fontWeight: textBold ? 'bold' : 'normal',
                height: 'auto',
                minHeight: '60px'
              }}
              rows={4}
              maxLength={200}
            />
          </div>
        </div>
      ) : mediaType === 'video' ? (
        <video 
          src={mediaPreview} 
          className="w-full h-full object-cover" 
          controls
          muted
        />
      ) : mediaType === 'image' ? (
        <img 
          src={mediaPreview} 
          alt="Preview" 
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <p className="text-white/70 text-center">
            Selecciona contenido para tu historia
          </p>
        </div>
      )}

      {/* Text overlay for media stories */}
      {(mediaType === 'image' || mediaType === 'video') && textContent && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 max-w-sm text-center"
            style={{
              color: textColor,
              fontSize: `${textSize}px`,
              fontWeight: textBold ? 'bold' : 'normal'
            }}
          >
            {textContent}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Crear Historia - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/feed')}
              className="text-white hover:bg-white/10"
            >
              <X className="w-5 h-5 mr-2" />
              Cancelar
            </Button>

            <h1 className="text-xl font-bold text-white">Crear Historia</h1>

            <Button
              onClick={publishStory}
              disabled={loading || (!mediaFile && !textContent.trim())}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {loading ? 'Publicando...' : 'Compartir'}
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Preview */}
            <div className="flex justify-center">
              <StoryPreview />
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {!mediaFile && !showTextEditor ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Elige el tipo de historia
                    </h3>

                    {/* Media Upload */}
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex flex-col items-center justify-center gap-3 text-white hover:from-blue-700 hover:to-cyan-700 transition-all group"
                      >
                        <div className="p-3 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                          <Camera className="w-8 h-8" />
                        </div>
                        <span className="font-medium">Foto/Video</span>
                      </button>

                      <button
                        onClick={() => handleTextStory(backgrounds[0])}
                        className="aspect-square bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex flex-col items-center justify-center gap-3 text-white hover:from-purple-700 hover:to-pink-700 transition-all group"
                      >
                        <div className="p-3 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                          <Type className="w-8 h-8" />
                        </div>
                        <span className="font-medium">Solo Texto</span>
                      </button>
                    </div>

                    {/* Text Background Options */}
                    <div>
                      <h4 className="text-white font-medium mb-3">Fondos de texto</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {backgrounds.map((bg, index) => (
                          <button
                            key={index}
                            onClick={() => handleTextStory(bg)}
                            className="aspect-square rounded-xl border-2 border-white/20 hover:border-cyan-400 transition-colors"
                            style={{ background: bg }}
                          />
                        ))}
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">
                        Personalizar
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview(null);
                          setMediaType('');
                          setShowTextEditor(false);
                          setTextContent('');
                        }}
                        className="text-white hover:bg-white/10"
                      >
                        Cambiar
                      </Button>
                    </div>

                    {/* Text Controls */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-200 mb-2">
                          Agregar texto
                        </label>
                        <textarea
                          value={textContent}
                          onChange={(e) => setTextContent(e.target.value)}
                          placeholder="Escribe algo..."
                          className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white placeholder-slate-400 resize-none"
                          rows={3}
                          maxLength={200}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-200 mb-2">
                            Color del texto
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {colors.map((color) => (
                              <button
                                key={color}
                                onClick={() => setTextColor(color)}
                                className={`w-8 h-8 rounded-full border-2 ${
                                  textColor === color 
                                    ? 'border-cyan-400' 
                                    : 'border-white/20'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-blue-200 mb-2">
                            Tamaño
                          </label>
                          <input
                            type="range"
                            min="16"
                            max="48"
                            value={textSize}
                            onChange={(e) => setTextSize(Number(e.target.value))}
                            className="w-full accent-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant={textBold ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTextBold(!textBold)}
                          className={textBold ? "bg-cyan-600" : ""}
                        >
                          <Bold className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Background change for text stories */}
                    {mediaType === 'text' && (
                      <div>
                        <label className="block text-sm font-medium text-blue-200 mb-2">
                          Cambiar fondo
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {backgrounds.map((bg, index) => (
                            <button
                              key={index}
                              onClick={() => setMediaPreview(bg)}
                              className={`aspect-square rounded-lg border-2 ${
                                mediaPreview === bg 
                                  ? 'border-cyan-400' 
                                  : 'border-white/20'
                              }`}
                              style={{ background: bg }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateStoryPage;