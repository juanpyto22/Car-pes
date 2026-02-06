import { supabase } from '@/lib/customSupabaseClient';

export const useImageUpload = () => {
  const uploadImage = async (file, bucket = 'posts', folder = '') => {
    try {
      if (!file) throw new Error('No file provided');

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Subir archivo
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  const deleteImage = async (path, bucket = 'posts') => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting image:', error);
      return { success: false, error: error.message };
    }
  };

  return { uploadImage, deleteImage };
};