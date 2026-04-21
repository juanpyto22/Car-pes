// Base de datos de lugares de pesca en España y Latinoamérica
// COORDENADAS REALES PARA ESPAÑA - Ríos, pantanos, embalses y mares

export const fishingLocations = [
  // === ESPAÑA - RÍOS (Principales) ===
  { name: "Río Ebro (Desembocadura)", type: "río", region: "Tarragona", country: "España", latitude: 40.7280, longitude: 0.7090, description: "Desembocadura del Ebro en el Mediterráneo" },
  { name: "Río Ebro (Tudela)", type: "río", region: "Navarra", country: "España", latitude: 42.0650, longitude: -1.6041, description: "Zona media del Ebro" },
  { name: "Río Tajo (Toledo)", type: "río", region: "Toledo", country: "España", latitude: 39.8564, longitude: -4.0199, description: "Recorrido por Toledo" },
  { name: "Río Tajo (Aranjuez)", type: "río", region: "Madrid", country: "España", latitude: 40.0281, longitude: -3.6051, description: "Tajo en zona de Madrid" },
  { name: "Río Duero (Valladolid)", type: "río", region: "Valladolid", country: "España", latitude: 41.6523, longitude: -4.7245, description: "Duero en Castilla y León" },
  { name: "Río Guadalquivir (Sevilla)", type: "río", region: "Sevilla", country: "España", latitude: 37.3891, longitude: -5.9844, description: "Guadalquivir en Sevilla" },
  { name: "Río Guadiana", type: "río", region: "Badajoz", country: "España", latitude: 38.9142, longitude: -7.3000, description: "Frontera entre España y Portugal" },
  { name: "Río Júcar (Huete)", type: "río", region: "Cuenca", country: "España", latitude: 40.3166, longitude: -2.8500, description: "Hoces del Júcar" },
  { name: "Río Segura", type: "río", region: "Murcia", country: "España", latitude: 37.9922, longitude: -0.8030, description: "Desembocadura en Murcia" },
  { name: "Río Miño", type: "río", region: "Galicia", country: "España", latitude: 42.1280, longitude: -8.8788, description: "Frontera Galicia-Portugal" },
  
  // === ESPAÑA - RÍOS (Regionales) ===
  { name: "Río Nalón", type: "río", region: "Asturias", country: "España", latitude: 43.3341, longitude: -5.5288, description: "Salmón y trucha en Asturias" },
  { name: "Río Sella", type: "río", region: "Asturias", country: "España", latitude: 43.2806, longitude: -5.1400, description: "Descenso en piragua disponible" },
  { name: "Río Cares", type: "río", region: "Asturias", country: "España", latitude: 43.3041, longitude: -4.9333, description: "Garganta del Cares" },
  { name: "Río Esla", type: "río", region: "León", country: "España", latitude: 42.4505, longitude: -5.3208, description: "Afluente del Duero" },
  { name: "Río Órbigo", type: "río", region: "León", country: "España", latitude: 42.2830, longitude: -5.8820, description: "Trucha y barbo" },
  { name: "Río Tormes", type: "río", region: "Salamanca", country: "España", latitude: 40.9697, longitude: -5.6633, description: "Gargantas de Béjar" },
  { name: "Río Aragón", type: "río", region: "Aragón", country: "España", latitude: 42.3833, longitude: -0.6333, description: "Pesca de truchas" },
  { name: "Río Gállego", type: "río", region: "Aragón", country: "España", latitude: 41.6384, longitude: -0.8847, description: "Afluente del Ebro" },
  { name: "Río Cinca", type: "río", region: "Aragón", country: "España", latitude: 42.1850, longitude: 0.3333, description: "Pesca en Barbastro" },
  { name: "Río Noguera Pallaresa", type: "río", region: "Cataluña", country: "España", latitude: 42.2247, longitude: 1.2425, description: "Pesca de trucha en Pallars" },
  { name: "Río Ter", type: "río", region: "Cataluña", country: "España", latitude: 41.9536, longitude: 2.7647, description: "Salida al Mediterráneo" },
  { name: "Río Llobregat", type: "río", region: "Cataluña", country: "España", latitude: 41.3451, longitude: 1.9334, description: "Barcelona" },
  { name: "Río Genil", type: "río", region: "Andalucía", country: "España", latitude: 37.1881, longitude: -3.5948, description: "Granada-Sierra Nevada" },
  { name: "Río Guadalhorce", type: "río", region: "Andalucía", country: "España", latitude: 37.0667, longitude: -5.0500, description: "Málaga" },
  
  // === ESPAÑA - EMBALSES Y PANTANOS ===
  { name: "Embalse de Mequinenza", type: "embalse", region: "Aragón", country: "España", latitude: 41.2850, longitude: 0.3667, description: "Uno de los más grandes de España, pesca de lucio y carpa" },
  { name: "Embalse de Riaño", type: "embalse", region: "León", country: "España", latitude: 42.8294, longitude: -4.9278, description: "Salmón y trucha en León" },
  { name: "Embalse de Alcántara", type: "embalse", region: "Extremadura", country: "España", latitude: 39.7614270, longitude: -6.7403134, description: "Black bass y carpa" },
  { name: "Embalse de La Serena", type: "embalse", region: "Extremadura", country: "España", latitude: 38.8742164, longitude: -5.1546427, description: "Uno de los mayores de España" },
  { name: "Embalse de Valdecañas", type: "embalse", region: "Extremadura", country: "España", latitude: 39.8216250, longitude: -5.4017083, description: "Pesca deportiva" },
  { name: "Embalse de Orellana", type: "embalse", region: "Extremadura", country: "España", latitude: 39.0606250, longitude: -5.3448125, description: "Pesca de black bass" },
  { name: "Embalse de Sobradillo", type: "embalse", region: "Castilla y León", country: "España", latitude: 41.5167, longitude: -3.1333, description: "Duero - Trucha y barbo" },
  { name: "Embalse de Santillana", type: "embalse", region: "Madrid", country: "España", latitude: 40.6417, longitude: -3.6500, description: "Lugo repoblado en Madrid" },
  { name: "Embalse de El Atazar", type: "embalse", region: "Madrid", country: "España", latitude: 40.8597, longitude: -3.6581, description: "Pesca cerca de Madrid" },
  { name: "Embalse de Buendía", type: "embalse", region: "Guadalajara", country: "España", latitude: 40.2792, longitude: -2.4464, description: "Pesca de lucio y carpa" },
  { name: "Embalse de Entrepeñas", type: "embalse", region: "Guadalajara", country: "España", latitude: 40.3222, longitude: -2.7500, description: "Zona de pesca importante" },
  { name: "Embalse de Alarcón", type: "embalse", region: "Cuenca", country: "España", latitude: 40.1667, longitude: -2.3000, description: "Pesca de trucha y carpa" },
  { name: "Embalse de Contreras", type: "embalse", region: "Valencia", country: "España", latitude: 40.1167, longitude: -1.8167, description: "Agua dulce en Valencia" },
  { name: "Embalse de Iznajar", type: "embalse", region: "Córdoba", country: "España", latitude: 37.5750, longitude: -4.3167, description: "Mayor embalse de Andalucía" },
  { name: "Embalse de Béznar", type: "embalse", region: "Granada", country: "España", latitude: 36.9221940, longitude: -3.5528004, description: "Pesca en Sierra Nevada" },
  { name: "Pantano de Sau", type: "embalse", region: "Cataluña", country: "España", latitude: 42.1269, longitude: 2.1739, description: "Pintoresco en Cataluña" },
  { name: "Pantano de Susqueda", type: "embalse", region: "Cataluña", country: "España", latitude: 42.1833, longitude: 2.2500, description: "Pesca de trucha" },
  
  // === ESPAÑA - LAGOS ===
  { name: "Lago de Sanabria", type: "lago", region: "Zamora", country: "España", latitude: 41.9450, longitude: -6.7531, description: "Mayor lago glaciar de España" },
  { name: "Lago de Banyoles", type: "lago", region: "Cataluña", country: "España", latitude: 41.9269, longitude: 2.7561, description: "Pesca de carpa y barbo" },
  { name: "Laguna Negra", type: "lago", region: "Soria", country: "España", latitude: 41.9367, longitude: -2.3000, description: "Circo glaciar en Soria" },
  { name: "Lagunas de Ruidera", type: "lago", region: "Ciudad Real", country: "España", latitude: 39.1050, longitude: -2.6294, description: "Sistema de 16 lagunas" },
  
  // === ESPAÑA - MARES Y COSTAS (Atlántico) ===
  { name: "Rías Baixas (Pontevedra)", type: "mar", region: "Galicia", country: "España", latitude: 42.4167, longitude: -8.7833, description: "Pesca de pulpo y mejillón" },
  { name: "Rías Altas (Coruña)", type: "mar", region: "Galicia", country: "España", latitude: 43.3333, longitude: -8.2500, description: "Pesca costera gallega" },
  { name: "Ría de Vigo", type: "mar", region: "Galicia", country: "España", latitude: 42.2381, longitude: -8.7743, description: "Pulpo y marisco" },
  { name: "Océano Atlántico - Cádiz", type: "mar", region: "Cádiz", country: "España", latitude: 36.5278, longitude: -6.2889, description: "Pesca de atún y pez espada" },
  { name: "Golfo de Cádiz", type: "mar", region: "Andalucía", country: "España", latitude: 36.7500, longitude: -7.5000, description: "Anchoveta y caballa" },
  { name: "Mar Cantábrico", type: "mar", region: "Asturias", country: "España", latitude: 43.5000, longitude: -4.5000, description: "Pesca de rape, merluza y congrio" },
  { name: "Costa de Asturias", type: "mar", region: "Asturias", country: "España", latitude: 43.3333, longitude: -5.5000, description: "Espetos y percebe" },
  { name: "Costa Vasca", type: "mar", region: "Guipúzcoa", country: "España", latitude: 43.3650, longitude: -2.0147, description: "Txutxo y bonito del norte" },
  
  // === ESPAÑA - MARES Y COSTAS (Mediterráneo) ===
  { name: "Costa Brava", type: "mar", region: "Cataluña", country: "España", latitude: 41.9407, longitude: 3.1763, description: "Pesca de langosta y mero" },
  { name: "Costa Dorada", type: "mar", region: "Cataluña", country: "España", latitude: 41.3333, longitude: 1.1842, description: "Tarragona - Pesca de sepia" },
  { name: "Delta del Ebro", type: "mar", region: "Cataluña", country: "España", latitude: 40.6286, longitude: 0.8206, description: "Anguila y alisada" },
  { name: "Comunidad Valenciana - Mar", type: "mar", region: "Valencia", country: "España", latitude: 39.4699, longitude: -0.3763, description: "Dorada y lubina" },
  { name: "Costa Blanca", type: "mar", region: "Alicante", country: "España", latitude: 38.8333, longitude: -0.1667, description: "Pesca deportiva variada" },
  { name: "Región de Murcia", type: "mar", region: "Murcia", country: "España", latitude: 37.5910, longitude: -0.8923, description: "Dorada, lubina, dentón" },
  { name: "Costa del Sol", type: "mar", region: "Málaga", country: "España", latitude: 36.7683, longitude: -4.4249, description: "Pesca de espada y caballa" },
  { name: "Costa Tropical", type: "mar", region: "Granada", country: "España", latitude: 36.7500, longitude: -3.5000, description: "Frente almeriense" },
  
  // === ESPAÑA - ARCHIPIÉLAGOS ===
  { name: "Islas Baleares (Mallorca)", type: "mar", region: "Baleares", country: "España", latitude: 39.3699, longitude: 2.9736, description: "Pesca de dorada y jurel" },
  { name: "Menorca", type: "mar", region: "Baleares", country: "España", latitude: 40.0062, longitude: 3.8546, description: "Caladeros pesqueros" },
  { name: "Ibiza", type: "mar", region: "Baleares", country: "España", latitude: 38.9068, longitude: 1.4310, description: "Pesca de pez espada" },
  { name: "Islas Canarias (Gran Canaria)", type: "mar", region: "Canarias", country: "España", latitude: 28.0500, longitude: -15.5950, description: "Atún, dorada canaria" },
  { name: "Tenerife", type: "mar", region: "Canarias", country: "España", latitude: 28.3667, longitude: -16.3333, description: "Pesca de altura" },
  { name: "La Palma", type: "mar", region: "Canarias", country: "España", latitude: 28.6834, longitude: -17.8667, description: "Pesca artesanal" },
  
  // === ESPAÑA - PARQUES NATURALES CON PESCA ===
  { name: "Picos de Europa", type: "parque", region: "Asturias", country: "España", latitude: 43.2500, longitude: -4.8333, description: "Trucha salvaje" },
  { name: "Ordesa y Monte Perdido", type: "parque", region: "Aragón", country: "España", latitude: 42.5942, longitude: -0.1233, description: "Pesca de trucha de montaña" },
  { name: "Parque de Doñana", type: "parque", region: "Andalucía", country: "España", latitude: 36.8000, longitude: -6.3667, description: "Pesca en marismas" },
  { name: "Alto Tajo", type: "parque", region: "Guadalajara", country: "España", latitude: 40.3500, longitude: -2.4000, description: "Barbo y carpa" },
  { name: "Caucaso Ibérico", type: "parque", region: "Jaén", country: "España", latitude: 37.9167, longitude: -3.0333, description: "Truchas de sierra" },
  
  // === ESPAÑA - RÍOS ADICIONALES REGIONALES ===
  { name: "Río Lío", type: "río", region: "Asturias", country: "España", latitude: 43.2667, longitude: -5.8333, description: "Salmón en Asturias" },
  { name: "Río Paxarón", type: "río", region: "Asturias", country: "España", latitude: 43.4167, longitude: -6.0833, description: "Trucha y salmón" },
  { name: "Río Naya", type: "río", region: "Asturias", country: "España", latitude: 43.3833, longitude: -4.7333, description: "Pesca en Costa verde" },
  { name: "Río Bernesga", type: "río", region: "León", country: "España", latitude: 42.5833, longitude: -5.6167, description: "Barbo y carpa" },
  { name: "Río Porma", type: "río", region: "León", country: "España", latitude: 42.9333, longitude: -5.1833, description: "Afluente del Esla" },
  { name: "Río Arlanza", type: "río", region: "Burgos", country: "España", latitude: 42.3833, longitude: -3.6833, description: "Trucha de Castilla" },
  { name: "Río Pisuerga", type: "río", region: "Palencia", country: "España", latitude: 42.0167, longitude: -4.5000, description: "Embalse de Aguilar" },
  { name: "Río Avilés", type: "río", region: "Asturias", country: "España", latitude: 43.3500, longitude: -5.9333, description: "Desembocadura en Avilés" },
  { name: "Río Sorbe", type: "río", region: "Guadalajara", country: "España", latitude: 40.7500, longitude: -3.2500, description: "Afluente del Tajo" },
  { name: "Río Henares", type: "río", region: "Madrid", country: "España", latitude: 40.5833, longitude: -3.3333, description: "Afluente del Tajo" },
  { name: "Río Jarama", type: "río", region: "Madrid", country: "España", latitude: 40.2500, longitude: -3.5833, description: "Pesca en embalses" },
  { name: "Río Manzanares", type: "río", region: "Madrid", country: "España", latitude: 40.4000, longitude: -3.7500, description: "Río de Madrid" },
  { name: "Río Tormes", type: "río", region: "Salamanca", country: "España", latitude: 40.6667, longitude: -5.8333, description: "Sistema de Béjar" },
  { name: "Río Alberche", type: "río", region: "Toledo", country: "España", latitude: 39.7500, longitude: -4.5000, description: "Afluente del Tajo" },
  { name: "Río Cuerva", type: "río", region: "Cuenca", country: "España", latitude: 40.4167, longitude: -2.6667, description: "Hoces de Cuenca" },
  { name: "Río Cabriel", type: "río", region: "Valencia", country: "España", latitude: 40.0000, longitude: -1.5000, description: "Frontera Valencia-Castilla" },
  { name: "Río Turia", type: "río", region: "Valencia", country: "España", latitude: 39.4667, longitude: -0.3833, description: "Pesca en Valencia" },
  { name: "Río Jucar", type: "río", region: "Valencia", country: "España", latitude: 40.1500, longitude: -1.8333, description: "Desembocadura en Valencia" },
  { name: "Río Millares", type: "río", region: "Valencia", country: "España", latitude: 39.9333, longitude: -1.4167, description: "Afluente del Túria" },
  { name: "Río Palancia", type: "río", region: "Valencia", country: "España", latitude: 39.6667, longitude: -0.5000, description: "Pesca costera" },
  { name: "Río Matarraña", type: "río", region: "Teruel", country: "España", latitude: 40.8333, longitude: 0.2500, description: "Frontera con Cataluña" },
  { name: "Río Guadalope", type: "río", region: "Teruel", country: "España", latitude: 40.4167, longitude: -0.5833, description: "Afluente del Ebro" },
  { name: "Río Martin", type: "río", region: "Teruel", country: "España", latitude: 40.6667, longitude: -0.5000, description: "Garganta del Martín" },
  { name: "Río Jiloca", type: "río", region: "Teruel", country: "España", latitude: 40.7500, longitude: -1.4167, description: "Afluente del Jalón" },
  { name: "Río Jalón", type: "río", region: "Soria", country: "España", latitude: 42.0000, longitude: -1.5000, description: "Castilla y León" },
  { name: "Río Aljarcón", type: "río", region: "Cuenca", country: "España", latitude: 40.4667, longitude: -2.8333, description: "Afluente del Júcar" },
  { name: "Río Escabas", type: "río", region: "Ciudad Real", country: "España", latitude: 39.4167, longitude: -3.1667, description: "Pesca en La Mancha" },
  { name: "Río Guadis", type: "río", region: "Jaén", country: "España", latitude: 37.8333, longitude: -3.3333, description: "Sierra de Segura" },
  { name: "Río Guadalimar", type: "río", region: "Jaén", country: "España", latitude: 38.3333, longitude: -2.8333, description: "Frontera Jaén-Albacete" },
  { name: "Río Gualdalentín", type: "río", region: "Jaén", country: "España", latitude: 37.8333, longitude: -3.8333, description: "Pesca en Jaén" },
  { name: "Río Guadalimar", type: "río", region: "Córdoba", country: "España", latitude: 37.9167, longitude: -4.0833, description: "Embalse de Vadomojón" },
  { name: "Río Bembézar", type: "río", region: "Córdoba", country: "España", latitude: 37.8333, longitude: -4.8333, description: "Pesca de carpa" },
  { name: "Río Yeguas", type: "río", region: "Córdoba", country: "España", latitude: 37.6667, longitude: -4.6667, description: "Afluente del Guadalquivir" },
  { name: "Río Genil", type: "río", region: "Córdoba", country: "España", latitude: 37.5000, longitude: -4.2500, description: "Afluente del Guadalquivir" },
  { name: "Río Guadajoz", type: "río", region: "Córdoba", country: "España", latitude: 37.4167, longitude: -4.5833, description: "Embalse de la Breña" },
  { name: "Río Guadalmellato", type: "río", region: "Córdoba", country: "España", latitude: 37.8333, longitude: -4.4167, description: "Pesca en Córdoba" },
  { name: "Río Darro", type: "río", region: "Granada", country: "España", latitude: 36.9667, longitude: -3.6333, description: "Granada capital" },
  { name: "Río Guadalfeo", type: "río", region: "Granada", country: "España", latitude: 36.7500, longitude: -3.3333, description: "Costa tropical" },
  { name: "Río Andarax", type: "río", region: "Almería", country: "España", latitude: 36.8333, longitude: -2.8333, description: "Pesca en Almería" },
  { name: "Río Almanzora", type: "río", region: "Almería", country: "España", latitude: 37.2500, longitude: -2.1667, description: "Frontera con Murcia" },
  { name: "Río Mundo", type: "río", region: "Albacete", country: "España", latitude: 38.9167, longitude: -2.6667, description: "Trucha en la sierra" },
  { name: "Río Madera", type: "río", region: "Huelva", country: "España", latitude: 37.5000, longitude: -7.4167, description: "Frontera Portugal" },
  { name: "Río Odiel", type: "río", region: "Huelva", country: "España", latitude: 37.3333, longitude: -6.9667, description: "Pesca en Huelva" },
  { name: "Río Tinto", type: "río", region: "Huelva", country: "España", latitude: 37.7167, longitude: -6.8833, description: "Aguas coloradas" },
  
  // === ESPAÑA - EMBALSES Y PANTANOS ADICIONALES ===
  { name: "Embalse del Ebro", type: "embalse", region: "Castilla y León", country: "España", latitude: 42.8500, longitude: -3.2667, description: "Fuente, Burgos" },
  { name: "Embalse de Campillo de Ranas", type: "embalse", region: "Guadalajara", country: "España", latitude: 40.8333, longitude: -2.5833, description: "Pesca en Guadalajara" },
  { name: "Embalse de Torremocha", type: "embalse", region: "Cáceres", country: "España", latitude: 40.0833, longitude: -5.8333, description: "Extremadura" },
  { name: "Embalse de Navalmoral de la Mata", type: "embalse", region: "Cáceres", country: "España", latitude: 39.5833, longitude: -5.8333, description: "Pesca de carpa" },
  { name: "Embalse de Cíjara", type: "embalse", region: "Badajoz", country: "España", latitude: 39.3333, longitude: -4.4167, description: "Frontera norte Extremadura" },
  { name: "Embalse de Portaje", type: "embalse", region: "Badajoz", country: "España", latitude: 39.2500, longitude: -6.0833, description: "Pesca en Badajoz" },
  { name: "Embalse de Guriezo", type: "embalse", region: "Cantabria", country: "España", latitude: 43.2500, longitude: -3.6667, description: "Cantabria" },
  { name: "Embalse de Llanes", type: "embalse", region: "Cantabria", country: "España", latitude: 43.4167, longitude: -4.7500, description: "Costa asturiana" },
  { name: "Embalse de la Pena", type: "embalse", region: "Lleida", country: "España", latitude: 42.5000, longitude: 1.3333, description: "Pesca de trucha" },
  { name: "Embalse de Camarasa", type: "embalse", region: "Lleida", country: "España", latitude: 42.0833, longitude: 1.1667, description: "Pesca en Lleida" },
  { name: "Embalse de Talarn", type: "embalse", region: "Lleida", country: "España", latitude: 42.1667, longitude: 1.3333, description: "Afluente del Ebro" },
  { name: "Embalse de Lladós", type: "embalse", region: "Lleida", country: "España", latitude: 42.0333, longitude: 1.0833, description: "Pesca de carpa" },
  { name: "Embalse de Canelles", type: "embalse", region: "Lleida", country: "España", latitude: 42.1333, longitude: 0.8333, description: "Pesca de lucio" },
  { name: "Embalse de Terradets", type: "embalse", region: "Lleida", country: "España", latitude: 42.0000, longitude: 0.9167, description: "Garganta de Noguera" },
  { name: "Embalse de Monegros", type: "embalse", region: "Huesca", country: "España", latitude: 42.3333, longitude: -0.3333, description: "Pesca en Huesca" },
  { name: "Embalse del Jarama", type: "embalse", region: "Madrid", country: "España", latitude: 40.8667, longitude: -3.3333, description: "Sistema de embalses Madrid" },
  { name: "Embalse de Tordos", type: "embalse", region: "Madrid", country: "España", latitude: 40.9167, longitude: -3.5000, description: "Embalses Madrid norte" },
  { name: "Embalse de Castrejón", type: "embalse", region: "Guadalajara", country: "España", latitude: 41.1667, longitude: -3.0833, description: "Pesca en Castilla" },
  { name: "Embalse de La Tajera", type: "embalse", region: "Cuenca", country: "España", latitude: 40.5000, longitude: -2.3333, description: "Pesca de barbo" },
  { name: "Embalse de Bolarque", type: "embalse", region: "Guadalajara", country: "España", latitude: 40.2500, longitude: -3.0833, description: "Sistema de embalses" },
  { name: "Embalse de Picadas", type: "embalse", region: "Valencia", country: "España", latitude: 40.3333, longitude: -1.0833, description: "Pesca en Valencia" },
  { name: "Embalse de Tous", type: "embalse", region: "Valencia", country: "España", latitude: 39.3333, longitude: -0.8333, description: "Desastre de Tous" },
  { name: "Embalse de Presa de Benagéber", type: "embalse", region: "Valencia", country: "España", latitude: 39.5833, longitude: -0.7500, description: "Embalse del Túria" },
  { name: "Embalse de Regllo", type: "embalse", region: "Albacete", country: "España", latitude: 40.1667, longitude: -1.8333, description: "Sistema de embalses" },
  { name: "Embalse de La Toba", type: "embalse", region: "Albacete", country: "España", latitude: 38.9167, longitude: -2.1667, description: "Pesca en La Mancha" },
  { name: "Embalse de Muelas", type: "embalse", region: "Cuenca", country: "España", latitude: 40.0833, longitude: -2.8333, description: "Pesca de barbo" },
  
  // === ESPAÑA - PANTANOS ADICIONALES ===
  { name: "Pantano de Tena", type: "embalse", region: "Huesca", country: "España", latitude: 42.6667, longitude: -0.6667, description: "Pesca de trucha en Pirineos" },
  { name: "Pantano de Yesa", type: "embalse", region: "Navarra", country: "España", latitude: 42.6667, longitude: -1.4167, description: "Presa de Yesa" },
  { name: "Pantano de Itoiz", type: "embalse", region: "Navarra", country: "España", latitude: 42.8333, longitude: -1.3333, description: "Embalse navarro" },
  { name: "Pantano de Zuera", type: "embalse", region: "Navarra", country: "España", latitude: 42.5833, longitude: -1.5833, description: "Pesca en Navarra" },
  { name: "Pantano de Zapatilla", type: "embalse", region: "Navarra", country: "España", latitude: 42.4667, longitude: -1.8333, description: "Embalse de Lodosa" },
  { name: "Pantano del Purgatorio", type: "embalse", region: "Castilla y León", country: "España", latitude: 42.9167, longitude: -4.1667, description: "Pesca en León Burgos" },
  { name: "Pantano de Aguilar", type: "embalse", region: "Lérida", country: "España", latitude: 42.3667, longitude: 1.6667, description: "Pesca de trucha" },
  { name: "Pantano de Bielsa-Chiscos", type: "embalse", region: "Huesca", country: "España", latitude: 42.8333, longitude: 0.2500, description: "Circo glaciar" },
  
  // === MÉXICO ===
  { name: "Lago de Chapala", type: "lago", region: "Jalisco", country: "México", latitude: 20.2710, longitude: -102.6831, description: "Mayor lago de México" },
  { name: "Lago de Pátzcuaro", type: "lago", region: "Michoacán", country: "México", latitude: 19.5833, longitude: -101.6167, description: "Pesca artesanal de pescado blanco" },
  { name: "Presa El Cuchillo", type: "embalse", region: "Nuevo León", country: "México", latitude: 26.0833, longitude: -99.7500, description: "Pesca de lobina negra" },
  { name: "Río Papagayo", type: "río", region: "Guerrero", country: "México", latitude: 16.9167, longitude: -101.5333, description: "Pesca deportiva en Acapulco" },
  { name: "Mar Caribe - Cancún", type: "mar", region: "Quintana Roo", country: "México", latitude: 21.1629, longitude: -87.0739, description: "Pesca de pez vela y marlin" },
  { name: "Mar de Cortés", type: "mar", region: "Baja California", country: "México", latitude: 25.0000, longitude: -110.0000, description: "Pesca de atún y dorado" },
  
  // === ARGENTINA ===
  { name: "Río Limay", type: "río", region: "Neuquén", country: "Argentina", latitude: -41.0333, longitude: -71.5000, description: "Trucha arco iris en Patagonia" },
  { name: "Río Traful", type: "río", region: "Neuquén", country: "Argentina", latitude: -41.1500, longitude: -71.8500, description: "Río de montaña" },
  { name: "Río Chimehuin", type: "río", region: "Neuquén", country: "Argentina", latitude: -40.7500, longitude: -71.4000, description: "Truchas marrones" },
  { name: "Lago Nahuel Huapi", type: "lago", region: "Río Negro", country: "Argentina", latitude: -41.1333, longitude: -71.5333, description: "Mayor lago de Argentina" },
  { name: "Lago Traful", type: "lago", region: "Neuquén", country: "Argentina", latitude: -41.1667, longitude: -71.9000, description: "Lago alpino" },
  { name: "Mar Argentino - Mar del Plata", type: "mar", region: "Buenos Aires", country: "Argentina", latitude: -38.0000, longitude: -57.5667, description: "Pesca de pejerrey" },
  
  // === CHILE ===
  { name: "Río Baker", type: "río", region: "Aysén", country: "Chile", latitude: -49.0000, longitude: -72.5833, description: "Trucha en Patagonia chilena" },
  { name: "Río Futaleufú", type: "río", region: "Los Lagos", country: "Chile", latitude: -43.1833, longitude: -71.8667, description: "Pesca de trucha en frontera" },
  { name: "Lago Llanquihue", type: "lago", region: "Los Lagos", country: "Chile", latitude: -41.2833, longitude: -72.1333, description: "Segundo lago más grande de Chile" },
  { name: "Océano Pacífico - Valparaíso", type: "mar", region: "Valparaíso", country: "Chile", latitude: -33.0472, longitude: -71.6127, description: "Pesca de jurel y caballa" },
  
  // === COLOMBIA ===
  { name: "Río Magdalena", type: "río", region: "Bolívar", country: "Colombia", latitude: 10.1600, longitude: -75.5200, description: "Principal río de Colombia" },
  { name: "Embalse del Guavio", type: "embalse", region: "Cundinamarca", country: "Colombia", latitude: 5.2500, longitude: -73.4167, description: "Pesca en altiplano" },
  { name: "Mar Caribe - Cartagena", type: "mar", region: "Bolívar", country: "Colombia", latitude: 10.3954, longitude: -75.5148, description: "Pesca de snappers" },
  
  // === PERÚ ===
  { name: "Lago Titicaca", type: "lago", region: "Puno", country: "Perú", latitude: -15.8427, longitude: -70.2957, description: "Mayor lago de América del Sur" },
  { name: "Río Amazonas", type: "río", region: "Loreto", country: "Perú", latitude: -3.7500, longitude: -73.2500, description: "Mayor río del mundo" },
  { name: "Océano Pacífico - Lima", type: "mar", region: "Lima", country: "Perú", latitude: -12.0463, longitude: -77.0428, description: "Pesca de anchoveta" },
  
  // === BRASIL ===
  { name: "Río Amazonas", type: "río", region: "Amazonas", country: "Brasil", latitude: -3.1190, longitude: -60.0217, description: "Mayor río del mundo" },
  { name: "Pantanal", type: "parque", region: "Mato Grosso", country: "Brasil", latitude: -19.0000, longitude: -56.0000, description: "Mayor humedal del mundo" },
  { name: "Océano Atlántico - Rio de Janeiro", type: "mar", region: "Rio de Janeiro", country: "Brasil", latitude: -22.9068, longitude: -43.1729, description: "Pesca de pejerrey de agua dulce" },
  
  // === VENEZUELA ===
  { name: "Río Orinoco", type: "río", region: "Bolívar", country: "Venezuela", latitude: 8.7833, longitude: -62.1500, description: "Tercer río más largo de sudamérica" },
  { name: "Mar Caribe - Isla Margarita", type: "mar", region: "Nueva Esparta", country: "Venezuela", latitude: 11.0000, longitude: -63.7667, description: "Pesca de pez vela" },
  
  // === PANAMÁ ===
  { name: "Lago Gatún", type: "lago", region: "Colón", country: "Panamá", latitude: 9.2667, longitude: -79.6667, description: "Lago artificial del canal" },
  
  // === URUGUAY ===
  { name: "Río Uruguay", type: "río", region: "Salto", country: "Uruguay", latitude: -31.3833, longitude: -57.9667, description: "Pesca de dorado" },
  { name: "Océano Atlántico - Punta del Este", type: "mar", region: "Maldonado", country: "Uruguay", latitude: -34.9628, longitude: -54.9447, description: "Pesca de pejerrey" },
];

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getFieldScore = (fieldValue, query) => {
  if (!fieldValue) return 0;

  if (fieldValue === query) return 100;
  if (fieldValue.startsWith(query)) return 85;

  const index = fieldValue.indexOf(query);
  if (index >= 0) return Math.max(20, 70 - index);

  return 0;
};

// Función para buscar ubicaciones con autocompletado
export const searchFishingLocations = (query) => {
  if (!query || query.trim().length < 1) return [];

  const normalizedQuery = normalizeText(query.trim());

  return fishingLocations
    .map((location) => {
      const normalizedName = normalizeText(location.name);
      const normalizedRegion = normalizeText(location.region);
      const normalizedCountry = normalizeText(location.country);
      const normalizedType = normalizeText(location.type);
      const normalizedDescription = normalizeText(location.description || '');

      const matches =
        normalizedName.includes(normalizedQuery) ||
        normalizedRegion.includes(normalizedQuery) ||
        normalizedCountry.includes(normalizedQuery) ||
        normalizedType.includes(normalizedQuery) ||
        normalizedDescription.includes(normalizedQuery);

      if (!matches) return null;

      const score =
        getFieldScore(normalizedName, normalizedQuery) * 4 +
        getFieldScore(normalizedRegion, normalizedQuery) * 3 +
        getFieldScore(normalizedCountry, normalizedQuery) * 2 +
        getFieldScore(normalizedType, normalizedQuery) +
        (normalizedDescription.includes(normalizedQuery) ? 8 : 0);

      return { location, score };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.location.name.localeCompare(b.location.name, 'es');
    })
    .map(({ location }) => location)
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
