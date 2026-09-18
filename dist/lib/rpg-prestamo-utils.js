// @ts-nocheck
import { db } from "./db.js";
export const INTERES_BASE = 0.10;
export const INTERES_EXTRA_DIA = 0.05; // +5% por día vencido (después de 3 días gracia)
export const DIAS_GRACIA = 3;
export const DIA_MS = 24 * 60 * 60 * 1000;
export const PLAZO_DIAS_ENTRE_CUOTAS = 1;
// Cantidad de cuotas según monto
export function getCantidadCuotas(monto) {
    if (monto <= 500)
        return 6;
    if (monto <= 2000)
        return 8;
    if (monto <= 5000)
        return 10;
    return 12;
}
// Límites según historial
const LIMITES = [
    { historial: 10, limite: 10000 },
    { historial: 5, limite: 5000 },
    { historial: 3, limite: 2000 },
    { historial: 1, limite: 1000 },
    { historial: 0, limite: 500 },
];
export function getLimitePrestamo(historial) {
    for (const l of LIMITES) {
        if (historial >= l.historial)
            return l.limite;
    }
    return 500;
}
// 🔥 Crear cuotas al pedir el préstamo
export function crearCuotas(montoOriginal, interesBase, cantidadCuotas, fechaBase = Date.now()) {
    const montoTotal = montoOriginal + interesBase;
    const cuotaBase = Math.floor(montoTotal / cantidadCuotas);
    const cuotas = [];
    let acumulado = 0;
    for (let i = 0; i < cantidadCuotas; i++) {
        const num = i + 1;
        const esUltima = i === cantidadCuotas - 1;
        const monto = esUltima ? montoTotal - acumulado : cuotaBase;
        acumulado += monto;
        cuotas.push({
            num,
            monto,
            vence: fechaBase + (i + 1) * DIA_MS,
            pagada: false,
        });
    }
    return cuotas;
}
// 🔥 Calcular monto actualizado de una cuota (con interés por atraso)
export function calcularMontoCuota(cuota, now = Date.now()) {
    if (cuota.pagada)
        return 0;
    const vencimiento = Number(cuota.vence) || 0;
    if (vencimiento >= now)
        return cuota.monto; // todavía no vence
    const diasVencido = Math.floor((now - vencimiento) / DIA_MS);
    if (diasVencido <= DIAS_GRACIA)
        return cuota.monto; // período de gracia
    const diasInteres = diasVencido - DIAS_GRACIA;
    const interesExtra = cuota.monto * (INTERES_EXTRA_DIA * diasInteres);
    return Math.floor(cuota.monto + interesExtra);
}
// 🔥 Calcular deuda total actualizada
export function calcularDeudaTotal(prestamo, now = Date.now()) {
    if (!prestamo?.cuotas)
        return 0;
    let total = 0;
    for (const cuota of prestamo.cuotas) {
        if (!cuota.pagada) {
            total += calcularMontoCuota(cuota, now);
        }
    }
    return total;
}
export function msToTime(ms) {
    if (!ms || ms <= 0)
        return "0s";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    const sec = s % 60;
    const min = m % 60;
    const hr = h % 24;
    if (d > 0)
        return `${d}d ${hr}h`;
    if (h > 0)
        return `${h}h ${min}m`;
    if (m > 0)
        return `${m}m`;
    return `${sec}s`;
}
// 🔥 Cobrar cuotas automáticamente si pasaron 3+ días
// Se ejecuta al inicio de cada comando RPG
export async function verificarCobroAutomatico(userId, lid = "") {
    const now = Date.now();
    const { rows: [user] } = await db.query(`SELECT banco, prestamo_cuotas, prestamo_activo, prestamo_historial
     FROM usuarios WHERE id = $1 OR lid = $2`, [userId, lid]);
    if (!user || !user.prestamo_activo)
        return null;
    const prestamo = user.prestamo_cuotas || {};
    if (!prestamo.cuotas)
        return null;
    const banco = Number(user.banco) || 0;
    const historial = Number(user.prestamo_historial) || 0;
    // Buscar cuotas vencidas hace > 3 días
    const cuotasParaCobrar = [];
    let totalCobrar = 0;
    for (const cuota of prestamo.cuotas) {
        if (cuota.pagada)
            continue;
        const vencimiento = Number(cuota.vence) || 0;
        const diasVencido = Math.floor((now - vencimiento) / DIA_MS);
        if (diasVencido > DIAS_GRACIA) {
            const monto = calcularMontoCuota(cuota, now);
            cuotasParaCobrar.push(cuota.num);
            totalCobrar += monto;
        }
    }
    if (cuotasParaCobrar.length === 0)
        return null;
    // 🔥 Cobrar del banco
    const cobrado = Math.min(banco, totalCobrar);
    const restante = totalCobrar - cobrado;
    // Marcar cuotas como pagadas
    const nuevasCuotas = prestamo.cuotas.map(c => {
        if (cuotasParaCobrar.includes(c.num)) {
            return { ...c, pagada: true };
        }
        return c;
    });
    const cuotasRestantes = nuevasCuotas.filter(c => !c.pagada);
    const prestamoTerminado = cuotasRestantes.length === 0;
    let nuevoHistorial = historial;
    if (prestamoTerminado) {
        if (restante > 0) {
            // No alcanzó el banco → historial -1
            nuevoHistorial = Math.max(0, historial - 1);
        }
        else {
            // Pagó todo pero con cobro automático → historial sin cambios
            nuevoHistorial = historial;
        }
    }
    await db.query(`UPDATE usuarios 
     SET banco = banco - $1, 
         prestamo_cuotas = $2::jsonb, 
         prestamo_activo = $3,
         prestamo_historial = $4
     WHERE id = $5 OR lid = $5`, [cobrado, JSON.stringify({ ...prestamo, cuotas: nuevasCuotas }), !prestamoTerminado, nuevoHistorial, userId]);
    let mensaje = `🏦 *COBRO AUTOMÁTICO DEL BANCO*\n\n`;
    mensaje += `El banco te cobró *${cuotasParaCobrar.length}* cuota(s) vencida(s)\n\n`;
    mensaje += `▢ Cobrado: *${fmt(cobrado)}* 💎\n`;
    if (restante > 0) {
        mensaje += `▢ No alcanzó, historial reducido\n`;
    }
    mensaje += `\n📊 *Cuotas cobradas:* ${cuotasParaCobrar.join(", ")}`;
    if (prestamoTerminado) {
        mensaje += `\n\n✅ *Préstamo liquidado*`;
    }
    else {
        mensaje += `\n📦 Cuotas restantes: *${cuotasRestantes.length}*`;
    }
    return {
        cobrado: true,
        mensaje,
        cuotasCobradas: cuotasParaCobrar,
    };
}
function fmt(n) {
    return Number(n || 0).toLocaleString("es-AR");
}
