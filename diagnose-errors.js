// 🔧 SCRIPT PARA DETECTAR Y CORREGIR ERRORES CRÍTICOS
// Ejecuta este archivo para verificar el estado de la aplicación

import { createClient } from '@supabase/supabase-js';

console.log('🔍 DIAGNOSTICANDO ERRORES CRÍTICOS DE CARPES...\n');

// Usar credenciales directas para evitar problemas de import.meta.env
const supabaseUrl = 'https://xmhcbilwchwazrkuebmf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtaGNiaWx3Y2h3YXpya3VlYm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjcxNTYsImV4cCI6MjA4NDA0MzE1Nn0.MtKsdAauD8Tr3SSMVJ4R7BYddOhDof3diwUiO-h9jKE';

const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function diagnoseStorageIssues() {
  console.log('📦 Verificando Storage Buckets...');
  
  const buckets = ['posts', 'stories', 'avatars'];
  
  for (const bucketName of buckets) {
    try {
      const { data, error } = await supabaseClient.storage.getBucket(bucketName);
      
      if (error || !data) {
        console.log(`❌ Bucket "${bucketName}" no existe o tiene problemas`);
        console.log(`   Error: ${error?.message || 'No encontrado'}`);
        
        // Intentar crear el bucket 
        const { data: createData, error: createError } = await supabaseClient.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          fileSizeLimit: 52428800 // 50MB
        });
        
        if (createError) {
          console.log(`   ⚠️ No se pudo crear: ${createError.message}`);
        } else {
          console.log(`   ✅ Bucket "${bucketName}" creado automáticamente`);
        }
      } else {
        console.log(`✅ Bucket "${bucketName}" existe y funciona`);
      }
    } catch (e) {
      console.log(`❌ Error verificando bucket "${bucketName}": ${e.message}`);
    }
  }
}

async function testAuthFlow() {
  console.log('\n🔐 Verificando flujo de autenticación...');
  
  try {
    // Verificar si hay sesión activa
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.log(`❌ Error obteniendo sesión: ${error.message}`);
    } else if (session) {
      console.log(`✅ Sesión activa: ${session.user.email}`);
      
      // Verificar perfil del usuario
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.log(`⚠️ Perfil no encontrado: ${profileError.message}`);
      } else {
        console.log(`✅ Perfil cargado: ${profile.username}`);
      }
    } else {
      console.log('ℹ️ No hay sesión activa (normal si no estás logueado)');
    }
  } catch (e) {
    console.log(`❌ Error en auth flow: ${e.message}`);
  }
}

async function testDatabaseConnections() {
  console.log('\n📊 Verificando conexiones a tablas...');
  
  const tables = [
    'profiles',
    'posts', 
    'comments',
    'likes',
    'follows',
    'stories',
    'notifications',
    'saved_posts'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabaseClient
        .from(table)
        .select('id')
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`❌ Tabla "${table}" no existe`);
        } else {
          console.log(`⚠️ Tabla "${table}" error: ${error.message}`);
        }
      } else {
        console.log(`✅ Tabla "${table}" accesible`);
      }
    } catch (e) {
      console.log(`❌ Error con tabla "${table}": ${e.message}`);
    }
  }
}

async function testCriticalFunctionality() {
  console.log('\n🧪 Probando funcionalidades críticas...');
  
  try {
    // Test 1: Leer posts con perfiles
    console.log('🧪 Test 1: Lectura de posts...');
    const { data: postsData, error: postsError } = await supabaseClient
      .from('posts')
      .select(`
        *,
        profiles:user_id(username, nombre, foto_perfil)
      `)
      .limit(3);
    
    if (postsError) {
      console.log(`❌ Error leyendo posts: ${postsError.message}`);
    } else {
      console.log(`✅ Posts leídos correctamente: ${postsData?.length || 0} encontrados`);
    }
    
    // Test 2: Verificar likes funcionan
    console.log('🧪 Test 2: Sistema de likes...');
    const { data: likesData, error: likesError } = await supabaseClient
      .from('likes')
      .select('*')
      .limit(1);
    
    if (likesError) {
      console.log(`❌ Error en sistema de likes: ${likesError.message}`);
    } else {
      console.log(`✅ Sistema de likes funcional`);
    }
    
  } catch (e) {
    console.log(`❌ Error en tests: ${e.message}`);
  }
}

// Función principal
async function runDiagnostics() {
  console.log('🎯 DIAGNÓSTICO COMPLETO INICIADO\n');
  
  await testDatabaseConnections();
  await diagnoseStorageIssues();
  await testAuthFlow();
  await testCriticalFunctionality();
  
  console.log('\n📋 RESUMEN:');
  console.log('• Si ves ❌ en tablas: ejecuta setup-database.sql en Supabase');
  console.log('• Si ves ❌ en buckets: ejecuta create-storage-buckets.sql');
  console.log('• Si ves ⚠️ en perfil: regístrate en la app');
  console.log('• Si todo está ✅: tu app debería funcionar perfectamente');
  console.log('\n🌟 ¡Revisa los errores específicos arriba!');
}

// Ejecutar diagnóstico
runDiagnostics().catch(console.error);