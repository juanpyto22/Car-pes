// 📌 REFERENCIA: Cómo agregar más ubicaciones de pesca

// Formato correcto para nuevas ubicaciones:
const ejemploNuevaUbicacion = {
  name: "Río Turia (Valencia)",           // Nombre descriptivo
  type: "río",                             // Tipos: 'río', 'embalse', 'lago', 'mar', 'parque'
  region: "Valencia",                      // Región o provincia
  country: "España",                       // País
  latitude: 39.4699,                       // Latitud (Google Maps: botón derecho → Coordenadas)
  longitude: -0.3763,                      // Longitud
  description: "Zona media del Turia con acceso fácil desde la ciudad" // Detalles útiles
};

// ======================================
// CÓMO ENCONTRAR COORDENADAS PRECISAS
// ======================================

// Método 1: Google Maps
// 1. Abre https://maps.google.com
// 2. Busca el lugar (ej: "Río Ebro desembocadura")
// 3. Click derecho en el punto
// 4. Selecciona "Qué hay aquí" o ve las coordenadas en URL
// Ejemplo URL: .../@40.7280,0.7090,15z
//              ^^^latitude^^^ ^longitude^

// Método 2: OpenStreetMap
// 1. Abre https://www.openstreetmap.org
// 2. Busca el lugar
// 3. Botón derecho → "Mostrar dirección"
// 4. Coordenadas en la barra derecha

// Método 3: GPS directo
// Si estás en el lugar, usa el GPS del móvil

// ======================================
// VALIDACIÓN DE COORDENADAS
// ======================================

// Rango válido:
// Latitude:  -90 a +90
// Longitude: -180 a +180

// España (aproximada):
// Lat: 36° a 44°
// Lon: -10° a 4°

// ======================================
// CÓMO AGREGAR AL CÓDIGO
// ======================================

// En src/data/fishingLocations.js, dentro del array:

export const fishingLocations = [
  // Ubicaciones existentes...
  
  // === TUS NUEVAS UBICACIONES ===
  { 
    name: "Pantano de [nombre]", 
    type: "embalse", 
    region: "[región]", 
    country: "España", 
    latitude: XX.XXXX, 
    longitude: -X.XXXX, 
    description: "[Tu descripción]" 
  },
  { 
    name: "Río [nombre]", 
    type: "río", 
    region: "[región]", 
    country: "España", 
    latitude: XX.XXXX, 
    longitude: -X.XXXX, 
    description: "[Tu descripción]" 
  },
  
  // ... resto de ubicaciones
];

// ======================================
// CONTRIBUIR UBICACIONES DE CALIDAD
// ======================================

/*
Para que tu ubicación sea útil:

1. ✅ Incluye descripción detallada:
   - "Tramo de fácil acceso con parking cercano"
   - "Pesca de trucha de montaña, población abundante"
   - "Mar abierto, pesca de dorada y lubina"

2. ✅ Coordenadas verificadas:
   - Usa 4-6 decimales de precisión
   - Verifica en 2-3 fuentes diferentes

3. ✅ Nombre exacto:
   - Incluye región si hay múltiples
   - Ej: "Río Sella (Asturias)" vs solo "Río Sella"

4. ✅ Tipo correcto:
   - 'río' para ríos y torrentes
   - 'embalse' para pantanos y presas
   - 'lago' para lagos naturales
   - 'mar' para costas y aguas saladas
   - 'parque' para áreas protegidas

5. ✅ Información verificada:
   - ¿Es fácil acceder?
   - ¿Hay restricciones de pesca?
   - ¿Qué especies se pueden pescar?
*/

// ======================================
// UBICACIONES POPULARES FALTANTES
// ======================================

// Si quieres expandir la base de datos, considera:

// ESPAÑAMÁS RÍOS ESPAÑOLES:
// - Río Pisuerga (Valladolid)
// - Río Arlanzón (Burgos)
// - Río Besaya (Cantabria)
// - Río Pas (Cantabria)

// MÁS EMBALSES:
// - Embalse de Ricobayo (Zamora)
// - Embalse de Cijara (Badajoz)
// - Embalse de Tajo de la Encantada (Ciudad Real)

// LATINOAMÉRICA:
// - Río Madre de Dios (Perú)
// - Lago Villarrica (Chile)
// - Río Itata (Chile)
// - Lago Coatepeque (El Salvador)

// ======================================
// EJEMPLO COMPLETO: Agregar 5 lugares
// ======================================

/*
export const fishingLocations = [
  // ... ubicaciones existentes ...
  
  // === NUEVAS: Ríos de Asturias ===
  { 
    name: "Río Pas (Cantabria)", 
    type: "río", 
    region: "Cantabria", 
    country: "España", 
    latitude: 43.2667, 
    longitude: -3.6500, 
    description: "Río de aguas frías, excelente para trucha. Zona de acampada disponible." 
  },
  { 
    name: "Río Besaya (Cantabria)", 
    type: "río", 
    region: "Cantabria", 
    country: "España", 
    latitude: 43.2167, 
    longitude: -4.0167, 
    description: "Afluente de calidad, trucha y barbo. Parques cercanos." 
  },
  { 
    name: "Embalse de Ricobayo", 
    type: "embalse", 
    region: "Zamora", 
    country: "España", 
    latitude: 41.8500, 
    longitude: -5.7667, 
    description: "Embalse grande, carpa, lucio y barbo. Acceso rodado fácil." 
  },
  { 
    name: "Lago Mendieta (País Vasco)", 
    type: "lago", 
    region: "Guipúzcoa", 
    country: "España", 
    latitude: 43.2500, 
    longitude: -1.8333, 
    description: "Lago glaciar pequeño, trucha fario. Senderismo alrededor." 
  },
  { 
    name: "Mar de Irún", 
    type: "mar", 
    region: "Guipúzcoa", 
    country: "España", 
    latitude: 43.3667, 
    longitude: -1.8333, 
    description: "Pesca de bajura, bonito del norte y caballa. Puertos con servicios." 
  },
];
*/

// ======================================
// ACTUALIZAR LA BASE DE DATOS
// ======================================

// Una vez que agregues ubicaciones:

// 1. Guarda el archivo:
//    npm run build
//    (verifica que no hay errores de sintaxis)

// 2. Prueba en el mapa:
//    npm run dev
//    Navega a /mapa-spots
//    Busca tus nuevas ubicaciones
//    Verifica que los marcadores aparecen

// 3. Filtra por país:
//    Si agregaste nuevos países, el filtro debe mostrarlos

// ======================================
// ERROR COMÚN: Ubicación no aparece
// ======================================

// Posibles causas:
// ❌ Coordenadas fuera de rango (-90 a 90 lat, -180 a 180 lon)
// ❌ Coma faltante entre objetos
// ❌ Comillas mal cerradas en strings
// ❌ Tipo hace typo (ej: "río" vs "rio")

// Solución:
// 1. Abre la consola (F12)
// 2. Busca errores de parsing
// 3. Valida JSON en https://jsonlint.com/

// ======================================
// RENDIMIENTO: +500 ubicaciones
// ======================================

// Si tienes muchas ubicaciones:
// 1. Considera agupar por región
// 2. Implementar lazy loading de marcadores
// 3. Usar clustering automático (MarkerClusterGroup)

// Ejemplo con clustering:
// import MarkerClusterGroup from 'leaflet.markercluster';

export default {};
