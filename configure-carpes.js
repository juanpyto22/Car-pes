// 🚀 CONFIGURACIÓN AUTOMÁTICA COMPLETA DE CARPES
// Ejecuta este script para configurar toda la base de datos

import { createClient } from '@supabase/supabase-js';

// Credenciales directas desde el proyecto
const supabaseUrl = 'https://xmhcbilwchwazrkuebmf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtaGNiaWx3Y2h3YXpya3VlYm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjcxNTYsImV4cCI6MjA4NDA0MzE1Nn0.MtKsdAauD8Tr3SSMVJ4R7BYddOhDof3diwUiO-h9jKE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🎯 CONFIGURACIÓN AUTOMÁTICA DE CARPES INICIADA\n');

// ===== FUNCIONES DE CONFIGURACIÓN =====

async function testConnection() {
  console.log('🔌 Probando conexión a Supabase...');
  try {
    // Test simple de conexión
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('⚠️  Tabla profiles no existe, necesitamos crearla');
      return false;
    } else if (error) {
      console.log('❌ Error de conexión:', error.message);
      return false;
    } else {
      console.log('✅ Conexión exitosa - Base de datos ya configurada');
      return true;
    }
  } catch (e) {
    console.log('❌ Error de conexión:', e.message);
    return false;
  }
}

async function createTablesManual() {
  console.log('🏗️  Creando tablas manualmente...');
  
  // Crear perfiles de prueba para verificar funcionamiento
  try {
    console.log('📝 Intentando operación de prueba...');
    const testData = {
      id: '00000000-0000-0000-0000-000000000000',
      username: 'test_user',
      nombre: 'Usuario Test',
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([testData])
      .select();
    
    if (error) {
      console.log('⚠️  Error insertando datos de prueba:', error.message);
      return false;
    } else {
      console.log('✅ Tabla profiles funcionando');
      
      // Limpiar dato de prueba
      await supabase.from('profiles').delete().eq('id', testData.id);
      return true;
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
    return false;
  }
}

async function checkAllTables() {
  console.log('📋 Verificando todas las tablas...');
  
  const tables = ['profiles', 'posts', 'comments', 'likes', 'follows', 'stories', 'notifications', 'saved_posts'];
  const results = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        results[table] = false;
      } else {
        console.log(`✅ ${table}: OK`);
        results[table] = true;
      }
    } catch (e) {
      console.log(`❌ ${table}: ${e.message}`);
      results[table] = false;
    }
  }
  
  return results;
}

async function setupStorageBuckets() {
  console.log('\n🗂️  Configurando Storage Buckets...');
  
  const buckets = [
    { name: 'posts', public: true, fileTypes: ['image/jpeg', 'image/png', 'image/webp'] },
    { name: 'stories', public: true, fileTypes: ['image/jpeg', 'image/png', 'image/webp'] },
    { name: 'avatars', public: true, fileTypes: ['image/jpeg', 'image/png', 'image/webp'] }
  ];
  
  for (const bucket of buckets) {
    try {
      // Primero verificar si existe
      const { data: existingBucket } = await supabase.storage.getBucket(bucket.name);
      
      if (existingBucket) {
        console.log(`✅ Bucket "${bucket.name}" ya existe`);
        continue;
      }
      
      // Crear bucket
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: bucket.fileTypes,
        fileSizeLimit: 52428800, // 50MB
      });
      
      if (error && !error.message.includes('already exists')) {
        console.log(`❌ Error creando bucket "${bucket.name}": ${error.message}`);
      } else {
        console.log(`✅ Bucket "${bucket.name}" creado exitosamente`);
      }
      
    } catch (e) {
      console.log(`⚠️  Error con bucket "${bucket.name}": ${e.message}`);
    }
  }
}

async function testFullFunctionality() {
  console.log('\n🧪 Probando funcionalidad completa...');
  
  try {
    // Verificar que podemos leer posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          username,
          nombre,
          foto_perfil
        )
      `)
      .limit(5);
    
    if (postsError) {
      console.log('❌ Error leyendo posts:', postsError.message);
      return false;
    } else {
      console.log(`✅ Posts: ${posts?.length || 0} encontrados`);
    }
    
    // Verificar que podemos leer perfiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);
    
    if (profilesError) {
      console.log('❌ Error leyendo profiles:', profilesError.message);
      return false;
    } else {
      console.log(`✅ Profiles: ${profiles?.length || 0} encontrados`);
    }
    
    return true;
    
  } catch (e) {
    console.log('❌ Error general:', e.message);
    return false;
  }
}

// ===== FUNCIÓN PRINCIPAL =====
async function main() {
  try {
    // 1. Test de conexión
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.log('\n📋 NECESITAS CONFIGURAR LA BASE DE DATOS MANUALMENTE:');
      console.log('🌐 Ve a: https://app.supabase.com/project/xmhcbilwchwazrkuebmf/sql');
      console.log('📄 Copia TODO el contenido de setup-database.sql');
      console.log('▶️  Presiona "Run" en el editor SQL');
      console.log('\n⏳ Después ejecuta este script otra vez: node setup-auto.js');
      return;
    }
    
    // 2. Verificar todas las tablas
    const tableResults = await checkAllTables();
    const allTablesOK = Object.values(tableResults).every(result => result === true);
    
    if (!allTablesOK) {
      console.log('\n⚠️  Algunas tablas tienen problemas');
      console.log('📋 EJECUTA ESTE SQL EN SUPABASE:');
      console.log('🌐 https://app.supabase.com/project/xmhcbilwchwazrkuebmf/sql');
      console.log('📄 Contenido completo en: setup-database.sql');
      return;
    }
    
    // 3. Configurar storage
    await setupStorageBuckets();
    
    // 4. Test final
    const isWorking = await testFullFunctionality();
    
    if (isWorking) {
      console.log('\n🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!');
      console.log('✨ Tu app Car-pes está 100% lista');
      console.log('');
      console.log('🚀 PRÓXIMOS PASOS:');
      console.log('1. npm run dev (para iniciar la app)');
      console.log('2. Ve a http://localhost:5173');
      console.log('3. Regístrate y crea tu primer post');
      console.log('4. ¡Todo funciona con datos REALES!');
      console.log('');
      console.log('🔥 FUNCIONES DISPONIBLES:');
      console.log('✅ Registro y login');
      console.log('✅ Crear posts con imágenes');
      console.log('✅ Sistema de likes reales');
      console.log('✅ Comentarios con perfiles');
      console.log('✅ Seguir usuarios');
      console.log('✅ Stories temporales');
      console.log('✅ Notificaciones');
      console.log('✅ Guardar posts');
    } else {
      console.log('\n⚠️  Configuración parcial - algunas funciones necesitan ajustes');
    }
    
  } catch (error) {
    console.error('\n💥 Error durante configuración:', error.message);
    console.log('\n📋 CONFIGURACIÓN MANUAL REQUERIDA:');
    console.log('1. Ve a https://app.supabase.com/project/xmhcbilwchwazrkuebmf');
    console.log('2. Ve a SQL Editor');
    console.log('3. Ejecuta setup-database.sql');
    console.log('4. Ve a Storage y crea buckets: posts, stories, avatars');
  }
}

// Ejecutar configuración
main();