# 🚀 INICIO RÁPIDO - MAPAS DE PESCA CAR-PES

## ⚡ Comienza en 3 minutos

### Paso 1: Verifica que todo está instalado
```bash
# En tu terminal, dentro de la carpeta del proyecto
npm list leaflet react-leaflet

# Deberías ver ambas librerías listadas
# Si no ves una, ambas ya están instaladas ✅
```

### Paso 2: Inicia el servidor
```bash
npm run dev

# Deberías ver:
# VITE v4.x.x  ready in xxx ms
# ➜  Local:   http://localhost:3000
```

### Paso 3: Abre el mapa
```
Visita: http://localhost:3000/mapa-spots

Si no existe esa ruta, agrega a tu App.jsx:
<Route path="/mapa-spots" element={<FishingMapsPage />} />
```

---

## ✨ Primeras acciones

### 1. Permiso de ubicación
La aplicación pedirá permiso para acceder a tu ubicación. **Haz clic en "Permitir"** para:
- Ver tu posición en rojo
- Auto-centrar el mapa
- Calcular distancias

### 2. Explora España
Verás +80 marcadores de colores:
- 🟢 Verde = Ríos
- 🔵 Azul = Embalses y lagos
- 🟣 Violeta = Mares
- 🏕️ Parques

### 3. Busca un lugar
Escribe en la barra superior:
```
Ejemplos:
- "Ebro" → Encuentra 3 ubicaciones
- "Asturias" → Todos los lugares de esa región
- "mar" → Solo ubicaciones de mar
- "lago" → Solo lagos
```

### 4. Filtra resultados
Haz clic en **"Filtros"** para:
- Seleccionar un país
- Seleccionar un tipo de agua
- Ver cuántos resultados hay

### 5. Haz zoom
- Rueda del ratón: Zoom in/out
- Botones + y - en esquina superior derecha
- Doble click: Zoom x2

### 6. Selecciona una ubicación
Haz clic en cualquier marcador:
- Se abre un popup con info
- Se resalta en la lista lateral
- El mapa hace zoom automático

### 7. Ver más detalles
Dentro del popup:
- Haz clic en "Ver Detalles"
- Se abre un modal grande
- Ves descripción completa
- Encuentras botón "Ir al Lugar"

### 8. Navega al lugar
Botón "Ir al Lugar":
- Abre Google Maps
- Muestra ruta desde TU ubicación
- Puedes ver navegación paso a paso

---

## 📸 QUÉ DEBERÍAS VER

### En Desktop
```
┌─────────────────────────────────────────────┐
│  BÚSQUEDA  [    Busca lugares...      ] ⚙️  │ ← Header
├──────────────────────┬──────────────────────┤
│                      │                      │
│                      │   Lugares (20)       │
│                      │  ✓ Río Ebro          │
│   🗺️ MAPA LEAFLET   │  ✓ Embalse Mequi...  │
│   Con marcadores     │  ✓ Costa Brava       │
│   de colores         │    Lago Sanabria     │
│                      │    Mar Cantábrico    │
│   🟢 🔵 🟣            │    ...               │
│                      │                      │
└──────────────────────┴──────────────────────┘
```

### En Mobile
```
┌──────────────────┐
│ BÚSQUEDA    ⚙️    │
├──────────────────┤
│                  │
│   🗺️ MAPA        │
│   FULLSCREEN     │
│   con marcadores │
│                  │
│                  │
│                  │
├──────────────────┤
│ Lugares (20) ↕️   │ ← Lista expandible
└──────────────────┘
```

---

## 🎯 CASOS DE USO RÁPIDOS

### Caso 1: Encuentras lugar para pescar este fin de semana
```
1. Abre /mapa-spots
2. Búsqueda rápida por tu región
3. Haz click en un marcador
4. Botón "Ir al Lugar" → Google Maps
5. Navega con tu móvil
```

### Caso 2: Quieres explorar ríos españoles
```
1. Abre mapa
2. Filtro: País = España
3. Filtro: Tipo = Río
4. Resultado: Solo ríos españoles
5. Haz zoom a tu región
6. Explora opciones cercanas
```

### Caso 3: Planeas viaje a Argentina
```
1. Abre mapa
2. Filtro: País = Argentina
3. Verás lagos de Patagonia
4. Haz click en "Lago Nahuel Huapi"
5. Lee descripción: "Mayor lago de Argentina"
6. Guarda ubicación para más tarde
```

---

## 🔧 SOLUCIÓN RÁPIDA DE PROBLEMAS

### El mapa está en blanco
```
Solución:
1. Abre DevTools (F12)
2. Consola → Busca errores (texto rojo)
3. Si error dice "leaflet", reconstruye:
   npm run build && npm run dev
```

### Búsqueda no funciona
```
Solución:
1. Verifica que escribas en la caja
2. Presión Enter (no es necesario)
3. Resultados deben actualizar en vivo
```

### No veo mi ubicación roja
```
Solución:
1. Hiciste clic en "Permitir" ubicación? Si no:
   DevTools → Console → Busca permisos
2. Si rechazaste, el mapa aún funciona
3. Usará Madrid como centro por defecto
```

### Un lugar no aparece
```
Solución:
1. ¿Buscaste bien la región?
2. ¿Aplicaste filtros? Desactívalos
3. Verifica ubicación existe en: src/data/fishingLocations.js
```

---

## 💡 TIPS AVANZADOS

### Buscar múltiples palabras
```
❌ No funciona: "río ebro asturias"
✅ Sí funciona: "ebro" (encuentra todo sobre Ebro)
✅ Sí funciona: "asturias" (lista todos de esa región)
```

### Combinar filtros efectivamente
1. **Tipo específico:** Filtro tipo = "mar"
   → Muestra solo costas y mares
   
2. **País específico:** Filtro país = "Chile"
   → Muestra solo ubicaciones chilenas
   
3. **Combinación:** País + Tipo
   → Chile + Río = Solo ríos chilenos
   → España + Embalse = Solo pantanos españoles

### Zoom efectivo
```
Nivel 1-3:     Vistazo mundial
Nivel 4-6:     País completo
Nivel 7-9:     Región/Provinc
Nivel 10-12:   Zona local
Nivel 13-15:   Detalles en 5km
Nivel 16-18:   Calle, edificios
```

### Guardar ubicaciones favoritas (_próxima mejora_)
Actualmente:
```
- Haz captura de pantalla
- Copia coordenadas
- Guarda en notas

Pronto:
- Botón "Favorito" ⭐
- Sincroniza con tu perfil
- Comparte con amigos
```

---

## 📱 COMPATIBILIDAD

✅ **Funciona perfectamente en:**
- Chrome/Edge (Desktop y Mobile)
- Firefox (Desktop y Mobile)
- Safari (Desktop y Mobile)
- Dispositivos con GPS

⚠️ **Notas:**
- Necesita conexión a internet
- GPS es opcional (pero recomendado)
- Leaflet se carga desde CDN gratuito

---

## 🚀 PRÓXIMOS PASOS

### Después de explorar
1. 💾 Guarda tus spots favoritos
2. 📤 Comparte ubicaciones con amigos
3. 📸 Toma fotos en tu próxima pesca
4. ⭐ Califica los lugares

### Cómo contribuir ahora
1. 📍 Encontraste un lugar no listado?
   → Envía ubicación exacta (latitud, longitud)
   → Incluye descripción

2. 🐛 ¿Encontraste un error?
   → Abre issue con screenshot
   → Describe qué esperabas

3. 💡 ¿Tienes idea de mejora?
   → Comenta en GitHub
   → Describe caso de uso

---

## 📖 DOCUMENTACIÓN COMPLETA

Para información más detallada, revisa:

| Documento | Para... |
|-----------|---------|
| **GUIA_MAPAS_PESCA.md** | Entender toda la funcionalidad |
| **CHECKLIST_MAPAS.md** | Verificar que todo funciona |
| **AGREGAR_UBICACIONES_REFERENCIA.js** | Agregar nuevos lugares |
| **RESUMEN_FINAL_MAPAS.md** | Ver progreso técnico |

---

## 🎯 RESUMEN

```
✅ El mapa está LISTO
✅ +80 ubicaciones en España
✅ +30 en Latinoamérica
✅ Búsqueda funcionando
✅ Filtros activos
✅ Completamente responsive
✅ Integrado con Supabase (opcional)

👉 SIGUIENTE: Abre http://localhost:3000/mapa-spots
💪 ¡A disfrutar!
```

---

**¿Problemas? Revisa CHECKLIST_MAPAS.md para troubleshooting completo.**

**¿Quieres expandir? Mira AGREGAR_UBICACIONES_REFERENCIA.js**

**¿Necesitas más detalles? Lee GUIA_MAPAS_PESCA.md**

---

*Última actualización: Febrero 2026*
*Tiempo promedio para primer uso: 5 minutos*
*Dificultad: Muy Fácil* 🟢
