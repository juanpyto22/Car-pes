// 🔧 CONFIGURACIÓN SUPABASE PARA EVITAR RATE LIMITING
// Instrucciones para Admin de Supabase

/*
PARA ARREGLAR RATE LIMITING EN REGISTROS:

1. Ve a tu Dashboard de Supabase: https://app.supabase.com/project/xmhcbilwchwazrkuebmf
2. Ve a Authentication → Settings
3. Cambiar estas configuraciones:

📧 EMAIL SETTINGS:
• "Enable email confirmations" → DESACTIVAR
• "Enable secure email change" → DESACTIVAR  
• "Enable double opt-in" → DESACTIVAR

🔐 AUTHENTICATION SETTINGS:
• "Allow new user enrollments" → ACTIVAR
• "Email Rate Limiting" → REDUCIR A 5 por hora o DESACTIVAR
• "Password Rate Limiting" → REDUCIR A 10 por hora

⚡ RATE LIMITING SETTINGS:
• Global Rate Limit → AUMENTAR a 100 requests/minuto
• Auth Rate Limit → AUMENTAR a 20 requests/minuto
• Signup Rate Limit → 10 por minuto por IP

🎯 MODO DESARROLLO:
• Temporal: deshabilita todas las limitaciones
• Producción: volver a habilitar gradualmente

Con estos cambios, los usuarios podrán registrarse sin esperar 5 minutos.
*/

export const RATE_LIMITING_TIPS = [
  "Usar emails únicos: usuario123@gmail.com, usuario456@gmail.com",
  "Esperar 2-3 minutos entre registros del mismo IP", 
  "Usar incognito/private browsing para 'nueva IP'",
  "Esperar unos minutos antes de volver a intentar",
  "Configurar Supabase auth settings (ver arriba)"
];

export const EMAIL_SUGGESTIONS = () => {
  const timestamp = Date.now().toString().slice(-4);
  return [
    `test${timestamp}@gmail.com`,
    `demo${timestamp}@outlook.com`, 
    `user${timestamp}@yahoo.com`,
    `pescador${timestamp}@carpes.com`
  ];
};