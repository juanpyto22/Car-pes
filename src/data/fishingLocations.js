// Base de datos de lugares de pesca en España y Latinoamérica
// Incluye ríos, pantanos, embalses, lagos, mares y parques naturales

export const fishingLocations = [
  // === ESPAÑA ===
  // Ríos principales
  { name: "Río Ebro", type: "río", region: "España", country: "España" },
  { name: "Río Tajo", type: "río", region: "España", country: "España" },
  { name: "Río Duero", type: "río", region: "España", country: "España" },
  { name: "Río Guadalquivir", type: "río", region: "España", country: "España" },
  { name: "Río Guadiana", type: "río", region: "España", country: "España" },
  { name: "Río Júcar", type: "río", region: "España", country: "España" },
  { name: "Río Segura", type: "río", region: "España", country: "España" },
  { name: "Río Miño", type: "río", region: "España", country: "España" },
  { name: "Río Nalón", type: "río", region: "Asturias", country: "España" },
  { name: "Río Sella", type: "río", region: "Asturias", country: "España" },
  { name: "Río Cares", type: "río", region: "Asturias", country: "España" },
  { name: "Río Esla", type: "río", region: "León", country: "España" },
  { name: "Río Órbigo", type: "río", region: "León", country: "España" },
  { name: "Río Tormes", type: "río", region: "Salamanca", country: "España" },
  { name: "Río Aragón", type: "río", region: "Aragón", country: "España" },
  { name: "Río Gállego", type: "río", region: "Aragón", country: "España" },
  { name: "Río Cinca", type: "río", region: "Aragón", country: "España" },
  { name: "Río Noguera Pallaresa", type: "río", region: "Cataluña", country: "España" },
  { name: "Río Noguera Ribagorzana", type: "río", region: "Cataluña", country: "España" },
  { name: "Río Ter", type: "río", region: "Cataluña", country: "España" },
  { name: "Río Llobregat", type: "río", region: "Cataluña", country: "España" },
  { name: "Río Genil", type: "río", region: "Andalucía", country: "España" },
  { name: "Río Guadalhorce", type: "río", region: "Andalucía", country: "España" },
  
  // Embalses y pantanos España
  { name: "Embalse de Mequinenza", type: "embalse", region: "Aragón", country: "España" },
  { name: "Embalse de Riaño", type: "embalse", region: "León", country: "España" },
  { name: "Embalse de Alcántara", type: "embalse", region: "Extremadura", country: "España" },
  { name: "Embalse de La Serena", type: "embalse", region: "Extremadura", country: "España" },
  { name: "Embalse de Valdecañas", type: "embalse", region: "Extremadura", country: "España" },
  { name: "Embalse de Orellana", type: "embalse", region: "Extremadura", country: "España" },
  { name: "Embalse del Ebro", type: "embalse", region: "Cantabria", country: "España" },
  { name: "Embalse de Santillana", type: "embalse", region: "Madrid", country: "España" },
  { name: "Embalse de El Atazar", type: "embalse", region: "Madrid", country: "España" },
  { name: "Embalse de Buendía", type: "embalse", region: "Guadalajara", country: "España" },
  { name: "Embalse de Entrepeñas", type: "embalse", region: "Guadalajara", country: "España" },
  { name: "Embalse de Alarcón", type: "embalse", region: "Cuenca", country: "España" },
  { name: "Embalse de Contreras", type: "embalse", region: "Valencia", country: "España" },
  { name: "Embalse de Iznajar", type: "embalse", region: "Córdoba", country: "España" },
  { name: "Embalse de Béznar", type: "embalse", region: "Granada", country: "España" },
  { name: "Pantano de San Juan", type: "embalse", region: "Madrid", country: "España" },
  { name: "Pantano de Sau", type: "embalse", region: "Cataluña", country: "España" },
  { name: "Pantano de Susqueda", type: "embalse", region: "Cataluña", country: "España" },
  
  // Lagos España
  { name: "Lago de Sanabria", type: "lago", region: "Zamora", country: "España" },
  { name: "Lago de Banyoles", type: "lago", region: "Cataluña", country: "España" },
  { name: "Laguna Negra", type: "lago", region: "Soria", country: "España" },
  { name: "Lagunas de Ruidera", type: "lago", region: "Ciudad Real", country: "España" },
  
  // Mares y costas España
  { name: "Mar Cantábrico", type: "mar", region: "Norte de España", country: "España" },
  { name: "Mar Mediterráneo", type: "mar", region: "Este de España", country: "España" },
  { name: "Océano Atlántico - Galicia", type: "mar", region: "Galicia", country: "España" },
  { name: "Océano Atlántico - Cádiz", type: "mar", region: "Andalucía", country: "España" },
  { name: "Costa Brava", type: "mar", region: "Cataluña", country: "España" },
  { name: "Costa Dorada", type: "mar", region: "Cataluña", country: "España" },
  { name: "Costa del Sol", type: "mar", region: "Andalucía", country: "España" },
  { name: "Delta del Ebro", type: "mar", region: "Cataluña", country: "España" },
  { name: "Rías Baixas", type: "mar", region: "Galicia", country: "España" },
  { name: "Rías Altas", type: "mar", region: "Galicia", country: "España" },
  { name: "Islas Canarias", type: "mar", region: "Canarias", country: "España" },
  { name: "Islas Baleares", type: "mar", region: "Baleares", country: "España" },
  
  // Parques naturales España
  { name: "Parque Nacional de los Picos de Europa", type: "parque", region: "Asturias/León/Cantabria", country: "España" },
  { name: "Parque Natural de Somiedo", type: "parque", region: "Asturias", country: "España" },
  { name: "Parque Nacional de Ordesa y Monte Perdido", type: "parque", region: "Aragón", country: "España" },
  { name: "Parque Natural del Alto Tajo", type: "parque", region: "Guadalajara", country: "España" },
  { name: "Parque Natural de las Lagunas de Ruidera", type: "parque", region: "Ciudad Real", country: "España" },
  { name: "Parque Natural de Doñana", type: "parque", region: "Andalucía", country: "España" },
  { name: "Parque Natural Sierra de Cazorla", type: "parque", region: "Jaén", country: "España" },
  
  // === MÉXICO ===
  { name: "Lago de Chapala", type: "lago", region: "Jalisco", country: "México" },
  { name: "Lago de Pátzcuaro", type: "lago", region: "Michoacán", country: "México" },
  { name: "Presa El Cuchillo", type: "embalse", region: "Nuevo León", country: "México" },
  { name: "Presa Vicente Guerrero", type: "embalse", region: "Tamaulipas", country: "México" },
  { name: "Presa Falcon", type: "embalse", region: "Tamaulipas", country: "México" },
  { name: "Río Papagayo", type: "río", region: "Guerrero", country: "México" },
  { name: "Río Balsas", type: "río", region: "Guerrero", country: "México" },
  { name: "Río Usumacinta", type: "río", region: "Chiapas", country: "México" },
  { name: "Mar Caribe - Cancún", type: "mar", region: "Quintana Roo", country: "México" },
  { name: "Mar de Cortés", type: "mar", region: "Baja California", country: "México" },
  { name: "Golfo de México", type: "mar", region: "Veracruz", country: "México" },
  
  // === ARGENTINA ===
  { name: "Río Paraná", type: "río", region: "Entre Ríos", country: "Argentina" },
  { name: "Río de la Plata", type: "río", region: "Buenos Aires", country: "Argentina" },
  { name: "Río Limay", type: "río", region: "Neuquén", country: "Argentina" },
  { name: "Río Traful", type: "río", region: "Neuquén", country: "Argentina" },
  { name: "Río Chimehuin", type: "río", region: "Neuquén", country: "Argentina" },
  { name: "Río Malleo", type: "río", region: "Neuquén", country: "Argentina" },
  { name: "Río Collon Curá", type: "río", region: "Neuquén", country: "Argentina" },
  { name: "Río Grande", type: "río", region: "Tierra del Fuego", country: "Argentina" },
  { name: "Lago Nahuel Huapi", type: "lago", region: "Río Negro", country: "Argentina" },
  { name: "Lago Traful", type: "lago", region: "Neuquén", country: "Argentina" },
  { name: "Lago Correntoso", type: "lago", region: "Neuquén", country: "Argentina" },
  { name: "Lago Huechulafquen", type: "lago", region: "Neuquén", country: "Argentina" },
  { name: "Lago Meliquina", type: "lago", region: "Neuquén", country: "Argentina" },
  { name: "Embalse Piedras Moras", type: "embalse", region: "Córdoba", country: "Argentina" },
  { name: "Parque Nacional Nahuel Huapi", type: "parque", region: "Río Negro", country: "Argentina" },
  { name: "Parque Nacional Lanín", type: "parque", region: "Neuquén", country: "Argentina" },
  { name: "Mar Argentino - Mar del Plata", type: "mar", region: "Buenos Aires", country: "Argentina" },
  
  // === CHILE ===
  { name: "Río Baker", type: "río", region: "Aysén", country: "Chile" },
  { name: "Río Futaleufú", type: "río", region: "Los Lagos", country: "Chile" },
  { name: "Río Petrohué", type: "río", region: "Los Lagos", country: "Chile" },
  { name: "Río Puelo", type: "río", region: "Los Lagos", country: "Chile" },
  { name: "Río Simpson", type: "río", region: "Aysén", country: "Chile" },
  { name: "Lago Llanquihue", type: "lago", region: "Los Lagos", country: "Chile" },
  { name: "Lago Todos los Santos", type: "lago", region: "Los Lagos", country: "Chile" },
  { name: "Lago Villarrica", type: "lago", region: "La Araucanía", country: "Chile" },
  { name: "Lago Ranco", type: "lago", region: "Los Ríos", country: "Chile" },
  { name: "Lago General Carrera", type: "lago", region: "Aysén", country: "Chile" },
  { name: "Océano Pacífico - Valparaíso", type: "mar", region: "Valparaíso", country: "Chile" },
  
  // === COLOMBIA ===
  { name: "Río Magdalena", type: "río", region: "Varios", country: "Colombia" },
  { name: "Río Cauca", type: "río", region: "Varios", country: "Colombia" },
  { name: "Río Orinoco", type: "río", region: "Vichada", country: "Colombia" },
  { name: "Río Amazonas", type: "río", region: "Amazonas", country: "Colombia" },
  { name: "Embalse del Neusa", type: "embalse", region: "Cundinamarca", country: "Colombia" },
  { name: "Embalse de Tominé", type: "embalse", region: "Cundinamarca", country: "Colombia" },
  { name: "Embalse del Guavio", type: "embalse", region: "Cundinamarca", country: "Colombia" },
  { name: "Laguna de Guatavita", type: "lago", region: "Cundinamarca", country: "Colombia" },
  { name: "Mar Caribe - Cartagena", type: "mar", region: "Bolívar", country: "Colombia" },
  { name: "Mar Caribe - Santa Marta", type: "mar", region: "Magdalena", country: "Colombia" },
  { name: "Océano Pacífico - Buenaventura", type: "mar", region: "Valle del Cauca", country: "Colombia" },
  
  // === PERÚ ===
  { name: "Lago Titicaca", type: "lago", region: "Puno", country: "Perú" },
  { name: "Río Amazonas", type: "río", region: "Loreto", country: "Perú" },
  { name: "Río Marañón", type: "río", region: "Amazonas", country: "Perú" },
  { name: "Río Ucayali", type: "río", region: "Ucayali", country: "Perú" },
  { name: "Océano Pacífico - Lima", type: "mar", region: "Lima", country: "Perú" },
  { name: "Océano Pacífico - Piura", type: "mar", region: "Piura", country: "Perú" },
  
  // === ECUADOR ===
  { name: "Río Napo", type: "río", region: "Orellana", country: "Ecuador" },
  { name: "Río Guayas", type: "río", region: "Guayas", country: "Ecuador" },
  { name: "Laguna de Cuicocha", type: "lago", region: "Imbabura", country: "Ecuador" },
  { name: "Océano Pacífico - Galápagos", type: "mar", region: "Galápagos", country: "Ecuador" },
  { name: "Océano Pacífico - Manta", type: "mar", region: "Manabí", country: "Ecuador" },
  
  // === COSTA RICA ===
  { name: "Lago Arenal", type: "lago", region: "Alajuela", country: "Costa Rica" },
  { name: "Río Pacuare", type: "río", region: "Limón", country: "Costa Rica" },
  { name: "Río Sarapiquí", type: "río", region: "Heredia", country: "Costa Rica" },
  { name: "Mar Caribe - Limón", type: "mar", region: "Limón", country: "Costa Rica" },
  { name: "Océano Pacífico - Guanacaste", type: "mar", region: "Guanacaste", country: "Costa Rica" },
  
  // === BRASIL ===
  { name: "Río Amazonas", type: "río", region: "Amazonas", country: "Brasil" },
  { name: "Río Negro", type: "río", region: "Amazonas", country: "Brasil" },
  { name: "Río Teles Pires", type: "río", region: "Mato Grosso", country: "Brasil" },
  { name: "Río Araguaia", type: "río", region: "Goiás", country: "Brasil" },
  { name: "Pantanal", type: "parque", region: "Mato Grosso", country: "Brasil" },
  { name: "Represa de Itaipu", type: "embalse", region: "Paraná", country: "Brasil" },
  { name: "Océano Atlántico - Florianópolis", type: "mar", region: "Santa Catarina", country: "Brasil" },
  { name: "Océano Atlántico - Rio de Janeiro", type: "mar", region: "Rio de Janeiro", country: "Brasil" },
  
  // === VENEZUELA ===
  { name: "Río Orinoco", type: "río", region: "Bolívar", country: "Venezuela" },
  { name: "Río Caura", type: "río", region: "Bolívar", country: "Venezuela" },
  { name: "Embalse de Guri", type: "embalse", region: "Bolívar", country: "Venezuela" },
  { name: "Mar Caribe - Los Roques", type: "mar", region: "Dependencias Federales", country: "Venezuela" },
  { name: "Mar Caribe - Isla Margarita", type: "mar", region: "Nueva Esparta", country: "Venezuela" },
  
  // === PANAMÁ ===
  { name: "Lago Gatún", type: "lago", region: "Colón", country: "Panamá" },
  { name: "Lago Bayano", type: "lago", region: "Panamá", country: "Panamá" },
  { name: "Océano Pacífico - Golfo de Chiriquí", type: "mar", region: "Chiriquí", country: "Panamá" },
  { name: "Mar Caribe - Bocas del Toro", type: "mar", region: "Bocas del Toro", country: "Panamá" },
  
  // === URUGUAY ===
  { name: "Río Uruguay", type: "río", region: "Salto", country: "Uruguay" },
  { name: "Río Negro", type: "río", region: "Varios", country: "Uruguay" },
  { name: "Represa de Salto Grande", type: "embalse", region: "Salto", country: "Uruguay" },
  { name: "Laguna del Sauce", type: "lago", region: "Maldonado", country: "Uruguay" },
  { name: "Océano Atlántico - Punta del Este", type: "mar", region: "Maldonado", country: "Uruguay" },
  
  // === PARAGUAY ===
  { name: "Río Paraguay", type: "río", region: "Asunción", country: "Paraguay" },
  { name: "Río Paraná", type: "río", region: "Alto Paraná", country: "Paraguay" },
  { name: "Represa de Itaipú", type: "embalse", region: "Alto Paraná", country: "Paraguay" },
  { name: "Represa de Yacyretá", type: "embalse", region: "Misiones", country: "Paraguay" },
  
  // === BOLIVIA ===
  { name: "Lago Titicaca", type: "lago", region: "La Paz", country: "Bolivia" },
  { name: "Río Beni", type: "río", region: "Beni", country: "Bolivia" },
  { name: "Río Mamoré", type: "río", region: "Beni", country: "Bolivia" },
  
  // === CUBA ===
  { name: "Embalse Zaza", type: "embalse", region: "Sancti Spíritus", country: "Cuba" },
  { name: "Embalse Hanabanilla", type: "embalse", region: "Villa Clara", country: "Cuba" },
  { name: "Mar Caribe - Cayo Largo", type: "mar", region: "Isla de la Juventud", country: "Cuba" },
  { name: "Mar Caribe - Jardines de la Reina", type: "mar", region: "Ciego de Ávila", country: "Cuba" },
  
  // === REPÚBLICA DOMINICANA ===
  { name: "Lago Enriquillo", type: "lago", region: "Barahona", country: "República Dominicana" },
  { name: "Presa de Hatillo", type: "embalse", region: "Sánchez Ramírez", country: "República Dominicana" },
  { name: "Mar Caribe - Punta Cana", type: "mar", region: "La Altagracia", country: "República Dominicana" },
  { name: "Océano Atlántico - Puerto Plata", type: "mar", region: "Puerto Plata", country: "República Dominicana" },
];

// Función para buscar ubicaciones con autocompletado
export const searchFishingLocations = (query) => {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  return fishingLocations
    .filter(location => {
      const normalizedName = location.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalizedRegion = location.region.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalizedCountry = location.country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalizedType = location.type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      return (
        normalizedName.includes(normalizedQuery) ||
        normalizedRegion.includes(normalizedQuery) ||
        normalizedCountry.includes(normalizedQuery) ||
        normalizedType.includes(normalizedQuery)
      );
    })
    .slice(0, 10); // Limitar a 10 resultados
};

// Función para obtener el icono según el tipo
export const getLocationIcon = (type) => {
  switch (type) {
    case 'río': return '🏞️';
    case 'lago': return '💧';
    case 'embalse': return '🌊';
    case 'mar': return '🌊';
    case 'parque': return '🏕️';
    default: return '📍';
  }
};

// Función para obtener el color según el tipo
export const getLocationColor = (type) => {
  switch (type) {
    case 'río': return 'text-blue-400';
    case 'lago': return 'text-cyan-400';
    case 'embalse': return 'text-indigo-400';
    case 'mar': return 'text-teal-400';
    case 'parque': return 'text-green-400';
    default: return 'text-gray-400';
  }
};
