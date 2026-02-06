-- ========================================
-- INSERTAR DATOS INICIALES DEL BATTLE PASS
-- Ejecutar DESPUÉS de setup-battle-pass.sql
-- ========================================

-- Crear una temporada de prueba
INSERT INTO public.battle_pass_seasons (
  season_number, 
  name, 
  description, 
  start_date, 
  end_date, 
  max_level,
  is_active
) VALUES (
  1,
  'Temporada 1: Aguas Calmadas',
  'Primera temporada de Car-Pes. Domina las aguas y consigue recompensas épicas.',
  NOW(),
  NOW() + INTERVAL '90 days',
  50,
  true
);

-- Variable para almacenar el ID de la temporada
-- Nota: En Supabase necesitarás ejecutar esto en dos pasos

-- Paso 1: Obtener el ID de la temporada (ejecutar por separado)
-- SELECT id FROM public.battle_pass_seasons WHERE season_number = 1;

-- Para esta demostración, insertaremos directamente
WITH season_data AS (
  SELECT id FROM public.battle_pass_seasons WHERE season_number = 1 LIMIT 1
)
INSERT INTO public.battle_pass_rewards (
  season_id,
  level,
  tier,
  reward_type,
  reward_value,
  reward_name,
  reward_description,
  icon
)
SELECT
  sd.id,
  data.level,
  data.tier,
  data.reward_type,
  data.reward_value,
  data.reward_name,
  data.reward_description,
  data.icon
FROM season_data sd
CROSS JOIN (
  VALUES
    -- Nivel 5
    (5, 'Bronze', 'coins', 150, '150 Monedas', 'Primeras monedas de tu viaje', 'Coins'),
    (5, 'Bronze', 'badge', NULL, 'Badge: Aprendiz', 'Tu primer logro en el battle pass', 'Badge'),
    
    -- Nivel 10
    (10, 'Bronze', 'coins', 300, '300 Monedas', 'Recompensa por alcanzar nivel 10', 'Coins'),
    (10, 'Bronze', 'avatar_frame', NULL, 'Marco: Bronce', 'Marco de perfil bronce', 'Frame'),
    
    -- Nivel 15
    (15, 'Silver', 'coins', 500, '500 Monedas', 'Gran progreso', 'Coins'),
    (15, 'Silver', 'title', NULL, 'Título: Pescador Novel', 'Título de perfil', 'Title'),
    
    -- Nivel 20
    (20, 'Silver', 'coins', 750, '750 Monedas', 'Mitad del camino', 'Coins'),
    (20, 'Silver', 'badge', NULL, 'Badge: Experto', 'Casi maestro', 'Badge'),
    
    -- Nivel 25
    (25, 'Silver', 'coins', 1000, '1€ en monedas', 'Primera moneda completa', 'Coins'),
    (25, 'Silver', 'avatar_frame', NULL, 'Marco: Plata', 'Marco de perfil plata', 'Frame'),
    
    -- Nivel 30
    (30, 'Gold', 'coins', 1250, '1.25€ en monedas', 'Tres cuartas partes', 'Coins'),
    (30, 'Gold', 'badge', NULL, 'Badge: Maestro', 'Ya eres maestro', 'Badge'),
    
    -- Nivel 35
    (35, 'Gold', 'coins', 1500, '1.5€ en monedas', 'Casi al tope', 'Coins'),
    (35, 'Gold', 'title', NULL, 'Título: Leyenda del Mar', 'Título legendario', 'Title'),
    
    -- Nivel 40
    (40, 'Platinum', 'coins', 2000, '2€ en monedas', 'Réquiem dorado', 'Coins'),
    (40, 'Platinum', 'avatar_frame', NULL, 'Marco: Oro', 'Marco de perfil oro', 'Frame'),
    
    -- Nivel 45
    (45, 'Platinum', 'coins', 2500, '2.5€ en monedas', 'Casi perfecto', 'Coins'),
    (45, 'Platinum', 'badge', NULL, 'Badge: Inmortal', 'Has alcanzado la gloria', 'Badge'),
    
    -- Nivel 50 (MÁXIMO)
    (50, 'Diamond', 'coins', 5000, '5€ en monedas', 'Recompensa final - ¡LEGENDARIO!', 'Coins'),
    (50, 'Diamond', 'title', NULL, 'Título: Dios de la Pesca', 'Solo para los elegidos', 'Title'),
    (50, 'Diamond', 'avatar_frame', NULL, 'Marco: Diamante', 'Marco de perfil diamante', 'Frame')
) AS data(level, tier, reward_type, reward_value, reward_name, reward_description, icon)
ON CONFLICT DO NOTHING;

-- Mensaje de éxito
-- Si llegaste aquí sin errores, ¡el battle pass está configurado!
