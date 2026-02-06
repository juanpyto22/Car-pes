# Configuración del Sistema de Moderación

## Variables de Entorno Necesarias

Copia estas variables a tu archivo `.env.local`:

```bash
# ========================================
# Supabase Configuration
# ========================================
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ========================================
# Sistema de Moderación Automática
# Elige UNA opción de análisis de imágenes
# ========================================

# OPCIÓN 1: Google Cloud Vision API (Recomendado)
REACT_APP_GOOGLE_VISION_API_KEY=AIzaSyD...

# OPCIÓN 2: Clarifai API (Alternativa)
REACT_APP_CLARIFAI_PAT=62371a8f8bdb4e45a8e8f...
REACT_APP_CLARIFAI_USER_ID=your_user_id
REACT_APP_CLARIFAI_APP_ID=your_app_id

# OPCIÓN 3: TensorFlow.js Local
# (No requiere configuración, instala solo las dependencias)

# ========================================
# Configuración de Moderación
# ========================================
REACT_APP_FISH_CONFIDENCE_THRESHOLD=0.5
REACT_APP_MAX_VIOLATIONS_BEFORE_BAN=3
REACT_APP_BAN_24H_DURATION=24
REACT_APP_BAN_7D_DURATION=168
REACT_APP_MODERATION_DEBUG=false
REACT_APP_LOG_IMAGE_ANALYSIS=true
```

## Pasos de Instalación

1. **Crear tablas en Supabase**:
   - SQL Editor → Copiar contenido de `setup-moderation.sql` → Ejecutar

2. **Instalar dependencias**:
   ```bash
   npm install
   # Si usas modelo local:
   npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
   ```

3. **Configurar API (elige una)**:
   - Google Vision: https://console.cloud.google.com
   - Clarifai: https://clarifai.com
   - Local: Solo instala dependencias

4. **Actualizar CreatePostPage** con el código de integración

5. **Testear** el flujo completo

## Más información

Ver `MODERACION_SISTEMA_COMPLETO.md` para documentación completa.
