import { supabase } from './src/lib/customSupabaseClient.js';
import fs from 'fs';

console.log('🚀 CONFIGURANDO BASE DE DATOS COMPLETA DE CARPES...\n');

async function setupDatabase() {
  try {
    // 1. Leer archivo SQL
    console.log('📖 Leyendo script SQL...');
    const sqlScript = fs.readFileSync('./setup-database.sql', 'utf8');
    
    // 2. Ejecutar script completo
    console.log('⚡ Ejecutando configuración de base de datos...');
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: sqlScript 
    });
    
    if (error) {
      console.log('⚠️  Error con RPC, intentando ejecutar por partes...');
      
      // 3. Ejecutar por partes más pequeñas
      const sqlParts = sqlScript.split(';').filter(part => part.trim());
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < sqlParts.length; i++) {
        const part = sqlParts[i].trim();
        if (part) {
          try {
            const { error: partError } = await supabase.from('_').select('*').limit(0);
            // Usar query directo
            const { error: execError } = await supabase.rpc('exec', { query: part + ';' });
            
            if (execError) {
              console.log(`❌ Error en parte ${i + 1}: ${execError.message}`);
              errorCount++;
            } else {
              console.log(`✅ Parte ${i + 1} ejecutada correctamente`);
              successCount++;
            }
          } catch (e) {
            console.log(`⚠️  Parte ${i + 1}: ${e.message || 'Error desconocido'}`);
            errorCount++;
          }
          
          // Pausa pequeña entre consultas
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`\n📊 Resumen: ${successCount} exitosas, ${errorCount} errores`);
    } else {
      console.log('✅ Script ejecutado completamente');
    }

    // 4. Verificar tablas creadas
    console.log('\n🔍 Verificando tablas creadas...');
    const tables = ['profiles', 'posts', 'comments', 'likes', 'follows', 'stories', 'notifications', 'saved_posts'];
    
    for (const table of tables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (tableError) {
          console.log(`❌ Tabla '${table}': ${tableError.message}`);
        } else {
          console.log(`✅ Tabla '${table}' funcionando correctamente`);
        }
      } catch (e) {
        console.log(`⚠️  Error verificando tabla '${table}': ${e.message}`);
      }
    }
    
    // 5. Configurar Storage Buckets
    console.log('\n🗂️  Configurando Storage Buckets...');
    const buckets = [
      { name: 'posts', public: true },
      { name: 'stories', public: true },
      { name: 'avatars', public: true }
    ];
    
    for (const bucket of buckets) {
      try {
        const { data: bucketData, error: bucketError } = await supabase.storage.createBucket(
          bucket.name, 
          { public: bucket.public }
        );
        
        if (bucketError && !bucketError.message.includes('already exists')) {
          console.log(`❌ Bucket '${bucket.name}': ${bucketError.message}`);
        } else {
          console.log(`✅ Bucket '${bucket.name}' configurado`);
        }
      } catch (e) {
        console.log(`⚠️  Error configurando bucket '${bucket.name}': ${e.message}`);
      }
    }
    
    // 6. Verificar conexión y auth
    console.log('\n🔐 Verificando configuración de auth...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log(`⚠️  Auth: ${authError.message} (normal si no hay usuario logueado)`);
    } else if (user) {
      console.log(`✅ Usuario conectado: ${user.email}`);
    } else {
      console.log(`ℹ️  No hay usuario conectado (normal)`);
    }

    console.log('\n🎉 ¡CONFIGURACIÓN COMPLETA!');
    console.log('✨ Tu app Car-pes está lista para usar datos REALES');
    console.log('🔗 Prueba registrarte en: http://localhost:5173/signup');
    
  } catch (error) {
    console.error('💥 Error fatal:', error.message);
    
    // Mostrar instrucciones manuales
    console.log('\n📋 INSTRUCCIONES MANUALES:');
    console.log('1. Ve a: https://app.supabase.com/project/xmhcbilwchwazrkuebmf/sql');
    console.log('2. Copia y pega todo el contenido de setup-database.sql');
    console.log('3. Presiona "Run"');
    console.log('4. Ve a Storage y crea buckets: posts, stories, avatars');
  }
}

// Ejecutar configuración
setupDatabase();