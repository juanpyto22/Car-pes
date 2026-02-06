# 🎯 Setup: Sistema de Niveles, XP y Retirada de Dinero

Este documento explica cómo activar el nuevo sistema de **Niveles + XP + Retirada de Dinero** en Car-Pes.

## 📋 Requisitos Previos

Asegúrate de haber ejecutado PRIMERO:
- ✅ `setup-achievements.sql` 
- ✅ `setup-battle-pass.sql`
- ✅ `setup-battle-pass-data.sql`

Si no los ejecutaste aún, hazlo primero que éstos.

## 🚀 Paso 1: Ejecutar el SQL Principal

### En Supabase Dashboard:
1. Ve a **SQL Editor** → **+ New Query**
2. Copia y pega el contenido de **`setup-level-rewards.sql`**
3. Click en **Run** (botón azul)
4. Espera el mensaje "Success ✅"

### ¿Qué se crea?
- ✅ `achievements_library` - Catálogo de 20+ logros con XP rewards
- ✅ `level_rewards` - Recompensas por cada 10 niveles
- ✅ `user_bank_accounts` - Guardar PayPal/IBAN de usuarios
- ✅ `withdrawal_requests` - Historial de retiros
- ✅ `level_up_log` - Registro de subidas de nivel
- ✅ 6 funciones RPC para gestionar el sistema

**Actualiza `user_stats` con nuevas columnas:**
- `total_xp` - XP acumulativo del usuario
- `current_level` - Nivel actual (1-200)
- `level_up_coins` - Monedas virtuales sin retirar

## 💡 Cómo Funciona

### Curva de XP (Lineal)
```
Nivel 1 → 0 XP necesarios
Nivel 2 → 100 XP totales
Nivel 3 → 200 XP totales
Nivel 10 → 900 XP totales
Nivel 100 → 9,900 XP totales
```

### Recompensas por Nivel (Cada 10 niveles)
| Nivel | Euros | Monedas | Tier |
|-------|-------|---------|------|
| 10 | €0.50 | 5,000 | Bronze |
| 20 | €1.00 | 10,000 | Bronze |
| 30 | €1.50 | 15,000 | Silver |
| 50 | €2.50 | 25,000 | Gold |
| 100 | €5.00 | 50,000 | Platinum |
| 150 | €7.50 | 75,000 | Diamond |
| 200 | €10.00 | 100,000 | Diamond |

### Sistema de Cashout
- ✅ Mínimo para retirar: **€10.00**
- ✅ Máximo retirable: Sin límite
- ✅ Métodos: **PayPal** o **IBAN Bancario**
- ✅ Velocidad: Automático (integración pendiente con proveedor de pagos)
- ✅ Conversión: 1 Euro = 10,000 monedas virtuales

## 🎮 Ejemplos de Logros (20+ disponibles)

### De Entrada
```
- "Tu Primer Catch" → 100 XP (publicar primer post)
- "Mariposa Social" → 150 XP (10 followers)
- "Influencer" → 500 XP (100 followers)
```

### De Interacción
```
- "Me Gusta Primer Catch" → 50 XP
- "Coleccionista de Likes" → 300 XP (100 likes recibidos)
- "Generoso" → 250 XP (100 likes dados)
```

### De Contenido
```
- "Tu Primera Historia" → 75 XP
- "Maestro de Histórias" → 300 XP (10 stories)
- "Primer Objeto" → 200 XP (marketplace)
```

Hay 20+ más... ¡Explora!

## 🖥️ Interfaz de Usuario (Frontend)

### 1. **Página de Logros** (`/achievements`)
- Muestra tu **Nivel actual**
- Barra de **XP Progress** (ej: 450/1000 XP)
- Lista de **Logros desbloqueables**
- **Leaderboard** global por XP
- Cuando desbloqueas un logro, ganas XP automáticamente

### 2. **Página de Recompensas** (`/rewards`)
- **Battle Pass Progress** (Nivel 1-50)
- **Monedas ganadas** de battle pass
- Pestaña **Wallet** mostrando saldo actual

### 3. **Página de Cashout** (`/cashout`) ⭐ NUEVA
- **Saldo actual** en euros y monedas
- **Agregar Cuenta Bancaria** (PayPal o IBAN)
- **Solicitar Retiro** (mínimo €10)
- **Historial de Retiros** con estado (pending, completed, failed)

**Ubicación en el menú:**
- Click en tu avatar (esquina superior derecha)
- Selecciona **"💰 Retirar Dinero"**

## 🧪 Pruebas Locales

### Test 1: Ver tu nivel
1. Abre `localhost:3002/achievements`
2. Deberías ver "Nivel: 1" y "XP: 0"
3. La barra de progreso debe estar en 0%

### Test 2: Desbloquear un logro (manual)
1. Crea un post nuevo en `/create-post`
2. Vuelve a `/achievements`
3. Deberías ver "Tu Primer Catch" desbloqueado ✓
4. XP incrementado: 100 XP
5. Nivel podría cambiar si acumulas suficiente

### Test 3: Ver recompensas por nivel
1. Ve a `/rewards`
2. Pestaña "💳 Wallet" → Verás €0.00 (porque estás en nivel 1)
3. Si llegabas a nivel 10, verías €0.50

### Test 4: Página de Cashout
1. Ve a tu avatar → **"Retirar Dinero"**
2. O directo a `localhost:3002/cashout`
3. Deberías ver "Saldo Disponible: €0.00"
4. Botón para agregar cuenta (deshabilitado hasta tener €10)

## 📊 Integración de Sistemas

El nuevo sistema se conecta así:

```
Acciones del Usuario
    ↓
Desbloquear Logro (+XP)
    ↓
add_xp_to_user() RPC
    ↓
Sumar XP a total_xp
    ↓
Recalcular nivel
    ↓
¿Subiste de nivel (múltiple de 10)?
    ├─ SÍ: Darle monedas + log del level up
    └─ NO: Solo guardar XP
    ↓
Usuario ve notificación de logro + XP
```

## 🔄 Integración con Battle Pass (Próximamente)

El XP que ganas de logros se suma a:
- ✅ `user_stats.total_xp` (para tu nivel global)
- ⏳ PRÓXIMAMENTE: También contar para battle pass XP

Esto significa: **Ganar XP en logros = Subir en ambos sistemas**

## 🚨 Solución de Problemas

### Problema: "No puedo ver mi nivel en /achievements"
**Solución:** Verifica que ejecutaste `setup-level-rewards.sql` correctamente sin errores

### Problema: "Los logros no dan XP"
**Solución:** 
1. Verifica que desempeñaste la acción (ej: crear post para "Tu Primer Catch")
2. Recarga la página (`F5`)
3. Vuelve a `/achievements`
4. Si sigue sin ir: El trigger de auto-unlock podría no estar activo

### Problema: "Me no puedo retirar dinero aunque tenga €10"
**Solución:**
1. Ve a `/cashout` → Pestaña "Cuentas"
2. Agrega una cuenta PayPal o IBAN
3. Vuelve a la pestaña "Wallet"
4. Ahora debería permitirte retirar

### Problema: "El IBAN no se acepta"
**Solución:** Usa un IBAN válido (ej español: ES9121000418450200051332)

## 📈 Próximos Pasos (Future)

1. **Integración Stripe/PayPal** - Procesar retiros automáticamente
2. **Triggers de Auto-Unlock** - Desbloquear logros automáticamente al hacer acciones
3. **Notificaciones de Nivel Up** - Animación cuando subes de nivel
4. **Leaderboard en Tiempo Real** - Top usuarios por XP semanal/mensual
5. **Badges en Perfil** - Mostrar badges de logros en `ProfilePage`

## ✅ Checklist de Deployment

- [ ] Ejecutar `setup-level-rewards.sql` en Supabase
- [ ] Verificar en Table Editor → `achievements_library` (20 filas)
- [ ] Verificar en Table Editor → `level_rewards` (14 filas)
- [ ] Probar localmente en `/achievements`
- [ ] Probar localmente en `/cashout`
- [ ] Crear post para desbloquear "Tu Primer Catch"
- [ ] Verificar XP se incrementó
- [ ] Commit y push a Vercel
- [ ] Probar en producción: `car-pes.vercel.app/achievements`
- [ ] Probar en producción: `car-pes.vercel.app/cashout`

## 🎉 ¡Listo!

Tu sistema de niveles, XP y retirada de dinero está activo.

**Los usuarios ahora pueden:**
- 🎯 Ganar XP desde logros
- 📈 Subir de nivel (1-200)
- 💰 Ganar monedas virtuales cada 10 niveles
- 💳 Retirar €10+ a PayPal/IBAN
- 🏆 Ver su progreso en vivo

¡A disfrutar del new sistema! 🚀
