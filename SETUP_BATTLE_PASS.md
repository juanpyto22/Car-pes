# 🎮 SETUP DEL SISTEMA DE BATTLE PASS Y RECOMPENSAS
## Instrucciones Paso a Paso

---

## PASO 1: Ejecutar SQL en Supabase

### 1.1. Ejecutar `setup-battle-pass.sql`

**Ve a:** Supabase Dashboard → SQL Editor → New Query

**Copia todo el contenido de `setup-battle-pass.sql` y pégalo**

Este SQL crea:
- ✅ Tabla `battle_pass_seasons` (temporadas)
- ✅ Tabla `battle_pass_rewards` (recompensas)
- ✅ Tabla `user_battle_pass_progress` (progreso del usuario)
- ✅ Tabla `user_wallet` (billetera virtual)
- ✅ Tabla `wallet_transactions` (historial de transacciones)
- ✅ 5 funciones RPC para todo

**Ejecuta y verifica que no hay errores**

---

### 1.2. Ejecutar `setup-battle-pass-data.sql`

**Copia todo el contenido de `setup-battle-pass-data.sql` y pégalo en una NEW QUERY**

Este SQL inserta:
- ✅ Temporada 1: "Aguas Calmadas" (90 días de duración)
- ✅ 22 recompensas de nivel 5 a 50
- ✅ Monedas crecientes (150 → 5000 monedas)
- ✅ Badges, marcos, y títulos especiales

**Ejecuta y verifica que no hay errores**

---

## PASO 2: Verificar en Supabase

Después de ejecutar ambos SQLs, verifica en Supabase:

1. **Abre la sección "Table Editor"**
2. **Verifica estas tablas existan:**
   - `battle_pass_seasons` → 1 fila
   - `battle_pass_rewards` → 22 filas
   - `user_wallet` → (se llena automáticamente)
   - `wallet_transactions` → (se llena automáticamente)

---

## PASO 3: Frontend - Hooks (YA CREADO)

Los siguientes hooks ya están listos:

### `useBattlePass.js`
```javascript
- useBattlePass() → Obtiene progreso del battle pass actual
- useBattlePassRewards() → Obtiene todas las recompensas disponibles
- useClaimReward() → Reclamar una recompensa
```

### `useWallet.js`
```javascript
- useWallet() → Obtiene saldo de billetera
- useWalletTransactions() → Obtiene historial de transacciones
```

---

## PASO 4: Página de Battle Pass

Endpoint: `/rewards`

Muestra:
- 📊 Progreso actual en el battle pass
- 🎁 Recompensas disponibles por nivel
- 💰 Billetera (saldo actual, historial)
- ⭐ Recompensas reclamadas vs pendientes

---

## PASO 5: Automatización

Cuando un usuario:
- 🏆 Desbloquea un logro → Suma XP al battle pass
- ⬆️ Sube de nivel → Desbloquea nuevas recompensas
- 🎁 Reclama recompensa monetaria → Se añade a su billetera

---

## 💰 ESTRUCTURA DE RECOMPENSAS

**Nivel 5 (Bronze)** → 150 monedas (0.15€)
**Nivel 10 (Bronze)** → 300 monedas (0.30€) + Marco
**Nivel 15 (Silver)** → 500 monedas (0.50€) + Título
**Nivel 20 (Silver)** → 750 monedas (0.75€) + Badge
**Nivel 25 (Silver)** → 1000 monedas (1€)
**Nivel 30 (Gold)** → 1250 monedas (1.25€) + Badge
**Nivel 35 (Gold)** → 1500 monedas (1.5€) + Título
**Nivel 40 (Platinum)** → 2000 monedas (2€) + Marco
**Nivel 45 (Platinum)** → 2500 monedas (2.5€) + Badge
**Nivel 50 (Diamond)** → 5000 monedas (5€) 👑 LEGENDARIO

**TOTAL: ~16€ en recompensas por completar el battle pass**

---

## 🔐 SEGURIDAD

- ✅ Las funciones usan SECURITY DEFINER (solo usuarios autenticados)
- ✅ Row Level Security en todas las tablas
- ✅ Validación de duplicados (no puedes reclamar 2x la misma recompensa)
- ✅ Las transacciones se registran automáticamente

---

## 📋 CHECKLIST

- [ ] Ejecuté `setup-battle-pass.sql`
- [ ] Ejecuté `setup-battle-pass-data.sql`
- [ ] Verifiqué las tablas en Supabase
- [ ] Abrí la página `/rewards` localmente
- [ ] Puedo ver el Battle Pass y mis recompensas
- [ ] Intenté reclamar una recompensa
- [ ] Mi billetera se actualizó correctamente

---

## 🚀 PRÓXIMOS PASOS (Código Frontend)

1. ✅ Crear `useBattlePass.js` - Hook del battle pass
2. ✅ Crear `useWallet.js` - Hook de billetera 
3. ✅ Crear página `/rewards` - Interfaz de battle pass
4. ✅ Integrar notificaciones de recompensas obtenidas
5. ✅ Conectar XP de logros con el battle pass

¡Todo será hecho en el siguiente paso!
