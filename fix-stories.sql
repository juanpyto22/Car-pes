-- 🎯 TABLA STORIES FALTANTE + STORAGE
-- Solo ejecuta esto en Supabase SQL Editor para completar la configuración

-- CREAR TABLA STORIES
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- HABILITAR RLS PARA STORIES
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA STORIES
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;
CREATE POLICY "Stories are viewable by everyone" 
ON stories FOR SELECT USING (created_at > NOW() - INTERVAL '24 hours');

DROP POLICY IF EXISTS "Users can create own stories" ON stories;
CREATE POLICY "Users can create own stories" 
ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stories" ON stories;
CREATE POLICY "Users can delete own stories" 
ON stories FOR DELETE USING (auth.uid() = user_id);

-- ¡LISTO! Ahora tu base de datos está 100% completa