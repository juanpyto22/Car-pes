import { supabase } from './src/lib/customSupabaseClient.js';

console.log('🔍 Car-Pes Debug Script');
console.log('========================');

// Test 1: Verificar configuración
console.log('\n📋 1. Verificando configuración de Supabase...');
const url = supabase.supabaseUrl;
const key = supabase.supabaseKey ? 'Configurado ✅' : 'No configurado ❌';
console.log(`   URL: ${url}`);
console.log(`   API Key: ${key}`);

// Test 2: Test de conexión
console.log('\n🌐 2. Probando conexión...');
try {
  const { data, error } = await supabase.from('profiles').select('count').limit(1);
  if (error) {
    console.log(`   ❌ Error de conexión: ${error.message}`);
    console.log(`   💡 Posibles soluciones:`);
    console.log(`      - Verificar que las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén configuradas`);
    console.log(`      - Crear la tabla 'profiles' en Supabase`);
    console.log(`      - Verificar permisos RLS en Supabase`);
  } else {
    console.log(`   ✅ Conexión exitosa`);
  }
} catch (error) {
  console.log(`   ❌ Error de conexión: ${error.message}`);
}

// Test 3: Test de autenticación
console.log('\n🔐 3. Probando autenticación...');
try {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    console.log(`   ✅ Usuario autenticado: ${user.email}`);
  } else {
    console.log(`   ℹ️ No hay usuario autenticado (esto es normal)`);
  }
} catch (error) {
  console.log(`   ❌ Error de autenticación: ${error.message}`);
}

console.log('\n✨ Debug completado. Revisa los resultados arriba.');
console.log('📝 Si hay errores, consulta la documentación de Supabase o contacta soporte.');