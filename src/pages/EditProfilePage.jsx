import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Save, X, ShieldCheck, Building2, BadgeCheck, AlertCircle, Clock3 } from 'lucide-react';
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
  });
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [proRequest, setProRequest] = useState(null);
  const [loadingPro, setLoadingPro] = useState(false);
  const [proForm, setProForm] = useState({
    business_name: '',
    business_type: 'tienda',
    legal_name: '',
    tax_id: '',
    contact_phone: '',
    website: '',
    business_address: '',
    docs_url: '',
    validation_notes: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        nombre: profile.nombre || '',
        bio: profile.bio || '',
        ubicacion: profile.ubicacion || '',
      });
      setPreviewUrl(profile.foto_perfil || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchProRequest = async () => {
      setLoadingPro(true);
      try {
        const { data, error } = await supabase
          .from('pro_verification_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          if (error.code !== '42P01') {
            console.error('Error cargando solicitud pro:', error);
          }
          return;
        }

        setProRequest(data || null);
        if (data) {
          setProForm({
            business_name: data.business_name || '',
            business_type: data.business_type || 'tienda',
            legal_name: data.legal_name || '',
            tax_id: data.tax_id || '',
            contact_phone: data.contact_phone || '',
            website: data.website || '',
            business_address: data.business_address || '',
            docs_url: data.docs_url || '',
            validation_notes: data.validation_notes || '',
          });
        }
      } catch (err) {
        console.error('Error cargando solicitud pro:', err);
      } finally {
        setLoadingPro(false);
      }
    };

    fetchProRequest();
  }, [user?.id]);

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
        foto_perfil: photoUrl
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

  const handleSubmitProRequest = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!user?.id) return;

    const required = [
      { key: 'business_name', label: 'Nombre comercial' },
      { key: 'legal_name', label: 'Razón social' },
      { key: 'tax_id', label: 'CIF/NIF' },
      { key: 'contact_phone', label: 'Teléfono de contacto' },
      { key: 'website', label: 'Web o red social profesional' },
      { key: 'business_address', label: 'Dirección de negocio' },
    ];

    const missing = required.find((item) => !`${proForm[item.key] || ''}`.trim());
    if (missing) {
      toast({
        variant: 'destructive',
        title: 'Información incompleta',
        description: `Falta: ${missing.label}`,
      });
      return;
    }

    try {
      const payload = {
        user_id: user.id,
        business_name: proForm.business_name.trim(),
        business_type: proForm.business_type,
        legal_name: proForm.legal_name.trim(),
        tax_id: proForm.tax_id.trim(),
        contact_phone: proForm.contact_phone.trim(),
        website: proForm.website.trim(),
        business_address: proForm.business_address.trim(),
        docs_url: proForm.docs_url.trim() || null,
        validation_notes: proForm.validation_notes.trim() || null,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('pro_verification_requests')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        if (error.code === '42P01') {
          toast({
            variant: 'destructive',
            title: 'Falta configurar verificación Pro',
            description: 'Ejecuta setup-pro-verification.sql en Supabase para activar esta funcionalidad.',
          });
          return;
        }
        throw error;
      }

      setProRequest(data);
      toast({
        title: 'Solicitud Pro enviada',
        description: 'Revisaremos tu información empresarial para validar tu cuenta.',
      });
    } catch (err) {
      console.error('Error enviando solicitud pro:', err);
      toast({
        variant: 'destructive',
        title: 'No se pudo enviar la solicitud',
        description: err.message || 'Inténtalo de nuevo.',
      });
    }
  };

  const proStatusLabel =
    proRequest?.status === 'approved'
      ? 'Aprobado'
      : proRequest?.status === 'rejected'
        ? 'Rechazado'
        : proRequest?.status === 'pending'
          ? 'Pendiente'
          : 'Sin solicitud';

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

              </div>

                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 md:p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-cyan-300" /> Perfil Pro para Tiendas/Guías
                        </h2>
                        <p className="text-xs text-blue-200/70 mt-1">Solicita validación empresarial para obtener distintivo Pro y analíticas avanzadas.</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${
                      proRequest?.status === 'approved'
                        ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                        : proRequest?.status === 'rejected'
                        ? 'text-red-300 border-red-500/30 bg-red-500/10'
                        : proRequest?.status === 'pending'
                          ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                          : 'text-blue-300 border-blue-500/30 bg-blue-500/10'
                      }`}>
                        {proRequest?.status === 'approved' ? <BadgeCheck className="w-3.5 h-3.5" /> : proRequest?.status === 'pending' ? <Clock3 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {proStatusLabel}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-blue-200 mb-1.5">Nombre comercial *</label>
                          <input
                            type="text"
                            value={proForm.business_name}
                            onChange={(e) => setProForm((prev) => ({ ...prev, business_name: e.target.value }))}
                            className="w-full bg-slate-950 border border-blue-900 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Ej: Tienda Carpes Madrid"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-200 mb-1.5">Tipo de negocio *</label>
                          <select
                            value={proForm.business_type}
                            onChange={(e) => setProForm((prev) => ({ ...prev, business_type: e.target.value }))}
                            className="w-full bg-slate-950 border border-blue-900 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="tienda">Tienda</option>
                            <option value="guia">Guía</option>
                            <option value="club">Club/Asociación</option>
                            <option value="empresa">Empresa</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-200 mb-1.5">Razón social *</label>
                          <input
                            type="text"
                            value={proForm.legal_name}
                            onChange={(e) => setProForm((prev) => ({ ...prev, legal_name: e.target.value }))}
                            className="w-full bg-slate-950 border border-blue-900 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Nombre legal de la empresa"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-200 mb-1.5">CIF/NIF *</label>
                          <input
                            type="text"
                            value={proForm.tax_id}
                            onChange={(e) => setProForm((prev) => ({ ...prev, tax_id: e.target.value }))}
                            className="w-full bg-slate-950 border border-blue-900 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Ej: B12345678"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-200 mb-1.5">Teléfono *</label>
                          <input
                            type="text"
                            value={proForm.contact_phone}
                            onChange={(e) => setProForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
                            className="w-full bg-slate-950 border border-blue-900 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Contacto de empresa"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-200 mb-1.5">Web / red profesional *</label>
                          <input
                            type="text"
                            value={proForm.website}
                            onChange={(e) => setProForm((prev) => ({ ...prev, website: e.target.value }))}
                            className="w-full bg-slate-950 border border-blue-900 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-blue-200 mb-1.5">Dirección de negocio *</label>
                        <input
                          type="text"
                          value={proForm.business_address}
                          onChange={(e) => setProForm((prev) => ({ ...prev, business_address: e.target.value }))}
                          className="w-full bg-slate-950 border border-blue-900 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="Dirección fiscal/comercial"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-blue-200 mb-1.5">URL documento (opcional)</label>
                          <input
                            type="text"
                            value={proForm.docs_url}
                            onChange={(e) => setProForm((prev) => ({ ...prev, docs_url: e.target.value }))}
                            className="w-full bg-slate-950 border border-blue-900 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Enlace a documento justificativo"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-200 mb-1.5">Notas de validación (opcional)</label>
                          <input
                            type="text"
                            value={proForm.validation_notes}
                            onChange={(e) => setProForm((prev) => ({ ...prev, validation_notes: e.target.value }))}
                            className="w-full bg-slate-950 border border-blue-900 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Información adicional"
                          />
                        </div>
                      </div>

                      <Button
                          type="button"
                          onClick={handleSubmitProRequest}
                        disabled={loadingPro}
                        className="w-full bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl"
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        {loadingPro ? 'Cargando...' : 'Enviar solicitud de validación Pro'}
                      </Button>
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