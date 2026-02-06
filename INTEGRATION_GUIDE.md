# 🔗 Guía de Integración - Moderación en CreatePostPage

## 📌 Resumen

Esta guía explica cómo integrar el sistema de moderación automática en el flujo de creación de posts. Cuando un usuario sube una imagen, el sistema:

1. **Analiza la imagen** con IA (detecta peces vs personas)
2. **Si no hay peces**: Muestra advertencia y crea infracción
3. **Cuenta infracciones**: 1ª = ban 24h, 2ª = ban 7d, 3ª = ban permanente
4. **Bloquea el post**: Si el usuario tiene un ban activo

---

## 🎯 Flujo de Integración

```
CreatePostPage
    ↓
    User selects image
    ↓
    [NEW] onImageSelect() + analyzeImageForFish()
    ↓
    No fish detected?
    ↓ YES
    [NEW] Show ImageAnalysisWarning modal
    ↓
    User ignores warning?
    ↓ YES
    [NEW] Create Infraction via useModerationSystem
    ↓
    Check if user is banned
    ↓ YES
    [NEW] Show BanWarningModal
    ↓
    User submitting post?
    ↓
    [EXISTING] Normal post creation flow
```

---

## 📄 Pasos de Integración

### Paso 1: Importar Funciones Necesarias

En `src/pages/CreatePostPage.jsx`, agrega estos imports:

```javascript
// Análisis de imágenes
import { analyzeImageForFish } from '../lib/imageAnalysis';

// Hooks de moderación
import { 
  useCheckUserBan, 
  useCreateInfraction, 
  getBanMessage 
} from '../hooks/useModerationSystem';

// Componentes de moderación
import { 
  ImageAnalysisWarning, 
  BanWarningModal 
} from '../components/ModerationComponents';
```

### Paso 2: Agregar Estados para Moderación

```javascript
export default function CreatePostPage() {
  // ... estados existentes

  // Estados de moderación
  const [analysisWarning, setAnalysisWarning] = useState(null);
  const [showBanWarning, setShowBanWarning] = useState(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  // Hooks de moderación
  const { checkBan: checkUserBan } = useCheckUserBan();
  const { createInfraction } = useCreateInfraction();

  // ... resto del componente
}
```

### Paso 3: Crear Función de Análisis de Imagen

```javascript
const handleImageSelect = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setAnalyzeLoading(true);

  try {
    // Análisis de IA
    const analysis = await analyzeImageForFish(file);

    // Si no hay peces detectados
    if (!analysis.hasFish) {
      setAnalysisWarning({
        analysis,
        file,
      });
      setAnalyzeLoading(false);
      return;
    }

    // Si hay peces, continuar normalmente
    setImage(file);
    setAnalysisWarning(null);
  } catch (error) {
    console.error('Error analizando imagen:', error);
    toast({
      title: 'Error',
      description: 'No se pudo analizar el contenido de la imagen',
      variant: 'destructive',
    });
  } finally {
    setAnalyzeLoading(false);
  }
};
```

### Paso 4: Manejar Advertencia de Análisis

```javascript
const handleAnalysisWarningIgnore = async () => {
  try {
    // Crear infracción
    const result = await createInfraction({
      violationType: analysisWarning.analysis.violation_type,
      violationDetails: analysisWarning.analysis.details,
      detectedObjects: analysisWarning.analysis.detected_objects,
      imageData: analysisWarning.analysis.image_data || null,
    });

    if (result.success) {
      const banInfo = result.banInfo;

      // Si el usuario fue baneado
      if (banInfo) {
        setShowBanWarning({
          banMessage: getBanMessage(banInfo),
          banInfo,
        });
        setAnalysisWarning(null);
        return;
      }
    }

    // Si no hay ban (1ª vez), permitir publicar igual
    setImage(analysisWarning.file);
    setAnalysisWarning(null);

    toast({
      title: 'Advertencia',
      description: 'Tu post fue publicado pero se registró una violación',
    });
  } catch (error) {
    console.error('Error creando infracción:', error);
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    });
  }
};

const handleAnalysisWarningCancel = () => {
  setAnalysisWarning(null);
  // El campo de imagen se queda vacío
};
```

### Paso 5: Verificar Ban Antes de Publicar

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();

  // Verificar si el usuario está baneado
  const banStatus = await checkUserBan();
  if (banStatus.isBanned) {
    setShowBanWarning({
      banMessage: getBanMessage(banStatus),
      banInfo: banStatus,
    });
    return; // Bloquear publicación
  }

  // Continuar con publicación normal
  // ... resto del flujo existente
};
```

### Paso 6: Agregar Componentes de UI

En el JSX de `CreatePostPage`:

```jsx
return (
  <div>
    {/* ... contenido existente */}

    {/* Input de imagen */}
    <input
      type="file"
      accept="image/*"
      onChange={handleImageSelect}
      disabled={analyzeLoading}
      // ... otros props
    />

    {analyzeLoading && <LoadingSpinner />}

    {/* Modal de advertencia de análisis */}
    {analysisWarning && (
      <ImageAnalysisWarning
        analysis={analysisWarning.analysis}
        onIgnore={handleAnalysisWarningIgnore}
        onCancel={handleAnalysisWarningCancel}
        loading={false}
      />
    )}

    {/* Modal de ban */}
    {showBanWarning && (
      <BanWarningModal
        banMessage={showBanWarning.banMessage}
        onClose={() => setShowBanWarning(null)}
      />
    )}
  </div>
);
```

---

## 🔌 Conexión con Hooks Existentes

### `useModerationSystem.js`

Este hook proporciona:

```javascript
// Hook: useCheckUserBan()
const { checkBan, userBan } = useCheckUserBan();
const banStatus = await checkBan(); // Verifica ban actual

// Hook: useCreateInfraction()
const { createInfraction, loading } = useCreateInfraction();
const result = await createInfraction({
  violationType, // 'sin_peces' | 'persona_detectada' | 'otro'
  violationDetails, // string
  detectedObjects, // array
  imageData, // base64 o null
});
// result: { success, infraction, banInfo }

// Función helper: getBanMessage()
const message = getBanMessage(banInfo);
// Retorna: "Baneado por 24 horas" | "7 días" | "Permanentemente"
```

### `useAdminPanel.js` (Para admin ver todo)

El panel admin puede ver:

```javascript
// Todas las infracciones creadas
const { infractions } = useAdminInfractions();

// Todos los bans activos
const { bans } = useAdminActiveBans();

// Estadísticas en tiempo real
const { stats } = useAdminStatistics();
```

---

## 📊 Ejemplo Completo

```javascript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { analyzeImageForFish } from '../lib/imageAnalysis';
import { useCheckUserBan, useCreateInfraction, getBanMessage } from '../hooks/useModerationSystem';
import { ImageAnalysisWarning, BanWarningModal } from '../components/ModerationComponents';

export default function CreatePostPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkBan } = useCheckUserBan();
  const { createInfraction } = useCreateInfraction();

  // Estados
  const [image, setImage] = useState(null);
  const [analysisWarning, setAnalysisWarning] = useState(null);
  const [showBanWarning, setShowBanWarning] = useState(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  // Manejar selección de imagen
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzeLoading(true);

    try {
      const analysis = await analyzeImageForFish(file);

      if (!analysis.hasFish) {
        // Mostrar advertencia
        setAnalysisWarning({ analysis, file });
        return;
      }

      // Imagen válida
      setImage(file);
      setAnalysisWarning(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo analizar la imagen',
        variant: 'destructive',
      });
    } finally {
      setAnalyzeLoading(false);
    }
  };

  // Ignorar advertencia y crear infracción
  const handleIgnoreWarning = async () => {
    try {
      const result = await createInfraction({
        violationType: analysisWarning.analysis.violation_type,
        violationDetails: analysisWarning.analysis.details,
        detectedObjects: analysisWarning.analysis.detected_objects,
      });

      if (result.banInfo) {
        // Usuario fue baneado
        setShowBanWarning({
          banMessage: getBanMessage(result.banInfo),
          banInfo: result.banInfo,
        });
      } else {
        // 1ª infracción, permitir publicar
        setImage(analysisWarning.file);
      }

      setAnalysisWarning(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Verificar ban antes de publicar
  const handleSubmit = async (e) => {
    e.preventDefault();

    const banStatus = await checkBan();
    if (banStatus.isBanned) {
      setShowBanWarning({
        banMessage: getBanMessage(banStatus),
        banInfo: banStatus,
      });
      return;
    }

    // Publicar post normalmente
    // ... resto del código
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        disabled={analyzeLoading}
      />

      {analysisWarning && (
        <ImageAnalysisWarning
          analysis={analysisWarning.analysis}
          onIgnore={handleIgnoreWarning}
          onCancel={() => setAnalysisWarning(null)}
        />
      )}

      {showBanWarning && (
        <BanWarningModal
          banMessage={showBanWarning.banMessage}
          onClose={() => setShowBanWarning(null)}
        />
      )}

      <button onClick={handleSubmit}>Publicar</button>
    </div>
  );
}
```

---

## 🧪 Pruebas

### Test 1: Imagen sin peces

1. Sube una foto de una persona o documento
2. Verás modal de advertencia
3. Haz clic en "Ignoreir Advertencia"
4. Se crea infracción
5. Post se publica igual (1ª vez)

### Test 2: Segunda infracción

1. Repite Test 1
2. Segunda vez: Ves ban warning
3. 24 horas de ban

### Test 3: Ver en Admin Panel

1. Como admin, ve a `/admin`
2. Ve la infracción en pestaña "Infracciones"
3. Ve el ban en "Bans Activos"

### Test 4: Levantar Ban

1. En admin panel, "Bans Activos"
2. Haz clic en ♻️ para levantar ban
3. Usuario puede publicar de nuevo

---

## 🔒 Variables de Entorno Necesarias

```env
# Para Google Vision
REACT_APP_GOOGLE_VISION_API_KEY=your_key_here

# O para Clarifai
REACT_APP_CLARIFAI_PAT=your_token_here

# O usa local (sin API key)
```

---

## ❌ Problemas Comunes

### "analyzeImageForFish no responde"

**Causa**: La API key no está configurada o no es válida
**Solución**:
1. Verifica `.env.local`
2. Reinicia servidor (`npm run dev`)
3. Revisa consola para errores

### "Infracción no se crea"

**Causa**: `useModerationSystem` no está inicializado
**Solución**:
1. Verifica que `setup-moderation.sql` está ejecutado
2. Verifica que el usuario autenticado existe en `profiles`

### "BanWarningModal no aparece"

**Causa**: `showBanWarning` estado no se actualiza correctamente
**Solución**:
1. Verifica console.log en handleIgnoreWarning
2. Verifica que `result.banInfo` existe

---

## 📚 Archivos Relacionados

```
src/
├── pages/CreatePostPage.jsx              ← Modificar aquí
├── lib/imageAnalysis.js                  ← Ya implementado
├── hooks/useModerationSystem.js          ← Ya implementado
└── components/ModerationComponents.jsx   ← Ya implementado
```

---

## ✅ Checklist Final

- [ ] Importar todas las funciones necesarias
- [ ] Agregar estados de moderación
- [ ] Implementar handleImageSelect() con análisis
- [ ] Implementar handleIgnoreWarning()
- [ ] Implementar verificación de ban en handleSubmit()
- [ ] Agregar UI componentes (warning modals)
- [ ] Configurar variables de entorno
- [ ] Probar flujos completos
- [ ] Verificar en admin panel

---

**Este es el "glue" final que conecta todo el sistema de moderación**

Última actualización: Enero 2025
