# 🚀 Configuración Real de Car-Pes

## PASO 1: Configurar Base de Datos Supabase

### A. Crear Tablas Principales
Copia y pega esto en tu **Supabase Dashboard → SQL Editor**:

```sql
-- ===================================
-- 🗃️ TABLA PROFILES (Principal)  
-- ===================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  foto_perfil TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 🎣 TABLA POSTS (Publicaciones)
-- ===================================
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  location TEXT,
  fish_species TEXT,
  fish_weight TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 💬 TABLA COMMENTS (Comentarios)
-- ===================================
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- ❤️ TABLA LIKES (Me gusta)
-- ===================================
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ===================================
-- 👥 TABLA FOLLOWS (Seguidores)
-- ===================================
CREATE TABLE follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- ===================================
-- 📖 TABLA STORIES (Historias)
-- ===================================
CREATE TABLE stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ===================================
-- 🔔 TABLA NOTIFICATIONS
-- ===================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'like', 'comment', 'follow', 'post'
  content TEXT,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 💾 TABLA SAVED_POSTS (Posts Guardados)
-- ===================================
CREATE TABLE saved_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);
```

### B. Configurar Políticas de Seguridad (RLS)
Ejecuta esto también en SQL Editor:

```sql
-- ===================================
-- 🔒 HABILITAR ROW LEVEL SECURITY
-- ===================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 📋 POLÍTICAS PROFILES
-- ===================================
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can create own profile" 
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE USING (auth.uid() = id);

-- ===================================
-- 📋 POLÍTICAS POSTS
-- ===================================
CREATE POLICY "Posts are viewable by everyone" 
ON posts FOR SELECT USING (true);

CREATE POLICY "Users can create own posts" 
ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" 
ON posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" 
ON posts FOR DELETE USING (auth.uid() = user_id);

-- ===================================
-- 📋 POLÍTICAS COMMENTS
-- ===================================
CREATE POLICY "Comments are viewable by everyone" 
ON comments FOR SELECT USING (true);

CREATE POLICY "Users can create comments" 
ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" 
ON comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" 
ON comments FOR DELETE USING (auth.uid() = user_id);

-- ===================================
-- 📋 POLÍTICAS LIKES
-- ===================================
CREATE POLICY "Likes are viewable by everyone" 
ON likes FOR SELECT USING (true);

CREATE POLICY "Users can create likes" 
ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" 
ON likes FOR DELETE USING (auth.uid() = user_id);

-- ===================================
-- 📋 POLÍTICAS FOLLOWS
-- ===================================
CREATE POLICY "Follows are viewable by everyone" 
ON follows FOR SELECT USING (true);

CREATE POLICY "Users can create follows" 
ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows" 
ON follows FOR DELETE USING (auth.uid() = follower_id);

-- ===================================
-- 📋 POLÍTICAS STORIES
-- ===================================
CREATE POLICY "Stories are viewable by everyone" 
ON stories FOR SELECT USING (true);

CREATE POLICY "Users can create own stories" 
ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" 
ON stories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" 
ON stories FOR DELETE USING (auth.uid() = user_id);

-- ===================================
-- 📋 POLÍTICAS NOTIFICATIONS
-- ===================================
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ===================================
-- 📋 POLÍTICAS SAVED_POSTS
-- ===================================
CREATE POLICY "Users can view own saved posts" 
ON saved_posts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved posts" 
ON saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved posts" 
ON saved_posts FOR DELETE USING (auth.uid() = user_id);
```

### C. Configurar Storage
En Supabase Dashboard → Storage:
1. Crear bucket `posts` (público)  
2. Crear bucket `stories` (público)
3. Crear bucket `avatars` (público)

### D. Configurar Funciones y Triggers
```sql
-- ===================================
-- 🔄 FUNCIÓN UPDATE TIMESTAMP
-- ===================================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ===================================
-- 🔄 TRIGGERS PARA UPDATE TIMESTAMP
-- ===================================
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_posts_updated_at
  BEFORE UPDATE ON posts  
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ===================================
-- 🔄 FUNCIÓN PARA CONTAR LIKES
-- ===================================
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 🔄 TRIGGERS PARA LIKES COUNT
-- ===================================
CREATE TRIGGER update_likes_count_on_insert
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

CREATE TRIGGER update_likes_count_on_delete
  AFTER DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

-- ===================================
-- 🔄 FUNCIÓN PARA CONTAR COMENTARIOS
-- ===================================
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 🔄 TRIGGERS PARA COMMENTS COUNT
-- ===================================
CREATE TRIGGER update_comments_count_on_insert
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_count();

CREATE TRIGGER update_comments_count_on_delete
  AFTER DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_count();

-- ===================================
-- 🔄 FUNCIÓN PARA CONTAR FOLLOWERS
-- ===================================
CREATE OR REPLACE FUNCTION update_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 🔄 TRIGGERS PARA FOLLOWERS COUNT
-- ===================================
CREATE TRIGGER update_followers_count_on_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_followers_count();

CREATE TRIGGER update_followers_count_on_unfollow
  AFTER DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_followers_count();
```

## PASO 2: Verificar Configuración Environment

Verifica que tu `.env.local` tenga:
```env
VITE_SUPABASE_URL=tu_url_real_supabase
VITE_SUPABASE_ANON_KEY=tu_key_real_supabase
```

## PASO 3: Datos de Prueba (Opcional)

Si quieres datos iniciales para testing:
```sql
-- Insertar un post de ejemplo (después de registrar usuario)
-- Reemplaza 'tu-user-id' con tu UUID real
INSERT INTO posts (user_id, content, location, fish_species, fish_weight) VALUES 
('tu-user-id', '¡Primera captura del año! 🎣', 'Lago Nahuel Huapi', 'Trucha', '2.5kg');
```

## ✅ CHECKLIST FINAL

- [ ] ✅ Ejecutar SQL de creación de tablas
- [ ] ✅ Ejecutar SQL de políticas de seguridad  
- [ ] ✅ Ejecutar SQL de funciones y triggers
- [ ] ✅ Crear buckets en Storage
- [ ] ✅ Verificar variables de entorno
- [ ] ✅ Probar registro de usuario
- [ ] ✅ Probar creación de post
- [ ] ✅ Probar likes y comentarios

¡Listo! Con esto tendrás Car-Pes funcionando 100% real 🚀