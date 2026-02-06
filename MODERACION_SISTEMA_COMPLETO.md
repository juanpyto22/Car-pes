# 🎣 Sistema de Moderación Automática - Car-Pes

## Descripción General

Sistema de moderación automática que asegura que **TODAS las publicaciones sean SOLO fotos de peces capturados**. Utiliza IA para detectar automáticamente imágenes que no contienen peces y aplica un sistema de baneos escalonado:

- **1ª Infracción**: Baneo de 24 horas
- **2ª Infracción**: Baneo de 7 días  
- **3ª Infracción**: Baneo permanente

---

## Arquitectura

### 1. Base de Datos (Supabase)

```sql
-- Tablas principales:
user_infractions  → Registro de todas las infracciones
user_bans         → Registro de bans automáticos
```

**Campos importantes:**
- `violation_type`: Tipo de violación (invalid_image, no_fish)
- `detected_objects`: Array de objetos detectados por IA
- `confidence`: Confianza del análisis (0-1)
- `ban_type`: Tipo de ban (temporary_24h, temporary_7d, permanent)

### 2. Funciones SQL

- `check_user_ban(user_id)` → Verifica si usuario está baneado
- `create_user_infraction(...)` → Crea infracción y ban automático
- `get_user_violation_summary(user_id)` → Obtiene resumen de infracciones
- `cleanup_expired_bans()` → Limpia bans expirados

### 3. API de Visión por Computadora

El sistema soporta 3 opciones:

#### Opción A: Google Cloud Vision API (Recomendado)
```env
REACT_APP_GOOGLE_VISION_API_KEY=your_key_here
```

#### Opción B: Clarifai API (Especializado en peces)
```env
REACT_APP_CLARIFAI_PAT=your_pat_here
REACT_APP_CLARIFAI_USER_ID=your_user_id
REACT_APP_CLARIFAI_APP_ID=your_app_id
```

#### Opción C: Modelo Local TensorFlow.js (Sin API calls)
```bash
npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
```

---

## Instalación

### Step 1: Crear tablas en Supabase

1. Abre tu proyecto en Supabase
2. Ve a SQL Editor
3. Copia el contenido de `setup-moderation.sql`
4. Ejecuta el script

```bash
# O usa la CLI:
supabase db push setup-moderation.sql
```

### Step 2: Instalar dependencias

```bash
npm install
# Si usas modelo local:
npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
```

### Step 3: Configurar variables de entorno

Crea `.env.local`:

```env
# Google Vision API (Opción A - Recomendada)
REACT_APP_GOOGLE_VISION_API_KEY=AIzaSyD...

# O Clarifai (Opción B)
REACT_APP_CLARIFAI_PAT=62371a8f...
REACT_APP_CLARIFAI_USER_ID=your_user_id
REACT_APP_CLARIFAI_APP_ID=your_app_id

# Supabase
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
```

### Step 4: Importar en CreatePostPage

```javascript
import { analyzeImageForFish } from '@/lib/imageAnalysis';
import { useCheckUserBan, useCreateInfraction } from '@/hooks/useModerationSystem';
import { BanWarningModal, ImageAnalysisWarning } from '@/components/ModerationComponents';
```

---

## Flujo de Publicación

```
Usuario intenta publicar foto
    ↓
[1] Verificar si está baneado
    ├─ Sí → Mostrar BanWarningModal
    └─ No → Continuar
    ↓
[2] Analizar imagen con IA
    ├─ Se detectó pez → Permitir publicación
    ├─ NO se detectó pez → Mostrar ImageAnalysisWarning
    │   ├─ Usuario ignora → Crear infracción + Ban automático
    │   └─ Usuario cambia foto → Volver a [2]
    └─ Error en análisis → Permitir (fallback seguro)
    ↓
[3] Crear post
    ├─ Éxito → Toast de éxito
    └─ Error → Toast de error
```

---

## Uso en Componentes

### Verificar si usuario está baneado

```javascript
import { useCheckUserBan } from '@/hooks/useModerationSystem';

const { isBanned, banInfo, loading } = useCheckUserBan(userId);

if (isBanned) {
  return <BanWarningModal isOpen={true} banInfo={banInfo} />;
}
```

### Analizar imagen

```javascript
import { analyzeImageForFish } from '@/lib/imageAnalysis';

const result = await analyzeImageForFish(imageUrl);

if (!result.hasFish) {
  // Mostrar advertencia y dar opción de cambiar foto
  // O crear infracción si el usuario continúa
}
```

### Crear infracción

```javascript
import { useCreateInfraction } from '@/hooks/useModerationSystem';

const { createInfraction } = useCreateInfraction();

const result = await createInfraction(
  userId,
  'no_fish',
  'No se detectó un pez en la imagen',
  imageUrl,
  detectedObjects,
  confidence
);

if (result.newBan) {
  console.log(`Ban aplicado: ${result.banType}`);
  // Mostrar BanWarningModal
}
```

---

## Ejemplo Completo: CreatePostPage

```javascript
import { useState, useEffect } from 'react';
import { analyzeImageForFish } from '@/lib/imageAnalysis';
import { useCheckUserBan, useCreateInfraction } from '@/hooks/useModerationSystem';
import { BanWarningModal, ImageAnalysisWarning } from '@/components/ModerationComponents';

export const CreatePostPage = () => {
  const { user } = useAuth();
  const { isBanned, banInfo } = useCheckUserBan(user?.id);
  const { createInfraction } = useCreateInfraction();
  
  const [imageUrl, setImageUrl] = useState('');
  const [showImageWarning, setShowImageWarning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleImageSelect = async (image) => {
    setImageUrl(image);
    
    // Analizar imagen
    const result = await analyzeImageForFish(image);
    setAnalysisResult(result);
    
    if (!result.hasFish) {
      setShowImageWarning(true);
    }
  };

  const handleContinueAnyway = async () => {
    // Crear infracción
    const result = await createInfraction(
      user.id,
      'no_fish',
      'Imagen sin pez detectado',
      imageUrl,
      analysisResult.objects,
      analysisResult.confidence
    );

    if (result.newBan) {
      // El usuario fue baneado, mostrar modal
      window.location.reload(); // Recargar para actualizar estado
    }
    
    setShowImageWarning(false);
  };

  const handlePublish = async () => {
    if (isBanned) return; // No permitir publicar si está baneado
    
    // Crear post...
    // POST a /posts con imageUrl
  };

  return (
    <>
      <BanWarningModal 
        isOpen={isBanned} 
        banInfo={banInfo}
      />
      
      <ImageAnalysisWarning
        isOpen={showImageWarning}
        onRetry={() => {
          setShowImageWarning(false);
          // Abrir selector de imagen
        }}
        onIgnore={handleContinueAnyway}
      />

      {/* Formulario de publicación */}
    </>
  );
};
```

---

## Admin Dashboard

Para monitorear infracciones:

```javascript
import { supabase } from '@/lib/customSupabaseClient';

const fetchInfractions = async () => {
  const { data } = await supabase
    .from('user_infractions')
    .select('*, user:profiles(username, email)')
    .order('created_at', { ascending: false });
  
  return data;
};

const fetchActiveBans = async () => {
  const { data } = await supabase
    .from('user_bans')
    .select('*, user:profiles(username, email)')
    .eq('is_active', true)
    .order('ban_started_at', { ascending: false });
  
  return data;
};
```

---

## Seguridad y Privacidad

- ✅ RLS (Row Level Security) habilitado en todas las tablas
- ✅ Solo el usuario y admins pueden ver infracciones
- ✅ Las datos de análisis de imagen se guardan para auditoría
- ✅ Bans se limpian automáticamente cuando expiran
- ✅ API calls se hacen desde el frontend (se puede mover a backend)

---

## Configuración Recomendada

### Para máxima precisión: Google Cloud Vision API
```
- Mejor reconocimiento de objetos
- Detecta personas + peces
- Requiere API key ($0.15 por 1000 imágenes)
```

### Para máxima privacidad: TensorFlow.js Local
```
- Sin enviar imágenes a externos
- Funciona offline
- Menos preciso pero aceptable
```

### Para mejor relación: Clarifai API
```
- Especializado en visión
- Buen balance precio/precisión
- 5000 imágenes gratis/mes
```

---

## Tests Recomendados

```javascript
import { test } from 'vitest';
import { analyzeImageForFish } from '@/lib/imageAnalysis';

test('Detecta peces en imagen', async () => {
  const result = await analyzeImageForFish(fishImageUrl);
  expect(result.hasFish).toBe(true);
});

test('Rechaza imagen sin peces', async () => {
  const result = await analyzeImageForFish(notFishImageUrl);
  expect(result.hasFish).toBe(false);
});

test('Aplica ban correcto por infracciones', async () => {
  // Test ban progression: 24h → 7d → permanent
});
```

---

## Troubleshooting

**P: Las imágenes no se analizan**
- Verifica que tengas API key configurada
- Revisa la consola para errores
- Prueba con URL pública de imagen

**P: Los bans no se aplican**
- Ejecuta `cleanup_expired_bans()` manualmente
- Verifica que la infracción se creó (tabla user_infractions)
- Revisa los logs de Supabase

**P: El sistema es demasiado strict**
- Ajusta `confidence` threshold en imageAnalysis.js
- Añade palabras clave específicas de tu región
- Usa un modelo más permisivo

---

## Roadmap Futuro

- [ ] Panel de admin para gestionar bans
- [ ] Appeals system para bans permanentes
- [ ] Machine learning para mejorar detección
- [ ] Notificaciones por email de bans
- [ ] Estadísticas de violaciones
- [ ] Sistema de warnings antes de ban

---

**Versión**: 1.0  
**Última actualización**: Feb 2026  
**Estado**: ✅ Producción
