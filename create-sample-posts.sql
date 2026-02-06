-- 🎣 CREAR POSTS DE PRUEBA PARA CARPES
-- Ejecutar en Supabase SQL Editor para llenar el feed

-- Insertar posts de ejemplo con diferentes usuarios
INSERT INTO posts (id, user_id, content, image_url, location, fish_species, fish_weight, likes_count, comments_count, created_at) VALUES
(
  gen_random_uuid(),
  (SELECT id FROM profiles LIMIT 1),
  '🎣 ¡Mi primera captura del año! Este robalo de 2.5kg me dio una pelea increíble. El amanecer en el río fue espectacular.',
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
  'Río Magdalena, Colombia',
  'Róbalo',
  '2.5',
  12,
  3,
  NOW() - INTERVAL '2 hours'
),
(
  gen_random_uuid(),
  (SELECT id FROM profiles LIMIT 1),
  '🌅 Salida de pesca matutina exitosa. Capturé esta hermosa trucha arcoíris usando señuelo artificial. ¡La técnica de spinning nunca falla!',
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
  'Laguna de Tota, Boyacá',
  'Trucha Arcoíris',
  '1.8',
  8,
  2,
  NOW() - INTERVAL '5 hours'
),
(
  gen_random_uuid(),
  (SELECT id FROM profiles LIMIT 1),
  '🏆 ¡Récord personal! Esta carpa espejo de 4.2kg fue la captura del día. Dos horas de paciencia valieron la pena.',
  'https://images.unsplash.com/photo-1582451917219-07c4ad0e12d5?w=800&h=600&fit=crop',
  'Embalse del Guavio',
  'Carpa Espejo',
  '4.2',
  25,
  7,
  NOW() - INTERVAL '1 day'
),
(
  gen_random_uuid(),
  (SELECT id FROM profiles LIMIT 1),
  '🎯 Técnica de pesca con mosca en acción. Este bagre rayado cayó con una mosca casera que hice ayer. ¡Nada como la satisfacción de pescar con tus propios señuelos!',
  'https://images.unsplash.com/photo-1508888178007-8c1a8f892a1b?w=800&h=600&fit=crop',
  'Río Cauca',
  'Bagre Rayado',
  '3.1',
  15,
  4,
  NOW() - INTERVAL '1 day 3 hours'
),
(
  gen_random_uuid(),
  (SELECT id FROM profiles LIMIT 1),
  '🌊 Pesca en altamar, captura y liberación. Esta mojarra amarilla vuelve al agua para que siga creciendo. ¡Pesca responsable siempre! 🐟💚',
  'https://images.unsplash.com/photo-1515023115689-589c33b5640c?w=800&h=600&fit=crop',
  'Costa Pacífica, Chocó',
  'Mojarra Amarilla',
  '0.8',
  18,
  6,
  NOW() - INTERVAL '2 days'
);

-- Crear algunos comentarios para los posts
INSERT INTO comments (id, post_id, user_id, content, created_at) VALUES
(
  gen_random_uuid(),
  (SELECT id FROM posts ORDER BY created_at DESC LIMIT 1 OFFSET 0),
  (SELECT id FROM profiles LIMIT 1),
  '¡Increíble captura! 🎣 ¿Qué señuelo utilizaste?',
  NOW() - INTERVAL '30 minutes'
),
(
  gen_random_uuid(),
  (SELECT id FROM posts ORDER BY created_at DESC LIMIT 1 OFFSET 0),
  (SELECT id FROM profiles LIMIT 1),
  'Esa técnica de spinning es efectiva. Yo también tengo buenos resultados con ella.',
  NOW() - INTERVAL '15 minutes'
),
(
  gen_random_uuid(),
  (SELECT id FROM posts ORDER BY created_at DESC LIMIT 1 OFFSET 1),
  (SELECT id FROM profiles LIMIT 1),
  '¡Qué hermoso paisaje! La Laguna de Tota es espectacular para pescar.',
  NOW() - INTERVAL '2 hours'
),
(
  gen_random_uuid(),
  (SELECT id FROM posts ORDER BY created_at DESC LIMIT 1 OFFSET 2),
  (SELECT id FROM profiles LIMIT 1),
  '4.2kg es un récord increíble para carpa espejo. ¡Felicitaciones! 🏆',
  NOW() - INTERVAL '20 hours'
);

-- Crear algunos likes para los posts
INSERT INTO likes (id, post_id, user_id, created_at) VALUES
(
  gen_random_uuid(),
  (SELECT id FROM posts ORDER BY created_at DESC LIMIT 1 OFFSET 0),
  (SELECT id FROM profiles LIMIT 1),
  NOW() - INTERVAL '1 hour'
),
(
  gen_random_uuid(),
  (SELECT id FROM posts ORDER BY created_at DESC LIMIT 1 OFFSET 1),
  (SELECT id FROM profiles LIMIT 1),
  NOW() - INTERVAL '3 hours'
),
(
  gen_random_uuid(),
  (SELECT id FROM posts ORDER BY created_at DESC LIMIT 1 OFFSET 2),
  (SELECT id FROM profiles LIMIT 1),
  NOW() - INTERVAL '12 hours'
);

-- Verificar que se crearon los posts
SELECT 
  p.id,
  p.content,
  p.location,
  p.fish_species,
  p.likes_count,
  p.comments_count,
  p.created_at,
  pr.username
FROM posts p
LEFT JOIN profiles pr ON p.user_id = pr.id
ORDER BY p.created_at DESC;

-- ✅ DATOS DE PRUEBA CREADOS
-- Ahora tu feed mostrará contenido real